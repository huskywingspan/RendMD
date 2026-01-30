import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { Frontmatter, ParsedDocument } from '@/types';

/**
 * Frontmatter delimiter regex
 * Matches YAML frontmatter between --- delimiters at the start of a document
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/**
 * Parse a markdown document, extracting frontmatter if present
 */
export function parseFrontmatter(markdown: string): ParsedDocument {
  const match = markdown.match(FRONTMATTER_REGEX);
  
  if (!match) {
    return {
      frontmatter: null,
      content: markdown,
      raw: markdown,
    };
  }
  
  const yamlContent = match[1];
  const contentStart = match[0].length;
  const content = markdown.slice(contentStart);
  
  try {
    const frontmatter = parseYaml(yamlContent) as Frontmatter;
    return {
      frontmatter,
      content,
      raw: markdown,
    };
  } catch (error) {
    console.warn('Failed to parse frontmatter YAML:', error);
    return {
      frontmatter: null,
      content: markdown,
      raw: markdown,
    };
  }
}

/**
 * Serialize frontmatter and content back to a full markdown document
 */
export function serializeFrontmatter(frontmatter: Frontmatter | null, content: string): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }
  
  const yamlContent = stringifyYaml(frontmatter, {
    indent: 2,
    lineWidth: 0, // Don't wrap lines
  }).trim();
  
  return `---\n${yamlContent}\n---\n\n${content}`;
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
