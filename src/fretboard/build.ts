/** Turn theory objects into fretboard visuals. Music comes from theory/; this only decides how it looks. */
import {
  BOTH_NAMES,
  barreFor,
  IV_INFO,
  chordLabel,
  dotLabel,
  fingerOf,
  keyName,
  mod12,
  notesOf,
  pcAt,
  pentBox,
  rootsOf,
  sharedRoots,
  spell,
  stringsFor,
  type Instance,
  type LabelMode,
  type MinorSpelling,
  type Quality,
  type Shape,
  type Voicing,
} from '../theory';
import type { DotSpec, GhostSpec, MutedSpec, ZoneSpec } from './Fretboard';

export const COL: Record<Shape, string> = {
  C: 'var(--c-shape)',
  A: 'var(--a-shape)',
  G: 'var(--g-shape)',
  E: 'var(--e-shape)',
  D: 'var(--d-shape)',
};
export const DARK_TEXT = '#2a1b00';
export const textFor = (shape: Shape): string => (shape === 'A' ? DARK_TEXT : '#fff');
export const NEUTRAL = '#ece5d6';
export const NEUTRAL_ROOT = '#9fd8e0';
export const WOOD = '#3a2216';

export interface LabelCtx {
  labels: LabelMode;
  sp: MinorSpelling;
}

export function singleDots(
  inst: Instance,
  ctx: LabelCtx,
  opts: { strings?: readonly number[] | null; rootsOnly?: boolean; third?: boolean } = {},
): DotSpec[] {
  return notesOf(inst, opts.strings).map((n) => ({
    s: n.s,
    f: n.f,
    colors: [COL[inst.shape]],
    root: n.iv === 0,
    label: dotLabel(ctx.labels, n.iv, inst, n.s, opts.strings, ctx.sp),
    text: textFor(inst.shape),
    dim: !!opts.rootsOnly && n.iv !== 0,
    third: !!opts.third && (n.iv === 3 || n.iv === 4),
  }));
}

export const mutedSpecs = (inst: Instance, strings?: readonly number[] | null, onBoard = false): MutedSpec[] =>
  inst.frets
    .map((f, s) => (f == null || (strings && !strings.includes(s)) ? s : -1))
    .filter((s) => s >= 0)
    .map((s) => ({ s, f: onBoard ? Math.max(0, inst.minF - 1) : 0 }));

const roleOf = (iv: number) => (iv === 0 ? 'root' : iv === 7 ? '5th' : iv === 10 ? '♭7' : '3rd');

export interface MapState {
  key: number;
  q: Quality;
  idx: number;
  focus: boolean;
  voicing: Voicing;
  pent: boolean;
  rootsOnly: boolean;
}

