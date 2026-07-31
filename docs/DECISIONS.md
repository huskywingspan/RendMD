# Decisions

The reasoning behind the v2 rewrite. Recorded because the *why* is what gets lost — the code says what, and git says when.

---

## 1. Cut the AI assistant

**Context.** v1 shipped a BYOK AI assistant: a chat panel, an agent mode with document tools, ghost-text autocomplete, quick transforms, a mobile bottom sheet. Roughly 2,400 lines and a large share of the visible chrome — a sparkle button in the header, another in the bubble menu, another in the toolbar, plus a whole right rail.

**Decision.** Removed entirely, along with `@anthropic-ai/sdk`.

**Why.** RendMD's job is reading and editing markdown that arrives from somewhere else — frequently from a real AI session in a real AI tool. An in-app assistant duplicated tooling the user already had, and charged for it in permanent UI surface. Cutting it freed the right rail, emptied the header, and removed an entire class of state (API keys, streaming, tool loops) from a program whose value is that it has no state to leak.

**Cost.** Ghost-text completion and one-click transforms are gone. Nothing else regressed.

---

## 2. Dirty state is set by editing, not by comparison

**Context.** A rendered-first editor round-trips markdown through ProseMirror. That normalises things: `*` becomes `-`, emphasis markers change, trailing whitespace goes, table pipes get padded. The obvious way to detect unsaved changes — compare serialised output against the file — reports "changed" for a document nobody touched.

**Decision.** `isDirty` is set by user edits. Nothing is written unless it is set.

**Why.** The alternative silently reformats files you only opened to read. Open a README, scroll it, close the tab, and its diff is twenty lines of whitespace churn. That is a data-integrity failure, not a cosmetic one — and it would show up in `git status` on someone's project.

**Consequence.** Open → read → close leaves bytes untouched. Autosave never fires on an unedited document.

---

## 3. IndexedDB for documents, localStorage for preferences

**Context.** v1 persisted the document draft into localStorage alongside the theme.

**Decision.** Documents and file handles go to IndexedDB. Settings and chrome state stay in localStorage.

**Why.** Two independent reasons. `FileSystemFileHandle` is a structured-cloneable object — localStorage cannot store it at all, which is why v1 could never restore a session properly. And localStorage caps out near 5 MB per origin; a handful of long transcripts exceeds that, and it throws on overflow, silently losing work.

Keeping them in separate stores also means a corrupted draft can't take your settings with it, and clearing settings can't lose your work.

---

## 4. Eager workspace scan

**Context.** A folder tree can be lazy (read a directory when expanded) or eager (walk everything up front).

**Decision.** Eager, breadth-first, bounded at 5000 entries and 8 levels.

**Why.** Lazy is cheaper but makes search impossible — the palette can only match what has been expanded, which is the opposite of what search is for. Being able to type three letters and land on any file in the workspace is the entire reason to open a folder rather than a file. A second of scanning buys that.

The bounds mean pointing RendMD at a home directory degrades to "the first few thousand files" rather than hanging the tab.

---

## 5. No permanent formatting toolbar

**Context.** v1 had a formatting toolbar pinned above the document, collapsible via a chevron.

**Decision.** Removed. Formatting appears over a selection; everything else lives in the palette.

**Why.** A toolbar costs vertical space on every screen, forever, to serve actions taken on a small fraction of screens. In a reading-first editor that trade is clearly wrong. The palette makes every command reachable in two keystrokes without occupying anything, and the bubble menu puts formatting exactly where you're already looking.

**Cost.** Formatting is less discoverable for someone who has never used the app. Mitigated by the welcome screen pointing at `Ctrl+/`, and by markdown input rules working as you type.

---

## 6. One command registry

**Context.** v1 kept shortcuts in a keyboard handler and a separate hand-maintained table for the help modal. They had drifted: the modal advertised `Ctrl+H` for the shortcuts dialog while the handler used it for find-and-replace.

