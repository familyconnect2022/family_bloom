#!/usr/bin/env node
'use strict';

// H14R1: validate the BAT files owned by this FULL release. Older copy-over
// installs can legitimately contain unowned BATs; never execute or silently
// trust them, but do not let an unrelated legacy file block an APK build.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const packageScripts = pkg.scripts || {};
const manifestFile = path.join(__dirname, 'bat-entrypoints-manifest.json');

let failed = 0;
const failures = [];
const pass = (message) => console.log(`PASS ${message}`);
const fail = (message) => {
  failed += 1;
  failures.push(message);
  console.error(`FAIL ${message}`);
};
const warn = (message) => console.warn(`WARN ${message}`);

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
} catch (error) {
  fail(`Cannot read canonical BAT manifest scripts/setup/bat-entrypoints-manifest.json: ${error.message}`);
  process.exitCode = 1;
  console.error('\nBuild entrypoint audit: FAIL (manifest unavailable)');
  process.exit();
}
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.batFiles) || !manifest.batFiles.length) {
  fail('Invalid or empty canonical BAT manifest');
  process.exitCode = 1;
  console.error('\nBuild entrypoint audit: FAIL (invalid manifest)');
  process.exit();
}

// Normalize and validate paths before reading files. A compromised manifest
// must not be allowed to point outside the project tree.
const canonical = new Set();
for (const entry of manifest.batFiles) {
  if (typeof entry !== 'string' || !/^[A-Za-z0-9_./()\-]+\.bat$/i.test(entry) ||
      entry.startsWith('/') || entry.includes('..') || entry.includes('\\')) {
    fail(`Unsafe BAT manifest entry: ${JSON.stringify(entry)}`);
    continue;
  }
  if (canonical.has(entry.toLowerCase())) {
    fail(`Duplicate canonical BAT entry: ${entry}`);
    continue;
  }
  canonical.add(entry.toLowerCase());
}

const batFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.expo' || (dir === root && entry.name === 'android')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.bat')) batFiles.push(full);
  }
}
walk(root);

const found = new Map();
for (const file of batFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  found.set(rel.toLowerCase(), { file, rel });
}
const unmanaged = [];
for (const { rel } of found.values()) {
  if (!canonical.has(rel.toLowerCase())) unmanaged.push(rel);
}
for (const entry of manifest.batFiles) {
  const foundEntry = found.get(entry.toLowerCase());
  if (!foundEntry) {
    fail(`Required shipped BAT is missing: ${entry}`);
    continue;
  }
  const { file, rel } = foundEntry;
  const bytes = fs.readFileSync(file);
  const source = bytes.toString('utf8');
  const lf = (source.match(/\n/g) || []).length;
  const crlf = (source.match(/\r\n/g) || []).length;
  if (lf === crlf) pass(`${rel} uses Windows CRLF`);
  else fail(`${rel} contains ${lf - crlf} bare LF line(s)`);

  for (const match of source.matchAll(/\bnpm\s+run\s+([A-Za-z0-9:_-]+)/gi)) {
    const script = match[1];
    if (Object.prototype.hasOwnProperty.call(packageScripts, script)) pass(`${rel} references npm script ${script}`);
    else fail(`${rel} references missing npm script ${script}`);
  }
  for (const match of source.matchAll(/\bnode\s+(?:"([^"]+\.js)"|([^\s&|<>]+\.js))/gi)) {
    const raw = (match[1] || match[2] || '').replace(/^['"]|['"]$/g, '');
    if (!raw || raw.includes('%') || raw.includes('!')) continue;
    const normalized = raw.replace(/\\/g, '/');
    const target = path.resolve(root, normalized);
    if (target === root || !target.startsWith(root + path.sep)) {
      fail(`${rel} references a node script outside project: ${normalized}`);
    } else if (fs.existsSync(target)) {
      pass(`${rel} references node script ${normalized}`);
    } else {
      fail(`${rel} references missing node script ${normalized}`);
    }
  }
}

// List unmanaged files at the END so a user screenshot of the last console
// lines is enough to diagnose stale copy-over content.
if (unmanaged.length) {
  console.log('');
  warn(`${unmanaged.length} unowned/legacy BAT file(s) found; these are NOT checked or executed by this audit:`);
  for (const rel of unmanaged.sort()) warn(`UNMANAGED BAT: ${rel}`);
  warn('Review these files and move obsolete BATs into a backup folder outside the project. No files were deleted.');
}
if (manifest.batFiles.length) pass(`audited ${manifest.batFiles.length} shipped BAT files (${batFiles.length} found in workspace)`);
else fail('No shipped BAT files declared');

if (failures.length) {
  console.error('\n===== BUILD ENTRYPOINT FAILURES (repeat at bottom) =====');
  for (const message of failures) console.error(`FAIL ${message}`);
  console.error('======================================================');
}
console.log(`\nBuild entrypoint audit: ${failed ? 'FAIL' : 'PASS'} (${manifest.batFiles.length} shipped BAT files, ${unmanaged.length} unmanaged)`);
process.exitCode = failed ? 1 : 0;
