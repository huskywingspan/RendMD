# Builder Sprint: Mobile Fixes + Bubble Menu + Context Injection

> **From:** Researcher  
> **Date:** 2026-02-10  
> **Sprint Goal:** Fix critical bubble menu regression, fix mobile AI panel UX issues, reduce agent context injection

---

## Objective

Address bugs and UX issues found during mobile testing of the v1.1 AI agent mode sprint, plus a critical desktop regression where the bubble menu no longer appears.

---

## Priority Order

1. **Bubble Menu** — Critical regression, blocks core editing UX
2. **Keyboard pushes input** — High, blocks mobile AI chat usability
3. **Solid background** — Medium, text illegibility
4. **Bottom clipping** — Medium, content hidden behind browser chrome
5. **Always-visible affordance** — Medium, discoverability
6. **Context injection** — Medium, token efficiency for agent mode
7. **Chat input size** — Low, cosmetic
8. **Apply undo UI** — Low, nice-to-have

---

## Task 1: Fix Bubble Menu (CRITICAL)

**Files:** `src/components/Editor/BubbleMenu.tsx`

Two bugs prevent the bubble menu from appearing:

### Bug A: Orphaned blur listeners

The `useEffect` at ~line 88 registers a blur handler with an anonymous arrow function, then attempts to unsubscribe with a *different* anonymous function. Since each `() => setIsVisible(false)` is a new reference, `editor.off()` never actually removes the original handler. Blur handlers accumulate, and `isVisible` gets stuck at `false`.

**Current code (broken):**
```typescript
editor.on('blur', () => setIsVisible(false));
return () => {
  editor.off('selectionUpdate', updatePosition);
  editor.off('blur', () => setIsVisible(false)); // ← new ref, doesn't unsubscribe
};
```

**Fix:** Use a stable reference:
```typescript
const handleBlur = () => setIsVisible(false);
editor.on('selectionUpdate', updatePosition);
editor.on('blur', handleBlur);
return () => {
  editor.off('selectionUpdate', updatePosition);
  editor.off('blur', handleBlur);
};
```

### Bug B: Conditional return before hooks (React rules violation)

At ~line 41, there's an early `return null` for touch devices that happens **after** `useRef`/`useState` but **before** `useCallback`/`useEffect`. This violates React's rules of hooks — hooks must always execute in the same order.

**Current code (broken):**
```typescript
const isTouchDevice = typeof window !== 'undefined' && ...;
if (isTouchDevice) return null;  // ← hooks below are skipped
const updatePosition = useCallback(() => { ... }, [...]); // ← conditional hook
```

**Fix:** Move all hooks above the early return. Guard the effects internally:
```typescript
// Move ALL useCallback/useEffect ABOVE this point
// Then:
if (isTouchDevice) return null;
```

Or wrap the return in a final check after all hooks have run.

**Acceptance Criteria:**
- [ ] Selecting text shows the bubble menu (desktop)
- [ ] Ctrl+Space toggles bubble menu at cursor
- [ ] Ctrl+J opens AI quick actions from bubble menu sparkle button
- [ ] Bubble menu disappears on blur, reappears on next selection
- [ ] No React hook warnings in console on touch devices

---

## Task 2: Keyboard Pushes Input Up (HIGH)

**Files:** `src/hooks/useBottomSheet.ts` or `src/components/UI/BottomSheet.tsx`

**Problem:** When the mobile keyboard opens, the `position: fixed` bottom sheet doesn't move. The textarea where the user types is hidden behind the keyboard.

**Fix:** Use the `visualViewport` API to detect keyboard and adjust:

```typescript
// In BottomSheet.tsx or useBottomSheet.ts
const [keyboardOffset, setKeyboardOffset] = useState(0);

useEffect(() => {
  const vv = window.visualViewport;
  if (!vv) return;
  const handler = () => {
    // Difference between full viewport and visual viewport = keyboard height
    const offset = window.innerHeight - vv.height - vv.offsetTop;
    setKeyboardOffset(Math.max(0, offset));
  };
  vv.addEventListener('resize', handler);
  vv.addEventListener('scroll', handler);
  return () => {
    vv.removeEventListener('resize', handler);
    vv.removeEventListener('scroll', handler);
  };
}, []);
```

Then apply `bottom: ${keyboardOffset}px` to the sheet container style, or subtract from the `maxHeight`.

**Acceptance Criteria:**
- [ ] Opening keyboard on mobile pushes the chat input into view
- [ ] User can see what they're typing at all times
- [ ] Sheet returns to normal position when keyboard dismisses

