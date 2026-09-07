#!/usr/bin/env node
// Rebuild every mock-up from the repo's current index.html / changelog.html.
// Usage: node docs/audit-2026-09-07/mockups/build/build-all.js
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const here = __dirname;
fs.copyFileSync(path.resolve(here, '..', '..', '..', '..', 'placemat.css'), path.resolve(here, '..', 'placemat.css'));
for (const f of ['extract-changes.js', 'm01.js', 'm02.js', 'm03.js', 'm04.js', 'm05.js']) {
  execFileSync(process.execPath, [path.join(here, f)], { stdio: 'inherit' });
}
