# Search, Permalinks and Keyboard Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make search forgiving (normalised matching, highlighted hits, a live count, `?q=` in the URL, `/` and `Esc` shortcuts), give every row a stable permalink, and collapse 749 keyboard tab stops into one roving focus.

**Architecture:** Rows get ids derived from their first `<code>` text (a one-off script; the bot copies the pattern for new rows). The search function is rewritten in place to match on a normalised string per row (built once at load) and to wrap hits in `<mark>` inside text nodes only, unwrapping them before the next search so the copy-to-clipboard handlers on `<code>` survive. Keyboard: `<code>` chips leave the tab order (`tabindex="-1"`), rows carry a roving `tabindex`, ↑/↓ move, Enter copies.

**Tech Stack:** Vanilla HTML/CSS/JS; `node tests/placemat.test.js`; `python3 -m http.server` for manual checks.

**Reference mock-up:** `docs/audit-2026-09-07/mockups/02-search-and-links.html`.

**Independent of Plan 01.** If Plan 01 has landed, keep its `applyGroupState(term)` call inside the new search listener (Task 2, Step 4 shows where).

**Repo facts you need:**
- Every row is `<tr class="search-item"><td><code>…</code></td><td class="desc">…</td></tr>`. Some rows have two `<code>` chips in the first cell (`<code>Ctrl C</code> / <code>D</code>`); the id uses the first one.
- `performSearch(term)` lives in the second `<script>` block of `index.html`. `makeCopyable`, `copyText`, and `searchInput` are defined in the same block before it.
- Tests require exactly 2 bare `<script>` blocks and zero `style=""` attributes in the source (the search sets `style.display` at runtime, which is fine).

---

### Task 1: Stable row ids

**Goal:** Every `.search-item` has `id="i-<slug>"`, unique, derived from its first `<code>`.

**Files:**
- Modify: `index.html` (all rows)
- Modify: `AGENTS.md` (Content Rules)
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] Every `<tr class="search-item"` has an `id` starting with `i-`.
- [ ] Ids are unique (duplicates get `-2`, `-3` suffixes).
- [ ] Slug rule, documented for the bot: take the text of the first `<code>` in the first cell, lowercase, replace every run of non `[a-z0-9]` with `-`, trim leading/trailing `-`. Examples: `--permission-mode manual` → `i-permission-mode-manual`; `~/.claude/settings.json` → `i-claude-settings-json`; `Ctrl C` → `i-ctrl-c`.

**Verify:** `node tests/placemat.test.js` → all pass.

**Steps:**

- [ ] **Step 1: Write the failing test**

Append inside the `// --- index.html ---` block of `tests/placemat.test.js`:

```js
  test('index.html: every search-item row has a unique i- id', () => {
    const rows = html.match(/<tr class="search-item"[^>]*>/g) || [];
    assert.ok(rows.length > 0, 'no rows found');
    const ids = rows.map((r) => (r.match(/ id="(i-[a-z0-9-]+)"/) || [])[1]);
    const missing = ids.filter((x) => !x).length;
    assert.strictEqual(missing, 0, `${missing} rows without an i- id`);
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate row ids');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/placemat.test.js`
Expected: `FAIL … rows without an i- id`.

- [ ] **Step 3: Add the ids with a one-off script**

Create `/tmp/row-ids.js`:

```js
const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');
const seen = new Map();
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
let n = 0;
html = html.replace(/<tr class="search-item"><td>(.*?)<\/td>/g, (m, cell) => {
  const first = (cell.match(/<code[^>]*>(.*?)<\/code>/) || [, cell])[1];
  let slug = strip(first).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
  const k = (seen.get(slug) || 0) + 1; seen.set(slug, k);
  if (k > 1) slug += '-' + k;
  n++;
  return `<tr class="search-item" id="i-${slug}"><td>${cell}</td>`;
});
fs.writeFileSync(p, html);
console.log('ids added to', n, 'rows');
```

