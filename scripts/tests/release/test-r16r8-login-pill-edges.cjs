'use strict';
// Localized visual contract: only login action buttons should use clipping and zero native elevation.
// This catches accidental reintroduction of square background/shadow corners in future builds.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.resolve(__dirname, '../../../src/app/(auth)/login.tsx'), 'utf8');
for (const name of ['primaryButton', 'googleButton']) {
  const match = source.match(new RegExp(name + ':\\s*\\{([^}]+)\\}'));
  assert.ok(match, 'Missing style for ' + name);
  for (const phrase of ['borderRadius: 999', 'overflow: "hidden"', 'elevation: 0', 'shadowOpacity: 0']) {
    assert.ok(match[1].includes(phrase), name + ' must define ' + phrase);
  }
}
assert.match(source, /customStyle=\{__a3_styles.primaryButton\}/);
assert.match(source, /customStyle=\{__a3_styles.googleButton\}/);
console.log('[LOGIN PILL EDGES PASS] Both buttons clip to capsule; native shadow corners suppressed locally.');
