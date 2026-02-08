import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { CodeBlock } from '@tiptap/extension-code-block';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';

/**
 * Create a headless TipTap editor for round-trip testing.
 * Uses plain CodeBlock instead of CodeBlockShiki to avoid
 * ReactNodeViewRenderer dependency in jsdom.
 */
function createTestEditor(): Editor {
  return new Editor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5, 6] },
        codeBlock: false,
      }),
      CodeBlock,
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({ openOnClick: false }),
      Image.configure({ allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Markdown.configure({
        html: false,
        linkify: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
  });
}

/**
 * Parse markdown into editor, serialize back out.
 */
function roundTrip(editor: Editor, markdown: string): string {
  editor.commands.setContent(markdown);
  return (editor.storage as never as Record<string, { getMarkdown: () => string }>).markdown?.getMarkdown?.() ?? '';
}

// --- Tests ---

let editor: Editor;

beforeEach(() => { editor = createTestEditor(); });
afterEach(() => { editor.destroy(); });

describe('Markdown Round-Trip', () => {

  describe('Headings', () => {
    it('preserves h1-h6', () => {
      const input = '# H1\n\n## H2\n\n### H3\n\n#### H4\n\n##### H5\n\n###### H6';
      const output = roundTrip(editor, input);
      expect(output).toContain('# H1');
      expect(output).toContain('## H2');
      expect(output).toContain('### H3');
      expect(output).toContain('#### H4');
      expect(output).toContain('##### H5');
      expect(output).toContain('###### H6');
    });
  });

  describe('Inline formatting', () => {
    it('preserves bold', () => {
      const output = roundTrip(editor, '**bold text**');
      expect(output).toContain('**bold text**');
    });

    it('preserves italic', () => {
      const output = roundTrip(editor, '*italic text*');
      expect(output).toContain('*italic text*');
    });

    it('preserves inline code', () => {
      const output = roundTrip(editor, '`inline code`');
      expect(output).toContain('`inline code`');
    });

    it('preserves mixed bold and italic', () => {
      const output = roundTrip(editor, '***bold and italic***');
      // May normalize to **_bold and italic_** or similar — check semantic
      expect(output).toMatch(/\*{2,3}.*bold and italic.*\*{2,3}/);
    });
  });

  describe('Links', () => {
    it('preserves basic links', () => {
      const output = roundTrip(editor, '[example](https://example.com)');
      expect(output).toContain('[example](https://example.com)');
    });

    it('preserves link with title', () => {
      const output = roundTrip(editor, '[text](https://example.com "Title")');
      expect(output).toContain('https://example.com');
      expect(output).toContain('text');
    });
  });

  describe('Images', () => {
    it('preserves basic images', () => {
      const output = roundTrip(editor, '![alt text](https://example.com/img.png)');
      expect(output).toContain('![alt text](https://example.com/img.png)');
    });
  });

  describe('Code blocks', () => {
    it('preserves fenced code blocks', () => {
      const input = '```js\nconst x = 1;\n```';
      const output = roundTrip(editor, input);
      expect(output).toContain('```');
      expect(output).toContain('const x = 1;');
    });

    it('preserves code block language', () => {
      const input = '```python\nprint("hello")\n```';
      const output = roundTrip(editor, input);
      expect(output).toContain('python');
      expect(output).toContain('print("hello")');
    });
  });

  describe('Tables', () => {
    it('preserves basic table structure', () => {
      const input = '| A | B |\n| --- | --- |\n| 1 | 2 |';
      const output = roundTrip(editor, input);
      expect(output).toContain('|');
      expect(output).toContain('A');
      expect(output).toContain('B');
      expect(output).toContain('1');
      expect(output).toContain('2');
    });
  });

  describe('Task lists', () => {
    it('preserves task list items', () => {
      const input = '- [x] Done\n- [ ] Todo';
      const output = roundTrip(editor, input);
      expect(output).toContain('[x]');
      expect(output).toContain('[ ]');
      expect(output).toContain('Done');
      expect(output).toContain('Todo');
    });
  });

  describe('Blockquotes', () => {
    it('preserves blockquotes', () => {
      const output = roundTrip(editor, '> This is a quote');
      expect(output).toContain('> This is a quote');
    });

    it('preserves nested blockquotes', () => {
      const input = '> outer\n>\n> > nested';
      const output = roundTrip(editor, input);
      expect(output).toContain('>');
      expect(output).toContain('outer');
      expect(output).toContain('nested');
    });
  });

  describe('Lists', () => {
    it('preserves unordered lists', () => {
      const input = '- Item 1\n- Item 2\n- Item 3';
      const output = roundTrip(editor, input);
      // May normalize * to - (acceptable per ADR-010)
      expect(output).toMatch(/[-*] Item 1/);
      expect(output).toMatch(/[-*] Item 2/);
      expect(output).toMatch(/[-*] Item 3/);
    });

    it('preserves ordered lists', () => {
      const input = '1. First\n2. Second\n3. Third';
      const output = roundTrip(editor, input);
      expect(output).toContain('First');
      expect(output).toContain('Second');
      expect(output).toContain('Third');
    });

    it('preserves nested lists', () => {
      const input = '- Parent\n  - Child\n    - Grandchild';
      const output = roundTrip(editor, input);
      expect(output).toContain('Parent');
      expect(output).toContain('Child');
      expect(output).toContain('Grandchild');
    });
  });

  describe('Horizontal rule', () => {
    it('preserves horizontal rules', () => {
      const input = 'Before\n\n---\n\nAfter';
      const output = roundTrip(editor, input);
      expect(output).toContain('---');
      expect(output).toContain('Before');
      expect(output).toContain('After');
    });
  });

  describe('Edge cases', () => {
    it('handles empty document', () => {
      const output = roundTrip(editor, '');
      expect(output.trim()).toBe('');
    });

    it('handles mixed formatting in paragraph', () => {
      const input = 'Normal **bold** and *italic* with `code` in one line';
      const output = roundTrip(editor, input);
      expect(output).toContain('**bold**');
      expect(output).toContain('*italic*');
      expect(output).toContain('`code`');
    });
  });
});
