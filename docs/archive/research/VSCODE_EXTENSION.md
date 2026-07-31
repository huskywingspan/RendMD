# Research: RendMD as a VS Code Extension

> **Document Type:** Technology Evaluation & Architecture Spec  
> **Created:** 2026-02-08  
> **Status:** Complete

---

## Executive Summary

| Question | Answer |
|----------|--------|
| Is this feasible? | **Yes** - Excellent fit |
| Best API | `CustomTextEditorProvider` |
| Code reuse from web app | **~70-80%** of React + TipTap code |
| Estimated effort | **Medium-Large** (2-3 weeks for MVP) |
| Recommendation | **Do it** - This is the ideal delivery mechanism |

---

## 1. Why This Is the Right Move

RendMD's core value proposition - rendered-first markdown editing with real `.md` output - is a *perfect* fit for a VS Code custom editor:

- **Users already have markdown files in their workspace** - no file management overhead
- **VS Code handles open/save/undo/redo/dirty tracking** - you delete ~200 lines of code
- **Direct integration with the development workflow** - devs editing READMEs, docs, changelogs
- **No deployment infrastructure** - users install from marketplace, done
- **Existing theme integration** - VS Code's `--vscode-*` CSS variables map cleanly to RendMD's `--color-*` variables

---

## 2. Architecture Overview

### How Custom Editors Work

```
┌────────────────────────────────────────────────────┐
│ VS Code                                            │
│                                                    │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │ TextDocument  │◄──►│ CustomTextEditorProvider │  │
│  │ (.md file)    │    │  (extension host)        │  │
│  └──────┬───────┘    └──────────┬───────────────┘  │
│         │                       │                   │
│         │   postMessage / onDidReceiveMessage       │
│         │                       │                   │
│  ┌──────▼───────────────────────▼───────────────┐  │
│  │ WebviewPanel                                  │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │ RendMD React App (TipTap + UI)          │  │  │
│  │  │ - Editor component                      │  │  │
│  │  │ - BubbleMenu, popovers, toolbar         │  │  │
│  │  │ - Frontmatter panel                     │  │  │
│  │  │ - Theme from VS Code CSS variables      │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
```

### The Key API: `CustomTextEditorProvider`

Since markdown is text-based, we use `CustomTextEditorProvider` (not `CustomEditorProvider`). This gives us:

- **Free undo/redo** via VS Code's `TextDocument` model
- **Free save/save-as** via standard file operations
- **Free dirty state tracking** - the dot on the tab
- **Free hot exit/backup** - VS Code handles crash recovery
- **Bidirectional sync** - edits in the webview update the TextDocument and vice versa

```typescript
// Extension entry point
class RendMDEditorProvider implements vscode.CustomTextEditorProvider {
  
  public static readonly viewType = 'rendmd.markdownEditor';
  
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    
    // 1. Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };
    
    // 2. Load the RendMD React app as the webview HTML
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    
    // 3. Send initial document content to webview
    webviewPanel.webview.postMessage({
      type: 'setContent',
      content: document.getText(),
    });
    
    // 4. Listen for edits from the webview
    webviewPanel.webview.onDidReceiveMessage(message => {
      if (message.type === 'edit') {
        const edit = new vscode.WorkspaceEdit();
        edit.replace(
          document.uri,
          new vscode.Range(0, 0, document.lineCount, 0),
          message.content
        );
        vscode.workspace.applyEdit(edit);
      }
    });
    
    // 5. Sync external document changes back to webview
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === document.uri.toString()) {
        webviewPanel.webview.postMessage({
          type: 'setContent',
          content: document.getText(),
        });
      }
    });
  }
}
```

### package.json Contribution

