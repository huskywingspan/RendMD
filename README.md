# RendMD

> **The thinking person's markdown editor**
> *Intelligent. Elegant. Your data. Open source.*

## What is RendMD?

RendMD is a **rendered-first markdown editor** — edit your documents from their beautifully rendered state, not raw source. Your files stay as portable `.md` files.

Built with React, TipTap, and TypeScript. No backend, no accounts, no tracking. Just a fast, beautiful editor that respects your data.

## Features

- **Rendered-first editing** — click and type in the formatted view
- **Source view** — toggle between rendered, source, and split views (Ctrl+/)
- **4 themes** — dark/light basic and glassmorphism variants
- **Table editing** — visual table manipulation with GFM output
- **Image handling** — drag-drop, paste, URL, local file, and base64 embedding
- **Table of Contents** — auto-generated, click to navigate
- **Frontmatter** — YAML metadata panel with form UI
- **Export** — HTML download, PDF via print, copy as rich text
- **Keyboard shortcuts** — full shortcut set with help modal (Ctrl+H)
- **Settings** — theme, font size, auto-save preferences
- **Syntax highlighting** — Shiki-powered code blocks with language detection

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
git clone https://github.com/your-username/rendmd.git
cd rendmd
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

### Run Tests

```bash
npm run test          # Run once
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save | Ctrl+S |
| Open | Ctrl+O |
| Bold | Ctrl+B |
| Italic | Ctrl+I |
| Code | Ctrl+\` |
| Link | Ctrl+K |
| Heading 1–3 | Ctrl+1 / 2 / 3 |
| Toggle source view | Ctrl+/ |
| Shortcuts help | Ctrl+H |
| Insert image | Ctrl+Shift+I |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript 5 |
| Editor | TipTap 3 (ProseMirror) |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 |
| State | Zustand 5 |
| Highlighting | Shiki |
| Testing | Vitest + Testing Library |

## Project Structure

```
src/
├── components/
│   ├── Editor/           # TipTap editor, toolbar, bubble menu
│   ├── Sidebar/          # TOC panel
│   ├── Header/           # App header, theme switcher
│   ├── Frontmatter/      # YAML metadata panel
│   ├── Modals/           # Link, image, settings, shortcuts modals
│   └── UI/               # Reusable UI primitives (Toast, Tooltip, etc.)
├── hooks/                # Custom React hooks
├── stores/               # Zustand state stores
├── themes/               # CSS theme files
├── utils/                # Helper functions
├── types/                # TypeScript definitions
└── App.tsx               # Root component
```

## Documentation

- [Design Document](docs/DESIGN_DOCUMENT.md) — Architecture and coding standards
- [Project Plan](docs/PROJECT_PLAN.md) — Phases and acceptance criteria
- [Project Chronicle](docs/PROJECT_CHRONICLE.md) — Decision log and lessons learned

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome / Edge | Full (native File System Access API) |
| Firefox | Core features (file input fallback) |
| Brave | Core features (file input fallback) |
| Safari | Basic (limited Clipboard API) |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and how to submit changes.

## License

[MIT](LICENSE)

## Roadmap

- **v1.1** — AI writing assistance (BYOK), recent files, file browser sidebar
- **v1.2** — VS Code extension, Mermaid diagrams, KaTeX math
- **v2.0** — Plugin API, community themes

---

*Built for writers, developers, and thinkers everywhere.*
