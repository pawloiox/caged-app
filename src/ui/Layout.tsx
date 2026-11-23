import * as Popover from '@radix-ui/react-popover';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { engine } from '../audio/engine';
import { listener, useMic } from '../audio/mic/listener';
import { METRO_ID, stopPageLoop } from '../audio/metronome';
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
import { MetronomeMenu } from './Metronome';

/** When the page starts settling, in ms into the guitar's drop: its body touches down at 80 + 0.52 × 950 = 574 ms. */
const GUITAR_LANDS = 480;

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
  { to: '/scales', t: 'Scales' },
  { to: '/practice', t: 'Routine' },
  { to: '/train', t: 'Train' },
  { to: '/tuner', t: 'Tuner' },
] as const;

/** Screens taller than wide, phone widths and phones held sideways (styles.css uses the same query): the neck is an
 * upright neck in a drawer from the left, opened with Menu. */
/** How much of the headstock shows above the frets when the drawer opens: its foot, beside Close. */
const DRAWER_PEEK = 64;
/** The drawer's slide in and out (styles.css --drawer-in, --drawer-out). */
const DRAWER_IN_MS = 440;
const DRAWER_OUT_MS = 260;
const DRAWER = '(orientation: portrait), (max-width: 600px), (pointer: coarse) and (max-height: 500px)';
function useDrawerNav(): boolean {
  const [phone, setPhone] = useState(() => typeof window !== 'undefined' && window.matchMedia(DRAWER).matches);
  useEffect(() => {
    const mq = window.matchMedia(DRAWER);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

/** A little upright fretboard: the menu button's icon (its frets read as the usual three bars). */
/** The fretboard's last frets, laid over the body drawing (Guitar.tsx FRETBOARD_END). */
function FretboardEnd() {
  return (
    <span className="neck-end" aria-hidden="true">
      {FRETBOARD_END_CELLS.map((w, k) => (
        <span key={k} className={`fret-deco${k % 2 === 1 ? ' dot' : ''}`} style={{ width: w }} />
      ))}
    </span>
  );
}

function NeckIcon() {
  return (
    <svg className="neck-icon" width="22" height="26" viewBox="0 0 22 26" aria-hidden="true">
      <rect x="4.5" y="0.5" width="13" height="25" rx="2" fill="#3a2317" stroke="currentColor" strokeOpacity="0.55" />
      <rect x="4.5" y="0.5" width="13" height="3" rx="1" fill="#ded6c6" />
      {[8.5, 14.5, 20].map((y) => (
        <rect key={y} x="5" y={y} width="12" height="1.6" fill="#d9dddf" />
      ))}
      {[7.5, 11, 14.5].map((x) => (
        <rect key={x} x={x} y="3.5" width="0.8" height="22" fill="#cfc9bf" opacity="0.7" />
      ))}
    </svg>
  );
}

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
            <span className="field-label">Guitar</span>
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
            <span className="field-label">Click</span>
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
  const guitarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const phone = useDrawerNav();
  const [open, setOpen] = useState(false);
  const drawer = phone && open;
  /**
   * The page behind the open drawer is inert, but only once the drawer has slid in, and until it has slid out:
   * restyling the whole page in a tap's own frame would hold the slide back (the drawer effect below).
   */
  const [pageInert, setPageInert] = useState(false);
  /** Close the drawer; focus goes back to the menu button unless a link is taking it to the new page. */
  const closeDrawer = (restore = true) => {
    setOpen(false);
    if (restore) requestAnimationFrame(() => menuRef.current?.focus({ preventScroll: true }));
    // A new page takes focus at once, so it can't wait out the slide to stop being inert.
    else setPageInert(false);
  };
  // Opening the site: the page waits (html[data-intro=""], set in main.tsx) and settles in when the dropping guitar's
  // body touches down, timed off the guitar's own animation so the two always meet.
  useEffect(() => {
    const root = document.documentElement;
    if (root.dataset.intro !== '') return;
    const drop = guitarRef.current?.getAnimations().find((a) => (a as CSSAnimation).animationName === 'guitar-drop');
    let clear = 0;
    const land = () => {
      root.dataset.intro = 'landed';
      clear = window.setTimeout(() => delete root.dataset.intro, 2200);
    };
    // GUITAR_LANDS: delay + 52% of the drop (styles.css), less a beat so the page meets it.
    const wait = drop ? GUITAR_LANDS - Number(drop.currentTime ?? 0) : 0;
    const t = window.setTimeout(land, Math.max(0, wait));
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(clear);
    };
  }, []);
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

  // Route change: stop the page's playback (the metronome plays on), close the drawer, scroll up, move focus to the
  // new heading.
  useEffect(() => {
    stopPageLoop();
    setOpen(false);
    setPageInert(false);
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

  // The drawer: it opens on the frets, with the foot of the headstock just showing above them (scroll up for the
  // rest), and focus on the current page's fret, in view. The page behind stays still.
  useEffect(() => {
    const root = document.documentElement;
    const nav = neckRef.current;
    const peek = () => {
      const board = nav?.querySelector<HTMLElement>('.neck-board');
      if (nav && board) nav.scrollTop = Math.max(0, board.offsetTop - DRAWER_PEEK);
    };
    if (!drawer) {
      // Once it is out of sight: the page back, and the drawer at its opening view, so the next open has nothing
      // to scroll or draw.
      const t = window.setTimeout(() => {
        root.classList.remove('drawer-open');
        setPageInert(false);
        if (phone) peek();
      }, DRAWER_OUT_MS);
      return () => window.clearTimeout(t);
    }
    root.classList.add('drawer-open');
    const id = requestAnimationFrame(() => {
      peek();
      const cur =
        nav?.querySelector<HTMLElement>('.fret[aria-current="page"]') ?? nav?.querySelector<HTMLElement>('.fret');
      cur?.focus({ preventScroll: true });
      cur?.scrollIntoView({ block: 'nearest' });
    });
    const t = window.setTimeout(() => setPageInert(true), DRAWER_IN_MS);
    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t);
    };
  }, [drawer, phone]);
  // Back on a wide screen, the neck is the guitar's again.
  useEffect(() => {
    if (!phone) setOpen(false);
  }, [phone]);

  /** Inside the open drawer: Escape closes it, and Tab goes round its links and Close, not out to the page. */
  const drawerKeys = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!drawer) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDrawer();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [...e.currentTarget.querySelectorAll<HTMLElement>('a[href], button')];
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  };

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
      <header className="guitar" ref={guitarRef}>
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
        <nav
          id="site-nav"
          className={`neck${drawer ? ' open' : ''}`}
          aria-label="Lessons and tools"
          ref={neckRef}
          // Out of reach while closed, from the moment its slide out is over.
          inert={phone && !open && !pageInert}
          onKeyDown={drawerKeys}
          onClick={(e) => {
            // A fret closes the drawer. A new page takes focus to its heading; the same page, back to Menu.
            const a = (e.target as HTMLElement).closest('a');
            if (drawer && a) closeDrawer(a.pathname === loc.pathname);
          }}
        >
          {/* The drawer: the whole guitar stands up in it, headstock (the home link, as on wide screens) above the
              frets and the body below. It opens on the frets; the rest is there for whoever scrolls. Close stays put. */}
          <div className="drawer-bar">
            <button type="button" className="btn drawer-close" onClick={() => closeDrawer()}>
              Close
            </button>
          </div>
          <div className="drawer-head">
            <Link className="drawer-headstock" to="/" aria-label="CAGED Lab home">
              <Headstock />
            </Link>
          </div>
          <div className="neck-board">
            <span className="drawer-neck" aria-hidden="true">
              <span className="neck-wood" />
            </span>
            {STEPS.map((it, k) => {
              const done = !!progress.steps['step-' + it.n];
              // A finished step whose re-test is due: the pearl dulls until the skill is checked again.
              const checkDue = done && isDue(progress.stats['step:' + it.n]);
              const next = ns === it.n;
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className="fret"
                  style={{ flexGrow: taper(k), ['--t' as string]: taper(k) }}
                >
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
                <NavLink
                  key={it.to}
                  to={it.to}
                  className="fret tool"
                  style={{ flexGrow: taper(k + 6), ['--t' as string]: taper(k + 6) }}
                >
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
          <div className="drawer-body" aria-hidden="true">
            <GuitarBody />
            <FretboardEnd />
          </div>
        </nav>
        <div className={`scrim${drawer ? ' open' : ''}`} aria-hidden="true" onClick={() => closeDrawer()} />
        <div className="gbody">
          <GuitarBody />
          <FretboardEnd />
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
            <MetronomeMenu />
            <ViewMenu />
          </div>
        </div>
        {/* Last in the row, at its right end, on the side the drawer comes from. */}
        <button
          type="button"
          className="menu-btn"
          ref={menuRef}
          aria-expanded={drawer}
          aria-controls="site-nav"
          onClick={() => setOpen(true)}
        >
          <NeckIcon />
          <span>Menu</span>
        </button>
      </header>
      <div className="app" inert={pageInert}>
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
        <div className="mini no-print" role="region" aria-label="Now playing" inert={pageInert}>
          <span className="lbl">
            ▶ {player.label}
            {player.id === METRO_ID ? `, ${player.bpm} BPM` : player.detail ? ` (${player.detail})` : ''}
          </span>
          {/* Space is the page's own play key, so it stops the page's playback, not the metronome. */}
          <button type="button" className="btn small" onClick={() => stopLoop()}>
            Stop{player.id === METRO_ID ? null : <kbd>Space</kbd>}
          </button>
        </div>
      ) : rActive && !onPractice && !player.active ? (
        <div className="mini no-print" role="region" aria-label="Routine timer" inert={pageInert}>
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
