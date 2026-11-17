import type { Instance } from './instances';
import type { Quality, Shape } from './shapes';

export type Voicing = 'full' | 'easy' | 'top4' | 'tri';
export const VOICE_OPTS: ReadonlyArray<readonly [Voicing, string]> = [
  ['full', 'Full'],
  ['easy', 'Easy'],
  ['top4', '4 strings'],
  ['tri', 'Triads'],
];

/** String sets (0 = low E). "Easy" = the fragment most players actually use; "tri" = a complete 3-note triad. */
export const EASY: Record<Quality, Record<Shape, readonly number[]>> = {
  major: { C: [1, 2, 3, 4, 5], A: [2, 3, 4, 5], G: [2, 3, 4, 5], E: [2, 3, 4, 5], D: [3, 4, 5] },
  minor: { C: [1, 2, 3, 4], A: [2, 3, 4, 5], G: [2, 3, 4], E: [2, 3, 4, 5], D: [3, 4, 5] },
  // A seventh chord needs four notes: each set holds R, 3, 5 and ♭7 (or 3, 5, ♭7 plus the root).
  dom7: { C: [1, 2, 3, 4], A: [1, 2, 3, 4], G: [2, 3, 4, 5], E: [2, 3, 4, 5], D: [2, 3, 4, 5] },
};
export const TRI: Record<'major' | 'minor', Record<Shape, readonly number[]>> = {
  major: { C: [3, 4, 5], A: [3, 4, 5], G: [2, 3, 4], E: [3, 4, 5], D: [3, 4, 5] },
  minor: { C: [2, 3, 4], A: [3, 4, 5], G: [2, 3, 4], E: [3, 4, 5], D: [3, 4, 5] },
};

export function top4Of(q: Quality, shape: Shape): readonly number[] {
  if (q === 'minor' && shape === 'C') return [1, 2, 3, 4];
  if (q === 'minor' && shape === 'G') return [2, 3, 4];
  if (q === 'dom7') return EASY.dom7[shape];
  return [2, 3, 4, 5];
}

/**
 * The strings a voicing plays, or null for "all strings of the shape".
 * "easy" and "top4" apply only to movable shapes (open chords stay full); "tri" is always a 3-note triad.
 * For dom7 chords, "tri" uses the 4-note set, since a triad cannot hold the ♭7.
 */
export function stringsFor(voicing: Voicing, inst: Instance): readonly number[] | null {
  if (voicing === 'easy') return inst.minF === 0 ? null : EASY[inst.q][inst.shape];
  if (voicing === 'top4') return inst.minF === 0 ? null : top4Of(inst.q, inst.shape);
  if (voicing === 'tri') return inst.q === 'dom7' ? EASY.dom7[inst.shape] : TRI[inst.q][inst.shape];
  return null;
}
