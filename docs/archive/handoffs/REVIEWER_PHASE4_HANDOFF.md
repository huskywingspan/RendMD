# Reviewer Handoff: Phase 4 - Images & Navigation

> **Created:** 2026-02-08  
> **Phase:** 4  
> **Researcher Spec:** [.github/agents/HANDOFF_BUILDER_PHASE4.md](../agents/HANDOFF_BUILDER_PHASE4.md)

---

## Review Summary

**Status:** ✅ Approved (after 5+ rounds of bug fixes)

Phase 4 implementation has been thoroughly tested and all critical bugs resolved. The final build passes with 0 errors, 0 warnings. Local image insertion was redesigned mid-review to remove File System Access API dependency, resulting in a simpler and more portable solution.

---

## What Was Implemented

### Phase 4A: Image Handling

| Feature | Status | Notes |
|---------|--------|-------|
| Drag-drop image onto editor | ✅ Working | Opens ImageInsertModal with file data |
| Paste image from clipboard | ✅ Working | Same flow as drag-drop |
| Image Insert Modal (3 tabs) | ✅ Working | URL / Local File / Embed (Base64) |
| URL tab | ✅ Working | Paste URL, set alt text, insert |
| Local File tab | ✅ Working | **Redesigned** — editable path field, not FS API dependent |
| Embed tab | ✅ Working | Lazy base64 conversion, file size warning >5MB |
| CustomImage extension | ✅ Working | `localPath` attribute for markdown serialization |
| Image button in BubbleMenu | ✅ Working | Opens file picker |
| Ctrl+Shift+I shortcut | ✅ Working | Opens file picker directly |
| Ctrl+Space force toolbar | ✅ Working | Shows BubbleMenu at cursor without selection |

### Phase 4B: Table of Contents

| Feature | Status | Notes |
|---------|--------|-------|
| `useTOC` hook | ✅ Working | Extracts headings from ProseMirror doc |
| TOCPanel sidebar component | ✅ Working | Hierarchical with indent + active highlight |
| Click-to-scroll | ✅ Working | Uses `requestAnimationFrame` + `scrollIntoView` |
| Active heading tracking | ✅ Working | Scroll listener + manual set on click |

### Phase 4C: Keyboard Shortcuts Help

| Feature | Status | Notes |
|---------|--------|-------|
| ShortcutsModal | ✅ Working | Grouped by category, searchable |
| Ctrl+H trigger | ✅ Working | Originally Ctrl+?, changed due to browser conflict |
| Header keyboard button | ✅ Working | Opens shortcuts modal |

---

## Bugs Found & Fixed During Testing

### Critical

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 1 | **TOC freeze** — Clicking any TOC item froze the entire editor | `editor.commands.setTextSelection(item.pos)` called with stale positions caused ProseMirror to hang | Removed `setTextSelection` entirely; use `requestAnimationFrame` + DOM `scrollIntoView` instead |
| 2 | **Local File tab always shows "Save first"** | `canSaveLocally` checked `hasNativeFS` which was `false` on Brave browser (even with Shields down) | Complete redesign: removed FS API dependency, replaced with simple editable path field |

### Medium

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 3 | **Ctrl+? not working** | Browser intercepted Ctrl+Shift+/ before the app could handle it | Changed shortcut to Ctrl+H |
| 4 | **TOC active highlight not updating on click** | `scrollToHeading` no longer calls `setTextSelection`, so scroll event may not fire | Added manual `setActiveTocId(item.id)` call in `handleTocItemClick` |
| 5 | **Image with relative path not displaying** | Browser resolved `photo.png` to `localhost:5173/photo.png` | Created `CustomImage` extension: stores data URL in `src` (display) + relative path in `localPath` (markdown serialization) |

### Minor

| # | Bug | Root Cause | Fix |
|---|-----|-----------|-----|
| 6 | No H3 button in BubbleMenu | Not included in original implementation | Added `Heading3` button from lucide-react |
| 7 | No Image button in BubbleMenu | Not included in original implementation | Added `Image` button with `onImageClick` callback |

---

## Architecture Decisions Made During Review

### ADR: Local File Tab Redesign

**Context:** The original researcher spec called for an assets-folder approach using the File System Access API to save images to `assets/` next to the `.md` file. Testing revealed that Brave browser (and potentially other privacy-focused browsers) block the File System Access API entirely, even when opening files via `<input type="file">`.

**Decision:** Replace the complex FS API-dependent Local File tab with a simple editable path field. User types a relative path (e.g., `photo.png` or `assets/photo.png`), and the app:
1. Reads the file data into a base64 data URL for editor display
2. Stores the relative path in the `localPath` attribute
3. On markdown serialization, outputs the `localPath` instead of the data URL

**Consequence:** The `useImageAssets` hook's `saveImage` function is no longer used by the main flow. The hook still exists and exports `hasNativeFS` for potential future use, but the primary image insertion path has no browser API dependency.

### ADR: CustomImage Extension

**Context:** When a user inserts a local image with a relative path, the browser cannot resolve it (e.g., `photo.png` becomes `http://localhost:5173/photo.png`). The image needs to display in the editor while serializing differently to markdown.

**Decision:** Extend TipTap's `Image` with a `localPath` attribute. The custom `addStorage().markdown.serialize` function checks for `localPath` first, falling back to `src`. The `localPath` is stored as `data-local-path` HTML attribute.

