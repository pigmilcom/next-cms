# Contributing to @pigmilcom/a11y

Thank you for taking the time to contribute! This document explains how to get
involved, what kinds of contributions are welcome, and how to submit them.

---

## Table of contents

- [Code of conduct](#code-of-conduct)
- [Ways to contribute](#ways-to-contribute)
- [Development setup](#development-setup)
- [Project structure](#project-structure)
- [Making changes](#making-changes)
- [Commit style](#commit-style)
- [Pull request checklist](#pull-request-checklist)
- [Reporting bugs](#reporting-bugs)
- [Requesting features](#requesting-features)

---

## Code of conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
By participating you agree to abide by its terms.

---

## Ways to contribute

| Type | Where |
| ---- | ----- |
| Bug reports | [GitHub Issues](https://github.com/pigmilcom/a11y/issues) |
| Feature requests | [GitHub Issues](https://github.com/pigmilcom/a11y/issues) |
| Documentation fixes | Pull request against `main` |
| Code fixes / features | Pull request against `main` |
| Accessibility feedback | Issue or email webmaster@pigmil.com |

---

## Development setup

**Requirements:** Node.js ≥ 18, npm ≥ 9

```bash
git clone https://github.com/pigmilcom/a11y.git
cd a11y
npm install
```

### Build commands

| Command | Purpose |
| ------- | ------- |
| `npm run build` | Full production build |
| `npm run build:js` | ESM + CJS bundles only |
| `npm run build:css` | Stylesheet only |
| `npm run build:cdn` | IIFE CDN bundle only |
| `npm run build:gh` | Update gh-pages branch |
| `npm run dev` | Watch mode (tsup) |

### Demo

The demo page lives in `demo/index.html`. Open it directly in a browser after
running `npm run build:cdn` — the script tag points to `../dist/a11y.cdn.js`.

---

## Project structure

```
src/
  index.js          # npm package entry (re-exports widget)
  widget.jsx        # Main React component
  cdn.jsx           # CDN / IIFE entry point
  license.js        # Domain validation (gitignored — not public)
  a11y-css.js       # Auto-generated CSS module (do not hand-edit)
  a11y.css          # Source stylesheet
demo/
  index.html        # Live demo page (deployed to gh-pages)
scripts/
  build-css.js      # CSS build + injection into a11y-css.js
  build-license.js  # Obfuscates license.js → dist/license.min.js
  build-gh.mjs      # Pushes demo/index.html to gh-pages branch
dist/               # Build output (committed for CDN users)
types/
  index.d.ts        # TypeScript declarations
```

---

## Making changes

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b fix/your-description
   ```
2. Make your changes.
3. Run a full build to make sure nothing is broken:
   ```bash
   npm run build
   ```
4. Open `demo/index.html` in a browser and verify the widget works visually.
5. Commit your changes using the style below.
6. Push your branch and open a pull request against `main`.

---

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

| Type | When to use |
| ---- | ----------- |
| `feat` | New feature or toggle option |
| `fix` | Bug fix |
| `docs` | README, CONTRIBUTING, inline comments |
| `style` | CSS-only changes |
| `refactor` | Code restructure with no behaviour change |
| `chore` | Build scripts, config, deps |
| `build` | Changes to the build pipeline |

---

## Pull request checklist

Before submitting a PR please confirm:

- [ ] `npm run build` succeeds with no errors
- [ ] The widget renders correctly in the demo page
- [ ] New features are reflected in `README.md` if user-facing
- [ ] No `console.log` or debug code left in
- [ ] Branch is up to date with `main`

---

## Reporting bugs

Use the [Bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

Include:

- Browser and OS
- Widget version (CDN URL or npm version)
- Steps to reproduce
- Expected vs actual behaviour
- Console errors if any

---

## Requesting features

Use the [Feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

For accessibility-specific feature requests, please reference the relevant
WCAG 2.1 / 2.2 success criterion where applicable.

---

## Questions?

Open a [GitHub Discussion](https://github.com/pigmilcom/a11y/discussions) or
email **webmaster@pigmil.com**.
