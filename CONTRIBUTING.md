# Contributing

## Setup

Node 22.22.2+ (see `.node-version`) and npm 10+.

```bash
git clone https://github.com/huskywingspan/RendMD.git
cd RendMD
npm install
npm run dev
```

Dev server at http://localhost:5173.

| Command | |
|---|---|
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck and production build |
| `npm run lint` | ESLint, including jsx-a11y |
| `npm run test` | Tests once |
| `npm run test:watch` | Tests in watch mode |
| `npm run check` | Lint + test + build — what CI runs |
| `npm run icons` | Regenerate PWA icons from `public/icons/*.svg` (fetches sharp on demand) |

Use Chrome or Edge for development. The File System Access API — folders, saving in place — doesn't exist elsewhere, and you'll be testing the fallback path without meaning to.

Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) before making structural changes, and [docs/DECISIONS.md](docs/DECISIONS.md) before undoing something that looks odd. Several things that look like oversights are load-bearing.

### A note on the lockfile

Regenerate it with `npm install --package-lock-only`, not a plain `npm install`.

Vite's Rolldown and Tailwind's Oxide both ship platform-specific native
binaries with WASM fallbacks. A plain `npm install` on Windows or macOS prunes
the transitive dependencies of the variants it didn't select, producing a
lockfile that installs fine locally and then fails `npm ci` on Linux CI with
"Missing: @emnapi/... from lock file". `--package-lock-only` resolves from
registry metadata instead and records every platform.

If you change dependencies, run `npm ci` afterwards to prove the lockfile is
complete before pushing.

## Conventions

**TypeScript** is strict. Explicit return types on exported functions. `interface` for object shapes unless you need a union.

**Components** are functions with named exports. Props interfaces are suffixed `Props` and destructured in the signature.

**Styling** is Tailwind over the token layer in `src/styles/tokens.css`. Use the semantic utilities — `bg-surface`, `text-ink-muted`, `border-line` — never a raw colour and never a `dark:` variant. Tokens resolve per theme through `@theme inline`, so one class is correct in both. If you need a colour that doesn't exist, add a token rather than a one-off.

**State** lives in the Zustand store that matches its lifetime, not its feature. Documents and workspace are session state in IndexedDB; settings and chrome are preferences in localStorage. Read [ARCHITECTURE.md](docs/ARCHITECTURE.md#state) before adding a fifth store.

**Comments** explain why, not what. A comment restating the line below it is noise; a comment explaining why the obvious approach was rejected is the most valuable thing in the file.

## Where things go

**A new command** — add it to `src/lib/commands.ts`. That single registry feeds the palette, the keyboard handler, and the shortcuts sheet. Don't wire a shortcut anywhere else, or the three will drift.

**A new TipTap extension** — a file in `src/components/Editor/extensions/`, registered in `createEditorExtensions()`. Check whether StarterKit already bundles it; TipTap 3 includes more than it used to, and a duplicate name is a silent misconfiguration. Then confirm the markdown round-trip still passes — that test is what protects users' files.

**A new syntax-highlighting language** — one line in `LANGUAGE_LOADERS` and one in `LANGUAGE_OPTIONS`, both in `src/lib/highlighter.ts`. It becomes a lazily-loaded chunk automatically.

**A colour** — `src/styles/tokens.css`, in both theme blocks, plus the `@theme inline` bridge. If it renders as text, add the pair to `src/styles/__tests__/contrast.test.ts`.

## Testing

Tests live in `__tests__/` beside what they cover. Vitest with jsdom.

Coverage is deliberately uneven. Weight effort toward things that are hard to eyeball and expensive to get wrong — markdown round-tripping, file IO, contrast, fuzzy matching — rather than toward rendering assertions that restate the JSX.

`src/test/roundtrip.test.ts` is the important one. It asserts content survives markdown → ProseMirror → markdown. If it fails, RendMD is corrupting people's files.

## Pull requests

1. Branch from `master`.
2. `npm run check` must pass.
3. Verify the core loop by hand: open a folder, open a file, edit it, `Ctrl+S`, confirm the file changed on disk. No test covers this, and it's the thing that matters.
4. Describe what changed and why. If you rejected an obvious approach, say so — that's the part worth reviewing.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `build:`.

## Reporting issues

Browser and version, steps to reproduce, console errors, and a screenshot for anything visual. If it involves opening or saving files, say which browser — that path differs substantially between Chromium and everything else.

## License

Contributions are licensed under the [MIT License](LICENSE).
