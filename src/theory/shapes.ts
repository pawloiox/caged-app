/**
 * Verified CAGED shape data. Every shape is written FOR A C CHORD (low E → high e) and transposed.
 * null = muted string. Fingers: 1 index … 4 pinky, 0 = open string.
 * Major and minor data are ported exactly from the v5 reference; dom7 data is new and locked by golden tests.
 */
export type Quality = 'major' | 'minor' | 'dom7';
export type Shape = 'C' | 'A' | 'G' | 'E' | 'D';
export type Fret = number | null;
export type Frets = readonly Fret[];

export const QUALITIES: readonly Quality[] = ['major', 'minor', 'dom7'];
export const ORDER: readonly Shape[] = ['C', 'A', 'G', 'E', 'D'];
/** The pitch class of the open chord each shape is named after. */
export const SHAPE_PC: Record<Shape, number> = { C: 0, A: 9, G: 7, E: 4, D: 2 };
/** Chord tones as intervals above the root. */
export const CHORD_IVS: Record<Quality, readonly number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dom7: [0, 4, 7, 10],
};

export const SHAPES: Record<Quality, Record<Shape, Frets>> = {
  major: {
    C: [null, 3, 2, 0, 1, 0],
    A: [null, 3, 5, 5, 5, 3],
    G: [8, 7, 5, 5, 5, 8],
    E: [8, 10, 10, 9, 8, 8],
    D: [null, null, 10, 12, 13, 12],
  },
  minor: {
    C: [null, 3, 1, 0, 1, null],
    A: [null, 3, 5, 5, 4, 3],
    G: [8, 6, 5, 5, 4, 8],
    E: [8, 10, 10, 8, 8, 8],
    D: [null, null, 10, 12, 13, 11],
  },
  // Dominant 7th forms (C7 written in each shape): E7 1-3-1-2-1-1, A7 x-1-3-1-4-1, C7 x-3-2-4-1-x, D7 x-x-1-3-2-4, G7 4-3-1-1-1-2.
  dom7: {
    C: [null, 3, 2, 3, 1, null],
    A: [null, 3, 5, 3, 5, 3],
    G: [8, 7, 5, 5, 5, 6],
    E: [8, 10, 8, 9, 8, 8],
    D: [null, null, 10, 12, 11, 12],
  },
};

/** Fingers for the movable versions. The full minor G-shape is impractical: only its middle strings get fingers. */
export const FINGERS: Record<Quality, Record<Shape, Frets>> = {
  major: {
    C: [null, 4, 3, 1, 2, 1],
    A: [null, 1, 2, 3, 4, 1],
    G: [3, 2, 1, 1, 1, 4],
    E: [1, 3, 4, 2, 1, 1],
    D: [null, null, 1, 2, 4, 3],
  },
  minor: {
    C: [null, 4, 2, 1, 3, null],
    A: [null, 1, 3, 4, 2, 1],
    G: [null, null, 2, 3, 1, null],
    E: [1, 3, 4, 1, 1, 1],
    D: [null, null, 1, 3, 4, 2],
  },
  dom7: {
    C: [null, 3, 2, 4, 1, null],
    A: [null, 1, 3, 1, 4, 1],
    G: [4, 3, 1, 1, 1, 2],
    E: [1, 3, 1, 2, 1, 1],
    D: [null, null, 1, 3, 2, 4],
  },
};

/**
 * Open-position versions (0 = open string). Minor G is G♯m 4-2-1-1-0-4, a legitimate chord.
 * The dom7 C-shape's open version is B7 (x-2-1-2-0-x), since the C7 form starts at fret 1.
 */
