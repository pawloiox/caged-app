import { useEffect, useMemo, useRef, useState } from 'react';
import { engine, toPlayable } from '../audio/engine';
import { COL, barreSpec, mutedSpecs, singleDots } from '../fretboard/build';
import { Legend, Pill, Tab } from '../fretboard/extras';
import { Fretboard } from '../fretboard/Fretboard';
import { addXP, announce, patchSeen, toast, usePrefs, useProgress } from '../store/app';
import { S2_NEED } from '../store/criteria';
import {
  MAX_FRET,
  SHAPES,
  SHAPE_TIPS,
  THIRD_WHERE,
  chordLabel,
  chordLong,
  makeInstance,
  mod12,
  notesOf,
  type Quality,
  type Shape,
} from '../theory';
import { Card, Check, Head, Kbd, LabelSeg, NextLink, QUALITY_OPTS, Seg, ShapeRadio } from '../ui/controls';
import { useHotkeys, useNeckDirection } from '../ui/hooks';

function geo(shape: Shape, q: Quality) {
  const rel = SHAPES[q][shape];
  const p = rel.filter((f) => f != null) as number[];
  const cMin = Math.min(...p);
  const span = Math.max(...p) - cMin;
  return { rel, cMin, nMin: 0, nMax: Math.min(11, MAX_FRET - span) };
}
function instAt(shape: Shape, q: Quality, n: number) {
  const g = geo(shape, q);
  const nn = Math.max(g.nMin, Math.min(g.nMax, n));
  return makeInstance(
    shape,
    q,
    mod12(nn - g.cMin),
    g.rel.map((f) => (f == null ? null : f - g.cMin + nn)),
  );
}
function reachable(shape: Shape, q: Quality): number[] {
  const g = geo(shape, q);
  const out: number[] = [];
  for (let n = g.nMin; n <= g.nMax; n++) out.push(mod12(n - g.cMin));
  return out;
}
const SHAPE_ORDER: Shape[] = ['E', 'A', 'C', 'G', 'D'];

