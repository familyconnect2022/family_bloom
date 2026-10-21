#!/usr/bin/env node
'use strict';
// Source gate runs on Windows without Android SDK / Kotlin compiler.
// The actual Kotlin pure planner is additionally exercised with kotlinc in development.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = r => fs.readFileSync(path.join(root,r),'utf8');
const board = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const planner = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessPieceMotionPlanner.kt');
const bindBlock = board.slice(board.indexOf('  fun bind(next:'), board.indexOf('  override fun onVisibilityAggregated('));
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const state = read('src/services/games/nativeChessGameplayController.ts');
const app = JSON.parse(read('app.json')).expo;
const pkg = JSON.parse(read('modules/family-bloom-overlay/package.json'));
let success=0,failed=0;
function check(v,label){ if(v){success++;console.log('PASS '+label);}else{failed++;console.error('FAIL '+label);} }
check(bindBlock.includes('val motion = if (positionChanged') && bindBlock.indexOf('val motion = if (positionChanged') < bindBlock.indexOf('state = next\n') && bindBlock.indexOf('render()\n    // Schedule') < bindBlock.indexOf('if (motion.isNotEmpty()) startPieceMotion(motion)'), 'motion derived before native FEN overwrite; sprite starts in same frame as render');
check(board.includes('private val motionSprites = Array(2) { ImageView(context) }') && board.includes('board.addView(sprite'), 'two persistent board-level sprites, no allocation per move');
check(board.includes('sprite.bringToFront()') && board.includes('pieces[leg.to]?.visibility = View.INVISIBLE'), 'moving sprite stays above all cells, destination not visible prematurely');
check(board.includes('motionTargets.remove(leg.to)') && board.includes('pieces[leg.to]?.visibility = View.VISIBLE'), 'only reveal target after sprite animation completed');
check(board.includes('motionGeneration') && board.includes('generation != motionGeneration'), 'stale animation callbacks cannot affect a newer move');
check(board.includes('fun parkForMini(') && board.includes('cancelPieceMotion()') && board.includes('override fun onDetachedFromWindow()'), 'Mini/detach cancel native animation safely');
check(board.includes('setInterpolator(PathInterpolator(') && board.includes('setDuration(if (legs.size == 2) 178L else 168L)'), 'eased 168ms / 178ms native travel (rather than old hard 115ms)');
check(board.includes('if (square in motionTargets) pieces[square]?.visibility = View.INVISIBLE'), 'same-FEN hint repaint does not reveal a moving destination');
check(board.includes('paintedCells[square] != paintKey') && board.includes('if (chromePaintKey != paintChrome)'), 'board cells and player chrome update only when changed');
check(planner.includes('next.revision') === false && planner.includes('newRevision != oldRevision + 1') && planner.includes('newPly != oldPly + 1'), 'motion planner accepts only one server ply/revision');
check(planner.includes('lastFrom: String?, lastTo: String?') && planner.includes('val from = lastFrom') && planner.includes('val to = lastTo'), 'no guessed from/to based on ambiguous FEN differences');
check(planner.includes('ChessPieceMotionLeg(rookFrom, rookTo, rook)') && planner.includes("piece.lowercaseChar() == 'k'"), 'castling animates king and rook individually');
check(planner.includes('val promotion =') && planner.includes("piece.lowercaseChar() == 'p'"), 'promotion sprite moves pawn then shows final server piece');
check(state.includes('fen: showOptimistic ? optimisticFen! : state.fen,') && state.includes('isLegalServerDelta(currentState, delta)') && state.includes('pendingBaseRevision === state.revision'), 'H17 preserves authoritative server FEN while allowing guarded client-only optimistic paint');
check(native.includes('if (mode == "full" && kind == "chess") chessBoard.bind(state)') && native.includes('else chessBoard.parkForMini(state)'), 'Mini parks board rather than redrawing 64 cells');
check(app.version === '1.3.29' && app.android.versionCode === 143039 && pkg.version === '1.3.18' && native.includes('P2.37R2C-H25-native-1'), 'H16 APK/native identity is consistent');
console.log(`H16 Chess native smoothness source gate: ${failed?'FAIL':'PASS'} (${success}/${success+failed})`);
process.exit(failed?1:0);
