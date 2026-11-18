/**
 * Audio engine: one native AudioContext shared with Tone.js (Tone drives the Transport; voices are
 * native buffer sources for low overhead). Separate guitar and metronome buses, per-string voices with
 * damping, strum direction, round-robin variants, and a sample bank that replaces the synth when a
 * licensed multisample set is present in /samples/guitar/manifest.json.
 */
import { renderPluck, mulberry32 } from './ks';
import { OPEN } from '../theory/tuning';
import type { Note } from '../theory/instances';

export interface PlayableNote {
  s: number;
  f: number;
  midi: number;
}

type Visual = { s: number; f: number };
type VisualListener = (v: Visual) => void;

interface Voice {
  src: AudioBufferSourceNode;
  g: GainNode;
}

interface SampleManifest {
  /** midi → list of round-robin files */
  notes: Record<string, string[]>;
  license: string;
}

const RR = 3;

class Engine {
  ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private guitar: GainNode | null = null;
  private metro: GainNode | null = null;
  private cache = new Map<string, AudioBuffer>();
  private voices: Array<Voice | null> = [null, null, null, null, null, null];
  private rr = 0;
  private samples: Map<number, AudioBuffer[]> | null = null;
  private visualQ: Array<{ t: number; v: Visual }> = [];
  private raf = 0;
  private listeners = new Set<VisualListener>();
  muted = false;
  guitarVol = 0.9;
  clickVol = 0.7;
  /** True when the sampler is in use instead of the synth. */
  sampled = false;

