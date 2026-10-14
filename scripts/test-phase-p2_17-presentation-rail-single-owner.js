const fs = require('fs');
const path = require('path');
const Module = require('module');
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

console.log('\nP2.17 — Parked Presentation Rail / single board-game owner\n');

if (!fs.existsSync(path.join(root, 'src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx'))) {
  console.log('P2.18 successor detected: Focus is route-local and board games use lazy GameBoardHost.');
  const { spawnSync } = require('child_process');
  const successor = spawnSync(process.execPath, [path.join(root, 'scripts/test-phase-p2_18-pending-game-lock-lazy-board-local-focus.js')], { cwd: root, stdio: 'inherit' });
  process.exit(successor.status || 0);
}

const coordinator = read('src/services/presentation/boardGamePresentationCoordinator.ts');
const active = read('src/services/games/activeBoardGameSessionStore.ts');
const rail = read('src/services/presentation/bloomSurfaceRailStore.ts');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xiangqiHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const mini = read('src/components/chess/ChessMiniHost.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const focusHost = read('src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const layout = read('src/app/_layout.tsx');
const audio = read('src/components/games/useBoardGameSoundscape.ts');
const globalUi = read('src/components/chess/ChessGlobalUiHost.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');

check('one board-game PresentationCoordinator exists', coordinator.includes('claimAndPresentBoardGame') && coordinator.includes('presentClaimedBoardGame'));
check('cross-kind local session stealing is forbidden', active.includes('current.kind !== input.kind && source !== "server"'));
check('rail has one visibleSurface union for Focus/Chess/Xiangqi', rail.includes('export type BloomRailSurface = "focus" | "chess" | "xiangqi" | null'));
check('root stack contains three parked full-surface slots', stack.includes('bloom-rail-chess-slot') && stack.includes('bloom-rail-xiangqi-slot') && stack.includes('bloom-rail-focus-slot'));
check('parked full slots disable input', (stack.match(/pointerEvents=\{[^}]+\? "auto" : "none"\}/g) || []).length >= 3);
check('parked root slots are also visually suppressed', stack.includes('parkedLayer') && stack.includes('opacity: 0'));
check('heavy Chess host mounts only for active Chess lease', stack.includes('session?.kind === "chess"') && stack.includes('<ChessSurfaceHost'));
check('heavy Xiangqi host mounts only for active Xiangqi lease', stack.includes('session?.kind === "xiangqi"') && stack.includes('<XiangqiSurfaceHost'));

