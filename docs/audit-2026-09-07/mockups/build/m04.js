'use strict';
const { SRC, addRowIds, banner, inject, silenceWhatsNew, write, stripTags } = require('./common');
function transform(html) {
let curatedN = 0, autoN = 0;

// Hand-written two-tier rewrites for the twelve longest entries (summary ≤ 90 chars, notes as bullets).
const curated = {
  '/resume': ['Open the session picker; background sessions are listed alongside interactive ones', [
    'Background sessions (from <code>--bg</code> or the agent view) are marked <code>bg</code>',
    'Offers to summarize stale large sessions before re-reading them',
    'In the agent view: picks from past sessions, including deleted ones, and resumes the choice as a background session']],
  '/usage': ['Unified usage view — cost, stats, limits, and loops in one place', [
    'Per-category limits breakdown: skills, subagents, plugins, per-MCP-server cost',
    'Loops tab: run count, total tokens, tokens per run, last run — spots runaway <code>/loop</code> tasks',
    'Spend-limit bar for gateway users with spend limits',
    '<code>/cost</code> adds a per-session prompt-cache line (hit ratio, misses, re-cached, warm/cold)',
    '<code>/cost</code> and <code>/stats</code> open the matching tab directly']],
  '/goal [condition]': ['Set a completion condition; Claude keeps working across turns until it is met', [
    'Works in interactive, <code>-p</code>, and Remote Control; shows a live elapsed/turns/tokens overlay',
    'Clears itself on unrecoverable errors (revoked auth, exhausted credits, context overflow)',
    'Checks in on background tasks waiting 30+ min; <code>CLAUDE_CODE_GOAL_CHECKIN_MINUTES=0</code> opts out',
    'Idle sessions get at most three check-ins per goal, backing off 30 min → 1 h → 2 h; your next message allows three more',
    '<code>claude --resume</code> restores the active goal']],
  '/model [model]': ['Switch model; the choice becomes the default for new sessions', [
    '<code>claude-sonnet-5</code> is the default (native 1M-token context)',
    'Press <code>s</code> in the picker to switch for the current session only',
    'Warns before switching mid-conversation; the startup header shows where the model pin came from',
    'Lists the gateway\'s <code>/v1/models</code> when <code>ANTHROPIC_BASE_URL</code> points at a compatible gateway',
    'Org-restricted models show "restricted by your organization\'s settings"']],
  '/mcp': ['Manage MCP servers; see per-server tool counts and connection errors', [
    'Flags servers with 0 tools',
    'Shows HTTP status and error text when a server fails to connect',
    'Warns about config values with hidden leading or trailing whitespace',
    'Shows a <code>managed</code> marker on claude.ai connectors whose auth is managed by your organization']],
  '/doctor': ['Full setup checkup — diagnose and fix installation or environment issues', [
    'Press <code>f</code> to auto-fix; can be opened while Claude is responding',
    'Shows the result of the last update attempt and npm auto-update fix hints',
    'Proposes trimming checked-in <code>CLAUDE.md</code> content Claude could derive from the codebase',
    '<code>/checkup</code> is an alias']],
  '/status': ['Show environment status, warnings, and what kind of session this is', [
    'Session kind: <code>interactive</code>, or a background job that is <code>attached</code> or <code>unattended</code>',
    '<code>Skipped sources</code> line lists managed-settings sources present but not applied',
    'Shows GitHub connection status for Claude Code on the web (Pro/Max)',
    'Explains a managed-settings load failure or why they weren\'t fetched (Bedrock/Vertex/third-party provider, custom <code>ANTHROPIC_BASE_URL</code>)',
    'Moved out of the startup output in v2.1.203']],
  'claude agents': ['Agent view (Research Preview) — every CC session in one list: running, blocked on you, or done', [
    'Type <code>! &lt;cmd&gt;</code> to launch a shell command as a background session you can attach to or detach from',
    '<code>--cwd &lt;path&gt;</code> scopes the list to a directory; <code>--all</code> includes completed sessions',
    '<code>--json</code> lists live sessions (<code>waitingFor</code>, <code>id</code>, <code>state</code> fields)',
    'Dispatch flags for background sessions: <code>--add-dir</code>, <code>--settings</code>, <code>--mcp-config</code>, <code>--plugin-dir</code>, <code>--permission-mode</code>, <code>--model</code>, <code>--effort</code>, <code>--agent</code>, <code>--dangerously-skip-permissions</code>']],
  'sandbox.credentials': ['Block sandboxed commands from reading credential files and secret env vars', [
    '<code>mode: "mask"</code> (Linux/WSL) exposes a sentinel copy; the proxy substitutes the real value on egress',
    '<code>extract</code> / <code>onExtractNoMatch</code> for structured values; <code>decode: "jwt"</code> with <code>maskClaims</code> for JWT-aware masking; <code>awsPairs</code> / <code>sigv4</code> for AWS SigV4 re-signing',
    'Requires <code>network.tlsTerminate</code>; macOS falls back to <code>deny</code>']],
  '/code-review [level] [pr#]': ['Code review as a background subagent; <code>/review</code> is an alias', [
    'Must be invoked explicitly — Claude no longer auto-runs it (except on Bedrock, Vertex AI, Foundry, the Claude apps gateway, or when telemetry is off)',
    'Pass a PR number to review that PR; <code>/code-review ultra</code> runs a deep cloud review',
    'Effort level persists — no argument reuses the last level',
    '<code>--fix</code> applies findings to the working tree; <code>--comment</code> posts them as inline PR comments']],
  '/claude-api': ['Load the API + SDK reference into context', [
    '<code>upgrade</code> subcommand migrates Python projects from <code>anthropic</code> 0.x to 1.x (timeouts use <code>anthropic.Timeout</code>, not <code>httpx.Timeout</code>)',
    '<code>cost-optimize</code> subcommand profiles a project\'s API spend and works through cost levers (caching, token hygiene, batch, effort, model choice)',
    'Covers the Admin API: members, invites, workspaces, API keys, rate-limit reports, workload identity federation, CMEK']],
  'SendMessage': ['Message another agent or session; auto-resumes stopped agents', [
    'Cross-session messaging across machines — discover peers with <code>ListAgents</code> (same-machine also on Bedrock, Vertex, Foundry, and with telemetry off)',
    'Can open a conversation with a Remote Control session on another machine by name (macOS and Linux)',
    '<code>notify_when_idle</code> — one-shot, opt-in notice when another session next goes idle (macOS and Linux)',
    '<code>ListAgents</code> reports a session\'s own name and lists live teammates alongside subagents and other sessions']],
};

html = html.replace(/(<tr class="search-item" id="[^"]+"><td>(.*?)<\/td><td class="desc">)(.*?)(<\/td><\/tr>)/g, (all, open, first, desc, close) => {
  const key = stripTags(first).trim();
  let summary, notes;
  if (curated[key]) { [summary, notes] = curated[key]; curatedN++; }
  else if (stripTags(desc).length > 160 && desc.includes('; ')) {
    const parts = desc.split('; ');
    summary = parts[0]; notes = parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)); autoN++;
  } else return all;
  return `${open}<span class="summary">${summary}</span> <button type="button" class="notes-btn" aria-expanded="false">+${notes.length}</button><ul class="notes" hidden>${notes.map((n) => `<li>${n}</li>`).join('')}</ul>${close}`;
});
// Search must see hidden notes: match on textContent, not innerText.
html = html.replace('item.innerText.toLowerCase().includes(term)', 'item.textContent.toLowerCase().includes(term)');
// Global toggle in the legend strip.
html = html.replace('<div class="legend-item"><span class="legend-swatch swatch-unverified"></span> Unverified</div>',
  '<div class="legend-item"><span class="legend-swatch swatch-unverified"></span> Unverified</div>\n                    <div class="legend-item"><button type="button" class="notes-all" id="notesAll" aria-pressed="false">Show all notes</button></div>');

