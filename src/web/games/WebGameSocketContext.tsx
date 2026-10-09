import { useRouter } from "expo-router";
import { io, type Socket } from "socket.io-client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ENV } from "../../config/env";
import { CHESS_EVENTS, type ChessInvite, type ChessPresence } from "../../types/chess";
import { XIANGQI_EVENTS, type XiangqiTimeControl } from "../../types/xiangqiRealtime";
import { useWebAuth } from "../context/WebAuthContext";
import { useWebFamily } from "../context/WebFamilyContext";
import { WebModal } from "../components/WebOverlay";

type Ack<T> = { ok: true; data: T } | { ok: false; errorCode?: string; message?: string };
type GameKind = "chess" | "xiangqi";
type XiangqiInvite = {
  inviteId: string;
  familyId: string;
  fromUid: string;
  toUid: string;
  timeControl: XiangqiTimeControl;
  expiresAt: number;
  isTestBot?: boolean;
  fromDisplayName?: string;
};
type Incoming = { kind: GameKind; invite: ChessInvite | XiangqiInvite };
type Presence = { uid: string; status: string };

type Value = {
  socket: Socket | null;
  connected: boolean;
  pageVisible: boolean;
  error: string | null;
  chessPresence: Presence[];
  xiangqiPresence: Presence[];
  requestedKind: GameKind;
  setRequestedKind: (kind: GameKind) => void;
  connect: () => Promise<Socket>;
  emitAck: <T>(event: string, payload: unknown, timeout?: number) => Promise<Ack<T>>;
  joinFamilyRuntime: () => Promise<void>;
};

const Ctx = createContext<Value | null>(null);

function ack<T>(socket: Socket, event: string, payload: unknown, timeout = 15_000): Promise<Ack<T>> {
  return new Promise(resolve => {
    socket.timeout(timeout).emit(event, payload, (error: Error | null, response: Ack<T>) => {
      resolve(error ? { ok: false, message: error.message } : response);
    });
  });
}

