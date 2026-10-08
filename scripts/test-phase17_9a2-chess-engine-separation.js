const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
let pass=0, fail=0;
function check(name, ok){ if(ok){pass++;console.log(`PASS ${String(pass+fail).padStart(2,'0')} - ${name}`)}else{fail++;console.error(`FAIL ${String(pass+fail).padStart(2,'0')} - ${name}`)} }

const hook = read('src/hooks/chess/useChessGame.ts');
const lobby = read('src/hooks/chess/useChessLobby.ts');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const globalUi = read('src/components/chess/ChessGlobalUiHost.tsx');
const host = read('src/components/chess/ChessSurfaceHost.tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const store = read('src/services/chess/chessGameStore.ts');
const uiEvents = read('src/services/chess/chessUiEventStore.ts');
const tabs = read('src/app/(tabs)/_layout.tsx');
const rootLayout = read('src/app/_layout.tsx');
const pkg = JSON.parse(read('package.json'));
const crypto = require('crypto');
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
const preBat = fs.readFileSync(path.join(root,'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBat = fs.readFileSync(path.join(root,'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const preText = preBat.toString('ascii');
const postText = postBat.toString('ascii');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const aggregate = read('scripts/test-chess-current-build-gates.js');
const crlfOnly = buffer => { for(let i=0;i<buffer.length;i++) if(buffer[i]===10 && (i===0 || buffer[i-1]!==13)) return false; return true; };

check('Chess UI binding does not import socket transport', !hook.includes('chessSocketService'));
check('Chess UI binding does not own AppState lifecycle', !/^import .*AppState/m.test(hook));
check('Chess UI binding sends intents through narrow realtime actions', hook.includes('useChessRealtimeActions') && hook.includes('actions.moveGame') && hook.includes('actions.resyncGame'));
check('Realtime Provider is the socket transport owner', realtime.includes('chessSocketService.on("state"') && realtime.includes('chessSocketService.on("move"') && realtime.includes('AppState.addEventListener'));
check('Realtime Provider owns authoritative game commands', realtime.includes('moveGame') && realtime.includes('resyncGame') && realtime.includes('resignGame') && realtime.includes('rematchGame'));
check('Realtime Provider publishes state/move into external ChessGameStore', realtime.includes('publishChessGameSnapshot') && realtime.includes('publishChessMoveDelta'));
check('Realtime Provider no longer renders challenge presentation', !realtime.includes('ChessChallengeOverlay'));
check('Realtime Provider no longer depends on BloomToast', !realtime.includes('useBloomToast') && !realtime.includes('showToast'));
check('Realtime Provider no longer controls Chess surface presentation', !realtime.includes('prepareChessSurface') && !realtime.includes('activateChessSurface') && !realtime.includes('showChessSurfaceFull'));
check('Global Chess UI host owns challenge presentation', globalUi.includes('ChessChallengeOverlay') && globalUi.includes('useChessRealtime'));
check('Global Chess UI host owns Chess toast presentation', globalUi.includes('subscribeChessUiEvents') && globalUi.includes('useBloomToast'));
check('Global Chess UI host activates only newly-owned active games', globalUi.includes('realtime.activeGameId') && globalUi.includes('surface.gameId !== gameId') && globalUi.includes('activateChessSurface(gameId, "full")'));
check('Chess engine communicates UI side effects through one-way event bridge', realtime.includes('publishChessUiEvent') && uiEvents.includes('subscribeChessUiEvents'));
check('Lobby UI prewarms board before outgoing challenge', lobby.includes('prepareChessSurface("outgoing_challenge")'));
check('Root mounts global Chess UI and persistent surface as siblings', rootLayout.includes('<ChessGlobalUiHost />') && rootLayout.includes('<ChessSurfaceHost />'));
check('ChessSurfaceHost does not import socket transport', !host.includes('chessSocketService'));
check('ChessSurfaceHost minimize does not navigate routes', !host.includes('router.navigate') && !host.includes('router.replace'));
check('ChessSurfaceHost sends commands through action channel/hook', host.includes('useChessGame(') && host.includes('useChessRealtimeActions'));
check('Mini only exists for an active/paused real game', host.includes('surface.mode === "mini"') && host.includes('state.status === "active" || state.status === "paused"'));
check('Mini hidden state scales fully to zero', host.includes('transform: [{ scale: Math.max(0.001, progress.value) }]') && host.includes('miniProgress.value = withTiming(showMini ? 1 : 0'));
check('Mini attention is 0.5 off-turn and 1 on-turn', host.includes('state.turn === myColor ? 1 : 0.5'));
check('Mini content is compact piece + clock without opponent name', host.includes('MINI_PIECE_IMAGES[pieceKey]') && host.includes('styles.miniClock') && !/function MiniChessCard[\s\S]{0,2500}opponentName/.test(host));
check('Mini card height is compact', /miniCard: \{ width: 94, height: 42/.test(host) && /miniClock: \{ color: "#FFF", fontSize: 10\.5/.test(host));
check('Sleeping full board does not walk/sync all 32 controllers', board.includes('hiding/minimizing the board must be O(1)') && /if \(!runtimeActive\) \{[\s\S]{0,500}return;/.test(board));
check('Full board visual props freeze while mini', host.includes('frozenBoardStateRef') && host.includes('frozenMoveDeltasRef') && host.includes('frozenSnapshotEpochRef'));
check('External game store remains the authoritative UI cache', store.includes('publishChessGameSnapshot') && store.includes('publishChessMoveDelta'));
check('Bottom tab is icon-only', !tabs.includes('<Text') && tabs.includes('Ionicons'));
const phase17_9a6 = pkg.scripts?.['phase17_9a6:check'];
check('Bottom tab icons are centered', phase17_9a6 ? tabs.includes('top: (58 - TAB_ICON_SIZE) / 2') && tabs.includes('includeFontPadding: false') : /tabBar:[\s\S]{0,300}alignItems: "center"/.test(tabs) && /tabItem:[\s\S]{0,150}justifyContent: "center"/.test(tabs));
const bottomPillSizeOk = (tabs.includes('TAB_INDICATOR_WIDTH = 54') && tabs.includes('TAB_INDICATOR_HEIGHT = 44')) || (tabs.includes('TAB_INDICATOR_WIDTH = 52') && tabs.includes('TAB_INDICATOR_HEIGHT = 40')) || (tabs.includes('TAB_INDICATOR_WIDTH = 50') && tabs.includes('TAB_INDICATOR_HEIGHT = 36'));
check('Bottom tab pill is lower-profile and fully rounded', bottomPillSizeOk && tabs.includes('borderRadius: 999'));
check('Bottom tab pill uses soft pink shadow', (tabs.includes('backgroundColor: "#D96F98"') && tabs.includes('shadowColor: "#F2A8BF"')) || (tabs.includes('backgroundColor: "#E58AA9"') && tabs.includes('shadowColor: "#F5B8CB"')) || (tabs.includes('backgroundColor: "#ECA0B9"') && tabs.includes('slidingIndicatorGlow')));
check('Bottom tab motion stays UI-thread optimistic', tabs.includes('onPressIn={onPressIn}') && tabs.includes('indicatorIndex.value = withTiming'));
check('Phase 17.9A2 package gate is registered', pkg.scripts?.['phase17_9a2:check'] === 'node ./scripts/test-phase17_9a2-chess-engine-separation.js');
check('Root BATs identify Phase 17.9A2 or successor', (preText.includes('Phase 17.9A2 - Chess Engine Separation') && postText.includes('Phase 17.9A2 - Chess Engine Separation')) || (preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') && postText.includes('Phase 17.9A3 - Chess Overlay UI Repair')) || (preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') && postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar')) || (preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar') && postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')) || (preText.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar') && postText.includes('Phase 17.9A6 - Fixed Screen Geometry Single Icon Tabbar')));
check('Post-copy updater runs Phase 17.9A2 directly with Node', postText.includes('test-phase17_9a2-chess-engine-separation.js'));
check('Android Debug and Release builds run Phase 17.9A2', debugBat.includes('npm run phase17_9a2:check') && releaseBat.includes('npm run phase17_9a2:check'));
check('Overlay cleanup retires stale Phase 17.9A1 report', cleanup.includes('PHASE_17_9A1_BUILD_REPORT.md'));
check('Current Chess aggregate includes Phase 17.9A2', aggregate.includes('test-phase17_9a2-chess-engine-separation.js'));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBat) && crlfOnly(postBat) && [...preBat,...postBat].every(v=>v<128));
const protectedHashes = {
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for(const [file,hash] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${file}`, sha(file)===hash);

for(const f of [
  'src/context/ChessRealtimeContext.tsx','src/hooks/chess/useChessGame.ts','src/hooks/chess/useChessLobby.ts',
  'src/components/chess/ChessGlobalUiHost.tsx','src/components/chess/ChessSurfaceHost.tsx','src/components/chess/ChessBoard.tsx',
  'src/services/chess/chessUiEventStore.ts','src/app/(tabs)/_layout.tsx','src/app/_layout.tsx'
]){
 const r=ts.transpileModule(read(f),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext},reportDiagnostics:true,fileName:f});
 check(`${f} transpiles`, !(r.diagnostics||[]).some(d=>d.category===ts.DiagnosticCategory.Error));
}
console.log(`\nPhase 17.9A2 Chess Engine Separation: ${pass}/${pass+fail} PASS`);
if(fail) process.exit(1);
