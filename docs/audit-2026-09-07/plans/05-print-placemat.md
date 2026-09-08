# Printable Placemat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Ctrl P` produce a real placemat: A4 landscape, four columns, small type, a running header line, no chrome, status marks that survive greyscale, and summaries only (notes folded away) when Plan 04 is present.

**Architecture:** One `@media print` block appended to `placemat.css` plus a `@page` rule; a print-only header `<div class="print-head">` in `index.html` that is `display: none` on screen; a "⎙ Print" header button that calls `window.print()`. No JS beyond the button. Columns come from CSS multi-column on `.dashboard-grid` (switched from grid to block in print), which lets rows flow column-to-column and page-to-page.

**Tech Stack:** CSS print media; `node tests/placemat.test.js`; a headless Chromium PDF for verification (optional, instructions included).

**Reference mock-up:** `docs/audit-2026-09-07/mockups/05-print-placemat.html` — its "Preview print layout" button is a mock-up aid only; do **not** ship the on-screen preview.

**Depends on:** nothing hard. With Plan 04 landed the output is 8 A4 landscape pages (summaries only); without it, 10.

---

### Task 1: Print header line and Print button

**Files:**
- Modify: `index.html`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `<div class="print-head" aria-hidden="true">` is the first child of `.dashboard-grid` (or `<main class="dashboard-grid">`), containing the title, `As of release v…` (same text as `.release-tag`), the glyph legend, and the site URL.
- [ ] Header has `<button type="button" class="header-link print-btn" id="printBtn" title="Print or save as PDF (Ctrl P)">⎙ Print</button>` after the Changelog link.
- [ ] Clicking the button calls `window.print()`.
- [ ] A test asserts the print-head's release text equals the `.release-tag` text (so the bot cannot bump one and forget the other).

**Steps:**

- [ ] **Step 1: Failing test** (inside the `// --- index.html ---` block)

```js
  test('index.html: print header release matches the header release tag', () => {
    const tag = html.match(/<span class="release-tag">As of release: (v[\d.]+)<\/span>/);
    const head = html.match(/<div class="print-head"[^>]*>[\s\S]*?As of release (v[\d.]+)[\s\S]*?<\/div>/);
    assert.ok(tag && head, 'release tag or print-head missing');
    assert.strictEqual(head[1], tag[1], 'print-head release differs from header release tag');
  });
```

Run → FAIL (`print-head missing`).

- [ ] **Step 2: Markup**

After `<a href="changelog.html" class="header-link">Changelog →</a>` add:

```html
            <button type="button" class="header-link print-btn" id="printBtn" title="Print or save as PDF (Ctrl P)">⎙ Print</button>
```

Immediately after the grid's opening tag add (replace `v2.1.263` with the current release tag value):

```html
        <div class="print-head" aria-hidden="true">
            <span class="print-head-title">Claude Code <b>PLACEMAT</b></span>
            <span>As of release v2.1.263</span>
            <span>■ = new &nbsp; □ = unverified</span>
            <span>dommango.github.io/claude-code-placemat</span>
        </div>
```

JS, inside the second `<script>` block:

```js
        document.getElementById('printBtn').addEventListener('click', () => window.print());
```

- [ ] **Step 3: Bot rule** — `AGENTS.md`, Pipeline step "Scheduled agent reads current CC version from index.html header": add "and updates both `.release-tag` and `.print-head` (a test enforces they match)".

- [ ] **Step 4: Test + commit**

```bash
node tests/placemat.test.js
git add index.html AGENTS.md tests/placemat.test.js
git commit -m "feat: print button and print-only header line"
```

---

### Task 2: Print stylesheet

**Files:**
- Modify: `placemat.css`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `placemat.css` contains `@page { size: A4 landscape; margin: 7mm 8mm; }` and one `@media print { … }` block.
- [ ] In print: header, section nav (if present), legend/builder strip, since-strip (if present), no-results, and any drawer/modal are hidden; `.print-head` is shown; the grid is 4 CSS columns; type is 7–8 pt; rows do not split across columns; `code.new` and `code.unverified` carry `■` / `□` glyphs; backgrounds are white and text is near-black regardless of the on-screen theme.
- [ ] If Plan 04 landed: `.notes` and `.notes-btn` are hidden in print.
- [ ] A test asserts the `@page` rule and the presence of `@media print`.

**Verify:** `node tests/placemat.test.js` → pass. Manual: `Ctrl P` in Chrome shows a white, four-column, landscape preview with the header line on page 1 and ≤ 10 pages.

**Steps:**

- [ ] **Step 1: Failing test** (inside the `// --- placemat.css ---` block)

```js
  test('placemat.css: has an A4 landscape @page rule and a print block that hides the chrome', () => {
    assert.ok(/@page\s*\{\s*size:\s*A4 landscape;/.test(css), '@page A4 landscape missing');
    const print = css.match(/@media print \{([\s\S]*)\}\s*$/);
    assert.ok(print, '@media print block missing (must be the last block in the file)');
    ['.global-header', '.legend-strip', '.print-head', 'column-count: 4', 'break-inside: avoid', 'print-color-adjust: exact'].forEach((s) => {
      assert.ok(print[1].includes(s), `print block missing ${s}`);
    });
  });
```

Run → FAIL.

- [ ] **Step 2: Append to the end of `placemat.css`**

