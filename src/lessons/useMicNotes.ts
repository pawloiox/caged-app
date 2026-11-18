import { useEffect, useRef } from 'react';
import { listener, useMic, type MicEvent } from '../audio/mic/listener';

/** Subscribe to listening-mode events while mounted and the mic is on. */
export function useMicEvents(fn: (e: MicEvent) => void, enabled = true): boolean {
  const on = useMic((m) => m.status === 'on');
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!on || !enabled) return;
    return listener.on((e) => ref.current(e));
  }, [on, enabled]);
  return on;
}
