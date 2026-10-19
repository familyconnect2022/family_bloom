const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let passed = 0;
let failed = 0;
function check(condition, message) {
  if (condition) { passed += 1; console.log(`PASS: ${message}`); }
  else { failed += 1; console.error(`FAIL: ${message}`); }
}

console.log('Family Bloom P2.34 — session/presentation bridge + persistent stacked game views');

const store = read('src/services/games/boardGamePresentationStore.ts');
const bridge = read('src/services/games/boardGamePresentationBridge.ts');
const surface = read('src/components/games/BoardGamePresentationRoot.tsx');
const botTest = read('src/app/(internal)/board-game-bot-test.tsx');
const homeGames = read('src/app/(home)/(games)/home-games.tsx');
const pkg = JSON.parse(read('package.json'));
const cleanApply = read('scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat');

check(exists('src/services/games/boardGamePresentationBridge.ts'), 'root-owned board-game session/presentation bridge exists');
check(bridge.includes('chessSocketService.on("state"') && bridge.includes('xiangqiSocketService.on("state"'), 'bridge listens to authoritative Chess and Xiangqi state independently');
check(bridge.includes('chessSocketService.on("move"') && bridge.includes('xiangqiSocketService.on("move"'), 'bridge also observes hot-path move deltas for terminal cleanup');
check(bridge.includes('syncChessPresentationFromState') && bridge.includes('syncXiangqiPresentationFromState'), 'bridge keeps separate Chess/Xiangqi state mappers');
check(bridge.includes('presentConfirmedBoardGame("chess", state.gameId)') && bridge.includes('presentConfirmedBoardGame("xiangqi", state.gameId)'), 'live authoritative states bind the correct gameId and presentation kind');
check(bridge.includes('closeBoardGamePresentationForGame("chess", state.gameId)') && bridge.includes('closeBoardGamePresentationForGame("xiangqi", state.gameId)'), 'terminal state closes only its matching game presentation');
check(bridge.includes('closeBoardGamePresentationForGame("chess", delta.gameId)') && bridge.includes('closeBoardGamePresentationForGame("xiangqi", delta.gameId)'), 'terminal move delta also closes only its matching game presentation');
check(/status === "waiting"[\s\S]*status === "active"[\s\S]*status === "paused"/.test(bridge), 'waiting/active/paused states are presentation-live');

check(store.includes('activeGameId: string | null'), 'presentation snapshot is bound to authoritative activeGameId');
check(store.includes('activeGameId: null'), 'IDLE clears the bound gameId');
check(/presentConfirmedBoardGame[\s\S]*activeGameId: gameId[\s\S]*mode: "full"/.test(store), 'confirmed game state enters FULL atomically with gameId');
check(/closeBoardGamePresentationForGame[\s\S]*snapshot\.activeKind !== kind[\s\S]*snapshot\.activeGameId !== gameId/.test(store), 'stale terminal events cannot close a newer/different game surface');
check(/closeBoardGamePresentation[\s\S]*publish\(IDLE_SNAPSHOT\)/.test(store), 'Close still performs one deterministic IDLE reset');
check(store.includes('fullContent: kind') && store.includes('miniContent: kind'), 'Full and Mini selectors are seeded together');

check(surface.includes('useEffect(() => attachBoardGamePresentationBridge(), [])'), 'persistent root attaches the bridge once for app lifetime');
check(surface.includes('styles.chessLayer') && surface.includes('styles.xiangqiLayer'), 'Full Surface always contains separate Chess and Xiangqi layers');
check((surface.match(/styles\.gameLayer,/g) || []).length === 2, 'exactly two persistent game layers share the absolute 90% frame');
check(surface.includes('position: "absolute"') && surface.includes('left: "5%"') && surface.includes('top: "5%"'), 'stacked game layers are absolute and centered');
check(surface.includes('width: "90%"') && surface.includes('height: "90%"'), 'each game view occupies 90% of the Full Surface');
check(surface.includes('const CHESS_DEEP_PINK = "#D94F87"'), 'Chess view has deep-pink background');
check(surface.includes('const XIANGQI_DEEP_GOLD = "#D3A11F"'), 'Xiangqi view has deep-gold/yellow background');
check(surface.includes('chessActive ? styles.gameLayerActive : styles.gameLayerInactive'), 'Chess selection changes stacking/visibility without unmounting Chess view');
check(surface.includes('xiangqiActive ? styles.gameLayerActive : styles.gameLayerInactive'), 'Xiangqi selection changes stacking/visibility without unmounting Xiangqi view');
check(surface.includes('zIndex: 2') && surface.includes('zIndex: 1'), 'active/inactive stacked layers have deterministic z-order');
check(surface.includes('presentation.miniContent === "xiangqi" ? styles.miniXiangqi : styles.miniChess'), 'Mini surface follows the selected game color');
check(surface.includes('hiddenFullX') && surface.includes('hiddenMiniX'), 'Full and Mini shells remain persistent off-screen parked views');

check(botTest.includes('syncChessPresentationFromState(response.data.state)'), 'Chess accept ACK immediately syncs presentation from authoritative state');
check(botTest.includes('syncXiangqiPresentationFromState(response.data.state)'), 'Xiangqi accept ACK immediately syncs presentation from authoritative state');
check(botTest.includes('syncChessPresentationFromState(game.data)'), 'Chess recovery ACK hydrates presentation');
check(botTest.includes('syncXiangqiPresentationFromState(game.data)'), 'Xiangqi recovery ACK hydrates presentation');
check(!/testBotChallenge[\s\S]{0,500}activateBoardGamePresentation/.test(botTest), 'outgoing bot challenge does not open Surface before server confirms a game');
check(homeGames.includes('activateBoardGamePresentation("chess")') && homeGames.includes('activateBoardGamePresentation("xiangqi")'), 'manual Home prototype can still switch the two persistent visual layers');

check(exists('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat'), 'FULL package includes root EAS test-build helper BAT');
check(exists('eas.json') && read('eas.json').includes('family-bloom-test') && read('eas.json').includes('\"buildType\": \"apk\"'), 'EAS test profile exists for internal Android APK builds');
check(exists('scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat'), 'FULL package includes root EAS OTA helper BAT');
check(read('scripts/android/eas/Family_Bloom_EAS_UPDATE_TEST.bat').includes('set /p "UPDATE_MESSAGE=Nhap message cho ban OTA: "'), 'OTA helper prompts interactively for update message');
check(pkg.scripts?.['phaseP2_34:check']?.includes('test-phase-p2_34-session-presentation-bridge-stacked-views.js'), 'P2.34 regression command is registered');
check(cleanApply.includes('phaseP2_34:check'), 'CLEAN APPLY runs P2.34 gate');

let ts = null;
try { ts = require('typescript'); } catch {}
if (ts) {
  for (const file of [
    'src/services/games/boardGamePresentationStore.ts',
    'src/services/games/boardGamePresentationBridge.ts',
    'src/components/games/BoardGamePresentationRoot.tsx',
    'src/app/(internal)/board-game-bot-test.tsx',
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
  console.log('INFO: typescript package unavailable; syntax transpile checks skipped in this environment.');
}

console.log(`\nP2.34 Session/Presentation + Stacked Views: ${passed}/${passed + failed} PASS`);
process.exit(failed ? 1 : 0);
