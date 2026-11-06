#!/usr/bin/env node
'use strict';
/** Android-only Chess/Xiangqi source gates.
 * Legacy phase14 scripts were removed when server moved to a separate Render
 * repository; never reference nonexistent scripts or pretend to test server.
 * Real-time socket authority requires separate Render integration tests.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../..');
const gates = [
  ['Chess assets + Xiangqi visual highlight', 'test-h22r9-chess-assets-royal-highlight.cjs'],
  ['Chess/Xiangqi family lobby routes', 'test-h23-family-game-hubs.cjs'],
  ['Xiangqi black-side input/reconnect', 'test-h25r2-xiangqi-black-turn-reconnect.cjs'],

];
for (const [label, filename] of gates) {
  const absolute = path.join(root, 'scripts', 'tests', 'release', filename);
  if (!fs.existsSync(absolute)) {
    console.error('[FAIL] Missing required current gate: ' + absolute);
    process.exit(1);
  }
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [absolute], { cwd: root, stdio: 'inherit', timeout: 60000 });
  if (result.error || result.status !== 0) {
    console.error(`\n[FAIL] Chess/Xiangqi Android gate: ${label}`, result.error?.message || result.status);
    process.exit(1);
  }
}
console.log(`\nAndroid Chess/Xiangqi independent gates: ${gates.length}/${gates.length} PASS. Four legacy server-dependent gates DEFERRED to separate Render integration.`);
