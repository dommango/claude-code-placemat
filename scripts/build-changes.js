#!/usr/bin/env node
// Derive changes.json and feed.xml from changelog.html. Zero dependencies.
// Usage: node scripts/build-changes.js          # write both files
//        node scripts/build-changes.js --check  # exit 1 if the committed files are stale
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://dommango.github.io/claude-code-placemat/';
const TAGS = { 'tag-add': 'ADD', 'tag-change': 'CHG', 'tag-remove': 'DEL', 'tag-fix': 'FIX' };

const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function parseChangelog(html) {
  const releases = [];
  const sectionRe = /<h3 id="(cc-v[\d-]+)">CC (v[\d.]+(?:–v[\d.]+)?) <span class="version-date">([^<]+)<\/span><\/h3>\s*<ul class="change-list">([\s\S]*?)<\/ul>/g;
  let section;
  while ((section = sectionRe.exec(html))) {
    const [, id, label, date, body] = section;
    const entries = [];
    const liRe = /<li><span class="tag (tag-\w+)">\w+<\/span>([\s\S]*?)<\/li>/g;
    let li;
    while ((li = liRe.exec(body))) {
      const inner = li[2].replace(/<span class="entry">([\s\S]*)<\/span>/, '$1').trim();
      const code = (inner.match(/<code>(.*?)<\/code>/) || [])[1];
      entries.push({ tag: TAGS[li[1]] || 'ADD', item: code ? decode(code) : null, html: inner });
    }
    releases.push({ version: label.split('–').pop(), label, date: date.trim(), id, entries });
  }
  return releases;
}

const buildJson = (releases) =>
  JSON.stringify({ generated: releases[0].date, latest: releases[0].version, releases }, null, 1) + '\n';

function buildFeed(releases) {
  const entries = releases.slice(0, 20).map((rel) => `  <entry>
    <title>Claude Code ${escapeXml(rel.label)} — ${rel.entries.length} placemat change${rel.entries.length === 1 ? '' : 's'}</title>
    <id>${SITE}changelog.html#${rel.id}</id>
    <link href="${SITE}changelog.html#${rel.id}"/>
    <updated>${rel.date}T09:00:00Z</updated>
    <content type="html">${escapeXml('<ul>' + rel.entries.map((e) => `<li><b>${e.tag}</b> ${e.html}</li>`).join('') + '</ul>')}</content>
  </entry>`).join('\n');
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Claude Code Placemat — changes</title>
  <link href="${SITE}"/>
  <link rel="self" href="${SITE}feed.xml"/>
  <id>${SITE}</id>
  <updated>${releases[0].date}T09:00:00Z</updated>
${entries}
</feed>
`;
}

function main() {
  const html = fs.readFileSync(path.join(ROOT, 'changelog.html'), 'utf8');
  const releases = parseChangelog(html);
  if (!releases.length) {
    console.error('No release sections found — are the <h3 id="cc-…"> anchors present?');
    process.exit(1);
  }
  const outputs = { 'changes.json': buildJson(releases), 'feed.xml': buildFeed(releases) };
  const check = process.argv.includes('--check');
  let stale = false;
  for (const [name, content] of Object.entries(outputs)) {
    const file = path.join(ROOT, name);
    if (check) {
      const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
      if (current !== content) {
        stale = true;
        console.error(`${name} is stale — run: node scripts/build-changes.js`);
      }
    } else {
      fs.writeFileSync(file, content);
      console.log(`wrote ${name}`);
    }
  }
  if (check) {
    if (stale) process.exit(1);
    console.log('changes.json and feed.xml are up to date');
  } else {
    console.log(`${releases.length} releases, ${releases.reduce((a, r) => a + r.entries.length, 0)} entries, latest ${releases[0].version}`);
  }
}

main();
