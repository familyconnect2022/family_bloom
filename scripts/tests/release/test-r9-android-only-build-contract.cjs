#!/usr/bin/env node
'use strict';
// Keep this gate forward-compatible with later R10+ source releases.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const json=r=>JSON.parse(read(r));
const file=r=>fs.existsSync(path.join(root,r));
const meta=json('scripts/setup/family-bloom-source-release.json');
const version=id=>{const m=/^R([1-9]\d*)$/.exec(id);assert(m,'Invalid source release ID: '+id);return Number(m[1]);};
assert(meta.schemaVersion===1,'Unknown release marker schema');
assert(version(meta.sourceReleaseId)>=9,'Release ID must be R9 or later');
assert(version(meta.baselineSourceReleaseId)<version(meta.sourceReleaseId),'Release ID must increase');
const pkg=json('package.json'),config=json('app.json').expo;
assert.equal(pkg.name,'family-bloom');
assert.equal(meta.appVersion,config.version,'App version metadata mismatch');
assert.equal(meta.androidVersionCode,config.android.versionCode,'Native versionCode metadata mismatch');
for(const p of ['src/web','public','src/app/+html.tsx','src/app/_layout.web.tsx','vercel.json'])
  assert(!file(p),'Retired Android Web artifact returned: '+p);
for(const p of ['assets/images/storybook/heroes/v2/family_rose.webp','src/services/media/momentMediaApi.ts','modules/family-bloom-overlay/android'])
  assert(file(p),'Android required runtime file missing: '+p);
const mapping=json('scripts/setup/script-migration-map.json').movedFiles;
assert(Object.keys(mapping).length>=172,'Native test migration map unexpectedly shrank');
for(const [old,p] of Object.entries(mapping)){
  assert(!/test-phase17_9w/i.test(old+' '+p),'Retired Web-only test in migration map: '+old);
  assert(file(p),'Mapped test no longer exists: '+p);
}
const menu=read('scripts/android/Family_Bloom_MENU.bat');
assert.equal((menu.match(/^:update\r?$/gm)||[]).length,1,'Duplicate AUTO UPDATE menu label');
assert(/:update\r?\n(?:rem[^\n]*\r?\n)*echo \[DANG CHAY\] 1: AUTO UPDATE/.test(menu),'AUTO UPDATE menu must execute action');
assert(menu.includes('choice /C 12345678ABCDEFGHIJKL0'),'Menu keys differ from Android-only manifest');
assert(menu.includes('if errorlevel 13 goto :blaze'),'Blaze feature action mapping changed');
for(const rel of [
  'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat',
  'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
  'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat'
]){
  const t=read(rel);
  const needle='test-r9-android-only-build-contract.cjs';
  assert(t.includes(needle),rel+': R9+ build gate not wired');
  const i=t.indexOf(needle), n=t.indexOf('if errorlevel 1 goto :fail',i);
  assert(i>=0 && n>i && n-i<100,rel+': R9+ must stop build on gate failure');
  assert(!/(?<!\r)\n/.test(t),rel+': BAT must use Windows CRLF');
}
const structure=spawnSync(process.execPath,[path.join(root,'scripts/maintenance/check-project-structure.js')],{cwd:root,encoding:'utf8',timeout:30000});
assert.equal(structure.status,0,'Android structure gate failed: '+String(structure.stdout||'').slice(-1200)+' '+String(structure.stderr||'').slice(-400));
console.log('R9+ Android source release gate: PASS '+meta.sourceReleaseId+' ← '+meta.baselineSourceReleaseId+'; structure 19/19');
