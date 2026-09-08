# Section Nav + Collapsible Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 377-row placemat scannable again: split the oversized Config card, fold every group into a `<details>` with a row count, add a sticky section nav under the header, and add a Compact density toggle.

**Architecture:** Pure HTML/CSS/JS edits to `index.html` and `placemat.css`; no build step, no dependencies (project rule). Row counts are computed at page load in JS, never hand-written into the HTML, so the daily sync bot does not have to maintain them. Group open/closed state and density live in `localStorage` under new keys. The existing search keeps working because folded groups keep the `.search-group` class the search code targets.

**Tech Stack:** Vanilla HTML/CSS/JS, `node tests/placemat.test.js` (zero-dependency test runner already in the repo), `python3 -m http.server` for manual checks.

**Reference mock-up:** `docs/audit-2026-09-07/mockups/01-nav-and-collapse.html` — open it in a browser; the result of this plan must look and behave like it (minus the dashed "MOCK-UP 01" strip).

**Before you start, read:** `AGENTS.md` (Style Guide + Content Rules), the top 60 lines of `placemat.css` (tokens), and `tests/placemat.test.js` (how tests are written).

**Repo facts you need:**
- `index.html` has 8 `<div class="card">` blocks (1 legend strip + 7 content cards). Each content card is `<h2>Title</h2>` followed by several `<div class="search-group"><h3>Group</h3><table>…</table></div>`.
- Every row is `<tr class="search-item"><td><code>…</code></td><td class="desc">…</td></tr>`.
- The search code (`performSearch` in the inline `<script>`) sets `style.display` on `.card`, `.search-group`, and `.search-item`. Do not rename those classes.
- Tests assert there are **exactly 2** bare `<script>` blocks in `index.html`. Put all new JS inside the existing second `<script>` block; do not add a third.
- Tests assert there are no `style=""` attributes in the HTML source.
- CI runs `html5validator` on every PR; `<details>`/`<summary>` containing an `<h3>` is valid HTML.

---

### Task 1: Split "Config & Environment" into two cards and a Managed group

**Goal:** Reduce the tallest card (149 rows, 10,857 px) to two cards of ~76 and ~73 rows, with managed/enterprise settings in their own group.

**Files:**
- Modify: `index.html` (the card starting at `<h2>Config & Environment</h2>`, approx. lines 327–499)
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] No `<h2>Config & Environment</h2>` remains.
- [ ] A card `<h2>Settings (JSON)</h2>` contains groups, in order: `Files & Priority`, `Key JSON Settings`, `Managed & Enterprise`.
- [ ] A card `<h2>Environment Variables</h2>` contains one group `All Variables`.
- [ ] `Managed & Enterprise` contains exactly the 13 rows listed in Step 2; they no longer appear in `Key JSON Settings`.
- [ ] Total `.search-item` count is unchanged (377 at the time of writing; compute before and after).

**Verify:** `node tests/placemat.test.js` → `… passed, 0 failed`; `grep -c 'search-item' index.html` gives the same number before and after.

**Steps:**

- [ ] **Step 1: Record the baseline row count**

Run: `grep -c '<tr class="search-item"' index.html`
Expected: a number (377 as of v2.1.263). Write it down; Step 5 must match it.

- [ ] **Step 2: Write the failing test**

Append to `tests/placemat.test.js` inside the `// --- index.html ---` block (before its closing `}`):

```js
  test('index.html: Config card is split into Settings (JSON) and Environment Variables', () => {
    assert.ok(!html.includes('<h2>Config & Environment</h2>'), 'old Config card still present');
    const settings = html.indexOf('<h2>Settings (JSON)</h2>');
    const env = html.indexOf('<h2>Environment Variables</h2>');
    assert.ok(settings !== -1 && env !== -1, 'new cards missing');
    assert.ok(settings < env, 'Settings card must come before Environment Variables');
    const managed = html.indexOf('<h3>Managed & Enterprise</h3>');
    assert.ok(managed > settings && managed < env, 'Managed & Enterprise group must live in the Settings card');
  });
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node tests/placemat.test.js`
Expected: `FAIL - index.html: Config card is split …` with "old Config card still present".

- [ ] **Step 4: Edit the card in `index.html`**

Find the block:

