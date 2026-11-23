/**
 * The metronome: a click on every beat, the first of each bar accented, run on the shared Transport like any other
 * loop. So it is one player among the others: starting a page's playback stops it, and starting it stops theirs.
 * Unlike a page's loop it keeps going from page to page (Layout.tsx), until it is stopped.
 */
import { create } from 'zustand';
import { setPrefs, usePrefs } from '../store/app';
import { METRO_MAX, METRO_MIN } from '../store/types';
import { engine } from './engine';
import { isLooping, setLoopBpm, startLoop, stopLoop, usePlayer } from './transport';

export const METRO_ID = 'metronome';

interface MetroBeat {
  /** The beat of the bar just clicked (0 = the first), or -1 when stopped. */
  beat: number;
  /** Which way the pendulum is swinging: it reaches the other side on the next click. */
  side: 1 | -1;
}

export const useMetroBeat = create<MetroBeat>(() => ({ beat: -1, side: 1 }));

export const clampBpm = (bpm: number): number => Math.round(Math.min(METRO_MAX, Math.max(METRO_MIN, bpm)));

export const useMetronomePlaying = (): boolean => usePlayer((p) => p.id === METRO_ID);

export function startMetronome(): Promise<boolean> {
  return startLoop<number>({
    id: METRO_ID,
    label: 'Metronome',
    bpm: usePrefs.getState().metroBpm,
    countIn: 0,
    beat: (time, n) => {
      // Read live, so a change of beats per bar takes effect on the next beat.
      const bpb = usePrefs.getState().metroBeats;
      const i = bpb > 1 ? n % bpb : 0;
      engine.click(time, bpb > 1 && i === 0);
      return i;
    },
    ui: (ev) => {
      if (ev.kind === 'beat') useMetroBeat.setState((s) => ({ beat: ev.p, side: s.side === 1 ? -1 : 1 }));
    },
    onStop: () => useMetroBeat.setState({ beat: -1, side: 1 }),
  });
}

/** Stop a page's own playback (a page changing, a quiz starting), leaving the metronome playing. */
export function stopPageLoop(): void {
  if (!isLooping(METRO_ID)) stopLoop();
}

export function toggleMetronome(): void {
  if (isLooping(METRO_ID)) stopLoop();
  else void startMetronome();
}

/** A new tempo: kept for next time, and heard from the next beat if it is playing. */
export function setMetroBpm(bpm: number): void {
  const b = clampBpm(bpm);
  setPrefs({ metroBpm: b });
  if (isLooping(METRO_ID)) setLoopBpm(b);
}

/** A tap more than this long after the last starts a new count. */
const TAP_RESET_MS = 2000;
/** How many of the latest taps the tempo is taken from. */
const TAP_KEEP = 5;

/**
 * Tap tempo: given the tap times so far (ms, oldest first) and a new tap, the taps to keep and the tempo they set
 * (null until there are two). The tempo is the average gap between the latest taps.
 */
export function tapTempo(taps: readonly number[], now: number): { taps: number[]; bpm: number | null } {
  const last = taps[taps.length - 1];
  const kept = last != null && now - last <= TAP_RESET_MS ? [...taps, now].slice(-TAP_KEEP) : [now];
  if (kept.length < 2) return { taps: kept, bpm: null };
  const gap = (kept[kept.length - 1]! - kept[0]!) / (kept.length - 1);
  return { taps: kept, bpm: clampBpm(60000 / gap) };
}
