import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { DexieRepository } from '../src/store/dexieRepository';
import { MemoryRepository, normalizePrefs, normalizeProgress, readLegacyLocalStorage } from '../src/store/repository';
import { drillKeysOtherThanC, newlyComplete, STEP_CRITERIA } from '../src/store/criteria';
import { defaultProgress } from '../src/store/types';
import { BOX_DAYS, DAY, isDue, pickWeighted, record, weightOf } from '../src/train/leitner';

describe('Leitner scheduler', () => {
  it('moves up a box on a right answer when due, and back to 0 on a miss', () => {
    let t = 0;
    let s = record(undefined, true, t);
    expect(s.box).toBe(1);
    for (let b = 1; b < 4; b++) {
      t += BOX_DAYS[b]! * DAY;
      s = record(s, true, t);
    }
    expect(s.box).toBe(4);
    s = record(s, false, t);
    expect(s.box).toBe(0);
    expect(s.w).toBe(1);
  });

  it('does not promote an item answered again before it is due', () => {
    let s = record(undefined, true, 0); // box 1, due in a day
    s = record(s, true, 1000);
    s = record(s, true, 2000);
    expect(s.box).toBe(1);
    expect(s.r).toBe(3);
    expect(s.last).toBe(0);
  });

  it('is due after 0, 1, 2, 4 and 8 days', () => {
    for (let b = 0; b < 5; b++) {
      const s = { r: 1, w: 0, box: b, last: 0 };
      expect(isDue(s, BOX_DAYS[b]! * DAY - 1) || b === 0).toBe(b === 0);
      expect(isDue(s, BOX_DAYS[b]! * DAY)).toBe(true);
    }
  });

  it('weights due items ~3×, unseen 1.5×, others 0.35×', () => {
    expect(weightOf(undefined)).toBe(1.5);
    expect(weightOf({ r: 0, w: 1, box: 0, last: 0 }, 10)).toBeCloseTo(6); // due, 1 error → 3 × 2
    expect(weightOf({ r: 1, w: 0, box: 1, last: 0 }, 10)).toBeCloseTo(0.35 / 1.3);
  });

  it('picks by weight', () => {
    const counts = { a: 0, b: 0 };
    let x = 0;
    const rnd = () => ((x = (x * 9301 + 49297) % 233280), x / 233280);
    for (let i = 0; i < 4000; i++) counts[pickWeighted(['a', 'b'] as const, (k) => (k === 'a' ? 3 : 1), rnd)]++;
    expect(counts.a / counts.b).toBeGreaterThan(2.5);
    expect(counts.a / counts.b).toBeLessThan(3.5);
  });
});

describe('step criteria', () => {
  it('require doing, not clicking', () => {
    const p = defaultProgress();
    expect(newlyComplete(p)).toEqual([]);
    p.seen.s1 = ['C', 'A', 'G', 'E', 'D'];
    p.seen.s2 = 3;
    p.seen.s3check = 8;
    expect(newlyComplete(p)).toEqual(['step-1', 'step-2']);
    p.drills.major0 = 60;
    expect(STEP_CRITERIA['step-3']!(p)).toBe(true);
    p.seen.s4pred = ['major7', 'major9', 'minor2'];
    expect(STEP_CRITERIA['step-4']!(p)).toBe(false); // needs a drill in another key
    p.drills.major7 = 60;
    expect(STEP_CRITERIA['step-4']!(p)).toBe(true);
    p.seen.s5 = ['z3'];
    expect(STEP_CRITERIA['step-5']!(p)).toBe(false);
    p.seen.s5 = ['z3', 'open'];
    expect(STEP_CRITERIA['step-5']!(p)).toBe(true);
  });
});

describe('Step 4 drill key', () => {
  it('C in any quality is still C', () => {
    const p = defaultProgress();
    p.drills = { major0: 60, minor0: 60, dom70: 60 };
    expect(drillKeysOtherThanC(p)).toBe(0);
    p.drills.major10 = 60;
    expect(drillKeysOtherThanC(p)).toBe(1);
  });
});

