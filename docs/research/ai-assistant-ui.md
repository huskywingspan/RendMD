# Research: AI Assistant UI for RendMD v1.1

> **Date:** 2026-07-01  
> **Status:** Research Complete — Ready for Decision  
> **Scope:** Desktop + Mobile AI writing assistant interface design

---

## 1. Problem Statement

RendMD v1.1 introduces AI writing assistance (continue writing, improve/rewrite, summarize, expand, translate, custom prompts) with BYOK provider integration. We need to decide **how the AI interacts with the user** — the interface patterns, the surfaces, and how they adapt from desktop (ample space) to mobile (extremely limited).

### Constraints from Layout Audit

| Metric | Desktop (1280px+) | Mobile (375px iPhone SE) |
|--------|-------------------|--------------------------|
| Available vertical space | ~800px+ | ~503px after header+toolbar+frontmatter |
| Available horizontal space | 900px+ (minus sidebar) | 375px full width |
| BubbleMenu | ✅ Available on selection | ❌ Disabled on touch devices |
| Existing sidebar | Left, w-64 (256px), inline | Fixed overlay, instant show/hide |
| Split view | Side-by-side editor+source | Forces render-only below 768px |
| Z-index model | Flat — z-50 for all overlays | Same |
| Bottom sheet/drawer | ❌ Does not exist | ❌ Must build from scratch |
| Transition animations | ❌ None (sidebar is instant) | ❌ None |

---

## 2. Competitive Landscape

### 2.1 Notion AI

**Pattern:** Inline + Slash Commands + Selection Popover

| Surface | How it works |
|---------|-------------|
| **Highlight → "Ask AI"** | Select text → popover appears with actions (improve, translate, shorter, longer, tone, custom) |
| **Slash command `/AI`** | AI blocks inline — summarize, action items, custom. Uses page context. |
| **Space on empty line** | Opens AI prompt for drafting new content from scratch |
| **Iterative refinement** | After AI generates, user can keep refining with follow-up prompts |
| **Mobile** | Same patterns, touch-optimized. Selection → toolbar action. Space to draft. |

**Key insight:** Notion keeps AI **inline with the document** — no separate panel. Results appear where you're working. This preserves writing flow but limits complex multi-turn conversations.

### 2.2 Cursor (Code Editor)

**Pattern:** Side Panel Chat + Inline Cmd+K + Tab Autocomplete

| Surface | How it works |
|---------|-------------|
| **Side panel chat** | Right sidebar, full conversation with codebase context. Apply changes from chat. |
| **Cmd+K inline** | Small prompt input at cursor position, targeted edits. Quick and focused. |
| **Tab autocomplete** | Ghost text prediction, accept with Tab. Specialized prediction model. |
| **Agent mode** | Full autonomy — AI makes multi-file changes. "Autonomy slider" concept. |

**Key insight:** Cursor layers three levels of AI autonomy — Tab (lowest), Cmd+K (medium), Agent (highest). Users choose engagement depth. **Desktop only** — no mobile consideration.

### 2.3 Google Docs (Gemini "Help me write")

**Pattern:** Floating Popup + Selection Actions

| Surface | How it works |
|---------|-------------|
| **"Help me write" button** | Floating icon in margin. Click → popup with prompt input. |
| **Selection → rewrite** | Select text → popup with actions (rephrase, formal, casual, shorten, elaborate, bulletize, summarize) |
| **Replace or Insert** | After generation, choose to replace text or insert below |
| **Refinement** | Can adjust prompt and regenerate. Tone controls built in. |

**Key insight:** Google uses a **floating popup near the content** rather than a sidebar. Keeps focus on the document. "Replace vs Insert" is a strong pattern for selection-based actions. **Desktop primarily** — limited mobile support.

### 2.4 Obsidian Copilot (Community Plugin)

**Pattern:** Side Panel Chat + Quick Commands + Composer

| Surface | How it works |
|---------|-------------|
| **Right sidebar panel** | Full chat conversation. `@` references to add notes/context. |
| **`/` commands in chat** | Slash commands for quick preset actions |
| **Ctrl+K quick command** | Select text → quick AI action without opening chat panel |
| **Ctrl+L add to context** | Select text → send to chat as context |
| **Composer** | AI edits document, "Apply" button to accept changes |
| **Mobile** | Same sidebar, collapsed on mobile. Works but cramped. |