  /** Create (or resume) the context. Call from a user gesture. */
  ensure(): AudioContext | null {
    if (!this.ctx) {
      const C =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      try {
        const ctx = new C({ latencyHint: 'interactive' });
        const master = ctx.createGain();
        master.gain.value = this.muted ? 0 : 1;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -14;
        comp.ratio.value = 3;
        master.connect(comp);
        comp.connect(ctx.destination);

        const guitar = ctx.createGain();
        guitar.gain.value = this.guitarVol;
        const body = ctx.createBiquadFilter();
        body.type = 'peaking';
        body.frequency.value = 210;
        body.Q.value = 0.9;
        body.gain.value = 4;
        const air = ctx.createBiquadFilter();
        air.type = 'highshelf';
        air.frequency.value = 3200;
        air.gain.value = 2;
        const tone = ctx.createBiquadFilter();
        tone.type = 'lowpass';
        tone.frequency.value = 6500;
        const verb = ctx.createConvolver();
        verb.buffer = this.impulse(ctx, 1.6);
        const wet = ctx.createGain();
        wet.gain.value = 0.14;
        guitar.connect(body).connect(air).connect(tone);
        tone.connect(master);
        tone.connect(verb).connect(wet).connect(master);

        const metro = ctx.createGain();
        metro.gain.value = this.clickVol;
        metro.connect(master);

        this.ctx = ctx;
        this.master = master;
        this.guitar = guitar;
        this.metro = metro;
        void this.loadSamples();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 1, this.ctx.currentTime, 0.02);
  }
  setGuitarVol(v: number): void {
    this.guitarVol = v;
    if (this.guitar && this.ctx) this.guitar.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }
  setClickVol(v: number): void {
    this.clickVol = v;
    if (this.metro && this.ctx) this.metro.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  private impulse(ctx: BaseAudioContext, sec: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * sec);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    const rng = mulberry32(42);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return b;
  }

  private async loadSamples(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    try {
      const res = await fetch('/samples/guitar/manifest.json');
      if (!res.ok) return;
      const man = (await res.json()) as SampleManifest;
      const map = new Map<number, AudioBuffer[]>();
      await Promise.all(
        Object.entries(man.notes).map(async ([m, files]) => {
          const bufs = await Promise.all(
            files.map(async (f) => ctx.decodeAudioData(await (await fetch(`/samples/guitar/${f}`)).arrayBuffer())),
          );
          map.set(Number(m), bufs);
        }),
      );
      if (map.size) {
        this.samples = map;
        this.sampled = true;
      }
    } catch {
      /* no sample set: the synth stays in use */
    }
  }

  /** Synth buffer for a note, with RR round-robin variants. */
  private synthBuffer(midi: number, vel: number): AudioBuffer {
    const ctx = this.ctx!;
    const rr = this.rr++ % RR;
    const layer = vel > 0.7 ? 1 : 0;
    const key = `${midi}:${rr}:${layer}`;
    let b = this.cache.get(key);
    if (!b) {
      const data = renderPluck(midi, ctx.sampleRate, {
        rng: mulberry32(midi * 31 + rr * 7 + layer),
        velocity: layer ? 0.95 : 0.6,
        pickPos: 0.11 + rr * 0.025,
      });
      b = ctx.createBuffer(1, data.length, ctx.sampleRate);
      b.copyToChannel(data as Float32Array<ArrayBuffer>, 0);
      this.cache.set(key, b);
    }
    return b;
  }

  private sourceFor(midi: number, vel: number): { buf: AudioBuffer; rate: number } {
    if (this.samples) {
      let best = -1;
      for (const m of this.samples.keys()) if (best < 0 || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
      const list = this.samples.get(best)!;
      return { buf: list[this.rr++ % list.length]!, rate: Math.pow(2, (midi - best) / 12) };
    }
    return { buf: this.synthBuffer(midi, vel), rate: 1 };
  }

  /** Damp whatever is ringing on string s at time t. */
  damp(s: number, t: number): void {
    const prev = this.voices[s];
    if (!prev) return;
    try {
      prev.g.gain.setTargetAtTime(0, t, 0.018);
      prev.src.stop(t + 0.2);
    } catch {
      /* already stopped */
    }
    this.voices[s] = null;
  }

  playNote(midi: number, when = 0, vel = 0.8, s: number | null = null, visual?: Visual): void {
    const ctx = this.ensure();
    if (!ctx || !this.guitar) return;
    const t = Math.max(ctx.currentTime, when || ctx.currentTime);
    const { buf, rate } = this.sourceFor(midi, vel);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    src.detune.value = (Math.random() - 0.5) * 5;
    const g = ctx.createGain();
    g.gain.value = vel;
    src.connect(g).connect(this.guitar);
    src.start(t);
    if (s != null) {
      this.damp(s, t);
      this.voices[s] = { src, g };
    }
    if (visual) this.visualAt(t, visual);
  }

  /** Strum a chord. Strings not in the chord are damped, as a player's hand would. */
  strum(
    notes: readonly PlayableNote[],
    opt: { when?: number; down?: boolean; gap?: number; vel?: number; damp?: boolean } = {},
  ): void {
    const ctx = this.ensure();
    if (!ctx || !notes.length) return;
    const t0 = opt.when ?? ctx.currentTime + 0.03;
    const down = opt.down !== false;
    const gap = opt.gap ?? 0.026;
    const vel = opt.vel ?? 0.75;
    if (opt.damp !== false) {
      const used = new Set(notes.map((n) => n.s));
      for (let s = 0; s < 6; s++) if (!used.has(s)) this.damp(s, t0);
    }
    const ordered = [...notes].sort((a, b) => (down ? a.s - b.s : b.s - a.s));
    ordered.forEach((n, i) => {
      const jitter = (Math.random() - 0.5) * 0.004;
      // Down-strums hit the bass harder; up-strums favour the treble strings.
      const shade = down ? 1 - i * 0.035 : 0.85 + i * 0.02;
      this.playNote(n.midi, t0 + i * gap + jitter, vel * shade, n.s, { s: n.s, f: n.f });
    });
  }

  arpeggio(notes: readonly PlayableNote[], step = 0.22): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + 0.03;
    [...notes]
      .sort((a, b) => a.midi - b.midi)
      .forEach((n, i) => this.playNote(n.midi, t0 + i * step, 0.8, n.s, { s: n.s, f: n.f }));
  }

  playOne(s: number, f: number): void {
    const ctx = this.ensure();
    if (!ctx) return;
    this.playNote(OPEN[s as 0]! + f, 0, 0.85, s, { s, f });
  }

  /** Metronome click on its own bus: a short woodblock-like tone. */
  click(t: number, accent = false, vol = 1): void {
    const ctx = this.ensure();
    if (!ctx || !this.metro) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const bp = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.value = accent ? 1800 : 1250;
    bp.type = 'bandpass';
    bp.frequency.value = accent ? 1800 : 1250;
    bp.Q.value = 4;
    const peak = (accent ? 0.5 : 0.32) * vol;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(bp).connect(g).connect(this.metro);
    o.start(t);
    o.stop(t + 0.07);
  }

  private tone(freq: number, when: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(this.metro!);
    o.start(when);
    o.stop(when + dur + 0.02);
  }

  chime(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const t = ctx.currentTime + 0.02;
    this.tone(659.3, t, 0.6, 0.25);
    this.tone(987.8, t + 0.16, 0.9, 0.22);
  }

  /** Stop every ringing string now. */
  silence(): void {
    const t = this.now();
    for (let s = 0; s < 6; s++) this.damp(s, t);
  }

  /* ---- visuals synced to the audio clock (rAF, not setTimeout) ---- */
  onVisual(fn: VisualListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private visualAt(t: number, v: Visual): void {
    this.visualQ.push({ t, v });
    if (!this.raf) this.raf = requestAnimationFrame(this.pump);
  }

  private pump = (): void => {
    const now = this.now();
    const due = this.visualQ.filter((e) => e.t <= now + 0.008);
    this.visualQ = this.visualQ.filter((e) => e.t > now + 0.008);
    for (const e of due) this.listeners.forEach((l) => l(e.v));
    this.raf = this.visualQ.length ? requestAnimationFrame(this.pump) : 0;
  };
}

export const engine = new Engine();

export const toPlayable = (notes: readonly Note[]): PlayableNote[] =>
  notes.map((n) => ({ s: n.s, f: n.f, midi: n.midi }));
