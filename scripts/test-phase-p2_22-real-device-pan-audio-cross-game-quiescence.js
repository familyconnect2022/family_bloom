const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(label, ok) {
  if (ok) { pass += 1; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`); }
  else { fail += 1; console.error(`FAIL -- ${label}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

console.log('\nP2.22 — real-device Focus pan + first-move audio + cross-game quiescence\n');

const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const focusCamera = read('src/components/familyGraph/familyGraphFocusCamera.ts');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessSurface = read('src/components/chess/ChessSurfaceHost.tsx');
const gameHost = read('src/components/system/GameBoardHost.tsx');
const coordinator = read('src/services/presentation/boardGamePresentationCoordinator.ts');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const buildShare = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');

// A) Real-device Focus pan: keep dedicated camera, but force the Android RNGH
// root closest to the detector so native Modal/View ownership cannot cancel pan.
check('Focus still has dedicated X camera', focus.includes('const focusCameraTranslateX = useSharedValue(0)'));
check('Focus still has dedicated Y camera', focus.includes('const focusCameraTranslateY = useSharedValue(0)'));
check('Focus still has dedicated scale camera', focus.includes('const focusCameraScale = useSharedValue(initialRuntimeScale)'));
check('Focus detector is wrapped by GestureHandlerRootView', focus.includes('<GestureHandlerRootView\n          // Android can let a native Modal/View parent cancel the handler stream'));
check('Focus local root force-activates on Android modal path', focus.includes('unstable_forceActive={surfaceMode === "focusOverlay"}'));
check('Focus pan updates dedicated active camera directly', focus.includes('activeCameraTranslateX.value = next.x') && focus.includes('activeCameraTranslateY.value = next.y'));
check('Focus pan is unclamped delta math', focusCamera.includes('x: startX + translationX') && focusCamera.includes('y: startY + translationY'));
check('Focus Pan and Pinch remain simultaneous', focus.includes('Gesture.Simultaneous(panGesture, pinchGesture)'));
check('Focus stays 85 percent of native window', focus.includes('const FOCUS_OVERLAY_SCREEN_RATIO = 0.85'));

// B) First legal Chess move must use the live audio callback. The call existed in
// P2.21, but executeAttempt captured the initial undefined callback because it was
// absent from its useCallback dependencies.
const executeAttemptStart = chessBoard.indexOf('const executeAttempt = useCallback');
const attemptRef = chessBoard.indexOf('attemptRef.current = executeAttempt', executeAttemptStart);
const executeAttempt = chessBoard.slice(executeAttemptStart, attemptRef);
check('local legal move starts sound before server round trip', executeAttempt.includes('onMoveStarted?.(applied'));
check('local move sound is keyed by clientMoveId', executeAttempt.includes('clientMoveId);'));
check('executeAttempt dependency list contains onMoveStarted', /\}, \[[^\]]*onMoveStarted[^\]]*\]\);\s*$/.test(executeAttempt.trim()));
check('accepted delta path also keeps onMoveStarted dependency', chessBoard.includes('onMoveLanded, onMoveStarted, onVisualRevisionChange'));

// C) Finished Chess must be dead/quiescent before Xiangqi paints. A hidden 240ms
// Chess reset used to wake 32 native piece slots after terminal detach, overlapping
// a fast Chess -> Xiangqi handoff.
check('Chess terminal detach has no resettingWarmBoard state', !chessSurface.includes('resettingWarmBoard'));
check('Chess terminal detach has no 240ms hidden wake timer', !chessSurface.includes('setTimeout(() => setResettingWarmBoard(false), 240)'));
check('parked standby board only runs for explicit prepare', chessSurface.includes('runtimeActive={actualGame ? fullVisible : surface.preparing}'));
check('terminal coordinator still clears Chess surface id', coordinator.includes('finishChessSurfaceGame(gameId)'));
check('shared host keeps inactive layer non-interactive', gameHost.includes('pointerEvents={chessVisible ? "auto" : "none"}') && gameHost.includes('pointerEvents={xiangqiVisible ? "auto" : "none"}'));
check('shared host still lazy-mounts each board kind', gameHost.includes('const mountChess = chessEverMounted || session?.kind === "chess"') && gameHost.includes('const mountXiangqi = xiangqiEverMounted || session?.kind === "xiangqi"'));

for (const rel of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/familyGraph/familyGraphFocusCamera.ts',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/system/GameBoardHost.tsx',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.22 gate', pkg.scripts?.['phaseP2_22:check'] === 'node ./scripts/test-phase-p2_22-real-device-pan-audio-cross-game-quiescence.js');
check('CLEAN APPLY executes P2.22 gate', cleanApply.includes('test-phase-p2_22-real-device-pan-audio-cross-game-quiescence.js'));
check('Android Debug executes P2.22 gate', debugBat.includes('phaseP2_22:check'));
check('Android Release executes P2.22 gate', releaseBat.includes('phaseP2_22:check'));
check('pre-copy banner identifies P2.22 or mini/full successor', preCopy.includes('Performance Architecture P2.22 - Real-Device Pan / First-Move Audio / Cross-Game Quiescence') || preCopy.includes('Performance Architecture P2.23 - Canonical Chess Full / Mini Route Ownership'));
check('APK share banner identifies P2.22 or mini/full successor', buildShare.includes('Family Bloom P2.22 - BUILD APK AND COPY TO SHARE') || buildShare.includes('Family Bloom P2.23 - BUILD APK AND COPY TO SHARE'));
check('CLEAN APPLY banner identifies P2.22 or mini/full successor', cleanApply.includes('Performance Architecture P2.22 - Real-Device Pan / First-Move Audio / Cross-Game Quiescence') || cleanApply.includes('Performance Architecture P2.23 - Canonical Chess Full / Mini Route Ownership'));

console.log(`\nP2.22 result: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
