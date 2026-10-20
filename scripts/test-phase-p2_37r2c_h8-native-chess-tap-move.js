#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
let pass = 0, fail = 0;
const read = (r) => fs.readFileSync(path.join(root, r), 'utf8');
const json = (r) => JSON.parse(read(r));
const check = (ok, msg) => { if (ok) { pass++; console.log(`PASS ${msg}`); } else { fail++; console.error(`FAIL ${msg}`); } };

console.log('\nFamily Bloom P2.37R2C-H9B — native Chess authoritative tap-to-move\n');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const board = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const state = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt');
const index = read('modules/family-bloom-overlay/index.ts');
const controller = read('src/services/games/nativeChessGameplayController.ts');
const bridge = read('src/services/games/boardGamePresentationBridge.ts');
const rootController = read('src/components/games/BoardGamePresentationRoot.android.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const mod = json('modules/family-bloom-overlay/package.json');
const app = json('app.json');
const drawableDir = path.join(root, 'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi');
const pieceFiles = ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'].map((x) => `${x}.png`);

check(mod.version === '1.3.18' && native.includes('P2.37R2C-H23-native-1'), 'native module identity is current H9B / 1.3.14');
check(app.expo.version === '1.3.28' && app.expo.android.versionCode === 143038, 'app identity stays 1.3.28 / 143038');
check(pieceFiles.every((f) => fs.existsSync(path.join(drawableDir, f))), 'all 12 Chess PNG pieces are bundled in native module');
// Event additions are additive: H22 registers a separate Xiangqi event without changing Chess.
// Check the actual Chess contract rather than a hard-coded complete Events(...) string.
const declaredNativeEvents = native.match(/\bEvents\s*\(([^)]*)\)/)?.[1] ?? '';
const chessEventsPresent = ['onDiagnostic', 'onAction', 'onChessAction'].every((event) =>
  declaredNativeEvents.includes(`"${event}"`)
);
check(chessEventsPresent && native.includes('AsyncFunction("setChessBoardState")') && native.includes('sendEvent("onChessAction", payload)'), 'native module exposes Chess state + input event bridge');
check(native.includes('ChessNativeBoardView') && native.includes('applyChessBoardState'), 'decor rail hosts persistent native Chess renderer');
check(board.includes('parseFen') && board.includes('R.drawable.wk') && board.includes('R.drawable.bp'), 'native renderer parses FEN and uses PNG pieces');
check(board.includes('square == current.selectedSquare') && board.includes('square == current.lastFrom || square == current.lastTo') && board.includes('square == current.checkSquare'), 'selection / last move / check highlights restored');
check(board.includes('captureTargets.contains') && board.includes('legalTargets.contains'), 'quiet and capture legal hints rendered');
check(board.includes('cell.setOnClickListener') && board.includes('onSquareTap(square)') && board.includes('onReady()'), 'native board emits tap-to-move + ready intents');
check(index.includes('setChessBoardState(payloadJson') && index.includes('onChessAction'), 'TypeScript native-module surface exposes H8 Chess contract');
check(controller.includes('new Chess(state.fen)') && controller.includes('moves({ square') && controller.includes('CHESS_EVENTS.gameMove'), 'JS chess.js derives legal targets and submits server move intent');
check(controller.includes('expectedVersion: state.revision') && controller.includes('movePending = true') && controller.includes('optimisticFen = null') && controller.includes('isLegalServerDelta(currentState, delta)') && controller.includes('pendingClientMoveId'), 'move command is revision-guarded with immediate speculative FEN + authoritative reconciliation');
check(controller.includes('CHESS_EVENTS.gameReady') && controller.includes('syncNativeChessAuthoritativeState(response.data)'), 'Ready flow is server-authoritative');
check(bridge.includes('syncNativeChessAuthoritativeState(state)') && bridge.includes('syncNativeChessAuthoritativeMove(delta)'), 'presentation bridge forwards authoritative Chess state/deltas to renderer');
check(rootController.includes('subscribeBoardGameNativeChessActions') && rootController.includes('handleNativeChessAction'), 'root controller receives native Chess input without rendering game in Yoga');
check(rootController.includes('return null;') && !rootController.includes('<FamilyBloomOverlayHost'), 'React/Yoga remains free of game overlay view');
check(tabs.includes('navigatorRoot: { flex: 1, backgroundColor: COLORS.background, overflow: "hidden" }'), 'tab flex baseline is clipped against first-login overflow');
// H22 moved Xiangqi from a probe-only layer to its own authoritative native board.
// Chess and Xiangqi must retain separate renderers/controllers and event contracts.
const xiangqiController = read('src/services/games/nativeXiangqiGameplayController.ts');
const xiangqiBoard = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
check(native.includes('configureXiangqiLayer()') && native.includes('xiangqiLayer.addView(xiangqiBoard') &&
  native.includes('sendEvent("onXiangqiAction", payload)') && xiangqiBoard.includes('class XiangqiNativeBoardView') &&
  xiangqiController.includes('xiangqiSocketService') && !controller.includes('xiangqiSocketService') &&
  !xiangqiController.includes('chessSocketService'),
  'Chess and Xiangqi native controllers/renderers remain isolated in H22');

console.log(`\nP2.37R2C-H8 native Chess gate: ${fail ? 'FAIL' : 'PASS'} (${pass}/${pass+fail})\n`);
process.exit(fail ? 1 : 0);
