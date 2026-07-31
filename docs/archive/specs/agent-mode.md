# Feature Spec: AI Agent Mode

> **Date:** 2026-02-10
> **Status:** Ready for Implementation
> **Estimated Effort:** L (3–5 days)

---

## User Story

As a RendMD user, I want to give the AI assistant a single instruction (e.g., "Fix all the typos" or "Add a conclusion section") and have it autonomously read my document, search for relevant sections, make edits, and report back — without me manually selecting text for each change.

---

## Problem Statement

The current AI chat (`sendMessage`) sends one completion request per user prompt. It receives truncated document context (first 2000 chars) and optionally the user's selection. This works for Q&A and single-shot transforms, but it can't:

1. **Intelligently pull context** — it always gets the same 2000-char slice even when the user's question is about content deeper in the document.
2. **Make edits** — it can suggest text, but has no mechanism to apply changes to the TipTap editor.
3. **Chain multiple actions** — a request like "find and fix all passive voice" requires reading, searching, and editing across the whole document.

---

## Architecture: The Agent Loop

### High-Level Flow

```
User prompt
    │
    ▼
┌─────────────────────────────────────┐
│  Build messages (system + history)  │
│  Include tool definitions           │
│  Include document summary (brief)   │
└────────────┬────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │  Model Call    │◄─────────────────┐
     │  (non-stream)  │                  │
     └───────┬───────┘                  │
             │                          │
             ▼                          │
     ┌───────────────┐                  │
     │ Response has   │── YES ──► Execute tools     │
     │ tool calls?    │          locally, append    │
     └───────┬───────┘          results to messages │
             │                          │
             NO                         │
             │                          │
             ▼                          │
     ┌───────────────┐                  │
     │ Final answer   │  (loop back) ───┘
     │ → Stream to UI │
     └───────────────┘
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Tool calling method | **Native per-provider** | More reliable than prompt engineering; models are trained for structured tool calls |
| Streaming | **Non-streaming** for tool loop iterations; **stream** the final answer only | Tool call parsing is simpler non-streaming; user sees progress via status messages |
| Max iterations | **8** | Safety limit prevents infinite loops; most tasks complete in 2–4 iterations |
| Document context | **Summary only** on first call; model uses `read_document` for full content | Saves tokens; lets model decide what to read |
| Edit execution | **Immediate** with undo support | Edits apply to TipTap in real-time; user can Ctrl+Z |

---

## Tool Definitions

Four tools, all operating on the currently open document:

### 1. `read_document`

Read the full document content, or a specific section by line range.

```json
{
  "name": "read_document",
  "description": "Read the currently open document. Returns the full markdown content, or a specific line range if provided. Use this to get document content before making edits. Line numbers are 1-based.",
  "parameters": {
    "type": "object",
    "properties": {
      "start_line": {
        "type": "integer",
        "description": "First line to read (1-based). Omit to read from the beginning."
      },
      "end_line": {
        "type": "integer",
        "description": "Last line to read (1-based, inclusive). Omit to read to the end."
      }
    },
    "required": []
  }
}
```

**Execution:** Split `editor.getText()` (or `editorStore.content`) by `\n`, slice the range, return with line numbers prepended.

**Return format:**
```
Document: "My Document.md" (142 lines, 2847 words)
---
1: # Introduction
2:
3: This is the opening paragraph...
...
```

### 2. `search_document`

Search for text or a pattern within the document.

```json
{
  "name": "search_document",
  "description": "Search the document for a text string or regular expression. Returns matching lines with line numbers and surrounding context (1 line before and after each match). Use this to find specific content before editing.",
  "parameters": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "The text or regex pattern to search for."
      },
      "is_regex": {
        "type": "boolean",
        "description": "If true, treat query as a regular expression. Default: false."
      }
    },
    "required": ["query"]
  }
}
```

**Execution:** Search line-by-line. For each match, return the line number, the matching line, and 1 line of context above and below. Limit to 20 matches to stay within token budgets.

**Return format:**
```
Found 3 matches for "teh":

