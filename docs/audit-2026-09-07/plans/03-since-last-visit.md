# "Since Your Last Visit" Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-release "What's New" modal with a personal changes feed: a strip that says how many releases and changes landed since the reader's last visit, row highlighting for exactly those changes, a drawer that lists them and jumps to each row, and an Atom feed for people who would rather subscribe.

**Architecture:** `changelog.html` stays the human-authored source of truth. A zero-dependency script `scripts/build-changes.js` derives `changes.json` (one object per CC release, one entry per bullet) and `feed.xml` (Atom) from it; the bot runs the script on every sync and a test fails CI if the derived files are stale. `index.html` fetches `changes.json`, compares the stored `placemat-seen-version` with the header release tag, and renders the strip, the row highlights (reusing the existing `code.new` style), and the drawer. The old modal and its `whatsNewData` block are removed.

**Tech Stack:** Vanilla HTML/CSS/JS; Node 20 for the generator (no npm packages); `node tests/placemat.test.js`.

**Reference mock-up:** `docs/audit-2026-09-07/mockups/03-since-last-visit.html` (inline data instead of `fetch`, plus a "Simulate last visit" control that is mock-only). `mockups/changes.json` and `mockups/feed.xml` show the exact output the generator must produce.

**Depends on:** Plan 02 Task 1 (row ids) is strongly recommended so the drawer can link to rows by id; the matcher below falls back to text matching if ids are absent.

**Handoff to Dom (outside this repo):** the cloud routine that opens the daily PR must gain one step — run `node scripts/build-changes.js` after editing `changelog.html` — and must stop editing `whatsNewData`. Until that happens, CI will flag the stale `changes.json` on the bot's PR and a human can run the script. Put this in the PR description of the PR that lands this plan.

---

### Task 1: Release anchors in `changelog.html`

**Goal:** Every CC release heading gets a stable id so the feed and the drawer can link to it.

**Files:**
- Modify: `changelog.html` (every `<h3>CC v…`)
- Modify: `AGENTS.md`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] Every `<h3>CC v2.1.NNN …</h3>` (single or ranged) is `<h3 id="cc-v2-1-NNN">…` where NNN is the **last** version in a range (`CC v2.1.122–v2.1.123` → `cc-v2-1-123`).
- [ ] Ids are unique.

**Verify:** `node tests/placemat.test.js` → all pass.

**Steps:**

- [ ] **Step 1: Failing test** (append inside the `// --- changelog.html ---` block)

```js
  test('changelog.html: every CC release heading has an id cc-v…', () => {
    const heads = html.match(/<h3[^>]*>CC v[\d.]+(?:–v[\d.]+)? <span class="version-date">/g) || [];
    assert.ok(heads.length > 50, `only ${heads.length} release headings found`);
    const ids = heads.map((h) => (h.match(/ id="(cc-v[\d-]+)"/) || [])[1]);
    assert.strictEqual(ids.filter((x) => !x).length, 0, 'release heading without id');
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate release ids');
  });
```

- [ ] **Step 2: Run** → `FAIL … release heading without id`.

- [ ] **Step 3: One-off script** `/tmp/release-ids.js`:

```js
const fs = require('fs');
const p = 'changelog.html';
let html = fs.readFileSync(p, 'utf8');
let n = 0;
html = html.replace(/<h3>CC (v[\d.]+(?:–v[\d.]+)?) <span class="version-date">/g, (m, ver) => {
  const last = ver.split('–').pop();
  n++;
  return `<h3 id="cc-${last.replace(/\./g, '-')}">CC ${ver} <span class="version-date">`;
});
fs.writeFileSync(p, html);
console.log('ids added to', n, 'release headings');
```

Run `node /tmp/release-ids.js` (expect ~101), then `rm /tmp/release-ids.js`.

- [ ] **Step 4: Bot rule** — in `AGENTS.md` Content Rules add: `- Release headings in changelog.html are <h3 id="cc-v2-1-NNN">CC v2.1.NNN <span class="version-date">…</span></h3>; ranged headings use the last version for the id`.

- [ ] **Step 5: Test + commit**

```bash
node tests/placemat.test.js
git add changelog.html AGENTS.md tests/placemat.test.js
git commit -m "feat: stable ids on changelog release headings"
```

---

