#!/usr/bin/env node
'use strict';
// Requires only built-in Node APIs. Verify byte-for-byte copies before publish.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const [source, copy] = process.argv.slice(2);
if (!source || !copy) { console.error('FAIL usage: node verify-apk-copy-sha256.cjs <source> <copy>'); process.exit(2); }
function hash(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile() || stat.size < 1024 * 1024) throw new Error('Missing or suspiciously small APK: ' + file);
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
try {
  if (path.resolve(source) === path.resolve(copy)) throw new Error('APK source and copy must be different paths');
  const a = hash(source), b = hash(copy);
  if (a !== b) throw new Error('APK SHA256 mismatch: copy is incomplete/corrupted');
  console.log('PASS APK copy SHA256 identical: ' + a);
} catch (error) { console.error('FAIL APK copy verification: ' + error.message); process.exit(1); }
