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
    const summaryCount = (html.match(/<summary><h3>[^<]+<\/h3><span class="group-count"><\/span><\/summary>/g) || []).length;
    assert.ok(groupCount > 0, 'no details.search-group found');
    assert.strictEqual(summaryCount, groupCount, `${summaryCount} well-formed summaries for ${groupCount} groups`);
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

  test('index.html: every search-item row has a unique i- id and a matching permalink', () => {
    const rows = html.match(/<tr class="search-item"[^>]*>/g) || [];
    assert.ok(rows.length > 0, 'no rows found');
    const ids = rows.map((r) => (r.match(/ id="(i-[a-z0-9-]+)"/) || [])[1]);
    assert.strictEqual(ids.filter((x) => !x).length, 0, 'rows without an i- id');
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate row ids');
    const links = Array.from(html.matchAll(/<tr class="search-item" id="(i-[a-z0-9-]+)"><td><a class="row-link" href="#(i-[a-z0-9-]+)"/g));
    assert.strictEqual(links.length, rows.length, `${links.length} permalinks for ${rows.length} rows`);
    links.forEach((m) => assert.strictEqual(m[1], m[2], 'permalink href must match the row id'));
  });

  test('index.html: search normaliser strips separators so "ctrl+r" matches "Ctrl R"', () => {
    const fn = html.match(/const normaliseSearch = \(s\) => (.*?);\n/);
    assert.ok(fn, 'normaliseSearch not found');
    const norm = new Function('return (s) => ' + fn[1])();
    assert.strictEqual(norm('Ctrl R'), norm('ctrl+r'));
    assert.strictEqual(norm('--permission-mode manual'), 'permissionmodemanual');
    assert.strictEqual(norm('~/.claude/settings.json'), 'claudesettingsjson');
  });

  test('index.html: search box has a live result count and the grid is a main landmark', () => {
    assert.ok(/<span class="search-count" id="searchCount" aria-live="polite"><\/span>/.test(html));
    assert.ok(html.includes('<main class="dashboard-grid">') && html.includes('</main>'));
    assert.ok(html.includes('<a class="skip-link" href="#card-keys">'));
  });

  test('index.html: code chips and row links are outside the tab order (roving focus owns it)', () => {
    assert.ok(!/<a class="row-link"[^>]*>(?![\s\S]*tabindex="-1")/.test(html.split('\n')[0]), 'sanity');
    const links = html.match(/<a class="row-link"[^>]*>/g) || [];
    assert.ok(links.length > 0 && links.every((l) => l.includes('tabindex="-1"')), 'row links must be tabindex=-1');
    assert.ok(/el\.tabIndex = -1;/.test(html), 'makeCopyable must keep chips out of the tab order');
  });

  test('index.html: no description exceeds 160 visible characters outside its notes', () => {
    const strip = (s) => s.replace(/<ul class="notes"[\s\S]*?<\/ul>/g, '').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, 'x');
    const cells = Array.from(html.matchAll(/<td class="desc">([\s\S]*?)<\/td><\/tr>/g), (m) => m[1]);
    const long = cells.map(strip).filter((t) => t.length > 160);
    assert.strictEqual(long.length, 0, `${long.length} descriptions over 160 chars, e.g. "${(long[0] || '').slice(0, 80)}…"`);
  });

  test('index.html: every notes-btn is followed by a hidden ul.notes whose li count matches its +N label', () => {
    const blocks = Array.from(html.matchAll(/<button type="button" class="notes-btn" aria-expanded="false">\+(\d+)<\/button><ul class="notes" hidden>([\s\S]*?)<\/ul>/g));
    const buttons = (html.match(/class="notes-btn"/g) || []).length;
    assert.strictEqual(blocks.length, buttons, `${blocks.length} well-formed notes blocks for ${buttons} buttons`);
    blocks.forEach((m) => {
      const items = (m[2].match(/<li>/g) || []).length;
      assert.strictEqual(items, Number(m[1]), `+${m[1]} label but ${items} notes`);
    });
  });

  test('index.html: the What\'s New modal is gone; the since-strip and drawer replace it', () => {
    assert.ok(!html.includes('whatsNewData'), 'whatsNewData block still present');
    assert.ok(!html.includes('initWhatsNew'), 'initWhatsNew still present');
    assert.ok(html.includes('id="sinceStrip"') && html.includes('id="sinceDrawer"'));
    assert.ok(/<link rel="alternate" type="application\/atom\+xml"[^>]*href="feed\.xml">/.test(html));
    assert.ok(html.indexOf('id="sinceDrawer"') < html.indexOf("fetch('changes.json')"), 'drawer markup must precede the script that uses it');
  });

  test('index.html: version comparison orders v2.1.9 < v2.1.10 < v2.2.0', () => {
    const fn = html.match(/const versionNumber = \(v\) => (.*?);\n/);
    assert.ok(fn, 'versionNumber not found');
    const num = new Function('return (v) => ' + fn[1])();
    assert.ok(num('v2.1.9') < num('v2.1.10'));
    assert.ok(num('v2.1.263') < num('v2.2.0'));
  });

  test('index.html: print header release matches the header release tag', () => {
    const tag = html.match(/<span class="release-tag">As of release: (v[\d.]+)<\/span>/);
    const head = html.match(/<div class="print-head"[^>]*>[\s\S]*?As of release (v[\d.]+)[\s\S]*?<\/div>/);
    assert.ok(tag && head, 'release tag or print-head missing');
    assert.strictEqual(head[1], tag[1], 'print-head release differs from the header release tag');
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

  test('changelog.html: .change-list li is a two-column grid (tag | text) so wrapped lines align under the text', () => {
    // Regression guard: as a flex row, a long entry wrapped its second line under the
    // tag at the far left instead of under the text it belongs to.
    assert.ok(/\.change-list li \{[^}]*display:\s*grid/.test(html), 'change-list li must be a grid');
    assert.ok(/\.change-list li \{[^}]*grid-template-columns:\s*46px minmax\(0, 1fr\)/.test(html), 'tag | text columns missing');
    const entries = (html.match(/<li><span class="tag tag-\w+">\w+<\/span><span class="entry">/g) || []).length;
    const items = (html.match(/<li><span class="tag /g) || []).length;
    assert.strictEqual(entries, items, `${entries} wrapped entries for ${items} list items`);
  });

  test('changelog.html: only the newest month group is open by default', () => {
    const groups = html.match(/<details class="month-group"( open)?>/g) || [];
    assert.ok(groups.length > 3, 'month groups not found');
    assert.strictEqual(groups[0], '<details class="month-group" open>', 'newest month must be open');
    assert.strictEqual(groups.slice(1).filter((g) => g.includes(' open')).length, 0, 'older months must start closed');
  });
}

// --- placemat.css ---
{
  const css = read('placemat.css');
    test('placemat.css: has an A4 landscape @page rule and a print block that hides the chrome', () => {
    assert.ok(/@page\s*\{\s*size: A4 landscape;/.test(css), '@page A4 landscape missing');
    const print = css.match(/@media print \{([\s\S]*)\}\s*$/);
    assert.ok(print, '@media print block missing (it must be the last block in the file)');
    ['.global-header', '.legend-strip', '.print-head', 'column-count: 4', 'break-inside: avoid', 'print-color-adjust: exact'].forEach((needle) => {
      assert.ok(print[1].includes(needle), `print block missing ${needle}`);
    });
  });

  ['.sr-only', '.no-results', '.legend-strip', '.legend-strip-row'].forEach((selector) => {
    test(`placemat.css: defines ${selector}`, () => {
      assert.ok(css.includes(selector), `${selector} not found in placemat.css`);
    });
  });
}

// --- changes.json + feed.xml (derived from changelog.html) ---
{
  const changelog = read('changelog.html');

  test('changelog.html: every CC release heading has an id cc-v…', () => {
    const heads = changelog.match(/<h3[^>]*>CC v[\d.]+(?:–v[\d.]+)? <span class="version-date">/g) || [];
    assert.ok(heads.length > 50, `only ${heads.length} release headings found`);
    const ids = heads.map((h) => (h.match(/ id="(cc-v[\d-]+)"/) || [])[1]);
    assert.strictEqual(ids.filter((x) => !x).length, 0, 'release heading without id');
    assert.strictEqual(new Set(ids).size, ids.length, 'duplicate release ids');
  });

  test('changes.json: parses and matches the newest changelog release', () => {
    const data = JSON.parse(read('changes.json'));
    assert.ok(Array.isArray(data.releases) && data.releases.length > 50, 'too few releases');
    const newest = changelog.match(/<h3 id="cc-(v[\d-]+)">/)[1].replace(/-/g, '.');
    assert.strictEqual(data.releases[0].version, newest, 'changes.json is stale — run node scripts/build-changes.js');
    assert.strictEqual(data.latest, newest);
    const versions = data.releases.map((r) => r.version);
    assert.strictEqual(new Set(versions).size, versions.length, 'duplicate versions');
    data.releases.forEach((r) => r.entries.forEach((e) => assert.ok(['ADD', 'CHG', 'DEL', 'FIX'].includes(e.tag), `bad tag ${e.tag}`)));
  });

  test('feed.xml: is Atom with a self link and at least one entry', () => {
    const xml = read('feed.xml');
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>'));
    assert.ok(xml.includes('<feed xmlns="http://www.w3.org/2005/Atom">'));
    assert.ok(xml.includes('<link rel="self" href="https://dommango.github.io/claude-code-placemat/feed.xml"/>'));
    assert.ok((xml.match(/<entry>/g) || []).length >= 1);
  });
}

// --- index.html <-> changelog.html consistency ---
{
  const index = read('index.html');
  const changelog = read('changelog.html');
  const num = (v) => v.split('.').map(Number).reduce((a, b) => a * 1000 + b, 0);

  test('index.html release tag stays within 3 versions of the newest changelog release', () => {
    const tag = index.match(/As of release: v([\d.]+)</)[1];
    const newest = changelog.match(/<h3 id="cc-v([\d-]+)">/)[1].replace(/-/g, '.');
    assert.ok(num(tag) >= num(newest), `release tag ${tag} is older than changelog ${newest}`);
    // Releases with no placemat-relevant changes get no changelog entry, so a little slack is expected.
    assert.ok(num(tag) - num(newest) <= 3, `release tag ${tag} is more than 3 versions ahead of changelog ${newest}`);
  });

  test('index.html footer sync date matches the newest changelog release date', () => {
    const footer = index.match(/Content synced (\d{4}-\d{2}-\d{2})/);
    assert.ok(footer, 'footer sync date missing');
    const newest = changelog.match(/<h3 id="cc-v[\d-]+">CC v[\d.–v]+ <span class="version-date">(\d{4}-\d{2}-\d{2})<\/span>/);
    assert.strictEqual(footer[1], newest[1], 'footer sync date is stale');
  });

  test('index.html: command builder effort options do not name models', () => {
    const builder = index.match(/<div class="compact-builder">[\s\S]*?<\/div>/)[0];
    assert.ok(!/\((Opus|Haiku)\)/.test(builder), 'effort options still name a model');
    assert.ok(builder.includes('value="--effort xhigh"'), 'xhigh effort missing');
    assert.ok(builder.includes('id="labMode"') && builder.includes('id="labModel"'), 'permission/model selects missing');
  });

  test('index.html + changelog.html: og:image, twitter card and canonical are present', () => {
    [index, changelog].forEach((page) => {
      assert.ok(page.includes('<meta property="og:image" content="https://dommango.github.io/claude-code-placemat/og-image.png">'));
      assert.ok(page.includes('<meta name="twitter:card" content="summary_large_image">'));
      assert.ok(/<link rel="canonical" href="https:\/\/dommango\.github\.io\/claude-code-placemat\//.test(page));
    });
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
