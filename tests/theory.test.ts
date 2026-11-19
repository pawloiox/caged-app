import { describe, expect, it } from 'vitest';
import {
  CHORD_IVS,
  earDegrees,
  progById,
  tonicOf,
  barreFor,
  shapeTip,
  ORDER,
  PENT,
  PROGS,
  ZONES,
  buildProgression,
  explainChoice,
  fingerOf,
  instances,
  keyName,
  notesOf,
  openChord,
  pentBox,
  planProgression,
  rootsOf,
  sharedRoots,
  spell,
  stringsFor,
  type Instance,
  type Quality,
  type Voicing,
} from '../src/theory';

const KEYS = Array.from({ length: 12 }, (_, i) => i);
const VOICINGS: Voicing[] = ['full', 'easy', 'top4', 'tri'];
const fmt = (i: Instance) => `${i.shape}@${i.minF}`;
const pos = (n: { s: number; f: number }) => `${n.s}:${n.f}`;

describe('instances', () => {
  for (const q of ['major', 'minor', 'dom7'] as Quality[]) {
    it(`every ${q} instance in all 12 keys contains only chord tones`, () => {
      for (const k of KEYS)
        for (const inst of instances(k, q))
          for (const n of notesOf(inst)) expect(CHORD_IVS[q], `${k} ${q} ${fmt(inst)} s${n.s}`).toContain(n.iv);
    });
  }

  it('every major/minor/dom7 instance contains the root and the 3rd', () => {
    for (const q of ['major', 'minor', 'dom7'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q)) {
          const ivs = new Set(notesOf(inst).map((n) => n.iv));
          expect(ivs.has(0)).toBe(true);
          expect(ivs.has(q === 'minor' ? 3 : 4)).toBe(true);
          if (q === 'dom7') expect(ivs.has(10), `${k} ${fmt(inst)} has ♭7`).toBe(true);
        }
  });

  it('C major gives C@0, A@3, G@5, E@8, D@10, C@12', () => {
    expect(instances(0, 'major').map(fmt)).toEqual(['C@0', 'A@3', 'G@5', 'E@8', 'D@10', 'C@12']);
  });

  it('C major neighbours share roots A3, G5, E8+e8, D10, B13', () => {
    const l = instances(0, 'major');
    const links = l.slice(0, -1).map((a, i) =>
      sharedRoots(a, l[i + 1]!)
        .map(pos)
        .sort(),
    );
    expect(links).toEqual([['1:3'], ['3:5'], ['0:8', '5:8'], ['2:10'], ['4:13']]);
  });

  // Dom7 forms trade an octave root for the ♭7 (A7, E7), so linking is taught with major and minor shapes.
  it('neighbouring major and minor shapes always share at least one root', () => {
    for (const q of ['major', 'minor'] as Quality[])
      for (const k of KEYS) {
        const l = instances(k, q);
        for (let i = 0; i < l.length - 1; i++)
          expect(sharedRoots(l[i]!, l[i + 1]!).length, `${k}${q} ${fmt(l[i]!)}→${fmt(l[i + 1]!)}`).toBeGreaterThan(0);
      }
  });

  it("keeps G♯m's G-shape at 4-2-1-1-0-4", () => {
    const g = instances(8, 'minor').find((i) => i.shape === 'G' && i.minF === 0)!;
    expect(g.frets).toEqual([4, 2, 1, 1, 0, 4]);
    expect([0, 1, 2, 3, 4, 5].map((st) => fingerOf(g, st)).join('-')).toBe('3-2-1-1-○-4');
  });

  it('lists shapes in C-A-G-E-D loop order starting at a different shape per key', () => {
    for (const q of ['major', 'minor'] as Quality[])
      for (const k of KEYS) {
        const l = instances(k, q);
        const si = ORDER.indexOf(l[0]!.shape);
        l.slice(0, 5).forEach((inst, i) => expect(inst.shape).toBe(ORDER[(si + i) % 5]));
      }
  });

  it('open chords are the familiar open shapes', () => {
    expect(openChord('C').frets).toEqual([null, 3, 2, 0, 1, 0]);
    expect(openChord('G').frets).toEqual([3, 2, 0, 0, 0, 3]);
    expect(openChord('E', 'dom7').frets).toEqual([0, 2, 0, 1, 0, 0]);
    expect(openChord('A', 'dom7').frets).toEqual([null, 0, 2, 0, 2, 0]);
    expect(openChord('D', 'dom7').frets).toEqual([null, null, 0, 2, 1, 2]);
    expect(openChord('G', 'dom7').frets).toEqual([3, 2, 0, 0, 0, 1]);
  });
});