Line 14: ...context before...
Line 15: > This is teh first occurrence
Line 16: ...context after...

Line 42: ...context before...
Line 43: > Another teh typo here
Line 44: ...context after...
```

### 3. `edit_document`

Replace text in the document. Uses exact string matching (find → replace).

```json
{
  "name": "edit_document",
  "description": "Replace text in the document. Provide the exact existing text to find and the new text to replace it with. The replacement is applied to the TipTap editor, so the user sees the change immediately and can undo it with Ctrl+Z. Only the first occurrence is replaced per call — call multiple times for multiple replacements.",
  "parameters": {
    "type": "object",
    "properties": {
      "find": {
        "type": "string",
        "description": "The exact text to find in the document. Must match precisely (case-sensitive)."
      },
      "replace": {
        "type": "string",
        "description": "The text to replace the found text with."
      }
    },
    "required": ["find", "replace"]
  }
}
```

**Execution:** Use `editor.state.doc.textContent` to find the position of `find`, then call `editor.chain().focus().deleteRange({from, to}).insertContentAt(from, replace).run()`. Return success/failure.

**Return format (success):**
```
✓ Replaced 1 occurrence (line ~15):
  - "teh first" → "the first"
```

**Return format (failure):**
```
✗ Text not found: "teh first". The document may have changed. Use search_document to find the current text.
```

### 4. `get_document_info`

Get metadata about the document without reading the full content.

```json
{
  "name": "get_document_info",
  "description": "Get metadata about the currently open document: title/filename, word count, line count, character count, whether text is currently selected, and the selected text if any.",
  "parameters": {
    "type": "object",
    "properties": {},
    "required": []
  }
}
```

**Return format:**
```json
{
  "filename": "My Document.md",
  "lines": 142,
  "words": 2847,
  "characters": 16503,
  "hasSelection": true,
  "selectedText": "This paragraph needs improvement..."
}
```

---

## System Prompt

The agent uses a richer system prompt than the basic chat. This prompt is used for ALL interactions (both simple chat and agentic tool use).

```
You are the AI writing assistant built into RendMD, a rendered-first markdown editor.
RendMD lets users edit documents from their beautifully rendered state — they see
the formatted output, not raw markdown.

## About RendMD

- Users are editing standard .md files that are portable and open
- The editor supports full markdown: headings, bold, italic, code blocks, tables,
  blockquotes, task lists, horizontal rules, links, and images
- Files may have YAML frontmatter between --- delimiters at the top
- Users can highlight text and use Quick Transforms (improve, shorten, expand,
  translate, etc.) for single-shot edits
- You live in the AI panel on the right side of the editor

## Your Capabilities

You have tools to read, search, and edit the user's document:
- **read_document** — Read the full document or a line range
- **search_document** — Find text or regex patterns with context
- **edit_document** — Replace exact text (find → replace)
- **get_document_info** — Get filename, word count, selection, etc.

## Guidelines

1. **Be concise.** The chat panel is narrow (~320px). Keep responses short and
   scannable. Use bullet points for multiple items.
2. **Read before editing.** Always read or search the relevant section before
   making changes so you have the exact text to match.
3. **Edit precisely.** Use `edit_document` with the exact text you found via
   `read_document` or `search_document`. Small, targeted replacements work best.
4. **Report what you did.** After edits, summarize: "Fixed 3 typos: teh→the,
   recieve→receive, occured→occurred."
5. **Don't over-edit.** Preserve the author's voice. Only change what was asked.
6. **Ask for clarification** when the request is ambiguous (e.g., "make it better"
   with no selection and a long document).
7. **For simple questions** (not requiring document changes), just answer directly
   without using tools.
8. **Respect frontmatter.** Don't modify YAML frontmatter unless explicitly asked.
9. **Multiple edits** are fine — use tools in sequence. Read → search → edit → edit
   → respond.
