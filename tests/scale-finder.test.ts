import { describe, expect, it } from 'vitest';
import { SCALES, findScales, scaleLabel } from '../src/theory';

const names = (ms: ReturnType<typeof findScales>) => ms.map((m) => scaleLabel(m.sc, m.key));

describe('scale finder', () => {
  it('finds nothing from no notes', () => {
    expect(findScales([])).toEqual([]);
  });

  it('every match holds every note given, and nothing that does is left out', () => {
    const pcs = [9, 0, 4]; // A C E
    const ms = findScales(pcs);
    for (const m of ms) for (const pc of pcs) expect(m.sc.steps.map((s) => (m.key + s) % 12)).toContain(pc);
    let all = 0;
    for (const sc of SCALES)
      for (let k = 0; k < 12; k++) if (pcs.every((pc) => sc.steps.some((s) => (k + s) % 12 === pc))) all++;
    expect(ms).toHaveLength(all);
  });

  it('the closest fit first, rooted on the lowest note played', () => {
    // A C D E G: A minor pentatonic and C major pentatonic hold exactly these, then the seven-note scales.
    const ms = findScales([9, 0, 2, 4, 7], { lowest: 9 });
    expect(names(ms).slice(0, 2)).toEqual(['A minor pentatonic', 'C major pentatonic']);
    expect(ms[0]!.extra).toBe(0);
    expect(ms.slice(2).every((m) => m.extra === 2)).toBe(true);
    // Played from C instead, the major reading comes first.
    expect(names(findScales([9, 0, 2, 4, 7], { lowest: 0 }))[0]).toBe('C major pentatonic');
  });

  it('a whole white-key scale is every mode, the one on the lowest note first', () => {
    const white = [0, 2, 4, 5, 7, 9, 11];
    const ms = findScales(white, { lowest: 2 });
    expect(names(ms)).toEqual([
      'D dorian',
      'C major',
      'A natural minor',
      'E phrygian',
      'F lydian',
      'G mixolydian',
      'B locrian',
    ]);
  });

  it('a root keeps only the scales on it', () => {
    const ms = findScales([9, 0, 4], { root: 9 });
    expect(ms.length).toBeGreaterThan(0);
    expect(ms.every((m) => m.key === 9)).toBe(true);
    expect(names(ms)[0]).toBe('A minor pentatonic');
  });

  it('a note outside every scale on that root finds nothing', () => {
    // A with B♭ and B together: no scale here has both a ♭2 and a 2.
    expect(findScales([9, 10, 11], { root: 9 })).toEqual([]);
  });

  it('the raised 7th of harmonic minor', () => {
    const ms = findScales([9, 11, 0, 2, 4, 5, 8], { lowest: 9 });
    expect(names(ms)).toEqual(['A harmonic minor']);
  });
});
