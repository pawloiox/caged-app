/**
 * Pure signal analysis for listening mode: FFT, chroma, chord matching, onsets and the note stabiliser.
 * No Web Audio here, so all of it is unit-tested with synthetic guitar signals.
 */
import { PitchDetector } from 'pitchy';
import { freqToMidi } from '../../theory/tuning';

/* ---------- FFT (radix-2, in place) ---------- */
export function fftMag(input: Float32Array): Float32Array {
  const n = input.length;
  if ((n & (n - 1)) !== 0) throw new Error('fft size must be a power of two');
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  // Hann window
  for (let i = 0; i < n; i++) re[i] = input[i]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const t = re[i]!;
      re[i] = re[j]!;
      re[j] = t;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const xr = re[b]! * cr - im[b]! * ci;
        const xi = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - xr;
        im[b] = im[a]! - xi;
        re[a]! += xr;
        im[a]! += xi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  const mag = new Float32Array(n / 2);
  for (let i = 0; i < n / 2; i++) mag[i] = Math.hypot(re[i]!, im[i]!);
  return mag;
}

/* ---------- Chroma ---------- */
export const CHROMA_LO = 75;
export const CHROMA_HI = 1100;

/**
 * 12-bin chroma from spectral peaks between 75 and 1100 Hz (guitar fundamentals plus low harmonics).
 * Magnitudes are compressed and each peak is weighted down by frequency, so upper harmonics don't
 * outvote the fundamentals that actually spell the chord.
 */
export function chromaOf(frame: Float32Array, sampleRate: number): Float32Array {
  const mag = fftMag(frame);
  const binHz = sampleRate / frame.length;
  const chroma = new Float32Array(12);
  const lo = Math.max(2, Math.floor(CHROMA_LO / binHz));
  const hi = Math.min(mag.length - 2, Math.ceil(CHROMA_HI / binHz));
  let maxMag = 0;
  for (let i = lo; i <= hi; i++) if (mag[i]! > maxMag) maxMag = mag[i]!;
  if (maxMag <= 0) return chroma;
  const peaks: Array<{ hz: number; m: number }> = [];
  for (let i = lo; i <= hi; i++) {
    const m = mag[i]!;
    if (m < maxMag * 0.04 || m < mag[i - 1]! || m < mag[i + 1]!) continue;
    // Parabolic interpolation for the true peak frequency.
    const a = mag[i - 1]!;
    const c = mag[i + 1]!;
    const p = (0.5 * (a - c)) / (a - 2 * m + c || 1e-12);
    peaks.push({ hz: (i + p) * binHz, m });
  }
  for (const pk of peaks) {
    // Harmonic suppression: a peak at 3, 5, 6 or 7 times a lower, comparably strong peak is mostly an
    // overtone of that note (5× of A2 would read as C♯ and turn A minor into A major).
    let w = Math.sqrt(pk.m / maxMag) * Math.pow(220 / Math.max(pk.hz, 110), 0.5);
    for (const lo2 of peaks) {
      if (lo2.hz >= pk.hz || lo2.m < pk.m * 0.2) continue;
      const r = pk.hz / lo2.hz;
      const h = Math.round(r);
      if ((h === 3 || h === 5 || h === 6 || h === 7) && Math.abs(r - h) / h < 0.012) {
        w *= 0.2;
        break;
      }
    }
    const pc = ((Math.round(freqToMidi(pk.hz)) % 12) + 12) % 12;
    chroma[pc]! += w;
  }
  return chroma;
}

export function addChroma(acc: Float32Array, c: Float32Array): void {
  for (let i = 0; i < 12; i++) acc[i]! += c[i]!;
}

export function normalizeChroma(c: Float32Array): Float32Array {
  const max = Math.max(...c);
  return max > 0 ? c.map((v) => v / max) : c;
}

export type ChordVerdict = 'match' | 'no-fifth' | 'wrong-third' | 'wrong' | 'silent';

export interface ChordCheck {
  verdict: ChordVerdict;
  /** 0…1 share of energy that falls on the expected pitch classes. */
  inSet: number;
  message: string;
}

/**
 * Compare a chroma vector with an expected chord. Tolerates a missing 5th; flags a wrong 3rd.
 * `pcs` are the chord's pitch classes; `root` and `third` are pitch classes too.
 */
