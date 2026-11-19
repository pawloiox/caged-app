/**
 * Leitner spaced repetition. Boxes 0–4, seen again after 0, 1, 2, 4, 8 days.
 * A right answer moves an item up a box; a miss sends it back to box 0.
 */
export interface Stat {
  r: number;
  w: number;
  box: number;
  last: number;
}

export const BOX_DAYS = [0, 1, 2, 4, 8] as const;
export const DAY = 86_400_000;

export const isDue = (s: Stat | undefined, now = Date.now()): boolean =>
  !!s && s.r + s.w > 0 && now - (s.last || 0) >= BOX_DAYS[Math.max(0, Math.min(4, s.box || 0))]! * DAY;

/** Due items about 3×, unseen 1.5×, others 0.35×, scaled by error history. */
export function weightOf(s: Stat | undefined, now = Date.now()): number {
  if (!s || s.r + s.w === 0) return 1.5;
  return ((isDue(s, now) ? 3 : 0.35) * (1 + s.w)) / (1 + 0.3 * s.r);
}

export function record(s: Stat | undefined, ok: boolean, now = Date.now()): Stat {
  const cur = s ?? { r: 0, w: 0, box: 0, last: now };
  if (!ok) return { r: cur.r, w: cur.w + 1, box: 0, last: now };
  // A right answer moves the item up only when it was due (or new). Answering again before then counts
  // as practice, without pushing the next review further out.
  const due = !s || s.r + s.w === 0 || isDue(s, now);
  return due ? { r: cur.r + 1, w: cur.w, box: Math.min(4, (cur.box || 0) + 1), last: now } : { ...cur, r: cur.r + 1 };
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
  return { r: s.r, w: s.w, box: s.box ?? (s.r > s.w ? 1 : 0), last: s.last ?? now };
}
