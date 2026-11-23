/**
 * Scale pattern library: every scale as two-notes-per-string (2NPS) and three-notes-per-string (3NPS) patterns.
 *
 * A pattern is the scale played straight up the neck from one of its notes on the low E string, the same number
 * of notes on every string. Pattern 1 starts on the root, pattern 2 on the next scale note, and so on, so a scale
 * of n notes has n patterns, and together they tile the whole neck. 2NPS is for the five-note (pentatonic)
 * scales: its five patterns are the five pentatonic boxes, one around each CAGED shape. 3NPS is for the
 * seven-note scales: eighteen notes, two and a half octaves, the same three-note grips moving across the strings.
 * (A pentatonic played three to a string would run past the 24th fret, and a seven-note scale two to a string
 * would not reach two octaves, so each system keeps to its own scales.)
 */
import type { Shape } from './shapes';
import { LETTERS, LETTER_PC, pcOfName } from './spell';
import { OPEN, mod12 } from './tuning';

export type Nps = 2 | 3;

export interface ScaleDef {
  id: string;
  name: string;
  /** Semitones above the root, ascending. */
  steps: readonly number[];
  /** Letter steps above the root's letter for each note (0–6), so every note is spelled with the right letter. */
  letters: readonly number[];
  /** Read with a minor 3rd: key names follow the minor spellings. */
  minor: boolean;
  /** What it sounds like and where it is used, in one sentence. */
  sound: string;
}

const SEVEN = [0, 1, 2, 3, 4, 5, 6] as const;

export const SCALES: readonly ScaleDef[] = [
  {
    id: 'minor-pent',
    name: 'Minor pentatonic',
    steps: [0, 3, 5, 7, 10],
    letters: [0, 2, 3, 4, 6],
    minor: true,
    sound: 'The rock and blues soloing scale: five notes, none of them wrong over a minor or bluesy chord.',
  },
  {
    id: 'major-pent',
    name: 'Major pentatonic',
    steps: [0, 2, 4, 7, 9],
    letters: [0, 1, 2, 4, 5],
    minor: false,
    sound: 'Bright and open, for country, pop and soul over major chords.',
  },
  {
    id: 'major',
    name: 'Major',
    steps: [0, 2, 4, 5, 7, 9, 11],
    letters: SEVEN,
    minor: false,
    sound: 'Do-re-mi: the scale most melodies come from (the Ionian mode).',
  },
  {
    id: 'minor',
    name: 'Natural minor',
    steps: [0, 2, 3, 5, 7, 8, 10],
    letters: SEVEN,
    minor: true,
    sound: 'The plain minor key, dark and singing (the Aeolian mode).',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    steps: [0, 2, 3, 5, 7, 9, 10],
    letters: SEVEN,
    minor: true,
    sound: 'Minor with a raised 6th: funk, jazz and Santana-style rock.',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    steps: [0, 1, 3, 5, 7, 8, 10],
    letters: SEVEN,
    minor: true,
    sound: 'Minor with a flat 2nd, for flamenco and metal.',
  },
  {
    id: 'lydian',
    name: 'Lydian',
    steps: [0, 2, 4, 6, 7, 9, 11],
    letters: SEVEN,
    minor: false,
    sound: 'Major with a raised 4th: dreamy, floating, film-score major.',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    steps: [0, 2, 4, 5, 7, 9, 10],
    letters: SEVEN,
    minor: false,
    sound: 'Major with a flat 7th, the sound of a dominant 7th chord: blues-rock and jam bands.',
  },
  {
    id: 'locrian',
    name: 'Locrian',
    steps: [0, 1, 3, 5, 6, 8, 10],
    letters: SEVEN,
    minor: true,
    sound: 'Flat 2nd and flat 5th: unstable, over a half-diminished chord.',
  },
  {
    id: 'harmonic-minor',
    name: 'Harmonic minor',
    steps: [0, 2, 3, 5, 7, 8, 11],
    letters: SEVEN,
    minor: true,
    sound: 'Minor with a raised 7th, and its exotic leap from the ♭6: neoclassical and Middle Eastern colours.',
  },
  {
    id: 'melodic-minor',
    name: 'Melodic minor',
    steps: [0, 2, 3, 5, 7, 9, 11],
    letters: SEVEN,
    minor: true,
    sound: 'Minor with a major 6th and 7th, the jazz minor.',
  },
];

export const scaleById = (id: string | null | undefined): ScaleDef | undefined => SCALES.find((s) => s.id === id);

/** Scales a system fits: 2NPS the five-note scales, 3NPS the seven-note ones. */
export const scalesFor = (nps: Nps): readonly ScaleDef[] =>
  SCALES.filter((s) => s.steps.length === (nps === 2 ? 5 : 7));

