# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 1.2.x   | ✅ Current |
| 1.1.x   | ✅ Security fixes only |
| < 1.1   | ❌ End of life |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in `@pigmilcom/a11y`, please disclose
it responsibly by emailing:

**webmaster@pigmil.com**

Include in your report:

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept
- Affected versions
- Any suggested mitigations (optional)

### What to expect

- **Acknowledgement** within 48 hours
- **Status update** within 7 days confirming whether the report is accepted
- **Fix timeline** communicated once the issue is triaged
- Credit in the release notes if you wish (opt-in)

We ask that you give us a reasonable amount of time to address the issue before
any public disclosure.

## Scope

The following are **in scope**:

- The npm package `@pigmilcom/a11y` (all published versions)
- The CDN bundle served from `cdn.pigmil.com/a11y/dist/a11y.cdn.js`
- The license validation endpoint `api.pigmil.com/a11y/validate`

The following are **out of scope**:

- Third-party CDN infrastructure (jsDelivr)
- The demo page at `pigmilcom.github.io/a11y`
- Vulnerabilities in peer dependencies (`react`, `react-dom`) — report those
  to the React team directly

## Security design notes

- The widget stores preferences in `localStorage` only — no data is sent to
  any server by the widget itself
- The license validation request carries only the hostname and a timestamp
  hash — no personal data, cookies, or fingerprinting
- All fetch requests use `cors` mode with `omit` credentials