```html
        <div class="card">
            <h2>Config & Environment</h2>

            <div class="search-group">
                <h3>Files & Priority</h3>
```

Change the `<h2>` to `<h2>Settings (JSON)</h2>`.

Then find the group `<div class="search-group">` whose `<h3>` is `Environment Variables`. Insert **before** that group's opening `<div class="search-group">`:

```html
        </div>

        <div class="card">
            <h2>Environment Variables</h2>
```

and change that group's `<h3>Environment Variables</h3>` to `<h3>All Variables</h3>`. (The original closing `</div>` of the old card now closes the new Environment Variables card.)

Now create the managed group. In the `Key JSON Settings` table, cut these 13 rows (match on the text of the first `<code>` in each row) and paste them, in this order, into a new group placed **after** the `Key JSON Settings` group and **before** the new `</div>` you inserted above:

1. `forceRemoteSettingsRefresh`
2. `sandbox.bwrapPath` / `sandbox.socatPath`
3. `wslInheritsWindowsSettings`
4. `parentSettingsBehavior`
5. `channelsEnabled`
6. `allowAllClaudeAiMcps`
7. `managedMcpServers`
8. `deniedMcpServers`
9. `pluginSuggestionMarketplaces`
10. `strictKnownMarketplaces`
11. `blockedMarketplaces`
12. `requiredMinimumVersion` / `requiredMaximumVersion`
13. `enforceAvailableModels`

The new group's skeleton (paste the 13 `<tr>` rows where indicated; keep each row's HTML exactly as it was, including any `class="new"` and `<!-- added:… -->` comment):

```html
            <div class="search-group">
                <h3>Managed & Enterprise</h3>
                <table>
                    <thead><tr><th scope="col" class="sr-only">Item</th><th scope="col" class="sr-only">Description</th></tr></thead>
                    <!-- the 13 rows go here -->
                </table>
            </div>
```

- [ ] **Step 5: Run the tests and the row count**

Run: `node tests/placemat.test.js && grep -c '<tr class="search-item"' index.html`
Expected: all tests pass; the count equals Step 1.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/placemat.test.js
git commit -m "refactor: split Config & Environment into Settings (JSON) and Environment Variables cards"
```

---

### Task 2: Fold every group into a `<details>` with a runtime row count

**Goal:** Each `.search-group` becomes collapsible, shows its row count, remembers its state, and stays searchable.

**Files:**
- Modify: `index.html` (all 25 `search-group` blocks, the second `<script>`)
- Modify: `placemat.css` (after the `/* ---------- GROUPS ---------- */` section)
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] Every `<div class="search-group">` is now `<details class="search-group" open data-group="<Group Title>">` with `<summary><h3>…</h3><span class="group-count"></span></summary>` before the `<table>`.
- [ ] On load, each `.group-count` shows the number of `.search-item` rows in that group (computed in JS).
- [ ] Clicking a summary folds/unfolds the group; reloading the page keeps the state (`localStorage` key `placemat-collapsed`, a JSON array of group titles).
- [ ] Typing a search term opens all groups that contain matches; clearing the search restores the remembered state.
- [ ] Zero `style=""` attributes in the source; exactly 2 bare `<script>` blocks.

**Verify:** `node tests/placemat.test.js` → all pass. Manual: serve with `python3 -m http.server 8000`, fold "Vim Mode", reload, it stays folded; search `vim`, it opens; clear, it folds again.

**Steps:**

- [ ] **Step 1: Write the failing test**

Append inside the `// --- index.html ---` block of `tests/placemat.test.js`:

```js
  test('index.html: every search-group is a <details> with a summary, h3 and count span', () => {
    const groupCount = (html.match(/<details class="search-group" open data-group="[^"]+">/g) || []).length;
    const h3Count = (html.match(/<h3>/g) || []).length;
    const summaryCount = (html.match(/<summary><h3>[^<]+<\/h3><span class="group-count"><\/span><\/summary>/g) || []).length;
    assert.ok(groupCount > 0, 'no details.search-group found');
    assert.strictEqual(groupCount, h3Count, `${groupCount} details for ${h3Count} h3 headings`);
    assert.strictEqual(summaryCount, h3Count, `${summaryCount} well-formed summaries for ${h3Count} h3 headings`);
    assert.strictEqual((html.match(/<div class="search-group">/g) || []).length, 0, 'old div.search-group still present');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/placemat.test.js`
