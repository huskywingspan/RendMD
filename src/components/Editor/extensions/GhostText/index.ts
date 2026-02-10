// Ghost Text autocomplete extension — shows gray continuation text after cursor.
// Desktop only. Accept with Tab, dismiss with Escape or any typing.

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';

const ghostTextPluginKey = new PluginKey('ghostText');

interface GhostTextState {
  text: string | null;
  pos: number;
}

export interface GhostTextOptions {
  /** Fetch a ghost text suggestion for the given preceding text. */
  getSuggestion: (precedingText: string, signal: AbortSignal) => Promise<string>;
  /** Debounce delay in ms before triggering a suggestion. Default: 1500. */
  debounceMs?: number;
  /** Whether ghost text is enabled. */
  enabled?: boolean;
}

export const GhostText = Extension.create<GhostTextOptions>({
  name: 'ghostText',

  addOptions() {
    return {
      getSuggestion: async () => '',
      debounceMs: 1500,
      enabled: true,
    };
  },

  addProseMirrorPlugins() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias -- Needed to access TipTap extension options inside ProseMirror plugin closure
    const extension = this;

    return [
      new Plugin<GhostTextState>({
        key: ghostTextPluginKey,

        state: {
          init(): GhostTextState {
            return { text: null, pos: 0 };
          },
          apply(tr, state): GhostTextState {
            // Clear ghost text on any document change or selection change
            const meta = tr.getMeta(ghostTextPluginKey);
            if (meta !== undefined) {
              return meta as GhostTextState;
            }
            if (tr.docChanged || tr.selectionSet) {
              return { text: null, pos: 0 };
            }
            return state;
          },
        },

        props: {
          decorations(state) {
            const pluginState = ghostTextPluginKey.getState(state) as GhostTextState | undefined;
            if (!pluginState?.text) return DecorationSet.empty;

            // Create a widget decoration at the cursor position
            const widget = Decoration.widget(pluginState.pos, () => {
              const span = document.createElement('span');
              span.className = 'ghost-text';
              span.textContent = pluginState.text;
              return span;
            }, { side: 1 });

            return DecorationSet.create(state.doc, [widget]);
          },

          handleKeyDown(view: EditorView, event: KeyboardEvent) {
            const pluginState = ghostTextPluginKey.getState(view.state) as GhostTextState | undefined;
            if (!pluginState?.text) return false;

            if (event.key === 'Tab') {
              // Accept ghost text
              event.preventDefault();
              const { pos, text } = pluginState;
              const tr = view.state.tr;
              tr.insertText(text!, pos);
              tr.setMeta(ghostTextPluginKey, { text: null, pos: 0 });
              view.dispatch(tr);
              return true;
            }

            if (event.key === 'Escape') {
              // Dismiss ghost text
              event.preventDefault();
              const tr = view.state.tr;
              tr.setMeta(ghostTextPluginKey, { text: null, pos: 0 });
              view.dispatch(tr);
              return true;
            }

            // Any other key dismisses ghost text (the apply() handles this via docChanged)
            return false;
          },
        },

        view(editorView: EditorView) {
          let debounceTimer: ReturnType<typeof setTimeout> | null = null;
          let abortController: AbortController | null = null;

          function scheduleGhostText(): void {
            // Cancel any pending request
            if (debounceTimer) clearTimeout(debounceTimer);
            if (abortController) abortController.abort();

            if (!extension.options.enabled) return;

            const state = editorView.state;
            const { from, to } = state.selection;

            // Only trigger when cursor is at a single position (no selection)
            if (from !== to) return;

            // Don't trigger in code blocks
            const $pos = state.doc.resolve(from);
            const parentNode = $pos.parent;
            if (parentNode.type.name === 'codeBlock') return;

            // Check cursor is at end of a text block
            if (from !== $pos.end()) return;

            // Need at least some preceding content
            const docText = state.doc.textContent;
            if (docText.length < 20) return;

            debounceTimer = setTimeout(async () => {
              // Get preceding text (up to ~500 chars)
              const precedingText = docText.slice(Math.max(0, docText.length - 500));

              abortController = new AbortController();

              try {
                const suggestion = await extension.options.getSuggestion(
                  precedingText,
                  abortController.signal,
                );

                if (suggestion && suggestion.trim()) {
                  // Verify cursor hasn't moved
                  const currentState = editorView.state;
                  const currentFrom = currentState.selection.from;
                  if (currentFrom === from) {
                    const tr = currentState.tr;
                    tr.setMeta(ghostTextPluginKey, { text: suggestion, pos: currentFrom });
                    editorView.dispatch(tr);
                  }
                }
              } catch {
                // Aborted or error — ignore silently
              }
            }, extension.options.debounceMs ?? 1500);
          }

          return {
            update() {
              scheduleGhostText();
            },
            destroy() {
              if (debounceTimer) clearTimeout(debounceTimer);
              if (abortController) abortController.abort();
            },
          };
        },
      }),
    ];
  },
});
