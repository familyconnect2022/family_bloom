import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { chessSocketService } from "../services/chess/chessSocketService";
import { cacheChessGameSnapshot, clearCachedChessGameSnapshot } from "../services/chess/chessGameSnapshotCache";
import { clearChessGameStore, getChessGameStoreSnapshot, publishChessGameNetwork, publishChessGameSnapshot, publishChessMoveDelta } from "../services/chess/chessGameStore";
import { chessDiagnostics } from "../services/chess/chessDiagnostics";
import { publishChessUiEvent } from "../services/chess/chessUiEventStore";
import { resetChessSurfaceSession } from "../services/chess/chessSurfaceStore";
import {
  CHESS_EVENTS,
  type ChessAck,
  type ChessGameState,
  type ChessInvite,
  type ChessMoveCommandAck,
  type ChessPromotionPiece,
  type ChessPresence,
  type ChessSessionRecovery,
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
  pendingResultGameId: string | null;
  acknowledgeResult: (gameId: string) => void;
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
export type ChessRealtimeActionsValue = {
  acknowledgeResult: (gameId: string) => void;
  setBoardPresence: (gameId: string | null, visible: boolean) => void;
  resyncGame: (gameId: string) => Promise<ChessGameState | null>;
  moveGame: (gameId: string, from: string, to: string, promotion?: ChessPromotionPiece, clientMoveId?: string, expectedVersion?: number) => Promise<ChessAck<ChessMoveCommandAck>>;
  resignGame: (gameId: string) => Promise<ChessAck<ChessGameState>>;
  offerDraw: (gameId: string) => Promise<ChessAck<ChessGameState>>;
  acceptDraw: (gameId: string) => Promise<ChessAck<ChessGameState>>;
  rejectDraw: (gameId: string) => Promise<ChessAck<ChessGameState>>;
  rematchGame: (gameId: string, stableRequestId?: string) => Promise<ChessAck<{ waiting: boolean; gameId?: string; state?: ChessGameState; expiresAt?: number }>>;
  cancelRematch: (gameId: string) => Promise<ChessAck<{ cancelled: boolean }>>;
  readyGame: (gameId: string) => Promise<ChessAck<ChessGameState>>;
};
const ChessRealtimeActionsContext = createContext<ChessRealtimeActionsValue | null>(null);
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

/** Stable, narrow action channel for game surfaces. Presence/invite/lobby state
 * changes must not force ChessBoard-facing consumers to re-render. */
export function useChessRealtimeActions() {
  const value = useContext(ChessRealtimeActionsContext);
  if (!value) throw new Error("useChessRealtimeActions phải nằm trong ChessRealtimeProvider");
  return value;
}

export function ChessRealtimeProvider({ children, bootReady = true }: { children: React.ReactNode; bootReady?: boolean }) {
  const { user, activeFamilyId, profileStatus } = useAuth();
  const familyMembers = useFamilyMembersRealtime();

  const [connection, setConnection] = useState<ChessConnectionState>("idle");
  const [presence, setPresence] = useState<ChessPresence[]>([]);
  const [incomingInvite, setIncomingInvite] = useState<ChessInvite | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<ChessInvite | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [pendingResultGameId, setPendingResultGameId] = useState<string | null>(null);
  const [testBotEnabled, setTestBotEnabled] = useState(false);

  const familyIdRef = useRef<string | null>(activeFamilyId);
  const foregroundRef = useRef(AppState.currentState === "active");
  const stateRef = useRef<ChessGameState | null>(null);
  const notifiedRevisionRef = useRef<string | null>(null);
  const outgoingRef = useRef<ChessInvite | null>(null);
  const membersRef = useRef(familyMembers?.memberByUid);
  const joinInFlightRef = useRef<{ familyId: string; promise: Promise<void> } | null>(null);
  const gameSyncInFlightRef = useRef(false);
  const identityRef = useRef<{ uid: string | null; familyId: string | null }>({ uid: user?.uid ?? null, familyId: activeFamilyId });
  const lobbyWantedRef = useRef(false);
  const connectionRef = useRef<ChessConnectionState>(connection);
  const boardPresenceRef = useRef<{ gameId: string | null; visible: boolean }>({ gameId: null, visible: false });
  familyIdRef.current = activeFamilyId;
  outgoingRef.current = outgoingInvite;
  membersRef.current = familyMembers?.memberByUid;
  connectionRef.current = connection;

  const updateConnection = useCallback((next: ChessConnectionState) => {
    connectionRef.current = next;
    setConnection((current) => current === next ? current : next);
  }, []);

  const acknowledgeResult = useCallback((gameId: string) => {
    const current = stateRef.current?.gameId === gameId ? stateRef.current : getChessGameStoreSnapshot(gameId).state;
    const familyId = current?.familyId ?? familyIdRef.current;
    if (stateRef.current?.gameId === gameId && stateRef.current.status === "finished") stateRef.current = null;
    setPendingResultGameId((pending) => pending === gameId ? null : pending);
    if (!familyId) return;
    void chessSocketService.emitAck<{ acknowledged: boolean }>(CHESS_EVENTS.gameResultAck, { familyId, gameId }, 12_000);
  }, []);

  const memberName = useCallback((uid: string) => {
    if (isChessTestBotUid(uid)) return "Bloom Bot";
    const member = membersRef.current?.get(uid);
    return member?.shortName || member?.displayName || "Người thân";
  }, []);

  const showGameStateToast = useCallback((next: ChessGameState, previous: ChessGameState | null) => {
    if (!user) return;
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
      publishChessUiEvent({
        type: "notification",
        title,
        message: awayTimeout
          ? `${opponentName} · Mở lại Cờ vua để xem kết quả.`
          : `${opponentName} · Chạm để xem bàn cờ và kết quả.`,
        duration: 6500,
        gameId: next.gameId,
        suppressWhenGameVisible: true,
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
    publishChessUiEvent({
      type: inCheck ? "warning" : "notification",
      title: inCheck ? `♟️ Vua của bạn đang bị chiếu • Nước ${moveNumber}` : `♟️ Đến lượt bạn • Nước ${moveNumber}`,
      message: `${opponentName} vừa đi ${next.lastMove.san}. Chạm để quay lại bàn cờ.`,
      duration: 7200,
      gameId: next.gameId,
      suppressWhenGameVisible: true,
    });
  }, [memberName, user]);

  const handleState = useCallback((next: ChessGameState) => {
    // A socket can briefly receive a stale room packet while a family switch is
    // crossing native/JS boundaries. Never let another family's state enter the
    // canonical client store.
    if (next.familyId !== familyIdRef.current) return;
    const previous = stateRef.current?.gameId === next.gameId ? stateRef.current : null;
    publishChessGameSnapshot(next);
    publishChessGameNetwork(next.gameId, {
      connectionPhase: !chessSocketService.isConnected()
        ? "reconnecting"
        : gameSyncInFlightRef.current
          ? "synchronizing"
          : "connected",
      error: null,
    });
    cacheChessGameSnapshot(next);
    stateRef.current = next;
    const nextActiveGameId = next.status === "waiting" || next.status === "active" || next.status === "paused" ? next.gameId : null;
    const nextResult = next.status === "finished" ? next.gameId : null;
    setActiveGameId((current) => current === nextActiveGameId ? current : nextActiveGameId);
    setPendingResultGameId((current) => current === nextResult ? current : nextResult);
    setIncomingInvite((current) => current && (next.whiteUid === current.fromUid || next.blackUid === current.fromUid) ? null : current);
    showGameStateToast(next, previous);

    const pending = outgoingRef.current;
    if (pending && next.status === "active" && (next.whiteUid === pending.toUid || next.blackUid === pending.toUid)) {
      setOutgoingInvite(null);
      publishChessUiEvent({
        type: "success",
        title: `${memberName(pending.toUid)} đã nhận lời ♟️`,
        message: "Ván cờ đã bắt đầu. Chạm để vào bàn cờ.",
        duration: 6000,
        gameId: next.gameId,
        suppressWhenGameVisible: true,
      });
    }
  }, [memberName, showGameStateToast]);

  const handleMoveDelta = useCallback((delta: import("../types/chess").ChessMoveDelta) => {
    const current = stateRef.current?.gameId === delta.gameId
      ? stateRef.current
      : getChessGameStoreSnapshot(delta.gameId).state;
    if (!current || current.familyId !== familyIdRef.current || delta.version <= current.revision) return;
    const next = publishChessMoveDelta(delta, current);
    if (!next) return;
    handleState(next);
  }, [handleState]);

  const joinForeground = useCallback(async () => {
    const familyId = familyIdRef.current;
    if (!bootReady || !user || profileStatus !== "ready" || !familyId || !foregroundRef.current) {
      updateConnection("idle");
      return;
    }
    const existing = joinInFlightRef.current;
    if (existing?.familyId === familyId) return existing.promise;

    const task = (async () => {
      const isCurrentFamily = () => foregroundRef.current && familyIdRef.current === familyId;
      try {
        const alreadyReady = connectionRef.current === "ready" && chessSocketService.isConnected();
        if (isCurrentFamily()) {
          if (!alreadyReady) updateConnection("waking");
        }
        const healthPromise = chessSocketService.prewake().catch(() => null);
        if (isCurrentFamily()) {
          if (!alreadyReady) updateConnection("connecting");
        }
        await chessSocketService.connect();
        if (!isCurrentFamily()) return;
        updateConnection("ready");

        const localGameId = stateRef.current?.familyId === familyId ? stateRef.current.gameId : null;
        if (localGameId) {
          gameSyncInFlightRef.current = true;
          publishChessGameNetwork(localGameId, { connectionPhase: "synchronizing", error: null });
        }

        const joined = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.appJoin, { familyId }, 30_000);
        if (!isCurrentFamily()) return;
        if (!joined.ok) {
          if (joined.errorCode === "CHESS_SERVER_RECOVERING" && chessSocketService.isConnected()) {
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
            if (isCurrentFamily() && typeof health?.chessTestBotEnabled === "boolean") {
              setTestBotEnabled(health.chessTestBotEnabled);
              chessDebug("health:capabilities", { testBotEnabled: health.chessTestBotEnabled, source: "health" });
            }
          });
        }
        updateConnection("ready");

        const recovery = await chessSocketService.emitAck<ChessSessionRecovery>(CHESS_EVENTS.sessionRecover, { familyId }, 20_000);
        if (!isCurrentFamily()) return;
        if (!recovery.ok) throw new Error(recovery.errorCode);

        if (recovery.data.kind === "active" || recovery.data.kind === "finished_unseen") {
          gameSyncInFlightRef.current = true;
          publishChessGameNetwork(recovery.data.gameId, { connectionPhase: "synchronizing", error: null });
          const game = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId: recovery.data.gameId }, 20_000);
          if (!isCurrentFamily()) return;
          if (!game.ok) throw new Error(game.errorCode);
          handleState(game.data);
          gameSyncInFlightRef.current = false;
          publishChessGameNetwork(game.data.gameId, { connectionPhase: "connected", error: null });
          if (recovery.data.kind === "finished_unseen") setPendingResultGameId(game.data.gameId);
          const presence = boardPresenceRef.current;
          if (game.data.status !== "finished" && presence.visible && presence.gameId === game.data.gameId) {
            chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId: game.data.gameId, visible: true });
          }
        } else {
          gameSyncInFlightRef.current = false;
          if (stateRef.current?.familyId === familyId) stateRef.current = null;
          setActiveGameId(null);
          setPendingResultGameId(null);
        }
      } catch (error) {
        gameSyncInFlightRef.current = false;
        chessDebugError("joinForeground failed", error);
        const currentGameId = stateRef.current?.familyId === familyId ? stateRef.current.gameId : null;
        if (currentGameId) publishChessGameNetwork(currentGameId, { connectionPhase: "reconnecting" });
        if (foregroundRef.current && familyIdRef.current === familyId) updateConnection("error");
      }
    })();
    joinInFlightRef.current = { familyId, promise: task };
    try { await task; } finally {
      if (joinInFlightRef.current?.promise === task) joinInFlightRef.current = null;
    }
  }, [bootReady, handleState, profileStatus, updateConnection, user]);

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
        publishChessUiEvent({ type: "info", title: "Lời thách đấu vừa khép lại", message: "Có lẽ mình sẽ gặp nhau ở một ván khác nhé." });
        return null;
      });
    });
    const stopRejected = chessSocketService.on("inviteRejected", ({ inviteId, byUid }) => {
      setOutgoingInvite((current) => {
        if (current?.inviteId !== inviteId) return current;
        publishChessUiEvent({ type: "info", title: `${memberName(byUid)} chưa tiện chơi lúc này 🌿`, message: "Mình có thể thách đấu lại vào một lúc khác." });
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
      const currentGame = stateRef.current;
      if (currentGame?.familyId === familyIdRef.current) {
        gameSyncInFlightRef.current = true;
        publishChessGameNetwork(currentGame.gameId, { connectionPhase: "synchronizing", error: null });
      }
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
      gameSyncInFlightRef.current = true;
      if (foregroundRef.current) updateConnection("connecting");
      const currentGame = stateRef.current;
      if (currentGame?.familyId === familyIdRef.current) publishChessGameNetwork(currentGame.gameId, { connectionPhase: "reconnecting" });
    });
    return () => {
      stopState(); stopMove(); stopInvite(); stopPresence(); stopExpired(); stopRejected(); stopConnected(); stopDisconnected();
    };
  }, [handleMoveDelta, handleState, joinForeground, memberName, updateConnection]);

  useEffect(() => {
    const previous = identityRef.current;
    const next = { uid: user?.uid ?? null, familyId: activeFamilyId };
    const identityChanged = previous.uid !== next.uid || previous.familyId !== next.familyId;
    if (!identityChanged) return;

    // Proactive boundary: mark the old board away and leave its family before
    // discarding local bindings. The server repeats this cleanup on app:join,
    // so correctness never depends on React effect ordering.
    if (previous.uid === next.uid && previous.familyId) {
      const previousGame = stateRef.current?.familyId === previous.familyId ? stateRef.current : null;
      if (previousGame && previousGame.status !== "finished") {
        chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId: previousGame.gameId, visible: false });
      }
      chessSocketService.emitBestEffort(CHESS_EVENTS.appLeave, { familyId: previous.familyId });
    }

    identityRef.current = next;
    gameSyncInFlightRef.current = false;
    resetChessSurfaceSession();
    clearCachedChessGameSnapshot();
    clearChessGameStore();
    stateRef.current = null;
    boardPresenceRef.current = { gameId: null, visible: false };
  }, [activeFamilyId, user?.uid]);

  useEffect(() => {
    setPresence([]);
    setIncomingInvite(null);
    setOutgoingInvite(null);
    setActiveGameId(null);
    setPendingResultGameId(null);
    if (!bootReady || !user || profileStatus !== "ready" || !activeFamilyId) {
      updateConnection("idle");
      setTestBotEnabled(false);
      clearCachedChessGameSnapshot();
      clearChessGameStore();
      chessSocketService.disconnect();
      return;
    }
    if (foregroundRef.current) void joinForeground();
    return () => {
      const familyId = activeFamilyId;
      chessSocketService.emitBestEffort(CHESS_EVENTS.appLeave, { familyId });
    };
  }, [activeFamilyId, bootReady, joinForeground, profileStatus, updateConnection, user]);

  useEffect(() => {
    const resume = (source: "change" | "focus" | "watchdog") => {
      if (!bootReady) return;
      const actualState = AppState.currentState;
      const active = actualState === "active";
      chessDebug(`foreground:${source}`, {
        appState: actualState,
        foregroundRef: foregroundRef.current,
        socketConnected: chessSocketService.isConnected(),
        connection: connectionRef.current,
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
      chessDebug("appState:change", { fromActive: wasActive, next });
      foregroundRef.current = active;
      const familyId = familyIdRef.current;
      if (active) {
        resume("change");
      } else {
        setIncomingInvite(null);
        setPresence([]);
        updateConnection("idle");
        const presence = boardPresenceRef.current;
        if (presence.gameId) chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId: presence.gameId, visible: false });
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
      if (!bootReady) return;
      const active = AppState.currentState === "active";
      if (!active) return;
      const socketConnected = chessSocketService.isConnected();
      if (!foregroundRef.current || !socketConnected || connectionRef.current === "idle" || connectionRef.current === "error") {
        chessDebug("foreground:watchdog repair", {
          appState: AppState.currentState,
          foregroundRef: foregroundRef.current,
          socketConnected,
          connection: connectionRef.current,
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
  }, [bootReady, joinForeground, updateConnection]);

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
      cacheChessGameSnapshot(response.data.state);
      handleState(response.data.state);
    }
    return response;
  }, [handleState]);

  const rejectInvite = useCallback(async (inviteId: string) => {
    const rejecting = incomingInvite?.inviteId === inviteId ? incomingInvite : null;
    const response = await chessSocketService.emitAck(CHESS_EVENTS.inviteReject, { inviteId });
    if (response.ok) {
      setIncomingInvite(null);
      if (rejecting?.isTestBot) publishChessUiEvent({ type: "info", title: "Bloom Bot sẽ chờ bạn ♟️", message: "Khi muốn thử lại, mở Sảnh Cờ vua và gọi đối thủ thử nghiệm nhé." });
    }
    return response;
  }, [incomingInvite]);

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

  const setBoardPresence = useCallback((gameId: string | null, visible: boolean) => {
    boardPresenceRef.current = { gameId, visible };
    if (!gameId || !chessSocketService.isConnected() || !foregroundRef.current) return;
    chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId, visible });
  }, []);

  const resyncGame = useCallback(async (gameId: string): Promise<ChessGameState | null> => {
    if (!gameId) return null;
    publishChessGameNetwork(gameId, { connectionPhase: chessSocketService.isConnected() ? "synchronizing" : "reconnecting", error: null });
    gameSyncInFlightRef.current = true;
    chessDiagnostics.mark({ gameId, stage: "resync_start" });
    const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameResync, { gameId });
    if (!response.ok) {
      gameSyncInFlightRef.current = false;
      publishChessGameNetwork(gameId, { connectionPhase: "reconnecting", error: response.errorCode });
      chessDiagnostics.mark({ gameId, stage: "resync_fail", detail: response.errorCode });
      return null;
    }
    handleState(response.data);
    gameSyncInFlightRef.current = false;
    publishChessGameNetwork(gameId, { connectionPhase: "connected", error: null });
    chessDiagnostics.mark({ gameId, stage: "resync_ok", version: response.data.revision });
    return response.data;
  }, [handleState]);

  const moveGame = useCallback(async (
    gameId: string,
    from: string,
    to: string,
    promotion?: ChessPromotionPiece,
    clientMoveId = requestId(),
    expectedVersion?: number,
  ): Promise<ChessAck<ChessMoveCommandAck>> => {
    const current = getChessGameStoreSnapshot(gameId).state;
    if (!current) return { ok: false, errorCode: "CHESS_GAME_NOT_FOUND" };
    const commandVersion = expectedVersion ?? current.revision;
    chessDiagnostics.mark({ gameId, stage: "socket_emit", clientMoveId, from, to, version: commandVersion });
    const response = await chessSocketService.emitAck<ChessMoveCommandAck>(CHESS_EVENTS.gameMove, {
      clientMoveId,
      gameId,
      expectedVersion: commandVersion,
      from,
      to,
      promotion,
    });
    chessDiagnostics.mark({
      gameId,
      stage: response.ok ? "socket_ack_ok" : "socket_ack_fail",
      clientMoveId,
      from,
      to,
      version: response.ok ? response.data.version : current.revision,
      detail: response.ok ? undefined : response.errorCode,
    });
    if (!response.ok && response.errorCode === "CHESS_STATE_CONFLICT") void resyncGame(gameId);
    return response;
  }, [resyncGame]);

  const applyGameStateMutation = useCallback(async (event: string, gameId: string): Promise<ChessAck<ChessGameState>> => {
    const response = await chessSocketService.emitAck<ChessGameState>(event, { requestId: requestId(), gameId });
    if (response.ok) {
      handleState(response.data);
      return response;
    }
    publishChessGameNetwork(gameId, { error: response.errorCode });
    if (response.errorCode === "CHESS_STATE_CONFLICT") void resyncGame(gameId);
    return response;
  }, [handleState, resyncGame]);

  const resignGame = useCallback((gameId: string) => applyGameStateMutation(CHESS_EVENTS.gameResign, gameId), [applyGameStateMutation]);
  const offerDraw = useCallback((gameId: string) => applyGameStateMutation(CHESS_EVENTS.drawOffer, gameId), [applyGameStateMutation]);
  const acceptDraw = useCallback((gameId: string) => applyGameStateMutation(CHESS_EVENTS.drawAccept, gameId), [applyGameStateMutation]);
  const rejectDraw = useCallback((gameId: string) => applyGameStateMutation(CHESS_EVENTS.drawReject, gameId), [applyGameStateMutation]);
  const rematchGame = useCallback(async (gameId: string, stableRequestId?: string): Promise<ChessAck<{ waiting: boolean; gameId?: string; state?: ChessGameState; expiresAt?: number }>> => {
    const response = await chessSocketService.emitAck<{ waiting: boolean; gameId?: string; state?: ChessGameState; expiresAt?: number }>(CHESS_EVENTS.gameRematch, { requestId: stableRequestId || requestId(), gameId });
    if (response.ok && response.data.state) {
      handleState(response.data.state);
    }
    return response;
  }, [handleState]);


  const cancelRematch = useCallback(async (gameId: string): Promise<ChessAck<{ cancelled: boolean }>> => {
    return chessSocketService.emitAck<{ cancelled: boolean }>(CHESS_EVENTS.gameRematchCancel, { requestId: requestId(), gameId });
  }, []);

  const readyGame = useCallback(async (gameId: string): Promise<ChessAck<ChessGameState>> => {
    const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameReady, { requestId: requestId(), gameId });
    if (response.ok) handleState(response.data);
    return response;
  }, [handleState]);

  const value = useMemo<ChessRealtimeValue>(() => ({
    connection,
    presence,
    incomingInvite,
    outgoingInvite,
    activeGameId,
    pendingResultGameId,
    acknowledgeResult,
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
    connection, presence, incomingInvite, outgoingInvite, activeGameId, pendingResultGameId, acknowledgeResult,
    challenge, cancelInvite, acceptInvite, rejectInvite, enterLobby, leaveLobby, joinForeground, testBotEnabled, requestTestBotChallenge,
  ]);

  const actionsValue = useMemo<ChessRealtimeActionsValue>(() => ({
    acknowledgeResult,
    setBoardPresence,
    resyncGame,
    moveGame,
    resignGame,
    offerDraw,
    acceptDraw,
    rejectDraw,
    rematchGame,
    cancelRematch,
    readyGame,
  }), [acknowledgeResult, acceptDraw, cancelRematch, moveGame, offerDraw, readyGame, rejectDraw, rematchGame, resignGame, resyncGame, setBoardPresence]);
  return (
    <ChessRealtimeActionsContext.Provider value={actionsValue}>
      <ChessRealtimeContext.Provider value={value}>
        {children}
      </ChessRealtimeContext.Provider>
    </ChessRealtimeActionsContext.Provider>
  );
}
