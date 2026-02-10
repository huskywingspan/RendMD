// Tests for AI tools (tool definitions + executor)
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOOL_DEFINITIONS, createToolExecutor } from '../tools';
import type { ToolCall } from '../types';

// --- Mock TipTap Editor ---
function createMockEditor(text: string, selectionFrom = 0, selectionTo = 0) {
  const lines = text.split('\n');

  // Build a simple mock doc structure
  // Each line is a text node at a position offset. For simplicity,
  // we model textContent as the raw joined text and textBetween as line-separated.
  const textNodes: { text: string; pos: number }[] = [];
  let pos = 1; // ProseMirror docs start at pos 1 (after opening node)
  for (const line of lines) {
    if (line.length > 0) {
      textNodes.push({ text: line, pos });
    }
    pos += line.length + 2; // +2 for paragraph open/close nodes
  }

  const docContentSize = pos - 1;

  const doc = {
    content: { size: docContentSize },
    textContent: lines.join(''),
    textBetween: (_from: number, _to: number, separator: string) => {
      if (separator === '\n') return text;
      return text;
    },
    descendants: (callback: (node: { isText: boolean; text?: string }, pos: number) => boolean | void) => {
      for (const tn of textNodes) {
        const result = callback({ isText: true, text: tn.text }, tn.pos);
        if (result === false) break;
      }
    },
  };

  const chainMethods = {
    focus: vi.fn().mockReturnThis(),
    deleteRange: vi.fn().mockReturnThis(),
    insertContentAt: vi.fn().mockReturnThis(),
    run: vi.fn(),
  };

  return {
    state: {
      doc,
      selection: { from: selectionFrom, to: selectionTo },
    },
    chain: vi.fn(() => chainMethods),
    _chainMethods: chainMethods,
    getText: vi.fn(() => text),
  } as unknown as Parameters<typeof createToolExecutor>[0];
}

describe('TOOL_DEFINITIONS', () => {
  it('should define exactly 4 tools', () => {
    expect(TOOL_DEFINITIONS).toHaveLength(4);
  });

  it('should include all expected tool names', () => {
    const names = TOOL_DEFINITIONS.map((t) => t.name);
    expect(names).toEqual([
      'read_document',
      'search_document',
      'edit_document',
      'get_document_info',
    ]);
  });

  it('each tool should have name, description, and parameters', () => {
    for (const tool of TOOL_DEFINITIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe('object');
    }
  });
});

describe('createToolExecutor', () => {
  const sampleText = 'Line one\nLine two has teh typo\nLine three\nLine four';
  let executor: (call: ToolCall) => Promise<string>;
  let editor: ReturnType<typeof createMockEditor>;

  beforeEach(() => {
    editor = createMockEditor(sampleText);
    executor = createToolExecutor(editor, {
      fileName: 'test.md',
      content: sampleText,
    });
  });

  describe('read_document', () => {
    it('should return full document with line numbers', async () => {
      const result = await executor({
        id: 'call-1',
        name: 'read_document',
        arguments: {},
      });

      expect(result).toContain('Document: "test.md"');
      expect(result).toContain('1: Line one');
      expect(result).toContain('2: Line two has teh typo');
      expect(result).toContain('4: Line four');
    });

    it('should respect start_line and end_line', async () => {
      const result = await executor({
        id: 'call-2',
        name: 'read_document',
        arguments: { start_line: 2, end_line: 3 },
      });

      expect(result).toContain('2: Line two has teh typo');
      expect(result).toContain('3: Line three');
      expect(result).not.toContain('1: Line one');
      expect(result).not.toContain('4: Line four');
    });
  });

  describe('search_document', () => {
    it('should find text matches with context', async () => {
      const result = await executor({
        id: 'call-3',
        name: 'search_document',
        arguments: { query: 'teh' },
      });

      expect(result).toContain('Found 1 match');
      expect(result).toContain('teh typo');
    });

    it('should return no matches message', async () => {
      const result = await executor({
        id: 'call-4',
        name: 'search_document',
        arguments: { query: 'nonexistent' },
      });

      expect(result).toContain('No matches found');
    });

    it('should support regex search', async () => {
      const result = await executor({
        id: 'call-5',
        name: 'search_document',
        arguments: { query: 'Line (one|three)', is_regex: true },
      });

      expect(result).toContain('Found 2 match');
    });

    it('should handle invalid regex gracefully', async () => {
      const result = await executor({
        id: 'call-6',
        name: 'search_document',
        arguments: { query: '[invalid', is_regex: true },
      });

      expect(result).toContain('Invalid regex');
    });

    it('should require query parameter', async () => {
      const result = await executor({
        id: 'call-7',
        name: 'search_document',
        arguments: {},
      });

      expect(result).toContain('Error');
    });
  });

  describe('get_document_info', () => {
    it('should return document metadata as JSON', async () => {
      const result = await executor({
        id: 'call-8',
        name: 'get_document_info',
        arguments: {},
      });

      const parsed = JSON.parse(result);
      expect(parsed.filename).toBe('test.md');
      expect(parsed.lines).toBeGreaterThan(0);
      expect(parsed.words).toBeGreaterThan(0);
      expect(parsed.characters).toBeGreaterThan(0);
      expect(parsed.hasSelection).toBe(false);
    });
  });

  describe('unknown tool', () => {
    it('should return an error for unknown tools', async () => {
      const result = await executor({
        id: 'call-9',
        name: 'nonexistent_tool',
        arguments: {},
      });

      expect(result).toContain('Unknown tool');
    });
  });
});
