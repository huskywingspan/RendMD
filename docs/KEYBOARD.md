# Keyboard shortcuts

Press `Ctrl+/` in the app for a searchable version of this list — it's generated from the same registry, so it can't fall out of date.

On macOS, `Ctrl` means `⌘` throughout.

---

## The two that matter

| | |
|---|---|
| `Ctrl+K` | **Command palette.** Files, headings, commands — everything. |
| `Ctrl+S` | **Save.** Writes to the original file. |

Almost everything below is also reachable from the palette. The shortcuts are for the things you do often enough to want muscle memory.

## Palette prefixes

| Type | To search |
|---|---|
| *(nothing)* | Files in your workspace, then commands |
| `>` | Commands only |
| `#` | Headings in the current document |

Matching is fuzzy and subsequence-based: `tgfcs` finds "Toggle focus mode", `docarch` finds `docs/ARCHITECTURE.md`.

## Files

| | |
|---|---|
| `Ctrl+N` | New document |
| `Ctrl+O` | Open file |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save as |
| `Ctrl+Alt+S` | Save all |
| `Ctrl+W` | Close document |

Opening a folder, reverting to the last saved version, and reloading from disk are in the palette under **Workspace** and **File**.

## Documents

| | |
|---|---|
| `Ctrl+Tab` | Next document |
| `Ctrl+Shift+Tab` | Previous document |
| `Ctrl+4`…`Ctrl+9` | Jump to that document |

`Ctrl+1` through `Ctrl+3` are view modes, not tabs — see below.

## View

| | |
|---|---|
| `Ctrl+1` | Rendered |
| `Ctrl+2` | Split (rendered and source side by side) |
| `Ctrl+3` | Source |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+Shift+E` | Show files |
| `Ctrl+Shift+O` | Show outline |
| `Ctrl+Shift+F` | Focus mode — hides all chrome |
| `Ctrl+=` / `Ctrl+-` | Text size |

## Editing

| | |
|---|---|
| `Ctrl+F` | Find |
| `Ctrl+H` | Find and replace |
| `Ctrl+Z` / `Ctrl+Shift+Z` | Undo / redo |
| `Ctrl+B` `Ctrl+I` | Bold, italic *(inside the editor)* |
| `Ctrl+Shift+I` | Insert image |

`Ctrl+B` is context-sensitive: it toggles the sidebar unless the editor has focus and text is selected.

**Select text** to get the formatting menu — block type, bold, italic, strikethrough, code, link. There's no permanent toolbar by design.

## Markdown as you type

| Type | Get |
|---|---|
| `# ` `## ` `### ` | Heading 1, 2, 3 |
| `- ` or `* ` | Bullet list |
| `1. ` | Numbered list |
| `- [ ] ` | Task list |
| `> ` | Blockquote |
| ` ``` ` | Code block |
| `---` | Horizontal rule |
| `**bold**` `_italic_` `` `code` `` | Inline formatting |

## Help

| | |
|---|---|
| `Ctrl+/` | All shortcuts |
| `Ctrl+,` | Settings |
| `Esc` | Close whatever's open |
