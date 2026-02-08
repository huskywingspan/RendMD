import { useState, useEffect, useCallback, useRef } from 'react';
import { codeToHtml } from 'shiki';
import { useTheme } from '@/hooks';
import { cn } from '@/utils/cn';

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

// Shared text styling for perfect alignment between textarea and Shiki output
const TEXT_STYLES = {
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  fontSize: 'var(--editor-font-size, 14px)',
  lineHeight: '1.6',
  tabSize: 2,
} as const;

/**
 * SourceEditor - Markdown source editor with Shiki syntax highlighting
 * 
 * Uses an overlay approach: transparent textarea for editing,
 * Shiki-highlighted HTML underneath for visual display.
 * 
 * CRITICAL: Both textarea and Shiki output must have identical text styling
 * (font, size, line-height) for proper alignment.
 */
export function SourceEditor({ value, onChange, className }: SourceEditorProps): JSX.Element {
  const { isDark } = useTheme();
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  
  const shikiTheme = isDark ? 'github-dark-default' : 'github-light-default';

  // Sync scroll between textarea and highlighted view
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false;
    
    const highlight = async () => {
      try {
        const html = await codeToHtml(value || ' ', {
          lang: 'markdown',
          theme: shikiTheme,
        });
        
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        console.warn('Shiki highlighting failed:', error);
        if (!cancelled) {
          // Fallback to plain text
          setHighlightedHtml(`<pre style="margin:0;"><code>${escapeHtml(value)}</code></pre>`);
        }
      }
    };
    
    // Debounce highlighting for performance
    const timer = setTimeout(highlight, 50);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, shikiTheme]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  return (
    <div className={cn(
      "source-editor relative h-full overflow-hidden",
      "bg-[var(--theme-code-bg)]",
      className
    )}>
      {/* Shiki highlighted background (non-interactive) */}
      <div
        ref={highlightRef}
        className="source-highlight absolute inset-0 overflow-auto p-4 pointer-events-none"
        aria-hidden="true"
        style={{
          ...TEXT_STYLES,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
      
      {/* Transparent textarea for editing */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onScroll={handleScroll}
        className={cn(
          "source-textarea absolute inset-0 w-full h-full",
          "resize-none p-4 m-0",
          "bg-transparent text-transparent caret-[var(--theme-text-primary)]",
          "outline-none border-none"
        )}
        style={{
          ...TEXT_STYLES,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
    </div>
  );
}

/**
 * Escape HTML special characters for fallback rendering
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default SourceEditor;
