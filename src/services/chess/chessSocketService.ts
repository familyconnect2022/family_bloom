import auth from "@react-native-firebase/auth";
import { io, Socket } from "socket.io-client";
import { ENV } from "../../config/env";
import { CHESS_EVENTS, type ChessAck, type ChessGameState, type ChessInvite, type ChessPresence } from "../../types/chess";

type ListenerMap = {
  state: (state: ChessGameState) => void;
  invite: (invite: ChessInvite) => void;
  presence: (items: ChessPresence[]) => void;
  inviteExpired: (payload: { inviteId: string }) => void;
  connected: () => void;
};

class ChessSocketService {
  private socket: Socket | null = null;
  private listeners: { [K in keyof ListenerMap]: Set<ListenerMap[K]> } = {
    state: new Set(), invite: new Set(), presence: new Set(), inviteExpired: new Set(), connected: new Set(),
  };

  async prewake() {
    if (!ENV.chessSocketUrl) throw new Error("CHESS_SOCKET_URL_MISSING");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      await fetch(`${ENV.chessSocketUrl.replace(/\/$/, "")}/health`, { signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  async connect() {
    if (!ENV.chessSocketUrl) throw new Error("CHESS_SOCKET_URL_MISSING");
    if (this.socket?.connected) return this.socket;
    const user = auth().currentUser;
    if (!user) throw new Error("CHESS_UNAUTHORIZED");
    const token = await user.getIdToken(false);
    if (!this.socket) {
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
      this.socket.io.on("reconnect_attempt", async () => {
        const current = auth().currentUser;
        if (current && this.socket) this.socket.auth = { token: await current.getIdToken(false) };
      });
      this.socket.on("connect_error", async (error) => {
        if (!String(error?.message ?? "").includes("CHESS_UNAUTHORIZED")) return;
        const current = auth().currentUser;
        if (current && this.socket) this.socket.auth = { token: await current.getIdToken(true) };
      });
    } else {
      this.socket.auth = { token };
    }
    if (!this.socket.connected) this.socket.connect();
    await new Promise<void>((resolve, reject) => {
      if (this.socket?.connected) return resolve();
      const timer = setTimeout(() => reject(new Error("CHESS_CONNECT_TIMEOUT")), 70_000);
      this.socket?.once("connect", () => { clearTimeout(timer); resolve(); });
    });
    return this.socket;
  }

  disconnectIfIdle(activeGameId?: string | null) {
    if (!activeGameId && this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  private bindCoreListeners(socket: Socket) {
    socket.on("connect", () => this.listeners.connected.forEach((fn) => fn()));
    socket.on(CHESS_EVENTS.gameState, (state: ChessGameState) => this.listeners.state.forEach((fn) => fn(state)));
    socket.on(CHESS_EVENTS.inviteReceived, (invite: ChessInvite) => this.listeners.invite.forEach((fn) => fn(invite)));
    socket.on(CHESS_EVENTS.presenceUpdate, (items: ChessPresence[]) => this.listeners.presence.forEach((fn) => fn(items)));
    socket.on(CHESS_EVENTS.inviteExpired, (payload: { inviteId: string }) => this.listeners.inviteExpired.forEach((fn) => fn(payload)));
  }

  on<K extends keyof ListenerMap>(key: K, fn: ListenerMap[K]) {
    (this.listeners[key] as Set<ListenerMap[K]>).add(fn);
    return () => (this.listeners[key] as Set<ListenerMap[K]>).delete(fn);
  }

  emitBestEffort(event: string, payload: unknown) {
    if (!this.socket?.connected) return;
    this.socket.emit(event, payload, () => undefined);
  }

  async emitAck<T = undefined>(event: string, payload: unknown): Promise<ChessAck<T>> {
    const socket = await this.connect();
    return new Promise((resolve) => socket.timeout(12_000).emit(event, payload, (error: Error | null, response: ChessAck<T>) => {
      if (error) resolve({ ok: false, errorCode: "CHESS_SERVER_RECOVERING", message: error.message } as ChessAck<T>);
      else resolve(response);
    }));
  }
}

export const chessSocketService = new ChessSocketService();
