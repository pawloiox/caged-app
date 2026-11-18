import type { Progress } from './types';

/** What finishing each step requires. Every one needs doing, not clicking. */
export const CHECK_LEN = 10;
export const CHECK_PASS = 8;
export const PRED_NEED = 3;
export const S2_NEED = 3;

export const drillKeysOtherThanC = (p: Progress): number => Object.keys(p.drills).filter((k) => k !== 'major0').length;

export const STEP_CRITERIA: Record<string, (p: Progress) => boolean> = {
  'step-1': (p) => (p.seen.s1 ?? []).length >= 5,
  'step-2': (p) => (p.seen.s2 ?? 0) >= S2_NEED,
  'step-3': (p) => (p.seen.s3check ?? 0) >= CHECK_PASS && !!p.drills.major0,
  'step-4': (p) => (p.seen.s4pred ?? []).length >= PRED_NEED && drillKeysOtherThanC(p) >= 1,
  'step-5': (p) => (p.seen.s5 ?? []).length >= 2,
};

/** Steps whose criteria are met but which are not yet marked complete. */
export const newlyComplete = (p: Progress): string[] =>
  Object.keys(STEP_CRITERIA).filter((id) => !p.steps[id] && STEP_CRITERIA[id]!(p));

export const nextStep = (p: Progress): number | null => {
  const n = [1, 2, 3, 4, 5].find((i) => !p.steps['step-' + i]);
  return n ?? null;
};
