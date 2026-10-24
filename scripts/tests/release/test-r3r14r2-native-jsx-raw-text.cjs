#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { findRawTextRisks } = require('../../setup/native-jsx-raw-text-guard.cjs');
const root = path.resolve(__dirname, '../../..');
const file = 'src/app/(home)/(learning)/study-question-detail.tsx';
const content = fs.readFileSync(path.join(root, file), 'utf8');
const cases = [
  ['space between sibling components is rejected', '<View>{loading&&<Spinner/>} {!!error&&<Text>Failed</Text>}</View>', 1],
  ['newline between sibling components is safe', '<View>{loading&&<Spinner/>}\n{!!error&&<Text>Failed</Text>}</View>', 0],
  ['literal text inside Text is safe', '<Text>Hello {name} world</Text>', 0],
  ['ordinary sibling components are safe', '<View><Text>First</Text><Text>Second</Text></View>', 0],
];
for (const [name, snippet, expected] of cases) {
  assert.equal(findRawTextRisks(ts, 'fixture.tsx', snippet).length, expected, name);
  console.log('PASS:', name);
}
assert.equal(findRawTextRisks(ts, file, content).length, 0, 'the formerly failing Family Bloom screen must stay clean');
console.log('PASS: study question detail contains no raw JSX whitespace');
