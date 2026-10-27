#!/usr/bin/env node
'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');const get=p=>fs.readFileSync(path.join(root,p),'utf8');
let pass=0;function test(label,fn){fn();console.log(`PASS ${++pass} ${label}`)}
const menu=get('scripts/android/Family_Bloom_MENU.bat');
const andr=get('scripts/android/build/Family_Bloom_Android_RUN_TEST.bat');
const ios=get('scripts/android/build/Family_Bloom_IOS_RUN_TEST.bat');
const web=get('scripts/android/build/Family_Bloom_WEB_RUN_TEST.bat');
const manifest=JSON.parse(get('scripts/setup/bat-entrypoints-manifest.json'));
test('No BAT launchers at root',()=>assert.equal(fs.readdirSync(root).filter(x=>x.toLowerCase().endsWith('.bat')).length,0));
test('All platform BAT launchers in canonical build folder',()=>{for(const name of ['Family_Bloom_Android_RUN_TEST.bat','Family_Bloom_IOS_RUN_TEST.bat','Family_Bloom_WEB_RUN_TEST.bat'])assert(manifest.batFiles.includes('scripts/android/build/'+name))});
test('Menu choices have documented Android, iOS, Web entries',()=>{assert(menu.includes('choice /C 123456789ABCDEFGHIJKLMN0'));for(const e of ['[3] ANDROID USB TEST','[4] IOS TEST (Mac)','[5] WEB EXPO TEST'])assert(menu.includes(e))});
test('Menu dispatch maps every new entry to a matching BAT',()=>{for(const [l,file] of [['android','Family_Bloom_Android_RUN_TEST.bat'],['ios','Family_Bloom_IOS_RUN_TEST.bat'],['web','Family_Bloom_WEB_RUN_TEST.bat']]){assert(menu.includes('goto :'+l));assert(menu.includes(':'+l+'\r\necho [DANG CHAY]'));assert(menu.includes('scripts\\android\\build\\'+file+'"'))}});
test('Android runs exact Expo native command with Firebase and route checks',()=>{assert(andr.includes('call npx expo run:android %*'));assert(andr.includes('firebase-android-config.cjs'));assert(andr.includes('check-expo-route-uniqueness.cjs'));assert(andr.includes('if errorlevel 1'))});
test('Web runs Expo web preview from project root',()=>{assert(web.includes('call npx expo start --web %*'));assert(web.includes('check-expo-route-uniqueness.cjs'))});
test('Windows iOS command fails safely instead of pretending to build',()=>{assert(ios.includes('macOS + Xcode'));assert(ios.includes('npx expo run:ios'));assert(ios.includes('exit /b 2'));assert(!ios.includes('call npx expo run:ios'))});
test('Mac bash helper genuinely runs Expo native iOS, only on Mac',()=>{const sh=get('scripts/android/build/Family_Bloom_IOS_RUN_TEST.sh');assert(sh.includes('"Darwin"'));assert(sh.includes('npx expo run:ios "$@"'))});
test('Legacy welcome H10R2 gate follows current clickable Thư Ngỏ',()=>{const guard=get('scripts/tests/history/test-phase-p2_37r2c_h10r2-board-layer-welcome.js');assert(guard.includes('sceneSize = { width, height }'));assert(guard.includes('onPress={openLetter}'));assert(guard.includes('onPress={continueIntoFamily}'));assert(!guard.includes('Vào tổ ấm ngay'))});
test('Clean Apply runs both current welcome static and runtime gates',()=>{const s=get('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');assert(s.includes('test-r3r14r1-welcome-touch-static.cjs'));assert(s.includes('test-r3r14r1-welcome-touch-runtime.cjs'))});
console.log(`R3R14R3R2 dev menu: ${pass}/${pass} PASS`);
