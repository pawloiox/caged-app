import { create } from 'zustand';
import { engine } from '../audio/engine';
import { routine } from '../theory/routine';
import { logRoutineDay, toast } from '../store/app';

/** The 15-minute routine timer. It keeps running while the player opens an exercise. Not musical timing. */
interface RoutineState {
  running: boolean;
  block: number;
  remaining: number;
  skipped: boolean;
}

export const useRoutine = create<RoutineState>(() => ({
  running: false,
  block: 0,
  remaining: routine()[0]!.min * 60,
  skipped: false,
}));

let timer: ReturnType<typeof setInterval> | undefined;
let last = 0;

function tick() {
  const now = Date.now();
  const st = useRoutine.getState();
  let remaining = st.remaining - (now - last) / 1000;
  last = now;
  let block = st.block;
  if (remaining <= 0) {
    const rs = routine();
    engine.chime();
    while (remaining <= 0) {
      block++;
      if (block >= rs.length) {
        finish();
        return;
      }
      remaining += rs[block]!.min * 60;
    }
    toast(`Next: ${rs[block]!.title}`);
  }
  useRoutine.setState({ remaining, block });
}

export function startRoutine() {
  engine.ensure();
  last = Date.now();
  clearInterval(timer);
  timer = setInterval(tick, 250);
  useRoutine.setState({ running: true });
}
export function pauseRoutine() {
  clearInterval(timer);
  useRoutine.setState({ running: false });
}
export function resetRoutine() {
  pauseRoutine();
  useRoutine.setState({ block: 0, remaining: routine()[0]!.min * 60, skipped: false });
}
export function skipBlock() {
  const rs = routine();
  const st = useRoutine.getState();
  engine.chime();
  const block = st.block + 1;
  if (block >= rs.length) {
    useRoutine.setState({ skipped: true });
    finish();
    return;
  }
  useRoutine.setState({ block, remaining: rs[block]!.min * 60, skipped: true });
}
function finish() {
  const skipped = useRoutine.getState().skipped;
  resetRoutine();
  if (skipped) toast("Routine finished. Days with skipped blocks don't count toward your streak.");
  else toast(logRoutineDay() ? 'Routine done for today · +30 XP' : 'Routine done again. Nice work.');
}

export const routineActive = (s: RoutineState): boolean =>
  s.running || s.block > 0 || s.remaining < routine()[0]!.min * 60;