Run: `node /tmp/row-ids.js` → `ids added to 377 rows` (or the current count). Then `rm /tmp/row-ids.js`.

- [ ] **Step 4: Document the rule for the bot**

In `AGENTS.md` under `## Content Rules` add:

```markdown
- Every row carries `id="i-<slug>"`: the first `<code>` text, lower-cased, non-alphanumerics collapsed to `-`, trimmed (`--permission-mode manual` → `i-permission-mode-manual`). If the slug already exists, append `-2`, `-3`. Ids are permalinks — never change an existing one when editing a row.
```

- [ ] **Step 5: Run tests and commit**

Run: `node tests/placemat.test.js` → all pass.

```bash
git add index.html AGENTS.md tests/placemat.test.js
git commit -m "feat: stable i-<slug> ids on every placemat row"
```

---

### Task 2: Normalised search with highlight, count, URL state and shortcuts

**Goal:** Replace `performSearch` so that "ctrl+r" finds `Ctrl R`, hits are highlighted, the search box shows "24 matches", the URL carries `?q=`, `/` focuses the box and `Esc` clears it.

**Files:**
- Modify: `index.html` (header search markup; the `performSearch` function and the input listener)
- Modify: `placemat.css`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `<span class="search-count" id="searchCount" aria-live="polite"></span>` exists inside `.search-wrap` after the `#searchKbd` span.
- [ ] Searching `ctrl+r` shows the `Ctrl R` row; searching `bare` shows `--bare`; searching `vim` shows the Vim Mode rows (group heading text is part of the match).
- [ ] Card titles are **not** matched (searching `hook` must not show all rows of "Memory, Hooks & MCP" — only rows/groups that mention it).
- [ ] Matched text is wrapped in `<mark class="hit">`; clearing the search removes every `<mark>`; copy-to-clipboard on a chip still works after a search.
- [ ] While a term is active `.search-wrap` has class `has-term`, the `⌘K` hint is hidden and the count shows `N matches` (or `1 match`).
- [ ] The URL is updated with `?q=<term>` via `history.replaceState`; loading `index.html?q=hook` runs the search on load.
- [ ] `/` (outside inputs) focuses and selects the search box; `Esc` inside it clears and blurs.
- [ ] The existing test `command builder single-quote escaping is shell-safe` still passes (do not touch the builder).

**Verify:** `node tests/placemat.test.js` → all pass. Manual checks as listed.

**Steps:**

- [ ] **Step 1: Write the failing tests**

Append inside the `// --- index.html ---` block:

```js
  test('index.html: search normaliser strips separators so "ctrl+r" matches "Ctrl R"', () => {
    const fn = html.match(/const normaliseSearch = \(s\) => (.*?);\n/);
    assert.ok(fn, 'normaliseSearch not found');
    const norm = new Function('return (s) => ' + fn[1])();
    assert.strictEqual(norm('Ctrl R'), norm('ctrl+r'));
    assert.strictEqual(norm('--permission-mode manual'), 'permissionmodemanual');
    assert.strictEqual(norm('~/.claude/settings.json'), 'claudesettingsjson');
  });

  test('index.html: search box has a live result count', () => {
    assert.ok(/<span class="search-count" id="searchCount" aria-live="polite"><\/span>/.test(html));
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node tests/placemat.test.js`
Expected: two FAIL lines (`normaliseSearch not found`, and the count span assertion).

- [ ] **Step 3: Header markup**

In `index.html`, change:

```html
                <span class="kbd" id="searchKbd">⌘K</span>
```

to:

```html
                <span class="kbd" id="searchKbd">⌘K</span>
                <span class="search-count" id="searchCount" aria-live="polite"></span>
```

- [ ] **Step 4: Replace the search code**

