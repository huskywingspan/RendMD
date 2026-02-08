# Feature Spec: Mobile & Responsive Optimization

> **Date:** 2026-02-08  
> **Status:** Ready for Implementation  
> **Priority:** High — app is now publicly deployed, accessible from phones  
> **Effort:** L (Large — spans most components)

---

## Context

RendMD is deployed at `rendmd.pages.dev` and accessible from any device. On mobile (375px), the app is **barely functional** — sidebar consumes 60% of the screen, the bubble menu overflows the viewport, the header is overcrowded, and split view is unusable. This spec covers a comprehensive mobile pass.

### Current State Summary

- **Zero responsive `@media` queries** in the entire codebase (only `@media print`)
- **Only `sm:` Tailwind breakpoint used** — 8 instances (label hiding). No `md:`, `lg:`, `xl:`
- **No touch-specific handlers** anywhere
- **No PWA manifest or service worker**
- **No safe-area-inset support** (iPhone notch)
- **All tooltips are hover-only** — invisible on touch devices
- **Tap targets average 30px** — below the 44px minimum

---

## Priority Tiers

### P0 — Critical (app broken on phones)

| # | Problem | Fix |
|---|---------|-----|
| 1 | Sidebar is 224px fixed width — leaves 151px for editor | Overlay/drawer pattern on mobile, auto-close on navigation |
| 2 | BubbleMenu is ~550px wide — overflows 375px screen | Wrap to 2 rows or use horizontal scroll; viewport-clamp positioning |
| 3 | Header has 14+ elements crammed into 375px | Collapse into hamburger menu or priority-based hiding |
| 4 | Split view is 187px per pane on 375px | Disable split mode below `md` breakpoint |

### P1 — Significant UX problems

| # | Problem | Fix |
|---|---------|-----|
| 5 | Tooltips invisible on touch (hover-only) | Disable tooltips on touch devices; info accessible via labels/ARIA |
| 6 | EditorToolbar wraps to 3-4 rows on mobile | Horizontal scroll or condensed icon-only layout |
| 7 | Tap targets 24-32px throughout | Increase all interactive elements to ≥44px on touch |
| 8 | Editor `p-8` wastes 64px horizontal space | Responsive padding: `p-4 md:p-8` |
| 9 | `h-screen` doesn't account for iOS Safari bar | Use `h-dvh` (dynamic viewport height) with fallback |
| 10 | SettingsModal has no side margin | Add `mx-4` matching other modals |

### P2 — Polish

| # | Problem | Fix |
|---|---------|-----|
| 11 | No `viewport-fit=cover` for notch phones | Add to `<meta viewport>` + safe-area padding |
| 12 | H1/H2 headings oversized on mobile | Use `clamp()` for responsive heading sizes |
| 13 | Ctrl+click links impossible on mobile | Long-press or tap-to-follow alternative |
| 14 | Ctrl+Space bubble menu inaccessible | Show toolbar; remove "Ctrl+Space" hint on touch |
| 15 | FileIndicator `max-w-48` (192px) too wide in header | Reduce to `max-w-24` on mobile |
| 16 | Export dropdown can overflow right edge | Add right-edge clamping |
| 17 | Shortcuts modal shows only keyboard shortcuts | Show "not available on mobile" or hide on touch |
| 18 | Table column resize (4px handle) unusable on touch | Wider touch handle or disable resize on mobile |

---

## Detailed Implementation Guide

### 1. Mobile Sidebar — Overlay Drawer

**Current:** `w-56` inline, pushes editor content. 224px on a 375px screen = unusable.

**Target:** On screens below `md` (768px), sidebar becomes a full-height overlay with backdrop. Slides in from the left. Tapping backdrop or a TOC item auto-closes it.

**Changes to `Sidebar.tsx`:**

