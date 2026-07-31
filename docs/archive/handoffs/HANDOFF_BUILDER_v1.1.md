# Builder Handoff: RendMD v1.1 — AI Writing Assistant

> **Date:** 2026-02-10  
> **Research:** `docs/research/ai-assistant-ui.md`  
> **Status:** All decisions approved by user. Ready to build.  
> **Depends on:** v1.0.6 (housekeeping) should be complete first

---

## Executive Summary

v1.1 adds AI writing assistance with a three-surface architecture:
1. **Ghost text autocomplete** (desktop) — Tab to accept gray continuation text
2. **Quick transforms** (desktop BubbleMenu + mobile toolbar) — selection-based improve/shorten/expand/tone/translate
3. **AI Chat Panel** (desktop right sidebar + mobile bottom sheet) — full conversation with streaming

Providers: OpenAI + Anthropic + Google Gemini. BYOK model. Streaming required. Per-document chat history via IndexedDB.

---

## Workstream 1: AI Service Layer (Foundation)

**Build this first. Everything else depends on it.**

### 1.1 Provider Adapter Interface

```typescript
// src/services/ai/types.ts

interface AIModel {
  id: string;
  name: string;
  maxTokens: number;
  supportsStreaming: boolean;
}

interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  generateCompletion(params: CompletionParams): Promise<string>;
  streamCompletion(params: CompletionParams): AsyncIterable<string>;
  validateApiKey(key: string): Promise<boolean>;
}

interface CompletionParams {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  model?: string;
  provider?: string;
}

interface AIContext {
  selectedText?: string;
  documentContent?: string;
  cursorPosition?: number;
  precedingText?: string;
}
```

### 1.2 Provider Implementations

#### OpenAI (`src/services/ai/providers/openai.ts`)
- **SDK:** Direct `fetch` to `https://api.openai.com/v1/chat/completions`
- No SDK needed — the REST API is simple and avoids bundle bloat
- **Streaming:** `stream: true` returns SSE — parse with `ReadableStream` + `TextDecoder`
- **Models:** `gpt-4o`, `gpt-4o-mini` (default)
- **Headers:** `Authorization: Bearer ${apiKey}`, `Content-Type: application/json`

#### Anthropic (`src/services/ai/providers/anthropic.ts`)
- **SDK:** `@anthropic-ai/sdk` (required for browser CORS support)
- `npm install @anthropic-ai/sdk`
- **Browser config:** `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`
- **Streaming:** `client.messages.create({ stream: true })` returns async iterable
- **Models:** `claude-sonnet-4-5-20250929` (default), `claude-3-haiku-20240307`
- **Note:** Anthropic uses `max_tokens` (required), messages format differs slightly (no `system` role in messages — separate `system` param)

#### Google Gemini (`src/services/ai/providers/google.ts`)
- **SDK:** Direct `fetch` to `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent`
- **Auth:** API key as query param `?key=${apiKey}`
- **Streaming:** Server-sent events, same parsing as OpenAI
- **Models:** `gemini-2.0-flash` (default), `gemini-2.0-flash-lite`
- **Note:** Gemini message format uses `contents` with `parts` — adapter must translate

### 1.3 API Key Management

```typescript
// src/services/ai/encryption.ts

// Use Web Crypto API for key encryption at rest in localStorage
// This provides obfuscation, not absolute security (client-side limitation)

async function encryptKey(plaintext: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  // Store as base64: iv + ciphertext
  return btoa(String.fromCharCode(...iv, ...new Uint8Array(ciphertext)));
}

async function decryptKey(encrypted: string): Promise<string> {
  const key = await getOrCreateEncryptionKey();
  const data = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

// Encryption key derived from random seed stored in localStorage
// (Key stretching with PBKDF2, 100k iterations)
```

**Storage location:** `localStorage` key `rendmd-ai-keys` (encrypted JSON object)

### 1.4 AI Zustand Store

