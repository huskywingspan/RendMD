# Builder Handoff: v1.0.3 — Mobile View Toggle, Theme UX, Toolbar Improvements

> **Date:** 2026-02-08  
> **From:** Researcher  
> **Status:** Ready for implementation  
> **Prerequisite:** v1.0.2 deployed

---

## Overview

Three UX improvements found during phone testing:

| # | Task | Effort | Impact |
|---|------|--------|--------|
| A | Mobile view toggle + swipe gestures | M | High — view switching buried in 3-dot menu |
| B | Theme submenu stays open on selection | S | Low — small friction point |
| C | Toolbar wrap + collapsible | M | High — table grid gets cut off even in landscape |

---

## Task A: Mobile View Toggle + Swipe Gestures

### Problem

On mobile, switching between Rendered and Source views requires: tap ⋮ menu → find "View" section → tap mode. This is a core navigation action that should be 1 tap or 1 gesture away.

### Solution: Two parts

#### Part 1: Persistent mini view toggle in mobile header

Add a compact Render/Source toggle visible on mobile, in the header bar. This is the existing `ViewModeToggle` component — it just needs to be shown on mobile too.

Currently the entire center section is `hidden sm:flex`. The view toggle should be pulled OUT of the center section and shown always. On mobile, only show Render + Source (no Split — already gated by `hidden md:inline-flex`).

**In `Header.tsx`:**

Expose the `ViewModeToggle` outside the `hidden sm:flex` container:

```tsx
{/* Right section */}
<div className="flex items-center gap-1">
  {/* View toggle — always visible (Split button already hidden md:inline-flex) */}
  <ViewModeToggle viewMode={viewMode} setViewMode={setViewMode} />

  {/* Mobile: dirty indicator */}
  <div className="sm:hidden">
    <MobileDirtyDot />
  </div>
  
  {/* ... rest of right section ... */}
```

Remove the `ViewModeToggle` from the center `hidden sm:flex` section.

The toggle is compact (3 small icon buttons in a pill) and fits well in the mobile header. The Split button is already `hidden md:inline-flex`, so on mobile it's just two buttons (Render + Source).

#### Part 2: Swipe gestures on the editor area

Add horizontal swipe detection on the main editor area to toggle between render and source views.

**Create `src/hooks/useSwipeGesture.ts`:**

```typescript
import { useRef, useEffect } from 'react';

interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;       // Min distance in px (default 50)
  maxVertical?: number;     // Max vertical distance to still count (default 100)
  enabled?: boolean;
}

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

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStart.current = { x: touch.clientX, y: touch.clientY };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStart.current) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStart.current.x;
      const dy = Math.abs(touch.clientY - touchStart.current.y);
      touchStart.current = null;

      if (dy > maxVertical) return;  // Too much vertical movement — it's a scroll
      if (Math.abs(dx) < threshold) return;  // Too short

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
```

**In `App.tsx`:**

Add a ref to the main editor area `<div>` and attach the swipe hook:

```tsx
const editorAreaRef = useRef<HTMLDivElement>(null);
const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

useSwipeGesture(editorAreaRef, {
  onSwipeLeft: () => {
    // Swipe left = switch to source
    if (effectiveViewMode === 'render') setViewMode('source');
  },
  onSwipeRight: () => {
    // Swipe right = switch to render
    if (effectiveViewMode === 'source') setViewMode('render');
  },
  enabled: isTouchDevice,
});

// ...

<div ref={editorAreaRef} className="flex-1 flex overflow-hidden">
  {/* editor content */}
</div>
```

**Behavior:**
- Swipe left on rendered view → switches to source
- Swipe right on source view → switches to rendered
- Only activates on touch devices
- Threshold 50px prevents accidental triggers
- Vertical scroll isn't affected (maxVertical guard)

### Files Changed (Task A)
| File | Change |
|------|--------|
| `src/components/Header/Header.tsx` | Move `ViewModeToggle` out of `hidden sm:flex` section into always-visible area |
| **NEW** `src/hooks/useSwipeGesture.ts` | Touch swipe detection hook |
| `src/hooks/index.ts` | Export `useSwipeGesture` |
| `src/App.tsx` | Attach swipe gesture to editor area, add ref |

---

## Task B: Theme Submenu Stays Open

### Problem

In `MobileMenu.tsx`, `handleTheme` calls `close()` which closes the entire menu after selecting a theme. Users want to tap through all 4 themes quickly to compare.

### Solution

Change `handleTheme` to NOT close the menu. The user closes it by tapping outside or tapping the backdrop, which already works.

**In `MobileMenu.tsx`, line ~112:**

```typescript
// OLD
const handleTheme = useCallback((t: ThemeName) => {
  setTheme(t);
  close();
}, [setTheme, close]);

// NEW — don't close menu, let user compare themes
const handleTheme = useCallback((t: ThemeName) => {
  setTheme(t);
}, [setTheme]);
```

That's it. One line removed.

### Files Changed (Task B)
| File | Change |
|------|--------|
| `src/components/Header/MobileMenu.tsx` | Remove `close()` from `handleTheme` |

---

## Task C: Toolbar Wrap + Collapsible

### Problem

The toolbar uses `overflow-x-auto` on mobile (horizontal scroll). But:
1. The table grid picker still gets cut off — it's positioned `absolute top-full left-0` and can overflow the viewport right edge
2. Even in landscape, not all buttons are visible — users don't realize they can scroll
3. The toolbar occupies permanent vertical space even when users just want to write plain text

