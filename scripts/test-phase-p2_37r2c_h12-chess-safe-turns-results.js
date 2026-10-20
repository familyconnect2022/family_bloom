#!/usr/bin/env node
'use strict';
/** Source invariants, separate from APK integration and a server turn-replay test. */
const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');let pass=0,fail=0;
function check(cond,message){if(cond){pass++;console.log('PASS',message)}else{fail++;console.error('FAIL',message)}}
const client=read('src/services/games/nativeChessGameplayController.ts');
const bridge=read('src/services/games/boardGamePresentationBridge.ts');
const board=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const native=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const manager=read('server/src/chess/chessGameManager.ts');
const server=read('server/src/socket/socketServer.ts');
const test=read('src/app/(internal)/board-game-bot-test.tsx');
const schema=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt');
const sourceScope=client.slice(client.indexOf('async function pushState('),client.indexOf('export async function showNativeChessConnectingPreview('));
const serverMoves=manager.slice(manager.indexOf('  async move('),manager.indexOf('  async resign('));
const botTimer=server.slice(server.indexOf('  function scheduleTestBotAction('),server.indexOf('  async function isMember('));
check(client.includes('MAX_PREMOVES = 1'), 'single premove avoids speculative multi-turn queuing');
check(sourceScope.includes('fen: showOptimistic ? optimisticFen! : state.fen,') &&
  sourceScope.includes('pendingBaseRevision === state.revision') &&
  client.includes('isLegalServerDelta(currentState, delta)') && !/fen:\s*isPremove/.test(sourceScope),
  'premove never overwrites server FEN; only one guarded local move may be painted optimistically');
check(sourceScope.includes('queuedPremoveSquares: queuedPremoves.flatMap('), 'premove still visibly highlights queued squares');
check(client.includes('delta.version !== currentState.revision + 1') && client.includes('"move-revision-gap"'), 'missing authoritative delta triggers resync');
check(client.includes('playCue(predicted.sound)') && client.includes('cueForMove(result, false)'), 'executed premove plays real capture/check/promote sound');
check(client.includes('promotionTargets:') && client.includes('pendingPromotion = { from, to: square, isPremove }') && client.includes('queuedPremoves.push(move)'), 'preselected pawn promotion retained in premove');
check(botTimer.includes('latest.revision !== state.revision') && botTimer.includes('latest.turn !== latestBotColor'), 'bot only acts on authoritative matching revision/turn');
check(serverMoves.includes('expectedRevision !== r.game.revision') && serverMoves.includes('r.chess.turn() !== color') && serverMoves.includes('this.assertPlayer(r, uid)'), 'server validates every move regardless of bot identity');
check((server.match(/whiteUid: Math\.random\(\) < 0\.5 \? uid : botUid/g)||[]).length===2 && server.includes('whiteUid: invite.whiteUid, blackUid: invite.blackUid'), 'bot incoming and outgoing invitations receive random server-assigned colors');
check(client.includes('event.action === "assetsReady"') &&
  client.includes('await markBoardReady()') && client.includes('CHESS_EVENTS.gameBoardReady') &&
  client.includes('CHESS_EVENTS.gameReady') && client.includes('requestAnimationFrame(() => requestAnimationFrame('),
  'game READY waits for native resources, boardReady, and two-frame orientation lock');
check(board.includes('loadedSoundIds.containsAll(loadedSounds.values)') && board.includes('pieces.size != 64'), 'native gate requires all 11 audio samples + board resources');
check(native.includes('onGameAction = { action, boundGameId ->') && board.includes('onGameAction(action, boundGameId)'), 'resource readiness carries authoritative boardId, not preview rail id');
check(board.includes('launchBloomFireworks()') && board.includes('CHIEN')===false && board.includes('NHÀ VÔ ĐỊCH BLOOM!'), 'victory result retains Bloom fireworks');
check(board.includes('MỖI VÁN LÀ MỘT BƯỚC TIẾN') && board.includes('MỘT TRẬN CẦU CÂN TÀI'), 'loss/draw receive differentiated empathetic result messages');
check(board.includes('onGameAction') && client.includes('CHESS_EVENTS.gameResign') && client.includes('CHESS_EVENTS.drawOffer') && client.includes('CHESS_EVENTS.drawAccept') && client.includes('CHESS_EVENTS.drawReject'), 'resign and draw actions reach authoritative server');
check(bridge.includes('if (state.status === "finished") restoreBoardGamePresentation()') && bridge.includes('CHESS_TERMINAL_RESULT_VISIBLE') && bridge.includes('if (!syncNativeChessAuthoritativeMove(delta)) return;'), 'terminal result remains until acknowledgment and restores Full from Mini');
check(client.includes('CHESS_EVENTS.gameResultAck') && client.includes('closeFinishedChessBoard('), 'result dismissal acknowledges server, then cleans presentation');
check(board.includes('promotionRow') && board.includes('setImageResource(pieceDrawable('), 'Bloom promotion picker uses native chess piece PNGs');
check(board.includes('bloomHeadline.text = "🌸 Đang chuẩn bị"') && board.includes('waiting'), 'board preparation overlay masks initial piece-load flash');
check(test.includes('Bloom Bot mời bạn!') && test.includes('chessReject') && test.includes('CHESS_EVENTS.inviteReject') && test.includes('setChessInviteEnded('), 'Bloom Bot invitation/decline and rejection are handled');
check(!board.includes('boardMat.background = roundedStroke(') && !board.includes('"#F3B949" else'), 'yellow chessboard outline removed');
check(test.includes('P2.37R2C-H23-native-1') && JSON.parse(read('app.json')).expo.android.versionCode===143038, 'new Android native identity for H12 is explicit');
check(read('scripts/test-phase-p2_32-client-game-reset-foundation.js').includes('native presentation functions are allowed'), 'P2.32 verification accepts new native presentation functions without allowing legacy imports');
console.log(`H12 safety/result source gate: ${fail?'FAIL':'PASS'} (${pass}/${pass+fail})`);process.exit(fail?1:0);
