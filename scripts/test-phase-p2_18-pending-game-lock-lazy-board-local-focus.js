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

console.log('\nP2.18 — pending board-game reservation + lazy shared GameBoardHost + route-local progressive Focus\n');

const reservationServer = read('server/src/games/boardGamePendingReservation.ts');
const chessServer = read('server/src/socket/socketServer.ts');
const xiangqiServer = read('server/src/xiangqi/xiangqiSocket.ts');
const pendingStore = read('src/services/games/pendingBoardGameReservationStore.ts');
const pendingActions = read('src/services/games/pendingBoardGameReservationActions.ts');
const chessContext = read('src/context/ChessRealtimeContext.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const chessLobby = read('src/app/(chess)/chess-lobby.tsx');
const xiangqiRoute = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiBootstrap = read('src/services/xiangqi/xiangqiSessionBootstrap.ts');
const gameHost = read('src/components/system/GameBoardHost.tsx');
const stack = read('src/components/system/BloomSurfaceStack.tsx');
const rail = read('src/services/presentation/bloomSurfaceRailStore.ts');
const focus = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const sceneBuilder = read('src/components/familyGraph/familyGraphSceneBuilder.ts');
const queryEngine = read('src/services/familyGraph/familyGraphQueryEngine.ts');
const bridge = read('src/components/system/BoardGameSessionBridge.tsx');
const pkg = JSON.parse(read('package.json'));

// Server-authoritative pending reservation.
check('server has one shared pending reservation registry', reservationServer.includes('const reservations = new Map<string, BoardGamePendingReservation>()'));
check('reservation is keyed by uid and game kind', reservationServer.includes('uid: string') && reservationServer.includes('gameKind: BoardGameKind'));
check('reservation refuses a second different pending session', reservationServer.includes('if (current)') && reservationServer.includes('return null'));
check('reservation expiry sweeps stale locks', reservationServer.includes('isExpired') && reservationServer.includes('sweepUid'));
check('Chess server uses the shared reservation module', chessServer.includes('reservePendingBoardGame') && chessServer.includes('pendingReservationPublicShape'));
check('Xiangqi server uses the same shared reservation module', xiangqiServer.includes('reservePendingBoardGame') && xiangqiServer.includes('pendingReservationPublicShape'));
check('Chess invite create refuses a target already pending another session', chessServer.includes('if (getPendingBoardGameReservation(toUid)) throw new ChessDomainError("CHESS_ALREADY_IN_GAME")'));
check('Xiangqi invite create refuses a target already pending another session', xiangqiServer.includes('if(getPendingBoardGameReservation(toUid))throw new XiangqiDomainError("XIANGQI_ALREADY_IN_GAME")'));
check('Chess accept validates invite owner reservation before creating game', chessServer.includes('ownerPending.gameKind !== "chess"') && chessServer.includes('ownerPending.inviteId !== invite.inviteId'));
check('Xiangqi accept validates invite owner reservation before creating game', xiangqiServer.includes('ownerPending.gameKind!=="xiangqi"') && xiangqiServer.includes('ownerPending.inviteId!==invite.inviteId'));
check('Chess human accept is blocked while accepter owns another pending session', chessServer.includes('!invite.isTestBot && getPendingBoardGameReservation(uid)'));
check('Xiangqi human accept is blocked while accepter owns another pending session', xiangqiServer.includes('!invite.isTestBot&&getPendingBoardGameReservation(uid)'));
check('Chess presence exposes pending player as busy', chessServer.includes('active || pending') && chessServer.includes('? "busy"'));
check('Xiangqi presence exposes pending player as busy', xiangqiServer.includes('active||pending?"busy"'));
check('Chess cancel releases pending reservation', chessServer.includes('releasePendingBoardGameReservation(uid, { gameKind: "chess"'));
check('Xiangqi cancel releases pending reservation', xiangqiServer.includes('releasePendingBoardGameReservation(uid,{gameKind:"xiangqi"'));
check('Chess session recovery exposes pending reservation', chessServer.includes('const pending = pendingReservationPublicShape(uid)') && chessServer.includes('if (pending) return pending'));
check('Xiangqi session recovery exposes pending reservation', xiangqiServer.includes('const pending=pendingReservationPublicShape(uid);if(pending)return pending'));

// Client connecting/requesting/waiting state closes pre-ACK race.
check('client pending state has connecting/requesting/waiting phases', pendingStore.includes('"connecting" | "requesting" | "waiting_confirmation"'));
check('local reservation can be acquired atomically before server ACK', pendingStore.includes('beginLocalBoardGameReservation'));
check('in-flight local request supports cancel request handshake', pendingStore.includes('requestLocalBoardGameCancellation') && pendingStore.includes('localCancelWaiters'));
check('server ACK promotes local token rather than opening a second lease', pendingStore.includes('promoteLocalBoardGameReservation'));
check('cancel action waits for an in-flight requesting lease', pendingActions.includes('pending.phase === "connecting"') && pendingActions.includes('requestLocalBoardGameCancellation'));
check('Chess human challenge acquires local requesting lease first', chessContext.indexOf('beginLocalBoardGameReservation("chess", familyId, "requesting")') < chessContext.indexOf('CHESS_EVENTS.inviteCreate'));
check('Chess bot challenge also acquires local requesting lease', (chessContext.match(/beginLocalBoardGameReservation\("chess", familyId, "requesting"\)/g) || []).length >= 2);
check('Chess cancels server invite if cancel was requested before ACK', chessContext.includes('isLocalBoardGameCancellationRequested(localToken)') && chessContext.includes('CHESS_EVENTS.inviteCancel'));
check('Game Hub acquires Chess connecting lease before route push', homeGames.indexOf('beginLocalBoardGameReservation("chess"') < homeGames.indexOf('router.push("/chess-lobby"'));
check('Game Hub acquires/resolves Xiangqi session before route push',
  (homeGames.includes('beginLocalBoardGameReservation("xiangqi"')
    && homeGames.indexOf('beginLocalBoardGameReservation("xiangqi"') < homeGames.lastIndexOf('router.push("/xiangqi-preview"'))
  || (homeGames.includes('await resolveOrCreateXiangqiSession(activeFamilyId)')
    && homeGames.indexOf('await resolveOrCreateXiangqiSession(activeFamilyId)') < homeGames.lastIndexOf('router.push("/xiangqi-preview"')));
check('Game Hub blocks cross-game selection while pending', homeGames.includes('blockByPending("chess")') && homeGames.includes('blockByPending("xiangqi")'));
check('Game Hub exposes explicit pending cancel action', homeGames.includes('cancelPendingBoardGameReservation') && homeGames.includes('Đang hủy…'));
check('Chess lobby clears only transient connecting lease once ready', chessLobby.includes('pendingBoardGame.phase !== "connecting"') && chessLobby.includes('lobby.connection !== "ready"'));
check('Chess lobby recovered pending state disables bot and member challenge cards', chessLobby.includes('!pendingBoardGame && !lobby.outgoingInvite') && (chessLobby.match(/!pendingBoardGame/g) || []).length >= 2);
check('Xiangqi bootstrap uses local connect token then requesting phase', xiangqiBootstrap.includes('beginLocalBoardGameReservation("xiangqi"') && xiangqiBootstrap.includes('updateLocalBoardGameReservationPhase(localToken, "requesting")'));
check('Xiangqi bootstrap cancels server invite if local cancel landed pre-ACK', xiangqiBootstrap.includes('isLocalBoardGameCancellationRequested(localToken)') && xiangqiBootstrap.includes('XIANGQI_EVENTS.inviteCancel'));
check('Xiangqi route provides explicit cancel while connecting/requesting', xiangqiRoute.includes('Bloom đang kết nối Cờ tướng') && xiangqiRoute.includes('cancelPendingBoardGameReservation("xiangqi")'));
check('identity/family switch resets pending reservation', bridge.includes('resetPendingBoardGameReservation()'));

// Lazy retained shared board host.
check('one shared GameBoardHost owns both board layers', gameHost.includes('shared-game-board-host') && gameHost.includes('shared-game-board-chess-layer') && gameHost.includes('shared-game-board-xiangqi-layer'));
check('Chess layer starts unmounted', gameHost.includes('useState(false)') && gameHost.includes('chessEverMounted'));
check('Xiangqi layer starts unmounted', gameHost.includes('xiangqiEverMounted') && gameHost.includes('setXiangqiEverMounted(true)'));
check('board mount happens only after actual active session kind exists', gameHost.includes('if (session?.kind === "chess") setChessEverMounted(true)') && gameHost.includes('if (session?.kind === "xiangqi") setXiangqiEverMounted(true)'));
check('retained boards switch by raised/parked z-order instead of remount', gameHost.includes('styles.raisedLayer') && gameHost.includes('styles.parkedLayer') && gameHost.includes('zIndex: 2') && gameHost.includes('zIndex: 1'));
check('inactive board cannot receive pointer input', gameHost.includes('pointerEvents={chessVisible ? "auto" : "none"}') && gameHost.includes('pointerEvents={xiangqiVisible ? "auto" : "none"}'));
check('inactive board is hidden from accessibility', gameHost.includes('no-hide-descendants'));
check('root stack mounts only the cheap shared GameBoardHost at startup', stack.includes('<GameBoardHost />') && !stack.includes('<ChessSurfaceHost') && !stack.includes('<XiangqiSurfaceHost'));
check('old background prewarm flag is intentionally ignored', stack.includes('backgroundWarmReady: _backgroundWarmReady'));
check('rail is now game-only, not Focus-owned', rail.includes('export type BloomRailSurface = ActiveBoardGameKind | null') && !rail.includes('"focus"'));

// Focus remains route-local and progressively materialized/cancellable.
check('root Focus host file has been removed', !exists('src/components/familyGraph/FamilyGraphFocusSurfaceHost.tsx'));
check('root Focus store file has been removed', !exists('src/services/presentation/familyGraphFocusSurfaceStore.ts'));
check('Focus presentation is rendered route-locally in FamilyGraphPrototype', focus.includes('<PersistentFocusOverlayPresentation') && focus.includes('surfaceMode === "standard" && focusOverlay') && focus.includes('visible={focusOverlayVisible}'));
check('Focus initial retained nodes use bootstrap set, not entire branch', focus.includes('const initialRetainedPersonIds = scene ? scene.bootstrapPersonIds : []'));
check('retained node set grows without replacing prior explored nodes', focus.includes('mergeRetainedFamilyGraphPersonIds(current, new Set(personIds))') && focus.includes('retainedPersonIdsRef.current = next'));
check('viewport materialization uses focus-specific overscan', focus.includes('overscanScreens: surfaceMode === "focusOverlay"'));
check('Focus Back cancels unfinished build before hiding', focus.includes('focusVisualRequestRef.current += 1') && focus.includes('cancelFocusScheduledWork()'));
check('stale Focus generation cannot commit', focus.includes('focusVisualRequestRef.current !== requestId') && focus.includes('token.cancelled'));
check('query traversal yields inside descendant loops', queryEngine.includes('getFocusBranchSubgraphInterruptible') && (queryEngine.match(/await checkpoint\(\)/g) || []).length >= 8);
check('Focus sort itself is cooperative rather than one unbounded Array.sort', queryEngine.includes('const cooperativeSort = async <T>') && queryEngine.includes('await cooperativeSort(personsUnsorted'));
check('projection routing/materialization yields inside child loops', sceneBuilder.includes('buildFamilyGraphFocusProjectionSceneInterruptible') && (sceneBuilder.match(/await checkpoint\(\)/g) || []).length >= 15);
check('Focus projection avoids a second O(n) visual fingerprint', sceneBuilder.includes('baseScene.visualRevision}:focus:${model.modelKey}'));

// Lobby UX from supplied screenshot: whole cards are natural press targets.
check('Bloom Bot whole card is pressable', chessLobby.includes('style={[styles.botCard') && chessLobby.includes('onPress={botReady ? () => void summonTestBot() : undefined}'));
check('Bloom Bot action chip is decorative/non-intercepting', chessLobby.includes('<View pointerEvents="none" style={[styles.challenge, !botReady && styles.disabled]}>'));
check('whole member card is pressable', chessLobby.includes('onPress={cardReady ? () => void sendChallenge(member.uid) : undefined}'));
check('member action chip is decorative/non-intercepting', (chessLobby.match(/pointerEvents="none" style=\{\[styles.challenge/g) || []).length >= 2);

for (const rel of [
  'server/src/games/boardGamePendingReservation.ts',
  'server/src/socket/socketServer.ts',
  'server/src/xiangqi/xiangqiSocket.ts',
  'src/services/games/pendingBoardGameReservationStore.ts',
  'src/services/games/pendingBoardGameReservationActions.ts',
  'src/context/ChessRealtimeContext.tsx',
  'src/components/system/GameBoardHost.tsx',
  'src/components/system/BloomSurfaceStack.tsx',
  'src/app/(chess)/chess-lobby.tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/services/xiangqi/xiangqiSessionBootstrap.ts',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
  'src/components/familyGraph/familyGraphSceneBuilder.ts',
  'src/services/familyGraph/familyGraphQueryEngine.ts',
]) check(`syntax ${rel}`, syntax(rel));

// Execute pure stores to verify cross-kind reservation behavior, not just strings.
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
  const serverReservation = require(path.join(root, 'server/src/games/boardGamePendingReservation.ts'));
  const clientPending = require(path.join(root, 'src/services/games/pendingBoardGameReservationStore.ts'));
  const now = Date.now();
  check('runtime server: first Chess pending reservation succeeds', !!serverReservation.reservePendingBoardGame({ uid: 'u1', gameKind: 'chess', familyId: 'f1', inviteId: 'c1', createdAt: now, expiresAt: now + 45000 }));
  check('runtime server: Xiangqi cannot reserve same uid while Chess pending', serverReservation.reservePendingBoardGame({ uid: 'u1', gameKind: 'xiangqi', familyId: 'f1', inviteId: 'x1', createdAt: now, expiresAt: now + 45000 }) === null);
  check('runtime server: explicit Chess release frees uid', serverReservation.releasePendingBoardGameReservation('u1', { gameKind: 'chess', inviteId: 'c1' }) === true);
  check('runtime server: Xiangqi can reserve after release', !!serverReservation.reservePendingBoardGame({ uid: 'u1', gameKind: 'xiangqi', familyId: 'f1', inviteId: 'x2', createdAt: now, expiresAt: now + 45000 }));

  clientPending.resetPendingBoardGameReservation();
  const token = clientPending.beginLocalBoardGameReservation('chess', 'f1', 'connecting');
  check('runtime client: connecting Chess lease is immediate', typeof token === 'string' && clientPending.getPendingBoardGameReservation()?.phase === 'connecting');
  check('runtime client: second Xiangqi local lease is rejected', clientPending.beginLocalBoardGameReservation('xiangqi', 'f1', 'connecting') === null);
  check('runtime client: same token can advance to requesting', clientPending.updateLocalBoardGameReservationPhase(token, 'requesting') === true && clientPending.getPendingBoardGameReservation()?.phase === 'requesting');
  check('runtime client: server invite promotes token to waiting confirmation', clientPending.promoteLocalBoardGameReservation({ token, inviteId: 'server-c1', familyId: 'f1', expiresAt: now + 45000 }) === true && clientPending.getPendingBoardGameReservation()?.source === 'server');
  clientPending.clearPendingBoardGameReservation({ gameKind: 'chess', inviteId: 'server-c1' });
  check('runtime client: explicit clear returns to idle', clientPending.getPendingBoardGameReservation() === null);
} finally {
  Module._load = originalLoad;
  if (previousTs) require.extensions['.ts'] = previousTs;
  else delete require.extensions['.ts'];
}

check('package registers P2.18 gate', pkg.scripts?.['phaseP2_18:check'] === 'node ./scripts/test-phase-p2_18-pending-game-lock-lazy-board-local-focus.js');

console.log(`\nFamily Bloom P2.18: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
