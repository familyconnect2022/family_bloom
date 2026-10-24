import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { createInitialXiangqiState, playXiangqiMove } from "./xiangqiEngine.js";
import {
  XiangqiDomainError, type PersistedXiangqiGame, type PublicXiangqiGameState,
  type XiangqiColor, type XiangqiMoveAck, type XiangqiMoveDelta, type XiangqiTimeControl,
} from "./xiangqiTypes.js";
import { XiangqiPersistenceService } from "./xiangqiPersistenceService.js";

// Xiangqi owns its own manager / clocks / readiness / lifecycle. Nothing here
// imports or mutates Chess runtime state.
const WAITING_TIMEOUT_MS = 180_000;
const FINISHED_TTL_MS = 30 * 60_000;
const CHECKPOINT_EVERY_MOVE = 4;
const iso = () => new Date().toISOString();
const other = (color: XiangqiColor): XiangqiColor => color === "red" ? "black" : "red";
type AwayBudget = { leftAtMono: number; deadlineMono: number; remainingAtLeaveMs: number };
type Runtime = {
  game: PersistedXiangqiGame;
  turnStartedMono: number | null;
  connectedUids: Set<string>;
  boardReadyUids: Set<string>;
  readyUids: Set<string>;
  boardAwayByUid: Map<string, AwayBudget>;
  awayRemainingByUid: Map<string, number>;
};
type Broadcast = (event: { kind: "state"; state: PublicXiangqiGameState } |
  { kind: "move"; state: PublicXiangqiGameState; delta: XiangqiMoveDelta }) => void;

/** Not transferable between Chess and Xiangqi: independent Xiangqi time rules. */
export function xiangqiAwayAllowanceMs(initialMs: number | null, remainingMs: number): number {
  if (initialMs === 600_000) return remainingMs > 120_000 ? remainingMs / 2 : remainingMs;
  if (initialMs === 300_000) return remainingMs > 60_000 ? remainingMs / 2 : remainingMs;
  return remainingMs;
}

export class XiangqiGameManager {
  private games = new Map<string, Runtime>();
  private queues = new Map<string, Promise<unknown>>();
  private evictions = new Map<string, NodeJS.Timeout>();
  private timer: NodeJS.Timeout;
  constructor(private persistence: XiangqiPersistenceService, private broadcast: Broadcast) {
    this.timer = setInterval(() => {
      void this.checkTimeouts().catch(error => console.error("[xiangqi] deadline sweep failed", error));
    }, 300);
    this.timer.unref();
  }

  private enqueue<T>(gameId: string, task: () => Promise<T>): Promise<T> {
    const next = (this.queues.get(gameId) ?? Promise.resolve()).catch(() => undefined).then(task);
    // Never store a rejected finally() promise as the queue tail: it creates
    // unhandled rejections and eventually stalls all commands for this game.
    const tracked = next.then(
      () => { if (this.queues.get(gameId) === tracked) this.queues.delete(gameId); },
      () => { if (this.queues.get(gameId) === tracked) this.queues.delete(gameId); },
    );
    this.queues.set(gameId, tracked);
    return next;
  }
  private requireRuntime(gameId: string): Runtime {
    const runtime = this.games.get(gameId);
    if (!runtime) throw new XiangqiDomainError("XIANGQI_GAME_NOT_FOUND");
    return runtime;
  }
  private assertPlayer(r: Runtime, uid: string) {
    if (r.game.redUid !== uid && r.game.blackUid !== uid) throw new XiangqiDomainError("XIANGQI_NOT_PLAYER");
  }
  private assertActive(r: Runtime) {
    if (r.game.status === "finished" || r.game.status === "cancelled") throw new XiangqiDomainError("XIANGQI_GAME_FINISHED");
    if (r.game.status !== "active") throw new XiangqiDomainError("XIANGQI_SERVER_RECOVERING");
  }
  private remember(g: PersistedXiangqiGame, requestId: string) {
    g.recentRequestIds = [...g.recentRequestIds.filter(id => id !== requestId), requestId].slice(-24);
  }
  private snapshot(r: Runtime) {
    return {
      game: structuredClone(r.game), turnStartedMono: r.turnStartedMono,
      boardReadyUids: new Set(r.boardReadyUids), readyUids: new Set(r.readyUids),
      boardAwayByUid: new Map([...r.boardAwayByUid].map(([k, v]) => [k, {...v}] as [string, AwayBudget])),
      awayRemainingByUid: new Map(r.awayRemainingByUid),
    };
  }
  private restoreSnapshot(r: Runtime, before: ReturnType<XiangqiGameManager["snapshot"]>) {
    r.game = before.game; r.turnStartedMono = before.turnStartedMono;
    r.boardReadyUids = before.boardReadyUids; r.readyUids = before.readyUids;
    r.boardAwayByUid = before.boardAwayByUid; r.awayRemainingByUid = before.awayRemainingByUid;
  }

