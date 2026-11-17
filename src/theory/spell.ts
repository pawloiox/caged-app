import type { Quality } from './shapes';

export const LETTERS = 'CDEFGAB';
export const LETTER_PC = [0, 2, 4, 5, 7, 9, 11] as const;

/** Interval → label and scale degree (0 = unison letter). */
export const IV_INFO: Record<number, { lab: string; deg: number; name: string }> = {
  0: { lab: 'R', deg: 0, name: 'root' },
  1: { lab: '♭2', deg: 1, name: 'flat 2nd' },
  2: { lab: '2', deg: 1, name: '2nd' },
  3: { lab: '♭3', deg: 2, name: 'minor 3rd' },
  4: { lab: '3', deg: 2, name: 'major 3rd' },
  5: { lab: '4', deg: 3, name: '4th' },
  6: { lab: '♭5', deg: 4, name: 'flat 5th' },
  7: { lab: '5', deg: 4, name: '5th' },
  8: { lab: '♭6', deg: 5, name: 'flat 6th' },
  9: { lab: '6', deg: 5, name: '6th' },
  10: { lab: '♭7', deg: 6, name: 'flat 7th' },
  11: { lab: '7', deg: 6, name: 'major 7th' },
};

export const MAJOR_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'] as const;
export const MINOR_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'] as const;
/** Beginner-friendly option: D♯m instead of E♭m (avoids C♭, G♭ and D♭ in the key). */
export const MINOR_NAMES_SHARP = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B'] as const;

export type MinorSpelling = 'flat' | 'sharp';

const ACC: Record<string, string> = { '-2': '𝄫', '-1': '♭', '0': '', '1': '♯', '2': '𝄪' };

export function keyName(pc: number, q: Quality, minorSpelling: MinorSpelling = 'flat'): string {
  const i = ((pc % 12) + 12) % 12;
  if (q === 'minor') return (minorSpelling === 'sharp' ? MINOR_NAMES_SHARP : MINOR_NAMES)[i]!;
  return MAJOR_NAMES[i]!;
}

export const qualitySuffix = (q: Quality): string => (q === 'minor' ? 'm' : q === 'dom7' ? '7' : '');
export const qualityWord = (q: Quality): string => (q === 'minor' ? 'minor' : q === 'dom7' ? 'seventh' : 'major');

export const chordLabel = (pc: number, q: Quality, sp: MinorSpelling = 'flat'): string => keyName(pc, q, sp) + qualitySuffix(q);
export const chordLong = (pc: number, q: Quality, sp: MinorSpelling = 'flat'): string =>
  keyName(pc, q, sp) + (q === 'dom7' ? '7' : ' ' + qualityWord(q));

/** Pitch class of a spelled note name such as "F♯" or "B♭". */
export function pcOfName(name: string): number {
  const L = LETTERS.indexOf(name[0]!);
  let acc = 0;
  for (const ch of name.slice(1)) {
    if (ch === '♯') acc += 1;
    else if (ch === '♭') acc -= 1;
    else if (ch === '𝄪') acc += 2;
    else if (ch === '𝄫') acc -= 2;
  }
  return (((LETTER_PC[L]! + acc) % 12) + 12) % 12;
}

/**
 * Letter-correct spelling of the note `iv` semitones above `rootName`.
 * E.g. the 3rd of F♯ is A♯, the VI of E♭ minor is C♭, the 3rd of E is G♯ (never A♭).
 */
export function spell(rootName: string, iv: number): string {
  const ivn = ((iv % 12) + 12) % 12;
  const info = IV_INFO[ivn];
  const L = LETTERS.indexOf(rootName[0]!);
  const rootPc = pcOfName(rootName);
  const pc = (rootPc + ivn) % 12;
  if (!info) return MAJOR_NAMES[pc]!;
  const li = (L + info.deg) % 7;
  let d = (((pc - LETTER_PC[li]!) % 12) + 12) % 12;
  if (d > 6) d -= 12;
  return LETTERS[li]! + (ACC[String(d)] ?? '');
}