/** The neck map for Steps 3, 4 and the explorer. */
export function mapVisuals(st: MapState, list: readonly Instance[], ctx: LabelCtx) {
  const act = st.focus ? st.idx : null;
  const pos = new Map<string, { s: number; f: number; iv: number; shapes: number[] }>();
  list.forEach((inst, i) =>
    notesOf(inst, stringsFor(st.voicing, inst)).forEach((n) => {
      const k = `${n.s}:${n.f}`;
      if (!pos.has(k)) pos.set(k, { s: n.s, f: n.f, iv: n.iv, shapes: [] });
      pos.get(k)!.shapes.push(i);
    }),
  );
  const links = new Set<string>();
  if (act != null)
    for (const j of [act - 1, act + 1])
      if (list[j]) sharedRoots(list[act]!, list[j]!).forEach((n) => links.add(`${n.s}:${n.f}`));
  const dots: DotSpec[] = [...pos.values()].map((p) => {
    const inAct = act != null && p.shapes.includes(act);
    const owner = list[inAct ? act! : p.shapes[0]!]!;
    const cols = inAct ? [COL[list[act!]!.shape]] : p.shapes.map((i) => COL[list[i]!.shape]);
    const one = cols.length === 1 ? owner.shape : null;
    return {
      s: p.s,
      f: p.f,
      colors: cols,
      root: p.iv === 0,
      label:
        ctx.labels === 'shape' && !inAct && p.shapes.length > 1
          ? p.shapes.map((i) => list[i]!.shape).join('')
          : dotLabel(ctx.labels, p.iv, owner, p.s, stringsFor(st.voicing, owner), ctx.sp),
      text: one ? textFor(one) : '#fff',
      dim: (act != null && !inAct) || (st.rootsOnly && p.iv !== 0),
      ring: inAct && links.has(`${p.s}:${p.f}`),
    };
  });
  if (act != null) {
    // Roots the chosen voicing leaves out are still the anchors for linking: keep them visible.
    const a = list[act]!;
    const shown = new Set(notesOf(a, stringsFor(st.voicing, a)).map((n) => `${n.s}:${n.f}`));
    rootsOf(a)
      .filter((n) => !shown.has(`${n.s}:${n.f}`))
      .forEach((n) =>
        dots.push({
          s: n.s,
          f: n.f,
          colors: [WOOD],
          label: 'R',
          text: '#f3ecdc',
          cls: 'anchor',
          ring: links.has(`${n.s}:${n.f}`),
        }),
      );
  }
  let ghosts: GhostSpec[] = [];
  if (st.pent && act != null) {
    const inst = list[act]!;
    const own = new Set(notesOf(inst, stringsFor(st.voicing, inst)).map((n) => `${n.s}:${n.f}`));
    ghosts = pentBox(inst)
      .filter((n) => !own.has(`${n.s}:${n.f}`))
      .map((n) => ({
        s: n.s,
        f: n.f,
        color: COL[inst.shape],
        label:
          ctx.labels === 'note'
            ? spell(keyName(st.key, st.q, ctx.sp), n.iv)
            : ctx.labels === 'iv'
              ? (IV_INFO[n.iv]?.lab ?? '')
              : '',
      }));
  }
  const zones: ZoneSpec[] = list.map((inst, i) => ({
    lo: inst.minF,
    hi: inst.maxF,
    label: inst.shape,
    color: COL[inst.shape],
    active: i === act,
    id: i,
  }));
  const rn = keyName(st.key, st.q, ctx.sp);
  const cellLabel = (s: number, f: number) => {
    const p = pos.get(`${s}:${f}`);
    if (!p) return BOTH_NAMES[pcAt(s, f)]!;
    return `${spell(rn, p.iv)}, the ${roleOf(p.iv)} of ${chordLabel(st.key, st.q, ctx.sp)}, in the ${p.shapes.map((i) => list[i]!.shape).join(' and ')}-shape`;
  };
  const muted = act != null ? mutedSpecs(list[act]!, stringsFor(st.voicing, list[act]!), true) : [];
  return { dots, ghosts, zones, muted, cellLabel, links };
}

/** Role of a played note relative to a chord, for announcements. */
export function noteRole(midi: number, key: number, q: Quality, sp: MinorSpelling): { name: string; role: string } {
  const iv = mod12(midi - key);
  const rn = keyName(key, q, sp);
  const name = IV_INFO[iv] ? spell(rn, iv) : BOTH_NAMES[mod12(midi)]!;
  const chordIvs = q === 'minor' ? [0, 3, 7] : q === 'dom7' ? [0, 4, 7, 10] : [0, 4, 7];
  const ROLE: Record<number, string> = {
    0: 'the root',
    3: 'the minor 3rd',
    4: 'the major 3rd',
    7: 'the 5th',
    10: 'the ♭7',
  };
  const pent = q === 'minor' ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  const role = chordIvs.includes(iv)
    ? `${ROLE[iv]} of the chord`
    : pent.includes(iv)
      ? `a pentatonic scale tone (${IV_INFO[iv]!.lab}), not in the chord`
      : 'not in the chord or its pentatonic scale';
  return { name, role };
}

export const fingerLabel = fingerOf;

/** The index-finger barre for a voicing, coloured for the board (neutral in quizzes so it gives nothing away). */
export const barreSpec = (inst: Instance, strings: readonly number[] | null | undefined, color: string = NEUTRAL) => {
  const b = barreFor(inst, strings);
  return b ? { ...b, color } : null;
};
