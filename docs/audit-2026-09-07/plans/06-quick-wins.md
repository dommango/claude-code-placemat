# Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the small fixes from the audit that need no mock-up: correct the command builder, add link-preview and discovery metadata, fix the changelog's wrapped-line layout, replace the stale footer, add a release-tag consistency test, and clean up the repository.

**Architecture:** Independent, one-commit tasks. Each can be done alone and in any order. Nothing here depends on Plans 01–05, but Task 3's `<link rel="alternate">` should be skipped if Plan 03 already added it.

**Tech Stack:** Vanilla HTML/CSS; `node tests/placemat.test.js`; `gh` for the repo settings task.

---

### Task 1: Fix the command builder

**Goal:** Effort labels no longer claim to pick a model; add the missing options.

**Files:** `index.html` (legend strip; builder JS), `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `#labEffort` options are exactly: `Effort: Auto` (value ``), `Low` (`--effort low`), `Medium` (`--effort medium`), `High` (`--effort high`), `xhigh` (`--effort xhigh`).
- [ ] A new `#labMode` select: `Permission: Default` (``), `Plan` (`--permission-mode plan`), `Accept edits` (`--permission-mode acceptEdits`), `Auto` (`--permission-mode auto`), `Bypass` (`--dangerously-skip-permissions`).
- [ ] A new `#labModel` select: `Model: Default` (``), `Sonnet 5` (`--model claude-sonnet-5`), `Opus 5` (`--model claude-opus-5`), `Haiku 4.5` (`--model claude-haiku-4-5-20251001`).
- [ ] The generated command appends the chosen values in the order prompt → effort → model → permission → output format → `--bare`.
- [ ] Test: the HTML no longer contains `(Opus)` or `(Haiku)` in the builder.

**Steps:**

- [ ] **Step 1: Failing test**

```js
  test('index.html: command builder effort options do not name models', () => {
    const builder = html.match(/<div class="compact-builder">[\s\S]*?<\/div>/)[0];
    assert.ok(!/\((Opus|Haiku)\)/.test(builder), 'effort options still name a model');
    assert.ok(builder.includes('value="--effort xhigh"'), 'xhigh effort missing');
    assert.ok(builder.includes('id="labMode"') && builder.includes('id="labModel"'), 'permission/model selects missing');
  });
```

Run → FAIL.

- [ ] **Step 2: Replace the effort select and add two selects**

Replace:

```html
                    <select id="labEffort">
                        <option value="">Effort: Auto</option>
                        <option value="--effort high">High (Opus)</option>
                        <option value="--effort low">Low (Haiku)</option>
                    </select>
```

with:

```html
                    <select id="labEffort" aria-label="Effort">
                        <option value="">Effort: Auto</option>
                        <option value="--effort low">Low</option>
                        <option value="--effort medium">Medium</option>
                        <option value="--effort high">High</option>
                        <option value="--effort xhigh">xhigh</option>
                    </select>
                    <select id="labModel" aria-label="Model">
                        <option value="">Model: Default</option>
                        <option value="--model claude-sonnet-5">Sonnet 5</option>
                        <option value="--model claude-opus-5">Opus 5</option>
                        <option value="--model claude-haiku-4-5-20251001">Haiku 4.5</option>
                    </select>
                    <select id="labMode" aria-label="Permission mode">
                        <option value="">Permission: Default</option>
                        <option value="--permission-mode plan">Plan</option>
                        <option value="--permission-mode acceptEdits">Accept edits</option>
                        <option value="--permission-mode auto">Auto</option>
                        <option value="--dangerously-skip-permissions">Bypass</option>
                    </select>
```

- [ ] **Step 3: Builder JS**

In the `// --- COMPACT COMMAND BUILDER LOGIC ---` section add two lookups after `const labFormat = …`:

```js
        const labModel = document.getElementById('labModel');
        const labMode = document.getElementById('labMode');
```

Replace the body of `updateCmd` with:

```js
        const updateCmd = () => {
            const parts = [`claude -p ${shellSingleQuote(labPrompt.value)}`];
            [labEffort.value, labModel.value, labMode.value, labFormat.value, labBare.checked ? '--bare' : ''].forEach((p) => { if (p) parts.push(p); });
            genOut.innerText = parts.join(' ');
        };
```

and change the listener registration to `[labPrompt, labEffort, labModel, labMode, labFormat].forEach((el) => el.addEventListener('input', updateCmd));`. Keep the `shellSingleQuote` line untouched (a test extracts it by exact text).

- [ ] **Step 4:** `node tests/placemat.test.js` → pass. Commit: `git commit -am "fix: command builder — honest effort labels, model and permission selects"`.

---

### Task 2: Link previews and discovery metadata

**Goal:** Sharing the URL shows the brand image; crawlers get a canonical.

**Files:** `index.html`, `changelog.html`, new `og-image.png`, `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `og-image.png` exists at the repo root, 1200×630, under 300 KB, derived from `.github/assets/claude_code_placemat_typographic_8bit.png`.
- [ ] `index.html` `<head>` has `<meta property="og:image" content="https://dommango.github.io/claude-code-placemat/og-image.png">`, `<meta name="twitter:card" content="summary_large_image">`, and `<link rel="canonical" href="https://dommango.github.io/claude-code-placemat/">`.
- [ ] `changelog.html` has the same `og:image` and a canonical of `…/changelog.html`.
- [ ] `AGENTS.md` "No external dependencies" bullet lists `og-image.png` as a permitted self-hosted asset.

**Steps:**

- [ ] **Step 1: Failing test**

```js
  test('index.html: og:image, twitter card and canonical are present', () => {
    assert.ok(html.includes('<meta property="og:image" content="https://dommango.github.io/claude-code-placemat/og-image.png">'));
    assert.ok(html.includes('<meta name="twitter:card" content="summary_large_image">'));
    assert.ok(html.includes('<link rel="canonical" href="https://dommango.github.io/claude-code-placemat/">'));
  });
```

- [ ] **Step 2: Make the image** (Python 3 with Pillow, or any image tool; the source is 532 KB PNG)

```bash
python3 - <<'EOF'
from PIL import Image
src = Image.open('.github/assets/claude_code_placemat_typographic_8bit.png').convert('RGB')
w, h = src.size
target = 1200 / 630
cw, ch = (w, int(w / target)) if w / h > target else (int(h * target), h)
left, top = (w - cw) // 2, (h - ch) // 2
img = src.crop((left, top, left + cw, top + ch)).resize((1200, 630), Image.LANCZOS)
img.save('og-image.png', optimize=True)
print(img.size)
EOF
ls -la og-image.png
```

If Pillow is missing: `pip install pillow` in a venv, or crop/resize in any editor to 1200×630. Check the result visually: the wordmark must be inside the crop.

- [ ] **Step 3: Meta tags** — in `index.html` after the existing `og:url` meta add:

```html
    <meta property="og:image" content="https://dommango.github.io/claude-code-placemat/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="https://dommango.github.io/claude-code-placemat/">
```

In `changelog.html` after the `description` meta add:

```html
    <meta property="og:title" content="Claude Code Placemat — Changelog">
    <meta property="og:image" content="https://dommango.github.io/claude-code-placemat/og-image.png">
    <meta name="twitter:card" content="summary_large_image">
    <link rel="canonical" href="https://dommango.github.io/claude-code-placemat/changelog.html">
```

- [ ] **Step 4:** `node tests/placemat.test.js` → pass. Commit: `git add og-image.png index.html changelog.html AGENTS.md tests/placemat.test.js && git commit -m "feat: og:image, twitter card and canonical links"`.

---

### Task 3: Changelog layout fix and shared header

**Goal:** Entries read as tag-then-text rows; wrapped lines align under the text, not under the tag; the header matches the placemat.

**Files:** `changelog.html`, `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] `.change-list li` is `display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 4px 8px; align-items: start;` — the `flex-wrap: wrap` rule is gone and the existing regression test is updated to assert the grid instead.
- [ ] Long entries wrap inside the second column; no text appears under the tag.
- [ ] Only the newest month `<details>` is `open` by default.
- [ ] Header shows the minion SVG and `<h1>Claude Code <span class="wm-pixel">PLACEMAT</span> <span class="header-tagline">Changelog</span></h1>` styling consistent with `index.html` (copy the `<svg class="minion-icon">` block verbatim).

