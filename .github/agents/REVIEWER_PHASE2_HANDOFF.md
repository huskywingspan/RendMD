# Reviewer Handoff: Phase 2 - Tables & File Operations

> **Created:** 2026-01-30  
> **Phase:** 2  
> **Technical Brief:** [docs/research/PHASE2_TECHNICAL_BRIEF.md](../../docs/research/PHASE2_TECHNICAL_BRIEF.md)

---

## Review Scope

Phase 2 introduces:
1. **File operations** - Open, save, auto-save local markdown files
2. **Table editing** - GFM table support with visual editing

---

## Test Environment Setup

### Dependencies Added

```bash
npm install @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-header @tiptap/extension-table-cell
```

### Test Browsers

- **Primary:** Chrome/Edge (full File System Access API)
- **Secondary:** Firefox/Safari (fallback mode)

---

## Test Cases: File Operations

### TC-F01: Open File (Chrome/Edge)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Ctrl+O | Native file picker opens |
| 2 | Select a `.md` file | File content loads in editor |
| 3 | Check header | Filename displays |
| 4 | Check dirty state | Not dirty (no ●) |

### TC-F02: Open File (Firefox/Safari)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Press Ctrl+O | Browser file input appears |
| 2 | Select a `.md` file | File content loads |
| 3 | Check header | Filename displays |

### TC-F03: Save Existing File (Chrome/Edge)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open a file | File loaded |
| 2 | Make an edit | Dirty indicator (●) appears |
| 3 | Press Ctrl+S | File saved, dirty clears |
| 4 | Check file on disk | Changes persisted |

### TC-F04: Save File (Firefox/Safari)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open or create content | Content in editor |
| 2 | Press Ctrl+S | Download starts |
| 3 | Check Downloads folder | File present with content |

### TC-F05: Save As

| Step | Action | Expected |
|------|--------|----------|
| 1 | Have content in editor | - |
| 2 | Press Ctrl+Shift+S | Save picker opens |
| 3 | Choose location/name | File saved to new location |
| 4 | Check header | New filename shows |

### TC-F06: Auto-Save

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open existing file | File loaded |
| 2 | Make an edit | Dirty indicator appears |
| 3 | Wait 2+ seconds | Auto-save triggers |
| 4 | Check dirty indicator | Should clear |
| 5 | Check file on disk | Changes saved |

### TC-F07: Unsaved Changes Warning

