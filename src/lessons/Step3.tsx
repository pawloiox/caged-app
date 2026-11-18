import { useRef, useState } from 'react';
import { engine, toPlayable } from '../audio/engine';
import { stopLoop } from '../audio/transport';
import { COL, NEUTRAL, NEUTRAL_ROOT, textFor } from '../fretboard/build';
import { LinkList, Tab } from '../fretboard/extras';
import { Fretboard } from '../fretboard/Fretboard';
import { announce, patchSeen, recordStat, usePrefs, useProgress } from '../store/app';
import { CHECK_LEN, CHECK_PASS } from '../store/criteria';
import {
  ORDER,
  SHAPE_TIPS,
  chordLong,
  dotLabel,
  instances,
  notesOf,
  posName,
  rootsOf,
  stringsFor,
  type Instance,
  type Quality,
  type Shape,
  type Voicing,
} from '../theory';
import { Card, Criteria, Head, Kbd, NextLink, ShapeAnswer } from '../ui/controls';
import { MapBench, createMapStore, useMapList } from './map';

const useS3 = createMapStore({ key: 0, q: 'major', voicing: 'full' });

/** The difficulty ramp. Level 1 (C major, root hints) is what the step requires. */
export const LEVELS = [
  { n: 1, name: 'C major, roots shown', hints: true, keys: false, minor: false, partial: false },
  { n: 2, name: 'C major, no root hints', hints: false, keys: false, minor: false, partial: false },
  { n: 3, name: 'Any major key', hints: false, keys: true, minor: false, partial: false },
  { n: 4, name: 'Major and minor, any key', hints: false, keys: true, minor: true, partial: false },
  { n: 5, name: 'Partial voicings too', hints: false, keys: true, minor: true, partial: true },
] as const;

interface CheckQ {
  inst: Instance;
  strings: readonly number[] | null;
}

function makeQ(level: (typeof LEVELS)[number], prev: CheckQ | null): CheckQ {
  for (let tries = 0; tries < 30; tries++) {
    // Pick the shape first so each shape is equally likely, then one of its positions.
    const sh = ORDER[Math.floor(Math.random() * 5)]!;
    const q: Quality = level.minor && Math.random() < 0.5 ? 'minor' : 'major';
    const key = level.keys ? Math.floor(Math.random() * 12) : 0;
    const opts = instances(key, q).filter((i) => i.shape === sh);
    if (!opts.length) continue;
    const inst = opts[Math.floor(Math.random() * opts.length)]!;
    if (prev && prev.inst.shape === inst.shape && prev.inst.keyPc === inst.keyPc && prev.inst.minF === inst.minF)
      continue;
    const v: Voicing = level.partial
      ? (['full', 'easy', 'top4', 'tri'] as const)[Math.floor(Math.random() * 4)]!
      : 'full';
    return { inst, strings: stringsFor(v, inst) };
  }
  return { inst: instances(0, 'major')[0]!, strings: null };
}

