import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { Frontmatter, ParsedDocument } from '@/types';

/**
 * Frontmatter delimiter regex
 * Matches YAML frontmatter between --- delimiters at the start of a document
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse a markdown document, extracting frontmatter if present.
 *
 * `block` is the exact source text of the frontmatter, delimiters and trailing
 * newline included. Keeping it is what makes the round-trip lossless: the
 * parsed object is a *view* for the frontmatter panel, and re-serialising it
 * is not — it drops YAML comments, rewrites quoting, and normalises line
 * endings. Reconstructing a document from the object alone silently rewrote
 * the user's file on every keystroke in source view.
 */
export function parseFrontmatter(markdown: string): ParsedDocument {
  const match = markdown.match(FRONTMATTER_REGEX);

  if (!match) {
    return {
      frontmatter: null,
      content: markdown,
      raw: markdown,
      block: '',
    };
  }

  const yamlContent = match[1];
  const block = match[0];
  const content = markdown.slice(block.length);

  try {
    const frontmatter = parseYaml(yamlContent) as Frontmatter;
    return { frontmatter, content, raw: markdown, block };
  } catch (error) {
    // Malformed YAML is left as body text rather than thrown away, so a
    // document with a broken header is still fully recoverable by the user.
    console.warn('Failed to parse frontmatter YAML:', error);
    return {
      frontmatter: null,
      content: markdown,
      raw: markdown,
      block: '',
    };
  }
}

/**
 * Render a frontmatter object back to a `---` block.
 *
 * Lossy by nature — see parseFrontmatter. Only called when the frontmatter
 * panel actually edits a field, at which point rewriting the block is the
 * intended behaviour rather than an accident.
 */
export function renderFrontmatterBlock(frontmatter: Frontmatter | null): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return '';

  const yamlContent = stringifyYaml(frontmatter, {
    indent: 2,
    lineWidth: 0, // Don't wrap lines
  }).trim();

  return `---\n${yamlContent}\n---\n\n`;
}

/**
 * Recombine a document.
 *
 * A plain concatenation, so `join(parse(x).block, parse(x).content) === x` for
 * every input. That identity is asserted in frontmatterParser.test.ts and is
 * the property the source editor depends on.
 */
export function joinDocument(block: string, content: string): string {
  return block + content;
}

/**
 * Serialize frontmatter and content back to a full markdown document.
 *
 * @deprecated Prefer joinDocument with the preserved block. This rebuilds the
 * header from the parsed object and therefore loses comments and formatting.
 * Retained for callers that genuinely intend a rewrite.
 */
export function serializeFrontmatter(frontmatter: Frontmatter | null, content: string): string {
  return renderFrontmatterBlock(frontmatter) + content;
}

/**
 * Update a single field in frontmatter
 * Note: Empty strings are preserved to allow custom fields with placeholder values
 */
export function updateFrontmatterField(
  frontmatter: Frontmatter | null,
  key: string,
  value: unknown
): Frontmatter {
  const current = frontmatter || {};
  
  // Only remove field if value is explicitly undefined or null
  // Empty strings are valid (allows custom fields to exist with no value)
  if (value === undefined || value === null) {
    const { [key]: _removed, ...rest } = current;
    void _removed; // Intentionally unused - we're removing this key
    return rest;
  }
  
  return {
    ...current,
    [key]: value,
  };
}

/**
 * Get a list of common frontmatter fields with their types
 */
export interface FrontmatterFieldDef {
  key: string;
  label: string;
  type: 'text' | 'date' | 'tags' | 'custom';
  placeholder?: string;
}

export const COMMON_FRONTMATTER_FIELDS: FrontmatterFieldDef[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'Document title' },
  { key: 'author', label: 'Author', type: 'text', placeholder: 'Author name' },
  { key: 'date', label: 'Date', type: 'date', placeholder: 'YYYY-MM-DD' },
  { key: 'tags', label: 'Tags', type: 'tags', placeholder: 'tag1, tag2, tag3' },
];

/**
 * Parse tags from a comma-separated string
 */
export function parseTags(value: string): string[] {
  return value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
}

/**
 * Format tags as a comma-separated string
 */
export function formatTags(tags: string[] | undefined): string {
  return tags?.join(', ') || '';
}
