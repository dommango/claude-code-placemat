# Two-Tier Entries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-extended-cc:subagent-driven-development (recommended) or superpowers-extended-cc:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn run-on descriptions (36 rows over 200 characters, the longest 677) into a one-line **summary** plus folded **notes**, add a "Show all notes" toggle, keep search working across hidden notes, and give the sync bot a rule so descriptions stop growing by accretion.

**Architecture:** Only the description cell changes shape: `<td class="desc"><span class="summary">…</span> <button class="notes-btn">+N</button><ul class="notes" hidden>…</ul></td>`. Rows with short descriptions are untouched. Twelve rows are rewritten by hand (content in Task 2); the remaining long rows are split at `; ` by a one-off script and then reviewed by eye. A test caps summary length so the bot cannot regress it.

**Tech Stack:** Vanilla HTML/CSS/JS; `node tests/placemat.test.js`.

**Reference mock-up:** `docs/audit-2026-09-07/mockups/04-two-tier-entries.html`.

**Interactions:** Independent of Plans 01–03. Plan 05 (print) hides `.notes` so printed pages carry summaries only, which is the main reason to land this before 05. If Plan 02 landed, its `markHits` already walks hidden `<ul>` text nodes; the search change in Task 1 Step 5 still applies (matching must read hidden text).

---

### Task 1: Markup contract, CSS, JS, and the guard test

**Goal:** The page understands two-tier cells before any content is migrated.

**Files:**
- Modify: `index.html` (legend strip button; second `<script>`)
- Modify: `placemat.css`
- Test: `tests/placemat.test.js`

**Acceptance Criteria:**
- [ ] A `<button type="button" class="notes-all" id="notesAll" aria-pressed="false">Show all notes</button>` sits in the legend as a fourth `.legend-item`.
- [ ] Clicking a `.notes-btn` toggles its `aria-expanded` and the `hidden` attribute of the sibling `ul.notes`.
- [ ] "Show all notes" expands every notes list and relabels itself "Hide all notes"; clicking again folds them.
- [ ] Search matches text inside hidden notes; when the only hit for a row is inside its notes, the notes open automatically.
- [ ] Test: no `.desc` cell has more than 160 characters of visible text outside a `.notes` list (this is the guard that keeps the bot honest). It will fail until Task 2 completes; that is expected — commit it with Task 2, not here.

**Verify:** `node tests/placemat.test.js` (existing tests) → pass. Manual after Task 2.

**Steps:**

- [ ] **Step 1: Legend button**

In `index.html`, after the `Unverified` legend item add:

```html
                    <div class="legend-item"><button type="button" class="notes-all" id="notesAll" aria-pressed="false">Show all notes</button></div>
```

- [ ] **Step 2: CSS** (append to `placemat.css` after the `/* ---------- CODE CHIPS ---------- */` section)

```css
/* ---------- TWO-TIER ENTRIES ---------- */
.desc .summary { display: inline; }
.notes-btn {
    display: inline-block;
    vertical-align: 1px;
    margin-left: 4px;
    background: none;
    border: 1px solid var(--border-strong);
    color: var(--teal-2);
    font-family: var(--font-mono);
    font-size: 9.5px;
    padding: 0 5px;
    border-radius: 999px;
    cursor: pointer;
    line-height: 1.5;
}
.notes-btn:hover,
.notes-btn[aria-expanded="true"] { border-color: var(--teal); color: var(--fg-main); background: var(--new-bg); }
.notes {
    list-style: none;
    margin: 5px 0 2px;
    padding: 0 0 0 10px;
    border-left: 1px solid var(--border-strong);
}
.notes li {
    position: relative;
    padding: 2px 0 2px 10px;
    font-size: 11px;
    line-height: 1.35;
    color: var(--fg-muted);
}
.notes li::before { content: "▸"; position: absolute; left: 0; top: 2px; color: var(--teal); font-size: 9px; }
.notes-all {
    background: none;
    border: 1px solid var(--border);
    color: var(--fg-muted);
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 3px 8px;
    border-radius: var(--r-sm);
    cursor: pointer;
}
.notes-all:hover,
.notes-all[aria-pressed="true"] { color: var(--teal-2); border-color: var(--teal); }
```

