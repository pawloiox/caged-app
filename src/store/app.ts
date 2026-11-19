import { create } from 'zustand';
import { engine } from '../audio/engine';
import { listener } from '../audio/mic/listener';
import { todayStr } from '../theory/routine';
import { record as leitnerRecord } from '../train/leitner';
import { newlyComplete } from './criteria';
import {
  MemoryRepository,
  normalizePrefs,
  normalizeProgress,
  readLegacyLocalStorage,
  type ProgressRepository,
} from './repository';
import { defaultPrefs, defaultProgress, type Prefs, type Progress } from './types';

/* ---------------- UI: toast + one polite live region ---------------- */
interface UiState {
  toast: { id: number; msg: string } | null;
  live: string;
  /** Steps completed during this visit: the step page shows a lasting "complete, next step" callout. */
  justCompleted: string[];
  /** Progress can't be saved (no IndexedDB, or a save failed). */
  storageProblem: boolean;
}
export const useUi = create<UiState>(() => ({ toast: null, live: '', justCompleted: [], storageProblem: false }));
let toastId = 0;
let lastSaid = '';
let lastAt = 0;
export function toast(msg: string): void {
  useUi.setState({ toast: { id: ++toastId, msg } });
}
/** A message that is the whole outcome of an action: shown as a toast AND announced (toasts are aria-hidden). */
export function notify(msg: string): void {
  toast(msg);
  announce(msg);
}

/**
 * Announce through the one polite live region. An identical message within 1.5 s is an echo (a re-render)
 * and is dropped; after that, the same words are announced again, e.g. a second "Not quite" after a retry.
 */
export function announce(msg: string): void {
  const now = Date.now();
  if (!msg || (msg === lastSaid && now - lastAt < 1500)) return;
  const repeat = msg === useUi.getState().live;
  lastSaid = msg;
  lastAt = now;
  if (repeat) {
    // Same text as what is in the region: clear it first so assistive tech notices the change.
    useUi.setState({ live: '' });
    setTimeout(() => useUi.setState({ live: msg }), 60);
  } else useUi.setState({ live: msg });
}

/* ---------------- Prefs ---------------- */
export const usePrefs = create<Prefs>(() => defaultPrefs());
export function setPrefs(patch: Partial<Prefs>): void {
  usePrefs.setState(patch);
  const p = usePrefs.getState();
  if ('muted' in patch) engine.setMuted(p.muted);
  if ('guitarVol' in patch) engine.setGuitarVol(p.guitarVol);
  if ('clickVol' in patch) engine.setClickVol(p.clickVol);
  if ('micLatency' in patch) listener.latency = p.micLatency ?? 0;
}

/* ---------------- Progress ---------------- */
export const STEP_LABEL: Record<string, string> = {
  'step-1': 'Step 1',
  'step-2': 'Step 2',
  'step-3': 'Step 3',
  'step-4': 'Step 4',
  'step-5': 'Step 5',
};

export const useProgress = create<Progress>(() => defaultProgress());

/** Apply a change to progress, then complete any step whose criteria are now met. */
export function updateProgress(fn: (p: Progress) => Progress): void {
  const next = fn(useProgress.getState());
  const done = newlyComplete(next);
  if (done.length) {
    const steps = { ...next.steps };
    done.forEach((id) => (steps[id] = true));
    useProgress.setState({ ...next, steps, xp: next.xp + 50 * done.length });
    engine.chime();
    useUi.setState((u) => ({ justCompleted: [...u.justCompleted, ...done] }));
    // The caller usually shows its own feedback in the same tick ("Correct: …"). Let that be read first,
    // then announce the milestone, so neither message replaces the other.
    const label = done.map((d) => STEP_LABEL[d]).join(' and ');
    setTimeout(() => {
      toast(`${label} complete · +50 XP`);
      announce(`${label} complete. +50 XP.`);
    }, 1400);
  } else useProgress.setState(next);
}

export const addXP = (n: number): void => updateProgress((p) => ({ ...p, xp: p.xp + n }));

export function recordStat(key: string, ok: boolean): void {
  updateProgress((p) => ({ ...p, stats: { ...p.stats, [key]: leitnerRecord(p.stats[key], ok) } }));
}

export function patchSeen(patch: Partial<Progress['seen']>): void {
  updateProgress((p) => ({ ...p, seen: { ...p.seen, ...patch } }));
}

export function logDrill(key: string, bpm: number): void {
  updateProgress((p) => ({ ...p, xp: p.xp + 20, drills: { ...p.drills, [key]: Math.max(p.drills[key] ?? 0, bpm) } }));
}

