/*
 * Applies the saved theme and reading preferences before first paint, so the
 * app never flashes the wrong colours or re-lays-out when settings hydrate.
 *
 * This lives in its own file rather than inline in index.html so the Content
 * Security Policy can be `script-src 'self'` with no 'unsafe-inline'. An
 * inline script would have forced either a weaker policy or a build-time hash
 * that silently breaks the page whenever this is edited.
 *
 * It is loaded synchronously in <head>: render-blocking is the point.
 *
 * Reads the same localStorage key the settings store persists to. Anything
 * missing or malformed falls through to the system preference, which is also
 * the default.
 */
(function () {
  try {
    var raw = localStorage.getItem('rendmd:settings');
    var s = raw ? JSON.parse(raw).state || {} : {};
    var pref = s.theme || 'system';
    var dark =
      pref === 'dark' ||
      (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    var root = document.documentElement;
    root.classList.toggle('theme-dark', dark);
    root.classList.toggle('theme-light', !dark);

    var families = {
      sans: 'var(--rmd-font-sans)',
      serif: 'var(--rmd-font-serif)',
      mono: 'var(--rmd-font-mono)',
    };
    var measures = { narrow: '56ch', normal: '68ch', wide: '82ch', full: 'none' };

    if (s.readingFamily && families[s.readingFamily])
      root.style.setProperty('--reading-family', families[s.readingFamily]);
    if (s.readingSize) root.style.setProperty('--reading-size', s.readingSize + 'px');
    if (s.readingMeasure && measures[s.readingMeasure])
      root.style.setProperty('--reading-measure', measures[s.readingMeasure]);
  } catch (e) {
    /* First run, private mode, or blocked storage — defaults are fine. */
  }
})();
