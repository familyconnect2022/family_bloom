const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log(`PASS ${String(pass + fail).padStart(2,'0')} - ${name}`); } else { fail++; console.error(`FAIL ${String(pass + fail).padStart(2,'0')} - ${name}`); } }

const host = read('src/components/chess/ChessSurfaceHost.tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const socket = read('src/services/chess/chessSocketService.ts');
const store = read('src/services/chess/chessGameStore.ts');
const hook = read('src/hooks/chess/useChessGame.ts');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const pkg = JSON.parse(read('package.json'));
const oldGate = read('scripts/test-phase17_9a-persistent-chess-surface.js');
const allScripts = fs.readdirSync(path.join(root, 'scripts')).filter((name) => name.endsWith('.js') && name !== 'test-phase17_9a1-chess-stabilization.js').map((name) => read(`scripts/${name}`)).join('\n');

const crypto = require('crypto');
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
const preBat = fs.readFileSync(path.join(root, 'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBat = fs.readFileSync(path.join(root, 'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const preText = preBat.toString('ascii');
const postText = postBat.toString('ascii');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const currentAggregate = read('scripts/test-chess-current-build-gates.js');
const crlfOnly = (buffer) => { for (let i = 0; i < buffer.length; i++) if (buffer[i] === 10 && (i === 0 || buffer[i - 1] !== 13)) return false; return true; };

check('Board accepts explicit geometry from its real viewport owner', (board.includes('maxBoardSize?: number') && (board.includes('Math.min(width - 28, 430, maxBoardSize') || board.includes('Math.min(width - 12, 430, maxBoardSize'))) || (board.includes('boardSize: number') && board.includes('normalizedBoardSize')));
check('Chess host owns deterministic board viewport geometry', (host.includes('handleBoardFrameLayout') && host.includes('Math.min(width, height)')) || (host.includes('widthBudget') && host.includes('heightBudget') && host.includes('useWindowDimensions')) || (host.includes('CHESS_SCREEN_GUTTER = 5') && host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') && host.includes('gameStackTop')));
check('Persistent board receives deterministic viewport geometry before render', (host.includes('boardViewportSize > 0 ? (') && host.includes('maxBoardSize={boardViewportSize}')) || (host.includes('boardSize={boardViewportSize}') && !host.includes('setBoardViewportSize')));
check('Board host no longer clips oversized canvas', /boardFrame:[^\n]+overflow: "visible"/.test(host));
check('Persistent board no longer has an internal fullProgress scale transform', !host.includes('boardHiddenStyle') && !host.includes('Math.max(0.001, fullProgress.value)'));
check('Full surface keeps UI-thread chrome motion', host.includes('fullProgress.value = withTiming') && (host.includes('0.86 + fullProgress.value * 0.14') || host.includes('(1 - fullProgress.value) * 4')));
check('Mini mode sleeps full ChessBoard runtime', host.includes('runtimeActive={actualGame ? fullVisible') && !host.includes('surface.mode === "full" || surface.mode === "mini"'));
check('Mini mode freezes full-board state props', host.includes('frozenBoardStateRef') && host.includes('frozenMoveDeltasRef') && host.includes('frozenSnapshotEpochRef'));
check('Mini card remains live independently of frozen full board', host.includes('<MiniChessCard') && host.includes('state={state}'));
check('Persistent piece slots never cross color during reconcile', board.includes('runtime.pieceKey[0] !== target.pieceKey[0]') && !board.includes('(sameColor ? 0 : 80)'));
check('Reconcile does not fade every live piece on every snapshot', board.includes('if (!runtime.alive) controller?.fadeTo(1') && !board.includes('\n        controller?.fadeTo(1, motionFxEnabled'));
check('Normal move path still uses targeted applyRuntimeMove', board.includes('applyRuntimeMove(singleMove)') && board.includes('applyRuntimeMove(delta.move)'));
check('External ChessGameStore is the one visual packet cache', store.includes('publishChessMoveDelta') && store.includes('publishChessGameSnapshot') && store.includes('moveDeltas'));
check('Realtime provider ingests raw move packets into ChessGameStore', realtime.includes('publishChessMoveDelta(delta, current)'));
check('Game hook no longer subscribes to socket state packets', !hook.includes('chessSocketService.on("state"'));
check('Game hook no longer subscribes to socket move packets', !hook.includes('chessSocketService.on("move"'));
check('Game hook documents single state/move owner', hook.includes('ChessRealtimeProvider owns transport') || hook.includes('State/move packets have ONE owner'));
check('Game hook owns no direct socket listeners after engine separation', !hook.includes('chessSocketService.on(') && !hook.includes('CHESS_EVENTS'));
check('ACK/resync mutations publish into shared ChessGameStore', realtime.includes('handleState(response.data)') && hook.includes('actions.resyncGame'));
check('Socket connect is single-flight', socket.includes('private connectPromise: Promise<Socket> | null') && socket.includes('if (this.connectPromise) return this.connectPromise'));
check('Connect timeout removes its temporary connect listener', socket.includes('socket.off("connect", onConnect)'));
check('emitAck converts transport connect failures to recoverable ACK', socket.includes('CHESS_SERVER_RECOVERING') && /catch \(error\)[\s\S]{0,700}return \{ ok: false, errorCode/.test(socket));
check('emitAck no longer rethrows connect timeout', !/emitAck[\s\S]{0,1800}catch \(error\)[\s\S]{0,300}throw error/.test(socket));
check('Legacy Phase 17.9A gate resolves TypeScript portably', oldGate.includes("const ts = require('typescript');") && !oldGate.includes('/opt/nvm/'));
check('Release scripts contain no hard-coded /opt/nvm TypeScript path', !allScripts.includes('/opt/nvm/versions/node'));
check('Phase 17.9A1 package gate is registered', pkg.scripts?.['phase17_9a1:check'] === 'node ./scripts/test-phase17_9a1-chess-stabilization.js');
check('Root BATs identify Phase 17.9A1 or successor', (preText.includes('Phase 17.9A1 - Chess Stabilization') || preText.includes('Phase 17.9A2 - Chess Engine Separation') || preText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || preText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || preText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')) && (postText.includes('Phase 17.9A1 - Chess Stabilization') || postText.includes('Phase 17.9A2 - Chess Engine Separation') || postText.includes('Phase 17.9A3 - Chess Overlay UI Repair') || postText.includes('Phase 17.9A4 - Chess UI Rematch Hint Tabbar') || postText.includes('Phase 17.9A5 - Chess Surface Layer Geometry Tabbar')));
check('Post-copy updater runs Phase 17.9A1 directly with Node', postText.includes('test-phase17_9a1-chess-stabilization.js'));
check('Android Debug and Release builds run Phase 17.9A1', debugBat.includes('npm run phase17_9a1:check') && releaseBat.includes('npm run phase17_9a1:check'));
check('Overlay cleanup retires stale Phase 17.9A report', cleanup.includes('PHASE_17_9A_BUILD_REPORT.md'));
check('Current Chess aggregate includes Phase 17.9A1', currentAggregate.includes('test-phase17_9a1-chess-stabilization.js'));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBat) && crlfOnly(postBat) && [...preBat, ...postBat].every((value) => value < 128));
const protectedHashes = {
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for (const [file, hash] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${file}`, sha(file) === hash);

for (const f of [
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/chess/ChessBoard.tsx',
  'src/services/chess/chessSocketService.ts',
  'src/services/chess/chessGameStore.ts',
  'src/context/ChessRealtimeContext.tsx',
  'src/hooks/chess/useChessGame.ts',
]) {
  const r = ts.transpileModule(read(f), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, reportDiagnostics: true, fileName: f });
  check(`${f} transpiles without syntax diagnostics`, !(r.diagnostics||[]).some(d => d.category === ts.DiagnosticCategory.Error));
}

console.log(`\nPhase 17.9A1 Chess Stabilization: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
