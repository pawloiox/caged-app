/**
 * The adaptive daily routine: fifteen minutes in four blocks, chosen from what the player's own data says
 * needs work today. Pure: the same progress on the same day gives the same plan.
 *
 * 1. Review (2–4 min): clear what is due, if anything is. Otherwise open chords (before Step 1 is done)
 *    or the weakest shape from memory.
 * 2. Linking drill (5 min): a drill due for review, else C until it is clean, else the slowest drilled key
 *    one tempo step up, else a new key.
 * 3. Weakest shape (the rest): the shape with the lowest accuracy, or the slowest; with no data yet, today's
 *    chord in all five shapes.
 * 4. Make it musical (3 min): your own song if you saved one, else the next zone not played yet.
 */
import { MAJOR_NAMES, ORDER, PROGS, ZONES, chordLabel, todayKey, dayNumber, type Shape } from '../theory';
import type { Progress } from '../store/types';
import { drillHref, linkDue, parseDrillKey } from '../train/drills';
import { dueKeys } from '../train/leitner';
import { STEP_SKILL, TARGET_MS, isQuizItem, modeOfStat } from '../train/questions';

export interface PlanBlock {
  min: number;
  title: string;
  text: string;
  /** Why this block today, from the player's data. */
  why: string;
  to: string;
}

export const LADDER_STEPS = [50, 60, 80, 100] as const;
export const ROUTINE_MIN = 15;

export interface ShapeScore {
  shape: Shape;
  /** Answers counted. */
  n: number;
  /** Share right, 0–1. */
  acc: number;
  /** Share of timed items slower than their target, 0–1. */
  slow: number;
}

/** How each shape is doing across the shape drills (name, roots, build, from memory). */
export function shapeScores(p: Progress): ShapeScore[] {
  return ORDER.map((shape) => {
    let r = 0;
    let w = 0;
    let timed = 0;
    let slow = 0;
    for (const [k, st] of Object.entries(p.stats)) {
      if (!/^(shape|roots|build|recall):(major|minor):[CAGED]$/.test(k) || !k.endsWith(':' + shape)) continue;
      r += st.r;
      w += st.w;
      const m = modeOfStat(k);
      if (st.t != null && m) {
        timed++;
        if (st.t > TARGET_MS[m]) slow++;
      }
    }
    const n = r + w;
    return { shape, n, acc: n ? r / n : 0, slow: timed ? slow / timed : 0 };
  });
}

