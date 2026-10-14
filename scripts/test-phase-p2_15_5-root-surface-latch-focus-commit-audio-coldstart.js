const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(label, ok) {
  if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2,'0')} - ${label}`); }
  else { fail++; console.error(`FAIL -- ${label}`); }
}
function syntax(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
    fileName: rel,
  });
  return !(out.diagnostics || []).some((d) => d.category === ts.DiagnosticCategory.Error);
}

const layout = read('src/app/_layout.tsx');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const prototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const lifecycle = read('src/services/games/boardGameSurfaceLifecycle.ts');
const manager = read('src/services/presentation/bloomRootSurfaceManager.ts');
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const pkg = JSON.parse(read('package.json'));

console.log('\nP2.15.5 — Root Surface Latch + Focus Commit + Audio Coldstart\n');

check('board presentation has a one-way boot latch',
  layout.includes('persistentSurfacePresentationLatchedRef') && layout.includes('persistentSurfaceBootReady'));
check('board presentation boot gate excludes tabbar readiness',
  layout.includes('const persistentSurfaceBootReady = nativeBootReady && criticalVisualAssetsReady') &&
  !/persistentSurfaceBootReady\s*=\s*[^;]*tabBarVisualReady/.test(layout));
check('route/tab churn no longer writes board presentation false',
  !layout.includes('const ready = firstVisualReady && !familyTransition') &&
  (layout.match(/setXiangqiSurfacePresentationReady\(false\)/g) || []).length === 1);
check('presentation false is only an actual RootNavigator unmount cleanup',
  layout.includes('useEffect(() => () => {') && layout.includes('setChessSurfacePresentationReady(false)') && layout.includes('setXiangqiSurfacePresentationReady(false)'));

check('root surface manager owns a real Android elevation plane',
  /root:\s*\{[\s\S]*?zIndex:\s*9000,[\s\S]*?elevation:\s*80/.test(stack));
check('Focus remains above board game z-order',
  manager.includes('game: 100') && manager.includes('focus: 200'));
check('Focus still occludes all game input',
  stack.includes('pointerEvents={policy.gamesOccluded ? "none" : "box-none"}'));
check('Focus publication happens in layout commit',
  prototype.includes('useLayoutEffect(() => {') && prototype.includes('publishFamilyGraphFocusSurface'));
check('Focus publication no longer waits for a normal effect',
  prototype.includes('atomic presentation handoff'));
check('Focus shell remains persistent, not native Modal',
  !/<Modal\s+[\s\S]*?visible=\{focusOverlayVisible\}/m.test(prototype));

check('Xiangqi route still claims explicit full surface owner',
  xiangqiRoute.includes('showXiangqiSurfaceFull("route", ownerId)'));
check('board full visibility is mode-owned, not tab/startup-readiness-owned',
  lifecycle.includes('return mode === "full"') && lifecycle.includes('_presentationReady'));
check('Xiangqi visibility consumes shared mode-owned presentation contract',
  xiangqiHost.includes('isBoardGameSurfacePresented(surface.presentationReady, surface.mode)'));
check('Chess full surface no longer depends on presentationReady',
  chessHost.includes('const fullVisible = surface.mode === "full" && !occludedByHigherSurface') &&
  !chessHost.includes('fullSurfaceX.value = presentationReady &&'));
check('Xiangqi host remains process-persistent after prepare',
  xiangqiHost.includes('if (!surface.prepared) return null'));

check('board audio preload starts at module load',
  audio.includes('void ensureBoardAudioPreloaded();'));
check('native audio players bind source at creation',
  audio.includes('useAudioPlayer(enabled ? source : null'));
check('audio no longer queues a detached cue for seconds',
  !audio.includes('pendingPlayRef') && audio.includes('Date.now() - requestedAt > 140'));
check('audio detached retry is bounded to current gesture window',
  audio.includes('retryCount < 3') && audio.includes('setTimeout(() => attempt(retryCount + 1)'));
check('audio replay always rewinds to zero', audio.includes('player.seekTo(0)'));
check('critical physical-board cues expose one readiness transition',
  audio.includes('const criticalAudioReady = gameStart.loaded') &&
  audio.includes('criticalAudioReady,') &&
  audio.includes('criticalAudioReady: false'));
check('Chess Ready waits for board pixels and critical audio attach',
  chessHost.includes('!boardVisualReady || !criticalAudioReady || warmReady'));
check('Xiangqi Ready waits for critical audio attach too',
  xiangqiHost.includes('!serverState || !boardReady || !criticalAudioReady'));
check('exact eleven physical board cues still exist', (audio.match(/useReliableAudioCue\(SOURCES\./g) || []).length === 11);
check('castle recognizes flags and SAN',
  chessHost.includes('move.flags.includes("k")') && chessHost.includes('/^O-O(?:-O)?[+#]?$/.test(move.san)'));
check('castle has invariant coordinate fallbacks',
  chessHost.includes('kingFileDelta === 2') && chessHost.includes('castleBySquares') && chessHost.includes('e1g1|e1c1|e8g8|e8c8'));
check('local/server semantic dedupe uses physical move identity',
  chessHost.includes('`${move.color}:${move.from}:${move.to}:${move.promotion ?? \"\"}`'));

for (const rel of [
  'src/app/_layout.tsx',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/games/useBoardGameSoundscape.ts',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/services/games/boardGameSurfaceLifecycle.ts',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.15.5 gate', pkg.scripts?.['phaseP2_15_5:check'] === 'node ./scripts/test-phase-p2_15_5-root-surface-latch-focus-commit-audio-coldstart.js');
check('copy-over updater runs P2.15.5 gate', clean.includes('test-phase-p2_15_5-root-surface-latch-focus-commit-audio-coldstart.js'));
check('Debug Android build runs P2.15.5 gate', debug.includes('npm run phaseP2_15_5:check'));
check('Release Android build runs P2.15.5 gate', release.includes('npm run phaseP2_15_5:check'));

console.log(`\nFamily Bloom P2.15.5 Root Surface / Audio Stability: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