function ShapeCheck() {
  const best = useProgress((p) => p.seen.s3check ?? 0);
  const levelDone = useProgress((p) => p.seen.s3level ?? ((p.seen.s3check ?? 0) >= CHECK_PASS ? 1 : 0));
  const labels = usePrefs((p) => p.labels);
  const [level, setLevel] = useState(1);
  const [active, setActive] = useState(false);
  const [finished, setFinished] = useState(false);
  const [n, setN] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [q, setQ] = useState<CheckQ | null>(null);
  const [picked, setPicked] = useState<Shape | null>(null);
  const [msg, setMsg] = useState('');
  const secRef = useRef<HTMLElement>(null);
  const L = LEVELS[level - 1]!;

  const focus = (sel: string) =>
    requestAnimationFrame(() => {
      const el = secRef.current?.querySelector<HTMLElement>(sel);
      el?.focus({ preventScroll: true });
      secRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });

  const startCheck = (lv = level) => {
    stopLoop();
    setLevel(lv);
    setActive(true);
    setFinished(false);
    setN(0);
    setCorrect(0);
    setPicked(null);
    setMsg('');
    setQ(makeQ(LEVELS[lv - 1]!, null));
    focus('h2');
  };
  const answer = (v: Shape) => {
    if (!active || !q || picked) return;
    const ok = v === q.inst.shape;
    const nn = n + 1;
    const cc = correct + (ok ? 1 : 0);
    setPicked(v);
    setN(nn);
    setCorrect(cc);
    recordStat(`shape:${q.inst.q}:${q.inst.shape}`, ok);
    let m = ok
      ? `Correct: the ${q.inst.shape}-shape at frets ${q.inst.minF}–${q.inst.maxF}.`
      : `Not quite: that's the ${q.inst.shape}-shape at frets ${q.inst.minF}–${q.inst.maxF}. Look at where its roots sit.`;
    if (nn >= CHECK_LEN) {
      setActive(false);
      setFinished(true);
      const pass = cc >= CHECK_PASS;
      if (level === 1) patchSeen({ s3check: Math.max(best, cc) });
      if (pass) patchSeen({ s3level: Math.max(levelDone, level) });
      m += pass
        ? ` You scored ${cc}/${CHECK_LEN}. Level ${level} passed.${level < 5 ? ` Next: level ${level + 1}, ${LEVELS[level]!.name.toLowerCase()}.` : ''}`
        : ` You scored ${cc}/${CHECK_LEN}. You need ${CHECK_PASS} to pass: walk the chain once more, then try again.`;
    }
    setMsg(m);
    announce(m);
    engine.strum(toPlayable(notesOf(q.inst, q.strings)));
    focus('[data-next], [data-again]');
  };
  const nextQ = () => {
    setQ(makeQ(L, q));
    setPicked(null);
    focus('[data-ans]');
  };

  // Keyboard: C A G E D answer, Enter moves on.
  const onKey = (e: React.KeyboardEvent) => {
    if (!active) return;
    const up = e.key.toUpperCase();
    if (!picked && (ORDER as readonly string[]).includes(up) && e.key.length === 1) {
      e.preventDefault();
      answer(up as Shape);
    } else if (picked && e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
      e.preventDefault();
      nextQ();
    }
  };

  if (!active && !finished)
    return (
      <section className="bench" aria-label="Shape check" ref={secRef}>
        <h2 tabIndex={-1}>Shape check</h2>
        <p>
          Ten quick questions: a chord shape appears somewhere on the neck, and you name it. Score {CHECK_PASS} or more
          to pass. Best on level 1:{' '}
          <strong>
            {best}/{CHECK_LEN}
          </strong>
          .
        </p>
        <ol className="pchips" aria-label="Levels">
          {LEVELS.map((lv) => (
            <li key={lv.n} className={`pchip${levelDone >= lv.n ? ' done' : ''}`} title={lv.name}>
              {lv.n}
              <span className="sr-only">
                : {lv.name}
                {levelDone >= lv.n ? ', passed' : ''}
              </span>
            </li>
          ))}
        </ol>
        <div className="actions">
          <button type="button" className="btn primary" onClick={() => startCheck(Math.min(5, levelDone + 1) || 1)}>
            Start level {Math.min(5, levelDone + 1) || 1}: {LEVELS[Math.min(4, levelDone)]!.name}
          </button>
          {levelDone >= 1 ? (
            <button type="button" className="btn" onClick={() => startCheck(1)}>
              Redo level 1
            </button>
          ) : null}
        </div>
      </section>
    );

  if (finished)
    return (
      <section className="bench" aria-label="Shape check" ref={secRef}>
        <h2 tabIndex={-1}>
          Shape check, level {level}: {correct}/{CHECK_LEN}
        </h2>
        <p className={`feedback ${correct >= CHECK_PASS ? 'ok' : 'no'}`}>{msg}</p>
        <div className="actions">
          {correct >= CHECK_PASS && level < 5 ? (
            <button type="button" className="btn primary" data-again onClick={() => startCheck(level + 1)}>
              Level {level + 1}: {LEVELS[level]!.name}
            </button>
          ) : null}
          <button
            type="button"
            className={`btn${correct >= CHECK_PASS && level < 5 ? '' : ' primary'}`}
            data-again={correct >= CHECK_PASS && level < 5 ? undefined : true}
            onClick={() => startCheck(level)}
          >
            Try level {level} again
          </button>
        </div>
      </section>
    );

  const inst = q!.inst;
  const answered = picked != null;
  const dots = notesOf(inst, q!.strings).map((nn) =>
    answered
      ? {
          s: nn.s,
          f: nn.f,
          colors: [COL[inst.shape]],
          root: nn.iv === 0,
          label: dotLabel(labels, nn.iv, inst, nn.s, q!.strings),
          text: textFor(inst.shape),
        }
      : L.hints
        ? {
            s: nn.s,
            f: nn.f,
            colors: [nn.iv === 0 ? NEUTRAL_ROOT : NEUTRAL],
            root: nn.iv === 0,
            label: nn.iv === 0 ? 'R' : '',
            text: '#14212b',
          }
        : { s: nn.s, f: nn.f, colors: [NEUTRAL], label: '', text: '#14212b' },
  );

  return (
    <section className="bench" aria-label="Shape check" ref={secRef} onKeyDown={onKey}>
      <h2 tabIndex={-1}>
        Shape check, level {level} · question {Math.min(n + (picked ? 0 : 1), CHECK_LEN)} of {CHECK_LEN} · {correct}{' '}
        correct
      </h2>
      <p>
        Which shape of <strong>{chordLong(inst.keyPc, inst.q)}</strong> is this?
        {L.hints ? ' The notes marked R are its roots.' : ' No root hints this time: find the roots yourself.'}
        {q!.strings ? ' Only part of the shape is shown.' : ''}
      </p>
      <Fretboard dots={dots} label="Shape check fretboard" />
      <div className="quiz-row" role="group" aria-label="Answers">
        {ORDER.map((o) => (
          <ShapeAnswer
            key={o}
            shape={o}
            data-ans
            state={answered ? (o === inst.shape ? 'right' : o === picked ? 'wrong' : '') : ''}
            disabled={answered}
            onClick={() => answer(o)}
          />
        ))}
        {answered && n < CHECK_LEN ? (
          <button type="button" className="btn primary" data-next onClick={nextQ}>
            Next<Kbd>Enter</Kbd>
          </button>
        ) : null}
      </div>
      <p className={`feedback ${!answered ? '' : picked === inst.shape ? 'ok' : 'no'}`}>{answered ? msg : ''}</p>
      <p className="muted">Keys: C, A, G, E or D to answer; Enter for the next question.</p>
    </section>
  );
}