**Steps:**

- [ ] **Step 1: Update the regression test**

Replace the test `changelog.html: .change-list li wraps instead of squeezing code chips onto one line` with:

```js
  test('changelog.html: .change-list li is a two-column grid (tag | text) so wrapped lines align under the text', () => {
    assert.ok(/\.change-list li \{[^}]*display:\s*grid/.test(html));
    assert.ok(/\.change-list li \{[^}]*grid-template-columns:\s*46px minmax\(0, 1fr\)/.test(html));
  });

  test('changelog.html: only the newest month group is open by default', () => {
    const groups = html.match(/<details class="month-group"( open)?>/g) || [];
    assert.ok(groups.length > 3, 'month groups not found');
    assert.strictEqual(groups[0], '<details class="month-group" open>', 'newest month must be open');
    assert.strictEqual(groups.slice(1).filter((g) => g.includes(' open')).length, 0, 'older months must start closed');
  });
```

- [ ] **Step 2: CSS** — in `changelog.html`'s `<style>`, replace the `.change-list li { … }` rule and its `li > .tag` rule with:

```css
        .change-list li {
            padding: 4px 0; border-bottom: 1px solid var(--border);
            font-size: 0.8rem;
            display: grid; grid-template-columns: 46px minmax(0, 1fr); gap: 4px 8px; align-items: start;
        }
        .change-list li > .tag { margin-top: 2px; }
```

Because the tag span is the first child and everything after it is loose text/inline elements, wrap the text: run this one-off to give every entry a text wrapper:

```js
// /tmp/wrap-entries.js
const fs = require('fs');
let h = fs.readFileSync('changelog.html', 'utf8');
let n = 0;
h = h.replace(/(<li><span class="tag tag-\w+">\w+<\/span>)([\s\S]*?)(<\/li>)/g, (m, a, b, c) => { n++; return `${a}<span class="entry">${b.trim()}</span>${c}`; });
fs.writeFileSync('changelog.html', h);
console.log('wrapped', n);
```

Run `node /tmp/wrap-entries.js` (expect ~436), `rm /tmp/wrap-entries.js`, and add the bot rule to `AGENTS.md`: `- Changelog entries are <li><span class="tag tag-add">ADD</span><span class="entry">…</span></li>`. Update `scripts/build-changes.js` (Plan 03) if present: its `liRe` should capture inside `<span class="entry">…</span>` — change the regex to `/<li><span class="tag (tag-\w+)">\w+<\/span><span class="entry">([\s\S]*?)<\/span><\/li>/g`.

- [ ] **Step 3: Month groups** — remove ` open` from every `<details class="month-group" open>` except the first.

- [ ] **Step 4: Header** — replace the `<div class="header-title"><h1>Changelog</h1></div>` block with the placemat's header-title block (SVG + `<h1>Claude Code <span class="wm-pixel">PLACEMAT</span></h1>`), followed by `<span class="header-tagline">Changelog</span>`, and delete the page-specific `.header-title h1 { color: var(--coral); … }` override so the shared style applies.

- [ ] **Step 5:** `node tests/placemat.test.js` → pass. Serve `changelog.html` and confirm wrapped lines align under the text. Commit: `git commit -am "fix: changelog entries as tag|text grid, newest month open, shared header"`.

---

### Task 4: Footer shows the last sync, not March

**Files:** `index.html`, `tests/placemat.test.js`, `AGENTS.md`

**Acceptance Criteria:**
- [ ] Footer reads `Template v1.1 · Content synced 2026-09-06 · <a …>Context//Collapse</a>` where the date is the date in the newest changelog release heading.
- [ ] Test: the footer date equals the newest `version-date` in `changelog.html`.

