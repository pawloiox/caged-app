import type { Instance } from './instances';
import type { Quality } from './shapes';
import { OPEN, MAX_FRET, mod12 } from './tuning';

/** Pentatonic scale per chord quality. Dominant chords use the major pentatonic. */
export const PENT: Record<Quality, readonly number[]> = {
  major: [0, 2, 4, 7, 9],
  minor: [0, 3, 5, 7, 10],
  dom7: [0, 2, 4, 7, 9],
};

export interface ScaleNote {
  s: number;
  f: number;
  iv: number;
}

const mid = (p: readonly [number, number]) => (p[0] + p[1]) / 2;

/**
 * Pentatonic box around a shape: on each string, the pair of neighbouring scale notes closest to the
 * shape's centre. On an exact tie, the pair that keeps the box narrowest wins.
 */
export function pentBox(inst: Instance): ScaleNote[] {
  const c = (inst.minF + inst.maxF) / 2;
  const set = PENT[inst.q];
  const pairs: Array<Array<[number, number]>> = [];
  for (let s = 0; s < 6; s++) {
    const fs: number[] = [];
    for (let f = 0; f <= MAX_FRET + 2; f++) if (set.includes(mod12(OPEN[s as 0]! + f - inst.keyPc))) fs.push(f);
    const opts: Array<[number, number]> = [];
    for (let i = 0; i < fs.length - 1; i++) opts.push([fs[i]!, fs[i + 1]!]);
    opts.sort((a, b) => Math.abs(mid(a) - c) - Math.abs(mid(b) - c));
    const best = Math.abs(mid(opts[0]!) - c);
    pairs.push(opts.filter((o) => Math.abs(Math.abs(mid(o) - c) - best) < 1e-9));
  }
  const chosen = pairs.map((p) => p[0]!);
  for (let s = 0; s < 6; s++) {
    if (pairs[s]!.length > 1) {
      const others = chosen.filter((_, i) => i !== s).flat();
      const lo = Math.min(...others);
      const hi = Math.max(...others);
      const width = (p: [number, number]) => Math.max(hi, p[1]) - Math.min(lo, p[0]);
      chosen[s] = pairs[s]!.slice().sort((a, b) => width(a) - width(b))[0]!;
    }
  }
  const out: ScaleNote[] = [];
  chosen.forEach((p, s) =>
    p.forEach((f) => {
      if (f <= MAX_FRET) out.push({ s, f, iv: mod12(OPEN[s as 0]! + f - inst.keyPc) });
    }),
  );
  return out;
}
