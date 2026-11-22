import { useEffect, useMemo, useRef, useState } from 'react';
import { engine, toPlayable } from '../audio/engine';
import { COL, NEUTRAL, mutedSpecs, singleDots } from '../fretboard/build';
import { Legend, Tab } from '../fretboard/extras';
import { Fretboard, type DotSpec } from '../fretboard/Fretboard';
import { MicToggle } from '../listen/MicControls';
import { addXP, announce, patchSeen, setPrefs, toast, usePrefs, useProgress } from '../store/app';
import {
  BOTH_NAMES,
  ORDER,
  keyName,
  midiAt,
  mod12,
  notesOf,
  pcAt,
  openChord,
  posName,
  rootsOf,
  spell,
  type Shape,
} from '../theory';
import { Card, Check, Head, Kbd, LabelSeg, NextLink, Notes, ShapeRadio, StepPlan } from '../ui/controls';
import { useHotkeys } from '../ui/hooks';
import { useMicEvents } from './useMicNotes';

const k = (n: { s: number; f: number }) => `${n.s}:${n.f}`;
/** "a, b and c" — the positions themselves contain commas, so list them with semicolons. */
const listOf = (xs: string[]) =>
  xs.length <= 2 ? xs.join(' and ') : `${xs.slice(0, -1).join('; ')}; and ${xs[xs.length - 1]}`;

