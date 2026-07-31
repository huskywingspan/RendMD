# Builder Handoff: Phase 4 - Images & Navigation

**From:** Researcher  
**To:** Builder  
**Date:** 2026-02-08  
**Priority:** Ready for implementation

---

## Summary

Phase 4 adds two major feature areas:
1. **Image handling** - Drag-drop, paste, local asset management
2. **Table of Contents** - Auto-generated sidebar navigation
3. **Keyboard shortcuts help** - Modal showing all shortcuts

---

## Phase 4A: Image Handling

### What Already Exists
- `ImagePopover.tsx` - Editing alt text / URL for existing images (Phase 1)
- `@tiptap/extension-image` with `allowBase64: true` configured
- `useFileSystem.ts` hook with File System Access API support
- Image extension CSS class: `editor-image`

### What to Build

#### 1. Drag-Drop Image Upload
**Priority:** High | **Effort:** Medium

TipTap handles basic drop events, but we need custom handling for file drops:

```typescript
// In Editor.tsx or as a TipTap extension
editor.view.dom.addEventListener('drop', async (event) => {
  const files = event.dataTransfer?.files;
  if (!files?.length) return;
  
  event.preventDefault();
  
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) continue;
    
    // Show choice dialog: embed as base64 or save to assets
    const result = await showImageChoiceDialog(file);
    
    if (result === 'base64') {
      const dataUrl = await fileToBase64(file);
      editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
    } else if (result === 'local') {
      const relativePath = await saveToAssets(file);
      editor.chain().focus().setImage({ src: relativePath, alt: file.name }).run();
    }
  }
});
```

#### 2. Paste Image from Clipboard
**Priority:** High | **Effort:** Small

```typescript
// In Editor.tsx or as a TipTap extension
editor.view.dom.addEventListener('paste', async (event) => {
  const items = event.clipboardData?.items;
  if (!items) return;
  
  for (const item of Array.from(items)) {
    if (!item.type.startsWith('image/')) continue;
    
    event.preventDefault();
    const file = item.getAsFile();
    if (!file) continue;
    
    // Same choice dialog flow as drag-drop
    const result = await showImageChoiceDialog(file);
    // ... handle base64 or local save
  }
});
```

#### 3. "Store Locally or URL" Choice Dialog
**Priority:** High | **Effort:** Medium

Create `ImageInsertModal.tsx`:

```typescript
interface ImageInsertModalProps {
  file?: File;          // From drag/paste (has file data)
  onInsertUrl: (url: string, alt: string) => void;
  onInsertBase64: (dataUrl: string, alt: string) => void;
  onInsertLocal: (relativePath: string, alt: string) => void;
  onCancel: () => void;
}
```

Modal should show:
- **Tab 1: URL** - Paste an image URL
- **Tab 2: Local File** - Save to `assets/` folder next to the .md file
- **Tab 3: Embed** - Base64 inline (with warning about file size)

If triggered from paste/drop (has file data), default to "Local File" tab.

#### 4. Asset Folder Management
**Priority:** High | **Effort:** Medium

This is the trickiest part. Requires File System Access API (already in `useFileSystem.ts`).

```typescript
// New: src/hooks/useImageAssets.ts

interface UseImageAssetsReturn {
  saveImage: (file: File) => Promise<string>;  // Returns relative path
  hasNativeFS: boolean;
}

export function useImageAssets(): UseImageAssetsReturn {
  const { fileHandleRef } = useFileSystem();
  
  const saveImage = async (file: File): Promise<string> => {
    const dirHandle = fileHandleRef.current; // Need parent directory handle
    
    // 1. Get or create assets/ directory
    const assetsDir = await dirHandle.getDirectoryHandle('assets', { create: true });
    
    // 2. Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const name = `${sanitize(file.name)}-${Date.now()}.${ext}`;
    
    // 3. Write file
    const fileHandle = await assetsDir.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();
    
    // 4. Return relative path
    return `assets/${name}`;
  };
  
  return { saveImage, hasNativeFS: !!window.showOpenFilePicker };
}
```

