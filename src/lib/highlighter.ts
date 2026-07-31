/**
 * Syntax highlighting.
 *
 * Shiki's default `codeToHtml` entry point reaches the full bundle: every one
 * of its ~300 grammars becomes a lazily-imported chunk, plus a 622 kB
 * Oniguruma WASM binary. That produced an 8.8 MB `dist/assets` directory for a
 * markdown editor.
 *
 * Instead we build a core highlighter with:
 *   - the JavaScript RegExp engine, so no WASM ships at all;
 *   - a curated language list, loaded on demand and cached.
 *
 * Adding a language means adding one line to LANGUAGE_LOADERS. Anything not
 * listed renders as plain text rather than failing.
 */
import { createHighlighterCore, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

export const LIGHT_THEME = 'github-light-default';
export const DARK_THEME = 'github-dark-default';

/**
 * Languages RendMD can highlight. Chosen for the documents this editor
 * actually sees: notes, READMEs, and transcripts of coding sessions.
 */
const LANGUAGE_LOADERS = {
  bash: () => import('@shikijs/langs/bash'),
  c: () => import('@shikijs/langs/c'),
  cpp: () => import('@shikijs/langs/cpp'),
  csharp: () => import('@shikijs/langs/csharp'),
  css: () => import('@shikijs/langs/css'),
  diff: () => import('@shikijs/langs/diff'),
  docker: () => import('@shikijs/langs/docker'),
  go: () => import('@shikijs/langs/go'),
  graphql: () => import('@shikijs/langs/graphql'),
  html: () => import('@shikijs/langs/html'),
  ini: () => import('@shikijs/langs/ini'),
  java: () => import('@shikijs/langs/java'),
  javascript: () => import('@shikijs/langs/javascript'),
  json: () => import('@shikijs/langs/json'),
  jsx: () => import('@shikijs/langs/jsx'),
  kotlin: () => import('@shikijs/langs/kotlin'),
  lua: () => import('@shikijs/langs/lua'),
  markdown: () => import('@shikijs/langs/markdown'),
  php: () => import('@shikijs/langs/php'),
  powershell: () => import('@shikijs/langs/powershell'),
  python: () => import('@shikijs/langs/python'),
  ruby: () => import('@shikijs/langs/ruby'),
  rust: () => import('@shikijs/langs/rust'),
  sql: () => import('@shikijs/langs/sql'),
  swift: () => import('@shikijs/langs/swift'),
  toml: () => import('@shikijs/langs/toml'),
  tsx: () => import('@shikijs/langs/tsx'),
  typescript: () => import('@shikijs/langs/typescript'),
  xml: () => import('@shikijs/langs/xml'),
  yaml: () => import('@shikijs/langs/yaml'),
} as const;

export type SupportedLanguage = keyof typeof LANGUAGE_LOADERS;

/** Common aliases mapped onto their canonical grammar. */
const ALIASES: Record<string, SupportedLanguage> = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  'c++': 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  dockerfile: 'docker',
  golang: 'go',
  htm: 'html',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  md: 'markdown',
  mdown: 'markdown',
  ps1: 'powershell',
  pwsh: 'powershell',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  ts: 'typescript',
  yml: 'yaml',
  conf: 'ini',
  cfg: 'ini',
  svg: 'xml',
  patch: 'diff',
};

/** Language ids offered in the code-block language picker. */
export const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'bash', label: 'Bash' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'css', label: 'CSS' },
  { value: 'diff', label: 'Diff' },
  { value: 'docker', label: 'Dockerfile' },
  { value: 'go', label: 'Go' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'html', label: 'HTML' },
  { value: 'ini', label: 'INI' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'jsx', label: 'JSX' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'lua', label: 'Lua' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'mermaid', label: 'Mermaid' },
  { value: 'php', label: 'PHP' },
  { value: 'powershell', label: 'PowerShell' },
  { value: 'python', label: 'Python' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'swift', label: 'Swift' },
  { value: 'toml', label: 'TOML' },
  { value: 'tsx', label: 'TSX' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'xml', label: 'XML' },
  { value: 'yaml', label: 'YAML' },
];

/**
 * Resolve a fenced-code-block info string to a grammar we actually have.
 * Returns null when there is no match, meaning "render as plain text".
 */
export function resolveLanguage(raw: string | null | undefined): SupportedLanguage | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key in LANGUAGE_LOADERS) return key as SupportedLanguage;
  return ALIASES[key] ?? null;
}

let highlighterPromise: Promise<HighlighterCore> | null = null;
const loadedLanguages = new Set<string>();

/** Create (once) the shared core highlighter with both themes preloaded. */
async function getHighlighter(): Promise<HighlighterCore> {
  highlighterPromise ??= (async () => {
    const [light, dark] = await Promise.all([
      import('@shikijs/themes/github-light-default'),
      import('@shikijs/themes/github-dark-default'),
    ]);
    return createHighlighterCore({
      themes: [light.default, dark.default],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    });
  })();
  return highlighterPromise;
}

/**
 * Highlight `code` and return HTML. Falls back to an escaped plain-text
 * rendering for unknown languages or if anything goes wrong, so a bad info
 * string never blanks out a code block.
 */
export async function highlightCode(
  code: string,
  language: string | null | undefined,
  isDark: boolean,
): Promise<string> {
  const theme = isDark ? DARK_THEME : LIGHT_THEME;
  const lang = resolveLanguage(language);

  try {
    const highlighter = await getHighlighter();

    if (lang && !loadedLanguages.has(lang)) {
      const mod = await LANGUAGE_LOADERS[lang]();
      await highlighter.loadLanguage(mod.default);
      loadedLanguages.add(lang);
    }

    return highlighter.codeToHtml(code, {
      lang: lang ?? 'plaintext',
      theme,
    });
  } catch (error) {
    console.warn('[RendMD] Highlighting failed, falling back to plain text:', error);
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
