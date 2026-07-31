# Builder Handoff: AI Tray Overlap + Swipe Gesture

**Date:** 2026-02-10  
**Priority:** P0 (mobile tray is unreachable)  
**Prerequisite commit:** `c6531a1` (mobile UX fixes)

---

## Problem

On Android Chrome (and similar mobile browsers with a bottom toolbar), the 48px closed-detent AI tray is completely hidden behind the browser's ~56px bottom navigation bar. Users cannot tap or drag the tray. There is also no swipe gesture to open it as an alternative.

Screenshot confirms: the tray renders at `bottom: 0` but the browser toolbar covers it entirely.

---

## Task 1: Fix visual overlap (BottomSheet.tsx)

### Root Cause

- `env(safe-area-inset-bottom)` is **0** on Android (only iOS reports non-zero for home indicator)
- The `visualViewport` handler only fires on `resize`/`scroll` — never on initial mount, so `keyboardOffset` starts at 0
- The browser's bottom toolbar (~50-56px) overlays the fixed-bottom sheet

### Fix Approach

In `BottomSheet.tsx`, two changes:

**A) Run visualViewport calculation on mount:**

```tsx
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
```

**B) Add minimum bottom offset for touch devices when in closed detent:**

The `visualViewport` approach may still report 0 on some browsers where `window.innerHeight` already accounts for the toolbar. As a safety net, apply a minimum `bottom` when the sheet is in the closed detent on touch devices.

In the sheet `style` prop, change:

```tsx
// Before
bottom: keyboardOffset > 0 ? `${keyboardOffset}px` : undefined,

// After
bottom: keyboardOffset > 0
  ? `${keyboardOffset}px`
  : (currentDetent === 'closed' && isTouchDevice) ? '56px' : undefined,
```

This requires passing `isTouchDevice` as a prop or computing it inside BottomSheet. Simplest: compute it locally:

```tsx
const isTouchDevice = typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);
```

**Important nuance:** The `56px` offset should ONLY apply in the `closed` detent. When the sheet is peek/half/full, positioning from `bottom: 0` with `translateY` is correct because the sheet extends well above the browser chrome. We need `currentDetent` which is already available in context.

### Acceptance Criteria

- [ ] On Android Chrome, the AI tray (grabber + "AI Assistant ✨" label) is fully visible above the browser bottom toolbar
- [ ] On iOS Safari, behaviour is unchanged (safe-area-inset-bottom already works)
- [ ] When keyboard is open, the keyboard offset still takes priority
- [ ] When transitioning from closed → peek/half/full, the extra 56px offset is removed (sheet uses standard positioning)

---

## Task 2: Swipe-up gesture to open AI tray (App.tsx + useSwipeGesture.ts)

### Approach

Extend `useSwipeGesture` to also support **vertical** swipe callbacks, then use it in App.tsx to detect a swipe-up → snap AI tray to peek.

**A) Extend `useSwipeGesture.ts`:**

Add optional `onSwipeUp` and `onSwipeDown` callbacks. The detection logic mirrors horizontal swipes but inverted — check `dy > threshold` and `dx < maxHorizontal`:

```typescript
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
```

In `handleTouchEnd`, after computing `dx` and `dy`:

```typescript
const absDx = Math.abs(dx);
const absDy = Math.abs(dy);

if (absDx > absDy) {
  // Primarily horizontal
  if (absDy > maxPerpendicular) return; // Too diagonal
  if (absDx < threshold) return; // Too short
  if (dx < 0) options.onSwipeLeft?.();
  else options.onSwipeRight?.();
} else {
  // Primarily vertical
  if (absDx > maxPerpendicular) return; // Too diagonal
  if (absDy < threshold) return; // Too short
  if (dy < 0) options.onSwipeUp?.();
  else options.onSwipeDown?.();
}
```

> **Note:** Rename `maxVertical` → `maxPerpendicular` for clarity since we now have both axes. Keep backward compat by supporting both names if needed, but since `maxVertical` is only used in one place (App.tsx), a clean rename is fine.

