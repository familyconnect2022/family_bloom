const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok, detail = '') {
  if (ok) { pass += 1; console.log('PASS', name); }
  else { fail += 1; console.error('FAIL', name, detail); }
}
function compileCjs(source, fileName) {
  return ts.transpileModule(source, {
    fileName,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
    reportDiagnostics: true,
  });
}
function loadTsModule(relPath, requireMap = {}) {
  const fileName = path.join(root, relPath);
  const source = fs.readFileSync(fileName, 'utf8');
  const out = compileCjs(source, fileName);
  const errors = (out.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  if (errors.length) throw new Error(`${relPath}: ${errors.map((d) => ts.flattenDiagnosticMessageText(d.messageText, ' ')).join(', ')}`);
  const module = { exports: {} };
  const customRequire = (id) => Object.prototype.hasOwnProperty.call(requireMap, id) ? requireMap[id] : require(id);
  const wrapper = `(function(require,module,exports,__filename,__dirname){${out.outputText}\n})`;
  vm.runInThisContext(wrapper, { filename: fileName })(customRequire, module, module.exports, fileName, path.dirname(fileName));
  return module.exports;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clone = (v) => v == null ? v : structuredClone(v);

class FakeChessDomainError extends Error {
  constructor(code, message) { super(message || code); this.code = code; }
}

class FakeFirestore {
  constructor() { this.data = new Map(); }
  doc(path) {
    const db = this;
    return {
      path,
      async get() {
        const exists = db.data.has(path);
        const value = exists ? clone(db.data.get(path)) : undefined;
        return { exists, data: () => value };
      },
    };
  }
  batch() {
    const ops = [];
    return {
      set: (ref, value) => ops.push(['set', ref.path, clone(value)]),
      delete: (ref) => ops.push(['delete', ref.path]),
      async commit() {
        for (const [kind, p, value] of ops) {
          if (kind === 'set') this.__db?.set?.(p, value);
        }
      },
      __db: this.data,
    };
  }
  async runTransaction(fn) {
    const staged = [];
    const db = this;
    const tx = {
      async get(ref) {
        const exists = db.data.has(ref.path);
        const value = exists ? clone(db.data.get(ref.path)) : undefined;
        return { exists, data: () => value };
      },
      create(ref, value) {
        if (db.data.has(ref.path)) throw new FakeChessDomainError('CHESS_ALREADY_IN_GAME');
        staged.push(['set', ref.path, clone(value)]);
      },
      set(ref, value) { staged.push(['set', ref.path, clone(value)]); },
      delete(ref) { staged.push(['delete', ref.path]); },
    };
    const result = await fn(tx);
    for (const [kind, p, value] of staged) {
      if (kind === 'set') db.data.set(p, value);
      else db.data.delete(p);
    }
    return result;
  }
}

class FakeChess {
  constructor() { this._turn = 'w'; this._history = []; }
  fen() { return `fake-${this._history.length}-${this._turn}`; }
  pgn() { return this._history.map((m) => m.san).join(' '); }
  history(options) { return options && options.verbose ? this._history.map((m) => ({ color: m.color, captured: m.captured })) : this._history.map((m) => m.san); }
  turn() { return this._turn; }
  moves() { return []; }
  isCheck() { return false; }
  isCheckmate() { return false; }
  isStalemate() { return false; }
  isInsufficientMaterial() { return false; }
  isThreefoldRepetition() { return false; }
  isDrawByFiftyMoves() { return false; }
  board() { return Array.from({ length: 8 }, () => Array(8).fill(null)); }
  loadPgn() { return true; }
  load() { return true; }
  move({ from, to, promotion }) {
    const color = this._turn;
    this._turn = color === 'w' ? 'b' : 'w';
    const moved = { from, to, san: `${from}-${to}`, color, piece: 'p', flags: 'n', ...(promotion ? { promotion } : {}) };
    this._history.push(moved);
    return moved;
  }
}

async function main() {
  const persistenceModule = loadTsModule('server/src/chess/chessPersistenceService.ts', {
    './chessTypes.js': { ChessDomainError: FakeChessDomainError },
  });
  const Persistence = persistenceModule.ChessPersistenceService;
  const db = new FakeFirestore();
  // Patch Fake batch commit with the actual backing map because the production
  // service uses Firestore batch semantics for finish + recovery inbox writes.
  db.batch = function () {
    const ops = []; const backing = this.data;
    return {
      set: (ref, value) => ops.push(['set', ref.path, clone(value)]),
      delete: (ref) => ops.push(['delete', ref.path]),
      async commit() {
        for (const [kind, p, value] of ops) {
          if (kind === 'set') backing.set(p, value);
          else backing.delete(p);
        }
      },
    };
  };
  const persistence = new Persistence(db);
  const now = new Date().toISOString();
  const terminal = {
    id: 'g-finished', familyId: 'fam-a', whiteUid: 'alice', blackUid: 'bob', playerUids: ['alice', 'bob'],
    status: 'finished', fen: 'fake', pgn: '', turn: 'w', revision: 8,
    whiteRemainingMs: 120000, blackRemainingMs: 110000,
    timeControl: { kind: 'clocked', initialMs: 180000, incrementMs: 2000 },
    result: 'white', finishReason: 'checkmate', lastMove: null, drawOfferByUid: null,
    recentRequestIds: [], createdAt: now, startedAt: now, endedAt: now, updatedAt: now,
  };
  // createWithLocks then finish exercises lock removal and two independent
  // durable result-inbox writes in one server flow.
  await persistence.createWithLocks({ ...terminal, status: 'active', result: null, finishReason: null, endedAt: null });
  check('active lock exists before finish', !!(await persistence.getActiveForUid('alice')));
  await persistence.finish(terminal);
  check('finish clears active lock', (await persistence.getActiveForUid('alice')) === null && (await persistence.getActiveForUid('bob')) === null);
  const unseenA = await persistence.getUnseenResult('alice', 'fam-a');
  const unseenB = await persistence.getUnseenResult('bob', 'fam-a');
  check('finish creates per-user per-family durable recovery inbox', unseenA?.gameId === 'g-finished' && unseenB?.gameId === 'g-finished');
  await persistence.acknowledgeResult('alice', 'fam-a', 'wrong-game');
  check('wrong result ack cannot delete a newer/different recovery', (await persistence.getUnseenResult('alice', 'fam-a'))?.gameId === 'g-finished');
  await persistence.acknowledgeResult('alice', 'fam-a', 'g-finished');
  check('result ack only clears acknowledging user inbox', (await persistence.getUnseenResult('alice', 'fam-a')) === null && (await persistence.getUnseenResult('bob', 'fam-a'))?.gameId === 'g-finished');

  const stored = new Map();
  const managerPersistence = {
    async createWithLocks(game) { stored.set(game.id, clone(game)); },
    async save(game) { stored.set(game.id, clone(game)); },
    async finish(game) { stored.set(game.id, clone(game)); },
    async load(_familyId, gameId) { return stored.has(gameId) ? clone(stored.get(gameId)) : null; },
  };
  const managerModule = loadTsModule('server/src/chess/chessGameManager.ts', {
    'chess.js': { Chess: FakeChess },
    './chessTypes.js': { ChessDomainError: FakeChessDomainError },
    './chessPersistenceService.js': { ChessPersistenceService: class {} },
  });
  const Manager = managerModule.ChessGameManager;
  const manager = new Manager(managerPersistence, () => undefined);

  const blitz32 = { kind: 'clocked', initialMs: 180000, incrementMs: 2000 };
  const g32 = await manager.create('fam-a', 'alice', 'bob', blitz32, 'tc-3+2', { whiteUid: 'alice', blackUid: 'bob' });
  await manager.markReady(g32.gameId, 'alice', 'ready-a-32');
  const active32 = await manager.markReady(g32.gameId, 'bob', 'ready-b-32');
  await sleep(18);
  const moveAck = await manager.move(g32.gameId, 'alice', 'move-white-32', active32.revision, 'e2', 'e4');
  const after32 = await manager.state(g32.gameId, 'alice');
  check('3+2 move is server accepted once', moveAck.version === after32.revision && after32.turn === 'b');
  check('3+2 increment is added only after accepted move', after32.whiteRemainingMs > 181700 && after32.whiteRemainingMs <= 182000 && after32.blackRemainingMs <= 180000);
  const whiteAfterMove = after32.whiteRemainingMs;
  await manager.join('fam-a', g32.gameId, 'alice');
  await manager.join('fam-a', g32.gameId, 'bob');
  await sleep(12);
  const afterReconnect = await manager.state(g32.gameId, 'alice');
  check('rejoin does not grant the mover another increment', Math.abs(afterReconnect.whiteRemainingMs - whiteAfterMove) < 5);
  check('opponent clock continues after rejoin without resetting', afterReconnect.blackRemainingMs < after32.blackRemainingMs);

  const noClock = { kind: 'unlimited', initialMs: null, incrementMs: 0 };
  const gu = await manager.create('fam-a', 'alice2', 'bob2', noClock, 'tc-unlimited', { whiteUid: 'alice2', blackUid: 'bob2' });
  await manager.markReady(gu.gameId, 'alice2', 'ready-a-u');
  const activeU = await manager.markReady(gu.gameId, 'bob2', 'ready-b-u');
  await manager.move(gu.gameId, 'alice2', 'move-u', activeU.revision, 'e2', 'e4');
  const afterU = await manager.state(gu.gameId, 'alice2');
  check('unlimited mode stays null-clock through move path', afterU.whiteRemainingMs === null && afterU.blackRemainingMs === null);

  const server = read('server/src/socket/socketServer.ts');
  const realtime = read('src/context/ChessRealtimeContext.tsx');
  const types = read('src/types/chess.ts');
  const store = read('src/services/chess/chessGameStore.ts');
  const surface = read('src/components/chess/ChessSurfaceHost.tsx');
  const globalHost = read('src/components/chess/ChessGlobalUiHost.tsx');
  const lobby = read('src/app/(chess)/chess-lobby.tsx');

  check('server exposes family-scoped recover + result ack protocol', server.includes('socket.on(E.sessionRecover') && server.includes('socket.on(E.gameResultAck'));
  check('session recovery prioritizes active current-family game', server.includes('active?.familyId === familyId') && server.includes('kind: "active"'));
  check('session recovery falls back to finished unseen result', server.includes('getUnseenResult(uid, familyId)') && server.includes('kind: "finished_unseen"'));
  check('stale recovery pointer self-heals instead of reviving invalid game', server.includes('stored.status !== "finished"') && server.includes('acknowledgeResult(uid, familyId, unseen.gameId)'));
  check('family switch server cleanup marks old board away and leaves old game room', server.includes('leaveBoundGameForFamily') && server.includes('await manager.setBoardVisible(gameId, uid, false)') && server.includes('socket.leave(`chess:game:${gameId}`)'));
  check('server removes old game binding before entering another family', /previousFamilyId[\s\S]{0,240}leaveBoundGameForFamily\(previousFamilyId, true\)/.test(server));
  check('client proactively leaves old family before local reset', realtime.includes('CHESS_EVENTS.appLeave') && realtime.includes('previousGame.status !== "finished"') && realtime.includes('resetChessSurfaceSession()'));
  check('cross-family state packets are rejected at provider boundary', realtime.includes('if (next.familyId !== familyIdRef.current) return'));
  check('cross-family move delta is rejected unless current family matches', realtime.includes('current.familyId !== familyIdRef.current'));
  check('family-keyed join flight cannot let old-family recovery block new-family recovery', realtime.includes('joinInFlightRef') && realtime.includes('existing?.familyId === familyId') && realtime.includes('isCurrentFamily'));
  check('transport connect no longer marks game synchronized', realtime.includes('connectionPhase: "synchronizing"') && !/stopConnected[\s\S]{0,500}connectionPhase:\s*"connected"/.test(realtime));
  check('game connection phase has explicit synchronizing state', store.includes('"synchronizing"'));
  check('board input remains closed until synchronized connected phase', surface.includes('game.connectionPhase === "connected"') && surface.includes('interactionBlocked={!boardInteractive}'));
  check('full surface explains authoritative sync without blanking board', surface.includes('Đang đồng bộ ván cờ…') && surface.includes('game.connectionPhase !== "connected"'));
  check('finished unseen recovery can reclaim root Chess surface', globalHost.includes('realtime.activeGameId ?? realtime.pendingResultGameId') && globalHost.includes('"recovered_result"'));
  check('lobby also returns recovered finished result to root surface', lobby.includes('lobby.pendingResultGameId || lobby.activeGameId'));
  check('result dismissal uses durable server ack for every finish reason', realtime.includes('CHESS_EVENTS.gameResultAck') && surface.includes('realtimeActions.acknowledgeResult(finishedGameId)'));

  check('all five time-control presets still share one typed model', (types.match(/kind: "clocked"/g) || []).length >= 4 && types.includes('kind: "unlimited"'));
  check('time-control UI uses human Bloom labels without changing wire values', types.includes('Siêu nhanh · 3+2') && types.includes('Nhanh +5 · 10+5'));
  check('server allow-list still validates all supported clock presets centrally', server.includes('180000:2000') && server.includes('300000:0') && server.includes('600000:0') && server.includes('600000:5000') && server.includes('unlimited'));

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
    const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      fileName: file,
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    });
    syntaxErrors += (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error).length;
  }
  check(`full TS/TSX transpile scan (${sourceFiles.length} files)`, syntaxErrors === 0, `${syntaxErrors} diagnostics`);

  console.log(`Phase 17.9A11 family recovery/sync/time controls: ${pass} PASS / ${fail} FAIL`);
  if (fail) process.exit(1);
}

main().catch((error) => { console.error(error); process.exit(1); });
