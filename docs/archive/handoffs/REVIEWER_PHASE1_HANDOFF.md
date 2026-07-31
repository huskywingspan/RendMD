# Reviewer Handoff: Phase 1 - Core Editing Features

> **Phase:** 1  
> **Role:** Quality gate for Phase 1 implementation  
> **Prerequisites:** Phase 0.5 approved  
> **Review Checkpoints:** 6 (aligned with Builder steps)

---

## Review Philosophy

Phase 1 is the heart of RendMD - this is where "rendered-first editing" becomes real. Your job is to ensure:

1. **UX feels right** - Editing is intuitive, not janky
2. **Markdown fidelity** - Round-trip preserves everything
3. **Code quality** - Matches project standards
4. **Accessibility** - Keyboard navigation works

---

## Checkpoint 1: Extensions Setup

**Builder says:** *"Step 1 complete. Extensions installed and configured."*

### Verify

- [ ] All extensions listed in Phase 1 scope are installed:
  - `@tiptap/extension-placeholder`
  - `@tiptap/extension-task-list`
  - `@tiptap/extension-task-item`
  - `@tiptap/extension-link`
  - `@tiptap/extension-image`
  - `@tiptap/extension-table` (row, cell, header)
- [ ] `editorExtensions` array is properly typed
- [ ] Extension configuration matches design spec
- [ ] `npm run build` passes
- [ ] No new TypeScript errors

### Test

```bash
npm run dev
```
- Open app, verify editor still loads
- Type some text, verify basic editing works
- Check console for errors

**Approve or request fixes, then Builder proceeds to Step 2.**

---

## Checkpoint 2: Bubble Menu

**Builder says:** *"Step 2 complete. Bubble menu implemented with formatting buttons."*

### Verify Code

- [ ] `BubbleMenu.tsx` follows component standards (named export, typed props)
- [ ] Uses CSS variables for theming, not hardcoded colors
- [ ] Button active states are visually distinct
- [ ] Icons from `lucide-react`

### Test Functionality

1. **Selection triggers menu:**
   - Select text → bubble menu appears
   - Click elsewhere → menu disappears
   - Select again → menu reappears

2. **Formatting buttons:**
   - [ ] Bold button works, shows active state when on bold text
   - [ ] Italic button works
   - [ ] Strikethrough works
   - [ ] Inline code works
   - [ ] Heading toggles work
   - [ ] List buttons work

3. **Keyboard shortcuts:**
   - [ ] Ctrl+B → bold
   - [ ] Ctrl+I → italic
   - [ ] Ctrl+` → inline code

4. **Visual quality:**
   - Menu positioned correctly (above selection)
   - No visual glitches or flicker
   - Looks good in dark theme

**Approve or request fixes, then Builder proceeds to Step 3.**

---

## Checkpoint 3: Link Popover

**Builder says:** *"Step 3 complete. Link popover with edit/remove/open functionality."*

### Verify Code

- [ ] `LinkPopover.tsx` follows component standards
- [ ] Uses `@floating-ui/react` for positioning
- [ ] Proper cleanup on close
- [ ] Escape key closes popover

### Test Functionality

1. **Link creation:**
   - Select text, click link button → popover opens
   - Enter URL, save → link created
   - Link displays with correct styling (color, underline)

2. **Link editing:**
   - Click existing link → popover opens with URL pre-filled
   - Edit URL, save → link updated
   - Remove button → link removed, text remains

3. **Link opening:**
   - Ctrl+Click link → opens in new tab
   - Regular click → opens popover (NOT navigate)

4. **Edge cases:**
   - Create link with empty URL → handles gracefully
   - Click outside popover → closes
   - Press Escape → closes

**Approve or request fixes, then Builder proceeds to Step 4.**

---

## Checkpoint 4: Lists and Task Lists

**Builder says:** *"Step 4 complete. Lists implemented with Tab/Shift+Tab indent, task list checkboxes."*

### Verify Code

- [ ] Keyboard shortcuts extension created properly
- [ ] List styling in CSS file
- [ ] Task list checkbox styling

### Test Functionality

1. **Bullet lists:**
   - Create bullet list from bubble menu
   - Add items with Enter
   - Tab indents item (nested list)
   - Shift+Tab outdents item
   - Continue to 3+ levels deep

2. **Numbered lists:**
   - Create numbered list
   - Numbers auto-increment
   - Indent/outdent preserves numbering

3. **Task lists:**
   - Create task list (keyboard or menu)
   - Checkbox renders and is clickable
   - Checked state toggles visually
   - Text editable after checkbox

4. **Round-trip test:**
   ```markdown
   - Item 1
     - Nested item
       - Deep nested
   - Item 2
   
   1. First
   2. Second
      1. Nested numbered
   
   - [ ] Unchecked task
   - [x] Checked task
   ```
   - Load this → Edit → Check debug panel → Compare output

**Approve or request fixes, then Builder proceeds to Step 5.**

---

## Checkpoint 5: Code Blocks and Blockquotes

**Builder says:** *"Step 5 complete. Code blocks and blockquotes styled."*

### Verify Code

- [ ] Code block styling uses CSS variables
- [ ] Monospace font applied correctly
- [ ] Blockquote left border uses accent color

### Test Functionality

1. **Code blocks:**
   - Create code block (Ctrl+Alt+C or ```)
   - Mono font displays
   - Background color distinct
   - Code text preserves whitespace
   - Long lines scroll horizontally