In the second `<script>` block, delete the whole existing `function performSearch(term) { … }` and the line `searchInput.addEventListener('input', (e) => performSearch(e.target.value));`. Keep the `searchKbd` platform check and the `Ctrl/⌘ K` keydown listener. Insert in their place:

```js
        // --- SEARCH: normalised match, highlight, count, URL state ---
        const normaliseSearch = (s) => s.toLowerCase().replace(/[\s+_\-\/.:~]/g, '');
        const searchRows = Array.from(document.querySelectorAll('.search-item'));
        searchRows.forEach((r) => {
            const heading = r.closest('.search-group')?.querySelector('h3');
            r.dataset.norm = normaliseSearch((heading ? heading.innerText + ' ' : '') + r.innerText);
        });
        const searchWrap = document.querySelector('.search-wrap');
        const searchCount = document.getElementById('searchCount');

        function clearMarks(cell) {
            cell.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(m.textContent));
            cell.normalize();
        }

        function markHits(cell, term) {
            clearMarks(cell);
            if (!term || term.length < 2) return;
            // Build a regex that tolerates the separators the normaliser strips: "ctrl+r" → c[sep]*t[sep]*r[sep]*l[sep]*r
            // Drop separator characters first, then escape each remaining character on its own
            // (escaping before splitting would split "\." into two characters and break the regex).
            const chars = term.split('')
                .filter((ch) => !/[\s+_\-\/.:~]/.test(ch))
                .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            if (!chars.length) return;
            const re = new RegExp(chars.join('[\\s+_\\-\\/.:~]*'), 'i');
            const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
            const nodes = [];
            while (walker.nextNode()) nodes.push(walker.currentNode);
            nodes.forEach((node) => {
                const m = node.data.match(re);
                if (!m || !m[0]) return;
                const mark = document.createElement('mark');
                mark.className = 'hit';
                const after = node.splitText(m.index);
                after.data = after.data.slice(m[0].length);
                mark.textContent = m[0];
                node.parentNode.insertBefore(mark, after);
            });
        }

        function performSearch(raw) {
            const term = raw.trim();
            const t = normaliseSearch(term);
            let total = 0;
            document.querySelectorAll('.dashboard-grid .card:not(.search-exclude)').forEach((card) => {
                let cardHas = false;
                card.querySelectorAll('.search-group').forEach((group) => {
                    let groupHas = false;
                    group.querySelectorAll('.search-item').forEach((row) => {
                        const hit = !t || row.dataset.norm.includes(t);
                        row.style.display = hit ? 'table-row' : 'none';
                        row.querySelectorAll('td').forEach((td) => markHits(td, hit ? term : ''));
                        if (hit) { groupHas = true; total++; }
                    });
                    group.style.display = groupHas ? 'block' : 'none';
                    if (groupHas) cardHas = true;
                });
                card.style.display = cardHas ? 'block' : 'none';
            });
            document.getElementById('noResults').classList.toggle('is-visible', total === 0);
            searchWrap.classList.toggle('has-term', !!t);
            searchCount.textContent = total + (total === 1 ? ' match' : ' matches');
            const url = new URL(location.href);
            if (t) url.searchParams.set('q', term); else url.searchParams.delete('q');
            history.replaceState(null, '', url);
            if (typeof rebindRoving === 'function') rebindRoving();
        }

        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
            if (typeof applyGroupState === 'function') applyGroupState(e.target.value.trim()); // Plan 01, if present
        });
        const initialQuery = new URLSearchParams(location.search).get('q');
        if (initialQuery) { searchInput.value = initialQuery; performSearch(initialQuery); }

        window.addEventListener('keydown', (e) => {
            const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
            if (e.key === '/' && !inField) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
            if (e.key === 'Escape' && document.activeElement === searchInput) {
                searchInput.value = '';
                searchInput.dispatchEvent(new Event('input'));
                searchInput.blur();
            }
        });
```

