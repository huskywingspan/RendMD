# Reviewer Handoff: Phase 1.5 - Polish & Enhancements

> **Phase:** 1.5  
> **Role:** Quality gate for polish and enhancement features  
> **Prerequisites:** Phase 1 approved  
> **Review Checkpoints:** 4 (aligned with Builder steps)

---

## Review Philosophy

Phase 1.5 is about making RendMD feel premium. Your focus:

1. **Visual quality** - Themes look intentional, not broken
2. **UX polish** - Interactions feel smooth
3. **Performance** - Shiki doesn't make the editor sluggish
4. **Consistency** - All four themes work with all features

---

## Checkpoint 1: Theme System Foundation

**Builder says:** *"Step 1 complete. Theme system with useTheme hook and all four theme CSS files."*

### Verify Code Structure

- [ ] `src/hooks/useTheme.ts` exists and exports hook
- [ ] `src/hooks/index.ts` exports all hooks
- [ ] All four theme CSS files exist:
  - `src/themes/dark-basic.css`
  - `src/themes/light-basic.css`
  - `src/themes/dark-glass.css`
  - `src/themes/light-glass.css`
- [ ] `src/themes/index.css` imports all themes
- [ ] `src/index.css` imports themes

### Test Theme System

1. **Manual theme class test:**
   - Open browser DevTools
   - Add class `light-basic` to `<html>` element
   - Verify colors change immediately
   - Try each theme class

2. **useTheme hook:**
   - Check that hook returns: `theme`, `setTheme`, `toggleDarkLight`, `isDark`
   - Verify initial theme loads from localStorage (or defaults to dark-basic)

3. **CSS Variables:**
   - Each theme defines all required variables:
     - `--theme-bg-primary`, `--theme-bg-secondary`, `--theme-bg-tertiary`
     - `--theme-text-primary`, `--theme-text-secondary`, `--theme-text-muted`
     - `--theme-accent`, `--theme-accent-hover`
     - `--theme-border`, `--theme-border-subtle`
     - `--theme-code-bg`

4. **No build errors:**
   ```bash
   npm run build
   ```

**Approve or request fixes, then Builder proceeds to Step 2.**

---

## Checkpoint 2: Theme Toggle in Header

**Builder says:** *"Step 2 complete. Theme toggle in header with dropdown menu and Cmd+D shortcut."*

### Verify Code

- [ ] Header component updated with theme dropdown
- [ ] Uses `useTheme` hook correctly
- [ ] Dropdown menu uses semantic HTML (buttons, not divs)
- [ ] Keyboard shortcut registered in App.tsx

### Test Functionality

1. **Theme dropdown:**
   - [ ] Click theme button → dropdown appears
   - [ ] Shows all four theme options
   - [ ] Current theme has checkmark indicator
   - [ ] Selecting theme → UI updates immediately
   - [ ] Click outside → dropdown closes

2. **Dark/Light toggle:**
   - [ ] "Quick Toggle" option in dropdown
   - [ ] Preserves basic/glass variant (dark-basic → light-basic, dark-glass → light-glass)

3. **Keyboard shortcut:**
   - [ ] Cmd+D (Mac) / Ctrl+D (Windows) toggles dark/light
   - [ ] Works when editor has focus
   - [ ] Works when editor doesn't have focus

4. **Persistence:**
   - [ ] Switch to light-glass theme
   - [ ] Refresh page
   - [ ] Theme is still light-glass

5. **Icon updates:**
   - [ ] Moon icon when dark theme active
   - [ ] Sun icon when light theme active

### Visual Quality Check

Test each theme for obvious issues:

| Theme | Background | Text Readable | Accent Visible | Borders Clear |
|-------|------------|---------------|----------------|---------------|
| dark-basic | ☐ | ☐ | ☐ | ☐ |
| light-basic | ☐ | ☐ | ☐ | ☐ |
| dark-glass | ☐ | ☐ | ☐ | ☐ |
| light-glass | ☐ | ☐ | ☐ | ☐ |

**Approve or request fixes, then Builder proceeds to Step 3.**

---

## Checkpoint 3: Shiki Syntax Highlighting

**Builder says:** *"Step 3 complete. Shiki syntax highlighting with language selector and copy button."*

### Verify Dependencies

```bash
npm list shiki @tiptap/extension-code-block-lowlight lowlight
```
- [ ] All three packages installed

### Verify Code Structure

- [ ] `CodeBlockComponent.tsx` created
- [ ] Uses `ReactNodeViewRenderer` pattern
- [ ] Extensions updated to use custom code block
- [ ] Editor styles updated for code block wrapper

### Test Code Block Features