Expected: `FAIL … no details.search-group found`.

- [ ] **Step 3: Rewrite the groups with a one-off script**

Doing 25 groups by hand invites typos. Create `/tmp/fold-groups.js`:

```js
const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');
let n = 0;
html = html.replace(/<div class="search-group">\s*\n(\s*)<h3>(.*?)<\/h3>([\s\S]*?)<\/table>(\s*)<\/div>/g, (all, indent, title, body, tail) => {
  n++;
  return `<details class="search-group" open data-group="${title}">\n${indent}<summary><h3>${title}</h3><span class="group-count"></span></summary>${body}</table>${tail}</details>`;
});
fs.writeFileSync(p, html);
console.log('folded', n, 'groups');
```

Run: `node /tmp/fold-groups.js`
Expected: `folded 25 groups` (the number must equal `grep -c '<h3>' index.html`). Then `rm /tmp/fold-groups.js`.

- [ ] **Step 4: Add the CSS**

In `placemat.css`, directly after the existing `.search-group + .search-group h3 { … }` rule, add:

```css
/* collapsible groups */
details.search-group > summary {
    list-style: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0 0 6px 0;
}
details.search-group > summary::-webkit-details-marker { display: none; }
details.search-group > summary h3 { margin: 0; }
details.search-group > summary h3::before { transition: transform var(--dur) var(--ease); }
details.search-group[open] > summary h3::before { transform: rotate(90deg); }
details.search-group:not([open]) > summary { margin-bottom: 0; }
details.search-group:not([open]) > summary h3 { color: var(--fg-muted); }
details.search-group > summary:hover h3 { color: var(--teal-2); }
details.search-group + details.search-group > summary h3 {
    margin-top: 4px;
    padding-top: 8px;
    border-top: 1px dashed var(--border);
}
.group-count {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--fg-dim);
}
```

- [ ] **Step 5: Add the JS**

In `index.html`, inside the second `<script>` block, immediately **after** the `performSearch` function's closing `}` (and before `// --- COMPACT COMMAND BUILDER LOGIC ---`), add:

```js
        // --- COLLAPSIBLE GROUPS (counts computed at load; state remembered) ---
        const groupEls = Array.from(document.querySelectorAll('details.search-group'));
        const COLLAPSED_KEY = 'placemat-collapsed';
        let collapsedGroups = new Set();
        try { collapsedGroups = new Set(JSON.parse(localStorage.getItem(COLLAPSED_KEY) || '[]')); } catch (err) {}

        groupEls.forEach((d) => {
            d.querySelector('.group-count').textContent = d.querySelectorAll('.search-item').length;
            d.open = !collapsedGroups.has(d.dataset.group);
            d.addEventListener('toggle', () => {
                if (searchInput.value.trim()) return; // search-driven opens are temporary
                const next = new Set(collapsedGroups);
                d.open ? next.delete(d.dataset.group) : next.add(d.dataset.group);
                collapsedGroups = next;
                try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(collapsedGroups))); } catch (err) {}
            });
        });

        function applyGroupState(term) {
            groupEls.forEach((d) => { d.open = term ? true : !collapsedGroups.has(d.dataset.group); });
        }
```

Then change the search input listener near the top of the block from:

```js
        searchInput.addEventListener('input', (e) => performSearch(e.target.value));
```

to:

```js
        searchInput.addEventListener('input', (e) => {
            performSearch(e.target.value);
            applyGroupState(e.target.value.trim());
        });
```

Note: `applyGroupState` is a function declaration, so it is hoisted and may be referenced before its definition; `groupEls` is a `const` and is not — keep the listener change *after* the `groupEls` declaration in source order, or move the `groupEls` block up to just below `const searchInput = …`. Either is fine; the mock-up defines the search listener after the group block.

- [ ] **Step 6: Run the tests**

Run: `node tests/placemat.test.js`
Expected: all pass, including the two new ones.

- [ ] **Step 7: Manual check**

Run: `python3 -m http.server 8000` and open `http://localhost:8000/`. Check the four acceptance behaviours (counts visible, fold persists across reload, search opens, clear restores). Open DevTools console: no errors.

- [ ] **Step 8: Commit**

