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
