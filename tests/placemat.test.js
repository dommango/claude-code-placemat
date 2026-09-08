#!/usr/bin/env node
// Zero-dependency structural/regression tests for the placemat.
// No build step, no npm install — run with: node tests/placemat.test.js
//
// These aren't full browser tests (see PR history for how that was verified
// manually with Playwright); they're fast, dependency-free guards against the
// specific regressions this project has actually hit.

'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ok - ${name}`);
  } catch (err) {
    failed++;
    console.log(`  FAIL - ${name}`);
    console.log(`    ${err.message}`);
  }
}

function extractScripts(html) {
  const scripts = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) scripts.push(m[1]);
  return scripts;
}

// --- index.html ---
{
  const html = read('index.html');
  const scripts = extractScripts(html);

  test('index.html: has exactly 2 bare <script> blocks', () => {
    assert.strictEqual(scripts.length, 2);
  });

  test('index.html: inline scripts are syntactically valid', () => {
    scripts.forEach((s) => new vm.Script(s));
  });

  test('index.html: whatsNewData JSON block parses', () => {
    const m = html.match(/<script type="application\/json" id="whatsNewData">\s*([\s\S]*?)\s*<\/script>/);
    assert.ok(m, 'whatsNewData script block not found');
    const data = JSON.parse(m[1]);
    assert.ok(data.version && data.date && Array.isArray(data.changes));
  });

  // Regression guard for a real bug: the whatsNewData <script> element must appear
  // BEFORE the <script> that reads it via getElementById, or initWhatsNew's early
  // `if (!dataEl) return` silently no-ops on every single page load, forever.
  test('index.html: whatsNewData script tag appears before the script that reads it', () => {
    const dataTagIndex = html.indexOf('<script type="application/json" id="whatsNewData">');
    const readerIndex = html.indexOf("getElementById('whatsNewData')");
    assert.ok(dataTagIndex !== -1 && readerIndex !== -1, 'expected markers not found');
    assert.ok(dataTagIndex < readerIndex, 'whatsNewData script tag must precede the script that reads it');
  });

  test('index.html: every <table> has a matching <thead> with sr-only <th scope="col">', () => {
    const tableCount = (html.match(/<table>/g) || []).length;
    const theadCount = (html.match(/<thead><tr><th scope="col" class="sr-only">/g) || []).length;
    assert.ok(tableCount > 0, 'no tables found — selector may be stale');
    assert.strictEqual(theadCount, tableCount, `${theadCount} sr-only theads for ${tableCount} tables`);
  });

  test('index.html: no leftover inline style="" attributes', () => {
    assert.strictEqual(/style="/.test(html), false);
  });

  test('index.html: Config card is split into Settings (JSON) and Environment Variables', () => {
    assert.ok(!html.includes('<h2>Config & Environment'), 'old Config card still present');
    const settings = html.indexOf('<h2>Settings (JSON)');
    const env = html.indexOf('<h2>Environment Variables');
    assert.ok(settings !== -1 && env !== -1, 'new cards missing');
    assert.ok(settings < env, 'Settings card must come before Environment Variables');
    const managed = html.indexOf('<h3>Managed & Enterprise</h3>');
    assert.ok(managed > settings && managed < env, 'Managed & Enterprise group must live in the Settings card');
  });

  test('index.html: every search-group is a <details> with a summary, h3 and count span', () => {
    const groupCount = (html.match(/<details class="search-group" open data-group="[^"]+">/g) || []).length;
    const h3Count = (html.match(/<h3>/g) || []).length;
    const summaryCount = (html.match(/<summary><h3>[^<]+<\/h3><span class="group-count"><\/span><\/summary>/g) || []).length;
    assert.ok(groupCount > 0, 'no details.search-group found');
    assert.strictEqual(groupCount, h3Count, `${groupCount} details for ${h3Count} h3 headings`);
    assert.strictEqual(summaryCount, h3Count, `${summaryCount} well-formed summaries for ${h3Count} h3 headings`);
    assert.strictEqual((html.match(/<div class="search-group">/g) || []).length, 0, 'old div.search-group still present');
  });

  test('index.html: section nav has one chip per content card, in card order', () => {
    const cardIds = Array.from(html.matchAll(/<div class="card" id="(card-[a-z-]+)">/g), (m) => m[1]);
    assert.ok(cardIds.length >= 8, `expected 8+ card ids, found ${cardIds.length}`);
    const nav = html.match(/<nav class="section-nav"[\s\S]*?<\/nav>/);
    assert.ok(nav, 'section-nav not found');
    const chipIds = Array.from(nav[0].matchAll(/href="#(card-[a-z-]+)"/g), (m) => m[1]);
    assert.deepStrictEqual(chipIds, cardIds, 'nav chips must match card ids and order');
    assert.ok(html.indexOf('<nav class="section-nav"') < html.indexOf('class="dashboard-grid"'), 'nav must precede the grid');
  });

  test('index.html: command builder single-quote escaping is shell-safe', () => {
    // Extract shellSingleQuote's body and re-run it in isolation — this is the
    // exact logic that generates a copy-pasteable `claude -p '...'` command.
    const fnMatch = html.match(/const shellSingleQuote = \(str\) => (`[\s\S]*?`);/);
    assert.ok(fnMatch, 'shellSingleQuote definition not found');
    const context = { result: null };
    vm.createContext(context);
    vm.runInContext(`result = (str) => ${fnMatch[1]};`, context);
    const wrap = context.result;

    const cases = [
      { input: `it's a test`, mustContain: `'\\''`, mustNotContain: undefined },
      { input: `$HOME`, mustNotContain: undefined }, // must stay literal inside single quotes
      { input: '`whoami`', mustNotContain: undefined },
    ];
    cases.forEach(({ input }) => {
      const out = wrap(input);
      assert.ok(out.startsWith("'") && out.endsWith("'"), `${JSON.stringify(out)} not single-quote wrapped`);
    });
    // The specific escape sequence for an embedded single quote must be the POSIX-safe '\''
    const escaped = wrap(`it's a test`);
    assert.ok(escaped.includes(`'\\''`), `expected POSIX '\\'' escape, got ${escaped}`);
  });
}

// --- changelog.html ---
{
  const html = read('changelog.html');
  const scripts = extractScripts(html);

  test('changelog.html: inline scripts are syntactically valid', () => {
    scripts.forEach((s) => new vm.Script(s));
  });

  test('changelog.html: links the shared placemat.css (not a duplicated copy)', () => {
    assert.ok(/<link rel="stylesheet" href="placemat\.css">/.test(html));
  });

  test('changelog.html: has the same blocking theme-init script as index.html (no FOUC, no dark lock-in)', () => {
    assert.ok(/localStorage\.getItem\('placemat-theme'\)/.test(html));
    assert.ok(!/<body data-theme="dark">/.test(html), 'body should not hardcode a theme');
  });

  test('changelog.html: theme toggle persists to localStorage', () => {
    assert.ok(/localStorage\.setItem\('placemat-theme', next\)/.test(html));
  });

  test('changelog.html: .change-list li wraps instead of squeezing code chips onto one line', () => {
    // Regression guard: linking placemat.css's code{word-break:break-word} into an
    // unwrapped flex row broke long flags mid-word (e.g. "--permissio n-mode").
    assert.ok(/\.change-list li \{[^}]*flex-wrap:\s*wrap/.test(html));
  });
}

// --- placemat.css ---
{
  const css = read('placemat.css');
  ['.sr-only', '.no-results', '.legend-strip', '.legend-strip-row'].forEach((selector) => {
    test(`placemat.css: defines ${selector}`, () => {
      assert.ok(css.includes(selector), `${selector} not found in placemat.css`);
    });
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
