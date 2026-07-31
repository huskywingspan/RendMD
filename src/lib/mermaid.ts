/**
 * Mermaid diagram rendering.
 *
 * Documents written in AI sessions are full of ```mermaid blocks, and a
 * markdown reader that shows them as source is showing you the least useful
 * view of the thing.
 *
 * Mermaid is ~1 MB, so it is loaded on demand — only once a document actually
 * contains a diagram — and never touches the initial bundle.
 */

let mermaidPromise: Promise<typeof import('mermaid').default> | null = null;
let currentTheme: 'light' | 'dark' | null = null;

/** Diagram ids must be unique per render or Mermaid reuses stale definitions. */
let renderCount = 0;

async function getMermaid(isDark: boolean) {
  const theme = isDark ? 'dark' : 'light';

  mermaidPromise ??= import('mermaid').then((module) => module.default);
  const mermaid = await mermaidPromise;

  // initialize() is idempotent but re-running it is how the theme changes.
  if (currentTheme !== theme) {
    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'neutral',
      // 'loose' would let a diagram inject scripts. Diagrams come from files
      // the user opened, but "the user opened it" is not the same as "the user
      // wrote it" — an AI transcript or a downloaded README is untrusted input.
      securityLevel: 'strict',
      fontFamily: 'var(--rmd-font-sans)',
      themeVariables: {
        fontSize: '14px',
      },
    });
    currentTheme = theme;
  }

  return mermaid;
}

export interface MermaidResult {
  svg: string | null;
  error: string | null;
}

/**
 * Render Mermaid source to an SVG string.
 *
 * Never throws: a diagram that is mid-edit is usually syntactically invalid,
 * and the block should show the error rather than tear down the editor.
 */
export async function renderMermaid(source: string, isDark: boolean): Promise<MermaidResult> {
  const trimmed = source.trim();
  if (!trimmed) return { svg: null, error: null };

  try {
    const mermaid = await getMermaid(isDark);

    // parse() validates without mutating the DOM, so a syntax error is caught
    // before render() has a chance to leave orphaned nodes behind.
    await mermaid.parse(trimmed);

    renderCount += 1;
    const { svg } = await mermaid.render(`rmd-mermaid-${renderCount}`, trimmed);
    return { svg, error: null };
  } catch (error) {
    return {
      svg: null,
      error: error instanceof Error ? error.message : 'Could not render this diagram',
    };
  }
}

/** Drop the cached instance so the next render picks up a new theme. */
export function resetMermaidTheme(): void {
  currentTheme = null;
}
