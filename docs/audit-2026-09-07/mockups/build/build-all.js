#!/usr/bin/env node
// Rebuild every mock-up from the repo's index.html / changelog.html.
//
// NOTE: these mock-ups are frozen artefacts of the 2026-09-07 audit, built against
// the placemat as it stood at commit 89e0325 (CC v2.1.263). The recommendations they
// pitch have since been implemented, so this script refuses to run against the current
// index.html rather than applying the proposals on top of themselves. To rebuild them,
// check the audit base out first:
//
//   git worktree add /tmp/placemat-audit-base 89e0325
//   cp -r docs/audit-2026-09-07/mockups/build /tmp/placemat-audit-base/docs/audit-2026-09-07/mockups/
//   node /tmp/placemat-audit-base/docs/audit-2026-09-07/mockups/build/build-all.js
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const here = __dirname;
const root = path.resolve(here, '..', '..', '..', '..');
const src = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!src.includes('<div class="search-group">') || src.includes('id="sinceStrip"')) {
  console.error([
    'Refusing to rebuild: index.html has already adopted the audit recommendations.',
    'These mock-ups are frozen at the pre-implementation placemat (commit 89e0325).',
    'Open the committed HTML files in docs/audit-2026-09-07/mockups/ to read the proposal,',
    'or rebuild from the audit base commit (see the header of this file).',
  ].join('\n'));
  process.exit(1);
}

fs.copyFileSync(path.join(root, 'placemat.css'), path.resolve(here, '..', 'placemat.css'));
for (const script of ['extract-changes.js', 'm01.js', 'm02.js', 'm03.js', 'm04.js', 'm05.js']) {
  execFileSync(process.execPath, [path.join(here, script)], { stdio: 'inherit' });
}
