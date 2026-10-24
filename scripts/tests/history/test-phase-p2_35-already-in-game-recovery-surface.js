const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let passed = 0;
let failed = 0;
function check(condition, message) {
  if (condition) { passed += 1; console.log(`PASS: ${message}`); }
  else { failed += 1; console.error(`FAIL: ${message}`); }
}

console.log('Family Bloom P2.35 — ALREADY_IN_GAME recovery -> authoritative Surface');

const botTest = read('src/app/(internal)/board-game-bot-test.tsx');
const bridge = read('src/services/games/boardGamePresentationBridge.ts');
const store = read('src/services/games/boardGamePresentationStore.ts');
const surface = read('src/components/games/BoardGamePresentationRoot.tsx');
const chessService = read('src/services/chess/chessSocketService.ts');
const xiangqiService = read('src/services/xiangqi/xiangqiSocketService.ts');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');

check(exists('scripts/tests/history/test-phase-p2_35-already-in-game-recovery-surface.js'), 'P2.35 regression gate exists');
check(botTest.includes('type RecoveryResolution = "active" | "pending_same" | "busy_other" | "finished_unseen" | "none"'), 'recovery result distinguishes active/pending/other/terminal/none');
check(botTest.includes('const recoverChessPresentation') && botTest.includes('const recoverXiangqiPresentation'), 'Chess and Xiangqi keep separate recovery functions');
check(/recoverChessPresentation[\s\S]*CHESS_EVENTS\.sessionRecover[\s\S]*CHESS_EVENTS\.gameJoin[\s\S]*syncChessPresentationFromState\(game\.data\)/.test(botTest), 'Chess recovery is sessionRecover -> gameJoin -> authoritative presentation sync');
check(/recoverXiangqiPresentation[\s\S]*XIANGQI_EVENTS\.sessionRecover[\s\S]*XIANGQI_EVENTS\.gameJoin[\s\S]*syncXiangqiPresentationFromState\(game\.data\)/.test(botTest), 'Xiangqi recovery is sessionRecover -> gameJoin -> authoritative presentation sync');
check(botTest.includes('setChessInvite(null)') && botTest.includes('setXiangqiInvite(null)'), 'active recovery clears stale invite UI for the recovered game');
check(botTest.includes('response.data.gameKind === "chess"') && botTest.includes('response.data.gameKind === "xiangqi"'), 'pending recovery stays game-kind specific');
check(botTest.includes('return "pending_same"') && botTest.includes('return "busy_other"'), 'same-game pending is preserved while cross-game busy is blocked');
check(botTest.includes('Bạn đang có một phiên Cờ tướng') && botTest.includes('Bạn đang có một phiên Cờ vua'), 'cross-game lock produces explicit warm client copy');

check(/const chessBotChallenges[\s\S]*recoverChessPresentation\(familyId, "preflight"\)[\s\S]*CHESS_EVENTS\.testBotChallenge/.test(botTest), 'Chess outgoing bot challenge preflights authoritative recovery before create');
check(/const xiangqiBotChallenges[\s\S]*recoverXiangqiPresentation\(familyId, "preflight"\)[\s\S]*XIANGQI_EVENTS\.testBotChallenge/.test(botTest), 'Xiangqi outgoing bot challenge preflights authoritative recovery before create');
check(/CHESS_ALREADY_IN_GAME[\s\S]{0,400}recoverChessPresentation\(familyId, "already-in-game"\)/.test(botTest), 'CHESS_ALREADY_IN_GAME is converted into recovery instead of a terminal throw');
check(/XIANGQI_ALREADY_IN_GAME[\s\S]{0,400}recoverXiangqiPresentation\(familyId, "already-in-game"\)/.test(botTest), 'XIANGQI_ALREADY_IN_GAME is converted into recovery instead of a terminal throw');
check((botTest.match(/recoverChessPresentation\(familyId, "already-in-game"\)/g) || []).length >= 2, 'both Chess bot-create directions recover on ALREADY_IN_GAME');
check((botTest.match(/recoverXiangqiPresentation\(familyId, "already-in-game"\)/g) || []).length >= 2, 'both Xiangqi bot-create directions recover on ALREADY_IN_GAME');