### Task 2: `scripts/build-changes.js` → `changes.json` + `feed.xml`

**Goal:** Deterministically derive the machine-readable feed from `changelog.html`, and make CI fail when it is stale.

**Files:**
- Create: `scripts/build-changes.js`
- Create: `changes.json`, `feed.xml` (generated, committed — GitHub Pages serves them)
- Modify: `.github/workflows/html-validate.yml` (run the generator in check mode)
- Modify: `AGENTS.md` (pipeline step), `README.md` (one line)
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `node scripts/build-changes.js` writes `changes.json` with shape `{ generated, latest, releases: [{ version, label, date, id, entries: [{ tag, item, html }] }] }`, newest release first, and `feed.xml` (Atom, newest 20 releases).
- [ ] `node scripts/build-changes.js --check` exits 1 with a message if the committed files differ from what it would write, 0 otherwise.
- [ ] `tag` is one of `ADD | CHG | DEL | FIX`; `item` is the text of the entry's first `<code>` (entities decoded) or `null`; `html` is the entry's inner HTML after the tag span, trimmed.
- [ ] A test asserts `changes.json` parses, its `latest` equals the first `id`'s version in `changelog.html`, and every `version` in it is unique.

**Verify:** `node scripts/build-changes.js --check` → `changes.json and feed.xml are up to date`; `node tests/placemat.test.js` → all pass.

**Steps:**

- [ ] **Step 1: Failing test** (new block at the end of `tests/placemat.test.js`, before the summary `console.log`)

```js
// --- changes.json ---
{
  test('changes.json: parses and matches the newest changelog release', () => {
    const changelog = read('changelog.html');
    const data = JSON.parse(read('changes.json'));
    assert.ok(Array.isArray(data.releases) && data.releases.length > 50, 'too few releases');
    const newest = changelog.match(/<h3 id="cc-(v[\d-]+)">/)[1].replace(/-/g, '.');
    assert.strictEqual(data.releases[0].version, newest, 'changes.json is stale — run node scripts/build-changes.js');
    assert.strictEqual(data.latest, newest);
    const versions = data.releases.map((r) => r.version);
    assert.strictEqual(new Set(versions).size, versions.length, 'duplicate versions');
    data.releases.forEach((r) => r.entries.forEach((e) => assert.ok(['ADD', 'CHG', 'DEL', 'FIX'].includes(e.tag), `bad tag ${e.tag}`)));
  });

  test('feed.xml: is Atom with a self link and at least one entry', () => {
    const xml = read('feed.xml');
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom">'));
    assert.ok(xml.includes('<link rel="self" href="https://dommango.github.io/claude-code-placemat/feed.xml"/>'));
    assert.ok((xml.match(/<entry>/g) || []).length >= 1);
  });
}
```

- [ ] **Step 2: Run** → both FAIL (`ENOENT … changes.json`).

- [ ] **Step 3: Write the generator** `scripts/build-changes.js`

```js
#!/usr/bin/env node
// Derive changes.json and feed.xml from changelog.html. Zero dependencies.
// Usage: node scripts/build-changes.js          # write both files
//        node scripts/build-changes.js --check  # exit 1 if committed files are stale
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://dommango.github.io/claude-code-placemat/';
const TAGS = { 'tag-add': 'ADD', 'tag-change': 'CHG', 'tag-remove': 'DEL', 'tag-fix': 'FIX' };

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseChangelog(html) {
  const releases = [];
  const sectionRe = /<h3 id="(cc-v[\d-]+)">CC (v[\d.]+(?:–v[\d.]+)?) <span class="version-date">([^<]+)<\/span><\/h3>\s*<ul class="change-list">([\s\S]*?)<\/ul>/g;
  let m;
  while ((m = sectionRe.exec(html))) {
    const [, id, label, date, body] = m;
    const entries = [];
    const liRe = /<li><span class="tag (tag-\w+)">\w+<\/span>([\s\S]*?)<\/li>/g;
    let li;
    while ((li = liRe.exec(body))) {
      const inner = li[2].trim();
      const code = (inner.match(/<code>(.*?)<\/code>/) || [])[1];
      entries.push({ tag: TAGS[li[1]] || 'ADD', item: code ? decode(code) : null, html: inner });
    }
    releases.push({ version: label.split('–').pop(), label, date: date.trim(), id, entries });
  }
  return releases;
}

function buildJson(releases) {
  return JSON.stringify({ generated: releases[0].date, latest: releases[0].version, releases }, null, 1) + '\n';
}

function buildFeed(releases) {
  const entries = releases.slice(0, 20).map((rel) => `  <entry>
    <title>Claude Code ${escapeXml(rel.label)} — ${rel.entries.length} placemat change${rel.entries.length === 1 ? '' : 's'}</title>
    <id>${SITE}changelog.html#${rel.id}</id>
    <link href="${SITE}changelog.html#${rel.id}"/>
    <updated>${rel.date}T09:00:00Z</updated>
    <content type="html">${escapeXml('<ul>' + rel.entries.map((e) => `<li><b>${e.tag}</b> ${e.html}</li>`).join('') + '</ul>')}</content>
  </entry>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Claude Code Placemat — changes</title>
  <link href="${SITE}"/>
  <link rel="self" href="${SITE}feed.xml"/>
  <id>${SITE}</id>
  <updated>${releases[0].date}T09:00:00Z</updated>