**Key insight:** Obsidian Copilot mirrors Cursor's multi-surface approach for a writing context. The **Ctrl+K quick command** is particularly good — select, transform, done. No need to open a full chat.

### 2.5 Apple Intelligence Writing Tools

**Pattern:** System-level Popover/Sheet + Action Menu

| Surface | How it works |
|---------|-------------|
| **Text selection → menu** | Select text in any app → "Writing Tools" appears in context menu |
| **Proofread & Rewrite** | Two primary actions with inline diff display |
| **Tone buttons** | Friendly, Professional, Concise — one-tap transforms |
| **Summary types** | Summarize, Key Points, Table, List |
| **Mobile** | Clean bottom sheet / popover. Natural swipe to dismiss. |
| **Inline diff** | Shows changes highlighted — accept or revert |

**Key insight:** Apple's approach is the **gold standard for mobile AI writing UX** — a clean sheet with clear actions, no complex chat interface. The inline diff for showing changes is brilliant. Note: Apple uses **nonmodal sheets** that allow interaction with content behind them.

---

## 3. Pattern Comparison

| Pattern | Pros | Cons | Best For |
|---------|------|------|----------|
| **Side panel chat** | Multi-turn conversations, persistent context, complex tasks | Takes horizontal space, shifts focus away from document | Complex queries, document-wide operations |
| **Floating popup** | Stays near content, doesn't steal layout space | Limited room for long conversations, easy to lose position | Quick transforms, selection-based actions |
| **Inline/ghost text** | Most seamless, zero context switch | Only works for continuation, not transformation | Autocomplete, continue writing |
| **Bottom sheet (mobile)** | Familiar mobile pattern, resizable with detents | Must build from scratch, covers content | Mobile AI chat/actions |
| **Slash commands** | Keyboard-driven, fast, in-flow | Discoverable only for power users | Power users, quick inserts |
| **Selection → action menu** | Direct manipulation, obvious | Only works when text is selected | All transform operations |

---

## 4. Recommended Design: Desktop

### 4.1 Three AI Surfaces (Autonomy Layers)

Inspired by Cursor's "autonomy slider" but adapted for writing:

#### Layer 1: Ghost Text Autocomplete (Lowest Friction)
- **Trigger:** Pause at end of paragraph, or explicit shortcut (e.g., `Ctrl+Space`)
- **UI:** Gray ghost text appears after cursor, styled with `opacity: 0.4`
- **Accept:** `Tab` key
- **Dismiss:** `Escape` or continue typing
- **Context:** Current paragraph + preceding few paragraphs
- **Provider:** Uses fastest/cheapest model option

#### Layer 2: Quick Transform (Selection-Based)
- **Trigger:** Select text → sparkle icon appears in BubbleMenu
- **UI:** Small floating menu (like BubbleMenu extension) with preset actions:
  - ✨ Improve writing
  - 📝 Make shorter
  - 📖 Make longer  
  - 🔄 Change tone → (Formal / Casual / Professional)
  - 🌐 Translate → (language picker)
  - 💬 Custom prompt (free-text input)
- **Result:** Replaces selection with preview. Show diff. Accept (✓) or Revert (✗).
- **Shortcut:** `Ctrl+J` (near Ctrl+K for links — AI actions)

#### Layer 3: AI Chat Panel (Full Conversation)
- **Trigger:** Button in header or `Ctrl+Shift+A` / `Ctrl+I`
- **UI:** Right sidebar panel, ~320px wide, mirrors left sidebar structure
- **Features:**
  - Chat conversation with message history
  - Model/provider picker at top
  - `@` mentions to reference document sections
  - Streaming text display
  - "Apply to document" button on AI responses
  - "Insert at cursor" action
  - Clear conversation button
- **Position:** Right of editor area, inline (not floating)
- **Persistence:** Panel stays open across edits (unlike modals)

### 4.2 Desktop Layout Impact

