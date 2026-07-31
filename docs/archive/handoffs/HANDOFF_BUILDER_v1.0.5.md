# Builder Handoff — v1.0.5: Font Scaling, WCAG Compliance, GUI Density

> **Prerequisite:** v1.0.4 must be implemented first. See `HANDOFF_BUILDER_v1.0.4.md`.

---

## Overview

Three independent workstreams:

| # | Feature | Effort | Priority |
|---|---------|--------|----------|
| 1 | Font size scales ALL text elements | S | P0 |
| 2 | WCAG AA color compliance for all 4 themes | S | P0 |
| 3 | GUI density toggle in settings | M | P1 |

---

## 1. Font Size Scaling Fix (P0)

### Problem

The font size setting (12–24px) only affects `.ProseMirror` body text and source editor. Headings H1–H6 use absolute `clamp()` / `rem` values and **do not scale** with the setting.

### Root Cause

In `src/index.css` (lines 83–106), heading sizes are hardcoded:

```css
/* Current — BROKEN */
.ProseMirror h1 { font-size: clamp(1.5rem, 4vw + 0.5rem, 2.25rem); }
.ProseMirror h2 { font-size: clamp(1.25rem, 3vw + 0.4rem, 1.75rem); }
.ProseMirror h3 { font-size: clamp(1.125rem, 2vw + 0.3rem, 1.375rem); }
.ProseMirror h4, h5, h6 { font-size: 1.125rem; }
```

These use `rem` (relative to root 16px), NOT relative to `--editor-font-size`.

### Fix

Change heading sizes to use `em` units, which are relative to the parent's font size. Since `.ProseMirror` already sets `font-size: var(--editor-font-size, 16px)`, using `em` on headings will make them scale proportionally.

```css
/* Fixed — headings scale with --editor-font-size */
.ProseMirror h1 {
  font-size: 2em;        /* 2× base = 32px at 16px, 40px at 20px */
  line-height: 1.2;
}
.ProseMirror h2 {
  font-size: 1.6em;      /* 1.6× base = 25.6px at 16px, 32px at 20px */
  line-height: 1.25;
}
.ProseMirror h3 {
  font-size: 1.3em;      /* 1.3× base = 20.8px at 16px, 26px at 20px */
  line-height: 1.3;
}
.ProseMirror h4 {
  font-size: 1.15em;     /* 1.15× base */
  line-height: 1.35;
}
.ProseMirror h5 {
  font-size: 1.05em;     /* 1.05× base */
  line-height: 1.4;
}
.ProseMirror h6 {
  font-size: 1em;        /* same as base, styled only by weight/color */
  line-height: 1.4;
}
```

**Key decisions:**
- Drop the `clamp()` — it was mostly for mobile responsiveness, but the user's font size preference should take priority. If needed, a subtler clamp can be reintroduced: `clamp(1.5em, 2em, 2.5em)` but em-relative.
- Each heading level MUST remain visually distinct from the level below it.
- Keep existing `font-weight`, `color`, `margin`, and `letter-spacing` rules unchanged.

### Also scale these elements

Check and fix any other elements in `.ProseMirror` that use absolute sizing:
- Inline `code` — currently `0.9em` ✅ (already relative)
- `pre code` — check if it has an absolute size
- Blockquote text — inherits from parent ✅
- Table cells — check if they have absolute font-size
- `hr`, list items — should inherit

The source editor (`.source-editor textarea`) already uses `var(--editor-font-size, 14px)` — verify the fallback should be `16px` to match, or intentionally leave it at `14px` for code contexts.

### Files to modify
- `src/index.css` — heading font-size rules (lines ~83–106)

---

## 2. WCAG AA Color Compliance (P0)

### Standards

- **WCAG 2.1 AA** requires:
  - **Normal text** (< 18pt / < 14pt bold): **4.5:1** contrast ratio
  - **Large text** (≥ 18pt / ≥ 14pt bold) and **UI components**: **3:1** contrast ratio

### Audit Results

