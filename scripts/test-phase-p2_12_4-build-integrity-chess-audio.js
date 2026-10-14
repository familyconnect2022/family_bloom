const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0;
let fail = 0;
function check(name, condition, detail = '') {
  if (condition) { pass += 1; console.log(`PASS ${name}`); }
  else { fail += 1; console.error(`FAIL ${name}${detail ? ` :: ${detail}` : ''}`); }
}

const appConfig = read('app.config.js');
const appJson = JSON.parse(read('app.json')).expo;
const pkg = JSON.parse(read('package.json'));
const depCheck = read('scripts/setup/check-expo-dependencies.js');
const lockCheck = read('scripts/setup/check-package-lock.js');
const entrypointAudit = read('scripts/setup/check-build-entrypoints.js');
const doctorPolicy = read('scripts/setup/run-expo-doctor-native-policy.js');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const chessAudio = read('src/components/chess/useChessSoundscape.ts');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const metro = read('metro.config.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanBat = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const syncBat = read('scripts/setup/Family_Bloom_Sync_Dependencies.bat');
const installBat = read('scripts/setup/Family_Bloom_Install_And_Doctor.bat');
const legacySetup = read('scripts/setup/settup.bat');

check('Dynamic app config explicitly installs expo-audio plugin', appConfig.includes("'expo-audio'") && appConfig.includes('plugins: withPluginOnce'));
check('Playback-only audio plugin disables microphone/background services', appConfig.includes('recordAudioAndroid: false') && appConfig.includes('enableBackgroundPlayback: false') && appConfig.includes('enableBackgroundRecording: false'));
check('app.json also declares expo-audio for transparent config review', (appJson.plugins || []).some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-audio'));
check('Package pins Expo SDK 57 audio', pkg.dependencies?.['expo-audio'] === '~57.0.5');
check('Package directly installs expo-asset peer required by expo-audio', pkg.dependencies?.['expo-asset'] === '~57.0.19');
check('Package pins Expo Doctor instead of network-fetching it at build time', pkg.devDependencies?.['expo-doctor'] === '1.20.4');
check('Installed dependency checker watches expo-audio via package.json contract', depCheck.includes("'expo-audio'") && depCheck.includes('packageJson.dependencies?.[name]'));
check('Installed dependency checker watches expo-asset peer', depCheck.includes("'expo-asset'"));
check('Package-lock checker watches expo-audio', lockCheck.includes("'expo-audio',"));
check('Package-lock checker watches expo-asset peer', lockCheck.includes("'expo-asset',"));
check('Package-lock checker watches pinned Expo Doctor', lockCheck.includes('expo-doctor'));
check('Doctor gate uses only pinned local Doctor package via Node CLI', doctorPolicy.includes("node_modules', 'expo-doctor") && doctorPolicy.includes('manifest.bin') && doctorPolicy.includes('command: process.execPath') && !doctorPolicy.includes('expo-doctor.cmd') && !/npx\s+expo-doctor/i.test(doctorPolicy));
check('Entrypoint audit checks npm scripts and node script targets', entrypointAudit.includes('packageScripts') && entrypointAudit.includes('references missing npm script') && entrypointAudit.includes('references missing node script'));
check('Effective Expo config validator exists', exists('scripts/setup/check-effective-expo-config.js'));
check('Audio asset integrity validator exists', exists('scripts/setup/check-board-audio-integrity.js'));
check('Build entrypoint validator exists', exists('scripts/setup/check-build-entrypoints.js'));

const boardNames = ['game-start','move-self','move-opponent','capture','move-check','castle','promote','premove','illegal','tenseconds','game-end'];
check('All 11 exact supplied board MP3 assets exist', boardNames.every((name) => exists(`assets/audio/board-game/${name}.mp3`)));
check('All 11 exact supplied board MP3 assets are statically required', boardNames.every((name) => audio.includes(`${name}.mp3`)));
check('Metro remains compatible with legacy M4A packages', metro.includes("assetExts.includes('m4a')") && metro.includes("assetExts.push('m4a')"));
check('Audio preloading remains process-singleton and lazy', audio.includes('boardAudioPreloadPromise') && audio.includes('ensureBoardAudioPreloaded') && audio.includes('if (!enabled) return;'));
check('Reliable cue retries native attachment', audio.includes('lastAttachAttemptAtRef') && audio.includes('player.replace(source)') && audio.includes('< 480'));
check('Failed replace never marks source attached', !audio.includes('sourceAttachedRef.current = true'));
check('Early sound event stays inside current gesture window instead of replaying late', audio.includes('Date.now() - requestedAt > 140') && audio.includes('retryCount < 3') && !audio.includes('pendingPlayRef.current = true'));
check('No timeout lies about audio readiness', !audio.includes('Date.now() - startedAt >= 1600') && !audio.includes('setPlayersReady(true)'));
check('audioReady reflects actual loaded cues', audio.includes('loadedCount === cues.length'));
check('Move sound calls are not globally discarded behind audioReady', !audio.includes('if (!audioReady) return;'));
check('Chess uses only shared supplied board soundscape', chessAudio.includes('useBoardGameSoundscape') && !chessAudio.includes('CHESS_SOURCES') && !exists('assets/audio/chess'));
check('P2.16 successor keeps Chess visual Ready independent from audio warmup', chessHost.includes('if (!boardVisualReady || warmReady) return;') && chessHost.includes('useChessSoundscape(surface.prepared)') && !chessHost.includes('!boardVisualReady || !criticalAudioReady'));
check('Chess soundscape is still armed by persistent surface preparation', chessHost.includes('useChessSoundscape(surface.prepared)'));

for (const [name, bat] of [['Debug', debugBat], ['Release', releaseBat]]) {
  check(`${name} build verifies effective Expo config`, bat.includes('check-effective-expo-config.js'));
  check(`${name} build verifies board audio source integrity`, bat.includes('check-board-audio-integrity.js'));
  check(`${name} build audits BAT entrypoints`, bat.includes('check-build-entrypoints.js'));
  check(`${name} dependency bootstrap checks expo-audio`, bat.includes('node_modules\\expo-audio\\package.json'));
  check(`${name} dependency bootstrap checks expo-asset peer`, bat.includes('node_modules\\expo-asset\\package.json'));
  check(`${name} dependency bootstrap checks pinned Expo Doctor`, bat.includes('node_modules\\expo-doctor\\package.json'));
  check(`${name} build runs P2.12.4 gate`, bat.includes('phaseP2_12_4:check'));
}
check('Release APK verifies bundled supplied MP3 payload', releaseBat.includes('BOARD_MP3_COUNT') && releaseBat.includes('jar tf') && releaseBat.includes('.mp3'));
check('Release script has no dead phase14v2d command after exit', !/exit \/b 1[\s\S]*npm run phase14v2d:check/.test(releaseBat));
check('Clean apply bootstraps missing root package-lock', cleanBat.includes('if not exist "package-lock.json" set "NEED_INSTALL=1"'));
check('Clean apply runs P2.12.4 gate', cleanBat.includes('test-phase-p2_12_4-build-integrity-chess-audio.js'));
check('Clean apply audits BAT entrypoints', cleanBat.includes('check-build-entrypoints.js'));
check('Dependency sync validates effective config + audio assets', syncBat.includes('check-effective-expo-config.js') && syncBat.includes('check-board-audio-integrity.js'));
check('Install/Doctor validates effective config + audio assets', installBat.includes('check-effective-expo-config.js') && installBat.includes('check-board-audio-integrity.js'));
check('Legacy settup.bat is retired instead of npm install expo', legacySetup.includes('RETIRED') && !legacySetup.includes('npm install expo'));
check('Package exposes audio integrity command', pkg.scripts?.['audio:integrity']?.includes('check-board-audio-integrity.js'));
check('Package exposes build entrypoint audit command', pkg.scripts?.['build:entrypoints-check']?.includes('check-build-entrypoints.js'));
check('Package exposes P2.12.4 regression command', !!pkg.scripts?.['phaseP2_12_4:check']);

for (const file of ['src/components/games/useBoardGameSoundscape.ts','src/components/chess/useChessSoundscape.ts','src/components/chess/ChessSurfaceHost.tsx']) {
  const out = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    reportDiagnostics: true,
    fileName: file,
  });
  const errors = (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  check(`TypeScript transpile ${file}`, errors.length === 0, errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('; '));
}

console.log(`\nP2.12.4 Build Integrity + Chess Audio: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
