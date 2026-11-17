# SEO & GEO

How search engines, social networks and AI tools see **https://thinuka-ransidu.me**, and how to keep it that way.

---

## 1. Audit — where the site started

The site is a **Vite 8 + React 19 single-page app** (React Router 8), deployed on **Vercel**, with Markdown content in `content/` and structured data in Neon. Before this work:

| Area | Finding |
| --- | --- |
| Rendering | Every page's HTML body was an empty `<div id="root"></div>`. Google renders JavaScript, but Bing only partly, and AI crawlers (GPTBot, ClaudeBot, PerplexityBot) don't, so they saw no content. |
| Metadata | Per-route `<title>`, description and Open Graph tags already existed. There was no `og:locale`, author, article dates or `robots` directive. |
| Canonicals | Canonical URLs were only output when `SITE_URL` was set; otherwise they were missing. |
| Structured data | Only a minimal `Person` on the home page: no `WebSite`, page, breadcrumb or article types. |
| Files | `sitemap.xml` only when `SITE_URL` was set, with no `lastmod` and no images. `robots.txt` existed. No `favicon.ico`, `apple-touch-icon`, web manifest, `llms.txt` or feed. The Open Graph image was in the old design. |
| Environments | Preview builds produced indexable HTML and `robots.txt`. |
| Headings | Animated headings duplicated their text in the DOM (a hidden copy for screen readers), and the hero put an `<h2>` before the `<h1>`. |
| Internal linking | No breadcrumbs or related links on entry pages. |
| Domain | No production domain configured; no `www` handling. |
| Content | Dummy placeholder data had just been removed, so the site currently has only the home page. Project, article and page routes appear once you publish Markdown. |

There were no broken internal links, redirect chains or duplicate routes to fix. `trailingSlash: false` on Vercel already 308-redirects `/path/` to `/path`.

---

## 2. Architecture

```
npm run build
 ├─ vite build                          client bundle (public site + admin) → dist/
 │    └─ vite/content-plugin.js         published Markdown → virtual:content; embeds site data in index.html
 ├─ vite build --ssr src/entry-server.jsx   server renderer → dist/.ssr (temporary)
 └─ node scripts/prerender.mjs          for every public route:
        • renders the React page to HTML (real content in <body>)
        • writes the route's <head> from shared/seo.js
        • writes 404.html, sitemap.xml, robots.txt, llms.txt, llms-full.txt,
          feed.xml (if articles exist) and site.webmanifest
        • deletes dist/.ssr and fails the build if a secret or ADMIN_PATH leaked
```

**In the browser**, `src/main.jsx` *hydrates* the pre-rendered HTML, so the page is interactive with the same markup. Crawlers and visitors without JavaScript get the complete content; `<noscript>` CSS keeps animated text visible and hides the preloader.

**Single source of truth:** [`shared/seo.js`](shared/seo.js) holds the domain, title templates, descriptions, Open Graph and X tags, JSON-LD, sitemap, robots policy, `llms.txt` content, the feed and the manifest. Every value comes from real data:

- **Profile:** name, title, bio, quote, specialties, public email and location (Neon; defaults in `src/data/personalDetails.js`).
- **Social links, skills, tools, stats and certifications:** Neon.
- **Projects, articles and pages:** published Markdown in `content/`.

> The `<head>` and pre-rendered body are generated **at build time**. Admin edits to the profile appear on the live page within about a minute through the API, but titles, descriptions and link previews update on the **next deployment**. Use **Rebuild site** in the admin (it needs `VERCEL_DEPLOY_HOOK_URL`). Publishing Markdown always triggers a deployment.

---

## 3. Files

