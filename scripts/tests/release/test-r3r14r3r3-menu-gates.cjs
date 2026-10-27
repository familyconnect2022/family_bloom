#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const menu=read('scripts/android/Family_Bloom_MENU.bat');
const manifest=JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json'));
const labels='123456789ABCDEFGHIJKLMN';
const choices='123456789ABCDEFGHIJKLMN0';
assert(menu.includes('choice /C '+choices), 'Menu choices must be sequential');
for(const label of labels){assert(menu.includes('echo ['+label+'] '),'Missing visible menu key '+label);}
assert(menu.includes('echo [0] THOAT'));
const keys=[...menu.matchAll(/echo \[([1-9A-N0])\] /g)].map(x=>x[1]);
assert.equal(keys.join(''),choices,'Visible menu keys must be sorted and unique');
const dispatch=[...menu.matchAll(/^if errorlevel (\d+) goto :(\w+)/gm)].map(x=>Number(x[1]));
assert.deepEqual(dispatch, Array.from({length:23},(_,i)=>23-i),'Choice dispatch must check errorlevel in descending order');
for(const part of ['Family_Bloom_AUTO_UPDATE_FULL.bat','Family_Bloom_BUILD_APK_TO_SHARE.bat','Family_Bloom_Android_RUN_TEST.bat','Family_Bloom_IOS_RUN_TEST.bat','Family_Bloom_WEB_RUN_TEST.bat','Family_Bloom_Deploy_Firestore_Rules.bat','Family_Bloom_Deploy_Firestore_Indexes.bat','Family_Bloom_Deploy_Phase_14C_Firestore.bat','Family_Bloom_BLAZE_SETUP_ONCE.bat']) assert(menu.includes(part), 'Menu missing action '+part);
for(const rel of manifest.batFiles) assert(fs.existsSync(path.join(root,rel)), 'Manifest names missing BAT '+rel);
for(const retired of ['scripts/android/build/Family_Bloom_Android_Test_App_CLEAN_RELEASE.bat','scripts/android/build/Family_Bloom_Android_Build_APK_ONLY.bat','scripts/setup/settup.bat']) assert(!fs.existsSync(path.join(root,retired)), 'Duplicate BAT not retired '+retired);
const f=read('src/constants/featureFlags.ts'), runtime=read('src/constants/cloudRuntimeState.ts');
assert(f.includes('get USE_CLOUD_FUNCTIONS()')&&runtime.includes('cloudFunctionsActive = false'),'Spark switch must remain OFF by default');
console.log('R3R14R3R3: menu alphabet/numeric, dispatch, Firebase, safe gates and retired BATs PASS');
