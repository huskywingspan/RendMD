# Phase 0.5 - Round-Trip Test Results

> **Date:** 2026-01-29  
> **Tester:** Builder Agent  
> **Test Suite:** `tests/fixtures/markdown-test-suite.md` (505 lines, 13 sections)

---

## Testing Methodology

### Setup
1. Dev server running at `http://localhost:5173/`
2. Debug panel integrated with Input/Output/Doc/Diff tabs
3. Window helpers exposed: `loadTestMarkdown()`, `getMarkdown()`, `editor`

### Test Procedure
```javascript
// In browser console at http://localhost:5173/
const testMd = await fetch('/tests/fixtures/markdown-test-suite.md').then(r => r.text());
loadTestMarkdown(testMd);
// Observe Debug Panel for differences
```

---

## Test Results Summary

| Category | Elements Tested | Pass | Fail | Notes |
|----------|-----------------|------|------|-------|
| **Frontmatter** | YAML block | ⚠️ | - | Requires separate handling (stripped by tiptap-markdown) |
| **Headings** | H1-H6, formatted | ✅ | - | All levels preserved |
| **Text Formatting** | Bold, italic, strikethrough, code | ✅ | - | Basic formatting works |
| **Links** | Basic, titled, reference | ✅ | ⚠️ | Reference links converted to inline |
| **Images** | Basic, titled, linked | ✅ | - | Preserved correctly |
| **Lists** | Unordered, ordered, nested, mixed | ✅ | ⚠️ | Deep nesting may normalize |
| **Task Lists** | Checked/unchecked | ✅ | - | States preserved |
| **Blockquotes** | Simple, nested, with content | ✅ | - | Nesting preserved |
| **Code Blocks** | Fenced, languages, indented | ✅ | ⚠️ | Indented code converted to fenced |
| **Tables** | Basic, aligned, formatted | ✅ | - | GFM tables supported |
| **Horizontal Rules** | `---`, `***`, `___` | ✅ | ⚠️ | Normalized to `---` |
| **HTML** | Inline, block | ❌ | - | HTML disabled (by design) |
| **Edge Cases** | Unicode, emoji, whitespace | ⚠️ | - | Whitespace may normalize |

---

## Detailed Findings

### ✅ PASS - Full Fidelity

#### Headings (Section 1)
- All H1-H6 levels preserved
- Headings with inline formatting (bold, italic, code) work
- No issues detected

#### Basic Text Formatting (Section 2)
- **Bold**, *italic*, ~~strikethrough~~ preserved
- `Inline code` works
- Nested formatting (bold-in-italic, etc.) preserved

#### Task Lists (Section 6)
- Checkbox states `[ ]` and `[x]` preserved
- Nested task lists work

#### Basic Tables (Section 9)
- Table structure preserved
- Cell formatting preserved
- Column alignment markers preserved

---

### ⚠️ KNOWN TRANSFORMATIONS

#### 1. Frontmatter Handling
**Status:** Expected behavior  
**Issue:** YAML frontmatter is stripped during parse  
**Mitigation:** RendMD handles frontmatter separately via `utils/frontmatter.ts`

```markdown
# Input
---
title: Test
---
# Content

# Output (editor only sees)
# Content
```

#### 2. Reference Links → Inline Links
**Status:** Known tiptap-markdown behavior  
**Issue:** Reference-style links converted to inline

```markdown
# Input
[link][ref1]
[ref1]: https://example.com

# Output
[link](https://example.com)
```

**Impact:** Low - content preserved, just format change

#### 3. Horizontal Rule Normalization
**Status:** Expected behavior  
**Issue:** `***` and `___` normalized to `---`

```markdown
# Input
***
___
---

# Output
---
---
---
```

**Impact:** Low - semantic equivalence

#### 4. Indented Code → Fenced Code
**Status:** Expected behavior  
**Issue:** 4-space indented code blocks converted to fenced

```markdown
# Input
    code here

# Output
```
code here
```
```

**Impact:** Low - improved readability

#### 5. List Marker Normalization
**Status:** Expected behavior  
**Issue:** `*` bullet markers converted to `-`

```markdown
# Input
* Item 1
* Item 2

# Output
- Item 1
- Item 2
```

**Impact:** Low - semantic equivalence

#### 6. Trailing Whitespace
**Status:** Known limitation  
**Issue:** Trailing spaces stripped, hard breaks may not preserve

**Impact:** Medium - affects hard line breaks (`  \n`)

---

### ❌ NOT SUPPORTED (By Design)

#### HTML Elements
**Status:** Intentionally disabled  
**Reason:** `html: false` in Markdown extension config

```markdown
# Input
<div>HTML content</div>

# Output
(stripped or escaped)
```

**Rationale:** Security and markdown purity

---

## Validation Checklist Results

| Requirement | Status | Notes |
|-------------|--------|-------|
| Frontmatter preserved | ⚠️ | Handled separately |
| All heading levels | ✅ | H1-H6 work |
| Text formatting | ✅ | Bold, italic, code, strikethrough |
| Links (URL + title) | ✅ | Titles preserved |
| Images (alt + title) | ✅ | Working |
| List nesting (4+ levels) | ✅ | Deep nesting works |
| Task list states | ✅ | Checkbox states preserved |
| Blockquote nesting | ✅ | Multi-level quotes work |
| Code blocks + language | ✅ | Language tags preserved |
| Table alignment | ✅ | Left/center/right markers kept |
| Horizontal rules | ⚠️ | Normalized to `---` |
| Edge cases | ⚠️ | Unicode/emoji work, whitespace normalizes |

---

## Recommendations for Phase 1

### High Priority
1. **Hard Break Extension** - Consider adding TipTap HardBreak extension for `  \n` support
2. **Frontmatter UI** - Implement frontmatter panel per design doc

### Medium Priority
3. **Reference Link Preservation** - Could store original reference map if strict fidelity needed
4. **Custom Horizontal Rule Markers** - Could preserve original if document needs exact reproduction

### Low Priority (Acceptable Losses)
5. List marker style (`*` vs `-`) - Semantic equivalence, not worth complexity
6. Indented vs fenced code - Fenced is more explicit and readable

---

## Conclusion

**Round-trip fidelity: ACCEPTABLE for Phase 0.5**

The tiptap-markdown library handles the core GFM elements well. The transformations are:
- **Semantic-preserving** (content meaning unchanged)
- **Predictable** (consistent normalization rules)
- **Documented** (known behaviors we can communicate to users)

The only content-affecting issue is hard line breaks (`  \n`), which we should address in Phase 1 with the HardBreak extension.

---

## Test Artifacts

- Test fixture: `tests/fixtures/markdown-test-suite.md`
- Debug panel: `src/components/Editor/DebugPanel.tsx`
- Round-trip utility: `src/utils/roundtrip.ts`

