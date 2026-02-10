import { useRef, useCallback, useEffect, useState } from 'react';

export type BottomSheetDetent = 'closed' | 'peek' | 'half' | 'full';

interface UseBottomSheetOptions {
  detents: BottomSheetDetent[];
  defaultDetent?: BottomSheetDetent;
  peekHeight?: number;
  closedHeight?: number;
  onClose?: () => void;
  /** Ref to the scrollable inner content — if content is scrolled we let native scroll happen */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

/** Height in viewport fraction for each detent */
function detentToFraction(detent: BottomSheetDetent, peekHeight: number, closedHeight: number): number {
  const vh = window.innerHeight;
  switch (detent) {
    case 'closed':
      return 1 - closedHeight / vh;
    case 'peek':
      return 1 - peekHeight / vh;
    case 'half':
      return 0.5;
    case 'full':
      return 0.1;
  }
}

export interface UseBottomSheetReturn {
  /** Current detent */
  currentDetent: BottomSheetDetent;
  /** Whether the sheet is being dragged */
  isDragging: boolean;
  /** Current translateY as a fraction of viewport (0–1) */
  translateY: number;
  /** Bind to the grabber / drag handle element */
  grabberProps: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  /** Programmatically snap to a detent */
  snapTo: (detent: BottomSheetDetent) => void;
}

export function useBottomSheet({
  detents,
  defaultDetent,
  peekHeight = 180,
  closedHeight = 48,
  onClose,
  scrollRef,
}: UseBottomSheetOptions): UseBottomSheetReturn {
  const [currentDetent, setCurrentDetent] = useState<BottomSheetDetent>(
    defaultDetent ?? detents[0] ?? 'peek',
  );
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(() =>
    detentToFraction(defaultDetent ?? detents[0] ?? 'peek', peekHeight, closedHeight),
  );

  const startY = useRef(0);
  const startTranslate = useRef(0);
  const lastTimestamp = useRef(0);
  const lastY = useRef(0);
  const velocity = useRef(0);

  // Snap to default detent on mount
  useEffect(() => {
    const target = detentToFraction(defaultDetent ?? detents[0] ?? 'peek', peekHeight, closedHeight);
    setTranslateY(target);
  }, [defaultDetent, detents, peekHeight, closedHeight]);

  const snapTo = useCallback(
    (detent: BottomSheetDetent) => {
      setCurrentDetent(detent);
      setTranslateY(detentToFraction(detent, peekHeight, closedHeight));
    },
    [peekHeight, closedHeight],
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      // If inner content is scrolled down, let it scroll normally
      if (scrollRef?.current && scrollRef.current.scrollTop > 0) return;

      setIsDragging(true);
      startY.current = e.touches[0].clientY;
      startTranslate.current = translateY;
      lastTimestamp.current = Date.now();
      lastY.current = e.touches[0].clientY;
      velocity.current = 0;
    },
    [translateY, scrollRef],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;
      const deltaFraction = deltaY / window.innerHeight;
      const newTranslate = Math.max(0.1, Math.min(1, startTranslate.current + deltaFraction));
      setTranslateY(newTranslate);

      // Track velocity for flick gestures
      const now = Date.now();
      const dt = now - lastTimestamp.current;
      if (dt > 0) {
        velocity.current = (currentY - lastY.current) / dt; // px/ms
      }
      lastTimestamp.current = now;
      lastY.current = currentY;
    },
    [isDragging],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const FLICK_THRESHOLD = 0.5; // px/ms
    const currentTranslateY = translateY;

    // Sort detents by their translateY position
    const detentPositions = detents.map((d) => ({
      detent: d,
      pos: detentToFraction(d, peekHeight, closedHeight),
    }));
    detentPositions.sort((a, b) => a.pos - b.pos);

    let targetDetent: BottomSheetDetent;

    if (Math.abs(velocity.current) > FLICK_THRESHOLD) {
      // Fast flick — go to next detent in swipe direction
      const swipingDown = velocity.current > 0;
      if (swipingDown) {
        // Find next detent below current
        const below = detentPositions.filter((d) => d.pos > currentTranslateY);
        if (below.length > 0) {
          targetDetent = below[0].detent;
        } else {
          // Past last detent → close
          onClose?.();
          return;
        }
      } else {
        // Swiping up — find next detent above
        const above = detentPositions.filter((d) => d.pos < currentTranslateY);
        targetDetent = above.length > 0 ? above[above.length - 1].detent : detentPositions[0].detent;
      }
    } else {
      // Slow drag — snap to nearest detent
      let closestDist = Infinity;
      targetDetent = currentDetent;
      for (const { detent, pos } of detentPositions) {
        const dist = Math.abs(pos - currentTranslateY);
        if (dist < closestDist) {
          closestDist = dist;
          targetDetent = detent;
        }
      }
      // If dragged past the lowest detent by a margin, close
      const lowestPos = detentPositions[detentPositions.length - 1].pos;
      if (currentTranslateY > lowestPos + 0.15) {
        onClose?.();
        return;
      }
    }

    snapTo(targetDetent);
  }, [isDragging, translateY, detents, peekHeight, closedHeight, currentDetent, onClose, snapTo]);

  return {
    currentDetent,
    isDragging,
    translateY,
    grabberProps: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    snapTo,
  };
}