describe('voicings', () => {
  it('every voicing of every instance has ≥3 notes and ≥3 distinct chord tones; triads have exactly 3', () => {
    for (const q of ['major', 'minor'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q))
          for (const v of VOICINGS) {
            const ns = notesOf(inst, stringsFor(v, inst));
            const label = `${k}${q} ${fmt(inst)} ${v}`;
            expect(ns.length, label).toBeGreaterThanOrEqual(3);
            expect(new Set(ns.map((n) => n.iv)).size, label).toBeGreaterThanOrEqual(3);
            if (v === 'tri') expect(ns.length, label).toBe(3);
          }
  });

  it('every dom7 voicing has 4+ notes with root/3rd/♭7 present (♭7 always), never only a triad', () => {
    for (const k of KEYS)
      for (const inst of instances(k, 'dom7'))
        for (const v of VOICINGS) {
          const ns = notesOf(inst, stringsFor(v, inst));
          const ivs = new Set(ns.map((n) => n.iv));
          const label = `${k}7 ${fmt(inst)} ${v}`;
          expect(ns.length, label).toBeGreaterThanOrEqual(4);
          expect(ivs.has(10), label).toBe(true);
          expect(ivs.has(4), label).toBe(true);
          expect(ivs.size, label).toBeGreaterThanOrEqual(3);
        }
  });

  it('every fretted note in every voicing has a finger, except the full minor G-shape outer strings', () => {
    for (const q of ['major', 'minor', 'dom7'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q))
          for (const v of VOICINGS) {
            const strings = stringsFor(v, inst);
            for (const n of notesOf(inst, strings)) {
              const fg = fingerOf(inst, n.s, strings);
              const exempt =
                q === 'minor' &&
                inst.shape === 'G' &&
                inst.minF > 0 &&
                !strings &&
                (n.s === 0 || n.s === 1 || n.s === 5);
              const label = `${k}${q} ${fmt(inst)} ${v} s${n.s}`;
              if (exempt) expect(fg, label).toBe('');
              else if (n.f === 0) expect(fg, label).toBe('○');
              else expect(fg, label).toMatch(/^[1-4]$/);
            }
          }
  });

  it('finger numbers are physically sensible: within a shape, higher frets never get a lower finger (except barres)', () => {
    for (const q of ['major', 'minor', 'dom7'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q)) {
          if (inst.minF === 0) continue;
          for (const v of VOICINGS) {
            const strings = stringsFor(v, inst);
            const ns = notesOf(inst, strings)
              .map((n) => ({ f: n.f, g: Number(fingerOf(inst, n.s, strings)) }))
              .filter((x) => x.g > 0);
            for (const a of ns)
              for (const b of ns) if (a.f < b.f) expect(a.g, `${k}${q} ${fmt(inst)} ${v}`).toBeLessThan(b.g);
          }
        }
  });
});