```tsx
export function Sidebar({ onTocItemClick }: SidebarProps): JSX.Element | null {
  const { sidebar, toggleSidebar } = useEditorStore();

  if (!sidebar.isOpen) return null;

  const handleItemClick = (item: TOCItem): void => {
    onTocItemClick?.(item);
    // Auto-close sidebar on mobile after TOC navigation
    if (window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        onClick={toggleSidebar}
        aria-hidden="true"
      />
      <aside className={cn(
        // Mobile: overlay, desktop: inline
        "w-64 bg-[var(--theme-bg-secondary)] border-r border-[var(--theme-border)]",
        "flex flex-col",
        "fixed inset-y-0 left-0 z-40",     // mobile: overlay
        "md:relative md:z-auto",             // desktop: inline
        "transition-transform duration-200",
      )}>
        {/* ... existing content ... */}
      </aside>
    </>
  );
}
```

**Changes to `App.tsx`:** The main layout no longer needs to account for sidebar width on mobile — it's an overlay. Add `md:` prefix to existing sidebar flex patterns if needed. The `<main>` always gets full width on mobile.

**Key behaviors:**
- Sidebar opens via existing hamburger button (already in Header)
- On mobile: full-height overlay with semi-transparent backdrop
- Tapping a TOC heading scrolls to it AND closes the sidebar
- Tapping the backdrop closes the sidebar
- On desktop (≥768px): stays inline as today (relative positioned)

---

### 2. BubbleMenu — Mobile-Safe Layout

**Current:** 15 buttons in a single horizontal row at ~550px. Overflows on mobile.

**Target:** On mobile, bubble menu wraps to 2 rows or uses horizontal scroll. Position is viewport-clamped.

**Changes to `BubbleMenu.tsx`:**

```tsx
// Fix positioning to clamp within viewport
const menuWidth = 360; // approximate max width for mobile
const clampedLeft = Math.min(
  Math.max(10, left),
  window.innerWidth - menuWidth - 10
);

// Add viewport clamping for top position too
const clampedTop = Math.max(10, top);
```

```tsx
// Menu container: allow wrapping on narrow screens
<div className={cn(
  "flex items-center gap-1 flex-wrap",
  "max-w-[calc(100vw-20px)]",  // never wider than viewport
)}>
```

**Alternative approach:** On touch devices, skip the bubble menu entirely and rely on the persistent EditorToolbar (which already has all the same buttons). The bubble menu is a desktop-efficiency feature — on mobile it adds complexity without benefit.

```tsx
// In BubbleMenu.tsx — bail out on touch devices
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (isTouchDevice) return null;
```

**Recommendation:** Option B (disable on touch). The toolbar already provides all formatting buttons. The bubble menu's value is speed-of-access for mouse users, which doesn't translate to touch.

---

### 3. Header — Mobile Condensing

**Current:** Three sections (left/center/right) with 14+ elements. Most visible at all sizes.

**Target:** On mobile, show minimal header. Move secondary actions behind a menu.

**Mobile header layout (≤640px):**
```
[☰] [RendMD] [dirty•]              [⋮ overflow menu]
```

**Tablet+ header layout (>640px):**
```
[☰] [RendMD • Untitled.md •]    [Open] [Save] [Export] [R|Sp|S]    [🎨] [⚙️]
```

**Implementation approach:**

1. Wrap center section (Open/Save/Export/ViewMode) in `hidden sm:flex`
2. Wrap right section (Theme/Shortcuts/Settings) individually: Theme gets `hidden md:block`, Shortcuts gets `hidden sm:block`
3. Add a `MoreMenu` (vertical dots `⋮`) visible only on `sm:hidden` that contains:
   - Open File
   - Save / Save As
   - Export submenu
   - View Mode toggle (render/source only — no split)
   - Theme
   - Settings
4. On mobile, the header becomes just: hamburger + brand + dirty indicator + overflow menu

**Key file changes:**
- `Header.tsx` — Add responsive hiding + overflow menu
- New: `MobileMenu.tsx` — Dropdown with all actions (or reuse ExportDropdown pattern)

