import { useRef, useEffect } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  /** Minimum horizontal distance in px to trigger (default 50) */
  threshold?: number;
  /** Maximum vertical distance to still count as horizontal swipe (default 100) */
  maxVertical?: number;
  /** Set false to disable (default true) */
  enabled?: boolean;
}

/**
 * Detects horizontal swipe gestures on a referenced element.
 * Useful for touch-based view switching on mobile.
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
    const maxVertical = options.maxVertical ?? 100;

    const handleTouchStart = (e: TouchEvent): void => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent): void => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      touchStart.current = null;

      if (dy > maxVertical) return; // Too vertical — it's a scroll
      if (Math.abs(dx) < threshold) return; // Too short

      if (dx < 0) {
        options.onSwipeLeft?.();
      } else {
        options.onSwipeRight?.();
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
