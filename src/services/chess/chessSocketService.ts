import { getAuth } from "@react-native-firebase/auth";
import { io, Socket } from "socket.io-client";
import { ENV } from "../../config/env";
import { CHESS_EVENTS, type ChessAck, type ChessGameState, type ChessInvite, type ChessInviteRejected, type ChessPresence } from "../../types/chess";

type ListenerMap = {
  state: (state: ChessGameState) => void;
  invite: (invite: ChessInvite) => void;
  presence: (items: ChessPresence[]) => void;
  inviteExpired: (payload: { inviteId: string }) => void;
  inviteRejected: (payload: ChessInviteRejected) => void;
  connected: () => void;
  disconnected: () => void;
};

type ErrorSummary = {
  name?: string;
  message: string;
  code?: string;
  description?: string;
  context?: string;
};

const debug = (...args: unknown[]) => {
  if (__DEV__) console.log("[ChessDebug]", ...args);
};

const debugWarn = (...args: unknown[]) => {
  if (__DEV__) console.warn("[ChessDebug]", ...args);
};

const summarizeError = (error: unknown): ErrorSummary => {
  if (!error || typeof error !== "object") return { message: String(error ?? "Unknown error") };
  const source = error as Record<string, unknown>;
  return {
    name: typeof source.name === "string" ? source.name : undefined,
    message: typeof source.message === "string" ? source.message : String(error),
    code: typeof source.code === "string" ? source.code : undefined,
    description: typeof source.description === "string" ? source.description : undefined,
    context: typeof source.context === "string" ? source.context : undefined,
  };
};

class ChessSocketService {
  private socket: Socket | null = null;
  private listeners: { [K in keyof ListenerMap]: Set<ListenerMap[K]> } = {
    state: new Set(), invite: new Set(), presence: new Set(), inviteExpired: new Set(), inviteRejected: new Set(), connected: new Set(), disconnected: new Set(),
  };