---

### 4. Disable Split View on Mobile

**Current:** `w-1/2` hard-coded. 187px per pane on 375px.

**Target:** Split view isn't offered below `md` (768px). If `viewMode` is `'split'` and the screen is narrow, render as `'render'` only.

**Changes to `App.tsx`:**

```tsx
// Compute effective view mode — no split on mobile
const effectiveViewMode = useMemo(() => {
  if (viewMode === 'split' && typeof window !== 'undefined' && window.innerWidth < 768) {
    return 'render';
  }
  return viewMode;
}, [viewMode]);
```

Also hide the "Split" button in ViewModeToggle on mobile:
```tsx
{/* Split button — hidden on mobile */}
<button className="hidden md:inline-flex p-1.5 ..." onClick={() => setViewMode('split')}>
```

---

### 5. Tooltips on Touch Devices

**Current:** `onMouseEnter`/`onMouseLeave` only. Invisible on touch.

**Target:** On touch devices, tooltips just don't render. This is standard behavior — iOS/Android don't support hover tooltips. All important info should be accessible via ARIA labels (already present on buttons via `aria-label` or button text).

**Changes to `Tooltip.tsx`:**

```tsx
export function Tooltip({ children, content, side = 'top' }: TooltipProps) {
  // Disable on touch devices — no hover exists
  const isTouchDevice = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  
  if (isTouchDevice) return <>{children}</>;
  
  // ... existing hover logic
}
```

---

### 6. EditorToolbar — Compact Mobile Layout

**Current:** 16+ buttons with `flex-wrap`. Wraps to 3-4 rows on 375px (~120-160px of vertical space).

**Target:** On mobile, toolbar uses horizontal scroll instead of wrapping. One row, scrollable.

```tsx
// Toolbar container
<div className={cn(
  "flex items-center gap-1",
  "overflow-x-auto scrollbar-none",     // horizontal scroll, hidden scrollbar
  "md:flex-wrap md:overflow-x-visible", // desktop: wrap as before
)}>
```

Combined with hiding the "Ctrl+Space" hint on touch devices and making table controls collapse into a dropdown on mobile.

---

### 7. Tap Targets

**Global change:** Create a `touch-target` utility or adjust all button padding:

```css
/* In index.css */
@media (pointer: coarse) {
  .toolbar-btn {
    min-width: 44px;
    min-height: 44px;
  }
}
```

Or apply `min-h-[44px] min-w-[44px]` via Tailwind to interactive elements. The `(pointer: coarse)` media query targets touch devices specifically without affecting mouse users.

---

### 8. Responsive Editor Padding

**Current:** `p-8` (32px all sides). Wastes 64px horizontally on a 375px screen.

**Fix in `Editor.tsx`:**
```tsx
<div className="flex-1 overflow-y-auto p-4 md:p-8">
```

This gives 16px padding on mobile (leaving 343px for content) and 32px on desktop.

---

### 9. iOS Safari Viewport Height

**Current:** `h-screen` on root. On iOS Safari, `100vh` includes the area behind the URL bar, so content clips behind it.

**Fix in `App.tsx`:**
```tsx
<div className="h-dvh flex flex-col ..."  // dvh = dynamic viewport height
     style={{ height: '100dvh' }}          // fallback for older Tailwind
>
```

Tailwind v3.4+ supports `h-dvh`. Alternatively, use inline style as fallback. `100dvh` adjusts as the Safari URL bar appears/disappears.

---

### 10. Safe Area Insets (Notch Phones)

**Changes to `index.html`:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

