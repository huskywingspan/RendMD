import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  joinDocument,
  serializeFrontmatter,
  updateFrontmatterField,
  parseTags,
  formatTags,
  COMMON_FRONTMATTER_FIELDS,
} from '../frontmatterParser';

describe('parseFrontmatter', () => {
  it('parses valid frontmatter with content', () => {
    const input = '---\ntitle: Hello\nauthor: Test\n---\n\nBody content';
    const result = parseFrontmatter(input);

    expect(result.frontmatter).toEqual({ title: 'Hello', author: 'Test' });
    expect(result.content).toBe('\nBody content');
    expect(result.raw).toBe(input);
  });

  it('parses empty frontmatter block', () => {
    const input = '---\n\n---\nContent after';
    const result = parseFrontmatter(input);

    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe('Content after');
  });

  it('returns null frontmatter when no delimiters present', () => {
    const input = 'Just plain markdown\n\n# Heading';
    const result = parseFrontmatter(input);

    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe(input);
    expect(result.raw).toBe(input);
  });

  it('handles invalid YAML gracefully', () => {
    const input = '---\n: [invalid yaml\n---\nContent';
    const result = parseFrontmatter(input);

    // Should fall back gracefully — returns null frontmatter and full original as content
    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe(input);
  });

  it('parses frontmatter with nested objects', () => {
    const input = '---\nmeta:\n  key: value\n  nested: true\n---\nContent';
    const result = parseFrontmatter(input);

    expect(result.frontmatter).toEqual({
      meta: { key: 'value', nested: true },
    });
    expect(result.content).toBe('Content');
  });

  it('parses frontmatter with arrays', () => {
    const input = '---\ntags:\n  - one\n  - two\n  - three\n---\nContent';
    const result = parseFrontmatter(input);

    expect(result.frontmatter).toEqual({ tags: ['one', 'two', 'three'] });
  });

  it('handles special characters in values', () => {
    const input = '---\ntitle: "Hello: World"\nauthor: "O\'Brien"\n---\nContent';
    const result = parseFrontmatter(input);

    expect(result.frontmatter?.title).toBe('Hello: World');
    expect(result.frontmatter?.author).toBe("O'Brien");
  });

  it('handles unicode in values', () => {
    const input = '---\ntitle: 日本語テスト\nemoji: 🎉\n---\nContent';
    const result = parseFrontmatter(input);

    expect(result.frontmatter?.title).toBe('日本語テスト');
    expect(result.frontmatter?.emoji).toBe('🎉');
  });

  it('handles Windows CRLF line endings', () => {
    const input = '---\r\ntitle: Test\r\n---\r\nContent';
    const result = parseFrontmatter(input);

    expect(result.frontmatter).toEqual({ title: 'Test' });
  });

  it('handles empty string input', () => {
    const result = parseFrontmatter('');

    expect(result.frontmatter).toBeNull();
    expect(result.content).toBe('');
  });
});

describe('serializeFrontmatter', () => {
  it('serializes frontmatter and content together', () => {
    const result = serializeFrontmatter({ title: 'Hello' }, 'Content');

    expect(result).toContain('---');
    expect(result).toContain('title: Hello');
    expect(result).toContain('Content');
  });

  it('returns just content when frontmatter is null', () => {
    const result = serializeFrontmatter(null, 'Just content');

    expect(result).toBe('Just content');
  });

  it('returns just content when frontmatter is empty object', () => {
    const result = serializeFrontmatter({}, 'Just content');

    expect(result).toBe('Just content');
  });

  it('round-trips with parseFrontmatter', () => {
    const original = { title: 'Test', author: 'Writer' };
    const content = 'Hello world';
    const serialized = serializeFrontmatter(original, content);
    const parsed = parseFrontmatter(serialized);

    expect(parsed.frontmatter).toEqual(original);
    expect(parsed.content.trim()).toBe(content);
  });
});

describe('updateFrontmatterField', () => {
  it('adds a new field to null frontmatter', () => {
    const result = updateFrontmatterField(null, 'title', 'Hello');

    expect(result).toEqual({ title: 'Hello' });
  });

  it('updates an existing field', () => {
    const result = updateFrontmatterField(
      { title: 'Old', author: 'Writer' },
      'title',
      'New'
    );

    expect(result.title).toBe('New');
    expect(result.author).toBe('Writer');
  });

  it('removes field when value is null', () => {
    const result = updateFrontmatterField(
      { title: 'Hello', author: 'Writer' },
      'title',
      null
    );

    expect(result).toEqual({ author: 'Writer' });
    expect('title' in result).toBe(false);
  });

  it('removes field when value is undefined', () => {
    const result = updateFrontmatterField(
      { title: 'Hello' },
      'title',
      undefined
    );

    expect(result).toEqual({});
  });

  it('preserves empty string values', () => {
    const result = updateFrontmatterField(null, 'title', '');

    expect(result).toEqual({ title: '' });
  });
});