/** The shape that needs work most: lowest accuracy, then slowest. Null until there is enough data. */
export function weakestShape(p: Progress): ShapeScore | null {
  const scored = shapeScores(p).filter((s) => s.n >= 3);
  if (!scored.length) return null;
  return [...scored].sort((a, b) => a.acc - a.slow * 0.25 - (b.acc - b.slow * 0.25))[0]!;
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function planRoutine(p: Progress, now: Date = new Date()): PlanBlock[] {
  const t = now.getTime();
  const due = dueKeys(p.stats, t).filter(isQuizItem);
  const stepsDue = due.filter((k) => k.startsWith('step:')).map((k) => Number(k.slice(5)));
  const weak = weakestShape(p);
  const blocks: PlanBlock[] = [];

  /* 1. Review */
  if (due.length) {
    const min = due.length <= 8 ? 2 : due.length <= 20 ? 3 : 4;
    blocks.push({
      min,
      title: 'Clear what is due',
      text: 'Answer the items that are due, out loud, then play each shape on your guitar.',
      why: `${plural(due.length, 'item')} ${due.length === 1 ? 'is' : 'are'} due${
        stepsDue.length
          ? `, including the delayed check for ${stepsDue.map((n) => `Step ${n} (${STEP_SKILL[n]!.toLowerCase()})`).join(' and ')}`
          : ''
      }.`,
      to: '/train/review',
    });
  } else if (!p.steps['step-1']) {
    blocks.push({
      min: 2,
      title: 'Open chords with roots',
      text: 'Play C, A, G, E and D. After each chord, play only its roots and say the note names out loud.',
      why: 'Step 1 is the foundation: the five open chords are the five shapes.',
      to: '/learn/1',
    });
  } else {
    const sh = weak?.shape ?? ORDER[dayNumber(now) % 5]!;
    blocks.push({
      min: 2,
      title: `Play the ${sh}-shape from memory`,
      text: 'No dots: play the shape in the key the app names, one string at a time, or mark its notes.',
      why: 'Nothing is due, so recall instead of recognition: playing a shape from memory makes it stick.',
      to: `/train/recall?shape=${sh}`,
    });
  }

  /* 2. Linking drill */
  const linkItems = linkDue(p.stats, t);
  const drilled = Object.entries(p.drills).filter(([k]) => parseDrillKey(k));
  if (linkItems.length) {
    const key = linkItems[0]!.slice(5);
    const d = parseDrillKey(key)!;
    const bpm = p.drills[key];
    blocks.push({
      min: 5,
      title: `Linking drill in ${chordLabel(d.pc, d.q)}`,
      text: `Run the linking drill${bpm ? ` at ${bpm} BPM` : ''}. Keep a finger on the shared root at every change.`,
      why: `It was clean${bpm ? ` at ${bpm} BPM` : ''} before and is due again: check the changes are still clean.`,
      to: drillHref(key, bpm),
    });
  } else if (!p.drills.major0) {
    blocks.push({
      min: 5,
      title: 'C linking drill',
      text: 'Run the linking drill on C. Start at 60 BPM and only move up the tempo ladder when every change is clean.',
      why: 'No clean C drill yet: C up the neck is the chain every other key copies.',
      to: drillHref('major0', 60),
    });
  } else {
    const slowest = [...drilled].sort((a, b) => a[1] - b[1])[0];
    const up = slowest ? LADDER_STEPS.find((b) => b > slowest[1]) : undefined;
    if (slowest && up && slowest[1] < 80) {
      const d = parseDrillKey(slowest[0])!;
      blocks.push({
        min: 5,
        title: `Linking drill in ${chordLabel(d.pc, d.q)} at ${up} BPM`,
        text: `Your best clean run is ${slowest[1]} BPM. Try one step up; drop back if the changes get messy.`,
        why: 'Your slowest drilled key: one step faster today.',
        to: drillHref(slowest[0], up),
      });
    } else {
      // A new key: today's chord, or the next key not yet drilled.
      const tk = todayKey(now);
      const pc = p.drills['major' + tk]
        ? ([7, 2, 9, 4, 5, 10, 3, 11, 8, 1, 6].find((k) => !p.drills['major' + k]) ?? tk)
        : tk;
      blocks.push({
        min: 5,
        title: `Linking drill in ${MAJOR_NAMES[pc]} major`,
        text: `Predict where ${MAJOR_NAMES[pc]} major starts, then link its five shapes at 60 BPM.`,
        why: p.drills['major' + pc] ? 'Every key is drilled: keep it fresh.' : 'A key you have not drilled yet.',
        to: `/learn/4?key=${pc}&q=major`,
      });
    }
  }

  /* 4. Make it musical (planned before 3, which takes the minutes left) */
  const zonesDone = new Set(p.seen.s5 ?? []);
  const nextZone = ZONES.find((z) => !zonesDone.has(z.id)) ?? ZONES[1 + (dayNumber(now) % 4)]!;
  const prog = PROGS.filter((x) => x.id !== 'blues')[dayNumber(now) % (PROGS.length - 1)]!;
  const music: PlanBlock = p.song.trim()
    ? {
        min: 3,
        title: 'Your song in one zone',
        text: `Loop your song (${p.song.trim().slice(0, 40)}) in ${nextZone.name.toLowerCase()} without leaving the zone.`,
        why: 'Your own song: the shapes in the music you want to play.',
        to: `/learn/5?prog=own&zone=${nextZone.id}`,
      }
    : {
        min: 3,
        title: `${prog.name} in one zone`,
        text: `Loop it in ${nextZone.name.toLowerCase()} without leaving the zone. Try 4-string shapes, then triads.`,
        why: zonesDone.has(nextZone.id)
          ? 'A zone you know, with a different progression.'
          : 'A zone you have not played yet.',
        to: `/learn/5?prog=${prog.id}&zone=${nextZone.id}`,
      };

  /* 3. Weakest shape */
  const used = blocks.reduce((a, b) => a + b.min, 0) + music.min;
  const min = ROUTINE_MIN - used;
  if (weak) {
    const mode = weak.acc < 0.8 ? 'build' : weak.slow > 0.3 ? 'shape' : 'roots';
    blocks.push({
      min,
      title: `Your ${weak.shape}-shape`,
      text:
        mode === 'build'
          ? `Build the ${weak.shape}-shape from its root in different keys, then play each one.`
          : mode === 'shape'
            ? `Name the ${weak.shape}-shape at a glance: answer before you think. Speed is the goal now.`
            : `Find every root of the ${weak.shape}-shape, then play the shape around them.`,
      why: `Your weakest shape: ${Math.round(weak.acc * 100)}% right${weak.slow > 0.3 ? ', and often slow' : ''}.`,
      to: `/train/${mode}?shape=${weak.shape}`,
    });
  } else {
    const tk = todayKey(now);
    blocks.push({
      min,
      title: `Today's chord: ${MAJOR_NAMES[tk]} major`,
      text: `Find all five shapes of ${MAJOR_NAMES[tk]} major. Say where each root is before you play the shape.`,
      why: 'Not enough drill answers yet to find your weakest shape.',
      to: `/explore?key=${tk}&q=major`,
    });
  }
  blocks.push(music);
  return blocks;
}
