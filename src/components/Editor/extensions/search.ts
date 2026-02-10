import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState as PMEditorState, Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Augment TipTap Commands interface so custom commands are typed
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    search: {
      setSearchTerm: (term: string) => ReturnType;
      setReplaceTerm: (term: string) => ReturnType;
      setSearchCaseSensitive: (caseSensitive: boolean) => ReturnType;
      nextSearchMatch: () => ReturnType;
      prevSearchMatch: () => ReturnType;
      replaceCurrentMatch: (replacement: string) => ReturnType;
      replaceAllMatches: (replacement: string) => ReturnType;
      clearSearch: () => ReturnType;
    };
  }
}

export interface SearchPluginState {
  searchTerm: string;
  replaceTerm: string;
  caseSensitive: boolean;
  currentMatchIndex: number;
  totalMatches: number;
  decorationSet: DecorationSet;
}

export const searchPluginKey = new PluginKey<SearchPluginState>('search');

/** Collect all text match positions in the ProseMirror document */
function findMatches(
  doc: PMEditorState['doc'],
  searchTerm: string,
  caseSensitive: boolean,
): { from: number; to: number }[] {
  if (!searchTerm) return [];

  const results: { from: number; to: number }[] = [];
  const term = caseSensitive ? searchTerm : searchTerm.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = caseSensitive ? node.text : node.text.toLowerCase();
    let index = text.indexOf(term);
    while (index !== -1) {
      results.push({ from: pos + index, to: pos + index + searchTerm.length });
      index = text.indexOf(term, index + 1);
    }
  });

  return results;
}

/** Build a DecorationSet from match positions, highlighting the active match */
function buildDecorations(
  doc: PMEditorState['doc'],
  matches: { from: number; to: number }[],
  activeIndex: number,
): DecorationSet {
  if (matches.length === 0) return DecorationSet.empty;

  const decorations = matches.map((m, i) =>
    Decoration.inline(m.from, m.to, {
      class: i === activeIndex ? 'search-highlight-active' : 'search-highlight',
    }),
  );

  return DecorationSet.create(doc, decorations);
}

function defaultState(): SearchPluginState {
  return {
    searchTerm: '',
    replaceTerm: '',
    caseSensitive: false,
    currentMatchIndex: 0,
    totalMatches: 0,
    decorationSet: DecorationSet.empty,
  };
}

/* ── Meta actions dispatched via transaction ─────────────────────────── */
interface SearchMeta {
  type: 'setSearch' | 'nextMatch' | 'prevMatch' | 'clearSearch' | 'setCaseSensitive';
  searchTerm?: string;
  replaceTerm?: string;
  caseSensitive?: boolean;
}

function applyMeta(
  state: SearchPluginState,
  meta: SearchMeta,
  doc: PMEditorState['doc'],
): SearchPluginState {
  switch (meta.type) {
    case 'setSearch': {
      const searchTerm = meta.searchTerm ?? state.searchTerm;
      const replaceTerm = meta.replaceTerm ?? state.replaceTerm;
      const matches = findMatches(doc, searchTerm, state.caseSensitive);
      const currentMatchIndex = matches.length > 0 ? 0 : 0;
      return {
        ...state,
        searchTerm,
        replaceTerm,
        currentMatchIndex,
        totalMatches: matches.length,
        decorationSet: buildDecorations(doc, matches, currentMatchIndex),
      };
    }
    case 'setCaseSensitive': {
      const caseSensitive = meta.caseSensitive ?? state.caseSensitive;
      const matches = findMatches(doc, state.searchTerm, caseSensitive);
      const idx = matches.length > 0 ? 0 : 0;
      return {
        ...state,
        caseSensitive,
        currentMatchIndex: idx,
        totalMatches: matches.length,
        decorationSet: buildDecorations(doc, matches, idx),
      };
    }
    case 'nextMatch': {
      if (state.totalMatches === 0) return state;
      const next = (state.currentMatchIndex + 1) % state.totalMatches;
      const matches = findMatches(doc, state.searchTerm, state.caseSensitive);
      return {
        ...state,
        currentMatchIndex: next,
        decorationSet: buildDecorations(doc, matches, next),
      };
    }
    case 'prevMatch': {
      if (state.totalMatches === 0) return state;
      const prev = (state.currentMatchIndex - 1 + state.totalMatches) % state.totalMatches;
      const matches = findMatches(doc, state.searchTerm, state.caseSensitive);
      return {
        ...state,
        currentMatchIndex: prev,
        decorationSet: buildDecorations(doc, matches, prev),
      };
    }
    case 'clearSearch':
      return defaultState();
    default:
      return state;
  }
}