1. **Create code block:**
   - Type \`\`\`javascript and Enter
   - Code block appears with "javascript" language label
   - Or: Select text, press Ctrl+Alt+C

2. **Syntax highlighting:**
   ```javascript
   function hello(name) {
     console.log(`Hello, ${name}!`);
     return { greeting: true };
   }
   ```
   - [ ] Keywords colored (function, return)
   - [ ] Strings colored
   - [ ] Comments colored (add one to test)
   - [ ] Highlighting appears within ~100ms

3. **Language selector:**
   - [ ] Dropdown appears on hover (top-right)
   - [ ] Shows common languages
   - [ ] Selecting language updates highlighting
   - [ ] Language label updates

4. **Copy button:**
   - [ ] Copy button appears on hover
   - [ ] Click copies code to clipboard
   - [ ] Checkmark appears briefly after copy
   - [ ] Verify clipboard content matches code

5. **Test multiple languages:**

   | Language | Highlighting Works |
   |----------|-------------------|
   | javascript | ☐ |
   | typescript | ☐ |
   | python | ☐ |
   | rust | ☐ |
   | css | ☐ |
   | json | ☐ |
   | markdown | ☐ |

6. **Editing within code block:**
   - [ ] Can type and edit code
   - [ ] Tab inserts tab character (not focus change)
   - [ ] Backspace works normally
   - [ ] Highlighting updates as you type

7. **Round-trip test:**
   - Create code block with language
   - Check debug panel output
   - Language annotation preserved: \`\`\`javascript

### Theme Compatibility

Test code blocks in all themes:
- [ ] dark-basic: Code readable, highlighting visible
- [ ] light-basic: Code readable, highlighting visible
- [ ] dark-glass: Code readable through glass effect
- [ ] light-glass: Code readable through glass effect

### Performance Check

- [ ] No noticeable lag when typing in code blocks
- [ ] Switching languages doesn't freeze UI
- [ ] Large code blocks (50+ lines) still responsive

**Approve or request fixes, then Builder proceeds to Step 4.**

---

## Checkpoint 4: Final Integration Review

**Builder says:** *"Step 4 complete. Phase 1.5 implementation finished."*

### Full Feature Test

Run through all Phase 1.5 features in sequence:

1. **Fresh start:**
   - Clear localStorage: `localStorage.clear()` in console
   - Refresh page
   - [ ] App loads with dark-basic theme (default)

2. **Theme workflow:**
   - [ ] Switch to light-basic via dropdown
   - [ ] Press Cmd+D → switches to dark-basic
   - [ ] Switch to dark-glass via dropdown
   - [ ] Press Cmd+D → switches to light-glass
   - [ ] Refresh → still light-glass

3. **Code block workflow:**
   - [ ] Create code block with \`\`\`typescript
   - [ ] Type some TypeScript code
   - [ ] Highlighting appears
   - [ ] Change language to python
   - [ ] Highlighting updates
   - [ ] Copy code
   - [ ] Paste elsewhere to verify

4. **Editor features still work:**
   - [ ] Bubble menu appears on selection
   - [ ] Bold, italic, links all work
   - [ ] Lists work
   - [ ] Images display

### Round-Trip Validation

Load comprehensive test file:

```javascript
// In browser console with dev server running:
fetch('/tests/fixtures/markdown-test-suite.md')
  .then(r => r.text())
  .then(md => window.loadTestMarkdown(md));
```

Check debug panel:
- [ ] Code blocks preserve language annotations
- [ ] Theme changes don't affect markdown output
- [ ] All other elements still round-trip correctly

### Build Verification

```bash
npm run lint
npm run build
```

- [ ] Lint passes
- [ ] Build succeeds
- [ ] Note bundle size: _______ KB

### Bundle Size Check

Expected: ~1MB (732KB base + ~300KB Shiki)

If significantly larger, investigate. This is acceptable for now but flagged for Phase 5 optimization.

### Code Quality

- [ ] No `any` types except documented exceptions
- [ ] Consistent code style
- [ ] No unused imports
- [ ] Components properly typed

---

## Phase 1.5 Approval

### Success Criteria (from PROJECT_PLAN.md)

1. [ ] Code blocks have accurate syntax highlighting
2. [ ] Theme toggle works and persists
3. [ ] All four theme options selectable

### Additional Criteria (this phase)

4. [ ] Copy code button works
5. [ ] Language selector works
6. [ ] Language label visible on code blocks
7. [ ] Keyboard shortcut (Cmd+D) works
8. [ ] All themes visually acceptable

### Approval Statement

If all criteria met:

> **Phase 1.5 APPROVED** ✅
> 
> All success criteria verified. Polish phase complete.
> 
> **Metrics:**
> - Bundle size: ___ KB
> - Themes implemented: 4/4
> - Code languages tested: X
> 
> **Notes:**
> - [Any observations]
> - [Performance notes]
> 
> Ready to proceed to Phase 2 (Tables & File Ops).

If issues found:

> **Phase 1.5 NEEDS WORK** 🔄
> 
> Issues to address:
> 1. [Issue description]
> 2. [Issue description]
> 
> Builder: Please fix and re-request review.

---

## Documentation Updates

After approval:

1. **Update PROJECT_PLAN.md:**
   - Mark Phase 1.5 tasks complete
   - Update status to "Phase 2 Ready"
   - Note bundle size

2. **Update PROJECT_CHRONICLE.md:**
   - Add session summary
   - Note Shiki bundle impact
   - Document any ADRs (theme system decisions, etc.)

3. **Prepare Phase 2 Handoff:**
   - Table editing
   - File System Access API
   - Open/Save/Save As

---

## Known Considerations

### Shiki Bundle Size
Shiki adds significant weight. This is a conscious trade-off:
- **Pro:** Beautiful syntax highlighting that matches VS Code quality
- **Con:** ~300KB+ bundle increase
- **Mitigation:** Phase 5 will explore lazy loading, tree shaking

### Glass Theme Transparency
Glass themes use `backdrop-filter` which:
- Requires browser support (modern browsers OK)
- May have performance impact on low-end devices
- Needs content behind to see effect

### Theme Persistence
Uses localStorage which:
- Is synchronous (OK for this use case)
- Has ~5MB limit (we use <1KB)
- Persists until cleared

---

**Phase 1.5 complete! RendMD now looks and feels premium.**
