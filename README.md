# RendMD

**A rendered-first markdown editor.** Open a folder, read your `.md` files properly, edit them in place, save straight back to disk.

No accounts. No upload. No tracking. Your files never leave your machine — RendMD is a static site that talks directly to your filesystem through the browser.

**[rendmd.pages.dev](https://rendmd.pages.dev)**

---

## What it's for

Reading and editing markdown that already exists on your disk — notes, READMEs, and the long documents that come out of AI sessions. The whole design is bent around one loop:

> open a file → read it comfortably → make an edit → save it back

Everything else is secondary to making that loop feel like nothing.

## What it does

**Open a folder, not just a file.** Point RendMD at the directory where you keep your notes. It indexes every markdown file inside, shows them in a tree, and remembers the folder between visits. Files open in tabs.

**Edit what you're reading.** The rendered document *is* the editing surface — click into a heading and change it. Formatting appears when you select text and stays out of the way when you don't. There is no permanent toolbar.

**Save in place.** `Ctrl+S` writes to the original file. Not a download, not a copy in `~/Downloads` — the file you opened.

**Find anything with `Ctrl+K`.** One palette over every file in your workspace, every heading in the current document, and every command. Fuzzy-matched, so `tgfcs` finds "Toggle focus mode".

**Install it.** Chrome and Edge can install RendMD as an app. Once installed, Windows offers it under "Open with" for `.md` files, and it opens in its own window with no browser chrome. It also works offline.

**Read it the way you like.** Sans, serif, or monospace. Adjustable size and line width. Light and dark, with light being warm paper rather than a spreadsheet.

Also: Mermaid diagrams render inline, code blocks are syntax-highlighted, tables and task lists are editable, find-and-replace, YAML frontmatter editing, and export to HTML or PDF.

## Requirements

| Browser | What works |
|---|---|
| **Chrome, Edge** | Everything: folders, save-in-place, install, OS file handling. |
| **Brave** | Everything, *after* enabling one flag — see below. |
| Firefox, Safari | Open and edit single files. Saving downloads a copy — the File System Access API isn't available. |

The gap isn't RendMD being lazy; writing back to a file you opened is a capability only Chromium ships today. RendMD detects what's available and degrades rather than breaking.

### Brave

Brave blocks the File System Access API by default, listing it among its deviations from Chromium. Shields has nothing to do with it, so turning Shields off doesn't help.

Open `brave://flags`, search for **File System**, set it to Enabled, and restart. Folders and save-in-place then work exactly as they do in Chrome. RendMD detects Brave and says so in place rather than telling you to go and install another browser.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

```bash
npm run build      # production build into dist/
npm run preview    # serve that build
npm run check      # lint + tests + build, what CI runs
```

## Keyboard

| | |
|---|---|
| `Ctrl+K` | Command palette — files, headings, commands |
| `Ctrl+O` / `Ctrl+N` | Open file / new document |
| `Ctrl+S` / `Ctrl+Shift+S` | Save / save as |
| `Ctrl+W` / `Ctrl+Tab` | Close tab / next tab |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+1` `Ctrl+2` `Ctrl+3` | Rendered / split / source |
| `Ctrl+F` / `Ctrl+H` | Find / find and replace |
| `Ctrl+Shift+F` | Focus mode |
| `Ctrl+/` | All shortcuts |

Full list in [docs/KEYBOARD.md](docs/KEYBOARD.md), or press `Ctrl+/` in the app. On macOS, `Ctrl` means `⌘`.

## Documentation

| | |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How it's built, and why |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deploying to Cloudflare Pages |
| [KEYBOARD.md](docs/KEYBOARD.md) | Every shortcut |
| [DECISIONS.md](docs/DECISIONS.md) | The decisions behind the v2 rewrite |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Working on the code |

## Built with

React 19 · TypeScript 5.9 · Vite 8 · TipTap 3 (ProseMirror) · Tailwind 4 · Zustand 5 · Shiki 4 · Mermaid 11

## Privacy

There is no server. RendMD is static files on a CDN. Your documents, the folder you chose, and your settings live in your browser on your device (IndexedDB and localStorage) and are never transmitted anywhere. There is no analytics script.

## License

[MIT](LICENSE)
