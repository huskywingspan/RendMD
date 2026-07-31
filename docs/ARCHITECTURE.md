# Architecture

RendMD is a client-only React application. There is no server, no API, and no build-time content — the deployed artifact is a folder of static files that the browser turns into an editor talking directly to your disk.

This document covers how it's put together and, where a choice was contested, why it went the way it did.

---

## The shape of it

```
┌─────────────────────────────────────────────────────────────┐
│  TitleBar        breadcrumb · palette trigger · view mode    │
├──────────┬──────────────────────────────────────────────────┤
│          │  TabStrip          one tab per open document      │
│  Rail    ├──────────────────────────────────────────────────┤
│          │                                                   │
│  files   │  Editor (TipTap)   and/or   SourceEditor          │
│    or    │                                                   │
│ outline  │                                                   │
├──────────┴──────────────────────────────────────────────────┤
│  StatusBar       save state · word count · line width        │
└─────────────────────────────────────────────────────────────┘
```

Overlays — command palette, settings, shortcuts, image insert — are portalled above this and mounted only while open.

## Source layout

```
src/
├── App.tsx                  Shell composition and boot
├── components/
│   ├── shell/               Chrome: TitleBar, TabStrip, Rail, FileTree,
│   │                        OutlinePanel, StatusBar, Welcome, ExportMenu
│   ├── Editor/              TipTap editor, bubble menu, popovers, extensions
│   ├── SourceView/          Raw markdown editor
│   ├── palette/             Command palette
│   ├── Frontmatter/         YAML metadata panel
│   ├── Modals/              Settings, shortcuts, image insert
│   └── UI/                  Modal, IconButton, Tooltip, Toast
├── stores/                  Zustand: documents, workspace, settings, ui, toast
├── hooks/                   Appearance, autosave, drop, shortcuts, outline, launch
├── lib/                     fs, sessionStore, commands, fuzzy, highlighter, mermaid
├── styles/                  tokens, base, prose, print, fonts
└── utils/                   Frontmatter parsing, export, images
```

## State

Four Zustand stores, split by lifetime rather than by feature. The split matters: a corrupted draft should never cost you your settings, and clearing settings should never lose your work.

| Store | Holds | Persisted to |
|---|---|---|
| `documentsStore` | Open documents, tab order, dirty state, file handles | IndexedDB |
| `workspaceStore` | The chosen folder, its file tree, expansion state | IndexedDB (handle only) |
| `settingsStore` | Theme, reading preferences, autosave, spellcheck | localStorage |
| `uiStore` | Rail, view mode, focus mode, which overlay is open | localStorage (partial) |

IndexedDB rather than localStorage for documents for two reasons: `FileSystemFileHandle` is a structured-cloneable object that localStorage cannot hold at all, and localStorage caps out around 5 MB per origin — which a handful of long transcripts will exceed, throwing and silently losing work.

## Working with files

`src/lib/fs.ts` wraps the File System Access API. Two things it has to get right.

**Capability, not browser sniffing.** Chromium has the whole API. Firefox and Safari have parts. Everything is feature-detected (`supportsFileSystemAccess`, `supportsDirectoryPicker`) and callers degrade — `saveAs` falls back to a download, the folder tree explains why it isn't available.

**Permission is a gesture-scoped grant.** A handle survives a reload; the permission attached to it does not. Chromium resets it to `prompt`, and re-requesting requires a user gesture. So permission is never assumed:

- `queryPermission` — check silently, safe anywhere.
- `ensurePermission` — check and prompt; only valid inside a click.

This is why a restored workspace shows a "Grant access" button rather than an error, and why autosave skips documents whose grant has lapsed instead of failing — it cannot legally prompt.

### Dirty tracking

A document is dirty because you edited it, not because its serialised form differs from the file.

This is deliberate and the alternative is worse. RendMD round-trips markdown through ProseMirror, which normalises it — bullet characters, emphasis markers, trailing whitespace, table padding. Comparing serialised output against the file on disk would mark almost every document dirty the moment it opened, and autosave would then quietly rewrite files you only meant to read. Instead the flag is set by real edits, and nothing is ever written unless it is set. Open a file, read it, close it, and the bytes on disk are untouched.

### The workspace scan

