import { describe, expect, it } from 'vitest';
import { mulberry32, renderPluck, renderStrum } from '../src/audio/ks';
import {
  NoteStabilizer,
  OnsetDetector,
  PitchTracker,
  addChroma,
  checkChord,
  chromaOf,
  rms,
} from '../src/audio/mic/dsp';
import { freqToMidi, instances, notesOf, openChord, OPEN } from '../src/theory';

const SR = 44100;

function addNoise(x: Float32Array, snrDb: number, seed = 1): Float32Array {
  const rng = mulberry32(seed);
  const p = rms(x.subarray(0, Math.floor(SR * 0.5)));
  const n = p / Math.pow(10, snrDb / 20);
  return x.map((v) => v + (rng() * 2 - 1) * n * Math.sqrt(3));
}

/** Simulate the live pipeline: hop through the signal, gate on clarity, report stable notes. */
function detectNotes(sig: Float32Array): number[] {
  const tracker = new PitchTracker(2048);
  const stab = new NoteStabilizer(60);
  const out: number[] = [];
  for (let end = 2048; end <= sig.length; end += 512) {
    const frame = sig.subarray(end - 2048, end);
    const r = rms(frame) > 0.002 ? tracker.read(frame, SR) : null;
    const m = stab.push(r ? r.midi : null, (end / SR) * 1000);
    if (m != null) out.push(m);
  }
  return out;
}

describe('Karplus-Strong synth', () => {
  it('is in tune to within 6 cents across the neck (fractional delay)', () => {
    const tracker = new PitchTracker(4096, 0.8);
    for (let m = 40; m <= 79; m++) {
      const sig = renderPluck(m, SR, { rng: mulberry32(m) });
      const r = tracker.read(sig.subarray(4410, 4410 + 4096), SR)!;
      expect(r, `midi ${m}`).not.toBeNull();
      expect(Math.abs(freqToMidi(r.hz) - m) * 100, `midi ${m}`).toBeLessThan(6);
    }
  });
});

describe('single-note recognition', () => {
  // Every string, frets 0–15: 96 plucks, plus a noisy pass.
  const cases: number[] = [];
  for (let s = 0; s < 6; s++) for (let f = 0; f <= 15; f++) cases.push(OPEN[s as 0]! + f);

  it('is ≥95% accurate on clean guitar input (first stable note = played note)', () => {
    let ok = 0;
    cases.forEach((m, i) => {
      const sig = renderPluck(m, SR, { rng: mulberry32(100 + i), duration: 0.8, velocity: 0.5 + (i % 5) * 0.1 });
      const notes = detectNotes(sig);
      if (notes[0] === m) ok++;
    });
    expect(ok / cases.length).toBeGreaterThanOrEqual(0.95);
  });

  it('stays ≥95% accurate with 25 dB SNR room noise', () => {
    let ok = 0;
    cases.forEach((m, i) => {
      const sig = addNoise(renderPluck(m, SR, { rng: mulberry32(300 + i), duration: 0.8 }), 25, i);
      if (detectNotes(sig)[0] === m) ok++;
    });
    expect(ok / cases.length).toBeGreaterThanOrEqual(0.95);
  });

  it('reports a note only after it is stable for 60 ms, and once', () => {
    const st = new NoteStabilizer(60);
    expect(st.push(60, 0)).toBeNull();
    expect(st.push(60, 30)).toBeNull();
    expect(st.push(60, 61)).toBe(60);
    expect(st.push(60, 90)).toBeNull();
    expect(st.push(62, 100)).toBeNull();
    expect(st.push(62, 170)).toBe(62);
  });

  it('reports nothing for silence and noise', () => {
    const silence = new Float32Array(SR);
    expect(detectNotes(silence)).toEqual([]);
    const rng = mulberry32(9);
    const noise = new Float32Array(SR).map(() => (rng() * 2 - 1) * 0.1);
    expect(detectNotes(noise).length).toBeLessThanOrEqual(1);
  });
});

