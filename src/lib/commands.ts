import type { Editor } from '@tiptap/react';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { useSettingsStore } from '@/stores/settingsStore';

/**
 * The command registry.
 *
 * One list, consumed by both the command palette and the keyboard handler, so
 * a shortcut and its palette entry can never drift apart — the shortcut string
 * shown to the user *is* the one being matched.
 */

export type CommandGroup = 'File' | 'Edit' | 'View' | 'Insert' | 'Workspace' | 'Help';

export interface Command {
  id: string;
  title: string;
  group: CommandGroup;
  /** Displayed, and parsed by the keyboard handler. e.g. "Ctrl+Shift+F". */
  shortcut?: string;
  /** Extra words to match on, for commands whose name isn't what you'd type. */
  keywords?: string;
  run: (context: CommandContext) => unknown;
  /** Hidden from the palette when this returns false. */
  available?: (context: CommandContext) => boolean;
}

export interface CommandContext {
  editor: Editor | null;
}

const docs = () => useDocumentsStore.getState();
const ui = () => useUIStore.getState();
const workspace = () => useWorkspaceStore.getState();
const settings = () => useSettingsStore.getState();

const hasActiveDocument = (): boolean => docs().activeId !== null;

export const COMMANDS: Command[] = [
  /* ── File ──────────────────────────────────────────────────────────────── */
  {
    id: 'file.new',
    title: 'New document',
    group: 'File',
    shortcut: 'Ctrl+N',
    run: () => docs().newDocument(),
  },
  {
    id: 'file.open',
    title: 'Open file…',
    group: 'File',
    shortcut: 'Ctrl+O',
    keywords: 'load import',
    run: () => docs().openFiles(),
  },
  {
    id: 'file.save',
    title: 'Save',
    group: 'File',
    shortcut: 'Ctrl+S',
    available: hasActiveDocument,
    run: () => {
      const id = docs().activeId;
      if (id) return docs().save(id);
    },
  },
  {
    id: 'file.saveAs',
    title: 'Save as…',
    group: 'File',
    shortcut: 'Ctrl+Shift+S',
    available: hasActiveDocument,
    run: () => {
      const id = docs().activeId;
      if (id) return docs().saveAs(id);
    },
  },
  {
    id: 'file.saveAll',
    title: 'Save all',
    group: 'File',
    shortcut: 'Ctrl+Alt+S',
    available: () => docs().documents.some((doc) => doc.isDirty),
    run: () => docs().saveAll(),
  },
  {
    id: 'file.revert',
    title: 'Revert to last saved',
    group: 'File',
    keywords: 'undo discard changes',
    available: () => docs().documents.some((doc) => doc.id === docs().activeId && doc.isDirty),
    run: () => {
      const id = docs().activeId;
      if (id) return docs().revert(id);
    },
  },
  {
    id: 'file.reload',
    title: 'Reload from disk',
    group: 'File',
    keywords: 'refresh external changes',
    available: hasActiveDocument,
    run: () => {
      const id = docs().activeId;
      if (id) return docs().reloadFromDisk(id);
    },
  },
  {
    id: 'file.close',
    title: 'Close document',
    group: 'File',
    shortcut: 'Ctrl+W',
    available: hasActiveDocument,
    run: () => {
      const id = docs().activeId;
      if (id) return docs().close(id);
    },
  },

  /* ── Workspace ─────────────────────────────────────────────────────────── */
  {
    id: 'workspace.open',
    title: 'Open folder…',
    group: 'Workspace',
    keywords: 'directory project vault',
    run: () => workspace().chooseFolder(),
  },
  {
    id: 'workspace.refresh',
    title: 'Rescan folder',
    group: 'Workspace',
    available: () => workspace().root !== null,
    run: () => workspace().refresh(),
  },
  {
    id: 'workspace.close',
    title: 'Close folder',
    group: 'Workspace',
    available: () => workspace().root !== null,
    run: () => workspace().closeFolder(),
  },

  /* ── View ──────────────────────────────────────────────────────────────── */
  {
    id: 'view.rendered',
    title: 'Rendered view',
    group: 'View',
    shortcut: 'Ctrl+1',
    run: () => ui().setViewMode('read'),
  },
  {
    id: 'view.split',
    title: 'Split view',
    group: 'View',
    shortcut: 'Ctrl+2',
    available: () => !ui().isCompact,
    run: () => ui().setViewMode('split'),
  },
  {
    id: 'view.source',
    title: 'Source view',
    group: 'View',
    shortcut: 'Ctrl+3',
    keywords: 'markdown raw',
    run: () => ui().setViewMode('source'),
  },
  {
    id: 'view.toggleRail',
    title: 'Toggle sidebar',
    group: 'View',
    shortcut: 'Ctrl+B',
    run: () => ui().toggleRail(),
  },
  {
    id: 'view.files',
    title: 'Show files',
    group: 'View',
    shortcut: 'Ctrl+Shift+E',
    run: () => ui().showRailPanel('files'),
  },
  {
    id: 'view.outline',
    title: 'Show outline',
    group: 'View',
    shortcut: 'Ctrl+Shift+O',
    keywords: 'table of contents toc headings',
    run: () => ui().showRailPanel('outline'),
  },
  {
    id: 'view.focus',
    title: 'Toggle focus mode',
    group: 'View',
    shortcut: 'Ctrl+Shift+F',
    keywords: 'zen distraction free',
    run: () => ui().toggleFocusMode(),
  },
  {
    id: 'view.theme',
    title: 'Toggle light / dark',
    group: 'View',
    keywords: 'appearance colour scheme',
    run: () => settings().toggleTheme(),
  },
  {
    id: 'view.textBigger',
    title: 'Increase text size',
    group: 'View',
    shortcut: 'Ctrl+=',
    run: () => settings().adjustReadingSize(1),
  },
  {
    id: 'view.textSmaller',
    title: 'Decrease text size',
    group: 'View',
    shortcut: 'Ctrl+-',
    run: () => settings().adjustReadingSize(-1),
  },
  {
    id: 'view.serif',
    title: 'Reading font: serif',
    group: 'View',
    run: () => settings().setReadingFamily('serif'),
  },
  {
    id: 'view.sans',
    title: 'Reading font: sans',
    group: 'View',
    run: () => settings().setReadingFamily('sans'),
  },
  {
    id: 'view.mono',
    title: 'Reading font: monospace',
    group: 'View',
    run: () => settings().setReadingFamily('mono'),
  },

  /* ── Edit ──────────────────────────────────────────────────────────────── */
  {
    id: 'edit.find',
    title: 'Find in document',
    group: 'Edit',
    shortcut: 'Ctrl+F',
    available: hasActiveDocument,
    run: () => ui().openFind(false),
  },
  {
    id: 'edit.replace',
    title: 'Find and replace',
    group: 'Edit',
    shortcut: 'Ctrl+H',
    available: hasActiveDocument,
    run: () => ui().openFind(true),
  },
  {
    id: 'edit.undo',
    title: 'Undo',
    group: 'Edit',
    shortcut: 'Ctrl+Z',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().undo().run();
    },
  },
  {
    id: 'edit.redo',
    title: 'Redo',
    group: 'Edit',
    shortcut: 'Ctrl+Shift+Z',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().redo().run();
    },
  },

  /* ── Insert ────────────────────────────────────────────────────────────── */
  {
    id: 'insert.heading1',
    title: 'Heading 1',
    group: 'Insert',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    id: 'insert.heading2',
    title: 'Heading 2',
    group: 'Insert',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    id: 'insert.bulletList',
    title: 'Bullet list',
    group: 'Insert',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: 'insert.taskList',
    title: 'Task list',
    group: 'Insert',
    keywords: 'checkbox todo',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().toggleTaskList().run();
    },
  },
  {
    id: 'insert.codeBlock',
    title: 'Code block',
    group: 'Insert',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    id: 'insert.table',
    title: 'Table',
    group: 'Insert',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    id: 'insert.image',
    title: 'Image…',
    group: 'Insert',
    shortcut: 'Ctrl+Shift+I',
    available: ({ editor }) => Boolean(editor),
    run: () => ui().openOverlay('image'),
  },
  {
    id: 'insert.rule',
    title: 'Horizontal rule',
    group: 'Insert',
    keywords: 'divider hr separator',
    available: ({ editor }) => Boolean(editor),
    run: ({ editor }) => {
      editor?.chain().focus().setHorizontalRule().run();
    },
  },

  /* ── Help ──────────────────────────────────────────────────────────────── */
  {
    id: 'help.shortcuts',
    title: 'Keyboard shortcuts',
    group: 'Help',
    shortcut: 'Ctrl+/',
    run: () => ui().openOverlay('shortcuts'),
  },
  {
    id: 'help.settings',
    title: 'Settings',
    group: 'Help',
    shortcut: 'Ctrl+,',
    keywords: 'preferences options',
    run: () => ui().openOverlay('settings'),
  },
];

export function availableCommands(context: CommandContext): Command[] {
  return COMMANDS.filter((command) => command.available?.(context) ?? true);
}

export function findCommand(id: string): Command | undefined {
  return COMMANDS.find((command) => command.id === id);
}
