# Security Policy

## Scope

This is a static HTML reference site with no backend, no auth, no user input,
and no third-party runtime dependencies. The attack surface is small, but
reports are still welcome for:

- XSS / injection vectors in the page or in the auto-update pipeline that could
  let crafted changelog content execute in a visitor's browser
- Supply-chain risk in the GitHub Actions workflows or scheduled bot
- Leaked credentials in commit history

## Reporting

Please **do not** open a public issue for suspected vulnerabilities.

Use GitHub's private vulnerability reporting:
**https://github.com/dommango/claude-code-placemat/security/advisories/new**

If that's unavailable, email the maintainer at the address listed on the GitHub
profile (`dommango`).

Expect an acknowledgement within 7 days. Coordinated disclosure preferred — I'll
work with you on a fix and credit you in the changelog if desired.

## Out of scope

- Reports against `index.html` content being out of date (use a Content
  correction issue instead)
- Vulnerabilities in upstream Claude Code itself — report those to Anthropic
- Findings from automated scanners without a demonstrable impact