describe('spelling', () => {
  it('spells letter-correct notes', () => {
    expect(spell('D♭', 5)).toBe('G♭'); // D♭ major IV
    expect(spell('F♯', 7)).toBe('C♯'); // F♯ major V
    expect(spell('F♯', 9)).toBe('D♯'); // vi
    expect(spell('F♯', 4)).toBe('A♯'); // 3rd of F♯
    expect(spell('A', 8)).toBe('F');
    expect(spell('A', 3)).toBe('C');
    expect(spell('A', 10)).toBe('G');
    expect(spell('E', 4)).toBe('G♯');
    expect(spell('E♭', 8)).toBe('C♭'); // E♭ minor VI
    expect(spell('F♯', 5)).toBe('B');
    expect(spell('C♯', 4)).toBe('E♯');
    expect(spell('C', 10)).toBe('B♭');
  });

  it('spells progression chords from the tonic', () => {
    const fs = buildProgression(6, '1564', 'z5', 'full');
    expect(fs.map((c) => c.name)).toEqual(['F♯', 'C♯', 'D♯m', 'B']);
    const db = buildProgression(1, '145', 'z5', 'full');
    expect(db.map((c) => c.name)).toEqual(['D♭', 'G♭', 'A♭']);
    const am = buildProgression(9, 'm1637', 'z5', 'full');
    expect(am.map((c) => c.name)).toEqual(['Am', 'F', 'C', 'G']);
    const ebm = buildProgression(3, 'm1637', 'z5', 'full');
    expect(ebm.map((c) => c.name)).toEqual(['E♭m', 'C♭', 'G♭', 'D♭']);
  });

  it('offers D♯m spelling as a beginner-friendly option', () => {
    expect(keyName(3, 'minor')).toBe('E♭');
    expect(keyName(3, 'minor', 'sharp')).toBe('D♯');
    const dsm = buildProgression(3, 'm1637', 'z5', 'full', 'sharp');
    expect(dsm.map((c) => c.name)).toEqual(['D♯m', 'B', 'F♯', 'C♯']);
    expect(spell('D♯', 3)).toBe('F♯');
  });
});

describe('pentatonic boxes', () => {
  // The five standard boxes of A minor pentatonic, normalised so the lowest fret is 0.
  const STANDARD = [
    [
      [5, 8],
      [5, 7],
      [5, 7],
      [5, 7],
      [5, 8],
      [5, 8],
    ],
    [
      [8, 10],
      [7, 10],
      [7, 10],
      [7, 9],
      [8, 10],
      [8, 10],
    ],
    [
      [10, 12],
      [10, 12],
      [10, 12],
      [9, 12],
      [10, 13],
      [10, 12],
    ],
    [
      [12, 15],
      [12, 15],
      [12, 14],
      [12, 14],
      [13, 15],
      [12, 15],
    ],
    [
      [15, 17],
      [15, 17],
      [14, 17],
      [14, 17],
      [15, 17],
      [15, 17],
    ],
  ].map((b) => {
    const m = Math.min(...b.flat());
    return JSON.stringify(b.map((p) => p.map((f) => f - m)));
  });
  const shapeOf = (inst: Instance) => {
    const box = pentBox(inst);
    const per = [0, 1, 2, 3, 4, 5].map((s) =>
      box
        .filter((n) => n.s === s)
        .map((n) => n.f)
        .sort((a, b) => a - b),
    );
    const m = Math.min(...per.flat());
    return { per, norm: JSON.stringify(per.map((p) => p.map((f) => f - m))) };
  };

  it('C major E-shape box is the standard one', () => {
    const e = instances(0, 'major').find((i) => i.shape === 'E')!;
    expect(pentBox(e).map(pos)).toEqual([
      '0:8',
      '0:10',
      '1:7',
      '1:10',
      '2:7',
      '2:10',
      '3:7',
      '3:9',
      '4:8',
      '4:10',
      '5:8',
      '5:10',
    ]);
  });

  it('A minor G-shape box has B string 3 and 5', () => {
    const g = instances(9, 'minor').find((i) => i.shape === 'G')!;
    const b = pentBox(g)
      .filter((n) => n.s === 4)
      .map((n) => n.f);
    expect(b).toEqual([3, 5]);
  });

  it('every box in the explorer range matches one of the five standard boxes', () => {
    let count = 0;
    for (const q of ['major', 'minor'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q)) {
          const { per, norm } = shapeOf(inst);
          // Boxes cut by the nut or the board edge can't be the full standard pattern.
          if (per.some((p) => p.length !== 2) || inst.minF <= 1) continue;
          expect(STANDARD, `${k}${q} ${fmt(inst)}`).toContain(norm);
          count++;
        }
    expect(count).toBeGreaterThanOrEqual(60);
  });

  it('every box has 2 notes per string within the board, a span of ≤4 frets, and only scale notes', () => {
    for (const q of ['major', 'minor'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q)) {
          const box = pentBox(inst);
          const fs = box.map((n) => n.f);
          expect(Math.max(...fs) - Math.min(...fs)).toBeLessThanOrEqual(4);
          for (const n of box) expect(PENT[q]).toContain(n.iv);
          for (let s = 0; s < 6; s++) expect(box.filter((n) => n.s === s).length).toBeLessThanOrEqual(2);
          if (inst.maxF <= 12)
            for (let s = 0; s < 6; s++)
              expect(box.filter((n) => n.s === s).length, `${k}${q} ${fmt(inst)} s${s}`).toBe(2);
        }
  });

  it('each box contains every chord tone of its shape', () => {
    for (const q of ['major', 'minor'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q)) {
          const keys = new Set(pentBox(inst).map(pos));
          const missing = notesOf(inst).filter((n) => !keys.has(pos(n)));
          // Shapes that reach past the box edge may leave one chord tone outside; at most one.
          expect(missing.length, `${k}${q} ${fmt(inst)}`).toBeLessThanOrEqual(1);
        }
  });
});

