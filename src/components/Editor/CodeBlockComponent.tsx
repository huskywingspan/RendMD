import { useState, useEffect, useCallback, useRef } from 'react';
import { NodeViewContent, NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Check, Copy, ChevronDown } from 'lucide-react';
import { highlightCode, LANGUAGE_OPTIONS } from '@/lib/highlighter';
import { cn } from '@/utils/cn';

export function CodeBlockComponent({ node, updateAttributes, extension }: NodeViewProps) {
  const { language } = node.attrs;
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get theme from extension options (defaults to dark)
  const isDark: boolean = extension.options?.isDark ?? true;
  
  // Get code content from the node
  const codeContent = node.textContent;

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false;

    if (!codeContent) {
      setHighlightedHtml('');
      return;
    }

    highlightCode(codeContent, language, isDark).then((html) => {
      if (!cancelled) setHighlightedHtml(html);
    });

    return () => {
      cancelled = true;
    };
  }, [codeContent, language, isDark]);

  // Copy code to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [codeContent]);

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: string) => {
    updateAttributes({ language: newLanguage });
    setIsDropdownOpen(false);
  }, [updateAttributes]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isDropdownOpen]);

  // Find current language label
  const currentLanguageLabel = LANGUAGE_OPTIONS.find(l => l.value === language)?.label || language || 'Plain text';

  return (
    <NodeViewWrapper className="code-block-wrapper relative my-4 group">
      {/* Header bar with language selector and copy button */}
      <div className="code-block-header flex items-center justify-between px-4 py-2 bg-[var(--theme-code-bg)] border border-b-0 border-[var(--theme-code-border)] rounded-t-lg">
        {/* Language selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors",
              "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]",
              "hover:bg-[var(--theme-bg-hover)]",
              isDropdownOpen && "bg-[var(--theme-bg-hover)] text-[var(--theme-text-primary)]"
            )}
            contentEditable={false}
          >
            <span className="font-medium">{currentLanguageLabel}</span>
            <ChevronDown 
              size={12} 
              className={cn("transition-transform", isDropdownOpen && "rotate-180")} 
            />
          </button>

          {/* Language dropdown */}
          {isDropdownOpen && (
            <div className="absolute left-0 top-full mt-1 w-40 max-h-64 overflow-y-auto bg-[var(--theme-bg-secondary)] border border-[var(--theme-border-primary)] rounded-lg shadow-lg z-50 py-1">
              {LANGUAGE_OPTIONS.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={cn(
                    "w-full px-3 py-1.5 text-left text-sm transition-colors",
                    language === lang.value
                      ? "bg-[var(--theme-accent-primary)]/10 text-[var(--theme-accent-primary)]"
                      : "hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-primary)]"
                  )}
                  contentEditable={false}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-all",
            "opacity-0 group-hover:opacity-100",
            isCopied 
              ? "text-[var(--color-success)]" 
              : "text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-hover)]"
          )}
          contentEditable={false}
          aria-label={isCopied ? "Copied!" : "Copy code"}
        >
          {isCopied ? (
            <>
              <Check size={14} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content area */}
      <div className="code-block-content relative">
        {/* Shiki highlighted preview (visible, non-editable) */}
        {highlightedHtml && (
          <div
            className="shiki-preview absolute inset-0 pointer-events-none overflow-auto rounded-b-lg border border-t-0 border-[var(--theme-code-border)]"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            aria-hidden="true"
          />
        )}
        
        {/* Actual editable content (transparent text, handles editing) */}
        <pre 
          className={cn(
            "rounded-b-lg border border-t-0 border-[var(--theme-code-border)] p-4 overflow-auto",
            "bg-[var(--theme-code-bg)]",
            highlightedHtml ? "text-transparent caret-[var(--theme-text-primary)]" : "text-[var(--theme-code-text)]"
          )}
          style={{ minHeight: '3rem' }}
        >
          <NodeViewContent className="font-mono text-sm leading-relaxed block" />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}
