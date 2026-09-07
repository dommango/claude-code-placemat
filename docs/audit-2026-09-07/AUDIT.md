# Placemat Audit — 2026-09-07

What would make the Claude Code Placemat more valuable to the people who use it.
Audited against the live site (`origin/main` at `89e0325`, CC v2.1.263), the full
codebase, the changelog, the PR history, and headless-browser measurements of the
deployed page at four viewports.

Deliverables in this folder:

| What | Where |
|------|-------|
| This report | `AUDIT.md` |
| Working mock-ups (open in a browser, they run on the live content) | `mockups/01…05-*.html` |
| One implementation plan per top change, written for a cheaper model | `plans/01…06-*.md` |
| Machine-readable changelog + Atom feed the bot would emit | `mockups/changes.json`, `mockups/feed.xml` |

---

## Headline verdict

The content pipeline is excellent and the brand is distinctive. The **reading experience
has not kept up with the content**. Six months of daily syncs turned a one-screen
placemat into a 17-screen scroll of 377 rows, with descriptions that read as
concatenated changelogs. Members who come to *look something up* wade through a
10,000-pixel column; members who come to *see what changed* get a modal that only
covers the newest release and stayed silent on the last deploy because that release
had no new rows.

The five changes below fix that. Every one is mocked up on the real page in
`mockups/`, and every one has a plan a cheaper model can execute.

---

## Baseline measurements (live site, 2026-09-07)

| Metric | Value | Why it matters |
|--------|-------|----------------|
| Rows (`.search-item`) | 377 | Up from 132 at Template v1.1 (March) |
| Page height @1440px | 16,923 px (~19 screens) | A placemat should fit a table |
| Page height @390px (mobile) | 35,150 px | ~42 phone screens |
| Tallest card: Config & Environment | 149 rows, 10,857 px | 40 % of all rows in one column; the grid is `align-items: start`, so the other columns end 8,000 px above it |
| Descriptions over 200 chars | 36 of 373 (max 677) | Reference entries have become run-on release notes |
| Descriptions with 3+ `;`-chained clauses | 25 | Same root cause |
| Keyboard tab stops | 749 | Every `<code>` chip is a `role="button"` in the tab order |
| What's New modal fired for a fresh visitor | No | `changes: []` for v2.1.263 → `initWhatsNew` returns early |
| Printed pages (A4 portrait, no print CSS) | 16 | Header, builder, dark backgrounds all print |
| Search "ctrl+r" | 1 hit (`/…` mentions "Ctrl+R"), misses the `Ctrl R` row | Substring match, no normalisation |
| Search "hook" | 49 rows shown | Card-title match dumps all 39 rows of "Memory, Hooks & MCP" |
| `og:image` / canonical / feed | none | The 8-bit preview PNG exists but is never used for link previews |
| Footer | "Template v1.1 \| March 2026" | Reads as abandoned |

Method: `playwright-core` + the local Chromium 1234 build, dark and light themes,
1440/1920/390 widths, `emulateMedia('print')`. Scripts live in the session
scratchpad; nothing was added to the repo for measurement.

---

## Prioritised findings

Ranked by value to members (readers of the site), then by cost. **M** = mock-up, **P** = plan.

### P1 — The placemat no longer fits on a table  (M01, P01)

**Evidence.** 377 rows; 16,923 px tall at 1440 px; the Config card alone is 10,857 px
and holds 149 rows. Because the grid uses `align-items: start` and `auto-fill`, the
layout degrades as content grows: at 1920 px the page gets *taller* (18,620 px) because
five narrower columns wrap more text.

**Impact.** Lookups are slow (scroll, scan, scroll). The dashboard shape that made
Template v1.1 feel like a cheat sheet is gone. Mobile is effectively unusable
(35,150 px).

**Recommendation.**
1. Split "Config & Environment" into **Settings (JSON)** and **Environment Variables**
   cards, and peel **Managed & Enterprise** settings (16 rows) into their own group.
   Page height drops from 16,923 → 12,758 px with no other change.
2. Make every group a `<details>` with a row count in the summary, remembered in
   `localStorage`; add **Collapse all / Expand all**. Fully collapsed, the whole
   placemat is 944 px, one screen, and reads as a table of contents.
3. Add a **sticky section nav** under the header (chip per card with row count,
   active-state via `IntersectionObserver`).
4. Add a **Compact** density toggle (12.5 px base, 38 % first column, 320 px min
   column): 10,439 px expanded.

Mock-up 01 does all four on the live content.

### P2 — "What changed since I was last here?" has no answer  (M03, P03)

**Evidence.** The What's New modal shows only the newest release and is overwritten on
every sync. v2.1.263 shipped with `changes: []` (a demotion-only release), so the
modal never opened; the three releases before it (v2.1.259–261, 11 changes) were never
surfaced to anyone who missed the exact day. The `placemat-seen-version` key is stored
but never used for anything except suppressing that one modal. The `new` shading is a
fixed 3-release window unrelated to the reader.