```

---

## Provider Implementation

Each provider needs a new method: `generateWithTools()`. This is a **non-streaming** completion that can return either text or tool calls. The existing `generateCompletion` and `streamCompletion` remain unchanged.

### New Types

```typescript
// --- src/services/ai/types.ts additions ---

/** JSON Schema-based tool definition (provider-agnostic). */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

/** A tool call requested by the model. */
export interface ToolCall {
  id: string;           // Provider-generated call ID (for pairing with results)
  name: string;         // Tool name
  arguments: Record<string, unknown>;  // Parsed arguments
}

/** Result of executing a tool locally. */
export interface ToolResult {
  toolCallId: string;   // Must match ToolCall.id
  content: string;      // Stringified result
}

/** Params for a completion that may include tool calls. */
export interface ToolCompletionParams extends CompletionParams {
  tools: ToolDefinition[];
}

/** Response from a tool-aware completion. */
export interface ToolCompletionResponse {
  /** If the model wants to call tools (no text content). */
  toolCalls?: ToolCall[];
  /** If the model produced a final text response (no tool calls). */
  text?: string;
  /** Raw provider-specific message to append to history for multi-turn. */
  _rawAssistantMessage: unknown;
}

/** Add to AIProvider interface */
export interface AIProvider {
  // ... existing members ...
  generateWithTools?(
    params: ToolCompletionParams,
    previousToolResults?: ToolResult[],
    rawHistory?: unknown[],
  ): Promise<ToolCompletionResponse>;
}
```

### OpenAI Implementation

Uses the Chat Completions API `tools` parameter:

```typescript
// In providers/openai.ts — add to the returned AIProvider object

async generateWithTools(params, previousToolResults, rawHistory) {
  // Build messages array
  const messages = [...params.messages]; // system + user + assistant messages

  // If there are previous raw history items (assistant tool_calls + tool results), append them
  if (rawHistory) {
    messages.push(...rawHistory);
  }

  // Convert tool definitions to OpenAI format
  const tools = params.tools.map(t => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

  const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
    method: 'POST',
    headers: makeHeaders(apiKey),
    body: JSON.stringify({
      model: params.model,
      messages,
      tools,
      temperature: params.temperature ?? 0.7,
      max_tokens: params.maxTokens ?? 2048,
    }),
    signal: params.signal,
  });

  const data = await response.json();
  const choice = data.choices?.[0];
  const msg = choice?.message;

  if (msg?.tool_calls?.length) {
    return {
      toolCalls: msg.tool_calls.map(tc => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments),
      })),
      _rawAssistantMessage: msg, // Include the full assistant message for the next turn
    };
  }

  return {
    text: msg?.content ?? '',
    _rawAssistantMessage: msg,
  };
}
```

For the next iteration, format tool results as:
```typescript
// OpenAI format for tool results:
{ role: 'tool', tool_call_id: result.toolCallId, content: result.content }
```

### Anthropic Implementation

Uses the `@anthropic-ai/sdk` `tools` parameter:

```typescript
// In providers/anthropic.ts

async generateWithTools(params, previousToolResults, rawHistory) {
  const Anthropic = (await getSDK()).default;
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const { system, messages: baseMessages } = convertMessages(params.messages);

  // Append raw history (previous assistant + tool_result messages)
  const messages = [...baseMessages, ...(rawHistory ?? [])];

  // Convert tool definitions to Anthropic format
  const tools = params.tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }));

  const response = await client.messages.create({
    model: params.model,
    max_tokens: params.maxTokens ?? 2048,
    system,
    messages,
    tools,
  });

  // Check if stop_reason is 'tool_use'
  const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
  if (toolUseBlocks.length > 0) {
    return {
      toolCalls: toolUseBlocks.map(b => ({
        id: b.id,
        name: b.name,
        arguments: b.input,
      })),
      _rawAssistantMessage: { role: 'assistant', content: response.content },
    };
  }

  const textBlock = response.content.find(b => b.type === 'text');
  return {
    text: textBlock?.text ?? '',
    _rawAssistantMessage: { role: 'assistant', content: response.content },
  };
}
```

For the next iteration, format tool results as:
```typescript
// Anthropic format for tool results:
{
  role: 'user',
  content: results.map(r => ({
    type: 'tool_result',
    tool_use_id: r.toolCallId,
    content: r.content,
  })),
}
```

### Gemini Implementation

Uses the REST API `tools` field with `functionDeclarations`:

```typescript
// In providers/google.ts