```json
{
  "name": "rendmd-vscode",
  "displayName": "RendMD - Markdown Editor",
  "description": "The thinking person's markdown editor, right inside VS Code",
  "version": "0.1.0",
  "engines": { "vscode": "^1.74.0" },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./dist/extension.js",
  "contributes": {
    "customEditors": [
      {
        "viewType": "rendmd.markdownEditor",
        "displayName": "RendMD Editor",
        "selector": [
          { "filenamePattern": "*.md" },
          { "filenamePattern": "*.markdown" }
        ],
        "priority": "option"
      }
    ],
    "commands": [
      {
        "command": "rendmd.openWithRendMD",
        "title": "Open with RendMD",
        "category": "RendMD"
      }
    ]
  }
}
```

**Note on `priority`:**
- `"option"` = Users choose to open with RendMD (right-click → "Open With" or command palette)
- `"default"` = ALL `.md` files open in RendMD by default (aggressive, may annoy devs)  
- **Recommendation: Start with `"option"`, let users set it as default in settings**

---

## 3. Code Reuse Strategy

### What Transfers Directly (~70-80%)

| Component | Reuse? | Notes |
|-----------|--------|-------|
| TipTap editor + all extensions | ✅ 100% | Heart of the app, no changes needed |
| BubbleMenu + formatting | ✅ 100% | Already React/TipTap, no DOM dependency |
| LinkPopover, ImagePopover | ✅ 100% | Floating UI works in webviews |
| TableToolbar + grid picker | ✅ 100% | Pure React |
| Frontmatter panel | ✅ 100% | YAML parsing, form UI |
| Code block component + Shiki | ✅ 95% | Shiki works in webviews |
| editor-styles.css | ✅ 95% | Replace CSS variable names |
| Zustand stores | ⚠️ 80% | Remove file ops, simplify state |
| Theme CSS variables | 🔄 Remap | Map `--color-*` → `--vscode-*` |
| useFileSystem hook | ❌ Remove | VS Code handles file ops |
| useAutoSave hook | ❌ Remove | VS Code handles auto-save |
| Source view | ⚠️ 50% | Users already have a text editor next to it |
| Header component | 🔄 Redesign | Simpler - no file ops, no theme toggle needed |

### What VS Code Gives You For Free

| Feature | Web App Code | VS Code | Savings |
|---------|-------------|---------|---------|
| File open/save | `useFileSystem.ts` (235 lines) | Built-in | Delete |
| Auto-save | `useAutoSave.ts` | Built-in | Delete |
| Dirty indicator | `FileIndicator` component | Tab dot | Delete |
| Undo/redo | TipTap history | VS Code TextDocument history | Merge |
| Theme | 4 custom CSS themes | VS Code theme variables | Simplify |
| Find in document | Phase 5 todo | `Ctrl+F` already works | Skip entire feature |
| Keyboard shortcuts | Custom extension | VS Code keybindings | Simplify |
| Recent files | Phase 5 todo | Built-in | Skip |

### Monorepo Structure

```
rendmd/
├── packages/
│   ├── core/                  # Shared TipTap extensions, components
│   │   ├── components/
│   │   │   ├── Editor/        # Editor, BubbleMenu, popovers, etc.
│   │   │   ├── Frontmatter/   # Frontmatter panel
│   │   │   └── UI/            # Shared UI primitives
│   │   ├── extensions/        # TipTap extensions
│   │   ├── hooks/             # useTOC, etc. (not useFileSystem)
│   │   └── types/
│   │
│   ├── web/                   # Web app (current Vite build)
│   │   ├── src/
│   │   │   ├── App.tsx        # Web-specific shell
│   │   │   ├── hooks/         # useFileSystem, useAutoSave
│   │   │   └── stores/        # Web-specific store (with file ops)
│   │   └── vite.config.ts
│   │
│   └── vscode/                # VS Code extension
│       ├── src/
│       │   ├── extension.ts   # Extension entry point
│       │   ├── provider.ts    # CustomTextEditorProvider
│       │   └── webview/
│       │       ├── App.tsx    # VSCode-specific shell
│       │       ├── bridge.ts  # postMessage ↔ TextDocument sync
│       │       └── stores/    # VS Code-specific store
│       ├── package.json       # Extension manifest
│       └── vite.config.ts     # Bundle webview to single JS file
```

