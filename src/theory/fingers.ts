import { notesOf, type Instance } from './instances';
import { DOM7_TIPS, FINGERS, OPEN_FINGERS, PART_FINGERS, SHAPE_TIPS } from './shapes';
import { STRING_NAME } from './tuning';
import { IV_INFO, keyName, spell, type MinorSpelling } from './spell';

/** Finger number for string s, '○' for an open string, '' when no finger applies. */
export function fingerOf(inst: Instance, s: number, strings?: readonly number[] | null): string {
  if (inst.minF !== 0 && strings) {
    const part = PART_FINGERS[inst.q][inst.shape][strings.join('')];
    if (part) {
      const i = strings.indexOf(s);
      return i >= 0 && part[i] != null ? String(part[i]) : '';
    }
  }
  const table = (inst.minF === 0 ? OPEN_FINGERS : FINGERS)[inst.q][inst.shape];
  const v = table[s];
  return v == null ? '' : v === 0 ? '○' : String(v);
}

export type LabelMode = 'iv' | 'note' | 'finger' | 'shape' | 'none';
export const LABEL_OPTS: ReadonlyArray<readonly [LabelMode, string]> = [
  ['iv', 'Intervals'],
  ['note', 'Notes'],
  ['finger', 'Fingers'],
  ['shape', 'Shape letters'],
  ['none', 'Blank'],
];

export const rootNameOf = (inst: Instance, sp: MinorSpelling = 'flat'): string =>
  inst.rootName ?? keyName(inst.keyPc, inst.q, sp);

export function dotLabel(
  mode: LabelMode,
  iv: number,
  inst: Instance,
  s: number,
  strings?: readonly number[] | null,
  sp: MinorSpelling = 'flat',
): string {
  if (mode === 'iv') return IV_INFO[iv]?.lab ?? '';
  if (mode === 'note') return spell(rootNameOf(inst, sp), iv);
  if (mode === 'finger') return fingerOf(inst, s, strings);
  if (mode === 'shape') return inst.shape;
  return '';
}

export interface FingerBarre {
  /** Fret the index finger lies across. */
  f: number;
  /** Lowest and highest string the barre covers (0 = low E). */
  s1: number;
  s2: number;
}

/**
 * The index-finger barre a player actually lays down for this voicing: two or more played strings at the
 * shape's lowest fret, all fretted by finger 1. Open chords (the nut is the barre) and shapes whose lowest
 * fret is a single fingertip, such as the D-shape, have none.
 */
export function barreFor(inst: Instance, strings?: readonly number[] | null): FingerBarre | null {
  if (inst.minF === 0) return null;
  const ss = inst.frets
    .map((f, s) =>
      f === inst.minF && (!strings || strings.includes(s)) && fingerOf(inst, s, strings) === '1' ? s : -1,
    )
    .filter((s) => s >= 0);
  if (ss.length < 2) return null;
  return { f: inst.minF, s1: Math.min(...ss), s2: Math.max(...ss) };
}

/**
 * Fingering tip for an instance. Open-position shapes get a tip generated from their real fingering, because
 * the movable-shape tips (index barre, "root under finger 4") don't describe an open chord.
 */
export function shapeTip(inst: Instance, sp: MinorSpelling = 'flat'): string {
  if (inst.minF > 0) return (inst.q === 'dom7' ? DOM7_TIPS : SHAPE_TIPS)[inst.shape];
  const tab = inst.frets.map((f) => (f == null ? 'x' : String(f))).join('-');
  const fingers = inst.frets.map((f, s) => (f == null ? 'x' : f === 0 ? '0' : fingerOf(inst, s))).join('-');
  const name = keyName(inst.keyPc, inst.q, sp) + (inst.q === 'minor' ? 'm' : inst.q === 'dom7' ? '7' : '');
  const roots = notesOf(inst)
    .filter((n) => n.iv === 0)
    .map((n) =>
      n.f === 0
        ? `the open ${STRING_NAME[n.s as 0]} string`
        : `${STRING_NAME[n.s as 0]} string fret ${n.f} (finger ${fingerOf(inst, n.s)})`,
    );
  const muted = inst.frets.map((f, s) => (f == null ? STRING_NAME[s as 0] : null)).filter(Boolean);
  return `Open ${name}: ${tab}, fingers ${fingers} (0 = open string). Roots: ${roots.join(' and ')}.${muted.length ? ` Don't strum the ${muted.join(' or ')} string${muted.length > 1 ? 's' : ''}.` : ''} The open strings do the job of the barre; move it up the neck and your index finger takes their place.`;
}
