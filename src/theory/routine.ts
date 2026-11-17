import { MAJOR_NAMES } from './spell';

/** The rotating "today's chord" for the daily routine. */
export const TODAY_KEYS = [7, 9, 2, 4, 5] as const;

export function dayNumber(d: Date = new Date()): number {
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

export function todayKey(d: Date = new Date()): number {
  const n = dayNumber(d);
  return TODAY_KEYS[((n % 5) + 5) % 5]!;
}

export function todayStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Consecutive days ending today (or yesterday, if today isn't done yet). */
export function streakOf(days: readonly string[], now: Date = new Date()): number {
  const set = new Set(days);
  const d = new Date(now);
  let n = 0;
  if (!set.has(todayStr(d))) d.setDate(d.getDate() - 1);
  while (set.has(todayStr(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export interface RoutineBlock {
  min: number;
  title: string;
  text: string;
  to: string;
  key?: number;
}

export function routine(d: Date = new Date()): RoutineBlock[] {
  const tk = todayKey(d);
  const k = MAJOR_NAMES[tk]!;
  return [
    { min: 2, title: 'Open chords with roots', text: 'Play C, A, G, E and D. After each chord, play only its roots and say the note names out loud.', to: '/learn/1' },
    { min: 5, title: 'C linking drill', text: 'Run the linking drill on C. Start at 60 BPM and only move up the tempo ladder when every change is clean.', to: '/learn/3' },
    { min: 5, title: `Today's chord: ${k} major`, text: `Find all five shapes of ${k} major. Say where each root is before you play the shape, then run the drill.`, to: `/explore?key=${tk}&q=major`, key: tk },
    { min: 3, title: 'A progression in one zone', text: 'Loop I – IV – V without leaving one zone of the neck. Try 4-string shapes, then triads.', to: '/learn/5' },
  ];
}

export const fmtTime = (sec: number): string => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const ordinal = (k: number): string => k + (k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th');
