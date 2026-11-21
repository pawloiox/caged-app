import { create } from 'zustand';
import { engine } from '../audio/engine';
import { announce, logRoutineDay, notify, toast, useProgress } from '../store/app';
import { planRoutine, type PlanBlock } from './plan';

/**
 * The 15-minute routine timer. It keeps running while the player opens an exercise. Not musical timing.
 * The plan is made from the player's progress when the routine starts, and stays fixed until it ends, so
 * answering a review item mid-routine doesn't reshuffle the blocks.
 */
interface RoutineState {
  running: boolean;
  block: number;
  remaining: number;
  skipped: boolean;
  /** Today's plan, fixed while the routine runs; null when it hasn't started. */
  plan: PlanBlock[] | null;
}

export const useRoutine = create<RoutineState>(() => ({
  running: false,
  block: 0,
  remaining: 0,
  skipped: false,
  plan: null,
}));

/** The blocks to show: the running plan, or the plan the routine would start with now. */
export const currentPlan = (): PlanBlock[] => useRoutine.getState().plan ?? planRoutine(useProgress.getState());

let timer: ReturnType<typeof setInterval> | undefined;
let last = 0;

function tick() {
  const now = Date.now();
  const st = useRoutine.getState();
  const rs = st.plan ?? currentPlan();
  let remaining = st.remaining - (now - last) / 1000;
  last = now;
  let block = st.block;
  if (remaining <= 0) {
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
    announce(`Block done. Next: ${rs[block]!.title}.`);
  }
  useRoutine.setState({ remaining, block });
}

export function startRoutine() {
  engine.ensure();
  if (!useRoutine.getState().plan) {
    const plan = planRoutine(useProgress.getState());
    useRoutine.setState({ plan, block: 0, remaining: plan[0]!.min * 60 });
  }
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
  useRoutine.setState({ block: 0, remaining: 0, skipped: false, plan: null });
}
export function skipBlock() {
  const st = useRoutine.getState();
  const rs = st.plan ?? planRoutine(useProgress.getState());
  engine.chime();
  const block = st.block + 1;
  if (block >= rs.length) {
    useRoutine.setState({ skipped: true });
    finish();
    return;
  }
  useRoutine.setState({ plan: rs, block, remaining: rs[block]!.min * 60, skipped: true });
}
function finish() {
  const skipped = useRoutine.getState().skipped;
  resetRoutine();
  if (skipped) notify("Routine finished. Days with skipped blocks don't count toward your streak.");
  else notify(logRoutineDay() ? 'Routine done for today, +30 XP' : 'Routine done again. Nice work.');
}

export const routineActive = (s: RoutineState): boolean => s.running || s.plan != null;
