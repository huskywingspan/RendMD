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

/**
 * Editor extensions for Phase 1 - Core Editing
 * 
 * Includes:
 * - StarterKit (headings, bold, italic, lists, code, blockquotes, etc.)
 * - TaskList/TaskItem for checkbox lists
 * - Link with custom click handling
 * - Image with click-to-edit
 * - Table support (GFM tables)
 * - Markdown serialization
 * - CodeBlockShiki for Shiki-powered syntax highlighting
 */

/**
 * Create editor extensions with theme awareness
 * @param isDark - Whether the editor is in dark mode (for Shiki theme)
 */
export function createEditorExtensions(isDark: boolean = true) {
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
    Image.configure({
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
    TableCell,
    TableHeader,
    Markdown.configure({
      html: false,
      transformPastedText: true,
      transformCopiedText: true,
    }),
    CustomKeyboardShortcuts,
  ];
}

// Default extensions (dark mode)
export const editorExtensions = createEditorExtensions(true);
