import { SHAPES, ORDER, type Quality, type Shape, type Fret, type Frets } from './shapes';
import { OPEN, MAX_FRET, mod12, posKey } from './tuning';

export interface Instance {
  shape: Shape;
  q: Quality;
  keyPc: number;
  frets: Frets;
  minF: number;
  maxF: number;
  /** Optional letter-correct root name (e.g. "C♭" in E♭ minor). */
  rootName?: string;
}

export interface Note {
  s: number;
  f: number;
  midi: number;
  /** Interval above the chord root, 0…11. */
  iv: number;
}

/** Shift down by octaves while the lowest fret is ≥ 12. */
export function normalize(frets: Frets): Fret[] {
  let out = frets.slice();
  let m = Math.min(...(out.filter((f) => f != null) as number[]));
  while (m - 12 >= 0) {
    out = out.map((f) => (f == null ? null : f - 12));
    m -= 12;
  }
  return out;
}

export const shapeFrets = (shape: Shape, q: Quality, keyPc: number): Fret[] =>
  normalize(SHAPES[q][shape].map((f) => (f == null ? null : f + keyPc)));

export function makeInstance(shape: Shape, q: Quality, keyPc: number, frets: Frets): Instance {
  const played = frets.filter((f) => f != null) as number[];
  return { shape, q, keyPc: mod12(keyPc), frets, minF: Math.min(...played), maxF: Math.max(...played) };
}

/** Every playable instance of the chord between the nut and maxFret, sorted by lowest fret, then highest. */
export function instances(keyPc: number, q: Quality, maxFret = MAX_FRET): Instance[] {
  const list: Instance[] = [];
  for (const s of ORDER) {
    const base = shapeFrets(s, q, mod12(keyPc));
    for (const o of [0, 12, 24]) {
      const inst = makeInstance(
        s,
        q,
        keyPc,
        base.map((f) => (f == null ? null : f + o)),
      );
      if (inst.maxF <= maxFret) list.push(inst);
    }
  }
  return list.sort((a, b) => a.minF - b.minF || a.maxF - b.maxF);
}

/** The open-position chord a shape is named after (C, A, G, E, D). */
export function openChord(shape: Shape, q: Quality = 'major'): Instance {
  const pc = { C: 0, A: 9, G: 7, E: 4, D: 2 }[shape];
  return makeInstance(shape, q, pc, shapeFrets(shape, q, pc));
}

export function notesOf(inst: Instance, strings?: readonly number[] | null): Note[] {
  const out: Note[] = [];
  inst.frets.forEach((f, s) => {
    if (f == null || (strings && !strings.includes(s))) return;
    const midi = OPEN[s as 0]! + f;
    out.push({ s, f, midi, iv: mod12(midi - inst.keyPc) });
  });
  return out;
}

export const rootsOf = (inst: Instance): Note[] => notesOf(inst).filter((n) => n.iv === 0);

/** Roots two instances share at the same string and fret: the pivot between neighbouring shapes. */
export function sharedRoots(a: Instance, b: Instance): Note[] {
  const rb = new Set(rootsOf(b).map(posKey));
  return rootsOf(a).filter((n) => rb.has(posKey(n)));
}

/** Strings that are muted (or left out by the voicing). */
export const mutedOf = (inst: Instance, strings?: readonly number[] | null): number[] =>
  inst.frets.map((f, s) => (f == null || (strings && !strings.includes(s)) ? s : -1)).filter((s) => s >= 0);

export interface Barre {
  f: number;
  s1: number;
  s2: number;
}

export function barreOf(inst: Instance, strings?: readonly number[] | null): Barre | null {
  if (inst.minF === 0) return null;
  const ss = inst.frets
    .map((f, s) => (f === inst.minF && (!strings || strings.includes(s)) ? s : -1))
    .filter((s) => s >= 0);
  if (ss.length < 2) return null;
  return { f: inst.minF, s1: Math.min(...ss), s2: Math.max(...ss) };
}

export const sameInstance = (a: Instance, b: Instance): boolean =>
  a.shape === b.shape && a.q === b.q && a.keyPc === b.keyPc && a.minF === b.minF;
