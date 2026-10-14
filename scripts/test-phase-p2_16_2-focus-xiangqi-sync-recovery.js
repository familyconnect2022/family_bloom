const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
function check(label, ok) {
  if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`); }
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

console.log('\nP2.16.2 — Focus Hot Revisit + Xiangqi Ready + Chess Sync Recovery\n');

const sceneBuilder = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const graphRoute = read('src/app/(family)/(graph)/family-graph.tsx');
const graphPrototype = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const chessContext = read('src/context/ChessRealtimeContext.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');

const identityStart = sceneBuilder.indexOf('export const peekFamilyGraphRenderSceneIdentity');
const identityEnd = sceneBuilder.indexOf('const revisionSceneSlot', identityStart);
const identityProbe = sceneBuilder.slice(identityStart, identityEnd);
check('Focus exposes identity-only O(1) scene peek', identityStart >= 0 && identityProbe.includes('snapshotSceneCache.get(snapshot)'));
check('identity-only Focus peek performs no fingerprint/revision work', identityProbe && !identityProbe.includes('fingerprintFamilyGraphSnapshot') && !identityProbe.includes('revisionSceneCache'));
check('Family Graph route wires press-path cache to identity-only peek', graphRoute.includes('peekFamilyGraphRenderSceneIdentity') && graphRoute.includes('getCachedFocusBranchVisual'));
check('Focus component retains multiple prepared branches locally', graphPrototype.includes('focusVisualCacheRef = useRef<Map<string, FamilyGraphFocusBranchVisual>>'));
check('local Focus cache is revision-safe', graphPrototype.includes('local.visualRevision === scene.visualRevision') && graphPrototype.includes('cached.visualRevision === scene.visualRevision'));
check('Focus opener consumes hot scene before cold shell hydration', graphPrototype.indexOf('const hotVisual = getHotFocusVisual(personId);') >= 0 && graphPrototype.indexOf('const hotVisual = getHotFocusVisual(personId);') < graphPrototype.indexOf('// Cold/new branch remains shell-first'));
check('Focus A -> B -> A branch switch consumes hot scene directly', graphPrototype.includes('P2.16.2 branch revisit') && graphPrototype.includes('visual: hotVisual') && graphPrototype.includes('visualReady: true'));
check('cold Focus remains shell-first and cancellable', graphPrototype.includes('Cold/new branch remains shell-first') && graphPrototype.includes('visual: null') && graphPrototype.includes('hydrateFocusOverlayVisual'));

const startRecoverStart = xiangqiHost.indexOf('const startOrRecover = React.useCallback');
const startRecoverEnd = xiangqiHost.indexOf('useEffect(() => {\n    const offState', startRecoverStart);
const startRecover = xiangqiHost.slice(startRecoverStart, startRecoverEnd);
check('Xiangqi health wake is non-blocking', startRecover.includes('void xiangqiSocketService.prewake().catch(() => undefined)') && !startRecover.includes('await xiangqiSocketService.prewake()'));
check('Xiangqi starts Socket.IO immediately after wake hint', startRecover.indexOf('void xiangqiSocketService.prewake()') < startRecover.indexOf('await xiangqiSocketService.connect()'));
check('Xiangqi retries transient ACK/transport recovery without route reopen', xiangqiHost.includes('bootRetryNonce') && xiangqiHost.includes('/(recover|timeout|network|socket|transport|fetch|connect)/i') && xiangqiHost.includes('setBootRetryNonce'));
check('route-owned Xiangqi host cannot return null on initial prepared race', xiangqiHost.includes('if (!surface.prepared && !routeOwnedPresentation) return null'));
check('route-owned Xiangqi board visibility does not depend on store catch-up', xiangqiHost.includes('const boardSurfaceVisible = routeOwnedPresentation || surface.prepared'));
const xiangqiReadyStart = xiangqiBoard.indexOf('const maybeReportReady = useCallback');
const xiangqiReadyEnd = xiangqiBoard.indexOf('const markAssetReady', xiangqiReadyStart);
const xiangqiReady = xiangqiBoard.slice(xiangqiReadyStart, xiangqiReadyEnd);
check('Xiangqi ready gate is layout + scene paint, not 32 image callbacks', xiangqiReady.includes('pieces.length === 0') && !xiangqiReady.includes('readyAssetIdsRef.current.size < pieces.length'));
check('Xiangqi ready still waits two native frames', (xiangqiReady.match(/requestAnimationFrame/g) || []).length >= 2);

const recoveringStart = chessContext.indexOf('if (joined.errorCode === "CHESS_SERVER_RECOVERING"');
const recoveringEnd = chessContext.indexOf('return;', recoveringStart);
const recovering = chessContext.slice(recoveringStart, recoveringEnd + 7);
check('Chess recovering early return releases synchronization latch', recovering.includes('gameSyncInFlightRef.current = false'));
check('Chess recovering state is downgraded from fake syncing to reconnecting', recovering.includes('connectionPhase: "reconnecting"'));
check('painted Chess no longer uses full-screen modal for ordinary sync/waiting', chessHost.includes('const showPreparing = fullVisible && (rematchPreparing || !actualGame || !warmReady)'));
check('Chess sync/waiting recovery remains visible as non-blocking pill', chessHost.includes('const showSyncPill =') && chessHost.includes('{showSyncPill ? ('));
check('Chess interaction remains server-authoritative while overlay is non-blocking', chessHost.includes('game.connectionPhase === "connected"') && chessHost.includes('state.status === "active"') && chessHost.includes('const boardInteractive'));

for (const rel of [
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/app/(family)/(graph)/family-graph.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/components/xiangqi/XiangqiGameBoard.tsx',
  'src/context/ChessRealtimeContext.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
]) check(`syntax ${rel}`, syntax(rel));

const pkg = JSON.parse(read('package.json'));
const clean = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
check('package registers P2.16.2 gate', pkg.scripts?.['phaseP2_16_2:check'] === 'node ./scripts/test-phase-p2_16_2-focus-xiangqi-sync-recovery.js');
check('copy-over updater runs P2.16.2 gate', clean.includes('phase-p2_16_2-focus-xiangqi-sync-recovery.js'));
check('Debug Android build runs P2.16.2 gate', debug.includes('phaseP2_16_2:check'));
check('Release Android build runs P2.16.2 gate', release.includes('phaseP2_16_2:check'));

console.log(`\nFamily Bloom P2.16.2 Recovery Contract: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