---

## Task 3: Solid Background

**Files:** `src/components/UI/BottomSheet.tsx`

**Problem:** The sheet's `bg-[var(--theme-bg-secondary)]` may have transparency in some themes, letting document text show through and making AI panel text illegible.

**Fix:** Make the background explicitly opaque. Change the sheet container class:

```tsx
// Current
'bg-[var(--theme-bg-secondary)] shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',

// Fixed — add backdrop-blur as safety net, and ensure full opacity
'bg-[var(--theme-bg-secondary)] backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)]',
```

If `--theme-bg-secondary` is semi-transparent across themes, consider adding a hardcoded fallback or using `--theme-bg-primary` which is typically opaque.

**Acceptance Criteria:**
- [ ] No document text visible through the bottom sheet in any theme
- [ ] Text in the AI panel is fully legible

---

## Task 4: Bottom Clipping (Browser Chrome)

**Files:** `src/components/UI/BottomSheet.tsx`

**Problem:** The sheet uses `maxHeight: '90vh'` and `paddingBottom: 'env(safe-area-inset-bottom)'`. But `vh` doesn't account for mobile browser chrome (tab bar, bookmark bar), so the bottom of the sheet clips behind browser UI. `env(safe-area-inset-bottom)` only covers hardware safe areas (notch/home indicator), not browser chrome.

**Fix:**
1. Replace `vh` with `dvh` (dynamic viewport height) which excludes browser chrome:
   ```tsx
   maxHeight: '90dvh',  // falls back to 90vh in unsupported browsers
   ```
2. Use `dvh` in the content area too:
   ```tsx
   style={{ maxHeight: 'calc(90dvh - 24px - env(safe-area-inset-bottom))' }}
   ```
3. For extra safety, add bottom padding:
   ```tsx
   paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
   ```

**Acceptance Criteria:**
- [ ] Bottom of AI chat panel (including send button) is fully visible above browser chrome
- [ ] Works in Chrome Android, Safari iOS

---

## Task 5: Always-Visible AI Affordance

**Files:** `src/App.tsx`, `src/components/UI/BottomSheet.tsx`, `src/hooks/useBottomSheet.ts`

**Problem:** The AI bottom sheet only appears when explicitly opened via toolbar button. There's no persistent handle at the bottom of the screen. User reported not realizing they could pull the panel out.

**Approach:** Add a `closed` detent to the bottom sheet system — a minimal 48-56px bar showing just the grab handle and "AI Assistant" label. Always render the `AIBottomSheet` on touch devices instead of conditionally.

**Changes:**

1. In `useBottomSheet.ts`, add `'closed'` to `BottomSheetDetent` type:
   ```typescript
   export type BottomSheetDetent = 'closed' | 'peek' | 'half' | 'full';
   ```
   And add it to `detentToFraction`:
   ```typescript
   case 'closed':
     return 1 - closedHeight / vh;  // e.g., 48px
   ```

2. In `App.tsx`, always render `AIBottomSheet` on touch devices (not gated by `aiBottomSheetOpen`):
   ```tsx
   {isTouchDevice && (
     <Suspense fallback={null}>
       <AIBottomSheet
         isOpen={true}
         onClose={() => {/* snap to closed detent instead of unmounting */}}
         ...
       />
     </Suspense>
   )}
   ```

3. In `AIBottomSheet.tsx`, update detents to include `closed`:
   ```typescript
   const detents: BottomSheetDetent[] = ['closed', 'peek', 'half', 'full'];
   const defaultDetent: BottomSheetDetent = 'closed';
   ```

4. In `BottomSheet.tsx`, show a minimal UI at the `closed` detent — just the grab bar + a small "AI Assistant ✨" label.

