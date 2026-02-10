import { useCallback, useRef } from 'react';

/**
 * Proportional scroll sync between two scrollable elements.
 * Uses ratio-based mapping so elements with different heights stay aligned.
 * A guard ref prevents the infinite feedback loop (A triggers B triggers A).
 *
 * Usage:
 *   const { setRefA, setRefB, onScrollA, onScrollB } = useScrollSync();
 *   // setRefA/setRefB are callback refs for the scroll containers
 *   // onScrollA/onScrollB are scroll event handlers
 */
export function useScrollSync(): {
  setRefA: (el: HTMLElement | null) => void;
  setRefB: (el: HTMLElement | null) => void;
  onScrollA: () => void;
  onScrollB: () => void;
} {
  const refA = useRef<HTMLElement | null>(null);
  const refB = useRef<HTMLElement | null>(null);

  // Guard to prevent recursive triggering
  const isSyncing = useRef(false);

  const syncScroll = useCallback((source: HTMLElement | null, target: HTMLElement | null) => {
    if (!source || !target || isSyncing.current) return;

    const maxScrollSource = source.scrollHeight - source.clientHeight;
    if (maxScrollSource <= 0) return;

    const ratio = source.scrollTop / maxScrollSource;
    const maxScrollTarget = target.scrollHeight - target.clientHeight;
    const targetScrollTop = ratio * maxScrollTarget;

    isSyncing.current = true;
    target.scrollTop = targetScrollTop;

    // Release the guard after two animation frames to allow the browser
    // to finish firing the scroll event on the target.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isSyncing.current = false;
      });
    });
  }, []);

  const setRefA = useCallback((el: HTMLElement | null) => { refA.current = el; }, []);
  const setRefB = useCallback((el: HTMLElement | null) => { refB.current = el; }, []);

  const onScrollA = useCallback(() => {
    syncScroll(refA.current, refB.current);
  }, [syncScroll]);

  const onScrollB = useCallback(() => {
    syncScroll(refB.current, refA.current);
  }, [syncScroll]);

  return { setRefA, setRefB, onScrollA, onScrollB };
}
