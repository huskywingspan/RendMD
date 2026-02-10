import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { CustomKeyboardShortcuts } from './keyboard-shortcuts';
import { CodeBlockShiki } from './CodeBlockShiki';
import { SearchExtension } from './search';
import { GhostText } from './GhostText';

/**
 * Extended TableCell with textAlign attribute support
 * This allows column alignment (left, center, right) for GFM tables
 */
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: element => element.style.textAlign || null,
        renderHTML: attributes => {
          if (!attributes.textAlign) {
            return {};
          }
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
    };
  },
});

/**
 * Extended TableHeader with textAlign attribute support
 */
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: null,
        parseHTML: element => element.style.textAlign || null,
        renderHTML: attributes => {
          if (!attributes.textAlign) {
            return {};
          }
          return {
            style: `text-align: ${attributes.textAlign}`,
          };
        },
      },
    };
  },
});

/**
 * Extended Image with localPath attribute support.
 * When localPath is set, the markdown serializer outputs it instead of the src (data URL).
 * This allows local file references to display with data URLs in the editor
 * while serializing as relative paths in the markdown.
 */
const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      localPath: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-local-path') || null,
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.localPath) {
            return {};
          }
          return { 'data-local-path': attributes.localPath as string };
        },
      },
    };
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (s: string) => void; esc: (s: string) => string },
          node: { attrs: { src?: string; alt?: string; title?: string; localPath?: string } }
        ) {
          // Use localPath for markdown output when available, otherwise use src
          const src = node.attrs.localPath || node.attrs.src || '';
          const alt = state.esc(node.attrs.alt || '');
          const title = node.attrs.title;
          state.write(
            `![${alt}](${src.replace(/[()]/g, '\\$&')}${title ? ` "${title.replace(/"/g, '\\"')}"` : ''})`
          );
        },
        parse: {
          // handled by markdown-it
        },
      },
    };
  },
});

export interface EditorExtensionOptions {
  isDark?: boolean;
  ghostTextEnabled?: boolean;
  getGhostSuggestion?: (text: string, signal: AbortSignal) => Promise<string>;
}

/**
 * Create editor extensions with theme awareness and optional AI features
 */
export function createEditorExtensions(isDarkOrOptions: boolean | EditorExtensionOptions = true) {
  const opts: EditorExtensionOptions = typeof isDarkOrOptions === 'boolean'
    ? { isDark: isDarkOrOptions }
    : isDarkOrOptions;
  const isDark = opts.isDark ?? true;
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
      // Disable built-in code block, we use CodeBlockShiki instead
      codeBlock: false,
    }),
    CodeBlockShiki.configure({
      isDark,
      HTMLAttributes: {
        class: 'code-block',
      },
    }),
    Placeholder.configure({
      placeholder: 'Start writing, or paste markdown...',
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Link.configure({
      openOnClick: false, // We handle click manually (click=edit, Ctrl+click=open)
      HTMLAttributes: {
        class: 'editor-link',
      },
    }),
    CustomImage.configure({
      HTMLAttributes: {
        class: 'editor-image',
      },
      allowBase64: true,
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'editor-table',
      },
    }),
    TableRow,
    CustomTableCell,
    CustomTableHeader,
    Markdown.configure({
      html: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
    CustomKeyboardShortcuts,
    SearchExtension,
    // Ghost Text — only enabled when a callback is provided
    ...(opts.getGhostSuggestion
      ? [
          GhostText.configure({
            getSuggestion: opts.getGhostSuggestion,
            debounceMs: 1500,
            enabled: opts.ghostTextEnabled ?? true,
          }),
        ]
      : []),
  ];
}

// Default extensions (dark mode)
export const editorExtensions = createEditorExtensions(true);
