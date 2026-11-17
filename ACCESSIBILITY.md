# Accessibility

Accessibility is part of maintaining this portfolio, including its public pages, Markdown content and private admin panel.

## Existing support

- The public site includes a **Skip to content** link and a main content landmark.
- Navigation and icon-only controls have accessible labels. The mobile menu supports closing with Escape and returning focus to its toggle.
- The contact form associates fields with labels and validation messages, and announces submission results through a live region.
- Motion settings respect the user's reduced-motion preference, including disabling smooth scrolling.
- Images support alternative text, and decorative icons are hidden from screen readers.

These implementation details do not establish full accessibility conformance; changes still need manual review.

## Writing accessible Markdown

- Use headings in a logical order. On content pages, the page title is the main heading, so start body sections with `##` and use `###` for subsections.
- Give links descriptive text that explains their destination, such as `[Read the project case study](./content/projects/platform-migration.md)`.
- Describe meaningful images in their alt text: `![Project timeline showing the three delivery phases](image-url)`. Use empty alt text for purely decorative images: `![](image-url)`.
- Use real lists and tables instead of spacing or images of text. Give tables clear column headers.
- Explain information conveyed by color, diagrams or screenshots in the surrounding text as well.

## Reviewing changes

- Navigate with Tab and Shift+Tab, activate controls with the keyboard, and check that focus remains visible and follows a sensible order.
- Check the skip link, mobile navigation, theme toggle and any changed forms or dialogs. Ensure keyboard users can leave each control or dialog.
- Check headings, landmarks, image descriptions, control names and form errors with a screen reader.
- Review both themes at mobile and desktop widths, with enlarged text and browser zoom, for clipped content or inaccessible controls.
- Enable reduced motion in the operating system and check animations and scrolling.
- Check text and controls for sufficient contrast, and avoid relying on color alone to communicate state.

Automated checks can help identify problems, but they do not replace keyboard and screen-reader testing. See [CONTRIBUTING.md](CONTRIBUTING.md#checks) for the project's code checks.

## Reporting an accessibility issue

Open an issue in this repository with the affected page or component, what you expected, what happened and steps to reproduce it. Include your browser, operating system and assistive technology, if relevant. Screenshots or recordings are optional; avoid including private information or admin credentials.

Report security vulnerabilities privately using [SECURITY.md](SECURITY.md).
