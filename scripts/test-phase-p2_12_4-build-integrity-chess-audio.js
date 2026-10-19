const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0, fail = 0;
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`); }
}

const appConfig = read('app.config.js');
const appJson = JSON.parse(read('app.json')).expo;
const pkg = JSON.parse(read('package.json'));
const depCheck = read('scripts/setup/check-expo-dependencies.js');
const lockCheck = read('scripts/setup/check-package-lock.js');
const doctorPolicy = read('scripts/setup/run-expo-doctor-native-policy.js');
const debugBat = read('scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanBat = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');

check('Dynamic app config installs expo-audio plugin', appConfig.includes("'expo-audio'") && appConfig.includes('plugins: withPluginOnce'));
check('Playback-only audio plugin disables microphone/background services', appConfig.includes('recordAudioAndroid: false') && appConfig.includes('enableBackgroundPlayback: false') && appConfig.includes('enableBackgroundRecording: false'));
check('app.json declares expo-audio', (appJson.plugins || []).some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-audio'));
check('Package pins Expo SDK 57 audio', pkg.dependencies?.['expo-audio'] === '~57.0.5');
check('Package directly installs expo-asset peer', pkg.dependencies?.['expo-asset'] === '~57.0.19');
check('Package pins Expo Doctor', pkg.devDependencies?.['expo-doctor'] === '1.20.4');
check('Installed dependency checker watches expo-audio', depCheck.includes("'expo-audio'") && depCheck.includes('packageJson.dependencies?.[name]'));
check('Installed dependency checker watches expo-asset', depCheck.includes("'expo-asset'"));
check('Package-lock checker watches expo-audio', lockCheck.includes("'expo-audio',"));
check('Package-lock checker watches expo-asset', lockCheck.includes("'expo-asset',"));
check('Doctor gate uses pinned local package', doctorPolicy.includes("node_modules', 'expo-doctor") && doctorPolicy.includes('manifest.bin') && doctorPolicy.includes('command: process.execPath'));
check('Audio asset integrity validator exists', exists('scripts/setup/check-board-audio-integrity.js'));

const boardNames = ['game-start','move-self','move-opponent','capture','move-check','castle','promote','premove','illegal','tenseconds','game-end'];
check('All 11 canonical board MP3 assets exist', boardNames.every((name) => exists(`assets/audio/board-game/${name}.mp3`)));
check('Chess piece PNG assets remain', ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'].every((p) => exists(`assets/images/chess/pieces-png-default/${p}.png`)));
check('Xiangqi PNG piece assets remain', ['red_general','red_advisor','red_elephant','red_chariot','red_horse','red_cannon','red_soldier','black_general','black_advisor','black_elephant','black_chariot','black_horse','black_cannon','black_soldier'].every((p) => exists(`assets/xiangqi/${p}.png`)));
check('Legacy client audio/board renderer is intentionally absent', !exists('src/components/games/useBoardGameSoundscape.ts') && !exists('src/components/chess/useChessSoundscape.ts'));

for (const [name, bat] of [['Debug', debugBat], ['Release', releaseBat]]) {
  check(`${name} build verifies effective Expo config`, bat.includes('check-effective-expo-config.js'));
  check(`${name} build verifies board audio asset integrity`, bat.includes('check-board-audio-integrity.js'));
  check(`${name} dependency bootstrap checks expo-audio`, bat.includes('node_modules\\expo-audio\\package.json'));
  check(`${name} dependency bootstrap checks expo-asset`, bat.includes('node_modules\\expo-asset\\package.json'));
}
// H21R2: verify active compiled-resource validation, not a retained legacy variable.
check('Release APK validates compiled SoundPool resources after Gradle',
  releaseBat.includes('node scripts\\setup\\check-board-audio-apk.js "%APK_SOURCE%"') &&
  releaseBat.includes('node scripts\\setup\\stage-board-audio-native.js') &&
  releaseBat.indexOf('stage-board-audio-native.js') < releaseBat.indexOf(':app:assembleRelease') &&
  releaseBat.indexOf(':app:assembleRelease') < releaseBat.indexOf('check-board-audio-apk.js "%APK_SOURCE%"'));

check('Clean apply bootstraps missing package-lock', cleanBat.includes('if not exist "package-lock.json" set "NEED_INSTALL=1"'));
check('Package exposes audio integrity command', pkg.scripts?.['audio:integrity']?.includes('check-board-audio-integrity.js'));

console.log(`\nP2.12.4 Build Integrity + Preserved Board Assets: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