export default function Step1() {
  const prefs = usePrefs();
  const seen = useProgress((p) => p.seen.s1);
  const done = useMemo(() => new Set(seen ?? []), [seen]);
  const [chord, setChord] = useState<Shape>('C');
  const [rootsOnly, setRootsOnly] = useState(false);
  const [test, setTest] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<boolean | null>(null);
  const [heard, setHeard] = useState('');
  const sayHeard = (m: string) => {
    setHeard(m);
    if (m) announce(m);
  };
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);

  const inst = useMemo(() => openChord(chord), [chord]);
  const rn = keyName(inst.keyPc, 'major');
  const roots = rootsOf(inst);
  const ctx = { labels: prefs.labels, sp: prefs.minorSpelling };

  const play = () => engine.strum(toPlayable(notesOf(inst)));
  const pick = () => engine.arpeggio(toPlayable(notesOf(inst)));

  const check = (selNow = sel) => {
    const want = roots.map(k);
    const ok = want.length === selNow.size && want.every((x) => selNow.has(x));
    setResult(ok);
    if (ok) {
      const firstTime = !done.has(chord);
      if (firstTime) {
        patchSeen({ s1: [...new Set([...done, chord])] });
        addXP(10);
        toast(`${chord}: roots found, +10 XP`);
      }
    }
    announce(feedbackFor(ok, selNow));
    // Only a pass plays the roots: on a miss the sound would give the answer away.
    if (ok) engine.arpeggio(toPlayable(roots), 0.45);
    requestAnimationFrame(() => actionRef.current?.focus({ preventScroll: true }));
  };

  /** On a miss, say how many roots were found and how many marks were wrong, never where the missing ones are. */
  function feedbackFor(ok: boolean, selNow: Set<string>): string {
    if (ok) return `Correct: ${rn} major's roots are on the ${listOf(roots.map((r) => posName(r.s, r.f)))}.`;
    const found = roots.filter((r) => selNow.has(k(r))).length;
    const wrong = [...selNow].filter((x) => !roots.some((r) => k(r) === x)).length;
    return `Not quite: ${found} of ${roots.length} roots found${wrong ? `, and ${wrong} mark${wrong > 1 ? 's are' : ' is'} not a root (✗)` : ''}. Look again, then retry.`;
  }

  const startTest = () => {
    setTest(true);
    setSel(new Set());
    setResult(null);
    requestAnimationFrame(() => actionRef.current?.focus({ preventScroll: true }));
  };

  const nextChord = () => {
    const nx = ORDER.find((c) => !done.has(c));
    setSel(new Set());
    setResult(null);
    sayHeard('');
    if (nx) setChord(nx);
    else setTest(false);
    requestAnimationFrame(() => actionRef.current?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    setSel(new Set());
    setResult(null);
    sayHeard('');
  }, [chord]);

  // Listening: only roots are marked (octave-exact, at their place in this chord). Other notes, e.g. while
  // checking a string or strumming first, are simply "not a root": never marked, never named. All roots
  // heard → checked automatically.
  const mic = useMicEvents((e) => {
    if (e.type !== 'note' || !test || result != null) return;
    const at = roots.filter((n) => n.midi === e.midi);
    if (!at.length) {
      sayHeard(
        mod12(e.midi - inst.keyPc) === 0
          ? `Heard ${rn}, but not one of the ${rn}s in this chord shape. Try another octave.`
          : 'Heard a note that is not a root.',
      );
      return;
    }
    const n = at.find((x) => !sel.has(k(x))) ?? at[0]!;
    const next = new Set(sel).add(k(n));
    setSel(next);
    sayHeard(`Heard a root: ${posName(n.s, n.f)}.`);
    const allRoots = roots.every((r) => next.has(k(r)));
    if (allRoots) check(next);
  }, test);

  useHotkeys({
    space: play,
    char: (key) => {
      if (key === 'Enter' && test) {
        if (result == null) check();
        else if (result) nextChord();
        else {
          setSel(new Set());
          setResult(null);
        }
        return true;
      }
      if (key === 'a') {
        pick();
        return true;
      }
      return false;
    },
  });

  const testDots = (): DotSpec[] => {
    const want = new Set(roots.map(k));
    return notesOf(inst).map((n) => {
      const key = k(n);
      const on = sel.has(key);
      if (result === false) {
        if (on && want.has(key))
          return {
            s: n.s,
            f: n.f,
            colors: ['var(--good)'],
            root: true,
            label: '✓',
            text: '#fff',
            desc: 'marked, a root',
          };
        if (on) return { s: n.s, f: n.f, colors: ['var(--bad)'], label: '✗', text: '#fff', desc: 'marked, not a root' };
        return { s: n.s, f: n.f, colors: [NEUTRAL], label: '', desc: 'chord note' };
      }
      if (result != null) {
        if (want.has(key))
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
          colors: [on ? 'var(--bad)' : NEUTRAL],
          label: on ? '✗' : '',
          text: on ? '#fff' : '#14212b',
        };
      }
      return {
        s: n.s,
        f: n.f,
        colors: [on ? 'var(--accent)' : NEUTRAL],
        cls: on ? 'sel' : '',
        label: '',
        desc: on ? 'chord note, marked as a root' : 'chord note',
      };
    });
  };

  const onCell = (s: number, f: number) => {
    engine.playOne(s, f);
    if (test && result == null && inst.frets[s] === f) {
      const key = `${s}:${f}`;
      const next = new Set(sel);
      const marking = !next.has(key);
      if (marking) next.add(key);
      else next.delete(key);
      setSel(next);
      announce(`${posName(s, f)}: ${marking ? 'marked as a root' : 'unmarked'}.`);
      return;
    }
    // During the test (and after a miss, until it is passed) never name the note or its role: that is the answer.
    if (test && result !== true) {
      announce(`${posName(s, f)}: ${inst.frets[s] === f ? 'chord note' : 'not in the chord'}.`);
      return;
    }
    const iv = mod12(midiAt(s, f) - inst.keyPc);
    const inChord = inst.frets[s] === f;
    announce(
      `${posName(s, f)}: ${inChord ? spell(rn, iv) : BOTH_NAMES[pcAt(s, f)]}${
        inChord
          ? (iv === 0 ? ', the root of ' : iv === 4 ? ', the 3rd of ' : ', the 5th of ') + rn
          : ', not in this chord'
      }.`,
    );
  };

  const feedback = result == null ? '' : feedbackFor(result, sel);

  return (
    <>
      <Head
        n={1}
        title="Play the five open chords and find their roots"
        lede="Every CAGED shape is organised around its root notes, the notes the chord is named after. Learn where the roots sit in these five open chords and the rest of the system follows from them."
      />
      {prefs.welcomed ? null : (
        <section className="welcome-line" aria-label="Welcome">
          <strong>Guitar in hand?</strong> Copy each shape the app shows and plays, then work down the five steps.
          <button type="button" className="btn small" onClick={() => setPrefs({ welcomed: true })}>
            Got it
          </button>
          <details>
            <summary>How it works</summary>
            <ul className="list-disc">
              <li>Each step tells you exactly what you need to do to finish it.</li>
              <li>
                Tap any fret to hear it. The label buttons switch between intervals, note names, finger numbers and
                shape letters.
              </li>
              <li>Turn on the mic and the app checks what you play. Everything also works without it.</li>
              <li>Tab into the fretboard and use the arrow keys to walk the frets; Enter plays. Space strums.</li>
              <li>Left-handed, or prefer the low E string on top? Change it under View in the top bar.</li>
            </ul>
          </details>
        </section>
      )}
      <StepPlan
        tasks={[
          {
            title: "Learn where each chord's roots sit",
            detail:
              "Pick a chord, strum it, then play only its roots on your guitar and say the chord's name out loud. Go through all five chords, three times.",
          },
          {
            title: 'Test yourself on all five',
            detail:
              'Press “Test yourself” and mark every root with the labels hidden. Each chord you pass gets a tick; all five finish this step.',
            done: done.size >= 5,
            progress: (
              <ul className="pchips" aria-label="Chords passed">
                {ORDER.map((c) => (
                  <li key={c} className={`pchip${done.has(c) ? ' done' : ''}`} style={{ ['--sc' as string]: COL[c] }}>
                    {c}
                    <span className="sr-only">{done.has(c) ? ' passed' : ' not yet'}</span>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
      <section className="bench" aria-label="Open chord workbench">
        <div className="toolbar">
          <ShapeRadio
            value={chord}
            onChange={(c) => {
              setChord(c);
              engine.strum(toPlayable(notesOf(openChord(c))));
            }}
            label="Open chord"
            done={done}
            suffix=" major"
          />
          {test ? null : (
            <>
              <LabelSeg />
              <Check checked={rootsOnly} onChange={setRootsOnly}>
                Fade everything except roots
              </Check>
            </>
          )}
        </div>
        {test ? (
          <div className="callout">
            <p>
              <strong>Test: mark every root of {rn} major</strong>, then press Check. The chord's notes are shown
              without labels.
              {mic ? ' Or just play each root on your guitar: the app marks what it hears.' : ''}
            </p>
            <MicToggle />
            {heard ? (
              <p className="heard" aria-live="off">
                {heard}
              </p>
            ) : null}
          </div>
        ) : null}
        <Fretboard
          from={0}
          to={5}
          cw={72}
          dots={test ? testDots() : singleDots(inst, ctx, { rootsOnly })}
          muted={mutedSpecs(inst)}
          hidePitch={test}
          emptyLabel={test ? 'not in the chord' : undefined}
          onCell={onCell}
          label={`${rn} major in open position`}
        />
        {test ? null : <Legend keys={['root', 'tone', 'mute']} />}
        <div className="actions">
          {test ? (
            <>
              {result == null ? (
                <button ref={actionRef} type="button" className="btn primary" onClick={() => check()}>
                  Check<Kbd>Enter</Kbd>
                </button>
              ) : result ? (
                <button ref={actionRef} type="button" className="btn primary" onClick={nextChord}>
                  {done.size >= 5 ? 'Done' : 'Test the next chord'}
                  <Kbd>Enter</Kbd>
                </button>
              ) : (
                <button
                  ref={actionRef}
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    setSel(new Set());
                    setResult(null);
                    sayHeard('');
                  }}
                >
                  Try again<Kbd>Enter</Kbd>
                </button>
              )}
              <button
                type="button"
                className="btn ghost"
                onClick={() => {
                  setTest(false);
                  setResult(null);
                  setSel(new Set());
                }}
              >
                Leave the test
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn primary" onClick={play}>
                Strum {rn}
                <Kbd>Space</Kbd>
              </button>
              <button type="button" className="btn" onClick={() => engine.arpeggio(toPlayable(roots), 0.5)}>
                Play the roots only
              </button>
              <button type="button" className="btn" onClick={pick}>
                Pick each note<Kbd>A</Kbd>
              </button>
              <button type="button" className="btn" onClick={startTest}>
                Test yourself on {rn}
              </button>
            </>
          )}
        </div>
        {feedback ? (
          <p ref={feedbackRef} className={`feedback ${result ? 'ok' : 'no'}`}>
            {feedback}
          </p>
        ) : null}
      </section>
      <Notes>
        <Card level={3} title={`${rn} major, open`}>
          <Tab inst={inst} />
          {test && result !== true ? (
            <p className="muted">Roots hidden during the test.</p>
          ) : (
            <p>
              <strong>Roots:</strong> {roots.map((r) => posName(r.s, r.f)).join('; ')}
            </p>
          )}
        </Card>
        <Card level={3} title="Why the roots matter">
          <p>
            Later, each of these chords becomes a movable shape. The shape keeps its roots in the same place relative to
            your fingers, so knowing where the roots are is how you'll name any chord anywhere on the neck.
          </p>
        </Card>
      </Notes>
      <NextLink to="/learn/2">make the shapes movable</NextLink>
    </>
  );
}
