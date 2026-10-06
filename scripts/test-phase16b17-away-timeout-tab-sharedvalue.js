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
const history = read('src/app/(chess)/chess-history.tsx');
const fx = read('src/components/chess/ChessBattleEffects.tsx');
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

ok('Client reports visible board after join/rejoin', (gameHook.match(/reportBoardPresence\(true\)/g) || []).length >= 2);
ok('Client reports away before focus cleanup', has(gameHook, /return \(\) => \{[\s\S]{0,120}reportBoardPresence\(false\)/));
ok('Background app also counts as leaving the board', has(gameHook, /AppState\.addEventListener[\s\S]{0,300}reportBoardPresence\(false\)/));
ok('Foreground return clears away state and resyncs', has(gameHook, /next === "active"[\s\S]{0,180}reportBoardPresence\(true\)[\s\S]{0,180}resync\(\)/));
ok('Away loss reason is visible in result modal', has(chessScreen, /away_timeout:\s*"Hết thời gian rời bàn"/) && has(chessScreen, /Bạn đã rời bàn quá nửa quỹ thời gian/));
ok('Chess history preserves away-time reason', has(history, /away_timeout:\s*"Hết thời gian rời bàn"/));
ok('Away terminal FX has dedicated copy', has(fx, /current\.finishReason === "timeout" \|\| current\.finishReason === "away_timeout"/) && has(fx, /rời bàn quá/));
ok('Global realtime retains pending away result outside game route', has(realtime, /pendingAwayResultGameId/) && has(realtime, /finishReason === "away_timeout"/));
ok('Lobby automatically returns pending away result to result screen', has(lobbyHook, /pendingAwayResultGameId/) && has(lobbyScreen, /pendingAwayResultGameId \|\| lobby\.activeGameId/));
ok('Away result is acknowledged only when result modal is dismissed or rematched', has(realtime, /acknowledgeAwayResult/) && has(chessScreen, /dismissResult/) && has(chessScreen, /acknowledgeAwayResult\(state\.gameId\)/));

ok('Tabs keep screen transition disabled', has(motion, /tabs:[\s\S]{0,160}animation:\s*"none"/));
ok('Tab bar uses one SharedValue sliding indicator', has(tabs, /useSharedValue\(state\.index \* itemWidth \+ 6\)/) && has(tabs, /styles\.slidingIndicator/));
ok('Tab slider animates on UI thread with timing', has(tabs, /indicatorX\.value = withTiming/) && has(tabs, /useAnimatedStyle/));
ok('Tab slider does not create one animated pill per tab', (tabs.match(/slidingIndicator/g) || []).length <= 3 && !has(tabs, /iconPillSelected/));
ok('Tab press still feeds performance trace', has(tabs, /performanceTestService\.start\("tab_switch", route\.name\)/));

ok('Phase 16B17 package script exists', has(pkg, /"phase16b17:check"\s*:\s*"node \.\/scripts\/test-phase16b17-away-timeout-tab-sharedvalue\.js"/));
ok('Current Chess aggregate includes Phase 16B17', has(currentGate, /test-phase16b17-away-timeout-tab-sharedvalue\.js/));
ok('Copy-over scripts identify Phase 16B17', has(preCopy, /Phase 16B\.17/) && has(postCopy, /Phase 16B\.17/));
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
  'src/app/(chess)/chess-history.tsx',
  'src/components/chess/ChessBattleEffects.tsx',
  'src/app/(tabs)/_layout.tsx',
];
const syntaxErrors = syntaxFiles.flatMap(rel => syntax(rel).map(diag => `${rel}: ${ts.flattenDiagnosticMessageText(diag.messageText, ' ')}`));
ok(`Phase 16B17 changed TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 5).join(' | '));

console.log(`\nPhase 16B17 away-timeout + tab SharedValue gate: ${passed}/${passed + failed} PASS`);
if (failed) process.exit(1);
