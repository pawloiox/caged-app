import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { engine } from '../audio/engine';
import { listener, useMic } from '../audio/mic/listener';
import { stopLoop, usePlayer } from '../audio/transport';
import { pauseRoutine, routineActive, startRoutine, useRoutine } from '../practice/routineStore';
import { nextStep } from '../store/criteria';
import { announce, setPrefs, toast, usePrefs, useProgress, useUi } from '../store/app';
import { dueKeys } from '../train/leitner';
import { fmtTime, streakOf } from '../theory/routine';
import { Check, Seg } from './controls';

const ICONS: Record<string, ReactNode> = {
  explore: (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="6.5" cy="6.5" r="1.8" fill="currentColor" />
    </svg>
  ),
  practice: (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <circle cx="6.5" cy="7" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 4.3V7l2 1.3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  train: (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <path
        d="M2 7l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  tuner: (
    <svg width="13" height="13" viewBox="0 0 13 13" aria-hidden="true">
      <rect x="4.5" y="1" width="4" height="7" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M2.5 6.5a4 4 0 0 0 8 0M6.5 10.5V12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  ),
};

const NAV = [
  {
    group: 'Learn',
    items: [
      { to: '/learn/1', n: 1, t: 'Open chords and roots' },
      { to: '/learn/2', n: 2, t: 'Make shapes movable' },
      { to: '/learn/3', n: 3, t: 'C up the whole neck' },
      { to: '/learn/4', n: 4, t: 'Any chord, any key' },
      { to: '/learn/5', n: 5, t: 'Make it musical' },
    ],
  },
  {
    group: 'Play',
    items: [
      { to: '/explore', icon: 'explore', t: 'Fretboard explorer' },
      { to: '/practice', icon: 'practice', t: 'Daily routine' },
      { to: '/train', icon: 'train', t: 'Train eye, hand and ear' },
      { to: '/tuner', icon: 'tuner', t: 'Tuner and listening' },
    ],
  },
] as const;

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const get = () =>
      navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (cancelled) void l.release();
          else lock = l;
        })
        .catch(() => {});
    void get();
    const onVis = () => {
      // The browser releases the lock whenever the page is hidden: take a new one on return.
      if (document.visibilityState === 'visible' && (!lock || lock.released)) void get();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}