/** The system a scale is played in. */
export const npsOf = (sc: ScaleDef): Nps => (sc.steps.length === 5 ? 2 : 3);

/** The major scale's semitones, against which degree labels are written (♭3, ♯4 …). */
const MAJOR_STEPS = [0, 2, 4, 5, 7, 9, 11] as const;
const ACC: Record<number, string> = { [-2]: '𝄫', [-1]: '♭', 0: '', 1: '♯', 2: '𝄪' };

/** Degree label of note i: "R", "2", "♭3", "♯4" … */
export function degreeLabel(sc: ScaleDef, i: number): string {
  if (i === 0) return 'R';
  const L = sc.letters[i]!;
  return (ACC[sc.steps[i]! - MAJOR_STEPS[L]!] ?? '') + (L + 1);
}

const DEGREE_WORD = ['root', '2nd', '3rd', '4th', '5th', '6th', '7th'] as const;
/** Spoken degree: "root", "flat 3rd", "sharp 4th". */
export function degreeName(sc: ScaleDef, i: number): string {
  if (i === 0) return 'root';
  const L = sc.letters[i]!;
  const d = sc.steps[i]! - MAJOR_STEPS[L]!;
  return (d < 0 ? 'flat ' : d > 0 ? 'sharp ' : '') + DEGREE_WORD[L];
}

/** Note `i` of the scale on `rootName`, with the right letter (the 3rd of E major is G♯, never A♭). */
export function scaleNoteName(sc: ScaleDef, rootName: string, i: number): string {
  const li = (LETTERS.indexOf(rootName[0]!) + sc.letters[i]!) % 7;
  const pc = mod12(pcOfName(rootName) + sc.steps[i]!);
  let d = mod12(pc - LETTER_PC[li]!);
  if (d > 6) d -= 12;
  return LETTERS[li]! + (ACC[d] ?? '?');
}

const SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'] as const;
const FLAT = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const;
/** Usual key names, so ties fall the familiar way (F♯ major, E♭ minor). */
const USUAL_MAJOR = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const;
const USUAL_MINOR = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'] as const;

const accidentals = (n: string) => [...n.slice(1)].reduce((a, ch) => a + (ch === '𝄪' || ch === '𝄫' ? 3 : 1), 0);

/**
 * How to name the root `pc` for this scale: the spelling whose notes need the fewest sharps and flats (a double
 * sharp or flat counts three). C♯ Dorian, not D♭ Dorian with its F♭ and C♭.
 */
export function scaleRootName(sc: ScaleDef, pc: number): string {
  const i = mod12(pc);
  const usual = (sc.minor ? USUAL_MINOR : USUAL_MAJOR)[i]!;
  const cost = (root: string) => sc.steps.reduce((a, _, k) => a + accidentals(scaleNoteName(sc, root, k)), 0);
  return [usual, SHARP[i]!, FLAT[i]!].reduce((best, n) => (cost(n) < cost(best) ? n : best), usual);
}

export const scaleLabel = (sc: ScaleDef, pc: number): string => `${scaleRootName(sc, pc)} ${sc.name.toLowerCase()}`;

export interface PatternNote {
  s: number;
  f: number;
  midi: number;
  /** Index of the note in the scale (0 = root). */
  i: number;
}

export interface ScalePattern {
  /** 1-based, as players number them: pattern 1 starts on the root. */
  n: number;
  nps: Nps;
  /** Ascending, low E to high e, `nps` notes on each string. */
  notes: PatternNote[];
  lo: number;
  hi: number;
  /** The CAGED shape a 2NPS pentatonic pattern is the box of (the chord of the scale's root). */
  shape: Shape | null;
}

/** The order the pentatonic boxes meet the CAGED shapes going up from the one rooted on the low E string. */
const BOX_SHAPES: readonly Shape[] = ['E', 'D', 'C', 'A', 'G'];

/**
 * Pattern `n` (1-based) of a scale in a key: the scale climbing from note n−1 on the low E string, `nps` notes
 * per string. It sits as low on the neck as it can without going behind the nut.
 */
export function scalePattern(sc: ScaleDef, keyPc: number, n: number, nps: Nps): ScalePattern {
  const len = sc.steps.length;
  const d = (((n - 1) % len) + len) % len;
  const f0 = mod12(keyPc + sc.steps[d]! - OPEN[0]);
  const base = OPEN[0] + f0 - sc.steps[d]!;
  let notes: PatternNote[] = Array.from({ length: 6 * nps }, (_, k) => {
    const j = d + k;
    const i = j % len;
    const midi = base + sc.steps[i]! + 12 * Math.floor(j / len);
    const s = Math.floor(k / nps);
    return { s, f: midi - OPEN[s as 0]!, midi, i };
  });
  if (notes.some((x) => x.f < 0)) notes = notes.map((x) => ({ ...x, f: x.f + 12, midi: x.midi + 12 }));
  const fs = notes.map((x) => x.f);
  return {
    n: d + 1,
    nps,
    notes,
    lo: Math.min(...fs),
    hi: Math.max(...fs),
    shape: nps === 2 && len === 5 ? BOX_SHAPES[d]! : null,
  };
}