```typescript
// src/stores/aiStore.ts

interface AIStore {
  // Panel state
  isPanelOpen: boolean;
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;
  
  // Conversation (per-document)
  messages: AIMessage[];
  isStreaming: boolean;
  streamingContent: string; // partial content during streaming
  sendMessage: (prompt: string, context?: AIContext) => Promise<void>;
  cancelStream: () => void;
  clearConversation: () => void;
  
  // Provider
  activeProvider: string; // 'openai' | 'anthropic' | 'google'
  activeModel: string;
  setProvider: (provider: string, model: string) => void;
  
  // Quick action results
  pendingResult: { original: string; replacement: string; action: string } | null;
  acceptResult: () => void;
  rejectResult: () => void;
  
  // Settings  
  apiKeys: Record<string, string>; // provider id → encrypted key
  setApiKey: (provider: string, encryptedKey: string) => void;
  removeApiKey: (provider: string) => void;
  hasApiKey: (provider: string) => boolean;
}
```

**Persistence:** 
- `apiKeys`, `activeProvider`, `activeModel` → persisted with Zustand persist (localStorage)
- `messages` → persisted per-document in IndexedDB via `idb-keyval` (key: `ai-chat-${filePath || 'untitled'}`)
- `isPanelOpen`, `isStreaming`, `pendingResult` → session only (not persisted)

### 1.5 Streaming Implementation Pattern

```typescript
// OpenAI streaming example (Google is similar)
async function* streamOpenAI(params: CompletionParams, apiKey: string): AsyncIterable<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      stream: true,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 1024,
    }),
    signal: params.signal,
  });

  if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
  
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    
    for (const line of lines) {
      if (line.startsWith('data: ') && line !== 'data: [DONE]') {
        const data = JSON.parse(line.slice(6));
        const content = data.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  }
}
```

---

## Workstream 2: Desktop — AI Chat Panel (Right Sidebar)

### 2.1 Panel Component (`src/components/AI/AIPanel.tsx`)

- **Position:** Right of editor area, inline (not floating overlay)
- **Width:** 320px (CSS variable `--ai-panel-width: 320px`)
- **Visibility:** Conditional render based on `aiStore.isPanelOpen`
- **Layout integration:** In `App.tsx`, add as a sibling after the editor area div:

```tsx
<div className="flex-1 flex overflow-hidden">
  {/* Editor area */}
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* ... existing editor content ... */}
  </div>
  
  {/* AI Panel - desktop only */}
  {isPanelOpen && !isMobile && (
    <AIPanel className="w-80 border-l border-[var(--color-border)] hidden md:flex flex-col" />
  )}
</div>
```

### 2.2 Panel Internal Layout

```
┌─ AI Panel Header ────────────────────────┐
│ ✨ AI Assistant    [Model ▾]  [Clear] [✕] │
├──────────────────────────────────────────┤
│                                          │
│  Chat messages (scrollable)              │
│  ┌────────────────────────────────────┐  │
│  │ 🙋 User: Make this more formal    │  │
│  └────────────────────────────────────┘  │
│  ┌────────────────────────────────────┐  │
│  │ 🤖 AI: Here's the revised...      │  │
│  │    [Apply to document] [Copy]      │  │
│  └────────────────────────────────────┘  │
│                                          │
├──────────────────────────────────────────┤
│ ┌──────────────────────────────── [↑]│  │
│ │ Ask AI about your document...      │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

### 2.3 Key Behaviors

- **Streaming display:** AI messages render progressively using `streamingContent` from store. Use a typing animation CSS class.
- **"Apply to document":** If the AI response contains text that looks like a rewrite/transformation, show an "Apply" button. Clicking replaces the current selection or inserts at cursor.
- **Scroll:** Auto-scroll to bottom on new messages. Stop auto-scroll if user has scrolled up.
- **Model picker:** Dropdown showing available models for configured providers. Persisted.
- **Clear button:** Clears conversation for current document.
- **Close:** Sets `isPanelOpen = false`.
- **Empty state:** "Configure an API key in Settings to get started" with link to settings.

### 2.4 Header Integration

Add AI toggle button in `Header.tsx`:
- Icon: `Sparkles` from lucide-react
- Position: Near the settings gear, right side of header
- Tooltip: "AI Assistant (Ctrl+Shift+A)"
- Active state: Highlighted when panel is open
- Hidden on mobile (`hidden sm:inline-flex` or similar — mobile uses bottom sheet instead)

**Shortcut:** `Ctrl+Shift+A` toggles panel. Register in editor keybindings.

---

## Workstream 3: Desktop — Quick Transforms (BubbleMenu)

### 3.1 BubbleMenu Integration

Add a sparkle (✨) icon button to the existing BubbleMenu. When clicked, show a floating action menu.

**File:** Extend existing `BubbleMenu.tsx` or create `AIBubbleMenuExtension.tsx`

```tsx
// In the BubbleMenu, add after existing formatting buttons:
<div className="border-l border-[var(--color-border)] mx-1" /> {/* separator */}
<button onClick={openAIMenu} title="AI Actions (Ctrl+J)">
  <Sparkles size={16} />
