import { describe, expect, it } from 'vitest';
import {
  SCALES,
  SCALE_LAST_FRET,
  degreeLabel,
  instances,
  npsOf,
  patternFingers,
  pcOfName,
  pentBox,
  scaleById,
  scaleNoteName,
  scaleOnNeck,
  scalePattern,
  scalePatterns,
  scaleRootName,
  scalesFor,
} from '../src/theory';

const rows = (id: string, key: number, n: number) => {
  const sc = scaleById(id)!;
  const p = scalePattern(sc, key, n, npsOf(sc));
  return [0, 1, 2, 3, 4, 5].map((s) =>
    p.notes
      .filter((x) => x.s === s)
      .map((x) => x.f)
      .join(','),
  );
};

describe('scale patterns', () => {
  it('2NPS holds the pentatonic scales and 3NPS the seven-note ones', () => {
    expect(scalesFor(2).map((s) => s.id)).toEqual(['minor-pent', 'major-pent']);
    expect(scalesFor(3)).toHaveLength(9);
    expect(scalesFor(3).every((s) => s.steps.length === 7)).toBe(true);
  });

  it('every pattern climbs the scale note by note, the same count on every string, on the board', () => {
    for (const sc of SCALES)
      for (let key = 0; key < 12; key++) {
        const nps = npsOf(sc);
        const ps = scalePatterns(sc, key, nps);
        expect(ps.map((p) => p.n)).toEqual(sc.steps.map((_, i) => i + 1));
        for (const p of ps) {
          expect(p.notes).toHaveLength(6 * nps);
          for (let s = 0; s < 6; s++) expect(p.notes.filter((x) => x.s === s)).toHaveLength(nps);
          expect(p.notes[0]!.s).toBe(0);
          expect(p.notes[0]!.i).toBe(p.n - 1);
          p.notes.forEach((x, k) => {
            expect(x.f).toBeGreaterThanOrEqual(0);
            expect(x.f).toBeLessThanOrEqual(SCALE_LAST_FRET);
            expect((((x.midi - key) % 12) + 12) % 12).toBe(sc.steps[x.i]);
            if (k) {
              const prev = p.notes[k - 1]!;
              expect(x.midi).toBeGreaterThan(prev.midi);
              expect(x.i).toBe((prev.i + 1) % sc.steps.length);
            }
          });
          // A hand can play it: no string spans more than five frets.
          for (let s = 0; s < 6; s++) {
            const fs = p.notes.filter((x) => x.s === s).map((x) => x.f);
            expect(Math.max(...fs) - Math.min(...fs)).toBeLessThanOrEqual(5);
          }
        }
      }
    expect(SCALE_LAST_FRET).toBe(17);
  });

  it('gives the standard boxes and 3NPS patterns', () => {
    // A minor pentatonic, box 1 at the 5th fret and box 3 with the B string's shift.
    expect(rows('minor-pent', 9, 1)).toEqual(['5,8', '5,7', '5,7', '5,7', '5,8', '5,8']);
    expect(rows('minor-pent', 9, 3)).toEqual(['10,12', '10,12', '10,12', '9,12', '10,13', '10,12']);
    // E minor pentatonic, box 1 in open position.
    expect(rows('minor-pent', 4, 1)).toEqual(['0,3', '0,2', '0,2', '0,2', '0,3', '0,3']);
    // G major 3NPS, pattern 1 from the root at the 3rd fret.
    expect(rows('major', 7, 1)).toEqual(['3,5,7', '3,5,7', '4,5,7', '4,5,7', '5,7,8', '5,7,8']);
    // A Dorian, pattern 1.
    expect(rows('dorian', 9, 1)).toEqual(['5,7,8', '5,7,9', '5,7,9', '5,7,9', '7,8,10', '7,8,10']);
  });

  it('each 2NPS pattern is the pentatonic box of its CAGED shape', () => {
    for (const [id, q] of [
      ['minor-pent', 'minor'],
      ['major-pent', 'major'],
    ] as const)
      for (let key = 0; key < 12; key++) {
        const shapes = instances(key, q).filter((i) => i.minF >= 2 && i.maxF <= 11);
        for (const p of scalePatterns(scaleById(id)!, key, 2)) {
          const inst = shapes.find((i) => i.shape === p.shape);
          if (!inst) continue;
          const norm = (ns: Array<{ s: number; f: number }>) => ns.map((n) => `${n.s}:${n.f % 12}`).sort();
          expect(norm(p.notes), `${id} ${key} ${p.shape}`).toEqual(norm(pentBox(inst)));
        }
      }
  });

  it('suggests fingers: 3NPS stretches, 2NPS in position with the shift at the B string', () => {
    const major = scaleById('major')!;
    expect(patternFingers(scalePattern(major, 7, 1, 3)).join('')).toBe('124124124124134134');
    const pent = scaleById('minor-pent')!;
    expect(patternFingers(scalePattern(pent, 9, 1, 2)).join('')).toBe('141313131414');
    expect(patternFingers(scalePattern(pent, 9, 3, 2)).join('')).toBe('242424141413');
    expect(patternFingers(scalePattern(pent, 4, 1, 2)).join('')).toBe('○3○2○2○2○3○3');
  });

  it('spells every scale with one letter per degree and names the key with the fewest accidentals', () => {
    for (const sc of SCALES)
      for (let key = 0; key < 12; key++) {
        const root = scaleRootName(sc, key);
        expect(pcOfName(root)).toBe(key);
        const names = sc.steps.map((_, i) => scaleNoteName(sc, root, i));
        names.forEach((n, i) => {
          expect(n).not.toMatch(/[?𝄪𝄫]/u);
          expect(pcOfName(n)).toBe((key + sc.steps[i]!) % 12);
        });
        expect(new Set(names.map((n) => n[0])).size).toBe(sc.steps.length);
      }
    const dorian = scaleById('dorian')!;
    expect(scaleRootName(dorian, 1)).toBe('C♯');
    expect(sc7(dorian, 1)).toEqual(['C♯', 'D♯', 'E', 'F♯', 'G♯', 'A♯', 'B']);
    expect(sc7(scaleById('lydian')!, 5)).toEqual(['F', 'G', 'A', 'B', 'C', 'D', 'E']);
    expect(sc7(scaleById('harmonic-minor')!, 9)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G♯']);
    expect(scaleRootName(scaleById('major')!, 6)).toBe('F♯');
    expect(scaleRootName(scaleById('minor')!, 3)).toBe('E♭');
  });

  it('labels degrees against the major scale', () => {
    const labels = (id: string) => scaleById(id)!.steps.map((_, i) => degreeLabel(scaleById(id)!, i));
    expect(labels('minor-pent')).toEqual(['R', '♭3', '4', '5', '♭7']);
    expect(labels('lydian')).toEqual(['R', '2', '3', '♯4', '5', '6', '7']);
    expect(labels('locrian')).toEqual(['R', '♭2', '♭3', '4', '♭5', '♭6', '♭7']);
  });

  it('finds every scale note on the neck', () => {
    const all = scaleOnNeck(scaleById('minor-pent')!, 9, 17);
    expect(all.filter((n) => n.s === 0).map((n) => n.f)).toEqual([0, 3, 5, 8, 10, 12, 15, 17]);
  });
});

const sc7 = (sc: (typeof SCALES)[number], key: number) => {
  const root = scaleRootName(sc, key);
  return sc.steps.map((_, i) => scaleNoteName(sc, root, i));
};
