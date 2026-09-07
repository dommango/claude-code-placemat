// Parse changelog.html into a machine-readable changes.json (proposal: the bot maintains this file).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'changelog.html'), 'utf8');
const tagMap = { 'tag-add': 'ADD', 'tag-change': 'CHG', 'tag-remove': 'DEL', 'tag-fix': 'FIX' };
const releases = [];
const secRe = /<h3>CC (v[\d.]+(?:–v[\d.]+)?) <span class="version-date">([^<]+)<\/span><\/h3>\s*<ul class="change-list">([\s\S]*?)<\/ul>/g;
let m;
while ((m = secRe.exec(html))) {
  const [, version, date, body] = m;
  const entries = [];
  const liRe = /<li><span class="tag (tag-\w+)">\w+<\/span>([\s\S]*?)<\/li>/g;
  let li;
  while ((li = liRe.exec(body))) {
    const inner = li[2].trim();
    const code = (inner.match(/<code>(.*?)<\/code>/) || [])[1] || null;
    entries.push({ tag: tagMap[li[1]] || 'ADD', item: code ? code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : null, html: inner });
  }
  releases.push({ version: version.split('–').pop(), label: version, date, entries });
}
// newest first already; keep only the v2.1.x era with dated entries
const out = { generated: new Date().toISOString().slice(0, 10), latest: releases[0].version, releases };
fs.writeFileSync(path.resolve(__dirname, '..', 'changes.json'), JSON.stringify(out, null, 1));
console.log('releases', releases.length, 'entries', releases.reduce((a, r) => a + r.entries.length, 0), 'latest', out.latest, 'first', releases[releases.length-1].label);
console.log(JSON.stringify(releases[0]).slice(0, 400));
