import { describe, expect, it } from 'vitest';
import { fretSpacing } from '../src/fretboard/geometry';

describe('fret spacing', () => {
  it('k = 1 follows equal temperament: each fret is 2^(-1/12) of the one before', () => {
    const { widths } = fretSpacing(1, 12, 50, 1, 0);
    for (let i = 1; i < widths.length; i++) expect(widths[i]! / widths[i - 1]!).toBeCloseTo(Math.pow(2, -1 / 12), 3);
    // Fret 12 sits halfway to the bridge, so frets 1–12 shrink to about half.
    expect(widths[11]! / widths[0]!).toBeCloseTo(Math.pow(2, -11 / 12), 3);
  });

  it('the app neck closes up toward the body but never below its minimum', () => {
    const desk = fretSpacing(1, 15, 54, 0.6, 40);
    const phone = fretSpacing(1, 15, 50, 0.45, 44);
    for (const s of [desk, phone])
      for (let i = 1; i < s.widths.length; i++) expect(s.widths[i]!).toBeLessThan(s.widths[i - 1]!);
    expect(Math.min(...desk.widths)).toBeGreaterThanOrEqual(40);
    expect(Math.min(...phone.widths)).toBeGreaterThanOrEqual(44 - 1e-9);
    expect(desk.widths[0]! / desk.widths[14]!).toBeGreaterThan(1.5);
  });

  it('cells tile the neck with no gaps', () => {
    const s = fretSpacing(3, 9, 54, 0.6, 40);
    s.starts.forEach((x, i) => i > 0 && expect(x).toBeCloseTo(s.starts[i - 1]! + s.widths[i - 1]!, 2));
    expect(s.total).toBeCloseTo(s.starts.at(-1)! + s.widths.at(-1)!, 2);
  });
});
