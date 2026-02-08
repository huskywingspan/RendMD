# Research: RendMD Deployment & Hosting Strategy

> **Date:** 2026-02-08  
> **Status:** Research Complete  
> **Context:** v1.0.1 is stable. User wants to deploy the web app with minimal cost.

---

## The Good News First

**RendMD has zero backend.** It's a pure client-side SPA — React + TypeScript compiled to static HTML/CSS/JS by Vite. There is no server-side computation, no database, no API endpoints, no authentication server. The `dist/` folder is 100% self-contained static files.

This means: **you can host RendMD for literally $0/month on multiple platforms**, with zero server management, zero DevOps, and zero scaling concerns. The browser does all the work.

### Build Output Profile

| Component | Size | Loaded When |
|-----------|------|-------------|
| `index.html` | 0.6 KB | First visit |
| `index.css` | 48 KB | First visit |
| `index.js` (core app) | 371 KB (~113 KB gzip) | First visit |
| `vendor-tiptap.js` | 731 KB (~230 KB gzip) | First visit |
| Shiki language/theme chunks | 8.8 MB total (294 files) | **On demand** — only when a code block uses that language |
| **Total first-load** | **~350 KB gzip** | Fast on any connection |

The Shiki chunks are lazy-loaded. A user editing a normal markdown doc never downloads them. Even if they open code blocks, only the specific language grammars load (typically 5-50 KB each).

---

## Hosting Options Comparison

### Tier 1: Completely Free, Zero Catch

| Platform | Bandwidth | Storage | Custom Domain | SSL | CDN | SPA Routing | Deploy Method |
|----------|-----------|---------|---------------|-----|-----|-------------|---------------|
| **Cloudflare Pages** | **Unlimited** | Unlimited sites | ✅ Free | ✅ Auto | ✅ Global (330+ cities) | ✅ Native | Git push or CLI |
| **GitHub Pages** | 100 GB/mo (soft) | 1 GB repo (soft) | ✅ Free | ✅ Auto | ✅ Fastly CDN | ⚠️ Needs 404.html hack | Git push (Actions) |
| **Vercel** (Hobby) | 100 GB/mo | Unlimited deploys | ✅ Free | ✅ Auto | ✅ Global | ✅ Native | Git push |
| **Netlify** (Free) | ~3 GB/mo (300 credits) | Unlimited deploys | ✅ Free | ✅ Auto | ✅ Global | ✅ Native with `_redirects` |  Git push |

### Tier 2: Low-Cost With More Control

| Platform | Cost | Notes |
|----------|------|-------|
| **Cloudflare R2 + Workers** | ~$0 (free tier covers most) | Object storage + edge compute, for if we ever need an API |
| **AWS S3 + CloudFront** | ~$1-3/mo | More complex setup, granular control |
| **Firebase Hosting** | Free tier generous | Google ecosystem, good for if we add auth later |

---

## Recommendation: Cloudflare Pages

**Cloudflare Pages is the clear winner for RendMD.** Here's why:

### Why Cloudflare Pages

1. **Truly unlimited bandwidth** — No soft limits, no credit system, no metering. Even if RendMD goes viral, you pay $0. (Netlify's 300 credits ≈ 3 GB bandwidth, Vercel's 100 GB is generous but still capped.)

2. **Fastest global CDN** — Cloudflare's network has 330+ edge locations. Files are served from the nearest PoP, typically <50ms TTFB worldwide. Independent benchmarks show it's 50-115% faster than Netlify/Vercel for static assets.

3. **Native SPA routing** — Cloudflare Pages automatically serves `index.html` for any route that doesn't match a file. No `_redirects` file, no `404.html` hack. Just works.

4. **Git-push deploys** — Connect your GitHub repo, set `npm run build` as the build command, `dist` as the output directory. Every push to `main` auto-deploys. Preview URLs for every PR.

5. **Free custom domain + SSL** — Point `rendmd.app` (or whatever domain) to Cloudflare. SSL certificate auto-provisioned and renewed. No config.

6. **No vendor lock-in** — It's static files. If you ever want to move to Vercel/Netlify/self-hosted, just point the build output elsewhere. Zero code changes.

7. **Growth path** — If you later need server-side features (e.g., AI proxy to protect API keys), Cloudflare Workers (edge functions) are on the same platform. Free tier includes 100K requests/day.

### Setup Effort

Literally 5 minutes:
1. Sign up at cloudflare.com (free)
2. Connect GitHub repo
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. (Optional) Add custom domain

### Compared to GitHub Pages

GitHub Pages would also work and has the advantage of being where your repo already lives. However:
- **SPA routing is awkward** — GitHub Pages doesn't support rewrite rules. You need a `404.html` that's a copy of `index.html`, which means users see a 404 status code before the SPA router kicks in. Bad for SEO and browser behavior.
- **100 GB/mo soft bandwidth limit** — Probably fine for now, but Cloudflare's unlimited is just more comfortable.
- **No edge functions** — If you ever need server-side features, you'd need a separate service anyway.
- **Slower CDN** — GitHub Pages uses Fastly, which is good but has fewer PoPs than Cloudflare.

