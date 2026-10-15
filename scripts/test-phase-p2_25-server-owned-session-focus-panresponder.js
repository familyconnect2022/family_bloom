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

console.log('\nP2.25 — server-owned board sessions + Focus PanResponder\n');

const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const chessRealtime = read('src/context/ChessRealtimeContext.tsx');
const lobbyHook = read('src/hooks/chess/useChessLobby.ts');
const bridge = read('src/components/system/BoardGameSessionBridge.tsx');
const home = read('src/app/(home)/(games)/home-games.tsx');
const lobby = read('src/app/(chess)/chess-lobby.tsx');
const chessRoute = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiResolver = read('src/services/xiangqi/xiangqiSessionBootstrap.ts');
const xiangqiSurface = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const coordinator = read('src/services/presentation/boardGamePresentationCoordinator.ts');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const buildShare = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');

// A) Focus uses a completely independent React Native responder path.
check('Focus imports React Native PanResponder', focus.includes('PanResponder,'));
check('Focus creates a dedicated PanResponder', focus.includes('const focusPanResponder = useMemo(() =>') && focus.includes('PanResponder.create({'));
check('Focus claims two-finger touch at start', focus.includes('onStartShouldSetPanResponderCapture') && focus.includes('touches.length >= 2'));
check('Focus one-finger pan writes translate SharedValues', focus.includes('state.startTranslateX + gestureState.dx') && focus.includes('state.startTranslateY + gestureState.dy'));
check('Focus pinch derives scale from two-touch distance', focus.includes('state.startScale * (focal.distance / Math.max(1, state.startDistance))'));
check('Focus pinch keeps a focal canvas anchor', focus.includes('state.anchorCanvasX') && focus.includes('state.anchorCanvasY'));
check('Focus commits exact final camera on release', focus.includes('onPanResponderRelease: finalize') && focus.includes('commitUserCameraTransform('));
check('Focus camera boundary receives PanResponder handlers', focus.includes('focusPanHandlers={focusPanResponder.panHandlers}'));
check('Focus native Modal input ownership matches current successor', !focus.includes('unstable_forceActive') || /GestureHandlerRootView[\s\S]{0,180}unstable_forceActive/.test(focus));
check('Focus Modal has an explicit input root', /<View\s+onLayout=\{handleShellLayout\}\s+style=\{styles\.focusOverlayModalRoot\}/.test(focus) || /<GestureHandlerRootView[\s\S]{0,220}style=\{styles\.focusOverlayModalRoot\}/.test(focus));
check('Full-screen Focus shield cannot own touches', focus.includes('<View pointerEvents="none" style={styles.focusOverlayShield} />'));
check('Standard graph still keeps RNGH root', focus.includes('return <GestureHandlerRootView style={styles.gestureRoot}>{children}</GestureHandlerRootView>;'));
check('Standard graph still keeps simultaneous Pan + Pinch', focus.includes('Gesture.Simultaneous(panGesture, pinchGesture)'));

// B) Chess owns Chess state only; other-game recovery is a neutral lock.
check('Chess realtime public value has no busyOtherGame payload', !chessRealtime.includes('busyOtherGame'));
check('Chess successor exposes no retained other-game boolean', !chessRealtime.includes('otherBoardGameActive') && !chessRealtime.includes('setOtherBoardGameActive'));
check('Lobby hook successor exposes Chess-only realtime state', !lobbyHook.includes('otherBoardGameActive') && !lobbyHook.includes('busyOtherGame'));
check('Chess recovery drops retained Chess on other-game result', chessRealtime.includes('dropRetainedChessSession();') && chessRealtime.includes('recovery.data.kind === "busy_other_game"'));
check('Chess recovery drops retained Chess on terminal/not-found gameJoin', chessRealtime.includes('game.errorCode === "CHESS_GAME_NOT_FOUND"') && chessRealtime.includes('game.errorCode === "CHESS_GAME_FINISHED"'));
check('Chess bridge never claims Xiangqi from Chess recovery', !bridge.includes('kind: "xiangqi"') && !bridge.includes('syncBloomRailGameSession("xiangqi"'));
check('Chess bridge syncs rail only after successful Chess claim', bridge.includes('if (claimed) syncBloomRailGameSession("chess", chessGameId);'));
check('Chess lobby never routes to Xiangqi', !lobby.includes('xiangqi-preview'));
check('Chess command route never routes to Xiangqi', !chessRoute.includes('xiangqi-preview'));
check('Home Chess open uses server-confirmed activeGameId', home.includes('const gameId = chessRealtime.activeGameId;'));
check('Home Chess does not use Xiangqi route as recovery', !/const openChess[\s\S]{0,1200}xiangqi-preview/.test(home));

