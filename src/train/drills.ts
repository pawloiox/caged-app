import type { Quality } from '../theory';
import { dueKeys, type Stat } from './leitner';

/** Linking-drill tempos are review items too (link:major7 = the G major drill at the best clean tempo). */
export const linkDue = (stats: Record<string, Stat>, now = Date.now()): string[] =>
  dueKeys(stats, now).filter((k) => /^link:(major|minor)\d{1,2}$/.test(k));

/** "major7" → the drill for G major. */
export function parseDrillKey(key: string): { q: Quality; pc: number } | null {
  const m = /^(major|minor)(\d{1,2})$/.exec(key);
  return m ? { q: m[1] as Quality, pc: Number(m[2]) % 12 } : null;
}

/** Where a drill lives: C major in Step 3, every other key in Step 4. The tempo comes along in the URL. */
export function drillHref(key: string, bpm?: number): string {
  const d = parseDrillKey(key);
  const t = bpm ? `bpm=${bpm}` : '';
  if (!d || (d.q === 'major' && d.pc === 0)) return `/learn/3${t ? '?' + t : ''}#drill`;
  return `/learn/4?key=${d.pc}&q=${d.q}${t ? '&' + t : ''}#drill`;
}
