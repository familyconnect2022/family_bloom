const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, ok, detail = '') => checks.push({ name, ok: !!ok, detail });
const has = (text, needle) => text.includes(needle);
const lacks = (text, needle) => !text.includes(needle);

const main = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const focusHost = read('src/components/familyGraph/FamilyGraphFocusHost.tsx');
const focusView = read('src/components/familyGraph/FamilyGraphFocusView.tsx');
const focusRuntime = read('src/components/familyGraph/familyGraphFocusRuntimeCache.ts');
const focusBsh = read('src/components/familyGraph/familyGraphFocusBshCache.ts');
const graphRoute = read('src/app/(family)/(graph)/family-graph.tsx');
const bloomStack = read('src/components/system/BloomSurfaceStack.tsx');
const chessServer = read('server/src/socket/socketServer.ts');
const xqServer = read('server/src/xiangqi/xiangqiSocket.ts');
const reservation = read('server/src/games/boardGamePendingReservation.ts');
const activeLock = read('server/src/games/boardGameActiveLock.ts');
const chessSurface = read('src/services/chess/chessSurfaceStore.ts');
const xqSurface = read('src/services/xiangqi/xiangqiSurfaceStore.ts');
const chessContext = read('src/context/ChessRealtimeContext.tsx');
const xqContext = read('src/context/XiangqiRealtimeContext.tsx');
const xqSocketClient = read('src/services/xiangqi/xiangqiSocketService.ts');
const chessChallenge = read('src/app/(chess)/chess-challenge/[inviteId].tsx');
const xqChallenge = read('src/app/(xiangqi)/xiangqi-challenge/[inviteId].tsx');
const chessLobby = read('src/app/(chess)/chess-lobby.tsx');
const xqLobby = read('src/app/(xiangqi)/xiangqi-lobby.tsx');
const chessGlobal = read('src/components/chess/ChessGlobalUiHost.tsx');
const xqGlobal = read('src/components/xiangqi/XiangqiGlobalUiHost.tsx');
const chessSurfaceHost = read('src/components/chess/ChessSurfaceHost.tsx');
const xqSurfaceHost = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const preCopyBat = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const cleanApplyBat = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const buildShareBat = read('Family_Bloom_BUILD_APK_AND_SHARE.bat');
const releaseBuildBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Focus Host exists', exists('src/components/familyGraph/FamilyGraphFocusHost.tsx'));
check('Focus View exists', exists('src/components/familyGraph/FamilyGraphFocusView.tsx'));
check('Focus runtime cache exists', exists('src/components/familyGraph/familyGraphFocusRuntimeCache.ts'));
check('Focus BSH cache exists', exists('src/components/familyGraph/familyGraphFocusBshCache.ts'));
check('Main has no Focus runtime import', lacks(main, 'familyGraphFocusRuntimeCache') && lacks(main, 'familyGraphFocusCamera'));
check('Main has no legacy Focus overlay', lacks(main, 'focusOverlay') && lacks(main, 'surfaceMode') && lacks(main, 'onFocusPersonRequest'));
check('Main has no connector Focus mode', lacks(main, 'focusMode') && lacks(main, 'FOCUS_LINE_THICKNESS'));
check('Focus does not import Main component/runtime cache', lacks(focusView, './FamilyGraphPrototype') && lacks(focusHost, './FamilyGraphPrototype') && lacks(focusView, 'familyGraphBshCache'));
check('Focus owns independent camera/cache', has(focusView, 'applyFocusPanDelta') && has(focusView, 'hydrateFamilyGraphFocusRuntimeState') && has(focusRuntime, 'const focusRuntimeCache = new Map'));
check('Focus cards cannot select another person', has(focusView, 'pointerEvents="none"') && lacks(focusView, 'onPressPerson'));
check('Graph route mounts Main and Focus as siblings', has(graphRoute, '<FamilyGraphPrototype') && has(graphRoute, '<FamilyGraphFocusHost') && has(graphRoute, 'onOpenFocus={setFocusOverlayPersonId}'));

const deletedShared = [
  'src/components/system/BoardGameSessionBridge.tsx',
  'src/components/system/GameBoardHost.tsx',
  'src/services/games/activeBoardGameSessionStore.ts',
  'src/services/games/pendingBoardGameReservationStore.ts',
  'src/services/games/pendingBoardGameReservationActions.ts',
  'src/services/presentation/boardGamePresentationCoordinator.ts',
  'src/services/presentation/bloomSurfaceRailStore.ts',
  'src/services/xiangqi/xiangqiSessionBootstrap.ts',
];
for (const p of deletedShared) check(`Legacy shared owner deleted: ${p}`, !exists(p));
check('Root stack mounts no full board/session host', lacks(bloomStack, 'GameBoardHost') && lacks(bloomStack, 'BoardGameSessionBridge') && lacks(bloomStack, 'ChessSurfaceHost') && lacks(bloomStack, 'XiangqiSurfaceHost'));
check('Root stack keeps lightweight minis', has(bloomStack, 'ChessChallengeMiniHost') && has(bloomStack, 'XiangqiChallengeMiniHost') && has(bloomStack, 'ChessMiniHost') && has(bloomStack, 'XiangqiMiniHost'));
check('Xiangqi client transport is independent', lacks(xqSocketClient, 'chessSocketService') && has(xqSocketClient, 'io('));

