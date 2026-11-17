/**
 * Karplus-Strong plucked string, extended (Jaffe–Smith): pick-position comb, dynamics low-pass on the
 * excitation, and an all-pass fractional delay so every note is in tune (the v5 reference used an
 * integer delay, which drifted up to ~20 cents high on the treble strings). Pure: no Web Audio here,
 * so it renders in tests and in the browser alike.
 */
export interface PluckOptions {
  /** 0…1, how hard the string is picked. Harder = brighter. */
  velocity?: number;
  /** Relative pick position along the string (0.08 near the bridge … 0.3 towards the neck). */
  pickPos?: number;
  /** Seeded random source, so round-robin variants are reproducible. */
  rng?: () => number;
  /** Seconds. Defaults to a string-dependent ring time. */
  duration?: number;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function renderPluck(midi: number, sampleRate: number, opt: PluckOptions = {}): Float32Array {
  const rng = opt.rng ?? Math.random;
  const vel = Math.max(0.05, Math.min(1, opt.velocity ?? 0.8));
  const f = 440 * Math.pow(2, (midi - 69) / 12);
  const T60 = Math.max(1.2, 3.6 - (midi - 40) * 0.055);
  const dur = opt.duration ?? Math.min(3.6, T60 + 0.3);
  const len = Math.floor(sampleRate * dur);
  const out = new Float32Array(len);

  // Loop delay = N + 0.5 (averaging filter) + delta (all-pass).
  const P = sampleRate / f;
  const N = Math.max(2, Math.floor(P - 0.5 - 0.1));
  const delta = P - N - 0.5;
  const C = (1 - delta) / (1 + delta);

  // Excitation: noise burst one period long, low-passed by velocity, combed by pick position.
  const ex = new Float32Array(N);
  let lp = 0;
  const a = 0.25 + 0.7 * vel; // one-pole coefficient: softer = darker
  for (let i = 0; i < N; i++) {
    lp += a * (rng() * 2 - 1 - lp);
    ex[i] = lp;
  }
  const M = Math.max(1, Math.round((opt.pickPos ?? 0.13) * N));
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = ex[i]! - (i >= M ? ex[i - M]! : 0);
  let mean = 0;
  for (let i = 0; i < N; i++) mean += ring[i]!;
  mean /= N;
  for (let i = 0; i < N; i++) ring[i]! -= mean;

  const g = Math.pow(0.001, 1 / (f * T60));
  let idx = 0;
  let prev = 0;
  let apX = 0;
  let apY = 0;
  let peak = 0;
  for (let n = 0; n < len; n++) {
    const y = ring[idx]!;
    out[n] = y;
    const avg = 0.5 * (y + prev);
    prev = y;
    const ap = C * avg + apX - C * apY;
    apX = avg;
    apY = ap;
    ring[idx] = g * ap;
    idx = idx + 1 === N ? 0 : idx + 1;
    const v = Math.abs(y);
    if (v > peak) peak = v;
  }
  const norm = (0.32 * (0.55 + 0.45 * vel)) / (peak || 1);
  const fade = Math.floor(sampleRate * 0.08);
  const attack = Math.max(1, Math.floor(sampleRate * 0.0015));
  for (let n = 0; n < len; n++) {
    let m = norm;
    if (n < attack) m *= n / attack;
    if (n > len - fade) m *= (len - n) / fade;
    out[n]! *= m;
  }
  return out;
}

/** Mix several plucks into one buffer (for tests and offline checks). */
export function renderStrum(
  midis: readonly number[],
  sampleRate: number,
  opt: { gap?: number; duration?: number; seed?: number; velocity?: number } = {},
): Float32Array {
  const dur = opt.duration ?? 1.5;
  const out = new Float32Array(Math.floor(sampleRate * dur));
  const rng = mulberry32(opt.seed ?? 7);
  midis.forEach((m, i) => {
    const start = Math.floor(i * (opt.gap ?? 0.025) * sampleRate);
    const p = renderPluck(m, sampleRate, { rng, duration: dur, velocity: opt.velocity ?? 0.8 });
    for (let n = 0; n + start < out.length && n < p.length; n++) out[n + start]! += p[n]!;
  });
  return out;
}
