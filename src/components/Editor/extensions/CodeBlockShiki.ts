import { CodeBlock } from '@tiptap/extension-code-block';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CodeBlockComponent } from '../CodeBlockComponent';

/**
 * Custom CodeBlock extension with Shiki syntax highlighting
 * 
 * Uses a NodeView component to render code blocks with:
 * - Shiki-powered syntax highlighting
 * - Copy to clipboard button
 * - Language selector dropdown
 * - Theme-aware colors
 */
export interface CodeBlockShikiOptions {
  /** Whether the editor is in dark mode */
  isDark?: boolean;
  /** HTML attributes for the code block */
  HTMLAttributes?: Record<string, unknown>;
}

export const CodeBlockShiki = CodeBlock.extend<CodeBlockShikiOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      isDark: true,
      HTMLAttributes: {
        class: 'code-block',
      },
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockComponent);
  },
});