</button>
```

### 3.2 Quick Action Floating Menu

When the sparkle button is clicked (or `Ctrl+J` pressed with text selected):

```
┌──────────────────────────┐
│ ✨ Improve writing        │
│ 📝 Make shorter           │
│ 📖 Make longer            │
│ 🎭 Change tone ▸          │  → Formal / Casual / Professional
│ 🌐 Translate ▸            │  → English / Spanish / French / ...
│ ─────────────────────────│
│ 💬 Custom prompt...       │  → Opens text input
└──────────────────────────┘
```

- **Position:** Use Floating UI, anchored below/above selection (like BubbleMenu)
- **Z-index:** z-50 (matches existing overlay convention)
- **Dismiss:** Click outside, Escape key, or action completion

### 3.3 Result Preview (Inline Diff)

After an AI action completes on selected text:

1. Replace the selection text visually with the AI result
2. Show a small floating bar above/below the replaced text:
   ```
   [✓ Accept]  [✕ Revert]  [↻ Retry]
   ```
3. Optionally highlight changes (green for additions, strikethrough red for removals) — nice to have, not required for v1.1
4. **Accept:** Commits the replacement to the document
5. **Revert:** Restores the original text
6. **Retry:** Re-runs the same action

**Implementation:** Use ProseMirror transaction. Store original text in `aiStore.pendingResult`. On accept, the change is already in the doc. On revert, undo the transaction.

### 3.4 Keyboard Shortcut

- `Ctrl+J` — Opens quick AI action menu on current selection
- If no text is selected, `Ctrl+J` could open the AI panel instead (or show a tooltip "Select text first")

---

## Workstream 4: Desktop — Ghost Text Autocomplete

### 4.1 Trigger Conditions

Ghost text appears when:
1. Cursor is at the end of a paragraph (not mid-word)
2. User has paused typing for ~1500ms (debounce)
3. An AI provider is configured and has a valid API key
4. There is at least 1 preceding paragraph of content (don't show on empty doc)

Ghost text does NOT appear when:
- BubbleMenu is open
- AI panel is focused
- User is in a code block (code completion is a different problem)
- Another AI action is in progress

### 4.2 Implementation: ProseMirror Decoration

```typescript
// src/components/Editor/extensions/GhostText/
// 
// This is a TipTap Extension that uses ProseMirror's Decoration API
// to render gray "ghost" text after the cursor position.

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const ghostTextPluginKey = new PluginKey('ghostText');

// The decoration adds a widget decoration (inline DOM node) 
// after the cursor with gray text
// Accept: Tab key
// Dismiss: Escape, any typing, cursor movement, click
```

### 4.3 Ghost Text Styling

```css
.ghost-text {
  color: var(--color-text-secondary);
  opacity: 0.4;
  pointer-events: none;
  user-select: none;
  /* No cursor interaction — ghost text is purely visual */
}
```

### 4.4 API Call Strategy

- Use the cheapest/fastest model available (e.g., `gpt-4o-mini`, `gemini-2.0-flash-lite`, `claude-3-haiku`)
- Send only ~500 tokens of preceding context (not the entire document)
- `maxTokens: 100` (short continuations only)
- `temperature: 0.7`
- Abort previous ghost text request if user types

### 4.5 Desktop Only

Ghost text is explicitly desktop only. **Do not render on touch devices.** Use the existing touch detection pattern:
```typescript
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
```

---

## Workstream 5: Mobile — Bottom Sheet

### 5.1 Component: `AIBottomSheet.tsx`

This is the most complex new UI component. Build it as a **reusable** `<BottomSheet>` that could serve other future needs.

### 5.2 Technical Spec

```typescript
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  detents: ('peek' | 'half' | 'full')[];
  defaultDetent?: 'peek' | 'half' | 'full';
  peekHeight?: number;       // default: 180
  halfHeight?: string;       // default: '50vh'
  fullHeight?: string;       // default: '90vh'
  showBackdrop?: boolean;    // default: true for half/full
  children: React.ReactNode;
}
```

### 5.3 CSS Structure

```css
.bottom-sheet-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 50;
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
  background: var(--color-bg-secondary);
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  transform: translateY(100%);                     /* hidden by default */
  transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1);
  padding-bottom: env(safe-area-inset-bottom);     /* iPhone notch */
  touch-action: none;                              /* we handle our own touches */
  will-change: transform;
}

