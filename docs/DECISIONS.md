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

---

## 13. The document, not the parsed object, is the source of truth

**Context.** Documents were stored as a parsed `frontmatter` object plus a `content` body, and the full text was rebuilt on demand by re-serialising the object. That reconstruction is not an identity: it drops YAML comments, rewrites quoting, normalises CRLF to LF, and inserts a blank line after the closing delimiter.

Source view is a controlled textarea. Every keystroke went text → parse → store → *rebuild* → back into the textarea. When the rebuilt text differed from what was typed, the replacement landed under the cursor, and the next keypress edited the wrong offset. Backspacing deleted lines elsewhere in the file, and autosave wrote the result to disk.

**Decision.** The document keeps its frontmatter block as verbatim source. `documentText` is `block + content` — a plain concatenation. The parsed object is a *view*, used by the frontmatter panel, and the block is regenerated only when that panel actually edits a field.

**Why.** A round trip through an editor must be lossless, or the editor is not safe to type in. Storing the parsed form and rebuilding is the kind of design that looks tidier and is quietly destructive; the identity `join(split(x)) === x` is now asserted over fourteen document shapes, and nine of those tests fail against the old implementation.

---

## 14. One writer at a time in split view

**Context.** Split view mounts two editors over one document. Both wrote to the same `content` field, so a ProseMirror transaction — a table column resize is enough, since it rewrites cell attributes — would serialise the rendered pane's copy over newer text typed in the source pane.

**Decision.** In split view, only the pane with focus propagates its edits; the other adopts changes instead. With a single pane the guard is off entirely.

**Why.** The first attempt gated on `editor.isFocused` read inside the transaction, unconditionally. That broke toolbar buttons: a command chain's `.focus()` had not settled when the check ran, so "delete row" silently did nothing. Dropping a user's edit is a worse failure than the race being guarded against, so the guard is now narrow — it applies only where two panes genuinely compete — and reads focus from the editor's own focus/blur events rather than sampling it mid-transaction.

---

## 15. Undo belongs to the document, not the editor

**Context.** Undo was ProseMirror's, which covers one editor instance. It knew nothing about source-view edits and was discarded on every tab or view switch. Worse, `edit.undo` tested availability with `Boolean(editor)`, and App retains a stale reference after the rendered pane unmounts — so in source view the command reported itself available, called `preventDefault()` on Ctrl+Z, suppressed the textarea's own native undo, and then did nothing. There was no way back from a mistake.

**Decision.** A document-level history of whole-text snapshots, fed by both panes, with edits inside 500ms coalesced into one step. Undo means the same thing regardless of which pane made the change or how many times the view has changed since.

**Why snapshots rather than diffs.** A patch history is smaller but has to be exactly right to be safe, and this is the mechanism people reach for *after* something has already gone wrong — the last place to be clever. Bounded at 200 states and 8 MB per document.

**Not a tree.** Editing after undoing still discards the redo branch, as it does in most editors. A true undo tree would keep it, and is worth doing — but a linear history that definitely works beats a tree that might not.

---

## 16. Autosave refuses catastrophic truncation

**Context.** When the source-view bug truncated a file, autosave committed it to disk within about a second, before the damage was noticed.

**Decision.** Autosave declines to write when a document has lost more than 60% of its saved length, and offers a "Save anyway" action instead. Manual `Ctrl+S` is never blocked.

**Why.** Autosave is a convenience; overwriting a file with a fraction of its former contents, unprompted, is not. Deleting most of a document deliberately costs one click. Doing it by accident now leaves time to undo.

---

## 17. The source view's two layers share one definition of their metrics

**Context.** Source view is a transparent `<textarea>` stacked over a syntax-highlighted copy of the same text. The caret belongs to the textarea; every visible glyph belongs to the layer beneath.

That only works while their text metrics agree exactly. The rules enforcing this lived in `src/index.css`, which the v2 overhaul deleted without recreating them. Shiki emits a `<pre>`, the UA stylesheet gives `<pre>` `white-space: pre`, and the textarea wraps with `pre-wrap` — so every line long enough to wrap pushed the layers a further row apart. Clicking on the row you could see put the caret in the row above it, and you edited a line you were not looking at.

**Decision.** Metrics are declared once, in `.source-metrics`, and applied to *both* layers. Everything the UA or Shiki puts on `<pre>`/`<code>` is neutralised to `inherit`. The highlighted text is given a trailing newline so both layers reserve the same final line box.

**Why a test that reads CSS.** `src/styles/__tests__/source-alignment.test.ts` asserts the declarations exist and that the stylesheet is imported. Testing CSS is unusual and normally not worth it — but the failure here is silent, corrupts documents, and its actual cause was a file being deleted during a tidy-up with nothing to notice. Removing the import alone fails the suite.

**The wider lesson.** A design where two independently-styled elements must agree pixel-for-pixel has no safe failure mode: when it breaks, it does not look broken. The alternative is a real code editor component (CodeMirror), which is correct by construction rather than by matching declarations. That remains the better long-term answer; the guard above is what makes the current approach defensible in the meantime.