export const OPEN_FINGERS: Record<Quality, Record<Shape, Frets>> = {
  major: {
    C: [null, 3, 2, 0, 1, 0],
    A: [null, 0, 1, 2, 3, 0],
    G: [2, 1, 0, 0, 0, 3],
    E: [0, 2, 3, 1, 0, 0],
    D: [null, null, 0, 1, 3, 2],
  },
  minor: {
    C: [null, 3, 1, 0, 2, null],
    A: [null, 0, 2, 3, 1, 0],
    G: [3, 2, 1, 1, 0, 4],
    E: [0, 2, 3, 0, 0, 0],
    D: [null, null, 0, 2, 3, 1],
  },
  dom7: {
    C: [null, 2, 1, 3, 0, null],
    A: [null, 0, 2, 0, 3, 0],
    G: [3, 2, 0, 0, 0, 1],
    E: [0, 2, 0, 1, 0, 0],
    D: [null, null, 0, 2, 1, 3],
  },
};

/** Fingers for partial voicings of movable shapes, keyed by the strings played (0 = low E). */
export const PART_FINGERS: Record<Quality, Record<Shape, Record<string, readonly number[]>>> = {
  major: {
    E: { '2345': [3, 2, 1, 1], '345': [2, 1, 1] },
    A: { '345': [2, 3, 1] },
    C: { '2345': [3, 1, 2, 1], '345': [1, 2, 1] },
    G: { '234': [1, 1, 1] },
    D: { '345': [1, 3, 2] },
  },
  minor: {
    E: { '2345': [3, 1, 1, 1], '345': [1, 1, 1] },
    A: { '2345': [3, 4, 2, 1], '345': [3, 2, 1] },
    C: { '234': [2, 1, 3] },
    G: {},
    D: { '345': [2, 3, 1] },
  },
  dom7: { E: { '2345': [1, 2, 1, 1] }, A: { '1234': [1, 3, 1, 4] }, C: {}, G: { '2345': [1, 1, 1, 2] }, D: {} },
};

/** The string each shape's anchor root sits on. */
export const HOME: Record<Shape, number> = { E: 0, G: 0, A: 1, C: 1, D: 2 };

export const THIRD_WHERE: Record<Shape, string> = {
  E: 'G string',
  A: 'B string',
  C: 'D string (and the high e in major)',
  G: 'A and B strings',
  D: 'high e string',
};

export const SHAPE_TIPS: Record<Shape, string> = {
  E: 'Full: fingers 1-3-4-2-1-1 (minor 1-3-4-1-1-1), barring with the bony side of your index finger. Easy: just the top four strings, fingers 3-2-1-1 (minor 3-1-1-1). The root sits under the barre on the low E string.',
  A: 'Full: x-1-2-3-4-1, or barre the D, G and B strings with your ring finger (x-1-3-3-3-x) and let it mute the high e. Minor: x-1-3-4-2-1. The root is under your index finger on the A string.',
  C: 'Fingers x-4-3-1-2-1, index barring the G and high e strings. Mute the low E with the tip of your pinky. The root is under finger 4, three frets above your index finger.',
  G: 'The full shape (3-2-1-1-1-4) is a big stretch, so start with the Easy version: index barre on D, G and B plus pinky on high e (x-x-1-1-1-4). Minor: x-x-2-3-1-x. The root is on the G string under your index finger, and three frets above it on the low and high E strings.',
  D: "Full: x-x-1-2-4-3 (minor x-x-1-3-4-2). Easy: the top three strings, fingers 1-3-2 (minor 2-3-1). Don't strum the low E and A strings. The root is on the D string under your index finger.",
};

export const DOM7_TIPS: Record<Shape, string> = {
  E: 'E7 form: the E-shape with your pinky lifted, so the barre plays the ♭7 on the D string. Fingers 1-3-1-2-1-1.',
  A: 'A7 form: x-1-3-1-4-1. The barre plays the ♭7 on the G string. Easy: drop the high e.',
  C: 'C7 form: x-3-2-4-1-x. Your pinky adds the ♭7 on the G string. Leave the high e out when you move it.',
  G: 'G7 form: the top four strings (x-x-1-1-1-2) are the useful part. The ♭7 is on the high e.',
  D: 'D7 form: x-x-1-3-2-4. The ♭7 sits on the B string under finger 2.',
};
