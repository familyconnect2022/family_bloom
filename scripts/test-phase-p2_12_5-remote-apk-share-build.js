const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0;
let fail = 0;
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`); }
}

const rootBat = read('scripts/android/build/Family_Bloom_BUILD_APK_AND_SHARE.bat');
const shareBat = read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const cleanBat = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
const preCopy = read('scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const pkg = JSON.parse(read('package.json'));

check('Root one-click APK/share entrypoint exists', exists('scripts/android/build/Family_Bloom_BUILD_APK_AND_SHARE.bat'));
check('Release APK/share implementation BAT exists', exists('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat'));
check('Root entrypoint delegates to Release APK/share BAT', rootBat.includes('Family_Bloom_Android_Release_Build_APK_And_Share.bat'));
check('Share wrapper never invokes adb/device commands', !/where\s+adb|adb\s+devices|adb[^\r\n]*install|shell\s+monkey/i.test(shareBat));
check('Share wrapper states phone is not required', shareBat.includes('Phone  : NOT required'));
check('Share wrapper states Metro is not required', shareBat.includes('Metro  : NOT required'));
check('Default share path is C:\\FamilyBloomShare\\apk', shareBat.includes('C:\\FamilyBloomShare\\apk'));
check('Share path is overrideable with FAMILY_BLOOM_SHARE_DIR', shareBat.includes('FAMILY_BLOOM_SHARE_DIR'));
check('Share directory is created when missing', /mkdir "%SHARE_DIR%"/i.test(shareBat));
check('Wrapper runs P2.12.5 contract before build', shareBat.includes('test-phase-p2_12_5-remote-apk-share-build.js'));
check('Wrapper calls existing Release builder in APK-only/no-pause mode', shareBat.includes('Family_Bloom_Android_Test_App_RELEASE.bat') && shareBat.includes('--apk-only') && shareBat.includes('--no-pause'));
check('Wrapper consumes canonical local Release latest APK', shareBat.includes('Family_Bloom_Release_LATEST.apk'));
check('Wrapper publishes stable remote latest name', shareBat.includes('Family_Bloom_LATEST.apk'));
check('Wrapper publishes timestamped Release history', shareBat.includes('Family_Bloom_Release_!BUILD_STAMP!.apk'));
check('Wrapper writes SHA256 sidecar', shareBat.includes('Family_Bloom_LATEST.sha256') && shareBat.includes('Get-FileHash'));
check('Wrapper writes human-readable metadata', shareBat.includes('Family_Bloom_LATEST.txt'));
check('Wrapper does not install or launch app itself', !/install\s+-r|shell\s+monkey/i.test(shareBat));
check('P2.12.5 package script registered', pkg.scripts?.['phaseP2_12_5:check']?.includes('test-phase-p2_12_5-remote-apk-share-build.js'));
check('Clean apply runs P2.12.5 gate', cleanBat.includes('test-phase-p2_12_5-remote-apk-share-build.js'));
check('Copy-over header advertises P2.12.5 or successor', /P2\.(?:12\.[5-8]|15\.5\.1|1[6-9]|2[0-9]|3[0-9])/.test(preCopy));
check('Release builder supports no-pause chaining', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('NO_PAUSE') && read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('--no-pause'));
check('Release builder remains responsible for clean prebuild', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('expo prebuild --platform android --clean'));
check('Release builder remains responsible for Gradle Release APK', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes(':app:assembleRelease'));
// H21R2: validate the real packaging/verification contract, not a legacy echo string.
// H21R1 replaced literal APK zip-path counting with protected resource staging and
// R.raw verification using AAPT2 when Android optimizes resource entry filenames.
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const audioVerifier = read('scripts/setup/check-board-audio-apk.js');
const audioStager = read('scripts/setup/stage-board-audio-native.js');
const prebuildAt = releaseBat.indexOf('expo prebuild --platform android --clean');
const stageAt = releaseBat.indexOf('node scripts\\setup\\stage-board-audio-native.js');
const gradleAt = releaseBat.indexOf(':app:assembleRelease');
const verifyAt = releaseBat.indexOf('node scripts\\setup\\check-board-audio-apk.js "%APK_SOURCE%"');
const publishAt = releaseBat.indexOf('copy /Y "%APK_SOURCE%"');
check('Release builder stages SoundPool resources after prebuild and before Gradle',
  prebuildAt >= 0 && stageAt > prebuildAt && gradleAt > stageAt &&
  /node scripts\\setup\\stage-board-audio-native\.js\r?\nif errorlevel 1 goto :fail/.test(releaseBat));
check('Release builder verifies compiled APK resources before publishing',
  verifyAt > gradleAt && publishAt > verifyAt &&
  /node scripts\\setup\\check-board-audio-apk\.js "%APK_SOURCE%"\r?\nif errorlevel 1 goto :fail/.test(releaseBat));
check('Audio resource verifier still requires all 11 SoundPool resources',
  audioVerifier.includes("'game_start','move_self','move_opponent'") &&
  audioVerifier.includes("'premove','illegal','tenseconds','game_end'") &&
  audioVerifier.includes('missing from the APK resource table') &&
  audioVerifier.includes("'dump','resources',apk") &&
  audioVerifier.includes('process.exit(1)'));
check('Native audio staging verifies copied MP3 bytes and fails on a missing prebuild',
  audioStager.includes('sha256') &&
  audioStager.includes('android/app/build.gradle') &&
  audioStager.includes('keep.xml'));

check('Release builder validates AAPT2 resource file names before and after prebuild',
  releaseBat.includes('check-android-resource-names.js --source-only') &&
  releaseBat.includes('check-android-resource-names.js') &&
  releaseBat.indexOf('check-android-resource-names.js --source-only') < prebuildAt &&
  releaseBat.indexOf('check-android-resource-names.js\r\n') > stageAt ||
  releaseBat.indexOf('check-android-resource-names.js\n') > stageAt);
check('Audio source and stage scripts use AAPT2-safe keep.xml name',
  exists('modules/family-bloom-overlay/android/src/main/res/raw/keep.xml') &&
  !exists('modules/family-bloom-overlay/android/src/main/res/raw/com.familybloom.keep.xml') &&
  audioStager.includes("const keepFile = 'keep.xml'") &&
  audioVerifier.includes("'keep.xml'"));

check('Release builder still verifies effective Expo config', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('check-effective-expo-config.js'));
check('Release builder still verifies P2.12.4 audio/build gate', read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat').includes('phaseP2_12_4:check'));

console.log(`\nP2.12.5 Remote Standalone APK + Share Build: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