- [ ] **Step 3: JS** — append inside the second `<script>` block:

```js
        // --- TWO-TIER ENTRIES: notes disclosure ---
        const noteButtons = Array.from(document.querySelectorAll('.notes-btn'));
        const setNotes = (btn, open) => { btn.setAttribute('aria-expanded', String(open)); btn.nextElementSibling.hidden = !open; };
        noteButtons.forEach((btn) => btn.addEventListener('click', () => setNotes(btn, btn.getAttribute('aria-expanded') !== 'true')));
        const notesAllBtn = document.getElementById('notesAll');
        notesAllBtn.addEventListener('click', () => {
            const open = notesAllBtn.getAttribute('aria-pressed') !== 'true';
            notesAllBtn.setAttribute('aria-pressed', String(open));
            notesAllBtn.textContent = open ? 'Hide all notes' : 'Show all notes';
            noteButtons.forEach((btn) => setNotes(btn, open));
        });
        function revealNoteHits(term) {
            const t = term.toLowerCase().trim();
            if (!t) return;
            noteButtons.forEach((btn) => {
                const row = btn.closest('.search-item');
                const outside = (row.querySelector('td').textContent + ' ' + row.querySelector('.summary').textContent).toLowerCase().includes(t);
                const inside = btn.nextElementSibling.textContent.toLowerCase().includes(t);
                if (inside && !outside) setNotes(btn, true);
            });
        }
```

- [ ] **Step 4: Hook into search**

If `performSearch` is the **original** (pre-Plan-02) version, change its per-row test from `item.innerText.toLowerCase().includes(term)` to `item.textContent.toLowerCase().includes(term)` (`innerText` skips `hidden` elements; `textContent` does not). If Plan 02 landed, `r.dataset.norm` is built from `r.innerText` — change that line to use `r.textContent` for the same reason.

Then in the `searchInput` `input` listener add `revealNoteHits(e.target.value);` after the `performSearch(...)` call.

- [ ] **Step 5: Guard test** (append inside the `// --- index.html ---` block; it will fail until Task 2 — that is the point)

```js
  test('index.html: no description exceeds 160 visible characters outside its notes', () => {
    const strip = (s) => s.replace(/<ul class="notes"[\s\S]*?<\/ul>/g, '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, 'x');
    const cells = Array.from(html.matchAll(/<td class="desc">([\s\S]*?)<\/td><\/tr>/g), (m) => m[1]);
    const long = cells.map(strip).filter((t) => t.length > 160);
    assert.strictEqual(long.length, 0, `${long.length} descriptions over 160 chars, e.g. "${(long[0] || '').slice(0, 80)}…"`);
  });

  test('index.html: every notes-btn is followed by a hidden ul.notes with at least one li', () => {
    const btns = (html.match(/<button type="button" class="notes-btn" aria-expanded="false">\+\d+<\/button><ul class="notes" hidden>(?:<li>[\s\S]*?<\/li>)+<\/ul>/g) || []).length;
    const all = (html.match(/class="notes-btn"/g) || []).length;
    assert.strictEqual(btns, all, `${btns} well-formed notes blocks for ${all} buttons`);
  });
```

Run `node tests/placemat.test.js` → the first new test FAILS with a count of ~36; the second passes vacuously (0 = 0). Do not commit yet.

---

### Task 2: Migrate content

**Goal:** Every description over 160 characters becomes summary + notes. Twelve are hand-written below; the rest are auto-split and then reviewed.

**Files:**
- Modify: `index.html`
- Test: `tests/placemat.test.js` (from Task 1)

**Acceptance Criteria:**
- [ ] The 12 rows in Step 1 have exactly the HTML given.
- [ ] Every remaining `.desc` over 160 characters was split; `node tests/placemat.test.js` passes.
- [ ] Each auto-split summary was read once and edited if it is not a sentence someone would say (see the review rule in Step 3).
- [ ] Row count unchanged; no `class="new"` / `unverified` / `<!-- added -->` marker lost.

**Verify:** `node tests/placemat.test.js` → all pass; `grep -c '<tr class="search-item"' index.html` unchanged.

**Steps:**