**Add to `index.css`:**
```css
/* Safe area padding for notch phones */
body {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

## Component Change Summary

| File | Changes |
|------|---------|
| `index.html` | Add `viewport-fit=cover` to meta viewport |
| `src/index.css` | Add safe-area-inset padding, `@media (pointer: coarse)` tap target rules, responsive heading sizes with `clamp()` |
| `src/App.tsx` | Change `h-screen` → `h-dvh`, compute `effectiveViewMode` (no split on mobile) |
| `src/components/Sidebar/Sidebar.tsx` | **Major rewrite** — overlay/drawer on mobile, inline on desktop, backdrop, auto-close on navigate |
| `src/components/Header/Header.tsx` | Responsive hiding with `hidden sm:flex` groups, add overflow menu for mobile |
| `src/components/Header/Header.tsx` (ViewModeToggle) | Hide "Split" button below `md` |
| `src/components/Header/FileIndicator.tsx` | Reduce `max-w-48` to `max-w-24 sm:max-w-48` |
| `src/components/Editor/Editor.tsx` | Change `p-8` → `p-4 md:p-8` |
| `src/components/Editor/EditorToolbar.tsx` | Horizontal scroll on mobile instead of wrap; hide "Ctrl+Space" hint on touch |
| `src/components/Editor/BubbleMenu.tsx` | Disable entirely on touch devices (toolbar covers all formatting) |
| `src/components/UI/Tooltip.tsx` | Return children directly on touch devices (no hover) |
| `src/components/Modals/SettingsModal.tsx` | Add `mx-4` side margin matching other modals |
| `src/components/Modals/ShortcutsModal.tsx` | Show "keyboard shortcuts are for desktop" note on touch |
| **New: `src/components/Header/MobileMenu.tsx`** | Overflow menu (⋮) with all actions for mobile |

---

## Future Considerations (Not in this spec)

| Feature | Why Deferred |
|---------|-------------|
| PWA manifest + service worker + install prompt | Significant scope; offline editing implies conflict resolution |
| Swipe gestures (swipe-right = open sidebar) | Nice-to-have; button toggle works fine for now |
| Mobile-specific keyboard toolbar (iOS keyboard accessory) | Requires detecting software keyboard show/hide — complex |
| Long-press on links to open in new tab | TipTap touch event handling is tricky; defer to v1.2 |
| Table resize handles for touch | Very complex; tables scroll horizontally for now |

---

## Build Order

1. **Index.html + CSS foundations** — viewport-fit, safe-area, dvh, responsive headings, pointer:coarse tap targets
2. **Sidebar overlay** — most impactful single change for mobile usability
3. **Header condensing + MobileMenu** — makes navigation functional on phone
4. **Disable split on mobile** — quick win in App.tsx
5. **Editor padding** — `p-4 md:p-8`
6. **Toolbar horizontal scroll** — one className change
7. **BubbleMenu disable on touch** — one guard check
8. **Tooltip disable on touch** — one guard check
9. **Modal fixes** — SettingsModal margin, ShortcutsModal touch note
10. **FileIndicator + ExportDropdown** — small responsive tweaks

---

## Testing Checklist

| # | Test | Device/Size |
|---|------|-------------|
| 1 | Sidebar opens as overlay with backdrop | 375px (Chrome DevTools) |
| 2 | Tapping TOC item scrolls AND closes sidebar | 375px |
| 3 | Tapping backdrop closes sidebar | 375px |
| 4 | Header fits without overflow | 375px |
| 5 | Mobile menu (⋮) opens with all actions | 375px |
| 6 | Split view not available on phone | 375px |
| 7 | Editor has adequate content width | 375px |
| 8 | Toolbar scrolls horizontally (no 4-row wrap) | 375px |
| 9 | BubbleMenu doesn't appear on text selection | Touch device |
| 10 | Tooltips don't flash on tap | Touch device |
| 11 | All buttons have ≥44px touch targets | 375px, check with DevTools ruler |
| 12 | Content not clipped by iOS Safari bar | iPhone Safari |
| 13 | No content hidden by notch | iPhone with notch |
| 14 | All modals have side margin | 375px |
| 15 | Sidebar is inline (not overlay) on desktop | 1024px+ |
| 16 | Split view works on desktop | 1024px+ |
| 17 | No regressions on desktop | Full test suite + manual |
