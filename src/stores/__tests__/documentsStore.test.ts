import { describe, expect, it, beforeEach } from 'vitest';
import { useDocumentsStore, documentText } from '../documentsStore';

/**
 * Regression tests for the source-view data-loss bug.
 *
 * Reported symptom: editing a table, then backspacing in source view deleted
 * lines about ten rows further up the file, and autosave wrote the damage to
 * disk. The cause was that the document could not survive a round trip —
 * rebuilding it from the parsed frontmatter object rewrote the header, so the
 * text handed back to the controlled textarea no longer matched what the user
 * had typed, and the cursor was then pointing at a stale offset.
 *
 * These tests exercise the store the way the editor does: one call per
 * keystroke, checking that nothing changes except what was typed.
 */

function reset(): void {
  useDocumentsStore.setState({ documents: [], activeId: null, isRestoring: false });
}

const store = () => useDocumentsStore.getState();

function docById(id: string) {
  const found = store().documents.find((d) => d.id === id);
  if (!found) throw new Error('document missing');
  return found;
}

beforeEach(reset);

describe('document text is preserved exactly', () => {
  const documents: [name: string, source: string][] = [
    ['plain markdown', '# Title\n\nBody\n'],
    ['a table', '# T\n\n| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n'],
    ['frontmatter with a comment', '---\n# keep me\ntitle: Doc\n---\n\nBody\n'],
    ['frontmatter with quotes', '---\ntitle: "Quoted"\ntags:\n  - one\n---\n\nBody\n'],
    ['frontmatter closed by a single newline', '---\ntitle: Doc\n---\nBody\n'],
  ];

  it.each(documents)('opening %s and reading it back is lossless', (_name, source) => {
    const id = store().newDocument(source, 'test.md');
    expect(documentText(docById(id))).toBe(source);
  });

  it.each(documents)('a single source edit to %s changes only that edit', (_name, source) => {
    const id = store().newDocument(source, 'test.md');
    const edited = source + 'X';

    store().replaceDocumentText(id, edited);

    expect(documentText(docById(id))).toBe(edited);
  });

  it('typing character by character never rewrites earlier text', () => {
    // The failing scenario: a document whose header does not survive being
    // rebuilt, edited one keystroke at a time.
    const original = '---\n# a comment\ntitle: "Doc"\n---\nBody\n';
    const id = store().newDocument(original, 'test.md');

    let text = original;
    for (const character of ' appended') {
      text += character;
      store().replaceDocumentText(id, text);

      // After every keystroke the stored document must equal exactly what was
      // typed. If this drifts, the textarea gets a different string than the
      // user's, the caret desyncs, and the next backspace lands elsewhere.
      expect(documentText(docById(id))).toBe(text);
    }
  });

  it('deleting from the middle removes only the deleted span', () => {
    const source = '---\ntitle: Doc\n---\n\nline one\nline two\nline three\n';
    const id = store().newDocument(source, 'test.md');

    const withoutMiddle = source.replace('line two\n', '');
    store().replaceDocumentText(id, withoutMiddle);

    const result = documentText(docById(id));
    expect(result).toBe(withoutMiddle);
    expect(result).toContain('line one');
    expect(result).toContain('line three');
    // The header is untouched, comments and all.
    expect(result.startsWith('---\ntitle: Doc\n---\n')).toBe(true);
  });
});

describe('undo', () => {
  it('recovers text destroyed by a bad edit', () => {
    const original = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
    const id = store().newDocument(original, 'test.md');

    // The accident: most of the document gone.
    store().replaceDocumentText(id, 'line 0');
    expect(documentText(docById(id))).toBe('line 0');

    expect(store().undo(id)).toBe(true);
    expect(documentText(docById(id))).toBe(original);
  });

  it('is available after an edit made in source view', () => {
    const id = store().newDocument('start\n', 'test.md');
    store().replaceDocumentText(id, 'start\nmore\n');

    expect(store().undo(id)).toBe(true);
    expect(documentText(docById(id))).toBe('start\n');
  });

  it('redoes what it undid', () => {
    const id = store().newDocument('v0', 'test.md');
    store().replaceDocumentText(id, 'v1');

    store().undo(id);
    expect(documentText(docById(id))).toBe('v0');

    expect(store().redo(id)).toBe(true);
    expect(documentText(docById(id))).toBe('v1');
  });

  it('reports false rather than throwing at the start of history', () => {
    const id = store().newDocument('only', 'test.md');
    expect(store().undo(id)).toBe(false);
    expect(store().redo(id)).toBe(false);
  });

  it('bumps the revision so the panes adopt the restored text', () => {
    const id = store().newDocument('v0', 'test.md');
    const before = docById(id).revision;

    store().replaceDocumentText(id, 'v1');
    store().undo(id);

    expect(docById(id).revision).toBeGreaterThan(before);
  });

  it('restores frontmatter exactly, comments included', () => {
    const original = '---\n# important comment\ntitle: "Doc"\n---\n\nBody\n';
    const id = store().newDocument(original, 'test.md');

    store().replaceDocumentText(id, 'wiped');
    store().undo(id);

    expect(documentText(docById(id))).toBe(original);
  });
});

describe('dirty state', () => {
  it('an opened document is not dirty until edited', () => {
    const id = store().newDocument('', 'test.md');
    expect(docById(id).isDirty).toBe(false);
  });

  it('an edit marks it dirty', () => {
    const id = store().newDocument('', 'test.md');
    store().replaceDocumentText(id, 'typed');
    expect(docById(id).isDirty).toBe(true);
  });
});
