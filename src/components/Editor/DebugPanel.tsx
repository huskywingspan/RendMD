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
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-line">
      {/* Toggle Header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 flex items-center gap-2 hover:bg-sunken transition-colors"
      >
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Bug size={16} className="text-[var(--rmd-accent)]" />
        <span className="text-sm font-medium">Debug Panel</span>
        {isDifferent && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-[var(--rmd-warning)]/20 text-[var(--rmd-warning)] rounded">
            Diff Detected
          </span>
        )}
      </button>

      {/* Panel Content */}
      {isOpen && (
        <div className="h-64 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-line">
            {(['input', 'output', 'doc', 'diff'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-[var(--rmd-accent)] border-b-2 border-[var(--rmd-accent)]"
                    : "text-ink-muted hover:text-ink"
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
              <pre className="text-xs font-mono text-ink-muted whitespace-pre-wrap">
                {inputMarkdown || '(empty)'}
              </pre>
            )}

            {activeTab === 'output' && (
              <pre className="text-xs font-mono text-ink-muted whitespace-pre-wrap">
                {outputMarkdown || '(empty)'}
              </pre>
            )}

            {activeTab === 'doc' && (
              <pre className="text-xs font-mono text-ink-muted whitespace-pre-wrap">
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
      <div className="text-[var(--rmd-success)] text-sm">
        ✓ No differences detected. Round-trip successful!
      </div>
    );
  }

  const inputLines = input.split('\n');
  const outputLines = output.split('\n');

  return (
    <div className="space-y-1">
      <div className="text-[var(--rmd-warning)] text-sm mb-2">
        ⚠️ Differences detected between input and output:
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div>
          <div className="text-ink-faint mb-1">Input ({inputLines.length} lines)</div>
          {inputLines.map((line, i) => {
            const isDiff = line !== outputLines[i];
            return (
              <div
                key={i}
                className={cn(
                  "px-1",
                  isDiff && "bg-[var(--rmd-danger)]/20 text-[var(--rmd-danger)]"
                )}
              >
                <span className="text-ink-faint mr-2">{i + 1}</span>
                {line || ' '}
              </div>
            );
          })}
        </div>
        <div>
          <div className="text-ink-faint mb-1">Output ({outputLines.length} lines)</div>
          {outputLines.map((line, i) => {
            const isDiff = line !== inputLines[i];
            return (
              <div
                key={i}
                className={cn(
                  "px-1",
                  isDiff && "bg-[var(--rmd-success)]/20 text-[var(--rmd-success)]"
                )}
              >
                <span className="text-ink-faint mr-2">{i + 1}</span>
                {line || ' '}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
