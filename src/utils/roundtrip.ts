import type { Editor } from '@tiptap/react';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = editor.storage as any;
  const output: string = storage.markdown?.getMarkdown?.() ?? '';

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
