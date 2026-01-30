import { Extension } from '@tiptap/core';

/**
 * Custom keyboard shortcuts for RendMD editor.
 * 
 * File shortcuts (handled at App level via events):
 * - Ctrl+O: Open file
 * - Ctrl+S: Save file
 * - Ctrl+Shift+S: Save As
 * 
 * List shortcuts:
 * - Tab: Indent list item / Next table cell
 * - Shift+Tab: Outdent list item / Previous table cell
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
 * 
 * Table shortcuts:
 * - Tab: Next cell (creates new row at end of table)
 * - Shift+Tab: Previous cell
 * - Enter at end of last cell: Create new row
 */
export const CustomKeyboardShortcuts = Extension.create({
  name: 'customKeyboardShortcuts',
  
  addKeyboardShortcuts() {
    return {
      // Table navigation with Tab - handled here for better control
      'Tab': () => {
        if (this.editor.isActive('table')) {
          // goToNextCell returns true if it moved, false if at end
          // When at end, it will automatically add a new row
          return this.editor.commands.goToNextCell();
        }
        // List indentation
        if (this.editor.isActive('listItem')) {
          return this.editor.commands.sinkListItem('listItem');
        }
        if (this.editor.isActive('taskItem')) {
          return this.editor.commands.sinkListItem('taskItem');
        }
        return false;
      },
      'Shift-Tab': () => {
        if (this.editor.isActive('table')) {
          return this.editor.commands.goToPreviousCell();
        }
        // List outdentation
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
