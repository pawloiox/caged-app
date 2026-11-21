/** Train questions. Every item has a stat key, so the review queue can rebuild a question for any due item. */
import {
  keyName,
  fingerOf,
  HOME,
  MAJOR_NAMES,
  ORDER,
  PROGS,
  ZONES,
  buildProgression,
  chordLabel,
  chordLong,
  instances,
  midiAt,
  mod12,
  openChord,
  notesOf,
  posName,
  rootsOf,
  earDegrees,
  isTonic,
  tonicOf,
  type ChordPlan,
  type Instance,
  type MinorSpelling,
  type Note,
  type Quality,
  type Shape,
  type Zone,
} from '../theory';
import { pickWeighted, weightOf, type Stat } from './leitner';

export type Mode = 'shape' | 'chord' | 'roots' | 'build' | 'recall' | 'octaves' | 'ear' | 'order' | 'earhand';

export const TRAIN_MODES: ReadonlyArray<readonly [Mode, string]> = [
  ['shape', 'Name the shape'],
  ['chord', 'Name the chord'],
  ['roots', 'Roots in a shape'],
  ['build', 'Build a shape'],
  ['recall', 'Play from memory'],
  ['octaves', 'Every root on the neck'],
  ['ear', 'Major or minor?'],
  ['earhand', 'Ear + hand'],
  ['order', 'Shape order'],
];

export const isClickMode = (t: Mode): boolean => t === 'roots' || t === 'octaves' || t === 'build' || t === 'recall';

/**
 * How long a fluent answer takes, in ms, from the moment the question appears. A right answer slower than
 * this is practice, not mastery: the item stays in its box. Listening modes include the time the sound plays.
 */
export const TARGET_MS: Record<Mode, number> = {
  shape: 3000,
  chord: 4000,
  roots: 6000,
  build: 15000,
  recall: 20000,
  octaves: 35000,
  ear: 4000,
  earhand: 7000,
  order: 5000,
};

/** The fluency target of a stored item, or null for items that aren't timed (linking-drill tempos). */
export function targetOfStat(key: string): number | null {
  if (key.startsWith('step:')) return TARGET_MS[STEP_MODE[Number(key.slice(5))] ?? 'shape'];
  const m = modeOfStat(key);
  return m ? TARGET_MS[m] : null;
}

export interface Question {
  type: Mode;
  prompt: string;
  stat?: string;
  inst?: Instance;
  options?: readonly string[];
  answer?: string;
  explain: string;
  /** Positions to find, as "s:f" (roots, octaves, build). */
  want?: string[];
  /** Notes no finger can reach (full minor G-shape outer strings): neither required nor wrong. */
  optional?: string[];
  /** Play from memory: every place this shape of this chord can be played; any one of them is right. */
  alts?: Instance[];
  anchor?: Note;
  pc?: number;
  maxFret?: number;
  ear?: { chords: ChordPlan[]; target: ChordPlan; zone: Zone; progName: string };
}

const rand = <T>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]!;
const shuffle = <T>(a: T[]): T[] => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

export function randomShapeInstance(q: Quality, shape: Shape): Instance {
  for (let i = 0; i < 20; i++) {
    const key = Math.floor(Math.random() * 12);
    const opts = instances(key, q).filter((x) => x.shape === shape);
    if (opts.length) return rand(opts);
  }
  return rand(instances(0, q));
}

/** Leitner items each mode draws from. */
export function itemsFor(mode: Mode, minor: boolean): string[] {
  const qs: Quality[] = minor ? ['major', 'minor'] : ['major'];
  switch (mode) {
    case 'shape':
    case 'roots':
    case 'build':
    case 'recall':
      return qs.flatMap((q) => ORDER.map((s) => `${mode}:${q}:${s}`));
    case 'chord':
      return qs.flatMap((q) => MAJOR_NAMES.map((_, pc) => `chord:${q}:${pc}`));
    case 'octaves':
      return MAJOR_NAMES.map((_, pc) => `oct:${pc}`);
    case 'ear':
      return ['ear:major', 'ear:minor'];
    case 'earhand':
      return PROGS.filter((p) => p.id !== 'blues').flatMap((p) => earDegrees(p).map((d) => `prog:${p.id}:${d.roman}`));
    case 'order':
      return [];
  }
}

