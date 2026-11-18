/**
 * Musical timing on the Tone.js Transport (sample-accurate, lookahead-scheduled). Beat callbacks run
 * ahead of time with the exact audio time; UI updates come back through Tone's Draw at that time.
 * Nothing musical uses setTimeout.
 */
import { create } from 'zustand';
import { engine } from './engine';

type ToneNS = typeof import('tone');
let tonePromise: Promise<ToneNS> | null = null;
/** Set once Tone has loaded, so stopping is synchronous (an async stop could cancel the next start). */
let toneNS: ToneNS | null = null;

export function loadTone(): Promise<ToneNS> {
  if (!tonePromise) {
    tonePromise = import('tone').then((Tone) => {
      const ctx = engine.ensure();
      if (ctx) Tone.setContext(ctx);
      Tone.getContext().lookAhead = 0.05;
      toneNS = Tone;
      return Tone;
    });
  }
  return tonePromise;
}

export type LoopEvent<P> = { kind: 'count'; n: number } | { kind: 'beat'; p: P; time: number } | { kind: 'end' };

export interface LoopSpec<P> {
  id: string;
  label: string;
  bpm: number;
  /** Count-in beats (clicked, accented on the first). Default 4. */
  countIn?: number;
  /** Schedule audio for beat n (after the count-in) at `time`. Return a payload, 'end' to finish, or null. */
  beat: (time: number, n: number, spb: number) => P | 'end' | null;
  ui: (ev: LoopEvent<P>) => void;
  onStop?: () => void;
}

interface PlayerState {
  active: boolean;
  id: string | null;
  label: string;
  detail: string;
  bpm: number;
}

export const usePlayer = create<PlayerState>(() => ({ active: false, id: null, label: '', detail: '', bpm: 0 }));

let current: { id: string; onStop?: () => void } | null = null;

export async function startLoop<P>(spec: LoopSpec<P>): Promise<boolean> {
  if (!engine.ensure()) return false;
  const Tone = await loadTone();
  stopLoop();
  const transport = Tone.getTransport();
  const draw = Tone.getDraw();
  transport.cancel(0);
  transport.position = 0;
  transport.bpm.value = spec.bpm;
  const countIn = spec.countIn ?? 4;
  let n = 0;
  transport.scheduleRepeat(
    (time) => {
      const k = n++;
      if (k < countIn) {
        engine.click(time, k === 0);
        draw.schedule(() => spec.ui({ kind: 'count', n: countIn - k }), time);
        return;
      }
      const spb = 60 / transport.bpm.value;
      const p = spec.beat(time, k - countIn, spb);
      if (p === 'end') {
        draw.schedule(() => {
          spec.ui({ kind: 'end' });
          stopLoop();
        }, time);
        return;
      }
      if (p != null) draw.schedule(() => spec.ui({ kind: 'beat', p, time }), time);
    },
    '4n',
    0,
  );
  current = { id: spec.id, onStop: spec.onStop };
  usePlayer.setState({ active: true, id: spec.id, label: spec.label, detail: '', bpm: spec.bpm });
  transport.start('+0.08');
  return true;
}

export function stopLoop(): void {
  if (toneNS) {
    const t = toneNS.getTransport();
    t.stop();
    t.cancel(0);
    toneNS.getDraw().cancel(0);
  }
  const c = current;
  current = null;
  if (c) {
    usePlayer.setState({ active: false, id: null, label: '', detail: '' });
    c.onStop?.();
  }
}

export function setLoopBpm(bpm: number): void {
  usePlayer.setState({ bpm });
  if (toneNS) toneNS.getTransport().bpm.value = bpm;
}

export const isLooping = (id?: string): boolean => (id ? current?.id === id : current != null);

/**
 * Offline timing self-test: render `seconds` of a click track at `bpm` in an OfflineAudioContext and
 * report the worst deviation of any scheduled beat from its ideal time. Used by /diagnostics and E2E.
 */
export async function timingSelfTest(bpm = 140, seconds = 300): Promise<{ beats: number; maxErrorMs: number }> {
  const Tone = await loadTone();
  const times: number[] = [];
  await Tone.Offline(
    ({ transport }) => {
      transport.bpm.value = bpm;
      transport.scheduleRepeat((t) => times.push(t), '4n', 0);
      transport.start(0);
    },
    seconds,
    1,
    8000,
  );
  const spb = 60 / bpm;
  let maxErr = 0;
  times.forEach((t, i) => (maxErr = Math.max(maxErr, Math.abs(t - i * spb))));
  return { beats: times.length, maxErrorMs: maxErr * 1000 };
}
