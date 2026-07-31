# Researcher Request: Phase 2 Technical Brief

> **From:** Reviewer Agent  
> **To:** Researcher Agent  
> **Date:** 2026-01-30  
> **Priority:** High  
> **Blocking:** Phase 2 implementation

---

## Context

Phase 1.5 (Visual Polish - Themes + Syntax Highlighting) is complete. We're preparing to begin **Phase 2: Tables & File Operations**. Before Builder starts implementation, we need research on several technical unknowns.

### Phase 2 Scope Summary

| Component | Features |
|-----------|----------|
| **Table Editing** | Cell navigation, click-to-edit, add/remove rows & columns, column alignment, tab navigation |
| **File Operations** | File System Access API, Open/Save/Save As, auto-save with debounce, dirty state indicator, Ctrl+O/Ctrl+S shortcuts |

---

## Research Requests

### 1. File System Access API Compatibility (High Priority)

**What we need to know:**
- Current browser support status (Chrome, Edge, Firefox, Safari)
- Fallback strategies for unsupported browsers
- Permission model details (persistent vs. one-time)
- Security considerations (sandboxing, user gestures)

**Specific questions:**
1. Can file handles be persisted across sessions (for "recent files" feature)?
2. What's the best practice for the fallback UX on Firefox/Safari?
3. Are there any polyfills or abstractions worth considering?
4. How do we handle the case where a file was deleted/moved between sessions?

**Desired output:**
- Browser support matrix
- Recommended implementation approach (native + fallback)
- Code patterns for common operations
- Known gotchas or limitations

---

### 2. TipTap Table Extension (High Priority)

**What we need to know:**
- Best TipTap table extension to use (`@tiptap/extension-table` vs alternatives)
- Capabilities and limitations
- Markdown round-trip fidelity with `tiptap-markdown`

**Specific questions:**
1. Does `@tiptap/extension-table` work with `tiptap-markdown` out of the box?
2. Can it handle GFM table alignment syntax (`|:---|:---:|---:|`)?
3. What's the add/remove row/column API?
4. How does cell navigation (tab, arrows) work?
5. Are there any known issues with complex tables (merged cells, nested content)?

**Desired output:**
- Extension recommendation with rationale
- Integration guide with `tiptap-markdown`
- API reference for table operations
- Round-trip test cases to validate

---

### 3. Table-to-Markdown Serialization (Medium Priority)

**What we need to know:**
- How `tiptap-markdown` handles table serialization
- Whether custom serialization rules are needed
- GFM alignment preservation

**Specific questions:**
1. Does `tiptap-markdown` preserve column alignment when serializing?
2. If not, how do we extend the serializer for GFM tables?
3. Are there edge cases with table content (links, code, images in cells)?

**Desired output:**
- Serialization behavior documentation
- Custom serializer pattern if needed
- Test cases for validation

---

### 4. Auto-save Strategy with File System Access API (Medium Priority)

**What we need to know:**
- Best practices for auto-save with native file access
- Handling permission expiration
- Preventing data loss on browser crash

**Specific questions:**
1. Should we use `showSaveFilePicker` once, then `write()` for auto-save?
2. How do we handle permission prompts during auto-save (minimize interruption)?
3. Is there value in caching content to IndexedDB as a backup?
4. What's the recommended debounce interval?

**Desired output:**
- Recommended auto-save flow
- Permission handling strategy
- Data loss prevention approach

---

### 5. Dirty State Management (Low Priority)

**What we need to know:**
- Best practices for tracking unsaved changes
- Browser `beforeunload` event handling
- Visual indicator patterns

**Specific questions:**
1. How do we integrate with TipTap's history to track dirty state?
2. Should we use Zustand or TipTap's internal state for this?
3. What's the UX pattern for the unsaved indicator (dot, asterisk, text)?

**Desired output:**
- State management recommendation
- `beforeunload` integration pattern
- UI/UX recommendations

---

## Deliverable Format

Please produce a **Phase 2 Technical Brief** with:

1. **Executive Summary** - Key findings and recommendations
2. **Browser Support Matrix** - File System Access API compatibility
3. **Table Extension Guide** - Which extension, how to use it
4. **Implementation Patterns** - Code samples for common operations
5. **Risk Assessment** - What could go wrong, mitigations
6. **Test Cases** - Round-trip scenarios to validate

---

## Timeline

**Requested by:** Before Phase 2 sprint kickoff  
**Urgency:** High - blocking Builder's work

---

## Additional Context

### What We've Built So Far
- TipTap editor with `tiptap-markdown` for round-trip
- Shiki syntax highlighting (theme-aware)
- 4-theme system (dark/light basic, dark/light glass)
- BubbleMenu for formatting
- Link and Image popovers
- Keyboard shortcuts infrastructure

### Current Dependencies
```json
{
  "@tiptap/react": "^2.11.5",
  "@tiptap/starter-kit": "^2.11.5",
  "@tiptap/extension-link": "^2.11.5",
  "@tiptap/extension-image": "^2.11.5",
  "@tiptap/extension-placeholder": "^2.11.5",
  "@tiptap/extension-task-list": "^2.11.5",
  "@tiptap/extension-task-item": "^2.11.5",
  "tiptap-markdown": "^0.8.10",
  "shiki": "^1.27.2"
}
```

### Known Constraints
- Must work in Chrome, Edge, Firefox, Safari (graceful degradation acceptable)
- All files are standard `.md` - no proprietary format
- Round-trip fidelity is critical to product identity

---

**End of Research Request**