check(botTest.includes('const BOT_ACCEPT_RECONCILE_MS = 1_650'), 'outgoing Bloom Bot has bounded post-accept reconciliation delay');
check(/CHESS_EVENTS\.testBotChallenge[\s\S]*await wait\(BOT_ACCEPT_RECONCILE_MS\)[\s\S]*recoverChessPresentation\(familyId, "post-bot-accept"\)/.test(botTest), 'Chess first-click path reconciles after bot auto-accept even if realtime state event is missed');
check(/XIANGQI_EVENTS\.testBotChallenge[\s\S]*await wait\(BOT_ACCEPT_RECONCILE_MS\)[\s\S]*recoverXiangqiPresentation\(familyId, "post-bot-accept"\)/.test(botTest), 'Xiangqi first-click path reconciles after bot auto-accept even if realtime state event is missed');
check(botTest.includes('chessSocketService.isConnected()') && botTest.includes('xiangqiSocketService.isConnected()'), 'screen-entry recovery is lightweight and only reuses already-connected transports');
check(botTest.includes('recoverChessPresentation(activeFamilyId, "screen-enter")') && botTest.includes('recoverXiangqiPresentation(activeFamilyId, "screen-enter")'), 'screen-entry can reconcile an already-connected stale client/session mismatch');

check(bridge.includes('chessSocketService.on("state"') && bridge.includes('xiangqiSocketService.on("state"'), 'P2.34 realtime state bridge remains the fast path');
check(bridge.includes('presentConfirmedBoardGame("chess", state.gameId)') && bridge.includes('presentConfirmedBoardGame("xiangqi", state.gameId)'), 'authoritative state still binds the correct game Surface');
check(/presentConfirmedBoardGame[\s\S]*activeGameId: gameId[\s\S]*mode: "full"/.test(store), 'recovered authoritative game still enters FULL atomically');
check(surface.includes('useEffect(() => attachBoardGamePresentationBridge(), [])'), 'root bridge remains attached for persistent Surface lifetime');
check(surface.includes('styles.chessLayer') && surface.includes('styles.xiangqiLayer'), 'stacked persistent Chess/Xiangqi views remain present');
check(surface.includes('width: "90%"') && surface.includes('height: "90%"'), 'each game layer remains 90% of Full Surface');
check(surface.includes('const CHESS_DEEP_PINK = "#D94F87"') && surface.includes('const XIANGQI_DEEP_GOLD = "#D3A11F"'), 'agreed deep pink/deep gold view colors remain intact');

check(chessService.includes('class ChessSocketService') && xiangqiService.includes('class XiangqiSocketService'), 'Chess and Xiangqi transports remain independent classes');
check(!botTest.includes('sharedBoardGameRecovery') && !botTest.includes('GameBoardHost'), 'P2.35 does not reintroduce a shared gameplay/session host');
check(pkg.scripts?.['phaseP2_35:check']?.includes('test-phase-p2_35-already-in-game-recovery-surface.js'), 'P2.35 regression command is registered');
check(cleanApply.includes('phaseP2_35:check'), 'CLEAN APPLY runs P2.35 recovery gate');
check(exists('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat') && exists('scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat') && exists('eas.json'), 'EAS build/update helpers remain in FULL package');
check(read('scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat').includes('set /p "UPDATE_MESSAGE=Nhap message cho ban OTA: "'), 'OTA helper still prompts for update message');

let ts = null;
try { ts = require('typescript'); }
catch {
  try { ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript'); } catch {}
}
if (ts) {
  for (const file of [
    'src/app/(internal)/board-game-bot-test.tsx',
    'src/services/games/boardGamePresentationBridge.ts',
    'src/services/games/boardGamePresentationStore.ts',
    'src/components/games/BoardGamePresentationRoot.tsx',
  ]) {
    const result = ts.transpileModule(read(file), {
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      },
      reportDiagnostics: true,
      fileName: file,
    });
    const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
    check(errors.length === 0, `TypeScript syntax transpiles: ${file}`);
  }
} else {
  console.log('INFO: typescript package unavailable; syntax transpile checks skipped.');
}

console.log(`\nP2.35 ALREADY_IN_GAME Recovery Surface: ${passed}/${passed + failed} PASS`);
process.exit(failed ? 1 : 0);
