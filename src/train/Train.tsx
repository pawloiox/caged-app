import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { engine, toPlayable } from '../audio/engine';
import { COL, NEUTRAL, NEUTRAL_ROOT, barreSpec, textFor } from '../fretboard/build';
import { Pill } from '../fretboard/extras';
import { Fretboard, type DotSpec } from '../fretboard/Fretboard';
import { MicToggle } from '../listen/MicControls';
import { useMicEvents } from '../lessons/useMicNotes';
import { addXP, announce, logReviewDay, recordStat, updateProgress, usePrefs, useProgress } from '../store/app';
import {
  BOTH_NAMES,
  MAX_FRET,
  ORDER,
  dotLabel,
  notesOf,
  pcAt,
  posName,
  positionsOfMidi,
  type Instance,
  type Shape,
} from '../theory';
import { Card, Check, Kbd, PageHead, Seg, ShapeAnswer } from '../ui/controls';
import { useHotkeys } from '../ui/hooks';
import { dueKeys, pickWeighted, weightOf } from './leitner';
import { TRAIN_MODES, isClickMode, makeQuestion, modeOfStat, type Mode, type Question } from './questions';

const MODE_IDS = TRAIN_MODES.map(([m]) => m);

function Mastery() {
  const stats = useProgress((p) => p.stats);
  return (
    <div className="mastery">
      {ORDER.map((s) => {
        let r = 0;
        let w = 0;
        (['major', 'minor'] as const).forEach((q) =>
          ['shape', 'roots', 'build'].forEach((p) => {
            const x = stats[`${p}:${q}:${s}`];
            if (x) {
              r += x.r;
              w += x.w;
            }
          }),
        );
        const n = r + w;
        const pct = n ? Math.round((100 * r) / n) : 0;
        return (
          <div className="mrow" key={s}>
            <Pill s={s} />
            <div className="mbar" role="img" aria-label={`${s}-shape: ${n ? pct + '% correct' : 'not practised yet'}`}>
              <span style={{ width: `${pct}%`, background: COL[s] }} />
            </div>
            <span aria-hidden="true">{n ? `${pct}% · ${n}` : 'new'}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Train() {
  const params = useParams();
  const nav = useNavigate();
  const review = params.mode === 'review';
  const mode: Mode = review ? 'shape' : MODE_IDS.includes(params.mode as Mode) ? (params.mode as Mode) : 'shape';
  const prefs = usePrefs();
  const stats = useProgress((p) => p.stats);
  const best = useProgress((p) => p.best);
  const due = useMemo(() => dueKeys(stats), [stats]);
  const [minor, setMinor] = useState(false);
  const [hint, setHint] = useState(true);
  const [q, setQ] = useState<Question | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [score, setScore] = useState({ score: 0, total: 0, streak: 0 });
  const [feedback, setFeedback] = useState('');
  const [ok, setOk] = useState<boolean | null>(null);
  const [rootPhase, setRootPhase] = useState<'off' | 'find' | 'done'>('off');
  const [rootTries, setRootTries] = useState<Array<{ s: number; f: number; ok: boolean }>>([]);
  const [reviewed, setReviewed] = useState(0);
  const [heard, setHeard] = useState('');
  const last = useRef<Instance | null>(null);
  const headRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  const hear = (qq = q) => {
    if (!qq?.inst) return;
    if (qq.type === 'earhand' && qq.ear) {
      const t = engine.now();
      engine.strum(toPlayable(qq.ear.chords[0]!.notes), { when: t + 0.05, vel: 0.6 });
      engine.strum(toPlayable(qq.ear.target.notes), { when: t + 1.3, vel: 0.8 });
    } else engine.strum(toPlayable(notesOf(qq.inst)));
  };

  const newQ = (focus = true) => {
    let nq: Question;
    if (review) {
      const keys = dueKeys(useProgress.getState().stats).filter((k) => modeOfStat(k));
      if (!keys.length) {
        setQ(null);
        if (reviewed > 0) logReviewDay();
        return;
      }
      const item = pickWeighted(keys, (k) => weightOf(useProgress.getState().stats[k]));
      nq = makeQuestion(modeOfStat(item)!, { minor: true, stats, item, sp: prefs.minorSpelling });
    } else
      nq = makeQuestion(mode, {
        minor,
        stats: useProgress.getState().stats,
        last: last.current,
        sp: prefs.minorSpelling,
      });
    last.current = nq.inst ?? null;
    setQ(nq);
    setPicked(null);
    setSel(new Set());
    setFeedback('');
    setOk(null);
    setRootPhase('off');
    setRootTries([]);
    setHeard('');
    if (nq.type === 'ear' || nq.type === 'earhand') hear(nq);
    if (focus) requestAnimationFrame(() => headRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    newQ(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, review, minor]);

  const finishAnswer = (good: boolean, lead: string) => {
    if (!q) return;
    if (q.stat) recordStat(q.stat, good);
    const streak = good ? score.streak + 1 : 0;
    setScore({ score: score.score + (good ? 1 : 0), total: score.total + 1, streak });
    if (good) addXP(10);
    if (streak > best) updateProgress((p) => ({ ...p, best: streak }));
    if (review) setReviewed((n) => n + 1);
    setOk(good);
    const fb = `${lead} ${q.explain}`;
    setFeedback(fb);
    announce(fb);
    if (q.inst && q.type !== 'earhand') engine.strum(toPlayable(notesOf(q.inst)));
    requestAnimationFrame(() => nextRef.current?.focus({ preventScroll: true }));
  };

  const answer = (v: string) => {
    if (picked != null || !q) return;
    setPicked(v);
    let good: boolean;
    if (isClickMode(q.type)) good = q.want!.length === sel.size && q.want!.every((k) => sel.has(k));
    else good = v === q.answer;
    if (q.type === 'earhand') {
      // Name first, then the hand: find the root inside the zone.
      setOk(good);
      const m = `${good ? 'Right' : 'Not quite'}: ${q.explain} Now find its root inside frets ${q.ear!.zone.lo}–${q.ear!.zone.hi}.`;
      setFeedback(m);
      announce(m);
      setRootPhase('find');
      return;
    }
    const lead = good
      ? 'Correct.'
      : isClickMode(q.type)
        ? `Not quite. ✓ found, ! missed, ✗ ${q.type === 'build' ? 'not in the shape' : 'not a root'}.`
        : `Not quite: the answer is ${q.answer}.`;
    finishAnswer(good, lead);
  };

  const tryRoot = (s: number, f: number, fromMic = false) => {
    if (!q?.ear || rootPhase !== 'find') return;
    if (!fromMic) engine.playOne(s, f);
    const { target, zone } = q.ear;
    const isRoot = pcAt(s, f) === target.pc;
    const inZone = f >= zone.lo && f <= zone.hi;
    const tries = [...rootTries, { s, f, ok: isRoot && inZone }];
    setRootTries(tries);
    if (isRoot && inZone) {
      setRootPhase('done');
      finishAnswer(
        ok === true,
        ok
          ? `Ear and hand right: ${target.rootName} on the ${posName(s, f)}.`
          : `Root found (${posName(s, f)}), but the name was off.`,
      );
    } else if (tries.length >= 3) {
      setRootPhase('done');
      finishAnswer(false, `The root ${target.rootName} inside the zone is marked now.`);
    } else {
      const m = isRoot
        ? `That's ${target.rootName}, but outside the zone.`
        : `That's ${BOTH_NAMES[pcAt(s, f)]}, not ${target.rootName}.`;
      setHeard(m);
      announce(m);
    }
  };

  useMicEvents(
    (e) => {
      if (e.type !== 'note' || !q) return;
      if (rootPhase === 'find' && q.ear) {
        const ps = positionsOfMidi(e.midi, q.ear.zone.lo, q.ear.zone.hi);
        const p = ps.find((x) => pcAt(x.s, x.f) === q.ear!.target.pc) ?? ps[0];
        if (p) tryRoot(p.s, p.f, true);
        return;
      }
      if (q.type === 'roots' && picked == null && q.inst) {
        const at = notesOf(q.inst).filter((n) => n.midi === e.midi);
        if (!at.length) {
          setHeard(`Heard ${BOTH_NAMES[e.midi % 12]}: not in this chord shape.`);
          return;
        }
        const n = at.find((x) => !sel.has(`${x.s}:${x.f}`)) ?? at[0]!;
        setSel((old) => new Set(old).add(`${n.s}:${n.f}`));
        setHeard(`Heard ${posName(n.s, n.f)}.`);
      }
    },
    !!q && (rootPhase === 'find' || (q.type === 'roots' && picked == null)),
  );

  const onCell = (s: number, f: number) => {
    if (rootPhase === 'find') {
      tryRoot(s, f);
      return;
    }
    engine.playOne(s, f);
    if (!q || picked != null) return;
    const k = `${s}:${f}`;
    const can =
      (q.type === 'roots' && q.inst!.frets[s] === f) ||
      (q.type === 'octaves' && f <= 12) ||
      (q.type === 'build' && !(s === q.anchor!.s && f === q.anchor!.f));
    if (can) {
      const n = new Set(sel);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      setSel(n);
    }
  };

  useHotkeys({
    space: () => hear(),
    char: (k) => {
      if (!q) return false;
      if (k === 'Enter') {
        if (picked != null && rootPhase !== 'find') newQ();
        else if (isClickMode(q.type) && picked == null) answer('checked');
        return true;
      }
      if (picked != null) return false;
      const up = k.toUpperCase();
      if (q.options === ORDER && (ORDER as readonly string[]).includes(up) && k.length === 1) {
        answer(up);
        return true;
      }
      if (q.options && q.options !== ORDER && /^[1-9]$/.test(k) && q.options[Number(k) - 1]) {
        answer(q.options[Number(k) - 1]!);
        return true;
      }
      return false;
    },
  });

  /* ---------- board ---------- */
  const revealed = picked != null;
  const boardDots = (): { dots: DotSpec[]; to: number } => {
    if (!q) return { dots: [], to: MAX_FRET };
    const mark = (k: string, color: string, label: string, root = false): DotSpec => {
      const [s, f] = k.split(':').map(Number) as [number, number];
      return { s, f, colors: [color], label, text: '#fff', root };
    };
    if (q.type === 'earhand') {
      const tr = rootTries.map((t) => ({
        s: t.s,
        f: t.f,
        colors: [t.ok ? 'var(--good)' : 'var(--bad)'],
        label: t.ok ? '✓' : '✗',
        text: '#fff',
      }));
      if (rootPhase === 'done') {
        const t = q.ear!.target;
        return {
          dots: [
            ...notesOf(t.inst, t.strings).map((n) => ({
              s: n.s,
              f: n.f,
              colors: [COL[t.inst.shape]],
              root: n.iv === 0,
              label: n.iv === 0 ? 'R' : '',
              text: textFor(t.inst.shape),
            })),
            ...tr,
          ],
          to: MAX_FRET,
        };
      }
      return { dots: tr, to: MAX_FRET };
    }
    if (q.type === 'build' || q.type === 'octaves') {
      const want = new Set(q.want);
      const dots: DotSpec[] =
        q.type === 'build'
          ? [{ s: q.anchor!.s, f: q.anchor!.f, colors: [NEUTRAL_ROOT], root: true, label: 'R', text: '#14212b' }]
          : [];
      if (revealed) {
        want.forEach((k) =>
          dots.push(mark(k, sel.has(k) ? 'var(--good)' : 'var(--warn)', sel.has(k) ? '✓' : '!', q.type === 'octaves')),
        );
        sel.forEach((k) => !want.has(k) && dots.push(mark(k, 'var(--bad)', '✗')));
      } else sel.forEach((k) => dots.push({ ...mark(k, 'var(--accent)', ''), cls: 'sel' }));
      return { dots, to: q.type === 'octaves' ? 12 : MAX_FRET };
    }
    const inst = q.inst;
    if (!inst) return { dots: [], to: MAX_FRET };
    const dots = notesOf(inst).map((n): DotSpec => {
      const root = n.iv === 0;
      const k = `${n.s}:${n.f}`;
      if (revealed) {
        if (q.type === 'roots') {
          const on = sel.has(k);
          if (root)
            return {
              s: n.s,
              f: n.f,
              colors: [on ? 'var(--good)' : 'var(--warn)'],
              root: true,
              label: on ? '✓' : '!',
              text: '#fff',
            };
          return {
            s: n.s,
            f: n.f,
            colors: [on ? 'var(--bad)' : COL[inst.shape]],
            label: on ? '✗' : dotLabel(prefs.labels, n.iv, inst, n.s),
            text: on ? '#fff' : textFor(inst.shape),
          };
        }
        return {
          s: n.s,
          f: n.f,
          colors: [COL[inst.shape]],
          root,
          label: dotLabel(prefs.labels, n.iv, inst, n.s),
          text: textFor(inst.shape),
        };
      }
      if (q.type === 'chord') return { s: n.s, f: n.f, colors: [COL[inst.shape]], root, label: '', text: '#fff' };
      if (q.type === 'roots')
        return {
          s: n.s,
          f: n.f,
          colors: [sel.has(k) ? 'var(--accent)' : NEUTRAL],
          label: '',
          cls: sel.has(k) ? 'sel' : '',
        };
      return {
        s: n.s,
        f: n.f,
        colors: [root && hint ? NEUTRAL_ROOT : NEUTRAL],
        root: root && hint,
        label: root && hint ? 'R' : '',
        text: '#14212b',
      };
    });
    return { dots, to: MAX_FRET };
  };

  const answered = picked != null && rootPhase !== 'find';
  const showBoard =
    q &&
    (q.type === 'octaves' ||
      q.type === 'build' ||
      (q.type === 'earhand' ? rootPhase !== 'off' : q.inst && (q.type !== 'ear' || answered)));
  const bd = boardDots();
  // Barres: shown with the shape (neutral while the colour would give the answer away). In "Build a shape"
  // the barre would be a hint, so it appears only after checking.
  const trainBarre = !q
    ? null
    : q.type === 'earhand'
      ? rootPhase === 'done'
        ? barreSpec(q.ear!.target.inst, q.ear!.target.strings, COL[q.ear!.target.inst.shape])
        : null
      : q.type === 'build'
        ? revealed
          ? barreSpec(q.inst!, null)
          : null
        : q.inst && (q.type !== 'ear' || revealed)
          ? barreSpec(q.inst, null, revealed || q.type === 'chord' ? COL[q.inst.shape] : NEUTRAL)
          : null;
  const optionButtons =
    q && q.options && !isClickMode(q.type) && rootPhase === 'off'
      ? q.options.map((o, i) => {
          const state = picked != null ? (o === q.answer ? 'right' : o === picked ? 'wrong' : '') : '';
          return q.options === ORDER ? (
            <ShapeAnswer
              key={o}
              shape={o as Shape}
              state={state as 'right' | 'wrong' | ''}
              disabled={picked != null}
              onClick={() => answer(o)}
            />
          ) : (
            <button
              key={o}
              type="button"
              className={`btn opt ${state}`}
              disabled={picked != null}
              onClick={() => answer(o)}
            >
              {o}
              {state === 'right' ? ' ✓' : state === 'wrong' ? ' ✗' : ''}
              <Kbd>{i + 1}</Kbd>
            </button>
          );
        })
      : null;

  return (
    <>
      <PageHead
        eyebrow={review ? 'Review now' : 'Train your eye, hand and ear'}
        title={review ? 'Clear what is due' : 'Recognise shapes at a glance'}
        lede={
          review
            ? 'Only the items that are due, from every drill. It stops when you reach zero. A cleared queue counts toward your review streak.'
            : 'Short drills that come back to what you get wrong more often. On the keyboard, press C, A, G, E or D (or 1–4) to answer and Enter for the next question.'
        }
      />
      <section className="bench" aria-label="Quiz">
        {review ? (
          <p className="scorebar">
            <span>
              Due now <b>{due.length}</b>
            </span>
            <span>
              Reviewed this session <b>{reviewed}</b>
            </span>
            <Link to="/train/shape">Back to all drills</Link>
          </p>
        ) : (
          <div className="toolbar">
            <Seg value={mode} options={TRAIN_MODES} onChange={(m) => nav(`/train/${m}`)} label="Drill" />
          </div>
        )}
        {!review ? (
          <div className="toolbar">
            {['shape', 'chord', 'roots', 'build'].includes(mode) ? (
              <Check checked={minor} onChange={setMinor}>
                Include minor chords
              </Check>
            ) : null}
            {mode === 'shape' ? (
              <Check checked={hint} onChange={setHint}>
                Show roots
              </Check>
            ) : null}
            <div className="scorebar">
              <span>
                Score{' '}
                <b>
                  {score.score}/{score.total}
                </b>
              </span>
              <span>
                Streak <b>{score.streak}</b>
              </span>
              <span>
                Best streak <b>{best}</b>
              </span>
              <span>
                <Link to="/train/review">
                  Due for review <b>{due.length}</b>
                </Link>
              </span>
            </div>
          </div>
        ) : null}
        {!q ? (
          <div className="callout good" role="status">
            <p>
              <strong>All caught up.</strong>{' '}
              {reviewed
                ? `You reviewed ${reviewed} item${reviewed === 1 ? '' : 's'}; that counts for today's review streak.`
                : 'Nothing is due right now. Items you get right come back after 1, 2, 4 and 8 days.'}
            </p>
            <div>
              <Link className="btn" to="/train/shape">
                Practise anyway
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h2 ref={headRef} tabIndex={-1}>
              {q.prompt}
            </h2>
            {q.type === 'roots' || rootPhase === 'find' ? <MicToggle /> : null}
            {showBoard ? (
              <Fretboard
                to={bd.to}
                dots={bd.dots}
                barre={trainBarre}
                band={q.type === 'earhand' ? { lo: q.ear!.zone.lo, hi: q.ear!.zone.hi, label: 'Your zone' } : null}
                onCell={onCell}
                label={q.type === 'earhand' ? 'Find the root inside your zone' : 'Quiz fretboard'}
              />
            ) : q.type === 'ear' || q.type === 'earhand' ? (
              <div className="ear-hidden">
                The fretboard is hidden until you answer. Press Hear it (or Space) to play{' '}
                {q.type === 'earhand' ? 'the home chord and the hidden chord' : 'the chord'} again.
              </div>
            ) : null}
            {heard ? <p className="muted">{heard}</p> : null}
            {optionButtons ? (
              <div className="answers" role="group" aria-label="Answers">
                {optionButtons}
              </div>
            ) : null}
            <p className={`feedback ${ok === true ? 'ok' : ok === false ? 'no' : ''}`}>{feedback}</p>
            <div className="actions">
              {isClickMode(q.type) && picked == null ? (
                <button type="button" className="btn primary" onClick={() => answer('checked')}>
                  Check<Kbd>Enter</Kbd>
                </button>
              ) : null}
              {answered ? (
                <button ref={nextRef} type="button" className="btn primary" onClick={() => newQ()}>
                  {review && due.length === 0 ? 'Finish' : 'Next question'}
                  <Kbd>Enter</Kbd>
                </button>
              ) : null}
              {q.inst ? (
                <button type="button" className="btn" onClick={() => hear()}>
                  Hear it<Kbd>Space</Kbd>
                </button>
              ) : null}
              {picked == null ? (
                <button type="button" className="btn ghost" onClick={() => newQ()}>
                  Skip
                </button>
              ) : null}
            </div>
          </>
        )}
      </section>
      <div className="cards">
        <Card title="Shape mastery">
          <Mastery />
          <p className="muted">
            From “Name the shape”, “Roots in a shape”, “Build a shape” and the Step 3 shape check. Weak shapes come up
            more often.
          </p>
        </Card>
        <Card title="How to use these drills">
          <ul>
            <li>Say your answer out loud before you press it.</li>
            <li>After each answer, play the shape on your guitar.</li>
            <li>With the mic on, “Roots in a shape” and “Ear + hand” listen to what you play.</li>
            <li>
              Five minutes a day beats an hour once a week. Items you get right come back after 1, 2, 4 and then 8 days;
              misses come back today.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
