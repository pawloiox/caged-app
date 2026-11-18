import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePrefs } from '../store/app';

export function useMediaQuery(q: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const m = window.matchMedia(q);
      m.addEventListener('change', cb);
      return () => m.removeEventListener('change', cb);
    },
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(q).matches : false),
    () => false,
  );
}

/** Vertical neck (headstock at the top) on phones, unless the player chose otherwise. */
export function useVertical(): boolean {
  const neck = usePrefs((p) => p.neck);
  const narrow = useMediaQuery('(max-width: 600px)');
  return neck === 'vertical' || (neck === 'auto' && narrow);
}

/**
 * Which keys and words mean "toward the nut" and "toward the body" for the current view, so arrow keys,
 * button labels and sliders follow the left-handed mirror and the vertical neck.
 */
export function useNeckDirection() {
  const lefty = usePrefs((p) => p.lefty);
  const vertical = useVertical();
  if (vertical)
    return { lowerKey: 'ArrowUp', higherKey: 'ArrowDown', lowerGlyph: '↑', higherGlyph: '↓', vertical, lefty };
  return lefty
    ? { lowerKey: 'ArrowRight', higherKey: 'ArrowLeft', lowerGlyph: '→', higherGlyph: '←', vertical, lefty }
    : { lowerKey: 'ArrowLeft', higherKey: 'ArrowRight', lowerGlyph: '←', higherGlyph: '→', vertical, lefty };
}

export interface KeyMap {
  space?: () => void;
  lower?: () => void;
  higher?: () => void;
  /** Return true if handled. */
  char?: (key: string) => boolean | void;
}

/**
 * Page-level shortcuts for a guitar-in-hand player: Space plays/stops, arrows move along the neck,
 * letters answer. Ignored while typing in a field; Space/Enter on a focused button do their own thing.
 */
export function useHotkeys(map: KeyMap): void {
  const ref = useRef(map);
  ref.current = map;
  const dir = useNeckDirection();
  const dirRef = useRef(dir);
  dirRef.current = dir;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement;
      const tag = t.tagName;
      if (tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SUMMARY' || t.isContentEditable) return;
      if (t.closest('[role="dialog"]')) return;
      const role = t.getAttribute('role');
      if (role === 'radio' || role === 'slider') return;
      if ((tag === 'BUTTON' || tag === 'A' || role === 'button') && (e.key === ' ' || e.key === 'Enter')) return;
      const m = ref.current;
      const d = dirRef.current;
      if (e.key === ' ' && m.space) {
        e.preventDefault();
        m.space();
      } else if (e.key === d.lowerKey && m.lower) {
        e.preventDefault();
        m.lower();
      } else if (e.key === d.higherKey && m.higher) {
        e.preventDefault();
        m.higher();
      } else if (m.char && m.char(e.key)) e.preventDefault();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}

/** Re-render on an interval (for timers that display, not for musical timing). */
export function useTick(ms: number, on = true): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms, on]);
  return n;
}
