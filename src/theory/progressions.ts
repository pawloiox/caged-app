import { barreOf, notesOf, type Instance, type Note } from './instances';
import { planProgression, ZONES, type Zone } from './planner';
import type { Quality } from './shapes';
import { keyName, qualitySuffix, spell, type MinorSpelling } from './spell';
import { STRING_LABEL, STRING_NAME, posName, mod12 } from './tuning';
import { stringsFor, type Voicing } from './voicings';

export interface Degree {
  iv: number;
  q: Quality;
  roman: string;
}

export interface Progression {
  id: string;
  name: string;
  minor?: boolean;
  deg: readonly Degree[];
}

const d = (iv: number, q: Quality, roman: string): Degree => ({ iv, q, roman });

export const PROGS: readonly Progression[] = [
  { id: '145', name: 'I – IV – V', deg: [d(0, 'major', 'I'), d(5, 'major', 'IV'), d(7, 'major', 'V')] },
  { id: '1564', name: 'I – V – vi – IV', deg: [d(0, 'major', 'I'), d(7, 'major', 'V'), d(9, 'minor', 'vi'), d(5, 'major', 'IV')] },
  { id: '1645', name: 'I – vi – IV – V', deg: [d(0, 'major', 'I'), d(9, 'minor', 'vi'), d(5, 'major', 'IV'), d(7, 'major', 'V')] },
  { id: '251', name: 'ii – V – I', deg: [d(2, 'minor', 'ii'), d(7, 'major', 'V'), d(0, 'major', 'I')] },
  {
    id: 'blues',
    name: '12-bar (I – IV – V)',
    deg: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((iv) => d(iv, 'major', iv === 0 ? 'I' : iv === 5 ? 'IV' : 'V')),
  },
  {
    id: 'blues7',
    name: '12-bar blues with 7th chords',
    deg: [0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7].map((iv) => d(iv, 'dom7', iv === 0 ? 'I7' : iv === 5 ? 'IV7' : 'V7')),
  },
  { id: 'm145', name: 'i – iv – v (minor key)', minor: true, deg: [d(0, 'minor', 'i'), d(5, 'minor', 'iv'), d(7, 'minor', 'v')] },
  {
    id: 'm145V',
    name: 'i – iv – V (minor key, major V)',
    minor: true,
    deg: [d(0, 'minor', 'i'), d(5, 'minor', 'iv'), d(7, 'major', 'V')],
  },
  {
    id: 'm1637',
    name: 'i – VI – III – VII (minor key)',
    minor: true,
    deg: [d(0, 'minor', 'i'), d(8, 'major', 'VI'), d(3, 'major', 'III'), d(10, 'major', 'VII')],
  },
];

export const progById = (id: string): Progression => PROGS.find((p) => p.id === id) ?? PROGS[0]!;
export const zoneById = (id: string): Zone => ZONES.find((z) => z.id === id) ?? ZONES[1]!;

export interface ChordPlan {
  pc: number;
  q: Quality;
  roman: string;
  rootName: string;
  name: string;
  inst: Instance;
  notes: Note[];
  /** The strings actually played, or null when the whole shape is played. */
  strings: readonly number[] | null;
  lo: number;
  hi: number;
}

/** Plan a progression in a key and zone. Chord roots are spelled from the tonic, never from a fixed table. */
export function buildProgression(
  keyPc: number,
  progId: string,
  zoneId: string,
  voicing: Voicing,
  sp: MinorSpelling = 'flat',
): ChordPlan[] {
  const p = progById(progId);
  const zone = zoneById(zoneId);
  const tonic = keyName(keyPc, p.minor ? 'minor' : 'major', sp);
  const chords = p.deg.map((dg) => ({
    pc: mod12(keyPc + dg.iv),
    q: dg.q,
    roman: dg.roman,
    rootName: spell(tonic, dg.iv),
  }));
  const plan = planProgression(chords, zone, voicing);
  return chords.map((c, i) => {
    const pl = plan[i]!;
    const inst: Instance = { ...pl.inst, rootName: c.rootName };
    const strings = pl.notes.length < notesOf(inst).length ? stringsFor(voicing, inst) : null;
    return { ...c, inst, notes: pl.notes, strings, lo: pl.lo, hi: pl.hi, name: c.rootName + qualitySuffix(c.q) };
  });
}

