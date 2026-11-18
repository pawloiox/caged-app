import type { LabelMode } from '../theory/fingers';
import type { MinorSpelling } from '../theory/spell';
import type { Stat } from '../train/leitner';

export interface PivotScore {
  clean: number;
  total: number;
}

export interface Progress {
  version: 2;
  /** 'step-1' … 'step-5' */
  steps: Record<string, boolean>;
  xp: number;
  /** Days (YYYY-MM-DD) with a full routine. */
  days: string[];
  /** Days with a cleared review queue. */
  reviewDays: string[];
  /** Best Train streak. */
  best: number;
  stats: Record<string, Stat>;
  /** Best clean linking-drill tempo per key, e.g. major0 → 80. */
  drills: Record<string, number>;
  /** Heard pivots per key and tempo (listening mode), e.g. major0 → { 60: {clean, total} }. */
  pivots: Record<string, Record<string, PivotScore>>;
  seen: {
    s1?: string[];
    s2?: number;
    s3check?: number;
    /** Highest shape-check level passed (1 = C with root hints). */
    s3level?: number;
    s4pred?: string[];
    s5?: string[];
  };
}

export type Theme = 'system' | 'light' | 'dark';
export type NeckOrientation = 'auto' | 'horizontal' | 'vertical';

export interface Prefs {
  labels: LabelMode;
  lefty: boolean;
  lowTop: boolean;
  welcomed: boolean;
  theme: Theme;
  neck: NeckOrientation;
  muted: boolean;
  guitarVol: number;
  clickVol: number;
  minorSpelling: MinorSpelling;
  /** The player wears headphones, so the app can play along while it listens. */
  headphones: boolean;
  /** Measured round-trip latency in seconds, or null if never calibrated. */
  micLatency: number | null;
  /** The player chose to use listening mode (we still ask the browser each session). */
  micWanted: boolean;
}

export const defaultProgress = (): Progress => ({
  version: 2,
  steps: {},
  xp: 0,
  days: [],
  reviewDays: [],
  best: 0,
  stats: {},
  drills: {},
  pivots: {},
  seen: {},
});

export const defaultPrefs = (): Prefs => ({
  labels: 'iv',
  lefty: false,
  lowTop: false,
  welcomed: false,
  theme: 'system',
  neck: 'auto',
  muted: false,
  guitarVol: 0.9,
  clickVol: 0.7,
  minorSpelling: 'flat',
  headphones: false,
  micLatency: null,
  micWanted: false,
});