async generateWithTools(params, previousToolResults, rawHistory) {
  const { systemInstruction, contents: baseContents } = convertMessages(params.messages);

  // Append raw history (previous model + function response turns)
  const contents = [...baseContents, ...(rawHistory ?? [])];

  const tools = [{
    function_declarations: params.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    })),
  }];

  const response = await fetch(
    `${GEMINI_API_URL}/models/${params.model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction,
        contents,
        tools,
        generationConfig: {
          temperature: params.temperature ?? 0.7,
          maxOutputTokens: params.maxTokens ?? 2048,
        },
      }),
      signal: params.signal,
    },
  );

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];

  // Check for function calls
  const fnCalls = parts.filter(p => p.functionCall);
  if (fnCalls.length > 0) {
    return {
      toolCalls: fnCalls.map((p, i) => ({
        id: `gemini-${Date.now()}-${i}`,  // Gemini doesn't send IDs; generate one
        name: p.functionCall.name,
        arguments: p.functionCall.args,
      })),
      _rawAssistantMessage: { role: 'model', parts },
    };
  }

  const text = parts.find(p => p.text)?.text ?? '';
  return {
    text,
    _rawAssistantMessage: { role: 'model', parts },
  };
}
```

For the next iteration, format tool results as:
```typescript
// Gemini format for function responses:
{
  role: 'user',
  parts: results.map(r => ({
    functionResponse: {
      name: toolCallNameById[r.toolCallId],  // Need to track name↔id mapping
      response: { result: r.content },
    },
  })),
}
```

---

## Agent Loop Implementation

New file: `src/services/ai/agentLoop.ts`

```typescript
const MAX_ITERATIONS = 8;

export async function runAgentLoop(
  provider: AIProvider,
  params: ToolCompletionParams,
  toolExecutor: (call: ToolCall) => Promise<string>,
  onStatus?: (message: string) => void,
  onIteration?: (iteration: number) => void,
): Promise<string> {
  const rawHistory: unknown[] = [];
  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;
    onIteration?.(iterations);

    const response = await provider.generateWithTools!(params, undefined, rawHistory);

    // Append the assistant's raw message to history
    rawHistory.push(response._rawAssistantMessage);

    if (!response.toolCalls || response.toolCalls.length === 0) {
      // Final text response
      return response.text ?? '';
    }

    // Execute each tool call
    const results: ToolResult[] = [];
    for (const call of response.toolCalls) {
      onStatus?.(`Using ${formatToolName(call.name)}...`);
      const output = await toolExecutor(call);
      results.push({ toolCallId: call.id, content: output });
    }

    // Format tool results for the next turn (provider-specific)
    const formattedResults = formatToolResults(provider.id, response.toolCalls, results);
    rawHistory.push(formattedResults);
  }

  return '[Agent reached maximum iterations. Here is what was accomplished so far.]';
}
```

The `formatToolResults` function would dispatch to provider-specific formatting (the three formats shown above).

---

## Tool Executor

New file: `src/services/ai/tools.ts`

This module defines the actual tool implementations. They receive the TipTap `Editor` instance and the editor store.

```typescript
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: 'read_document', description: '...', parameters: { ... } },
  { name: 'search_document', description: '...', parameters: { ... } },
  { name: 'edit_document', description: '...', parameters: { ... } },
  { name: 'get_document_info', description: '...', parameters: { ... } },
];

export function createToolExecutor(
  editor: Editor,
  editorStore: EditorStoreState,
): (call: ToolCall) => Promise<string> {
  return async (call: ToolCall): Promise<string> => {
    switch (call.name) {
      case 'read_document':
        return executeReadDocument(editor, call.arguments);
      case 'search_document':
        return executeSearchDocument(editor, call.arguments);
      case 'edit_document':
        return executeEditDocument(editor, call.arguments);
      case 'get_document_info':
        return executeGetDocumentInfo(editor, editorStore);
      default:
        return `Unknown tool: ${call.name}`;
    }
  };
}
```

### Tool Execution Details

#### `read_document`

```typescript
function executeReadDocument(editor: Editor, args: Record<string, unknown>): string {
  const text = editor.state.doc.textContent;  // or getText() with block separators
  const lines = text.split('\n');
  const start = Math.max(1, (args.start_line as number) || 1);
  const end = Math.min(lines.length, (args.end_line as number) || lines.length);

  const slice = lines.slice(start - 1, end);
  const numbered = slice.map((line, i) => `${start + i}: ${line}`).join('\n');

  return `Document: "${filename}" (${lines.length} lines, ${countWords(text)} words)\n---\n${numbered}`;
}
```

#### `search_document`

```typescript
function executeSearchDocument(editor: Editor, args: Record<string, unknown>): string {
  const query = args.query as string;
  const isRegex = args.is_regex as boolean ?? false;
  const text = editor.state.doc.textContent;
  const lines = text.split('\n');
  const matches: { lineNum: number; line: string; before: string; after: string }[] = [];

  const pattern = isRegex ? new RegExp(query, 'gi') : null;

  for (let i = 0; i < lines.length && matches.length < 20; i++) {
    const isMatch = pattern ? pattern.test(lines[i]) : lines[i].includes(query);
    if (isMatch) {
      matches.push({
        lineNum: i + 1,
        line: lines[i],
        before: i > 0 ? lines[i - 1] : '',
        after: i < lines.length - 1 ? lines[i + 1] : '',
      });
    }
  }

  if (matches.length === 0) return `No matches found for "${query}".`;

  const formatted = matches.map(m =>
    `Line ${m.lineNum - 1}: ${m.before}\nLine ${m.lineNum}: > ${m.line}\nLine ${m.lineNum + 1}: ${m.after}`
  ).join('\n\n');

  return `Found ${matches.length} match(es) for "${query}":\n\n${formatted}`;
}
```

#### `edit_document`

This is the most critical tool. It needs to find exact text in the ProseMirror document and replace it.

```typescript
function executeEditDocument(editor: Editor, args: Record<string, unknown>): string {
  const find = args.find as string;
  const replace = args.replace as string;

  // Search through the document text
  const fullText = editor.state.doc.textContent;
  const index = fullText.indexOf(find);

  if (index === -1) {
    return `✗ Text not found: "${find.slice(0, 80)}..."\nUse search_document to find the current text.`;
  }

  // Map the plain-text offset to a ProseMirror position
  // (This needs careful implementation — see "Edit Implementation Notes" below)
  const from = mapTextOffsetToPos(editor.state.doc, index);
  const to = from + find.length;

  editor.chain()
    .focus()
    .deleteRange({ from, to })
    .insertContentAt(from, replace)
    .run();

  const lineNum = fullText.slice(0, index).split('\n').length;
  return `✓ Replaced (line ~${lineNum}):\n  - "${find.slice(0, 60)}" → "${replace.slice(0, 60)}"`;
}
```

**Edit Implementation Notes:**
- `editor.state.doc.textContent` strips ProseMirror node boundaries, but positions in `deleteRange` use ProseMirror offsets that account for node overhead.
- We need a helper `mapTextOffsetToPos()` that walks through `doc.descendants()` to map a plain-text character offset to a ProseMirror position. Alternatively, use `editor.state.doc.textBetween(0, doc.content.size, '\n')` and search within that, then use the `TextSelection.findFrom()` or walk the document to find the actual position.
- TipTap's built-in search-and-replace extensions (like `@tiptap/extension-search-and-replace`) could be leveraged if available.
- This is the one area needing careful implementation and testing.

#### `get_document_info`

```typescript
function executeGetDocumentInfo(editor: Editor, store: EditorStoreState): string {
  const text = editor.state.doc.textContent;
  const { from, to } = editor.state.selection;
  const selectedText = from !== to ? editor.state.doc.textBetween(from, to, '\n') : null;

  return JSON.stringify({
    filename: store.fileName ?? 'Untitled',
    lines: text.split('\n').length,
    words: text.split(/\s+/).filter(Boolean).length,
    characters: text.length,
    hasSelection: from !== to,
    selectedText: selectedText?.slice(0, 500) ?? null,
  }, null, 2);
}
```

---

## Store Changes

The `sendMessage` method in `aiStore.ts` needs to detect when agent mode should trigger and run the agent loop instead of a single completion.

### When to Use Agent Mode

Agent mode activates when:
1. The user asks something that **requires document interaction** — editing, searching, analyzing
2. The provider supports `generateWithTools` (all three should after implementation)

**Heuristic approach:** Always send tools if a provider supports them. The model decides whether to use tools or respond directly (just like how OpenAI/Anthropic/Gemini handle `tool_choice: "auto"`). This is cleaner than trying to detect intent client-side.

### Updated `sendMessage` Flow

```typescript
sendMessage: async (prompt, context) => {
  // ... existing: create user message, add to messages ...

  // Check if provider supports tools
  const provider = await createProvider(state.activeProvider, encryptedKey);

  if (provider.generateWithTools) {
    // Agent mode
    const result = await runAgentLoop(
      provider,
      {
        messages: completionMessages,
        tools: TOOL_DEFINITIONS,
        model: state.activeModel,
        temperature: 0.5,  // Lower temperature for tool use
      },
      createToolExecutor(editor, editorStore),
      (status) => set({ streamingContent: status }),  // Show tool status in UI
    );

    // `result` is the final text response — add as assistant message
    // ... existing: create assistant message, save history ...
  } else {
    // Fallback: existing streaming behavior
    // ... existing code ...
  }
}
```

### New Store Fields

```typescript
interface AIStore {
  // ... existing ...
  agentStatus: string | null;  // "Reading document...", "Searching...", etc.
  agentIterations: number;     // How many loop iterations so far
}
```

---

## UI Changes

### Agent Status Indicator

When the agent is running (between user prompt and final response), show a status line in the chat panel instead of the "Thinking..." dots:

```
🔧 Reading document...        (iteration 1/8)
🔍 Searching for "typo"...    (iteration 2/8)
✏️ Editing document...         (iteration 3/8)
```

This replaces the current streaming-before-first-chunk indicator. The component checks `agentStatus` and `agentIterations` from the store.

### Edit Indicators

When `edit_document` fires, the user sees:
1. The text change happen in the editor in real-time
2. A brief status in the chat panel
3. The final response summarizes what was changed

### No New UI Surfaces

Agent mode works within the existing chat panel. No new buttons, panels, or toggles needed. The user just types naturally and the AI decides whether tools are needed.

---

## File Structure

```
src/services/ai/
├── types.ts              # + ToolDefinition, ToolCall, ToolResult, ToolCompletionParams, etc.
├── tools.ts              # NEW — tool definitions + createToolExecutor
├── agentLoop.ts          # NEW — runAgentLoop function
├── prompts.ts            # Update SYSTEM_PROMPTS.chat with the richer prompt
├── AIService.ts          # Update to pass editor instance through
├── providers/
│   ├── openai.ts         # + generateWithTools method
│   ├── anthropic.ts      # + generateWithTools method
│   └── google.ts         # + generateWithTools method
└── ...

src/stores/
└── aiStore.ts            # Update sendMessage, add agentStatus/agentIterations
```

---

## Implementation Order

| # | Task | Depends on | Effort |
|---|------|------------|--------|
| 1 | Add types (`ToolDefinition`, `ToolCall`, `ToolResult`, etc.) | — | S |
| 2 | Implement `tools.ts` (definitions + executor) | 1 | M |
| 3 | Add `generateWithTools` to OpenAI provider | 1 | M |
| 4 | Add `generateWithTools` to Anthropic provider | 1 | M |
| 5 | Add `generateWithTools` to Gemini provider | 1 | M |
| 6 | Implement `agentLoop.ts` with provider-specific result formatting | 1, 3–5 | M |
| 7 | Update `prompts.ts` system prompt | — | S |
| 8 | Update `aiStore.ts` `sendMessage` to use agent loop | 2, 6, 7 | M |
| 9 | Add agent status UI in `AIPanel.tsx` | 8 | S |
| 10 | Test & iterate on `edit_document` position mapping | 2 | M |

**Critical path:** Tasks 1 → 3/4/5 (parallel) → 6 → 8 → 9

---

## Testing Strategy

### Unit Tests
- Tool executor: verify `read_document`, `search_document`, `edit_document`, `get_document_info` with a mock TipTap editor
- Agent loop: verify iteration, max-iteration safety, tool call → result → text flow with mock provider
- Provider `generateWithTools`: verify request format matches API spec (mock fetch)

### Integration Tests
- End-to-end: "Fix the typo 'teh'" → model calls search → calls edit → returns summary
- Multiple edits: "Fix all typos" → loops through several search+edit cycles
- No-tool response: "What's a heading?" → model responds directly without calling tools

### Manual Testing
- Test with all 3 providers (OpenAI, Anthropic, Gemini)
- Test with documents of various sizes (short, 1000+ words, 5000+ words)
- Test edit position accuracy (edits near headings, code blocks, tables)
- Test Ctrl+Z after AI edits

---

## Security Considerations

1. **Edit transparency:** Every edit is applied through TipTap's transaction system, so it's fully undoable and visible to the user.
2. **No remote execution:** All tools operate on in-memory document content. Nothing is sent externally except the normal API completion requests.
3. **Regex safety:** If `search_document` supports regex, sanitize with a timeout or limit pattern complexity to prevent ReDoS.
4. **Token limits:** `read_document` on huge documents could send a lot of tokens. Cap returned content at ~8000 chars and instruct the model to use line ranges.

---

## Open Questions

1. **Should agent mode be a toggle?** The spec says "always send tools, let model decide." But if users find the model calling tools when it shouldn't (adding latency), we may need a toggle. **Recommendation:** Ship without a toggle; add one if needed based on feedback.

2. **Should we show tool call details in the chat?** e.g., collapsible "Used `search_document` for 'typo' → 3 results" in the message. **Recommendation:** Yes, in v1.2 — for now, just the status indicator during execution and a summary in the final message.

3. **Edit conflict with user typing.** If the user types while the agent is editing, positions could shift. **Recommendation:** Disable the prompt input during agent execution (already true since `isStreaming` blocks it), and consider locking the editor briefly during edits or using a transaction-based approach.

---

## References

- [OpenAI Function Calling](https://developers.openai.com/api/docs/guides/function-calling) — Chat Completions `tools` parameter
- [Anthropic Tool Use](https://platform.claude.com/docs/en/docs/build-with-claude/tool-use/overview) — `tools` + `tool_use` / `tool_result` blocks
- [Gemini Function Calling](https://ai.google.dev/gemini-api/docs/function-calling) — `functionDeclarations` + `functionCall` / `functionResponse`
- [TipTap Commands](https://tiptap.dev/docs/editor/api/commands) — `deleteRange`, `insertContentAt`