${entries}
</feed>
`;
}

function main() {
  const html = fs.readFileSync(path.join(ROOT, 'changelog.html'), 'utf8');
  const releases = parseChangelog(html);
  if (!releases.length) { console.error('No release sections found — are the <h3 id="cc-…"> anchors present?'); process.exit(1); }
  const outputs = { 'changes.json': buildJson(releases), 'feed.xml': buildFeed(releases) };
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [name, content] of Object.entries(outputs)) {
    const file = path.join(ROOT, name);
    if (check) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (current !== content) { stale = true; console.error(`${name} is stale — run: node scripts/build-changes.js`); }
    } else {
      fs.writeFileSync(file, content);
      console.log(`wrote ${name} (${releases.length} releases, ${releases.reduce((a, r) => a + r.entries.length, 0)} entries)`);
    }
  }
  if (check) { if (stale) process.exit(1); console.log('changes.json and feed.xml are up to date'); }
}

main();
```

Run: `node scripts/build-changes.js` → `wrote changes.json (…)`, `wrote feed.xml (…)`. Then `node scripts/build-changes.js --check` → up to date.

- [ ] **Step 4: CI** — in `.github/workflows/html-validate.yml`, in the `test` job after the "Run structural/regression tests" step add:

```yaml
      - name: changes.json / feed.xml are up to date
        run: node scripts/build-changes.js --check
```

Also add `scripts/**`, `changes.json`, and `feed.xml` to both `paths:` lists at the top of the workflow.

- [ ] **Step 5: Docs** — in `AGENTS.md` "Automated Update Pipeline", replace the sub-bullet `Updates changelog.html with new entries under current template version` with two bullets:

```markdown
   - Updates `changelog.html` with new entries under the current template version (each release `<h3>` carries `id="cc-v2-1-NNN"`)
   - Runs `node scripts/build-changes.js` to regenerate `changes.json` and `feed.xml` (CI fails if they are stale)
```

and delete the sentence about the What's New popup data from `README.md` step 3 (replace with "Updates `index.html`, `changelog.html`, and regenerates `changes.json` / `feed.xml`").

- [ ] **Step 6: Test + commit**

```bash
node tests/placemat.test.js
git add scripts/build-changes.js changes.json feed.xml .github/workflows/html-validate.yml AGENTS.md README.md tests/placemat.test.js
git commit -m "feat: derive changes.json and Atom feed from changelog.html"
```

---

### Task 3: The strip, the highlights and the drawer in `index.html`

**Goal:** On load, fetch `changes.json`, compare with `placemat-seen-version`, and render the personal feed. Remove the old modal.

