// Tool definitions and executor for AI agent mode

import type { Editor } from '@tiptap/core';
import type { ToolDefinition, ToolCall } from './types';

/** Minimal interface for the editor store fields needed by tools. */
export interface ToolEditorContext {
  fileName: string | null;
  content: string;
}

// --- Tool Definitions ---

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'read_document',
    description:
      'Read the currently open document. Returns the full markdown content, or a specific line range if provided. Use this to get document content before making edits. Line numbers are 1-based.',
    parameters: {
      type: 'object',
      properties: {
        start_line: {
          type: 'integer',
          description: 'First line to read (1-based). Omit to read from the beginning.',
        },
        end_line: {
          type: 'integer',
          description: 'Last line to read (1-based, inclusive). Omit to read to the end.',
        },
      },
      required: [],
    },
  },
  {
    name: 'search_document',
    description:
      'Search the document for a text string or regular expression. Returns matching lines with line numbers and surrounding context (1 line before and after each match). Use this to find specific content before editing.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The text or regex pattern to search for.',
        },
        is_regex: {
          type: 'boolean',
          description: 'If true, treat query as a regular expression. Default: false.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'edit_document',
    description:
      'Replace text in the document. Provide the exact existing text to find and the new text to replace it with. The replacement is applied to the TipTap editor, so the user sees the change immediately and can undo it with Ctrl+Z. Only the first occurrence is replaced per call — call multiple times for multiple replacements.',
    parameters: {
      type: 'object',
      properties: {
        find: {
          type: 'string',
          description: 'The exact text to find in the document. Must match precisely (case-sensitive).',
        },
        replace: {
          type: 'string',
          description: 'The text to replace the found text with.',
        },
      },
      required: ['find', 'replace'],
    },
  },
  {
    name: 'get_document_info',
    description:
      'Get metadata about the currently open document: title/filename, word count, line count, character count, whether text is currently selected, and the selected text if any.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
];

// --- Tool Executor Factory ---

export function createToolExecutor(
  editor: Editor,
  editorContext: ToolEditorContext,
): (call: ToolCall) => Promise<string> {
  return async (call: ToolCall): Promise<string> => {
    switch (call.name) {
      case 'read_document':
        return executeReadDocument(editor, editorContext, call.arguments);
      case 'search_document':
        return executeSearchDocument(editor, call.arguments);
      case 'edit_document':
        return executeEditDocument(editor, call.arguments);
      case 'get_document_info':
        return executeGetDocumentInfo(editor, editorContext);
      default:
        return `Unknown tool: ${call.name}`;
    }
  };
}

// --- Individual Tool Implementations ---

