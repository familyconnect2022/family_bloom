const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2,'0')} - ${name}`); } else { fail++; console.error(`FAIL ${String(pass + fail).padStart(2,'0')} - ${name}`); } }

const host = read('src/components/chess/ChessSurfaceHost.tsx');
const store = read('src/services/chess/chessSurfaceStore.ts');
const route = read('src/app/(chess)/chess-game/[gameId].tsx');
const rootLayout = read('src/app/_layout.tsx');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const lobby = read('src/hooks/chess/useChessLobby.ts');
const globalUi = read('src/components/chess/ChessGlobalUiHost.tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const challenge = read('src/components/chess/ChessChallengeOverlay.tsx');
const pkg = JSON.parse(read('package.json'));
const preBat = fs.readFileSync(path.join(root, 'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBat = fs.readFileSync(path.join(root, 'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const preText = preBat.toString('ascii');
const postText = postBat.toString('ascii');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const crlfOnly = (buffer) => { for (let i = 0; i < buffer.length; i++) if (buffer[i] === 10 && (i === 0 || buffer[i - 1] !== 13)) return false; return true; };

check('Root mounts exactly one persistent ChessSurfaceHost outside route content', rootLayout.includes('<ChessSurfaceHost />') && (rootLayout.match(/<ChessSurfaceHost/g)||[]).length === 1);
check('Chess route is controller-only and owns no ChessBoard', route.includes('ChessGameRouteController') && !route.includes('<ChessBoard') && !route.includes('useChessGame('));
check('Surface store exposes hidden full mini modes', /"hidden" \| "full" \| "mini"/.test(store));
check('Warm surface is never cleared on hide', store.includes('Do not clear `prepared`') && /mode: "hidden"/.test(store));
check('App boot does not directly prewarm Chess', !rootLayout.includes('prepareChessSurface('));
check('Outgoing challenge pays first warmup cost', lobby.includes('prepareChessSurface("outgoing_challenge")') && /const challenge[\s\S]{0,240}prepareChessSurface\("outgoing_challenge"\)/.test(lobby));
check('Invite accept pays first warmup cost before ACK', /onAccept[\s\S]{0,260}prepareChessSurface\("accept_invite"\)[\s\S]{0,220}realtime\.acceptInvite/.test(globalUi));
check('Active game claims persistent surface only for a new game', globalUi.includes('surface.gameId !== gameId') && globalUi.includes('activateChessSurface(gameId, "full")'));
check('Move packets cannot pop mini surface back to full', globalUi.includes('Move/state updates') && globalUi.includes('never change activeGameId') && !realtime.includes('activateChessSurface(') && !realtime.includes('showChessSurfaceFull('));
check('Bloom Bot challenge also warms surface', /requestTestBotChallenge[\s\S]{0,260}prepareChessSurface\("outgoing_challenge"\)/.test(lobby));
check('Root host uses SharedValues for full/mini motion', host.includes('const fullProgress = useSharedValue(0)') && host.includes('const miniProgress = useSharedValue(0)'));
check('Full surface motion is UI-thread timing', host.includes('fullProgress.value = withTiming') && host.includes('miniProgress.value = withTiming'));
check('Persistent host renders one ChessBoard', (host.match(/<ChessBoard/g)||[]).length === 1);
check('Persistent board is not keyed by gameId', !host.includes('<ChessBoard\n              key=') && !host.includes('key={state.gameId}'));
check('Board uses fixed starting 32-slot native pool', board.includes('const CHESS_START_FEN') && board.includes('buildPieceDescriptors(CHESS_START_FEN)') && board.includes('fixed 32-slot native piece pool'));
check('Chess pieces use React Native Image', piece.includes('import { Image, StyleSheet } from "react-native"') && !piece.includes('from "expo-image"'));
check('Chess pieces use PNG static requires', piece.includes('pieces-png-default/wp.png') && piece.includes('pieces-png-default/bk.png'));
check('All twelve PNG chess piece assets exist', ['wp','wn','wb','wr','wq','wk','bp','bn','bb','br','bq','bk'].every(k => exists(`assets/images/chess/pieces-png-default/${k}.png`)));
check('Game Hub launcher uses PNG knight', homeGames.includes('pieces-png-default/bn.png'));
check('Game Hub runtime is focus-owned', homeGames.includes('useFocusEffect') && homeGames.includes('if (!screenFocused) return undefined'));
check('Chess route consumes narrow realtime action channel only', !route.includes('useChessRealtime('));
check('Host consumes narrow realtime actions instead of broad presence context', host.includes('useChessRealtimeActions') && !host.includes('useChessRealtime()'));
check('Ready overlay lives inside boardFrame', host.indexOf('<View style={styles.boardFrame}>') < host.indexOf('{showPreparing ? (') && host.includes('Sẵn sàng • Trắng đi trước'));
check('Promotion overlay lives inside board frame and uses PNG pieces', host.includes('promotion && actualGame') && host.includes('PROMOTION_IMAGES') && host.includes('pieces-png-default/wq.png'));
check('Chess host uses no React Native Modal', !/\bModal\b/.test(host));
check('Mini surface exposes last move piece and clock', host.includes('MINI_PIECE_IMAGES[pieceKey]') && host.includes('styles.miniClock'));
check('Mini surface dims while waiting', host.includes('state.turn === myColor ? 1 : 0.5'));
check('Minimize reveals the already-mounted app without route navigation', host.includes('minimizeChessSurface()') && !host.includes('router.navigate') && !host.includes('router.replace'));
check('Mini click restores full persistent surface', host.includes('showChessSurfaceFull(surface.gameId)'));
check('Hidden/mini board cannot receive input', host.includes('interactionBlocked={!boardInteractive}') && host.includes('pointerEvents={fullVisible ? "auto" : "none"}'));
check('Unseen mini moves disable heavy board motion FX', host.includes('motionFxEnabled={actualGame && surface.mode === "full"}'));
check('Reconnect indicator stays board-local', host.includes('game.connectionPhase === "reconnecting"') && host.includes('Đang kết nối lại… bàn cờ được giữ nguyên'));
check('Away-timeout result copy survives persistent host', host.includes('HẾT THỜI GIAN RỜI BÀN') && host.includes('acknowledgeAwayResult'));
check('Rematch still obeys family play window', host.includes('getHomeGamePlayWindow()') && host.includes('Mình hẹn nhau chơi tiếp từ 6:00 sáng nhé.'));
check('Result keeps pooled UI-thread victory confetti', host.includes('<ChessVictoryConfetti active={didWin}'));
check('Finished game briefly wakes hidden board to reset pooled pieces to start', host.includes('resettingWarmBoard') && host.includes('previousSurfaceGameIdRef') && host.includes('surface.preparing || resettingWarmBoard'));
check('Challenge accept copy communicates board preparation', challenge.includes('Đang chuẩn bị bàn cờ…'));
check('Phase 17.9A package gate is registered', pkg.scripts?.['phase17_9a:check'] === 'node ./scripts/test-phase17_9a-persistent-chess-surface.js');
check('Root BATs identify Phase 17.9A or successor', (preText.includes('Phase 17.9A - Persistent Chess Surface') || preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')) && (postText.includes('Phase 17.9A - Persistent Chess Surface') || postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')));
check('Post-copy updater runs Phase 17.9A directly with Node', postText.includes('test-phase17_9a-persistent-chess-surface.js') && !postText.includes('where npm.cmd'));
check('Android Debug and Release builds run Phase 17.9A', debugBat.includes('npm run phase17_9a:check') && releaseBat.includes('npm run phase17_9a:check'));
check('PRE-COPY and overlay cleanup retire stale Phase 17.8E report', preText.includes('PHASE_17_8E_BUILD_REPORT.md') && cleanup.includes('PHASE_17_8E_BUILD_REPORT.md'));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBat) && crlfOnly(postBat) && [...preBat, ...postBat].every((value) => value < 128));

for (const f of [
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/services/chess/chessSurfaceStore.ts',
  'src/context/ChessRealtimeContext.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/components/chess/ChessBoard.tsx',
  'src/components/chess/v2/ChessPiece.tsx',
]) {
  const r = ts.transpileModule(read(f), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: f });
  check(`${f} transpiles without syntax diagnostics`, !(r.diagnostics||[]).some(d => d.category === ts.DiagnosticCategory.Error));
}

console.log(`\nPhase 17.9A Persistent Chess Surface: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
