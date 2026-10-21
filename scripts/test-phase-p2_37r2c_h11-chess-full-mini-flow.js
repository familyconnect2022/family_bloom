#!/usr/bin/env node
'use strict';
/** H11 behavioral store test + native source contracts (device benchmarks separate). */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const rd = name => fs.readFileSync(path.join(root, name),'utf8');
let ok = 0, bad = 0;
function check(condition, name) { if (condition) { ++ok; console.log('PASS '+name); } else { ++bad; console.error('FAIL '+name); } }
const storeSource = rd('src/services/games/boardGamePresentationStore.ts');
const native = rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const board = rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const bridge = rd('src/services/games/boardGamePresentationBridge.ts');
const controller = rd('src/services/games/nativeChessGameplayController.ts');
const screen = rd('src/app/(internal)/board-game-bot-test.tsx');
const serverManager = rd('server/src/chess/chessGameManager.ts');
const app = JSON.parse(rd('app.json')).expo;
let timers=[];
try {
  const ts = require('typescript');
  const mod = {exports:{}};
  const compiled = ts.transpileModule(storeSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const ctx = { module:mod, exports:mod.exports, console,
    require: name => name === 'react' ? {useSyncExternalStore:()=>{}} : {emitBoardGamePresentationDiagnostic:()=>{}},
    setTimeout: (cb,ms)=>{const t={cb,ms,cancelled:false};timers.push(t);return t;},
    clearTimeout: t=> {t.cancelled=true;},
  };
  vm.runInNewContext(compiled,ctx, {filename:'boardGamePresentationStore.js',timeout:4000});
  const s=mod.exports, pending=s.CHESS_PENDING_PREFIX+'run1';
  check(s.presentPendingChessBoard(pending) === true && s.getBoardGamePresentationSnapshot().mode==='full', 'tap opens Chess Full immediately without Socket ACK');
  check(s.presentPendingChessBoard(s.CHESS_PENDING_PREFIX+'other')===false, 'double invite cannot replace pending preview');
  s.minimizeBoardGamePresentation();
  s.presentConfirmedBoardGame('chess','authoritative-123');
  check(s.getBoardGamePresentationSnapshot().mode==='mini' && s.getBoardGamePresentationSnapshot().activeGameId==='authoritative-123', 'server game id replaces pending id without unminimizing');
  s.presentConfirmedBoardGame('chess','authoritative-123');
  check(s.getBoardGamePresentationSnapshot().mode==='mini', 'authoritative resync never steals Full/Mini choice');
  s.dismissPendingChessBoard(pending);
  check(s.getBoardGamePresentationSnapshot().activeGameId==='authoritative-123','late failure cannot close confirmed game');
  s.presentConfirmedBoardGame('xiangqi','bad-other');
  check(s.getBoardGamePresentationSnapshot().activeKind==='chess', 'different game cannot steal live Chess');
  s.restoreBoardGamePresentation();
  check(s.getBoardGamePresentationSnapshot().mode==='full','tap Mini restores Full with game id retained');
  s.closeBoardGamePresentationForGame('chess','stale-old');
  check(s.getBoardGamePresentationSnapshot().mode==='full','stale terminal packet cannot close current match');
  s.closeBoardGamePresentationForGame('chess','authoritative-123');
  check(s.getBoardGamePresentationSnapshot().mode==='idle','matching server terminal closes presentation');
  check(timers[0].cancelled, 'successful session cancels local orphan watchdog');
  check(s.presentPendingChessBoard(s.CHESS_PENDING_PREFIX+'run2')===true, 'next invitation receives new lifecycle');
  timers.at(-1).cb();
  check(s.getBoardGamePresentationSnapshot().mode==='idle', 'watchdog closes orphan preview, not server game');
} catch(e) { bad++; console.error('FAIL H11 store runtime simulation', e.stack || e); }
const challenge = screen.slice(screen.indexOf('const chessBotChallenges ='),screen.indexOf('const chessBotInvites ='));
check(challenge.indexOf('presentPendingChessBoard(pendingId)') > 0 && challenge.indexOf('presentPendingChessBoard(pendingId)') < challenge.indexOf('await readyChess(familyId)'), 'Bloom Bot tap presents before prewake, connect and server preflight');
check(controller.includes('waitingMessage: "Đang kết nối…"') && controller.includes('fen: new Chess().fen()') && controller.includes('canMove: false, canPremove: false'), 'preview shows real starting pieces but never authorizes moves');
check(controller.includes('readyRequestedForGame') && controller.includes('void markReady()') && controller.includes('assetsReady') && controller.includes('CHESS_EVENTS.gameBoardReady') && controller.includes('CHESS_EVENTS.gameReady') && controller.includes('preparationPhase === "colors"'), 'waiting game sends two-phase native READY only after both boards prepared');
check(board.includes('readyButton.visibility = View.GONE') && board.includes('statusBadge.visibility = View.GONE'), 'no Ready / Your Turn overlay banner');
check(board.includes('SpannableStringBuilder') && board.includes('current.waitingMessage'), 'waiting status is small inline copy on opponent name bar');
check(native.includes('val miniW = dp(96f)') && native.includes('val miniH = dp(52f)'), 'Mini is smaller than H10R2 118x72dp');
check(native.includes('s.status == "active"') && native.includes('0.2f else 1f'), 'Mini dims to 20% visibility outside my turn');
check(!native.includes('addMiniAction(miniCloseButton,') && !native.includes('fullContainer.addView(closeButton,'), 'both native close buttons absent');
check(native.includes('if (mode == "full" && kind == "chess") chessBoard.bind(state)') && native.includes('else chessBoard.parkForMini(state)'), 'Mini skips Full cell render on authoritative updates');
check(board.includes('fun parkForMini(') && board.includes('uiHandler.removeCallbacks(clockTick)') && board.includes('cancelPieceMotion()') && board.includes('fun parkForMini('), 'parked Full has no tick callback / piece animation');
check(native.includes('chessLayer.setBackgroundColor(Color.TRANSPARENT)') && native.includes('fullW - dp(20f)'), 'transparent arena and single 10dp geometry inset');
check(bridge.includes('offChessInviteExpired') && bridge.includes('offChessInviteRejected') && bridge.includes('dismissPendingChessBoard'), 'global bridge dismisses unconfirmed rejected/expired invite');
check(screen.includes('useFocusEffect(useCallback(') && screen.includes('subscribeBoardGamePresentationDiagnostics') && screen.includes('chessSocketService.on("state"'), 'hidden developer screen releases diagnostic and game listeners');
check(serverManager.includes('r.readyUids.has(r.game.whiteUid) && r.readyUids.has(r.game.blackUid)') && serverManager.includes('if (!bothReady) return this.publicState(r)') && serverManager.includes('r.turnStartedMono = r.game.timeControl.kind === "clocked"'), 'server starts the clock only after both players are ready');
check(native.includes('P2.37R2C-H25-native-1') && app.android.versionCode === 143039 && app.version==='1.3.29', 'new native APK identity is unique');
check(['Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat','Family_Bloom_CLEAN_APPLY_FULL.bat','Family_Bloom_BUILD_APK_TO_SHARE.bat','Family_Bloom_EAS_BUILD_TEST.bat','Family_Bloom_EAS_UPDATE_TEST.bat'].every(x=>fs.existsSync(path.join(root,x))), 'FULL COPY includes root BAT entrypoints');
console.log(`H11 source+store behavioral gate ${bad?'FAIL':'PASS'} (${ok}/${ok+bad})`);
process.exit(bad?1:0);
