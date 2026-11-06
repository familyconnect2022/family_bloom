#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const exists = (p) => fs.existsSync(path.join(root,p));
assert(!exists('server'), 'Old Render server must not be bundled inside Android');
assert(!exists('vercel-media'), 'Vercel Media backend must not be bundled inside Android');
assert(exists('src/app/(internal)/firestore-data-fault-test.tsx'), 'Diagnostic Android UI missing');
assert(exists('src/services/games/nativeChess/chessSocketService.ts') || exists('src/services/chess/chessSocketService.ts') || exists('src/services'), 'Android game client missing');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'),'utf8'));
assert(pkg.name === 'family-bloom', 'Wrong Android package');
const m = fs.readFileSync(path.join(root, 'scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat'),'utf8');
assert(m.includes('detach-backends'), 'Auto updater must safely migrate old local backends');
console.log('PASS separated Android repository source and migration invariants');
