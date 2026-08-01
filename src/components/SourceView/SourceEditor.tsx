import { useState, useEffect, useCallback, useRef } from 'react';
import { highlightCode } from '@/lib/highlighter';
import { useSettingsStore, resolveTheme } from '@/stores/settingsStore';
import { cn } from '@/utils/cn';

interface SourceEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  onScrollSync?: () => void;
  scrollContainerRef?: (el: HTMLElement | null) => void;
}

// Shared text styling for perfect alignment between textarea and Shiki output
const TEXT_STYLES = {
  fontFamily: 'var(--rmd-font-mono)',
  // Steps down from the reading size: source is scanned, not read.
  fontSize: 'calc(var(--reading-size) * 0.82)',
  lineHeight: '1.65',
  tabSize: 2,
  fontVariantLigatures: 'none',
} as const;

/**
 * SourceEditor — markdown source with Shiki syntax highlighting.
 *
 * An overlay: a transparent textarea for editing over highlighted HTML for
 * display. Both must share exact text metrics or the caret drifts from the
 * glyphs.
 *
 * The textarea is *locally* controlled rather than driven straight from the
 * prop, and that is load-bearing rather than stylistic. Feeding a transformed
 * value back into a controlled textarea replaces the text under the cursor
 * mid-edit, so the next keypress lands at a stale offset — which is exactly
 * how backspacing in this editor once deleted lines elsewhere in the file.
 *
 * So: what the user types is what the textarea holds. An incoming `value` is
 * adopted only when it differs from what we last emitted, meaning it came from
 * somewhere else — an undo, a reload from disk, a switch of document — rather
 * than being an echo of the user's own keystroke.
 */
export function SourceEditor({ value, onChange, className, onScrollSync, scrollContainerRef }: SourceEditorProps) {
  const isDark = resolveTheme(useSettingsStore((s) => s.theme)) === 'dark';
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // What the textarea shows. Seeded from the prop, owned by the user after.
  const [text, setText] = useState(value);
  // The last string this component sent upward. An incoming value equal to it
  // is our own edit coming back and must not be re-applied.
  const lastEmitted = useRef(value);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setText(value);
  }, [value]);
  

  // Sync scroll between textarea and highlighted view
  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    onScrollSync?.();
  }, [onScrollSync]);

  // Expose textarea as scroll container to parent
  const textareaCallbackRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    scrollContainerRef?.(el);
  }, [scrollContainerRef]);

  // Highlight code with Shiki
  useEffect(() => {
    let cancelled = false;
    
    const highlight = async () => {
      try {
        const html = await highlightCode(text || ' ', 'markdown', isDark);
        
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        console.warn('Shiki highlighting failed:', error);
        if (!cancelled) {
          // Fallback to plain text
          setHighlightedHtml(`<pre style="margin:0;"><code>${escapeHtml(text)}</code></pre>`);
        }
      }
    };
    
    // Debounce highlighting for performance
    const timer = setTimeout(highlight, 50);
    
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [text, isDark]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = event.target.value;
      lastEmitted.current = next;
      setText(next);
      onChange(next);
    },
    [onChange],
  );

  return (
    <div className={cn(
      "source-editor relative h-full overflow-hidden",
      "bg-sunken",
      className
    )}>
      {/* Shiki highlighted background (non-interactive) */}
      <div
        ref={highlightRef}
        className="source-highlight pointer-events-none absolute inset-0 overflow-auto p-6"
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
        ref={textareaCallbackRef}
        value={text}
        onChange={handleChange}
        onScroll={handleScroll}
        className={cn(
          "source-textarea absolute inset-0 w-full h-full",
          "m-0 resize-none p-6",
          "bg-transparent text-transparent caret-ink",
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
