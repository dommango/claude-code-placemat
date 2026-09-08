## What this changes

Implements every recommendation from the 2026-09-07 audit (`docs/audit-2026-09-07/AUDIT.md`), one commit per plan. Six months of daily content syncs had turned a one-screen placemat into a 17-screen scroll of 373 rows with run-on descriptions; this is the structural catch-up.

| | Before | After |
|---|---|---|
| Page height @1440px | 16,923 px | 9,407 px (900 px fully collapsed) |
| Tallest card | 149 rows | 76 rows |
| Longest description | 677 chars | 160 chars |
| Keyboard tab stops | 749 | 46 |
| Print | 16 A4 portrait pages of chrome | 7 A4 landscape pages |
| Horizontal overflow @390px | yes | no |

**Structure** — `Config & Environment` split into `Settings (JSON)` and `Environment Variables`, with managed/enterprise keys in their own group. Every group is a `<details>` with a row count that remembers whether you folded it. A sticky section nav gives one chip per card, an active-section highlight, Collapse/Expand all and a Compact density toggle.

**Finding things** — Search ignores separators (`ctrl+r` finds `Ctrl R`), matches rows and group headings instead of whole cards, highlights hits, shows a match count, keeps `?q=` in the URL, and answers `/` and `Esc`. Every row has a stable `i-<slug>` id and a hover permalink.

**Keyboard** — the grid is one tab stop instead of 749: arrows move between visible rows, Enter copies the chip, `l` copies the link. Adds a skip link and a `main` landmark.

**Reading** — long descriptions became a one-line summary plus folded notes (`+N` to expand, "Show all notes" in the legend). The 12 longest were rewritten by hand; a test now fails any description over 160 visible characters, so they cannot creep back.

**Staying current** — the What's New modal is gone. It only ever showed the newest release, and it stayed silent on v2.1.263 because that release only demoted items. In its place: `scripts/build-changes.js` derives `changes.json` and an Atom `feed.xml` from `changelog.html`, and the page tells each reader what changed since *their* last visit, highlights exactly those rows, and lists them in a drawer that jumps to each one.

**Print** — a real `@media print` block: A4 landscape, four columns, summaries only, a running header, and status glyphs that survive greyscale.

**Smaller fixes** — the command builder no longer claims effort levels pick a model (and gained `--model` / `--permission-mode`); changelog entries are a tag/text grid so wrapped lines align under the text, with only the newest month open and the shared header; `og:image`, Twitter card and canonical links; the footer shows the last sync date instead of "March 2026"; mobile no longer scrolls sideways.

## Pipeline changes the daily sync agent must adopt

`CLAUDE.md` is updated, but two of these change the routine's steps:

1. Run `node scripts/build-changes.js` after editing `changelog.html`. CI fails the PR if `changes.json` / `feed.xml` are stale.
2. Stop writing `class="new"` and `<!-- added:vX.Y.Z -->`. The page computes what is new per visitor. Nothing replaces it — just leave it out.
3. Update the `.print-head` release line alongside the `.release-tag` span, and the footer's `Content synced` date. Tests enforce both.

## Test plan

- [x] `node tests/placemat.test.js` — 36 passing (was 16), including new guards for description length, row ids and permalinks, `+N` label/note-count agreement, the `?q=` load-order bug below, release-tag/changelog drift, and footer-date staleness
- [x] `node scripts/build-changes.js --check` — clean
- [x] `npx html-validate` — no new categories of finding versus `main` (one extra `prefer-tbody`, from the extra table)
- [x] Headless Chromium smoke test, 11/11: Ctrl+K, `/`, Esc, theme persistence, fold persistence, density persistence, deep link, `?q=` restore, changelog theme and copy
- [x] Rendered at 1440 / 1920 / 390 px in both themes, no console errors, no horizontal overflow
- [x] Print rendered to PDF: 7 pages, A4 landscape (841.9 × 595 pt)
- [ ] Spot-check the live Pages deploy after merge: the since-strip needs `changes.json` served over HTTP, so it does not appear from `file://`

One real bug surfaced during testing and is fixed here: loading `index.html?q=<term>` ran the search during script execution, before a `const` it depends on was initialized, so the command builder and the whole since-visit feed silently never ran on that page load.

## Notes

- `docs/audit-2026-09-07/` carries the audit report, the five mock-ups and the six plans. The mock-ups are frozen at the pre-implementation markup; their build script refuses to run against the implemented page rather than applying the proposals twice.
- Not done, both because they touch GitHub rather than the code: enabling `delete_branch_on_merge` and pruning the 109 merged `claude/placemat-update-*` branches.