**Steps:**

- [ ] **Step 1: Failing test** (end of the `// --- changelog.html ---` block, since it needs both files)

```js
  test('index.html footer sync date matches the newest changelog release date', () => {
    const index = read('index.html');
    const footer = index.match(/Content synced (\d{4}-\d{2}-\d{2})/);
    assert.ok(footer, 'footer sync date missing');
    const newest = html.match(/<h3[^>]*>CC v[\d.–v]+ <span class="version-date">(\d{4}-\d{2}-\d{2})<\/span>/);
    assert.strictEqual(footer[1], newest[1], 'footer date is stale');
  });
```

- [ ] **Step 2:** Change the footer to `Template v1.1 · Content synced 2026-09-04<br>` (use the newest changelog date; keep the template version current if Plan 01 bumped it). Add to `AGENTS.md` Pipeline: "updates the footer's `Content synced` date to the release date".

- [ ] **Step 3:** Test, commit: `git commit -am "fix: footer shows last content sync date"`.

---

### Task 5: Release-tag consistency test

**Goal:** CI fails when the header release tag runs ahead of the changelog (the drift the May audit found).

**Files:** `tests/placemat.test.js`

```js
  test('index.html release tag is not ahead of the newest changelog release', () => {
    const index = read('index.html');
    const tag = index.match(/As of release: v([\d.]+)</)[1];
    const newest = html.match(/<h3[^>]*>CC v[\d.]+(?:–v([\d.]+))? /);
    const newestVersion = (newest[1] || html.match(/<h3[^>]*>CC v([\d.]+)/)[1]);
    const num = (v) => v.split('.').map(Number).reduce((a, b) => a * 1000 + b, 0);
    // The tag may be newer than the last *documented* release only when the newer releases had no placemat-relevant changes; allow at most 3 versions of slack.
    assert.ok(num(tag) >= num(newestVersion), `release tag ${tag} is older than changelog ${newestVersion}`);
    assert.ok(num(tag) - num(newestVersion) <= 3, `release tag ${tag} is more than 3 versions ahead of changelog ${newestVersion}`);
  });
```

Put it at the end of the `// --- changelog.html ---` block. Run; on the current content it passes (`v2.1.263` vs `v2.1.261`). Commit: `git commit -am "test: release tag must stay within 3 versions of the newest changelog entry"`.

---

### Task 6: Repository hygiene (manual, ~10 minutes)

**Goal:** Clean branches and settings.

**Steps:**

- [ ] **Step 1:** Enable auto-delete of merged head branches:

```bash
gh api -X PATCH repos/dommango/claude-code-placemat -f delete_branch_on_merge=true
```

- [ ] **Step 2:** Prune the 109 merged `claude/placemat-update-*` remote branches (they are all merged into `main`; verify with the loop before deleting):

```bash
git fetch --prune
for b in $(git branch -r --merged origin/main | grep 'origin/claude/placemat-update-' | sed 's#origin/##'); do
  git push origin --delete "$b"
done
```

- [ ] **Step 3:** Local: the working branch `fix/light-mode-default` was squash-merged as PR #75. Move its only live change (`CLAUDE.md` → `@AGENTS.md`, plus the new `AGENTS.md`) to a fresh branch off `origin/main`, then delete `fix/light-mode-default`.

- [ ] **Step 4:** Decide the fate of `~/.claude/changelog_cursor.txt` (still dated 2026-03-27): if the cloud routine keeps its own cursor, delete the file and the "Check cursor date" line in `AGENTS.md`'s Manual Validation Workflow.

No commit for this task beyond the `AGENTS.md` line removal in Step 4 (`git commit -am "docs: drop stale changelog cursor step"`).

## Self-review notes

- Task 3's `<span class="entry">` wrapper changes the changelog entry shape; Plan 03's generator regex must be updated in the same PR if both have landed (noted inline).
- Task 1 keeps the `shellSingleQuote` definition byte-identical because an existing test extracts it with a regex.