Important: `markHits` skips `<code>` contents? No — it walks every text node in the cell, including inside `<code>`, so chip text is highlighted too. Because it never replaces `innerHTML`, the click/keydown handlers that `makeCopyable` attached to the `<code>` elements stay attached.

- [ ] **Step 5: CSS**

In `placemat.css`, after the `.search-wrap .kbd { … }` rule add:

```css
.search-count {
    position: absolute;
    right: 8px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--teal-2);
    background: var(--bg-card);
    border: 1px solid var(--teal);
    border-radius: var(--r-xs);
    padding: 1px 5px;
    pointer-events: none;
    display: none;
}
.search-wrap.has-term .kbd { display: none; }
.search-wrap.has-term .search-count { display: inline-block; }

mark.hit {
    background: rgba(217, 119, 87, 0.28);
    color: inherit;
    border-radius: 2px;
    padding: 0 1px;
}
:root[data-theme="light"] mark.hit { background: rgba(194, 65, 12, 0.22); }
```

- [ ] **Step 6: Run tests and manual checks**

Run: `node tests/placemat.test.js` → all pass. Serve; check every acceptance bullet, including "copy still works after a search" (search `hook`, click a highlighted chip, it flashes coral).

- [ ] **Step 7: Commit**

```bash
git add index.html placemat.css tests/placemat.test.js
git commit -m "feat: normalised search with highlights, live count, ?q= state and / shortcut"
```

---

### Task 3: Permalinks

**Goal:** Hovering a row reveals a `#` that copies a direct link; visiting `index.html#i-…` scrolls to and tints that row.