function getDocumentText(editor: Editor): string {
  // Use textBetween for block-separated text (preserves line breaks between nodes)
  return editor.state.doc.textBetween(0, editor.state.doc.content.size, '\n');
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function executeReadDocument(
  editor: Editor,
  ctx: ToolEditorContext,
  args: Record<string, unknown>,
): string {
  const text = getDocumentText(editor);
  const lines = text.split('\n');
  const totalLines = lines.length;
  const totalWords = countWords(text);

  const start = Math.max(1, (args.start_line as number) || 1);
  const end = Math.min(totalLines, (args.end_line as number) || totalLines);

  const slice = lines.slice(start - 1, end);
  const numbered = slice.map((line, i) => `${start + i}: ${line}`).join('\n');

  // Cap output at ~8000 chars to manage token budgets
  const capped = numbered.length > 8000
    ? numbered.slice(0, 8000) + '\n... [truncated — use start_line/end_line for specific ranges]'
    : numbered;

  const filename = ctx.fileName ?? 'Untitled';
  return `Document: "${filename}" (${totalLines} lines, ${totalWords} words)\n---\n${capped}`;
}

function executeSearchDocument(
  editor: Editor,
  args: Record<string, unknown>,
): string {
  const query = args.query as string;
  if (!query) return 'Error: query parameter is required.';

  const isRegex = (args.is_regex as boolean) ?? false;
  const text = getDocumentText(editor);
  const lines = text.split('\n');

  let pattern: RegExp | null = null;
  if (isRegex) {
    try {
      pattern = new RegExp(query, 'gi');
    } catch {
      return `Error: Invalid regex pattern "${query}".`;
    }
  }

  const MAX_MATCHES = 20;
  const matches: { lineNum: number; line: string; before: string; after: string }[] = [];

  for (let i = 0; i < lines.length && matches.length < MAX_MATCHES; i++) {
    let isMatch: boolean;
    if (pattern) {
      pattern.lastIndex = 0; // Reset for each line
      isMatch = pattern.test(lines[i]);
    } else {
      isMatch = lines[i].includes(query);
    }

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

  const formatted = matches
    .map((m) => {
      const parts: string[] = [];
      if (m.before) parts.push(`Line ${m.lineNum - 1}: ${m.before}`);
      parts.push(`Line ${m.lineNum}: > ${m.line}`);
      if (m.after) parts.push(`Line ${m.lineNum + 1}: ${m.after}`);
      return parts.join('\n');
    })
    .join('\n\n');

  return `Found ${matches.length} match(es) for "${query}":\n\n${formatted}`;
}

/**
 * Map a plain-text character offset to a ProseMirror document position.
 *
 * ProseMirror positions include overhead for node boundaries (each block node
 * adds 1 for open + 1 for close). `doc.textContent` strips those. This walker
 * counts text characters through descendant text nodes to find the correct
 * ProseMirror position.
 */
function mapTextOffsetToPos(doc: Editor['state']['doc'], textOffset: number): number {
  let charsSeen = 0;
  let resultPos = -1;

  doc.descendants((node, pos) => {
    if (resultPos !== -1) return false; // Already found

    if (node.isText && node.text) {
      const nodeLen = node.text.length;
      if (charsSeen + nodeLen > textOffset) {
        // The target offset is within this text node
        resultPos = pos + (textOffset - charsSeen);
        return false;
      }
      charsSeen += nodeLen;
    }
    return true; // Keep walking
  });

  // If the offset is exactly at the end, return the last position
  if (resultPos === -1) {
    resultPos = doc.content.size;
  }

  return resultPos;
}

function executeEditDocument(
  editor: Editor,
  args: Record<string, unknown>,
): string {
  const find = args.find as string;
  const replace = args.replace as string;

  if (!find) return 'Error: find parameter is required.';
  if (replace === undefined || replace === null) return 'Error: replace parameter is required.';

  // Get the full document text (block-separated)
  const fullText = getDocumentText(editor);
  const index = fullText.indexOf(find);

  if (index === -1) {
    const preview = find.length > 80 ? find.slice(0, 80) + '...' : find;
    return `✗ Text not found: "${preview}"\nUse search_document to find the current text.`;
  }

  // Map plain-text offset to ProseMirror position
  const from = mapTextOffsetToPos(editor.state.doc, index);
  const to = mapTextOffsetToPos(editor.state.doc, index + find.length);

  editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, replace).run();

  const lineNum = fullText.slice(0, index).split('\n').length;
  const findPreview = find.length > 60 ? find.slice(0, 60) + '...' : find;
  const replacePreview = replace.length > 60 ? replace.slice(0, 60) + '...' : replace;

  return `✓ Replaced (line ~${lineNum}):\n  - "${findPreview}" → "${replacePreview}"`;
}

function executeGetDocumentInfo(
  editor: Editor,
  ctx: ToolEditorContext,
): string {
  const text = getDocumentText(editor);
  const { from, to } = editor.state.selection;
  const selectedText =
    from !== to ? editor.state.doc.textBetween(from, to, '\n').slice(0, 500) : null;

  return JSON.stringify(
    {
      filename: ctx.fileName ?? 'Untitled',
      lines: text.split('\n').length,
      words: countWords(text),
      characters: text.length,
      hasSelection: from !== to,
      selectedText,
    },
    null,
    2,
  );
}
