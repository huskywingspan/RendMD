import type { Editor } from '@tiptap/react';

/**
 * Export the editor content as a standalone HTML file.
 * Captures computed theme CSS variables for a self-contained document.
 */
export function exportAsHTML(editor: Editor, fileName: string): void {
  const html = editor.getHTML();
  const themeVars = captureThemeVariables();

  const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(fileName.replace(/\.md$/i, ''))}</title>
  <style>
    :root { ${themeVars} }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: var(--theme-text-primary, #1a1a1a);
      background: var(--theme-bg-primary, #ffffff);
    }
    h1, h2, h3, h4, h5, h6 { margin-top: 1.5em; margin-bottom: 0.5em; line-height: 1.3; }
    h1 { font-size: 2em; border-bottom: 1px solid var(--theme-border-primary, #e5e7eb); padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid var(--theme-border-primary, #e5e7eb); padding-bottom: 0.3em; }
    p { margin: 0.8em 0; }
    a { color: var(--theme-accent-primary, #3b82f6); }
    code { background: var(--theme-bg-tertiary, #f3f4f6); padding: 0.2em 0.4em; border-radius: 0.25em; font-size: 0.9em; }
    pre { background: var(--theme-bg-tertiary, #f3f4f6); padding: 1em; border-radius: 0.5em; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid var(--theme-accent-primary, #3b82f6); margin: 1em 0; padding: 0.5em 1em; color: var(--theme-text-secondary, #6b7280); }
    img { max-width: 100%; height: auto; border-radius: 0.5em; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid var(--theme-border-primary, #e5e7eb); padding: 0.5em 0.75em; text-align: left; }
    th { background: var(--theme-bg-secondary, #f9fafb); font-weight: 600; }
    hr { border: none; border-top: 1px solid var(--theme-border-primary, #e5e7eb); margin: 2em 0; }
    ul, ol { padding-left: 1.5em; }
    li { margin: 0.25em 0; }
    ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.5em; }
  </style>
</head>
<body>
  ${html}
</body>
</html>`;

  downloadFile(fullHTML, fileName.replace(/\.md$/i, '.html'), 'text/html');
}

/**
 * Trigger the browser print dialog for PDF export.
 * The print.css stylesheet handles hiding the UI.
 */
export function exportAsPDF(): void {
  window.print();
}

/**
 * Copy editor content as rich text to the clipboard.
 * Uses the Clipboard API with styled HTML and markdown plain text.
 */
export async function copyAsRichText(editor: Editor): Promise<void> {
  const html = editor.getHTML();

  // Add inline styles for cross-app paste compatibility
  const styledHtml = addInlineStyles(html);

  // Wrap with container styling
  const wrappedHtml = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 800px;">${styledHtml}</div>`;

  // Use markdown as plain text fallback (much better than getText())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = editor.storage as any;
  const markdown: string = storage.markdown?.getMarkdown?.() ?? editor.getText();

  const htmlBlob = new Blob([wrappedHtml], { type: 'text/html' });
  const textBlob = new Blob([markdown], { type: 'text/plain' });

  await navigator.clipboard.write([
    new ClipboardItem({
      'text/html': htmlBlob,
      'text/plain': textBlob,
    }),
  ]);
}

/**
 * Add inline styles to HTML for better cross-app rich text paste.
 * Targets apps like Word, Google Docs, Outlook, Gmail.
 */
function addInlineStyles(html: string): string {
  return html
    .replace(/<h1(?=>| )/g, '<h1 style="font-size: 2em; font-weight: 700; margin: 1em 0 0.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em;"')
    .replace(/<h2(?=>| )/g, '<h2 style="font-size: 1.5em; font-weight: 600; margin: 1em 0 0.5em; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em;"')
    .replace(/<h3(?=>| )/g, '<h3 style="font-size: 1.25em; font-weight: 600; margin: 1em 0 0.5em;"')
    .replace(/<h4(?=>| )/g, '<h4 style="font-size: 1.1em; font-weight: 600; margin: 0.8em 0 0.4em;"')
    .replace(/<h5(?=>| )/g, '<h5 style="font-size: 1em; font-weight: 600; margin: 0.8em 0 0.4em;"')
    .replace(/<h6(?=>| )/g, '<h6 style="font-size: 0.9em; font-weight: 600; margin: 0.8em 0 0.4em;"')
    .replace(/<p>/g, '<p style="margin: 0.8em 0;">')
    .replace(/<blockquote(?=>| )/g, '<blockquote style="border-left: 4px solid #3b82f6; padding-left: 1em; margin: 1em 0; color: #6b7280; font-style: italic;"')
    .replace(/<code(?=>| )/g, '<code style="background: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25em; font-family: Consolas, Monaco, monospace; font-size: 0.9em;"')
    .replace(/<pre(?=>| )/g, '<pre style="background: #f3f4f6; padding: 1em; border-radius: 0.5em; overflow-x: auto; font-family: Consolas, Monaco, monospace; margin: 1em 0;"')
    .replace(/<table(?=>| )/g, '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;"')
    .replace(/<th(?=>| )/g, '<th style="border: 1px solid #e5e7eb; padding: 0.5em 0.75em; background: #f9fafb; font-weight: 600; text-align: left;"')
    .replace(/<td(?=>| )/g, '<td style="border: 1px solid #e5e7eb; padding: 0.5em 0.75em; text-align: left;"')
    .replace(/<hr\s*\/?>/g, '<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 2em 0;">')
    .replace(/<ul(?=>| )/g, '<ul style="padding-left: 1.5em; margin: 0.5em 0;"')
    .replace(/<ol(?=>| )/g, '<ol style="padding-left: 1.5em; margin: 0.5em 0;"')
    .replace(/<li(?=>| )/g, '<li style="margin: 0.25em 0;"')
    .replace(/<a /g, '<a style="color: #3b82f6; text-decoration: underline;" ')
    .replace(/<img /g, '<img style="max-width: 100%; height: auto;" ');
}

/** Capture the current theme's CSS variables from the document root */
function captureThemeVariables(): string {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  const vars: string[] = [];

  // Iterate all stylesheets looking for --theme-* variables
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSStyleRule && rule.selectorText === ':root') {
          for (let i = 0; i < rule.style.length; i++) {
            const prop = rule.style[i];
            if (prop.startsWith('--theme-')) {
              const value = computedStyle.getPropertyValue(prop).trim();
              if (value) {
                vars.push(`${prop}: ${value}`);
              }
            }
          }
        }
      }
    } catch {
      // Cross-origin stylesheets — skip silently
    }
  }

  return vars.join('; ');
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