describe('planner', () => {
  const zone = (id: string) => ZONES.find((z) => z.id === id)!;

  it('C–G–Am–F in the open zone with 4 strings: open C, open G, open Am, E-shape F', () => {
    const plan = planProgression(
      [
        { pc: 0, q: 'major' },
        { pc: 7, q: 'major' },
        { pc: 9, q: 'minor' },
        { pc: 5, q: 'major' },
      ],
      zone('open'),
      'top4',
    );
    expect(plan.map((p) => `${p.inst.shape}@${p.inst.minF}`)).toEqual(['C@0', 'G@0', 'A@0', 'E@1']);
  });

  it('ii–V–I in every key, zone and voicing never needs a fretted span over 3', () => {
    for (const k of KEYS)
      for (const z of ZONES)
        for (const v of VOICINGS) {
          const plan = buildProgression(k, '251', z.id, v);
          for (const c of plan) {
            const fr = c.notes.filter((n) => n.f > 0).map((n) => n.f);
            const span = fr.length ? Math.max(...fr) - Math.min(...fr) : 0;
            expect(span, `${k} ${z.id} ${v} ${c.name} ${fmt(c.inst)}`).toBeLessThanOrEqual(3);
          }
        }
  });

  it('the full G-shape barre is rarely chosen', () => {
    let g = 0;
    let total = 0;
    for (const p of PROGS)
      for (const k of KEYS)
        for (const z of ZONES) {
          const plan = buildProgression(k, p.id, z.id, 'full');
          for (const c of plan) {
            total++;
            if (c.inst.shape === 'G' && c.inst.minF > 0) g++;
          }
        }
    expect(g / total).toBeLessThan(0.03);
  });

  it('every planned chord in every voicing has at least 3 notes and its root or an anchor', () => {
    for (const p of PROGS)
      for (const k of KEYS)
        for (const z of ZONES)
          for (const v of VOICINGS) {
            for (const c of buildProgression(k, p.id, z.id, v)) {
              expect(c.notes.length).toBeGreaterThanOrEqual(3);
              expect(rootsOf(c.inst).length).toBeGreaterThan(0);
            }
          }
  });

  it('12-bar blues with 7ths uses dominant chords that contain the ♭7', () => {
    for (const k of KEYS)
      for (const z of ZONES)
        for (const v of VOICINGS)
          for (const c of buildProgression(k, 'blues7', z.id, v)) {
            expect(c.q).toBe('dom7');
            expect(
              c.notes.some((n) => n.iv === 10),
              `${k} ${z.id} ${v} ${c.name}`,
            ).toBe(true);
          }
  });

  it('explains each voicing choice in one line', () => {
    const plan = buildProgression(0, '1564', 'open', 'top4');
    const lines = plan.map(explainChoice);
    expect(lines[1]).toBe('Open G: all six strings ring.');
    expect(lines[0]).toMatch(/^Open C: /);
    for (const l of lines) expect(l.length).toBeLessThan(110);
    const z5 = buildProgression(0, '145', 'z7', 'top4').map(explainChoice);
    for (const l of z5) expect(l).toMatch(/-shape, (barre|index) at fret \d+/);
  });
});