export function checkChord(chroma: Float32Array, pcs: readonly number[], root: number, third: number): ChordCheck {
  const c = normalizeChroma(chroma);
  const total = c.reduce((a, b) => a + b, 0);
  if (total <= 0) return { verdict: 'silent', inSet: 0, message: 'Nothing heard.' };
  const set = new Set(pcs.map((p) => ((p % 12) + 12) % 12));
  let inE = 0;
  for (let i = 0; i < 12; i++) if (set.has(i)) inE += c[i]!;
  const inSet = inE / total;
  const otherThird = third === (root + 4) % 12 ? (root + 3) % 12 : (root + 4) % 12;
  const fifth = (root + 7) % 12;
  const rootOk = c[root]! >= 0.25;
  const thirdOk = c[third]! >= 0.2;
  if (c[otherThird]! >= 0.35 && c[otherThird]! > c[third]! * 1.25 && !set.has(otherThird))
    return { verdict: 'wrong-third', inSet, message: 'Wrong 3rd: that sounded major/minor the other way round.' };
  if (!rootOk || inSet < 0.6) return { verdict: 'wrong', inSet, message: 'That was not the chord on the screen.' };
  if (!thirdOk) return { verdict: 'wrong', inSet, message: "Couldn't hear the 3rd. Check the string that carries it." };
  if (set.has(fifth) && c[fifth]! < 0.12) return { verdict: 'no-fifth', inSet, message: 'Good. (The 5th was quiet, which is fine.)' };
  return { verdict: 'match', inSet, message: 'Clean.' };
}

/* ---------- Pitch ---------- */
export interface PitchReading {
  hz: number;
  clarity: number;
  midi: number;
  cents: number;
}

export class PitchTracker {
  private detector: PitchDetector<Float32Array>;
  constructor(
    readonly size: number,
    readonly minClarity = 0.9,
  ) {
    this.detector = PitchDetector.forFloat32Array(size);
    this.detector.minVolumeDecibels = -55;
  }
  read(frame: Float32Array, sampleRate: number): PitchReading | null {
    const [hz, clarity] = this.detector.findPitch(frame, sampleRate);
    if (!hz || clarity < this.minClarity || hz < 70 || hz > 1400) return null;
    const m = freqToMidi(hz);
    const midi = Math.round(m);
    return { hz, clarity, midi, cents: Math.round((m - midi) * 100) };
  }
}

/**
 * Confidence + stability gate: a note is reported once it has held the same MIDI value for `holdMs`.
 * It re-arms when the pitch changes, drops out, or a new onset happens.
 */
export class NoteStabilizer {
  private cand: number | null = null;
  private since = 0;
  private reported: number | null = null;
  constructor(readonly holdMs = 60) {}
  push(midi: number | null, tMs: number): number | null {
    if (midi == null) {
      this.cand = null;
      this.reported = null;
      return null;
    }
    if (midi !== this.cand) {
      this.cand = midi;
      this.since = tMs;
      return null;
    }
    if (tMs - this.since >= this.holdMs && this.reported !== midi) {
      this.reported = midi;
      return midi;
    }
    return null;
  }
  rearm(): void {
    this.reported = null;
  }
}

/* ---------- Level and onsets ---------- */
export function rms(frame: Float32Array, from = 0, to = frame.length): number {
  let s = 0;
  for (let i = from; i < to; i++) s += frame[i]! * frame[i]!;
  return Math.sqrt(s / Math.max(1, to - from));
}

export const toDb = (x: number): number => 20 * Math.log10(Math.max(1e-9, x));

/** Energy-based onset detector on hop-sized blocks, with a slow noise-floor tracker. */
export class OnsetDetector {
  private floor = 1e-4;
  private prev = 0;
  private lastOnset = -1e9;
  constructor(
    readonly ratio = 1.8,
    readonly minLevel = 0.004,
    readonly refractoryMs = 90,
  ) {}
  push(level: number, tMs: number): boolean {
    const rising = level > this.prev * this.ratio && level > this.floor * 3 && level > this.minLevel;
    this.prev = 0.6 * this.prev + 0.4 * level;
    this.floor = level < this.floor ? 0.9 * this.floor + 0.1 * level : 0.999 * this.floor + 0.001 * level;
    if (rising && tMs - this.lastOnset > this.refractoryMs) {
      this.lastOnset = tMs;
      return true;
    }
    return false;
  }
}