describe('chord recognition (chroma over ~150 ms after the onset)', () => {
  function chromaAfterOnset(sig: Float32Array) {
    const acc = new Float32Array(12);
    const start = Math.floor(0.03 * SR);
    for (let t = start; t + 4096 <= start + Math.floor(0.15 * SR) + 4096; t += 1024)
      addChroma(acc, chromaOf(sig.subarray(t, t + 4096), SR));
    return acc;
  }
  const midisOf = (shape: 'C' | 'A' | 'G' | 'E' | 'D', q: 'major' | 'minor', key?: number) => {
    const inst = key == null ? openChord(shape, q) : instances(key, q).find((i) => i.shape === shape)!;
    return { inst, midis: notesOf(inst).map((n) => n.midi) };
  };
  const pcsOf = (key: number, q: 'major' | 'minor') =>
    (q === 'minor' ? [0, 3, 7] : [0, 4, 7]).map((i) => (key + i) % 12);

  it('accepts every open chord and every movable major/minor shape in several keys', () => {
    let pass = 0;
    let total = 0;
    for (const q of ['major', 'minor'] as const)
      for (const key of [0, 2, 4, 5, 7, 9, 11])
        for (const inst of instances(key, q)) {
          const sig = renderStrum(
            notesOf(inst).map((n) => n.midi),
            SR,
            { seed: key * 7 + inst.minF },
          );
          const r = checkChord(chromaAfterOnset(sig), pcsOf(key, q), key, (key + (q === 'minor' ? 3 : 4)) % 12);
          total++;
          if (r.verdict === 'match' || r.verdict === 'no-fifth') pass++;
        }
    expect(pass / total).toBeGreaterThanOrEqual(0.95);
  });

  it('tolerates a missing 5th', () => {
    // C major open without the G on the G string: C E C E
    const sig = renderStrum([48, 52, 60, 64], SR);
    const r = checkChord(chromaAfterOnset(sig), [0, 4, 7], 0, 4);
    expect(['match', 'no-fifth']).toContain(r.verdict);
  });

  it('warns about a wrong 3rd (A minor strummed when A major was expected, and the reverse)', () => {
    const am = midisOf('A', 'minor').midis;
    const a = midisOf('A', 'major').midis;
    expect(checkChord(chromaAfterOnset(renderStrum(am, SR)), [9, 1, 4], 9, 1).verdict).toBe('wrong-third');
    expect(checkChord(chromaAfterOnset(renderStrum(a, SR)), [9, 0, 4], 9, 0).verdict).toBe('wrong-third');
    const em = midisOf('E', 'minor').midis;
    expect(checkChord(chromaAfterOnset(renderStrum(em, SR)), [4, 8, 11], 4, 8).verdict).toBe('wrong-third');
  });

  it('rejects a different chord', () => {
    const g = midisOf('G', 'major').midis; // G B D when C is expected
    expect(checkChord(chromaAfterOnset(renderStrum(g, SR)), [0, 4, 7], 0, 4).verdict).not.toMatch(/match|no-fifth/);
    const d = midisOf('D', 'major').midis; // D F♯ A when E is expected
    expect(checkChord(chromaAfterOnset(renderStrum(d, SR)), [4, 8, 11], 4, 8).verdict).not.toMatch(/match|no-fifth/);
  });
});

describe('onset detection', () => {
  it('finds each pluck in a sequence once', () => {
    const sig = new Float32Array(SR * 2);
    const starts = [0.1, 0.6, 1.1, 1.5];
    starts.forEach((t, i) => {
      const p = renderPluck(52 + i * 3, SR, { rng: mulberry32(i), duration: 0.5 });
      const o = Math.floor(t * SR);
      for (let n = 0; n < p.length && o + n < sig.length; n++) sig[o + n]! += p[n]!;
    });
    const det = new OnsetDetector();
    const found: number[] = [];
    for (let i = 0; i + 512 <= sig.length; i += 512)
      if (det.push(rms(sig, i, i + 512), (i / SR) * 1000)) found.push(i / SR);
    expect(found.length).toBe(starts.length);
    found.forEach((t, i) => expect(Math.abs(t - starts[i]!)).toBeLessThan(0.03));
  });
});
