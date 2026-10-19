import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Chess, type Color, type PieceSymbol } from "chess.js";
import { ChessDomainError, type AppliedMove, type CaptureSummary, type CapturedPiece, type ChessColor, type ChessTimeControl, type FinishReason, type MoveDelta, type MoveCommandAck, type PersistedGame, type PublicGameState } from "./chessTypes.js";
import { ChessPersistenceService } from "./chessPersistenceService.js";

type AwayBudget = { leftAtMono: number; deadlineMono: number; remainingAtLeaveMs: number };
/** Server-clock wall-time permitted for this match. Each absence *consumes* this
 * reserve; foreground/background toggling cannot replenish it. */
export function awayAllowanceMs(initialMs: number | null, remainingMs: number): number {
  if (initialMs === 600_000) return remainingMs > 120_000 ? remainingMs / 2 : remainingMs;
  if (initialMs === 300_000) return remainingMs > 60_000 ? remainingMs / 2 : remainingMs;
  // Three/one-minute games and other clocked controls: run remaining time.
  return remainingMs;
}
type Runtime = { game: PersistedGame; chess: Chess; turnStartedMono: number | null; connectedUids: Set<string>; boardReadyUids: Set<string>; readyUids: Set<string>; captures: CaptureSummary; boardAwayByUid: Map<string, AwayBudget>; awayRemainingByUid: Map<string, number> };
type Broadcast = (event: { kind: "state"; state: PublicGameState } | { kind: "move"; state: PublicGameState; delta: MoveDelta }) => void;
const iso = () => new Date().toISOString();
const otherColor = (c: ChessColor): ChessColor => c === "w" ? "b" : "w";
const CHECKPOINT_EVERY_PLY = 4;
const FINISHED_RUNTIME_TTL_MS = 30 * 60_000;
const WAITING_PREPARATION_TIMEOUT_MS = 120_000;
type CapturablePiece = NonNullable<AppliedMove["captured"]>;
const emptyCaptureSummary = (): CaptureSummary => ({
  byWhite: { p: 0, n: 0, b: 0, r: 0, q: 0 },
  byBlack: { p: 0, n: 0, b: 0, r: 0, q: 0 },
});
const cloneCaptureSummary = (summary: CaptureSummary): CaptureSummary => ({
  byWhite: { ...summary.byWhite },
  byBlack: { ...summary.byBlack },
});
const deriveCaptureSummary = (chess: Chess): CaptureSummary => {
  const summary = emptyCaptureSummary();
  const history = chess.history({ verbose: true }) as Array<{ color: ChessColor; captured?: PieceSymbol }>;
  for (const move of history) {
    if (!move.captured || move.captured === "k") continue;
    const piece = move.captured as CapturedPiece;
    const bucket = move.color === "w" ? summary.byWhite : summary.byBlack;
    bucket[piece] += 1;
  }
  return summary;
};
const asCapturablePiece = (piece: PieceSymbol | undefined): CapturablePiece | undefined => {
  if (!piece) return undefined;
  // chess.js exposes `captured` as PieceSymbol (which includes king) at the type level,
  // but a legal chess move can never capture the king. Keep our wire protocol semantically strict.
  if (piece === "k") throw new Error("CHESS_INVARIANT_CAPTURED_KING");
  return piece;
};

export class ChessGameManager {
  private games = new Map<string, Runtime>();
  private queues = new Map<string, Promise<unknown>>();
  private timer: NodeJS.Timeout;
  private finishedEvictionTimers = new Map<string, NodeJS.Timeout>();
  constructor(private persistence: ChessPersistenceService, private broadcast: Broadcast) {
    this.timer = setInterval(() => { void this.checkTimeouts().catch((error) => console.error("[chess] deadline sweep failed", error)); }, 300);
    this.timer.unref();
  }

