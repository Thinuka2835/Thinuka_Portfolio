# Security Policy

## Supported versions

This is a single, continuously deployed website. Only the code on the `main` branch, which is what's live in production, receives security fixes.

| Version | Supported |
| --- | --- |
| `main` (live site) | ✅ |
| Older commits, forks and preview deployments | ❌ |

## Reporting a vulnerability

**Please don't report security problems in public issues, discussions or pull requests.**

Report privately through GitHub instead:

1. Go to the repository's **Security** tab.
2. Choose **Report a vulnerability** to open a private security advisory that only the maintainer can see.

> **Maintainer action needed:** private vulnerability reporting is currently **turned off** for this repository, so the button above won't appear until it's enabled. Turn it on under **Settings → Code security** (or **Security**) **→ Private vulnerability reporting → Enable**.

If you can't use GitHub's private reporting, contact the maintainer privately through their GitHub profile ([Thinuka2835](https://github.com/Thinuka2835)) and ask for a private channel. Don't include vulnerability details in a public message.

Please include:

- what the problem is and where it is (URL, endpoint or file)
- the steps to reproduce it, or a proof of concept
- the impact you think it has
- whether you'd like to be credited

## What to expect

This is a personal project maintained by one person, so timelines are best-effort:

- **Acknowledgement:** within 7 days.
- **Assessment:** an initial assessment and severity estimate within 14 days.
- **Updates:** at least every 14 days until the issue is resolved.
- **Fix and disclosure:** confirmed issues are fixed on `main` and deployed. With your agreement, the advisory is published afterwards and you're credited.
- **Declined reports:** if a report is declined (for example, out of scope or not reproducible), you'll get an explanation.

## Scope

**In scope:**

- authentication, sessions and authorization of the admin panel and `/api/admin/*`
- injection, cross-site scripting (including through Markdown) and cross-site request forgery
- exposure of secrets, such as server-only environment variables, or of unpublished content
- abuse of the upload, publishing or contact flows

**Out of scope:**

- reports that the admin URL can be discovered (it isn't meant to be secret; authentication protects it)
- missing best-practice headers with no demonstrated impact
- denial-of-service or volume testing
- social engineering
- vulnerabilities in third-party services (Vercel, Neon, Cloudinary, EmailJS, GitHub); report those to the vendor

## Testing guidelines

Please only test against your own local copy (see the README's *Local development* section), not the live site. Never access, modify or delete other people's data. Stop and report as soon as you confirm a problem.
