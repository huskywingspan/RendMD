import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

/**
 * Hover/focus tooltip.
 *
 * Portalled to the body rather than positioned inside the trigger, so it can
 * never be clipped by a toolbar's `overflow: hidden` or lose a stacking-context
 * fight with a popover.
 *
 * A shared "recently shown" flag makes the delay apply only to the first
 * tooltip in a run: sweeping across a toolbar should not mean waiting 400ms at
 * every button.
 */

type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  content: string;
  /** Rendered as a keyboard chip after the label. */
  shortcut?: string;
  children: ReactNode;
  side?: Side;
  delay?: number;
}

const IS_TOUCH =
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

const GAP = 8;

let warmUntil = 0;

export function Tooltip({ content, shortcut, children, side = 'bottom', delay = 400 }: TooltipProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const place = useCallback(() => {
    const trigger = triggerRef.current?.firstElementChild ?? triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const anchors: Record<Side, { top: number; left: number }> = {
      top: { top: rect.top - GAP, left: rect.left + rect.width / 2 },
      bottom: { top: rect.bottom + GAP, left: rect.left + rect.width / 2 },
      left: { top: rect.top + rect.height / 2, left: rect.left - GAP },
      right: { top: rect.top + rect.height / 2, left: rect.right + GAP },
    };

    setPosition(anchors[side]);
  }, [side]);

  const show = useCallback(() => {
    const wait = Date.now() < warmUntil ? 0 : delay;
    timerRef.current = setTimeout(place, wait);
  }, [delay, place]);

  const hide = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    // Keep the group warm briefly so neighbouring triggers respond instantly.
    if (position) warmUntil = Date.now() + 600;
    setPosition(null);
  }, [position]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Any scroll invalidates a fixed-position tooltip; simplest correct response
  // is to dismiss it.
  useEffect(() => {
    if (!position) return;
    const dismiss = () => setPosition(null);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [position]);

  if (IS_TOUCH) return <>{children}</>;

  const translate: Record<Side, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <>
      <span
        ref={triggerRef}
        className="contents"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={position ? id : undefined}
      >
        {children}
      </span>

      {position &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ top: position.top, left: position.left, transform: translate[side] }}
            className={cn(
              'pointer-events-none fixed z-[100] flex items-center gap-1.5',
              'rounded-md border border-line bg-overlay px-2 py-1 shadow-md',
              'text-2xs whitespace-nowrap text-ink',
              'animate-[tooltip-in_120ms_ease-out]',
            )}
          >
            {content}
            {shortcut && <kbd className="kbd">{shortcut}</kbd>}
          </div>,
          document.body,
        )}
    </>
  );
}
