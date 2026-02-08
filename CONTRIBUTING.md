# Contributing to RendMD

Thanks for your interest in contributing to RendMD! This guide will help you get started.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Getting Started

```bash
git clone https://github.com/your-username/rendmd.git
cd rendmd
npm install
npm run dev
```

The dev server starts at http://localhost:5173 with hot module replacement.

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | TypeScript check + production build |
| `npm run lint` | Run ESLint (includes jsx-a11y) |
| `npm run test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run preview` | Preview production build |

## Project Structure

```
src/
├── components/
│   ├── Editor/           # TipTap editor, toolbar, bubble menu, extensions
│   ├── Sidebar/          # Table of Contents panel
│   ├── Header/           # App header, theme switcher, export menu
│   ├── Frontmatter/      # YAML metadata panel
│   ├── Modals/           # Link, image, settings, shortcuts modals
│   └── UI/               # Reusable primitives (Toast, Tooltip, etc.)
├── hooks/                # Custom React hooks
├── stores/               # Zustand state stores
├── themes/               # CSS theme files
├── utils/                # Helper functions
├── types/                # TypeScript type definitions
├── test/                 # Test setup
└── App.tsx               # Root component
```

For detailed architecture, see [docs/DESIGN_DOCUMENT.md](docs/DESIGN_DOCUMENT.md).

## Coding Standards

### TypeScript

- Strict mode is enabled — no implicit `any`
- Explicit return types on exported functions
- Use `interface` over `type` for object shapes (unless unions needed)
- Descriptive names — no single-letter variables except loop counters

### React Components

- Functional components only — no class components
- Named exports (avoid default exports)
- Props interfaces suffixed with `Props`
- Destructure props in the function signature

### Styling

- Tailwind CSS with CSS variables for theming
- Use `var(--theme-*)` references — never hardcode colors
- Components must look correct in all 4 themes

### State Management

- Zustand stores with the slice pattern
- Selectors for derived state
- Actions as store methods

## Adding a TipTap Extension

1. Create a file in `src/components/Editor/extensions/`
2. Define the extension using TipTap's API
3. Register it in `extensions/index.ts` inside `createEditorExtensions()`
4. Add toolbar/menu controls if needed
5. Ensure markdown serialization works via `tiptap-markdown`

## Adding a Theme

1. Create a CSS file in `src/themes/` (copy from an existing theme)
2. Define all `--theme-*` CSS variables
3. Add the theme name to the `ThemeName` type in `src/types/index.ts`
4. Add it to the theme list in the settings modal
5. Test all components in the new theme

## Testing

- Write unit tests alongside your code in `__tests__/` directories
- Use Vitest with `@testing-library/react` for component tests
- Test pure functions thoroughly; mock DOM APIs when needed
- Run `npm run test` before submitting PRs

## Commit Messages

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add table column resize
fix: handle empty frontmatter gracefully
docs: update keyboard shortcuts table
refactor: extract theme variables into hook
test: add frontmatter parser edge cases
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear, focused commits
4. Run `npm run lint && npm run test && npm run build` — all must pass
5. Submit a PR with a clear description of what changed and why

## Reporting Issues

- Use GitHub Issues
- Include browser name and version
- Include steps to reproduce
- Attach a screenshot if it's a visual bug
- Paste any console errors

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
