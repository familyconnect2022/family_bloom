#!/usr/bin/env node
'use strict';
/** H13: source + executable state/controller behavior. Kotlin must still be built on Android. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const rd = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0, fail = 0;
const check = (yes, desc) => { if (yes) { pass++; console.log('PASS', desc); } else { fail++; console.error('FAIL', desc); } };
const board = rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const client = rd('src/services/games/nativeChessGameplayController.ts');
const bridge = rd('src/services/games/boardGamePresentationBridge.ts');
const storeSource = rd('src/services/games/boardGamePresentationStore.ts');
const bat = rd('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');
check(board.includes('"#D8FFF3F9"') && !board.includes('"#B82A1633"'), 'waiting/result backdrop has luminous veil, no legacy charcoal');
check(board.includes('bloomPrimary.visibility = View.GONE') && board.includes('bloomPrimary.isClickable = false') && board.includes('bloomStatus.visibility = View.VISIBLE'), 'preparation uses non-interactive status, never fake CTA');
check(board.includes('updateWaitingStatus(current)') && board.includes('current.waitingMessage'), 'preparation status reflects server/connection progress');
check(board.includes('styleBloomDialog(') && ['"victory"','"draw"','"loss"','"waiting"'].every(s => board.includes(s)), 'win/draw/loss/waiting have differentiated themes');
check(board.includes('NHÀ VÔ ĐỊCH BLOOM!') && board.includes('MỖI VÁN LÀ MỘT BƯỚC TIẾN') && board.includes('MỘT TRẬN CẦU CÂN TÀI'), 'result copy is personalized and warm');
check(board.includes('launchBloomFireworks()') && board.includes('bloomPanel.animate().scaleX(1f)'), 'victory keeps one-shot fireworks and entrance animation');
check(board.includes('configureAction(drawButton') && board.includes('configureAction(resignButton') && board.includes('setOnClickListener { askConfirmation(action) }'), 'draw/resign are tactile distinct buttons with confirmation');
check(board.includes('LayoutParams(0, dp(42f), 1f)') && board.includes('GradientDrawable.Orientation.TL_BR'), 'action buttons have expanded touch areas and gradient');
check(client.indexOf('markChessResultDismissed(finishedGameId)') < client.indexOf('closeFinishedChessBoard(finishedGameId)') && client.indexOf('closeFinishedChessBoard(finishedGameId)') < client.indexOf('void chessSocketService.emitAck<{ acknowledged: boolean }>('), 'result closes UI locally before background ACK');
check(storeSource.includes('DISMISSED_RESULT_TTL_MS') && storeSource.includes('dismissedChessResults.size > 40'), 'dismissed-result guard is bounded and expires');
check(bridge.includes('wasChessResultDismissed(state.gameId)') && bridge.includes('wasChessResultDismissed(delta.gameId)'), 'late full state AND delta cannot resurrect dismissed Chess result');
check(client.includes('if (currentState?.gameId !== gameId || currentState.status !== "finished") return;'), 'old game cleanup does not touch a new session');
check(bat.includes('test-phase-p2_37r2c_h13-bloom-results-return.js'), 'copy-over applies H13 regression gate');
check(JSON.parse(rd('app.json')).expo.android.versionCode === 143040 && rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt').includes('P2.37R2C-H25-native-1'), 'new native binary id matches H13 APK');

const runTs = (source, filename, requireStub) => {
  const mod = {exports:{}};
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022}}).outputText;
  const sandbox = {module:mod,exports:mod.exports, require:requireStub, console,
    setTimeout:()=>({}), clearTimeout:()=>{}, Date, Math, Map, Set, Promise};
  vm.runInNewContext(js, sandbox, {filename, timeout:3000});
  return mod.exports;
};
let store;
try {
  store=runTs(storeSource,'store.ts', name => name === 'react'
    ? {useSyncExternalStore:()=>{}}
    : {emitBoardGamePresentationDiagnostic:()=>{}});
  store.presentConfirmedBoardGame('chess','finished-1');
  store.markChessResultDismissed('finished-1');
  store.closeBoardGamePresentationForGame('chess','finished-1');
  check(store.getBoardGamePresentationSnapshot().mode === 'idle' && store.wasChessResultDismissed('finished-1'), 'old finished game is hidden immediately and tombstoned');
  store.presentConfirmedBoardGame('chess','fresh-2');
  store.closeBoardGamePresentationForGame('chess','finished-1');
  check(store.getBoardGamePresentationSnapshot().activeGameId === 'fresh-2', 'late previous-game cleanup cannot close newly opened match');
  let bound=0, presented=0, terminalResets=0;
  const bridgeMod=runTs(bridge,'bridge.ts', name => {
    if (name === './boardGamePresentationStore') return {...store, presentConfirmedBoardGame:(...args)=>{presented++;store.presentConfirmedBoardGame(...args)}};
    if (name === './nativeChessGameplayController') return {
      syncNativeChessAuthoritativeState:()=>{bound++}, syncNativeChessAuthoritativeMove:()=>{bound++;return true},clearNativeChessSession:()=>{terminalResets++}};
    // H22 adds an independent Xiangqi controller. Keep H13's Chess-only test isolated.
    if (name === './nativeXiangqiGameplayController') return {
      syncNativeXiangqiAuthoritativeState:()=>{}, syncNativeXiangqiAuthoritativeMove:()=>{},
      clearNativeXiangqiSession:()=>{}, setNativeXiangqiTransportConnected:()=>{}};
    if (name === './boardGamePresentationDiagnostics') return {emitBoardGamePresentationDiagnostic:()=>{}};
    if (name === '../../../modules/family-bloom-overlay') return {setFamilyBloomOverlayXiangqiMiniState:async()=>({accepted:true})};
    if (name.endsWith('chessSocketService') || name.endsWith('xiangqiSocketService')) return {};
    throw Error('Unknown bridge require '+name);
  });
  bridgeMod.syncChessPresentationFromState({gameId:'finished-1',status:'finished',revision:4});
  bridgeMod.syncChessPresentationFromMove({gameId:'finished-1',status:'finished',version:5});
  check(bound===0 && presented===0 && terminalResets===0, 'real bridge discards late state and move for dismissed game');
  bridgeMod.syncChessPresentationFromState({gameId:'fresh-2',status:'active',revision:1});
  check(bound===1 && presented===1 && store.getBoardGamePresentationSnapshot().activeGameId === 'fresh-2', 'current Chess session remains presentable after old result ACK');
} catch (err) { fail++; console.error('FAIL H13 executable bridge/store test',err.stack||err); }

// Native action host must be able to close Full before Socket resolves.
(async()=>{
try {
  const never = new Promise(()=>{});
  let ackCalls=0;
  const mockSocket = {emitAck:()=>{ackCalls++;return never;}};
  const actor=runTs(client,'nativeChessGameplayController.ts', name => {
    if (name === 'react-native') return {AppState:{currentState:'active',addEventListener:()=>({remove(){}})}};
    if (name === 'chess.js') return {Chess: class {fen(){return 'start'}}};
    if (name === '@react-native-firebase/auth') return {getAuth:()=>({currentUser:{uid:'me'}})};
    if (name === '../../types/chess') return {CHESS_EVENTS:{gameResultAck:'chess:game:resultAck'},CHESS_ERROR_COPY:{}};
    if (name === '../chess/chessSocketService') return {chessSocketService:mockSocket};
    if (name === './boardGamePresentationDiagnostics') return {emitBoardGamePresentationDiagnostic:()=>{}};
    if (name === './boardGamePresentationStore') return store;
    if (name === './boardGameNativeOverlay') return {setBoardGameNativeChessState:async()=>({accepted:true})};
    throw Error('Unknown controller require '+name);
  });
  store.closeBoardGamePresentationForGame('chess','fresh-2');
  store.presentConfirmedBoardGame('chess','terminal-3');
  actor.syncNativeChessAuthoritativeState({gameId:'terminal-3',familyId:'fam',status:'finished',revision:5,
    whiteUid:'me',blackUid:'bot',fen:'start',result:'white',turn:'b',ply:9,serverNowMs:0});
  const pending=actor.handleNativeChessAction({gameId:'terminal-3',action:'resultAck'});
  check(store.getBoardGamePresentationSnapshot().mode === 'idle' && store.wasChessResultDismissed('terminal-3') && ackCalls===1,
    'controller closes terminal UI before unresolved Socket ACK');
  await pending;
  check(true,'result action handler resolves without waiting for Socket ACK');
} catch(err) {fail++;console.error('FAIL H13 real controller async test',err.stack||err);}
console.log(`H13 Bloom UI + immediate-return gate: ${fail?'FAIL':'PASS'} (${pass}/${pass+fail})`);
process.exit(fail?1:0);
})();
