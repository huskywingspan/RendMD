import { useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';
import { useBottomSheet } from '@/hooks/useBottomSheet';
import type { BottomSheetDetent } from '@/hooks/useBottomSheet';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detents: BottomSheetDetent[];
  defaultDetent?: BottomSheetDetent;
  peekHeight?: number;
  showBackdrop?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  isOpen,
  onClose,
  detents,
  defaultDetent,
  peekHeight = 180,
  showBackdrop = true,
  children,
  className,
}: BottomSheetProps): JSX.Element | null {
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { currentDetent, isDragging, translateY, grabberProps, snapTo } = useBottomSheet({
    detents,
    defaultDetent,
    peekHeight,
    onClose,
    scrollRef,
  });

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Expose snapTo to children via data attribute (for programmatic snap)
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { snapTo?: (d: BottomSheetDetent) => void }).snapTo = snapTo;
    }
  }, [snapTo]);

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
          'bg-[var(--theme-bg-secondary)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',
          !isDragging && 'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          className,
        )}
        style={{
          transform: `translateY(${translateY * 100}%)`,
          paddingBottom: 'env(safe-area-inset-bottom)',
          touchAction: 'none',
          willChange: 'transform',
          maxHeight: '90vh',
        }}
      >
        {/* Grabber handle */}
        <div
          className="flex items-center justify-center py-2 cursor-grab active:cursor-grabbing"
          {...grabberProps}
        >
          <div className="w-10 h-1 rounded-full bg-[var(--theme-text-secondary)] opacity-40" />
        </div>

        {/* Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 24px - env(safe-area-inset-bottom))' }}
        >
          {children}
        </div>
      </div>
    </>
  );
}