2. **Inline code:**
   - Select text, Ctrl+` → inline code
   - Styled differently from code block
   - Works within paragraphs

3. **Blockquotes:**
   - Create blockquote
   - Left border visible
   - Text styled (italic, muted color)
   - Nested blockquotes work

4. **Horizontal rules:**
   - Type `---` → horizontal rule
   - Styled line appears
   - Can delete with backspace

5. **Round-trip:**
   ````markdown
   Here is `inline code` in text.
   
   ```javascript
   function hello() {
     console.log("world");
   }
   ```
   
   > This is a blockquote
   > with multiple lines
   
   ---
   ````

**Approve or request fixes, then Builder proceeds to Step 6.**

---

## Checkpoint 6: Images and Final Review

**Builder says:** *"Step 6 complete. Phase 1 implementation finished."*

### Verify Image Handling

1. **Image display:**
   - Images render at appropriate size
   - Max-width respected
   - Border radius applied

2. **Image popover:**
   - Click image → popover opens
   - Can edit URL and alt text
   - Remove button deletes image
   - Save updates image

3. **Image selection:**
   - Click image shows selection state
   - Keyboard navigation to/from images

### Full Round-Trip Validation

Load `tests/fixtures/markdown-test-suite.md` and verify:

- [ ] All headings (H1-H6) render and edit correctly
- [ ] All inline formatting survives round-trip
- [ ] All list types (bullet, numbered, task) work
- [ ] All link variations work
- [ ] Images display and are editable
- [ ] Code blocks preserve language annotations
- [ ] Tables render (editing is Phase 2)
- [ ] Frontmatter preserved (UI is Phase 3)

### Code Quality Final Check

- [ ] All new components follow naming conventions
- [ ] No `any` types (except documented tiptap-markdown workaround)
- [ ] Consistent code style
- [ ] No console.log statements (except debug panel)
- [ ] All exports properly organized

### Build & Lint

```bash
npm run build
npm run lint
```
- [ ] Build passes
- [ ] No lint errors

### Commit Review

Check git log for Phase 1:
- Commits are logical chunks
- Messages follow conventional commits format
- No unrelated changes mixed in

---

## Phase 1 Approval

### Success Criteria (from PROJECT_PLAN.md)

1. [ ] All GFM elements render correctly
2. [ ] Click any element to edit it
3. [ ] Bubble menu appears on text selection
4. [ ] Links are clickable (Ctrl+Click opens, Click edits)
5. [ ] Code blocks display correctly (styling, no Shiki yet)
6. [ ] Round-trip preserves all formatting

### Approval Statement

If all criteria met:

> **Phase 1 APPROVED** ✅
> 
> All success criteria verified. Core editing is functional.
> Ready to proceed to Phase 1.5 (Polish) or Phase 2 (Tables).
> 
> **Notes:**
> - [Any observations or minor issues to track]
> - [Performance notes if relevant]
> - [UX feedback if any]

If issues found:

> **Phase 1 NEEDS WORK** 🔄
> 
> Issues to address:
> 1. [Issue description]
> 2. [Issue description]
> 
> Builder: Please fix and re-request review.

---

## Handoff to Phase 1.5

After approval, update documentation:

1. Update `PROJECT_PLAN.md`:
   - Mark Phase 1 tasks complete
   - Update "Last Updated" date
   - Add Phase 1 completion notes

2. Update `PROJECT_CHRONICLE.md`:
   - Add session summary
   - Document any new ADRs or lessons learned

3. Create handoff for Phase 1.5:
   - Shiki integration
   - Theme toggle
   - Code block language selector

**Phase 1 complete! Great work making markdown editing visual.**
