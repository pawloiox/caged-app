import Dexie, { type Table } from 'dexie';
import type { ProgressRepository } from './repository';
import type { Prefs, Progress } from './types';

/** IndexedDB storage. Loaded lazily (its own chunk), so Dexie doesn't add to the first script task. */
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
