import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import { COMMANDS } from '@/lib/commands';
import { useDocumentsStore } from '@/stores/documentsStore';
import { useUIStore } from '@/stores/uiStore';

/**
 * Application keyboard shortcuts.
 *
 * Bindings are derived from the command registry rather than duplicated here,
 * so the palette can never advertise a shortcut that isn't wired up.
 *
 * Everything is handled on the window in the capture phase. ProseMirror binds
 * aggressively inside the editor, and a document-level bubble listener would
 * lose Ctrl+F and friends to it.
 */
export function useGlobalShortcuts(editor: Editor | null): void {
  useEffect(() => {
    const bindings = COMMANDS.filter((command) => command.shortcut).map((command) => ({
      combo: parseShortcut(command.shortcut as string),
      command,
    }));

    const onKeyDown = (event: KeyboardEvent) => {
      // Let the palette and other overlays own the keyboard while they're up.
      if (useUIStore.getState().overlay !== null && event.key !== 'Escape') return;

      // Ctrl+K opens the palette. Not in the registry because it is the way you
      // reach the registry.
      if (isCombo(event, { ctrl: true, key: 'k' })) {
        event.preventDefault();
        useUIStore.getState().toggleOverlay('palette');
        return;
      }

      // Tab cycling. Kept out of the registry: they're navigation, and listing
      // six of them would bury the palette in noise.
      if (event.ctrlKey && event.key === 'Tab') {
        event.preventDefault();
        useDocumentsStore.getState().activateNext(event.shiftKey ? -1 : 1);
        return;
      }
      if (event.ctrlKey && !event.shiftKey && !event.altKey && /^[1-9]$/.test(event.key)) {
        // Ctrl+1..3 are view modes (registry); higher digits jump to a tab.
        const index = Number(event.key);
        if (index >= 4) {
          const { documents, setActive } = useDocumentsStore.getState();
          const target = documents[index - 1];
          if (target) {
            event.preventDefault();
            setActive(target.id);
          }
          return;
        }
      }

      for (const { combo, command } of bindings) {
        if (!isCombo(event, combo)) continue;
        if (command.available && !command.available({ editor })) continue;

        event.preventDefault();
        void command.run({ editor });
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [editor]);
}

interface Combo {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  key: string;
}

/** "Ctrl+Shift+F" → { ctrl: true, shift: true, key: 'f' } */
function parseShortcut(shortcut: string): Combo {
  const parts = shortcut.toLowerCase().split('+');
  const key = parts.at(-1) ?? '';
  return {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    key,
  };
}

function isCombo(event: KeyboardEvent, combo: Combo): boolean {
  // metaKey stands in for ctrlKey so the same table works on macOS.
  const modifier = event.ctrlKey || event.metaKey;
  if (Boolean(combo.ctrl) !== modifier) return false;
  if (Boolean(combo.shift) !== event.shiftKey) return false;
  if (Boolean(combo.alt) !== event.altKey) return false;

  // Compare against event.key, lowercased — with Shift held, 'S' arrives
  // rather than 's', and on some layouts '/' arrives as '?'.
  return event.key.toLowerCase() === combo.key;
}