return { html, curatedN, autoN };
}
module.exports = { transform };
const css = `
/* ---- proposal: two-tier entries ---- */
.desc .summary { display: inline; }
.notes-btn { display: inline-block; vertical-align: 1px; margin-left: 4px; background: none; border: 1px solid var(--border-strong); color: var(--teal-2); font-family: var(--font-mono); font-size: 9.5px; padding: 0 5px; border-radius: 999px; cursor: pointer; line-height: 1.5; }
.notes-btn:hover, .notes-btn[aria-expanded="true"] { border-color: var(--teal); color: var(--fg-main); background: var(--new-bg); }
.notes { list-style: none; margin: 5px 0 2px; padding: 0 0 0 10px; border-left: 1px solid var(--border-strong); }
.notes li { position: relative; padding: 2px 0 2px 10px; font-size: 11px; line-height: 1.35; color: var(--fg-muted); }
.notes li::before { content: "▸"; position: absolute; left: 0; top: 2px; color: var(--teal); font-size: 9px; }
.notes-all { background: none; border: 1px solid var(--border); color: var(--fg-muted); font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: var(--r-sm); cursor: pointer; }
.notes-all:hover, .notes-all[aria-pressed="true"] { color: var(--teal-2); border-color: var(--teal); }
`;
const js = `
// ---- proposal: notes disclosure ----
(function () {
  const btns = [...document.querySelectorAll('.notes-btn')];
  const set = (b, open) => { b.setAttribute('aria-expanded', String(open)); b.nextElementSibling.hidden = !open; };
  btns.forEach((b) => b.addEventListener('click', () => set(b, b.getAttribute('aria-expanded') !== 'true')));
  const all = document.getElementById('notesAll');
  all.addEventListener('click', () => { const open = all.getAttribute('aria-pressed') !== 'true'; all.setAttribute('aria-pressed', String(open)); all.textContent = open ? 'Hide all notes' : 'Show all notes'; btns.forEach((b) => set(b, open)); });
  // A search hit inside hidden notes opens them so the match is visible.
  const orig = performSearch;
  window.performSearch = function (term) {
    orig(term);
    const t = term.toLowerCase().trim();
    btns.forEach((b) => { const row = b.closest('.search-item'); if (!t) return; const summaryHit = row.querySelector('.summary').textContent.toLowerCase().includes(t) || row.querySelector('td').textContent.toLowerCase().includes(t); const notesHit = b.nextElementSibling.textContent.toLowerCase().includes(t); if (notesHit && !summaryHit) set(b, true); });
  };
  searchInput.removeEventListener('input', orig);
  searchInput.addEventListener('input', (e) => window.performSearch(e.target.value));
})();
`;
if (require.main === module) {
let { html, curatedN, autoN } = transform(silenceWhatsNew(addRowIds(SRC)));
html = inject(html, { title: 'Mock-up 04 — Two-tier entries', css, js });
html = html.replace('<div class="dashboard-grid">', '<div class="dashboard-grid">' + banner('04', 'One-line summary + folded notes, instead of run-on descriptions (12 entries hand-written, ' + autoN + ' auto-split at semicolons)',
  ['find /usage or /goal — click +5', 'Show all notes in the legend strip', 'search "checkup" — the hidden note opens']));
write('04-two-tier-entries.html', html);
console.log('curated', curatedN, 'auto', autoN);
}
