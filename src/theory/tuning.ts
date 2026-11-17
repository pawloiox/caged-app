/** Standard tuning. Strings are indexed 0 = low E … 5 = high e. */
export const OPEN = [40, 45, 50, 55, 59, 64] as const;
export const STRING_LABEL = ['E', 'A', 'D', 'G', 'B', 'e'] as const;
export const STRING_NAME = ['low E', 'A', 'D', 'G', 'B', 'high e'] as const;
export const STRINGS = [0, 1, 2, 3, 4, 5] as const;
export const MAX_FRET = 15;

/** Pitch-class names that show both spellings, for notes outside any chord context. */
export const BOTH_NAMES = ['C', 'C♯/D♭', 'D', 'D♯/E♭', 'E', 'F', 'F♯/G♭', 'G', 'G♯/A♭', 'A', 'A♯/B♭', 'B'] as const;

export const mod12 = (n: number): number => ((n % 12) + 12) % 12;
export const midiAt = (s: number, f: number): number => OPEN[s as 0]! + f;
export const pcAt = (s: number, f: number): number => mod12(midiAt(s, f));

export const posName = (s: number, f: number): string =>
  `${STRING_NAME[s as 0]} string, ${f === 0 ? 'open' : 'fret ' + f}`;

export interface Pos {
  s: number;
  f: number;
}
export const posKey = (p: Pos): string => `${p.s}:${p.f}`;

/** Every place on the neck (frets lo…hi) where this exact MIDI note can be played. */
export function positionsOfMidi(midi: number, lo = 0, hi = MAX_FRET): Pos[] {
  const out: Pos[] = [];
  for (let s = 0; s < 6; s++) {
    const f = midi - OPEN[s as 0]!;
    if (f >= lo && f <= hi) out.push({ s, f });
  }
  return out;
}

/** Every place on the neck (frets lo…hi) with this pitch class. */
export function positionsOfPc(pc: number, lo = 0, hi = MAX_FRET): Pos[] {
  const out: Pos[] = [];
  for (let s = 0; s < 6; s++) for (let f = lo; f <= hi; f++) if (pcAt(s, f) === mod12(pc)) out.push({ s, f });
  return out;
}

export const midiToFreq = (m: number): number => 440 * Math.pow(2, (m - 69) / 12);
export const freqToMidi = (hz: number): number => 69 + 12 * Math.log2(hz / 440);
