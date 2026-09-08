'use strict';
const { SRC, addRowIds, banner, inject, silenceWhatsNew, write } = require('./common');

let html = silenceWhatsNew(addRowIds(SRC));

// --- 1. Split the 149-item "Config & Environment" card into two cards, and
//        peel managed/enterprise settings out of "Key JSON Settings".
const cardRe = /<div class="card">\s*<h2>Config & Environment<\/h2>([\s\S]*?)<\/div>\s*(?=<div class="card">)/;
const m = html.match(cardRe);
if (!m) throw new Error('config card not found');
const groups = m[1].split(/(?=<div class="search-group">)/).filter((s) => s.includes('search-group'));
const byName = (n) => groups.find((g) => g.includes(`<h3>${n}</h3>`));
let jsonGroup = byName('Key JSON Settings');
const rows = jsonGroup.match(/<tr class="search-item"[\s\S]*?<\/tr>/g);
const isManaged = (r) => /managed|enterprise|admin-tier|policy key|organization/i.test(r) && !/<code>(modelPricing|defaultMode|footerLinksRegexes)<\/code>/.test(r);
const managedRows = rows.filter(isManaged), coreRows = rows.filter((r) => !isManaged(r));
const thead = '<thead><tr><th scope="col" class="sr-only">Item</th><th scope="col" class="sr-only">Description</th></tr></thead>';
const group = (title, rs) => `<div class="search-group">\n<h3>${title}</h3>\n<table>\n${thead}\n${rs.join('\n')}\n</table>\n</div>`;
const settingsCard = `<div class="card" id="card-settings">\n<h2>Settings (JSON)</h2>\n${byName("Files & Priority")}\n${group('Key JSON Settings', coreRows)}\n${group('Managed & Enterprise', managedRows)}\n</div>\n`;
const envCard = `<div class="card" id="card-env">\n<h2>Environment Variables</h2>\n${byName('Environment Variables').replace('<h3>Environment Variables</h3>', '<h3>All Variables</h3>')}\n</div>\n`;
html = html.replace(cardRe, settingsCard + envCard);

// --- 2. Every search-group becomes a <details> with a count in its summary.
html = html.replace(/<div class="search-group">\s*<h3>(.*?)<\/h3>([\s\S]*?)<\/table>\s*<\/div>/g, (all, title, body) => {
  const n = (body.match(/search-item/g) || []).length;
  const key = title.replace(/&amp;/g, "&");
  return `<details class="search-group" open data-group="${key}">\n<summary><h3>${title}</h3><span class="group-count">${n}</span></summary>${body}</table>\n</details>`;
});
// --- 3. Card headings get ids + counts; build the nav from them.
const cards = [];
html = html.replace(/<div class="card"( id="[^"]*")?>\s*<h2>(.*?)<\/h2>([\s\S]*?)(?=<div class="card"|<div class="no-results)/g, (all, idAttr, title, body) => {
  const id = idAttr ? idAttr.match(/id="([^"]+)"/)[1] : 'card-' + title.toLowerCase().replace(/&amp;/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const n = (body.match(/search-item/g) || []).length;
  cards.push({ id, title, n });
  return `<div class="card" id="${id}">\n<h2>${title} <span class="card-count">${n}</span></h2>${body}`;
});
const nav = `
    <nav class="section-nav" aria-label="Sections">
      <div class="section-nav-inner">
        <div class="section-chips">${cards.map((c) => `<a href="#${c.id}" data-target="${c.id}">${c.title}<span>${c.n}</span></a>`).join('')}</div>
        <div class="section-tools">
          <button type="button" id="collapseAll">Collapse all</button>
          <button type="button" id="expandAll">Expand all</button>
          <button type="button" id="densityBtn" aria-pressed="false">Compact</button>
        </div>
      </div>
    </nav>`;

