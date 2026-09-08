'use strict';
const { SRC, addRowIds, banner, inject, silenceWhatsNew, write } = require('./common');

let html = silenceWhatsNew(addRowIds(SRC));

// Permalink affordance in every row's first cell.
html = html.replace(/<tr class="search-item" id="(i-[^"]+)"><td>/g, '<tr class="search-item" id="$1"><td><a class="row-link" href="#$1" aria-label="Copy link to this entry">#</a>');
// Result count next to the search box.
html = html.replace('<span class="kbd" id="searchKbd">⌘K</span>', '<span class="kbd" id="searchKbd">⌘K</span>\n                <span class="search-count" id="searchCount" aria-live="polite"></span>');

const css = `
/* ---- proposal: permalinks ---- */
.search-item { scroll-margin-top: 64px; }
.search-item td:first-child { position: relative; }
.row-link { position: absolute; left: -14px; top: 5px; font-family: var(--font-mono); font-size: 11px; color: var(--fg-dim); text-decoration: none; opacity: 0; transition: opacity var(--dur) var(--ease), color var(--dur) var(--ease); }
.search-item:hover .row-link, .search-item:focus-within .row-link, .row-link:focus-visible { opacity: 1; }
.row-link:hover { color: var(--coral); }
.row-link.copied { color: var(--teal-2); }
.search-item:target { background: var(--new-bg); box-shadow: inset 2px 0 0 0 var(--teal); }
.card { padding-left: 22px; }

/* ---- proposal: search highlight + count ---- */
mark.hit { background: rgba(217,119,87,0.28); color: inherit; border-radius: 2px; padding: 0 1px; }
:root[data-theme="light"] mark.hit { background: rgba(194,65,12,0.22); }
.search-count { position: absolute; right: 8px; font-family: var(--font-mono); font-size: 10px; color: var(--teal-2); background: var(--bg-card); border: 1px solid var(--teal); border-radius: var(--r-xs); padding: 1px 5px; pointer-events: none; display: none; }
.search-wrap.has-term .kbd { display: none; }
.search-wrap.has-term .search-count { display: inline-block; }

/* ---- proposal: roving focus (one tab stop for the whole grid) ---- */
.search-item:focus { outline: none; background: var(--row-hover); box-shadow: inset 2px 0 0 0 var(--coral); }
.search-item:focus-visible { outline: none; }
code { cursor: pointer; }
`;