for (const [label, src] of [
  ['Chess route', chessRoute],
  ['Xiangqi route', xiangqiRoute],
]) {
  check(`${label} uses coordinator`, src.includes('boardGamePresentationCoordinator'));
  check(`${label} does not directly call legacy surface show/hide`, !/showChessSurfaceFull|activateChessSurface\(|minimizeChessSurface\(|showXiangqiSurfaceFull|activateXiangqiSurface\(|hideXiangqiSurface\(/.test(src));
}

check('Xiangqi route resolves a server session before presenting surface', xiangqiRoute.indexOf('resolveOrCreateXiangqiSession') < xiangqiRoute.indexOf('openResolvedSession(result.state.gameId)'));
check('Chess host presentation reads rail rather than legacy mode', chessHost.includes('const presentationMode = rail.gameKind === "chess"') && !chessHost.includes('surface.mode'));
check('Xiangqi host presentation reads rail rather than legacy mode', xiangqiHost.includes('const presentationMode = rail.gameKind === "xiangqi"') && !xiangqiHost.includes('surface.mode'));
check('Mini Chess visibility reads rail', mini.includes('rail.gamePresentation === "mini"') && !mini.includes('surface.mode === "mini"'));
check('Tab chrome reads the same root rail', tabs.includes('subscribeBloomSurfaceRail') && tabs.includes('getBloomSurfaceRailState().visibleSurface'));
check('Focus is published to root host and rail', focus.includes('publishFamilyGraphFocusSurface') && focus.includes('showBloomFocusSurface()') && focusHost.includes('PersistentFocusOverlayPresentation'));
check('parked Focus cannot intercept Family Graph taps', focusHost.includes('pointerEvents={active && snapshot.visible ? "auto" : "none"}') && focusHost.includes('styles.hidden'));
check('shared audio provider wraps Navigator and root rail', layout.indexOf('<BoardGameAudioProvider') < layout.indexOf('<RootNavigator') && layout.indexOf('</BoardGameAudioProvider>') > layout.indexOf('<BloomSurfaceStack'));
check('all eleven supplied physical-board cues remain registered', (audio.match(/useReliableAudioCue\(SOURCES\./g) || []).length === 11);
check('challenge sound bus has one root UI subscriber', globalUi.includes('subscribeChessSoundUiEvents') && !chessHost.includes('subscribeChessSoundUiEvents'));
check('Chess overlays cannot survive a parked/full-hidden rail state', chessHost.includes('const modalVisible = fullVisible &&') && chessHost.includes('{fullVisible && actualGame'));
check('Xiangqi native result modal is gated by rail-derived screenFocused', xiangqiHost.includes('visible={screenFocused && game.gameOver && resultRevealReady}'));
check('Home Games refuses Xiangqi while Chess lease/server game exists', homeGames.includes('activeBoardGame?.kind === "chess"') && homeGames.includes('chessRealtime.activeGameId') && homeGames.includes('Cờ vua vẫn đang tiếp tục'));

// Execute the real store/coordinator state machine in Node. The stores only need
// React.useSyncExternalStore, so a tiny test stub is sufficient.
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
  const activeStore = require(path.join(root, 'src/services/games/activeBoardGameSessionStore.ts'));
  const railStore = require(path.join(root, 'src/services/presentation/bloomSurfaceRailStore.ts'));
  const present = require(path.join(root, 'src/services/presentation/boardGamePresentationCoordinator.ts'));

  activeStore.resetActiveBoardGameSession();
  railStore.resetBloomSurfaceRail();

  check('runtime: Chess server lease enters full rail', present.claimAndPresentBoardGame({ kind: 'chess', gameId: 'c1', source: 'server', presentation: 'full' }) === true
    && activeStore.getActiveBoardGameSession()?.kind === 'chess'
    && railStore.getBloomSurfaceRailState().visibleSurface === 'chess');

  check('runtime: full Chess becomes mini without changing session', present.minimizeClaimedBoardGame('chess', 'c1') === true
    && activeStore.getActiveBoardGameSession()?.gameId === 'c1'
    && railStore.getBloomSurfaceRailState().gamePresentation === 'mini'
    && railStore.getBloomSurfaceRailState().visibleSurface === null);

  const beforeSteal = JSON.stringify(railStore.getBloomSurfaceRailState());
  check('runtime: local Xiangqi cannot steal active Chess', present.claimAndPresentBoardGame({ kind: 'xiangqi', gameId: 'x1', source: 'session', presentation: 'full' }) === false
    && activeStore.getActiveBoardGameSession()?.kind === 'chess'
    && JSON.stringify(railStore.getBloomSurfaceRailState()) === beforeSteal);

  check('runtime: same Chess session re-enters full immediately', present.presentClaimedBoardGame('chess', 'c1', 'full', 'route') === true
    && railStore.getBloomSurfaceRailState().visibleSurface === 'chess'
    && railStore.getBloomSurfaceRailState().gameId === 'c1');

  railStore.showBloomFocusSurface();
  check('runtime: Focus preempts pixels but preserves Chess session', railStore.getBloomSurfaceRailState().visibleSurface === 'focus'
    && activeStore.getActiveBoardGameSession()?.gameId === 'c1'
    && railStore.getBloomSurfaceRailState().gamePresentation === 'full');
  railStore.hideBloomFocusSurface();
  check('runtime: closing Focus restores same full Chess surface', railStore.getBloomSurfaceRailState().visibleSurface === 'chess'
    && railStore.getBloomSurfaceRailState().gameId === 'c1');

  let repeatedFocusOk = true;
  for (let i = 0; i < 10; i += 1) {
    railStore.showBloomFocusSurface();
    repeatedFocusOk = repeatedFocusOk && railStore.getBloomSurfaceRailState().visibleSurface === 'focus';
    railStore.hideBloomFocusSurface();
    repeatedFocusOk = repeatedFocusOk && railStore.getBloomSurfaceRailState().visibleSurface === 'chess';
  }
  check('runtime: Focus can open/close ten times without losing underlying session', repeatedFocusOk
    && activeStore.getActiveBoardGameSession()?.gameId === 'c1');

  check('runtime: authoritative server may replace stale Chess with Xiangqi', present.claimAndPresentBoardGame({ kind: 'xiangqi', gameId: 'x2', source: 'server', presentation: 'full' }) === true
    && activeStore.getActiveBoardGameSession()?.kind === 'xiangqi'
    && railStore.getBloomSurfaceRailState().visibleSurface === 'xiangqi');

  const beforeChessSteal = JSON.stringify(railStore.getBloomSurfaceRailState());
  check('runtime: local Chess cannot steal authoritative Xiangqi', present.claimAndPresentBoardGame({ kind: 'chess', gameId: 'c2', source: 'route', presentation: 'full' }) === false
    && activeStore.getActiveBoardGameSession()?.kind === 'xiangqi'
    && JSON.stringify(railStore.getBloomSurfaceRailState()) === beforeChessSteal);

  present.finishClaimedBoardGame('xiangqi', 'x2');
  check('runtime: finished game clears lease and parks rail', activeStore.getActiveBoardGameSession() === null
    && railStore.getBloomSurfaceRailState().gameKind === null
    && railStore.getBloomSurfaceRailState().visibleSurface === null);

  check('runtime: server-confirmed rematch can advance same-kind game id', present.claimAndPresentBoardGame({ kind: 'chess', gameId: 'c3', source: 'server', presentation: 'full' }) === true
    && present.claimAndPresentBoardGame({ kind: 'chess', gameId: 'c4', source: 'server', presentation: 'full', reason: 'rematch' }) === true
    && activeStore.getActiveBoardGameSession()?.gameId === 'c4'
    && railStore.getBloomSurfaceRailState().gameId === 'c4');
} finally {
  Module._load = originalLoad;
  if (previousTs) require.extensions['.ts'] = previousTs;
  else delete require.extensions['.ts'];
}

for (const rel of [
  'src/services/games/activeBoardGameSessionStore.ts',
  'src/services/presentation/bloomSurfaceRailStore.ts',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/chess/ChessMiniHost.tsx',
  'src/components/chess/ChessGlobalUiHost.tsx',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/app/(tabs)/_layout.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
]) check(`syntax ${rel}`, syntax(rel));

console.log(`\nFamily Bloom P2.17 Presentation Rail: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
