# Reviewer Handoff: RendMD v1.1 — AI Writing Assistant

> **Date:** 2026-02-10
> **Reviewer:** GitHub Copilot (Reviewer Agent)
> **Status:** ✅ Approved

---

## Summary

v1.1 adds a comprehensive AI writing assistant across 7 phases — service layer, desktop chat panel, quick transforms, ghost text, mobile bottom sheet, settings, and polish. The architecture is solid, the code quality is high, and the implementation follows the spec closely. **3 new ESLint errors and 1 IDE TypeScript error need fixing** before merge.

---

## Verification Results

| Check | Result | Notes |
|-------|--------|-------|
| Tests | ✅ 152 passed (11 files) | 24 new AI tests (prompts, AIService, aiStore) |
| TypeScript (build) | ✅ 0 errors | `tsc -b` passes cleanly |
| TypeScript (IDE) | ⚠️ 1 error | `encryption.ts:22` — Uint8Array/BufferSource compat |
| ESLint | ⚠️ 6 errors (3 new) | 3 pre-existing BubbleMenu + 3 new |
| Build | ✅ Success | 429 KB main (128 KB gzip) |
| Bundle size | ℹ️ +27 KB (+7.7 KB gzip) | From 402→429 KB. Reasonable for AI service layer + Anthropic SDK |

---

## Issues Found

### 🟡 Medium — 3 New ESLint Errors

| # | File | Line | Rule | Issue | Suggested Fix |
|---|------|------|------|-------|---------------|
| 1 | `Editor.tsx` | 421 | `jsx-a11y/no-autofocus` | `autoFocus` on custom prompt input | Use `useEffect` + `ref.focus()`, or `eslint-disable-next-line` with justification |
| 2 | `GhostText/index.ts` | 37 | `@typescript-eslint/no-this-alias` | `const extension = this;` captures `this` for use in Plugin closure | `eslint-disable-next-line` with comment: "Needed to access TipTap extension options inside ProseMirror plugin closure" |
| 3 | `GhostText/index.ts` | 163 | `@typescript-eslint/no-unused-vars` | `_view` parameter in `update(_view: EditorView)` | Change to `update()` (drop param) or add `eslint-disable-next-line` |

### 🟡 Medium — 1 IDE TypeScript Error

| # | File | Line | Issue | Suggested Fix |
|---|------|------|-------|---------------|
| 4 | `encryption.ts` | 22 | `Uint8Array<ArrayBufferLike>` not assignable to `BufferSource` — TS 5.x strict generics | Cast: `seed as BufferSource` or use `seed.buffer as ArrayBuffer` |

> Note: This doesn't block the build (`tsc -b` passes), but it shows as a red squiggly in the IDE, which is a poor DX signal.

### 🟢 Minor — Dead Code

| # | File | Line | Issue |
|---|------|------|-------|
| 5 | `AIBottomSheet.tsx` | ~44-45 | Identical branches: `hasSelection ? ['peek', 'half', 'full'] : ['peek', 'half', 'full']` — ternary is no-op |

---

## What Works Well

1. **Clean architecture** — Provider adapter pattern is exactly right. Types, service facade, and store are well-separated.
2. **Streaming** — All 3 providers handle SSE correctly with AbortController cancellation. Partial content is preserved on cancel.
3. **Encryption** — AES-GCM + PBKDF2 (100k iterations) with random per-session seed. Appropriate for client-side obfuscation.
4. **Ghost text** — Excellent ProseMirror plugin. Properly debounced, uses widget decorations, skips code blocks, verifies cursor hasn't moved before dispatching.
5. **Anthropic dynamic import** — Using `import()` to lazy-load `@anthropic-ai/sdk` avoids unnecessary bundle for users who only use OpenAI/Gemini.
6. **Store design** — Zustand persist correctly partializes (only settings, not transient state). IndexedDB for chat history is correct.
7. **Bottom sheet** — Velocity-based flick detection with proper scroll-lock awareness is well-implemented.
8. **BubbleMenu AI button** — Always visible (dimmed when no key) with informative tooltip. Good progressive disclosure.
9. **Test quality** — `buildMessages` tests cover 7 scenarios including truncation and fallback. aiStore tests cover panel, keys, providers, pending results, streaming error path.