**Decision.** `src/lib/commands.ts` is the single source. The palette, the keyboard handler, and the shortcuts sheet all read from it.

**Why.** A shortcut listed in the UI is now by construction the one being matched. The class of bug where documentation and behaviour disagree is eliminated rather than fixed.

---

## 7. Curated syntax highlighting

**Context.** v1 imported Shiki's default entry point, which reaches all ~300 grammars as lazy chunks plus a 622 kB Oniguruma WASM binary. `dist/` was 8.8 MB across 294 files, including grammars for Wolfram and Emacs Lisp.

**Decision.** `createHighlighterCore` with the JavaScript RegExp engine and a curated 31-language list.

**Why.** A markdown editor needs the languages that appear in markdown. The WASM engine buys correctness on a handful of exotic grammars that were never going to be loaded. `dist/` went to 3.5 MB across 41 files, and the production build from 9.7s to 0.6s.

**Cost.** A fenced block in an unlisted language renders as plain text rather than highlighted. Adding one is a single line in `src/lib/highlighter.ts`.

---

## 8. Precache the shell, runtime-cache the rest

**Context.** Precaching everything gave a 4.9 MB service worker install.

**Decision.** Precache the shell (~1.5 MB). Route Shiki grammars to `assets/langs/` and Mermaid to `assets/diagrams/` via `chunkFileNames`, exclude both from precache, and give them a `CacheFirst` runtime rule.

**Why.** Installing an app should not download thirty language grammars and a diagram engine most users will never trigger. Content-hashed chunks are immutable, so `CacheFirst` never revalidates — once a language is seen, it works offline permanently. This gets offline completeness in practice without paying for it up front.

---

## 9. Two themes, OKLCH, enforced by test

**Context.** v1 had four themes — dark/light × basic/glass — with hex colours. Nobody was maintaining four.

**Decision.** Light, dark, and system. OKLCH throughout. A test asserts WCAG AA for every token pair rendered as text.

**Why.** Four themes meant every new component styled four ways and got at least one wrong. OKLCH's lightness is perceptually uniform, so a ramp reads as evenly spaced and contrast survives a hue change — which sRGB hex ramps do not give you.

The test earned itself immediately: it caught `ink-faint` at 3.79:1 against the light canvas, which carries the status bar at 11px. That was shipped in v1 and nobody had noticed.

---

## 10. Self-hosted fonts

**Context.** v1's CSS named `Inter` and `JetBrains Mono` in its font stacks but never loaded a font file. Every user silently got system fallbacks — the design had never actually been seen.

**Decision.** Inter, Source Serif 4 and JetBrains Mono self-hosted as variable fonts, with hand-written `@font-face` rules covering the latin subsets only.

**Why.** Self-hosting means no third-party request, no layout shift, and correct rendering offline — which matters because RendMD is installable. Hand-written rules rather than importing Fontsource's stylesheets keeps Cyrillic, Greek and Vietnamese subsets out of the build and out of the offline precache.

---

## 11. ESLint pinned to 9

**Context.** ESLint 10 is current. `eslint-plugin-jsx-a11y` has not shipped a v10 peer range.

**Decision.** Stay on ESLint 9.39 until it does.

**Why.** Accessibility linting catches real defects — in this rewrite it found a `treeitem` missing its required `aria-selected` and a button nested inside a button that left the tab-close control unreachable by keyboard. That is worth more than a major version number on a dev dependency.

---

## 12. TypeScript 5.9, not 7

**Context.** TypeScript 7 (the native port) is available.

**Decision.** 5.9.3.

**Why.** `typescript-eslint` declares `typescript >=4.8.4 <6.1.0`. Adopting TS 7 means dropping type-aware linting until the ecosystem catches up, and TS 7's benefit here is compile speed on a codebase that already typechecks in seconds. Worth revisiting once `typescript-eslint` supports it.
