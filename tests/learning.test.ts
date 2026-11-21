import { beforeEach, describe, expect, it, vi } from 'vitest';
import { engine } from '../src/audio/engine';
import { learningRecord } from '../src/practice/record';
import { planRoutine, weakestShape } from '../src/practice/plan';
import { recordStat, retentionBucket, updateProgress, useProgress, patchSeen } from '../src/store/app';
import { normalizeProgress } from '../src/store/repository';
import { defaultProgress, type Progress } from '../src/store/types';
import { drillHref, linkDue, parseDrillKey } from '../src/train/drills';
import { BOX_DAYS, DAY, isDue, record } from '../src/train/leitner';
import {
  STEP_MODE,
  TARGET_MS,
  isQuizItem,
  itemsFor,
  judgeRecall,
  makeItemQuestion,
  makeQuestion,
  makeStepQuestion,
  targetOfStat,
  wantedNotes,
} from '../src/train/questions';
import { instances, notesOf, parseSong, planChords, rootsOf } from '../src/theory';

describe('speed-aware scheduling', () => {
  it('promotes a quick right answer, but keeps a slow one in its box and resets its timer', () => {
    const t0 = 0;
    let s = record(undefined, true, t0, { ms: 1000, targetMs: 3000 });
    expect(s.box).toBe(1);
    expect(s.t).toBe(1000);
    // Due a day later, answered right but slowly: still box 1, due again in a day.
    const t1 = BOX_DAYS[1] * DAY;
    s = record(s, true, t1, { ms: 9000, targetMs: 3000 });
    expect(s.box).toBe(1);
    expect(s.r).toBe(2);
    expect(s.last).toBe(t1);
    expect(isDue(s, t1 + DAY - 1)).toBe(false);
    expect(isDue(s, t1 + DAY)).toBe(true);
    // The running average moves toward the slow answer.
    expect(s.t).toBe(Math.round(0.6 * 1000 + 0.4 * 9000));
    // Quick this time: box 2, mastered, with the attempts it took.
    const t2 = t1 + DAY;
    s = record(s, true, t2, { ms: 1500, targetMs: 3000 });
    expect(s.box).toBe(2);
    expect(s.mast).toBe(t2);
    expect(s.ma).toBe(3);
    expect(s.first).toBe(t0);
  });

  it('a slow brand-new item stays in box 0 (it comes back today)', () => {
    const s = record(undefined, true, 0, { ms: 20_000, targetMs: 3000 });
    expect(s.box).toBe(0);
    expect(s.r).toBe(1);
  });

  it('untimed answers behave as before', () => {
    const s = record(record(undefined, true, 0), true, DAY);
    expect(s.box).toBe(2);
  });

  it('every timed item has a target', () => {
    for (const m of ['shape', 'chord', 'roots', 'build', 'recall', 'octaves', 'ear', 'earhand'] as const)
      for (const k of itemsFor(m, true)) expect(targetOfStat(k), k).toBe(TARGET_MS[m]);
    expect(targetOfStat('step:5')).toBe(TARGET_MS[STEP_MODE[5]!]);
    expect(targetOfStat('link:major0')).toBeNull();
  });
});

describe('retention', () => {
  it('buckets answers to learned items by how long they rested', () => {
    expect(retentionBucket(undefined, 0)).toBeNull();
    expect(retentionBucket({ r: 1, w: 0, box: 0, last: 0 }, 10 * DAY)).toBeNull();
    expect(retentionBucket({ r: 1, w: 0, box: 1, last: 0 }, DAY)).toBe('d1');
    expect(retentionBucket({ r: 3, w: 0, box: 4, last: 0 }, 8 * DAY)).toBe('d7');
    // Not due yet: practice, not a retention test.
    expect(retentionBucket({ r: 3, w: 0, box: 4, last: 0 }, 2 * DAY)).toBeNull();
  });
});

describe('store: delayed checks and retention', () => {
  beforeEach(() => {
    useProgress.setState(defaultProgress());
    // No audio in Node: the step-complete chime is a no-op here.
    vi.spyOn(engine, 'chime').mockImplementation(() => undefined);
  });

  it('finishing a step schedules its re-test for tomorrow', () => {
    patchSeen({ s1: ['C', 'A', 'G', 'E', 'D'] });
    const p = useProgress.getState();
    expect(p.steps['step-1']).toBe(true);
    const s = p.stats['step:1']!;
    expect(s.box).toBe(1);
    expect(isDue(s)).toBe(false);
    expect(isDue(s, Date.now() + DAY)).toBe(true);
  });

  it('counts a right answer after a week of rest', () => {
    updateProgress((p) => ({ ...p, stats: { 'shape:major:C': { r: 4, w: 0, box: 4, last: Date.now() - 9 * DAY } } }));
    recordStat('shape:major:C', true, { ms: 1000, targetMs: 3000 });
    expect(useProgress.getState().retention.d7).toEqual({ ok: 1, n: 1 });
    expect(useProgress.getState().retention.d1).toEqual({ ok: 0, n: 0 });
  });
});