**Important:** Need to store the **directory handle**, not just the file handle. Currently `useFileSystem.ts` stores `FileSystemFileHandle`. You'll need to also store the parent `FileSystemDirectoryHandle` when a file is opened via the native picker:

```typescript
// When opening a file, also get parent directory
const [fileHandle] = await window.showOpenFilePicker(options);
// Need directory handle for asset saving
// Option 1: Ask for directory permission separately
// Option 2: Use fileHandle and navigate up (not directly supported)
```

**Fallback for non-native FS browsers:** Fall back to base64 embedding with a note.

#### 5. Relative Path Generation
When the file is saved, image `src` should be relative to the .md file:
- `.md` at `C:\docs\readme.md` + image at `C:\docs\assets\photo.png` → `assets/photo.png`
- If the .md file hasn't been saved yet, use base64 as temporary, convert on first save

### Image Handling Edge Cases
| Scenario | Behavior |
|----------|----------|
| No native FS (Firefox) | Embed as base64, show info tooltip |
| File not yet saved | Embed as base64, note "save file to enable local images" |
| Paste screenshot | Auto-name as `screenshot-{timestamp}.png` |
| Drag multiple images | Process sequentially, insert at drop position |
| Large image (>5MB) | Warning dialog about file size if using base64 |

---

## Phase 4B: Table of Contents

### Architecture

The TOC is already stubbed in the sidebar (`src/components/Sidebar/`). 

#### 1. TOC Data Extraction

```typescript
// src/hooks/useTOC.ts

interface TOCItem {
  id: string;        // Unique ID for the heading
  text: string;      // Heading text content
  level: number;     // 1-6
  pos: number;       // ProseMirror position (for scrolling)
}

export function useTOC(editor: Editor | null): TOCItem[] {
  const [items, setItems] = useState<TOCItem[]>([]);
  
  useEffect(() => {
    if (!editor) return;
    
    const extractHeadings = () => {
      const headings: TOCItem[] = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          headings.push({
            id: `heading-${pos}`,
            text: node.textContent,
            level: node.attrs.level,
            pos,
          });
        }
      });
      setItems(headings);
    };
    
    extractHeadings();
    editor.on('update', extractHeadings);
    return () => editor.off('update', extractHeadings);
  }, [editor]);
  
  return items;
}
```

#### 2. TOC Sidebar Component

```typescript
// src/components/Sidebar/TOCPanel.tsx

interface TOCPanelProps {
  items: TOCItem[];
  activeId: string | null;
  onItemClick: (item: TOCItem) => void;
}
```

Visual design:
- Indentation based on heading level (H1 = 0, H2 = indent 1, etc.)
- Current section highlighted with accent color
- Hover effect
- Nesting lines (subtle vertical lines connecting children)
- Collapse/expand for deeply nested sections (optional v1.0)

#### 3. Click to Scroll

```typescript
const scrollToHeading = (item: TOCItem) => {
  // TipTap method
  editor.commands.setTextSelection(item.pos);
  
  // Also scroll the DOM
  const domAtPos = editor.view.domAtPos(item.pos);
  const element = domAtPos.node as HTMLElement;
  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
```

#### 4. Current Section Highlighting

Track scroll position and determine which heading is "active":

```typescript
// In useTOC or separate useActiveTOCItem hook
const updateActiveItem = () => {
  const editorElement = editor.view.dom;
  const scrollTop = editorElement.scrollTop;
  
  // Find the last heading that's above the current scroll position
  let activePos = items[0]?.pos;
  for (const item of items) {
    const domNode = editor.view.domAtPos(item.pos).node;
    if ((domNode as HTMLElement).offsetTop <= scrollTop + 50) {
      activePos = item.pos;
    } else {
      break;
    }
  }
  setActiveId(`heading-${activePos}`);
};
```

