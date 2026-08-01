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

/**
 * SourceEditor — markdown source with Shiki syntax highlighting.
 *
 * An overlay: a transparent textarea for editing over highlighted HTML for
 * display. Both carry `.source-metrics`, which declares their text metrics in
 * one place — see src/styles/source.css. They must wrap identically or the
 * caret ends up at a different document offset than the text drawn beneath it,
 * and you silently edit a line you are not looking at.
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
        // A trailing newline is appended so the highlighted layer ends with
        // the same empty line box the textarea reserves. Without it the
        // backdrop is one row shorter, and the two scroll out of step over
        // the final row.
        const html = await highlightCode(`${text}
`, 'markdown', isDark);
        
        if (!cancelled) {
          setHighlightedHtml(html);
        }
      } catch (error) {
        console.warn('Shiki highlighting failed:', error);
        if (!cancelled) {
          // Fallback to plain text
          setHighlightedHtml(`<pre><code>${escapeHtml(text)}
</code></pre>`);
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
      {/* Highlighted backdrop. Never interactive; the textarea is on top. */}
      <div
        ref={highlightRef}
        className="source-highlight source-metrics absolute inset-0 overflow-auto"
        aria-hidden="true"
        dangerouslySetInnerHTML={{ __html: highlightedHtml }}
      />
      
      {/* Transparent textarea for editing */}
      <textarea
        ref={textareaCallbackRef}
        value={text}
        onChange={handleChange}
        onScroll={handleScroll}
        className="source-textarea source-metrics absolute inset-0 h-full w-full overflow-auto"
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
