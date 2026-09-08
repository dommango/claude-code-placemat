'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const OUT = path.resolve(__dirname, '..');
// Mock-ups were built from index.html as it stood at the time of the audit
// (CC v2.1.263, before the audit's recommendations were implemented). They are
// frozen artefacts of the proposal — rebuilding them against the implemented
// placemat would apply the proposals a second time, so refuse loudly instead.
const SRC = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!SRC.includes('<div class="search-group">') || SRC.includes('id="sinceStrip"')) {
  console.error([
    'These mock-ups are frozen at the pre-implementation placemat and cannot be rebuilt.',
    'index.html has already adopted the audit recommendations (feat/placemat-v1.2).',
    'To see the proposals as they were pitched, open the committed HTML files in',
    'docs/audit-2026-09-07/mockups/ directly, or rebuild from the audit base commit:',
    '  git worktree add /tmp/placemat-audit-base 89e0325',
  ].join('\n'));
  process.exit(1);
}

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');

// Give every .search-item row a stable id derived from its first <code>.
function addRowIds(html) {
  const seen = new Map();
  return html.replace(/<tr class="search-item"><td>(.*?)<\/td>/g, (m, cell) => {
    const first = (cell.match(/<code[^>]*>(.*?)<\/code>/) || [, cell])[1];
    let slug = stripTags(first).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
    const n = (seen.get(slug) || 0) + 1; seen.set(slug, n);
    if (n > 1) slug += '-' + n;
    return `<tr class="search-item" id="i-${slug}"><td>${cell}</td>`;
  });
}

// Mock-up banner strip so the reader knows what is being demonstrated.
function banner(num, title, tryList) {
  return `
    <div class="mock-banner" role="note">
      <div class="mock-banner-row">
        <span class="mock-tag">MOCK-UP ${num}</span>
        <strong>${title}</strong>
        <span class="mock-try">Try: ${tryList.map((t) => `<span>${t}</span>`).join('')}</span>
      </div>
    </div>`;
}
const bannerCss = `
/* ---- mock-up banner (not part of the proposal) ---- */
.mock-banner { grid-column: 1 / -1; border: 1px dashed var(--coral); border-radius: var(--r-md); padding: 8px 14px; background: rgba(217,119,87,0.06); font-size: 12px; }
.mock-banner-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.mock-tag { font-family: var(--font-pixel); font-size: 8px; color: var(--coral); letter-spacing: 0; }
.mock-try { color: var(--fg-muted); display: flex; flex-wrap: wrap; gap: 6px; }
.mock-try span { border: 1px solid var(--border-strong); border-radius: 999px; padding: 1px 8px; font-family: var(--font-mono); font-size: 10.5px; }
.mock-try span::before { content: "→ "; color: var(--teal); }
@media print { .mock-banner { display: none !important; } }
`;

function inject(html, { title, css, js, afterHeader = '', beforeGridEnd = '' }) {
  let out = html;
  // Function replacers: a literal "$&" inside injected JS must not be expanded by String.replace.
  out = out.replace(/<title>.*?<\/title>/, () => `<title>${title}</title>`);
  out = out.replace('<link rel="stylesheet" href="placemat.css">', () => `<link rel="stylesheet" href="placemat.css">\n    <style>${bannerCss}\n${css}\n    </style>`);
  if (afterHeader) out = out.replace('<div class="dashboard-grid">', () => `${afterHeader}\n    <div class="dashboard-grid">`);
  if (beforeGridEnd) out = out.replace('<footer class="global-footer">', () => `${beforeGridEnd}\n        <footer class="global-footer">`);
  if (js) out = out.replace('</body>', () => `    <script>\n${js}\n    </script>\n</body>`);
  return out;
}

// Mock-ups must not pop the stale What's New modal: blank its data.
function silenceWhatsNew(html) {
  return html.replace(/("changes":\s*)\[[\s\S]*?\](\s*\}\s*<\/script>)/, '$1[]$2');
}

function write(name, html) {
  fs.writeFileSync(path.join(OUT, name), html);
  console.log('wrote', name, (html.length / 1024).toFixed(0) + 'KB');
}
module.exports = { SRC, OUT, ROOT, addRowIds, banner, inject, silenceWhatsNew, write, stripTags };