  async create(familyId: string, uidA: string, uidB: string, timeControl: XiangqiTimeControl,
    requestId?: string, options?: { testBotUid?: string | null; redUid?: string; blackUid?: string }) {
    const explicitlyColored = options?.redUid && options?.blackUid &&
      new Set([options.redUid, options.blackUid]).size === 2 &&
      [options.redUid, options.blackUid].every(uid => uid === uidA || uid === uidB);
    if ((options?.redUid || options?.blackUid) && !explicitlyColored)
      throw new XiangqiDomainError("XIANGQI_INVALID_REQUEST", "INVITE_COLOR_MISMATCH");
    const redUid = explicitlyColored ? options!.redUid! : (Math.random() < .5 ? uidA : uidB);
    const blackUid = explicitlyColored ? options!.blackUid! : (redUid === uidA ? uidB : uidA);
    const id = randomUUID(); const now = iso(); const bot = options?.testBotUid ?? null;
    const game: PersistedXiangqiGame = {
      id, familyId, redUid, blackUid, playerUids: [redUid, blackUid],
      status: "waiting", preparationPhase: "board", board: createInitialXiangqiState(), revision: 1,
      redRemainingMs: timeControl.kind === "clocked" ? timeControl.initialMs : null,
      blackRemainingMs: timeControl.kind === "clocked" ? timeControl.initialMs : null,
      timeControl, result: null, finishReason: null, drawOfferByUid: null, awayBudgetByUid: {},
      recentRequestIds: requestId ? [requestId] : [], readyUids: [], testBotUid: bot, isTestGame: !!bot,
      createdAt: now, startedAt: null, endedAt: null, updatedAt: now,
    };
    await this.persistence.createWithLocks(game);
    const runtime: Runtime = {
      game, turnStartedMono: null, connectedUids: new Set(bot ? [bot] : []),
      boardReadyUids: new Set(bot ? [bot] : []), readyUids: new Set(bot ? [bot] : []),
      boardAwayByUid: new Map(), awayRemainingByUid: new Map(),
    };
    this.games.set(id, runtime);
    return this.publicState(runtime);
  }

  async restore(familyId: string, gameId: string) {
    const existing = this.games.get(gameId); if (existing) return existing;
    const stored = await this.persistence.load(familyId, gameId);
    if (!stored) throw new XiangqiDomainError("XIANGQI_GAME_NOT_FOUND");
    const nowMono = performance.now(), nowEpoch = Date.now();
    const boardAwayByUid = new Map<string, AwayBudget>();
    const awayRemainingByUid = new Map<string, number>();
    for (const [uid, budget] of Object.entries(stored.awayBudgetByUid ?? {})) {
      if (uid !== stored.redUid && uid !== stored.blackUid) continue;
      awayRemainingByUid.set(uid, Math.max(0, budget.remainingMs));
      if (typeof budget.leftAtEpochMs === "number" && typeof budget.deadlineEpochMs === "number") {
        boardAwayByUid.set(uid, {
          leftAtMono: nowMono + budget.leftAtEpochMs - nowEpoch,
          deadlineMono: nowMono + budget.deadlineEpochMs - nowEpoch,
          remainingAtLeaveMs: Math.max(0, budget.remainingMs),
        });
      }
    }
    // Do not restart the turn clock after Render restart. The away deadline
    // remains absolute and can still expire while runtime is paused.
    if (stored.status === "active") {
      stored.status = "paused"; stored.revision++; stored.updatedAt = iso();
      await this.persistence.save(stored);
    }
    const bot = stored.testBotUid;
    const pastBoardStage = stored.status !== "waiting" || stored.preparationPhase === "colors";
    const r: Runtime = {
      game: stored, turnStartedMono: null, connectedUids: new Set(bot ? [bot] : []),
      boardReadyUids: new Set(pastBoardStage ? [stored.redUid, stored.blackUid] : (bot ? [bot] : [])),
      readyUids: new Set(stored.readyUids ?? (bot ? [bot] : [])), boardAwayByUid, awayRemainingByUid,
    };
    this.games.set(gameId, r);
    // A persisted lock cannot be exposed to recovery without reconciling any
    // deadline that expired while the Node process was offline.
    await this.settleExpired(r);
    return r;
  }

