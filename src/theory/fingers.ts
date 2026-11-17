import type { Instance } from './instances';
import { FINGERS, OPEN_FINGERS, PART_FINGERS } from './shapes';
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