**Impact.** The site's core promise is "auto-updated, always current". Members cannot
see *what* is current for *them*. The daily pipeline's output is invisible unless you
read `changelog.html` top to bottom.

**Recommendation.** The bot emits `changes.json` (one object per release, one entry per
row with tag + item text) and `feed.xml` (Atom). The page fetches `changes.json`,
compares `placemat-seen-version` with the header tag, and:
- shows a strip: "4 releases · 11 changes since your last visit (v2.1.258 → v2.1.263)";
- shades every affected row's code chip with the existing `new` style — the legend
  becomes "New since your last visit (v2.1.258)";
- opens a right-hand drawer listing the changes per release; clicking an entry scrolls
  to and flashes its row;
- "Mark as read" advances the stored version. First-time visitors see the last 3
  releases, matching today's behaviour.

Mock-up 03 includes a "simulate last visit" control and a generated `feed.xml`.

### P3 — Descriptions have become run-on changelogs  (M04, P04)

**Evidence.** 36 rows over 200 characters. `SendMessage` is 677 characters and six
clauses; `/code-review`, `/goal`, `/status`, `claude agents` are all 500+. The pattern
is mechanical: each sync appends "; now also X" to the existing cell. `/usage` currently
reads: *"Unified usage view (cost + stats tabs); per-category limits breakdown (…);
Loops tab shows per-loop run count, total tokens, tokens per run, and last run — easy
to spot runaway or chatty /loop tasks; spend limit bar for gateway users …"*.

**Impact.** A placemat entry should answer "what is this?" in one glance. These rows
answer "what has happened to this over six months?" instead, and they are what makes
P1 so tall.

**Recommendation.** Two tiers per row: a **summary** (≤ 90 characters, present tense,
what it does) and folded **notes** (bullets: behaviours, flags, caveats), toggled by a
`+N` chip and a global "Show all notes". Add a content rule so the bot writes into the
right tier and never appends to the summary. Mock-up 04 hand-rewrites the 12 longest
entries and auto-splits 47 more at semicolons; page height drops 16,923 → 13,851 px
with notes folded.

### P4 — Search is the primary tool and it is basic  (M02, P02)

**Evidence.** Plain substring on `innerText`: "ctrl+r" misses `Ctrl R`; "--bare" only
matches if the dashes are typed; card-title matches show whole cards (49 rows for
"hook"); no highlighting, no count, no URL state, no `/` shortcut, no way to move
through results by keyboard. No row has an id, so there is no way to link a colleague
to `--permission-prompts none`.

**Recommendation.** Normalise both sides (strip `+ - _ / . :` and whitespace); match on
row + group heading, not card title; highlight hits with `<mark>`; show "24 matches"
in the search box; write `?q=` to the URL; `/` focuses, `Esc` clears; give every row a
stable id and a hover `#` permalink that copies the URL. Mock-up 02 does all of it.

### P5 — Keyboard accessibility regressed as content grew  (M02, P02)

**Evidence.** 749 tab stops. Every `<code>` element is `tabindex="0"` + `role="button"`
(from the July accessibility pass, correct in intent). A keyboard user must tab 749
times to reach the footer. There is no `<main>` landmark and no skip link.

**Recommendation.** Roving tabindex: the grid is one tab stop, ↑/↓ move between visible
rows, Enter copies the row's code, `l` copies its link; chips stay clickable but leave
the tab order. Mock-up 02: 1 tab stop in the grid. Add `<main>` and a skip link (P06).

### P6 — It is called a placemat and it cannot be printed  (M05, P05)

**Evidence.** No `@media print`. Printing yields 16 A4 portrait pages with the fixed
header, the builder, dark card backgrounds, and status colours that vanish in greyscale.

**Recommendation.** A print stylesheet: A4 landscape, 4 CSS columns, 7–8 pt type,
running header line (title, release, legend, URL), rows `break-inside: avoid`, notes
hidden (summaries only, so this depends on P3 for the best result), and status glyphs
(`■` new, `□` unverified) that survive greyscale. A "⎙ Print" header button. Mock-up 05
prints in 8 landscape pages with summaries only (10 with full descriptions); a
"Preview print layout" toggle shows the result on screen.

### P7 — The command builder is stale and mislabels effort  (P06)

**Evidence.** The effort select offers "High (Opus)" / "Low (Haiku)". Effort does not
choose a model; `xhigh` and `auto` are missing; there is no `--model`,
`--permission-mode`, `--max-budget-usd`, `--worktree`. It takes 40 % of the legend strip.

**Recommendation.** Fix the labels (low / medium / high / xhigh, no model names), add
`--model` and `--permission-mode` selects. Longer term, either build a real flag
composer from the CLI card or drop the builder. Quick-win plan covers the label fix.