---

## 4. Theme Integration

VS Code exposes its theme as CSS variables on the webview body. RendMD can consume them directly:

```css
/* RendMD theme bridge for VS Code */
:root {
  /* Map VS Code variables to RendMD variables */
  --color-bg: var(--vscode-editor-background);
  --color-text: var(--vscode-editor-foreground);
  --color-text-muted: var(--vscode-descriptionForeground);
  --color-accent: var(--vscode-textLink-foreground);
  --color-accent-hover: var(--vscode-textLink-activeForeground);
  --color-border: var(--vscode-panel-border);
  --color-bg-hover: var(--vscode-list-hoverBackground);
  --color-bg-surface: var(--vscode-editorWidget-background);
  --color-code-bg: var(--vscode-textCodeBlock-background);
  
  /* Font */
  font-family: var(--vscode-font-family);
  font-size: var(--vscode-font-size);
}
```

This means RendMD automatically matches ANY VS Code theme - dark, light, high contrast, custom themes. You don't need to ship 4 themes; you ship **zero** and inherit from VS Code.

---

## 5. Sync Protocol

The trickiest part is bidirectional sync between the TipTap editor and the VS Code TextDocument without creating infinite loops.

### Architecture

```typescript
// webview/bridge.ts - Runs inside the webview

const vscode = acquireVsCodeApi();
let isExternalUpdate = false;

// Send edits from TipTap → VS Code
export function sendEdit(markdown: string) {
  if (isExternalUpdate) return; // Prevent echo
  vscode.postMessage({ type: 'edit', content: markdown });
}

// Receive document changes from VS Code → TipTap
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'setContent') {
    isExternalUpdate = true;
    editor.commands.setContent(message.content);
    isExternalUpdate = false;
  }
});
```

### Debouncing

Don't send every keystroke. Debounce edits (200-500ms) to avoid flooding the TextDocument:

```typescript
const debouncedSend = debounce((markdown: string) => {
  sendEdit(markdown);
}, 300);

// In TipTap onUpdate:
editor.on('update', () => {
  const md = editor.storage.markdown.getMarkdown();
  debouncedSend(md);
});
```

### Handling External Edits

When the user edits the `.md` file in VS Code's normal text editor (split view), or another extension modifies it, the webview receives a `setContent` message. The challenge: replace TipTap content without losing cursor position.

Options:
1. **Full replace** - Simple but loses cursor (acceptable for external edits)
2. **Diff and patch** - Complex but preserves cursor (nice to have)
3. **Only update if webview is not focused** - Pragmatic middle ground

**Recommendation:** Option 3 for v1.0, consider option 2 later.

---

## 6. Build Pipeline

The webview content must be a self-contained HTML page with bundled JS/CSS. Vite can produce this:

```typescript
// packages/vscode/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/webview',
    rollupOptions: {
      input: 'src/webview/index.tsx',
      output: {
        entryFileNames: 'webview.js',
        assetFileNames: 'webview.css',
        // Single chunk for webview
        manualChunks: undefined,
      },
    },
  },
});
```

The extension loads the bundled output:

```typescript
private getHtmlForWebview(webview: vscode.Webview): string {
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(this.context.extensionUri, 'dist', 'webview', 'webview.css')
  );
  const nonce = getNonce();
  
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="Content-Security-Policy" 
        content="default-src 'none'; 
                 style-src ${webview.cspSource} 'unsafe-inline'; 
                 script-src 'nonce-${nonce}';
                 img-src ${webview.cspSource} https: data:;">
      <link href="${styleUri}" rel="stylesheet" />
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
}
```

---

## 7. Image Handling (Better Than Web)

In VS Code, image handling becomes much simpler:

```typescript
// Extension side - has full file system access
case 'saveImage': {
  const { data, filename } = message;
  const fileDir = path.dirname(document.uri.fsPath);
  const assetsDir = path.join(fileDir, 'assets');
  
  // Create assets/ if needed
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(assetsDir));
  
  // Write file
  const imagePath = path.join(assetsDir, filename);
  await vscode.workspace.fs.writeFile(
    vscode.Uri.file(imagePath),
    Buffer.from(data, 'base64')
  );
  
  // Return relative path to webview
  webviewPanel.webview.postMessage({
    type: 'imageInserted',
    src: `assets/${filename}`,
  });
}
```

No File System Access API compatibility issues - VS Code's `workspace.fs` works everywhere.

---

## 8. Competitive Landscape

```vscode-extensions
vikgamov.calliope-md,yzhang.markdown-all-in-one
```

| Extension | Approach | RendMD Advantage |
|-----------|----------|------------------|
| **Calliope** | Inline rendering in text editor | RendMD is true WYSIWYG (rendered-first), not inline tokens |
| **Markdown All in One** | Preview pane + shortcuts | RendMD edits in the rendered view, not the source |
| **VS Code built-in preview** | Read-only HTML preview | RendMD is editable |
| **markdownlint** | Linting only | Complementary, not competitive |

**Gap:** No VS Code extension offers TipTap-powered rendered-first markdown editing with `CustomTextEditorProvider`. This would be a first.

---

## 9. Development Plan

### Option A: After v1.0 Web Release (Recommended)
1. Complete web app through Phase 6 (v1.0)
2. Refactor into monorepo (extract `packages/core`)
3. Build VS Code extension wrapper
4. Benefit: web app is battle-tested, fewer bugs to find in the extension

### Option B: Parallel Development
1. Extract shared core now
2. Build both simultaneously
3. Risk: premature abstraction, slower progress on both

### Option C: VS Code-First Pivot
1. Pause web app after Phase 4
2. Focus entirely on VS Code extension
3. Risk: web app becomes stale, but VS Code version ships faster

**Recommendation:** **Option A** unless you personally use VS Code exclusively and want the extension more urgently than the web app.

### Estimated Effort

| Task | Effort |
|------|--------|
| Monorepo setup + core extraction | 2-3 days |
| Extension scaffolding (provider, build) | 1 day |
| Webview shell + bridge (message passing) | 2-3 days |
| Theme integration | 1 day |
| Image handling (VS Code FS) | 1-2 days |
| Testing + polish | 2-3 days |
| **Total** | **~2-3 weeks** |

---

## 10. Open Questions / Decisions Needed

| Question | Options | My Recommendation |
|----------|---------|-------------------|
| When to start? | After v1.0 / After Phase 4 / Now | After v1.0 (Option A) |
| Monorepo tool? | npm workspaces / pnpm workspaces / turborepo | pnpm workspaces (fast, reliable) |
| Keep source view? | Yes / No (VS Code has its own) | No - users can split view with native text editor |
| Priority on marketplace? | `option` / `default` | `option` (let users choose) |
| Extension name? | "RendMD" / "RendMD Markdown Editor" | "RendMD - Markdown Editor" |
| Keep web app alive too? | Yes (both) / VS Code only | Yes - web app for non-VS Code users |

---

## References

- [VS Code Custom Editor API](https://code.visualstudio.com/api/extension-guides/custom-editors)
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview) 
- [Custom Editor Sample (CatScratch)](https://github.com/microsoft/vscode-extension-samples/tree/main/custom-editor-sample)
- [VS Code Theme Color Reference](https://code.visualstudio.com/api/references/theme-color)
- [Webview CSS Variables](https://code.visualstudio.com/api/extension-guides/webview#theming-webview-content)

---

*Research complete. This is a strong product-market fit. When ready, Builder can scaffold the extension using the architecture above.*
