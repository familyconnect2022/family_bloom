import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { ChessChallengeOverlay } from "../components/chess/ChessChallengeOverlay";
import { useBloomToast } from "../components/ui/BloomToast";
import { chessSocketService } from "../services/chess/chessSocketService";
import {
  CHESS_ERROR_COPY,
  CHESS_EVENTS,
  applyChessMoveDelta,
  type ChessAck,
  type ChessGameState,
  type ChessInvite,
  type ChessPresence,
  type ChessTimeControl,
  isChessTestBotUid,
} from "../types/chess";
import { useAuth } from "./AuthContext";
import { useFamilyMembersRealtime } from "./FamilyRealtimeContext";

export type ChessConnectionState = "idle" | "waking" | "connecting" | "ready" | "error";

type ChessRealtimeValue = {
  connection: ChessConnectionState;
  presence: ChessPresence[];
  incomingInvite: ChessInvite | null;
  outgoingInvite: ChessInvite | null;
  activeGameId: string | null;
  activeGameState: ChessGameState | null;
  challenge: (toUid: string, timeControl: ChessTimeControl) => Promise<ChessAck<ChessInvite>>;
  cancelInvite: (inviteId: string) => Promise<ChessAck>;
  acceptInvite: (inviteId: string) => Promise<ChessAck<{ gameId: string; state: ChessGameState }>>;
  rejectInvite: (inviteId: string) => Promise<ChessAck>;
  enterLobby: () => Promise<ChessAck>;
  leaveLobby: () => void;
  reconnect: () => Promise<void>;
  testBotEnabled: boolean;
  requestTestBotChallenge: (timeControl: ChessTimeControl, delayMs?: number) => Promise<ChessAck<ChessInvite>>;
};

const ChessRealtimeContext = createContext<ChessRealtimeValue | null>(null);
const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

// Keep the foreground socket lifecycle silent on-device. Errors are surfaced through connection/UI
// state instead of console serialization on the realtime render path.
const chessDebugError = (_label: string, _error: unknown) => {};
const chessDebug = (_label: string, _payload?: unknown) => {};

export function useChessRealtime() {
  const value = useContext(ChessRealtimeContext);
  if (!value) throw new Error("useChessRealtime phải nằm trong ChessRealtimeProvider");
  return value;
}

