const fs = require('fs');
const path = require('path');
const Module = require('module');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));
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

console.log('\nP2.19 — route-owned board handoff + hub-resolved Xiangqi + Android-safe local Focus\n');

const chessContext = read('src/context/ChessRealtimeContext.tsx');
const bridge = read('src/components/system/BoardGameSessionBridge.tsx');
const coordinator = read('src/services/presentation/boardGamePresentationCoordinator.ts');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const xiangqiBootstrap = read('src/services/xiangqi/xiangqiSessionBootstrap.ts');
const gameHost = read('src/components/system/GameBoardHost.tsx');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

// 1) Chess recovery may not clear a valid route claim during connect/appJoin.
check('Chess context exposes explicit recoveryKind', chessContext.includes('recoveryKind: ChessSessionRecovery["kind"] | null'));
check('recoveryKind is reset before each foreground recovery pass', chessContext.includes('setRecoveryKind(null);\n      try {'));
check('recoveryKind is published only after successful sessionRecover ACK', chessContext.includes('if (!recovery.ok) throw new Error(recovery.errorCode);\n        setRecoveryKind(recovery.data.kind);'));
check('background transition invalidates prior recovery authority', chessContext.includes('updateConnection("idle");\n        setRecoveryKind(null);'));
check('session bridge does not interpret transient empty ids as recovered none', bridge.includes('if (chess.recoveryKind == null) return;') && bridge.includes('const current = getActiveBoardGameSession();'));
check('session bridge recoveryKind participates in effect reconciliation without cross-game state', bridge.includes('chess.activeGameId, chess.recoveryKind]') && !bridge.includes('busyOtherGame'));

// 2) Route presentation has a real owner token, not only a game id.
check('coordinator stores route presentation owner token', coordinator.includes('let routePresentationOwner: RouteBoardGamePresentationOwner | null = null'));
check('coordinator exposes route acquire operation', coordinator.includes('export function acquireRouteBoardGamePresentation'));
check('coordinator validates route release owner token', coordinator.includes('owner.ownerToken !== ownerToken'));
check('coordinator clears matching owner on game finish', coordinator.includes('routePresentationOwner?.kind === kind') && coordinator.includes('routePresentationOwner = null'));
check('Chess route owns a stable route token', chessRoute.includes('routeOwnerTokenRef = useRef(`chess-route:'));
check('Chess route acquires full presentation through owner API', chessRoute.includes('acquireRouteBoardGamePresentation("chess", ownedGameId, ownerToken)'));
check('Chess route blur releases only its own owner token', chessRoute.includes('releaseRouteBoardGamePresentation("chess", ownedGameId, ownerToken, "mini")'));
check('Chess focus follows active-session gameId/rematch changes', chessRoute.includes('activeBoardSession?.gameId'));
check('Xiangqi route owns a stable route token', xiangqiRoute.includes('routeOwnerTokenRef = useRef(`xiangqi-route:'));
check('Xiangqi route acquires through owner API', xiangqiRoute.includes('acquireRouteBoardGamePresentation("xiangqi"'));
check('Xiangqi route blur parks only its own owner token', xiangqiRoute.includes('releaseRouteBoardGamePresentation("xiangqi", exactOwnedGameId, ownerToken, "hidden")'));
check('Xiangqi focus follows active-session gameId/rematch changes', xiangqiRoute.includes('activeBoardSession?.gameId'));
check('stale latest-session cleanup pattern removed from Chess route', !chessRoute.includes('minimizeClaimedBoardGame("chess", latest.gameId)'));
check('stale latest-session cleanup pattern removed from Xiangqi route', !xiangqiRoute.includes('parkClaimedBoardGame("xiangqi", latest.gameId)'));

