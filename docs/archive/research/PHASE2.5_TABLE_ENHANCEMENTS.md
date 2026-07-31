# Phase 2.5 Research: Table Enhancement Questions

> **Document Type:** Research Response  
> **Created:** 2026-01-30  
> **Status:** Complete

---

## Executive Summary

| Question | Answer | Recommendation |
|----------|--------|----------------|
| Alignment persistence | **No** - Not preserved | Option B (document as limitation) for v1.0 |
| Column resize handles | TipTap supports it | Defer to Phase 3+ (visual-only is fine) |
| Merge cells | Supported in TipTap, not in GFM | Enable, HTML fallback when needed |

---

## 1. Alignment Markdown Persistence

### Question
Does `tiptap-markdown` serialize `textAlign` attributes to GFM alignment syntax (`:---`, `:---:`, `---:`)? 

### Answer: **No, it does not.**

From the `tiptap-markdown` source code ([table.js#L15-L43](https://github.com/aguingand/tiptap-markdown/blob/main/src/extensions/nodes/table.js#L15-L43)):

```javascript
serialize(state, node, parent) {
  // ...
  if(!i) {
    // Delimiter row is always just '---' - no alignment markers
    const delimiterRow = Array.from({length: row.childCount}).map(() => '---').join(' | ');
    state.write(`| ${delimiterRow} |`);
  }
  // ...
}
```

The serializer hardcodes `---` for all columns with no logic to read alignment attributes.

### Options Analysis

#### Option A: Custom Markdown Serializer
**Effort:** Medium (4-6 hours)

```typescript
// Custom table serializer with alignment support
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

// Extend TableCell/TableHeader to store alignment
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: element => element.style.textAlign || null,
        renderHTML: attributes => {
          if (!attributes.textAlign) return {};
          return { style: `text-align: ${attributes.textAlign}` };
        },
      },
    };
  },
  
  // Custom markdown storage
  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          // Cell content
          const cellContent = node.firstChild;
          if (cellContent.textContent.trim()) {
            state.renderInline(cellContent);
          }
        },
        // Store alignment for delimiter generation
        getAlignment() {
          return this.attrs.textAlign || 'left';
        },
      },
    };
  },
});

// Custom table serializer
const CustomTable = Table.extend({
  addStorage() {
    return {
      markdown: {
        serialize(state, node, parent) {
          state.inTable = true;
          const alignments: string[] = [];
          
          node.forEach((row, p, i) => {
            state.write('| ');
            row.forEach((col, p, j) => {
              if (j) state.write(' | ');
              const cellContent = col.firstChild;
              if (cellContent.textContent.trim()) {
                state.renderInline(cellContent);
              }
              
              // Capture alignment from header row
              if (i === 0) {
                alignments.push(col.attrs.textAlign || 'left');
              }
            });
            state.write(' |');
            state.ensureNewLine();
            
            // Generate delimiter row with alignment
            if (i === 0) {
              const delimiterRow = alignments.map(align => {
                switch (align) {
                  case 'center': return ':---:';
                  case 'right': return '---:';
                  default: return ':---';
                }
              }).join(' | ');
              state.write(`| ${delimiterRow} |`);
              state.ensureNewLine();
            }
          });
          
          state.closeBlock(node);
          state.inTable = false;
        },
        parse: {
          // handled by markdown-it
        },
      },
    };
  },
});
```

**Pros:**
- Full GFM alignment round-trip
- Better interoperability with other markdown tools

**Cons:**
- Requires extending multiple TipTap nodes
- Must also modify parser to read alignment from `markdown-it`
- Increases complexity and maintenance burden
- `tiptap-markdown` is deprecated anyway

#### Option B: Document as Limitation
**Effort:** Minimal (30 minutes)

Document in user guide that:
1. Alignment is **visual-only** in the editor
2. Alignment markers are not preserved in markdown output
3. If alignment is critical, users can edit the raw markdown

**Pros:**
- Zero additional code
- Aligns with current `tiptap-markdown` behavior
- Can revisit when migrating to official `@tiptap/markdown`

**Cons:**
- Power users may be disappointed
- Alignment lost on re-import

### Recommendation: **Option B for v1.0**

**Rationale:**
1. `tiptap-markdown` is deprecated - any custom work may be throwaway
2. Official `@tiptap/markdown` (TipTap 3.7+) may handle this differently
3. Alignment is rarely critical for most users
4. Can revisit in v1.2+ with proper markdown package migration

---

## 2. Table Resize Handles

### Question
Worth exploring column width adjustment for visual UX? GFM doesn't support widths.

### Current Status

TipTap's `@tiptap/extension-table` **already supports column resizing**:

```typescript
import { TableKit } from '@tiptap/extension-table';

TableKit.configure({
  table: { resizable: true },  // Enables resize handles
});
```

**Key attributes:**
- Stores `colwidth` array on cells (e.g., `[200, 150, 100]`)
- Uses `<colgroup>` for HTML rendering
- CSS class `.column-resize-handle` for visual handles

### Serialization Behavior

| Scenario | Markdown Output |
|----------|-----------------|
| `resizable: true` + widths set | **GFM markdown** (widths lost) |
| `resizable: true` + widths set + `html: true` | **HTML table** with colgroup |

From `tiptap-markdown`:
- If table is "markdown serializable" → GFM output (widths discarded)
- If not serializable (colspan, rowspan, etc.) → Falls back to HTML

### Recommendation: **Enable resize, accept visual-only behavior**

**For Phase 2.5:**
1. Enable `resizable: true` in table config
2. Add CSS for `.column-resize-handle` and `.resize-cursor`
3. Document that column widths are visual-only (not saved to markdown)

**For future (v1.2+):**
- If users demand persistent widths, consider HTML output mode for tables
- Or store widths in frontmatter/metadata (custom solution)

---

## 3. Merge Cells (Colspan/Rowspan)

### Question
GFM doesn't support merged cells. Worth supporting for HTML output?

### Current Status

TipTap fully supports merged cells:

```typescript
// Commands available:
editor.commands.mergeCells();      // Merge selected cells
editor.commands.splitCell();       // Split merged cell
editor.commands.mergeOrSplit();    // Toggle merge/split
```

**Cell attributes:**
```typescript
{
  colspan: 2,  // Spans 2 columns
  rowspan: 3,  // Spans 3 rows
  colwidth: [200, 150],  // Per-column widths
}
```

### Serialization Behavior

From `tiptap-markdown` [table.js#L52-L73](https://github.com/aguingand/tiptap-markdown/blob/main/src/extensions/nodes/table.js#L52-L73):

```javascript
function isMarkdownSerializable(node) {
  // Returns FALSE if any cell has colspan > 1 or rowspan > 1
  if (childNodes(firstRow).some(cell => hasSpan(cell))) {
    return false;
  }
  // ...
}

function hasSpan(node) {
  return node.attrs.colspan > 1 || node.attrs.rowspan > 1;
}
```

**If table has merged cells:**
1. `isMarkdownSerializable()` returns `false`
2. Table is serialized as **HTML** (with `html: true` option)
3. If `html: false`, table outputs as placeholder text

### Recommendation: **Enable merge cells with HTML fallback**

**Configuration:**
```typescript
// In Markdown extension config
Markdown.configure({
  html: true,  // Allow HTML output for complex tables
})
```

**User Experience:**
1. Simple tables → Clean GFM markdown
2. Tables with merged cells → HTML in markdown file
3. Both parse back correctly

**Documentation needed:**
- "Merged cells will be saved as HTML, not GFM markdown"
- "HTML tables may not render in all markdown viewers"

---

## Implementation Summary

### For v1.0 (Current)

| Feature | Action | Notes |
|---------|--------|-------|
| Alignment | Document as limitation | Visual-only, not persisted |
| Column resize | Already enabled via `resizable: true` | Visual-only, widths discarded |
| Merge cells | Enable commands | Falls back to HTML output |

### For v1.2+ (Future)

| Feature | Consideration |
|---------|---------------|
| Alignment | Implement after migrating to `@tiptap/markdown` |
| Column widths | Consider frontmatter storage or HTML-only mode |
| MultiMarkdown | Support alignment/merge in non-GFM formats |

---

## Code Changes Recommended

### 1. Ensure HTML mode is enabled
```typescript
// In extensions/index.ts
import { Markdown } from 'tiptap-markdown';

Markdown.configure({
  html: true,  // Required for merged cells to output correctly
  // ... other options
})
```

### 2. Add alignment UI (visual-only)
```typescript
// Already works via TextAlign extension on paragraphs in cells
// Or use setCellAttribute command:
editor.commands.setCellAttribute('textAlign', 'center');
```

### 3. Document limitations in user guide

```markdown
## Table Editing Notes

### Column Alignment
Alignment (left/center/right) is visual-only in the editor. 
When saved to markdown, alignment markers (`:---:`) are not preserved.

### Column Widths  
Column widths can be adjusted by dragging column borders.
Widths are visual-only and not saved to the markdown file.

### Merged Cells
You can merge cells using the "Merge Cells" button.
Tables with merged cells are saved as HTML, not GFM markdown.
```

---

## References

- [tiptap-markdown table.js](https://github.com/aguingand/tiptap-markdown/blob/main/src/extensions/nodes/table.js)
- [TipTap Table Extension](https://tiptap.dev/docs/editor/extensions/nodes/table)
- [TipTap TextAlign Extension](https://tiptap.dev/docs/editor/extensions/functionality/text-align)
- [GFM Table Spec](https://github.github.com/gfm/#tables-extension-)

---

*Research complete. Ready for Builder to implement documentation updates.*