const js = `
// ---- proposal: normalised matching + highlight + count + URL state ----
(function () {
  const rows = [...document.querySelectorAll('.search-item')];
  const norm = (s) => s.toLowerCase().replace(/[\\s+_\\-\\/.:~]/g, '');
  rows.forEach((r) => {
    const g = r.closest('.search-group'); const gh = g && g.querySelector('h3');
    r.dataset.norm = norm((gh ? gh.innerText + ' ' : '') + r.innerText);
  });
  const countEl = document.getElementById('searchCount');
  const wrap = document.querySelector('.search-wrap');

  function highlight(td, term) {
    td.querySelectorAll('mark.hit').forEach((m) => m.replaceWith(m.textContent));
    td.normalize();
    if (!term || term.length < 2) return;
    const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const chars = term.split('').filter((ch) => !/[\\s+_\\-\\/.:~]/.test(ch)).map((ch) => ch.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'));
    if (!chars.length) return;
    const re = new RegExp(chars.join('[\\\\s+_\\\\-\\\\/.:~]*'), 'i');
    nodes.forEach((n) => {
      if (n.parentElement.closest('a.row-link')) return;
      const m = n.data.match(re);
      if (!m) return;
      const mark = document.createElement('mark'); mark.className = 'hit';
      const after = n.splitText(m.index); after.data = after.data.slice(m[0].length);
      mark.textContent = m[0];
      n.parentNode.insertBefore(mark, after);
    });
  }

  const origSearch = performSearch;
  window.performSearch = function (raw) {
    const term = raw.trim();
    const t = norm(term);
    const cards = document.querySelectorAll('.dashboard-grid .card:not(.search-exclude)');
    let total = 0;
    cards.forEach((card) => {
      let cardHas = false;
      card.querySelectorAll('.search-group').forEach((g) => {
        let groupHas = false;
        g.querySelectorAll('.search-item').forEach((r) => {
          const hit = !t || r.dataset.norm.includes(t);
          r.style.display = hit ? 'table-row' : 'none';
          r.querySelectorAll('td').forEach((td) => highlight(td, hit ? term : ''));
          if (hit) { groupHas = true; total++; }
        });
        g.style.display = groupHas ? 'block' : 'none';
        if (groupHas) cardHas = true;
      });
      card.style.display = cardHas ? 'block' : 'none';
    });
    document.getElementById('noResults').classList.toggle('is-visible', total === 0);
    wrap.classList.toggle('has-term', !!t);
    countEl.textContent = total + (total === 1 ? ' match' : ' matches');
    const url = new URL(location.href);
    if (t) url.searchParams.set('q', term); else url.searchParams.delete('q');
    history.replaceState(null, '', url);
    rebindRoving();
  };
  searchInput.removeEventListener('input', origSearch);
  searchInput.addEventListener('input', (e) => window.performSearch(e.target.value));
  const q = new URLSearchParams(location.search).get('q');
  if (q) { searchInput.value = q; window.performSearch(q); }

  // Keyboard: "/" focuses search, Esc clears it.
  window.addEventListener('keydown', (e) => {
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement.tagName);
    if (e.key === '/' && !inField) { e.preventDefault(); searchInput.focus(); searchInput.select(); }
    if (e.key === 'Escape' && document.activeElement === searchInput) { searchInput.value = ''; window.performSearch(''); searchInput.blur(); }
  });

  // ---- proposal: permalinks (copy on click, no navigation jump) ----
  document.querySelectorAll('.row-link').forEach((a) => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = location.origin + location.pathname + a.getAttribute('href');
      try { await navigator.clipboard.writeText(url); } catch (err) {}
      history.replaceState(null, '', a.getAttribute('href'));
      a.classList.add('copied'); a.textContent = '✓';
      setTimeout(() => { a.classList.remove('copied'); a.textContent = '#'; }, 900);
    });
  });
  if (location.hash) { const t = document.querySelector(location.hash); if (t) t.scrollIntoView({ block: 'center' }); }

  // ---- proposal: roving tabindex — one tab stop, arrows move, Enter copies ----
  document.querySelectorAll('code').forEach((c) => { c.tabIndex = -1; });
  function visibleRows() { return rows.filter((r) => r.style.display !== 'none' && r.closest('.card').style.display !== 'none'); }
  function rebindRoving() {
    const v = visibleRows();
    rows.forEach((r) => { r.tabIndex = -1; });
    if (v[0]) v[0].tabIndex = 0;
  }
  rebindRoving();
  document.querySelector('.dashboard-grid').addEventListener('keydown', (e) => {
    const r = e.target.closest('.search-item'); if (!r) return;
    const v = visibleRows(); const i = v.indexOf(r);
    if (e.key === 'ArrowDown' && v[i + 1]) { e.preventDefault(); r.tabIndex = -1; v[i + 1].tabIndex = 0; v[i + 1].focus(); }
    if (e.key === 'ArrowUp' && v[i - 1]) { e.preventDefault(); r.tabIndex = -1; v[i - 1].tabIndex = 0; v[i - 1].focus(); }
    if (e.key === 'Enter') { e.preventDefault(); const c = r.querySelector('code'); if (c) copyText(c, c.innerText); }
    if (e.key === 'l' || e.key === 'L') { r.querySelector('.row-link').click(); }
  });
  searchInput.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { const v = visibleRows(); if (v[0]) { e.preventDefault(); v[0].focus(); } } });
})();
`;
html = inject(html, { title: 'Mock-up 02 — Better search, permalinks, keyboard', css, js });
html = html.replace('<div class="dashboard-grid">', '<div class="dashboard-grid">' + banner('02', 'Search that highlights and counts, per-entry permalinks, one-tab-stop keyboard model',
  ['press / then type ctrl+r', 'type "hook" — see the count and the highlights', 'hover a row, click # to copy its link', 'Tab from search, then ↓ ↑ to move, Enter to copy', 'Esc clears']));
write('02-search-and-links.html', html);
