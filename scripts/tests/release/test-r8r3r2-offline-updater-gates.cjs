#!/usr/bin/env node
'use strict';
/** R8R3R3: run ALL source-only test entrypoints invoked by Windows FULL update,
 * Verify Source, Android Build & Share and EAS before modifying the old project.
 * This is not a substitute for Gradle, tsc or real-device/Firebase tests.
 * Never classify an explicitly deferred cross-repo check as a passing test.
 */
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
// The extracted FULL ZIP deliberately has NO project node_modules.
// Bundle the official TS transpiler for dependency-free source gate execution;
// npm install later provides project-local TypeScript 6 for actual build/tsc.
const vendorDir = path.join(root, 'scripts/vendor');
const vendorPackage = path.join(vendorDir, 'typescript/package.json');
const vendorCompiler = path.join(vendorDir, 'typescript/lib/typescript.js');
const vendorLicense = path.join(root, 'document/licenses/TypeScript_5.8.3_LICENSE.txt');
for (const file of [vendorPackage, vendorCompiler, vendorLicense]) {
  assert(fs.existsSync(file), `Preflight TypeScript compiler missing from FULL ZIP: ${file}`);
}
const vendorMeta = JSON.parse(fs.readFileSync(vendorPackage,'utf8'));
assert(vendorMeta.name==='typescript' && vendorMeta.version==='5.8.3', 'Unexpected offline gate compiler identity');
// Node's NODE_PATH is an explicit search path for this one preflight invocation.
// Never fall back to a globally installed TS and silently report a false PASS.
const cleanEnv = {...process.env, NODE_PATH:vendorDir, NODE_NO_WARNINGS:'1', CI:'1'};
const compilerProbe = cp.spawnSync(process.execPath,['-p',"require.resolve('typescript')"], {
  cwd:root,encoding:'utf8',env:cleanEnv,timeout:10000,
});
assert.equal(compilerProbe.status,0,`Offline compiler cannot load: ${compilerProbe.stderr||''}`);
assert.equal(path.resolve(compilerProbe.stdout.trim()),vendorCompiler,
  'Preflight must use bundled TypeScript, not npm/global TypeScript');
const scripts = JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).scripts;
const controlFiles = [
  'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
  'scripts/android/verify/Family_Bloom_VERIFY_FULL_SOURCE.bat',
  'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
  'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
  'scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat',
  'scripts/maintenance/auto-update-full.cjs',
];
const paths = new Set();
function collect(content) {
  const re = /scripts[\\/]+tests[\\/]+(?:history|release)[\\/]+[A-Za-z0-9_.\-]+\.(?:cjs|js)/g;
  for (const hit of content.matchAll(re)) paths.add(hit[0].replace(/\\/g,'/'));
}
for (const filename of controlFiles) {
  const full = path.join(root,filename);
  assert(fs.existsSync(full), `Mandatory build/update workflow missing: ${filename}`);
  const content = fs.readFileSync(full,'utf8');
  collect(content);
  // Map each npm run test step to the ACTUAL package.json script. Merely
  // checking the npm command's spelling leaves hidden failures post-overlay.
  for (const match of content.matchAll(/(?:call\s+)?npm\s+run\s+([A-Za-z\d:_-]+)/gi)) {
    const command = scripts[match[1]];
    assert(command, `Missing npm script ${match[1]} used by ${filename}`);
    collect(command);
  }
}
collect(scripts['eas-build-post-install'] || '');
// This runner is part of Auto Update preflight; exclude itself to prevent recursion.
paths.delete('scripts/tests/release/test-r8r3r2-offline-updater-gates.cjs');
const commands = [...paths].sort();
assert(commands.length >= 90, `Too few discovered test gates (${commands.length}). Check workflow scanner.`);
let pass = 0, deferred = 0;
for (const filename of commands) {
  const full = path.join(root,filename);
  if (!fs.existsSync(full)) {
    console.error(`[FAIL MISSING] ${filename}`);
    process.exit(1);
  }
  const result = cp.spawnSync(process.execPath,[full], {
    cwd:root, encoding:'utf8', timeout:30000,
    env: cleanEnv,
    maxBuffer: 4*1024*1024,
  });
  const combined = `${result.stdout||''}\n${result.stderr||''}`;
  if (result.error || result.status !== 0) {
    console.error(`[FAIL ${result.status ?? 'TIMEOUT'}] ${filename}`);
    console.error(combined.trim().slice(-3300));
    if (result.error) console.error(result.error.message);
    process.exit(1);
  }
  if (/\[SKIP-CROSS-REPO\]/.test(combined)) {
    deferred++;
    console.log(`[DEFERRED-RENDER] ${filename}`);
  } else {
    pass++;
    console.log(`[PASS] ${filename}`);
  }
}
console.log(`R8R3R3 bundled-TypeScript preflight/source gate sweep: ${pass} PASS, ${deferred} DEFERRED-RENDER, 0 FAIL; total ${commands.length}`);
