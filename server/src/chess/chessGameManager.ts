import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Chess, type Color, type PieceSymbol } from "chess.js";
import { ChessDomainError, type AppliedMove, type ChessColor, type ChessTimeControl, type FinishReason, type MoveDelta, type MoveCommandAck, type PersistedGame, type PublicGameState } from "./chessTypes.js";
import { ChessPersistenceService } from "./chessPersistenceService.js";

type Runtime = { game: PersistedGame; chess: Chess; turnStartedMono: number | null; connectedUids: Set<string> };
type Broadcast = (event: { kind: "state"; state: PublicGameState } | { kind: "move"; state: PublicGameState; delta: MoveDelta }) => void;
const iso = () => new Date().toISOString();
const otherColor = (c: ChessColor): ChessColor => c === "w" ? "b" : "w";
const CHECKPOINT_EVERY_PLY = 4;

export class ChessGameManager {
  private games = new Map<string, Runtime>();
  private queues = new Map<string, Promise<unknown>>();
  private timer: NodeJS.Timeout;
  constructor(private persistence: ChessPersistenceService, private broadcast: Broadcast) {
    this.timer = setInterval(() => { void this.checkTimeouts(); }, 300);
    this.timer.unref();
  }

  private enqueue<T>(gameId: string, task: () => Promise<T>): Promise<T> {
    const previous = this.queues.get(gameId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(task);
    const tracked = next.finally(() => { if (this.queues.get(gameId) === tracked) this.queues.delete(gameId); });
    this.queues.set(gameId, tracked);
    return next;
  }

  async create(familyId: string, uidA: string, uidB: string, timeControl: ChessTimeControl, createRequestId?: string, options?: { testBotUid?: string | null }) {
    const gameId = randomUUID();
    const whiteUid = Math.random() < 0.5 ? uidA : uidB; const blackUid = whiteUid === uidA ? uidB : uidA;
    const chess = new Chess(); const now = iso();
    const game: PersistedGame = {
      id: gameId, familyId, whiteUid, blackUid, playerUids: [whiteUid, blackUid], status: "active",
      fen: chess.fen(), pgn: chess.pgn(), turn: "w", revision: 1,
      whiteRemainingMs: timeControl.kind === "clocked" ? timeControl.initialMs : null,
      blackRemainingMs: timeControl.kind === "clocked" ? timeControl.initialMs : null,
      timeControl, result: null, finishReason: null, lastMove: null, drawOfferByUid: null,
      recentRequestIds: createRequestId ? [createRequestId] : [], testBotUid: options?.testBotUid ?? null, isTestGame: !!options?.testBotUid, createdAt: now, startedAt: now, endedAt: null, updatedAt: now,
    };
    await this.persistence.createWithLocks(game);
    const runtime: Runtime = { game, chess, turnStartedMono: timeControl.kind === "clocked" ? performance.now() : null, connectedUids: new Set(options?.testBotUid ? [options.testBotUid] : []) };
    this.games.set(gameId, runtime);
    return this.publicState(runtime);
  }

  async restore(familyId: string, gameId: string) {
    const existing = this.games.get(gameId); if (existing) return existing;
    const stored = await this.persistence.load(familyId, gameId);
    if (!stored) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
    const chess = new Chess();
    if (stored.pgn) chess.loadPgn(stored.pgn); else chess.load(stored.fen);
    if (stored.status === "active") {
      stored.status = "paused"; stored.revision += 1; stored.updatedAt = iso();
      await this.persistence.save(stored);
    }
    const runtime: Runtime = { game: stored, chess, turnStartedMono: null, connectedUids: new Set(stored.testBotUid ? [stored.testBotUid] : []) };
    this.games.set(gameId, runtime); return runtime;
  }

  async join(familyId: string, gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = await this.restore(familyId, gameId); this.assertPlayer(r, uid); r.connectedUids.add(uid);
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

  disconnect(gameId: string, uid: string) { const r = this.games.get(gameId); if (r) r.connectedUids.delete(uid); }

  async move(gameId: string, uid: string, clientMoveId: string, expectedRevision: number, from: string, to: string, promotion?: string | null): Promise<MoveCommandAck> {
    return this.enqueue(gameId, async () => {
      const r = this.games.get(gameId); if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND");
      this.assertPlayer(r, uid); this.assertActive(r);
      if (r.game.recentRequestIds.includes(clientMoveId)) {
        return { clientMoveId, version: r.game.revision, duplicate: true };
      }
      if (expectedRevision !== r.game.revision) throw new ChessDomainError("CHESS_STATE_CONFLICT");
      const color = r.game.whiteUid === uid ? "w" : "b"; if (r.chess.turn() !== color) throw new ChessDomainError("CHESS_NOT_YOUR_TURN");
      if (promotion && !["q","r","b","n"].includes(promotion)) throw new ChessDomainError("CHESS_INVALID_PROMOTION");
      if (this.clockExpired(r)) {
        await this.finishByTimeout(r);
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
        appliedMove = {
          from, to, san: moved.san, color: moved.color as ChessColor, piece: moved.piece, flags: moved.flags,
          ...(moved.captured ? { captured: moved.captured } : {}),
          ...(moved.promotion ? { promotion: moved.promotion as "q"|"r"|"b"|"n" } : {}),
        };
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

  async state(gameId: string, uid: string) { const r = this.games.get(gameId); if (!r) throw new ChessDomainError("CHESS_GAME_NOT_FOUND"); this.assertPlayer(r, uid); return this.publicState(r); }

  private consumeClock(r: Runtime, color: ChessColor) {
    if (r.game.timeControl.kind !== "clocked" || r.turnStartedMono == null) return;
    const elapsed = Math.max(0, performance.now() - r.turnStartedMono);
    if (color === "w") r.game.whiteRemainingMs = Math.max(0, (r.game.whiteRemainingMs ?? 0) - elapsed);
    else r.game.blackRemainingMs = Math.max(0, (r.game.blackRemainingMs ?? 0) - elapsed);
    if ((color === "w" ? r.game.whiteRemainingMs : r.game.blackRemainingMs) === 0) throw new ChessDomainError("CHESS_GAME_FINISHED");
  }

  private async checkTimeouts() {
    for (const [gameId, r] of this.games) {
      if (!this.clockExpired(r)) continue;
      await this.enqueue(gameId, async () => {
        // Re-check after entering the per-game queue. A move may have changed the
        // turn/deadline while this timeout task was waiting behind that move.
        if (!this.clockExpired(r)) return;
        await this.finishByTimeout(r);
        this.broadcast({ kind: "state", state: this.publicState(r) });
      });
    }
  }

  private clockExpired(r: Runtime) {
    if (r.game.status !== "active" || r.game.timeControl.kind !== "clocked" || r.turnStartedMono == null) return false;
    const color = r.chess.turn() as ChessColor;
    const remaining = color === "w" ? r.game.whiteRemainingMs : r.game.blackRemainingMs;
    return remaining != null && performance.now() - r.turnStartedMono >= remaining;
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

  private detectTerminal(chess: Chess): { result: "white"|"black"|"draw"; reason: FinishReason } | null {
    if (chess.isCheckmate()) return { result: chess.turn() === "w" ? "black" : "white", reason: "checkmate" };
    if (chess.isStalemate()) return { result: "draw", reason: "stalemate" };
    if (chess.isInsufficientMaterial()) return { result: "draw", reason: "insufficient_material" };
    if (chess.isThreefoldRepetition()) return { result: "draw", reason: "threefold_repetition" };
    if (chess.isDrawByFiftyMoves()) return { result: "draw", reason: "fifty_move_rule" };
    return null;
  }
  private applyTerminal(r: Runtime, t: {result:"white"|"black"|"draw";reason:FinishReason}) { r.game.result=t.result; r.game.finishReason=t.reason; this.finishRuntime(r); }
  private finishRuntime(r: Runtime) { r.game.status="finished"; r.game.endedAt=iso(); r.game.drawOfferByUid=null; r.turnStartedMono=null; }
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
  private snapshot(r: Runtime) { return { game: structuredClone(r.game), pgn: r.chess.pgn(), turnStartedMono: r.turnStartedMono }; }
  private restoreSnapshot(r: Runtime, s: {game:PersistedGame;pgn:string;turnStartedMono:number|null}) { r.game=s.game; const c=new Chess(); if(s.pgn)c.loadPgn(s.pgn); r.chess=c; r.turnStartedMono=s.turnStartedMono; }

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
    const { id, playerUids, recentRequestIds, updatedAt, ...rest } = r.game;
    return { ...rest, gameId:id, ply:r.chess.history().length, whiteRemainingMs:white, blackRemainingMs:black, legalMoves, checkSquare, serverNowMs:Date.now() };
  }
  private findKingSquare(chess: Chess, color: Color): string | null { const board=chess.board(); for(let row=0;row<board.length;row++) for(let file=0;file<board[row].length;file++){ const p=board[row][file]; if(p?.type==="k"&&p.color===color) return `${"abcdefgh"[file]}${8-row}`; } return null; }
}
