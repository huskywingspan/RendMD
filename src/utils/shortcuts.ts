import type { ShortcutEntry } from '@/types';

/**
 * All keyboard shortcuts available in the application.
 * Used by ShortcutsModal and potentially for keybinding management.
 */
export const SHORTCUTS: ShortcutEntry[] = [
  // Formatting
  { action: 'Bold', keys: 'Ctrl+B', category: 'formatting' },
  { action: 'Italic', keys: 'Ctrl+I', category: 'formatting' },
  { action: 'Strikethrough', keys: 'Ctrl+Shift+X', category: 'formatting' },
  { action: 'Code', keys: 'Ctrl+`', category: 'formatting' },
  { action: 'Link', keys: 'Ctrl+K', category: 'formatting' },
  { action: 'Heading 1', keys: 'Ctrl+1', category: 'formatting' },
  { action: 'Heading 2', keys: 'Ctrl+2', category: 'formatting' },
  { action: 'Heading 3', keys: 'Ctrl+3', category: 'formatting' },
  { action: 'Heading 4', keys: 'Ctrl+4', category: 'formatting' },
  { action: 'Heading 5', keys: 'Ctrl+5', category: 'formatting' },
  { action: 'Heading 6', keys: 'Ctrl+6', category: 'formatting' },

  // Editing
  { action: 'Undo', keys: 'Ctrl+Z', category: 'editing' },
  { action: 'Redo', keys: 'Ctrl+Y', category: 'editing' },
  { action: 'Select All', keys: 'Ctrl+A', category: 'editing' },
  { action: 'Cut', keys: 'Ctrl+X', category: 'editing' },
  { action: 'Copy', keys: 'Ctrl+C', category: 'editing' },
  { action: 'Paste', keys: 'Ctrl+V', category: 'editing' },
  { action: 'Insert Image', keys: 'Ctrl+Shift+I', category: 'editing' },

  // File
  { action: 'Open', keys: 'Ctrl+O', category: 'file' },
  { action: 'Save', keys: 'Ctrl+S', category: 'file' },
  { action: 'Save As', keys: 'Ctrl+Shift+S', category: 'file' },

  // View
  { action: 'Cycle view mode', keys: 'Ctrl+/', category: 'view' },
  { action: 'Toggle sidebar', keys: '—', category: 'view' }, // TODO: Assign shortcut in future phase
  { action: 'Show toolbar', keys: 'Ctrl+Space', category: 'view' },

  // Navigation
  { action: 'Show shortcuts', keys: 'Ctrl+H', category: 'navigation' },
];

export const CATEGORY_LABELS: Record<ShortcutEntry['category'], string> = {
  formatting: 'Formatting',
  editing: 'Editing',
  file: 'File',
  view: 'View',
  navigation: 'Navigation',
};

export const CATEGORY_ORDER: ShortcutEntry['category'][] = [
  'formatting',
  'editing',
  'file',
  'view',
  'navigation',
];
