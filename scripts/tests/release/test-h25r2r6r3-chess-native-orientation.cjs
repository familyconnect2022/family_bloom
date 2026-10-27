#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
/* H25R2R6R3: explicit prevention of retained native board orientation drift.
 * Works on Windows without Kotlin, and the separate .kt test is runnable with
 * kotlinc for executable proof of the 64-square mapping. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.join(__legacyScriptsDir,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
const board=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const policy=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt');
const controller=read('src/services/games/nativeChessGameplayController.ts');
const server=read('server/src/chess/chessGameManager.ts');
const rail=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
let total=0;
const test=(name,fn)=>{fn();console.log(`[H25R2R6R3 PASS ${++total}] ${name}`)};
test('Mini retains authoritative state without touching physical square layout',()=>{
 const mini=board.slice(board.indexOf('fun parkForMini('),board.indexOf('private fun handleAudio('));
 assert(mini.includes('state = next'));
 assert(!mini.includes('layoutSquares()'));
 assert(!mini.includes('laidOutSquares ='));
});
test('Native tracks 64-square physical layout identity independently of latest JSON',()=>{
 assert(board.includes('laidOutSquares: ChessSquareLayoutIdentity?'));
 assert(board.includes('chessSquareLayoutIsStale(laidOutSquares, next.gameId, facing, boardSize)'));
 assert(board.includes('laidOutSquares = ChessSquareLayoutIdentity(current?.gameId ?: "", facing, boardSize)'));
});
test('Full rebind heals Mini/IDLE stale geometry, even with equal JSON orientation',()=>{
 const bind=board.slice(board.indexOf('fun bind(next:'),board.indexOf('override fun onVisibilityAggregated('));
 assert(bind.includes('chessSquareLayoutIsStale('));
 assert(!bind.includes('if (boardSize > 0 && previous?.orientation != next.orientation)'));
 assert(bind.includes('paintedCells.clear()'));
 assert(bind.includes('layoutSquares()'));
});
test('cold geometry recovery also heals physical orientation drift',()=>{
 const recovery=board.slice(board.indexOf('fun ensureRecoveredGeometry()'),board.indexOf('private fun render()'));
 assert(recovery.includes('chessSquareLayoutIsStale('));
 assert(recovery.includes('layoutChildren(width, height)'));
});
test('64 cell coordinates are mapped from the authenticated bottom-player side',()=>{
 assert(board.includes('chessFacingForPlayer(current?.orientation ?: "w", current?.meColor)'));
 assert(board.includes('chessSquareAtScreenCell(facing, row, col)'));
 assert(policy.includes('val file = if (black)'));
 assert(policy.includes('val rank = if (black)'));
});
test('turn/FEN do not flip board; UID-bound meColor drives orientation and clocks',()=>{
 assert(controller.includes('orientation: mine ?? "w"'));
 assert(controller.includes('meColor: mine'));
 assert(controller.includes('state.whiteUid === uid ? "w" : state.blackUid === uid ? "b"'));
 assert(board.includes('current.meColor == "b"'));
 assert(!/orientation: state.turn/.test(controller));
});
test('server remains authoritative for frozen colors and two-stage readiness',()=>{
 assert(server.includes('whiteUid: r.game.status === "waiting"'));
 assert(server.includes('blackUid: r.game.status === "waiting"'));
 assert(server.includes('r.boardReadyUids.has(r.game.whiteUid)'));
 assert(server.includes('r.readyUids.has(r.game.whiteUid)'));
});
test('new APK identity distinguishes Kotlin fix from previous installed native binary',()=>{
 const app=JSON.parse(read('app.json')).expo;
 assert.equal(app.version,'1.3.33');assert.equal(app.android.versionCode,143043);
 assert(rail.includes('P2.37R2C-H25-native-3'));
 const eas=read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
 assert(eas.includes('143043'));assert(eas.includes('P2.37R2C-H25-native-3'));
});
console.log(`H25R2R6R3 CHESS NATIVE ORIENTATION: ${total}/${total} PASS`);