export function modeOfStat(key: string): Mode | null {
  const p = key.split(':')[0];
  const m: Record<string, Mode> = {
    shape: 'shape',
    chord: 'chord',
    roots: 'roots',
    build: 'build',
    recall: 'recall',
    oct: 'octaves',
    ear: 'ear',
    prog: 'earhand',
  };
  return m[p!] ?? null;
}

function orderQ(): Question {
  const type = rand(['after', 'before', 'lowest'] as const);
  if (type === 'lowest') {
    const k = Math.floor(Math.random() * 12);
    const l = instances(k, 'major');
    return {
      type: 'order',
      prompt: `Which shape of ${chordLong(k, 'major')} sits closest to the nut?`,
      options: ORDER,
      answer: l[0]!.shape,
      explain: `${chordLong(k, 'major')} starts the loop with the ${l[0]!.shape}-shape at frets ${l[0]!.minF}–${l[0]!.maxF}.`,
    };
  }
  const s = rand(ORDER);
  const i = ORDER.indexOf(s);
  if (type === 'after')
    return {
      type: 'order',
      prompt: `Going up the neck, which shape comes right after the ${s}-shape?`,
      options: ORDER,
      answer: ORDER[(i + 1) % 5],
      explain: `The loop runs C → A → G → E → D → C, so ${s} is followed by ${ORDER[(i + 1) % 5]}.`,
    };
  return {
    type: 'order',
    prompt: `Which shape sits just below the ${s}-shape, toward the nut?`,
    options: ORDER,
    answer: ORDER[(i + 4) % 5],
    explain: `Going down the neck the loop runs backwards, so below ${s} comes ${ORDER[(i + 4) % 5]}.`,
  };
}

export interface MakeOpts {
  minor: boolean;
  stats: Record<string, Stat>;
  last?: Instance | null;
  sp?: MinorSpelling;
  /** Build exactly this item (review queue). */
  item?: string;
  /** Only this shape (the routine's weakest-shape block). */
  only?: Shape;
}

/** The notes of a shape a player must play, and the ones no finger reaches (neither required nor wrong). */
export function wantedNotes(inst: Instance): { want: string[]; optional: string[] } {
  const unreachable = (n: { s: number; f: number }) => n.f > 0 && fingerOf(inst, n.s) === '';
  const ns = notesOf(inst);
  return {
    want: ns.filter((n) => !unreachable(n)).map((n) => `${n.s}:${n.f}`),
    optional: ns.filter(unreachable).map((n) => `${n.s}:${n.f}`),
  };
}

/**
 * Play from memory: which of the shape's places the player went for, and how close they came.
 * The best match is the place with the most notes found and the fewest wrong ones.
 */
export function judgeRecall(alts: readonly Instance[], sel: ReadonlySet<string>) {
  let best: { inst: Instance; want: string[]; optional: string[]; found: number; wrong: number } | null = null;
  for (const inst of alts) {
    const { want, optional } = wantedNotes(inst);
    const found = want.filter((k) => sel.has(k)).length;
    const wrong = [...sel].filter((k) => !want.includes(k) && !optional.includes(k)).length;
    if (!best || found - wrong > best.found - best.wrong) best = { inst, want, optional, found, wrong };
  }
  const b = best!;
  return { ...b, ok: b.found === b.want.length && b.wrong === 0 };
}

/** What each step's delayed re-test asks: the step's core skill, as a quiz question. */
export const STEP_MODE: Record<number, Mode> = { 1: 'shape', 2: 'chord', 3: 'shape', 4: 'order', 5: 'earhand' };
export const STEP_SKILL: Record<number, string> = {
  1: 'Name the open chord',
  2: 'Name a moved shape',
  3: 'Shapes of C up the neck',
  4: 'Where a key starts',
  5: 'Hear the chord, find its root',
};

