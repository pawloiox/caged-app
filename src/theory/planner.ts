import { instances, notesOf, type Instance, type Note } from './instances';
import type { Quality, Shape } from './shapes';
import { stringsFor, type Voicing } from './voicings';

export interface Zone {
  id: string;
  name: string;
  lo: number;
  hi: number;
}

export const ZONES: readonly Zone[] = [
  { id: 'open', name: 'Open (0–3)', lo: 0, hi: 3 },
  { id: 'z3', name: 'Frets 3–7', lo: 3, hi: 7 },
  { id: 'z5', name: 'Frets 5–9', lo: 5, hi: 9 },
  { id: 'z7', name: 'Frets 7–11', lo: 7, hi: 11 },
  { id: 'z10', name: 'Frets 10–14', lo: 10, hi: 14 },
];

/** Shape difficulty penalty per voicing. Open chords cost 0. */
export const DIFF: Record<Voicing, Record<Shape, number>> = {
  full: { E: 0, A: 0, C: 0.4, D: 0.5, G: 4 },
  easy: { E: 0, A: 0, C: 0.25, D: 0.2, G: 0.3 },
  top4: { E: 0, A: 0, C: 0.15, D: 0.15, G: 0.2 },
  tri: { E: 0, A: 0, C: 0, D: 0, G: 0.1 },
};

export interface ChordReq {
  pc: number;
  q: Quality;
}

export interface Candidate {
  inst: Instance;
  notes: Note[];
  lo: number;
  hi: number;
  /** Centre of the fretted notes (0.5 when nothing is fretted). */
  c: number;
  cost: number;
}

export function candidateCost(inst: Instance, zone: Zone, voicing: Voicing): Candidate | null {
  const zc = (zone.lo + zone.hi) / 2;
  const notes = notesOf(inst, stringsFor(voicing, inst));
  if (notes.length < 3) return null;
  const fretted = notes.filter((n) => n.f > 0).map((n) => n.f);
  const fs = notes.map((n) => n.f);
  const lo = Math.min(...fs);
  const hi = Math.max(...fs);
  const span = fretted.length ? Math.max(...fretted) - Math.min(...fretted) : 0;
  const diff = inst.minF === 0 ? 0 : DIFF[voicing][inst.shape];
  const c = fretted.length ? (Math.min(...fretted) + Math.max(...fretted)) / 2 : 0.5;
  const cost =
    2 * (Math.max(0, zone.lo - lo) + Math.max(0, hi - zone.hi)) +
    3 * Math.max(0, span - 3) +
    diff +
    0.05 * Math.abs((lo + hi) / 2 - zc);
  return { inst, notes, lo, hi, c, cost };
}

export const MOVE_COST = 0.25;

/**
 * Cyclic dynamic programme: for each candidate of the first chord, walk forward choosing the cheapest
 * predecessor for every candidate, then close the loop back to the first chord. Movement between
 * neighbouring chords costs 0.25 × the distance between their fretted-note centres.
 */
export function planProgression(chords: readonly ChordReq[], zone: Zone, voicing: Voicing): Candidate[] {
  const cands = chords.map((ch) => {
    const list = instances(ch.pc, ch.q)
      .map((inst) => candidateCost(inst, zone, voicing))
      .filter((x): x is Candidate => x != null);
    if (list.length) return list;
    return instances(ch.pc, ch.q).map((inst) => {
      const notes = notesOf(inst);
      const fs = notes.map((n) => n.f);
      return { inst, notes, lo: Math.min(...fs), hi: Math.max(...fs), c: (inst.minF + inst.maxF) / 2, cost: 99 };
    });
  });
  const n = cands.length;
  let best: Candidate[] = [];
  let bc = Infinity;
  for (const first of cands[0]!) {
    let costs = [first.cost];
    const back: number[][] = [[0]];
    let prevList: Candidate[] = [first];
    for (let i = 1; i < n; i++) {
      const cur = cands[i]!;
      const nc: number[] = [];
      const nb: number[] = [];
      for (const c of cur) {
        let m = Infinity;
        let arg = 0;
        prevList.forEach((p, j) => {
          const v = costs[j]! + MOVE_COST * Math.abs(p.c - c.c);
          if (v < m) {
            m = v;
            arg = j;
          }
        });
        nc.push(m + c.cost);
        nb.push(arg);
      }
      back.push(nb);
      costs = nc;
      prevList = cur;
    }
    let endJ = 0;
    let endV = Infinity;
    prevList.forEach((p, j) => {
      const v = costs[j]! + (n > 1 ? MOVE_COST * Math.abs(p.c - first.c) : 0);
      if (v < endV) {
        endV = v;
        endJ = j;
      }
    });
    if (endV < bc) {
      bc = endV;
      const path: Candidate[] = new Array(n);
      let j = endJ;
      for (let i = n - 1; i >= 1; i--) {
        path[i] = cands[i]![j]!;
        j = back[i]![j]!;
      }
      path[0] = first;
      best = path;
    }
  }
  return best;
}