describe('step re-tests', () => {
  it('every step builds a valid question with its own stat', () => {
    for (let n = 1; n <= 5; n++)
      for (let i = 0; i < 10; i++) {
        const q = makeStepQuestion(n, { minor: true, stats: {} });
        expect(q.stat).toBe(`step:${n}`);
        expect(q.type).toBe(STEP_MODE[n]);
        expect(q.options).toContain(q.answer);
        expect(q.prompt).toContain(`Step ${n} check`);
      }
    expect(makeItemQuestion('step:3', { minor: true, stats: {} })?.stat).toBe('step:3');
  });

  it('the review queue serves quiz items and step checks, not drill tempos', () => {
    expect(isQuizItem('step:2')).toBe(true);
    expect(isQuizItem('recall:major:G')).toBe(true);
    expect(isQuizItem('link:major0')).toBe(false);
    expect(isQuizItem('prog:251:I')).toBe(false);
  });
});

describe('play from memory', () => {
  it('accepts the shape at any of its places, and nothing less or more', () => {
    for (const item of itemsFor('recall', true)) {
      const q = makeQuestion('recall', { minor: true, stats: {}, item });
      expect(q.alts!.length).toBeGreaterThan(0);
      expect(q.alts!.every((a) => a.shape === q.inst!.shape && a.keyPc === q.inst!.keyPc)).toBe(true);
      for (const a of q.alts!) {
        const { want } = wantedNotes(a);
        expect(judgeRecall(q.alts!, new Set(want)).ok, item).toBe(true);
        expect(judgeRecall(q.alts!, new Set(want.slice(1))).ok).toBe(false);
        expect(judgeRecall(q.alts!, new Set([...want, '0:15'].filter((k, i, xs) => xs.indexOf(k) === i))).ok).toBe(
          want.includes('0:15'),
        );
      }
    }
  });

  it('judges against the place the player went for', () => {
    // C major, C-shape: open (frets 0–3) and an octave up (12–15).
    const alts = instances(0, 'major').filter((x) => x.shape === 'C');
    expect(alts.length).toBe(2);
    const high = alts.find((a) => a.minF >= 12)!;
    const sel = new Set(wantedNotes(high).want.slice(0, 3));
    expect(judgeRecall(alts, sel).inst).toBe(high);
    expect(rootsOf(high).length).toBeGreaterThan(0);
  });
});

describe('your own song', () => {
  it('reads a chord chart', () => {
    const s = parseSong('G D Em C');
    expect(s.chords.map((c) => [c.pc, c.q])).toEqual([
      [7, 'major'],
      [2, 'major'],
      [4, 'minor'],
      [0, 'major'],
    ]);
    expect(s.errors).toEqual([]);
  });

  it('spells roots as typed, simplifies richer chords, and says so', () => {
    const s = parseSong('| Bb | F/A | Gm7 | Eb7 | Cmaj7 % |');
    expect(s.chords.map((c) => c.rootName)).toEqual(['B♭', 'F', 'G', 'E♭', 'C', 'C']);
    expect(s.chords.map((c) => c.q)).toEqual(['major', 'major', 'minor', 'dom7', 'major', 'major']);
    expect(s.notes).toContain('Gm7 is played as Gm');
    expect(s.notes).toContain('F/A is played as F');
    expect(s.chords[1]!.pc).toBe(5);
  });

  it('reports what it cannot play', () => {
    const s = parseSong('C Bdim H7 Am');
    expect(s.errors).toEqual(['Bdim', 'H7']);
    expect(s.chords.length).toBe(2);
  });

  it('plans the song inside a zone like any progression', () => {
    const chords = parseSong('Am F C G').chords.map((c, i) => ({ ...c, roman: `Bar ${i + 1}` }));
    const plan = planChords(chords, 'z5', 'top4');
    expect(plan.map((c) => c.name)).toEqual(['Am', 'F', 'C', 'G']);
    for (const c of plan) {
      expect(c.lo).toBeGreaterThanOrEqual(4);
      expect(c.hi).toBeLessThanOrEqual(10);
      expect(c.notes.length).toBeGreaterThanOrEqual(3);
      expect(notesOf(c.inst).length).toBeGreaterThanOrEqual(c.notes.length);
    }
  });
});

describe('drill reviews', () => {
  it('links each drill to its step, with the tempo', () => {
    expect(drillHref('major0', 80)).toBe('/learn/3?bpm=80#drill');
    expect(drillHref('minor9', 60)).toBe('/learn/4?key=9&q=minor&bpm=60#drill');
    expect(parseDrillKey('dom73')).toBeNull();
    const stats = { 'link:major7': { r: 1, w: 0, box: 1, last: 0 }, 'shape:major:C': { r: 1, w: 0, box: 0, last: 0 } };
    expect(linkDue(stats, DAY)).toEqual(['link:major7']);
  });
});

