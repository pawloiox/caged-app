/**
 * Bring your own song: read a chord chart as typed ("G D Em C", "| Am7 | D7 | Gmaj7 |", "Bb F/A Gm Eb") into
 * chords the CAGED shapes can play. Every chord maps to major, minor or dominant 7th; richer chords are played
 * as the nearest of those, and the parser says so.
 */
import type { Quality } from './shapes';
import { mod12 } from './tuning';

export interface SongChord {
  /** As typed. */
  token: string;
  pc: number;
  q: Quality;
  /** Root spelled as typed, with ♯/♭: "B♭". */
  rootName: string;
  /** Set when the chord is played as a simpler one: "Em7 is played as Em". */
  approx?: string;
}

export interface ParsedSong {
  chords: SongChord[];
  /** Tokens that aren't chords this app can play. */
  errors: string[];
  /** Chords played as a simpler chord. */
  notes: string[];
}

export const SONG_MAX = 24;
export const SONG_EXAMPLE = 'G D Em C';

const LETTER_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The part after the root, mapped to the quality played and whether that is a simplification. */
function qualityOf(rest: string): { q: Quality; exact: boolean } | null {
  if (rest === '' || rest === 'maj' || rest === 'M') return { q: 'major', exact: true };
  if (rest === 'm' || rest === 'min' || rest === '-') return { q: 'minor', exact: true };
  if (rest === '7' || rest === 'dom7') return { q: 'dom7', exact: true };
  if (/^(m|min|-)(6|7|9|11|add9)$/.test(rest)) return { q: 'minor', exact: false };
  if (/^(maj7|M7|maj9|M9|Δ7?|6|add9|add2|2|5|sus2|sus4|sus|6\/9)$/.test(rest)) return { q: 'major', exact: false };
  if (/^(9|11|13|7sus4|7sus|7b9|7#9|7♭9|7♯9)$/.test(rest)) return { q: 'dom7', exact: false };
  return null;
}

const SUFFIX: Record<Quality, string> = { major: '', minor: 'm', dom7: '7' };

export function parseSong(text: string): ParsedSong {
  const out: ParsedSong = { chords: [], errors: [], notes: [] };
  const tokens = text
    .split(/[\s,|]+/)
    .map((t) => t.trim())
    .filter((t) => t && t !== '-' && t !== '–');
  for (const token of tokens) {
    // "%" repeats the chord before (as on a chord chart).
    if (token === '%' && out.chords.length) {
      out.chords.push({ ...out.chords[out.chords.length - 1]!, token });
      continue;
    }
    const m = /^([A-Ga-g])(#|♯|b|♭)?([^/]*)(\/.*)?$/.exec(token);
    const qq = m ? qualityOf(m[3]!) : null;
    if (!m || !qq) {
      out.errors.push(token);
      continue;
    }
    const letter = m[1]!.toUpperCase();
    const acc = m[2] === '#' || m[2] === '♯' ? '♯' : m[2] === 'b' || m[2] === '♭' ? '♭' : '';
    const pc = mod12(LETTER_PC[letter]! + (acc === '♯' ? 1 : acc === '♭' ? -1 : 0));
    const rootName = letter + acc;
    const chord: SongChord = { token, pc, q: qq.q, rootName };
    if (!qq.exact || m[4]) {
      chord.approx = `${token} is played as ${rootName}${SUFFIX[qq.q]}`;
      if (!out.notes.includes(chord.approx)) out.notes.push(chord.approx);
    }
    out.chords.push(chord);
    if (out.chords.length >= SONG_MAX) break;
  }
  return out;
}
