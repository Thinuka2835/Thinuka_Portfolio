# Thinuka — Portfolio

Personal portfolio of **Thinuka**, project manager, with a private admin panel for managing the site's content.

- **Public site:** a single-page portfolio (hero, about, stats, toolkit, certifications, projects, contact) plus Markdown-based project case studies, articles and pages, in dark and light themes.
- **Admin panel:** edit the profile, home sections, certifications, social links, images and long-form Markdown content. It's served at a configurable, unlinked path and protected by server-side authentication.
- **Integrations:** [Neon](https://neon.tech) (PostgreSQL), [Cloudinary](https://cloudinary.com) (images), [EmailJS](https://www.emailjs.com) (contact form), GitHub (Markdown storage) and [Vercel](https://vercel.com) (hosting).

> **License:** all rights reserved. This repository is public for viewing, but the code, design, photographs and written content may not be reused. See [LICENSE](LICENSE).

---

## Contents

- [Tech stack](#tech-stack)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Database (Neon) and migrations](#database-neon-and-migrations)
- [Administrator setup](#administrator-setup)
- [Markdown content workflow](#markdown-content-workflow)
- [Images (Cloudinary)](#images-cloudinary)
- [Contact form (EmailJS)](#contact-form-emailjs)
- [Deploying to Vercel](#deploying-to-vercel)
- [Security model](#security-model)
- [Accessibility](#accessibility)
- [Checks and tests](#checks-and-tests)
- [Troubleshooting](#troubleshooting)
- [Contributing, conduct and security](#contributing-conduct-and-security)

---

## Tech stack

| Area | Choice |
| --- | --- |
| UI | React 19, React Router, Framer Motion, Lenis (smooth scroll), CSS Modules |
| Build | Vite (two entries: `index.html` public site, `admin.html` admin) |
| API | [Hono](https://hono.dev) app deployed as a single Vercel Function (`api/index.js`) |
| Database | Neon PostgreSQL via `@neondatabase/serverless`, plain parameterized SQL, versioned `.sql` migrations |
| Local DB | PGlite (embedded Postgres) — no account needed for development and tests |
| Markdown | unified / remark / rehype with GitHub-style sanitizing and highlight.js |
| Images | Cloudinary signed uploads (no SDK; API secret stays on the server) |
| Email | `@emailjs/browser` (public key only) + optional Google reCAPTCHA v2 |
| Quality | ESLint, Node's built-in test runner |

## How it works

```
                         ┌─────────────── Vercel ───────────────┐
 Browser ── /           ─┤ static: prerendered HTML + JS bundle  │
         ── /projects/x ─┤   (built from content/*.md + Neon)    │
         ── /<ADMIN_PATH>┤ middleware.js → admin.html (noindex)  │
         ── /api/*      ─┤ api/index.js (Hono) ── Neon (SQL)     │
                         │                     ├─ Cloudinary API │
                         │                     └─ GitHub API ────┼─► commits content/*.md
                         └───────────────────────────────────────┘        │
                                    ▲                                     │
                                    └──── push triggers a new deployment ◄┘
```

- **Structured data** (profile, social links, stats, tools, ticker, certifications, image library, admins, sessions, publishing log) lives in **Neon**. The public site reads it from `GET /api/public/site`. Each deployment also embeds a copy in the HTML, so the first paint is already correct.
- **Long-form content** (project case studies, articles, pages) lives as **Markdown files in `content/`**. At build time only *published* files are rendered to HTML, and every route gets prerendered `<head>` tags (title, description, canonical URL, Open Graph, Twitter).
- **Admin edits to Markdown** are committed to this repository through the GitHub API. The commit triggers a Vercel deployment, and the change is live when that deployment finishes (usually 1–2 minutes).

## Project structure

```
api/index.js            Vercel Function entry (all /api routes)
middleware.js           Vercel Routing Middleware: serves the admin at ADMIN_PATH
server/                 API code (Hono): auth, routes, services, config
  adminRoute.js         admin path rules (shared by middleware + local server)
  auth/                 password hashing, sessions, guards, login throttling
  db/                   database client (Neon / PGlite) + migration runner
  routes/               auth, settings, collections, media, content, status
  services/             Cloudinary signing, content store (GitHub / filesystem), site data
shared/                 code used by browser, server and build (content schema, Markdown, Cloudinary URLs)
db/migrations/          versioned SQL migrations (0001_initial.sql, …)
content/                Markdown: projects/, articles/, pages/
scripts/                migrate, seed, admin CLI
src/                    public site (React)
  admin/                admin app (separate bundle)
  data/personalDetails.js   default content (seed + fallback when no database)
vite/                   build plugins: Markdown/prerender, local API server
tests/                  API, security and unit tests
vercel.json             build settings, API rewrite, security headers (CSP)
```

## Local development

**Requirements:** Node.js 22 or newer, and npm.

```bash
git clone https://github.com/Thinuka2835/Thinuka_Portfolio.git
cd Thinuka_Portfolio
npm install
cp .env.example .env
```

The quickest local setup needs no accounts, because it uses the embedded database. Edit `.env`:

```dotenv
DATABASE_URL=pglite:./.data/pglite
ADMIN_PATH=/studio-local
CONTENT_STORE=fs
```

Then:

```bash
npm run db:migrate                 # create tables
npm run db:seed                    # copy default content into the database
npm run admin -- create --email you@example.com --name "Your Name"   # prompts for a password
npm run dev                        # http://localhost:5173  and  http://localhost:5173/studio-local
```

You can also run with no `DATABASE_URL` at all: the public site then shows the defaults from `src/data/personalDetails.js`, and the admin reports that the database isn't configured.

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with the API mounted at `/api` |
| `npm run build` | Production build to `dist/` (prerendered pages, sitemap, robots.txt) |
| `npm run preview` | Serves `dist/` with the API, admin routing and `vercel.json` headers, like production |
| `npm run lint` | ESLint |
| `npm test` | API, security and unit tests (in-memory Postgres, no network) |
| `npm run check` | lint + test + build |
| `npm run db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `npm run db:seed` | Insert default content into empty tables (idempotent) |
| `npm run admin -- <command>` | Manage administrators (see below) |

> **Windows / Git Bash:** if you `export ADMIN_PATH=/something` in Git Bash, MSYS rewrites it into a Windows path. Put it in `.env` instead (Node reads that file directly), or set `MSYS2_ENV_CONV_EXCL=ADMIN_PATH`.

## Environment variables

Copy [`.env.example`](.env.example) to `.env`; `.env` is git-ignored. **`VITE_*` variables are public:** they are compiled into the browser bundle. Everything else is server-only.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | secret | Neon connection string (or `pglite:…` locally) |
| `PRODUCTION_DATABASE_HOST` | secret, optional | Set in Preview/Development: migrations refuse to run against this host from non-production environments |
| `ADMIN_PATH` | server | Admin URL, e.g. `/studio-k2x9`. Unset means the admin UI is disabled |
| `SESSION_TTL_HOURS` / `SESSION_IDLE_MINUTES` | server | Absolute session lifetime (default 12 h) and inactivity timeout (default 120 min) |
| `APP_ORIGIN` | server, optional | Extra origins allowed to call the admin API (the site's own origin is always allowed) |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` | server | Cloudinary account identifiers |
| `CLOUDINARY_API_SECRET` | **secret** | Signs uploads and deletions. Never expose it |
| `CLOUDINARY_FOLDER` | server | Folder this environment uploads to and may delete from (use a different one per environment) |
| `MEDIA_MAX_BYTES` | server, optional | Upload size limit (default 10 MB) |
| `CONTENT_STORE` | server | `github` (deployments) or `fs` (local only) |
| `GITHUB_CONTENT_TOKEN` | **secret** | Fine-grained token: *Contents: read and write* on this repository only |
| `GITHUB_CONTENT_REPO` | server | `Thinuka2835/Thinuka_Portfolio` |
| `CONTENT_BRANCH` / `CONTENT_PRODUCTION_BRANCH` | server | Branch the admin commits to, and your production branch (both default to `main`) |
| `CONTENT_ALLOW_DRAFTS` | server | Keep `false` while the repository is public (see below) |
| `VERCEL_DEPLOY_HOOK_URL` | **secret** | Enables "Rebuild site" in the admin |
| `SITE_URL` | build | Absolute URL for canonical links, Open Graph and the sitemap (defaults to Vercel's production domain) |
| `VITE_EMAILJS_SERVICE_ID` / `VITE_EMAILJS_TEMPLATE_ID` / `VITE_EMAILJS_PUBLIC_KEY` | **public** | EmailJS identifiers, designed to be public |
| `VITE_RECAPTCHA_SITE_KEY` | **public** | reCAPTCHA v2 *site* key (its secret key goes only into EmailJS) |

## Database (Neon) and migrations

1. Create a Neon project (any region close to your Vercel region). Use the **pooled** connection string as `DATABASE_URL`.
2. Run the migrations and seed the defaults:

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

- **Migrations** are numbered files in `db/migrations/` (`0001_initial.sql`, …). Each is applied once, in order, inside a transaction, and recorded in `schema_migrations`. An advisory lock prevents two deployments migrating at the same time.
- **Never edit an applied migration.** Add a new file. Prefer backward-compatible ("expand, then contract") changes, because Vercel runs migrations at build time (`npm run vercel-build`), before the new code is live.
- **No binary data is stored in the database.** Images live in Cloudinary; the `media` table stores only the public ID, URL, dimensions, size, format and alt text.
- **Schema overview:**
  - Authentication: `admin_users`, `admin_sessions` and `login_attempts`.
  - Site data: `site_settings` (profile JSON), `social_links`, `stats`, `tools`, `ticker_items`, `certifications` and `media`.
  - Publishing log: `content_events` (audit trail).

## Administrator setup

There is **no sign-up page** and no registration endpoint. Administrators are created from the command line by someone who has the database URL:

```bash
npm run admin -- create --email you@example.com --name "Your Name"   # prompts for the password twice
npm run admin -- set-password --email you@example.com                # also signs out existing sessions
npm run admin -- disable --email you@example.com                     # blocks sign-in and ends sessions
npm run admin -- enable --email you@example.com
npm run admin -- revoke-sessions --email you@example.com
npm run admin -- list
```

To create the production admin, run the command locally with `DATABASE_URL` pointing at the production Neon branch (for example, temporarily in your shell). Passwords must be at least 12 characters. For non-interactive use, set `ADMIN_PASSWORD`.

**The admin URL** is `https://<your-domain><ADMIN_PATH>`. Choose a path that isn't easy to guess. It's never linked from the site, it's excluded from the sitemap, and it's served with `noindex`. The built `admin.html` file returns 404 at its own URL. **This is obscurity only**: anyone can find or guess the path. What actually protects the admin is that every `/api/admin/*` request is authenticated and authorized on the server (see [Security model](#security-model)).

## Markdown content workflow

**Sources of truth**

| What | Where | Edited via |
| --- | --- | --- |
| Project case studies, articles, pages | `content/{projects,articles,pages}/<slug>.md` | Admin, Content (or git) |
| Profile, social links, stats, tools, ticker, certifications, image library | Neon | Admin |
| Defaults used before a database exists | `src/data/personalDetails.js` | Code |

**File format**

```markdown
---
title: Platform Migration
slug: platform-migration          # must match the file name
description: One or two sentences for cards, search results and link previews.
date: 2025-03-01                   # required for articles; optional for projects and pages
updated: 2025-04-10                # optional
status: published                  # published | draft
tags:
  - Risk Management
order: 2                           # projects only: position on the home page
link: https://example.com          # projects only: optional external link
cover:                             # optional; set from the media library in the admin
  url: https://res.cloudinary.com/<cloud>/image/upload/v1/portfolio/abc.jpg
  alt: Team planning board
  width: 1600
  height: 900
---

## Overview

Regular **Markdown**, GitHub tables, code blocks with syntax highlighting…
```

**Publishing behavior**

- **Publish** (admin): validates the frontmatter and commits the file to `CONTENT_BRANCH` through the GitHub API as one atomic commit. Renaming the slug moves the file in the same commit. The commit triggers a Vercel deployment, and the page is live when it finishes. The admin shows the commit link.
- **Concurrent edits**: every save includes the version (git blob SHA) the editor loaded. If someone else changed the file in the meantime, the save is rejected (409) instead of overwriting their work.
- **Unpublish**: removes the file in a commit. The page disappears after the next deployment. Its text stays in git history, and a copy stays in the editor's browser storage so it can be republished.
- **Drafts are disabled** (`CONTENT_ALLOW_DRAFTS=false`) because this repository is **public**: a committed draft would be readable on GitHub. Work in progress is autosaved in the editor's browser until it's published. The build also skips any file whose `status` isn't `published`, so a draft committed by hand never appears on the site, but it would still be visible on GitHub. If content moves to a private repository later, set `CONTENT_ALLOW_DRAFTS=true` to enable a draft status in the editor.
- **Rendering and safety**: the same pipeline renders the admin preview and the published pages (`shared/markdown.js`). Raw HTML is passed through an allow-list sanitizer, so scripts, event handlers, iframes, inline styles and `javascript:` URLs are removed. External links open in a new tab with `rel="noopener noreferrer nofollow"`. Cloudinary images get responsive `srcset`s and lazy loading.
- **Editing in git** works too: edit `content/*.md` locally, commit and push. Locally, `CONTENT_STORE=fs` makes the admin write straight to `./content` so you can review the diff before committing. That mode is refused on Vercel, whose filesystem is read-only and temporary.
- **Synchronization**: there's nothing to sync. The admin reads the repository directly (one GitHub GraphQL request), so files edited in git appear in the admin immediately. Neon stores only the publishing log, not copies of the content.

## Images (Cloudinary)

1. Create a Cloudinary account. From **Dashboard → API Keys**, copy the cloud name, API key and API secret into the server variables above.
2. Choose a folder per environment, for example `portfolio` in production and `portfolio-preview` in previews.

**How an upload works:**

1. The admin asks `/api/admin/media/sign` for signed parameters. Only signed-in admins can.
2. The browser uploads the file directly to Cloudinary, with a progress bar.
3. The browser hands Cloudinary's response to `/api/admin/media`.
4. The server **verifies Cloudinary's signature** on that response before saving anything to Neon.

**Validation:**

- Only JPG, PNG, WebP, AVIF and GIF are accepted. This is enforced by the signed `allowed_formats` parameter, so the browser can't change it.
- Files over 10 MB are rejected in the browser, then checked again on the server, which deletes any oversized upload from Cloudinary.

**Replacing an image** keeps the same public ID, so every page that uses it updates automatically.

**Deletion is refused while an image is in use** by a certification (enforced by a database foreign key), the profile photo, or any Markdown file. An environment can also only delete or replace images in **its own** `CLOUDINARY_FOLDER`, so a preview deployment can never destroy production images.

**Delivery** uses `f_auto,q_auto` plus width-based `srcset`s, so each screen gets an appropriately sized, modern-format file.

## Contact form (EmailJS)

The form sends name, email, subject and message with the EmailJS browser SDK. It shows success **only** after EmailJS confirms delivery (HTTP 200). Every failure (network error, misconfiguration, rate limit or CAPTCHA) shows an error with the public email address as a fallback.

**What's public and what's secret**

- The **service ID, template ID and public key** are designed to be public (`VITE_*`).
- Your EmailJS **Private Key** (access token) is a secret. This site doesn't use it, so never put it in a `VITE_` variable.
- The reCAPTCHA **site key** is public. Its **secret key** goes only into the EmailJS dashboard.

**Setup**

1. **Email Services → Add New Service:** connect the mailbox that should receive messages. Copy its **Service ID** to `VITE_EMAILJS_SERVICE_ID`.
2. **Email Templates → Create New Template**, using these variables:
   - **Subject:** `Portfolio: {{subject}}`
   - **Content:** `From {{from_name}} <{{reply_to}}>` on one line, then `{{message}}`, then `Sent from {{page_url}}`
   - **Reply To:** `{{reply_to}}`
   - **To email:** your inbox

   Copy the **Template ID** to `VITE_EMAILJS_TEMPLATE_ID`.
3. **Account → General:** copy the **Public Key** to `VITE_EMAILJS_PUBLIC_KEY`.
4. **Abuse protection** (recommended):
   - **Account → Security:** restrict requests to your domains (allowed origins), for example `https://your-domain.com` and `https://<project>.vercel.app`.
   - **Account → Security:** set a rate limit, for example one request per 10 seconds.
   - **CAPTCHA:** create a reCAPTCHA **v2 "I'm not a robot"** key at <https://www.google.com/recaptcha/admin> for your domains. Put the **site key** in `VITE_RECAPTCHA_SITE_KEY`, and in the template's **Settings**, enable reCAPTCHA V2 verification and paste the **secret key** there. The form then requires the checkbox, and EmailJS verifies the token.
   - The form also has a hidden honeypot field, a minimum fill time, a 30-second resend limit, and the SDK's headless-browser block.
5. Because `VITE_*` values are compiled into the bundle, **redeploy after changing them**.

## Deploying to Vercel

> This repository has **not** been deployed by the setup work. Nobody with access to the Vercel account has linked it yet. Follow these steps, then use the checklist at the end to verify.

### 1. Import the repository

1. Vercel, then **Add New… → Project**, then import `Thinuka2835/Thinuka_Portfolio`. This connects the GitHub integration: every push to `main` deploys to production, and every other branch and pull request gets a preview deployment.
2. The build settings come from [`vercel.json`](vercel.json):
   - **framework:** Vite
   - **build command:** `npm run vercel-build` (migrations, then build)
   - **output directory:** `dist`
   - **routing:** `/api/*` is rewritten to the single function `api/index.js`
   - **middleware:** `middleware.js` serves the admin route
3. Under **Settings → General → Node.js Version**, choose 22.x or newer.

### 2. Database per environment

- **Production:** set `DATABASE_URL` for the **Production** environment only, using your main Neon branch.
- **Preview:** install the [Neon Vercel integration](https://vercel.com/integrations/neon) with *preview branching*. Each preview deployment then gets its own Neon branch (a copy of production) through `DATABASE_URL`, so previews never write to production data. Without the integration, point Preview at a dedicated `preview` Neon branch.
- **Safety net:** in Preview (and Development), set `PRODUCTION_DATABASE_HOST` to your production Neon host. Migrations will refuse to run against it from a non-production environment.

### 3. Environment variables

Add them under **Settings → Environment Variables**, scoped per environment:

| Variable | Production | Preview | Development (`vercel dev` / `.env`) |
| --- | --- | --- | --- |
| `DATABASE_URL` | main Neon branch | Neon preview branch | Neon dev branch or `pglite:…` |
| `ADMIN_PATH` | your secret path | same or different | any |
| `CLOUDINARY_*` | folder `portfolio` | folder `portfolio-preview` | folder `portfolio-dev` |
| `CONTENT_STORE` | `github` | `github` | `fs` |
| `GITHUB_CONTENT_TOKEN`, `GITHUB_CONTENT_REPO` | set | set (optional) | — |
| `CONTENT_BRANCH` | `main` | a non-production branch, e.g. `content-preview` (or leave unset: writes are then refused) | — |
| `VITE_EMAILJS_*`, `VITE_RECAPTCHA_SITE_KEY` | set | set | set |
| `SITE_URL` | `https://your-domain` | — | — |
| `VERCEL_DEPLOY_HOOK_URL` | set (optional) | — | — |

Non-production environments **refuse to commit to the production content branch** unless you explicitly set `ALLOW_PRODUCTION_CONTENT_WRITES=true`. Mark secrets as **Sensitive** in Vercel. Changing a variable takes effect on the next deployment.

### 4. GitHub token for publishing

GitHub, then **Settings → Developer settings → Fine-grained tokens → Generate**:

- **Repository access:** only `Thinuka2835/Thinuka_Portfolio`
- **Permissions:** Contents, Read and write (Metadata, Read is added automatically)

Store it as `GITHUB_CONTENT_TOKEN` (Production, plus Preview if you want previews to publish to a preview branch). Commits are attributed to the token's owner. Set a reminder to rotate the token before it expires.

### 5. First deployment, then create the admin

1. Deploy (push to `main`, or press **Deploy**). The build runs the migrations.
2. Locally, with `DATABASE_URL` set to the production branch: `npm run db:seed`, then `npm run admin -- create --email you@example.com`.
3. Open `https://<project>.vercel.app<ADMIN_PATH>` and sign in.

### 6. Custom domain and HTTPS

- **Settings → Domains → Add.** Create the DNS records Vercel shows (an `A` record for the apex, a `CNAME` for `www`). Vercel issues and renews the HTTPS certificate automatically and redirects HTTP to HTTPS.
- Then:
  - Set `SITE_URL=https://your-domain` and redeploy, so canonical, Open Graph and sitemap URLs use the domain.
  - Add the domain to the EmailJS allowed origins and to the reCAPTCHA key's domains.
- Authentication needs no callback URLs: it's first-party email and password, and cookies are host-only (`__Host-` prefix). If you serve the admin from another origin, add it to `APP_ORIGIN`.

### 7. Rebuild and rollback

- **Rebuild:** profile and section changes appear on the live site within about a minute through the API. Link-preview tags and the embedded first-paint data refresh on the next deployment. Use **Rebuild site** in the admin, which calls a deploy hook (**Settings → Git → Deploy Hooks**, stored in `VERCEL_DEPLOY_HOOK_URL`).
- **Rollback:** in Vercel, open **Deployments**, pick a previous production deployment, and choose **Instant Rollback** (or **Promote to Production**). Database migrations are *not* rolled back, which is why migrations must stay backward-compatible. A bad content change can also be reverted with `git revert` on the content commit.

### Post-deployment checklist

- [ ] `/`, a project page, a random URL (shows the 404 page) and `/sitemap.xml` load over HTTPS
- [ ] Both themes; mobile and desktop layouts
- [ ] `<ADMIN_PATH>` shows the sign-in page, and `/admin.html` returns 404
- [ ] `curl https://your-domain/api/admin/status` returns `401`
- [ ] Sign in, edit a stat, and see it on the public site within a minute
- [ ] Publish a test article, then confirm the commit appears on GitHub, the deployment runs, and the page goes live; then unpublish it
- [ ] Upload an image, set its alt text, use it as a certification image, and confirm deleting it is refused while it's in use
- [ ] Send a message through the contact form, and confirm it arrives in your inbox and Reply-To is the sender's address
- [ ] Share a page URL in a link-preview checker and see the title, description and image

## Security model

- **Authentication**
  - Passwords are hashed with scrypt.
  - Sessions use a random 256-bit token in an `HttpOnly`, `Secure`, `SameSite=Strict`, `__Host-` cookie. Only a SHA-256 hash of the token is stored in the database.
  - Sessions have an absolute lifetime (12 h) and an inactivity timeout (2 h). Logout deletes the session, and an admin can sign out every session.
  - Changing a password signs out the account's other sessions.
- **Authorization**: every `/api/admin/*` route except login and logout passes `requireAdmin`. The admin UI's own checks are only for convenience.
- **Login throttling**: 5 failures per account and 20 per IP within 15 minutes return `429`. The error message is the same whether the email or the password was wrong.
- **CSRF**: state-changing requests must come from the site's own origin (or `APP_ORIGIN`) and be JSON. This works together with `SameSite=Strict` cookies.
- **Input validation**: every write is validated with zod, and every SQL value is a bound parameter.
- **Headers** (`vercel.json`):
  - A strict Content-Security-Policy. The only inline script, the theme loader, is allowed by its hash.
  - `X-Frame-Options: DENY`, `nosniff`, a referrer policy and a permissions policy.
  - The admin and API responses also send `noindex` and `no-store`.
- **Secrets**: they live only in server environment variables. `.env*` files are git-ignored, and `VITE_*` values are public by design.

## Accessibility

See [ACCESSIBILITY.md](ACCESSIBILITY.md) for existing accessibility support, guidance for writing accessible Markdown, manual review checks and how to report accessibility issues.

## Checks and tests

```bash
npm run check   # eslint . && node --test "tests/*.test.js" && vite build
```

The tests run against in-memory Postgres (PGlite), with no network or accounts. They cover:

- Every admin endpoint rejects unauthenticated requests, and no registration endpoint exists.
- Login: one generic error message, cookie flags, only token hashes stored, rate limiting, and CSRF / origin / content-type checks.
- Sessions: absolute expiry, idle expiry, disabled admins, and password changes signing out other sessions.
- Content: Markdown persistence (create, update, rename, unpublish), stale-SHA conflicts, refusing drafts, refusing filesystem writes on Vercel, and the GitHub store's atomic commit and conflict detection.
- The build never includes drafts.
- Media: Cloudinary signature compatibility, rejecting forged, oversized or out-of-folder uploads, protecting in-use images, the per-environment folder guard, and keeping the record when Cloudinary deletion fails.
- Social URL validation, Markdown sanitizing, and that the CSP hash matches the inline script.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| Admin path shows the 404 page | `ADMIN_PATH` is unset or invalid: one segment, 3–64 characters of letters, numbers, `-` or `_`, and not `/api`, `/assets`, `/projects` or `/articles` |
| "Database is not configured" | Set `DATABASE_URL` for that environment, then run `npm run db:migrate` |
| "Editing is read-only here" | The content store isn't writable; the message says why (missing token, `fs` on Vercel, or a preview targeting the production branch) |
| "Image uploads are not configured" | Set the three `CLOUDINARY_*` credentials |
| Contact form says it isn't connected | Set the `VITE_EMAILJS_*` variables and **redeploy** (they're compiled in) |
| Published but not live yet | Wait for the Vercel deployment that the commit triggered, under **Deployments** |
| Browser blocks a new third-party script or image host | Add it to the Content-Security-Policy in `vercel.json` |
| `npm test` fails on the CSP check | You changed `vite/theme-init.js`; copy the hash printed by the test into `vercel.json` |

## Contributing, conduct and security

- [CONTRIBUTING.md](CONTRIBUTING.md): workflow, conventions and checks
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md): community expectations and how to report problems
- [SECURITY.md](SECURITY.md): how to report a vulnerability privately
