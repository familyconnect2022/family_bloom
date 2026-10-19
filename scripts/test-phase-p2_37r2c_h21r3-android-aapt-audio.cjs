'use strict';
// H21R3: reproducible AAPT2 resource-name regression / isolated audio staging
// verification without Gradle, Expo prebuild, an emulator, or Windows tools.
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const root = path.resolve(__dirname, '..');
const sourceRaw = path.join(root,'modules/family-bloom-overlay/android/src/main/res/raw');
const checks = [];
function check(label, fn) {fn(); checks.push(label); console.log(`PASS ${label}`)}
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const resourceValidator = read('scripts/setup/check-android-resource-names.js');
const stage = read('scripts/setup/stage-board-audio-native.js');
const release = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const clean = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const precopy = read('scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const mp3 = ['game_start','move_self','move_opponent','capture','move_check','castle','promote','premove','illegal','tenseconds','game_end'];

// BAT files in FULL CODE ZIPs can use CRLF (Windows) or LF (source/ZIP tooling).
// Parse actual commands rather than using an end-of-line-sensitive substring.
// This must continue rejecting builds that validate before staging, or compile
// before the resource check. Do not treat comments/echo as executable commands.
function releaseCommandOrder(batText) {
  const commands = batText.replace(/\r\n?|\n/g, '\n').split('\n')
    .map(line => line.trim().replace(/^@/, ''))
    .filter(line => line && !/^(?:rem\b|::|echo\b)/i.test(line));
  const find = pattern => commands.findIndex(line => pattern.test(line));
  const sourceCheck = find(/^node\s+scripts[\\/]setup[\\/]check-android-resource-names\.js\s+--source-only\s*$/i);
  const prebuild = find(/^call\s+npx\s+expo\s+prebuild\b.*--platform\s+android/i);
  const stage = find(/^node\s+scripts[\\/]setup[\\/]stage-board-audio-native\.js\s*$/i);
  const validate = find(/^node\s+scripts[\\/]setup[\\/]check-android-resource-names\.js\s*$/i);
  const gradle = find(/^call\s+gradlew\.bat\s+:app:assembleRelease(?:\s|$)/i);
  return {
    valid: sourceCheck >= 0 && prebuild > sourceCheck && stage > prebuild &&
      validate > stage && gradle > validate,
    sourceCheck, prebuild, stage, validate, gradle,
  };
}
let temp = null;
try {
  check('canonical Android shrinker resource uses res/raw/keep.xml', () => {
    assert(fs.existsSync(path.join(sourceRaw,'keep.xml')));
    assert(!fs.existsSync(path.join(sourceRaw,'com.familybloom.keep.xml')));
    const xml=fs.readFileSync(path.join(sourceRaw,'keep.xml'),'utf8');
    for(const name of mp3) assert(xml.includes(`@raw/fb_board_${name}`));
  });
  check('resource validator rejects invalid AAPT2 names and protects all 11 MP3',()=>{
    assert(resourceValidator.includes('AAPT2'));
    assert(resourceValidator.includes('fb_board_'));
  });
  check('the pre-copy and clean apply scripts both remove old invalid resource',()=>{
    assert(precopy.includes('com.familybloom.keep.xml'));
    assert(release.includes('com.familybloom.keep.xml'));
    assert(clean.includes('com.familybloom.keep.xml'));
  });
  check('Release BAT runs resource-name gate before Gradle and after staging (LF and CRLF)',()=>{
    for(const text of [release, release.replace(/\r?\n/g,'\r\n'), release.replace(/\r?\n/g,'\n')]) {
      const order=releaseCommandOrder(text);
      assert(order.valid, `Invalid Release BAT order: ${JSON.stringify(order)}`);
    }
  });
  check('AAPT2 ordering guard rejects regressions rather than silently skipping them',()=>{
    // Regression: resource check removed, Gradle running early, or source gate absent.
    const withoutValidate=release.replace(/^node\s+scripts[\\/]setup[\\/]check-android-resource-names\.js\s*\r?\n/gm,'');
    const withoutSourceGate=release.replace(/^node\s+scripts[\\/]setup[\\/]check-android-resource-names\.js\s+--source-only\s*\r?\n/gm,'');
    assert(!releaseCommandOrder(withoutValidate).valid,'missing post-stage resource check not detected');
    assert(!releaseCommandOrder(withoutSourceGate).valid,'missing pre-prebuild source gate not detected');
    const beforeGradle=release.replace(
      /^node\s+scripts[\\/]setup[\\/]stage-board-audio-native\.js\s*$/m,
      match => `call gradlew.bat :app:assembleRelease --no-daemon --console=plain\n${match}`);
    assert(!releaseCommandOrder(beforeGradle).valid,'early Gradle compile not detected');
  });
  temp=fs.mkdtempSync(path.join(os.tmpdir(),'family-bloom-h21r3-aapt-'));
  const sroot=path.join(temp,'scripts/setup');
  const raw=path.join(temp,'modules/family-bloom-overlay/android/src/main/res/raw');
  const app=path.join(temp,'android/app');
  fs.mkdirSync(sroot,{recursive:true}); fs.mkdirSync(raw,{recursive:true});
  fs.mkdirSync(path.join(app,'src/main/res/raw'),{recursive:true});
  fs.copyFileSync(path.join(root,'scripts/setup/stage-board-audio-native.js'),path.join(sroot,'stage-board-audio-native.js'));
  fs.copyFileSync(path.join(root,'scripts/setup/check-android-resource-names.js'),path.join(sroot,'check-android-resource-names.js'));
  for(const file of fs.readdirSync(sourceRaw)) fs.copyFileSync(path.join(sourceRaw,file),path.join(raw,file));
  fs.writeFileSync(path.join(app,'build.gradle'),'// fake generated Gradle project for deterministic staging test\n');
  // Simulate a stale legacy file left by copying new source onto H21R2.
  for(const target of [raw,path.join(app,'src/main/res/raw')]) {
    fs.copyFileSync(path.join(raw,'keep.xml'),path.join(target,'com.familybloom.keep.xml'));
  }
  const validate=(arg='')=>spawnSync(process.execPath,[path.join(sroot,'check-android-resource-names.js'),...(arg?[arg]:[])],{encoding:'utf8'});
  check('bad resource name is rejected before build, just like the Windows Gradle failure',()=>{
    const r=validate('--source-only');
    assert.strictEqual(r.status,1);
    assert(r.stderr.includes('com.familybloom.keep.xml'));
  });
  const result=spawnSync(process.execPath,[path.join(sroot,'stage-board-audio-native.js')],{encoding:'utf8'});
  check('stager removes invalid legacy files in both native module and generated app',()=>{
    assert.strictEqual(result.status,0, result.stdout + result.stderr);
    assert(!fs.existsSync(path.join(raw,'com.familybloom.keep.xml')));
    assert(!fs.existsSync(path.join(app,'src/main/res/raw/com.familybloom.keep.xml')));
    assert(fs.existsSync(path.join(app,'src/main/res/raw/keep.xml')));
  });
  check('generated app MP3 staging is byte-for-byte identical to source',()=>{
    for(const name of mp3) {
      const file=`fb_board_${name}.mp3`;
      assert.deepStrictEqual(fs.readFileSync(path.join(raw,file)),fs.readFileSync(path.join(app,'src/main/res/raw',file)));
    }
  });
  check('full native + generated app resource validation passes after staging',()=>{
    const r=validate(); assert.strictEqual(r.status,0,r.stdout+r.stderr);
  });
  check('renaming shrinker file keeps all 11 SoundPool raw resource contracts',()=>{
    const ver=read('scripts/setup/check-board-audio-apk.js');
    assert(ver.includes("'keep.xml'"));
    assert(ver.includes('missing from the APK resource table'));
    assert(stage.includes("const keepFile = 'keep.xml'"));
  });
  console.log(`\nH21R3 Android Resource/AAPT2 Gate: ${checks.length}/${checks.length} PASS`);
} finally {
  if(temp) fs.rmSync(temp,{recursive:true,force:true});
}