| URL | Source | Notes |
| --- | --- | --- |
| `/robots.txt` | generated | Production: allow all, `Disallow: /api/`, sitemap link. Other environments: `Disallow: /` |
| `/sitemap.xml` | generated | Public URLs only, absolute, with `lastmod` and `image:image`. Becomes a sitemap index with `sitemap-N.xml` files above 45,000 URLs |
| `/llms.txt`, `/llms-full.txt` | generated | AI-readable overview and full public content |
| `/feed.xml` | generated | RSS 2.0, **only when articles are published** (linked from every page's `<head>`) |
| `/site.webmanifest` | generated | Name and description from the profile; served as `application/manifest+json` |
| `/404.html` | pre-rendered | Real 404 status on Vercel; `noindex` |
| `/og-image.png` | `public/` | 1200×630 default share image (hero composition) |
| `/favicon.ico`, `/favicon.svg` | `public/` | 16/32 px ICO + scalable SVG |
| `/apple-touch-icon.png` | `public/` | 180×180 |
| `/CNAME` | `public/` | `thinuka-ransidu.me`. Only GitHub Pages reads this file; **Vercel ignores it** and uses the DNS records in §8. It's kept so the domain is recorded if the site is ever served from GitHub Pages |
| `/icon-192.png`, `/icon-512.png`, `/icon-maskable-512.png` | `public/` | Manifest icons |

**Deliberately not created:**

- **`/.well-known/security.txt`:** RFC 9116 requires a working contact. The intended contact is GitHub private vulnerability reporting, which is **currently disabled** (see SECURITY.md). Once it's enabled, add `public/.well-known/security.txt` with the content below. `Expires` must be under a year away, so renew it yearly.

  ```
  Contact: https://github.com/Thinuka2835/Thinuka_Portfolio/security/advisories/new
  Expires: 2027-11-01T00:00:00.000Z
  Policy: https://github.com/Thinuka2835/Thinuka_Portfolio/blob/main/SECURITY.md
  Preferred-Languages: en
  Canonical: https://thinuka-ransidu.me/.well-known/security.txt
  ```

- **`/sitemap-index.xml`:** a single sitemap is correct at this size. The generator switches to an index automatically when needed.

---

## 4. Metadata

Every pre-rendered page gets the following (see `buildHead()`):

- **Title:** a unique `<title>`.
  - Home: `Thinuka — Project Manager`
  - Entries: `{title} | Thinuka`
  - Articles list: `Articles | Thinuka`
  - 404: `Page not found | Thinuka`
- **Description:** a `meta description` from the bio (home) or the frontmatter `description`, clipped at about 160 characters on a word boundary.
- **Canonical:** `<link rel="canonical">` on the apex domain (none on the 404 page).
- **`meta robots`:**
  - Production: `index, follow, max-image-preview:large, max-snippet:-1`
  - 404 and every non-production build: `noindex, nofollow`
- **`meta author`.**
- **Open Graph:**
  - `og:type`: `profile` on home, `article` on articles, `website` otherwise
  - `og:site_name`, `og:locale` (`en_US`), `og:title`, `og:description`, `og:url`
  - `og:image` (absolute), `og:image:width`, `og:image:height`, `og:image:alt`
  - Articles also get `article:published_time`, `article:modified_time`, `article:author` and `article:tag`
- **X / Twitter:** `summary_large_image` with title, description, image and alt. `twitter:site` and `twitter:creator` are added only when an X profile is added under Social links.
- **Share images:** an entry with a `cover` shares that image, cropped to 1200×630 by Cloudinary (`c_fill,g_auto`). Everything else shares `/og-image.png`.
- **Language:** `<html lang="en">`. There's only one language, so no `hreflang`.

**Changing metadata:**

- **Profile text:** edit it in **Admin → Profile & settings**. Name, title and bio drive the titles, descriptions, `Person` data and `llms.txt`. Then press **Rebuild site**.
- **Page text:** edit the Markdown frontmatter (title, description, cover and alt).
- **Templates:** change the wording in `routeMeta()` in `shared/seo.js`.

---

## 5. Sitemap

- **Included:** `/`, `/articles` (when articles exist), and every **published** project, article and page.
- **Excluded:** drafts (never built), the admin, `/api`, the 404 page and duplicate URLs.
- **`lastmod`:** the frontmatter `updated`, or else `date`. The home page has no `lastmod`, because its content lives in the database and a build date would misstate when it changed.
- **Images:** the portrait on the home page, and the cover on entries.
- **Updates:** it regenerates on every deployment, including the ones triggered by publishing.

---

## 6. robots.txt and indexing controls

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://thinuka-ransidu.me/sitemap.xml
```

- **JavaScript, CSS and images are never blocked.**
- **The admin is not listed**, because listing it would advertise its URL. The admin pages are served with `X-Robots-Tag: noindex, nofollow, noarchive` plus a matching `meta robots`. `robots.txt` is not access control: the admin is protected by server-side authentication.
- **Preview and development builds:** `Disallow: /` plus `noindex` on every page. Vercel also sends `X-Robots-Tag: noindex` on preview deployment URLs.
- **AI crawlers:** allowed by default (`AI_CRAWLERS=allow`). Set `AI_CRAWLERS=disallow` to add `Disallow: /` groups for GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, Claude-SearchBot, Claude-User, anthropic-ai, PerplexityBot, Perplexity-User, Google-Extended, Applebot-Extended, CCBot, Bytespider, Meta-ExternalAgent, Amazonbot and cohere-ai. Opting out reduces your visibility in AI answers.

---

## 7. llms.txt, structured data and GEO

**`/llms.txt`** follows the [llmstxt.org](https://llmstxt.org) proposal. It contains:

- the name and a one-line summary
- the bio
- links to the public pages, projects and articles, with descriptions
- public contact details
- a link to `/llms-full.txt`

**`/llms-full.txt`** adds specialties, skills, tools, stats and certifications when they exist, plus the full Markdown of every published entry. Both files are built only from public data, and the build fails if `ADMIN_PATH` or a secret value appears in them. Treat these as an optional discovery aid: they are not a ranking factor, and no AI product guarantees it will use them.

**JSON-LD** is a single `@graph` per page, and only accurate types are used:

| Page | Types |
| --- | --- |
| Home | `Person` (name, job title, bio, portrait, `sameAs` socials, `knowsAbout` skills and tools, `hasCredential` certifications), `WebSite`, `ProfilePage` |
| Project or page | `Person`, `WebSite`, `WebPage`, `BreadcrumbList` |
| Article | the above plus `BlogPosting` (headline, dates, author, publisher, image, keywords) |
| Articles list | `Person`, `WebSite`, `CollectionPage`, `BreadcrumbList` |

The following are not used, because no real data exists for them: `Organization`, `LocalBusiness`, `Product`, `Service`, `FAQPage`, ratings and reviews. Add an FAQ only if you write genuine questions and answers.

**GEO practices in place:**

- the server-rendered content, with one `<h1>` per page and a logical heading order
- a clear description of who you are (the `Person` data, matching the visible bio)
- author and dates on articles
- visible breadcrumbs that mirror `BreadcrumbList`
- "More projects / More articles" internal links
- descriptive alt text from the media library and frontmatter

---

## 8. Domain, DNS and Vercel

**Canonical origin:** `https://thinuka-ransidu.me` (apex). `www.thinuka-ransidu.me` permanently redirects (308) to the apex, through the `redirects` in `vercel.json`, and you should set the same in Vercel too.

1. In Vercel, open **Project → Settings → Domains** and add both `thinuka-ransidu.me` and `www.thinuka-ransidu.me`. Set `thinuka-ransidu.me` as the primary domain and `www` to **Redirect to thinuka-ransidu.me (308)**.
2. Wherever the `.me` domain's DNS is managed (your registrar), create the records **exactly as Vercel's Domains page shows them**. Vercel may show project-specific values; at the time of writing the defaults were:

   | Type | Name | Value |
   | --- | --- | --- |
   | A | `@` (apex) | `76.76.21.21` |
   | CNAME | `www` | `cname.vercel-dns.com` |

   Alternatively, point the domain's nameservers to Vercel (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`), and Vercel manages the records itself.
3. Wait for Vercel to show **Valid Configuration**. It then issues the HTTPS certificate automatically and renews it.
4. Leave `SITE_URL` unset; it defaults to the apex. If you ever change domain, set `SITE_URL` in **Production** and redeploy.
5. **Duplicate hosts:**
   - The production `*.vercel.app` alias serves the same pages, but every page's canonical points to the apex, so search engines consolidate on it.
   - Preview deployments are `noindex` (both our build and Vercel's header).
6. Add `https://thinuka-ransidu.me` to the **EmailJS allowed origins** and the **reCAPTCHA domains**.

---

## 9. Search engines and analytics

**Google Search Console**

1. Add a **Domain property** for `thinuka-ransidu.me` and verify it with the DNS TXT record Google gives you (this covers both `www` and the apex). Alternatively, use a URL-prefix property and put the HTML-tag token in `GOOGLE_SITE_VERIFICATION` (Production), then redeploy.
2. **Sitemaps:** submit `https://thinuka-ransidu.me/sitemap.xml`.
3. **URL inspection:** test `/`, then **Request indexing**. Check the **Pages** report for exclusions.

**Bing Webmaster Tools**

1. Choose **Import from Google Search Console** (the fastest route), or add the site and use `BING_SITE_VERIFICATION` (the `msvalidate.01` content) or the DNS method.
2. Submit the sitemap, then use **URL Inspection** and **Site Explorer** for diagnostics.

**IndexNow is not implemented.** Pings would have to be sent after a deployment is live. Vercel has no post-deploy hook in this setup, and a ping sent during the build would point to pages that aren't served yet. Bing discovers changes through the sitemap. Revisit this if a post-deploy step (for example a GitHub Action on `deployment_status`) is added.

**Analytics**

- **GA4:** optional. Set `VITE_GA_MEASUREMENT_ID` to enable it.
  - It loads without inline scripts (CSP-safe) and tracks client-side page views.
  - It starts in Consent Mode with storage **denied** (cookieless pings). Add a consent banner that calls `grantAnalyticsConsent()` from `src/lib/analytics.js`, or set `VITE_GA_CONSENT_DEFAULT=granted` only where that's lawful.
- **GTM and Vercel Analytics:** not installed. Use one tracking system only, to avoid double counting.

---

## 10. Markdown and SEO

| Your frontmatter key | This project | Used for |
| --- | --- | --- |
| `title` | `title` | `<h1>`, `<title>`, `og:title`, `headline` |
| `description` | `description` | meta description, OG, cards, `llms.txt` |
| `slug` | `slug` (= file name) | URL, canonical |
| `date` | `date` (required for articles) | `datePublished`, `article:published_time`, feed, sitemap `lastmod` |
| `updatedAt` | `updated` | `dateModified`, `lastmod` |
| `author` | `author` (optional; defaults to the profile name) | byline, `author` in JSON-LD |
| `image` | `cover: { url, alt, width, height }` (set from the media library) | share image, `image`, image sitemap |
| `tags` | `tags` | `keywords`, `article:tag`, feed categories |
| `published: true` | `status: published` | Only published files are built |

Example `content/articles/rescue-sprint.md`:

```markdown
---
title: Running a Rescue Sprint
slug: rescue-sprint
description: How I recover a slipping delivery plan in two weeks — triage, re-planning and stakeholder resets.
date: 2026-11-18
status: published
tags:
  - Agile
  - Delivery
cover:
  url: https://res.cloudinary.com/<cloud>/image/upload/v1/portfolio/sprint-board.jpg
  alt: Sprint board with re-prioritised tickets
  width: 1600
  height: 900
---

## Why rescue sprints work
…
```

Body headings should start at `##`, because the page's title is the only `<h1>`. Internal links such as `[migration case study](/projects/platform-migration)` stay on-site, and external links get `rel="noopener noreferrer nofollow"`.

---

## 11. Performance

- **Content and the LCP image:** they are in the initial HTML. The portrait has `fetchpriority="high"`, explicit `width`/`height` and a modern format (WebP, or Cloudinary `f_auto,q_auto`).
- **Images below the fold:** lazy-loaded, with Cloudinary `srcset`s sized to the layout.
- **The giant name:** sized by CSS from its letter count before any JavaScript runs, so the JavaScript fit makes only a tiny correction (low CLS).
- **Code size:** admin code is a separate bundle, and the Markdown editor is lazy-loaded. Framer Motion was removed, and the public JavaScript is about 85 KB, plus about 210 KB of shared React vendor code (gzipped: 29 KB and 66 KB).
- **Caching:** hashed assets are cached for a year as `immutable`. The public API is cached at Vercel's CDN for 60 seconds (`CDN-Cache-Control`).
- **Fonts:** loaded with `display=swap` and preconnects.

---

## 12. Verifying in production

After the first production deployment:

```bash
curl -sI https://www.thinuka-ransidu.me/ | grep -i location   # → https://thinuka-ransidu.me/
curl -s  https://thinuka-ransidu.me/robots.txt
curl -s  https://thinuka-ransidu.me/sitemap.xml
curl -s  https://thinuka-ransidu.me/llms.txt
curl -s  https://thinuka-ransidu.me/ | grep -E '<title>|rel="canonical"|og:image"|ld\+json' | head
curl -s  https://thinuka-ransidu.me/ | grep -c 'Hi Folks'  # ≥1: content is in the HTML
curl -sI https://thinuka-ransidu.me/no-such-page | head -1  # → 404
```

Then:

- [Google Rich Results Test](https://search.google.com/test/rich-results) and the [Schema Markup Validator](https://validator.schema.org/) on `/` and an article.
- Share previews:
  - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
  - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  - an X post preview
  - a WhatsApp, Telegram or Discord message with the link
- Lighthouse (Chrome DevTools) on mobile.

`npm test` covers the generators (titles, canonicals, `robots`, JSON-LD validity, sitemap contents and splitting, `llms.txt`, feed, manifest). `npm run build` fails if pre-rendering or the leak guard fails.

---

## 13. Remaining manual steps

1. **DNS and domain:** in Vercel, add the domains and DNS records (§8).
2. **Search Console and Bing:** verify ownership, then submit the sitemap (§9).
3. **Social links:** add your LinkedIn and X profiles in **Admin → Social links**. They feed `sameAs` and `twitter:site`.
4. **Content:** publish real project case studies and articles, and add stats and certifications. Today only the home page is indexable, which is thin for search.
5. **Analytics (optional):** set `VITE_GA_MEASUREMENT_ID` plus a consent solution.
6. **`security.txt`:** enable GitHub private vulnerability reporting, then add `security.txt` (§3).
7. **Rebuild after profile edits** so titles, descriptions and previews pick up the changes.
