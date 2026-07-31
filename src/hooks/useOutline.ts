import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Document outline.
 *
 * Headings are read straight out of the ProseMirror document rather than from
 * the markdown source, so the outline matches what is on screen — including
 * edits made a keystroke ago.
 *
 * The active heading is tracked with an IntersectionObserver rather than by
 * comparing scroll offsets. Offset arithmetic has to be redone whenever the
 * chrome height, reading size, or window size changes; the observer just
 * reports what is in view.
 */

export interface OutlineItem {
  id: string;
  text: string;
  level: number;
  /** ProseMirror document position, used to scroll to the heading. */
  pos: number;
}

interface UseOutlineResult {
  items: OutlineItem[];
  activeId: string | null;
  scrollTo: (item: OutlineItem) => void;
}

/** Stable identity, so consumers memoising on `items` don't churn. */
const EMPTY_OUTLINE: OutlineItem[] = [];

export function useOutline(editor: Editor | null): UseOutlineResult {
  const [items, setItems] = useState<OutlineItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const frameRef = useRef<number | undefined>(undefined);

  /* ── Extraction ────────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!editor) return;

    const extract = (): void => {
      const found: OutlineItem[] = [];

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name !== 'heading') return;
        const text = node.textContent.trim();
        found.push({
          id: `h-${pos}`,
          text: text || 'Untitled section',
          level: node.attrs.level as number,
          pos,
        });
      });

      setItems((previous) => (sameOutline(previous, found) ? previous : found));
    };

    // Coalesce bursts of typing into one extraction per frame. Safe for
    // updates: if the user is typing, the page is visible and frames are
    // being produced.
    const schedule = (): void => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(extract);
    };

    // The *first* extraction deliberately does not use rAF. A page that isn't
    // compositing — a background tab, a restored session — never runs frame
    // callbacks, and the outline would stay empty until the tab was focused.
    // A microtask always runs promptly, and keeps the effect body itself free
    // of a synchronous setState.
    queueMicrotask(extract);
    editor.on('update', schedule);

    return () => {
      editor.off('update', schedule);
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
    };
  }, [editor]);

  /* ── Active heading ────────────────────────────────────────────────────── */

  useEffect(() => {
    if (!editor || editor.isDestroyed || items.length === 0) return;

    // `editor.view` throws if the ProseMirror view hasn't attached yet, which
    // is the case on the first pass when the editor is handed up during
    // onCreate. Nothing to observe until it exists.
    const scroller = getScrollContainer(editor);
    if (!scroller) return;

    // Elements resolved fresh each run: ProseMirror replaces DOM nodes freely.
    const elements = new Map<Element, string>();
    for (const item of items) {
      const element = headingElementAt(editor, item.pos);
      if (element) elements.set(element, item.id);
    }
    if (elements.size === 0) return;

    // Treat the top ~30% of the viewport as "where the reader is looking".
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          const id = elements.get(visible[0].target);
          if (id) setActiveId(id);
        }
      },
      { root: scroller, rootMargin: '0px 0px -70% 0px', threshold: 0 },
    );

    for (const element of elements.keys()) observer.observe(element);
    return () => observer.disconnect();
  }, [editor, items]);

  /* ── Navigation ────────────────────────────────────────────────────────── */

  const scrollTo = useCallback(
    (item: OutlineItem) => {
      if (!editor) return;
      if (item.pos < 0 || item.pos >= editor.state.doc.content.size) return;

      const element = headingElementAt(editor, item.pos);
      element?.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Reflect the click straight away — the observer will confirm it once
      // the smooth scroll settles.
      setActiveId(item.id);
    },
    [editor],
  );

  // Both derived rather than reset from an effect: with no editor there is no
  // outline, and an id that no longer appears in it is not the active one.
  const resolvedItems = editor ? items : EMPTY_OUTLINE;
  const resolvedActiveId = resolvedItems.some((item) => item.id === activeId) ? activeId : null;

  return { items: resolvedItems, activeId: resolvedActiveId, scrollTo };
}

function headingElementAt(editor: Editor, pos: number): HTMLElement | null {
  try {
    const node = editor.view.nodeDOM(pos);
    if (node instanceof HTMLElement) return node;
    return node?.parentElement ?? null;
  } catch {
    // Position went stale between extraction and lookup, or the view is gone.
    return null;
  }
}

function getScrollContainer(editor: Editor): HTMLElement | null {
  try {
    const found = editor.view.dom.closest('[data-scroll-container]');
    return found instanceof HTMLElement ? found : null;
  } catch {
    return null;
  }
}

function sameOutline(a: OutlineItem[], b: OutlineItem[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((item, i) => item.id === b[i].id && item.text === b[i].text);
}
