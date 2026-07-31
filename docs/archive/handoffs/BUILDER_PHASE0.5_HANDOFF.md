# Builder Agent - Phase 0.5 Handoff

> **Project:** RendMD - The thinking person's markdown editor  
> **Phase:** 0.5 - Markdown Round-Trip Validation  
> **Date:** 2026-01-29  
> **Prerequisites:** Phase 0 complete

---

## Your Mission

You are the **Builder** agent. Your task is to create debug infrastructure and validate markdown round-trip fidelity.

**Work incrementally.** Complete one step, get Reviewer approval, then proceed to the next.

---

## Pre-Flight Check

Confirm Phase 0 is complete:
```powershell
cd L:\RendMD
npm run dev
```

Verify the editor loads and you can type.

---

## Step 1: Verify Test Fixture Exists

### Task
Confirm the test fixture file exists and is ready for use.

### Actions
```powershell
# Check file exists
Test-Path "tests/fixtures/markdown-test-suite.md"
```

The file should already exist at `tests/fixtures/markdown-test-suite.md` with comprehensive test cases.

### Handoff
Tell Reviewer: **"Step 1 ready. Test fixture exists at tests/fixtures/markdown-test-suite.md. Please verify completeness."**

**Wait for Reviewer approval before proceeding to Step 2.**

---

## Step 2: Create Debug Panel Component

### Task
Create a development-only debug panel that shows markdown transformation stages.

### File: `src/components/Editor/DebugPanel.tsx`

```typescript
import { useState } from 'react';
import { ChevronDown, ChevronRight, Bug } from 'lucide-react';
import { cn } from '@/utils/cn';

interface DebugPanelProps {
  inputMarkdown: string;
  outputMarkdown: string;
  proseMirrorDoc: object | null;
}

export function DebugPanel({ inputMarkdown, outputMarkdown, proseMirrorDoc }: DebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'output' | 'doc' | 'diff'>('diff');

  // Only render in development
  if (!import.meta.env.DEV) {
    return null;
  }

  const isDifferent = inputMarkdown !== outputMarkdown;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-bg-secondary border-t border-border">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-bg-tertiary transition-colors"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Bug size={16} className="text-accent" />
        <span className="text-sm font-medium">Debug Panel</span>
        {isDifferent && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-warning/20 text-warning rounded">
            Diff Detected
          </span>
        )}
      </button>

      {/* Panel Content */}
      {isOpen && (
        <div className="h-64 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['input', 'output', 'doc', 'diff'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-accent border-b-2 border-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {tab === 'input' && 'Input MD'}
                {tab === 'output' && 'Output MD'}
                {tab === 'doc' && 'ProseMirror'}
                {tab === 'diff' && `Diff ${isDifferent ? '⚠️' : '✓'}`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'input' && (
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">
                {inputMarkdown || '(empty)'}
              </pre>
            )}

            {activeTab === 'output' && (
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">
                {outputMarkdown || '(empty)'}
              </pre>
            )}

            {activeTab === 'doc' && (
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap">
                {proseMirrorDoc ? JSON.stringify(proseMirrorDoc, null, 2) : '(no document)'}
              </pre>
            )}

            {activeTab === 'diff' && (
              <DiffView input={inputMarkdown} output={outputMarkdown} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface DiffViewProps {
  input: string;
  output: string;
}

function DiffView({ input, output }: DiffViewProps) {
  if (input === output) {
    return (
      <div className="text-success text-sm">
        ✓ No differences detected. Round-trip successful!
      </div>
    );
  }

  const inputLines = input.split('\n');
  const outputLines = output.split('\n');
  const maxLines = Math.max(inputLines.length, outputLines.length);

  return (
    <div className="space-y-1">
      <div className="text-warning text-sm mb-2">
        ⚠️ Differences detected between input and output:
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <div className="text-text-muted mb-1">Input ({inputLines.length} lines)</div>
          {inputLines.map((line, i) => {
            const isDiff = line !== outputLines[i];
            return (
              <div
                key={i}
                className={cn(
                  "px-1",
                  isDiff && "bg-error/20 text-error"
                )}
              >
                <span className="text-text-muted mr-2">{i + 1}</span>
                {line || ' '}
              </div>
            );
          })}
        </div>
        <div>
          <div className="text-text-muted mb-1">Output ({outputLines.length} lines)</div>
          {outputLines.map((line, i) => {
            const isDiff = line !== inputLines[i];
            return (
              <div
                key={i}
                className={cn(
                  "px-1",
                  isDiff && "bg-success/20 text-success"
                )}
              >
                <span className="text-text-muted mr-2">{i + 1}</span>
                {line || ' '}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

### File: `src/components/Editor/index.ts` (update)

Add export:
```typescript
export { Editor } from './Editor';
export { DebugPanel } from './DebugPanel';
```

### Handoff
Tell Reviewer: **"Step 2 complete. Debug panel component created. Please review."**

**Wait for Reviewer approval before proceeding to Step 3.**

---

## Step 3: Create Round-Trip Test Utility

### Task
Create a utility function for testing markdown round-trip.

### File: `src/utils/roundtrip.ts`

```typescript
import { Editor } from '@tiptap/react';