**Consequence:** Images display correctly in the editor via data URL, and the markdown output contains the short relative path. Round-trip is intentionally lossy for local images (re-opening won't restore the data URL display without the original file).

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `src/hooks/useTOC.ts` | TOC heading extraction + scroll-to-heading |
| `src/hooks/useImageAssets.ts` | Image asset management (simplified, partially unused) |
| `src/components/Modals/ShortcutsModal.tsx` | Keyboard shortcuts help dialog |
| `src/components/Modals/ImageInsertModal.tsx` | 3-tab image source picker |
| `src/components/Modals/index.ts` | Barrel export |
| `src/components/Sidebar/TOCPanel.tsx` | TOC sidebar UI |
| `src/utils/imageHelpers.ts` | Base64 conversion, filename sanitization, file size formatting |
| `src/utils/shortcuts.ts` | Shortcut definitions + category labels |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/Editor/extensions/index.ts` | Added `CustomImage` with `localPath` + markdown serializer |
| `src/components/Editor/BubbleMenu.tsx` | Added Image button, H3, `forceVisible`, `onImageClick` |
| `src/components/Editor/Editor.tsx` | Added `onEditorReady`/`onImageFile` props, drop/paste handlers, Ctrl+Space |
| `src/components/Editor/index.ts` | Added `EditorProps` type export |
| `src/components/Sidebar/Sidebar.tsx` | Integrated `TOCPanel`, added `onTocItemClick` prop |
| `src/components/Sidebar/index.ts` | Added `TOCPanel` export |
| `src/components/Header/Header.tsx` | Added keyboard shortcuts button |
| `src/App.tsx` | Added image modal state, TOC handler, editor instance management, all image insert callbacks |
| `src/stores/editorStore.ts` | Added `tocItems`, `activeTocId`, `shortcutsModalOpen` + setters |
| `src/hooks/index.ts` | Added `useTOC`, `scrollToHeading`, `useImageAssets` exports |
| `src/hooks/useFileSystem.ts` | Added `sharedFileHandle` singleton + getter/setter |
| `src/types/index.ts` | Added `TOCItem`, `ShortcutEntry` interfaces |
| `docs/PROJECT_PLAN.md` | Updated Phase 2.5 and 3 to ✅ COMPLETE, version bump to 0.7.0 |

---

## Browser Compatibility Notes

| Browser | File System Access API | Local File Tab | Open/Save |
|---------|----------------------|----------------|-----------|
| Chrome/Edge | ✅ Available | ✅ Works (path field) | ✅ Native picker |
| Firefox/Safari | ❌ Not available | ✅ Works (path field) | ⚠️ Fallback `<input>` + download |
| Brave | ❌ Blocked by Shields | ✅ Works (path field) | ⚠️ Fallback `<input>` + download |

The Local File tab redesign means all browsers have the same experience for local image insertion. The File System Access API limitation only affects file open/save operations.

---

## Test Coverage Assessment

| Area | Manual Testing | Automated Tests | Coverage |
|------|---------------|-----------------|---------|
| Image drag-drop | ✅ Tested | ❌ None | Manual only |
| Image paste | ✅ Tested | ❌ None | Manual only |
| Image modal (3 tabs) | ✅ Tested | ❌ None | Manual only |
| CustomImage markdown round-trip | ✅ Tested | ❌ None | **Needs unit test** |
| TOC extraction | ✅ Tested | ❌ None | **Needs unit test** |
| TOC scroll-to-heading | ✅ Tested | ❌ None | Manual only |
| ShortcutsModal | ✅ Tested | ❌ None | Manual only |
| Keyboard shortcuts | ✅ Tested | ❌ None | Manual only |
| `imageHelpers.ts` utilities | Not separately | ❌ None | **Needs unit tests** |

**Recommendation:** Priority unit tests should be:
1. `imageHelpers.ts` — pure functions, easy to test
2. CustomImage markdown serialization — critical for data integrity
3. `useTOC` heading extraction — testable with mock editor

---

## Open Items for Researcher

### Questions

1. **Round-trip lossy for local images** — When a markdown file with `![alt](photo.png)` is opened, the editor shows broken image (can't resolve relative path). Is this acceptable, or should we attempt to load local files on open? (Would require FS API or user providing a base directory.)

2. **`useImageAssets` hook** — The `saveImage` function is unused since the Local File tab redesign. Should it be removed, kept for future use, or refactored for a different purpose?

3. **Phase 4 in PROJECT_PLAN.md** — The plan still shows Phase 4 as "⏳ Planned" in the milestone table. Should we update it to ✅ Complete?

### Deferred Items

- **Sync scroll between rendered/source** — Listed in Phase 3 spec, not implemented
- **Theme override from frontmatter** — Listed in Phase 3 spec, deferred
- **Sidebar toggle shortcut** — Listed as "—" (not set) in shortcuts
- **`useImageAssets.saveImage`** — Assets-folder approach built but unused

---

## Recommendation

**Phase 4 is ready for the researcher to review and plan Phase 5.** All features work as tested on Brave (Chromium) and the build is clean. The main risk area is the lack of automated tests — recommend adding at least the `imageHelpers.ts` unit tests before moving on.
