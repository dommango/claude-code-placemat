# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Single-page HTML reference for Claude Code commands, shortcuts, flags, config, and extensibility.

**Live site:** https://dommango.github.io/claude-code-placemat/ — GitHub Pages auto-deploys from `main`.

## Structure

```
index.html          — Current placemat (edit this)
placemat.css        — Shared styles, linked by index.html and changelog.html
changelog.html      — Detailed changelog across versions (source of truth for changes)
changes.json        — Generated from changelog.html; the page reads it to show
                      each visitor what changed since their last visit
feed.xml            — Generated Atom feed of the same data
og-image.png        — 1200x630 link-preview image
scripts/            — build-changes.js (regenerates changes.json + feed.xml)
tests/              — placemat.test.js (zero-dependency structural tests)
versions/           — Archived snapshots (read-only, never edit)
```

`versions/*.html` snapshots are intentionally self-contained (their own inline
`<style>`, no link to `placemat.css`) since they're immutable archives — never
refactor them onto the shared stylesheet, that would change how a past version
renders.

## Local Preview

```bash
python3 -m http.server 8000   # then open http://localhost:8000
```

## Versioning

Two independent version numbers are tracked here:

- **Template version** (e.g. v1.1) — the placemat's own structure/design. Bumped
  only on structural or visual redesigns. When bumping, copy the current
  `index.html` into `versions/vN.N.html` *before* making changes, so the prior
  layout stays reachable.
- **CC release version** (e.g. v2.1.150) — the Claude Code release the content
  reflects. Updated on every sync (daily pipeline or manual); does **not** get
  a `versions/` snapshot — it's tracked via the header's "As of release" tag
  and `changelog.html` entries only.

For either kind of update:
- Update the `<title>` and header version tag to match
- Add a new version block (or CC-release entry) to `changelog.html` documenting what changed

## Style Guide

- OS-preference theme detection with localStorage persistence; Anthropic brand colors (`--coral: #d97757`, `--teal: #879d86`)
- All content is searchable via the global search (Ctrl+K or `/`); search ignores separators, so `ctrl+r` finds `Ctrl R`
- Tables use `12px` font, `4px 6px 3px` cell padding, fixed first-column width at 44%
- Every `<code>` element is click-to-copy
- Item status is shown via shaded code backgrounds, not badges:
  - Default (dark bg): verified
  - Teal-tinted bg (`code.new`): changed since this reader's last visit — applied at runtime from `changes.json`, never written into the HTML
  - Yellow-tinted bg (`code.unverified`): unverified
- A legend at the top of the placemat explains the shading
- Card headings are uppercase with letter-spacing
- Code elements use `word-break: break-word` — never truncate with `...`
- Groups are `<details class="search-group" open data-group="<Title>">` with
  `<summary><h3>…</h3><span class="group-count"></span></summary>`; row counts are filled by JS at load — never hand-write them
- The eight content cards have fixed ids used by the section nav: `card-keys`, `card-slash-core`,
  `card-slash-tools`, `card-cli`, `card-settings`, `card-env`, `card-skills`, `card-hooks`
- `localStorage` keys: `placemat-theme`, `placemat-seen-version`, `placemat-collapsed` (JSON array of folded group titles), `placemat-density` (`compact` | `comfortable`)
- Printable: the `@media print` block at the end of `placemat.css` renders A4 landscape, four columns,
  summaries only; keep new chrome (bars, drawers, buttons) in that block's hide list
- No external dependencies — everything is self-hosted, no build step, no npm install

## Content Rules

- Only include features that are verified against official docs or the changelog
- Mark unverified items with the `unverified` class on the `<code>` element
- Promote unverified items by removing the `unverified` class once they appear in the official CC changelog. The routine must check current `class="unverified"` items against the latest fetched changelog on every run and strip the class from any item that now has changelog confirmation.
- **Do not** write `class="new"` or `<!-- added:vX.Y.Z -->` into `index.html`; the page computes what is
  new for each visitor from `changes.json`
- Never truncate code text with `...` — always show the full command/flag/path
- Every row carries `id="i-<slug>"`: the first `<code>` text, lower-cased, non-alphanumerics collapsed to `-`,
  trimmed (`--permission-mode manual` → `i-permission-mode-manual`); duplicates get `-2`, `-3`.
  Ids are permalinks — never change an existing one when editing a row
- Every row's first cell starts with
  `<a class="row-link" href="#<row id>" tabindex="-1" title="Copy link to this entry (or press l on the row)" aria-label="Copy link to this entry">#</a>`
- New rows go inside the `<table>` of the matching `<details class="search-group">`; when adding a group,
  copy an existing `<details>` block including its `<summary>`
- JSON settings that only apply in managed/enterprise policy files go in the `Managed & Enterprise` group
  of the Settings (JSON) card, not in `Key JSON Settings`
- Every description is either one short sentence (≤ 90 characters, present tense, what it does) or a two-tier cell:
  `<span class="summary">…</span> <button type="button" class="notes-btn" aria-expanded="false">+N</button><ul class="notes" hidden><li>…</li></ul>`
  where N equals the number of `<li>`
- When a release changes an existing item, add or edit a **note**; never append to the summary. If the change
  alters what the item fundamentally does, rewrite the summary instead of extending it
- Never write "now", "also", "no longer", or a version number into a summary; those belong in notes
- `tests/placemat.test.js` fails any description over 160 visible characters outside its notes
- Changelog entries use tags: `ADD`, `CHG`, `FIX`, `DEL` and are shaped
  `<li><span class="tag tag-add">ADD</span><span class="entry">…</span></li>`
- Release headings in `changelog.html` are `<h3 id="cc-v2-1-NNN">CC v2.1.NNN <span class="version-date">…</span></h3>`;
  ranged headings use the last version for the id
- Only the newest month `<details class="month-group">` is `open`
- Changelog separates **Template/Structure** changes from **Content/CC Release** changes

## Automated Update Pipeline

A cloud-scheduled task (`RemoteTrigger`) runs daily at 9:00 AM UTC to check for new CC releases.

**Flow:**

1. Scheduled agent reads current CC version from `index.html` header (update both the
   `.release-tag` span and the `.print-head` line — a test enforces that they match)
2. Fetches official changelog, filters entries newer than current version
3. If no updates → exits silently
4. If updates found:
   - Categorizes changes against placemat sections
   - Applies changes to a working copy
   - Updates `changelog.html` with new entries under the current template version
   - Updates the footer's `Content synced` date to the newest release date
   - Runs `node scripts/build-changes.js` to regenerate `changes.json` and `feed.xml`
     (CI fails the PR if they are stale)
   - Runs `node tests/placemat.test.js` before committing
   - Runs self-review checklist (technical, changelog quality, holistic consistency)
   - Commits, pushes to `claude/placemat-update-vX.Y.Z` branch
   - Opens PR with change summary + review checklist results
5. Human reviews PR on GitHub, merges to main
6. GitHub Pages auto-deploys

**Branch convention:** `claude/placemat-update-vX.Y.Z`
**Commit format:** `feat: update placemat for CC vX.Y.Z`

## Manual Validation Workflow

When updating manually for a new Claude Code version:

1. Fetch the changelog: `https://code.claude.com/docs/en/changelog`
2. Check cursor date in `~/.claude/changelog_cursor.txt`
3. Cross-reference new features against existing placemat content
4. Add/update/remove entries as needed
5. Snapshot current `index.html` to `versions/` only when bumping the **template** version
6. Update `changelog.html` with a new version block
7. Run `node scripts/build-changes.js` and `node tests/placemat.test.js`
8. Update cursor date
