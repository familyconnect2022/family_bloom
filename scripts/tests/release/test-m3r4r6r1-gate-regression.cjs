#!/usr/bin/env node
'use strict';
/** Release R6R1: protect original R6 lineage and catch legacy gate drift.
 * Uses a throwaway source fixture. Never modifies user projects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname,'../../..');
const manifest = require(path.join(root,'document/releases/m3r4r5/known-source-lineages.json'));
const matcher = path.join(root,'scripts/maintenance/check-r1r4-source-lineage.cjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'fb-r6r1-safe-lineage-'));
const original = [...new Set([...manifest.files,...Object.keys(manifest.additional_r8r3r3_required_files || {}),...Object.keys(manifest.additional_r2r3r1_required_files || {})])];
const invoke = () => spawnSync(process.execPath,[matcher,tmp],{encoding:'utf8',timeout:30000});
try {
  assert(original.length>=18,'R7 verified source coverage too small');
  for(const rel of original){
    const from=path.join(root,rel), dest=path.join(tmp,rel);
    assert(fs.existsSync(from),`missing critical source ${rel}`);
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    fs.copyFileSync(from,dest);
  }
  let result=invoke();
  assert.equal(result.status,0,'Current release source must pass: '+result.stderr);
  console.log('PASS R8R3R3 unmodified critical source recognized');
  const critical='src/services/media/avatarAsyncSync.ts';
  fs.appendFileSync(path.join(tmp,critical),'\n// deliberate tamper test\n');
  result=invoke();
  assert.notEqual(result.status,0,'tampered R7 avatar must stop');
  console.log('PASS R7 modified avatar rejected');
  fs.copyFileSync(path.join(root,critical),path.join(tmp,critical));
  fs.appendFileSync(path.join(tmp,'src/app/_layout.tsx'),'\n// unknown root route\n');
  result=invoke();
  assert.notEqual(result.status,0,'unknown Root must stop');
  console.log('PASS R7 modified Root rejected');
  fs.copyFileSync(path.join(root,'src/app/_layout.tsx'),path.join(tmp,'src/app/_layout.tsx'));
  for (const criticalGate of [
    'scripts/tests/history/test-phase-p2_37r2c_h6-decor-rail-isolation.js',
    'scripts/tests/history/test-phase-p2_37r2c_h10r2-board-layer-welcome.js',
    'scripts/tests/release/test-h22r6-xiangqi-bloom-motion.cjs',
  ]) {
    fs.appendFileSync(path.join(tmp,criticalGate),'\n// deliberate tamper of verified update gate\n');
    result = invoke();
    assert.notEqual(result.status,0,`modified ${criticalGate} must stop`);
    fs.copyFileSync(path.join(root,criticalGate),path.join(tmp,criticalGate));
  }
  console.log('PASS R8R3R3 protected H6, H10R2 and Xiangqi gate tampering rejected');
  const bootstrap=fs.readFileSync(path.join(root,'scripts/tests/release/test-h23r3-typescript-bootstrap.cjs'),'utf8');
  assert(bootstrap.includes('modernResolve') && bootstrap.includes('expo-image-manipulator'));
  const journey=fs.readFileSync(path.join(root,'scripts/tests/release/test-r2r4-journey.cjs'),'utf8');
  assert(journey.includes("'R4','R5'"));
  console.log('PASS historical gate assertions compatible with actual R6 dependency and lineage contracts');
} finally {
  fs.rmSync(tmp,{recursive:true,force:true});
}
console.log('R8R3R2 source gate regression: 5/5 PASS');
