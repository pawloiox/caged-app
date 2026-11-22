import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState } from 'react';
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
import { loadGrain } from '../fretboard/materials';
import { isDue } from '../train/leitner';
import { FRETBOARD_END_CELLS, GuitarBody, Headstock, KnobFace } from './Guitar';

/** Frets close up toward the body: each fret's share of spare width shrinks like real fret spacing. */
const taper = (k: number) => +Math.pow(2, -k / 12).toFixed(3);
/** The upper frets past the tools, each one a semitone's ratio narrower than the last. */
const TAIL = Array.from({ length: 14 }, (_, k) => +(44 * Math.pow(2, -k / 12)).toFixed(1));

/** Steps are fret positions on the neck; the tools sit past the 12th-fret inlay. */
const STEPS = [
  { to: '/learn/1', n: 1, t: 'Open chords' },
  { to: '/learn/2', n: 2, t: 'Movable shapes' },
  { to: '/learn/3', n: 3, t: 'C up the neck' },
  { to: '/learn/4', n: 4, t: 'Any key' },
  { to: '/learn/5', n: 5, t: 'Make it musical' },
] as const;
const TOOLS = [
  { to: '/explore', t: 'Explorer' },
  { to: '/practice', t: 'Routine' },
  { to: '/train', t: 'Train' },
  { to: '/tuner', t: 'Tuner' },
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
      <Popover.Trigger className="knob-btn view" aria-label="View and sound settings">
        <KnobFace angle={0} />
        <span className="knob-label">View</span>
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
              ['dark', 'Wood'],
              ['light', 'Light'],
              ['system', 'Match device'],
            ]}
            onChange={(v) => setPrefs({ theme: v, themeChosen: true })}
            label="Theme"
          />
          <Seg
            value={p.minorSpelling}
            options={[
              ['flat', 'E♭ minor'],
              ['sharp', 'D♯ minor'],
            ]}
            onChange={(v) => setPrefs({ minorSpelling: v })}
            label="Minor key spelling"
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
          <h2 className="card-title">Keys</h2>
          <p className="muted menu-note">
            Space plays and stops. Arrow keys move along the neck. Letters answer quizzes. Tab into a fretboard and walk
            it with the arrow keys; Enter plays the note.
          </p>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Layout() {
  const loc = useLocation();
  const mainRef = useRef<HTMLElement>(null);
  const neckRef = useRef<HTMLElement>(null);
  // The rosewood grain is shared by the fretboards and, in the wood theme, the page behind everything.
  useEffect(() => {
    void loadGrain().then((u) => u && document.documentElement.style.setProperty('--page-grain', `url("${u}")`));
  }, []);
  // On a narrow screen the neck scrolls sideways: keep the current position in view.
  useEffect(() => {
    const cur = neckRef.current?.querySelector<HTMLElement>('.fret[aria-current="page"]');
    const neck = neckRef.current;
    if (cur && neck) neck.scrollLeft = cur.offsetLeft - (neck.clientWidth - cur.offsetWidth) / 2;
  }, [loc.pathname]);
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
    // Mirrored for the first paint: index.html reads it before the app (and IndexedDB) loads, so the wood
    // or light page appears at once, with no flash of the other.
    try {
      localStorage.setItem('caged-lab:theme', theme);
    } catch {
      /* private mode: the default (wood) shows first */
    }
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
      <header className="guitar">
        <Link className="headstock" to="/" aria-label="CAGED Lab home">
          <Headstock />
          <span className="brand-plain" aria-hidden="true">
            <svg width="58" height="18" viewBox="0 0 58 18">
              <circle cx="9" cy="9" r="7" fill="var(--c-shape)" />
              <circle cx="19" cy="9" r="7" fill="var(--a-shape)" />
              <circle cx="29" cy="9" r="7" fill="var(--g-shape)" />
              <circle cx="39" cy="9" r="7" fill="var(--e-shape)" />
              <circle cx="49" cy="9" r="7" fill="var(--d-shape)" />
            </svg>
            <span>CAGED Lab</span>
          </span>
        </Link>
        <nav className="neck" aria-label="Lessons and tools" ref={neckRef}>
          <div className="neck-board">
            {STEPS.map((it, k) => {
              const done = !!progress.steps['step-' + it.n];
              // A finished step whose re-test is due: the pearl dulls until the skill is checked again.
              const checkDue = done && isDue(progress.stats['step:' + it.n]);
              const next = ns === it.n;
              return (
                <NavLink key={it.to} to={it.to} className="fret" style={{ flexGrow: taper(k) }}>
                  <span className={`inlay${done ? ' done' : ''}${checkDue ? ' due' : ''}`} aria-hidden="true">
                    {it.n}
                  </span>
                  <span className="fret-label">
                    <span className="sr-only">Step {it.n}: </span>
                    {it.t}
                    {done ? (
                      <span className="sr-only">{checkDue ? ' (completed, check due)' : ' (completed)'}</span>
                    ) : null}
                  </span>
                  {next ? <span className="fret-sub">Next up</span> : null}
                </NavLink>
              );
            })}
            <span className="twelfth" aria-hidden="true" />
            {TOOLS.map((it, k) => {
              const sub =
                it.to === '/train' && due
                  ? `${due} due`
                  : it.to === '/practice'
                    ? rActive
                      ? `${fmtTime(routineSt.remaining)} left${routineSt.running ? '' : ', paused'}`
                      : st
                        ? `${st}-day streak`
                        : ''
                    : '';
              return (
                <NavLink key={it.to} to={it.to} className="fret tool" style={{ flexGrow: taper(k + 6) }}>
                  <span className="fret-label">{it.t}</span>
                  {sub ? <span className="fret-sub">{sub}</span> : null}
                </NavLink>
              );
            })}
            <span className="fret-tail" aria-hidden="true">
              <span className="fret-tail-inner">
                {TAIL.map((w, k) => (
                  <span
                    key={k}
                    className={`fret-deco${k % 2 === 0 && k > 0 && k < 9 ? ' dot' : ''}`}
                    style={{ width: w }}
                  />
                ))}
              </span>
            </span>
          </div>
        </nav>
        <div className="gbody">
          <GuitarBody />
          <span className="neck-end" aria-hidden="true">
            {FRETBOARD_END_CELLS.map((w, k) => (
              <span key={k} className={`fret-deco${k % 2 === 1 ? ' dot' : ''}`} style={{ width: w }} />
            ))}
          </span>
          <div className="controls">
            <span className="xp">
              <b>{progress.xp}</b> XP
            </span>
            {mic === 'on' ? (
              <button
                type="button"
                className="mic-led"
                onClick={() => listener.stop()}
                aria-label="Listening. Press to stop the microphone."
              >
                <span className="dot" aria-hidden="true" /> Mic
              </button>
            ) : null}
            <button
              type="button"
              className="knob-btn sound"
              aria-pressed={!muted}
              onClick={() => {
                engine.ensure();
                setPrefs({ muted: !muted });
              }}
            >
              <KnobFace angle={muted ? -135 : 135} />
              <span className="knob-label">{muted ? 'Sound off' : 'Sound on'}</span>
            </button>
            <ViewMenu />
          </div>
        </div>
      </header>
      <div className="app">
        <main
          id="main"
          ref={mainRef}
          tabIndex={-1}
          className={(player.active && !player.inlineBarVisible) || (rActive && !onPractice) ? 'with-mini' : undefined}
        >
          <Outlet />
        </main>
      </div>
      {/* Hidden only while a page's own transport bar (Step 5) is on screen, so Stop is always in view. */}
      {player.active && !player.inlineBarVisible ? (
        <div className="mini no-print" role="region" aria-label="Now playing">
          <span className="lbl">
            ▶ {player.label}
            {player.detail ? ` (${player.detail})` : ''}
          </span>
          <button type="button" className="btn small" onClick={() => stopLoop()}>
            Stop<kbd>Space</kbd>
          </button>
        </div>
      ) : rActive && !onPractice && !player.active ? (
        <div className="mini no-print" role="region" aria-label="Routine timer">
          <span className="lbl">
            Routine {routineSt.block + 1} of 4, {fmtTime(routineSt.remaining)} left
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