.bottom-sheet-container.open-peek {
  transform: translateY(calc(100% - 180px));
}

.bottom-sheet-container.open-half {
  transform: translateY(50%);
}

.bottom-sheet-container.open-full {
  transform: translateY(10%);
}

.bottom-sheet-grabber {
  width: 40px;
  height: 4px;
  background: var(--color-text-secondary);
  opacity: 0.4;
  border-radius: 2px;
  margin: 8px auto;
  cursor: grab;
}

.bottom-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 49;
  opacity: 0;
  transition: opacity 300ms;
  pointer-events: none;
}

.bottom-sheet-backdrop.visible {
  opacity: 1;
  pointer-events: auto;
}
```

### 5.4 Touch Gesture Logic (`src/hooks/useBottomSheet.ts`)

```typescript
// Core gesture handling:
// 1. Track touchstart Y position on grabber
// 2. On touchmove, update transform: translateY() in real-time (no transition during drag)
// 3. On touchend:
//    a. Calculate velocity (deltaY / deltaTime)
//    b. If velocity > threshold (fast swipe), go to next/prev detent in swipe direction
//    c. If velocity < threshold (slow drag), snap to nearest detent
// 4. Re-enable CSS transition after snap

// IMPORTANT: Distinguish grabber drag vs content scroll
// - If chat content is scrolled to top AND user swipes down → drag the sheet
// - If chat content is NOT at top → let normal scroll happen
// - Use ref to the scrollable content container to check scrollTop
```

### 5.5 Bottom Sheet Content Layout (AI-specific)

```
At PEEK detent (180px):
┌─────────────────────────────────────┐
│         ═══════  (grabber)          │
│ [✨ Improve] [📝 Shorter] [📖 Longer]│  ← Quick actions (horizontal scroll)
│ [🎭 Tone ▾] [🌐 Translate ▾]       │
│ ┌─────────────────────────────── ↑│ │
│ │ Ask AI anything...               │ │  ← Prompt input
│ └───────────────────────────────── │ │
└─────────────────────────────────────┘

At HALF detent (~50%):
┌─────────────────────────────────────┐
│         ═══════  (grabber)          │
│                                     │
│ 🙋 Make this paragraph more formal  │  ← Chat messages (scrollable)
│ 🤖 Here's the revised version:     │
│    "The quarterly results..."       │
│    [Apply] [Copy] [Retry]           │
│                                     │
│ ┌─────────────────────────────── ↑│ │
│ │ Follow up...                     │ │
│ └───────────────────────────────── │ │
└─────────────────────────────────────┘
```

### 5.6 Mobile Toolbar Integration

Add an AI button to the editor toolbar (visible on mobile):

```tsx
// In EditorToolbar.tsx, add alongside existing buttons:
<button
  onClick={openAIBottomSheet}
  className={cn(
    "toolbar-button",
    hasSelection && "ring-2 ring-[var(--color-accent)]" // highlight when text selected
  )}
  title="AI Assistant"
>
  <Sparkles size={18} />
