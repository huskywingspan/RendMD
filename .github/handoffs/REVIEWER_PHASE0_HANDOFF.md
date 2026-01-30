# Reviewer Agent - Phase 0 Handoff

> **Project:** RendMD - The thinking person's markdown editor  
> **Phase:** 0 - Foundation  
> **Date:** 2026-01-29  
> **Priority:** Set up git repository and project infrastructure

---

## Your Mission

You are the **Reviewer** agent. Your first task is to initialize the git repository and establish the project foundation before Builder begins implementation.

---

## Task 1: Git Repository Setup

### Initialize Repository

```powershell
cd L:\RendMD
git init
```

### Create .gitignore

Create a comprehensive `.gitignore` for a Vite + React + TypeScript project:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
*.local

# Environment files
.env
.env.local
.env.*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea/
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS files
.DS_Store
Thumbs.db

# Logs
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*

# Testing
coverage/

# TypeScript
*.tsbuildinfo

# Misc
.eslintcache
*.pem
```

### Create Initial Commit

```powershell
git add .
git commit -m "docs: initial project documentation

- Add DESIGN_DOCUMENT.md with full technical specification
- Add PROJECT_PLAN.md with 8-week development roadmap
- Add PROJECT_CHRONICLE.md with ADRs and decisions
- Add copilot-instructions.md for AI coding assistance

Project identity established:
- Tagline: Intelligent. Elegant. Your data. Open source.
- Positioning: The thinking person's markdown editor"
```

---

## Task 2: Create VS Code Workspace Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.autoImports": true,
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "editor.quickSuggestions": {
    "strings": "on"
  }
}
```

Create `.vscode/extensions.json`:

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "dsznajder.es7-react-js-snippets",
    "formulahendry.auto-rename-tag",
    "streetsidesoftware.code-spell-checker"
  ]
}
```

---

## Task 3: Create README.md

Create a project README at the root:

```markdown
# RendMD

> **The thinking person's markdown editor**  
> *Intelligent. Elegant. Your data. Open source.*

A rendered-first markdown editor that lets you edit documents from their beautifully rendered state rather than raw source.

## Philosophy

> "Make markdown a more accessible format for the everyday writer, developer, or anyone who uses a computer, in an elegant open source package."

## Features (Planned)

- 🎨 **Rendered-first editing** - Edit the beautiful output, not raw text
- 📄 **True markdown output** - Files are portable `.md`, not proprietary
- 🎭 **Four themes** - Dark/light basic and glassmorphism variants
- 🔗 **Clickable links** - Natural link interaction
- 📊 **Table editing** - Visual table manipulation
- 🤖 **AI assistance** (v1.1) - BYOK model with multiple providers

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5
- **Editor:** TipTap (ProseMirror)
- **Styling:** Tailwind CSS
- **State:** Zustand

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Documentation

- [Design Document](docs/DESIGN_DOCUMENT.md) - Technical specification
- [Project Plan](docs/PROJECT_PLAN.md) - Development roadmap
- [Project Chronicle](docs/PROJECT_CHRONICLE.md) - Decision log

## License

TBD - Open source license to be selected before v1.0 release.

---

*Built with ❤️ for writers, developers, and thinkers everywhere.*
```

---

## Task 4: Final Commit and Verification

```powershell
git add .
git commit -m "chore: add project infrastructure

- Add .gitignore for Vite/React/TypeScript project
- Add VS Code workspace settings and recommended extensions
- Add README.md with project overview"
```

### Verify Repository State

```powershell
git log --oneline
git status
```

Expected output should show:
- 2 commits (docs + infrastructure)
- Clean working tree
- All files tracked

---

## Reference Documents

Read these before starting:
- `docs/DESIGN_DOCUMENT.md` - Full technical specification
- `docs/PROJECT_PLAN.md` - Phase 0 tasks in detail
- `docs/PROJECT_CHRONICLE.md` - Key decisions made
- `.github/copilot-instructions.md` - Coding standards

---

## Handoff to Builder

Once complete, confirm:
- [ ] Git repository initialized
- [ ] .gitignore created and committed
- [ ] VS Code settings created
- [ ] README.md created
- [ ] 2 clean commits in history
- [ ] Working tree is clean

Then Builder can proceed with `npm create vite@latest` scaffolding.

---

## Success Criteria

1. `git log` shows 2 commits with conventional commit messages
2. `git status` shows clean working tree
3. `.gitignore` prevents node_modules and build artifacts from being tracked
4. VS Code opens with recommended extensions prompt
5. README accurately describes the project

---

**You are Reviewer. Begin with Task 1.**
