import { useState, useRef, useEffect, useCallback } from 'react';
import { MoreVertical, FolderOpen, Save, FileText, Printer, ClipboardCopy, Eye, Code, Palette, Settings, Keyboard, FilePlus } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { useEditorStore } from '@/stores/editorStore';
import { useFileSystem } from '@/hooks';
import { useToastStore } from '@/stores/toastStore';
import { exportAsHTML, exportAsPDF, copyAsRichText } from '@/utils/exportHelpers';
import { cn } from '@/utils/cn';
import type { ThemeName, ViewMode } from '@/types';

const THEMES: { value: ThemeName; label: string }[] = [
  { value: 'dark-basic', label: 'Dark' },
  { value: 'light-basic', label: 'Light' },
  { value: 'dark-glass', label: 'Dark Glass' },
  { value: 'light-glass', label: 'Light Glass' },
];

interface MobileMenuProps {
  editor: Editor | null;
  onOpenSettings: () => void;
}

export function MobileMenu({ editor, onOpenSettings }: MobileMenuProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [themeSubmenu, setThemeSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { openFile, saveFile, saveFileAs } = useFileSystem();
  const { addToast } = useToastStore();
  const { fileName, viewMode, setViewMode, theme, setTheme, setShortcutsModalOpen, newFile } = useEditorStore();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setThemeSubmenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setThemeSubmenu(false);
      }
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setThemeSubmenu(false);
  }, []);

  const handleOpen = useCallback(async () => {
    close();
    await openFile();
  }, [close, openFile]);

  const handleNew = useCallback(() => {
    close();
    newFile();
  }, [close, newFile]);

  const handleSave = useCallback(async () => {
    close();
    await saveFile();
  }, [close, saveFile]);

  const handleSaveAs = useCallback(async () => {
    close();
    await saveFileAs();
  }, [close, saveFileAs]);

  const handleExportHTML = useCallback(() => {
    if (!editor) return;
    exportAsHTML(editor, fileName ?? 'document.md');
    addToast('Exported as HTML', 'success');
    close();
  }, [editor, fileName, addToast, close]);

  const handlePrint = useCallback(() => {
    addToast('Opening print dialog…', 'info');
    exportAsPDF();
    close();
  }, [addToast, close]);

  const handleCopyRich = useCallback(async () => {
    if (!editor) return;
    try {
      await copyAsRichText(editor);
      addToast('Copied as rich text', 'success');
    } catch {
      addToast('Failed to copy', 'error');
    }
    close();
  }, [editor, addToast, close]);

  const handleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    close();
  }, [setViewMode, close]);

  const handleTheme = useCallback((t: ThemeName) => {
    setTheme(t);
    close();
  }, [setTheme, close]);

  const handleSettings = useCallback(() => {
    close();
    onOpenSettings();
  }, [close, onOpenSettings]);

  const handleShortcuts = useCallback(() => {
    close();
    setShortcutsModalOpen(true);
  }, [close, setShortcutsModalOpen]);

  const itemClass = "flex items-center gap-3 w-full px-4 py-2.5 text-sm text-[var(--theme-text-secondary)] hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors";
  const divider = <div className="h-px my-1 bg-[var(--theme-border-primary)]" />;

  return (
    <div ref={menuRef} className="relative sm:hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded hover:bg-[var(--theme-bg-tertiary)] transition-colors"
        aria-label="More actions"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreVertical size={18} className="text-[var(--theme-text-secondary)]" />
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 w-56 py-1 rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-secondary)] shadow-lg z-50"
          role="menu"
        >
          {/* File operations */}
          <button onClick={handleNew} className={itemClass} role="menuitem">
            <FilePlus size={16} /> New File
          </button>
          <button onClick={handleOpen} className={itemClass} role="menuitem">
            <FolderOpen size={16} /> Open File
          </button>
          <button onClick={handleSave} className={itemClass} role="menuitem">
            <Save size={16} /> Save
          </button>
          <button onClick={handleSaveAs} className={itemClass} role="menuitem">
            <Save size={16} /> Save As…
          </button>

          {divider}

          {/* Export */}
          <button onClick={handleExportHTML} className={itemClass} role="menuitem" disabled={!editor}>
            <FileText size={16} /> Export HTML
          </button>
          <button onClick={handlePrint} className={itemClass} role="menuitem">
            <Printer size={16} /> Print / PDF
          </button>
          <button onClick={handleCopyRich} className={itemClass} role="menuitem" disabled={!editor}>
            <ClipboardCopy size={16} /> Copy Rich Text
          </button>

          {divider}

          {/* View Mode — only render & source (no split on mobile) */}
          <div className="px-4 py-1.5 text-xs font-medium text-[var(--theme-text-muted)] uppercase tracking-wide">
            View
          </div>
          <button
            onClick={() => handleViewMode('render')}
            className={cn(itemClass, viewMode === 'render' && 'text-[var(--theme-accent-primary)]')}
            role="menuitemradio"
            aria-checked={viewMode === 'render'}
          >
            <Eye size={16} /> Rendered
          </button>
          <button
            onClick={() => handleViewMode('source')}
            className={cn(itemClass, viewMode === 'source' && 'text-[var(--theme-accent-primary)]')}
            role="menuitemradio"
            aria-checked={viewMode === 'source'}
          >
            <Code size={16} /> Source
          </button>

          {divider}

          {/* Theme */}
          <button
            onClick={() => setThemeSubmenu(!themeSubmenu)}
            className={itemClass}
            role="menuitem"
            aria-expanded={themeSubmenu}
          >
            <Palette size={16} /> Theme
            <span className="ml-auto text-xs text-[var(--theme-text-muted)]">
              {THEMES.find(t => t.value === theme)?.label}
            </span>
          </button>
          {themeSubmenu && (
            <div className="pl-8 py-1">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTheme(t.value)}
                  className={cn(
                    "w-full text-left px-4 py-2 text-sm transition-colors",
                    theme === t.value
                      ? "text-[var(--theme-accent-primary)]"
                      : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]"
                  )}
                  role="menuitemradio"
                  aria-checked={theme === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {divider}

          <button onClick={handleShortcuts} className={itemClass} role="menuitem">
            <Keyboard size={16} /> Shortcuts
          </button>
          <button onClick={handleSettings} className={itemClass} role="menuitem">
            <Settings size={16} /> Settings
          </button>
        </div>
      )}
    </div>
  );
}
