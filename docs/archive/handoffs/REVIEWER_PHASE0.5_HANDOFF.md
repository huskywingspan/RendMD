# Reviewer Agent - Phase 0.5 Handoff

> **Project:** RendMD - The thinking person's markdown editor  
> **Phase:** 0.5 - Markdown Round-Trip Validation  
> **Date:** 2026-01-29  
> **Prerequisites:** Phase 0 complete, git repository initialized

---

## Your Mission

You are the **Reviewer** agent. Your task is to validate Builder's work in incremental steps and ensure markdown round-trip fidelity is properly tested.

**Work incrementally.** Complete one step, verify it works, then move to the next.

---

## Pre-Flight Check

Confirm Phase 0 is complete:
```powershell
cd L:\RendMD
git log --oneline -5
npm run build
```

Expected: Build passes, multiple commits visible.

---

## Step 1: Review Test Fixture

### Task
Verify the markdown test suite file is comprehensive.

### Actions
1. Open `tests/fixtures/markdown-test-suite.md`
2. Review for completeness against GFM spec
3. Check these critical elements exist:
   - [ ] Frontmatter with multiple field types
   - [ ] All 6 heading levels
   - [ ] Nested lists (3+ levels deep)
   - [ ] Tables with alignment
   - [ ] Code blocks with language specifiers
   - [ ] Task lists (checked and unchecked)
   - [ ] Blockquote nesting
   - [ ] Mixed formatting (bold in italic, etc.)
   - [ ] Edge cases (Unicode, emoji, long lines)

### Verification
```powershell
# Check file exists and has substantial content
Get-Content "tests/fixtures/markdown-test-suite.md" | Measure-Object -Line
```
Expected: 400+ lines

### Handoff
Once verified, tell Builder: **"Step 1 complete. Test fixture verified. Proceed to Step 2."**

---

## Step 2: Review Debug Panel (After Builder Completes)

### Task
Review the debug panel component for correctness.

### Checklist
- [ ] Component only renders in development mode
- [ ] Shows raw input markdown
- [ ] Shows ProseMirror document JSON
- [ ] Shows serialized output markdown
- [ ] Has toggle to show/hide
- [ ] Doesn't break production build

### Test Commands
```powershell
# Dev build should include debug panel
npm run dev
# Check browser - debug panel should be visible

# Production build should NOT include debug panel
npm run build
npm run preview
# Check browser - debug panel should NOT be visible
```

### Code Review Points
- No `console.log` left in production code paths
- Debug panel uses `import.meta.env.DEV` guard
- Component is properly typed
- CSS doesn't leak to production

### Handoff
Once verified, tell Builder: **"Step 2 complete. Debug panel approved. Proceed to Step 3."**

---

## Step 3: Review Round-Trip Test Utility (After Builder Completes)

### Task
Review the round-trip testing utility function.

### Checklist
- [ ] Function takes markdown string input
- [ ] Parses through TipTap/ProseMirror
- [ ] Serializes back to markdown
- [ ] Returns comparison result
- [ ] Handles errors gracefully

### Test Commands
```powershell
# If unit tests are set up
npm run test

# Otherwise, verify in browser console
```

### Code Review Points
- Function is exported and documented
- Types are explicit (no `any`)
- Edge cases handled (empty string, null, malformed)
- Returns structured result (pass/fail, diff, details)

### Handoff
Once verified, tell Builder: **"Step 3 complete. Test utility approved. Proceed to Step 4."**

---

## Step 4: Validate Round-Trip with Test Suite

### Task
Run the test suite through the round-trip and document results.

### Actions
1. Load `markdown-test-suite.md` into the editor
2. Use debug panel to compare input vs output
3. Document any discrepancies

### Expected Results Table

| Element | Expected | Status |
|---------|----------|--------|
| Frontmatter | Preserved exactly | ⬜ |
| Headings (all levels) | Preserved | ⬜ |
| Bold/Italic | Preserved | ⬜ |
| Nested lists (3+ levels) | Preserved | ⬜ |
| Tables with alignment | Preserved | ⬜ |
| Code blocks with language | Preserved | ⬜ |
| Task lists | Preserved | ⬜ |
| Blockquotes | Preserved | ⬜ |
| Links with titles | Preserved | ⬜ |
| Images with alt text | Preserved | ⬜ |

### Document Findings
For each failure, document:
1. What element failed
2. Input markdown
3. Output markdown
4. Severity (blocking vs acceptable)

### Handoff
Create a summary in `docs/PROJECT_CHRONICLE.md` under a new section:
**"Phase 0.5 - Round-Trip Test Results"**

---

## Step 5: Final Commit Review

### Task
Review Builder's commits for Phase 0.5.

### Checklist
- [ ] Conventional commit messages
- [ ] No unnecessary files committed
- [ ] .gitignore updated if needed
- [ ] Build still passes
- [ ] Lint still passes

### Commands
```powershell
git log --oneline -10
npm run build
npm run lint
```

### Final Approval
If all steps pass:
```
✅ Phase 0.5 APPROVED

Summary:
- Debug panel: Working
- Test utility: Working
- Round-trip results: [X/Y elements pass]
- Known limitations: [list any]

Ready for Phase 1.
```

---

## Reference Documents

- `docs/PROJECT_PLAN.md` - Phase 0.5 tasks
- `docs/PROJECT_CHRONICLE.md` - ADR-010 (testing strategy)
- `tests/fixtures/markdown-test-suite.md` - Test data

---

**You are Reviewer. Wait for Builder to complete each step before reviewing.**
