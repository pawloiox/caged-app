import type { LabelMode } from '../theory/fingers';
import type { MinorSpelling } from '../theory/spell';
import type { Stat } from '../train/leitner';

export interface PivotScore {
  clean: number;
  total: number;
}

export interface Tally {
  ok: number;
  n: number;
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
  /**
   * Retention: answers to items that had been learned (box 1 or more), by how long they had rested.
   * d1 = 1–5 days, d7 = 6 days or more.
   */
  retention: { d1: Tally; d7: Tally };
  /** The player's own song for Step 5, as typed ("G D Em C"). */
  song: string;
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

/** What the neck shows while a drill or loop plays: everything, only the roots, or nothing (play from memory). */
export type Fade = 'shapes' | 'roots' | 'none';

export type Theme = 'system' | 'light' | 'dark';
export type NeckOrientation = 'auto' | 'horizontal' | 'vertical';

export interface Prefs {
  labels: LabelMode;
  lefty: boolean;
  lowTop: boolean;
  welcomed: boolean;
  theme: Theme;
  /** The player picked a theme themselves; until then the app shows its default, the wood theme. */
  themeChosen: boolean;
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
  fade: Fade;
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
  retention: { d1: { ok: 0, n: 0 }, d7: { ok: 0, n: 0 } },
  song: '',
  seen: {},
});

export const defaultPrefs = (): Prefs => ({
  labels: 'iv',
  lefty: false,
  lowTop: false,
  welcomed: false,
  theme: 'dark',
  themeChosen: false,
  neck: 'auto',
  muted: false,
  guitarVol: 0.9,
  clickVol: 0.7,
  minorSpelling: 'flat',
  headphones: false,
  micLatency: null,
  micWanted: false,
  fade: 'shapes',
});