- [ ] **Step 1: Hand-written rewrites**

For each row below, find the `<tr>` whose first `<code>` matches, and replace its whole `<td class="desc">…</td>` with the given cell. Keep the row's first cell exactly as is.

`/resume`
```html
<td class="desc"><span class="summary">Open the session picker; background sessions are listed alongside interactive ones</span> <button type="button" class="notes-btn" aria-expanded="false">+3</button><ul class="notes" hidden><li>Background sessions (from <code>--bg</code> or the agent view) are marked <code>bg</code></li><li>Offers to summarize stale large sessions before re-reading them</li><li>In the agent view: picks from past sessions, including deleted ones, and resumes the choice as a background session</li></ul></td>
```

`/usage`
```html
<td class="desc"><span class="summary">Unified usage view — cost, stats, limits, and loops in one place</span> <button type="button" class="notes-btn" aria-expanded="false">+5</button><ul class="notes" hidden><li>Per-category limits breakdown: skills, subagents, plugins, per-MCP-server cost</li><li>Loops tab: run count, total tokens, tokens per run, last run — spots runaway <code>/loop</code> tasks</li><li>Spend-limit bar for gateway users with spend limits</li><li><code>/cost</code> adds a per-session prompt-cache line (hit ratio, misses, re-cached, warm/cold)</li><li><code>/cost</code> and <code>/stats</code> open the matching tab directly</li></ul></td>
```

`/goal [condition]`
```html
<td class="desc"><span class="summary">Set a completion condition; Claude keeps working across turns until it is met</span> <button type="button" class="notes-btn" aria-expanded="false">+5</button><ul class="notes" hidden><li>Works in interactive, <code>-p</code>, and Remote Control; shows a live elapsed/turns/tokens overlay</li><li>Clears itself on unrecoverable errors (revoked auth, exhausted credits, context overflow)</li><li>Checks in on background tasks waiting 30+ min; <code>CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0</code> opts out</li><li>Idle sessions get at most three check-ins per goal, backing off 30 min → 1 h → 2 h; your next message allows three more</li><li><code>claude --resume</code> restores the active goal</li></ul></td>
```

`/model [model]`
```html
<td class="desc"><span class="summary">Switch model; the choice becomes the default for new sessions</span> <button type="button" class="notes-btn" aria-expanded="false">+5</button><ul class="notes" hidden><li><code>claude-sonnet-5</code> is the default (native 1M-token context)</li><li>Press <code>s</code> in the picker to switch for the current session only</li><li>Warns before switching mid-conversation; the startup header shows where the model pin came from</li><li>Lists the gateway's <code>/v1/models</code> when <code>ANTHROPIC_BASE_URL</code> points at a compatible gateway</li><li>Org-restricted models show "restricted by your organization's settings"</li></ul></td>
```

`/mcp`
```html
<td class="desc"><span class="summary">Manage MCP servers; see per-server tool counts and connection errors</span> <button type="button" class="notes-btn" aria-expanded="false">+4</button><ul class="notes" hidden><li>Flags servers with 0 tools</li><li>Shows HTTP status and error text when a server fails to connect</li><li>Warns about config values with hidden leading or trailing whitespace</li><li>Shows a <code>managed</code> marker on claude.ai connectors whose auth is managed by your organization</li></ul></td>
```

`/doctor`
```html
<td class="desc"><span class="summary">Full setup checkup — diagnose and fix installation or environment issues</span> <button type="button" class="notes-btn" aria-expanded="false">+4</button><ul class="notes" hidden><li>Press <code>f</code> to auto-fix; can be opened while Claude is responding</li><li>Shows the result of the last update attempt and npm auto-update fix hints</li><li>Proposes trimming checked-in <code>CLAUDE.md</code> content Claude could derive from the codebase</li><li><code>/checkup</code> is an alias</li></ul></td>
```

