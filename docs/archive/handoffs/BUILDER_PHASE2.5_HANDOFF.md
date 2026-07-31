# Builder Sprint: Phase 2.5 - Table Enhancements

> **From:** Reviewer  
> **Date:** 2026-01-30  
> **Sprint Goal:** Premium table insertion and navigation experience

---

## Objective

Enhance the table editing UX with a visual grid picker for table creation (like Google Docs/Word), keyboard navigation between cells, and column alignment controls.

---

## Background

Phase 2 delivered working GFM tables with add/delete row/column buttons. User feedback indicates two UX gaps:

1. **Table insertion** - Current approach requires clicking "Insert Table" then manually adding rows/columns. Users expect to pick dimensions visually upfront.
2. **Navigation** - Tab should move between cells; Enter at end of table should create new row.
3. **Alignment** - GFM supports column alignment (`:---`, `:---:`, `---:`) but we have no UI for it.

**Reference:** The grid picker should work like Google Docs - hover over a grid to preview "3×4 table", click to insert.

---

## Tasks (in order)

### Task 1: TableGridPicker Component

**What:** Create a dropdown component that displays a hoverable grid for selecting table dimensions.

**Where:** `src/components/Editor/TableGridPicker.tsx`

**Behavior:**
- Display as dropdown triggered from toolbar or slash command
- Show a grid of cells (suggest 8×6 max - 8 columns, 6 rows)
- Hovering highlights cells from top-left to current position
- Display dimension text (e.g., "3×4 table") below grid
- Click inserts table with selected dimensions
- Escape or click-outside closes picker
- Minimum size: 1×1 (just header row with one cell)

**Props Interface:**
```typescript
interface TableGridPickerProps {
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}
```

**Styling:**
- Use CSS variables for theming (`var(--color-bg-elevated)`, etc.)
- Cells ~24×24px with 1px gap
- Highlighted cells use accent color
- Border radius on container, subtle shadow

**Acceptance Criteria:**
- [ ] Grid renders with 8×6 cells
- [ ] Hover highlights from (1,1) to (row, col)
- [ ] Dimension label updates on hover
- [ ] Click calls `onSelect(rows, cols)` and closes
- [ ] Keyboard: Arrow keys move selection, Enter confirms, Escape closes
- [ ] Works in all 4 themes

---

### Task 2: Integrate Grid Picker into Toolbar

**What:** Replace or augment the current table insert button with the grid picker.

**Where:** `src/components/Editor/EditorToolbar.tsx` (or wherever table insert lives)

**Behavior:**
- Table button becomes a dropdown trigger
- Clicking opens TableGridPicker as a floating dropdown
- Use Floating UI for positioning (consistent with other popovers)
- After selection, insert table and focus first header cell

**Implementation Hints:**
- Look at how `ThemeDropdown` or `LinkPopover` handle floating elements
- The insert command: `editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run()`
- GFM tables always have header row, so `withHeaderRow: true` is required

**Acceptance Criteria:**
- [ ] Table button shows dropdown arrow indicator
- [ ] Grid picker appears below/above button (smart positioning)
- [ ] Selecting dimensions inserts correct table
- [ ] Picker closes after selection
- [ ] Works when no table exists (guard already in TableToolbar)

---

### Task 3: Tab Navigation Between Cells

**What:** Enable Tab/Shift+Tab to navigate between table cells.

**Where:** `src/components/Editor/extensions/keyboard-shortcuts.ts` or table extension config

**Behavior:**
- **Tab:** Move to next cell (right, then down to next row)
- **Shift+Tab:** Move to previous cell (left, then up to previous row)
- **Tab at last cell:** Create new row and move to first cell of new row
- **Shift+Tab at first cell:** Stay in place (no-op)

**Implementation Notes:**
TipTap's table extension may already support this via `tabIndex`. Check if it's enabled:

```typescript
Table.configure({
  resizable: false, // GFM tables aren't resizable
  // Tab handling may be built-in
})
```

If not built-in, add keyboard handlers:
```typescript
// In keyboard shortcuts extension
'Tab': ({ editor }) => {
  if (editor.isActive('table')) {
    return editor.commands.goToNextCell();
  }
  return false; // Let default Tab behavior occur
},
'Shift-Tab': ({ editor }) => {
  if (editor.isActive('table')) {
    return editor.commands.goToPreviousCell();
  }
  return false;
},
```

**Acceptance Criteria:**
- [ ] Tab moves cursor to next cell
- [ ] Shift+Tab moves cursor to previous cell
- [ ] Tab at end of table creates new row
- [ ] Tab outside table works normally (default behavior)
- [ ] Works in header cells and body cells

---

### Task 4: Column Alignment Controls