export function WebGameSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useWebAuth();
  const family = useWebFamily();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const familyRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [pageVisible, setPageVisible] = useState(() => typeof document === "undefined" ? true : !document.hidden);
  const [error, setError] = useState<string | null>(null);
  const [chessPresence, setChessPresence] = useState<Presence[]>([]);
  const [xiangqiPresence, setXiangqiPresence] = useState<Presence[]>([]);
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [requestedKind, setRequestedKind] = useState<GameKind>("chess");
  const [challengeBusy, setChallengeBusy] = useState(false);

  const connect = useCallback(async () => {
    if (!user || !family.activeFamilyId) throw new Error("Chưa có gia đình hoạt động.");
    const token = await user.getIdToken();
    let socket = socketRef.current;
    if (!socket) {
      socket = io(ENV.chessSocketUrl, {
        autoConnect: false,
        transports: ["websocket", "polling"],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 500,
        reconnectionDelayMax: 4_000,
      });
      socket.on("connect", () => setConnected(true));
      socket.on("disconnect", () => setConnected(false));
      socket.on("connect_error", e => setError(e.message));
      socket.on(CHESS_EVENTS.presenceUpdate, (items: ChessPresence[]) => setChessPresence(items || []));
      socket.on(XIANGQI_EVENTS.presenceUpdate, (items: Presence[]) => setXiangqiPresence(items || []));
      socket.on(CHESS_EVENTS.inviteReceived, (invite: ChessInvite) => setIncoming({ kind: "chess", invite }));
      socket.on(XIANGQI_EVENTS.inviteReceived, (invite: XiangqiInvite) => setIncoming({ kind: "xiangqi", invite }));
      const expire = ({ inviteId }: { inviteId: string }) => setIncoming(cur => cur?.invite.inviteId === inviteId ? null : cur);
      socket.on(CHESS_EVENTS.inviteExpired, expire);
      socket.on(XIANGQI_EVENTS.inviteExpired, expire);
      socketRef.current = socket;
    } else {
      socket.auth = { token };
    }
    if (!socket.connected) {
      socket.connect();
      await new Promise<void>((resolve, reject) => {
        if (socket!.connected) return resolve();
        const timer = window.setTimeout(() => reject(new Error("Không kết nối được máy chủ game.")), 20_000);
        socket!.once("connect", () => { window.clearTimeout(timer); resolve(); });
      });
    }
    return socket;
  }, [family.activeFamilyId, user]);

  const emitAck = useCallback(async <T,>(event: string, payload: unknown, timeout = 15_000) => {
    const socket = await connect();
    return ack<T>(socket, event, payload, timeout);
  }, [connect]);

  const joinFamilyRuntime = useCallback(async () => {
    if (!family.activeFamilyId || !user) return;
    const socket = await connect();
    familyRef.current = family.activeFamilyId;
    const familyId = family.activeFamilyId;
    const [chess, xiangqi] = await Promise.all([
      ack<{ ready: boolean }>(socket, CHESS_EVENTS.appJoin, { familyId }),
      ack<{ ready: boolean }>(socket, XIANGQI_EVENTS.appJoin, { familyId }),
    ]);
    if (!chess.ok && !xiangqi.ok) setError((!chess.ok ? chess.message : undefined) || (!xiangqi.ok ? xiangqi.message : undefined) || "Không thể vào khu trò chơi.");
  }, [connect, family.activeFamilyId, user]);

  const leaveFamilyRuntime = useCallback(async (familyId = familyRef.current) => {
    const socket = socketRef.current;
    if (!socket || !familyId || !socket.connected) return;
    await Promise.allSettled([
      ack(socket, CHESS_EVENTS.appLeave, { familyId }, 4_000),
      ack(socket, XIANGQI_EVENTS.appLeave, { familyId }, 4_000),
    ]);
    if (familyRef.current === familyId) familyRef.current = null;
  }, []);

  useEffect(() => {
    if (!user || !family.activeFamilyId || !pageVisible) return;
    let cancelled = false;
    const familyId = family.activeFamilyId;
    void joinFamilyRuntime().catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : String(e)); });
    return () => {
      cancelled = true;
      if (familyRef.current === familyId) void leaveFamilyRuntime(familyId);
    };
  }, [family.activeFamilyId, joinFamilyRuntime, leaveFamilyRuntime, pageVisible, user]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onConnect = () => { if (!document.hidden) void joinFamilyRuntime(); };
    socket.on("connect", onConnect);
    return () => { socket.off("connect", onConnect); };
  }, [joinFamilyRuntime]);

  useEffect(() => {
    const markVisible = () => {
      const visible = !document.hidden;
      setPageVisible(visible);
      if (visible) {
        setError(null);
        void joinFamilyRuntime().catch(e => setError(e instanceof Error ? e.message : String(e)));
      } else {
        void leaveFamilyRuntime();
      }
    };
    const onPageHide = () => { setPageVisible(false); void leaveFamilyRuntime(); };
    const onPageShow = () => { setPageVisible(true); void joinFamilyRuntime().catch(() => undefined); };
    document.addEventListener("visibilitychange", markVisible);
    window.addEventListener("pagehide", onPageHide);
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("online", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", markVisible);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("online", onPageShow);
    };
  }, [joinFamilyRuntime, leaveFamilyRuntime]);

  useEffect(() => () => {
    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  const actOnInvite = useCallback(async (accept: boolean) => {
    if (!incoming) return;
    setChallengeBusy(true);
    setError(null);
    try {
      const event = incoming.kind === "chess"
        ? (accept ? CHESS_EVENTS.inviteAccept : CHESS_EVENTS.inviteReject)
        : (accept ? XIANGQI_EVENTS.inviteAccept : XIANGQI_EVENTS.inviteReject);
      const payload = accept
        ? { inviteId: incoming.invite.inviteId, requestId: crypto.randomUUID() }
        : { inviteId: incoming.invite.inviteId };
      const result = await emitAck<any>(event, payload);
      if (!result.ok) throw new Error(result.message || result.errorCode || "Không xử lý được lời thách đấu.");
      const kind = incoming.kind;
      setRequestedKind(kind);
      setIncoming(null);
      if (accept) router.push("/play" as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChallengeBusy(false);
    }
  }, [emitAck, incoming, router]);

  const challenger = useMemo(() => {
    if (!incoming) return null;
    return family.members.find(item => item.uid === incoming.invite.fromUid) ?? null;
  }, [family.members, incoming]);

  const value = useMemo<Value>(() => ({
    socket: socketRef.current,
    connected,
    pageVisible,
    error,
    chessPresence,
    xiangqiPresence,
    requestedKind,
    setRequestedKind,
    connect,
    emitAck,
    joinFamilyRuntime,
  }), [chessPresence, connected, connect, emitAck, error, joinFamilyRuntime, pageVisible, requestedKind, xiangqiPresence]);

  return <Ctx.Provider value={value}>
    {children}
    <WebModal open={!!incoming} onClose={() => void actOnInvite(false)} title="Lời thách đấu Nhà Mình">
      <div style={{ textAlign: "center", padding: "4px 4px 14px" }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, margin: "0 auto 12px", background: challenger?.color || "#e98aa6", overflow: "hidden", display: "grid", placeItems: "center", color: "white", fontSize: 28, fontWeight: 950 }}>
          {challenger?.avatarUrl ? <img src={challenger.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : String(challenger?.shortName || challenger?.displayName || incoming?.invite.fromDisplayName || "B").slice(0, 1)}
        </div>
        <b style={{ fontSize: 20 }}>{challenger?.displayName || incoming?.invite.fromDisplayName || "Một người thân"}</b>
        <div style={{ color: "#8d737c", fontSize: 13, marginTop: 5 }}>muốn chơi {incoming?.kind === "chess" ? "Cờ vua" : "Cờ tướng"} với bạn</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button className="bloom-btn secondary" disabled={challengeBusy} onClick={() => void actOnInvite(false)}>Từ chối</button>
        <button className="bloom-btn primary" disabled={challengeBusy} onClick={() => void actOnInvite(true)}>{challengeBusy ? "Đang vào…" : "Chấp nhận"}</button>
      </div>
      {error ? <div style={{ marginTop: 10, color: "#ad4967", fontSize: 12 }}>{error}</div> : null}
    </WebModal>
  </Ctx.Provider>;
}

export function useWebGameSocket() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useWebGameSocket must be used inside WebGameSocketProvider");
  return value;
}