// 3) Normal Xiangqi entry stays in Hub until authoritative gameId exists.
const resolveAt = homeGames.indexOf('await resolveOrCreateXiangqiSession(activeFamilyId)');
const normalPushAt = homeGames.lastIndexOf('router.push("/xiangqi-preview"');
check('Game Hub resolves Xiangqi before normal route push', resolveAt >= 0 && normalPushAt > resolveAt);
check('resolved Xiangqi state is cached before navigation', homeGames.indexOf('cacheXiangqiBootstrapState(result.state)') > resolveAt && homeGames.indexOf('cacheXiangqiBootstrapState(result.state)') < normalPushAt);
check('resolved Xiangqi board is claimed parked/hidden before navigation', homeGames.includes('presentation: "hidden"') && homeGames.indexOf('presentation: "hidden"') < normalPushAt);
check('route push waits one frame after root board claim', homeGames.includes('requestAnimationFrame(() => router.push("/xiangqi-preview"'));
check('successor terminal result never participates in explicit Xiangqi start', !homeGames.includes('pendingResultGameId') && !homeGames.includes('finishClaimedBoardGame("chess"') && homeGames.includes('const activeChessGameId = chessRealtime.activeGameId'));
check('truly active Chess still blocks Xiangqi', homeGames.includes('const activeChessGameId = chessRealtime.activeGameId') && homeGames.includes('Cờ vua vẫn đang tiếp tục'));
check('normal Xiangqi pending result stays on Game Hub instead of blank command route', homeGames.includes('if (result.kind === "pending")') && homeGames.includes('Stay on Game Hub'));
check('Xiangqi local reservation is released on appJoin failure', /if \(!joined\.ok\) \{\s*finishLocalBoardGameReservation\(localToken, true\)/m.test(xiangqiBootstrap));
check('Xiangqi local reservation is released on sessionRecover failure', /if \(!recovered\.ok\) \{\s*finishLocalBoardGameReservation\(localToken, true\)/m.test(xiangqiBootstrap));

// 4) Shared board host mounts current authoritative kind in the same render.
check('Chess active kind bypasses one-effect mount latch delay', gameHost.includes('const mountChess = chessEverMounted || session?.kind === "chess"'));
check('Xiangqi active kind bypasses one-effect mount latch delay', gameHost.includes('const mountXiangqi = xiangqiEverMounted || session?.kind === "xiangqi"'));

// 5) Focus is still local to Phả hệ, but native-window handoff is serialized.
check('global/root Focus host remains removed', !exists('src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx'));
check('global/root Focus store remains removed', !exists('src/services/presentation/familyGraphFocusSurfaceStore.ts'));
check('Focus native presentation is owned inside FamilyGraphPrototype', focus.includes('<Modal') && focus.includes('visible={focusOverlayVisible}') && focus.includes('presentationStyle="overFullScreen"') && focus.includes('<PersistentFocusOverlayPresentation'));
check('Detail-to-Focus primes without presenting a second native window', focus.includes('mountFocusOverlay(personId, hostFrame, false)'));
check('Detail-to-Focus waits two native frames before fallback presentation', (focus.match(/scheduleFocusFrame\(\(\) => \{/g) || []).length >= 2 && focus.includes('setFocusOverlayVisible(true)'));
check('onDismiss accelerates safe Focus attach when Android supplies it', focus.includes('if (pendingDetailFocusHandoffRef.current)') && focus.includes('earliest safe proof that the Detail native window is gone'));
check('Focus handoff has timer fallback when onDismiss is absent', focus.includes('}, 140);'));

for (const rel of [
  'src/context/ChessRealtimeContext.tsx',
  'src/components/system/BoardGameSessionBridge.tsx',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/services/xiangqi/xiangqiSessionBootstrap.ts',
  'src/components/system/GameBoardHost.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
]) check(`syntax ${rel}`, syntax(rel));

// Execute the real coordinator/store modules to prove same-gameId stale route
// cleanup cannot hide a newer route owner. No RN view layer is needed here.
const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'react') return { useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot() };
  return originalLoad.apply(this, arguments);
};
const previousTs = require.extensions['.ts'];
require.extensions['.ts'] = function compileTs(mod, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const js = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  mod._compile(js, filename);
};
try {
  const active = require(path.join(root, 'src/services/games/activeBoardGameSessionStore.ts'));
  const rail = require(path.join(root, 'src/services/presentation/bloomSurfaceRailStore.ts'));
  const chessSurface = require(path.join(root, 'src/services/chess/chessSurfaceStore.ts'));
  const xiangqiSurface = require(path.join(root, 'src/services/xiangqi/xiangqiSurfaceStore.ts'));
  const presentation = require(path.join(root, 'src/services/presentation/boardGamePresentationCoordinator.ts'));

  active.resetActiveBoardGameSession();
  rail.resetBloomSurfaceRail();
  chessSurface.resetChessSurfaceSession();
  xiangqiSurface.resetXiangqiSurfaceSession();

  check('runtime owner: Chess session claim succeeds', presentation.claimAndPresentBoardGame({ kind: 'chess', gameId: 'same-game', familyId: 'f1', source: 'server', presentation: 'full' }) === true);
  check('runtime owner: old Chess route acquires same game', presentation.acquireRouteBoardGamePresentation('chess', 'same-game', 'old-route') === true);
  check('runtime owner: newer Chess route replaces owner for same gameId', presentation.acquireRouteBoardGamePresentation('chess', 'same-game', 'new-route') === true);
  check('runtime owner: stale same-game Chess route cannot minimize newer route', presentation.releaseRouteBoardGamePresentation('chess', 'same-game', 'old-route', 'mini') === false && rail.getBloomSurfaceRailState().gamePresentation === 'full');
  check('runtime owner: current Chess route can minimize itself', presentation.releaseRouteBoardGamePresentation('chess', 'same-game', 'new-route', 'mini') === true && rail.getBloomSurfaceRailState().gamePresentation === 'mini');

  active.resetActiveBoardGameSession();
  rail.resetBloomSurfaceRail();
  xiangqiSurface.resetXiangqiSurfaceSession();
  check('runtime owner: Xiangqi session claim succeeds', presentation.claimAndPresentBoardGame({ kind: 'xiangqi', gameId: 'xq-same', familyId: 'f1', source: 'server', presentation: 'full' }) === true);
  presentation.acquireRouteBoardGamePresentation('xiangqi', 'xq-same', 'xq-old');
  presentation.acquireRouteBoardGamePresentation('xiangqi', 'xq-same', 'xq-new');
  check('runtime owner: stale same-game Xiangqi route cannot park newer route', presentation.releaseRouteBoardGamePresentation('xiangqi', 'xq-same', 'xq-old', 'hidden') === false && rail.getBloomSurfaceRailState().gamePresentation === 'full');
  check('runtime owner: current Xiangqi route can park itself', presentation.releaseRouteBoardGamePresentation('xiangqi', 'xq-same', 'xq-new', 'hidden') === true && rail.getBloomSurfaceRailState().gamePresentation === 'hidden');
} finally {
  Module._load = originalLoad;
  if (previousTs) require.extensions['.ts'] = previousTs;
  else delete require.extensions['.ts'];
}

check('package registers P2.19 gate', pkg.scripts?.['phaseP2_19:check'] === 'node ./scripts/test-phase-p2_19-route-owned-handoff-native-focus.js');
check('copy-over updater runs P2.19 gate', cleanApply.includes('test-phase-p2_19-route-owned-handoff-native-focus.js'));
check('pre-copy cleanup identifies P2.19+ release', /Performance Architecture P2\.(?:19|20|21|22|23|24|25|26|27)/.test(preCopy));
check('Debug Android build runs P2.19 gate', debugBat.includes('phaseP2_19:check'));
check('Release Android build runs P2.19 gate', releaseBat.includes('phaseP2_19:check'));

console.log(`\nFamily Bloom P2.19: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
