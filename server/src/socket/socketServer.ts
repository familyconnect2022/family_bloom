import { randomUUID } from "node:crypto";
import type { Server, Socket } from "socket.io";
import { ChessGameManager } from "../chess/chessGameManager.js";
import { ChessPersistenceService } from "../chess/chessPersistenceService.js";
import { ChessDomainError, type ChessTimeControl } from "../chess/chessTypes.js";
import { adminAuth, adminDb } from "../firebase/firebaseAdmin.js";

const E = {
  lobbyJoin: "chess:lobby:join",
  lobbyLeave: "chess:lobby:leave",
  presenceUpdate: "chess:presence:update",
  inviteCreate: "chess:invite:create",
  inviteReceived: "chess:invite:received",
  inviteAccept: "chess:invite:accept",
  inviteReject: "chess:invite:reject",
  inviteCancel: "chess:invite:cancel",
  inviteExpired: "chess:invite:expired",
  gameJoin: "chess:game:join",
  gameState: "chess:game:state",
  gameMove: "chess:game:move",
  gameResign: "chess:game:resign",
  drawOffer: "chess:draw:offer",
  drawAccept: "chess:draw:accept",
  drawReject: "chess:draw:reject",
  gameRematch: "chess:game:rematch",
  gameResync: "chess:game:resync",
  sessionGetActive: "chess:session:getActive",
} as const;

type Ack = (response: unknown) => void;
type SocketData = { uid: string; lobbyFamilyId?: string; gameId?: string; gameFamilyId?: string };
type Invite = {
  inviteId: string;
  familyId: string;
  fromUid: string;
  toUid: string;
  timeControl: ChessTimeControl;
  expiresAt: number;
};

type Bucket = { count: number; resetAt: number };
const memberCache = new Map<string, { ok: boolean; expires: number }>();
const invites = new Map<string, Invite>();
const rematchVotes = new Map<string, Set<string>>();
const buckets = new Map<string, Bucket>();

const ALLOWED_TIME_CONTROLS = new Set(["180000:2000", "300000:0", "600000:0", "600000:5000", "unlimited"]);
const DOC_ID = /^[^/]{1,128}$/;
const SQUARE = /^[a-h][1-8]$/;

function invalid(message = "CHESS_INVALID_REQUEST"): never {
  throw new ChessDomainError("CHESS_INVALID_REQUEST", message);
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid();
  return value as Record<string, unknown>;
}

function asId(value: unknown, label: string) {
  if (typeof value !== "string" || !DOC_ID.test(value)) invalid(`Invalid ${label}`);
  return value;
}

function asRequestId(value: unknown) {
  if (typeof value !== "string" || value.length < 8 || value.length > 128) invalid("Invalid requestId");
  return value;
}

function asRevision(value: unknown) {
  if (!Number.isSafeInteger(value) || (value as number) < 1 || (value as number) > 1_000_000_000) invalid("Invalid revision");
  return value as number;
}

function asSquare(value: unknown, label: string) {
  if (typeof value !== "string" || !SQUARE.test(value)) invalid(`Invalid ${label}`);
  return value;
}

function asPromotion(value: unknown) {
  if (value == null) return null;
  if (value !== "q" && value !== "r" && value !== "b" && value !== "n") invalid("Invalid promotion");
  return value;
}

function asTimeControl(value: unknown): ChessTimeControl {
  const input = asRecord(value);
  if (input.kind === "unlimited" && input.initialMs === null && input.incrementMs === 0) {
    return { kind: "unlimited", initialMs: null, incrementMs: 0 };
  }
  if (input.kind !== "clocked" || !Number.isSafeInteger(input.initialMs) || !Number.isSafeInteger(input.incrementMs)) invalid("Invalid time control");
  const initialMs = input.initialMs as number;
  const incrementMs = input.incrementMs as number;
  if (!ALLOWED_TIME_CONTROLS.has(`${initialMs}:${incrementMs}`)) invalid("Unsupported time control");
  return { kind: "clocked", initialMs, incrementMs };
}

function limit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  if (bucket.count >= max) throw new ChessDomainError("CHESS_RATE_LIMITED");
  bucket.count += 1;
}

function ackError(ack: Ack, error: unknown) {
  if (error instanceof ChessDomainError) {
    ack({ ok: false, errorCode: error.code, message: error.message });
    return;
  }
  console.error("[chess] command failed", error);
  ack({ ok: false, errorCode: "CHESS_SERVER_RECOVERING", message: "Chess server command failed" });
}

