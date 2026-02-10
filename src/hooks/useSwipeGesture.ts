import { useRef, useEffect } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /** Minimum distance in px to trigger (default 50) */
  threshold?: number;
  /** Maximum perpendicular distance to still count as directional swipe (default 100) */
  maxPerpendicular?: number;
  /** Set false to disable (default true) */
  enabled?: boolean;
}

/**
 * Detects horizontal and vertical swipe gestures on a referenced element.
 * Useful for touch-based view switching and tray control on mobile.
 */
export function useSwipeGesture(
  elementRef: React.RefObject<HTMLElement | null>,
  options: SwipeOptions
): void {
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || options.enabled === false) return;

    const threshold = options.threshold ?? 50;
    const maxPerp = options.maxPerpendicular ?? 100;

    const handleTouchStart = (e: TouchEvent): void => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent): void => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = touch.clientY - touchStart.current.y;
      touchStart.current = null;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx > absDy) {
        // Primarily horizontal
        if (absDy > maxPerp) return; // Too diagonal
        if (absDx < threshold) return; // Too short
        if (dx < 0) options.onSwipeLeft?.();
        else options.onSwipeRight?.();
      } else {
        // Primarily vertical
        if (absDx > maxPerp) return; // Too diagonal
        if (absDy < threshold) return; // Too short
        if (dy < 0) options.onSwipeUp?.();
        else options.onSwipeDown?.();
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, options]);
}