**Files:**
- Modify: `index.html` (rows; JS)
- Modify: `placemat.css`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] Every row's first cell starts with `<a class="row-link" href="#i-…" aria-label="Copy link to this entry">#</a>` whose href equals the row id.
- [ ] Clicking it copies `<origin><path>#i-…` to the clipboard, shows `✓` for ~1 s, and updates the URL hash without scrolling.
- [ ] `tr:target` gets the teal `new` tint and a teal left bar; `scroll-margin-top` keeps it clear of the fixed header (64 px, or 100 px if Plan 01's nav exists).
- [ ] The links are hidden until the row is hovered or focused, and are always visible to keyboard focus.

**Verify:** `node tests/placemat.test.js` → all pass. Manual: open `index.html#i-safe-mode`, the `--safe-mode` row is tinted and in view.

**Steps:**

- [ ] **Step 1: Write the failing test**

```js
  test('index.html: every row has a permalink whose href matches its id', () => {
    const rows = html.match(/<tr class="search-item" id="(i-[a-z0-9-]+)"><td><a class="row-link" href="#(i-[a-z0-9-]+)"/g) || [];
    const total = (html.match(/<tr class="search-item"/g) || []).length;
    assert.strictEqual(rows.length, total, `${rows.length} permalinks for ${total} rows`);
    rows.forEach((r) => { const m = r.match(/id="(i-[^"]+)".*href="#(i-[^"]+)"/); assert.strictEqual(m[1], m[2]); });
  });
```

- [ ] **Step 2: Run to verify it fails**

Run: `node tests/placemat.test.js` → `FAIL … 0 permalinks for 377 rows`.

- [ ] **Step 3: Add the anchors with a one-off script**

Create `/tmp/row-links.js`:

```js
const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');
let n = 0;
html = html.replace(/<tr class="search-item" id="(i-[^"]+)"><td>/g, (m, id) => { n++; return `<tr class="search-item" id="${id}"><td><a class="row-link" href="#${id}" aria-label="Copy link to this entry">#</a>`; });
fs.writeFileSync(p, html);
console.log('links added to', n, 'rows');
```

Run: `node /tmp/row-links.js` → `links added to 377 rows`; `rm /tmp/row-links.js`. Add to `AGENTS.md` Content Rules: `- New rows start their first cell with <a class="row-link" href="#<row id>" aria-label="Copy link to this entry">#</a>`.

- [ ] **Step 4: CSS**

Append to `placemat.css` after the `/* ---------- TABLES ---------- */` rules:

```css
/* permalinks */
.card { padding-left: 22px; }
.search-item { scroll-margin-top: 64px; }
.search-item td:first-child { position: relative; }
.row-link {
    position: absolute;
    left: -14px; top: 5px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fg-dim);
    text-decoration: none;
    opacity: 0;
    transition: opacity var(--dur) var(--ease), color var(--dur) var(--ease);
}
.search-item:hover .row-link,
.search-item:focus-within .row-link,
.row-link:focus-visible { opacity: 1; }
.row-link:hover { color: var(--coral); }
.row-link.copied { color: var(--teal-2); }
.search-item:target { background: var(--new-bg); box-shadow: inset 2px 0 0 0 var(--teal); }
```

If Plan 01 is present, use `scroll-margin-top: 100px` instead of 64.

- [ ] **Step 5: JS**

After the search block from Task 2:

```js
        // --- PERMALINKS ---
        document.querySelectorAll('.row-link').forEach((a) => {
            a.addEventListener('click', async (e) => {
                e.preventDefault();
                const href = a.getAttribute('href');
                try { await navigator.clipboard.writeText(location.origin + location.pathname + href); } catch (err) { console.error('Failed to copy link:', err); }
                history.replaceState(null, '', href);
                a.classList.add('copied'); a.textContent = '✓';
                setTimeout(() => { a.classList.remove('copied'); a.textContent = '#'; }, 900);
            });
        });
        if (location.hash) {
            const target = document.getElementById(location.hash.slice(1));
            if (target) target.scrollIntoView({ block: 'center' });
        }
```

The row-link text nodes must not be highlighted by search; add this guard as the first line inside the `nodes.forEach((node) => {` callback in `markHits`:

```js
                if (node.parentElement.closest('a.row-link')) return;
```

- [ ] **Step 6: Tests, manual, commit**

Run: `node tests/placemat.test.js` → all pass. Serve; check hover reveal, click copies, `#i-safe-mode` deep link.

```bash
git add index.html placemat.css AGENTS.md tests/placemat.test.js
git commit -m "feat: per-row permalinks with copy-on-click and :target highlight"
```

---

### Task 4: One tab stop for the grid (roving focus)

**Goal:** Drop 749 tab stops to one: chips leave the tab order, rows take a roving `tabindex`, ↑/↓ move between visible rows, Enter copies the row's first chip, `l` copies its link.

**Files:**
- Modify: `index.html` (JS; `makeCopyable`)
- Modify: `placemat.css`

**Acceptance Criteria:**
- [ ] After load, `document.querySelectorAll('[tabindex="0"]').length` inside `.dashboard-grid` is 1 (the first visible row).
- [ ] Tab from the search box lands on the first visible row; ↓/↑ move; Enter copies; `l` copies the permalink; Tab again leaves the grid.
- [ ] After a search the first *visible* row is the tab stop (`rebindRoving` is called from `performSearch`).
- [ ] Chips remain mouse-clickable and keep their `role="button"` for screen readers.

**Verify:** Manual keyboard walk-through; `node tests/placemat.test.js` still passes.

**Steps:**

- [ ] **Step 1: Chips leave the tab order**

In `makeCopyable`, change `el.tabIndex = 0;` to `el.tabIndex = -1;` (the generated command chip `#generatedCmd` should stay reachable: after `makeCopyable(genOut, …)` add `genOut.tabIndex = 0;`).

- [ ] **Step 2: Roving rows**

After the permalink JS:

```js
        // --- ROVING FOCUS: the grid is one tab stop ---
        function visibleRows() {
            return searchRows.filter((r) => r.style.display !== 'none' && r.closest('.card').style.display !== 'none');
        }
        function rebindRoving() {
            const rows = visibleRows();
            searchRows.forEach((r) => { r.tabIndex = -1; });
            if (rows[0]) rows[0].tabIndex = 0;
        }
        rebindRoving();
        document.querySelector('.dashboard-grid').addEventListener('keydown', (e) => {
            const row = e.target.closest('.search-item');
            if (!row || e.target !== row) return;
            const rows = visibleRows();
            const i = rows.indexOf(row);
            const move = (next) => { if (!next) return; e.preventDefault(); row.tabIndex = -1; next.tabIndex = 0; next.focus(); };
            if (e.key === 'ArrowDown') move(rows[i + 1]);
            if (e.key === 'ArrowUp') move(rows[i - 1]);
            if (e.key === 'Enter') { e.preventDefault(); const c = row.querySelector('code'); if (c) copyText(c, c.innerText); }
            if (e.key === 'l') { const a = row.querySelector('.row-link'); if (a) a.click(); }
        });
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') { const rows = visibleRows(); if (rows[0]) { e.preventDefault(); rows[0].focus(); } }
        });
```

`performSearch` already calls `rebindRoving()` when it exists (Task 2).

- [ ] **Step 3: CSS**

```css
.search-item:focus { outline: none; background: var(--row-hover); box-shadow: inset 2px 0 0 0 var(--coral); }
```

- [ ] **Step 4: Landmarks (small a11y extras)**

Wrap the grid: change `<div class="dashboard-grid">` to `<main class="dashboard-grid">` and its matching closing `</div>` (the one before `<script type="application/json" id="whatsNewData">`) to `</main>`. Add as the first child of `<body>`: `<a class="skip-link" href="#card-keys">Skip to content</a>` (if Plan 01 has not landed, point it at the first card by adding `id="card-keys"` to that card). CSS:

```css
.skip-link { position: absolute; left: -999px; top: 8px; z-index: 1001; background: var(--coral); color: #0a0a0a; padding: 6px 10px; border-radius: var(--r-sm); font-weight: 700; }
.skip-link:focus { left: 8px; }
```

Update any test that greps for `<div class="dashboard-grid">` (there is none today; the section-nav test in Plan 01 checks `<div class="dashboard-grid">` — change that string to `class="dashboard-grid"`).

- [ ] **Step 5: Verify and commit**

Run: `node tests/placemat.test.js` → all pass. Keyboard walk-through in a browser.

```bash
git add index.html placemat.css tests/placemat.test.js
git commit -m "feat: roving focus — one tab stop for the grid, arrow-key navigation, landmarks"
```

---

### Task 5: Changelog entry

**Files:** `changelog.html`

Add under the newest Template block's `Template / Structure` list (create the block per Plan 01 Task 5 if it does not exist):

```html
                    <li><span class="tag tag-add">ADD</span>Search ignores separators (<code>ctrl+r</code> finds <code>Ctrl R</code>), highlights hits, shows a match count, keeps <code>?q=</code> in the URL; <code>/</code> focuses, <code>Esc</code> clears</li>
                    <li><span class="tag tag-add">ADD</span>Every row has a permalink (<code>#i-…</code>); hover a row and click <code>#</code> to copy it</li>
                    <li><span class="tag tag-change">CHG</span>Keyboard: the grid is one tab stop; ↑/↓ move between rows, Enter copies, <code>l</code> copies the link</li>
```

```bash
git add changelog.html
git commit -m "docs: changelog entries for search, permalinks, keyboard model"
```

## Self-review notes

- Names: `normaliseSearch`, `searchRows`, `searchWrap`, `searchCount`, `clearMarks`, `markHits`, `performSearch`, `rebindRoving`, `visibleRows`, classes `search-count`, `has-term`, `hit`, `row-link`, `copied`, `skip-link`.
- `performSearch` references `rebindRoving` guarded by `typeof`, so Task 2 works before Task 4 lands.
- `applyGroupState` (Plan 01) is likewise guarded.
