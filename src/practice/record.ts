/**
 * The learning record: is the method working for this player? Three measures, from their own answers:
 * - time to mastery: from first answer to box 2 (right, on time, after at least a day);
 * - retention: right answers to learned items after a rest of a day or more, and of a week or more;
 * - fluency: items whose typical right answer is within its target time.
 */
import type { Progress } from '../store/types';
import { DAY, MASTERED_BOX } from '../train/leitner';
import { targetOfStat } from '../train/questions';

export interface LearningRecord {
  practised: number;
  mastered: number;
  /** Median days and answers from first answer to mastered, or null with no mastered items. */
  medianDays: number | null;
  medianAnswers: number | null;
  d1: { ok: number; n: number };
  d7: { ok: number; n: number };
  timed: number;
  fluent: number;
}

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const a = [...xs].sort((x, y) => x - y);
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m]! : (a[m - 1]! + a[m]!) / 2;
};

export function learningRecord(p: Progress): LearningRecord {
  const items = Object.entries(p.stats).filter(([, s]) => s.r + s.w > 0);
  const mastered = items.filter(([, s]) => s.mast != null || (s.box || 0) >= MASTERED_BOX);
  const withTimes = mastered.filter(([, s]) => s.mast != null && s.first != null);
  let timed = 0;
  let fluent = 0;
  for (const [k, s] of items) {
    const target = targetOfStat(k);
    if (target == null || s.t == null) continue;
    timed++;
    if (s.t <= target) fluent++;
  }
  return {
    practised: items.length,
    mastered: mastered.length,
    medianDays: median(withTimes.map(([, s]) => Math.max(0, (s.mast! - s.first!) / DAY))),
    medianAnswers: median(withTimes.map(([, s]) => s.ma ?? s.r + s.w)),
    d1: p.retention.d1,
    d7: p.retention.d7,
    timed,
    fluent,
  };
}

export const pct = (t: { ok: number; n: number }): string => (t.n ? `${Math.round((100 * t.ok) / t.n)}%` : '–');