/** The re-test for a finished step. Its stat is "step:<n>", so it is scheduled like any other item. */
export function makeStepQuestion(n: number, o: MakeOpts): Question {
  const stat = `step:${n}`;
  const shape = rand(ORDER);
  if (n === 1) {
    const inst = openChord(shape, 'major');
    return {
      type: 'shape',
      inst,
      stat,
      prompt: 'Step 1 check: which open chord is this?',
      options: ORDER,
      answer: shape,
      explain: `It is open ${shape} (the ${shape}-shape at the nut). Roots: ${rootsOf(inst)
        .map((r) => posName(r.s, r.f))
        .join('; ')}.`,
    };
  }
  if (n === 3) {
    const inst = instances(0, 'major').find((x) => x.shape === shape)!;
    return {
      type: 'shape',
      inst,
      stat,
      prompt: 'Step 3 check: which shape of C major is this?',
      options: ORDER,
      answer: shape,
      explain: `This is the ${shape}-shape of C major, frets ${inst.minF}–${inst.maxF}. Up the neck, C runs C → A → G → E → D.`,
    };
  }
  if (n === 4) {
    const k = Math.floor(Math.random() * 12);
    const l = instances(k, 'major');
    return {
      type: 'order',
      stat,
      prompt: `Step 4 check: which shape of ${chordLong(k, 'major', o.sp)} sits closest to the nut?`,
      options: ORDER,
      answer: l[0]!.shape,
      explain: `${chordLong(k, 'major', o.sp)} starts the loop with the ${l[0]!.shape}-shape at frets ${l[0]!.minF}–${l[0]!.maxF}.`,
    };
  }
  if (n === 5) {
    const items = itemsFor('earhand', true);
    const q = makeQuestion('earhand', { ...o, item: rand(items) });
    return { ...q, stat, prompt: `Step 5 check: ${q.prompt}` };
  }
  // Step 2: a shape moved up the neck; name the chord from where its root is.
  const q = makeQuestion('chord', { ...o, item: `chord:major:${Math.floor(Math.random() * 12)}` });
  return { ...q, stat, prompt: `Step 2 check: ${q.prompt}` };
}

/**
 * Items the review queue can serve as a question: every drill item and the step re-tests. Linking-drill tempos
 * (link:…) are played, not answered. Older saves may hold retired items such as prog:251:I (the home chord).
 */
export const isQuizItem = (k: string): boolean =>
  (/^step:[1-5]$/.test(k) || !!modeOfStat(k)) && !(k.startsWith('prog:') && isTonic(k.split(':')[2] ?? ''));

/** Build the question for any stored item (the review queue). */
export function makeItemQuestion(item: string, o: MakeOpts): Question | null {
  if (/^step:[1-5]$/.test(item)) return makeStepQuestion(Number(item.slice(5)), o);
  const m = modeOfStat(item);
  return m ? makeQuestion(m, { ...o, item }) : null;
}

