# Security review

**Date:** 31 July 2026 · **Version:** v2 (`d422fc9` + this change) · **Scope:** the deployed application at rendmd.pages.dev

Conducted before wider distribution. The question asked was specific: **can a user's files or filesystem leak to the internet?**

Short answer: **no**, and not because the code is careful — because there is no mechanism. The findings below are evidence, not assurance.

---

## Threat model

RendMD is unusual for a web app in that it combines two things that are individually fine and jointly interesting:

1. It holds a granted `FileSystemDirectoryHandle` over a folder of the user's notes, and writable handles to individual files.
2. It opens documents the user did not write — AI transcripts, files from repositories, downloads.

So the attack that matters is: **a hostile `.md` file achieves script execution, then uses the already-granted directory handle to read the workspace and send it somewhere.** Everything else is secondary. XSS here is not a defaced paragraph; it is filesystem exfiltration.

Two defences have to hold: documents must not be able to execute, and even if they could, there must be no route off the machine.

---

## Findings

### 1. No network code exists — verified

A search of `src/` for every browser transmission primitive returns nothing:

```
fetch(  XMLHttpRequest  WebSocket  sendBeacon  EventSource
new Image()  .submit()  axios  import('https://...)
```

Zero matches outside tests. The application has no capability to transmit anything, to any destination, ever.

The production bundle contains five external URLs, all inert:

| Reference | What it is |
|---|---|
| `http://www.w3.org/…` (27×) | SVG and MathML namespace identifiers. Namespaces are never fetched. |
| `https://example.com` | Placeholder text in the image dialog. |
| `https://react.dev`, `https://prosemirror.net` | Links inside library error messages. |
| `https://bit.ly/wb-precache` | A URL inside a Workbox `console.warn` string. |

No fonts, scripts, styles or analytics load from a third party. Fonts are self-hosted; there is no telemetry of any kind.

**Result: pass.** Exfiltration has no code path.

### 2. Documents cannot execute — verified by test

Asserted in `src/test/sanitization.test.ts`, which runs hostile markdown through the real editor pipeline and inspects the resulting DOM. Thirteen cases, all passing in CI:

| Attack | Outcome |
|---|---|
| `<script>alert(1)</script>` | Rendered as text. No script element. |
| `<img src=x onerror=…>` | Rendered as text. No element, no handler attribute. |
| `<div onmouseover=…>` | Rendered as text. |
| `<iframe>`, `<object>`, `<embed>`, `<form>`, `<input>` | None produced. |
| `[x](javascript:alert(1))` | Scheme neutralised. |
| `[x](JaVaScRiPt:alert(1))` | Neutralised — case is normalised. |
| `[x](java⇥script:alert(1))` | Neutralised — control characters are ignored by browsers when resolving a scheme, so the check ignores them too. |
| `[x](data:text/html;base64,…)` | Neutralised. |
| `[x](vbscript:…)` | Neutralised. |
| Quote-escape out of an image `title` | Contained. Stays inside the attribute value. |
| Markup inside a fenced code block | Text. |

The mechanism is `html: false` on the markdown parser, so raw HTML never becomes markup in the first place. Mermaid runs with `securityLevel: 'strict'`, which strips scripts and handlers from diagram source.

**Result: pass.**

### 3. Content Security Policy — added by this review

RendMD had **no CSP** before this review. That was the one genuine gap: findings 1 and 2 mean nothing malicious can run *today*, but a future dependency compromise or a parser regression would have had an open path to the network.

Added in `public/_headers`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https:; font-src 'self'; connect-src 'self';
worker-src 'self'; manifest-src 'self'; media-src 'self' blob:;
frame-src 'none'; object-src 'none'; frame-ancestors 'none';
form-action 'none'; base-uri 'self'
```

`connect-src 'self'` is the load-bearing directive: `fetch`, `XHR`, `WebSocket` and `sendBeacon` cannot reach any other origin. Combined with `form-action 'none'`, there is no route off the machine even for code that manages to run.

`script-src 'self'` carries no `'unsafe-inline'` and no `'unsafe-eval'`. The theme bootstrap was moved out of `index.html` into `/theme-init.js` specifically so this could stay strict — an inline script would have forced a weaker policy or a brittle build-time hash.

**Verified empirically** rather than assumed: the policy was applied locally and an off-origin `fetch` was attempted from the page console. It was blocked. The app rendered fully, fonts loaded, Mermaid diagrams rendered, syntax highlighting worked, and no CSP violations were reported.

Also added: `Referrer-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, and a `Permissions-Policy` switching off camera, microphone, geolocation and other capabilities RendMD never uses.

**Result: closed.**

### 4. Dependencies

`npm audit --omit=dev` reports **zero** vulnerabilities in code shipped to the browser.

Twelve high-severity advisories exist in the tree, all confined to build tooling: `minimatch`/`brace-expansion` via ESLint, and `ejs` via `workbox-build`'s Rollup plugin. None is bundled; none reaches a user. Worth tracking, not worth blocking a release.

### 5. Permission handling

Nothing is assumed. `queryPermission` checks silently; `ensurePermission` prompts and is only ever called inside a user gesture. Autosave deliberately *skips* documents whose grant has lapsed rather than trying to prompt, because a background prompt is both illegal and alarming.

RendMD cannot widen its own access: a directory handle grants exactly the folder the user chose, and the browser mediates every read and write.

### 6. Storage

Documents, drafts and handles live in IndexedDB; preferences in localStorage. Both are origin-scoped, on-device, and never read by anything that could transmit them. Settings → *Clear stored data* removes all of it.

---

## Accepted risk

**Remote images beacon.** A document containing `![](https://tracker.example/x.png)` will load that image, revealing the reader's IP address and the fact that they opened the document. This is inherent to rendering markdown — GitHub solves it by proxying images through their own servers, which requires a server RendMD does not have.

It cannot expose file contents, only the fact of a view. `img-src` permits `https:` deliberately, because blocking it would break ordinary documents that legitimately reference images.

Anyone who considers this unacceptable for a given document can read it in source view (`Ctrl+3`), which renders nothing.

---

## Conclusion

**Safe to distribute.**

The file-leak concern is structurally addressed rather than defensively patched: there is no network code, documents cannot execute, and the CSP means neither of those has to hold for the user to be safe. Three independent layers, any one of which is sufficient.

The one real gap found — a missing CSP — was closed during this review and verified working.

### Recommendations

1. **Keep `npm audit --omit=dev` clean.** Build-tool advisories can wait; a runtime one cannot.
2. **Re-run `sanitization.test.ts` after any TipTap or Mermaid upgrade.** Those are the parsers, and the sanitisation guarantee is theirs to keep.
3. **Re-check the CSP if a genuinely external resource is ever needed.** Loosening `connect-src` is the one change that would reopen the exfiltration path, and it should never be made casually.
