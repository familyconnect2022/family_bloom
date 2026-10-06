import { usePathname, useRouter } from "expo-router";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { ChessChallengeOverlay } from "../components/chess/ChessChallengeOverlay";
import { useBloomToast } from "../components/ui/BloomToast";
import { chessSocketService } from "../services/chess/chessSocketService";
import { cacheChessGameSnapshot, clearCachedChessGameSnapshot } from "../services/chess/chessGameSnapshotCache";
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
  pendingAwayResultGameId: string | null;
  acknowledgeAwayResult: (gameId: string) => void;
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
  const lobbyWantedRef = useRef(false);
  const connectionRef = useRef<ChessConnectionState>(connection);
  familyIdRef.current = activeFamilyId;
  stateRef.current = activeGameState;
  pathnameRef.current = pathname;
  outgoingRef.current = outgoingInvite;
  membersRef.current = familyMembers?.memberByUid;
  connectionRef.current = connection;

  const updateConnection = useCallback((next: ChessConnectionState) => {
    connectionRef.current = next;
    setConnection((current) => current === next ? current : next);
  }, []);

  const activeGameId = activeGameState && (activeGameState.status === "active" || activeGameState.status === "paused")
    ? activeGameState.gameId
    : null;

  const pendingAwayResultGameId = activeGameState?.status === "finished" && activeGameState.finishReason === "away_timeout"
    ? activeGameState.gameId
    : null;

  const acknowledgeAwayResult = useCallback((gameId: string) => {
    setActiveGameState((current) => {
      if (!current || current.gameId !== gameId || current.status !== "finished" || current.finishReason !== "away_timeout") return current;
      if (stateRef.current?.gameId === gameId) stateRef.current = null;
      return null;
    });
  }, []);

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
      const awayTimeout = next.finishReason === "away_timeout";
      const title = next.result === "draw"
        ? "♟️ Ván cờ hòa"
        : mine
          ? (awayTimeout ? "🏆 Bạn thắng vì đối thủ rời bàn quá lâu" : "♟️ Bạn đã thắng ván cờ")
          : (awayTimeout ? "⏱️ Bạn đã hết thời gian rời bàn" : "♟️ Ván cờ đã khép lại");
      showToast({
        type: "notification",
        title,
        message: awayTimeout
          ? `${opponentName} · Mở lại Cờ vua để xem kết quả.`
          : `${opponentName} · Chạm để xem bàn cờ và kết quả.`,
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
    cacheChessGameSnapshot(next);
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
        updateConnection("idle");
        return;
      }
      try {
        // Never downgrade a lobby-proven ready connection just because an
        // overlapping app:join probe is running. This removes the UI flicker
        // and the false “opening table” state after Render is already awake.
        const alreadyReady = connectionRef.current === "ready" && chessSocketService.isConnected();
        if (!alreadyReady) updateConnection("waking");

        // Health prewake is useful for Render cold-start, but it must never be on
        // the critical UI path. A /health request can legitimately outlive an
        // already-connected WebSocket on some Android networks. Start it in
        // parallel, then trust Socket.IO connect as the readiness signal.
        const healthPromise = chessSocketService.prewake().catch(() => null);
        if (!alreadyReady) updateConnection("connecting");
        await chessSocketService.connect();
        if (foregroundRef.current) updateConnection("ready");

        const joined = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.appJoin, { familyId }, 30_000);
        if (!joined.ok) {
          // The authenticated socket is still a healthy transport. Keep the UI
          // ready and retry membership/app-room assertion without painting a
          // false “Bloom đang mở bàn cờ…” state.
          if (joined.errorCode === "CHESS_SERVER_RECOVERING" && chessSocketService.isConnected()) {
            chessDebug("appJoin delayed; socket remains connected", { familyId, errorCode: joined.errorCode });
            updateConnection("ready");
            setTimeout(() => {
              if (foregroundRef.current && familyIdRef.current === familyId) void joinForeground();
            }, 1_500);
            return;
          }
          throw new Error(joined.errorCode);
        }

        const appJoinBotReported = typeof joined.data.testBotEnabled === "boolean";
        if (appJoinBotReported) {
          const botEnabled = joined.data.testBotEnabled === true;
          setTestBotEnabled(botEnabled);
          chessDebug("server:capabilities", { testBotEnabled: botEnabled, source: "appJoin" });
        } else {
          void healthPromise.then((health) => {
            if (typeof health?.chessTestBotEnabled === "boolean") {
              setTestBotEnabled(health.chessTestBotEnabled);
              chessDebug("health:capabilities", { testBotEnabled: health.chessTestBotEnabled });
            }
          });
        }
        updateConnection("ready");

        const active = await chessSocketService.emitAck<{ gameId: string } | null>(CHESS_EVENTS.sessionGetActive, { familyId }, 20_000);
        if (active.ok && active.data?.gameId) {
          const game = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId: active.data.gameId });
          if (game.ok) handleState(game.data);
        } else if (stateRef.current?.familyId === familyId && stateRef.current.status !== "finished") {
          setActiveGameState(null);
        }
      } catch (error) {
        chessDebugError("joinForeground failed", error);
        if (foregroundRef.current) updateConnection("error");
      }
    })();
    joinInFlightRef.current = task;
    try { await task; } finally { if (joinInFlightRef.current === task) joinInFlightRef.current = null; }
  }, [handleState, profileStatus, updateConnection, user]);

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
      if (!foregroundRef.current) return;
      // Socket.IO `connect` is the earliest trustworthy proof that Render is
      // reachable. Paint the lobby as connected immediately; app:join and
      // lobby:join still perform all authoritative membership checks server-side.
      // This prevents a late app:join ACK from leaving the UI stuck on
      // “Bloom đang mở bàn cờ…” while the socket is already healthy.
      connectionRef.current = "ready";
      updateConnection("ready");
      void joinForeground().finally(() => {
        const familyId = familyIdRef.current;
        if (!lobbyWantedRef.current || !familyId || !foregroundRef.current) return;
        // A reconnect creates a fresh Socket.IO room membership. Re-assert the
        // lobby silently so presence does not disappear after network recovery.
        void chessSocketService.emitAck<{ ready: boolean }>(CHESS_EVENTS.lobbyJoin, { familyId }, 20_000).then((response) => {
          if (response.ok && foregroundRef.current) {
            connectionRef.current = "ready";
            updateConnection("ready");
          }
        });
      });
    });
    const stopDisconnected = chessSocketService.on("disconnected", () => {
      if (foregroundRef.current) updateConnection("connecting");
    });
    return () => {
      stopState(); stopMove(); stopInvite(); stopPresence(); stopExpired(); stopRejected(); stopConnected(); stopDisconnected();
    };
  }, [handleMoveDelta, handleState, joinForeground, memberName, showToast, updateConnection]);

  useEffect(() => {
    setPresence([]);
    setIncomingInvite(null);
    setOutgoingInvite(null);
    if (!user || profileStatus !== "ready" || !activeFamilyId) {
      updateConnection("idle");
      setTestBotEnabled(false);
      clearCachedChessGameSnapshot();
      chessSocketService.disconnect();
      return;
    }
    if (foregroundRef.current) void joinForeground();
    return () => {
      const familyId = activeFamilyId;
      chessSocketService.emitBestEffort(CHESS_EVENTS.appLeave, { familyId });
    };
  }, [activeFamilyId, joinForeground, profileStatus, updateConnection, user]);

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
        updateConnection("connecting");
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
        updateConnection("idle");
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
        updateConnection("connecting");
        void joinForeground();
      }
    }, 2_500);

    return () => {
      changeSubscription.remove();
      focusSubscription.remove();
      clearInterval(watchdog);
    };
  }, [joinForeground, updateConnection]);

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
    lobbyWantedRef.current = true;
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "CHESS_INVALID_REQUEST" } as ChessAck;
    try {
      const response = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.lobbyJoin, { familyId }, 30_000);
      // lobby:join validates both the Firebase member and family context. If it
      // succeeds, the connection is healthy even if a concurrent app:join ACK
      // was delayed during Render cold start.
      if (response.ok) {
        if (foregroundRef.current) updateConnection("ready");
        const lobbyBotEnabled = response.data.testBotEnabled === true;
        const lobbyBotReported = typeof response.data.testBotEnabled === "boolean";
        if (lobbyBotReported) {
          setTestBotEnabled(lobbyBotEnabled);
          chessDebug("lobby:capabilities", { testBotEnabled: lobbyBotEnabled, source: "lobbyJoin" });
        } else {
          // Capability discovery is non-critical; never hold the lobby UI on it.
          void chessSocketService.prewake().then((health) => {
            if (typeof health?.chessTestBotEnabled === "boolean") {
              setTestBotEnabled(health.chessTestBotEnabled);
              chessDebug("lobby:capabilities", { testBotEnabled: health.chessTestBotEnabled, source: "health" });
            }
          }).catch(() => undefined);
        }
      } else if (response.errorCode === "CHESS_SERVER_RECOVERING" && chessSocketService.isConnected()) {
        updateConnection("ready");
      } else {
        updateConnection("error");
      }
      return response;
    } catch {
      updateConnection(chessSocketService.isConnected() ? "ready" : "error");
      return { ok: false, errorCode: "CHESS_SERVER_RECOVERING" } as ChessAck;
    }
  }, [updateConnection]);

  const leaveLobby = useCallback(() => {
    lobbyWantedRef.current = false;
    const familyId = familyIdRef.current;
    if (familyId) chessSocketService.emitBestEffort(CHESS_EVENTS.lobbyLeave, { familyId });
  }, []);

  const requestTestBotChallenge = useCallback(async (timeControl: ChessTimeControl, delayMs = 0) => {
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "CHESS_INVALID_REQUEST" } as ChessAck<ChessInvite>;

    // Server-authoritative by design: never let stale client capability state suppress
    // a DEV Bloom Bot request. Render's CHESS_TEST_BOT_ENABLED is the only switch.
    const response = await chessSocketService.emitAck<ChessInvite>(CHESS_EVENTS.testBotInvite, {
      requestId: requestId(), familyId, timeControl, delayMs,
    });
    if (response.ok) setTestBotEnabled(true);
    else if (response.errorCode === "CHESS_TEST_BOT_DISABLED") setTestBotEnabled(false);
    return response;
  }, []);

  const value = useMemo<ChessRealtimeValue>(() => ({
    connection,
    presence,
    incomingInvite,
    outgoingInvite,
    activeGameId,
    activeGameState,
    pendingAwayResultGameId,
    acknowledgeAwayResult,
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
    connection, presence, incomingInvite, outgoingInvite, activeGameId, activeGameState, pendingAwayResultGameId, acknowledgeAwayResult,
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