  async prewake() {
    if (!ENV.chessSocketUrl) {
      debugWarn("prewake blocked: EXPO_PUBLIC_CHESS_SOCKET_URL is empty");
      throw new Error("CHESS_SOCKET_URL_MISSING");
    }
    const url = `${ENV.chessSocketUrl.replace(/\/$/, "")}/health`;
    const startedAt = Date.now();
    debug("prewake:start", { url });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      debug("prewake:response", { status: response.status, ok: response.ok, elapsedMs: Date.now() - startedAt });
      if (!response.ok) throw new Error(`CHESS_HEALTH_HTTP_${response.status}`);
      return true;
    } catch (error) {
      debugWarn("prewake:failed", { elapsedMs: Date.now() - startedAt, error: summarizeError(error) });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async connect() {
    if (!ENV.chessSocketUrl) {
      debugWarn("connect blocked: EXPO_PUBLIC_CHESS_SOCKET_URL is empty");
      throw new Error("CHESS_SOCKET_URL_MISSING");
    }
    if (this.socket?.connected) {
      debug("connect:reuse", { socketId: this.socket.id });
      return this.socket;
    }

    const currentUser = getAuth().currentUser;
    debug("connect:auth", {
      url: ENV.chessSocketUrl,
      hasFirebaseUser: !!currentUser,
      uid: currentUser?.uid ?? null,
    });
    if (!currentUser) throw new Error("CHESS_UNAUTHORIZED");

    let token: string;
    try {
      token = await currentUser.getIdToken(false);
      debug("connect:idToken ready", { uid: currentUser.uid, tokenPresent: token.length > 0 });
    } catch (error) {
      debugWarn("connect:getIdToken failed", summarizeError(error));
      throw error;
    }

    if (!this.socket) {
      debug("connect:create socket", { transports: ["websocket", "polling"] });
      this.socket = io(ENV.chessSocketUrl, {
        autoConnect: false,
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 600,
        reconnectionDelayMax: 4_000,
        retries: 2,
        ackTimeout: 12_000,
      });
      this.bindCoreListeners(this.socket);
      this.socket.io.on("reconnect_attempt", async (attempt) => {
        debug("socket:reconnect_attempt", { attempt });
        try {
          const user = getAuth().currentUser;
          if (user && this.socket) this.socket.auth = { token: await user.getIdToken(false) };
        } catch (error) {
          debugWarn("socket:reconnect token refresh failed", summarizeError(error));
        }
      });
      this.socket.io.on("reconnect_error", (error) => debugWarn("socket:reconnect_error", summarizeError(error)));
      this.socket.io.on("reconnect_failed", () => debugWarn("socket:reconnect_failed"));
      this.socket.on("connect_error", async (error) => {
        const summary = summarizeError(error);
        debugWarn("socket:connect_error", summary);
        if (!summary.message.includes("CHESS_UNAUTHORIZED")) return;
        try {
          const user = getAuth().currentUser;
          if (user && this.socket) {
            const refreshed = await user.getIdToken(true);
            this.socket.auth = { token: refreshed };
            debug("socket:forced Firebase token refresh ready", { uid: user.uid });
          }
        } catch (refreshError) {
          debugWarn("socket:forced token refresh failed", summarizeError(refreshError));
        }
      });
    } else {
      this.socket.auth = { token };
      debug("connect:updated auth on existing socket");
    }

    if (!this.socket.connected) {
      debug("connect:socket.connect()");
      this.socket.connect();
    }

    const startedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      if (this.socket?.connected) return resolve();
      const timer = setTimeout(() => {
        debugWarn("connect:timeout", { elapsedMs: Date.now() - startedAt });
        reject(new Error("CHESS_CONNECT_TIMEOUT"));
      }, 70_000);
      this.socket?.once("connect", () => {
        clearTimeout(timer);
        debug("connect:ready", { socketId: this.socket?.id, elapsedMs: Date.now() - startedAt });
        resolve();
      });
    });
    return this.socket;
  }

  disconnect() {
    if (!this.socket) return;
    debug("disconnect", { socketId: this.socket.id, connected: this.socket.connected });
    this.socket.disconnect();
    this.socket = null;
  }

  disconnectIfIdle(_activeGameId?: string | null) {
    // Phase 14V.1: the authenticated foreground app owns Chess socket lifecycle.
    // Kept as a no-op for compatibility with older Chess hooks.
  }

  private bindCoreListeners(socket: Socket) {
    socket.on("connect", () => {
      debug("socket:connect", { socketId: socket.id, transport: socket.io.engine?.transport?.name });
      this.listeners.connected.forEach((fn) => fn());
    });
    socket.on("disconnect", (reason, details) => {
      debugWarn("socket:disconnect", { reason, details: details ? summarizeError(details) : undefined });
      this.listeners.disconnected.forEach((fn) => fn());
    });
    socket.on(CHESS_EVENTS.gameState, (state: ChessGameState) => {
      debug("event:gameState", { gameId: state.gameId, revision: state.revision, status: state.status, turn: state.turn });
      this.listeners.state.forEach((fn) => fn(state));
    });
    socket.on(CHESS_EVENTS.inviteReceived, (invite: ChessInvite) => {
      debug("event:inviteReceived", { inviteId: invite.inviteId, familyId: invite.familyId, isTestBot: !!invite.isTestBot });
      this.listeners.invite.forEach((fn) => fn(invite));
    });
    socket.on(CHESS_EVENTS.presenceUpdate, (items: ChessPresence[]) => {
      debug("event:presenceUpdate", { count: items.length });
      this.listeners.presence.forEach((fn) => fn(items));
    });
    socket.on(CHESS_EVENTS.inviteExpired, (payload: { inviteId: string }) => {
      debug("event:inviteExpired", payload);
      this.listeners.inviteExpired.forEach((fn) => fn(payload));
    });
    socket.on(CHESS_EVENTS.inviteRejected, (payload: ChessInviteRejected) => {
      debug("event:inviteRejected", payload);
      this.listeners.inviteRejected.forEach((fn) => fn(payload));
    });
  }

  on<K extends keyof ListenerMap>(key: K, fn: ListenerMap[K]) {
    (this.listeners[key] as Set<ListenerMap[K]>).add(fn);
    return () => (this.listeners[key] as Set<ListenerMap[K]>).delete(fn);
  }

  emitBestEffort(event: string, payload: unknown) {
    if (!this.socket?.connected) {
      debugWarn("emitBestEffort skipped: socket not connected", { event });
      return;
    }
    debug("emitBestEffort", { event });
    this.socket.emit(event, payload, () => undefined);
  }

  isConnected() {
    return !!this.socket?.connected;
  }

  async emitAck<T = undefined>(event: string, payload: unknown, timeoutMs = 12_000): Promise<ChessAck<T>> {
    debug("emitAck:start", { event, timeoutMs });
    try {
      const socket = await this.connect();
      return await new Promise((resolve) => socket.timeout(timeoutMs).emit(event, payload, (error: Error | null, response: ChessAck<T>) => {
        if (error) {
          debugWarn("emitAck:timeout/error", { event, error: summarizeError(error) });
          resolve({ ok: false, errorCode: "CHESS_SERVER_RECOVERING", message: error.message } as ChessAck<T>);
          return;
        }
        debug("emitAck:response", {
          event,
          ok: response?.ok ?? false,
          errorCode: response && !response.ok ? response.errorCode : undefined,
        });
        resolve(response);
      }));
    } catch (error) {
      debugWarn("emitAck:connect failed", { event, error: summarizeError(error) });
      throw error;
    }
  }
}

export const chessSocketService = new ChessSocketService();