```bash
git add index.html placemat.css tests/placemat.test.js
git commit -m "feat: collapsible groups with row counts and remembered state"
```

---

### Task 3: Sticky section nav with per-card counts and Collapse/Expand all

**Goal:** A second sticky bar under the header: one chip per content card (title + row count, active while that card is in view), plus Collapse all / Expand all buttons.

**Files:**
- Modify: `index.html` (add `id` to each card, add the `<nav>`, add JS)
- Modify: `placemat.css`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] Each of the 8 content cards has an `id` (`card-keys`, `card-slash-core`, `card-slash-tools`, `card-cli`, `card-settings`, `card-env`, `card-skills`, `card-hooks`).
- [ ] `<nav class="section-nav" aria-label="Sections">` sits between `</header>` and `<div class="dashboard-grid">`, with one `<a href="#card-…">` per card containing an empty `<span class="chip-count"></span>` filled at load.
- [ ] Clicking a chip scrolls to the card with the card's top visible below both bars (`scroll-margin-top`).
- [ ] The chip for the top-most visible card carries `class="is-active"`.
- [ ] Collapse all / Expand all fold or unfold every group and persist the result.
- [ ] On viewports ≤ 700 px the nav still shows (chips scroll horizontally); the tool buttons are hidden.

**Verify:** `node tests/placemat.test.js` → all pass. Manual: scroll, watch the active chip change; click chips; Collapse all then reload — still collapsed.

**Steps:**

- [ ] **Step 1: Write the failing test**

Append inside the `// --- index.html ---` block:

```js
  test('index.html: section nav has one chip per content card, in card order', () => {
    const cardIds = Array.from(html.matchAll(/<div class="card" id="(card-[a-z-]+)">/g), (m) => m[1]);
    assert.ok(cardIds.length >= 8, `expected 8+ card ids, found ${cardIds.length}`);
    const nav = html.match(/<nav class="section-nav"[\s\S]*?<\/nav>/);
    assert.ok(nav, 'section-nav not found');
    const chipIds = Array.from(nav[0].matchAll(/href="#(card-[a-z-]+)"/g), (m) => m[1]);
    assert.deepStrictEqual(chipIds, cardIds, 'nav chips must match card ids and order');
    assert.ok(html.indexOf('<nav class="section-nav"') < html.indexOf('<div class="dashboard-grid">'), 'nav must precede the grid');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node tests/placemat.test.js`
Expected: `FAIL … expected 8+ card ids, found 0`.

- [ ] **Step 3: Give the cards ids**

Edit the eight `<div class="card">` openers that are followed by an `<h2>` (skip the legend strip, which is `<div class="card full-width search-exclude legend-strip">`):

| `<h2>` text | id |
|---|---|
| Keys & Shortcuts | `card-keys` |
| Slash Commands (Core) | `card-slash-core` |
| Slash Commands (Tools) | `card-slash-tools` |
| CLI & Headless Flags | `card-cli` |
| Settings (JSON) | `card-settings` |
| Environment Variables | `card-env` |
| Skills & Agent Frontmatter | `card-skills` |
| Memory, Hooks & MCP | `card-hooks` |

Each becomes e.g. `<div class="card" id="card-keys">`. Also add a count span to every card heading: `<h2>Keys & Shortcuts <span class="card-count"></span></h2>` (same for all eight).

- [ ] **Step 4: Add the nav markup**

Between `    </header>` and `    <div class="dashboard-grid">` insert:

```html
    <nav class="section-nav" aria-label="Sections">
        <div class="section-nav-inner">
            <div class="section-chips">
                <a href="#card-keys" data-target="card-keys">Keys &amp; Shortcuts<span class="chip-count"></span></a>
                <a href="#card-slash-core" data-target="card-slash-core">Slash (Core)<span class="chip-count"></span></a>
                <a href="#card-slash-tools" data-target="card-slash-tools">Slash (Tools)<span class="chip-count"></span></a>
                <a href="#card-cli" data-target="card-cli">CLI Flags<span class="chip-count"></span></a>
                <a href="#card-settings" data-target="card-settings">Settings<span class="chip-count"></span></a>
                <a href="#card-env" data-target="card-env">Env Vars<span class="chip-count"></span></a>
                <a href="#card-skills" data-target="card-skills">Skills &amp; Agents<span class="chip-count"></span></a>
                <a href="#card-hooks" data-target="card-hooks">Memory, Hooks &amp; MCP<span class="chip-count"></span></a>
            </div>
            <div class="section-tools">
                <button type="button" id="collapseAll">Collapse all</button>
                <button type="button" id="expandAll">Expand all</button>
            </div>
        </div>
    </nav>
```