  private enqueue<T>(gameId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(gameId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    // The queue tail must resolve even when a command rejects. Returning the
    // original `next` preserves the command error for its ACK handler; a
    // rejected `finally()` tail otherwise creates an unhandled rejection.
    const tracked = next.then(
      () => { if (this.queues.get(gameId) === tracked) this.queues.delete(gameId); },
      () => { if (this.queues.get(gameId) === tracked) this.queues.delete(gameId); },
    );
    this.queues.set(gameId, tracked);
    return next;
  }

  async create(
    familyId: string,
    uidA: string,
    uidB: string,
    timeControl: ChessTimeControl,
    createRequestId?: string,
    options?: { testBotUid?: string | null; whiteUid?: string; blackUid?: string; additionalRequestIds?: string[] },
  ) {
    const gameId = randomUUID();
    const explicitColors = options?.whiteUid && options?.blackUid
      && new Set([options.whiteUid, options.blackUid]).size === 2
      && [options.whiteUid, options.blackUid].every((uid) => uid === uidA || uid === uidB);
    // Explicit invite colors are authoritative. Never silently re-randomize an
    // invalid invite mapping: the client would show a different side from the
    // invitation the player accepted.
    if ((options?.whiteUid || options?.blackUid) && !explicitColors) {
      throw new ChessDomainError("CHESS_INVALID_REQUEST", "INVITE_COLOR_MISMATCH");
    }
    const whiteUid = explicitColors ? options!.whiteUid! : (Math.random() < 0.5 ? uidA : uidB);
    const blackUid = explicitColors ? options!.blackUid! : (whiteUid === uidA ? uidB : uidA);
    const chess = new Chess(); const now = iso();
    const game: PersistedGame = {
      id: gameId, familyId, whiteUid, blackUid, playerUids: [whiteUid, blackUid], status: "waiting",
      fen: chess.fen(), pgn: chess.pgn(), turn: "w", revision: 1,
      whiteRemainingMs: timeControl.kind === "clocked" ? timeControl.initialMs : null,
      blackRemainingMs: timeControl.kind === "clocked" ? timeControl.initialMs : null,
      timeControl, awayBudgetByUid: {}, preparationPhase: "board", result: null, finishReason: null, lastMove: null, drawOfferByUid: null,
      recentRequestIds: [...new Set([...(createRequestId ? [createRequestId] : []), ...(options?.additionalRequestIds ?? [])])].slice(-24), testBotUid: options?.testBotUid ?? null, isTestGame: !!options?.testBotUid, createdAt: now, startedAt: null, endedAt: null, updatedAt: now,
    };
    await this.persistence.createWithLocks(game);
    const runtime: Runtime = {
      game,
      chess,
      turnStartedMono: null,
      connectedUids: new Set(options?.testBotUid ? [options.testBotUid] : []),
      boardReadyUids: new Set(options?.testBotUid ? [options.testBotUid] : []),
      readyUids: new Set(options?.testBotUid ? [options.testBotUid] : []),
      captures: emptyCaptureSummary(),
      boardAwayByUid: new Map(),
      awayRemainingByUid: new Map(),
    };
    this.games.set(gameId, runtime);
    return this.publicState(runtime);
  }

  async restore(familyId: string, gameId: string) {
    const existing = this.games.get(gameId); if (existing) return existing;
    const stored = await this.persistence.load(familyId, gameId);
    if (!stored) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
    const chess = new Chess();
    if (stored.pgn) chess.loadPgn(stored.pgn); else chess.load(stored.fen);
    // Restore immutable epoch deadlines from the durable checkpoint. Server
    // monotonic time drives live deadlines; epoch is used only across restarts.
    const restoredBudgets = new Map<string, number>();
    const restoredAway = new Map<string, AwayBudget>();
    const nowEpoch = Date.now();
    const nowMono = performance.now();
    for (const [awayUid, budget] of Object.entries(stored.awayBudgetByUid ?? {})) {
      if (awayUid !== stored.whiteUid && awayUid !== stored.blackUid) continue;
      const remaining = Math.max(0, budget.remainingMs);
      restoredBudgets.set(awayUid, remaining);
      if (typeof budget.leftAtEpochMs === "number" && typeof budget.deadlineEpochMs === "number") {
        restoredAway.set(awayUid, {
          leftAtMono: nowMono - Math.max(0, nowEpoch - budget.leftAtEpochMs),
          deadlineMono: nowMono + (budget.deadlineEpochMs - nowEpoch),
          remainingAtLeaveMs: remaining,
        });
      }
    }
    if (stored.status === "active") {
      stored.status = "paused"; stored.revision += 1; stored.updatedAt = iso();
      await this.persistence.save(stored);
    }
    // A persisted color announcement proves both players reached boardReady,
    // even if this free-tier server restarted during presentation handoff.
    const restoredBoardReady = stored.preparationPhase === "colors"
      ? [stored.whiteUid, stored.blackUid]
      : (stored.testBotUid ? [stored.testBotUid] : []);
    const runtime: Runtime = { game: stored, chess, turnStartedMono: null, connectedUids: new Set(stored.testBotUid ? [stored.testBotUid] : []), boardReadyUids: new Set(restoredBoardReady), readyUids: new Set(stored.testBotUid ? [stored.testBotUid] : []), captures: deriveCaptureSummary(chess), boardAwayByUid: restoredAway, awayRemainingByUid: restoredBudgets };
    this.games.set(gameId, runtime);
    // A Render Free restart can erase the timer/runtime while the Firestore
    // cross-game lock survives. Reconcile against immutable persisted deadlines
    // BEFORE a returning player can be offered Continue.
    await this.settleExpired(runtime);
    return runtime;
  }

  async join(familyId: string, gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = await this.restore(familyId, gameId); this.assertPlayer(r, uid);
      await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") return this.publicState(r);
      // Joining a Socket.IO room does NOT prove foreground presence. A mobile
      // process may reconnect in background; only the explicit foreground
      // boardPresence(true) may settle an outstanding away budget.
      r.connectedUids.add(uid);
      let resumed = false;
      if (r.game.status === "paused" && r.connectedUids.has(r.game.whiteUid) && r.connectedUids.has(r.game.blackUid)) {
        const before = this.snapshot(r);
        try {
          r.game.status = "active"; r.game.revision += 1; r.game.updatedAt = iso();
          r.turnStartedMono = r.game.timeControl.kind === "clocked" ? performance.now() : null;
          await this.persistence.save(r.game);
          resumed = true;
        } catch (e) { this.restoreSnapshot(r, before); throw e; }
      }
      const state = this.publicState(r);
      if (resumed) this.broadcast({ kind: "state", state });
      return state;
    });
  }

  // Stage 1: both devices report real pixels/assets/audio ready. Only then
  // publish locked colors; neither clock nor moves are active in this stage.
  async markBoardReady(gameId: string, uid: string, requestId: string) {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId);
      if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
      this.assertPlayer(r, uid);
      await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") throw new ChessDomainError("CHESS_GAME_FINISHED");
      if (r.game.status !== "waiting" || r.game.preparationPhase === "colors") return this.publicState(r);
      r.boardReadyUids.add(uid);
      if (!r.boardReadyUids.has(r.game.whiteUid) || !r.boardReadyUids.has(r.game.blackUid)) return this.publicState(r);
      const before = this.snapshot(r);
      try {
        r.game.preparationPhase = "colors";
        r.game.revision += 1;
        r.game.updatedAt = iso();
        this.remember(r.game, requestId);
        await this.persistence.save(r.game);
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
      const state = this.publicState(r);
      this.broadcast({ kind: "state", state });
      return state;
    });
  }

  async markReady(gameId: string, uid: string, requestId: string) {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId);
      if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
      this.assertPlayer(r, uid);
      await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") throw new ChessDomainError("CHESS_GAME_FINISHED");
      if (r.game.status === "active") return this.publicState(r);
      if (r.game.status !== "waiting" || r.game.preparationPhase !== "colors" ||
          !r.boardReadyUids.has(r.game.whiteUid) || !r.boardReadyUids.has(r.game.blackUid)) {
        throw new ChessDomainError("CHESS_SERVER_RECOVERING");
      }
      r.readyUids.add(uid);
      const bothReady = r.readyUids.has(r.game.whiteUid) && r.readyUids.has(r.game.blackUid);
      if (!bothReady) return this.publicState(r);

      const before = this.snapshot(r);
      const readyBefore = new Set(r.readyUids);
      try {
        const now = iso();
        r.game.status = "active";
        r.game.preparationPhase = "colors";
        r.game.startedAt = now;
        r.game.updatedAt = now;
        r.game.revision += 1;
        this.remember(r.game, requestId);
        r.turnStartedMono = r.game.timeControl.kind === "clocked" ? performance.now() : null;
        await this.persistence.save(r.game);
      } catch (error) {
        this.restoreSnapshot(r, before);
        r.readyUids = readyBefore;
        throw error;
      }
      const state = this.publicState(r);
      this.broadcast({ kind: "state", state });
      return state;
    });
  }

  disconnect(gameId: string, uid: string) { const r = this.games.get(gameId); if (r) r.connectedUids.delete(uid); }

  async setBoardVisible(gameId: string, uid: string, visible: boolean) {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId);
      if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
      this.assertPlayer(r, uid);
      await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") {
        return { visible, awayDeadlineAt: null as number | null, finished: true };
      }
      // A recovered game can be paused while Render waits for two authenticated
      // clients to rejoin. A background reconnect must not clear an absence.
      if (!visible && r.game.status === "paused") {
        const existing = r.boardAwayByUid.get(uid);
        return { visible: false, awayDeadlineAt: existing ? Date.now() + Math.max(0, existing.deadlineMono - performance.now()) : null };
      }
      if (visible || (r.game.status !== "active" && r.game.status !== "waiting")) {
        const before = this.snapshot(r);
        try {
          this.returnFromAway(r, uid);
          if (before.boardAwayByUid.has(uid)) {
            this.persistAwayBudgets(r);
            await this.persistence.save(r.game);
          }
        } catch (error) { this.restoreSnapshot(r, before); throw error; }
        return { visible, awayDeadlineAt: null as number | null };
      }
      const existing = r.boardAwayByUid.get(uid);
      if (existing) {
        const remaining = Math.max(0, existing.deadlineMono - performance.now());
        return { visible: false, awayDeadlineAt: Date.now() + remaining };
      }
      // Before the game starts, a departure is still an authoritative absence.
      // Use the fixed preparation deadline as an upper bound; neither repeated
      // background signals nor reconnects can make the clock start over.
      const remainingAtLeaveMs = r.game.status === "waiting"
        ? (r.game.timeControl.kind === "clocked" ? r.game.timeControl.initialMs : WAITING_PREPARATION_TIMEOUT_MS)
        : this.remainingForUid(r, uid);
      if (remainingAtLeaveMs == null) return { visible: false, awayDeadlineAt: null as number | null };
      const before = this.snapshot(r);
      try {
        const leftAtMono = performance.now();
        const currentAllowance = awayAllowanceMs(r.game.timeControl.initialMs, remainingAtLeaveMs);
        const unused = r.awayRemainingByUid.get(uid);
        const allowance = unused == null ? currentAllowance : Math.min(unused, currentAllowance);
        if (unused == null) r.awayRemainingByUid.set(uid, allowance);
        const preparatoryCap = r.game.status === "waiting"
          ? Math.max(0, Date.parse(r.game.createdAt) + WAITING_PREPARATION_TIMEOUT_MS - Date.now())
          : Number.POSITIVE_INFINITY;
        const deadlineMono = leftAtMono + Math.max(0, Math.min(allowance, preparatoryCap));
        r.boardAwayByUid.set(uid, { leftAtMono, deadlineMono, remainingAtLeaveMs });
        this.persistAwayBudgets(r);
        await this.persistence.save(r.game); // one durable write per departure, never a per-second write
        return { visible: false, awayDeadlineAt: Date.now() + Math.max(0, deadlineMono - performance.now()) };
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
    });
  }

  private persistAwayBudgets(r: Runtime) {
    const nowMono = performance.now();
    const nowEpoch = Date.now();
    const budgets: NonNullable<PersistedGame["awayBudgetByUid"]> = {};
    for (const [uid, remainingMs] of r.awayRemainingByUid) {
      const pending = r.boardAwayByUid.get(uid);
      budgets[uid] = pending ? {
        remainingMs,
        leftAtEpochMs: nowEpoch + pending.leftAtMono - nowMono,
        deadlineEpochMs: nowEpoch + pending.deadlineMono - nowMono,
      } : { remainingMs };
    }
    r.game.awayBudgetByUid = budgets;
  }

  private returnFromAway(r: Runtime, uid: string) {
    const away = r.boardAwayByUid.get(uid);
    if (!away) return;
    const used = Math.max(0, performance.now() - away.leftAtMono);
    const prior = r.awayRemainingByUid.get(uid) ?? Math.max(0, away.deadlineMono - away.leftAtMono);
    r.awayRemainingByUid.set(uid, Math.max(0, prior - used));
    r.boardAwayByUid.delete(uid);
  }

  async move(gameId: string, uid: string, clientMoveId: string, expectedRevision: number, from: string, to: string, promotion?: string | null): Promise<MoveCommandAck> {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId); if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
      this.assertPlayer(r, uid); this.assertActive(r);
      if (r.game.recentRequestIds.includes(clientMoveId)) {
        return { clientMoveId, version: r.game.revision, duplicate: true };
      }
      if (expectedRevision !== r.game.revision) throw new ChessDomainError("CHESS_STATE_CONFLICT");
      // H15: verify the actual piece at the source square before consuming the
      // clock or changing state. UID -> color is immutable for the entire game.
      const color = r.game.whiteUid === uid ? "w" : "b";
      if (r.chess.turn() !== color) throw new ChessDomainError("CHESS_NOT_YOUR_TURN");
      const sourcePiece = /^[a-h][1-8]$/.test(from) ? r.chess.get(from as Parameters<Chess["get"]>[0]) : undefined;
      if (!sourcePiece || sourcePiece.color !== color) throw new ChessDomainError("CHESS_NOT_YOUR_TURN");
      if (promotion && !["q","r","b","n"].includes(promotion)) throw new ChessDomainError("CHESS_INVALID_PROMOTION");
      const expired = this.expiredTerminal(r);
      if (expired) {
        if (expired.kind === "away") await this.finishByAwayTimeout(r, expired.uid);
        else await this.finishByTimeout(r);
        const timedOutState = this.publicState(r);
        this.broadcast({ kind: "state", state: timedOutState });
        throw new ChessDomainError("CHESS_GAME_FINISHED");
      }
      const before = this.snapshot(r);
      let appliedMove: AppliedMove | null = null;
      try {
        this.consumeClock(r, color);
        let moved; try { moved = r.chess.move({ from, to, promotion: (promotion ?? undefined) as PieceSymbol | undefined }); }
        catch { throw new ChessDomainError("CHESS_ILLEGAL_MOVE"); }
        if (!moved) throw new ChessDomainError("CHESS_ILLEGAL_MOVE");
        // H14 invariant: even if the chess library or a recovery snapshot is
        // inconsistent, authenticated UID can never execute another side's move.
        if (moved.color !== color) throw new ChessDomainError("CHESS_NOT_YOUR_TURN");
        const captured = asCapturablePiece(moved.captured);
        appliedMove = {
          from, to, san: moved.san, color: moved.color as ChessColor, piece: moved.piece, flags: moved.flags,
          ...(captured ? { captured } : {}),
          ...(moved.promotion ? { promotion: moved.promotion as "q"|"r"|"b"|"n" } : {}),
        };
        if (captured) {
          const bucket = moved.color === "w" ? r.captures.byWhite : r.captures.byBlack;
          bucket[captured] += 1;
        }
        if (r.game.timeControl.kind === "clocked") {
          if (color === "w") r.game.whiteRemainingMs = (r.game.whiteRemainingMs ?? 0) + r.game.timeControl.incrementMs;
          else r.game.blackRemainingMs = (r.game.blackRemainingMs ?? 0) + r.game.timeControl.incrementMs;
        }
        r.game.fen = r.chess.fen(); r.game.pgn = r.chess.pgn(); r.game.turn = r.chess.turn();
        r.game.lastMove = { from, to, san: moved.san, ...(moved.promotion ? { promotion: moved.promotion as "q"|"r"|"b"|"n" } : {}) };
        r.game.drawOfferByUid = null; r.game.revision += 1; r.game.updatedAt = iso(); this.remember(r.game, clientMoveId);
        r.turnStartedMono = r.game.timeControl.kind === "clocked" ? performance.now() : null;
        const terminal = this.detectTerminal(r.chess); if (terminal) this.applyTerminal(r, terminal);
        if (r.game.status === "finished") await this.persistence.finish(r.game);
        else if (r.chess.history().length % CHECKPOINT_EVERY_PLY === 0) await this.persistence.save(r.game);
      } catch (e) { this.restoreSnapshot(r, before); throw e; }
      const state = this.publicState(r);
      const delta: MoveDelta = {
        gameId, clientMoveId, version: state.revision, ply: state.ply, move: appliedMove!, fen: state.fen, turn: state.turn,
        whiteRemainingMs: state.whiteRemainingMs, blackRemainingMs: state.blackRemainingMs, checkSquare: state.checkSquare,
        status: state.status, result: state.result, finishReason: state.finishReason, drawOfferByUid: state.drawOfferByUid,
        serverNowMs: state.serverNowMs, endedAt: state.endedAt,
      };
      this.broadcast({ kind: "move", state, delta });
      return { clientMoveId, version: state.revision };
    });
  }

  async resign(gameId: string, uid: string, requestId: string) { return this.simpleMutation(gameId, uid, requestId, (r) => {
    r.game.result = r.game.whiteUid === uid ? "black" : "white"; r.game.finishReason = "resignation"; this.finishRuntime(r);
  }); }
  async offerDraw(gameId: string, uid: string, requestId: string) { return this.simpleMutation(gameId, uid, requestId, (r) => { r.game.drawOfferByUid = uid; }); }
  async rejectDraw(gameId: string, uid: string, requestId: string) { return this.simpleMutation(gameId, uid, requestId, (r) => {
    if (r.game.drawOfferByUid && r.game.drawOfferByUid !== uid) r.game.drawOfferByUid = null;
  }); }
  async acceptDraw(gameId: string, uid: string, requestId: string) { return this.simpleMutation(gameId, uid, requestId, (r) => {
    if (!r.game.drawOfferByUid || r.game.drawOfferByUid === uid) throw new ChessDomainError("CHESS_INVALID_REQUEST");
    r.game.result = "draw"; r.game.finishReason = "draw"; this.finishRuntime(r);
  }); }

  private async simpleMutation(gameId: string, uid: string, requestId: string, mutate: (r: Runtime) => void) {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId); if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND"); this.assertPlayer(r, uid); this.assertActive(r);
      if (r.game.recentRequestIds.includes(requestId)) return this.publicState(r);
      const before = this.snapshot(r);
      try { mutate(r); r.game.revision += 1; r.game.updatedAt = iso(); this.remember(r.game, requestId);
        if (r.game.status === "finished") await this.persistence.finish(r.game); else await this.persistence.save(r.game);
      } catch (e) { this.restoreSnapshot(r, before); throw e; }
      const state = this.publicState(r); this.broadcast({ kind: "state", state }); return state;
    });
  }

  async state(gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId);
      if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
      this.assertPlayer(r, uid);
      await this.settleExpired(r);
      return this.publicState(r);
    });
  }

  /** Reconcile a persisted lock before reporting it to session recovery.
   * Called even when there is NO live Socket and Render has restarted. */
  async recover(familyId: string, gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = await this.restore(familyId, gameId);
      this.assertPlayer(r, uid);
      await this.settleExpired(r);
      return this.publicState(r);
    });
  }

  private consumeClock(r: Runtime, color: ChessColor) {
    if (r.game.timeControl.kind !== "clocked" || r.turnStartedMono == null) return;
    const elapsed = Math.max(0, performance.now() - r.turnStartedMono);
    if (color === "w") r.game.whiteRemainingMs = Math.max(0, (r.game.whiteRemainingMs ?? 0) - elapsed);
    else r.game.blackRemainingMs = Math.max(0, (r.game.blackRemainingMs ?? 0) - elapsed);
    if ((color === "w" ? r.game.whiteRemainingMs : r.game.blackRemainingMs) === 0) throw new ChessDomainError("CHESS_GAME_FINISHED");
  }

  /** Reconciliation is idempotent and invoked on live ticks, recovery and
   * authoritative state reads. No deadline derives from a reconnect timestamp. */
  private async settleExpired(r: Runtime): Promise<boolean> {
    if (r.game.status === "waiting") {
      const created = Date.parse(r.game.createdAt);
      const preparationExpired = !Number.isFinite(created) || Date.now() >= created + WAITING_PREPARATION_TIMEOUT_MS;
      const awayExpired = [...r.boardAwayByUid.entries()]
        .filter(([, budget]) => performance.now() >= budget.deadlineMono)
        .sort((a, b) => a[1].deadlineMono - b[1].deadlineMono)[0];
      if (!preparationExpired && !awayExpired) return false;
      // A server-observed departure loses at the non-renewable preparation
      // deadline. If no departure was observed, cancel a preparation failure
      // rather than fabricate a competitive loss against an innocent player.
      const away = awayExpired ?? [...r.boardAwayByUid.entries()]
        .sort((a, b) => a[1].deadlineMono - b[1].deadlineMono)[0];
      if (away) await this.finishByAwayTimeout(r, away[0]);
      else {
        const before = this.snapshot(r);
        try {
          this.finishRuntime(r);
          r.game.status = "cancelled";
          r.game.finishReason = "abandoned";
          r.game.revision += 1;
          r.game.updatedAt = iso();
          await this.persistence.finish(r.game);
        } catch (error) { this.restoreSnapshot(r, before); throw error; }
      }
      this.broadcast({ kind: "state", state: this.publicState(r) });
      return true;
    }
    const expired = this.expiredTerminal(r);
    if (!expired) return false;
    if (expired.kind === "away") await this.finishByAwayTimeout(r, expired.uid);
    else await this.finishByTimeout(r);
    this.broadcast({ kind: "state", state: this.publicState(r) });
    return true;
  }

  private async checkTimeouts() {
    for (const [gameId, r] of this.games) {
      const created = Date.parse(r.game.createdAt);
      const expiredWaiting = r.game.status === "waiting" &&
        (!Number.isFinite(created) || Date.now() >= created + WAITING_PREPARATION_TIMEOUT_MS ||
         [...r.boardAwayByUid.values()].some((away) => performance.now() >= away.deadlineMono));
      if (!expiredWaiting && !this.expiredTerminal(r)) continue;
      await this.enqueue(gameId, async () => { await this.settleExpired(r); });
    }
  }

  private normalClockDeadlineMono(r: Runtime) {
    if (r.game.status !== "active" || r.game.timeControl.kind !== "clocked" || r.turnStartedMono == null) return null;
    const color = r.chess.turn() as ChessColor;
    const remaining = color === "w" ? r.game.whiteRemainingMs : r.game.blackRemainingMs;
    return remaining == null ? null : r.turnStartedMono + remaining;
  }

  private expiredTerminal(r: Runtime): { kind: "clock" } | { kind: "away"; uid: string } | null {
    if (r.game.status !== "active" && r.game.status !== "paused") return null;
    const now = performance.now();
    const candidates: Array<{ deadline: number; kind: "clock" | "away"; uid?: string }> = [];
    const normalDeadline = this.normalClockDeadlineMono(r);
    if (normalDeadline != null && now >= normalDeadline) candidates.push({ deadline: normalDeadline, kind: "clock" });
    for (const [uid, away] of r.boardAwayByUid) {
      if (now >= away.deadlineMono) candidates.push({ deadline: away.deadlineMono, kind: "away", uid });
    }
    candidates.sort((a, b) => a.deadline - b.deadline);
    const first = candidates[0];
    if (!first) return null;
    return first.kind === "away" && first.uid ? { kind: "away", uid: first.uid } : { kind: "clock" };
  }

  private clockExpired(r: Runtime) {
    const deadline = this.normalClockDeadlineMono(r);
    return deadline != null && performance.now() >= deadline;
  }

  private remainingForUid(r: Runtime, uid: string) {
    if (r.game.timeControl.kind !== "clocked") return null;
    const color: ChessColor = r.game.whiteUid === uid ? "w" : "b";
    let remaining = color === "w" ? r.game.whiteRemainingMs : r.game.blackRemainingMs;
    if (remaining == null) return null;
    if (r.game.status === "active" && r.turnStartedMono != null && r.chess.turn() === color) {
      remaining = Math.max(0, remaining - Math.max(0, performance.now() - r.turnStartedMono));
    }
    return remaining;
  }

  private async finishByTimeout(r: Runtime) {
    const before = this.snapshot(r);
    try {
      const flaggedColor = r.chess.turn() as ChessColor;
      if (flaggedColor === "w") r.game.whiteRemainingMs = 0; else r.game.blackRemainingMs = 0;
      const winnerColor = otherColor(flaggedColor);
      r.game.result = this.hasMatingPossibility(r.chess, winnerColor) ? (winnerColor === "w" ? "white" : "black") : "draw";
      r.game.finishReason = "timeout";
      r.game.revision += 1;
      r.game.updatedAt = iso();
      this.finishRuntime(r);
      await this.persistence.finish(r.game);
    } catch (error) {
      this.restoreSnapshot(r, before);
      throw error;
    }
  }

  private async finishByAwayTimeout(r: Runtime, uid: string) {
    const before = this.snapshot(r);
    try {
      const loserColor: ChessColor = r.game.whiteUid === uid ? "w" : "b";
      const winnerColor = otherColor(loserColor);
      r.game.result = winnerColor === "w" ? "white" : "black";
      r.game.finishReason = "away_timeout";
      r.game.revision += 1;
      r.game.updatedAt = iso();
      this.finishRuntime(r);
      await this.persistence.finish(r.game);
    } catch (error) {
      this.restoreSnapshot(r, before);
      throw error;
    }
  }

  private detectTerminal(chess: Chess): { result: "white"|"black"|"draw"; reason: FinishReason } | null {
    if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "black" : "white", reason: "checkmate" };
    if (chess.isStalemate()) return { result: "draw", reason: "stalemate" };
    if (chess.isInsufficientMaterial()) return { result: "draw", reason: "insufficient_material" };
    if (chess.isThreefoldRepetition()) return { result: "draw", reason: "threefold_repetition" };
    if (chess.isDrawByFiftyMoves()) return { result: "draw", reason: "fifty_move_rule" };
    return null;
  }
  private applyTerminal(r: Runtime, t: {result:"white"|"black"|"draw";reason:FinishReason}) { r.game.result=t.result; r.game.finishReason=t.reason; this.finishRuntime(r); }
  private finishRuntime(r: Runtime) {
    r.game.status="finished"; r.game.endedAt=iso(); r.game.drawOfferByUid=null; r.turnStartedMono=null; r.boardAwayByUid.clear(); r.awayRemainingByUid.clear();
    const gameId = r.game.id;
    const previous = this.finishedEvictionTimers.get(gameId);
    if (previous) clearTimeout(previous);
    const timer = setTimeout(() => {
      const current = this.games.get(gameId);
      if (current === r && ["finished", "cancelled"].includes(current.game.status)) this.games.delete(gameId);
      this.finishedEvictionTimers.delete(gameId);
    }, FINISHED_RUNTIME_TTL_MS);
    timer.unref();
    this.finishedEvictionTimers.set(gameId, timer);
  }
  private hasMatingPossibility(chess: Chess, color: ChessColor) {
    const pieces: PieceSymbol[] = []; const opponent: PieceSymbol[] = [];
    for (const row of chess.board()) for (const piece of row) if (piece) (piece.color === color ? pieces : opponent).push(piece.type);
    const nonKing = pieces.filter((p) => p !== "k"); if (!nonKing.length) return false;
    if (nonKing.some((p) => p === "q" || p === "r" || p === "p")) return true;
    if (nonKing.length >= 2) return true;
    return opponent.some((p) => p !== "k");
  }
  private assertPlayer(r: Runtime, uid: string) { if (uid !== r.game.whiteUid && uid !== r.game.blackUid) throw new ChessDomainError("CHESS_NOT_PLAYER"); }
  private assertActive(r: Runtime) { if (r.game.status === "finished") throw new ChessDomainError("CHESS_GAME_FINISHED"); if (r.game.status !== "active") throw new ChessDomainError("CHESS_SERVER_RECOVERING"); }
  private remember(g: PersistedGame, id: string) { g.recentRequestIds = [...g.recentRequestIds.filter((v) => v !== id), id].slice(-24); }
  private snapshot(r: Runtime) { return { game: structuredClone(r.game), pgn: r.chess.pgn(), turnStartedMono: r.turnStartedMono, readyUids: new Set(r.readyUids), boardReadyUids: new Set(r.boardReadyUids), awayRemainingByUid: new Map(r.awayRemainingByUid), captures: cloneCaptureSummary(r.captures), boardAwayByUid: new Map<string, AwayBudget>([...r.boardAwayByUid].map(([uid, budget]) => [uid, { ...budget }] as [string, AwayBudget])) }; }
  private restoreSnapshot(r: Runtime, s: {game:PersistedGame;pgn:string;turnStartedMono:number|null;readyUids:Set<string>;boardReadyUids:Set<string>;awayRemainingByUid:Map<string,number>;captures:CaptureSummary;boardAwayByUid:Map<string,AwayBudget>}) { r.game=s.game; const c=new Chess(); if(s.pgn)c.loadPgn(s.pgn); r.chess=c; r.turnStartedMono=s.turnStartedMono; r.readyUids=new Set(s.readyUids); r.boardReadyUids=new Set(s.boardReadyUids); r.awayRemainingByUid=new Map(s.awayRemainingByUid); r.captures=cloneCaptureSummary(s.captures); r.boardAwayByUid=new Map<string, AwayBudget>([...s.boardAwayByUid].map(([uid, budget]) => [uid, { ...budget }] as [string, AwayBudget])); }

  private publicState(r: Runtime): PublicGameState {
    let white = r.game.whiteRemainingMs, black = r.game.blackRemainingMs;
    if (r.game.status === "active" && r.game.timeControl.kind === "clocked" && r.turnStartedMono != null) {
      const elapsed = Math.max(0, performance.now() - r.turnStartedMono);
      if (r.chess.turn() === "w" && white != null) white = Math.max(0, white - elapsed);
      if (r.chess.turn() === "b" && black != null) black = Math.max(0, black - elapsed);
    }
    // Clients calculate selection hints locally. Only the built-in test bot
    // needs a complete move list from PublicGameState, so human-v-human games
    // avoid enumerating every legal move on the server hot path.
    const legalMoves = r.game.status === "active" && !!r.game.testBotUid
      ? (r.chess.moves({ verbose: true }) as Array<{from:string;to:string;promotion?:string}>).map((m) => ({ from:m.from, to:m.to, ...(m.promotion ? {promotion:m.promotion as "q"|"r"|"b"|"n"}: {}) }))
      : [];
    const checkSquare = r.chess.isCheck() ? this.findKingSquare(r.chess, r.chess.turn()) : null;
    const recentHistory = r.chess.history({ verbose: true }) as Array<{ before?: string }>;
    // The client can animate just the last *proven* move after a multi-ply
    // reconnect gap. Never ask it to guess a predecessor from final FEN.
    const lastMoveBeforeFen = recentHistory.length > 0
      ? recentHistory[recentHistory.length - 1].before ?? null : null;
    const { id, playerUids, recentRequestIds, awayBudgetByUid, updatedAt, ...rest } = r.game;
    return { ...rest,
      // Colors are committed privately when game is created, but only released
      // after both rendered boards are confirmed ready.
      whiteUid: r.game.status === "waiting" && r.game.preparationPhase !== "colors" ? "" : r.game.whiteUid,
      blackUid: r.game.status === "waiting" && r.game.preparationPhase !== "colors" ? "" : r.game.blackUid,
      preparationPhase: r.game.status === "waiting" ? (r.game.preparationPhase ?? "board") : "play",
      gameId:id, ply:recentHistory.length, lastMoveBeforeFen, whiteRemainingMs:white, blackRemainingMs:black, legalMoves, checkSquare, captureSummary: cloneCaptureSummary(r.captures), serverNowMs:Date.now() };
  }
  private findKingSquare(chess: Chess, color: Color): string | null { const board=chess.board(); for(let row=0;row<board.length;row++) for(let file=0;file<board[row].length;file++){ const p=board[row][file]; if(p?.type==="k"&&p.color===color) return `${"abcdefgh"[file]}${8-row}`; } return null; }
}