/** Unique degrees in a progression (the 12-bar repeats them). */
export const uniqueDegrees = (p: Progression): Degree[] => {
  const seen = new Set<string>();
  return p.deg.filter((x) => (seen.has(x.roman) ? false : (seen.add(x.roman), true)));
};

const an = (s: string) => ('AE'.includes(s) ? 'an' : 'a');

/** "C as an A-shape, F as a D-shape…" */
export function planSummary(chords: readonly ChordPlan[]): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const c of chords) {
    const k = c.name + c.inst.shape + c.inst.minF;
    if (seen.has(k)) continue;
    seen.add(k);
    parts.push(`${c.name} as ${c.inst.minF === 0 ? 'an open chord' : `${an(c.inst.shape)} ${c.inst.shape}-shape`}`);
  }
  return parts.join(', ');
}

function describeStrings(played: readonly number[]): string {
  const ss = [...played].sort((a, b) => a - b);
  const contiguous = ss.every((s, i) => i === 0 || s === ss[i - 1]! + 1);
  const names = ss.map((s) => STRING_LABEL[s as 0]).join(' ');
  if (ss.length === 6) return 'all six strings';
  if (contiguous && ss[ss.length - 1] === 5) {
    const word = ['', 'one', 'two', 'three', 'four', 'five'][ss.length];
    return `top ${word} strings (${names})`;
  }
  return `strings ${names}`;
}

/** One line per chord card explaining the voicing choice. */
export function explainChoice(ch: ChordPlan): string {
  const inst = ch.inst;
  const played = ch.notes.map((n) => n.s);
  if (inst.minF === 0) {
    if (played.length === 6) return `Open ${ch.name}: all six strings ring.`;
    const skipped = [0, 1, 2, 3, 4, 5].filter((s) => !played.includes(s)).map((s) => STRING_NAME[s as 0]);
    const opens = ch.notes.filter((n) => n.f === 0).length;
    return `Open ${ch.name}: ${describeStrings(played)}, skip the ${skipped.join(' and ')}${opens ? `; ${opens} open string${opens > 1 ? 's' : ''} ring` : ''}.`;
  }
  const roots = ch.notes.filter((n) => n.iv === 0);
  const b = barreOf(inst, ch.strings);
  const fretted = ch.notes.filter((n) => n.f > 0).map((n) => n.f);
  const hand = b ? `barre at fret ${b.f}` : `index at fret ${Math.min(...fretted)}`;
  let root: string;
  if (roots.length) root = `root on the ${STRING_NAME[roots[0]!.s as 0]} string`;
  else {
    const anchor = notesOf(inst).find((n) => n.iv === 0);
    root = anchor ? `root left out; anchor on the ${posName(anchor.s, anchor.f)}` : 'no root in this voicing';
  }
  return `${inst.shape}-shape, ${hand}, ${describeStrings(played)}; ${root}.`;
}

/** Up-and-down arpeggio through a chord's notes, by pitch. */
export const arpSeq = (ch: Pick<ChordPlan, 'notes'>): Note[] => {
  const asc = [...ch.notes].sort((a, b) => a.midi - b.midi);
  return asc.concat(asc.slice(1, -1).reverse());
};

/** The highest 3rd in a voicing: the note to land on. */
export const thirdOf = (ch: Pick<ChordPlan, 'notes'>): Note | undefined =>
  ch.notes.filter((x) => x.iv === 3 || x.iv === 4).sort((a, b) => b.midi - a.midi)[0];

export const PATTERN = ['D', '', 'D', 'U', 'D', '', 'D', 'U'] as const;