function ViewMenu() {
  const p = usePrefs();
  return (
    <Popover.Root>
      <Popover.Trigger className="chip" aria-label="View and sound settings">
        View
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="menu" sideOffset={6} align="end" collisionPadding={12}>
          <h2 className="card-title">Neck</h2>
          <Check checked={p.lefty} onChange={(v) => setPrefs({ lefty: v })}>
            Left-handed neck
          </Check>
          <Check checked={p.lowTop} onChange={(v) => setPrefs({ lowTop: v })}>
            Low E string on top (horizontal neck)
          </Check>
          <Seg
            value={p.neck}
            options={[
              ['auto', 'Auto'],
              ['horizontal', 'Across'],
              ['vertical', 'Upright'],
            ]}
            onChange={(v) => setPrefs({ neck: v })}
            label="Neck direction"
          />
          <h2 className="card-title">Look</h2>
          <Seg
            value={p.theme}
            options={[
              ['system', 'System'],
              ['light', 'Light'],
              ['dark', 'Dark'],
            ]}
            onChange={(v) => setPrefs({ theme: v })}
            label="Theme"
          />
          <Seg
            value={p.minorSpelling}
            options={[
              ['flat', 'E♭ minor'],
              ['sharp', 'D♯ minor'],
            ]}
            onChange={(v) => setPrefs({ minorSpelling: v })}
            label="Spell the minor key on pitch 3 as"
          />
          <h2 className="card-title">Sound</h2>
          <label className="field">
            Guitar
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.guitarVol}
              onChange={(e) => setPrefs({ guitarVol: Number(e.target.value) })}
              aria-label="Guitar volume"
            />
          </label>
          <label className="field">
            Click
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={p.clickVol}
              onChange={(e) => setPrefs({ clickVol: Number(e.target.value) })}
              aria-label="Metronome volume"
            />
          </label>
          <Check checked={p.headphones} onChange={(v) => setPrefs({ headphones: v })}>
            I'm using headphones
          </Check>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Layout() {
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const progress = useProgress();
  const muted = usePrefs((p) => p.muted);
  const theme = usePrefs((p) => p.theme);
  const player = usePlayer();
  const routineSt = useRoutine();
  const mic = useMic((m) => m.status);
  const ui = useUi();
  const [toastShow, setToastShow] = useState(false);

  useEffect(() => {
    if (theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Route change: stop playback, scroll up, move focus to the new heading.
  useEffect(() => {
    stopLoop();
    window.scrollTo(0, 0);
    if (first.current) {
      first.current = false;
      return;
    }
    requestAnimationFrame(() => mainRef.current?.querySelector<HTMLElement>('h1')?.focus({ preventScroll: true }));
  }, [loc.pathname]);

  useEffect(() => {
    if (!ui.toast) return;
    setToastShow(true);
    const t = setTimeout(() => setToastShow(false), 2600);
    return () => clearTimeout(t);
  }, [ui.toast]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && usePlayer.getState().active) {
        stopLoop();
        toast('Playback stopped while the app was in the background. Press play to start again.');
        announce('Playback stopped while the app was in the background.');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useWakeLock(player.active || routineSt.running || mic === 'on');

  const ns = nextStep(progress);
  const st = streakOf(progress.days);
  const due = dueKeys(progress.stats).length;
  const rActive = routineActive(routineSt);
  const onPractice = loc.pathname.startsWith('/practice');

  return (
    <>
      <a className="skip btn" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="CAGED Lab home">
          <svg width="58" height="18" viewBox="0 0 58 18" aria-hidden="true">
            <circle cx="9" cy="9" r="7" fill="var(--c-shape)" />
            <circle cx="19" cy="9" r="7" fill="var(--a-shape)" />
            <circle cx="29" cy="9" r="7" fill="var(--g-shape)" />
            <circle cx="39" cy="9" r="7" fill="var(--e-shape)" />
            <circle cx="49" cy="9" r="7" fill="var(--d-shape)" />
          </svg>
          <span>CAGED Lab</span>
        </Link>
        <div className="chips">
          {rActive && !onPractice ? (
            <Link className="chip accent" to="/practice">
              Routine {routineSt.block + 1}/4 · {fmtTime(routineSt.remaining)}
              {routineSt.running ? '' : ' paused'}
            </Link>
          ) : null}
          <Link className="chip accent opt" to={ns ? `/learn/${ns}` : '/train'}>
            {ns ? `Next up: Step ${ns}` : 'Next up: keep training'}
          </Link>
          {due ? (
            <Link className="chip opt" to="/train/review">
              Review <b>{due}</b>
            </Link>
          ) : null}
          <span className="chip opt">
            Streak{' '}
            <b>
              {st} {st === 1 ? 'day' : 'days'}
            </b>
          </span>
          <span className="chip">
            <b>{progress.xp}</b> XP
          </span>
          {mic === 'on' ? (
            <button
              type="button"
              className="chip live"
              onClick={() => listener.stop()}
              aria-label="Listening. Press to stop the microphone."
            >
              <span className="dot" aria-hidden="true" /> Mic
            </button>
          ) : null}
          <button
            type="button"
            className="chip"
            aria-pressed={!muted}
            onClick={() => {
              engine.ensure();
              setPrefs({ muted: !muted });
            }}
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
          <ViewMenu />
        </div>
      </header>
      <div className="app">
        <nav className="side" aria-label="Lessons and tools">
          {NAV.map((g) => (
            <div className="nav-group" key={g.group}>
              <p className="nav-h">{g.group}</p>
              {g.items.map((it) => {
                const done = 'n' in it && progress.steps['step-' + it.n];
                return (
                  <NavLink key={it.to} to={it.to} className="nav-item">
                    {'n' in it ? (
                      <span className={`num${done ? ' done' : ''}`} aria-hidden="true">
                        {done ? '✓' : it.n}
                      </span>
                    ) : (
                      <span className="num icon">{ICONS[it.icon]}</span>
                    )}
                    <span>
                      {it.t}
                      {done ? <span className="sr-only"> (completed)</span> : null}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
          <p className="side-foot">
            Standard tuning E A D G B E. Space plays and stops, arrow keys move along the neck, letters answer quizzes.
            Tab into a fretboard and walk it with the arrow keys; Enter plays.
          </p>
        </nav>
        <main id="main" ref={mainRef} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      {/* Hidden only while a page's own transport bar (Step 5) is on screen, so Stop is always in view. */}
      {player.active && !player.inlineBarVisible ? (
        <div className="mini no-print" role="region" aria-label="Now playing">
          <span className="lbl">
            ▶ {player.label}
            {player.detail ? ` · ${player.detail}` : ''}
          </span>
          <button type="button" className="btn small" onClick={() => stopLoop()}>
            Stop<kbd>Space</kbd>
          </button>
        </div>
      ) : rActive && !onPractice && !player.active ? (
        <div className="mini no-print" role="region" aria-label="Routine timer">
          <span className="lbl">
            Routine {routineSt.block + 1}/4 · {fmtTime(routineSt.remaining)}
          </span>
          <button
            type="button"
            className="btn small"
            onClick={() => (routineSt.running ? pauseRoutine() : startRoutine())}
          >
            {routineSt.running ? 'Pause' : 'Resume'}
          </button>
        </div>
      ) : null}
      <div className={`toast${toastShow ? ' show' : ''}`} aria-hidden="true">
        {ui.toast?.msg}
      </div>
      <div className="sr-only" aria-live="polite" role="status">
        {ui.live}
      </div>
    </>
  );
}