const css = `
/* ---- proposal: sticky section nav ---- */
body { padding-top: 96px; }
.section-nav { position: fixed; top: 52px; left: 0; width: 100%; z-index: 999; background: var(--header-bg); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--border); }
.section-nav-inner { max-width: 1900px; margin: 0 auto; padding: 6px 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.section-chips { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; min-width: 0; }
.section-chips::-webkit-scrollbar { display: none; }
.section-chips a { flex: 0 0 auto; display: inline-flex; align-items: center; gap: 6px; font-family: var(--font-mono); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--fg-muted); text-decoration: none; padding: 4px 9px; border: 1px solid var(--border); border-radius: 999px; transition: color var(--dur) var(--ease), border-color var(--dur) var(--ease); }
.section-chips a span { color: var(--fg-dim); font-size: 10px; }
.section-chips a:hover { color: var(--fg-main); border-color: var(--border-strong); }
.section-chips a.is-active { color: var(--coral); border-color: var(--coral); }
.section-chips a.is-active span { color: var(--coral-2); }
.section-tools { display: flex; gap: 6px; flex-shrink: 0; }
.section-tools button { background: none; border: 1px solid var(--border); color: var(--fg-muted); font-family: var(--font-mono); font-size: 10.5px; padding: 4px 9px; border-radius: var(--r-sm); cursor: pointer; }
.section-tools button:hover { color: var(--fg-main); border-color: var(--teal); }
.section-tools button[aria-pressed="true"] { color: var(--teal-2); border-color: var(--teal); }
.card { scroll-margin-top: 100px; }
.card-count { margin-left: auto; font-family: var(--font-mono); font-weight: 400; font-size: 10px; color: var(--fg-dim); letter-spacing: 0; }

/* ---- proposal: collapsible groups ---- */
details.search-group > summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 8px; margin: 0 0 6px 0; }
details.search-group > summary::-webkit-details-marker { display: none; }
details.search-group > summary h3 { margin: 0; }
details.search-group > summary h3::before { transition: transform var(--dur) var(--ease); }
details.search-group:not([open]) > summary h3::before { transform: rotate(0deg) translateY(-1px); }
details.search-group[open] > summary h3::before { transform: rotate(90deg); }
details.search-group:not([open]) > summary { margin-bottom: 0; }
details.search-group:not([open]) > summary h3 { color: var(--fg-muted); }
.group-count { font-family: var(--font-mono); font-size: 10px; color: var(--fg-dim); }
details.search-group > summary:hover h3 { color: var(--teal-2); }
details.search-group + details.search-group > summary h3 { margin-top: 4px; padding-top: 8px; border-top: 1px dashed var(--border); }
details.search-group + details.search-group > summary { padding-top: 0; }

/* ---- proposal: compact density ---- */
body.density-compact { font-size: 12.5px; }
body.density-compact td { padding: 2px 5px 2px; }
body.density-compact td:first-child { width: 38%; }
body.density-compact .desc { font-size: 11px; line-height: 1.3; }
body.density-compact code { font-size: 10.5px; }
body.density-compact .card { padding: 10px 12px 8px; }
body.density-compact .dashboard-grid { gap: 10px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
@media (max-width: 700px) { body { padding-top: 140px; } .section-nav { top: 96px; } .section-tools { display: none; } }
`;

const js = `
// ---- proposal: section nav active state ----
(function () {
  const chips = [...document.querySelectorAll('.section-chips a')];
  const cards = chips.map((a) => document.getElementById(a.dataset.target)).filter(Boolean);
  const setActive = (id) => chips.forEach((a) => a.classList.toggle('is-active', a.dataset.target === id));
  const io = new IntersectionObserver((entries) => {
    const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
    if (visible.length) setActive(visible[0].target.id);
  }, { rootMargin: '-100px 0px -60% 0px', threshold: 0 });
  cards.forEach((c) => io.observe(c));
})();

// ---- proposal: collapsible groups with remembered state ----
(function () {
  const KEY = 'placemat-collapsed';
  const groups = [...document.querySelectorAll('details.search-group')];
  let collapsed = new Set();
  try { collapsed = new Set(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch (e) {}
  groups.forEach((d) => { if (collapsed.has(d.dataset.group)) d.open = false; });
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify([...collapsed])); } catch (e) {} };
  groups.forEach((d) => d.addEventListener('toggle', () => {
    if (searchInput.value.trim()) return;           // search-driven opens are temporary
    d.open ? collapsed.delete(d.dataset.group) : collapsed.add(d.dataset.group);
    save();
  }));
  document.getElementById('collapseAll').addEventListener('click', () => { groups.forEach((d) => { d.open = false; }); });
  document.getElementById('expandAll').addEventListener('click', () => { groups.forEach((d) => { d.open = true; }); });
  // While a search term is active, every matching group must be visible.
  const origSearch = performSearch;
  window.performSearch = function (term) {
    origSearch(term);
    if (term.trim()) groups.forEach((d) => { d.open = true; });
    else groups.forEach((d) => { d.open = !collapsed.has(d.dataset.group); });
  };
  searchInput.removeEventListener('input', origSearch);
  searchInput.addEventListener('input', (e) => window.performSearch(e.target.value));
})();

// ---- proposal: density toggle ----
(function () {
  const KEY = 'placemat-density', btn = document.getElementById('densityBtn');
  const apply = (compact) => { document.body.classList.toggle('density-compact', compact); btn.setAttribute('aria-pressed', String(compact)); btn.textContent = 'Compact'; };
  let compact = false; try { compact = localStorage.getItem(KEY) === 'compact'; } catch (e) {}
  apply(compact);
  btn.addEventListener('click', () => { compact = !compact; apply(compact); try { localStorage.setItem(KEY, compact ? 'compact' : 'comfortable'); } catch (e) {} });
})();
`;

const afterHeader = nav;
html = inject(html, { title: 'Mock-up 01 — Section nav + collapsible groups', css, js, afterHeader });
html = html.replace('<div class="dashboard-grid">', '<div class="dashboard-grid">' + banner('01', 'Section nav, collapsible groups, split Config card, compact density',
  ['click a chip in the sticky bar', 'click a group heading to fold it', 'Collapse all', 'Compact', 'search "hook" — folded groups open, then restore']));
write('01-nav-and-collapse.html', html);
console.log(cards.map((c) => c.title + ':' + c.n).join(' | '));
