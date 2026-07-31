/**
 * Fuzzy matching for the command palette.
 *
 * Small enough to own outright — a dependency here would be a few kilobytes to
 * do something in fifty lines, and owning it means the scoring can be tuned to
 * file paths, which is what the palette mostly searches.
 *
 * Subsequence matching with positional bonuses, in the spirit of Sublime and
 * VS Code: every query character must appear in order, and matches score
 * higher when they land on word boundaries, run consecutively, or fall in the
 * file name rather than its directory.
 */

export interface FuzzyResult {
  score: number;
  /** Indices of matched characters, for highlighting. */
  matches: number[];
}

const SCORE_MATCH = 16;
const BONUS_CONSECUTIVE = 12;
const BONUS_BOUNDARY = 14;
const BONUS_CAMEL = 10;
const BONUS_EXACT_PREFIX = 20;
const PENALTY_SKIP = -2;
const PENALTY_LEADING = -1;

/**
 * Score `query` against `text`. Returns null when it doesn't match at all.
 *
 * Greedy left-to-right rather than an optimal search: for palette-length
 * strings the difference is imperceptible and this stays linear.
 */
export function fuzzyMatch(query: string, text: string): FuzzyResult | null {
  if (!query) return { score: 0, matches: [] };
  if (query.length > text.length) return null;

  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact substring is the common case for short queries; score it high and
  // skip the character walk.
  const substringAt = lowerText.indexOf(lowerQuery);
  if (substringAt !== -1) {
    const matches = Array.from({ length: query.length }, (_, i) => substringAt + i);
    let score = query.length * (SCORE_MATCH + BONUS_CONSECUTIVE);
    if (substringAt === 0) score += BONUS_EXACT_PREFIX;
    else if (isBoundary(text, substringAt)) score += BONUS_BOUNDARY;
    // Prefer matches in shorter strings, so "readme" ranks README.md above
    // docs/archive/old-readme-notes.md.
    score -= Math.min(text.length - query.length, 40) / 2;
    return { score, matches };
  }

  const matches: number[] = [];
  let score = 0;
  let textIndex = 0;
  let previousMatch = -1;

  for (let queryIndex = 0; queryIndex < lowerQuery.length; queryIndex += 1) {
    const char = lowerQuery[queryIndex];
    const found = lowerText.indexOf(char, textIndex);
    if (found === -1) return null;

    score += SCORE_MATCH;

    if (previousMatch === found - 1) score += BONUS_CONSECUTIVE;
    else if (isBoundary(text, found)) score += BONUS_BOUNDARY;
    else if (isCamelHump(text, found)) score += BONUS_CAMEL;

    // Characters skipped over cost a little, so tighter matches win.
    if (previousMatch !== -1) score += (found - previousMatch - 1) * PENALTY_SKIP;
    else score += found * PENALTY_LEADING;

    matches.push(found);
    previousMatch = found;
    textIndex = found + 1;
  }

  return { score, matches };
}

/**
 * Match against a path, weighting the file name over its directories.
 *
 * Typing "notes" should find `notes.md` before `notes/2024/other.md`.
 */
export function fuzzyMatchPath(query: string, path: string): FuzzyResult | null {
  const slash = path.lastIndexOf('/');
  const fileName = slash === -1 ? path : path.slice(slash + 1);

  const nameResult = fuzzyMatch(query, fileName);
  if (nameResult) {
    return {
      // Offset the highlight indices back into full-path coordinates.
      matches: nameResult.matches.map((index) => index + slash + 1),
      score: nameResult.score + 30,
    };
  }

  return fuzzyMatch(query, path);
}

function isBoundary(text: string, index: number): boolean {
  if (index === 0) return true;
  return /[\s/\\\-_.]/.test(text[index - 1]);
}

function isCamelHump(text: string, index: number): boolean {
  if (index === 0) return false;
  const previous = text[index - 1];
  const current = text[index];
  return previous === previous.toLowerCase() && current === current.toUpperCase();
}

/** Split `text` into matched and unmatched runs for highlighted rendering. */
export function segmentMatches(
  text: string,
  matches: number[],
): { text: string; matched: boolean }[] {
  if (matches.length === 0) return [{ text, matched: false }];

  const set = new Set(matches);
  const segments: { text: string; matched: boolean }[] = [];
  let current = '';
  let currentMatched = set.has(0);

  for (let i = 0; i < text.length; i += 1) {
    const matched = set.has(i);
    if (matched !== currentMatched) {
      if (current) segments.push({ text: current, matched: currentMatched });
      current = '';
      currentMatched = matched;
    }
    current += text[i];
  }

  if (current) segments.push({ text: current, matched: currentMatched });
  return segments;
}