describe('parseTags', () => {
  it('parses comma-separated tags', () => {
    expect(parseTags('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('trims whitespace from tags', () => {
    expect(parseTags('  foo ,  bar  , baz ')).toEqual(['foo', 'bar', 'baz']);
  });

  it('filters out empty tags', () => {
    expect(parseTags('a,,b, ,c')).toEqual(['a', 'b', 'c']);
  });

  it('handles single tag', () => {
    expect(parseTags('solo')).toEqual(['solo']);
  });

  it('handles empty string', () => {
    expect(parseTags('')).toEqual([]);
  });
});

describe('formatTags', () => {
  it('formats tags as comma-separated string', () => {
    expect(formatTags(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('handles single tag', () => {
    expect(formatTags(['solo'])).toBe('solo');
  });

  it('returns empty string for undefined', () => {
    expect(formatTags(undefined)).toBe('');
  });

  it('returns empty string for empty array', () => {
    expect(formatTags([])).toBe('');
  });
});

describe('COMMON_FRONTMATTER_FIELDS', () => {
  it('exports expected fields', () => {
    const keys = COMMON_FRONTMATTER_FIELDS.map((f) => f.key);

    expect(keys).toContain('title');
    expect(keys).toContain('author');
    expect(keys).toContain('date');
    expect(keys).toContain('tags');
  });

  it('each field has required properties', () => {
    for (const field of COMMON_FRONTMATTER_FIELDS) {
      expect(field).toHaveProperty('key');
      expect(field).toHaveProperty('label');
      expect(field).toHaveProperty('type');
    }
  });
});

describe('document round-trip identity', () => {
  /**
   * The property that protects users' files.
   *
   * The source editor holds the full document text. If splitting a document
   * and putting it back together is not an identity, then every keystroke
   * rewrites text the user did not touch — and because the editor is a
   * controlled input, the replacement lands under the cursor and the next
   * keypress edits the wrong place.
   *
   * That is not hypothetical: it shipped. Reconstructing the header from the
   * parsed object destroyed YAML comments, stripped quotes, converted CRLF to
   * LF, and inserted a blank line after the closing delimiter. Editing a table
   * in source view deleted lines elsewhere in the file, and autosave then
   * wrote the damage to disk.
   */
  const documents: [name: string, source: string][] = [
    ['no frontmatter', '# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n'],
    ['empty document', ''],
    ['frontmatter, one newline after close', '---\ntitle: Doc\n---\n# Title\n\nBody\n'],
    ['frontmatter, blank line after close', '---\ntitle: Doc\n---\n\nBody\n'],
    ['double-quoted value', '---\ntitle: "Doc"\n---\n\nBody\n'],
    ['single-quoted value', "---\ntitle: 'Doc'\n---\n\nBody\n"],
    ['YAML comment', '---\n# keep me\ntitle: Doc\n---\n\nBody\n'],
    ['CRLF line endings', '---\r\ntitle: Doc\r\n---\r\nBody\r\n'],
    ['list value', '---\ntags:\n  - one\n  - two\n---\n\nBody\n'],
    ['trailing whitespace in body', '# Title\n\nBody with trailing spaces   \n'],
    ['no trailing newline', '# Title\n\nBody'],
    ['body containing a --- rule', '# Title\n\n---\n\nMore\n'],
    ['frontmatter and a --- rule in the body', '---\na: 1\n---\n\nText\n\n---\n\nMore\n'],
    ['malformed YAML', '---\nthis: [is: not: valid\n---\n\nBody\n'],
  ];

  it.each(documents)('splitting and rejoining %s returns it unchanged', (_name, source) => {
    const parsed = parseFrontmatter(source);
    expect(joinDocument(parsed.block, parsed.content)).toBe(source);
  });

  it.each(documents)('block + content covers the whole of %s', (_name, source) => {
    const parsed = parseFrontmatter(source);
    expect(parsed.block + parsed.content).toBe(parsed.raw);
  });

  it('survives being rejoined repeatedly, as typing does', () => {
    const original = '---\n# comment\ntitle: "Quoted"\n---\nBody\n';
    let text = original;

    // Each pass stands in for one keystroke's worth of split-and-rejoin.
    for (let i = 0; i < 25; i += 1) {
      const parsed = parseFrontmatter(text);
      text = joinDocument(parsed.block, parsed.content);
    }

    expect(text).toBe(original);
  });
});