**What:** Add alignment buttons to TableToolbar for left/center/right column alignment.

**Where:** `src/components/Editor/TableToolbar.tsx`

**Behavior:**
- Three buttons: Align Left, Align Center, Align Right
- Applies to the current column (all cells in that column)
- Visual indicator of current alignment state
- Alignment persists in GFM markdown (`:---`, `:---:`, `---:`)

**GFM Alignment Syntax:**
```markdown
| Left | Center | Right |
|:-----|:------:|------:|
| a    |   b    |     c |
```

**Implementation Notes:**
TipTap table extension has alignment commands:
```typescript
editor.chain().focus().setCellAttribute('textAlign', 'left').run()
editor.chain().focus().setCellAttribute('textAlign', 'center').run()
editor.chain().focus().setCellAttribute('textAlign', 'right').run()
```

Check if `tiptap-markdown` serializes alignment to GFM syntax. If not, this may require:
1. Custom serializer rule for table cells with alignment
2. Or accept limitation and document (alignment visual-only, not persisted)

**Acceptance Criteria:**
- [ ] Three alignment buttons in TableToolbar
- [ ] Clicking sets column alignment
- [ ] Current alignment is visually indicated (button highlight)
- [ ] Alignment renders visually in editor
- [ ] Alignment survives round-trip to markdown (or document limitation)

---

### Task 5: Enter Key Behavior at Table End

**What:** Pressing Enter at the end of the last cell creates a new row.

**Where:** Keyboard shortcuts or table extension config

**Behavior:**
- **Enter in middle of cell:** Normal line break or paragraph (depends on context)
- **Enter at end of last cell in last row:** Create new row, move to first cell
- **Shift+Enter:** Always insert line break (no special behavior)

**Implementation:**
```typescript
'Enter': ({ editor }) => {
  if (editor.isActive('table')) {
    const { $from } = editor.state.selection;
    // Check if at end of last cell in last row
    // If so, add row and move cursor
  }
  return false;
},
```

This is lower priority than Tab navigation. If complex, defer to Phase 3.

**Acceptance Criteria:**
- [ ] Enter at end of table creates new row
- [ ] Enter elsewhere in table works normally
- [ ] Shift+Enter inserts line break

---

## Test Requirements

### Unit Tests (if test framework set up)
- TableGridPicker: dimension calculation, keyboard navigation
- Alignment: verify attribute is set correctly

### Manual Testing Checklist
- [ ] Grid picker: all dimension combinations up to 8×6
- [ ] Grid picker: keyboard navigation (arrows, enter, escape)
- [ ] Tab navigation: forward through entire table
- [ ] Tab navigation: backward through entire table
- [ ] Tab at last cell: new row created
- [ ] Alignment: left/center/right all work
- [ ] Alignment: visual indicators correct
- [ ] Alignment: round-trip markdown (check output)
- [ ] All features work in all 4 themes
- [ ] No regressions in existing table features

---

## Definition of Done

- [ ] All 5 tasks complete (or Task 5 documented as deferred)
- [ ] Manual testing checklist passed
- [ ] No TypeScript errors (`npm run build` passes)
- [ ] No lint errors (`npm run lint` passes)
- [ ] Code follows project conventions (see copilot-instructions.md)
- [ ] Commit with conventional commit message

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/Editor/TableGridPicker.tsx` | Create | Grid picker component |
| `src/components/Editor/EditorToolbar.tsx` | Modify | Integrate grid picker dropdown |
| `src/components/Editor/TableToolbar.tsx` | Modify | Add alignment buttons |
| `src/components/Editor/extensions/keyboard-shortcuts.ts` | Modify | Tab/Enter handlers |
| `src/components/Editor/editor-styles.css` | Modify | Grid picker styling |

---

## Reference Implementation

**Google Docs Table Picker:**
- 10×8 grid
- Hover fills from top-left
- Shows "X × Y" label
- Single click inserts

**VS Code Grid (for reference):**
- Keyboard accessible
- Visual feedback on hover
- Escape cancels

---

## Questions to Answer During Implementation

1. **Does `tiptap-markdown` serialize column alignment?** Test this early. If not, decide: implement custom serializer or document as visual-only.

2. **Tab handling built-in?** Check TipTap table extension config first before writing custom handlers.

3. **Grid picker positioning:** Use Floating UI's `autoPlacement` or `flip` middleware to handle edge cases.

---

## Priority Order

If time-constrained, implement in this order:
1. **Task 1 & 2** - Grid picker (biggest UX win)
2. **Task 3** - Tab navigation (expected behavior)
3. **Task 4** - Alignment (nice to have)
4. **Task 5** - Enter behavior (can defer)

---

Ready to implement. 🚀