const withStats = (stats: Progress['stats'], extra: Partial<Progress> = {}): Progress => ({
  ...defaultProgress(),
  stats,
  ...extra,
});

describe('adaptive routine', () => {
  const now = new Date(2026, 10, 21, 12);
  const total = (p: Progress) => planRoutine(p, now).reduce((a, b) => a + b.min, 0);

  it('always plans four blocks and fifteen minutes', () => {
    expect(planRoutine(defaultProgress(), now).length).toBe(4);
    expect(total(defaultProgress())).toBe(15);
    const many: Progress['stats'] = {};
    for (const k of itemsFor('chord', true)) many[k] = { r: 1, w: 1, box: 0, last: 0 };
    expect(total(withStats(many))).toBe(15);
  });

  it('starts a new player on open chords and the C drill', () => {
    const b = planRoutine(defaultProgress(), now);
    expect(b[0]!.to).toBe('/learn/1');
    expect(b[1]!.to).toBe('/learn/3?bpm=60#drill');
  });

  it('reviews first when items are due, naming a due step check', () => {
    const t = now.getTime();
    const b = planRoutine(
      withStats({ 'step:3': { r: 1, w: 0, box: 1, last: t - 2 * DAY }, 'shape:major:G': { r: 0, w: 2, box: 0, last: t } }),
      now,
    );
    expect(b[0]!.to).toBe('/train/review');
    expect(b[0]!.why).toContain('Step 3');
  });

  it('brings back a drill that is due, at its best tempo', () => {
    const t = now.getTime();
    const b = planRoutine(
      withStats({ 'link:major7': { r: 1, w: 0, box: 1, last: t - 2 * DAY } }, { drills: { major0: 80, major7: 80 } }),
      now,
    );
    expect(b[1]!.to).toBe('/learn/4?key=7&q=major&bpm=80#drill');
  });

  it('pushes the slowest drilled key one tempo step up', () => {
    const b = planRoutine(withStats({}, { drills: { major0: 100, major2: 50 } }), now);
    expect(b[1]!.to).toBe('/learn/4?key=2&q=major&bpm=60#drill');
  });

  it('works on the weakest shape and plays your own song', () => {
    const t = now.getTime();
    const stats: Progress['stats'] = {};
    for (const s of ['C', 'A', 'E', 'D']) stats[`shape:major:${s}`] = { r: 9, w: 1, box: 3, last: t, t: 1500 };
    stats['shape:major:G'] = { r: 2, w: 3, box: 1, last: t, t: 5000 };
    const p = withStats(stats, { song: 'Am F C G', steps: { 'step-1': true } });
    expect(weakestShape(p)!.shape).toBe('G');
    const b = planRoutine(p, now);
    expect(b[2]!.to).toBe('/train/build?shape=G');
    expect(b[3]!.to).toMatch(/^\/learn\/5\?prog=own&zone=/);
  });
});

describe('learning record', () => {
  it('measures time to mastery, retention and fluency', () => {
    const p = withStats(
      {
        'shape:major:C': { r: 3, w: 0, box: 2, last: 3 * DAY, first: 0, mast: 2 * DAY, ma: 3, t: 1000 },
        'shape:major:A': { r: 4, w: 1, box: 3, last: 6 * DAY, first: 0, mast: 4 * DAY, ma: 5, t: 9000 },
        'chord:major:7': { r: 0, w: 1, box: 0, last: 0, first: 0 },
      },
      { retention: { d1: { ok: 3, n: 4 }, d7: { ok: 1, n: 2 } } },
    );
    const r = learningRecord(p);
    expect(r.practised).toBe(3);
    expect(r.mastered).toBe(2);
    expect(r.medianDays).toBe(3);
    expect(r.medianAnswers).toBe(4);
    expect(r.timed).toBe(2);
    expect(r.fluent).toBe(1);
    expect(r.d7).toEqual({ ok: 1, n: 2 });
  });
});

describe('saved data', () => {
  it('keeps timing, mastery, retention and the song; drops nonsense', () => {
    const p = normalizeProgress({
      stats: { 'shape:major:C': { r: 2, w: 0, box: 2, last: 5, t: 1200, first: 1, mast: 4, ma: 2 } },
      retention: { d1: { ok: 2, n: 3 }, d7: { ok: 9, n: 1 } },
      song: 'G D Em C',
    });
    expect(p.stats['shape:major:C']).toEqual({ r: 2, w: 0, box: 2, last: 5, t: 1200, first: 1, mast: 4, ma: 2 });
    expect(p.retention).toEqual({ d1: { ok: 2, n: 3 }, d7: { ok: 0, n: 0 } });
    expect(p.song).toBe('G D Em C');
    expect(normalizeProgress({ song: 42 }).song).toBe('');
  });
});