### TOC Sidebar Toggle
- Use existing `sidebar.activePanel` state in editorStore
- Panel value: `'toc'`
- Toggle button in sidebar or header
- Remember open/closed state

---

## Phase 4C: Keyboard Shortcuts Help Modal

### Requirements
- Triggered by `Ctrl+?` (or `Ctrl+Shift+/`)
- Shows all available shortcuts grouped by category
- Modal with search/filter
- Each shortcut shows: Action name, keys, category

### Data Structure

```typescript
interface ShortcutEntry {
  action: string;
  keys: string;        // e.g., "Ctrl+B"
  category: 'editing' | 'formatting' | 'navigation' | 'file' | 'view';
}

const SHORTCUTS: ShortcutEntry[] = [
  { action: 'Bold', keys: 'Ctrl+B', category: 'formatting' },
  { action: 'Italic', keys: 'Ctrl+I', category: 'formatting' },
  { action: 'Code', keys: 'Ctrl+`', category: 'formatting' },
  { action: 'Link', keys: 'Ctrl+K', category: 'formatting' },
  { action: 'Strikethrough', keys: 'Ctrl+Shift+X', category: 'formatting' },
  { action: 'Heading 1-6', keys: 'Ctrl+1 to Ctrl+6', category: 'formatting' },
  { action: 'Open file', keys: 'Ctrl+O', category: 'file' },
  { action: 'Save', keys: 'Ctrl+S', category: 'file' },
  { action: 'Toggle source', keys: 'Ctrl+/', category: 'view' },
  { action: 'Show shortcuts', keys: 'Ctrl+?', category: 'navigation' },
  { action: 'Undo', keys: 'Ctrl+Z', category: 'editing' },
  { action: 'Redo', keys: 'Ctrl+Y', category: 'editing' },
  // ... etc
];
```

### Component

```tsx
// src/components/Modals/ShortcutsModal.tsx
export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Group by category, optional search filter
}
```

---

## Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `src/hooks/useImageAssets.ts` | Asset folder management, image saving |
| `src/hooks/useTOC.ts` | Heading extraction from editor |
| `src/components/Modals/ImageInsertModal.tsx` | Image source choice dialog |
| `src/components/Modals/ShortcutsModal.tsx` | Keyboard shortcut help |
| `src/components/Sidebar/TOCPanel.tsx` | Table of contents UI |
| `src/utils/imageHelpers.ts` | Base64 conversion, filename sanitization |

### Modified Files
| File | Changes |
|------|---------|
| `src/hooks/useFileSystem.ts` | Store directory handle alongside file handle |
| `src/components/Editor/Editor.tsx` | Add drop/paste event handlers for images |
| `src/components/Editor/ImagePopover.tsx` | May need "replace image" option |
| `src/components/Sidebar/Sidebar.tsx` | Integrate TOCPanel |
| `src/stores/editorStore.ts` | TOC active item state |
| `src/components/Header/Header.tsx` | Shortcut help button |

---

## Suggested Implementation Order

1. **useTOC hook + TOCPanel** (low risk, standalone)
2. **ShortcutsModal** (low risk, standalone)
3. **Image base64 embedding** (paste + drag-drop → base64, no FS needed)
4. **ImageInsertModal** (choice dialog)
5. **useImageAssets** (local file saving, requires FS work)
6. **Integration testing** (round-trip with images, TOC with complex docs)

---

## Success Criteria

- [ ] Drag-drop image into editor works
- [ ] Paste image from clipboard works
- [ ] Choice dialog for URL / local / base64
- [ ] Assets folder created automatically when saving locally
- [ ] Relative paths used for local images
- [ ] Graceful fallback on Firefox (base64 only)
- [ ] TOC auto-generates from headings
- [ ] Click TOC item scrolls to heading
- [ ] Current section highlighted in TOC
- [ ] Ctrl+? opens shortcuts help modal
- [ ] Build passes, no new warnings

---

**Ready to build!**