export interface RoundTripResult {
  success: boolean;
  input: string;
  output: string;
  differences: LineDifference[];
  stats: {
    inputLines: number;
    outputLines: number;
    changedLines: number;
  };
}

export interface LineDifference {
  lineNumber: number;
  type: 'added' | 'removed' | 'changed';
  inputLine: string | null;
  outputLine: string | null;
}

/**
 * Test markdown round-trip through the editor.
 * Compares input markdown to output after parse → serialize cycle.
 */
export function testRoundTrip(input: string, editor: Editor | null): RoundTripResult {
  if (!editor) {
    return {
      success: false,
      input,
      output: '',
      differences: [],
      stats: { inputLines: 0, outputLines: 0, changedLines: 0 },
    };
  }

  // Set content and get serialized output
  editor.commands.setContent(input);
  
  // Get markdown from storage (tiptap-markdown stores it here)
  // @ts-expect-error - tiptap-markdown lacks type definitions
  const output: string = editor.storage.markdown?.getMarkdown() ?? '';

  // Compare line by line
  const inputLines = input.split('\n');
  const outputLines = output.split('\n');
  const differences: LineDifference[] = [];

  const maxLines = Math.max(inputLines.length, outputLines.length);

  for (let i = 0; i < maxLines; i++) {
    const inputLine = inputLines[i] ?? null;
    const outputLine = outputLines[i] ?? null;

    if (inputLine === null && outputLine !== null) {
      differences.push({
        lineNumber: i + 1,
        type: 'added',
        inputLine: null,
        outputLine,
      });
    } else if (inputLine !== null && outputLine === null) {
      differences.push({
        lineNumber: i + 1,
        type: 'removed',
        inputLine,
        outputLine: null,
      });
    } else if (inputLine !== outputLine) {
      differences.push({
        lineNumber: i + 1,
        type: 'changed',
        inputLine,
        outputLine,
      });
    }
  }

  return {
    success: differences.length === 0,
    input,
    output,
    differences,
    stats: {
      inputLines: inputLines.length,
      outputLines: outputLines.length,
      changedLines: differences.length,
    },
  };
}

/**
 * Format round-trip result for console output.
 */
export function formatRoundTripResult(result: RoundTripResult): string {
  const lines: string[] = [];

  lines.push(`Round-Trip Test ${result.success ? '✓ PASSED' : '✗ FAILED'}`);
  lines.push(`Input: ${result.stats.inputLines} lines`);
  lines.push(`Output: ${result.stats.outputLines} lines`);
  lines.push(`Changed: ${result.stats.changedLines} lines`);

  if (!result.success) {
    lines.push('\nDifferences:');
    for (const diff of result.differences.slice(0, 10)) {
      lines.push(`  Line ${diff.lineNumber} (${diff.type}):`);
      if (diff.inputLine !== null) {
        lines.push(`    - ${diff.inputLine}`);
      }
      if (diff.outputLine !== null) {
        lines.push(`    + ${diff.outputLine}`);
      }
    }
    if (result.differences.length > 10) {
      lines.push(`  ... and ${result.differences.length - 10} more`);
    }
  }

  return lines.join('\n');
}

/**
 * Log round-trip result to console (dev only).
 */