`/status`
```html
<td class="desc"><span class="summary">Show environment status, warnings, and what kind of session this is</span> <button type="button" class="notes-btn" aria-expanded="false">+5</button><ul class="notes" hidden><li>Session kind: <code>interactive</code>, or a background job that is <code>attached</code> or <code>unattended</code></li><li><code>Skipped sources</code> line lists managed-settings sources present but not applied</li><li>Shows GitHub connection status for Claude Code on the web (Pro/Max)</li><li>Explains a managed-settings load failure or why they weren't fetched (Bedrock/Vertex/third-party provider, custom <code>ANTHROPIC_BASE_URL</code>)</li><li>Moved out of the startup output in v2.1.203</li></ul></td>
```

`claude agents`
```html
<td class="desc"><span class="summary">Agent view (Research Preview) — every CC session in one list: running, blocked on you, or done</span> <button type="button" class="notes-btn" aria-expanded="false">+4</button><ul class="notes" hidden><li>Type <code>! &lt;cmd&gt;</code> to launch a shell command as a background session you can attach to or detach from</li><li><code>--cwd &lt;path&gt;</code> scopes the list to a directory; <code>--all</code> includes completed sessions</li><li><code>--json</code> lists live sessions (<code>waitingFor</code>, <code>id</code>, <code>state</code> fields)</li><li>Dispatch flags for background sessions: <code>--add-dir</code>, <code>--settings</code>, <code>--mcp-config</code>, <code>--plugin-dir</code>, <code>--permission-mode</code>, <code>--model</code>, <code>--effort</code>, <code>--agent</code>, <code>--dangerously-skip-permissions</code></li></ul></td>
```

`sandbox.credentials`
```html
<td class="desc"><span class="summary">Block sandboxed commands from reading credential files and secret env vars</span> <button type="button" class="notes-btn" aria-expanded="false">+3</button><ul class="notes" hidden><li><code>mode: "mask"</code> (Linux/WSL) exposes a sentinel copy; the proxy substitutes the real value on egress</li><li><code>extract</code> / <code>onExtractNoMatch</code> for structured values; <code>decode: "jwt"</code> with <code>maskClaims</code> for JWT-aware masking; <code>awsPairs</code> / <code>sigv4</code> for AWS SigV4 re-signing</li><li>Requires <code>network.tlsTerminate</code>; macOS falls back to <code>deny</code></li></ul></td>
```

`/code-review [level] [pr#]`
```html
<td class="desc"><span class="summary">Code review as a background subagent; <code>/review</code> is an alias</span> <button type="button" class="notes-btn" aria-expanded="false">+4</button><ul class="notes" hidden><li>Must be invoked explicitly — Claude no longer auto-runs it (except on Bedrock, Vertex AI, Foundry, the Claude apps gateway, or when telemetry is off)</li><li>Pass a PR number to review that PR; <code>/code-review ultra</code> runs a deep cloud review</li><li>Effort level persists — no argument reuses the last level</li><li><code>--fix</code> applies findings to the working tree; <code>--comment</code> posts them as inline PR comments</li></ul></td>
```

`/claude-api`
```html
<td class="desc"><span class="summary">Load the API + SDK reference into context</span> <button type="button" class="notes-btn" aria-expanded="false">+3</button><ul class="notes" hidden><li><code>upgrade</code> subcommand migrates Python projects from <code>anthropic</code> 0.x to 1.x (timeouts use <code>anthropic.Timeout</code>, not <code>httpx.Timeout</code>)</li><li><code>cost-optimize</code> subcommand profiles a project's API spend and works through cost levers (caching, token hygiene, batch, effort, model choice)</li><li>Covers the Admin API: members, invites, workspaces, API keys, rate-limit reports, workload identity federation, CMEK</li></ul></td>
```

`SendMessage`
```html
<td class="desc"><span class="summary">Message another agent or session; auto-resumes stopped agents</span> <button type="button" class="notes-btn" aria-expanded="false">+4</button><ul class="notes" hidden><li>Cross-session messaging across machines — discover peers with <code>ListAgents</code> (same-machine also on Bedrock, Vertex, Foundry, and with telemetry off)</li><li>Can open a conversation with a Remote Control session on another machine by name (macOS and Linux)</li><li><code>notify_when_idle</code> — one-shot, opt-in notice when another session next goes idle (macOS and Linux)</li><li><code>ListAgents</code> reports a session's own name and lists live teammates alongside subagents and other sessions</li></ul></td>
```

