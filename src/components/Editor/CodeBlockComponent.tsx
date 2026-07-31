import { useCallback, useEffect, useRef, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import { Check, ChevronDown, Copy, Eye, PenLine, TriangleAlert } from 'lucide-react';
import { highlightCode, LANGUAGE_OPTIONS } from '@/lib/highlighter';
import { renderMermaid } from '@/lib/mermaid';
import { cn } from '@/utils/cn';

/**
 * Code block node view.
 *
 * Renders as two stacked layers: a Shiki-highlighted display layer, and a
 * transparent contenteditable <pre> above it that takes input. They must share
 * exact text metrics or the caret drifts from the glyphs — see prose.css.
 *
 * A ```mermaid block additionally offers a rendered view of the diagram, which
 * is what you actually want when reading a document rather than writing one.
 */
export function CodeBlockComponent({ node, updateAttributes, extension }: NodeViewProps) {
  const language: string = node.attrs.language ?? '';
  const code = node.textContent;
  const isDark: boolean = extension.options?.isDark ?? true;
  const isMermaid = language.toLowerCase() === 'mermaid';

  const [highlighted, setHighlighted] = useState('');
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Diagrams open rendered: reading is the common case, editing the exception.
  const [showDiagram, setShowDiagram] = useState(true);
  const [diagram, setDiagram] = useState<{ svg: string | null; error: string | null }>({
    svg: null,
    error: null,
  });

  const menuRef = useRef<HTMLDivElement>(null);

  /* ── Syntax highlighting ───────────────────────────────────────────────── */

  useEffect(() => {
    if (!code) {
      setHighlighted('');
      return;
    }

    let cancelled = false;
    void highlightCode(code, language, isDark).then((html) => {
      if (!cancelled) setHighlighted(html);
    });

    return () => {
      cancelled = true;
    };
  }, [code, language, isDark]);

  /* ── Diagram rendering ─────────────────────────────────────────────────── */

  useEffect(() => {
    if (!isMermaid || !showDiagram) return;

    let cancelled = false;
    // Debounced: re-rendering a diagram on every keystroke is both expensive
    // and useless, since intermediate states rarely parse.
    const timer = setTimeout(() => {
      void renderMermaid(code, isDark).then((result) => {
        if (!cancelled) setDiagram(result);
      });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isMermaid, showDiagram, code, isDark]);

  /* ── Menu ──────────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.warn('[RendMD] Could not copy to clipboard:', error);
    }
  }, [code]);

  const label = LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ?? 'Plain text';

  return (
    <NodeViewWrapper className="code-block-wrapper group">
      <div className="overflow-hidden rounded-lg border border-line bg-sunken">
        {/* Header */}
        <div className="flex items-center gap-1 border-b border-line px-2 py-1" contentEditable={false}>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-6 items-center gap-1 rounded-sm px-1.5 text-2xs text-ink-muted hover:bg-hover hover:text-ink"
            >
              {label}
              <ChevronDown size={10} aria-hidden />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute top-full left-0 z-20 mt-1 max-h-64 w-44 overflow-y-auto rounded-lg border border-line bg-overlay py-1 shadow-lg"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      updateAttributes({ language: option.value });
                      setMenuOpen(false);
                    }}
                    className={cn(
                      'w-full px-2.5 py-1 text-left text-sm',
                      option.value === language
                        ? 'text-accent'
                        : 'text-ink-muted hover:bg-hover hover:text-ink',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-0.5">
            {isMermaid && (
              <button
                type="button"
                onClick={() => setShowDiagram((value) => !value)}
                className="flex h-6 items-center gap-1 rounded-sm px-1.5 text-2xs text-ink-muted hover:bg-hover hover:text-ink"
              >
                {showDiagram ? <PenLine size={11} /> : <Eye size={11} />}
                {showDiagram ? 'Edit' : 'Preview'}
              </button>
            )}

            <button
              type="button"
              onClick={copy}
              aria-label={copied ? 'Copied' : 'Copy code'}
              className={cn(
                'flex h-6 items-center gap-1 rounded-sm px-1.5 text-2xs transition-opacity',
                copied
                  ? 'text-success'
                  : 'text-ink-muted opacity-0 group-hover:opacity-100 hover:bg-hover hover:text-ink focus-visible:opacity-100',
              )}
            >
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Rendered diagram, or the code itself */}
        {isMermaid && showDiagram ? (
          <div contentEditable={false} className="px-4 py-4">
            {diagram.error ? (
              <p className="flex items-start gap-2 text-sm text-warning">
                <TriangleAlert size={14} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {diagram.error}
                  <button
                    type="button"
                    onClick={() => setShowDiagram(false)}
                    className="ml-2 underline underline-offset-2"
                  >
                    Edit source
                  </button>
                </span>
              </p>
            ) : diagram.svg ? (
              <div
                className="mermaid-diagram flex justify-center overflow-x-auto"
                // Mermaid output; rendered with securityLevel 'strict', which
                // strips scripts and event handlers from the diagram source.
                dangerouslySetInnerHTML={{ __html: diagram.svg }}
              />
            ) : (
              <p className="text-sm text-ink-faint">Rendering diagram…</p>
            )}
          </div>
        ) : (
          <div className="code-block-content relative">
            {highlighted && (
              <div
                className="shiki-preview"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            )}

            <pre
              className={cn(
                'relative overflow-auto',
                highlighted ? 'text-transparent caret-ink' : 'text-ink',
              )}
            >
              {/* NodeViewContent's `as` prop is typed to div only; the code
                  element is what ProseMirror expects inside a code block. */}
              <NodeViewContent as={'code' as 'div'} />
            </pre>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
