const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(label, ok) { if (ok) { pass += 1; console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${label}`); } else { fail += 1; console.error(`FAIL -- ${label}`); } }
function syntax(rel) { const out = ts.transpileModule(read(rel), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: rel }); return !(out.diagnostics||[]).some(d => d.category === ts.DiagnosticCategory.Error); }

console.log('\nP2.26 — dedicated Focus camera + Chess-only realtime context\n');
const graph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const chess = read('src/context/ChessRealtimeContext.tsx');
const lobbyHook = read('src/hooks/chess/useChessLobby.ts');
const lobby = read('src/app/(chess)/chess-lobby.tsx');
const home = read('src/app/(home)/(games)/home-games.tsx');
const xiangqiResolver = read('src/services/xiangqi/xiangqiSessionBootstrap.ts');
const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const pre = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const share = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');

check('Focus presentation renders dedicated viewport', graph.includes('<DedicatedFocusGraphViewport') && !/PersistentFocusGraphSurface[\s\S]{0,1800}<FamilyGraphPrototype/.test(graph));
check('No Focus overlay invocation re-enters FamilyGraphPrototype', !graph.includes('surfaceMode="focusOverlay"'));
check('Dedicated Focus owns scale SharedValue', /DedicatedFocusGraphViewport[\s\S]{0,5000}const focusScale = useSharedValue/.test(graph));
check('Dedicated Focus owns translate SharedValues', /DedicatedFocusGraphViewport[\s\S]{0,5000}const focusTranslateX = useSharedValue/.test(graph) && /DedicatedFocusGraphViewport[\s\S]{0,5000}const focusTranslateY = useSharedValue/.test(graph));
check('Dedicated Focus owns an independent input controller', /DedicatedFocusGraphViewport[\s\S]{0,16000}(?:PanResponder\.create\(\{|Gesture\.Pan\(\))/.test(graph));
check('Dedicated Focus pan writes only Focus camera', /DedicatedFocusGraphViewport[\s\S]{0,16000}focusTranslateX\.value = next\.x/.test(graph) && /DedicatedFocusGraphViewport[\s\S]{0,16000}focusTranslateY\.value = next\.y/.test(graph));
check('Dedicated Focus pinch writes only Focus camera', /DedicatedFocusGraphViewport[\s\S]{0,16000}focusScale\.value = nextScale/.test(graph));
check('Dedicated Focus persists exact camera to BSH', /DedicatedFocusGraphViewport[\s\S]{0,9000}updateFamilyGraphRuntimeCamera\(visual\.sceneKey, camera\)/.test(graph));
check('Dedicated Focus hydrates retained runtime independently', /DedicatedFocusGraphViewport[\s\S]{0,4000}hydrateFamilyGraphRuntimeState\(visual\.sceneKey/.test(graph));
check('Dedicated Focus reuses immutable geometry', /DedicatedFocusGraphViewport[\s\S]{0,18000}geometry=\{visual\.geometry\}/.test(graph));
check('Standard graph still owns RNGH camera path', graph.includes('Gesture.Simultaneous(panGesture, pinchGesture)') && graph.includes('GestureHandlerRootView'));

check('Chess realtime value contains no other-game boolean', !chess.includes('otherBoardGameActive'));
check('Chess realtime has no other-game setter', !chess.includes('setOtherBoardGameActive'));
check('busy_other_game recovery becomes Chess none', /recovery\.data\.kind === "busy_other_game"[\s\S]{0,500}setRecoveryKind\("none"\)/.test(chess));
check('busy_other_game branch does not retain Xiangqi id/kind', !/recovery\.data\.kind === "busy_other_game"[\s\S]{0,500}recovery\.data\.(gameId|gameKind)/.test(chess));
check('Chess lobby hook exports no other-game state', !lobbyHook.includes('otherBoardGameActive'));
check('Chess lobby does not route/block from other-game state', !lobby.includes('otherBoardGameActive') && !lobby.includes('xiangqi-preview'));
check('Home Chess open does not inspect other-game state', !/const openChess[\s\S]{0,1200}otherBoardGameActive/.test(home));
check('Home still enforces neutral pending reservation lock', home.includes('blockByPending("chess")') && home.includes('blockByPending("xiangqi")'));
check('Xiangqi still validates server lifetime independently', xiangqiResolver.includes('sessionRecover') && xiangqiResolver.includes('discardStaleLocalXiangqiSession'));

for (const rel of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/context/ChessRealtimeContext.tsx',
  'src/hooks/chess/useChessLobby.ts',
  'src/app/(chess)/chess-lobby.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/services/xiangqi/xiangqiSessionBootstrap.ts',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.26 gate', pkg.scripts?.['phaseP2_26:check'] === 'node ./scripts/test-phase-p2_26-dedicated-focus-camera-chess-only-realtime.js');
check('CLEAN APPLY executes P2.26 gate', clean.includes('test-phase-p2_26-dedicated-focus-camera-chess-only-realtime.js'));
check('Android Debug executes P2.26 gate', debug.includes('phaseP2_26:check'));
check('Android Release executes P2.26 gate', release.includes('phaseP2_26:check'));
check('PRE COPY identifies P2.26 or later successor', pre.includes('Performance Architecture P2.26') || pre.includes('Performance Architecture P2.27'));
check('APK share identifies P2.26 or later successor', share.includes('Family Bloom P2.26') || share.includes('Family Bloom P2.27'));

console.log(`\nP2.26 result: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