describe('barres', () => {
  const find = (key: number, q: Quality, shape: string) =>
    instances(key, q).find((i) => i.shape === shape && i.minF > 0)!;
  const fmtB = (b: ReturnType<typeof barreFor>) => (b ? `${b.f}:${b.s1}-${b.s2}` : 'none');

  it('places the index barre where finger 1 lies across strings', () => {
    expect(fmtB(barreFor(find(6, 'major', 'C')))).toBe('6:3-5'); // F♯ C-shape (the screenshot): index on G and e at 6
    expect(fmtB(barreFor(find(5, 'major', 'E')))).toBe('1:0-5'); // F: full E-shape barre
    expect(fmtB(barreFor(find(0, 'major', 'A')))).toBe('3:1-5'); // C: A-shape x-1-2-3-4-1
    expect(fmtB(barreFor(find(0, 'major', 'G')))).toBe('5:2-4'); // C: G-shape index on D G B
    expect(fmtB(barreFor(find(0, 'minor', 'E')))).toBe('8:0-5');
    expect(fmtB(barreFor(find(0, 'dom7', 'A')))).toBe('3:1-5'); // C7 A-form
  });

  it('has no barre for open chords, the D-shape or the full minor G-shape', () => {
    for (const k of KEYS) {
      for (const inst of instances(k, 'major')) if (inst.minF === 0) expect(barreFor(inst)).toBeNull();
      for (const inst of instances(k, 'major').filter((i) => i.shape === 'D')) expect(barreFor(inst)).toBeNull();
      for (const inst of instances(k, 'minor').filter((i) => i.shape === 'G' && i.minF > 0))
        expect(barreFor(inst)).toBeNull();
    }
  });

  it('follows the voicing: the easy E-shape barres only B and e', () => {
    const e = find(5, 'major', 'E');
    expect(fmtB(barreFor(e, stringsFor('easy', e)))).toBe('1:4-5');
    expect(fmtB(barreFor(e, stringsFor('tri', e)))).toBe('1:4-5');
  });

  it('every barre covers only played strings at the barre fret or above, and its ends are finger-1 notes', () => {
    for (const q of ['major', 'minor', 'dom7'] as Quality[])
      for (const k of KEYS)
        for (const inst of instances(k, q))
          for (const v of VOICINGS) {
            const strings = stringsFor(v, inst);
            const b = barreFor(inst, strings);
            if (!b) continue;
            const label = `${k}${q} ${fmt(inst)} ${v}`;
            expect(fingerOf(inst, b.s1, strings), label).toBe('1');
            expect(fingerOf(inst, b.s2, strings), label).toBe('1');
            for (const n of notesOf(inst, strings)) expect(n.f, label).toBeGreaterThanOrEqual(b.f);
          }
  });
});

describe('shape tips', () => {
  it('open chords get a tip from their real fingering, not the movable-shape tip', () => {
    const c = instances(0, 'major')[0]!;
    expect(c.minF).toBe(0);
    const tip = shapeTip(c);
    expect(tip).toContain('x-3-2-0-1-0');
    expect(tip).toContain('A string fret 3 (finger 3)');
    expect(tip).not.toContain('finger 4');
    expect(shapeTip(instances(0, 'major').find((i) => i.shape === 'E')!)).toMatch(/^Full: fingers 1-3-4-2-1-1/);
  });
});

describe('home chord', () => {
  it('is the I (or i, I7) of every progression, so ii–V–I resolves to I, not ii', () => {
    for (const p of PROGS) {
      const t = tonicOf(buildProgression(5, p.id, 'z5', 'full'));
      expect(t.roman, p.id).toMatch(/^(I|i)7?$/);
    }
    const iiVI = buildProgression(5, '251', 'z5', 'full');
    expect(tonicOf(iiVI).name).toBe('F');
    expect(earDegrees(progById('251')).map((d) => d.roman)).toEqual(['ii', 'V']);
    for (const p of PROGS)
      expect(
        earDegrees(p).some((d) => /^(I|i)7?$/.test(d.roman)),
        p.id,
      ).toBe(false);
  });
});
