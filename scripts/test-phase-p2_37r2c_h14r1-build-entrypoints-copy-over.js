#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'family-bloom-h14r1-bat-audit-'));
const scriptName = path.join('scripts', 'setup', 'check-build-entrypoints.js');
const scriptDir = path.join(root, 'scripts', 'setup');
let passed = 0;
function check(condition, description) {
  assert.ok(condition, description);
  passed++;
  console.log(`PASS ${description}`);
}
function run() {
  const result = spawnSync(process.execPath, [scriptName], { cwd: root, encoding: 'utf8' });
  if (result.error) throw result.error;
  return { code: result.status, log: result.stdout + result.stderr };
}
try {
  fs.mkdirSync(scriptDir, { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'setup', 'check-build-entrypoints.js'), path.join(root, scriptName));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts: { 'build:demo': 'echo demo' } }));
  fs.writeFileSync(path.join(scriptDir, 'bat-entrypoints-manifest.json'), JSON.stringify({
    schemaVersion: 1,
    batFiles: ['OFFICIAL_BUILD.bat']
  }));
  fs.writeFileSync(path.join(root, 'OFFICIAL_BUILD.bat'), '@echo off\r\ncall npm run build:demo\r\n');

  let r = run();
  check(r.code === 0, 'clean canonical BAT passes');
  check(r.log.includes('1 shipped BAT files, 0 unmanaged'), 'canonical shipped count is accurate');

  fs.writeFileSync(path.join(root, 'LEGACY_BAD.bat'), '@echo off\ncall npm run missing-legacy-script\n');
  r = run();
  check(r.code === 0, 'unowned legacy BAT does not block valid release');
  check(r.log.includes('WARN UNMANAGED BAT: LEGACY_BAD.bat'), 'unowned BAT is visible by exact file path');
  check(r.log.includes('1 shipped BAT files, 1 unmanaged'), 'the extra file is counted and not silently hidden');

  fs.writeFileSync(path.join(root, 'OFFICIAL_BUILD.bat'), '@echo off\ncall npm run missing-canonical-script\n');
  r = run();
  check(r.code !== 0, 'broken canonical BAT blocks release');
  check(r.log.includes('FAIL OFFICIAL_BUILD.bat contains 2 bare LF line(s)'), 'canonical bad line endings are diagnosed');
  check(r.log.includes('FAIL OFFICIAL_BUILD.bat references missing npm script missing-canonical-script'), 'missing canonical npm script is diagnosed');
  check(r.log.includes('BUILD ENTRYPOINT FAILURES (repeat at bottom)'), 'errors are repeated near the bottom for screenshots');

  fs.unlinkSync(path.join(root, 'OFFICIAL_BUILD.bat'));
  r = run();
  check(r.code !== 0, 'missing canonical BAT blocks release');
  check(r.log.includes('FAIL Required shipped BAT is missing: OFFICIAL_BUILD.bat'), 'missing canonical file is named explicitly');
  console.log(`\nH14R1 BAT audit tests: ${passed}/${passed} PASS`);
} catch (error) {
  console.error(`FAIL H14R1 BAT audit tests: ${error.stack || error.message}`);
  process.exitCode = 1;
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