export function makeQuestion(mode: Mode, o: MakeOpts): Question {
  const pick = (items: string[]) => {
    if (o.item) return o.item;
    const only = o.only ? items.filter((k) => k.endsWith(':' + o.only)) : [];
    return pickWeighted(only.length ? only : items, (k) => weightOf(o.stats[k]));
  };
  if (mode === 'order') return orderQ();

  if (mode === 'recall') {
    const item = pick(itemsFor('recall', o.minor));
    const [, q, sh] = item.split(':') as [string, Quality, Shape];
    const inst = randomShapeInstance(q, sh);
    const alts = instances(inst.keyPc, q).filter((x) => x.shape === sh);
    const { want, optional } = wantedNotes(inst);
    const where = alts.map((a) => `frets ${a.minF}–${a.maxF}`).join(' or ');
    return {
      type: 'recall',
      inst,
      alts,
      want,
      optional,
      stat: item,
      prompt: `Play the ${sh}-shape of ${chordLong(inst.keyPc, q, o.sp)} from memory, one string at a time (or mark its notes), then press Check.`,
      explain: `The ${sh}-shape of ${chordLabel(inst.keyPc, q, o.sp)} sits at ${where}.`,
    };
  }

  if (mode === 'octaves') {
    const k = pick(itemsFor('octaves', false));
    const pc = Number(k.split(':')[1]);
    const want: string[] = [];
    for (let s = 0; s < 6; s++) for (let f = 0; f <= 12; f++) if (mod12(midiAt(s, f)) === pc) want.push(`${s}:${f}`);
    return {
      type: 'octaves',
      pc,
      want,
      stat: k,
      maxFret: 12,
      prompt: `Mark every ${MAJOR_NAMES[pc]} between the nut and fret 12, then press Check.`,
      explain: `There are ${want.length} of them. The octave shapes find them fast: E→D string +2 frets, A→G +2, D→B +3, G→high e +3, and low E = high e.`,
    };
  }

  if (mode === 'build') {
    const item = pick(itemsFor('build', o.minor));
    const [, q, sh] = item.split(':') as [string, Quality, Shape];
    const inst = randomShapeInstance(q, sh);
    const anchor = rootsOf(inst).find((n) => n.s === HOME[sh]) ?? rootsOf(inst)[0]!;
    const w = wantedNotes(inst);
    const want = w.want.filter((k) => k !== `${anchor.s}:${anchor.f}`);
    const optional = w.optional;
    return {
      type: 'build',
      optional,
      inst,
      anchor,
      want,
      stat: item,
      prompt: `Build the ${sh}-shape of ${chordLong(inst.keyPc, q, o.sp)} around this root (${posName(anchor.s, anchor.f)}). Mark every other note, then press Check.`,
      explain: `The full ${sh}-shape of ${chordLabel(inst.keyPc, q, o.sp)}: ${inst.frets.map((f) => (f == null ? 'x' : f)).join(' ')} (low E to high e).`,
    };
  }

  if (mode === 'ear') {
    const k = pick(['ear:major', 'ear:minor']);
    const q = k.split(':')[1] as Quality;
    const inst = randomShapeInstance(q, rand(ORDER));
    return {
      type: 'ear',
      inst,
      stat: k,
      prompt: 'Listen. Is this chord major or minor?',
      options: ['Major', 'Minor'],
      answer: q === 'major' ? 'Major' : 'Minor',
      explain: `It was ${chordLong(inst.keyPc, q, o.sp)} (${inst.shape}-shape). Major sounds bright and settled; minor sounds darker because its 3rd is one fret lower.`,
    };
  }

  if (mode === 'earhand') {
    const k = pick(itemsFor('earhand', true));
    const [, id, roman] = k.split(':') as [string, string, string];
    const p = PROGS.find((x) => x.id === id) ?? PROGS[0]!;
    const zone = rand(ZONES.slice(1, 4));
    const key = rand([0, 2, 4, 5, 7, 9, 10]);
    const chords = buildProgression(key, p.id, zone.id, 'top4', o.sp);
    const target = chords.find((c) => c.roman === roman) ?? chords[1]!;
    return {
      type: 'earhand',
      stat: k,
      inst: target.inst,
      options: earDegrees(p).map((d) => d.roman),
      answer: target.roman,
      ear: { chords, target, zone, progName: p.name },
      prompt: `${p.name} in ${keyName(key, p.minor ? 'minor' : 'major', o.sp)} ${p.minor ? 'minor' : 'major'}: after the home chord (${tonicOf(chords).roman}), which chord do you hear?`,
      explain: `It was ${target.roman}, ${target.name}.`,
    };
  }

  // shape, chord, roots
  let item: string;
  let inst: Instance;
  let tries = 0;
  do {
    if (mode === 'chord') {
      item = pick(itemsFor('chord', o.minor));
      const [, q, pc] = item.split(':') as [string, Quality, string];
      inst = rand(instances(Number(pc), q));
    } else {
      item = pick(itemsFor(mode, o.minor));
      const [, q, s] = item.split(':') as [string, Quality, Shape];
      inst = randomShapeInstance(q, s);
    }
    tries++;
  } while (
    o.last &&
    inst.shape === o.last.shape &&
    inst.keyPc === o.last.keyPc &&
    inst.q === o.last.q &&
    tries < 12 &&
    !o.item
  );
  const q = inst.q;
  const name = chordLabel(inst.keyPc, q, o.sp);
  const explain = `This is the ${inst.shape}-shape of ${chordLong(inst.keyPc, q, o.sp)}, frets ${inst.minF}–${inst.maxF}. Roots: ${rootsOf(
    inst,
  )
    .map((r) => posName(r.s, r.f))
    .join('; ')}.`;
  if (mode === 'shape')
    return {
      type: 'shape',
      inst,
      stat: item,
      prompt: 'Which CAGED shape is this?',
      options: ORDER,
      answer: inst.shape,
      explain,
    };
  if (mode === 'chord') {
    const opts = new Set([name]);
    while (opts.size < 4) opts.add(chordLabel(Math.floor(Math.random() * 12), q, o.sp));
    return {
      type: 'chord',
      inst,
      stat: item,
      prompt: `This is ${'AE'.includes(inst.shape) ? 'an' : 'a'} ${inst.shape}-shape. Which chord is it?`,
      options: shuffle([...opts]),
      answer: name,
      explain,
    };
  }
  return {
    type: 'roots',
    inst,
    stat: item,
    want: rootsOf(inst).map((n) => `${n.s}:${n.f}`),
    prompt: `Mark every root of this ${name} chord (${inst.shape}-shape), then press Check.`,
    explain,
  };
}