export function logRoundTripResult(result: RoundTripResult): void {
  if (import.meta.env.DEV) {
    console.group(`%cRound-Trip Test`, result.success ? 'color: green' : 'color: red');
    console.log(formatRoundTripResult(result));
    if (!result.success) {
      console.log('Full input:', result.input);
      console.log('Full output:', result.output);
    }
    console.groupEnd();
  }
}
```

### Handoff
Tell Reviewer: **"Step 3 complete. Round-trip test utility created. Please review."**

**Wait for Reviewer approval before proceeding to Step 4.**

---

## Step 4: Integrate Debug Panel into Editor

### Task
Connect the debug panel to the editor and track input/output state.

### Update: `src/components/Editor/Editor.tsx`

```typescript
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Markdown } from 'tiptap-markdown';
import { useEditorStore } from '@/stores/editorStore';
import { useEffect, useState, useCallback } from 'react';
import { DebugPanel } from './DebugPanel';

const INITIAL_CONTENT = `# Welcome to RendMD

**The thinking person's markdown editor.**

> *Intelligent. Elegant. Your data. Open source.*

Start typing to edit this document. This is a **rendered-first** editor, which means you're editing the beautiful output directly—not raw markdown.

## Features

- **Bold** and *italic* text
- [Links](https://example.com)
- Lists and more

### Try it out!

1. Click anywhere to start editing
2. Select text to see formatting options
3. Use keyboard shortcuts (Ctrl+B for bold, etc.)

---

*Built with ❤️ for writers, developers, and thinkers everywhere.*
`;