  async join(familyId: string, gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = await this.restore(familyId, gameId); this.assertPlayer(r, uid);
      await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") return this.publicState(r);
      r.connectedUids.add(uid);
      if (r.game.status === "paused" && r.connectedUids.has(r.game.redUid) && r.connectedUids.has(r.game.blackUid)) {
        const before = this.snapshot(r);
        try {
          r.game.status = "active"; r.game.revision++; r.game.updatedAt = iso();
          r.turnStartedMono = r.game.timeControl.kind === "clocked" ? performance.now() : null;
          await this.persistence.save(r.game);
        } catch (error) { this.restoreSnapshot(r, before); throw error; }
        this.broadcast({ kind: "state", state: this.publicState(r) });
      }
      return this.publicState(r);
    });
  }

  disconnect(gameId: string, uid: string) { this.games.get(gameId)?.connectedUids.delete(uid); }

  async markBoardReady(gameId: string, uid: string, requestId: string) {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r, uid); await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") throw new XiangqiDomainError("XIANGQI_GAME_FINISHED");
      if (r.game.status !== "waiting" || r.game.preparationPhase === "colors") return this.publicState(r);
      r.boardReadyUids.add(uid);
      if (!r.boardReadyUids.has(r.game.redUid) || !r.boardReadyUids.has(r.game.blackUid)) return this.publicState(r);
      const before = this.snapshot(r);
      try {
        r.game.preparationPhase = "colors"; r.game.revision++; r.game.updatedAt = iso();
        this.remember(r.game, requestId); await this.persistence.save(r.game);
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
      const state = this.publicState(r); this.broadcast({ kind: "state", state }); return state;
    });
  }
  async markReady(gameId: string, uid: string, requestId: string) {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r, uid); await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled") throw new XiangqiDomainError("XIANGQI_GAME_FINISHED");
      if (r.game.status === "active") return this.publicState(r);
      if (r.game.status !== "waiting" || r.game.preparationPhase !== "colors" ||
        !r.boardReadyUids.has(r.game.redUid) || !r.boardReadyUids.has(r.game.blackUid))
        throw new XiangqiDomainError("XIANGQI_SERVER_RECOVERING");
      r.readyUids.add(uid);
      if (!r.readyUids.has(r.game.redUid) || !r.readyUids.has(r.game.blackUid)) {
        r.game.readyUids = [...r.readyUids]; await this.persistence.save(r.game);
        return this.publicState(r);
      }
      const before = this.snapshot(r);
      try {
        const now = iso(); r.game.status = "active"; r.game.readyUids=[...r.readyUids]; r.game.startedAt = now; r.game.updatedAt = now;
        r.game.revision++; this.remember(r.game, requestId);
        r.turnStartedMono = r.game.timeControl.kind === "clocked" ? performance.now() : null;
        await this.persistence.save(r.game);
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
      const state = this.publicState(r); this.broadcast({ kind: "state", state }); return state;
    });
  }

  async state(gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r, uid);
      await this.settleExpired(r); return this.publicState(r);
    });
  }
  async recover(familyId: string, gameId: string, uid: string) {
    return this.enqueue(gameId, async () => {
      const r = await this.restore(familyId, gameId); this.assertPlayer(r, uid);
      await this.settleExpired(r); return this.publicState(r);
    });
  }

  private persistAway(r: Runtime) {
    const nowMono = performance.now(), nowEpoch = Date.now();
    const record: NonNullable<PersistedXiangqiGame["awayBudgetByUid"]> = {};
    for (const [uid, remainingMs] of r.awayRemainingByUid) {
      const active = r.boardAwayByUid.get(uid);
      record[uid] = active ? {
        remainingMs,
        leftAtEpochMs: nowEpoch + active.leftAtMono - nowMono,
        deadlineEpochMs: nowEpoch + active.deadlineMono - nowMono,
      } : { remainingMs };
    }
    r.game.awayBudgetByUid = record;
  }
  private returnFromAway(r: Runtime, uid: string) {
    const current = r.boardAwayByUid.get(uid); if (!current) return;
    const consumed = Math.max(0, performance.now() - current.leftAtMono);
    const prior = r.awayRemainingByUid.get(uid) ?? current.deadlineMono - current.leftAtMono;
    r.awayRemainingByUid.set(uid, Math.max(0, prior - consumed));
    r.boardAwayByUid.delete(uid);
  }
  async setBoardVisible(gameId: string, uid: string, visible: boolean) {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r, uid); await this.settleExpired(r);
      if (r.game.status === "finished" || r.game.status === "cancelled")
        return { visible, awayDeadlineAt: null as number | null, finished: true };
      if (!visible && r.game.status === "paused") {
        const pending = r.boardAwayByUid.get(uid);
        return { visible: false, awayDeadlineAt: pending ? Date.now() + pending.deadlineMono - performance.now() : null };
      }
      if (visible || (r.game.status !== "waiting" && r.game.status !== "active")) {
        const before = this.snapshot(r);
        try {
          this.returnFromAway(r, uid);
          if (before.boardAwayByUid.has(uid)) { this.persistAway(r); await this.persistence.save(r.game); }
        } catch (error) { this.restoreSnapshot(r, before); throw error; }
        return { visible, awayDeadlineAt: null as number | null };
      }
      const existing = r.boardAwayByUid.get(uid);
      if (existing) return { visible: false, awayDeadlineAt: Date.now() + Math.max(0, existing.deadlineMono - performance.now()) };
      const remaining = r.game.status === "waiting"
        ? (r.game.timeControl.kind === "clocked" ? r.game.timeControl.initialMs : WAITING_TIMEOUT_MS)
        : this.remainingForUid(r, uid);
      if (remaining == null) return { visible: false, awayDeadlineAt: null as number | null };
      const before = this.snapshot(r);
      try {
        const leftAtMono = performance.now();
        const currentAllowance = xiangqiAwayAllowanceMs(r.game.timeControl.initialMs, remaining);
        const unused = r.awayRemainingByUid.get(uid);
        const allowance = unused == null ? currentAllowance : Math.min(unused, currentAllowance);
        if (unused == null) r.awayRemainingByUid.set(uid, allowance);
        const preparationCap = r.game.status === "waiting"
          ? Math.max(0, Date.parse(r.game.createdAt) + WAITING_TIMEOUT_MS - Date.now())
          : Number.POSITIVE_INFINITY;
        const deadlineMono = leftAtMono + Math.max(0, Math.min(allowance, preparationCap));
        r.boardAwayByUid.set(uid, { leftAtMono, deadlineMono, remainingAtLeaveMs: remaining });
        this.persistAway(r);
        await this.persistence.save(r.game);  // one Firestore write per absence, no per-second write
        return { visible: false, awayDeadlineAt: Date.now() + Math.max(0, deadlineMono - performance.now()) };
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
    });
  }

  private remainingForUid(r: Runtime, uid: string): number | null {
    if (r.game.timeControl.kind !== "clocked") return null;
    const color = r.game.redUid === uid ? "red" : "black";
    let remaining = color === "red" ? r.game.redRemainingMs : r.game.blackRemainingMs;
    if (remaining == null) return null;
    if (r.game.status === "active" && r.turnStartedMono != null && color === r.game.board.turn)
      remaining = Math.max(0, remaining - Math.max(0, performance.now() - r.turnStartedMono));
    return remaining;
  }
  private normalDeadline(r: Runtime): number | null {
    if (r.game.status !== "active" || r.game.timeControl.kind !== "clocked" || r.turnStartedMono == null) return null;
    const left = r.game.board.turn === "red" ? r.game.redRemainingMs : r.game.blackRemainingMs;
    return left == null ? null : r.turnStartedMono + left;
  }
  private expiredTerminal(r: Runtime): { kind: "clock" } | { kind: "away"; uid: string } | null {
    if (r.game.status !== "active" && r.game.status !== "paused") return null;
    const now = performance.now();
    const candidates: Array<{ deadline: number; kind: "clock" | "away"; uid?: string }> = [];
    const clock = this.normalDeadline(r);
    if (clock != null && now >= clock) candidates.push({ deadline: clock, kind: "clock" });
    for (const [uid, budget] of r.boardAwayByUid)
      if (now >= budget.deadlineMono) candidates.push({ deadline: budget.deadlineMono, kind: "away", uid });
    candidates.sort((a, b) => a.deadline - b.deadline);
    const earliest = candidates[0];
    return !earliest ? null : earliest.kind === "away" && earliest.uid
      ? { kind: "away", uid: earliest.uid } : { kind: "clock" };
  }
  private consumeClock(r: Runtime, color: XiangqiColor) {
    if (r.game.timeControl.kind !== "clocked" || r.turnStartedMono == null) return;
    const elapsed = Math.max(0, performance.now() - r.turnStartedMono);
    if (color === "red") r.game.redRemainingMs = Math.max(0, (r.game.redRemainingMs ?? 0) - elapsed);
    else r.game.blackRemainingMs = Math.max(0, (r.game.blackRemainingMs ?? 0) - elapsed);
  }
  private finishRuntime(r: Runtime) {
    r.game.endedAt = iso(); r.turnStartedMono = null;
    r.boardAwayByUid.clear(); r.awayRemainingByUid.clear(); r.game.awayBudgetByUid = {};
    this.scheduleEviction(r);
  }
  private async finishByClock(r: Runtime) {
    const before = this.snapshot(r);
    try {
      const loser = r.game.board.turn, winner = other(loser);
      if (loser === "red") r.game.redRemainingMs = 0; else r.game.blackRemainingMs = 0;
      r.game.result = winner; r.game.finishReason = "timeout"; r.game.status = "finished";
      r.game.revision++; r.game.updatedAt = iso(); r.game.board = { ...r.game.board, winner, gameOver: true };
      this.finishRuntime(r); await this.persistence.finish(r.game);
    } catch (error) { this.restoreSnapshot(r, before); throw error; }
  }
  private async finishByAway(r: Runtime, uid: string) {
    const before = this.snapshot(r);
    try {
      const winner = r.game.redUid === uid ? "black" : "red";
      r.game.result = winner; r.game.finishReason = "away_timeout"; r.game.status = "finished";
      r.game.revision++; r.game.updatedAt = iso(); r.game.board = { ...r.game.board, winner, gameOver: true };
      this.finishRuntime(r); await this.persistence.finish(r.game);
    } catch (error) { this.restoreSnapshot(r, before); throw error; }
  }
  private async settleExpired(r: Runtime) {
    if (r.game.status === "waiting") {
      const created = Date.parse(r.game.createdAt);
      const prepExpired = !Number.isFinite(created) || Date.now() >= created + WAITING_TIMEOUT_MS;
      const expiredAbsences = [...r.boardAwayByUid.entries()]
        .filter(([, budget]) => performance.now() >= budget.deadlineMono)
        .sort((a, b) => a[1].deadlineMono - b[1].deadlineMono);
      if (!prepExpired && !expiredAbsences.length) return false;
      // A global preparation expiry must not be mislabeled as an away loss
      // if that player's per-absence deadline has not elapsed yet.
      if (expiredAbsences.length) await this.finishByAway(r, expiredAbsences[0][0]);
      else {
        const before = this.snapshot(r);
        try {
          r.game.status = "cancelled"; r.game.finishReason = "abandoned";
          r.game.revision++; r.game.updatedAt = iso(); this.finishRuntime(r);
          await this.persistence.finish(r.game);
        } catch (error) { this.restoreSnapshot(r, before); throw error; }
      }
      this.broadcast({ kind: "state", state: this.publicState(r) });
      return true;
    }
    const expired = this.expiredTerminal(r); if (!expired) return false;
    if (expired.kind === "away") await this.finishByAway(r, expired.uid);
    else await this.finishByClock(r);
    this.broadcast({ kind: "state", state: this.publicState(r) });
    return true;
  }
  private async checkTimeouts() {
    for (const [gameId, r] of this.games) {
      const created = Date.parse(r.game.createdAt);
      const waitingExpired = r.game.status === "waiting" &&
        (!Number.isFinite(created) || Date.now() >= created + WAITING_TIMEOUT_MS ||
          [...r.boardAwayByUid.values()].some(budget => performance.now() >= budget.deadlineMono));
      if (!waitingExpired && !this.expiredTerminal(r)) continue;
      await this.enqueue(gameId, () => this.settleExpired(r));
    }
  }

  async move(gameId: string, uid: string, clientMoveId: string, expectedRevision: number,
    pieceId: string, to: { col: number; row: number }): Promise<XiangqiMoveAck> {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r, uid);
      await this.settleExpired(r); this.assertActive(r);
      if (r.game.recentRequestIds.includes(clientMoveId)) return { clientMoveId, version: r.game.revision, duplicate: true };
      if (expectedRevision !== r.game.revision) throw new XiangqiDomainError("XIANGQI_STATE_CONFLICT");
      const color: XiangqiColor = r.game.redUid === uid ? "red" : "black";
      if (r.game.board.turn !== color) throw new XiangqiDomainError("XIANGQI_NOT_YOUR_TURN");
      const beforeBoard = r.game.board, after = playXiangqiMove(beforeBoard, pieceId, to);
      if (after === beforeBoard) throw new XiangqiDomainError("XIANGQI_ILLEGAL_MOVE");
      const before = this.snapshot(r);
      try {
        this.consumeClock(r, color);
        if (r.game.timeControl.kind === "clocked") {
          if (color === "red") r.game.redRemainingMs = (r.game.redRemainingMs ?? 0) + r.game.timeControl.incrementMs;
          else r.game.blackRemainingMs = (r.game.blackRemainingMs ?? 0) + r.game.timeControl.incrementMs;
        }
        r.game.board = after; r.game.drawOfferByUid = null; r.game.revision++; r.game.updatedAt = iso(); this.remember(r.game, clientMoveId);
        r.turnStartedMono = r.game.timeControl.kind === "clocked" ? performance.now() : null;
        if (after.gameOver) {
          r.game.result = after.winner; r.game.finishReason = after.finishReason;
          r.game.status = "finished"; this.finishRuntime(r);
          await this.persistence.finish(r.game);
        } else if ((after.moveNumber - 1) % CHECKPOINT_EVERY_MOVE === 0) await this.persistence.save(r.game);
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
      const state = this.publicState(r);
      const delta: XiangqiMoveDelta = {
        gameId, clientMoveId, version: state.revision, move: after.lastMove!, board: structuredClone(after),
        redRemainingMs: state.redRemainingMs, blackRemainingMs: state.blackRemainingMs,
        status: state.status, result: state.result, finishReason: state.finishReason,
        serverNowMs: state.serverNowMs, endedAt: state.endedAt,
      };
      this.broadcast({ kind: "move", state, delta });
      return { clientMoveId, version: state.revision };
    });
  }
  async resign(gameId: string, uid: string, requestId: string) {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r, uid);
      await this.settleExpired(r); this.assertActive(r);
      if (r.game.recentRequestIds.includes(requestId)) return this.publicState(r);
      const before = this.snapshot(r);
      try {
        const winner: XiangqiColor = r.game.redUid === uid ? "black" : "red";
        r.game.result = winner; r.game.finishReason = "resignation"; r.game.status = "finished";
        r.game.board = { ...r.game.board, winner, gameOver: true };
        r.game.drawOfferByUid = null; r.game.revision++; r.game.updatedAt = iso(); this.remember(r.game, requestId);
        this.finishRuntime(r); await this.persistence.finish(r.game);
      } catch (error) { this.restoreSnapshot(r, before); throw error; }
      const state = this.publicState(r); this.broadcast({ kind: "state", state }); return state;
    });
  }
  // Xiangqi-owned draw protocol. A proposal never pauses server clocks and
  // the opponent must accept. Bloom Bot accepts its own test games immediately.
  async offerDraw(gameId: string, uid: string, requestId: string) {
    return this.enqueue(gameId, async () => {
      const r = this.requireRuntime(gameId); this.assertPlayer(r,uid); await this.settleExpired(r);this.assertActive(r);
      if (r.game.drawOfferByUid && r.game.drawOfferByUid !== uid)
        throw new XiangqiDomainError("XIANGQI_INVALID_REQUEST", "Opponent already offered a draw");
      if (r.game.drawOfferByUid === uid || r.game.recentRequestIds.includes(requestId)) return this.publicState(r);
      const before = this.snapshot(r);
      try {
        const bot = r.game.testBotUid && r.game.testBotUid !== uid;
        r.game.drawOfferByUid = bot ? null : uid;
        r.game.revision++;r.game.updatedAt=iso();this.remember(r.game,requestId);
        if(bot) {
          this.consumeClock(r,r.game.board.turn);
          r.game.result="draw";r.game.finishReason="draw";r.game.status="finished";
          r.game.board={...r.game.board,gameOver:true,winner:null};
          this.finishRuntime(r);await this.persistence.finish(r.game);
        } else await this.persistence.save(r.game);
      } catch(error) {this.restoreSnapshot(r,before);throw error;}
      const state=this.publicState(r);this.broadcast({kind:"state",state});return state;
    });
  }
  async acceptDraw(gameId:string,uid:string,requestId:string) {
    return this.enqueue(gameId,async()=>{
      const r=this.requireRuntime(gameId);this.assertPlayer(r,uid);await this.settleExpired(r);this.assertActive(r);
      if(!r.game.drawOfferByUid||r.game.drawOfferByUid===uid) throw new XiangqiDomainError("XIANGQI_INVALID_REQUEST", "No opponent draw proposal");
      const before=this.snapshot(r);
      try {
        this.consumeClock(r,r.game.board.turn);
        r.game.result="draw";r.game.finishReason="draw";r.game.status="finished";r.game.drawOfferByUid=null;
        r.game.board={...r.game.board,gameOver:true,winner:null};
        r.game.revision++;r.game.updatedAt=iso();this.remember(r.game,requestId);
        this.finishRuntime(r);await this.persistence.finish(r.game);
      }catch(error){this.restoreSnapshot(r,before);throw error;}
      const state=this.publicState(r);this.broadcast({kind:"state",state});return state;
    });
  }
  async declineDraw(gameId:string,uid:string,requestId:string) {
    return this.enqueue(gameId,async()=>{
      const r=this.requireRuntime(gameId);this.assertPlayer(r,uid);await this.settleExpired(r);this.assertActive(r);
      if(!r.game.drawOfferByUid) return this.publicState(r);
      // Inviter may withdraw; receiver may decline. Neither is a move.
      const before=this.snapshot(r);
      try {
        r.game.drawOfferByUid=null;r.game.revision++;r.game.updatedAt=iso();this.remember(r.game,requestId);
        await this.persistence.save(r.game);
      }catch(error){this.restoreSnapshot(r,before);throw error;}
      const state=this.publicState(r);this.broadcast({kind:"state",state});return state;
    });
  }
  private scheduleEviction(r: Runtime) {
    const old = this.evictions.get(r.game.id); if (old) clearTimeout(old);
    const t = setTimeout(() => {
      if (this.games.get(r.game.id) === r && (r.game.status === "finished" || r.game.status === "cancelled"))
        this.games.delete(r.game.id);
      this.evictions.delete(r.game.id);
    }, FINISHED_TTL_MS);
    t.unref(); this.evictions.set(r.game.id, t);
  }
  private publicState(r: Runtime): PublicXiangqiGameState {
    let red = r.game.redRemainingMs, black = r.game.blackRemainingMs;
    if (r.game.status === "active" && r.game.timeControl.kind === "clocked" && r.turnStartedMono != null) {
      const elapsed = Math.max(0, performance.now() - r.turnStartedMono);
      if (r.game.board.turn === "red" && red != null) red = Math.max(0, red - elapsed);
      if (r.game.board.turn === "black" && black != null) black = Math.max(0, black - elapsed);
    }
    const { id, playerUids, recentRequestIds, awayBudgetByUid, updatedAt, preparationPhase, ...rest } = r.game;
    return {
      ...rest, gameId: id,
      redUid: r.game.status === "waiting" && r.game.preparationPhase !== "colors" ? "" : r.game.redUid,
      blackUid: r.game.status === "waiting" && r.game.preparationPhase !== "colors" ? "" : r.game.blackUid,
      preparationPhase: r.game.status === "waiting" ? (preparationPhase ?? "board") : "play",
      redRemainingMs: red, blackRemainingMs: black, board: structuredClone(r.game.board), serverNowMs: Date.now(),
    };
  }
}