export const SearchExtension = Extension.create({
  name: 'search',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchPluginState>({
        key: searchPluginKey,

        state: {
          init(): SearchPluginState {
            return defaultState();
          },

          apply(tr: Transaction, prev: SearchPluginState): SearchPluginState {
            const meta = tr.getMeta(searchPluginKey) as SearchMeta | undefined;
            if (meta) {
              return applyMeta(prev, meta, tr.doc);
            }
            // If the document changed, recompute decorations
            if (tr.docChanged && prev.searchTerm) {
              const matches = findMatches(tr.doc, prev.searchTerm, prev.caseSensitive);
              const idx = Math.min(prev.currentMatchIndex, Math.max(0, matches.length - 1));
              return {
                ...prev,
                totalMatches: matches.length,
                currentMatchIndex: idx,
                decorationSet: buildDecorations(tr.doc, matches, idx),
              };
            }
            return prev;
          },
        },

        props: {
          decorations(state) {
            return searchPluginKey.getState(state)?.decorationSet ?? DecorationSet.empty;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchTerm:
        (term: string) =>
        ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setSearch', searchTerm: term } as SearchMeta);
            dispatch(tr);
          }
          return true;
        },
      setReplaceTerm:
        (term: string) =>
        ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setSearch', replaceTerm: term } as SearchMeta);
            dispatch(tr);
          }
          return true;
        },
      setSearchCaseSensitive:
        (caseSensitive: boolean) =>
        ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'setCaseSensitive', caseSensitive } as SearchMeta);
            dispatch(tr);
          }
          return true;
        },
      nextSearchMatch:
        () =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: PMEditorState }) => {
          const pluginState = searchPluginKey.getState(state);
          if (!pluginState || pluginState.totalMatches === 0) return false;
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'nextMatch' } as SearchMeta);
            dispatch(tr);
          }
          // Scroll the next match into view
          requestAnimationFrame(() => {
            const active = document.querySelector('.search-highlight-active');
            active?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          });
          return true;
        },
      prevSearchMatch:
        () =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: PMEditorState }) => {
          const pluginState = searchPluginKey.getState(state);
          if (!pluginState || pluginState.totalMatches === 0) return false;
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'prevMatch' } as SearchMeta);
            dispatch(tr);
          }
          requestAnimationFrame(() => {
            const active = document.querySelector('.search-highlight-active');
            active?.scrollIntoView({ block: 'center', behavior: 'smooth' });
          });
          return true;
        },
      replaceCurrentMatch:
        (replacement: string) =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: PMEditorState }) => {
          const pluginState = searchPluginKey.getState(state);
          if (!pluginState || pluginState.totalMatches === 0) return false;

          const matches = findMatches(state.doc, pluginState.searchTerm, pluginState.caseSensitive);
          const match = matches[pluginState.currentMatchIndex];
          if (!match) return false;

          if (dispatch) {
            tr.insertText(replacement, match.from, match.to);
            // Recompute after replace
            tr.setMeta(searchPluginKey, {
              type: 'setSearch',
              searchTerm: pluginState.searchTerm,
            } as SearchMeta);
            dispatch(tr);
          }
          return true;
        },
      replaceAllMatches:
        (replacement: string) =>
        ({ tr, dispatch, state }: { tr: Transaction; dispatch?: (tr: Transaction) => void; state: PMEditorState }) => {
          const pluginState = searchPluginKey.getState(state);
          if (!pluginState || pluginState.totalMatches === 0) return false;

          const matches = findMatches(state.doc, pluginState.searchTerm, pluginState.caseSensitive);
          if (matches.length === 0) return false;

          if (dispatch) {
            // Replace in reverse order to preserve positions
            for (let i = matches.length - 1; i >= 0; i--) {
              tr.insertText(replacement, matches[i].from, matches[i].to);
            }
            tr.setMeta(searchPluginKey, { type: 'clearSearch' } as SearchMeta);
            dispatch(tr);
          }
          return true;
        },
      clearSearch:
        () =>
        ({ tr, dispatch }: { tr: Transaction; dispatch?: (tr: Transaction) => void }) => {
          if (dispatch) {
            tr.setMeta(searchPluginKey, { type: 'clearSearch' } as SearchMeta);
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