export function Editor() {
  const { content, setContent, showSource } = useEditorStore();
  
  // Track original input for debug comparison
  const [inputMarkdown, setInputMarkdown] = useState(INITIAL_CONTENT);
  const [outputMarkdown, setOutputMarkdown] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Placeholder.configure({
        placeholder: 'Start writing...',
      }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: content || INITIAL_CONTENT,
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      // @ts-expect-error - tiptap-markdown lacks type definitions
      const markdown: string = editor.storage.markdown?.getMarkdown() ?? '';
      setContent(markdown);
      setOutputMarkdown(markdown);
    },
  });

  // Function to load markdown for testing
  const loadTestMarkdown = useCallback((markdown: string) => {
    setInputMarkdown(markdown);
    if (editor) {
      editor.commands.setContent(markdown);
      // @ts-expect-error - tiptap-markdown lacks type definitions
      const output: string = editor.storage.markdown?.getMarkdown() ?? '';
      setOutputMarkdown(output);
    }
  }, [editor]);

  // Expose loadTestMarkdown to window for manual testing (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      // @ts-expect-error - adding to window for dev testing
      window.loadTestMarkdown = loadTestMarkdown;
      // @ts-expect-error - adding to window for dev testing
      window.editor = editor;
    }
  }, [loadTestMarkdown, editor]);

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content) {
      // @ts-expect-error - tiptap-markdown lacks type definitions
      const currentMarkdown: string = editor.storage.markdown?.getMarkdown() ?? '';
      if (currentMarkdown !== content) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  return (
    <>
      <div className="flex-1 flex overflow-hidden">
        {/* Rendered editor */}
        <div className={showSource ? 'w-1/2 border-r border-border' : 'w-full'}>
          <div className="h-full overflow-y-auto p-8">
            <EditorContent 
              editor={editor} 
              className="max-w-3xl mx-auto"
            />
          </div>
        </div>

        {/* Source view */}
        {showSource && (
          <div className="w-1/2 bg-bg-secondary">
            <div className="h-full overflow-y-auto p-4">
              <pre className="text-sm font-mono text-text-secondary whitespace-pre-wrap">
                {outputMarkdown || content || INITIAL_CONTENT}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* Debug Panel (dev only) */}
      <DebugPanel
        inputMarkdown={inputMarkdown}
        outputMarkdown={outputMarkdown}
        proseMirrorDoc={editor?.getJSON() ?? null}
      />
    </>
  );
}
```

### Handoff
Tell Reviewer: **"Step 4 complete. Debug panel integrated into editor. Please review."**

**Wait for Reviewer approval before proceeding to Step 5.**

---

## Step 5: Test Round-Trip with Test Suite

### Task
Load the test suite and document results.

### Actions

1. Start dev server:
```powershell
npm run dev
```

2. Open browser to http://localhost:5173

3. Open browser console and run:
```javascript
// Load the test file
fetch('/tests/fixtures/markdown-test-suite.md')
  .then(r => r.text())
  .then(md => window.loadTestMarkdown(md));
```

4. Open the Debug Panel (bottom of screen)

5. Check the "Diff" tab for any discrepancies

6. Document results in a structured format

### Create Results File: `tests/results/phase0.5-roundtrip-results.md`

```markdown
# Phase 0.5 Round-Trip Test Results

**Date:** 2026-01-29
**Tester:** Builder Agent
**Test File:** tests/fixtures/markdown-test-suite.md

## Summary

| Metric | Value |
|--------|-------|
| Input Lines | [X] |
| Output Lines | [X] |
| Changed Lines | [X] |
| Overall Status | [PASS/FAIL] |

## Element-by-Element Results

| Element | Status | Notes |
|---------|--------|-------|
| Frontmatter | ⬜ | |
| Headings (H1-H6) | ⬜ | |
| Bold/Italic | ⬜ | |
| Strikethrough | ⬜ | |
| Inline Code | ⬜ | |
| Links | ⬜ | |
| Images | ⬜ | |
| Unordered Lists | ⬜ | |
| Ordered Lists | ⬜ | |
| Nested Lists (3+ levels) | ⬜ | |
| Task Lists | ⬜ | |
| Blockquotes | ⬜ | |
| Nested Blockquotes | ⬜ | |
| Code Blocks (fenced) | ⬜ | |
| Code Blocks (indented) | ⬜ | |
| Tables | ⬜ | |
| Tables (alignment) | ⬜ | |
| Horizontal Rules | ⬜ | |
| Mixed Formatting | ⬜ | |

## Known Limitations

[Document any elements that don't survive round-trip]

1. **[Element]:** [Description of issue]
   - Input: `[example]`
   - Output: `[example]`
   - Severity: [Blocking/Acceptable/Cosmetic]
   - Workaround: [If any]

## Recommendations

[Any recommendations for Phase 1 based on findings]
```

### Handoff
Tell Reviewer: **"Step 5 complete. Round-trip testing done. Results documented. Please review and validate."**

---

## Step 6: Commit and Cleanup

### Task
Commit all Phase 0.5 work.

### Actions

```powershell
git add .
git commit -m "feat: add markdown round-trip debug infrastructure

- Add DebugPanel component (dev-only)
- Add roundtrip test utility
- Integrate debug panel into Editor
- Document round-trip test results

Phase 0.5 complete - markdown validation infrastructure ready"
```

### Handoff
Tell Reviewer: **"Step 6 complete. Phase 0.5 committed. Please do final review."**

---

## Reference Documents

- `docs/PROJECT_PLAN.md` - Phase 0.5 tasks
- `docs/PROJECT_CHRONICLE.md` - ADR-010 (testing strategy)
- `tests/fixtures/markdown-test-suite.md` - Test data
- `.github/copilot-instructions.md` - Coding standards

---

## Quick Reference

### Dev Testing Commands (Browser Console)

```javascript
// Load test file
fetch('/tests/fixtures/markdown-test-suite.md')
  .then(r => r.text())
  .then(md => window.loadTestMarkdown(md));

// Get current markdown
window.editor.storage.markdown.getMarkdown();

// Get ProseMirror document
window.editor.getJSON();
```

### File Structure After Phase 0.5

```
src/
├── components/
│   └── Editor/
│       ├── Editor.tsx       # Updated with debug integration
│       ├── DebugPanel.tsx   # NEW - Debug panel component
│       └── index.ts         # Updated exports
├── utils/
│   ├── cn.ts
│   ├── frontmatter.ts
│   └── roundtrip.ts         # NEW - Round-trip testing utility
tests/
├── fixtures/
│   └── markdown-test-suite.md  # Test data
└── results/
    └── phase0.5-roundtrip-results.md  # NEW - Test results
```

---

**You are Builder. Start with Step 1 and wait for Reviewer approval between steps.**