export default function Step2() {
  const prefs = usePrefs();
  const solvedTotal = useProgress((p) => p.seen.s2 ?? 0);
  const dir = useNeckDirection();
  const [shape, setShape] = useState<Shape>('E');
  const [q, setQ] = useState<Quality>('major');
  const [n, setN] = useState(3);
  const [third, setThird] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const [solved, setSolved] = useState<'no' | 'yes' | 'revealed'>('no');
  const lastSound = useRef(0);
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const g = geo(shape, q);
  const inst = useMemo(() => instAt(shape, q, n), [shape, q, n]);
  const ctx = { labels: prefs.labels, sp: prefs.minorSpelling };

  const newTarget = (sh = shape, qq = q, cur = inst.keyPc) => {
    const opts = reachable(sh, qq).filter((x) => x !== cur);
    setTarget(opts[Math.floor(Math.random() * opts.length)]!);
    setSolved('no');
  };
  useEffect(() => {
    if (target == null) newTarget();
  });

  const confirm = () => {
    if (target == null || inst.keyPc !== target || solved !== 'no') return;
    clearTimeout(pending.current);
    setSolved('yes');
    addXP(10);
    patchSeen({ s2: solvedTotal + 1 });
    toast('Found it · +10 XP');
    announce(`Correct: that's ${chordLong(target, q)} with the ${shape}-shape.`);
  };

  // A challenge counts once the shape rests on the target for ~650 ms (or is strummed there),
  // not when the slider passes through it.
  useEffect(() => {
    clearTimeout(pending.current);
    if (target != null && inst.keyPc === target && solved === 'no') pending.current = setTimeout(confirm, 650);
    return () => clearTimeout(pending.current);
  });

  const strum = () => {
    engine.strum(toPlayable(notesOf(inst)));
    confirm();
  };
  const move = (to: number) => {
    const nn = Math.max(g.nMin, Math.min(g.nMax, to));
    if (nn === n) return;
    setN(nn);
    const now = performance.now();
    if (now - lastSound.current > 140) {
      lastSound.current = now;
      engine.strum(toPlayable(notesOf(instAt(shape, q, nn))), { gap: 0.018, vel: 0.6 });
    }
  };
  const changeQ = (nq: Quality) => {
    const pc = inst.keyPc;
    const ng = geo(shape, nq);
    let nn = ng.nMin + mod12(pc + ng.cMin - ng.nMin);
    if (nn > ng.nMax) nn -= 12;
    const finalN = nn >= ng.nMin ? nn : n;
    setQ(nq);
    setN(finalN);
    const ni = instAt(shape, nq, finalN);
    newTarget(shape, nq, ni.keyPc);
    engine.strum(toPlayable(notesOf(ni)));
  };
  const reveal = () => {
    if (target == null) return;
    for (let x = g.nMin; x <= g.nMax; x++)
      if (mod12(x - g.cMin) === target) {
        setN(x);
        engine.strum(toPlayable(notesOf(instAt(shape, q, x))));
        break;
      }
    setSolved('revealed');
  };

  useHotkeys({
    space: strum,
    lower: () => move(n - 1),
    higher: () => move(n + 1),
    char: (k) => {
      if (k === 'a') {
        engine.arpeggio(toPlayable(notesOf(inst)));
        return true;
      }
      return false;
    },
  });

  const b = barreSpec(inst, null);
  const where =
    inst.minF === 0
      ? 'open position: the nut is your barre'
      : b
        ? `index-finger barre at fret ${inst.minF}`
        : `index finger at fret ${inst.minF}`;
  const onTarget = target != null && inst.keyPc === target && solved !== 'no';

  return (
    <>
      <Head
        n={2}
        title="Make the shapes movable"
        lede="In an open chord the nut does the job of a finger. Fret the shape with fingers 2, 3 and 4 instead, lay your index finger across the strings as a barre, and the same shape can move anywhere on the neck."
      />
      <section className="bench" aria-label="Movable shape workbench">
        <div className="toolbar">
          <ShapeRadio
            value={shape}
            order={SHAPE_ORDER}
            onChange={(s) => {
              setShape(s);
              const ni = instAt(s, q, n);
              newTarget(s, q, ni.keyPc);
              engine.strum(toPlayable(notesOf(ni)));
            }}
            label="Shape"
          />
          <Seg value={q} options={QUALITY_OPTS} onChange={changeQ} label="Chord quality" />
          <button
            type="button"
            className="btn"
            onClick={() => {
              setThird(true);
              changeQ(q === 'major' ? 'minor' : 'major');
            }}
          >
            Flip major ↔ minor
          </button>
          <Check checked={third} onChange={setThird}>
            Highlight the 3rd
          </Check>
          <LabelSeg />
        </div>
        <div className="readout" aria-live="polite">
          <span className="chord-big">{chordLabel(inst.keyPc, q, prefs.minorSpelling)}</span>
          <span>
            <Pill s={shape} /> {shape}-shape, {where}
          </span>
        </div>
        <div className="slider-row">
          <label htmlFor="slide" className="muted">
            Where your index finger sits (fret)
          </label>
          <input
            type="range"
            id="slide"
            min={g.nMin}
            max={g.nMax}
            step={1}
            value={Math.max(g.nMin, Math.min(g.nMax, n))}
            onChange={(e) => move(Number(e.target.value))}
            style={prefs.lefty && !dir.vertical ? { direction: 'rtl' } : undefined}
            aria-valuetext={`fret ${n}, ${chordLabel(inst.keyPc, q)}`}
          />
        </div>
        <Fretboard
          dots={singleDots(inst, ctx, { third })}
          muted={mutedSpecs(inst)}
          barre={barreSpec(inst, null, COL[shape])}
          label={`${chordLong(inst.keyPc, q)} with the ${shape}-shape`}
        />
        <Legend keys={['root', 'tone', 'barre', 'mute', ...(third ? ['third'] : [])]} />
        <div className="actions">
          <button type="button" className="btn primary" onClick={strum}>
            Strum<Kbd>Space</Kbd>
          </button>
          <button type="button" className="btn" onClick={() => engine.arpeggio(toPlayable(notesOf(inst)))}>
            Arpeggio<Kbd>A</Kbd>
          </button>
          <button type="button" className="btn" onClick={() => move(n - 1)}>
            One fret down<Kbd>{dir.lowerGlyph}</Kbd>
          </button>
          <button type="button" className="btn" onClick={() => move(n + 1)}>
            One fret up<Kbd>{dir.higherGlyph}</Kbd>
          </button>
        </div>
        {target != null ? (
          onTarget ? (
            <div className={`callout${solved === 'revealed' ? '' : ' good'}`} role="status">
              <p>
                <strong>
                  {solved === 'revealed' ? 'Here it is:' : "That's it:"} {chordLong(target, q, prefs.minorSpelling)}.
                </strong>{' '}
                Same {shape}-shape, new chord.
                {solved === 'revealed' ? " This one doesn't count; try the next on your own." : ''}
              </p>
              <div>
                <button type="button" className="btn small" onClick={() => newTarget()}>
                  Next challenge
                </button>
              </div>
            </div>
          ) : (
            <div className="callout">
              <p>
                <strong>Challenge:</strong> slide the {shape}-shape until it plays{' '}
                <strong>{chordLong(target, q, prefs.minorSpelling)}</strong>. Find the root's fret first.
              </p>
              <div>
                <button type="button" className="btn small ghost" onClick={reveal}>
                  Show me
                </button>
              </div>
            </div>
          )
        ) : null}
      </section>
      <div className="cards">
        <Card title={`Fingering the ${shape}-shape`}>
          <Tab inst={inst} />
          <p className="tipbox">{SHAPE_TIPS[shape]}</p>
        </Card>
        <Card title="Major or minor: one note moves">
          <p>
            A minor chord is a major chord with its 3rd lowered by one fret. Turn on “Highlight the 3rd” and press Flip
            to see it.
          </p>
          <p>
            In the {shape}-shape the 3rd is on the <strong>{THIRD_WHERE[shape]}</strong>.
          </p>
          {q === 'minor' && shape === 'G' ? (
            <p className="muted">The full minor G-shape is almost never played. Use its middle strings: x-x-2-3-1-x.</p>
          ) : null}
        </Card>
        <Card title="Try it on your guitar">
          <ol>
            <li>Play an open E chord with fingers 2, 3 and 4. Your index finger is now free.</li>
            <li>Slide everything up one fret and barre with your index: that's F.</li>
            <li>Up two more frets: G. Same shape, new chord.</li>
          </ol>
          <p className="muted">
            Challenges solved: <strong>{solvedTotal}</strong>. Solve {S2_NEED} to finish this step.
          </p>
        </Card>
      </div>
      <NextLink to="/learn/3">map C up the whole neck</NextLink>
    </>
  );
}
