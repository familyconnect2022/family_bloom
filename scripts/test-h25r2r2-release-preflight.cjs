#!/usr/bin/env node
'use strict';
/**
 * H25R2R3 source-only release gate. This MUST be runnable from an extracted
 * FULL ZIP before npm install, Gradle, cleanup or any overlay onto a user
 * project. Fail closed if any authoritative session/presentation test fails.
 * Native compilation and APK inspections remain mandatory later in the build.
 */
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const checks = [
  ['P2.34 home-to-lobby and stacked presentations', 'scripts/test-phase-p2_34-session-presentation-bridge-stacked-views.js'],
  ['P2.35 server-confirmed recovery', 'scripts/test-phase-p2_35-already-in-game-recovery-surface.js'],
  ['H25 Firebase invitation contract', 'scripts/test-h25-firebase-invitation.cjs'],
  ['H25 source package completeness', 'scripts/test-h25-source-package.cjs'],
  ['H25R2 Xiangqi black-turn input source contract', 'scripts/test-h25r2-xiangqi-black-turn-reconnect.cjs', ['--source-only']],
  ['H25R2R4 native touch-feedback/loading source contract', 'scripts/test-h25r2r4-touch-feedback.cjs', ['--source-only']],
  ['H25R2R5 Android Internet/Google/Phone connectivity', 'scripts/test-h25r2r5-internet-connectivity.cjs', ['--source-only']],
  ['P2.37R2C current native binary identity', 'scripts/test-phase-p2_37r2c-binary-identity-lock.js'],
  ['Updater and Build & Share preflight wiring', 'scripts/test-h25r2r2-updater-wiring.cjs'],
];
let pass = 0;
for (const [name, file, args = []] of checks) {
  const result = spawnSync(process.execPath, [path.join(root, file), ...args], {
    cwd: root, encoding: 'utf8', timeout: 45000, maxBuffer: 8 * 1024 * 1024,
    env: process.env,
  });
  if (result.error || result.status !== 0) {
    console.error(`[FAIL] H25R2R3 release preflight: ${name}`);
    if (result.error) console.error(String(result.error));
    if (result.stdout) console.error(result.stdout.slice(-6000));
    if (result.stderr) console.error(result.stderr.slice(-6000));
    console.error('STOP: Do not update the old project or build from this FULL ZIP.');
    process.exit(1);
  }
  console.log(`[PASS] ${name}`);
  pass++;
}
console.log(`[PASS] H25R2R3 release preflight ${pass}/${checks.length} source-only gates. No existing project was modified.`);
