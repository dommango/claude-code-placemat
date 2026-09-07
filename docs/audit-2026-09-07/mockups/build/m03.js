'use strict';
const fs = require('fs');
const path = require('path');
const { SRC, OUT, addRowIds, banner, inject, silenceWhatsNew, write } = require('./common');
let html = silenceWhatsNew(addRowIds(SRC));
const changes = fs.readFileSync(path.join(OUT, 'changes.json'), 'utf8');

// In production this is fetch('changes.json'); inline here so the mock-up works from file://.
const dataBlock = `\n    <script type="application/json" id="changesData">${changes}</script>`;
html = html.replace('<script type="application/json" id="whatsNewData">', dataBlock + '\n    <script type="application/json" id="whatsNewData">');

// Legend wording becomes personal.
html = html.replace('<span class="legend-swatch swatch-new"></span> New (recent release)', '<span class="legend-swatch swatch-new"></span> <span id="legendNew">New since your last visit</span>');
// Header gets a feed link.
html = html.replace('<a href="changelog.html" class="header-link">Changelog →</a>', '<a href="changelog.html" class="header-link">Changelog →</a>\n            <a href="feed.xml" class="header-link" title="Subscribe to placemat changes (RSS)">RSS</a>');

const strip = `
        <div class="card full-width search-exclude since-strip" id="sinceStrip" hidden>
            <div class="since-row">
                <span class="since-dot" aria-hidden="true"></span>
                <span class="since-text" id="sinceText"></span>
                <span class="since-actions">
                    <button type="button" id="sinceShow">Show changes</button>
                    <button type="button" id="sinceRead" class="quiet">Mark as read</button>
                </span>
            </div>
        </div>`;
const drawer = `
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
    </aside>`;

const css = `
/* ---- proposal: "since your last visit" strip ---- */
.since-strip { padding: 8px 16px; border-color: var(--teal); background: var(--new-bg); }
.since-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 12.5px; }
.since-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--teal); box-shadow: 0 0 0 3px var(--new-bg); flex-shrink: 0; }
.since-text b { color: var(--fg-main); }
.since-text code { cursor: default; }
.since-actions { margin-left: auto; display: flex; gap: 6px; }
.since-actions button, .since-drawer-foot button { background: var(--teal); color: #0a0a0a; border: 1px solid var(--teal); font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; padding: 4px 10px; border-radius: var(--r-sm); cursor: pointer; }
.since-actions button.quiet { background: none; color: var(--fg-muted); border-color: var(--border-strong); }
.since-actions button.quiet:hover { color: var(--fg-main); border-color: var(--teal); }

/* ---- proposal: drawer ---- */
.since-drawer { position: fixed; top: 52px; right: 0; bottom: 0; width: min(440px, 100vw); background: var(--bg-card-2); border-left: 1px solid var(--border-strong); z-index: 1002; display: flex; flex-direction: column; box-shadow: -12px 0 40px rgba(0,0,0,0.35); animation: drawerIn 0.2s var(--ease); }
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
.since-release li .tag { font-family: var(--font-mono); font-size: 9.5px; font-weight: 700; padding: 2px 0; border-radius: var(--r-xs); text-align: center; align-self: start; text-transform: uppercase; }
.since-release li .tag-add { background: rgba(135,157,134,0.16); color: var(--teal-2); border: 1px solid var(--teal); }
.since-release li .tag-change { background: rgba(245,158,11,0.10); color: #fbbf24; border: 1px solid #f59e0b; }
.since-release li .tag-remove { background: rgba(239,68,68,0.10); color: #f87171; border: 1px solid #ef4444; }
.since-release li .tag-fix { background: rgba(96,165,250,0.10); color: #60a5fa; border: 1px solid #3b82f6; }
.since-release li.unlinked { color: var(--fg-muted); cursor: default; }
.since-drawer-foot { padding: 10px 16px; border-top: 1px solid var(--border); font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-dim); display: flex; gap: 12px; align-items: center; }
.since-drawer-foot a { color: var(--teal); text-decoration: none; }
.search-item.flash { animation: rowFlash 1.6s ease-out; }
@keyframes rowFlash { 0%, 40% { background: var(--success-flash); } 100% { background: transparent; } }
.search-item { scroll-margin-top: 70px; }
/* mock-only control */
.mock-sim { margin-left: auto; display: inline-flex; gap: 6px; align-items: center; font-family: var(--font-mono); font-size: 10.5px; color: var(--fg-muted); }
.mock-sim select { background: var(--bg-code); color: var(--fg-main); border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 11px; padding: 2px 6px; }
`;