export function logPivots(key: string, bpm: number, clean: number, total: number): void {
  updateProgress((p) => {
    const cur = p.pivots[key]?.[bpm];
    const better = !cur || clean / Math.max(1, total) >= cur.clean / Math.max(1, cur.total);
    return better ? { ...p, pivots: { ...p.pivots, [key]: { ...(p.pivots[key] ?? {}), [bpm]: { clean, total } } } } : p;
  });
}

export function logRoutineDay(): boolean {
  const t = todayStr();
  const first = !useProgress.getState().days.includes(t);
  if (first) updateProgress((p) => ({ ...p, days: [...p.days, t].slice(-366), xp: p.xp + 30 }));
  return first;
}

export function logReviewDay(): void {
  const t = todayStr();
  if (!useProgress.getState().reviewDays.includes(t))
    updateProgress((p) => ({ ...p, reviewDays: [...p.reviewDays, t].slice(-366), xp: p.xp + 15 }));
}

/* ---------------- Persistence ---------------- */
let repo: ProgressRepository = new MemoryRepository();

/**
 * Storage is unavailable (private mode, blocked site data, quota): say so once, never silently lose progress.
 * The warning waits a moment so it reaches the live region after the app has rendered.
 */
let storageWarned = false;
function saveFailed(): void {
  useUi.setState({ storageProblem: true });
  if (storageWarned) return;
  storageWarned = true;
  setTimeout(
    () => notify("Progress can't be saved in this browser. Use Export on the Practice page to keep a copy."),
    1200,
  );
}
let hydrated = false;
export const isHydrated = (): boolean => hydrated;

export async function hydrate(r?: ProgressRepository): Promise<{ imported: boolean }> {
  let imported = false;
  try {
    repo =
      r ??
      (typeof indexedDB !== 'undefined'
        ? new (await import('./dexieRepository')).DexieRepository()
        : new MemoryRepository());
    let progress = await repo.loadProgress();
    let prefs = await repo.loadPrefs();
    if (!progress || !prefs) {
      const legacy = readLegacyLocalStorage(typeof localStorage !== 'undefined' ? localStorage : null);
      if (!progress && legacy.progress) {
        progress = legacy.progress;
        imported = true;
      }
      if (!prefs && legacy.prefs) prefs = legacy.prefs;
    }
    useProgress.setState(normalizeProgress(progress));
    usePrefs.setState(normalizePrefs(prefs));
  } catch {
    repo = new MemoryRepository();
    saveFailed();
  }
  if (repo instanceof MemoryRepository && !r) saveFailed();
  const pf = usePrefs.getState();
  engine.muted = pf.muted;
  engine.guitarVol = pf.guitarVol;
  engine.clickVol = pf.clickVol;
  listener.latency = pf.micLatency ?? 0;
  hydrated = true;
  let t1: ReturnType<typeof setTimeout> | undefined;
  let t2: ReturnType<typeof setTimeout> | undefined;
  useProgress.subscribe((p) => {
    clearTimeout(t1);
    t1 = setTimeout(() => void repo.saveProgress(p).catch(saveFailed), 250);
  });
  usePrefs.subscribe((p) => {
    clearTimeout(t2);
    t2 = setTimeout(() => void repo.savePrefs(p).catch(saveFailed), 250);
  });
  // Debounced saves would be lost if the tab closes within 250 ms: flush on pagehide / hidden.
  const flush = () => {
    clearTimeout(t1);
    clearTimeout(t2);
    void repo.saveProgress(useProgress.getState()).catch(saveFailed);
    void repo.savePrefs(usePrefs.getState()).catch(saveFailed);
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && flush());
  }
  if (imported) {
    void repo.saveProgress(useProgress.getState());
    void repo.savePrefs(usePrefs.getState());
  }
  return { imported };
}

export function exportJSON(): string {
  return JSON.stringify(
    {
      app: 'caged-lab',
      exported: new Date().toISOString(),
      progress: useProgress.getState(),
      prefs: usePrefs.getState(),
    },
    null,
    2,
  );
}

export function importJSON(text: string): void {
  const data = JSON.parse(text) as { progress?: unknown; prefs?: unknown };
  if (!data || typeof data !== 'object' || !('progress' in data))
    throw new Error('This file is not a CAGED Lab export.');
  useProgress.setState(normalizeProgress(data.progress));
  if (data.prefs) setPrefs(normalizePrefs(data.prefs));
}

export async function resetAll(): Promise<void> {
  useProgress.setState(defaultProgress());
  await repo.clear();
}