**B) In App.tsx, add vertical swipe callbacks:**

The existing `useSwipeGesture` call on `editorAreaRef`:

```tsx
useSwipeGesture(editorAreaRef, {
  onSwipeLeft: () => {
    if (effectiveViewMode === 'render') setViewMode('source');
  },
  onSwipeRight: () => {
    if (effectiveViewMode === 'source') setViewMode('render');
  },
  onSwipeUp: () => {
    // Open AI tray — use ref to call snapTo on the bottom sheet
    aiBottomSheetRef.current?.snapTo('peek');
  },
  onSwipeDown: () => {
    // Close AI tray back to closed detent
    aiBottomSheetRef.current?.snapTo('closed');
  },
  enabled: isTouchDevice,
});
```

**C) Expose `snapTo` from AIBottomSheet via ref or callback:**

The simplest approach: have AIBottomSheet accept an `onSnapTo` ref that App.tsx can call.

Option 1 — **Callback ref pattern** (simplest):

In `App.tsx`, add a ref:
```tsx
const aiSheetSnapRef = useRef<((detent: BottomSheetDetent) => void) | null>(null);
```

Pass it to AIBottomSheet:
```tsx
<AIBottomSheet
  ...
  snapToRef={aiSheetSnapRef}
/>
```

In AIBottomSheet, assign the ref inside useEffect once snapTo is available — but since AIBottomSheet doesn't directly have snapTo (it's inside BottomSheet), we need BottomSheet to expose it.

Option 2 — **BottomSheet exposes snapTo via imperative handle** (cleaner):

```tsx
// BottomSheet.tsx
export interface BottomSheetHandle {
  snapTo: (detent: BottomSheetDetent) => void;
}

export const BottomSheet = forwardRef<BottomSheetHandle, BottomSheetProps>(
  function BottomSheet(props, ref) {
    // ... existing code ...
    
    useImperativeHandle(ref, () => ({ snapTo }), [snapTo]);
    
    // ... rest of component ...
  }
);
```

Then in AIBottomSheet:
```tsx
const sheetRef = useRef<BottomSheetHandle>(null);

// Forward to parent via prop
useEffect(() => {
  if (snapToRef) snapToRef.current = sheetRef.current?.snapTo ?? null;
}, [snapToRef, sheetRef.current]);

return <BottomSheet ref={sheetRef} ... />;
```

**Recommendation:** Option 2 is cleaner and more reusable, but Option 1 is faster to implement. Builder's choice — either works.

### Acceptance Criteria

- [ ] Swiping up on the editor area opens the AI tray to peek
- [ ] Swiping down on the editor area closes the AI tray to closed
- [ ] Horizontal swipes (view switching) still work as before
- [ ] Diagonal gestures are ignored (neither horizontal nor vertical triggers)
- [ ] Desktop is unaffected (isTouchDevice guard)

---

## Task Priority

1. **Task 1 first** — the tray must be visible before swipe matters
2. **Task 2 second** — adds the swipe as a richer interaction

## Files Modified

| File | Task | Change |
|------|------|--------|
| `src/components/UI/BottomSheet.tsx` | 1 | Run visualViewport handler on mount, add 56px floor for closed detent |
| `src/hooks/useSwipeGesture.ts` | 2 | Add onSwipeUp/onSwipeDown with vertical detection |
| `src/components/UI/BottomSheet.tsx` | 2 | Expose snapTo via forwardRef + useImperativeHandle |
| `src/components/AI/AIBottomSheet.tsx` | 2 | Forward ref to BottomSheet, accept snapToRef prop |
| `src/App.tsx` | 2 | Wire swipeUp → snapTo('peek'), swipeDown → snapTo('closed') |

## Testing

- Test on Android Chrome (primary target from screenshot)
- Test on iOS Safari (verify safe-area-inset-bottom still works)
- Test swipe gestures don't conflict with content scrolling or horizontal view switching
- Test keyboard opening/closing still adjusts bottom offset correctly