const js = `
// ---- proposal: changes since your last visit (replaces the What's New modal) ----
(function () {
  const KEY = 'placemat-seen-version';                    // same key the old modal used
  const data = JSON.parse(document.getElementById('changesData').textContent); // prod: await fetch('changes.json')
  const current = document.querySelector('.release-tag').textContent.match(/v[\\d.]+/)[0];
  const num = (v) => v.split('.').map(Number).reduce((a, b) => a * 1000 + b, 0);
  const tagClass = { ADD: 'tag-add', CHG: 'tag-change', DEL: 'tag-remove', FIX: 'tag-fix' };

  // Index every row by the text of each <code> in its first cell.
  const rows = [...document.querySelectorAll('.search-item')];
  const byCode = new Map();
  rows.forEach((r) => r.querySelectorAll('td:first-child code').forEach((c) => { const k = c.innerText.trim(); if (!byCode.has(k)) byCode.set(k, r); }));
  const findRow = (item) => {
    if (!item) return null;
    if (byCode.has(item)) return byCode.get(item);
    for (const [k, r] of byCode) if (k.startsWith(item + ' ') || k.startsWith(item + '=')) return r;
    for (const [k, r] of byCode) if (k.includes(item)) return r;
    return null;
  };

  const strip = document.getElementById('sinceStrip'), text = document.getElementById('sinceText');
  const drawer = document.getElementById('sinceDrawer'), body = document.getElementById('sinceBody'), title = document.getElementById('sinceDrawerTitle');
  let since = null;

  function render() {
    let seen = null; try { seen = localStorage.getItem(KEY); } catch (e) {}
    rows.forEach((r) => r.querySelectorAll('code.new').forEach((c) => c.classList.remove('new')));
    const releases = seen && num(seen) < num(current)
      ? data.releases.filter((rel) => num(rel.version) > num(seen) && num(rel.version) <= num(current))
      : (seen ? [] : data.releases.slice(0, 3));           // first visit: last 3 releases
    since = releases;
    const n = releases.reduce((a, r) => a + r.entries.length, 0);
    document.getElementById('legendNew').textContent = seen ? 'New since your last visit (' + seen + ')' : 'New in the last 3 releases';
    if (!n) { strip.hidden = true; drawer.hidden = true; return; }
    const linked = new Set();
    releases.forEach((rel) => rel.entries.forEach((e) => { const r = findRow(e.item); if (r) { r.querySelector('td:first-child code').classList.add('new'); linked.add(r); } }));
    text.innerHTML = seen
      ? '<b>' + releases.length + (releases.length === 1 ? ' release' : ' releases') + ' · ' + n + ' changes</b> since your last visit <code>' + seen + '</code> → <code>' + current + '</code>; ' + linked.size + ' entries highlighted below'
      : '<b>Welcome.</b> ' + n + ' changes across the last ' + releases.length + ' releases are highlighted; next time you will see only what changed since today';
    strip.hidden = false;
    title.textContent = seen ? 'Since ' + seen : 'Recent changes';
    body.innerHTML = releases.map((rel) => '<section class="since-release"><h3>CC ' + rel.label + ' <span>' + rel.date + '</span></h3><ul>' +
      rel.entries.map((e) => { const r = findRow(e.item); return '<li' + (r ? ' data-row="' + r.id + '"' : ' class="unlinked"') + '><span class="tag ' + (tagClass[e.tag] || 'tag-add') + '">' + e.tag + '</span><span>' + e.html + '</span></li>'; }).join('') + '</ul></section>').join('');
  }
  render();

  document.getElementById('sinceShow').addEventListener('click', () => { drawer.hidden = false; });
  document.getElementById('sinceClose').addEventListener('click', () => { drawer.hidden = true; });
  const markRead = () => { try { localStorage.setItem(KEY, current); } catch (e) {} render(); };
  document.getElementById('sinceRead').addEventListener('click', markRead);
  document.getElementById('sinceReadAll').addEventListener('click', markRead);
  body.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-row]'); if (!li) return;
    const r = document.getElementById(li.dataset.row);
    r.scrollIntoView({ block: 'center', behavior: 'smooth' });
    r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash');
  });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) drawer.hidden = true; });

  // mock-only: simulate a last visit
  const sim = document.getElementById('simSeen');
  const versions = data.releases.map((r) => r.version).filter((v) => num(v) < num(current));
  sim.innerHTML = '<option value="">first visit</option>' + versions.slice(0, 40).map((v) => '<option>' + v + '</option>').join('');
  sim.addEventListener('change', () => { try { if (sim.value) localStorage.setItem(KEY, sim.value); else localStorage.removeItem(KEY); } catch (e) {} render(); });
})();
`;
html = html.replace('</body>', drawer + '\n</body>');
html = inject(html, { title: 'Mock-up 03 — Since your last visit', css, js });
html = html.replace('<div class="dashboard-grid">', '<div class="dashboard-grid">' + banner('03', 'Personal "since your last visit" feed replaces the one-release What’s New modal',
  ['pick a simulated last visit', 'Show changes → click an entry to jump to its row', 'Mark as read', 'RSS link in the header']).replace('</div>\n    </div>', '<span class="mock-sim">Simulate last visit: <select id="simSeen"></select></span></div>\n    </div>') + strip);
write('03-since-last-visit.html', html);

// ---- feed.xml: what the bot would emit alongside changes.json ----
const d = JSON.parse(changes);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const site = 'https://dommango.github.io/claude-code-placemat/';
const items = d.releases.slice(0, 20).map((rel) => `  <entry>
    <title>Claude Code ${esc(rel.label)} — ${rel.entries.length} placemat changes</title>
    <id>${site}changelog.html#cc-${rel.version.replace(/\./g, '-')}</id>
    <link href="${site}changelog.html#cc-${rel.version.replace(/\./g, '-')}"/>
    <updated>${rel.date}T09:00:00Z</updated>
    <content type="html">${esc('<ul>' + rel.entries.map((e) => '<li><b>' + e.tag + '</b> ' + e.html + '</li>').join('') + '</ul>')}</content>
  </entry>`).join('\\n');
fs.writeFileSync(path.join(OUT, 'feed.xml'), `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Claude Code Placemat — changes</title>
  <link href="${site}"/>
  <link rel="self" href="${site}feed.xml"/>
  <id>${site}</id>
  <updated>${d.releases[0].date}T09:00:00Z</updated>
${items}
</feed>
`);
console.log('wrote feed.xml');