### Solution: Wrap to rows + collapsible

#### Part 1: Wrap instead of scroll

Change the toolbar layout from horizontal scroll to flex-wrap on all screen sizes. This makes all buttons visible at once (2 rows on portrait phone, 1-2 rows on landscape/tablet, 1 row on desktop).

**In `EditorToolbar.tsx` main toolbar container (~line 119):**

```tsx
// OLD
<div className="editor-toolbar flex items-center gap-1 overflow-x-auto scrollbar-none md:flex-wrap md:overflow-x-visible">

// NEW — always wrap, never scroll
<div className="editor-toolbar flex items-center gap-1 flex-wrap">
```

Same change for the `TableControls` container (~line 403).

#### Part 2: Collapsible toolbar

Add a small toggle button that collapses/expands the toolbar. When collapsed, show just the toggle button (a thin bar or chevron). When expanded, show all buttons as wrapped rows.

**Store the collapsed state in Zustand** (persisted so it remembers):

In `editorStore.ts`, add:
```typescript
// Interface
toolbarCollapsed: boolean;
setToolbarCollapsed: (collapsed: boolean) => void;
toggleToolbar: () => void;

// Implementation
toolbarCollapsed: false,
setToolbarCollapsed: (toolbarCollapsed) => set({ toolbarCollapsed }),
toggleToolbar: () => set((state) => ({ toolbarCollapsed: !state.toolbarCollapsed })),

// Add to PersistedState
toolbarCollapsed: boolean;

// Add to partialize
toolbarCollapsed: state.toolbarCollapsed,

// Add to merge
toolbarCollapsed: persisted?.toolbarCollapsed ?? currentState.toolbarCollapsed,
```

**In `Editor.tsx`, wrap the toolbar area:**

```tsx
{editor && (
  <div className="sticky top-0 z-10 bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)]">
    {/* Collapse toggle */}
    <div className="flex items-center">
      {!toolbarCollapsed && (
        <div className="flex-1 p-2">
          <EditorToolbar editor={editor} onLinkClick={...} onImageClick={...} />
        </div>
      )}
      <button
        onClick={toggleToolbar}
        className="px-2 py-1 text-[var(--theme-text-muted)] hover:text-[var(--theme-text-secondary)] transition-colors"
        aria-label={toolbarCollapsed ? "Show toolbar" : "Hide toolbar"}
        title={toolbarCollapsed ? "Show toolbar" : "Hide toolbar"}
      >
        <ChevronUp size={14} className={cn("transition-transform", toolbarCollapsed && "rotate-180")} />
      </button>
    </div>
  </div>
)}
```

When collapsed: the border-b line stays (thin visual separator) with just the small chevron button. Tap to expand. When expanded: full wrapped toolbar with chevron pointing up to collapse.

#### Part 3: Table grid picker positioning

The `TableGridPicker` absolute positioning (`left-0`) can overflow right. Add right-edge awareness:

```tsx
// In TableInsertButton, change grid picker position
{showGridPicker && (
  <div className="absolute top-full mt-1 z-50 right-0 sm:left-0 sm:right-auto">
    <TableGridPicker onSelect={handleGridSelect} onClose={handleGridClose} />
  </div>
)}
```

This mirrors the `ExportDropdown` fix from v1.0.1 — anchor right on mobile, left on desktop.

### Files Changed (Task C)
| File | Change |
|------|--------|
| `src/stores/editorStore.ts` | Add `toolbarCollapsed` state + toggle action + persist |
| `src/components/Editor/Editor.tsx` | Collapsible wrapper around `EditorToolbar` |
| `src/components/Editor/EditorToolbar.tsx` | `flex-wrap` instead of `overflow-x-auto`, fix table grid picker positioning |

---

## Build Order

1. **Task B** — 1 line change, instant win
2. **Task A** — View toggle relocation + swipe hook
3. **Task C** — Toolbar wrap + collapse

## Testing Checklist

| # | Test | Device | Expected |
|---|------|--------|----------|
| 1 | View toggle visible in phone header | 375px | Render + Source buttons visible (no Split) |
| 2 | Tap Render/Source in header | 375px | View switches immediately |
| 3 | Swipe left on rendered view | Touch | Switches to source |
| 4 | Swipe right on source view | Touch | Switches to render |
| 5 | Vertical scroll still works | Touch | Swipe doesn't interfere with scrolling |
| 6 | Swipe disabled on desktop | Mouse | No effect |
| 7 | Theme submenu → tap through all 4 | 375px | Menu stays open, themes switch live |
| 8 | Theme submenu → tap outside | 375px | Menu closes |
| 9 | Toolbar shows all buttons wrapped | 375px portrait | 2-3 rows, no horizontal scroll |
| 10 | Table grid picker visible | 375px | Not cut off on right edge |
| 11 | Collapse toolbar | Any | Thin bar with chevron, buttons hidden |
| 12 | Expand toolbar | Any | All buttons visible again |
| 13 | Toolbar collapse persists on reload | Any | Remembers collapsed/expanded |
| 14 | Desktop Split view still works | 1024px+ | No regression |
| 15 | Desktop view toggle unchanged | 1024px+ | 3 buttons (Render/Split/Source) |