```
┌──────────────────────────────────────────────────────────────┐
│ Header (48px)                                    [AI ✨] [⚙] │
├────────┬────────────────────────────────────────┬────────────┤
│ Sidebar│  Editor Content Area                   │  AI Panel  │
│ (TOC)  │  ┌──────────────────────────┐          │  (320px)   │
│ 256px  │  │  Your document text...   │          │            │
│        │  │  [Selected text█████████]│          │  Chat...   │
│        │  │   ┌─────────────────┐    │          │  User: ... │
│        │  │   │ ✨ Improve      │    │          │  AI: ...   │
│        │  │   │ 📝 Shorter     │    │          │            │
│        │  │   │ 📖 Longer      │    │          │  ┌────────┐│
│        │  │   │ 💬 Custom...   │    │          │  │ Prompt ││
│        │  │   └─────────────────┘    │          │  └────────┘│
│        │  └──────────────────────────┘          │            │
├────────┴────────────────────────────────────────┴────────────┤
│ Toast Container                                              │
└──────────────────────────────────────────────────────────────┘
```

**Key decisions:**
- AI panel is a **third column** alongside sidebar and editor (not a modal)
- When AI panel is open, editor area shrinks (like split view does)
- AI panel can be open simultaneously with left sidebar
- At narrow desktop widths (<1024px), AI panel becomes a floating overlay

---

## 5. Recommended Design: Mobile

### The Core Challenge

Mobile has ~503px of vertical space (iPhone SE) after header, toolbar, and frontmatter panel. BubbleMenu is disabled on touch. There's no existing bottom sheet pattern.

### 5.1 Bottom Sheet Component (New Infrastructure)

**Must build from scratch.** This is the single biggest investment for mobile AI.

#### Technical Spec
- **Container:** `position: fixed; bottom: 0; left: 0; right: 0; z-index: 50`
- **Detents:** Three stop points:
  - **Collapsed** (0px) — hidden, only toolbar button visible
  - **Peek** (~180px) — quick actions row + prompt input visible
  - **Half** (~50% viewport) — chat messages visible
  - **Full** (~90% viewport, minus status bar) — full chat experience
- **Gestures:** Swipe up/down on grabber to resize, swipe down from peek to dismiss
- **Grabber:** 40px × 4px rounded bar at top, `cursor: grab`
- **Animation:** `transition: transform 300ms cubic-bezier(0.32, 0.72, 0, 1)` (Apple spring curve)
- **Backdrop:** Semi-transparent when at Half or Full detent
- **Safe area:** Must respect `env(safe-area-inset-bottom)` for iPhone notch

#### Interaction Model
```
Toolbar [✨ AI] tap → Bottom sheet rises to Peek detent
                       ┌──────────────────────────────┐
                       │ ═════  (grabber)              │
                       │ [Improve] [Shorter] [Longer]  │  ← Quick actions
                       │ [Tone ▾] [Translate ▾] [...]  │
                       │ ┌──────────────────────────┐  │
                       │ │ Ask AI anything...       │  │  ← Prompt input
                       │ └──────────────────────────┘  │
                       └──────────────────────────────┘

User drags up → Sheet rises to Half detent
                       ┌──────────────────────────────┐
                       │ ═════  (grabber)              │
                       │                               │
                       │ User: Make this more formal   │  ← Chat messages
                       │ AI: Here's the revised...     │
                       │ [Apply] [Copy] [Retry]        │
                       │                               │
                       │ ┌──────────────────────────┐  │
                       │ │ Ask AI anything...       │  │
                       │ └──────────────────────────┘  │
                       └──────────────────────────────┘
```

### 5.2 Selection-Based Actions on Mobile

Since BubbleMenu is disabled on touch, we need an alternative:

**Option A (Recommended): Toolbar AI Button with Context Awareness**
- When text is selected, the toolbar's AI button (✨) changes to indicate "selection mode"
- Tapping opens the bottom sheet at Peek with transform-specific actions
- Actions: Improve, Shorter, Longer, Tone, Translate, Custom
- Result replaces selection with accept/reject controls

**Option B: Long-press action sheet**
- After selecting text, long-press opens a native-style action sheet
- Less discoverable, but feels more native on mobile

### 5.3 No Ghost Text on Mobile

Ghost text autocomplete is **not recommended for mobile** because:
- No Tab key to accept (would need a dedicated "Accept" button, breaking flow)
- Virtual keyboard already occupies half the screen
- Touch interaction makes ghost text dismissal awkward
- Instead: **"Continue writing" button** in bottom sheet or toolbar
  - Button appears when cursor is at end of content
  - Tap → AI generates continuation → inserted directly

### 5.4 Mobile Vertical Space Budget

With AI bottom sheet at Peek (180px):