| Theme | Pair | Current Ratio | Verdict | Fix |
|-------|------|--------------|---------|-----|
| **dark-basic** | text-primary on bg | 13.84:1 | ✅ PASS | — |
| **dark-basic** | text-secondary on bg | 6.65:1 | ✅ PASS | — |
| **dark-basic** | text-muted on bg | 3.58:1 | ❌ FAIL | `#64748b` → **`#7c8ba0`** (4.92:1) |
| **dark-basic** | accent on bg | 4.64:1 | ✅ PASS | — |
| **dark-basic** | white on accent (buttons) | 3.68:1 | ✅ UI PASS | 3:1 sufficient for buttons |
| **light-basic** | text-primary on bg | 14.63:1 | ✅ PASS | — |
| **light-basic** | text-secondary on bg | 7.58:1 | ✅ PASS | — |
| **light-basic** | text-muted on bg | 2.56:1 | ❌ FAIL | `#94a3b8` → **`#6b7280`** (4.83:1) |
| **light-basic** | accent on bg | 3.68:1 | ❌ FAIL | `#3b82f6` → **`#2563eb`** (5.17:1) |
| **light-basic** | white on accent (buttons) | 3.68:1 | ✅→✅ | New accent gives 5.17:1 |
| **dark-glass** | ALL pairs | ≥ 6.96:1 | ✅ PASS | No changes needed |
| **light-glass** | text-primary on bg | 17.85:1 | ✅ PASS | — |
| **light-glass** | text-secondary on bg | 10.35:1 | ✅ PASS | — |
| **light-glass** | text-muted on bg | 4.76:1 | ✅ PASS | — |
| **light-glass** | accent on bg | 2.77:1 | ❌ FAIL | `#0ea5e9` → **`#0c7bb3`** (4.67:1) |
| **light-glass** | white on accent (buttons) | 2.77:1 | ❌→✅ | New accent gives 4.67:1 |

**Additional checks (all pass):**
- Code text on code-bg: all themes ≥ 12.89:1 ✅
- accent-secondary (link hover only, transient state) — exempted

### Changes Required

#### `src/themes/dark-basic.css`

```css
/* Line 9: text-muted */
--theme-text-muted: #7c8ba0;    /* was #64748b — now 4.92:1 on #1a1a2e */
```

That's it for dark-basic. All other values pass.

#### `src/themes/light-basic.css`

```css
/* Line 9: text-muted */
--theme-text-muted: #6b7280;     /* was #94a3b8 — now 4.83:1 on #ffffff */

/* Line 24: accent-primary */
--theme-accent-primary: #2563eb;  /* was #3b82f6 — now 5.17:1 on #ffffff */

/* Line 26: accent-hover (was same as new primary, bump darker) */
--theme-accent-hover: #1d4ed8;    /* was #2563eb */

/* Line 21: border-accent */
--theme-border-accent: #2563eb;   /* was #3b82f6 — match new primary */

/* Line 29: button-bg */
--theme-button-bg: #2563eb;       /* was #3b82f6 — match new primary */

/* Line 31: button-hover */
--theme-button-hover: #1d4ed8;    /* was #2563eb — match new accent-hover */

/* Line 34: input-focus */
--theme-input-focus: #2563eb;     /* was #3b82f6 — match new primary */
```

#### `src/themes/light-glass.css`

```css
/* Line 24: accent-primary */
--theme-accent-primary: #0c7bb3;           /* was #0ea5e9 — now 4.67:1 on white */

/* Line 26: accent-hover */
--theme-accent-hover: #065d85;             /* was #0284c7 — darker to maintain hierarchy */

/* Line 20: border-accent */
--theme-border-accent: rgba(12, 123, 179, 0.5);  /* was rgba(14, 165, 233, 0.5) */

/* Line 29: button-bg */
--theme-button-bg: rgba(12, 123, 179, 0.9);      /* was rgba(14, 165, 233, 0.9) */

/* Line 31: button-hover */
--theme-button-hover: rgba(6, 93, 133, 1);        /* was rgba(2, 132, 199, 1) */

/* Line 34: input-focus */
--theme-input-focus: rgba(12, 123, 179, 0.5);     /* was rgba(14, 165, 233, 0.5) */
```

### Visual Impact

- **Dark-basic:** Muted text becomes slightly lighter — more readable placeholder/secondary text.
- **Light-basic:** Muted text goes from washed-out gray to readable medium gray. Accent shifts from blue-500 to blue-600 — still clearly blue, slightly richer.
- **Light-glass:** Accent shifts from sky-500 to a deeper sky/teal — preserves the glass aesthetic while being readable.
- **Dark-glass:** No changes — already compliant.

### Files to modify
- `src/themes/dark-basic.css` — 1 variable
- `src/themes/light-basic.css` — 6 variables  
- `src/themes/light-glass.css` — 5 variables

---

## 3. GUI Density Toggle (P1)

### User Story

As a user, I want to adjust the overall UI density so that the app feels comfortable on both touch devices and desktop with precise pointers.

### Design

**Two-level approach:**
1. **Quick toggle** in Settings — "Compact" / "Comfortable" (two options, one tap)
2. The toggle adjusts a CSS custom property `--ui-density-scale` that cascades through the UI

### State

Add to the Zustand store:

```typescript
// In types/index.ts
export type UIDensity = 'compact' | 'comfortable';

// In EditorStore interface
uiDensity: UIDensity;
setUIDensity: (density: UIDensity) => void;

// In PersistedState
uiDensity: UIDensity;
```

Default: `'comfortable'`

### CSS Custom Properties

Apply via inline style on the root div in `App.tsx` (same pattern as `--editor-font-size`):

