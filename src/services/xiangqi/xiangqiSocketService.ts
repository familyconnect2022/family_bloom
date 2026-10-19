import { getAuth } from "@react-native-firebase/auth";
import { io, type Socket } from "socket.io-client";

import { ENV } from "../../config/env";
import {
  XIANGQI_EVENTS,
  type XiangqiAck,
  type XiangqiInvite,
  type XiangqiMoveDelta,
  type XiangqiRealtimeState,
} from "../../types/xiangqiRealtime";

export type XiangqiPresence = { uid: string; status: "offline" | "online_app" | "in_lobby" | "in_game" | "busy" | "reconnecting" };
export type XiangqiInviteRejected = { inviteId: string; byUid: string; isTestBot?: boolean; testCycleStep?: 1 | 2 | 3 };

type ListenerMap = {
  state: (state: XiangqiRealtimeState) => void;
  move: (delta: XiangqiMoveDelta) => void;
  invite: (invite: XiangqiInvite) => void;
  outgoingInvite: (invite: XiangqiInvite) => void;
  presence: (items: XiangqiPresence[]) => void;
  inviteExpired: (payload: { inviteId: string }) => void;
  inviteRejected: (payload: XiangqiInviteRejected) => void;
  connected: () => void;
  disconnected: () => void;
};

/**
 * Xiangqi owns its own authenticated Socket.IO client.
 *
 * Chess and Xiangqi may point at the same backend URL, but they intentionally do
 * not share a client instance, reconnect state, listeners, room membership, or
 * lifecycle. The only cross-game coordination remains server-side eligibility.
 */
class XiangqiSocketService {
  // Preserve the current outgoing invitation across a late-mounted app shell.
  // This is presentation state only; cancellation/expiry stays server-owned.
  private lastOutgoingInvite: XiangqiInvite | null = null;
  private publishOutgoingInvite(invite: XiangqiInvite) {
    if (invite.isTestBot || invite.expiresAt <= Date.now()) return;
    this.lastOutgoingInvite = invite;
    this.listeners.outgoingInvite.forEach(fn => fn(invite));
  }
  private clearOutgoingInvite(inviteId: string) {
    if (this.lastOutgoingInvite?.inviteId === inviteId) this.lastOutgoingInvite = null;
  }
  private socket: Socket | null = null;
  private connectPromise: Promise<Socket> | null = null;
  private listeners: { [K in keyof ListenerMap]: Set<ListenerMap[K]> } = {
    state: new Set(),
    move: new Set(),
    invite: new Set(),
    outgoingInvite: new Set(),
    presence: new Set(),
    inviteExpired: new Set(),
    inviteRejected: new Set(),
    connected: new Set(),
    disconnected: new Set(),
  };