| Component | Height | Remaining |
|-----------|--------|-----------|
| Status bar | 47px | – |
| Header | 48px | – |
| Toolbar | 48px | – |
| Frontmatter (collapsed) | 36px | – |
| **Editor content** | **~308px** | ← Tight but workable |
| AI bottom sheet (peek) | 180px | – |
| Safe area bottom | 34px | – |
| **Total** | **667px** (iPhone SE) | – |

At Half detent (~280px), editor is pushed to ~208px — minimal but acceptable for quick AI interactions. User can always swipe down to collapse.

---

## 6. Component Architecture

### 6.1 New Components Needed

```
src/
├── components/
│   ├── AI/
│   │   ├── AIPanel.tsx              # Desktop right sidebar chat panel
│   │   ├── AIChatMessage.tsx        # Individual chat message bubble
│   │   ├── AIPromptInput.tsx        # Shared prompt input with send button
│   │   ├── AIQuickActions.tsx       # Quick action buttons (improve, shorter, etc.)
│   │   ├── AIResultPreview.tsx      # Inline diff preview (accept/reject)
│   │   ├── AIProviderPicker.tsx     # Model/provider dropdown
│   │   ├── AIBottomSheet.tsx        # Mobile bottom sheet with detents
│   │   ├── AIBubbleMenuExtension.tsx # BubbleMenu sparkle icon (desktop)
│   │   ├── AIGhostText.tsx          # Ghost text overlay (desktop only)
│   │   └── AISettingsSection.tsx    # Settings modal section for API keys
│   └── ...
├── hooks/
│   ├── useAI.ts                     # Core AI hook (send prompt, stream response)
│   ├── useAIProviders.ts            # Provider management, key storage
│   ├── useBottomSheet.ts            # Bottom sheet gesture/detent logic
│   └── useGhostText.ts             # Ghost text insertion/dismissal
├── services/
│   └── ai/
│       ├── providers/
│       │   ├── openai.ts            # OpenAI adapter
│       │   ├── anthropic.ts         # Anthropic adapter
│       │   ├── google.ts            # Google Gemini adapter
│       │   ├── ollama.ts            # Ollama local adapter
│       │   └── openrouter.ts        # OpenRouter aggregator
│       ├── AIService.ts             # Provider router / facade
│       ├── prompts.ts               # System prompt templates
│       └── encryption.ts            # Local key encryption
└── stores/
    └── aiStore.ts                   # AI state (conversation, provider, settings)
```

### 6.2 New Zustand Store

```typescript
interface AIStore {
  // Panel state
  isPanelOpen: boolean;
  togglePanel: () => void;
  
  // Conversation
  messages: AIMessage[];
  isStreaming: boolean;
  sendMessage: (prompt: string, context?: AIContext) => Promise<void>;
  clearConversation: () => void;
  
  // Provider
  activeProvider: string;
  activeModel: string;
  setProvider: (provider: string, model: string) => void;
  
  // Quick actions
  lastAction: AIAction | null;
  pendingResult: AIResult | null;
  acceptResult: () => void;
  rejectResult: () => void;
  
  // Settings
  apiKeys: Record<string, string>; // encrypted
  setApiKey: (provider: string, key: string) => void;
}
```

### 6.3 Keyboard Shortcuts

| Shortcut | Action | Desktop | Mobile |
|----------|--------|---------|--------|
| `Ctrl+Shift+A` | Toggle AI chat panel | ✅ | ❌ (use toolbar) |
| `Ctrl+J` | Quick AI action on selection | ✅ | ❌ (use toolbar) |
| `Ctrl+Space` | Trigger ghost text completion | ✅ | ❌ |
| `Tab` | Accept ghost text | ✅ | ❌ |
| `Escape` | Dismiss ghost text / close AI | ✅ | ❌ |

---

## 7. Design Decisions & Rationale

### Decision 1: Three surfaces, not one

**Chose:** Ghost text + Quick transforms + Chat panel  
**Over:** Single chat panel for everything  
**Because:** Writing needs different levels of AI engagement. Ghost text is zero-friction for continuation. Quick transforms handle 80% of selection-based needs without opening a panel. Chat panel is for complex, multi-turn work.

### Decision 2: Bottom sheet for mobile, not modal