```tsx
style={{
  '--editor-font-size': `${fontSize}px`,
  '--ui-density-scale': uiDensity === 'compact' ? '0.85' : '1',
} as React.CSSProperties}
```

Then define derived properties in `src/index.css` (or a new `src/density.css`):

```css
:root {
  /* Base density tokens — multiply by --ui-density-scale */
  --density-padding-sm: calc(0.25rem * var(--ui-density-scale, 1));
  --density-padding-md: calc(0.5rem * var(--ui-density-scale, 1));
  --density-padding-lg: calc(1rem * var(--ui-density-scale, 1));
  --density-gap-sm: calc(0.25rem * var(--ui-density-scale, 1));
  --density-gap-md: calc(0.5rem * var(--ui-density-scale, 1));
  --density-icon-sm: calc(14px * var(--ui-density-scale, 1));
  --density-icon-md: calc(16px * var(--ui-density-scale, 1));
  --density-button-padding: calc(0.5rem * var(--ui-density-scale, 1));
}
```

### Components to Update

Priority components that benefit most from density scaling:

| Component | What changes | How |
|-----------|-------------|-----|
| **EditorToolbar** | Button padding, icon gaps | Use `--density-button-padding` and `--density-gap-sm` |
| **Header** | Height, button spacing | Use `--density-padding-md` |
| **Sidebar** | TOC item padding | Use `--density-padding-sm` |
| **MobileMenu** | Menu item heights | Use `--density-padding-md` |
| **Modals** | Internal padding | Use `--density-padding-lg` |

**Implementation approach:** Don't replace ALL padding at once. Start with the toolbar and header (most visible), then expand to sidebar and modals. Each component only needs its key spacing values replaced with density-aware variables.

### SettingsModal Restructuring

Current layout: flat list with 2 settings. Needs sections.

```
┌─────────────────────────────────┐
│ Settings                    ✕   │
│─────────────────────────────────│
│                                 │
│ EDITOR                          │
│ ┌─────────────────────────────┐ │
│ │ Font Size        [−] 16 [+]│ │
│ │ Auto-save        [  toggle ]│ │
│ └─────────────────────────────┘ │
│                                 │
│ APPEARANCE                      │
│ ┌─────────────────────────────┐ │
│ │ UI Density                  │ │
│ │ [Compact] [Comfortable]     │ │
│ └─────────────────────────────┘ │
│                                 │
└─────────────────────────────────┘
```

**Section headers:** Use `text-xs font-semibold uppercase tracking-wide text-[var(--theme-text-muted)]` with a `mb-2 mt-4 first:mt-0` pattern.

**Density toggle:** Two-button segmented control (like ViewModeToggle), NOT a slider. Single tap switches between Compact and Comfortable. Use the same rounded pill style as ViewModeToggle for consistency.

### Files to modify
- `src/types/index.ts` — add `UIDensity` type
- `src/stores/editorStore.ts` — add `uiDensity` state + action + persistence
- `src/App.tsx` — apply `--ui-density-scale` CSS variable
- `src/index.css` — define density token variables
- `src/components/Modals/SettingsModal.tsx` — add sections, density toggle
- `src/components/Editor/EditorToolbar.tsx` — use density tokens for padding
- `src/components/Header/Header.tsx` — use density tokens for spacing

---

## Implementation Order

1. **Font scaling fix** (index.css only, 10 min)
2. **WCAG color fixes** (3 theme CSS files, 15 min)
3. **GUI density: store + types + CSS variables** (plumbing, 20 min)
4. **GUI density: SettingsModal UI** (sections + toggle, 20 min)
5. **GUI density: apply to toolbar + header** (incremental, 15 min)

Total estimate: ~1.5 hours

---

## Testing Checklist

- [ ] Change font size to 12px — verify H1 is visually smaller than at 16px
- [ ] Change font size to 24px — verify H1 is visually larger, page doesn't overflow
- [ ] At each font size, verify heading hierarchy (H1 > H2 > H3 > H4 > H5 > H6 > body)
- [ ] Check all 4 themes — muted text readable, accent links visible, buttons legible
- [ ] Light-basic: accent buttons are clearly blue, not washed out
- [ ] Light-glass: accent maintains sky/teal feel, not muddy
- [ ] Dark-basic: muted text no longer strains eyes
- [ ] Toggle Compact mode — toolbar buttons visibly smaller, no overflow
- [ ] Toggle Comfortable mode — returns to normal spacing
- [ ] Density preference persists across page reload
- [ ] Settings modal has clear section headers
- [ ] All existing 101 tests still pass

---

## References

- WCAG 2.1 Success Criterion 1.4.3 (Contrast Minimum): https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum
- WCAG 2.1 SC 1.4.11 (Non-text Contrast): https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast
- Relative length units: https://developer.mozilla.org/en-US/docs/Web/CSS/length#relative_length_units
- ADR-030: No getters in Zustand store initial state — follow same pattern for new state
