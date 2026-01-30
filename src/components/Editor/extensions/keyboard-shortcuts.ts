import { Extension } from '@tiptap/core';

/**
 * Custom keyboard shortcuts for RendMD editor.
 * 
 * List shortcuts:
 * - Tab: Indent list item
 * - Shift+Tab: Outdent list item
 * - Ctrl+Shift+8: Toggle bullet list
 * - Ctrl+Shift+9: Toggle ordered list
 * - Ctrl+Shift+X: Toggle task list
 * 
 * Formatting shortcuts:
 * - Ctrl+`: Toggle inline code
 * - Ctrl+Shift+B: Toggle blockquote
 * - Ctrl+Alt+C: Toggle code block
 * - Ctrl+K: Add/edit link
 * 
 * Heading shortcuts:
 * - Ctrl+1 through Ctrl+6: Toggle headings
 */
export const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',
  
  addKeyboardShortcuts() {
    return {
      // List indentation
      'Tab': () => {
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.sinkListItem('taskItem');
        }
        return false;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.liftListItem('listItem');
        }
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.liftListItem('taskItem');
        }
        return false;
      },
      
      // List toggles
      'Mod-Shift-8': () => this.editor.commands.toggleBulletList(),
      'Mod-Shift-9': () => this.editor.commands.toggleOrderedList(),
      'Mod-Shift-x': () => this.editor.commands.toggleTaskList(),
      
      // Formatting
      'Mod-`': () => this.editor.commands.toggleCode(),
      'Mod-Shift-b': () => this.editor.commands.toggleBlockquote(),
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),
      
      // Headings (Ctrl+1 through Ctrl+6)
      'Mod-1': () => this.editor.commands.toggleHeading({ level: 1 }),
      'Mod-2': () => this.editor.commands.toggleHeading({ level: 2 }),
      'Mod-3': () => this.editor.commands.toggleHeading({ level: 3 }),
      'Mod-4': () => this.editor.commands.toggleHeading({ level: 4 }),
      'Mod-5': () => this.editor.commands.toggleHeading({ level: 5 }),
      'Mod-6': () => this.editor.commands.toggleHeading({ level: 6 }),
    };
  },
});