### P8 — Changelog page: hard to scan, no anchors, no filter  (P03, P06)

**Evidence.** 436 entries, 12,846 px, 6 of 8 months expanded by default. `.change-list
li` is `display: flex; flex-wrap: wrap`, so a long entry wraps its second line under
the tag at the far left (visible on every release block). No `id` on release headings,
so the feed and the drawer cannot link to a release. Header chrome differs from the
placemat (no icon, different title colour).

**Recommendation.** Grid rows (`grid-template-columns: 36px 1fr`), `id="cc-v2-1-261"`
on each release heading, only the newest month open, a tag filter (ADD / CHG / DEL /
FIX) and a search box reusing the placemat's search, and the shared header. P03 adds
the anchors (the feed needs them); P06 adds the layout fix.

### P9 — Nothing helps the site get found or followed  (P06)

**Evidence.** No `og:image` (a 532 KB brand PNG sits unused in `.github/assets/`), no
`<link rel="canonical">`, no feed, no sitemap. Footer reads "Template v1.1 | March
2026". GitHub shows 1 star.

**Recommendation.** Add `og:image` (a 1200×630 crop of the existing PNG, served from
the site root), canonical, `<link rel="alternate" type="application/atom+xml">` once P2
lands, and a footer that shows the last sync date instead of a March timestamp.

### P10 — Content structure: three cards deserve a rethink  (P01)

- "Keys & Shortcuts › Vim Mode" has 3 rows; "Transcript View" 5; fine as groups, but
  "Session Picker Nav" duplicates keys that also appear under `/resume`.
- "CLI & Headless Flags › Core Execution" mixes `claude` subcommands (`claude agents`,
  `claude project purge`, `claude ultrareview`) with flags. A **Subcommands** group
  would match how members think.
- "Skills & Agent Frontmatter › Built-in Skills" mixes bundled skills, skill locations,
  and plugin `bin/` — three different concepts.

These are cheap once P1's group structure exists; P01 includes the two safe moves
(split Config; peel Managed) and lists the rest as optional follow-ups.

---

## What is working — keep it

- **Content accuracy and the sync discipline.** 116 PRs, one per release, each with a
  self-review table; tracking comments and 3-release demotion are applied correctly
  (spot-checked v2.1.259 → v2.1.263). This is the asset everything else builds on.
- **Brand.** Coral/teal on near-black, Geist + a pixel wordmark, the 8-bit minion. It
  is recognisable and it is not the generic AI look. The mock-ups reuse `placemat.css`
  unchanged and only add tokens from it.
- **Zero dependencies, no build step.** Everything here stays that way; every mock-up
  is plain HTML/CSS/JS on top of the existing files.
- **The July a11y pass** (sr-only headers, dialog semantics, keyboard-operable chips,
  POSIX-safe builder quoting) and the regression tests that guard it.

---

## Process and hygiene (lower member value, still worth an hour)

1. **Local checkout is stale.** `fix/light-mode-default` is 42 commits behind
   `origin/main` and its 3 unmerged commits were already squash-merged via PR #75. The
   uncommitted `CLAUDE.md → @AGENTS.md` change on it is the only live work. Delete the
   branch after moving that change to a fresh one.
2. **109 stale `claude/placemat-update-*` remote branches.** Enable "automatically
   delete head branches" on the repo, then prune once.
3. **Silent releases.** When a sync only demotes items, `changes: []` disables the
   modal. P03 replaces the modal; until then, a test should assert the release tag in
   `index.html` matches the top `<h3>` in `changelog.html` (the drift the May audit
   found) and that `whatsNewData.version` matches both.
4. **`~/.claude/changelog_cursor.txt` still says 2026-03-27**, and CLAUDE.md's manual
   workflow references it. Either the cloud routine maintains its own cursor (then
   delete the file and the doc line) or this is dead.
5. **Docs drift.** CLAUDE.md's "Versioning" section still describes snapshotting
   `versions/` on template bumps; no snapshot has been taken since v1.1. P01 bumps the
   template to v1.2 and should snapshot v1.1 first, which makes the rule true again.

---

## How to review the mock-ups

Open `mockups/01-nav-and-collapse.html` through `05-print-placemat.html` in a browser
(they work from `file://`; the RSS and `changes.json` links in 03 need a static server
to click through: `python3 -m http.server 8000` from the repo root, then
`/docs/audit-2026-09-07/mockups/`). Each page has a dashed coral strip at the top
naming the mock-up and listing what to try. Everything below the strip is the live
placemat content with the proposal applied. The strip itself is not part of the proposal.

Suggested order of implementation: **P01 → P02 → P04 → P03 → P05 → P06.** P01 and P02
are independent; P05 (print) is much better after P04 (summaries); P03 needs the bot to
start emitting `changes.json`, so start that conversation with the routine early.