- [ ] **Step 2: Auto-split the rest**

Create `/tmp/split-desc.js`:

```js
const fs = require('fs');
const p = 'index.html';
let html = fs.readFileSync(p, 'utf8');
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, 'x');
let n = 0; const report = [];
html = html.replace(/(<td class="desc">)(?!<span class="summary">)([\s\S]*?)(<\/td><\/tr>)/g, (all, open, desc, close) => {
  if (strip(desc).length <= 160 || !desc.includes('; ')) return all;
  const parts = desc.split('; ');
  const summary = parts[0];
  const notes = parts.slice(1).map((t) => t.charAt(0).toUpperCase() + t.slice(1));
  n++; report.push(`- ${strip(summary)}`);
  return `${open}<span class="summary">${summary}</span> <button type="button" class="notes-btn" aria-expanded="false">+${notes.length}</button><ul class="notes" hidden>${notes.map((t) => `<li>${t}</li>`).join('')}</ul>${close}`;
});
fs.writeFileSync(p, html);
fs.writeFileSync('/tmp/split-report.md', report.join('\n') + '\n');
console.log('split', n, 'rows; review /tmp/split-report.md');
```

Run `node /tmp/split-desc.js` → `split ~24 rows`. Then `rm /tmp/split-desc.js`.

- [ ] **Step 3: Review the auto-split summaries**

Open `/tmp/split-report.md`. For each line apply this rule: **the summary must be a present-tense statement of what the item does, under 90 characters, with no "now", "also", or version numbers.** Edit `index.html` where a summary fails the rule; move trailing detail into the first `<li>` of that row's notes and bump the `+N` count. Then run:

```bash
node tests/placemat.test.js
```

Expected: all pass, including `no description exceeds 160 visible characters`. If a row still fails, its first clause was itself over 160 characters — rewrite that summary by hand.

- [ ] **Step 4: Commit**

```bash
git add index.html placemat.css tests/placemat.test.js
git commit -m "feat: two-tier entries — one-line summaries with folded notes"
```

---

### Task 3: Content rules for the bot

**Goal:** Descriptions stop accreting.

**Files:** `AGENTS.md`, `.github/PULL_REQUEST_TEMPLATE.md`

**Acceptance Criteria:**
- [ ] `AGENTS.md` Content Rules contain the four bullets below verbatim.
- [ ] The PR template's review checklist has a line `- [ ] No summary over 90 characters; behaviour changes went into notes, not the summary`.

**Steps:**

- [ ] **Step 1:** Add to `AGENTS.md` `## Content Rules`:

```markdown
- Every description is either one short sentence (≤ 90 characters, present tense, what it does) or a two-tier cell: `<span class="summary">…</span> <button type="button" class="notes-btn" aria-expanded="false">+N</button><ul class="notes" hidden><li>…</li></ul>` where N equals the number of `<li>`
- When a release changes an existing item, add or edit a note; never append to the summary. If the change alters what the item fundamentally does, rewrite the summary instead of extending it
- Never write "now", "also", "no longer", or a version number into a summary; those belong in notes (a note may end with `(v2.1.NNN)`)
- `tests/placemat.test.js` fails any description over 160 visible characters outside its notes
```

- [ ] **Step 2:** Add the checklist line to `.github/PULL_REQUEST_TEMPLATE.md` under the review checklist.

- [ ] **Step 3:** Commit: `git commit -am "docs: two-tier content rules for the sync bot"`.

---

### Task 4: Changelog entry

Add under the newest Template block's Template/Structure list:

```html
                    <li><span class="tag tag-change">CHG</span>Long descriptions are now a one-line summary plus folded notes (<code>+N</code> to expand; "Show all notes" in the legend)</li>
```

```bash
git add changelog.html && git commit -m "docs: changelog entry for two-tier entries"
```

## Self-review notes

- Names: `.summary`, `.notes-btn`, `.notes`, `.notes-all`, `noteButtons`, `setNotes`, `notesAllBtn`, `revealNoteHits`.
- The guard test strips `<ul class="notes">` before measuring, so notes can be as long as they need to be.
- Print (Plan 05) hides `.notes` and `.notes-btn`; nothing here conflicts.
