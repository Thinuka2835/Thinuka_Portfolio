# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server; the API (`/api/*`) and admin route are mounted by `vite/server-plugin.js`
- `npm run build` — production build to `dist/` (prerendered route HTML, 404.html, sitemap.xml, robots.txt)
- `npm run preview` — serve `dist/` with the API, admin routing and `vercel.json` headers (closest to production)
- `npm run lint` / `npm test` / `npm run check` (lint + test + build)
- `npm run db:migrate`, `npm run db:seed`, `npm run admin -- <create|set-password|disable|enable|revoke-sessions|list> --email …`
- Deployed on Vercel: `npm run vercel-build` = migrations (`--if-configured`) + build. GitHub Pages is no longer used.

The app is JSX, not TSX; `tsconfig.json` exists only for editor tooling. Tests use Node's runner with in-memory PGlite (`tests/helpers.js` sets env and calls the Hono app via `app.request`) — no network or accounts needed. For local runs without Neon use `DATABASE_URL=pglite:./.data/pglite`. PGlite is single-process: don't run a build while a preview/dev server holds the same PGlite directory (it hangs).

## Architecture

- **Public site** (`index.html` → `src/main.jsx`): React 19 + React Router. Home page is section components; `/projects/:slug`, `/articles[/:slug]`, `/:slug` render Markdown entries.
- **Admin** (`admin.html` → `src/admin/`): separate bundle, served only at `ADMIN_PATH` by `middleware.js` (Vercel) / `vite/server-plugin.js` (local); `/admin.html` itself 404s. Route rules live in `server/adminRoute.js`. The admin derives its router basename from the URL — `ADMIN_PATH` is never compiled into code. Never link the admin from public UI or the sitemap.
- **API** (`server/app.js`, Hono, deployed as the single function `api/index.js` via the `/api/(.*)` rewrite): `/api/public/site` plus `/api/admin/*`. Every admin route except `auth/login`/`auth/logout` is behind `requireAdmin`; every non-GET passes `requireSameOrigin` (Origin check + JSON-only). Validate bodies with zod schemas in `server/validation.js`; SQL always uses `$n` params. Throw `HttpError` helpers from `server/errors.js`; `ConfigError` → 503 "not configured" (never fake success when an integration is missing).
- **Data split**: Neon = structured data (profile in `site_settings`, `social_links`, `stats`, `tools`, `ticker_items`, `certifications`, `media`, auth tables, `content_events`). Markdown in `content/{projects,articles,pages}` = long-form content and its source of truth. `src/data/personalDetails.js` = defaults (seed + no-DB fallback, via `shared/siteDefaults.js`).
- **Markdown**: `shared/content.js` (frontmatter schema/parse/serialize) and `shared/markdown.js` (sanitizing render pipeline) are shared by build, server and admin preview. `vite/content-plugin.js` renders only `status: published` files into `virtual:content` and writes per-route `<head>` meta at build. Admin saves go through `server/services/contentStore.js`: `github` (atomic Git Data API commits with blob-SHA conflict checks → triggers a Vercel deploy) or `fs` (local only; refused on Vercel). Drafts are refused while `CONTENT_ALLOW_DRAFTS` is false (the repo is public).
- **Images**: Cloudinary signed direct uploads (`server/services/cloudinary.js`); the server verifies Cloudinary's response signature before storing. Deletion is blocked while an image is used (cert FK, profile hero, any Markdown) and for images outside this environment's `CLOUDINARY_FOLDER`. Use `shared/cloudinary.js` (`cldUrl`/`cldSrcSet`) for delivery.
- **Contact**: EmailJS browser SDK with public `VITE_EMAILJS_*` only (`src/lib/emailjs.js`), optional reCAPTCHA v2. Success is shown only on HTTP 200.
- **Site data on the client**: `src/lib/siteData.jsx` reads the JSON embedded in the HTML at build time, then refreshes from `/api/public/site` (browser `no-cache`; Vercel CDN caches 60s via `CDN-Cache-Control`).

## Styling & UI conventions

- Tokens/themes in `src/styles/tokens.css` (shared with admin). Themes are `html[data-theme=dark|light]`, set before paint by the inline script from `vite/theme-init.js`. **If you change that script, update its sha256 in `vercel.json`'s CSP** (`npm test` prints the expected hash). Use `--accent-text` for accent-coloured text and `--accent-strong` for filled buttons (contrast); `--accent` is decorative only.
- Public components: `<Name>.jsx` + `<Name>.module.css`. Global utilities: `.container`, `.section`, `.section--alt`, `.page`, `.btn` (+ `--primary/--ghost/--danger/--sm`), `.visually-hidden`, `.skip-link`. Import `index.css` before `App` in `main.jsx`.
- Admin styles are global `a-*` classes in `src/admin/admin.css`; generic list CRUD is `src/admin/components/CollectionManager.jsx`. The `Dialog` in `src/admin/ui.jsx` ignores close/cancel events bubbling from nested dialogs — keep that.
- Framer Motion owns `transform` on animated elements — position with the CSS `translate` property instead.
- In-page section links use `useSectionLink()` from `src/lib/scroll.js` (works from any route); scroll offset comes from `.section { scroll-margin-top }`. Modals/menus use `lockScroll()/unlockScroll()`.
- Tool icons: keys in `shared/toolIcons.js` must be imported **by name** in `src/components/Tools/Tools.jsx` (a test enforces it). Never `import * as` from react-icons.
- The custom cursor only enables on `(hover: hover) and (pointer: fine)` and adds `html.has-custom-cursor`.

## Adding things

- New DB change → new `db/migrations/NNNN_name.sql` (never edit applied ones; keep backward-compatible since migrations run at build).
- New admin collection → add to `collections` in `server/validation.js` (+ migration) and a `CollectionManager` page.
- New external script/image/API host → add it to the CSP in `vercel.json`.
- New env var → `.env.example` and the README table; only `VITE_*` reaches the browser.
