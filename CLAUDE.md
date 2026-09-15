# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build locally
- `npm run deploy` — build and publish `dist/` to GitHub Pages via `gh-pages` (runs the build first via `predeploy`)

There is no test suite or linter configured in this project.

## Architecture

Single-page React 19 + Vite site. There is no router — it's one long scrolling page assembled in [src/App.jsx](src/App.jsx) from section components, navigated via anchor-link clicks (`#hero`, `#about`, `#tools`, `#gallery`, `#projects`, `#contact`) that scroll via [src/lib/scroll.js](src/lib/scroll.js) rather than raw `scrollIntoView`.

The app is JSX, not TSX. `tsconfig.json` exists only to support editor tooling (`vite/client` types) — there's no `tsc` build step or type checking in the pipeline.

### Content is data-driven from one file

All personal/site content — name, bio, contact details, skills ticker, tools list, projects, stats, gallery/certifications — lives in [src/data/personalDetails.js](src/data/personalDetails.js) as six exports: `personal`, `ticker`, `tools`, `projects`, `stats`, `gallery`. Components read from here rather than hardcoding copy; update this file to change site content instead of editing components. Placeholder values (email, phone, location, GitHub/LinkedIn URLs, example projects, certification entries) are marked with `TODO` comments and still need real content. `resumeLink` is defined but not yet wired into any component. Each `gallery` item's `image` is `null` by default (renders an icon placeholder in [Gallery.jsx](src/components/Gallery/Gallery.jsx)); set it to an imported image path to show a real certificate/photo instead.

### Smooth scroll (Lenis)

[src/lib/scroll.js](src/lib/scroll.js) initializes a singleton [Lenis](https://github.com/darkroomengineering/lenis) instance (called once from `App.jsx`) that drives inertia-smoothed scrolling for the whole page. Anchor-nav components call its exported `scrollToSection(id)` instead of `element.scrollIntoView(...)` directly — use the same helper for any new nav link so scrolling stays consistent. `src/index.css` disables native CSS `scroll-behavior: smooth` on `html.lenis` so it doesn't fight Lenis's JS-driven scroll.

### Contact form is UI-only

[src/components/Contact/Contact.jsx](src/components/Contact/Contact.jsx) has a client-validated form (name/email/message) but no backend wired up — submitting just flips local state to a success message (see the `TODO` in `handleSubmit`). This is a static site with no server, so real submission needs a third-party form endpoint (e.g. Formspree, EmailJS) wired into that handler.

### Component structure

Each section under `src/components/<Name>/` pairs a `<Name>.jsx` with a co-located `<Name>.module.css` (CSS Modules — the only global classes are the utilities defined in [src/index.css](src/index.css): `.container`, `.section-tag`, `.accent-btn`). Design tokens (colors, fonts) are CSS custom properties on `:root` in `src/index.css`.

### Tools icons — avoid wildcard react-icons imports

[src/components/Tools/Tools.jsx](src/components/Tools/Tools.jsx) maps each `tools[].iconKey` (e.g. `"SiReact"`) to a `react-icons` component through a local `ICONS` lookup object. When adding a tool with a new icon, import it by name from `react-icons/si` and add it to both the import list and the `ICONS` map — do **not** `import * as SiIcons from 'react-icons/si'` and index into it dynamically. That pattern defeats tree-shaking (the wildcard pulls in every icon in the set) and previously bloated the production JS bundle to over 5MB (2MB gzipped) instead of the current ~340KB (109KB gzipped).

### Custom cursor

[src/components/Cursor/Cursor.jsx](src/components/Cursor/Cursor.jsx) renders a custom animated cursor (dot + lagging ring); `src/index.css` globally sets `cursor: none !important` to support it. It self-disables on touch devices.

### Deployment

`vite.config.js` sets `base: '/portfolio/'` and `package.json`'s `homepage` field targets GitHub Pages — both currently point at placeholder values (`yourusername`) and need to be updated to the real GitHub username/repo before `npm run deploy` will publish to the correct path.
