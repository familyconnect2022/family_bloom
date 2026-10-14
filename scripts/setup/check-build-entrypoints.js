#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageScripts = pkg.scripts || {};

const batFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.bat')) batFiles.push(full);
  }
}
walk(root);

let failed = 0;
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => { failed += 1; console.error(`FAIL ${message}`); };

for (const file of batFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const bytes = fs.readFileSync(file);
  const text = bytes.toString('utf8');
  const lf = (text.match(/\n/g) || []).length;
  const crlf = (text.match(/\r\n/g) || []).length;
  if (lf === crlf) pass(`${rel} uses Windows CRLF`);
  else fail(`${rel} contains ${lf - crlf} bare LF line(s)`);

  for (const match of text.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/gi)) {
    const script = match[1];
    if (Object.prototype.hasOwnProperty.call(packageScripts, script)) pass(`${rel} references npm script ${script}`);
    else fail(`${rel} references missing npm script ${script}`);
  }

  for (const match of text.matchAll(/\bnode\s+(?:"([^"]+\.js)"|([^\s&|<>]+\.js))/gi)) {
    const raw = (match[1] || match[2] || '').replace(/^['"]|['"]$/g, '');
    if (!raw || raw.includes('%') || raw.includes('!')) continue;
    const normalized = raw.replace(/\\/g, '/');
    const target = path.resolve(root, normalized);
    if (fs.existsSync(target)) pass(`${rel} references node script ${normalized}`);
    else fail(`${rel} references missing node script ${normalized}`);
  }
}

if (!batFiles.length) fail('No BAT files found');
else pass(`audited ${batFiles.length} BAT files`);

console.log(`\nBuild entrypoint audit: ${failed ? 'FAIL' : 'PASS'} (${batFiles.length} BAT files)`);
process.exit(failed ? 1 : 0);