```css
/* ---------- PRINT ---------- */
.print-head { display: none; }
.print-btn { cursor: pointer; background: none; font-family: var(--font-sans); }

@page { size: A4 landscape; margin: 7mm 8mm; }

@media print {
    .global-header, .section-nav, .legend-strip, .since-strip, .since-drawer,
    .no-results, .whats-new-overlay, .notes, .notes-btn, .row-link, .skip-link { display: none !important; }

    html, body { padding: 0; background: #fff; color: #111; font-size: 8pt; line-height: 1.25; }

    .print-head {
        display: flex;
        column-span: all;
        justify-content: space-between;
        gap: 6mm;
        font-family: var(--font-mono);
        font-size: 7pt;
        color: #333;
        border-bottom: 1.5px solid #111;
        padding-bottom: 1mm;
        margin-bottom: 3mm;
    }
    .print-head-title { font-family: var(--font-sans); font-weight: 700; font-size: 9pt; color: #111; }
    .print-head-title b { font-family: var(--font-pixel); font-size: 6pt; color: #c2410c; font-weight: 400; margin-left: 4px; }

    .dashboard-grid { display: block; column-count: 4; column-gap: 5mm; column-fill: auto; max-width: none; }

    .card { display: block; margin: 0 0 3mm; padding: 0; border: none; border-radius: 0; background: none; break-inside: auto; }
    .card h2 { font-size: 8.5pt; color: #111; border-bottom: 1.5px solid #111; padding-bottom: 1.5px; margin: 0 0 2mm; break-after: avoid; }
    .card h2::before { background: #c2410c; }
    .card-count { display: none; }

    .search-group { margin-bottom: 2mm; break-inside: auto; }
    details.search-group > summary { margin-bottom: 1mm; }
    details.search-group:not([open]) > * { display: revert; }   /* folded groups still print */
    .search-group h3 { font-size: 6.5pt; color: #0f766e; margin: 0 0 1mm; break-after: avoid; }
    .search-group h3::before { color: #c2410c; }
    .search-group + .search-group h3 { border-top: 1px dashed #bbb; padding-top: 1mm; margin-top: 1mm; }
    .group-count { color: #666; }

    table { font-size: 7.5pt; }
    tr { break-inside: avoid; }
    td { padding: 0.6mm 1mm 0.4mm 0; border-bottom: 0.4pt dotted #999; vertical-align: top; }
    td:first-child { width: 40%; }
    .desc { font-size: 7pt; color: #333; line-height: 1.25; }

    code { font-size: 6.8pt; background: #f1efe9; color: #111; border: 0.4pt solid #ddd; padding: 0 2px; cursor: default; }
    .desc code { font-size: 6.5pt; }
    code.new { background: #dfe8de; border-color: #0f766e; box-shadow: inset 2px 0 0 0 #0f766e; }
    code.new::after { content: " ■"; color: #0f766e; font-size: 5pt; }
    code.unverified { background: #f7edd6; border-color: #b47400; box-shadow: inset 2px 0 0 0 #b47400; }
    code.unverified::after { content: " □"; color: #b47400; font-size: 5pt; }
    mark.hit { background: none; }

    .global-footer { border: none; padding: 2mm 0 0; font-size: 6pt; color: #666; text-align: left; }
    .global-footer a { color: #666; }
    .global-footer br { display: none; }

    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
```

Notes:
- The `details:not([open]) > *` line makes folded groups (Plan 01) print anyway — Chrome prints closed `<details>` as closed otherwise. If Plan 01 is not present the selector matches nothing.
- Selectors for Plans 01–04 (`.section-nav`, `.since-*`, `.notes*`, `.row-link`, `.skip-link`) are harmless when those plans are absent.

- [ ] **Step 3: Test + manual**

`node tests/placemat.test.js` → pass. Open the page in Chrome, `Ctrl P`: landscape, white, 4 columns, header line on page 1, status glyphs visible with "Background graphics" off.

Optional headless check (Chromium on PATH):

```bash
python3 -m http.server 8000 &
chromium --headless --no-sandbox --print-to-pdf=/tmp/placemat.pdf --no-pdf-header-footer http://localhost:8000/
python3 -c "import re;d=open('/tmp/placemat.pdf','rb').read();print('pages',len(re.findall(rb'/Type\s*/Page[^s]',d)))"
kill %1
```

Expected: `pages 8` with Plan 04, `pages 10` without.

- [ ] **Step 4: Commit**

```bash
git add placemat.css tests/placemat.test.js
git commit -m "feat: print stylesheet — A4 landscape, four columns, greyscale-safe status glyphs"
```

---

### Task 3: Docs and changelog

- [ ] `AGENTS.md` Style Guide: add `- Printable: the @media print block at the end of placemat.css renders A4 landscape, 4 columns, summaries only; keep new chrome (bars, drawers, buttons) inside that block's hide list`.
- [ ] `changelog.html`, newest Template block, Template/Structure list:

```html
                    <li><span class="tag tag-add">ADD</span>Print stylesheet — <code>Ctrl P</code> (or the ⎙ Print button) gives an A4 landscape, four-column placemat with a release header and greyscale-safe status marks</li>
```

- [ ] Commit: `git add AGENTS.md changelog.html && git commit -m "docs: print support"`.

## Self-review notes

- The test requires `@media print` to be the **last** block in `placemat.css`; keep it that way when appending later rules (append inside the block or above it).
- `.print-head` text is duplicated from `.release-tag` on purpose (print CSS cannot read the DOM); the test in Task 1 keeps them in sync.