check('Chess invite TTL is 120 seconds', /INVITE_TTL_MS\s*=\s*120_000/.test(chessServer));
check('Xiangqi invite TTL is 120 seconds', /INVITE_TTL_MS\s*=\s*120_?000/.test(xqServer));
check('Cross-game reservation reserves both participants', has(reservation, 'reservePendingBoardGameParticipants') && has(chessServer, 'uids: [uid, toUid]') && has(xqServer, 'uids:[uid,toUid]'));
check('Reservations release by invite id', has(reservation, 'releasePendingBoardGameInvite') && has(chessServer, 'releasePendingBoardGameInvite') && has(xqServer, 'releasePendingBoardGameInvite'));
check('Late Chess Accept performs expiry cleanup', has(chessServer, 'if (invite) await expireInvite(inviteId)'));
check('Late Xiangqi Accept performs expiry cleanup', has(xqServer, 'if(invite)await expireInvite(inviteId)'));
check('Chess user->bot cycle exists', has(chessServer, 'nextOutgoingTestBotCycleStep') && has(chessServer, 'cycleStep === 3'));
check('Xiangqi user->bot cycle exists', has(xqServer, 'nextOutgoingTestBotCycleStep') && has(xqServer, 'cycleStep===3'));
check('Chess test-bot cancel handles both directions', has(chessServer, 'invite.testBotDirection === "bot_to_user"') && has(chessServer, 'invite.testBotDirection === "user_to_bot"'));

check('Active lock self-heals stale game docs', has(activeLock, 'resolveLiveBoardGameActiveLock') && has(activeLock, 'if (inspected.stale) tx.delete(ref)'));
check('Chess terminal poisons game id', has(chessSurface, 'markChessSurfaceGameTerminal(gameId)'));
check('Xiangqi terminal poisons game id', has(xqSurface, 'markXiangqiSurfaceGameTerminal(gameId)'));
check('Chess terminal ACK is global', has(chessContext, 'CHESS_EVENTS.gameResultAck') && has(chessContext, 'finishChessSurfaceGame(next.gameId)'));
check('Xiangqi terminal ACK is global', has(xqContext, 'XIANGQI_EVENTS.gameResultAck') && has(xqContext, 'finishXiangqiSurfaceGame(state.gameId)'));

check('Chess challenge room yields before cancel ACK', chessChallenge.indexOf('router.replace("/chess-lobby"') < chessChallenge.indexOf('realtime.cancelInvite(id)'));
check('Xiangqi challenge room yields before cancel ACK', xqChallenge.indexOf('router.replace("/(xiangqi)/xiangqi-lobby"') < xqChallenge.indexOf('realtime.cancelInvite(id)'));
check('Chess rejection terminal has one acknowledgement path', has(chessChallenge, '>Đồng ý</Text>') && lacks(chessChallenge, 'Mời lại'));
check('Xiangqi rejection terminal has one acknowledgement path', has(xqChallenge, '>Đồng ý</Text>') && lacks(xqChallenge, 'Mời lại'));
check('Challenge rooms warm board/audio while waiting', has(chessChallenge, 'prepareChessSurface("outgoing_challenge")') && has(chessChallenge, 'criticalAudioReady') && has(xqChallenge, 'prepareXiangqiSurface("outgoing_challenge")') && has(xqChallenge, 'criticalAudioReady'));


check('Focus frame stays at 85 percent', /SCREEN_RATIO\s*=\s*0\.85/.test(focusHost));
check('Focus pan threshold matches Main Tree', has(focusView, '.minDistance(3)') && has(main, '.minDistance(3)'));
check('Both lobbies expose two-direction Bot tests', has(chessLobby, 'Tôi mời Bot') && has(chessLobby, 'Bot mời tôi') && has(xqLobby, 'Tôi mời Bot') && has(xqLobby, 'Bot mời tôi'));
check('Invitee expiry is surfaced in both games', has(chessContext, 'Lời mời đã khép lại') && has(xqGlobal, 'Lời mời đã khép lại'));
check('Chess ready waits for visual + critical audio', has(chessSurfaceHost, '!criticalAudioReady') && has(chessSurfaceHost, 'visualRevision < state.revision') && has(chessSurfaceHost, 'realtimeActions.readyGame(gameId)'));
check('Xiangqi ready waits for board + critical audio', has(xqSurfaceHost, '!boardReady') && has(xqSurfaceHost, '!criticalAudioReady') && has(xqSurfaceHost, 'XIANGQI_EVENTS.gameReady'));
check('PRE-COPY removes retired shared owners', deletedShared.every((p) => has(preCopyBat, p.replaceAll('/', '\\'))));
check('CLEAN APPLY runs P2.28 and app/server typecheck', has(cleanApplyBat, 'phaseP2_28:check') && (cleanApplyBat.match(/npm run typecheck/g) || []).length >= 2);
check('APK share build is labeled P2.28', has(buildShareBat, 'P2.28'));
check('Release APK build gates on P2.28 + typecheck', has(releaseBuildBat, 'phaseP2_28:check') && (releaseBuildBat.match(/npm run typecheck/g) || []).length >= 2);

const pass = checks.filter((x) => x.ok).length;
const fail = checks.filter((x) => !x.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? ` — ${item.detail}` : ''}`);
console.log(`\nP2.28 invariant gate: ${pass} PASS / ${fail.length} FAIL`);
if (fail.length) process.exit(1);
