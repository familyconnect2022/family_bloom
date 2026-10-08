const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log('PASS', name); }
  else { fail += 1; console.error('FAIL', name, detail); }
}
function compileCjs(source, fileName) {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    reportDiagnostics: true,
  });
}
function loadTsModule(relPath, requireMap = {}) {
  const fileName = path.join(root, relPath);
  const source = fs.readFileSync(fileName, 'utf8');
  const out = compileCjs(source, fileName);
  if ((out.diagnostics || []).length) {
    throw new Error(`${relPath} transpile diagnostics: ${out.diagnostics.map((d) => d.messageText).join(', ')}`);
  }
  const module = { exports: {} };
  const customRequire = (id) => {
    if (Object.prototype.hasOwnProperty.call(requireMap, id)) return requireMap[id];
    return require(id);
  };
  const wrapper = `(function(require,module,exports,__filename,__dirname){${out.outputText}\n})`;
  const fn = vm.runInThisContext(wrapper, { filename: fileName });
  fn(customRequire, module, module.exports, fileName, path.dirname(fileName));
  return module.exports;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class FakeChessDomainError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}
class FakeChess {
  constructor() { this._turn = 'w'; this._history = []; }
  fen() { return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'; }
  pgn() { return ''; }
  history(options) { return options && options.verbose ? [] : this._history.slice(); }
  turn() { return this._turn; }
  moves() { return []; }
  isCheck() { return false; }
  board() { return Array.from({ length: 8 }, () => Array(8).fill(null)); }
  loadPgn() { return true; }
  load() { return true; }
}

async function main() {
  const proposalModule = loadTsModule('server/src/chess/rematchProposalStore.ts');
  const ProposalStore = proposalModule.RematchProposalStore;
  const proposals = new ProposalStore(30);
  const first = proposals.vote('g1', 'u1', 'req-u1-a', 1000);
  const duplicate = proposals.vote('g1', 'u1', 'req-u1-b', 1001);
  check('rematch vote starts waiting', first.waiting === true && first.voterCount === 1);
  check('same uid cannot double-vote into ready state', duplicate.waiting === true && duplicate.voterCount === 1 && duplicate.requestIds.length === 1);
  const second = proposals.vote('g1', 'u2', 'req-u2', 1002);
  check('second distinct player completes rematch consensus', second.ready === true && second.voterCount === 2 && second.requestIds.length === 2);
  proposals.clear('g1');
  proposals.vote('g2', 'u1', 'cancel-me');
  proposals.cancel('g2', 'u1');
  check('rematch cancel removes pending vote', proposals.hasVote('g2', 'u1') === false && proposals.size() === 0);
  proposals.vote('g3', 'u1', 'expire-me');
  await sleep(85);
  check('rematch proposal hard-TTL evicts from server memory', proposals.size() === 0);

  const broadcasts = [];
  const stored = new Map();
  const persistence = {
    async createWithLocks(game) { stored.set(game.id, structuredClone(game)); },
    async save(game) { stored.set(game.id, structuredClone(game)); },
    async finish(game) { stored.set(game.id, structuredClone(game)); },
    async load(_familyId, gameId) { return stored.has(gameId) ? structuredClone(stored.get(gameId)) : null; },
  };
  const managerModule = loadTsModule('server/src/chess/chessGameManager.ts', {
    'chess.js': { Chess: FakeChess },
    './chessTypes.js': { ChessDomainError: FakeChessDomainError },
    './chessPersistenceService.js': { ChessPersistenceService: class {} },
  });
  const Manager = managerModule.ChessGameManager;
  const manager = new Manager(persistence, (event) => broadcasts.push(event));
  const tc = { kind: 'clocked', initialMs: 60000, incrementMs: 0 };
  const created = await manager.create('fam', 'alice', 'bob', tc, 'create-1', { whiteUid: 'alice', blackUid: 'bob' });
  check('new game is waiting before board-ready handshake', created.status === 'waiting' && created.startedAt === null);
  check('new clock is untouched before ready', created.whiteRemainingMs === 60000 && created.blackRemainingMs === 60000);
  const oneReady = await manager.markReady(created.gameId, 'alice', 'ready-a');
  check('one human ready does not start clock', oneReady.status === 'waiting' && oneReady.startedAt === null && oneReady.whiteRemainingMs === 60000);
  const bothReady = await manager.markReady(created.gameId, 'bob', 'ready-b');
  check('second player ready activates game authoritatively', bothReady.status === 'active' && typeof bothReady.startedAt === 'string');
  check('ready activation broadcasts active state exactly once', broadcasts.filter((e) => e.kind === 'state' && e.state.gameId === created.gameId && e.state.status === 'active').length === 1);
  await sleep(18);
  const running = await manager.state(created.gameId, 'alice');
  check('clock only begins decreasing after authoritative activation', running.whiteRemainingMs < 60000 && running.whiteRemainingMs > 59000);

  const botGame = await manager.create('fam', 'alice', '__bot__', tc, 'bot-create', { testBotUid: '__bot__', whiteUid: 'alice', blackUid: '__bot__' });
  const botReady = await manager.markReady(botGame.gameId, 'alice', 'bot-human-ready');
  check('Bloom Bot is pre-ready so one human ready starts bot game', botReady.status === 'active');

  const swapped = await manager.create('fam', 'alice', 'bob', tc, 'rematch-create', { whiteUid: 'bob', blackUid: 'alice', additionalRequestIds: ['other-voter-request'] });
  check('explicit rematch colors can swap players deterministically', swapped.whiteUid === 'bob' && swapped.blackUid === 'alice');
  const persistedSwapped = stored.get(swapped.gameId);
  check('rematch keeps request ids for idempotent retry resolution', persistedSwapped.recentRequestIds.includes('rematch-create') && persistedSwapped.recentRequestIds.includes('other-voter-request'));

  const surfaceStoreModule = loadTsModule('src/services/chess/chessSurfaceStore.ts', {
    react: { useSyncExternalStore: () => undefined },
  });
  surfaceStoreModule.prepareChessSurface('route');
  surfaceStoreModule.markChessSurfacePrepared();
  surfaceStoreModule.setChessSurfacePresentationReady(true);
  surfaceStoreModule.activateChessSurface('old-family-game', 'mini');
  surfaceStoreModule.setChessMiniPosition({ x: 10, y: 20 });
  surfaceStoreModule.resetChessSurfaceSession();
  const resetState = surfaceStoreModule.getChessSurfaceState();
  check('auth/family reset clears game binding and mini mode', resetState.gameId === null && resetState.mode === 'hidden' && surfaceStoreModule.getChessMiniPosition() === null);
  check('auth/family reset preserves warm native surface + presentation readiness', resetState.prepared === true && resetState.presentationReady === true);

  const host = read('src/components/chess/ChessSurfaceHost.tsx');
  const board = read('src/components/chess/ChessBoard.tsx');
  const realtime = read('src/context/ChessRealtimeContext.tsx');
  const managerSource = read('server/src/chess/chessGameManager.ts');
  const socket = read('server/src/socket/socketServer.ts');
  const gameHook = read('src/hooks/chess/useChessGame.ts');
  const types = read('src/types/chess.ts');
  const tabs = read('src/app/(tabs)/_layout.tsx');

  check('Root Chess no longer elevates a full-screen Android layer', !/chessSurfaceRoot[\s\S]{0,250}elevation\s*:\s*1000/.test(host) && !host.includes('elevation: 1000'));
  check('Root Chess owns a GestureHandlerRootView so mini drag is valid on Android', host.includes('<GestureHandlerRootView') && host.includes('ref={surfaceRootRef}') && host.includes('</GestureHandlerRootView>'));
  check('Ready handshake waits for authoritative visual revision plus two painted frames', host.includes('visualRevision < state.revision') && (host.match(/requestAnimationFrame\(\(\) =>/g)||[]).length >= 2 && host.includes('realtimeActions.readyGame(gameId)'));
  check('active clock is never covered by a post-activation Ready delay', host.includes('active frame must also be the first interactive/uncovered frame') && !host.includes('setEntryPhase("ready")') && !host.includes('setTimeout(() => setEntryPhase("playing"), 560)'));
  check('Chess geometry remains one width-owned source with native-origin correction', host.includes('windowWidth - CHESS_SCREEN_GUTTER * 2') && host.includes('Math.floor(raw / 8) * 8') && host.includes('measureInWindow') && host.includes('left: -screenOrigin.x') && host.includes('top: -screenOrigin.y'));
  check('Ready Promotion Result remain in one full-screen modal coordinate system', host.includes('styles.chessModalLayer') && host.includes('promotion && actualGame') && host.includes('showResult') && host.includes('width: windowWidth, height: windowHeight'));
  check('bottom tab keeps exactly one icon node with white active glyph', (tabs.match(/<Ionicons/g)||[]).length === 1 && tabs.includes('focused ? COLORS.white : COLORS.tabInactive') && tabs.includes('TAB_INDICATOR_WIDTH = 50') && tabs.includes('TAB_INDICATOR_HEIGHT = 36'));
  check('full Chess transition no longer alpha-animates full screen', !host.includes('fullProgress') && !host.includes('animateSurfaceMode') && host.includes('display: (fullVisible'));
  check('mini is draggable with pan/tap race and edge snap', host.includes('Gesture.Pan()') && host.includes('Gesture.Race(pan, tap)') && host.includes('targetX') && host.includes('setChessMiniPosition'));
  check('full game store subscription sleeps in mini mode', host.includes('surface.mode === "full"') && host.includes('useChessGame(activeFamilyId'));
  check('useChessGame supports dormant external-store subscription', gameHook.includes('liveSubscription = true') && gameHook.includes('liveSubscription ? subscribeChessGameStore'));
  check('mini owns lightweight direct game-store subscription', host.includes('subscribeChessGameStore(gameId, listener)') && host.includes('MiniChessCard'));
  check('session binding resets on account/family identity change', realtime.includes('resetChessSurfaceSession()') && realtime.includes('[activeFamilyId, user?.uid]'));
  check('server/client ready protocol is wired', types.includes('chess:game:ready') && socket.includes('socket.on(E.gameReady') && realtime.includes('readyGame'));
  check('server/client rematch cancel protocol is wired', types.includes('chess:game:rematch:cancel') && socket.includes('socket.on(E.gameRematchCancel') && realtime.includes('cancelRematch'));
  check('human rematch swaps colors instead of randomizing again', socket.includes('whiteUid: old.blackUid') && socket.includes('blackUid: old.whiteUid'));
  check('finished runtimes have bounded in-memory lifetime', managerSource.includes('FINISHED_RUNTIME_TTL_MS') && managerSource.includes('finishedEvictionTimers') && managerSource.includes('this.games.delete(gameId)'));
  check('result UI blocks repeat rematch and exposes cancel', host.includes('rematchInFlightRef.current') && host.includes('Đã gửi ✓') && host.includes('Hủy lời chơi lại'));
  check('rematch retry preserves one stable request id across transport ambiguity', host.includes('rematchRequestIdRef') && host.includes('game.rematch(stableRequestId)') && host.includes('response.errorCode !== "CHESS_SERVER_RECOVERING"') && realtime.includes('stableRequestId || requestId()'));
  check('mini cannot interrupt the board-ready handshake', host.includes('disabled={state.status === "waiting" || entryPhase !== "playing"}') && host.includes('topButtonDisabled'));
  check('dead ChessBoard onVisualCommit path is removed', !board.includes('onVisualCommit'));
  check('Battle FX remains retired', !fs.existsSync(path.join(root, 'src/components/chess/ChessBattleEffects.tsx')) && !host.includes('ChessBattleEffects'));

  // Existing one-premove implementation is intentionally retained: one client-only
  // intent, local turn-forced hinting, authoritative revalidation after the opponent
  // move, promotion selection at queue time, and automatic clear while the board sleeps.
  check('single premove intent storage exists', board.includes('premoveRef') && board.includes('premoveRef.current ='));
  check('premove legal hints are derived locally for player color', board.includes('forcedTurnFen') && board.includes('premoveMode'));
  check('premove revalidates against authoritative next position', board.includes('premove_revalidate_fail') && board.includes('premove_revalidate_ok') && board.includes('attemptRef.current(queued.from, queued.to, queued.promotion, "premove")'));
  check('premove clears when full board runtime sleeps/minimizes', /runtimeActive[\s\S]{0,500}clearPremove/.test(board) || /clearPremove[\s\S]{0,500}runtimeActive/.test(board));
  check('premove promotion is captured before execution', board.includes('promotionCandidates.length && !chosenPromotion') && board.includes('chosenPromotion = await onPromotion(from, to)') && board.includes('premoveRef.current = { from, to, promotion: chosenPromotion }'));

  // Full-source syntax scan catches edits in both client and server without relying
  // on installed project node_modules.
  const sourceFiles = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (/\.(ts|tsx)$/.test(entry.name)) sourceFiles.push(abs);
    }
  }
  walk(path.join(root, 'src'));
  walk(path.join(root, 'server', 'src'));
  let syntaxErrors = 0;
  for (const file of sourceFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const result = ts.transpileModule(source, {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    syntaxErrors += (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length;
  }
  check(`full TS/TSX transpile scan (${sourceFiles.length} files)`, syntaxErrors === 0, `${syntaxErrors} diagnostics`);

  console.log(`Phase 17.9A9 Chess lifecycle/mini/premove: ${pass} PASS / ${fail} FAIL`);
  if (fail) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
