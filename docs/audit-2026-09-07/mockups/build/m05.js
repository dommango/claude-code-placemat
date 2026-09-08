'use strict';
const { SRC, addRowIds, banner, inject, silenceWhatsNew, write } = require('./common');
const { transform } = require('./m04');
let { html } = transform(silenceWhatsNew(addRowIds(SRC)));

// Print button in the header + a print-only running header line.
html = html.replace('<a href="changelog.html" class="header-link">Changelog →</a>', '<a href="changelog.html" class="header-link">Changelog →</a>\n            <button type="button" class="header-link print-btn" id="printBtn" title="Print or save as PDF (Ctrl P)">⎙ Print</button>');
html = html.replace('<div class="dashboard-grid">', `<div class="print-head" aria-hidden="true">
        <span class="print-head-title">Claude Code <b>PLACEMAT</b></span>
        <span>As of release v2.1.263</span>
        <span>■ = new in recent release &nbsp; □ = unverified</span>
        <span>dommango.github.io/claude-code-placemat</span>
    </div>
    <div class="dashboard-grid">`);

// The same rules serve @media print and an on-screen preview class.
const printRules = (scope) => `
${scope} .notes, ${scope} .notes-btn, ${scope} .global-header, ${scope} .legend-strip, ${scope} .no-results, ${scope} .whats-new-overlay { display: none !important; }
${scope} .print-head { display: flex; }
${scope} html, ${scope} body { padding: 0; background: #fff; color: #111; font-size: 8pt; line-height: 1.25; }
${scope} .dashboard-grid { display: block; column-count: 4; column-gap: 5mm; column-fill: auto; max-width: none; }
${scope} .card { break-inside: auto; page-break-inside: auto; display: block; margin: 0 0 3mm; padding: 0; border: none; border-radius: 0; background: none; }
${scope} .card h2 { font-size: 8.5pt; color: #111; border-bottom: 1.5px solid #111; padding-bottom: 1.5px; margin: 0 0 2mm; break-after: avoid; page-break-after: avoid; }
${scope} .card h2::before { background: #c2410c; }
${scope} .search-group { margin-bottom: 2mm; break-inside: auto; }
${scope} .search-group h3 { font-size: 6.5pt; color: #0f766e; margin: 0 0 1mm; break-after: avoid; page-break-after: avoid; }
${scope} .search-group h3::before { color: #c2410c; }
${scope} .search-group + .search-group h3 { border-top: 1px dashed #bbb; padding-top: 1mm; margin-top: 1mm; }
${scope} table { font-size: 7.5pt; }
${scope} tr { break-inside: avoid; page-break-inside: avoid; }
${scope} td { padding: 0.6mm 1mm 0.4mm 0; border-bottom: 0.4pt dotted #999; vertical-align: top; }
${scope} td:first-child { width: 40%; }
${scope} .desc { font-size: 7pt; color: #333; line-height: 1.25; }
${scope} code { font-size: 6.8pt; background: #f1efe9; color: #111; border: 0.4pt solid #ddd; padding: 0 2px; cursor: default; }
${scope} .desc code { font-size: 6.5pt; }
${scope} code.new { background: #dfe8de; border-color: #0f766e; box-shadow: inset 2px 0 0 0 #0f766e; }
${scope} code.new::after { content: " ■"; color: #0f766e; font-size: 5pt; }
${scope} code.unverified { background: #f7edd6; border-color: #b47400; box-shadow: inset 2px 0 0 0 #b47400; }
${scope} code.unverified::after { content: " □"; color: #b47400; font-size: 5pt; }
${scope} .global-footer { border: none; padding: 2mm 0 0; font-size: 6pt; color: #666; text-align: left; }
${scope} .global-footer a { color: #666; }
${scope} .global-footer br { display: none; }
${scope} * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

const css = `
/* ---- proposal: print stylesheet ---- */
.print-head { display: none; justify-content: space-between; gap: 6mm; font-family: var(--font-mono); font-size: 7pt; color: #333; border-bottom: 1.5px solid #111; padding-bottom: 1mm; margin-bottom: 3mm; }
.print-head-title { font-family: var(--font-sans); font-weight: 700; font-size: 9pt; color: #111; }
.print-head-title b { font-family: var(--font-pixel); font-size: 6pt; color: #c2410c; font-weight: 400; margin-left: 4px; }
.print-btn { cursor: pointer; background: none; font-family: var(--font-sans); }
@page { size: A4 landscape; margin: 7mm 8mm; }
@media print {${printRules('')}}
/* on-screen preview of the same rules (mock-up aid; production keeps only the @media print block) */
html:has(body.print-preview) { background: #777 !important; }
body.print-preview { width: 297mm; margin: 12px auto; box-shadow: 0 0 0 1px #ccc, 0 8px 30px rgba(0,0,0,0.4); padding: 7mm 8mm !important; background: #fff !important; color: #111 !important; }
body.print-preview .dashboard-grid { column-fill: balance; }
${printRules('.print-preview')}
.print-preview .mock-banner { display: block !important; grid-column: auto; column-span: all; background: #fff5f0; color: #111; margin-bottom: 3mm; }
.print-preview .mock-banner .mock-try { color: #333; }
.print-preview .print-head { column-span: all; }
`;
const js = `
document.getElementById('printBtn').addEventListener('click', () => window.print());
// mock-only: toggle an on-screen preview of the print layout
(function () {
  const b = document.getElementById('previewBtn');
  b.addEventListener('click', () => { const on = document.body.classList.toggle('print-preview'); b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Back to screen view' : 'Preview print layout'; });
})();
`;
html = inject(html, { title: 'Mock-up 05 — Printable placemat', css, js });
html = html.replace('<div class="dashboard-grid">', '<div class="dashboard-grid">' + banner('05', 'A placemat you can actually print — A4 landscape, 4 columns, summaries only, status glyphs that survive greyscale',
  ['click ⎙ Print in the header (or Ctrl P) and check the preview', 'or click the preview button here →']).replace('</div>\n    </div>', '<button type="button" id="previewBtn" class="theme-toggle" aria-pressed="false">Preview print layout</button></div>\n    </div>'));
write('05-print-placemat.html', html);
