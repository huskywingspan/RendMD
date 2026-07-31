# Builder Handoff: v1.0.4 — Toolbar Bug Fix, Compression, Frontmatter Collapse, View Toggle Polish

> **Date:** 2026-02-08  
> **From:** Researcher  
> **Status:** Ready for implementation

---

## Overview

Four issues from phone testing:

| # | Task | Effort | Severity |
|---|------|--------|----------|
| A | Fix toolbar active button invisible in light mode | S | **Bug** — broken right now |
| B | Toolbar wrap fix + compression | S | High — table grid cut off |
| C | Frontmatter collapsed by default on mobile | S | Medium — eats viewport |
| D | View toggle icon centering | S | Low — visual polish |

---

## Task A: Toolbar Active Button Color — Bug Fix

### Problem

Active toolbar buttons use `bg-[var(--theme-accent)]` (line 103 of EditorToolbar.tsx). This CSS variable **does not exist** in any theme file. The actual variable is `--theme-accent-primary`. So the `background-color` resolves to nothing/transparent.

- **Dark mode:** appears somewhat functional because `text-white` on dark background is still visible — but the highlight background is actually missing
- **Light mode:** `text-white` on a transparent/white background = invisible text

### Fix

**In `EditorToolbar.tsx` line 103:**

```typescript
// OLD
? 'bg-[var(--theme-accent)] text-white'

// NEW
? 'bg-[var(--theme-accent-primary)] text-white'
```

One token change. This matches what `ViewModeToggle` in Header.tsx already uses correctly (`bg-[var(--theme-accent-primary)] text-white`).

### Files Changed
| File | Change |
|------|--------|
| `src/components/Editor/EditorToolbar.tsx` | Line 103: `--theme-accent` → `--theme-accent-primary` |

---

## Task B: Toolbar Wrap + Compression

### Problem 1: Main toolbar still uses scroll, not wrap

The v1.0.3 implementation changed the **TableControls** container (line 397) to `flex-wrap` but missed the **main toolbar** container (line 115), which still has:
```
overflow-x-auto scrollbar-none md:flex-wrap md:overflow-x-visible
```

This means the main toolbar only wraps above `md:` (768px) — portrait phones still get horizontal scroll, and buttons remain hidden.

### Fix 1: Apply flex-wrap to main toolbar too

**Line 115:**
```tsx
// OLD
<div className="editor-toolbar flex items-center gap-1 overflow-x-auto scrollbar-none md:flex-wrap md:overflow-x-visible">

// NEW
<div className="editor-toolbar flex items-center gap-1 flex-wrap">
```

### Problem 2: Toolbar barely doesn't fit one row in landscape

Current button sizing: `p-2` (8px padding each side) = 32px per button + `gap-1` (4px) between buttons. With 16 buttons + 5 separators + table insert, total is ~600px. Landscape phone is ~667-812px.

### Fix 2: Compress buttons on mobile

Reduce button padding from `p-2` to `p-1.5` on mobile, keep `p-2` on desktop. Also reduce separator margins (`mx-1` → `mx-0.5`) and gap (`gap-1` → `gap-0.5 sm:gap-1`). Hide separators on small screens entirely to save ~40px.

**Main toolbar container:**
```tsx
<div className="editor-toolbar flex items-center gap-0.5 sm:gap-1 flex-wrap">
```

**`buttonClass` function (~line 100):**
```typescript
const buttonClass = (isActive: boolean): string =>
  cn(
    'p-1.5 sm:p-2 rounded transition-colors',
    isActive
      ? 'bg-[var(--theme-accent-primary)] text-white'
      : 'text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)]',
  );
```

**Separators — hide on narrow screens:**
```tsx
<div className="hidden sm:block w-px h-6 bg-[var(--theme-border)] mx-0.5 sm:mx-1" />
```

This saves about 6px per button × 16 buttons = 96px, plus removing 5 separators × ~10px = 50px. Total ~146px saved, bringing toolbar from ~600px to ~454px — fits in one row on landscape (667px+).