**Chose:** Resizable bottom sheet with detents  
**Over:** Full-screen modal or inline panel  
**Because:** 
- Modal blocks the document entirely — user loses context
- Inline panel would shrink the already tiny editor area permanently
- Bottom sheet is the established mobile pattern (Apple Notes formatting, Google Maps, Material Design)
- Detents let users choose how much space to give AI
- Nonmodal at Peek detent preserves document interaction

### Decision 3: No ghost text on mobile

**Chose:** Explicit "continue writing" via bottom sheet  
**Over:** Ghost text with accept button  
**Because:** Mobile keyboards consume ~50% of screen. Adding ghost text + accept/dismiss buttons on top of that leaves almost no readable content. Better to be explicit.

### Decision 4: Toolbar-based selection actions on mobile (not BubbleMenu)

**Chose:** AI button in toolbar that's context-aware (knows when text is selected)  
**Over:** Re-enabling BubbleMenu on touch, or long-press context menu  
**Because:** BubbleMenu was intentionally disabled on touch for good UX reasons (fat finger, obscures text). The toolbar is always visible and already the primary mobile interaction point.

### Decision 5: Right panel chat (not left, not floating)

**Chose:** Right sidebar panel for desktop chat  
**Over:** Left sidebar (already has TOC), floating window, full modal  
**Because:** Right side is the natural complement to left sidebar. Cursor, Obsidian Copilot, and VS Code all put AI panels on the right. Document stays center. Panel can be open simultaneously with left sidebar on wide screens.

---

## 8. Resolved Questions

### Q1: Ghost text — include in v1.1 or defer?

**DECIDED: Include in v1.1.0.** It breaks the ice for new users and is the highest wow-factor feature. Desktop only.

### Q2: How many providers in initial launch?

**DECIDED: OpenAI + Anthropic + Google Gemini for v1.1.0.** Ollama + OpenRouter deferred to v1.1.1. Note: Anthropic may be deferred if CORS requires a proxy server (see §9.5).

### Q3: Chat history persistence?

**DECIDED: Per-document in IndexedDB.** Already using idb-keyval for recent files (v1.0.6). Natural fit.

### Q4: Streaming vs batch responses?

**DECIDED: Streaming. Non-negotiable.** All three launch providers support it.

---

## 9. Technical Considerations

### 9.1 Provider Adapter Interface

From the DESIGN_DOCUMENT.md architecture, adapted:

```typescript
interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  
  // Core
  generateCompletion(params: CompletionParams): Promise<string>;
  streamCompletion(params: CompletionParams): AsyncIterable<string>;
  
  // Validation
  validateApiKey(key: string): Promise<boolean>;
  
  // Cost estimation (optional)
  estimateTokens?(text: string): number;
}

interface CompletionParams {
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[];
  model: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal; // For cancellation
}
```

### 9.2 API Key Encryption

Keys stored in localStorage, encrypted with Web Crypto API:

```typescript
// Generate key from a device-specific fingerprint
const encryptionKey = await crypto.subtle.deriveKey(
  { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
  baseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

**Note:** Client-side encryption provides obfuscation, not true security. The keys are inherently accessible to the user's browser. This prevents casual exposure (dev tools, localStorage viewers) but not determined extraction.

### 9.3 Prompt Templates

```typescript
const SYSTEM_PROMPTS = {
  improve: "You are a writing assistant. Improve the following text for clarity, grammar, and flow. Maintain the author's voice and intent. Return only the improved text.",
  shorten: "Condense the following text to be more concise while preserving key information. Return only the shortened text.",
  expand: "Elaborate on the following text with more detail, examples, or context. Maintain the same tone. Return only the expanded text.",
  formal: "Rewrite the following text in a more formal, professional tone. Return only the rewritten text.",
  casual: "Rewrite the following text in a more casual, conversational tone. Return only the rewritten text.",
  continue: "Continue writing from where the text ends. Match the style, tone, and topic of the existing content. Write 1-2 paragraphs.",
  translate: (lang: string) => `Translate the following text to ${lang}. Return only the translation.`,
  custom: (instruction: string) => `${instruction}\n\nReturn only the result.`,
};
```

### 9.4 Bottom Sheet Implementation Notes

The bottom sheet is the most complex new UI component. Key implementation details:

- **Touch handling:** Use `touchstart`, `touchmove`, `touchend` with `passive: false` on the grabber area
- **Snap to detent:** After touchend, calculate velocity and snap to nearest detent (or next detent if velocity is high enough)
- **Keyboard handling:** When virtual keyboard opens, adjust sheet position so prompt input stays visible
- **Backdrop:** `pointer-events: none` at Peek detent (allow document interaction), `pointer-events: auto` at Half/Full
- **Content scrolling:** Chat messages scroll inside the sheet. Distinguish between sheet drag vs content scroll (check if scrolled to top).
- **Safe areas:** Apply `padding-bottom: env(safe-area-inset-bottom)` to sheet content

### 9.5 CORS Considerations

Direct browser API calls mean CORS must be handled:

| Provider | CORS | Notes |
|----------|------|-------|
| OpenAI | ✅ Allows browser calls | Works with `dangerouslyAllowBrowser: true` |
| Anthropic | ❌ No CORS headers | **Requires proxy or their JS SDK with CORS** |
| Google | ✅ Allows browser calls | Gemini API supports browser origins |
| Ollama | ✅ Configurable | Default localhost, user configures CORS |
| OpenRouter | ✅ Allows browser calls | Designed for client-side use |

**Anthropic CORS issue:** Anthropic's SDK supports browser usage out of the box — just requires `dangerouslyAllowBrowser: true` (same pattern as OpenAI). **This is trivial, not a big lift.** Anthropic stays in v1.1.0.

```typescript
import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic({
  apiKey: userKey,
  dangerouslyAllowBrowser: true,
});
```

---

## 10. Implementation Priority / Phasing

### v1.1.0 — Core AI Experience

| Priority | Feature | Desktop | Mobile | Effort |
|----------|---------|---------|--------|--------|
| P0 | AI service layer + provider adapters | ✅ | ✅ | M |
| P0 | API key management (settings + encryption) | ✅ | ✅ | S |
| P0 | AI Chat Panel (right sidebar) | ✅ | ❌ | M |
| P0 | Quick Transform (BubbleMenu extension) | ✅ | ❌ | M |
| P0 | AI Bottom Sheet (mobile) | ❌ | ✅ | L |
| P0 | Toolbar AI button (mobile selection) | ❌ | ✅ | S |
| P1 | Streaming responses | ✅ | ✅ | M |
| P1 | Result preview with diff (accept/reject) | ✅ | ✅ | M |
| P1 | Ghost text autocomplete | ✅ | ❌ | L |
| P2 | Per-document chat history (IndexedDB) | ✅ | ✅ | S |
| P2 | `@` document context in chat | ✅ | ✅ | M |

**Estimated total effort:** ~3-4 weeks for full v1.1.0

### v1.1.1 — Enhancements

- Ollama + OpenRouter providers
- Chat history search
- Custom prompt templates (save/reuse)
- Token usage tracking / cost estimation
- Keyboard shortcuts refinement

---

## 11. Summary / Recommendation

**Desktop:** Three-layer approach — ghost text for continuation, BubbleMenu quick transforms for selection, right sidebar chat panel for complex work. This follows the proven Cursor "autonomy slider" model adapted for prose writing.

**Mobile:** Bottom sheet with detents (Peek/Half/Full) — the established mobile pattern used by Apple Notes, Google Maps, and Material Design. Toolbar button for AI entry point since BubbleMenu is disabled on touch. No ghost text on mobile — explicit "continue writing" action instead.

**Key investment:** The bottom sheet component is the biggest new infrastructure piece. Consider building it as a reusable `<BottomSheet>` component that could serve other future mobile needs (search results, TOC panel on mobile, etc.).

**Provider priority:** OpenAI + Anthropic + Google Gemini for v1.1.0. These three cover the vast majority of users. Add Ollama and OpenRouter in v1.1.1.

---

## References

- [Notion AI docs guide](https://www.notion.com/help/guides/notion-ai-for-docs)
- [Cursor features](https://cursor.com/features)
- [Google Docs "Help me write"](https://support.google.com/docs/answer/13447609)
- [Obsidian Copilot](https://github.com/logancyang/obsidian-copilot)
- [Apple Human Interface Guidelines — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Apple Intelligence — Writing Tools](https://www.apple.com/apple-intelligence/)
- [Material Design 3 — Bottom Sheets](https://m3.material.io/components/bottom-sheets/overview)
- [RendMD Design Document §5.1](../DESIGN_DOCUMENT.md)
