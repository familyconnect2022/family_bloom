const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, p))).digest('hex');
let pass = 0, fail = 0;
function check(name, ok) {
  if (ok) { pass += 1; console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${name}`); }
  else { fail += 1; console.error(`FAIL ${String(pass + fail).padStart(2, '0')} - ${name}`); }
}
function transpile(rel) {
  const out = ts.transpileModule(read(rel), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
    fileName: rel,
  });
  return (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
}

const host = read('src/components/chess/ChessSurfaceHost.tsx');
const policy = read('src/services/chess/chessRematchUiPolicy.ts');
const server = read('server/src/socket/socketServer.ts');
const store = read('src/services/chess/chessSurfaceStore.ts');
const rootLayout = read('src/app/_layout.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const aggregate = read('scripts/test-chess-current-build-gates.js');
const cleanup = read('scripts/setup/cleanup-overlay-routes.js');
const pkg = JSON.parse(read('package.json'));
const preBuf = fs.readFileSync(path.join(root, 'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'));
const postBuf = fs.readFileSync(path.join(root, 'Family_Bloom_CLEAN_APPLY_FULL.bat'));
const pre = preBuf.toString('ascii');
const post = postBuf.toString('ascii');
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');
const crlfOnly = (b) => { for (let i = 0; i < b.length; i++) if (b[i] === 10 && (i === 0 || b[i - 1] !== 13)) return false; return true; };

// Runtime-test the race policy. The server can emit state before the ACK arrives.
const compiled = ts.transpileModule(policy, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const sandbox = { exports: {}, module: { exports: {} }, require, console };
sandbox.exports = sandbox.module.exports;
vm.runInNewContext(compiled, sandbox, { filename: 'chessRematchUiPolicy.js' });
const { shouldReleaseRematchPreparing } = sandbox.module.exports;

check('Same finished source game does not release rematch shield', !shouldReleaseRematchPreparing({ sourceGameId: 'old', targetGameId: null, surfaceGameId: 'old', stateGameId: 'old', status: 'finished' }));
check('Same active source game does not masquerade as a new rematch', !shouldReleaseRematchPreparing({ sourceGameId: 'old', targetGameId: null, surfaceGameId: 'old', stateGameId: 'old', status: 'active' }));
check('Socket-state-first race releases even before targetGameId ACK is known', shouldReleaseRematchPreparing({ sourceGameId: 'old', targetGameId: null, surfaceGameId: 'new', stateGameId: 'new', status: 'active' }));
check('ACK-target path releases when authoritative target owns surface', shouldReleaseRematchPreparing({ sourceGameId: 'old', targetGameId: 'new', surfaceGameId: 'new', stateGameId: 'new', status: 'active' }));
check('Surface/store mismatch cannot release rematch shield', !shouldReleaseRematchPreparing({ sourceGameId: 'old', targetGameId: 'new', surfaceGameId: 'new', stateGameId: 'other', status: 'active' }));

check('Rematch records the source game before issuing the command', host.includes('rematchSourceGameIdRef.current = sourceGameId') && host.indexOf('rematchSourceGameIdRef.current = sourceGameId') < host.indexOf('const response = await game.rematch()'));
check('Human waiting ACK immediately releases blocking spinner', /if \(response\.data\.waiting\)[\s\S]{0,220}setRematchPreparing\(false\)[\s\S]{0,160}setResultDismissed\(false\)/.test(host));
check('Waiting rematch gives non-blocking family feedback', host.includes('Đã gửi lời chơi lại. Bloom sẽ mở bàn cờ khi người thân đồng ý.'));
check('Authoritative new-game ownership releases rematch independently of entry animation', host.includes('shouldReleaseRematchPreparing({') && host.includes('if (serverOwnsNewGame)') && /\}, \[rematchPreparing, state\.gameId, state\.status, surface\.gameId\]\);/.test(host));
check('Rematch release effect no longer waits for entryPhase playing', !/serverOwnsNewGame[\s\S]{0,450}entryPhase/.test(host));
check('Bot rematch server still returns new gameId plus authoritative state', /old\.testBotUid[\s\S]{0,900}return \{ waiting: false, gameId: next\.gameId, state: toClientGameState\(next\) \}/.test(server));
check('Human rematch server still uses a two-vote waiting ACK', /if \(votes\.size < 2\) return \{ waiting: true \}/.test(server));

check('Chess battle FX component is physically retired', !exists('src/components/chess/ChessBattleEffects.tsx'));
check('Persistent host has no battle FX import/runtime/style nodes', !/ChessBattleEffects|deriveChessBattleEvent|boardFxClip|boardFxLayer|battleEvent/.test(host));
check('Copy-over PRE clean deletes stale ChessBattleEffects from older builds', pre.includes('src\\components\\chess\\ChessBattleEffects.tsx'));
check('Overlay cleanup also deletes stale ChessBattleEffects', cleanup.includes("'src/components/chess/ChessBattleEffects.tsx'"));
check('Normal piece movement remains enabled while battle FX is gone', host.includes('motionFxEnabled={actualGame && surface.mode === "full"}'));
check('Victory result celebration remains separate from retired battle FX', host.includes('<ChessVictoryConfetti active={didWin} />'));

check('A6 width-owned board geometry is preserved', host.includes('const CHESS_SCREEN_GUTTER = 5') && host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') && host.includes('Math.floor(raw / 8) * 8') && host.includes('boardSize={boardViewportSize}'));
check('A6 physical-window origin correction is preserved', host.includes('measureInWindow((x, y) =>') && host.includes('left: -screenOrigin.x') && host.includes('top: -screenOrigin.y'));
check('A7 presentation-ready ownership gate is preserved', store.includes('presentationReady: false') && rootLayout.includes('setChessSurfacePresentationReady(bootstrapReady)') && host.includes('const fullVisible = presentationReady && surface.mode === "full"'));
check('Ready Promotion Result remain in explicit centered screen layer', host.includes('styles.chessModalLayer, { width: windowWidth, height: windowHeight }') && /chessModalLayer:[\s\S]{0,240}alignItems: "center"[\s\S]{0,120}justifyContent: "center"/.test(host));
const buttonSection = tabs.slice(tabs.indexOf('function BloomTabButton'), tabs.indexOf('function BloomSlidingTabBar'));
check('Bottom tab still has exactly one icon node per item', (buttonSection.match(/<Ionicons/g) || []).length === 1);
check('Active tab icon remains white on white tab surface contract', buttonSection.includes('color={focused ? COLORS.white : COLORS.tabInactive}') && tabs.includes('backgroundColor: COLORS.tabSurface'));

check('Phase 17.9A8 package script is registered', pkg.scripts?.['phase17_9a8:check'] === 'node ./scripts/test-phase17_9a8-rematch-race-no-battle-fx.js');
check('Current Chess aggregate includes A8 and retires pure FX/A5-A7 gates', aggregate.includes('test-phase17_9a8-rematch-race-no-battle-fx.js') && !aggregate.includes('test-phase14v4k-chess-material-swing-fx.js') && !aggregate.includes('test-phase17_9a5-chess-surface-layer-geometry-tabbar.js') && !aggregate.includes('test-phase17_9a6-fixed-screen-geometry-single-icon-tabbar.js') && !aggregate.includes('test-phase17_9a7-real-device-surface-ownership-fx-clip.js'));
check('Post-copy updater runs A8 current gate', post.includes('test-phase17_9a8-rematch-race-no-battle-fx.js'));
check('Android Debug and Release run A8 gate', debug.includes('phase17_9a8:check') && release.includes('phase17_9a8:check'));
check('Root BATs identify Phase 17.9A8', pre.includes('Phase 17.9A8 - Rematch Race Fix No Battle FX') && post.includes('Phase 17.9A8 - Rematch Race Fix No Battle FX'));
check('Copy-over cleanup retires stale A7 report', pre.includes('PHASE_17_9A7_BUILD_REPORT.md') && cleanup.includes('PHASE_17_9A7_BUILD_REPORT.md'));
check('Root BATs remain CRLF and ASCII-safe', crlfOnly(preBuf) && crlfOnly(postBuf) && [...preBuf, ...postBuf].every((v) => v < 128));

const protectedHashes = {
  'server/src/socket/socketServer.ts': 'dd60cbc1345d5e3f577b32f1265646ae51f24c3d6ba12ac6a4935da38a1efd07',
  'firestore.rules': 'a872b09e20259f22e04e8564d3f0c0722a895235bac2da71bf663c6c8b81222a',
  'firestore.indexes.json': 'b88b9fab1c5db94017e0d1744abf0d1ca98979ef86bdefa2e6831fc0e49d429f',
  'src/components/xiangqi/XiangqiGameBoard.tsx': 'a7182cc98c97b299d6a40ea83765230b163f0cc6c921f8792d618967f9e61f93',
  'src/app/(xiangqi)/xiangqi-preview.tsx': 'cc1a43c20ef21e3e434f9c9c0c306b08ea09f62bf897f010ee30a413c096c71d',
};
for (const [f, h] of Object.entries(protectedHashes)) check(`Protected baseline unchanged: ${f}`, sha(f) === h);

const syntaxFiles = [
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/components/chess/ChessBoard.tsx',
  'src/services/chess/chessRematchUiPolicy.ts',
  'src/services/chess/chessSurfaceStore.ts',
  'src/context/ChessRealtimeContext.tsx',
  'src/app/_layout.tsx',
  'src/app/(tabs)/_layout.tsx',
];
const syntaxErrors = syntaxFiles.flatMap((f) => transpile(f).map((d) => `${f}: ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`));
check(`A8 changed TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0);

console.log(`\nPhase 17.9A8 Rematch Race Fix + No Battle FX: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
