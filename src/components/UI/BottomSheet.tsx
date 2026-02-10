import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/utils/cn';
import { useBottomSheet } from '@/hooks/useBottomSheet';
import type { BottomSheetDetent } from '@/hooks/useBottomSheet';

export interface BottomSheetHandle {
  snapTo: (detent: BottomSheetDetent) => void;
}

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detents: BottomSheetDetent[];
  defaultDetent?: BottomSheetDetent;
  peekHeight?: number;
  closedHeight?: number;
  showBackdrop?: boolean;
  children: React.ReactNode;
  className?: string;
  /** Label shown in the closed detent bar */
  closedLabel?: string;
}

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(function BottomSheet({
  isOpen,
  onClose,
  detents,
  defaultDetent,
  peekHeight = 180,
  closedHeight = 48,
  showBackdrop = true,
  children,
  className,
  closedLabel,
}: BottomSheetProps, ref): JSX.Element | null {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const { currentDetent, isDragging, translateY, grabberProps, snapTo } = useBottomSheet({
    detents,
    defaultDetent,
    peekHeight,
    closedHeight,
    onClose,
    scrollRef,
  });

  // Expose snapTo to parent via imperative handle
  useImperativeHandle(ref, () => ({ snapTo }), [snapTo]);

  const isTouchDevice = typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Track mobile keyboard via visualViewport API
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardOffset(Math.max(0, offset));
    };
    // Run immediately on mount to catch browser toolbar offset
    handler();
    vv.addEventListener('resize', handler);
    vv.addEventListener('scroll', handler);
    return () => {
      vv.removeEventListener('resize', handler);
      vv.removeEventListener('scroll', handler);
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Show backdrop only for half/full
  const backdropVisible = isOpen && showBackdrop && (currentDetent === 'half' || currentDetent === 'full');

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[49] transition-opacity duration-300',
          backdropVisible ? 'bg-black/30 pointer-events-auto' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50',
          'rounded-t-2xl',
          'bg-[var(--theme-bg-secondary)] backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',
          !isDragging && 'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          className,
        )}
        style={{
          transform: `translateY(${translateY * 100}%)`,
          bottom: keyboardOffset > 0
            ? `${keyboardOffset}px`
            : (currentDetent === 'closed' && isTouchDevice) ? '56px' : undefined,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          touchAction: 'none',
          willChange: 'transform',
          maxHeight: '90dvh',
        }}
      >
        {/* Grabber handle */}
        <div
          className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing"
          {...grabberProps}
          onClick={() => {
            // Tapping the grab bar when closed → snap to peek
            if (currentDetent === 'closed') snapTo('peek');
          }}
        >
          <div className="w-10 h-1 rounded-full bg-[var(--theme-text-secondary)] opacity-40" />
        </div>

        {/* Closed-detent label bar */}
        {currentDetent === 'closed' && closedLabel && (
          <div
            className="flex items-center justify-center pb-2 text-xs text-[var(--theme-text-muted)]"
            onClick={() => snapTo('peek')}
          >
            {closedLabel}
          </div>
        )}

        {/* Content — hidden when in closed detent */}
        <div
          ref={scrollRef}
          className={cn('flex-1 overflow-y-auto', currentDetent === 'closed' && 'hidden')}
          style={{ maxHeight: 'calc(90dvh - 24px - env(safe-area-inset-bottom) - 12px)' }}
        >
          {children}
        </div>
      </div>
    </>
  );
});