// C) Xiangqi owns Xiangqi lifetime and validates retained state against server.
check('Xiangqi command route does not import Chess realtime', !xiangqiRoute.includes('useChessRealtime'));
check('Xiangqi command route never claims/routes Chess', !xiangqiRoute.includes('kind: "chess"') && !xiangqiRoute.includes('chess-game'));
check('Xiangqi route explicitly refuses unverified retained local lease', xiangqiRoute.includes('Do not raise a retained local lease before resolveSession has validated'));
check('Xiangqi resolver clears stale local lease when server is busy with another game', /busy_other_game[\s\S]{0,650}discardStaleLocalXiangqiSession\(\)/.test(xiangqiResolver));
check('Xiangqi resolver clears stale local lease when server reports none', /recovered\.data\.kind === "none"[\s\S]{0,250}discardStaleLocalXiangqiSession\(\)/.test(xiangqiResolver));
check('Xiangqi resolver clears stale local lease for finished receipt', /finished_unseen[\s\S]{0,650}discardStaleLocalXiangqiSession\(\)/.test(xiangqiResolver));
check('Xiangqi active recovery never creates second game after failed gameJoin', xiangqiResolver.includes('sessionRecover said active, so never create a second game') && xiangqiResolver.includes('return { kind: "error"'));
check('Xiangqi surface deletes local session on server not-found/finished', xiangqiSurface.includes('gameAck.errorCode === "XIANGQI_GAME_NOT_FOUND"') && xiangqiSurface.includes('gameAck.errorCode === "XIANGQI_GAME_FINISHED"') && xiangqiSurface.includes('finishClaimedBoardGame("xiangqi", gameId)'));
check('Shared coordinator cleans superseded local runtime without fabricating result', coordinator.includes('previous.kind !== request.kind') && coordinator.includes('finishChessSurfaceGame(previous.gameId)') && coordinator.includes('finishXiangqiSurfaceGame(previous.gameId)'));

// D) Shared cross-game state is only a lock/reservation, not a shared session.
check('Home keeps shared pending lock', home.includes('blockByPending("chess")') && home.includes('blockByPending("xiangqi")'));
check('Chess lobby successor does not retain other-game lock', !lobby.includes('otherBoardGameActive'));
check('No client runtime references legacy busyOtherGame symbol', ![chessRealtime, lobbyHook, bridge, home, lobby, chessRoute, xiangqiRoute].some((text) => text.includes('busyOtherGame')));

for (const rel of [
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/context/ChessRealtimeContext.tsx',
  'src/hooks/chess/useChessLobby.ts',
  'src/components/system/BoardGameSessionBridge.tsx',
  'src/app/(home)/(games)/home-games.tsx',
  'src/app/(chess)/chess-lobby.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/services/xiangqi/xiangqiSessionBootstrap.ts',
  'src/components/xiangqi/XiangqiSurfaceHost.tsx',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
]) check(`syntax ${rel}`, syntax(rel));

check('package registers P2.25 gate', pkg.scripts?.['phaseP2_25:check'] === 'node ./scripts/test-phase-p2_25-server-owned-session-focus-panresponder.js');
check('CLEAN APPLY executes P2.25 gate', cleanApply.includes('test-phase-p2_25-server-owned-session-focus-panresponder.js'));
check('Android Debug executes P2.25 gate', debugBat.includes('phaseP2_25:check'));
check('Android Release executes P2.25 gate', releaseBat.includes('phaseP2_25:check'));
check('PRE COPY identifies P2.25 or later successor', preCopy.includes('Performance Architecture P2.25') || preCopy.includes('Performance Architecture P2.26') || preCopy.includes('Performance Architecture P2.27'));
check('APK share identifies P2.25 or later successor', buildShare.includes('Family Bloom P2.25') || buildShare.includes('Family Bloom P2.26') || buildShare.includes('Family Bloom P2.27'));

console.log(`\nP2.25 result: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
