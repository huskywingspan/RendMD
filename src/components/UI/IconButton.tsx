import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Tooltip } from './Tooltip';

/**
 * The chrome's workhorse button.
 *
 * Icon-only by default, with the label carried by `aria-label` and surfaced
 * visually through a tooltip — so the affordance is discoverable without
 * spending horizontal space on it.
 */

type Variant = 'ghost' | 'solid' | 'subtle';
type Size = 'sm' | 'md';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: ReactNode;
  /** Required: this is the accessible name and the tooltip text. */
  label: string;
  /** Appended to the tooltip as a keyboard hint, e.g. "Ctrl+S". */
  shortcut?: string;
  variant?: Variant;
  size?: Size;
  /** Renders in the accent colour to signal an active toggle. */
  active?: boolean;
  /** Suppress the tooltip where the surrounding UI already labels the control. */
  hideTooltip?: boolean;
  tooltipSide?: 'top' | 'bottom' | 'left' | 'right';
}

const VARIANTS: Record<Variant, string> = {
  ghost: 'text-ink-muted hover:text-ink hover:bg-hover',
  subtle: 'text-ink-muted bg-sunken hover:text-ink hover:bg-hover',
  solid: 'text-accent-ink bg-accent hover:bg-accent-hover',
};

const SIZES: Record<Size, string> = {
  sm: 'h-7 w-7 rounded-sm',
  md: 'h-8 w-8 rounded-md',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    shortcut,
    variant = 'ghost',
    size = 'md',
    active = false,
    hideTooltip = false,
    tooltipSide = 'bottom',
    className,
    ...props
  },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        'transition-colors duration-[120ms] ease-editorial',
        'disabled:pointer-events-none disabled:opacity-40',
        SIZES[size],
        active ? 'bg-accent-soft text-accent' : VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );

  if (hideTooltip) return button;

  return (
    <Tooltip content={label} shortcut={shortcut} side={tooltipSide}>
      {button}
    </Tooltip>
  );
});