export default function Step3() {
  const st = useS3();
  const list = useMapList(useS3);
  const inst = list[Math.min(st.idx, list.length - 1)]!;
  const best = useProgress((p) => p.seen.s3check ?? 0);
  const drill = useProgress((p) => p.drills.major0);
  return (
    <>
      <Head
        n={3}
        title="Map C major up the whole neck"
        lede="Between the nut and fret 15, C major appears in five shapes, always in the order C, A, G, E, D, and then the C-shape again an octave up. Neighbouring shapes share a root note, which is how they lock together into one chain."
      />
      <MapBench store={useS3} keyLock drill />
      <ShapeCheck />
      <div className="cards">
        <Card title={`${inst.shape}-shape of C`}>
          <Tab inst={inst} strings={stringsFor(st.voicing, inst)} />
          <p>
            <strong>Roots:</strong>{' '}
            {rootsOf(inst)
              .map((r) => posName(r.s, r.f))
              .join(' · ')}
          </p>
          <p className="tipbox muted">{SHAPE_TIPS[inst.shape]}</p>
        </Card>
        <Card title="The chain and its links">
          <LinkList list={list} />
        </Card>
        <Card title="Octave shapes: where roots repeat">
          <p>Every root has twins. Learn these and you can find any shape from any root.</p>
          <ul>
            <li>Low E string → D string: two frets higher.</li>
            <li>A string → G string: two frets higher.</li>
            <li>D string → B string: three frets higher.</li>
            <li>G string → high e string: three frets higher.</li>
            <li>Low E and high e: the same fret, two octaves apart.</li>
          </ul>
          <p className="muted">Tick “Roots only” and pick All shapes to see every C on the neck.</p>
        </Card>
        <Card title="To finish this step">
          <Criteria
            items={[
              [best >= CHECK_PASS, `Pass the shape check, level 1 (${CHECK_PASS}/${CHECK_LEN}; best ${best})`],
              [!!drill, `Finish one clean linking drill on C${drill ? ` (best ${drill} BPM)` : ''}`],
            ]}
          />
          <p className="muted">
            The full G- and D-shapes are a stretch. Switch to Easy and the anchor roots stay marked, so the links still
            work. With the mic on, the drill checks your pivots for you.
          </p>
        </Card>
      </div>
      <NextLink to="/learn/4">any chord, any key</NextLink>
    </>
  );
}