export const scalePatterns = (sc: ScaleDef, keyPc: number, nps: Nps): ScalePattern[] =>
  sc.steps.map((_, k) => scalePattern(sc, keyPc, k + 1, nps));

/** Every place the scale's notes fall on frets 0…last, for seeing a pattern inside the whole neck. */
export function scaleOnNeck(sc: ScaleDef, keyPc: number, last: number): PatternNote[] {
  const out: PatternNote[] = [];
  for (let s = 0; s < 6; s++)
    for (let f = 0; f <= last; f++) {
      const i = sc.steps.indexOf(mod12(OPEN[s as 0]! + f - keyPc));
      if (i >= 0) out.push({ s, f, midi: OPEN[s as 0]! + f, i });
    }
  return out;
}

/** The highest fret any pattern reaches, in any scale and key: the scale board shows frets 0 to this. */
export const SCALE_LAST_FRET = Math.max(
  ...SCALES.flatMap((sc) =>
    Array.from({ length: 12 }, (_, k) => scalePatterns(sc, k, npsOf(sc)).map((p) => p.hi)).flat(),
  ),
);

/**
 * Suggested fingers for each note of a pattern, string by string ('○' for an open string).
 * 3NPS stretches: whole-whole is 1-2-4, half then whole 1-2-4, whole then half 1-3-4.
 * 2NPS is played in position, one finger per fret from the box's lowest fret, and the hand moves up a fret when
 * a string's notes reach past the little finger (on the B string, usually).
 */
export function patternFingers(p: ScalePattern): string[] {
  const out: string[] = [];
  let idx = Math.max(1, p.lo);
  for (let s = 0; s < 6; s++) {
    const fs = p.notes.filter((x) => x.s === s).map((x) => x.f);
    if (p.nps === 3) {
      out.push(...stretchFingers(fs));
      continue;
    }
    const top = fs[fs.length - 1]!;
    if (top - idx > 3) idx = top - 3;
    out.push(...fs.map((f) => (f === 0 ? '○' : String(f - idx + 1))));
  }
  return out;
}

function stretchFingers(fs: number[]): string[] {
  if (fs[0] === 0) return fs.map((f, k) => (k === 0 ? '○' : String(Math.min(4, Math.max(k, f)))));
  const a = fs[1]! - fs[0]!;
  const b = fs[2]! - fs[1]!;
  if (a >= 2 && b === 1) return ['1', '3', '4'];
  if (a === 1 && b === 1) return ['1', '2', '3'];
  return ['1', '2', '4'];
}

export interface ScaleMatch {
  sc: ScaleDef;
  /** The root's pitch class. */
  key: number;
  /** How many of the scale's notes weren't among those given. */
  extra: number;
}

/** Fewer than this many different notes fit too many scales to be worth listing. */
export const FIND_MIN_NOTES = 3;

/**
 * The scales, in every key, that hold all of the pitch classes given: for the scale finder. Closest fit first (the
 * fewest notes beyond those given), then those rooted on the lowest note played (the likeliest home note), then
 * those rooted on any note played, then the library's order, which runs from the most played scales.
 * With `root`, only scales on that root.
 */
export function findScales(
  pcs: readonly number[],
  { root = null, lowest = null }: { root?: number | null; lowest?: number | null } = {},
): ScaleMatch[] {
  const given = new Set(pcs.map(mod12));
  if (given.size === 0) return [];
  const out: (ScaleMatch & { rank: number[] })[] = [];
  SCALES.forEach((sc, order) => {
    for (let key = 0; key < 12; key++) {
      if (root != null && key !== mod12(root)) continue;
      const notes = new Set(sc.steps.map((s) => mod12(key + s)));
      if (![...given].every((pc) => notes.has(pc))) continue;
      const extra = notes.size - given.size;
      const onLowest = lowest != null && key === mod12(lowest) ? 0 : 1;
      out.push({ sc, key, extra, rank: [extra, onLowest, given.has(key) ? 0 : 1, order, key] });
    }
  });
  const cmp = (a: number[], b: number[]) => {
    for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) return a[k]! - b[k]!;
    return 0;
  };
  return out.sort((a, b) => cmp(a.rank, b.rank)).map(({ sc, key, extra }) => ({ sc, key, extra }));
}
