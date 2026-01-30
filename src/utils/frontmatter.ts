import { parse, stringify } from 'yaml';
import type { Frontmatter, ParsedDocument } from '@/types';

const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---\n?/;

/**
 * Parse a markdown document and extract frontmatter
 */
export function parseDocument(raw: string): ParsedDocument {
  const match = raw.match(FRONTMATTER_REGEX);
  
  if (!match) {
    return {
      frontmatter: null,
      content: raw,
      raw,
    };
  }

  try {
    const frontmatter = parse(match[1]) as Frontmatter;
    const content = raw.slice(match[0].length);
    
    return {
      frontmatter,
      content,
      raw,
    };
  } catch (error) {
    console.warn('Failed to parse frontmatter:', error);
    return {
      frontmatter: null,
      content: raw,
      raw,
    };
  }
}

/**
 * Serialize frontmatter and content back to markdown
 */
export function serializeDocument(frontmatter: Frontmatter | null, content: string): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) {
    return content;
  }

  const yamlString = stringify(frontmatter, { lineWidth: 0 });
  return `---\n${yamlString}---\n\n${content}`;
}
