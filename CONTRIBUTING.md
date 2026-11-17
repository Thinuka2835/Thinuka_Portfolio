# Contributing

Thanks for your interest in improving this portfolio. It's a personal site, so most changes come from the maintainer, but bug reports, accessibility fixes and small improvements are welcome.

> **License note:** this repository is **all rights reserved** (see [LICENSE](LICENSE)). By opening a pull request, you confirm that you have the right to submit the work, and you agree that the maintainer may use, modify and publish your contribution as part of this project.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md). **Report security problems privately**, as described in [SECURITY.md](SECURITY.md), never in a public issue.

## Before you start

- **Bugs:** open an issue with the *Bug report* template. Search existing issues first.
- **Features:** open an issue with the *Feature request* template, and wait for a 👍 before writing a large change.
- **Content:** changes to the text, projects or photos on the site are the owner's decision. Please don't open pull requests for those.

## Development setup

Follow the README's [Local development](README.md#local-development) section. In short:

```bash
npm install
cp .env.example .env          # set DATABASE_URL=pglite:./.data/pglite, ADMIN_PATH, CONTENT_STORE=fs
npm run db:migrate && npm run db:seed
npm run admin -- create --email you@example.com
npm run dev
```

You don't need any real Neon, Cloudinary, EmailJS or GitHub credentials to work on the code. **Never commit `.env` files or any real keys.**

## Workflow

1. Fork the repository, or create a branch if you have access: `fix/short-description` or `feat/short-description`.
2. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org) style:
   - `feat: …`
   - `fix: …`
   - `docs: …`
   - `refactor: …`
   - `test: …`
   - `chore: …`
3. Run the checks (below), and make sure they pass.
4. Open a pull request against `main` and fill in the template. Keep each pull request to one concern.
5. Every pull request gets a Vercel preview deployment once the project is connected to Vercel. Check your change there.

## Checks

```bash
npm run check     # lint + tests + production build
```

- `npm run lint`: ESLint (React Hooks rules included)
- `npm test`: API, security and unit tests (in-memory Postgres, no network)
- `npm run build`: must succeed, because it also validates every published Markdown file

Add or update tests when you change server behavior, especially anything involving authentication, authorization, validation, uploads or content publishing.

## Conventions

- **Language:** JavaScript (ESM) and JSX. There's no TypeScript build step.
- **Styling:** CSS Modules next to each component. Use the design tokens in `src/styles/tokens.css`, and don't hard-code colors. Both themes must stay readable, with WCAG AA contrast.
- **Public content:** content comes from data, never hard-coded:
  - Structured data comes from the database through `useSiteData()`.
  - Long-form content comes from `content/*.md`.
  - Defaults live in `src/data/personalDetails.js`.
- **Server:**
  - Every new admin route goes under the protected `admin` router in `server/app.js`.
  - Validate input with zod (`server/validation.js`).
  - Use `$1` parameters in SQL; never interpolate values.
  - Return errors through the `HttpError` helpers.
- **Database changes:** add a new numbered file in `db/migrations/`. Never edit an applied migration, and keep changes backward-compatible.
- **Icons:** import `react-icons` icons by name. Never use `import * as`, because it defeats tree-shaking.
- **Accessibility:**
  - Use semantic HTML and labelled form controls.
  - Icon-only buttons and links need an `aria-label`.
  - Everything must be usable with a keyboard and have visible focus.
  - Respect `prefers-reduced-motion`.
- **Security:**
  - Never expose secrets through `VITE_*` variables.
  - Never link the admin from public pages.
  - Any new third-party script or image host must be added to the CSP in `vercel.json` on purpose.

## Pull request requirements

- [ ] `npm run check` passes
- [ ] Tested in both the dark and light themes, and at mobile and desktop widths
- [ ] Keyboard navigation and screen-reader labels checked for any UI change
- [ ] No secrets, personal data or `.env` files in the diff
- [ ] Documentation updated (README, `.env.example`) if behavior or configuration changed