  async prewake() {
    if (!ENV.chessSocketUrl) throw new Error("XIANGQI_SOCKET_URL_MISSING");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 65_000);
    try {
      const response = await fetch(`${ENV.chessSocketUrl.replace(/\/$/, "")}/health`, { signal: controller.signal });
      if (!response.ok) throw new Error(`XIANGQI_HEALTH_HTTP_${response.status}`);
      try { return await response.json() as { ok?: boolean; chessTestBotEnabled?: boolean }; }
      catch { return { ok: true }; }
    } finally {
      clearTimeout(timeout);
    }
  }

  async connect() {
    if (this.socket?.connected) return this.socket;
    if (this.connectPromise) return this.connectPromise;
    const task = this.connectInternal();
    this.connectPromise = task;
    try { return await task; }
    finally { if (this.connectPromise === task) this.connectPromise = null; }
  }

  private async connectInternal(): Promise<Socket> {
    if (!ENV.chessSocketUrl) throw new Error("XIANGQI_SOCKET_URL_MISSING");
    const currentUser = getAuth().currentUser;
    if (!currentUser) throw new Error("XIANGQI_UNAUTHORIZED");
    const token = await currentUser.getIdToken(false);

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
        const user = getAuth().currentUser;
        if (user && this.socket) this.socket.auth = { token: await user.getIdToken(false) };
      });
      this.socket.on("connect_error", async (error) => {
        if (!String(error?.message ?? error).includes("UNAUTHORIZED")) return;
        const user = getAuth().currentUser;
        if (user && this.socket) this.socket.auth = { token: await user.getIdToken(true) };
      });
    } else {
      this.socket.auth = { token };
    }

    const socket = this.socket;
    if (socket.connected) return socket;
    socket.connect();
    await new Promise<void>((resolve, reject) => {
      if (socket.connected) { resolve(); return; }
      let settled = false;
      const onConnect = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.off("connect", onConnect);
        resolve();
      };
      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        socket.off("connect", onConnect);
        reject(new Error("XIANGQI_CONNECT_TIMEOUT"));
      }, 70_000);
      socket.once("connect", onConnect);
    });
    return socket;
  }

  private bindCoreListeners(socket: Socket) {
    socket.on("connect", () => this.listeners.connected.forEach((fn) => fn()));
    socket.on("disconnect", () => this.listeners.disconnected.forEach((fn) => fn()));
    socket.on(XIANGQI_EVENTS.gameState, (state: XiangqiRealtimeState) => {
      if (state.status === "waiting" || state.status === "active") this.lastOutgoingInvite = null;
      this.listeners.state.forEach(fn => fn(state));
    });
    socket.on(XIANGQI_EVENTS.gameMoveApplied, (delta: XiangqiMoveDelta) => this.listeners.move.forEach((fn) => fn(delta)));
    socket.on(XIANGQI_EVENTS.inviteReceived, (invite: XiangqiInvite) => this.listeners.invite.forEach((fn) => fn(invite)));
    socket.on(XIANGQI_EVENTS.inviteSent, (invite: XiangqiInvite) => this.publishOutgoingInvite(invite));
    socket.on(XIANGQI_EVENTS.presenceUpdate, (items: XiangqiPresence[]) => this.listeners.presence.forEach((fn) => fn(items)));
    socket.on(XIANGQI_EVENTS.inviteExpired, (payload: { inviteId: string }) => {
      this.clearOutgoingInvite(payload.inviteId);
      this.listeners.inviteExpired.forEach(fn => fn(payload));
    });
    socket.on(XIANGQI_EVENTS.inviteRejected, (payload: XiangqiInviteRejected) => {
      this.clearOutgoingInvite(payload.inviteId);
      this.listeners.inviteRejected.forEach(fn => fn(payload));
    });
  }

  on<K extends keyof ListenerMap>(key: K, fn: ListenerMap[K]) {
    (this.listeners[key] as Set<ListenerMap[K]>).add(fn);
    return () => (this.listeners[key] as Set<ListenerMap[K]>).delete(fn);
  }

  onState(fn: (state: XiangqiRealtimeState) => void) { return this.on("state", fn); }
  onMove(fn: (delta: XiangqiMoveDelta) => void) { return this.on("move", fn); }
  onInvite(fn: (invite: XiangqiInvite) => void) { return this.on("invite", fn); }
  onOutgoingInvite(fn: (invite: XiangqiInvite) => void) {
    const unsubscribe = this.on("outgoingInvite", fn);
    if (this.lastOutgoingInvite?.expiresAt && this.lastOutgoingInvite.expiresAt > Date.now()) fn(this.lastOutgoingInvite);
    return unsubscribe;
  }
  onPresence(fn: (items: XiangqiPresence[]) => void) { return this.on("presence", fn); }
  onInviteExpired(fn: (payload: { inviteId: string }) => void) { return this.on("inviteExpired", fn); }
  onInviteRejected(fn: (payload: XiangqiInviteRejected) => void) { return this.on("inviteRejected", fn); }
  onConnected(fn: () => void) { return this.on("connected", fn); }
  onDisconnected(fn: () => void) { return this.on("disconnected", fn); }

  async emitAck<T = undefined>(event: string, payload: unknown, timeoutMs = 12_000): Promise<XiangqiAck<T>> {
    try {
      const socket = await this.connect();
      return await new Promise((resolve) => socket.timeout(timeoutMs).emit(
        event,
        payload,
        (error: Error | null, response: XiangqiAck<T>) => {
          if (error) {
            resolve({ ok: false, errorCode: "XIANGQI_SERVER_RECOVERING", message: error.message } as XiangqiAck<T>);
            return;
          }
          // Match Chess's outgoing invitation handoff. When the family room
          // push races with mounting this gate, the ACK still opens the
          // inviter's cancellable 60-second Super Bloom notice.
          if (event === XIANGQI_EVENTS.inviteCreate && response?.ok) {
            const invite = (response as {ok:true;data?:XiangqiInvite}).data;
            if (invite?.inviteId && !invite.isTestBot && invite.expiresAt > Date.now()) {
              this.publishOutgoingInvite(invite);
            }
          }
          resolve(response);
        },
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorCode = message.includes("UNAUTHORIZED")
        ? "XIANGQI_UNAUTHORIZED"
        : message.includes("SOCKET_URL_MISSING")
          ? "XIANGQI_SOCKET_URL_MISSING"
          : "XIANGQI_SERVER_RECOVERING";
      return { ok: false, errorCode, message } as XiangqiAck<T>;
    }
  }

  emitBestEffort(event: string, payload: unknown) {
    if (!this.socket?.connected) return;
    this.socket.emit(event, payload, () => undefined);
  }

  isConnected() { return !!this.socket?.connected; }

  disconnect() {
    this.lastOutgoingInvite = null;
    this.connectPromise = null;
    this.socket?.disconnect();
    this.socket = null;
  }
}

export const xiangqiSocketService = new XiangqiSocketService();