function safe<T>(ack: Ack, fn: () => Promise<T>) {
  void fn().then((data) => ack({ ok: true, data })).catch((error) => ackError(ack, error));
}

export function installChessSocket(io: Server<any, any, any, SocketData>) {
  const persistence = new ChessPersistenceService(adminDb);
  const manager = new ChessGameManager(
    persistence,
    (gameId, state) => io.to(`chess:game:${gameId}`).emit(E.gameState, state),
  );

  async function isMember(uid: string, familyId: string) {
    const key = `${familyId}:${uid}`;
    const cached = memberCache.get(key);
    if (cached && cached.expires > Date.now()) return cached.ok;
    const snap = await adminDb.doc(`families/${familyId}/members/${uid}`).get();
    const ok = snap.exists;
    memberCache.set(key, { ok, expires: Date.now() + 10_000 });
    return ok;
  }

  async function requireMember(uid: string, familyId: string) {
    if (!(await isMember(uid, familyId))) throw new ChessDomainError("CHESS_NOT_FAMILY_MEMBER");
  }

  function socketsForUid(uid: string) {
    return [...io.sockets.sockets.values()].filter((socket) => socket.data.uid === uid);
  }

  function socketsForUidInFamily(uid: string, familyId: string) {
    return socketsForUid(uid).filter((socket) => socket.data.lobbyFamilyId === familyId || socket.data.gameFamilyId === familyId);
  }

  function lobbyReady(uid: string, familyId: string) {
    return socketsForUid(uid).some((socket) => socket.data.lobbyFamilyId === familyId);
  }

  async function emitPresence(familyId: string) {
    const uids = new Set<string>();
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.lobbyFamilyId === familyId || socket.data.gameFamilyId === familyId) uids.add(socket.data.uid);
    }
    const items = await Promise.all([...uids].map(async (uid) => {
      const active = await persistence.getActiveForUid(uid);
      const status = active?.familyId === familyId ? "in_game" : active ? "online" : lobbyReady(uid, familyId) ? "in_lobby" : "online";
      return { uid, status };
    }));
    io.to(`chess:lobby:${familyId}`).emit(E.presenceUpdate, items);
  }

  async function expireInvite(inviteId: string) {
    const invite = invites.get(inviteId);
    if (!invite || invite.expiresAt > Date.now()) return;
    invites.delete(inviteId);
    for (const uid of [invite.fromUid, invite.toUid]) {
      for (const socket of socketsForUidInFamily(uid, invite.familyId)) socket.emit(E.inviteExpired, { inviteId });
    }
  }

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) return next(new Error("CHESS_UNAUTHORIZED"));
      const decoded = await adminAuth.verifyIdToken(token);
      socket.data.uid = decoded.uid;
      next();
    } catch {
      next(new Error("CHESS_UNAUTHORIZED"));
    }
  });

  io.on("connection", (socket: Socket<any, any, any, SocketData>) => {
    const uid = socket.data.uid;
    console.info("[chess] authenticated", { uid, socketId: socket.id });

    const requireGameMembership = async (gameId: string) => {
      const state = await manager.state(gameId, uid);
      await requireMember(uid, state.familyId);
      return state;
    };

    socket.on(E.lobbyJoin, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`lobby:${uid}`, 12, 10_000);
      const payload = asRecord(raw);
      const familyId = asId(payload.familyId, "familyId");
      await requireMember(uid, familyId);
      const previousFamilyId = socket.data.lobbyFamilyId;
      if (previousFamilyId && previousFamilyId !== familyId) {
        socket.leave(`chess:lobby:${previousFamilyId}`);
        delete socket.data.lobbyFamilyId;
        await emitPresence(previousFamilyId);
      }
      socket.data.lobbyFamilyId = familyId;
      await socket.join(`chess:lobby:${familyId}`);
      await emitPresence(familyId);
      return { ready: true };
    }));

    socket.on(E.lobbyLeave, (raw: unknown, ack: Ack) => safe(ack, async () => {
      const payload = asRecord(raw);
      const familyId = asId(payload.familyId, "familyId");
      socket.leave(`chess:lobby:${familyId}`);
      if (socket.data.lobbyFamilyId === familyId) delete socket.data.lobbyFamilyId;
      await emitPresence(familyId);
      return { left: true };
    }));

    socket.on(E.inviteCreate, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`invite:${uid}`, 5, 30_000);
      const payload = asRecord(raw);
      asRequestId(payload.requestId);
      const familyId = asId(payload.familyId, "familyId");
      const toUid = asId(payload.toUid, "toUid");
      const timeControl = asTimeControl(payload.timeControl);
      if (toUid === uid) invalid();
      await requireMember(uid, familyId);
      await requireMember(toUid, familyId);
      if (await persistence.getActiveForUid(uid)) throw new ChessDomainError("CHESS_ALREADY_IN_GAME");
      if (await persistence.getActiveForUid(toUid)) throw new ChessDomainError("CHESS_ALREADY_IN_GAME");
      if (!lobbyReady(toUid, familyId)) throw new ChessDomainError("CHESS_PLAYER_OFFLINE");

      const existing = [...invites.values()].find((invite) =>
        invite.familyId === familyId && invite.fromUid === uid && invite.toUid === toUid && invite.expiresAt > Date.now(),
      );
      if (existing) return existing;

      const invite: Invite = {
        inviteId: randomUUID(), familyId, fromUid: uid, toUid, timeControl, expiresAt: Date.now() + 45_000,
      };
      invites.set(invite.inviteId, invite);
      for (const targetSocket of socketsForUidInFamily(toUid, familyId)) targetSocket.emit(E.inviteReceived, invite);
      setTimeout(() => void expireInvite(invite.inviteId), 45_100).unref();
      return invite;
    }));

    socket.on(E.inviteReject, (raw: unknown, ack: Ack) => safe(ack, async () => {
      const payload = asRecord(raw);
      const inviteId = asId(payload.inviteId, "inviteId");
      const invite = invites.get(inviteId);
      if (!invite || invite.expiresAt <= Date.now()) throw new ChessDomainError("CHESS_INVITE_EXPIRED");
      if (invite.toUid !== uid) invalid();
      invites.delete(invite.inviteId);
      for (const senderSocket of socketsForUidInFamily(invite.fromUid, invite.familyId)) {
        senderSocket.emit(E.inviteExpired, { inviteId: invite.inviteId });
      }
      return { rejected: true };
    }));

    socket.on(E.inviteCancel, (raw: unknown, ack: Ack) => safe(ack, async () => {
      const payload = asRecord(raw);
      const inviteId = asId(payload.inviteId, "inviteId");
      const invite = invites.get(inviteId);
      if (!invite || invite.expiresAt <= Date.now()) throw new ChessDomainError("CHESS_INVITE_EXPIRED");
      if (invite.fromUid !== uid) invalid();
      invites.delete(invite.inviteId);
      for (const targetSocket of socketsForUidInFamily(invite.toUid, invite.familyId)) {
        targetSocket.emit(E.inviteExpired, { inviteId: invite.inviteId });
      }
      return { cancelled: true };
    }));

    socket.on(E.inviteAccept, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`accept:${uid}`, 6, 20_000);
      const payload = asRecord(raw);
      const requestId = asRequestId(payload.requestId);
      const inviteId = asId(payload.inviteId, "inviteId");
      const invite = invites.get(inviteId);

      // If the accept ACK was lost, the invite may already be gone. Resolve the
      // durable active lock and return the same game when requestId matches.
      if (!invite || invite.expiresAt <= Date.now()) {
        const active = await persistence.getActiveForUid(uid);
        if (active) {
          const stored = await persistence.load(active.familyId, active.gameId);
          if (stored?.recentRequestIds.includes(requestId)) {
            const state = await manager.join(active.familyId, active.gameId, uid);
            return { gameId: state.gameId, state };
          }
        }
        throw new ChessDomainError("CHESS_INVITE_EXPIRED");
      }

      if (invite.toUid !== uid) invalid();
      await requireMember(invite.fromUid, invite.familyId);
      await requireMember(invite.toUid, invite.familyId);
      const state = await manager.create(invite.familyId, invite.fromUid, invite.toUid, invite.timeControl, requestId);
      invites.delete(invite.inviteId);

      for (const playerUid of [invite.fromUid, invite.toUid]) {
        for (const playerSocket of socketsForUidInFamily(playerUid, invite.familyId)) {
          playerSocket.data.gameId = state.gameId;
          playerSocket.data.gameFamilyId = invite.familyId;
          await playerSocket.join(`chess:game:${state.gameId}`);
          playerSocket.emit(E.gameState, state);
        }
      }
      await emitPresence(invite.familyId);
      return { gameId: state.gameId, state };
    }));

    socket.on(E.sessionGetActive, (raw: unknown, ack: Ack) => safe(ack, async () => {
      const payload = asRecord(raw);
      const familyId = asId(payload.familyId, "familyId");
      await requireMember(uid, familyId);
      const active = await persistence.getActiveForUid(uid);
      if (!active || active.familyId !== familyId) return null;
      return { gameId: active.gameId };
    }));

    socket.on(E.gameJoin, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`join:${uid}`, 15, 20_000);
      const payload = asRecord(raw);
      const familyId = asId(payload.familyId, "familyId");
      const gameId = asId(payload.gameId, "gameId");
      await requireMember(uid, familyId);
      const state = await manager.join(familyId, gameId, uid);
      if (socket.data.gameId && socket.data.gameId !== gameId) socket.leave(`chess:game:${socket.data.gameId}`);
      socket.data.gameId = gameId;
      socket.data.gameFamilyId = familyId;
      await socket.join(`chess:game:${gameId}`);
      await emitPresence(familyId);
      return state;
    }));

    socket.on(E.gameResync, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`resync:${uid}`, 12, 10_000);
      const gameId = asId(asRecord(raw).gameId, "gameId");
      return requireGameMembership(gameId);
    }));

    socket.on(E.gameMove, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`move:${uid}`, 20, 5_000);
      const payload = asRecord(raw);
      const requestId = asRequestId(payload.requestId);
      const gameId = asId(payload.gameId, "gameId");
      const expectedRevision = asRevision(payload.expectedRevision);
      const from = asSquare(payload.from, "from");
      const to = asSquare(payload.to, "to");
      const promotion = asPromotion(payload.promotion);
      await requireGameMembership(gameId);
      return manager.move(gameId, uid, requestId, expectedRevision, from, to, promotion);
    }));

    socket.on(E.gameResign, (raw: unknown, ack: Ack) => safe(ack, async () => {
      const payload = asRecord(raw);
      const requestId = asRequestId(payload.requestId);
      const gameId = asId(payload.gameId, "gameId");
      await requireGameMembership(gameId);
      return manager.resign(gameId, uid, requestId);
    }));

    const drawCommand = (action: "offer" | "reject" | "accept") => (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`draw:${uid}`, 4, 20_000);
      const payload = asRecord(raw);
      const requestId = asRequestId(payload.requestId);
      const gameId = asId(payload.gameId, "gameId");
      await requireGameMembership(gameId);
      if (action === "offer") return manager.offerDraw(gameId, uid, requestId);
      if (action === "reject") return manager.rejectDraw(gameId, uid, requestId);
      return manager.acceptDraw(gameId, uid, requestId);
    });
    socket.on(E.drawOffer, drawCommand("offer"));
    socket.on(E.drawReject, drawCommand("reject"));
    socket.on(E.drawAccept, drawCommand("accept"));

    socket.on(E.gameRematch, (raw: unknown, ack: Ack) => safe(ack, async () => {
      limit(`rematch:${uid}`, 4, 20_000);
      const payload = asRecord(raw);
      asRequestId(payload.requestId);
      const gameId = asId(payload.gameId, "gameId");
      const old = await requireGameMembership(gameId);
      if (old.status !== "finished") throw new ChessDomainError("CHESS_GAME_FINISHED");
      const votes = rematchVotes.get(gameId) ?? new Set<string>();
      votes.add(uid);
      rematchVotes.set(gameId, votes);
      if (votes.size < 2) return { waiting: true };

      rematchVotes.delete(gameId);
      const next = await manager.create(old.familyId, old.whiteUid, old.blackUid, old.timeControl);
      for (const playerUid of [old.whiteUid, old.blackUid]) {
        for (const playerSocket of socketsForUidInFamily(playerUid, old.familyId)) {
          playerSocket.leave(`chess:game:${gameId}`);
          playerSocket.data.gameId = next.gameId;
          playerSocket.data.gameFamilyId = old.familyId;
          await playerSocket.join(`chess:game:${next.gameId}`);
          playerSocket.emit(E.gameState, next);
        }
      }
      await emitPresence(old.familyId);
      return { waiting: false, gameId: next.gameId, state: next };
    }));

    socket.on("disconnect", () => {
      const familyId = socket.data.lobbyFamilyId ?? socket.data.gameFamilyId;
      const gameId = socket.data.gameId;
      if (gameId && !socketsForUid(uid).some((other) => other.id !== socket.id && other.data.gameId === gameId)) {
        manager.disconnect(gameId, uid);
      }
      if (familyId) setTimeout(() => void emitPresence(familyId), 8_000).unref();
      console.info("[chess] disconnected", { uid, socketId: socket.id });
    });
  });
}
