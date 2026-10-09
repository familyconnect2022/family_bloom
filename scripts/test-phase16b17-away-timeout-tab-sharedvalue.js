const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const has = (text, regex) => regex.test(text);
function ok(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS ${String(passed).padStart(2, '0')} - ${name}`); }
  else { failed += 1; console.error(`FAIL -- ${name}${detail ? `: ${detail}` : ''}`); }
}
function syntax(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
    fileName: path.basename(rel),
  });
  return (out.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
}

const serverTypes = read('server/src/chess/chessTypes.ts');
const manager = read('server/src/chess/chessGameManager.ts');
const socketServer = read('server/src/socket/socketServer.ts');
const clientTypes = read('src/types/chess.ts');
const gameHook = read('src/hooks/chess/useChessGame.ts');
const realtime = read('src/context/ChessRealtimeContext.tsx');
const lobbyHook = read('src/hooks/chess/useChessLobby.ts');
const lobbyScreen = read('src/app/(chess)/chess-lobby.tsx');
const chessScreen = read('src/app/(chess)/chess-game/[gameId].tsx');
const chessSurfaceHost = read('src/components/chess/ChessSurfaceHost.tsx');
const history = read('src/app/(chess)/chess-history.tsx');
const tabs = read('src/app/(tabs)/_layout.tsx');
const motion = read('src/constants/motion.ts');
const pkg = read('package.json');
const currentGate = read('scripts/test-chess-current-build-gates.js');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');

ok('Away timeout is a typed server finish reason', has(serverTypes, /"away_timeout"/));
ok('Away timeout is a typed client finish reason', has(clientTypes, /"away_timeout"/));
ok('Board-presence event exists on both protocol sides', has(socketServer, /gameBoardPresence:\s*"chess:game:boardPresence"/) && has(clientTypes, /gameBoardPresence:\s*"chess:game:boardPresence"/));
ok('Server validates board visibility payload', has(socketServer, /asBoolean\(payload\.visible, "visible"\)/));
ok('Board presence still rechecks game membership', has(socketServer, /gameBoardPresence[\s\S]{0,500}requireGameMembership\(gameId\)/));
ok('Away budget is runtime-owned by server', has(manager, /boardAwayByUid:\s*Map<string, AwayBudget>/));
ok('Unlimited games do not receive a 50 percent away budget', has(manager, /visible \|\| r\.game\.status !== "active" \|\| r\.game\.timeControl\.kind !== "clocked"/));
ok('Away budget snapshots player clock at departure', has(manager, /remainingAtLeaveMs = this\.remainingForUid\(r, uid\)/));
ok('Away deadline is exactly half remaining player time', has(manager, /remainingAtLeaveMs \* 0\.5/));
ok('Repeated away packets cannot extend an existing deadline', has(manager, /const existing = r\.boardAwayByUid\.get\(uid\)/) && has(manager, /if \(existing\)/));
ok('Returning to the board cancels away deadline', has(manager, /if \(visible[\s\S]{0,180}r\.boardAwayByUid\.delete\(uid\)/));
ok('Late return cannot erase an already-expired deadline', has(manager, /setBoardVisible[\s\S]{0,700}expiredTerminal\(r\)[\s\S]{0,500}finishByAwayTimeout/));
ok('Timeout scheduler evaluates normal and away deadlines together', has(manager, /expiredTerminal\(r\)/) && has(manager, /candidates\.sort\(\(a, b\) => a\.deadline - b\.deadline\)/));
ok('Timeout scheduler rechecks after per-game queue', has(manager, /Re-check after entering the per-game queue/) && has(manager, /standardClockExpired = this\.clockExpired\(r\)/));
ok('Away timeout always awards the opposite player', has(manager, /winnerColor = otherColor\(loserColor\)/) && has(manager, /finishReason = "away_timeout"/));
ok('Away timeout is persisted as a terminal game', has(manager, /finishByAwayTimeout[\s\S]{0,700}await this\.persistence\.finish\(r\.game\)/));
ok('Terminal cleanup removes all away budgets', has(manager, /finishRuntime[\s\S]{0,180}boardAwayByUid\.clear\(\)/));
ok('Move command cannot sneak through an already-expired away deadline', has(manager, /const expired = this\.expiredTerminal\(r\)/) && has(manager, /finishByAwayTimeout\(r, expired\.uid\)/));

ok('Client reports visible board through engine-owned presence channel', has(gameHook, /actions\.setBoardPresence\(gameId, !!gameId && boardVisible\)/) && has(realtime, /gameBoardPresence[\s\S]{0,180}visible: true/));
ok('Client reports away when board UI sleeps', has(gameHook, /return \(\) => actions\.setBoardPresence\(gameId, false\)/));
ok('Background app also counts as leaving the board', has(realtime, /AppState\.addEventListener[\s\S]{0,900}gameBoardPresence[\s\S]{0,120}visible: false/));
ok('Foreground return rejoins authoritative game and restores board presence', has(realtime, /sessionRecover|sessionGetActive/) && has(realtime, /CHESS_EVENTS\.gameJoin/) && has(realtime, /gameBoardPresence[\s\S]{0,180}visible: true/));
ok('Away loss reason is visible in persistent result surface', has(chessSurfaceHost, /HẾT THỜI GIAN RỜI BÀN/) && has(chessSurfaceHost, /Bạn đã rời bàn quá thời gian cho phép/));
ok('Chess history preserves away-time reason', has(history, /away_timeout:\s*"Hết thời gian rời bàn"/));
ok('Away terminal copy remains on the persistent result surface after battle FX retirement', has(chessSurfaceHost, /HẾT THỜI GIAN RỜI BÀN/) && has(chessSurfaceHost, /rời bàn quá thời gian cho phép/));
ok('Global realtime retains pending finished result outside game route', has(realtime, /pendingResultGameId/) && has(realtime, /next\.status === "finished"/));
ok('Lobby automatically returns pending result to result screen', has(lobbyHook, /pendingResultGameId/) && has(lobbyScreen, /pendingResultGameId \|\| lobby\.activeGameId/));
ok('Finished result is durably acknowledged when result surface is dismissed or rematched', has(realtime, /acknowledgeResult/) && has(realtime, /gameResultAck/) && has(chessSurfaceHost, /leaveFinished/) && has(chessSurfaceHost, /acknowledgeResult\(finishedGameId\)/));

ok('Tabs keep screen transition disabled', has(motion, /tabs:[\s\S]{0,160}animation:\s*"none"/));
ok('Tab bar uses one SharedValue sliding indicator', (has(tabs, /useSharedValue\(state\.index\)/) || has(tabs, /useSharedValue\(state\.index \* itemWidth \+ 6\)/)) && has(tabs, /styles\.slidingIndicator/));
ok('Tab slider animates on UI thread with timing', (has(tabs, /indicatorIndex\.value = withTiming/) || has(tabs, /indicatorX\.value = withTiming/)) && has(tabs, /useAnimatedStyle/));
ok('Tab slider does not create one animated pill per tab', (tabs.match(/<Animated\.View[^>]+styles\.slidingIndicator/g) || []).length <= 3 && !has(tabs, /iconPillSelected/));
ok('Tab press no longer feeds always-on performance traces', !has(tabs, /performanceTestService\.start\("tab_switch", route\.name\)/));

ok('Phase 16B17 package script exists', has(pkg, /"phase16b17:check"\s*:\s*"node \.\/scripts\/test-phase16b17-away-timeout-tab-sharedvalue\.js"/));
ok('Current Chess aggregate includes Phase 16B17', has(currentGate, /test-phase16b17-away-timeout-tab-sharedvalue\.js/));
ok('Copy-over scripts preserve Phase 16B17 through current package', has(preCopy, /Phase 16B\.(17|18)/) && has(postCopy, /Phase 16B\.(17|18)/));
ok('Post-copy updater uses current aggregate without duplicate direct Phase 16B17 call', has(postCopy, /chess:current-check/) && !has(postCopy, /npm run phase16b17:check/));

const syntaxFiles = [
  'server/src/chess/chessTypes.ts',
  'server/src/chess/chessGameManager.ts',
  'server/src/socket/socketServer.ts',
  'src/types/chess.ts',
  'src/hooks/chess/useChessGame.ts',
  'src/context/ChessRealtimeContext.tsx',
  'src/hooks/chess/useChessLobby.ts',
  'src/app/(chess)/chess-lobby.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/components/chess/ChessSurfaceHost.tsx',
  'src/app/(chess)/chess-history.tsx',
  'src/app/(tabs)/_layout.tsx',
];
const syntaxErrors = syntaxFiles.flatMap(rel => syntax(rel).map(diag => `${rel}: ${ts.flattenDiagnosticMessageText(diag.messageText, ' ')}`));
ok(`Phase 16B17 changed TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 5).join(' | '));

console.log(`\nPhase 16B17 away-timeout + tab SharedValue gate: ${passed}/${passed + failed} PASS`);
if (failed) process.exit(1);