`scanDirectory` walks breadth-first, bounded at 5000 entries and 8 levels, skipping `.git`, `node_modules` and friends. It yields to the event loop between directories so the UI stays responsive.

The scan is eager rather than lazy-per-folder. It costs about a second on a large tree, and buys instant fuzzy search over every file in the workspace — which is the entire reason to open a folder rather than a file.

## The editor

TipTap 3 over ProseMirror, with `tiptap-markdown` for serialisation.

**One editor per document.** `App` keys `<Editor>` on the document id, so switching tabs mounts a fresh instance. A shared instance would give every document one undo timeline, where undo could reach into a document you aren't looking at.

**Markdown flows one way.** `initialContent` seeds the editor once; every change leaves through `onChange` and the store never pushes content back in. Reflecting store state into ProseMirror on each keystroke fights the cursor and drops input during fast typing.

**No permanent toolbar.** Formatting appears over a selection (`BubbleMenu`, positioned with Floating UI) and everything else lives in the command palette. Chrome that is always present is chrome you are always paying for.

## Commands and shortcuts

`src/lib/commands.ts` is a single registry. Both the command palette and the keyboard handler read from it, so a shortcut shown in the palette is by construction the one being matched — they cannot drift apart.

Three bindings live outside it, in `useGlobalShortcuts`: `Ctrl+K` (it *is* the way to the registry), tab cycling, and `Ctrl+4…9`. Listing six tab-switching entries would bury the palette in noise.

Handling is on `window` in the capture phase. ProseMirror binds aggressively inside the editor, and a bubble-phase listener loses `Ctrl+F` to it.

## Design system

`src/styles/tokens.css` defines two layers:

1. `--rmd-*` raw values, redefined per theme on `<html>`.
2. `@theme inline`, handing those to Tailwind so `bg-surface` and `text-ink-muted` resolve to the *variable* rather than a snapshot.

That second layer is what lets one class work in both themes with no `dark:` prefix anywhere in the app.

Colours are OKLCH: lightness is perceptually uniform, so a ramp reads as evenly spaced and contrast survives a hue change. `src/styles/__tests__/contrast.test.ts` parses the token file, converts OKLCH to sRGB, and asserts WCAG AA for every pair that renders as text — its converter is cross-checked against Chrome's own `oklch` parsing.

Fonts are self-hosted variable fonts (Inter, Source Serif 4, JetBrains Mono) with hand-written `@font-face` rules covering latin only, so unused subsets stay out of the build and the offline precache.

## Bundle and caching

The initial load is the shell. Everything else is deferred:

| Deferred | Loaded when |
|---|---|
| Source editor, palette, modals | First opened |
| Shiki grammars (31, one per language) | A code block uses that language |
| Mermaid (~1 MB) | A document contains a diagram |

`build.rollupOptions.output.chunkFileNames` routes grammars to `assets/langs/` and Mermaid to `assets/diagrams/`. That gives the service worker a path to discriminate on: the shell is precached (~1.5 MB), and those two directories get a `CacheFirst` runtime rule instead. Precaching everything would have put nearly 5 MB on disk at install for languages and diagram types most users never open.

Shiki uses `createHighlighterCore` with the JavaScript RegExp engine over a curated language list, rather than the default bundled entry point. The default reaches every one of its ~300 grammars plus a 622 kB Oniguruma WASM binary.

## PWA

`vite-plugin-pwa`, configured in `vite.config.ts`.

The interesting part is `file_handlers`. Once installed, the OS offers RendMD for `.md` files; a double-clicked file arrives via `window.launchQueue` as a *writable* `FileSystemFileHandle`, so `Ctrl+S` writes back to that exact file. `useLaunchQueue` must register its consumer during initial page evaluation or queued launches are dropped.

Updates are opt-in (`registerType: 'prompt'`). RendMD holds unsaved drafts; reloading underneath someone mid-edit is a poor trade for being current.

## Testing

Vitest with jsdom. Coverage is deliberately uneven — weighted toward things that are hard to eyeball and expensive to get wrong:

- **Markdown round-trip** (`src/test/roundtrip.test.ts`) — content survives markdown → ProseMirror → markdown. This is the one that protects your files.
- **Contrast** — every text/background token pair against WCAG AA.
- **Fuzzy matching, frontmatter parsing, export helpers** — pure functions with real edge cases.

Run `npm run check` for lint, tests, and a production build together.