**Acceptance Criteria:**
- [ ] On mobile, a small handle/bar is always visible at the bottom
- [ ] Dragging up from closed → peek → half → full
- [ ] Dragging down past closed dismisses to closed (doesn't unmount)
- [ ] Tapping the closed bar snaps to peek

---

## Task 6: Reduce Context Injection for Agent Mode

**Files:** `src/stores/aiStore.ts`

**Problem:** In `sendMessage`, even when the agent has `read_document` available, 2000 chars of raw document content are injected as a system message. This wastes tokens — the model can use its tools for full context.

**Fix:** In agent mode, replace the 2000-char dump with a lightweight summary. Keep the full injection for streaming fallback (which has no tools).

In the `sendMessage` function, replace the context injection block (~lines 112-121) with:

```typescript
// Add document context — lightweight for agent mode, full for streaming
if (provider.generateWithTools && editor) {
  // Agent mode: just metadata + preview (model has read_document tool)
  const docText = editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n');
  const lines = docText.split('\n');
  const firstHeading = lines.find(l => l.startsWith('#')) ?? '';
  const preview = docText.slice(0, 150).trim();
  const fileName = get().currentDocumentId ?? 'Untitled';
  completionMessages.push({
    role: 'system',
    content: `Document: "${fileName}" (${lines.length} lines, ${docText.split(/\\s+/).length} words)\nFirst heading: ${firstHeading}\nPreview: ${preview}...\n\nUse read_document and search_document tools for full content.`,
  });
} else {
  // Streaming fallback: no tools available, send truncated content
  if (context?.documentContent) {
    completionMessages.push({
      role: 'system',
      content: `The user's document content (truncated to 2000 chars):\n${context.documentContent.slice(0, 2000)}`,
    });
  }
}

// Selected text is always useful context (small, specific)
if (context?.selectedText) {
  completionMessages.push({
    role: 'system',
    content: `Currently selected text:\n${context.selectedText}`,
  });
}
```

Note: The selected text injection should remain in both paths — it's small and directly relevant to the user's intent.

**Acceptance Criteria:**
- [ ] Agent mode messages don't include 2000-char document dump
- [ ] Agent mode messages include filename, line count, word count, first heading, ~150-char preview
- [ ] Streaming fallback (no editor/no tool support) still sends 2000-char context
- [ ] Selected text is always included when present

---

## Task 7: Wider Chat Input at Peek

**Files:** `src/components/AI/AIBottomSheet.tsx`

**Problem:** The textarea at `rows={1}` feels cramped at the `peek` detent, making users think the panel can't expand.

**Fix:**
- Change to `rows={2}` or set `minHeight: 44px` (mobile tap target)
- Update placeholder to hint at expandability: `"Ask AI anything… drag up for full chat"`

**Acceptance Criteria:**
- [ ] Chat input is at least 2 lines tall at peek state
- [ ] Placeholder text hints at drag-to-expand

---

## Task 8: Apply Button Undo UI for Chat Messages

**Files:** `src/components/AI/AIPanel.tsx`, `src/components/AI/AIBottomSheet.tsx`, `src/stores/aiStore.ts`

**Problem:** When a user clicks "Apply" on a chat message, the text is inserted/replaced but there's no Accept/Revert bar like quick actions get. The only undo is Ctrl+Z.

**Fix:** After `handleApply` runs on a chat message, call `setPendingResult` with the applied content so the Accept/Revert bar appears:

```typescript
const handleApply = useCallback((text: string) => {
  if (!editor) return;
  const { from, to } = editor.state.selection;
  const original = from !== to ? editor.state.doc.textBetween(from, to, '\n') : '';
  if (from !== to) {
    editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, text).run();
  } else {
    editor.chain().focus().insertContentAt(from, text).run();
  }
  setPendingResult({ original, replacement: text, action: 'apply' });
}, [editor, setPendingResult]);
```

**Acceptance Criteria:**
- [ ] Clicking "Apply" on a chat message shows the Accept/Revert bar
- [ ] "Revert" undoes the applied text
- [ ] "Accept" dismisses the bar

---

## Testing Notes

- **Bubble menu (Task 1):** Test on desktop with mouse selection, Ctrl+Space, and Ctrl+J. Verify no console warnings. Also verify bubble menu still doesn't appear on touch devices (intentional).
- **Mobile tasks (2-5, 7):** Test on actual device or Chrome DevTools mobile emulation. Test with Chrome Android and Safari iOS if possible. Try opening keyboard, dragging sheet, switching themes.
- **Context injection (Task 6):** Add a `console.log` temporarily to verify what system messages are sent in agent mode vs streaming mode. Confirm agent still reads the document via tools when asked to make edits.
- **Apply undo (Task 8):** Send a chat message, click Apply on the response, verify Accept/Revert bar appears.

---

## Files Changed Summary

| File | Tasks |
|------|-------|
| `src/components/Editor/BubbleMenu.tsx` | 1 |
| `src/hooks/useBottomSheet.ts` | 2, 5 |
| `src/components/UI/BottomSheet.tsx` | 2, 3, 4, 5 |
| `src/components/AI/AIBottomSheet.tsx` | 5, 7 |
| `src/App.tsx` | 5 |
| `src/stores/aiStore.ts` | 6 |
| `src/components/AI/AIPanel.tsx` | 8 |