describe('persistence', () => {
  beforeEach(async () => {
    await new DexieRepository().clear();
  });

  it('round-trips progress and prefs through IndexedDB', async () => {
    const repo = new DexieRepository();
    const p = defaultProgress();
    p.xp = 120;
    p.stats['shape:major:E'] = { r: 2, w: 1, box: 1, last: 5 };
    await repo.saveProgress(p);
    const back = await new DexieRepository().loadProgress();
    expect(back?.xp).toBe(120);
    expect(back?.stats['shape:major:E']?.box).toBe(1);
  });

  it('imports the v5 localStorage keys', () => {
    const store: Record<string, string> = {
      'caged-lab:progress': JSON.stringify({
        steps: { 'step-1': true },
        xp: 80,
        days: ['2026-11-01'],
        seen: { s1: ['C'] },
        stats: { 'shape:major:C': { r: 3, w: 1 } },
        drills: { major0: 60 },
      }),
      'caged-lab:prefs': JSON.stringify({ labels: 'note', lefty: true }),
      'caged-lab:muted': 'true',
    };
    const legacy = readLegacyLocalStorage({ getItem: (k) => store[k] ?? null });
    expect(legacy.progress?.xp).toBe(80);
    expect(legacy.progress?.steps['step-1']).toBe(true);
    expect(legacy.progress?.stats['shape:major:C']?.box).toBe(1); // migrated: more right than wrong
    expect(legacy.progress?.drills.major0).toBe(60);
    expect(legacy.prefs?.labels).toBe('note');
    expect(legacy.prefs?.lefty).toBe(true);
    expect(legacy.prefs?.muted).toBe(true);
  });

  it('drops malformed fields from an imported file instead of corrupting progress', () => {
    const p = normalizeProgress({
      xp: 'lots',
      steps: { 'step-1': true, 'step-9': true, 'step-2': 'yes' },
      seen: { s1: 'CAGED', s2: '3', s5: ['z3', 'nope'] },
      drills: { major7: 80, hacked: 1, minor2: 'fast' },
      days: ['2026-11-01', 'yesterday'],
    });
    expect(p.xp).toBe(0);
    expect(p.steps).toEqual({ 'step-1': true });
    expect(p.seen.s1).toBeUndefined();
    expect(p.seen.s2).toBeUndefined();
    expect(p.seen.s5).toEqual(['z3']);
    expect(p.drills).toEqual({ major7: 80 });
    expect(p.days).toEqual(['2026-11-01']);
  });

  it('normalises garbage safely', () => {
    expect(normalizeProgress(null).xp).toBe(0);
    expect(normalizeProgress({ xp: 'x', stats: { bad: null } }).stats).toEqual({});
  });

  it('memory repository isolates copies', async () => {
    const m = new MemoryRepository();
    const p = defaultProgress();
    await m.saveProgress(p);
    p.xp = 999;
    expect((await m.loadProgress())?.xp).toBe(0);
  });
});

import { itemsFor, makeQuestion, modeOfStat, type Mode } from '../src/train/questions';
describe('train questions', () => {
  it('every Leitner item of every mode rebuilds a valid question (review queue)', () => {
    const modes: Mode[] = ['shape', 'chord', 'roots', 'build', 'octaves', 'ear', 'earhand'];
    for (const m of modes)
      for (const item of itemsFor(m, true)) {
        expect(modeOfStat(item), item).toBe(m);
        const q = makeQuestion(m, { minor: true, stats: {}, item });
        expect(q.stat, item).toBe(item);
        expect(q.prompt.length).toBeGreaterThan(5);
        if (q.options) expect(q.options).toContain(q.answer);
        if (q.want) expect(q.want.length).toBeGreaterThan(0);
        if (m === 'earhand') {
          expect(q.ear!.target.roman).toBe(item.split(':')[2]);
          // The home chord is the reference you hear first: never an answer.
          expect(
            q.options!.some((o) => /^(I|i)7?$/.test(o)),
            item,
          ).toBe(false);
          // The prompt names the key ("in G major"), not a chord ("in G7").
          expect(q.prompt, item).toMatch(/ in [A-G][♯♭]? (major|minor):/);
        }
      }
  });
});

describe('Build a shape', () => {
  it('never requires the notes no finger can reach (full minor G-shape outer strings)', () => {
    for (let i = 0; i < 30; i++) {
      const q = makeQuestion('build', { minor: true, stats: {}, item: 'build:minor:G' });
      const inst = q.inst!;
      if (inst.minF === 0) continue;
      expect(q.optional!.length).toBe(3);
      for (const k of q.optional!) expect(q.want).not.toContain(k);
    }
  });
});

describe('theme', () => {
  it('defaults to wood, including saves from before it existed, but keeps a theme the player chose', () => {
    expect(normalizePrefs(undefined).theme).toBe('dark');
    expect(normalizePrefs({ theme: 'system' }).theme).toBe('dark');
    expect(normalizePrefs({ theme: 'light', themeChosen: true }).theme).toBe('light');
    expect(normalizePrefs({ theme: 'system', themeChosen: true }).theme).toBe('system');
  });
});
