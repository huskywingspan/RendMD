import { useEffect, useCallback, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useEditorStore } from '@/stores/editorStore';
import type { TOCItem } from '@/types';

/**
 * Hook that extracts headings from a TipTap editor instance
 * and manages the Table of Contents state.
 * 
 * Listens for editor updates and populates the store with TOC items.
 * Also tracks the currently visible heading based on scroll position.
 */
export function useTOC(editor: Editor | null): void {
  const { setTocItems, setActiveTocId, tocItems } = useEditorStore();
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Extract headings from the editor document
  const extractHeadings = useCallback(() => {
    if (!editor) {
      setTocItems([]);
      return;
    }

    const headings: TOCItem[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        headings.push({
          id: `heading-${pos}`,
          text: node.textContent,
          level: node.attrs.level as number,
          pos,
        });
      }
    });

    setTocItems(headings);
  }, [editor, setTocItems]);

  // Extract headings on editor changes
  useEffect(() => {
    if (!editor) return;

    extractHeadings();
    editor.on('update', extractHeadings);
    return () => {
      editor.off('update', extractHeadings);
    };
  }, [editor, extractHeadings]);

  // Track active heading based on scroll position
  const updateActiveItem = useCallback(() => {
    if (!editor || tocItems.length === 0) return;

    const editorDom = editor.view.dom;
    const scrollParent = editorDom.closest('.overflow-y-auto') ?? editorDom.parentElement;
    if (!scrollParent) return;

    const scrollTop = scrollParent.scrollTop;
    const scrollOffset = 60; // Offset to determine "active" heading

    let activeId = tocItems[0]?.id ?? null;
    
    for (const item of tocItems) {
      try {
        const domAtPos = editor.view.domAtPos(item.pos);
        const element = domAtPos.node instanceof HTMLElement 
          ? domAtPos.node 
          : domAtPos.node.parentElement;
        
        if (element && element.offsetTop <= scrollTop + scrollOffset) {
          activeId = item.id;
        } else {
          break;
        }
      } catch {
        // Position may be invalid after doc changes, skip
        continue;
      }
    }

    setActiveTocId(activeId);
  }, [editor, tocItems, setActiveTocId]);

  // Attach scroll listener to the editor's scroll container
  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;
    const scrollParent = editorDom.closest('.overflow-y-auto') ?? editorDom.parentElement;
    if (!scrollParent) return;

    scrollContainerRef.current = scrollParent as HTMLElement;

    const handleScroll = () => {
      requestAnimationFrame(updateActiveItem);
    };

    scrollParent.addEventListener('scroll', handleScroll, { passive: true });
    // Initial check
    updateActiveItem();

    return () => {
      scrollParent.removeEventListener('scroll', handleScroll);
    };
  }, [editor, updateActiveItem]);
}

/**
 * Scroll the editor to a specific TOC heading
 */
export function scrollToHeading(editor: Editor, item: TOCItem): void {
  try {
    // Validate position is within document bounds
    const docSize = editor.state.doc.content.size;
    if (item.pos < 0 || item.pos >= docSize) {
      console.warn('Invalid heading position:', item.pos, 'docSize:', docSize);
      return;
    }

    // Try to find the heading element in the DOM
    // Use a timeout to avoid blocking the main thread
    requestAnimationFrame(() => {
      try {
        // nodeDOM returns the actual DOM element for the node at this position
        const domNode = editor.view.nodeDOM(item.pos);
        
        let element: HTMLElement | null = null;
        if (domNode instanceof HTMLElement) {
          element = domNode;
        } else if (domNode?.parentElement) {
          element = domNode.parentElement;
        }

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      } catch (domError) {
        console.warn('Failed to get DOM element for heading:', domError);
      }
    });
  } catch (error) {
    console.warn('Failed to scroll to heading:', error);
  }
}
