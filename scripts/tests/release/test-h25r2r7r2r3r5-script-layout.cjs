#!/usr/bin/env node
'use strict';
/** Kiem thu release R3R5: KHONG le thuoc Node_modules, Google config hoac Windows. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
const file=r=>fs.statSync(path.join(root,r),{throwIfNoEntry:false})?.isFile()||false;
const migration=JSON.parse(read('scripts/setup/script-migration-map.json'));
const manifest=JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json'));
let n=0;
function check(label,ok){assert(ok,label);console.log('PASS '+(++n)+' '+label);}
check('Project root khong con BAT trung lap',JSON.stringify(fs.readdirSync(root).filter(f=>f.toLowerCase().endsWith('.bat')).sort())===JSON.stringify(manifest.batFiles.filter(f=>!f.includes('/')).sort()));
check('BAT menu tai scripts/android',file('scripts/android/Family_Bloom_MENU.bat'));
check('Build, Auto Update, Clean, EAS nam trong nhom',[
 'scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat',
 'scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat',
 'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
 'scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat',
 'scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat',
].every(file));
check('175 test duoc chuyen co ban do',Object.keys(migration.movedFiles).length>=175 && Object.values(migration.movedFiles).every(file));
check('Khong con test-*.js o scripts/',fs.readdirSync(path.join(root,'scripts')).every(f=>!/^test-/i.test(f)));
check('Manifest chi co BAT scripts, khong co launcher root',manifest.batFiles.every(file) && manifest.batFiles.filter(f=>!f.includes('/')).length===0 && new Set(manifest.batFiles).size===manifest.batFiles.length);
const updater=read('scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat');
check('Don duong dan cu chi SAU backup',updater.indexOf('auto-update-full.cjs" backup')<updater.indexOf('retire-legacy-script-paths.cjs')&&updater.indexOf('retire-legacy-script-paths.cjs')<updater.indexOf('auto-update-full.cjs" overlay'));
check('Auto Update goi CLEAN APPLY o vi tri moi',updater.includes('%FB_TARGET%\\scripts\\android\\maintenance\\Family_Bloom_CLEAN_APPLY_FULL.bat'));
const build=read('scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat');
check('Build root suy ra tu scripts/android/build',build.includes('"%~dp0..\\..\\.."'));
check('Build tai project duoc luu dung duong dan moi',build.includes('%SAVED_TARGET%\\scripts\\android\\build\\Family_Bloom_BUILD_APK_TO_SHARE.bat'));
const resolve=read('scripts/android/build/resolve-build-target.cjs');
check('Redirect so sanh cac file tai duong dan da chuyen',resolve.includes('scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs'));
const firebase=read('scripts/android/build/firebase-android-config.cjs');
check('Firebase check khong tu ghi de JSON',firebase.includes('COPYFILE_EXCL')&&firebase.includes('Config da ton tai'));
const oldRecovery=read('scripts/tests/release/test-h25r2r7r2r3r4-firebase-recovery.cjs');
check('Fixture Firebase khong bat buoc project that phai thieu JSON',!oldRecovery.includes("!fs.existsSync(path.join(root,'google-services.json'))"));
check('Giu ma nguon Kotlin Native',file('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt'));
console.log('H25R2R7R2R3R5 SCRIPT LAYOUT: '+n+'/'+n+' PASS');
