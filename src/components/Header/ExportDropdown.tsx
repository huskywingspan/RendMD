import { useState, useRef, useEffect, useCallback } from 'react';
import { Download, FileText, Printer, ClipboardCopy } from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { exportAsHTML, exportAsPDF, copyAsRichText } from '@/utils/exportHelpers';
import { useToastStore } from '@/stores/toastStore';
import { useEditorStore } from '@/stores/editorStore';

interface ExportDropdownProps {
  editor: Editor | null;
}

export function ExportDropdown({ editor }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToastStore();
  const { fileName } = useEditorStore();

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    
    function handleClickOutside(e: MouseEvent): void {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    
    function handleEscape(e: KeyboardEvent): void {
      if (e.key === 'Escape') setIsOpen(false);
    }
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleExportHTML = useCallback(() => {
    if (!editor) return;
    const name = fileName ?? 'document.md';
    exportAsHTML(editor, name);
    addToast('Exported as HTML', 'success');
    setIsOpen(false);
  }, [editor, fileName, addToast]);

  const handleExportPDF = useCallback(() => {
    if (!editor) {
      addToast('Editor not ready — try again', 'error');
      return;
    }
    addToast('Opening print dialog…', 'info');
    exportAsPDF(editor);
    setIsOpen(false);
  }, [editor, addToast]);

  const handleCopyRichText = useCallback(async () => {
    if (!editor) return;
    try {
      await copyAsRichText(editor);
      addToast('Copied as rich text', 'success');
    } catch {
      addToast('Failed to copy — check browser permissions', 'error');
    }
    setIsOpen(false);
  }, [editor, addToast]);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded hover:bg-sunken text-ink-muted transition-colors"
        title="Export document"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Download size={14} />
        <span className="hidden sm:inline">Export</span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full right-0 sm:left-0 sm:right-auto mt-1 w-52 py-1 rounded-lg border border-line bg-surface shadow-lg z-50"
          role="menu"
        >
          <button
            onClick={handleExportHTML}
            disabled={!editor}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-ink-muted hover:bg-sunken hover:text-ink transition-colors disabled:opacity-40"
            role="menuitem"
          >
            <FileText size={14} />
            Export as HTML
          </button>
          <button
            onClick={handleExportPDF}
            disabled={!editor}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-ink-muted hover:bg-sunken hover:text-ink transition-colors disabled:opacity-40"
            role="menuitem"
          >
            <Printer size={14} />
            Print / Save as PDF
          </button>
          <div className="h-px my-1 bg-[var(--rmd-line)]" />
          <button
            onClick={handleCopyRichText}
            disabled={!editor}
            className="flex items-center gap-3 w-full px-3 py-2 text-sm text-ink-muted hover:bg-sunken hover:text-ink transition-colors disabled:opacity-40"
            role="menuitem"
          >
            <ClipboardCopy size={14} />
            Copy as rich text
          </button>
        </div>
      )}
    </div>
  );
}