**Files:**
- Modify: `index.html` (legend text; header RSS link + `<link rel="alternate">`; strip markup; drawer markup; JS)
- Modify: `placemat.css`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] The `<script type="application/json" id="whatsNewData">` block and the `initWhatsNew` IIFE are gone; the tests that referenced them are replaced (Step 1).
- [ ] `<head>` has `<link rel="alternate" type="application/atom+xml" title="Claude Code Placemat changes" href="feed.xml">`; the header has `<a href="feed.xml" class="header-link" title="Subscribe to placemat changes (RSS)">RSS</a>` after the Changelog link.
- [ ] The legend's second item reads `New since your last visit` and gets the stored version appended at runtime (`New since your last visit (v2.1.258)`); on a first visit it reads `New in the last 3 releases`.
- [ ] Returning visitor with `placemat-seen-version` < header version: strip shows `<b>N releases · M changes</b> since your last visit <code>vOLD</code> → <code>vNEW</code>; K entries highlighted below`; every row matched to an entry has `class="new"` on its first chip; rows not matched to any entry do **not** carry `new`.
- [ ] First visit (no stored version): strip shows a welcome line and the last 3 releases are highlighted.
- [ ] Same version stored: no strip, no highlights.
- [ ] "Show changes" opens the drawer (`aside#sinceDrawer`), which lists releases newest-first with tag chips; clicking an entry scrolls its row into view and flashes it; `Esc` closes.
- [ ] "Mark as read" / "Mark all as read" store the header version and re-render (strip disappears, highlights clear).
- [ ] If `fetch('changes.json')` fails (file://, offline), nothing renders and there are no console errors beyond one `console.warn`.
- [ ] Bot-side: the `new` class is no longer written into the HTML by the bot (see Task 4); the runtime owns it.

**Verify:** `node tests/placemat.test.js` → all pass. Manual: serve with `python3 -m http.server 8000`; in DevTools run `localStorage.setItem('placemat-seen-version','v2.1.258')` and reload; check the strip, highlights, drawer, mark-as-read.

**Steps:**

- [ ] **Step 1: Replace the modal tests**

In `tests/placemat.test.js` delete the two tests `whatsNewData JSON block parses` and `whatsNewData script tag appears before the script that reads it`. Add inside the `// --- index.html ---` block:

```js
  test('index.html: What\'s New modal is gone; since-strip and drawer are present', () => {
    assert.ok(!html.includes('id="whatsNewData"'), 'whatsNewData block still present');
    assert.ok(!html.includes('initWhatsNew'), 'initWhatsNew still present');
    assert.ok(html.includes('id="sinceStrip"') && html.includes('id="sinceDrawer"'));
    assert.ok(/<link rel="alternate" type="application\/atom\+xml"[^>]*href="feed\.xml">/.test(html));
    assert.ok(html.indexOf('id="sinceDrawer"') < html.indexOf("fetch('changes.json')"), 'drawer markup must precede the script that uses it');
  });

  test('index.html: version comparison helper orders v2.1.9 < v2.1.10 < v2.2.0', () => {
    const fn = html.match(/const versionNumber = \(v\) => (.*?);\n/);
    assert.ok(fn, 'versionNumber not found');
    const num = new Function('return (v) => ' + fn[1])();
    assert.ok(num('v2.1.9') < num('v2.1.10'));
    assert.ok(num('v2.1.263') < num('v2.2.0'));
  });
```

Also update the test `has exactly 2 bare <script> blocks` — it stays at 2 (the JSON block was `type="application/json"`, never counted).

- [ ] **Step 2: Run** → the new tests FAIL.

- [ ] **Step 3: Remove the modal**

Delete the `<script type="application/json" id="whatsNewData"> … </script>` block and the whole `(function initWhatsNew() { … })();` IIFE (with its `// --- WHAT'S NEW POPUP LOGIC ---` comment). Leave the `.whats-new-*` CSS in `placemat.css` for now; the drawer reuses `.whats-new-close`.

- [ ] **Step 4: Markup**

In `<head>` after the stylesheet link:

```html
    <link rel="alternate" type="application/atom+xml" title="Claude Code Placemat changes" href="feed.xml">
```

Header: after `<a href="changelog.html" class="header-link">Changelog →</a>` add

```html
            <a href="feed.xml" class="header-link" title="Subscribe to placemat changes (RSS)">RSS</a>
```

Legend: change `<span class="legend-swatch swatch-new"></span> New (recent release)` to `<span class="legend-swatch swatch-new"></span> <span id="legendNew">New since your last visit</span>`.

Strip — insert as the first child of the grid, immediately after `<div class="dashboard-grid">` (or `<main class="dashboard-grid">` if Plan 02 landed):

```html
        <div class="card full-width search-exclude since-strip" id="sinceStrip" hidden>
            <div class="since-row">
                <span class="since-dot" aria-hidden="true"></span>
                <span class="since-text" id="sinceText"></span>
                <span class="since-actions">
                    <button type="button" id="sinceShow">Show changes</button>
                    <button type="button" id="sinceRead" class="quiet">Mark as read</button>
                </span>
            </div>
        </div>
```

Drawer — insert immediately **before** the second `<script>` (so it exists when the script runs):

```html
    <aside class="since-drawer" id="sinceDrawer" hidden aria-label="Changes since your last visit">
        <div class="since-drawer-head">
            <h2 id="sinceDrawerTitle">Since your last visit</h2>
            <button type="button" class="whats-new-close" id="sinceClose" aria-label="Close">&times;</button>
        </div>
        <div class="since-drawer-body" id="sinceBody"></div>
        <div class="since-drawer-foot">
            <button type="button" id="sinceReadAll">Mark all as read</button>
            <a href="feed.xml">RSS</a> · <a href="changes.json">changes.json</a> · <a href="changelog.html">Full changelog</a>
        </div>
    </aside>
```

- [ ] **Step 5: CSS** (append to `placemat.css`, replacing nothing)

```css
/* ---------- SINCE YOUR LAST VISIT ---------- */
.since-strip { padding: 8px 16px; border-color: var(--teal); background: var(--new-bg); }
.since-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12.5px; }
.since-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 3px var(--new-bg); flex-shrink: 0; }
.since-text b { color: var(--fg-main); }
.since-text code { cursor: default; }
.since-actions { margin-left: auto; display: flex; gap: 6px; }
.since-actions button, .since-drawer-foot button {
    background: var(--teal); color: #0a0a0a;
    border: 1px solid var(--teal);
    font-family: var(--font-mono); font-size: 10.5px;
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 4px 10px; border-radius: var(--r-sm); cursor: pointer;
}
.since-actions button.quiet { background: none; color: var(--fg-muted); border-color: var(--border-strong); }
.since-actions button.quiet:hover { color: var(--fg-main); border-color: var(--teal); }

.since-drawer {
    position: fixed; top: 52px; right: 0; bottom: 0;
    width: min(440px, 100vw);
    background: var(--bg-card-2);
    border-left: 1px solid var(--border-strong);
    z-index: 1002;
    display: flex; flex-direction: column;
    box-shadow: -12px 0 40px rgba(0,0,0,0.35);
    animation: drawerIn 0.2s var(--ease);
}
.since-drawer[hidden] { display: none; }
@keyframes drawerIn { from { transform: translateX(24px); opacity: 0; } to { transform: none; opacity: 1; } }
.since-drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid var(--border); }
.since-drawer-head h2 { margin: 0; font-size: 12px; font-weight: 700; color: var(--coral); text-transform: uppercase; letter-spacing: 0.1em; }
.since-drawer-body { overflow-y: auto; padding: 8px 16px; flex: 1; }
.since-release { margin: 10px 0 14px; }
.since-release h3 { margin: 0 0 6px; font-family: var(--font-mono); font-size: 10.5px; color: var(--teal); text-transform: uppercase; letter-spacing: 0.08em; display: flex; gap: 8px; align-items: baseline; }
.since-release h3 span { color: var(--fg-dim); font-weight: 400; text-transform: none; letter-spacing: 0; }
.since-release ul { list-style: none; margin: 0; padding: 0; }
.since-release li { display: grid; grid-template-columns: 36px 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px dotted var(--border); font-size: 12px; line-height: 1.4; color: var(--fg-main); cursor: pointer; }
.since-release li:hover { background: var(--row-hover); }
.since-release li.unlinked { color: var(--fg-muted); cursor: default; }
.since-release li .tag { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; padding: 2px 0; border-radius: var(--r-xs); text-align: center; align-self: start; text-transform: uppercase; }
.since-release li .tag-add    { background: rgba(135,157,134,0.16); color: var(--teal-2); border: 1px solid var(--teal); }
.since-release li .tag-change { background: rgba(245,158,11,0.10);  color: #fbbf24;        border: 1px solid #f59e0b; }
.since-release li .tag-remove { background: rgba(239,68,68,0.10);   color: #f87171;        border: 1px solid #ef4444; }
.since-release li .tag-fix    { background: rgba(96,165,250,0.10);  color: #60a5fa;        border: 1px solid #3b82f6; }
.since-drawer-foot { padding: 10px 16px; border-top: 1px solid var(--border); font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-dim); display: flex; gap: 12px; align-items: center; }
.since-drawer-foot a { color: var(--teal); text-decoration: none; }
.search-item { scroll-margin-top: 70px; }
.search-item.flash { animation: rowFlash 1.6s ease-out; }
@keyframes rowFlash { 0%, 40% { background: var(--success-flash); } 100% { background: transparent; } }
@media (max-width: 700px) { .since-drawer { top: 96px; } }
```

- [ ] **Step 6: JS** — append inside the second `<script>` block (at the end, where `initWhatsNew` used to be):

```js
        // --- SINCE YOUR LAST VISIT ---
        const versionNumber = (v) => v.replace(/^v/, '').split('.').map(Number).reduce((a, b) => a * 1000 + b, 0);
        (async function initSince() {
            const SEEN_KEY = 'placemat-seen-version';
            const current = (document.querySelector('.release-tag').textContent.match(/v[\d.]+/) || [])[0];
            if (!current) return;
            let data;
            try {
                const res = await fetch('changes.json');
                if (!res.ok) throw new Error(res.status);
                data = await res.json();
            } catch (err) { console.warn('changes.json unavailable:', err.message); return; }

            const tagClass = { ADD: 'tag-add', CHG: 'tag-change', DEL: 'tag-remove', FIX: 'tag-fix' };
            const rows = Array.from(document.querySelectorAll('.search-item'));
            const byCode = new Map();
            rows.forEach((r) => r.querySelectorAll('td:first-child code').forEach((c) => {
                const k = c.innerText.trim();
                if (!byCode.has(k)) byCode.set(k, r);
            }));
            const findRow = (entry) => {
                if (entry.row) return document.getElementById(entry.row) || null;   // optional explicit id from the bot
                const item = entry.item;
                if (!item) return null;
                if (byCode.has(item)) return byCode.get(item);
                for (const [k, r] of byCode) if (k.startsWith(item + ' ') || k.startsWith(item + '=')) return r;
                for (const [k, r] of byCode) if (k.includes(item)) return r;
                return null;
            };

            const strip = document.getElementById('sinceStrip');
            const text = document.getElementById('sinceText');
            const drawer = document.getElementById('sinceDrawer');
            const body = document.getElementById('sinceBody');
            const title = document.getElementById('sinceDrawerTitle');
            const legend = document.getElementById('legendNew');

            function render() {
                let seen = null;
                try { seen = localStorage.getItem(SEEN_KEY); } catch (err) {}
                rows.forEach((r) => r.querySelectorAll('td:first-child code.new').forEach((c) => c.classList.remove('new')));
                let releases;
                if (!seen) releases = data.releases.slice(0, 3);
                else if (versionNumber(seen) < versionNumber(current)) {
                    releases = data.releases.filter((rel) => versionNumber(rel.version) > versionNumber(seen) && versionNumber(rel.version) <= versionNumber(current));
                } else releases = [];
                const n = releases.reduce((a, r) => a + r.entries.length, 0);
                legend.textContent = seen ? `New since your last visit (${seen})` : 'New in the last 3 releases';
                if (!n) { strip.hidden = true; drawer.hidden = true; return; }
                const linked = new Set();
                releases.forEach((rel) => rel.entries.forEach((e) => {
                    const r = findRow(e);
                    if (r) { r.querySelector('td:first-child code').classList.add('new'); linked.add(r); }
                }));
                text.innerHTML = seen
                    ? `<b>${releases.length} release${releases.length === 1 ? '' : 's'} · ${n} change${n === 1 ? '' : 's'}</b> since your last visit <code>${seen}</code> → <code>${current}</code>; ${linked.size} entries highlighted below`
                    : `<b>Welcome.</b> ${n} changes across the last ${releases.length} releases are highlighted; next time you will see only what changed since today`;
                strip.hidden = false;
                title.textContent = seen ? `Since ${seen}` : 'Recent changes';
                body.innerHTML = releases.map((rel) => `<section class="since-release"><h3>CC ${rel.label} <span>${rel.date}</span></h3><ul>` +
                    rel.entries.map((e) => {
                        const r = findRow(e);
                        return `<li${r ? ` data-row="${r.id}"` : ' class="unlinked"'}><span class="tag ${tagClass[e.tag] || 'tag-add'}">${e.tag}</span><span>${e.html}</span></li>`;
                    }).join('') + '</ul></section>').join('');
            }
            render();

            const markRead = () => { try { localStorage.setItem(SEEN_KEY, current); } catch (err) {} render(); };
            document.getElementById('sinceShow').addEventListener('click', () => { drawer.hidden = false; });
            document.getElementById('sinceClose').addEventListener('click', () => { drawer.hidden = true; });
            document.getElementById('sinceRead').addEventListener('click', markRead);
            document.getElementById('sinceReadAll').addEventListener('click', markRead);
            body.addEventListener('click', (e) => {
                const li = e.target.closest('li[data-row]');
                if (!li) return;
                const r = document.getElementById(li.dataset.row);
                if (!r) return;
                r.scrollIntoView({ block: 'center', behavior: 'smooth' });
                r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
            });
            window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) drawer.hidden = true; });
        })();
```

Note on `findRow`: the drawer's `li` uses `data-row` (the row id from Plan 02). Without Plan 02, rows have no ids — add `id`s first (Plan 02 Task 1) or the click-to-jump silently does nothing.

- [ ] **Step 7: Tests, manual, commit**

`node tests/placemat.test.js` → all pass. Serve and walk the acceptance list (returning visitor, first visit, same version, mark as read, drawer jump, Esc).

```bash
git add index.html placemat.css tests/placemat.test.js
git commit -m "feat: personal since-your-last-visit strip, highlights and drawer; remove What's New modal"
```

---

### Task 4: Retire the bot-written `new` class

**Goal:** The runtime now decides what is "new" per reader, so the bot stops adding/demoting `class="new"` and `<!-- added:vX -->` comments.

**Files:**
- Modify: `AGENTS.md` (Content Rules + Pipeline), `.github/PULL_REQUEST_TEMPLATE.md` (if it lists the demotion check), `index.html` (strip existing `class="new"` and `<!-- added:… -->`)

**Acceptance Criteria:**
- [ ] `grep -c 'class="new"' index.html` → 0; `grep -c 'added:v' index.html` → 0.
- [ ] `AGENTS.md` no longer instructs marking new items with the `new` class or demoting after 3 releases; it says: "`new` shading is applied at runtime from `changes.json`; do not write it into the HTML."
- [ ] The `unverified` rule is unchanged.

**Steps:**

- [ ] **Step 1:** `sed -i 's/ class="new"//g; s/ <!-- added:v[0-9.]* -->//g' index.html` then check `git diff --stat` touches only `index.html` and the diff contains only those removals.
- [ ] **Step 2:** In `AGENTS.md` Style Guide replace the `Teal-tinted bg (code.new): new in recent release` bullet with `Teal-tinted bg (code.new): changed since this reader's last visit — applied at runtime from changes.json`. In Content Rules delete `Mark new items (recent release) with the new class — remove after 3+ versions` and add `Do not write class="new" or <!-- added:… --> into index.html; the page computes "new" per visitor from changes.json`. In the Pipeline list delete the two sub-bullets about marking/demoting and the one about `whatsNewData`.
- [ ] **Step 3:** Commit: `git commit -am "chore: retire bot-written new class; runtime owns it"`.

---

### Task 5: Changelog entry

Add under the newest Template block's Template/Structure list:

```html
                    <li><span class="tag tag-add">ADD</span>"Since your last visit" strip and drawer — every change since the version you last saw is listed and highlighted; <code>changes.json</code> and an Atom <code>feed.xml</code> are published on every sync</li>
                    <li><span class="tag tag-remove">DEL</span>What's New modal (only ever showed the newest release)</li>
```

```bash
git add changelog.html && node scripts/build-changes.js && git add changes.json feed.xml
git commit -m "docs: changelog entry for the since-your-last-visit feed"
```

(The generator ignores the Template/Structure sections because they have no `cc-` id, so `changes.json` will not change here; running it keeps CI's `--check` happy regardless.)

## Self-review notes

- Same `placemat-seen-version` key as the old modal, so existing visitors are treated as returning visitors on day one.
- `findRow` matching order: explicit `entry.row` → exact code text → prefix → substring. 11/11 matched on the live data in the mock-up.
- The two-script-block test still holds; the JSON data block was never a bare `<script>`.