</button>
```

**Context-aware behavior:**
- If text is selected → bottom sheet opens at Peek with transform actions prominent
- If no text selected → bottom sheet opens at Peek with general prompt input focused

### 5.7 "Continue Writing" on Mobile

Since ghost text is desktop-only, provide an explicit continue button:
- Show a "✨ Continue writing" button/chip at the bottom of the editor when cursor is at end of content
- Tapping triggers AI continuation → text is inserted directly at cursor
- Alternatively, this can be a quick action in the bottom sheet

---

## Workstream 6: Settings & Configuration

### 6.1 AI Settings Section

Add a new section to the existing Settings modal:

```
┌─ AI Settings ────────────────────────────┐
│                                          │
│ 🔑 API Keys                              │
│ ┌──────────────────────────────────────┐ │
│ │ OpenAI    [sk-...xxxx]  [✓] [Remove]│ │
│ │ Anthropic [sk-...xxxx]  [✓] [Remove]│ │
│ │ Google    [AI...xxxx]   [✓] [Remove]│ │
│ └──────────────────────────────────────┘ │
│ [+ Add API Key]                          │
│                                          │
│ ⚙️ Preferences                            │
│ Default provider:  [OpenAI ▾]            │
│ Default model:     [gpt-4o-mini ▾]       │
│ Ghost text:        [✓] Enable (desktop)  │
│                                          │
│ ℹ️ Your API keys are encrypted locally.   │
│    Keys are sent directly to providers.  │
│    RendMD has no backend server.         │
│                                          │
└──────────────────────────────────────────┘
```

### 6.2 API Key Validation

When a user enters an API key, validate it with a lightweight test request:
- OpenAI: `GET /v1/models` (list models)
- Anthropic: `POST /v1/messages` with minimal prompt
- Google: `GET /v1beta/models` with API key

Show ✓/✕ indicator after validation. Allow saving even if validation fails (network issues shouldn't block setup).

### 6.3 No-Key Empty States

When no API keys are configured:
- Ghost text: disabled (no visual indication)  
- BubbleMenu sparkle icon: shows but opens tooltip "Set up an API key in Settings to use AI"
- AI Panel: Shows setup instructions with direct link to settings
- Bottom sheet: Shows setup instructions

---

## Workstream 7: Prompt Templates

### 7.1 System Prompts (`src/services/ai/prompts.ts`)

```typescript
export const SYSTEM_PROMPTS = {
  improve: `You are a writing assistant. Improve the following text for clarity, grammar, and flow. Maintain the author's voice and intent. Return only the improved text, no explanation.`,
  
  shorten: `Condense the following text to be more concise while preserving all key information. Return only the shortened text.`,
  
  expand: `Elaborate on the following text with more detail, examples, or context. Maintain the same tone and style. Return only the expanded text.`,
  
  formal: `Rewrite the following text in a more formal, professional tone. Return only the rewritten text.`,
  
  casual: `Rewrite the following text in a more casual, conversational tone. Return only the rewritten text.`,
  
  professional: `Rewrite the following text in a polished, professional tone suitable for business communication. Return only the rewritten text.`,
  
  continue: `You are a writing assistant. Continue writing from where the text ends. Match the style, tone, and topic of the existing content. Write 1-2 natural paragraphs. Return only the continuation — do not repeat existing text.`,
  
  translate: (lang: string) => `Translate the following text to ${lang}. Preserve formatting (paragraphs, lists, etc). Return only the translation.`,
  
  custom: (instruction: string) => `${instruction}\n\nApply this instruction to the following text. Return only the result.`,
  
  chat: `You are a helpful AI writing assistant integrated into a markdown editor called RendMD. You help users with their writing — drafting, editing, answering questions about their document, and providing suggestions. Be concise and helpful. When providing rewritten text, just return the text without explanation unless the user asks for one.`,
};
```

### 7.2 Context Building

When sending a prompt, include relevant context:

```typescript
function buildMessages(
  action: string,
  selectedText: string | undefined,
  documentContent: string,
  precedingText: string | undefined,
  customPrompt?: string,
): CompletionParams['messages'] {
  const messages: CompletionParams['messages'] = [];
  
  // System prompt
  if (action === 'chat') {
    messages.push({ role: 'system', content: SYSTEM_PROMPTS.chat });
  } else {
    const systemPrompt = action === 'custom' 
      ? SYSTEM_PROMPTS.custom(customPrompt!) 
      : SYSTEM_PROMPTS[action];
    messages.push({ role: 'system', content: systemPrompt });
  }
  
  // User message with context
  const userContent = selectedText 
    ? selectedText 
    : `Document context:\n${documentContent.slice(0, 2000)}\n\n${customPrompt || ''}`;
  
  messages.push({ role: 'user', content: userContent });
  
  return messages;
}
```

---

## File Structure Summary

```
src/
├── components/
│   ├── AI/
│   │   ├── AIPanel.tsx                  # Desktop right sidebar chat
│   │   ├── AIChatMessage.tsx            # Individual chat bubble
│   │   ├── AIPromptInput.tsx            # Shared prompt input (chat + bottom sheet)
│   │   ├── AIQuickActions.tsx           # Quick action button row
│   │   ├── AIResultPreview.tsx          # Accept/reject floating bar
│   │   ├── AIProviderPicker.tsx         # Model/provider dropdown
│   │   ├── AIBottomSheet.tsx            # Mobile bottom sheet (AI-specific content)
│   │   └── AISettingsSection.tsx        # Settings modal section
│   ├── UI/
│   │   └── BottomSheet.tsx              # Reusable bottom sheet (gesture + detents)
│   └── Editor/
│       └── extensions/
│           └── GhostText/
│               └── index.ts             # ProseMirror ghost text extension
├── hooks/
│   ├── useAI.ts                         # Core AI hook (send, stream, cancel)
│   ├── useAIProviders.ts                # Provider management, validation  
│   ├── useBottomSheet.ts                # Touch gesture + detent logic
│   └── useGhostText.ts                  # Ghost text trigger + debounce
├── services/
│   └── ai/
│       ├── types.ts                     # All AI-related TypeScript interfaces
│       ├── AIService.ts                 # Provider router / facade
│       ├── prompts.ts                   # System prompt templates
│       ├── encryption.ts                # Web Crypto key encryption
│       └── providers/
│           ├── openai.ts                # OpenAI adapter
│           ├── anthropic.ts             # Anthropic adapter
│           └── google.ts                # Google Gemini adapter
└── stores/
    └── aiStore.ts                       # AI state management
