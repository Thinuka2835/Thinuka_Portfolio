## Summary

<!-- What does this change and why? Link the issue it resolves, e.g. "Closes #12". -->

## Type of change

- [ ] Bug fix
- [ ] New feature or improvement
- [ ] Accessibility / UI polish
- [ ] Security hardening
- [ ] Documentation
- [ ] Refactor, tooling or dependencies
- [ ] Database migration (new file in `db/migrations/`)

## How was it tested?

<!-- Describe what you ran and checked. Include the Vercel preview URL if there is one. -->

- [ ] `npm run check` passes (lint, tests, build)
- [ ] Dark theme and light theme
- [ ] Mobile (~390px) and desktop widths, no horizontal scrolling
- [ ] Keyboard only (Tab / Shift+Tab / Enter / Escape) for any UI change
- [ ] Admin flows affected by this change (sign-in, content, media, settings)

## Screenshots

<!-- Before / after for visual changes. Don't include the admin URL or personal data. -->

## Checklist

- [ ] No secrets, tokens, `.env` files or personal data in the diff
- [ ] New server routes validate input and sit behind `requireAdmin` (if admin-only)
- [ ] Migrations are new files and backward-compatible
- [ ] README / `.env.example` updated if configuration or behavior changed
- [ ] I agree my contribution may be used under this repository's terms (see CONTRIBUTING.md)
