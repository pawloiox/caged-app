/**
 * Leitner spaced repetition. Boxes 0–4, seen again after 0, 1, 2, 4, 8 days.
 * A right answer moves an item up a box; a miss sends it back to box 0.
 *
 * Speed counts: a right answer that is slower than the item's target is practice, not mastery. It keeps the
 * item in its box (and resets its timer), so the item comes back at the same interval until it is quick.
 */
export interface Stat {
  r: number;
  w: number;
  box: number;
  last: number;
  /** Typical time for a right answer, in ms (a running average). */
  t?: number;
  /** When the item was first answered. */
  first?: number;
  /** When it first reached box 2 (right after at least a day): "mastered". */
  mast?: number;
  /** Attempts it took to get there. */
  ma?: number;
}

/** Box 2 means the item was answered right, on time, after a gap of at least a day. */
export const MASTERED_BOX = 2;

export interface Timing {
  /** How long the answer took. */
  ms?: number;
  /** The time a fluent answer takes for this item. */
  targetMs?: number;
}

/** A right answer slower than its target. */
export const isSlow = (t: Timing | undefined): boolean =>
  !!t && t.ms != null && t.targetMs != null && t.ms > t.targetMs;

export const BOX_DAYS = [0, 1, 2, 4, 8] as const;
export const DAY = 86_400_000;

export const isDue = (s: Stat | undefined, now = Date.now()): boolean =>
  !!s && s.r + s.w > 0 && now - (s.last || 0) >= BOX_DAYS[Math.max(0, Math.min(4, s.box || 0))]! * DAY;

/** Due items about 3×, unseen 1.5×, others 0.35×, scaled by error history. */
export function weightOf(s: Stat | undefined, now = Date.now()): number {
  if (!s || s.r + s.w === 0) return 1.5;
  return ((isDue(s, now) ? 3 : 0.35) * (1 + s.w)) / (1 + 0.3 * s.r);
}

export function record(s: Stat | undefined, ok: boolean, now = Date.now(), timing?: Timing): Stat {
  const cur: Stat = s ?? { r: 0, w: 0, box: 0, last: now };
  const base: Stat = { ...cur, first: cur.first ?? (s && s.r + s.w > 0 ? cur.last : now) };
  if (!ok) return { ...base, w: cur.w + 1, box: 0, last: now };
  // Running average of right-answer times (the newest answer weighs 40 %).
  const ms = timing?.ms;
  if (ms != null && Number.isFinite(ms) && ms >= 0) base.t = Math.round(cur.t == null ? ms : 0.6 * cur.t + 0.4 * ms);
  // A right answer moves the item up only when it was due (or new). Answering again before then counts
  // as practice, without pushing the next review further out.
  const due = !s || s.r + s.w === 0 || isDue(s, now);
  if (!due) return { ...base, r: cur.r + 1 };
  // Right but slow: same box, timer reset, so it comes back at the same interval.
  if (isSlow(timing)) return { ...base, r: cur.r + 1, last: now };
  const box = Math.min(4, (cur.box || 0) + 1);
  const out: Stat = { ...base, r: cur.r + 1, box, last: now };
  if (box >= MASTERED_BOX && cur.mast == null) {
    out.mast = now;
    out.ma = cur.r + cur.w + 1;
  }
  return out;
}

export function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, rnd: () => number = Math.random): T {
  const ws = items.map(weight);
  let x = rnd() * ws.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) {
    x -= ws[i]!;
    if (x <= 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

export const dueKeys = (stats: Record<string, Stat>, now = Date.now()): string[] =>
  Object.keys(stats).filter((k) => isDue(stats[k], now));

/** Migrate v5 stats that predate boxes. */
export function migrateStat(s: Partial<Stat> & { r: number; w: number }, now = Date.now()): Stat {
  const out: Stat = { r: s.r, w: s.w, box: s.box ?? (s.r > s.w ? 1 : 0), last: s.last ?? now };
  if (s.t != null) out.t = s.t;
  if (s.first != null) out.first = s.first;
  if (s.mast != null) out.mast = s.mast;
  if (s.ma != null) out.ma = s.ma;
  return out;
}

/** Days since an item was last answered, for retention: how well does it survive a gap? */
export const gapDays = (s: Stat | undefined, now = Date.now()): number =>
  s && s.r + s.w > 0 ? (now - s.last) / DAY : 0;