GitHub Pages is a solid Plan B, especially for the simplicity of keeping everything in GitHub.

---

## About the "Python code locally" Question

You mentioned wanting to "run Python code locally for heavier tasks." To clarify:

**RendMD has no Python.** It's 100% TypeScript/React running in the browser. There's nothing to run server-side today. Everything — markdown parsing, rendering, TipTap editing, exports, theme switching — runs in the browser on the user's machine. That's exactly the architecture you want.

If you're thinking about **future AI features** that might need Python:

| Approach | How It Works | Cost |
|----------|-------------|------|
| **Browser-direct API calls** (current plan) | User's browser calls OpenAI/Anthropic/etc directly with their own API key | $0 server cost (user pays their own API fees) |
| **Pyodide (Python in browser)** | CPython compiled to WebAssembly, runs in browser | $0 — but large download (~10 MB), limited library support |
| **Cloudflare Workers AI** | Edge functions call AI models | Free tier: 10K neurons/day; then $0.011/1K neurons |
| **Lightweight API proxy** | Thin Cloudflare Worker that forwards requests to AI providers | $0 on free tier (100K req/day) |

The **browser-direct approach** (BYOK — Bring Your Own Key) is already in the design doc and is the most RendMD-aligned: zero server cost, user controls their costs, complete privacy. No Python needed.

If you later want Pyodide for specific use cases (e.g., running user-provided Python scripts in markdown code blocks, or local LLM inference via WebAssembly), that's doable but is a v2.0+ consideration.

---

## Deployment Pipeline

### Recommended: GitHub Actions → Cloudflare Pages

```
Developer pushes to main
       │
       ▼
GitHub Actions triggered
       │
       ├── npm ci
       ├── npm run lint
       ├── npm run test
       ├── npm run build
       │
       ▼
Cloudflare Pages deploys dist/
       │
       ▼
Live at rendmd.app (or rendmd.pages.dev)
```

**PR workflow:**
- Push to branch → Cloudflare creates preview URL (e.g., `abc123.rendmd.pages.dev`)
- Merge to main → Auto-deploy to production

### GitHub Actions Workflow (for reference)

```yaml
name: Deploy
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - name: Deploy to Cloudflare Pages
        if: github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name=rendmd
```

Alternatively, Cloudflare Pages can connect directly to GitHub and handle the build itself (even simpler — no Actions needed). The Actions approach gives you the lint+test gate before deploy.

---

## Domain Options

| Domain | Approx Annual Cost | Notes |
|--------|-------------------|-------|
| `rendmd.pages.dev` | **Free** | Cloudflare's default subdomain. Works immediately. |
| `rendmd.app` | ~$15/year | Clean, professional. `.app` domains enforce HTTPS. |
| `rendmd.dev` | ~$12/year | Developer-focused TLD. Also enforces HTTPS. |
| `rendmd.io` | ~$30/year | Common for dev tools, but pricier. |
| `rendmd.com` | ~$10/year (if available) | Universal recognition but may be taken. |

**Recommendation:** Start with `rendmd.pages.dev` (free, instant). Register `rendmd.app` or `rendmd.dev` when ready to go public.

---

## Access Control for Development Phase

You mentioned keeping it "sign in only for development." Options:

| Approach | How | Cost |
|----------|-----|------|
| **Cloudflare Access** | Email-based OTP login, allowlist your email(s) | Free for up to 50 users |
| **GitHub OAuth gate** | Small Cloudflare Worker checks GitHub org membership | Free |
| **HTTP Basic Auth** | Cloudflare Worker adds basic auth in front of the site | Free, but clunky UX |
| **Unlisted URL** | Just don't share the `*.pages.dev` URL | Free, no real security |

**Cloudflare Access** is the cleanest — users go to `rendmd.pages.dev`, get a "Enter your email" prompt, receive a one-time code, and they're in. You control the allowlist. When you're ready to go public, just remove the Access policy. Zero code changes to RendMD itself.

---

## Cost Summary

| Item | Monthly Cost | Annual Cost |
|------|-------------|-------------|
| Cloudflare Pages hosting | $0 | $0 |
| Cloudflare CDN + SSL | $0 | $0 |
| GitHub repo (public) | $0 | $0 |
| GitHub Actions CI/CD | $0 (2,000 min/mo free) | $0 |
| Cloudflare Access (dev gate) | $0 (up to 50 users) | $0 |
| Custom domain (optional) | — | ~$12-15 |
| **Total** | **$0** | **$0-15** |

---

## Next Steps

1. **Create a Cloudflare account** (if you don't have one)
2. **Connect the GitHub repo** to Cloudflare Pages
3. **Set build config:** command = `npm run build`, output = `dist`
4. **Test the deployment** at `rendmd.pages.dev`
5. **(Optional)** Set up Cloudflare Access for dev-only access
6. **(Optional)** Register a custom domain when ready to go public

No code changes are needed to RendMD itself. The app is already a static SPA that works from any web server.