---

## Architecture Review

### Data Flow
```
User Action → AIStore.sendMessage → streamCompletion → Provider.streamCompletion → SSE → store.streamingContent → UI
                                                                                                                    ↓
Quick Action → executeQuickAction → buildMessages → streamCompletion → Provider → result → Editor.insertContentAt → pendingResult bar
```

### New File Summary

| File | LOC | Purpose |
|------|-----|---------|
| `src/services/ai/types.ts` | 65 | AI type definitions |
| `src/services/ai/encryption.ts` | 63 | AES-GCM key encryption |
| `src/services/ai/prompts.ts` | 71 | System prompt templates |
| `src/services/ai/AIService.ts` | 106 | Service facade |
| `src/services/ai/providers/openai.ts` | 103 | OpenAI adapter |
| `src/services/ai/providers/anthropic.ts` | 108 | Anthropic adapter |
| `src/services/ai/providers/google.ts` | 137 | Gemini adapter |
| `src/stores/aiStore.ts` | 339 | Zustand AI store |
| `src/components/AI/AIPanel.tsx` | 203 | Desktop chat panel |
| `src/components/AI/AIChatMessage.tsx` | 76 | Chat message bubble |
| `src/components/AI/AIPromptInput.tsx` | 90 | Shared prompt input |
| `src/components/AI/AIProviderPicker.tsx` | 69 | Model/provider dropdown |
| `src/components/AI/AIQuickActions.tsx` | 146 | Floating action menu |
| `src/components/AI/AIResultPreview.tsx` | 44 | Accept/Revert/Retry bar |
| `src/components/AI/AISettingsSection.tsx` | 283 | Settings modal section |
| `src/components/AI/AIBottomSheet.tsx` | 402 | Mobile bottom sheet |
| `src/components/AI/index.ts` | 8 | Barrel export |
| `src/components/Editor/extensions/GhostText/index.ts` | 176 | ProseMirror ghost text plugin |
| `src/components/UI/BottomSheet.tsx` | 111 | Reusable bottom sheet |
| `src/hooks/useBottomSheet.ts` | 184 | Touch gesture + detents hook |
| **Total new** | **~2,883** | |

### Modified Files

| File | Change Summary |
|------|---------------|
| `App.tsx` | AI panel + bottom sheet integration, Ctrl+Shift+A shortcut |
| `Editor.tsx` | Ghost text, quick actions, result preview, Ctrl+J shortcut |
| `EditorToolbar.tsx` | Mobile AI sparkle button |
| `BubbleMenu.tsx` | Desktop AI sparkle button (always visible) |
| `Header.tsx` | AI toggle button (Sparkles icon) |
| `SettingsModal.tsx` | AI settings section, scrollable body |
| `editor-styles.css` | Ghost text CSS class |
| `extensions/index.ts` | GhostText extension registration |
| `hooks/index.ts` | useBottomSheet export |
| `shortcuts.ts` | AI shortcuts added |
| `package.json` | `@anthropic-ai/sdk` dependency |

---

## Test Coverage

| Test File | Tests | Coverage Area |
|-----------|-------|---------------|
| `prompts.test.ts` | 10 | SYSTEM_PROMPTS, translatePrompt, customPrompt, buildMessages |
| `AIService.test.ts` | 5 | PROVIDER_META, getDefaultModel |
| `aiStore.test.ts` | 9 | Panel toggle, API keys, providers, pending results, ghost text, sendMessage error |

### Missing Test Coverage (not blocking)
- Provider adapters (would require mocking fetch/SDK — appropriate for integration tests)
- Encryption round-trip (requires Web Crypto API mock)
- Ghost text ProseMirror plugin (requires editor instance mock)
- Bottom sheet touch gestures (requires touch event simulation)
- AISettingsSection component (UI test)

---

## Recommendation

**Fix the 4 issues (3 ESLint + 1 IDE TS), then approved for merge.**

All fixes are mechanical (eslint-disable comments or minor refactors) — no architectural changes needed.

---

## Pre-existing Issues (unchanged)

- 3 `react-hooks/rules-of-hooks` errors in `BubbleMenu.tsx` (conditional early return before hooks — tracked since v1.0.6)
