/**
 * Fret spacing. On a real guitar each fret is 2^(-1/12) the width of the one before (equal temperament), so the
 * frets close up toward the body. A literal scale would make fret 15 less than half as wide as fret 1, too small
 * for a note dot and a touch target, so the curve is softened by `k` (1 = real, 0 = even) and floored at `min`.
 */
export interface FretSpacing {
  /** Width of each fret cell, for frets first…last. */
  widths: number[];
  /** Start of each fret cell along the neck, relative to the first cell. */
  starts: number[];
  total: number;
}

export function fretSpacing(first: number, last: number, avg: number, k: number, min: number): FretSpacing {
  const frets: number[] = [];
  for (let f = first; f <= last; f++) frets.push(f);
  const weights = frets.map((f) => Math.pow(2, (-(f - 1) * k) / 12));
  const sum = weights.reduce((a, b) => a + b, 0);
  let scale = (avg * frets.length) / sum;
  const smallest = Math.min(...weights);
  if (scale * smallest < min) scale = min / smallest;
  const widths = weights.map((w) => +(w * scale).toFixed(3));
  const starts: number[] = [];
  let x = 0;
  for (const w of widths) {
    starts.push(+x.toFixed(3));
    x += w;
  }
  return { widths, starts, total: +x.toFixed(3) };
}