- [ ] **Step 5: Add the CSS**

In `placemat.css`, change `body { padding: 64px 18px 24px; }` to `body { padding: 96px 18px 24px; }`. In the `@media (max-width: 700px)` block change `body { padding: 100px 12px 24px; }` to `body { padding: 140px 12px 24px; }`. Then add, after the `/* ---------- HEADER ---------- */` section (before `/* ---------- DASHBOARD GRID ---------- */`):

```css
/* ---------- SECTION NAV ---------- */
.section-nav {
    position: fixed;
    top: 52px; left: 0; width: 100%;
    z-index: 999;
    background: var(--header-bg);
    backdrop-filter: saturate(120%) blur(10px);
    -webkit-backdrop-filter: saturate(120%) blur(10px);
    border-bottom: 1px solid var(--border);
}
.section-nav-inner {
    max-width: 1900px;
    margin: 0 auto;
    padding: 6px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.section-chips {
    display: flex; gap: 6px;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
}
.section-chips::-webkit-scrollbar { display: none; }
.section-chips a {
    flex: 0 0 auto;
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--fg-muted);
    text-decoration: none;
    padding: 4px 9px;
    border: 1px solid var(--border);
    border-radius: 999px;
    transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease);
}
.section-chips a .chip-count { color: var(--fg-dim); font-size: 10px; }
.section-chips a:hover { color: var(--fg-main); border-color: var(--border-strong); }
.section-chips a.is-active { color: var(--coral); border-color: var(--coral); }
.section-chips a.is-active .chip-count { color: var(--coral-2); }
.section-tools { display: flex; gap: 6px; flex-shrink: 0; }
.section-tools button {
    background: none;
    border: 1px solid var(--border);
    color: var(--fg-muted);
    font-family: var(--font-mono);
    font-size: 10.5px;
    padding: 4px 9px;
    border-radius: var(--r-sm);
    cursor: pointer;
}
.section-tools button:hover { color: var(--fg-main); border-color: var(--teal); }
.section-tools button[aria-pressed="true"] { color: var(--teal-2); border-color: var(--teal); }
.card { scroll-margin-top: 100px; }
.card-count {
    margin-left: auto;
    font-family: var(--font-mono);
    font-weight: 400;
    font-size: 10px;
    color: var(--fg-dim);
    letter-spacing: 0;
}
@media (max-width: 700px) {
    .section-nav { top: 96px; }
    .section-tools { display: none; }
}
```

- [ ] **Step 6: Add the JS**

Inside the second `<script>` block, directly after the `applyGroupState` function from Task 2, add:

```js
        // --- SECTION NAV: counts, active chip, collapse/expand all ---
        const navChips = Array.from(document.querySelectorAll('.section-chips a'));
        navChips.forEach((a) => {
            const card = document.getElementById(a.dataset.target);
            if (!card) return;
            const n = card.querySelectorAll('.search-item').length;
            a.querySelector('.chip-count').textContent = n;
            const cc = card.querySelector('.card-count');
            if (cc) cc.textContent = n;
        });
        const cardObserver = new IntersectionObserver((entries) => {
            const visible = entries
                .filter((e) => e.isIntersecting)
                .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (!visible.length) return;
            navChips.forEach((a) => a.classList.toggle('is-active', a.dataset.target === visible[0].target.id));
        }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
        navChips.forEach((a) => { const c = document.getElementById(a.dataset.target); if (c) cardObserver.observe(c); });

        function setAllGroups(open) {
            collapsedGroups = new Set(open ? [] : groupEls.map((d) => d.dataset.group));
            try { localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Array.from(collapsedGroups))); } catch (err) {}
            groupEls.forEach((d) => { d.open = open; });
        }
        document.getElementById('collapseAll').addEventListener('click', () => setAllGroups(false));
        document.getElementById('expandAll').addEventListener('click', () => setAllGroups(true));
```

