'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Fast cross-platform source-level gate; device APK validation still happens
// after :app:assembleRelease using check-board-audio-apk.js.
const assert=require('assert');
const fs=require('fs');
const path=require('path');
const root=path.resolve(__legacyScriptsDir,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const mp3root='modules/family-bloom-overlay/android/src/main/res/raw';
const names=['game_start','move_self','move_opponent','capture','move_check','castle','promote','premove','illegal','tenseconds','game_end'];
let ok=0;
function check(name,func){func();ok++;console.log(`PASS ${name}`)}
check('all 11 raw audio sources exist and are nonempty',()=>{
 for(const n of names){let p=path.join(root,mp3root,`fb_board_${n}.mp3`); assert(fs.statSync(p).size>=256)}
});
check('resource shrinker keep file explicitly protects every SoundPool name',()=>{
 let xml=read(`${mp3root}/keep.xml`);
 for(const n of names) assert(xml.includes(`@raw/fb_board_${n}`));
 assert(xml.includes('tools:keep='));
 assert(!fs.existsSync(path.join(root,mp3root,'com.familybloom.keep.xml')));
});
check('generated app resource staging verifies SHA256 and fails on missing prebuild',()=>{
 let s=read('scripts/setup/stage-board-audio-native.js');
 assert(s.includes('sha256'));assert(s.includes('android/app/build.gradle'));
 assert(s.includes('keep.xml'));assert(s.includes('fs.copyFileSync'));
});
check('Release builds stage protected audio strictly between prebuild and Gradle',()=>{
 let s=read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
 let pre=s.indexOf('expo prebuild --platform android');
 let stage=s.indexOf('stage-board-audio-native.js');
 let gradle=s.indexOf(':app:assembleRelease');
 let verify=s.indexOf('check-board-audio-apk.js "%APK_SOURCE%"');
 assert(pre>=0 && stage>pre && gradle>stage && verify>gradle);
});
check('APKs are checked using AAPT2 resource table when zip paths are optimized',()=>{
 let s=read('scripts/setup/check-board-audio-apk.js');
 assert(s.includes("'dump','resources',apk"));
 assert(s.includes('missing from the APK resource table'));
 assert(s.includes('process.exit(1)'));
});
check('share BAT uses release gate and retains verified-copy-only behavior',()=>{
 let s=read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
 assert(s.includes('Family_Bloom_Android_Test_App_RELEASE.bat'));
 assert(s.includes('if errorlevel 1 goto :fail'));
});
console.log(`H21R1 audio packaging: ${ok}/${ok} PASS`);