export function ChessRealtimeProvider({ children }: { children: React.ReactNode }) {
  const { user, activeFamilyId, profileStatus } = useAuth();
  const familyMembers = useFamilyMembersRealtime();
  const { showToast } = useBloomToast();
  const router = useRouter();
  const pathname = usePathname();

  const [connection, setConnection] = useState<ChessConnectionState>("idle");
  const [presence, setPresence] = useState<ChessPresence[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<ChessInvite | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<ChessInvite | null>(null);
  const [activeGameState, setActiveGameState] = useState<ChessGameState | null>(null);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [testBotEnabled, setTestBotEnabled] = useState(false);

  const familyIdRef = useRef<string | null>(activeFamilyId);
  const foregroundRef = useRef(AppState.currentState === "active");
  const stateRef = useRef<ChessGameState | null>(null);
  const pathnameRef = useRef(pathname);
  const notifiedRevisionRef = useRef<string | null>(null);
  const outgoingRef = useRef<ChessInvite | null>(null);
  const membersRef = useRef(familyMembers?.memberByUid);
  const joinInFlightRef = useRef<Promise<void> | null>(null);
  const connectionRef = useRef<ChessConnectionState>(connection);
  familyIdRef.current = activeFamilyId;
  stateRef.current = activeGameState;
  pathnameRef.current = pathname;
  outgoingRef.current = outgoingInvite;
  membersRef.current = familyMembers?.memberByUid;
  connectionRef.current = connection;

  const activeGameId = activeGameState && (activeGameState.status === "active" || activeGameState.status === "paused")
    ? activeGameState.gameId
    : null;

  const memberName = useCallback((uid: string) => {
    if (isChessTestBotUid(uid)) return "Bloom Bot";
    const member = membersRef.current?.get(uid);
    return member?.shortName || member?.displayName || "Người thân";
  }, []);

  const isOnGameScreen = useCallback((gameId: string) => {
    const path = pathnameRef.current || "";
    return path.startsWith("/chess-game/") && path.includes(gameId);
  }, []);

  const showGameStateToast = useCallback((next: ChessGameState, previous: ChessGameState | null) => {
    if (!user || isOnGameScreen(next.gameId)) return;
    const myColor = next.whiteUid === user.uid ? "w" : next.blackUid === user.uid ? "b" : null;
    if (!myColor) return;
    const opponentUid = myColor === "w" ? next.blackUid : next.whiteUid;
    const opponentName = memberName(opponentUid);

    if (next.status === "finished" && previous?.status !== "finished") {
      const mine = (next.result === "white" && myColor === "w") || (next.result === "black" && myColor === "b");
      const title = next.result === "draw" ? "♟️ Ván cờ hòa" : mine ? "♟️ Bạn đã thắng ván cờ" : "♟️ Ván cờ đã khép lại";
      showToast({
        type: "notification",
        title,
        message: `${opponentName} · Chạm để xem bàn cờ và kết quả.`,
        duration: 6500,
        onPress: () => router.push({ pathname: "/chess-game/[gameId]" as never, params: { gameId: next.gameId } } as never),
      });
      return;
    }

    if (next.status !== "active" || next.turn !== myColor || !next.lastMove) return;
    if (previous && next.ply <= previous.ply) return;
    const notificationKey = `${next.gameId}:${next.revision}`;
    if (notifiedRevisionRef.current === notificationKey) return;
    notifiedRevisionRef.current = notificationKey;
    const moveNumber = Math.max(1, Math.ceil(next.ply / 2));
    const inCheck = !!next.checkSquare;
    showToast({
      type: inCheck ? "warning" : "notification",
      title: inCheck ? `♟️ Vua của bạn đang bị chiếu • Nước ${moveNumber}` : `♟️ Đến lượt bạn • Nước ${moveNumber}`,
      message: `${opponentName} vừa đi ${next.lastMove.san}. Chạm để quay lại bàn cờ.`,
      duration: 7200,
      onPress: () => router.push({ pathname: "/chess-game/[gameId]" as never, params: { gameId: next.gameId } } as never),
    });
  }, [isOnGameScreen, memberName, router, showToast, user]);

  const handleState = useCallback((next: ChessGameState) => {
    const previous = stateRef.current?.gameId === next.gameId ? stateRef.current : null;
    stateRef.current = next;
    setActiveGameState(next);
    setIncomingInvite((current) => current && (next.whiteUid === current.fromUid || next.blackUid === current.fromUid) ? null : current);
    showGameStateToast(next, previous);

    const pending = outgoingRef.current;
    if (pending && next.status === "active" && (next.whiteUid === pending.toUid || next.blackUid === pending.toUid)) {
      setOutgoingInvite(null);
      if (!isOnGameScreen(next.gameId)) {
        showToast({
          type: "success",
          title: `${memberName(pending.toUid)} đã nhận lời ♟️`,
          message: "Ván cờ đã bắt đầu. Chạm để vào bàn cờ.",
          duration: 6000,
          onPress: () => router.push({ pathname: "/chess-game/[gameId]" as never, params: { gameId: next.gameId } } as never),
        });
      }
    }
  }, [isOnGameScreen, memberName, router, showGameStateToast, showToast]);

  const handleMoveDelta = useCallback((delta: import("../types/chess").ChessMoveDelta) => {
    const current = stateRef.current;
    if (!current || current.gameId !== delta.gameId || delta.version <= current.revision) return;
    handleState(applyChessMoveDelta(current, delta));
  }, [handleState]);

  const joinForeground = useCallback(async () => {
    if (joinInFlightRef.current) return joinInFlightRef.current;
    const task = (async () => {
      const familyId = familyIdRef.current;
      if (!user || profileStatus !== "ready" || !familyId || !foregroundRef.current) {
        setConnection("idle");
        return;
      }
      try {
        setConnection("waking");
        const wake = chessSocketService.prewake();
        setConnection("connecting");
        const [, connected] = await Promise.allSettled([wake, chessSocketService.connect()]);
        if (connected.status === "rejected") throw connected.reason;
        const joined = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.appJoin, { familyId }, 30_000);
        if (!joined.ok) {
          // A cold Render/Firestore start may outlive an ACK timeout even though the
          // Socket itself is already healthy. Do not paint a false hard error.
          if (joined.errorCode === "CHESS_SERVER_RECOVERING" && chessSocketService.isConnected()) {
            chessDebug("appJoin delayed; socket remains connected", { familyId, errorCode: joined.errorCode });
            setConnection("connecting");
            setTimeout(() => {
              if (foregroundRef.current && familyIdRef.current === familyId) void joinForeground();
            }, 1_500);
            return;
          }
          throw new Error(joined.errorCode);
        }
        const botEnabled = joined.data.testBotEnabled === true;
        setTestBotEnabled(botEnabled);
        chessDebug("server:capabilities", { testBotEnabled: botEnabled });
        setConnection("ready");

        const active = await chessSocketService.emitAck<{ gameId: string } | null>(CHESS_EVENTS.sessionGetActive, { familyId }, 20_000);
        if (active.ok && active.data?.gameId) {
          const game = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId: active.data.gameId });
          if (game.ok) handleState(game.data);
        } else if (stateRef.current?.familyId === familyId && stateRef.current.status !== "finished") {
          setActiveGameState(null);
        }
      } catch (error) {
        chessDebugError("joinForeground failed", error);
        if (foregroundRef.current) setConnection("error");
      }
    })();
    joinInFlightRef.current = task;
    try { await task; } finally { if (joinInFlightRef.current === task) joinInFlightRef.current = null; }
  }, [handleState, profileStatus, user]);

  useEffect(() => {
    const stopState = chessSocketService.on("state", handleState);
    const stopMove = chessSocketService.on("move", handleMoveDelta);
    const stopInvite = chessSocketService.on("invite", (invite) => {
      if (invite.familyId !== familyIdRef.current || !foregroundRef.current) return;
      setIncomingInvite(invite);
    });
    const stopPresence = chessSocketService.on("presence", (items) => setPresence(items));
    const stopExpired = chessSocketService.on("inviteExpired", ({ inviteId }) => {
      setIncomingInvite((current) => current?.inviteId === inviteId ? null : current);
      setOutgoingInvite((current) => {
        if (current?.inviteId !== inviteId) return current;
        showToast({ type: "info", title: "Lời thách đấu vừa khép lại", message: "Có lẽ mình sẽ gặp nhau ở một ván khác nhé." });
        return null;
      });
    });
    const stopRejected = chessSocketService.on("inviteRejected", ({ inviteId, byUid }) => {
      setOutgoingInvite((current) => {
        if (current?.inviteId !== inviteId) return current;
        showToast({ type: "info", title: `${memberName(byUid)} chưa tiện chơi lúc này 🌿`, message: "Mình có thể thách đấu lại vào một lúc khác." });
        return null;
      });
    });
    const stopConnected = chessSocketService.on("connected", () => {
      if (foregroundRef.current) void joinForeground();
    });
    const stopDisconnected = chessSocketService.on("disconnected", () => {
      if (foregroundRef.current) setConnection("connecting");
    });
    return () => {
      stopState(); stopMove(); stopInvite(); stopPresence(); stopExpired(); stopRejected(); stopConnected(); stopDisconnected();
    };
  }, [handleMoveDelta, handleState, joinForeground, memberName, showToast]);

  useEffect(() => {
    setPresence([]);
    setIncomingInvite(null);
    setOutgoingInvite(null);
    if (!user || profileStatus !== "ready" || !activeFamilyId) {
      setConnection("idle");
      setTestBotEnabled(false);
      chessSocketService.disconnect();
      return;
    }
    if (foregroundRef.current) void joinForeground();
    return () => {
      const familyId = activeFamilyId;
      chessSocketService.emitBestEffort(CHESS_EVENTS.appLeave, { familyId });
    };
  }, [activeFamilyId, joinForeground, profileStatus, user]);

  useEffect(() => {
    const resume = (source: "change" | "focus" | "watchdog") => {
      const actualState = AppState.currentState;
      const active = actualState === "active";
      chessDebug(`foreground:${source}`, {
        appState: actualState,
        foregroundRef: foregroundRef.current,
        socketConnected: chessSocketService.isConnected(),
        connection: connectionRef.current,
        pathname: pathnameRef.current,
      });
      if (!active) return;
      foregroundRef.current = true;
      if (!chessSocketService.isConnected() || connectionRef.current !== "ready") {
        setConnection("connecting");
        void joinForeground();
      }
    };

    const changeSubscription = AppState.addEventListener("change", (next) => {
      const wasActive = foregroundRef.current;
      const active = next === "active";
      chessDebug("appState:change", { fromActive: wasActive, next, pathname: pathnameRef.current });
      foregroundRef.current = active;
      const familyId = familyIdRef.current;
      if (active) {
        resume("change");
      } else {
        setIncomingInvite(null);
        setPresence([]);
        setConnection("idle");
        if (familyId) chessSocketService.emitBestEffort(CHESS_EVENTS.appLeave, { familyId });
        chessSocketService.disconnect();
      }
    });

    // Some Android builds/OEMs can resume JS without delivering a reliable
    // `change -> active` transition to every listener. The Android-specific
    // focus event gives us a second foreground signal without keeping the
    // socket alive while the app is truly backgrounded.
    const focusSubscription = AppState.addEventListener("focus", () => resume("focus"));

    // Final safety net: when JS resumes, timers resume too. Re-read the real
    // AppState and live Socket.IO flag instead of trusting stale UI state.
    const watchdog = setInterval(() => {
      const active = AppState.currentState === "active";
      if (!active) return;
      const socketConnected = chessSocketService.isConnected();
      if (!foregroundRef.current || !socketConnected || connectionRef.current === "idle" || connectionRef.current === "error") {
        chessDebug("foreground:watchdog repair", {
          appState: AppState.currentState,
          foregroundRef: foregroundRef.current,
          socketConnected,
          connection: connectionRef.current,
          pathname: pathnameRef.current,
        });
        foregroundRef.current = true;
        setConnection("connecting");
        void joinForeground();
      }
    }, 2_500);

    return () => {
      changeSubscription.remove();
      focusSubscription.remove();
      clearInterval(watchdog);
    };
  }, [joinForeground]);

  useEffect(() => () => chessSocketService.disconnect(), []);

  const challenge = useCallback(async (toUid: string, timeControl: ChessTimeControl) => {
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "CHESS_INVALID_REQUEST" } as ChessAck<ChessInvite>;
    const response = await chessSocketService.emitAck<ChessInvite>(CHESS_EVENTS.inviteCreate, { requestId: requestId(), familyId, toUid, timeControl });
    if (response.ok) setOutgoingInvite(response.data);
    return response;
  }, []);

  const cancelInvite = useCallback(async (inviteId: string) => {
    const response = await chessSocketService.emitAck(CHESS_EVENTS.inviteCancel, { inviteId });
    if (response.ok) setOutgoingInvite(null);
    return response;
  }, []);

  const acceptInvite = useCallback(async (inviteId: string) => {
    const response = await chessSocketService.emitAck<{ gameId: string; state: ChessGameState }>(CHESS_EVENTS.inviteAccept, { requestId: requestId(), inviteId });
    if (response.ok) {
      setIncomingInvite(null);
      setOutgoingInvite(null);
      handleState(response.data.state);
      router.replace({ pathname: "/chess-game/[gameId]" as never, params: { gameId: response.data.gameId } } as never);
    }
    return response;
  }, [handleState, router]);

  const rejectInvite = useCallback(async (inviteId: string) => {
    const rejecting = incomingInvite?.inviteId === inviteId ? incomingInvite : null;
    const response = await chessSocketService.emitAck(CHESS_EVENTS.inviteReject, { inviteId });
    if (response.ok) {
      setIncomingInvite(null);
      if (rejecting?.isTestBot) showToast({ type: "info", title: "Bloom Bot sẽ chờ bạn ♟️", message: "Khi muốn thử lại, mở Sảnh Cờ vua và gọi đối thủ thử nghiệm nhé." });
    }
    return response;
  }, [incomingInvite, showToast]);

  const enterLobby = useCallback(async () => {
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "CHESS_INVALID_REQUEST" } as ChessAck;
    const response = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.lobbyJoin, { familyId }, 30_000);
    // lobby:join validates both the Firebase member and family context. If it
    // succeeds, the connection is healthy even if a concurrent app:join ACK
    // was delayed during Render cold start.
    if (response.ok) {
      const botEnabled = response.data.testBotEnabled === true;
      setTestBotEnabled(botEnabled);
      chessDebug("lobby:capabilities", { testBotEnabled: botEnabled });
      if (foregroundRef.current) setConnection("ready");
    }
    return response;
  }, []);

  const leaveLobby = useCallback(() => {
    const familyId = familyIdRef.current;
    if (familyId) chessSocketService.emitBestEffort(CHESS_EVENTS.lobbyLeave, { familyId });
  }, []);

  const requestTestBotChallenge = useCallback(async (timeControl: ChessTimeControl, delayMs = 0) => {
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "CHESS_INVALID_REQUEST" } as ChessAck<ChessInvite>;
    if (!testBotEnabled) return { ok: false, errorCode: "CHESS_TEST_BOT_DISABLED" } as ChessAck<ChessInvite>;
    return chessSocketService.emitAck<ChessInvite>(CHESS_EVENTS.testBotInvite, { requestId: requestId(), familyId, timeControl, delayMs });
  }, [testBotEnabled]);

  const value = useMemo<ChessRealtimeValue>(() => ({
    connection,
    presence,
    incomingInvite,
    outgoingInvite,
    activeGameId,
    activeGameState,
    challenge,
    cancelInvite,
    acceptInvite,
    rejectInvite,
    enterLobby,
    leaveLobby,
    reconnect: joinForeground,
    testBotEnabled,
    requestTestBotChallenge,
  }), [
    connection, presence, incomingInvite, outgoingInvite, activeGameId, activeGameState,
    challenge, cancelInvite, acceptInvite, rejectInvite, enterLobby, leaveLobby, joinForeground, testBotEnabled, requestTestBotChallenge,
  ]);

  const challenger = incomingInvite && !incomingInvite.isTestBot ? familyMembers?.memberByUid.get(incomingInvite.fromUid) : null;

  return (
    <ChessRealtimeContext.Provider value={value}>
      {children}
      <ChessChallengeOverlay
        invite={incomingInvite}
        challenger={challenger}
        busy={challengeBusy}
        onAccept={() => {
          if (!incomingInvite || challengeBusy || !user) return;
          setChallengeBusy(true);
          void acceptInvite(incomingInvite.inviteId).then((response) => {
            if (!response.ok) showToast({ type: "warning", title: "Chưa vào được ván", message: CHESS_ERROR_COPY[response.errorCode] });
          }).finally(() => setChallengeBusy(false));
        }}
        onReject={() => {
          if (!incomingInvite || challengeBusy) return;
          setChallengeBusy(true);
          void rejectInvite(incomingInvite.inviteId).then((response) => {
            if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
          }).finally(() => setChallengeBusy(false));
        }}
      />
    </ChessRealtimeContext.Provider>
  );
}
