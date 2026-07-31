# Deployment

RendMD is a static site: `npm run build` produces `dist/`, and any static host can serve it. Production runs on **Cloudflare Pages** at [rendmd.pages.dev](https://rendmd.pages.dev).

---

## What the host needs

Almost nothing, but three things matter:

1. **SPA fallback** — unmatched routes serve `index.html`. Cloudflare Pages does this natively; no `_redirects` file needed.
2. **HTTPS** — the File System Access API and service workers both require a secure context. Everything that makes RendMD useful is off without it.
3. **Don't cache `sw.js` or `index.html` aggressively** — Cloudflare's defaults are already correct here.

## Deploying

### Option A — Git integration (how it runs today)

Cloudflare Pages watches the GitHub repository and builds on push.

| Setting | Value |
|---|---|
| Production branch | `master` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node version | 20 or later |

Push to `master` and production updates. Push any other branch, or open a PR, and Cloudflare builds a preview at `<hash>.rendmd.pages.dev` — useful for looking at a change before it's live.

To confirm or change this: **Cloudflare dashboard → Workers & Pages → rendmd → Settings → Builds & deployments**.

### Option B — Deploy from your machine

Useful for a one-off, or if Git integration is ever disconnected.

```bash
npm run check
npx wrangler pages deploy dist --project-name=rendmd
```

The first run opens a browser to authorise Wrangler. If the token has expired:

```bash
npx wrangler login
```

`wrangler login` needs an interactive terminal — it can't complete in a non-interactive shell.

### Option C — GitHub Actions

`.github/workflows/deploy.yml` builds, lints and tests on every push, and deploys `master` to Cloudflare Pages. It needs two repository secrets:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → Create Token → *Cloudflare Pages — Edit* |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages overview, right-hand sidebar |

Add them under **GitHub repo → Settings → Secrets and variables → Actions**.

Note this runs *alongside* Option A if Git integration is also enabled, which means two builds per push. Pick one: either disable the Cloudflare-side build, or don't add the secrets and let the workflow's deploy step skip itself.

## Before deploying

```bash
npm run check
```

Lint, tests, and a production build. If that passes, the build is deployable.

Worth checking by hand after a significant change, since none of it is covered by tests:

- Open a folder, open a file from the tree, edit it, `Ctrl+S`, and confirm the file changed on disk.
- Reload and confirm tabs come back, and that the workspace offers "Grant access".
- `Ctrl+K` and search for a file by a fragment of its name.
- Toggle light/dark.

## Verifying a deploy

```bash
curl -sI https://rendmd.pages.dev | head -3
curl -s https://rendmd.pages.dev/manifest.webmanifest | head -20
```

Then in the browser: DevTools → Application → Service Workers should show one activated worker, and Manifest should list the icons and the `.md` file handler with no errors.

## Installing it

Installation is what turns on OS file handling, so it's worth doing once on any machine you use RendMD from.

1. Open the site in Chrome or Edge.
2. Click the install icon in the address bar, or take the prompt RendMD offers.
3. Windows will now list RendMD under **Open with** for `.md` files. To make it the default: right-click any `.md` → *Open with* → *Choose another app* → RendMD → *Always*.

Double-clicking a `.md` file then opens it in RendMD, and `Ctrl+S` writes back to that file.

## Custom domain

Cloudflare Pages → your project → **Custom domains** → *Set up a domain*. If the domain is already on Cloudflare, DNS and the certificate are handled automatically; otherwise you'll be given a CNAME to add.

Nothing in the app hardcodes the origin, so no code change is needed.

## Cost

Zero. Cloudflare Pages' free tier has unlimited bandwidth and 500 builds/month, and RendMD has no backend to run.
