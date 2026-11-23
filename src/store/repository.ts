import { METRO_MAX, METRO_MIN, defaultPrefs, defaultProgress, type Prefs, type Progress } from './types';
import { migrateStat, type Stat } from '../train/leitner';

/** Storage boundary. The UI never touches IndexedDB directly, so a sync backend can replace this later. */
export interface ProgressRepository {
  loadProgress(): Promise<Progress | null>;
  saveProgress(p: Progress): Promise<void>;
  loadPrefs(): Promise<Prefs | null>;
  savePrefs(p: Prefs): Promise<void>;
  clear(): Promise<void>;
}

export class MemoryRepository implements ProgressRepository {
  progress: Progress | null = null;
  prefs: Prefs | null = null;
  async loadProgress() {
    return this.progress ? structuredClone(this.progress) : null;
  }
  async saveProgress(p: Progress) {
    this.progress = structuredClone(p);
  }
  async loadPrefs() {
    return this.prefs ? structuredClone(this.prefs) : null;
  }
  async savePrefs(p: Prefs) {
    this.prefs = structuredClone(p);
  }
  async clear() {
    this.progress = null;
    this.prefs = null;
  }
}

/** Merge any stored or imported progress object (v5 localStorage or a v2 export) onto defaults. */
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : undefined;
const strArr = (v: unknown, ok: (x: string) => boolean = () => true): string[] =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === 'string' && ok(x)))] : [];
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Merge any stored or imported progress object (v5 localStorage or a v2 export) onto defaults, field by field.
 * Anything of the wrong type is dropped, so a hand-edited or corrupt file can't break the app.
 */
export function normalizeProgress(raw: unknown, now = Date.now()): Progress {
  const base = defaultProgress();
  if (!isObj(raw)) return base;
  const stats: Record<string, Stat> = {};
  if (isObj(raw.stats))
    for (const [k, v] of Object.entries(raw.stats))
      if (isObj(v) && num(v.r) != null && num(v.w) != null)
        stats[k] = migrateStat(
          {
            r: num(v.r)!,
            w: num(v.w)!,
            box: num(v.box, 0, 4),
            last: num(v.last),
            t: num(v.t, 0, 3_600_000),
            first: num(v.first),
            mast: num(v.mast),
            ma: num(v.ma),
          },
          now,
        );
  const steps: Record<string, boolean> = {};
  if (isObj(raw.steps))
    for (const [k, v] of Object.entries(raw.steps)) if (/^step-[1-5]$/.test(k) && v === true) steps[k] = true;
  const drills: Record<string, number> = {};
  if (isObj(raw.drills))
    for (const [k, v] of Object.entries(raw.drills))
      if (/^(major|minor|dom7)\d{1,2}$/.test(k) && num(v, 1, 400)) drills[k] = num(v, 1, 400)!;
  const pivots: Progress['pivots'] = {};
  if (isObj(raw.pivots))
    for (const [k, byBpm] of Object.entries(raw.pivots))
      if (isObj(byBpm))
        for (const [bpm, sc] of Object.entries(byBpm))
          if (isObj(sc) && num(sc.clean) != null && num(sc.total) != null)
            (pivots[k] ??= {})[bpm] = { clean: num(sc.clean)!, total: num(sc.total)! };
  const tally = (v: unknown) =>
    isObj(v) && num(v.ok) != null && num(v.n) != null && num(v.ok)! <= num(v.n)!
      ? { ok: num(v.ok)!, n: num(v.n)! }
      : { ok: 0, n: 0 };
  const ret = isObj(raw.retention) ? raw.retention : {};
  const seenRaw = isObj(raw.seen) ? raw.seen : {};
  const shapeLetters = new Set(['C', 'A', 'G', 'E', 'D']);
  const zoneIds = new Set(['open', 'z3', 'z5', 'z7', 'z10']);
  const seen: Progress['seen'] = {};
  const s1 = strArr(seenRaw.s1, (x) => shapeLetters.has(x));
  if (s1.length) seen.s1 = s1;
  if (num(seenRaw.s2) != null) seen.s2 = num(seenRaw.s2);
  if (num(seenRaw.s3check, 0, 10) != null) seen.s3check = num(seenRaw.s3check, 0, 10);
  if (num(seenRaw.s3level, 0, 5) != null) seen.s3level = num(seenRaw.s3level, 0, 5);
  const s4 = strArr(seenRaw.s4pred, (x) => /^(major|minor)\d{1,2}$/.test(x));
  if (s4.length) seen.s4pred = s4;
  const s5 = strArr(seenRaw.s5, (x) => zoneIds.has(x));
  if (s5.length) seen.s5 = s5;
  return {
    ...base,
    steps,
    xp: num(raw.xp) ?? 0,
    days: strArr(raw.days, (d) => DAY_RE.test(d)),
    reviewDays: strArr(raw.reviewDays, (d) => DAY_RE.test(d)),
    best: num(raw.best) ?? 0,
    stats,
    drills,
    pivots,
    retention: { d1: tally(ret.d1), d7: tally(ret.d7) },
    song: typeof raw.song === 'string' ? raw.song.slice(0, 400) : '',
    seen,
  };
}

export function normalizePrefs(raw: unknown): Prefs {
  const base = defaultPrefs();
  if (!raw || typeof raw !== 'object') return base;
  const merged = { ...base, ...(raw as Partial<Prefs>) };
  if (!['iv', 'note', 'finger', 'shape', 'none'].includes(merged.labels)) merged.labels = 'iv';
  if (!['shapes', 'roots', 'none'].includes(merged.fade)) merged.fade = 'shapes';
  if (!Number.isFinite(merged.metroBpm)) merged.metroBpm = base.metroBpm;
  merged.metroBpm = Math.round(Math.min(METRO_MAX, Math.max(METRO_MIN, merged.metroBpm)));
  if (![1, 2, 3, 4, 6].includes(merged.metroBeats)) merged.metroBeats = base.metroBeats;
  // The wood theme is the default: anyone who never picked a theme (including older saves) gets it.
  if (!merged.themeChosen || !['system', 'light', 'dark'].includes(merged.theme)) merged.theme = 'dark';
  return merged;
}

/** Read the v5 reference's localStorage keys, if present. */
export function readLegacyLocalStorage(storage: Pick<Storage, 'getItem'> | null): {
  progress?: Progress;
  prefs?: Prefs;
} {
  if (!storage) return {};
  const get = (k: string): unknown => {
    try {
      const v = storage.getItem('caged-lab:' + k);
      return v == null ? undefined : JSON.parse(v);
    } catch {
      return undefined;
    }
  };
  const progress = get('progress');
  const prefs = get('prefs');
  const muted = get('muted');
  const out: { progress?: Progress; prefs?: Prefs } = {};
  if (progress) out.progress = normalizeProgress(progress);
  if (prefs || muted != null)
    out.prefs = normalizePrefs({ ...(prefs as object), ...(muted != null ? { muted: !!muted } : {}) });
  return out;
}