Because `setAllGroups` writes `collapsedGroups` and the storage key itself, the per-group `toggle` handler from Task 2 does not need to run for each group; it will fire but finds the state already consistent.

- [ ] **Step 7: Run tests and check manually**

Run: `node tests/placemat.test.js` → all pass. Serve and check: chips show counts, the active chip follows scrolling, Collapse all persists across reload, the mobile width (DevTools device toolbar at 390 px) shows the chip row scrolling horizontally under the two-row header.

- [ ] **Step 8: Commit**

```bash
git add index.html placemat.css tests/placemat.test.js
git commit -m "feat: sticky section nav with counts, collapse/expand all"
```

---

### Task 4: Compact density toggle

**Goal:** A `Compact` button in the section-tools that tightens type, padding, and the first-column width; remembered in `localStorage`.

**Files:**
- Modify: `index.html` (button + JS)
- Modify: `placemat.css`

**Acceptance Criteria:**
- [ ] `<button type="button" id="densityBtn" aria-pressed="false">Compact</button>` is the last child of `.section-tools`.
- [ ] Clicking it adds `density-compact` to `<body>`, sets `aria-pressed="true"`, and stores `placemat-density=compact`; clicking again reverts.
- [ ] Page height in compact mode at 1440 px is at least 15 % lower than comfortable (mock-up: 12,758 → 10,439 px).

**Verify:** Manual, plus `node tests/placemat.test.js` still passes.

**Steps:**

- [ ] **Step 1: Add the button**

In the nav markup from Task 3, after the Expand all button add:

```html
                <button type="button" id="densityBtn" aria-pressed="false">Compact</button>
```

- [ ] **Step 2: Add the CSS**

At the end of the `/* ---------- SECTION NAV ---------- */` section in `placemat.css`:

```css
/* compact density */
body.density-compact { font-size: 12.5px; }
body.density-compact td { padding: 2px 5px 2px; }
body.density-compact td:first-child { width: 38%; }
body.density-compact .desc { font-size: 11px; line-height: 1.3; }
body.density-compact code { font-size: 10.5px; }
body.density-compact .card { padding: 10px 12px 8px; }
body.density-compact .dashboard-grid {
    gap: 10px;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}
```

- [ ] **Step 3: Add the JS**

After the section-nav JS from Task 3:

```js
        // --- DENSITY TOGGLE ---
        (function initDensity() {
            const KEY = 'placemat-density';
            const btn = document.getElementById('densityBtn');
            const apply = (compact) => {
                document.body.classList.toggle('density-compact', compact);
                btn.setAttribute('aria-pressed', String(compact));
            };
            let compact = false;
            try { compact = localStorage.getItem(KEY) === 'compact'; } catch (err) {}
            apply(compact);
            btn.addEventListener('click', () => {
                compact = !compact;
                apply(compact);
                try { localStorage.setItem(KEY, compact ? 'compact' : 'comfortable'); } catch (err) {}
            });
        })();
```

- [ ] **Step 4: Verify and commit**

Run: `node tests/placemat.test.js` → all pass. Serve, toggle, reload: state persists.

```bash
git add index.html placemat.css
git commit -m "feat: compact density toggle"
```

---

### Task 5: Template bump, changelog entry, docs

**Goal:** Record this as Template v1.2 per `AGENTS.md` Versioning rules and tell the bot about the new structure.

**Files:**
- Modify: `index.html` (footer, `<title>` unchanged)
- Modify: `changelog.html` (new Template v1.2 block at the top of `.container`)
- Modify: `AGENTS.md` (Style Guide + Content Rules)

**Acceptance Criteria:**
- [ ] `index.html` footer reads `Template v1.2 | <current month year>`.
- [ ] `changelog.html` has a `<div class="version-block">` with `<h2>Template v1.2 …` above the existing v1.1 block, containing a **Template/Structure** section with the entries below.
- [ ] `AGENTS.md` Style Guide documents: groups are `<details class="search-group">`, counts are computed in JS, the eight card ids, the three `localStorage` keys (`placemat-collapsed`, `placemat-density`, plus the existing `placemat-theme`, `placemat-seen-version`).
- [ ] `AGENTS.md` Content Rules tells the bot: new rows go inside the `<table>` of the matching `<details>`; managed/enterprise-only JSON settings go in `Managed & Enterprise`; never hand-write counts.

