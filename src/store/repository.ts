import Dexie, { type Table } from 'dexie';
import { defaultPrefs, defaultProgress, type Prefs, type Progress } from './types';
import { migrateStat, type Stat } from '../train/leitner';

/** Storage boundary. The UI never touches IndexedDB directly, so a sync backend can replace this later. */
export interface ProgressRepository {
  loadProgress(): Promise<Progress | null>;
  saveProgress(p: Progress): Promise<void>;
  loadPrefs(): Promise<Prefs | null>;
  savePrefs(p: Prefs): Promise<void>;
  clear(): Promise<void>;
}

interface Row {
  id: string;
  data: unknown;
  updated: number;
}

class CagedDB extends Dexie {
  kv!: Table<Row, string>;
  constructor() {
    super('caged-lab');
    this.version(1).stores({ kv: '&id' });
  }
}

export class DexieRepository implements ProgressRepository {
  private db = new CagedDB();
  async loadProgress() {
    return ((await this.db.kv.get('progress'))?.data as Progress | undefined) ?? null;
  }
  async saveProgress(p: Progress) {
    await this.db.kv.put({ id: 'progress', data: p, updated: Date.now() });
  }
  async loadPrefs() {
    return ((await this.db.kv.get('prefs'))?.data as Prefs | undefined) ?? null;
  }
  async savePrefs(p: Prefs) {
    await this.db.kv.put({ id: 'prefs', data: p, updated: Date.now() });
  }
  async clear() {
    await this.db.kv.clear();
  }
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
export function normalizeProgress(raw: unknown, now = Date.now()): Progress {
  const base = defaultProgress();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<Progress> & { stats?: Record<string, Partial<Stat> & { r: number; w: number }> };
  const stats: Record<string, Stat> = {};
  for (const [k, v] of Object.entries(r.stats ?? {})) if (v && typeof v.r === 'number') stats[k] = migrateStat(v, now);
  return {
    ...base,
    steps: { ...(r.steps ?? {}) },
    xp: Number(r.xp) || 0,
    days: Array.isArray(r.days) ? r.days.filter((d) => typeof d === 'string') : [],
    reviewDays: Array.isArray(r.reviewDays) ? r.reviewDays : [],
    best: Number(r.best) || 0,
    stats,
    drills: { ...(r.drills ?? {}) },
    pivots: { ...(r.pivots ?? {}) },
    seen: { ...(r.seen ?? {}) },
  };
}

export function normalizePrefs(raw: unknown): Prefs {
  const base = defaultPrefs();
  if (!raw || typeof raw !== 'object') return base;
  const merged = { ...base, ...(raw as Partial<Prefs>) };
  if (!['iv', 'note', 'finger', 'shape', 'none'].includes(merged.labels)) merged.labels = 'iv';
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