### Files Changed
| File | Change |
|------|--------|
| `src/components/Editor/EditorToolbar.tsx` | Line 115 flex-wrap; `buttonClass` p-1.5/p-2; separators hidden sm:block; gap-0.5 sm:gap-1 |

---

## Task C: Frontmatter Collapsed by Default on Mobile

### Problem

The frontmatter panel `isOpen` defaults to `true` (line 22 of FrontmatterPanel.tsx). Combined with the toolbar, they consume significant viewport height on landscape mobile. Frontmatter is a secondary feature — most users may not know what it is.

### Solution

Start collapsed by default. The panel already has a collapse toggle (chevron button). Change the default.

**In `FrontmatterPanel.tsx` line 22:**
```typescript
// OLD
const [isOpen, setIsOpen] = useState(true);

// NEW
const [isOpen, setIsOpen] = useState(false);
```

This is the simplest fix. The "Frontmatter" label with the chevron is still visible (just the header bar), so users who know what it is can expand it. The panel header is a single `py-2` row — very compact when collapsed.

**Alternative considered:** Make it responsive (collapsed on mobile, expanded on desktop). But `useState(false)` is cleaner and consistent across devices — frontmatter is metadata, not primary content.

### Files Changed
| File | Change |
|------|--------|
| `src/components/Frontmatter/FrontmatterPanel.tsx` | Line 22: `useState(true)` → `useState(false)` |

---

## Task D: View Toggle Icon Centering

### Problem

The `ViewModeToggle` buttons use `p-1.5` with varying visibility classes. When the Split button is `hidden md:inline-flex`, the remaining Render + Source buttons may appear left-aligned within the toggle container instead of centered within their individual button areas.

### Root Cause

The button uses `className="p-1.5 rounded transition-colors"` but doesn't have explicit flex centering for its icon content. The `<Icon size={14} />` inside may not be centered if the button doesn't have consistent sizing.

### Fix

Add explicit flex centering and consistent sizing to the toggle buttons:

**In `Header.tsx`, `ViewModeToggle` component (~line 162):**

```tsx
// OLD
<button
  onClick={() => setViewMode(value)}
  className={cn(
    "p-1.5 rounded transition-colors",
    mobileHidden && "hidden md:inline-flex",
    viewMode === value
      ? "bg-[var(--theme-accent-primary)] text-white"
      : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
  )}

// NEW — add flex centering + consistent sizing
<button
  onClick={() => setViewMode(value)}
  className={cn(
    "flex items-center justify-center p-1.5 rounded transition-colors",
    mobileHidden && "hidden md:inline-flex",
    viewMode === value
      ? "bg-[var(--theme-accent-primary)] text-white"
      : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]"
  )}
```

Adding `flex items-center justify-center` ensures the icon is perfectly centered in the button area.

### Files Changed
| File | Change |
|------|--------|
| `src/components/Header/Header.tsx` | ViewModeToggle buttons: add `flex items-center justify-center` |

---

## Build Order

1. **Task A** — one-token bug fix, highest priority
2. **Task D** — one-line visual fix
3. **Task C** — one-line default change
4. **Task B** — toolbar flex-wrap + compression

## Testing Checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Light mode: tap Bold in toolbar | Blue highlight background, white icon visible |
| 2 | Dark mode: tap Bold | Same blue highlight, no regression |
| 3 | All 4 themes: active toolbar button | Visible blue highlight on all |
| 4 | Portrait phone (375px): toolbar | Wraps to 2 rows, all buttons visible |
| 5 | Landscape phone (667px): toolbar | Fits in 1 row or barely 2, table grid reachable |
| 6 | Desktop: toolbar | Single row with separators visible |
| 7 | Frontmatter panel on page load | Collapsed (thin header bar only) |
| 8 | Click frontmatter chevron | Expands to show fields |
| 9 | View toggle: icons centered in buttons | Render + Source icons centered in their pill |
| 10 | Landscape: frontmatter collapsed + toolbar collapsed = lots of editing space | Verify viewport usage |