**Verify:** `node tests/placemat.test.js` passes; `changelog.html` still parses in a browser with the theme toggle working.

**Steps:**

- [ ] **Step 1: Footer**

In `index.html` change `Template v1.1 | March 2026<br>` to `Template v1.2 | September 2026<br>` (use the actual month you ship).

- [ ] **Step 2: Changelog block**

In `changelog.html`, directly after `<div class="container">` and before `<!-- Template v1.1 -->`, insert:

```html
        <!-- Template v1.2 -->
        <div class="version-block">
            <h2>Template v1.2 <span class="version-date">2026-09-XX — As of CC v2.1.263</span></h2>
            <div class="change-section">
                <h3>Template / Structure</h3>
                <ul class="change-list">
                    <li><span class="tag tag-change">CHG</span>Split <code>Config &amp; Environment</code> into <code>Settings (JSON)</code> and <code>Environment Variables</code> cards; managed/enterprise-only settings moved to a <code>Managed &amp; Enterprise</code> group</li>
                    <li><span class="tag tag-add">ADD</span>Every group is collapsible (<code>&lt;details&gt;</code>) with a row count; folded state is remembered per browser</li>
                    <li><span class="tag tag-add">ADD</span>Sticky section nav under the header with per-card row counts, active-section highlight, and Collapse all / Expand all</li>
                    <li><span class="tag tag-add">ADD</span>Compact density toggle</li>
                </ul>
            </div>
        </div>
```

Replace `2026-09-XX` with the ship date. Move the existing CC-release month groups into this new block only if the project decides the CC entries should live under the newest template block (that is the existing convention: v1.1 holds every CC release since March). Simplest correct choice: leave the CC month groups under v1.1 and let the bot start adding new months under v1.2 — document that choice in `AGENTS.md`.

- [ ] **Step 3: AGENTS.md**

Under `## Style Guide` add:

```markdown
- Groups are `<details class="search-group" open data-group="<Title>">` with a `<summary><h3>…</h3><span class="group-count"></span></summary>`; counts are filled by JS at load — never hand-write them
- The eight content cards have fixed ids used by the section nav: `card-keys`, `card-slash-core`, `card-slash-tools`, `card-cli`, `card-settings`, `card-env`, `card-skills`, `card-hooks`
- `localStorage` keys: `placemat-theme`, `placemat-seen-version`, `placemat-collapsed` (JSON array of folded group titles), `placemat-density` (`compact` | `comfortable`)
```

Under `## Content Rules` add:

```markdown
- New rows go inside the `<table>` of the matching `<details class="search-group">`; when adding a group, copy an existing `<details>` block including its `<summary>`
- JSON settings that only apply in managed/enterprise policy files go in the `Managed & Enterprise` group of the Settings (JSON) card, not in `Key JSON Settings`
- CC-release changelog months are added under the newest Template block in `changelog.html`
```

- [ ] **Step 4: Verify and commit**

Run: `node tests/placemat.test.js` → all pass. Open `changelog.html` locally and confirm the new block renders.

```bash
git add index.html changelog.html AGENTS.md
git commit -m "docs: template v1.2 — record nav/collapse structure and bot rules"
```

---

## Optional follow-ups (not in this plan)

- Add a `Subcommands` group to the CLI card for `claude agents`, `claude project purge`, `claude ultrareview`, `claude --bg --exec` (currently mixed into `Core Execution`).
- Split `Built-in Skills & Locations` into `Bundled Skills` and `Skill Locations`.
- Fold `Session Picker Nav` keys into the `/resume` row's notes once Plan 04 (two-tier entries) lands.

## Self-review notes

- Spec coverage: split card (T1), collapsible groups + counts + persistence + search interplay (T2), sticky nav + active state + collapse/expand all (T3), density (T4), template bump + bot rules (T5). Mobile behaviour is in T3 CSS.
- Names used consistently: `groupEls`, `collapsedGroups`, `COLLAPSED_KEY`, `applyGroupState`, `setAllGroups`, `navChips`, ids `card-*`, classes `group-count`, `card-count`, `chip-count`, `section-nav`, `section-chips`, `section-tools`, `density-compact`.
- The two-script-block test constraint is respected: all JS goes into the existing second `<script>`.