```

---

## Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `Ctrl+Shift+A` | Toggle AI chat panel | Desktop only |
| `Ctrl+J` | Quick AI action on selection | Desktop only |
| `Tab` | Accept ghost text | Desktop only, when ghost text visible |
| `Escape` | Dismiss ghost text / close AI menu | Desktop |

**Conflict check:** None of these conflict with existing shortcuts (Ctrl+S, Ctrl+O, Ctrl+B/I/K, Ctrl+1-6, Ctrl+/, Ctrl+F/H from v1.0.6).

---

## Package Dependencies

```
npm install @anthropic-ai/sdk
```

That's the only new dependency. OpenAI and Google use direct `fetch`. The `idb-keyval` package is already being installed in v1.0.6 for recent files.

---

## Testing Expectations

### Unit Tests
- Provider adapters: mock fetch, verify request format, parse streaming response
- Encryption: round-trip encrypt → decrypt preserves key
- Prompt building: verify context assembly for each action type
- Store: verify state transitions (send → streaming → complete, accept/reject)

### Integration Tests
- Quick action flow: select text → trigger action → mock API → verify replacement
- Chat panel: send message → receive streaming → verify render
- Ghost text: pause → trigger → accept/dismiss

### Manual Testing
- Test each provider with real API key
- Test streaming display (tokens render one-by-one)
- Test mobile bottom sheet gestures (all three detents, swipe dismiss)
- Test ghost text Tab accept and Escape dismiss
- Test all four themes
- Test with no API key configured (empty states)
- Test AbortController cancellation (stop streaming mid-response)

---

## Build / Deploy Expectations

- Bundle size impact: ~50-80KB for Anthropic SDK, rest is minimal
- No environment variables required (BYOK model)
- No backend infrastructure needed
- Works on Cloudflare Pages (static site, all API calls are client-side)
- Feature-flag ghost text behind settings toggle (so it can be disabled)

---

## Implementation Order (Suggested)

1. **AI types + store** — Foundation interfaces and state
2. **Provider adapters** — OpenAI first (simplest), then Anthropic, then Google
3. **Settings UI** — API key entry, validation, encryption
4. **AI Chat Panel** — Desktop right sidebar with streaming
5. **Quick Transforms** — BubbleMenu extension, floating action menu, result preview
6. **Bottom Sheet** — Reusable component with gesture handling
7. **Mobile AI integration** — Wire bottom sheet to AI store, toolbar button
8. **Ghost Text** — ProseMirror decoration, debounce, Tab accept
9. **Polish** — Empty states, error handling, loading states, theme testing
