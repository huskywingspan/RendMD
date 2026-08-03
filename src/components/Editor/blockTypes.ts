import type { Editor } from '@tiptap/react';
import {
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Quote,
  SquareCode,
} from 'lucide-react';

/**
 * The block types a document can be built from, and the commands that apply
 * them.
 *
 * Shared by the selection bubble menu and the format toolbar. Both surfaces
 * offer the same operations on the same document, so they are defined once
 * here rather than twice. Two lists of the same commands drift: one gains a
 * heading level, the other keeps mapping the old set, and the mismatch only
 * shows up when a user reaches for something in the surface that did not get
 * updated.
 *
 * Kept free of JSX so the components in ./formatting can export components
 * only, which is what fast refresh needs to work on them.
 */

export const BLOCK_TYPES = [
  { id: 'paragraph', label: 'Text', icon: Pilcrow },
  { id: 'h1', label: 'Heading 1', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', icon: Heading3 },
  { id: 'h4', label: 'Heading 4', icon: Heading4 },
  { id: 'h5', label: 'Heading 5', icon: Heading5 },
  { id: 'h6', label: 'Heading 6', icon: Heading6 },
  { id: 'bulletList', label: 'Bullet list', icon: List },
  { id: 'orderedList', label: 'Numbered list', icon: ListOrdered },
  { id: 'taskList', label: 'Task list', icon: ListChecks },
  { id: 'blockquote', label: 'Quote', icon: Quote },
  { id: 'codeBlock', label: 'Code block', icon: SquareCode },
] as const;

export type BlockTypeId = (typeof BLOCK_TYPES)[number]['id'];

/** Heading levels, derived from the ids above so the two cannot disagree. */
const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export function currentBlockType(editor: Editor): BlockTypeId {
  for (const level of HEADING_LEVELS) {
    if (editor.isActive('heading', { level })) return `h${level}` as BlockTypeId;
  }
  // Task lists are built on bullet lists, so they have to be tested first.
  if (editor.isActive('taskList')) return 'taskList';
  if (editor.isActive('bulletList')) return 'bulletList';
  if (editor.isActive('orderedList')) return 'orderedList';
  if (editor.isActive('blockquote')) return 'blockquote';
  if (editor.isActive('codeBlock')) return 'codeBlock';
  return 'paragraph';
}

export function applyBlockType(editor: Editor, id: BlockTypeId): void {
  const chain = editor.chain().focus();

  const headingMatch = /^h([1-6])$/.exec(id);
  if (headingMatch) {
    const level = Number(headingMatch[1]) as (typeof HEADING_LEVELS)[number];
    chain.toggleHeading({ level }).run();
    return;
  }

  switch (id) {
    case 'paragraph':
      chain.setParagraph().run();
      break;
    case 'bulletList':
      chain.toggleBulletList().run();
      break;
    case 'orderedList':
      chain.toggleOrderedList().run();
      break;
    case 'taskList':
      chain.toggleTaskList().run();
      break;
    case 'blockquote':
      chain.toggleBlockquote().run();
      break;
    case 'codeBlock':
      chain.toggleCodeBlock().run();
      break;
  }
}
