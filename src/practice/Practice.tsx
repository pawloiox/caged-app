import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { exportJSON, importJSON, notify, resetAll, useProgress, useUi } from '../store/app';
import { dueKeys } from '../train/leitner';
import { fmtTime, routine, streakOf, todayKey, todayStr, MAJOR_NAMES } from '../theory';
import { Card, PageHead } from '../ui/controls';
import { useHotkeys } from '../ui/hooks';
import { pauseRoutine, resetRoutine, routineActive, skipBlock, startRoutine, useRoutine } from './routineStore';

function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Practice() {
  const r = useRoutine();
  const progress = useProgress();
  const nav = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const storageProblem = useUi((u) => u.storageProblem);
  const [confirmReset, setConfirmReset] = useState(false);
  const rs = routine();
  const b = rs[r.block]!;
  const total = b.min * 60;
  const days = new Set(progress.days);
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 13 + i);
    return todayStr(d);
  });
  const st = streakOf(progress.days);
  const rst = streakOf(progress.reviewDays);
  const due = dueKeys(progress.stats).length;
  const active = routineActive(r);
  const toggle = () => (r.running ? pauseRoutine() : startRoutine());
  useHotkeys({ space: toggle });

  return (
    <>
      <PageHead
        title="Today's practice"
        lede="Fifteen minutes in four short blocks, every day. The timer keeps running while you open an exercise, and a chime tells you when to move on."
      />
      <div className="routine">
        <section className="timer-card" aria-label="Timer">
          <p className="eyebrow">Block {r.block + 1} of 4</p>
          <div className="big-time" role="timer" aria-label={`${fmtTime(r.remaining)} left in this block`}>
            {fmtTime(r.remaining)}
          </div>
          <p>
            <strong>{b.title}</strong>
          </p>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${(100 * (1 - r.remaining / total)).toFixed(1)}%` }} />
          </div>
          <div className="actions">
            <button type="button" className="btn primary big" onClick={toggle}>
              {r.running ? 'Pause' : active ? 'Resume' : 'Start routine'}
            </button>
            <button type="button" className="btn" onClick={skipBlock}>
              Skip block
            </button>
            <button type="button" className="btn ghost" onClick={resetRoutine}>
              Reset
            </button>
          </div>
          <Link className="btn" to={b.to}>
            Open this exercise
          </Link>
          {r.skipped ? <p className="muted">You skipped a block, so today won't count toward your streak.</p> : null}
        </section>
        <ol className="blocks">
          {rs.map((x, i) => (
            <li key={i} className={i < r.block ? 'done' : i === r.block ? 'on' : ''}>
              <span className="mins">{x.min} min</span>
              <div>
                <strong>{x.title}</strong>
                <p className="muted">{x.text}</p>
                <Link className="btn small" to={x.to}>
                  Open exercise
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="cards">
        <Card title="Review now">
          <p className="stat">{due}</p>
          <p>
            {due ? `item${due === 1 ? ' is' : 's are'} due across all drills.` : 'Nothing is due. Come back tomorrow.'}
          </p>
          <div>
            <button type="button" className="btn primary" disabled={!due} onClick={() => nav('/train/review')}>
              Start review
            </button>
          </div>
          <p className="muted">
            Review streak:{' '}
            <strong>
              {rst} {rst === 1 ? 'day' : 'days'}
            </strong>
          </p>
        </Card>
        <Card title="Your streak">
          <p className="stat">
            {st} {st === 1 ? 'day' : 'days'}
          </p>
          <ul className="days" aria-label="Last 14 days">
            {last14.map((d) => (
              <li key={d} className={days.has(d) ? 'on' : ''} title={`${d}${days.has(d) ? ': practised' : ''}`}>
                <span className="sr-only">
                  {d}: {days.has(d) ? 'practised' : 'not practised'}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted">Finish all four blocks without skipping to count a day.</p>
        </Card>
        <Card title="Your data">
          <p>
            Progress lives on this device (it works offline). Keep a copy, move it to another device, or print today's
            chord charts.
          </p>
          {storageProblem ? (
            <p className="callout warn">
              This browser isn't saving progress (private mode or blocked site data). Export a copy before you close the
              app.
            </p>
          ) : null}
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={() => download(`caged-lab-progress-${todayStr()}.json`, exportJSON())}
            >
              Export progress
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              Import…
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              tabIndex={-1}
              aria-label="Import progress file"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  importJSON(await f.text());
                  notify('Progress imported.');
                } catch (err) {
                  notify(err instanceof Error ? err.message : 'That file could not be read.');
                }
                e.target.value = '';
              }}
            />
            <Link className="btn" to={`/print?key=${todayKey()}`}>
              Chord charts for {MAJOR_NAMES[todayKey()]} (print / PDF)
            </Link>
          </div>
          {confirmReset ? (
            <div className="callout warn">
              <p>Erase all progress on this device? This can't be undone. Export first if you want a copy.</p>
              <div className="actions">
                <button
                  type="button"
                  className="btn small"
                  onClick={async () => {
                    await resetAll();
                    setConfirmReset(false);
                    notify('Progress erased.');
                  }}
                >
                  Erase everything
                </button>
                <button
                  ref={keepRef}
                  type="button"
                  className="btn small primary"
                  onClick={() => setConfirmReset(false)}
                >
                  Keep my progress
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn ghost small"
              onClick={() => {
                setConfirmReset(true);
                // Focus the safe choice, so an accidental Enter doesn't erase anything.
                requestAnimationFrame(() => keepRef.current?.focus());
              }}
            >
              Reset progress…
            </button>
          )}
        </Card>
        <Card title="Common mistakes">
          <ul>
            <li>
              <strong>Naming the chord by the barre.</strong> The chord takes its name from the root. In the C- and
              G-shapes the root is three frets above your index finger.
            </li>
            <li>
              <strong>Strumming muted strings.</strong> D-shape: skip the low E and A. C-shape: the low E stays silent.
            </li>
            <li>
              <strong>Fretting every full shape.</strong> The full G- and D-shapes are hard; partial shapes are normal,
              not cheating.
            </li>
            <li>
              <strong>Moving on too fast.</strong> Get C clean at 60 BPM before adding keys.
            </li>
          </ul>
        </Card>
        <Card title="Hand tips">
          <ul>
            <li>Keep your thumb behind the neck for the C-, G- and D-shapes.</li>
            <li>Barre with the bony side of your index finger, close to the fret.</li>
            <li>A-shape: let the ring-finger barre mute the high e, or arch it.</li>
            <li>Say the root's name out loud before every change.</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