| Step | Action | Expected |
|------|--------|----------|
| 1 | Make an edit (don't save) | Dirty indicator shows |
| 2 | Try to close tab | Browser warning appears |
| 3 | Cancel close | Stay on page, content preserved |

### TC-F08: New Document

| Step | Action | Expected |
|------|--------|----------|
| 1 | Fresh app load | Default content shows |
| 2 | Check header | "Untitled" or similar |
| 3 | Make edit | Dirty indicator shows |
| 4 | Ctrl+S | Save picker opens (no existing file) |

---

## Test Cases: Table Editing

### TC-T01: Insert Table

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click in empty area | Cursor in editor |
| 2 | Click "Insert Table" | 3x3 table with header row appears |
| 3 | Check first row | Should be header cells (bold/styled) |

### TC-T02: Tab Navigation

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click in first table cell | Cursor in cell |
| 2 | Press Tab | Moves to next cell |
| 3 | Press Tab at row end | Moves to first cell of next row |
| 4 | Press Shift+Tab | Moves backward |

### TC-T03: Add/Remove Rows

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click in a table cell | Cell selected |
| 2 | Click "Add Row Below" | New row added below current |
| 3 | Click "Add Row Above" | New row added above current |
| 4 | Click "Delete Row" | Current row removed |

### TC-T04: Add/Remove Columns

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click in a table cell | Cell selected |
| 2 | Click "Add Column After" | New column added to right |
| 3 | Click "Add Column Before" | New column added to left |
| 4 | Click "Delete Column" | Current column removed |

### TC-T05: Delete Table

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click in any table cell | Cell selected |
| 2 | Click "Delete Table" | Entire table removed |

### TC-T06: Table Content Editing

| Step | Action | Expected |
|------|--------|----------|
| 1 | Click in table cell | Cursor appears |
| 2 | Type text | Text appears in cell |
| 3 | Apply bold (Ctrl+B) | Text becomes bold |
| 4 | Add link (Ctrl+K) | Link created in cell |

---

## Test Cases: Round-Trip

### TC-R01: Simple Table Round-Trip

**Input:**
```markdown
| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |
```

**Steps:**
1. Load this markdown
2. Check table renders
3. Export markdown
4. Compare output

**Expected:** Output matches input structure

### TC-R02: Table with Formatting

**Input:**
```markdown
| Feature | Status |
| --- | --- |
| **Bold** | *Italic* |
| `code` | [link](url) |
```

**Steps:** Same as TC-R01

**Expected:** Formatting preserved in cells

### TC-R03: Complex Document Round-Trip

**Input:**
```markdown
# Document with Table

Some intro text.

| Col A | Col B | Col C |
| --- | --- | --- |
| 1 | 2 | 3 |
| 4 | 5 | 6 |

## After Table

More content here.
```

**Steps:** Same as TC-R01

**Expected:** Full document structure preserved

### TC-R04: Known Limitation - Alignment

**Input:**
```markdown
| Left | Center | Right |
| :--- | :---: | ---: |
| A | B | C |
```

**Expected Output:**
```markdown
| Left | Center | Right |
| --- | --- | --- |
| A | B | C |
```

**Note:** This is a **known limitation** - alignment syntax is lost. Content is preserved.

---

## Visual/UX Checks

### V-01: Dirty Indicator

- [ ] ● appears after edit
- [ ] ● disappears after save
- [ ] ● visible in header area

### V-02: File Name Display

- [ ] Shows "Untitled" for new docs
- [ ] Shows actual filename after open
- [ ] Updates after Save As

### V-03: Table Styling

- [ ] Table has visible borders
- [ ] Header row visually distinct
- [ ] Cells have padding
- [ ] Hover effect on rows
- [ ] Selected cell highlighted
- [ ] Works in all 4 themes

### V-04: Table Toolbar

- [ ] Shows "Insert Table" when not in table
- [ ] Shows row/column controls when in table
- [ ] Buttons have icons or clear labels

---

## Regression Checks

Run these to ensure Phase 2 didn't break Phase 1:

- [ ] Bold/italic/code formatting works
- [ ] Links still editable via popover
- [ ] Images still show/edit
- [ ] Code blocks have syntax highlighting
- [ ] Theme switching works
- [ ] Keyboard shortcuts (Ctrl+B, etc.) work
- [ ] BubbleMenu appears on selection

---

## Browser Compatibility Matrix

| Feature | Chrome | Edge | Firefox | Safari |
|---------|--------|------|---------|--------|
| Open file (native) | ✓ | ✓ | - | - |
| Open file (fallback) | - | - | ✓ | ✓ |
| Save file (in-place) | ✓ | ✓ | - | - |
| Save file (download) | - | - | ✓ | ✓ |
| Auto-save | ✓ | ✓ | - | - |
| Table editing | ✓ | ✓ | ✓ | ✓ |
| Table round-trip | ✓ | ✓ | ✓ | ✓ |

---

## Pass/Fail Criteria

**Pass if:**
- All TC-F tests pass in Chrome
- TC-F02, TC-F04 work in Firefox
- All TC-T tests pass
- TC-R01, TC-R02, TC-R03 pass
- TC-R04 shows expected (limited) behavior
- All V checks pass
- All regression checks pass

**Fail if:**
- File operations don't work in Chrome
- Tables don't render
- Table edits cause crashes
- Existing formatting breaks
- Data loss in any scenario

---

## Reporting Template

```markdown
## Phase 2 Review Results

**Date:** YYYY-MM-DD
**Reviewer:** [Name]
**Build:** [commit hash]

### Summary
- [ ] PASS / [ ] FAIL

### Test Results

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| File Ops (Chrome) | /8 | | |
| File Ops (Firefox) | /2 | | |
| Table Editing | /6 | | |
| Round-Trip | /4 | | |
| Visual/UX | /4 | | |
| Regression | /7 | | |

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendation
[ ] Approve for merge
[ ] Needs fixes (list above)
```

---

*Good luck, Reviewer! 🔍*
