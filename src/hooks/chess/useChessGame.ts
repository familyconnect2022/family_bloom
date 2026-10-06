import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { chessSocketService } from "../../services/chess/chessSocketService";
import { cacheChessGameSnapshot } from "../../services/chess/chessGameSnapshotCache";
import {
  CHESS_EVENTS,
  applyChessMoveDelta,
  type ChessAck,
  type ChessGameState,
  type ChessMoveCommandAck,
  type ChessMoveDelta,
  type ChessPromotionPiece,
} from "../../types/chess";
import { chessDiagnostics } from "../../services/chess/chessDiagnostics";
import { gameRuntimePerf } from "../../services/games/gameRuntimePerf";

const commandId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

type StateSource = "seed" | "socket" | "join" | "rejoin" | "resync" | "ack";

export function useChessGame(
  familyId: string | null,
  gameId: string | null,
  runtimeActive = true,
  initialState: ChessGameState | null = null,
) {
  const seededInitialState = initialState?.gameId === gameId ? initialState : null;
  const [state, setState] = useState<ChessGameState | null>(seededInitialState);
  const [moveDeltas, setMoveDeltas] = useState<ChessMoveDelta[]>([]);
  const [snapshotEpoch, setSnapshotEpoch] = useState(0);
  const [loading, setLoading] = useState(!seededInitialState);
  const [error, setError] = useState<string | null>(null);
  const [connectionPhase, setConnectionPhase] = useState<"connecting" | "connected" | "reconnecting">("connecting");
  const stateRef = useRef<ChessGameState | null>(seededInitialState);
  const runtimeActiveRef = useRef(runtimeActive);
  const joinedOnceRef = useRef(false);
  const lastDeltaKeyRef = useRef<string | null>(null);
  stateRef.current = state;
  runtimeActiveRef.current = runtimeActive;

  const commitSnapshot = useCallback((next: ChessGameState, _source: StateSource) => {
    const current = stateRef.current;
    chessDiagnostics.mark({ gameId: next.gameId, stage: "snapshot_commit", version: next.revision, detail: _source });
    if (current && current.gameId === next.gameId) {
      if (next.revision < current.revision) return false;
      if (next.revision === current.revision) {
        if (next.fen !== current.fen) return false;
        if (next.serverNowMs <= current.serverNowMs) return false;
      }
    }
    const positionChanged = !current
      || current.gameId !== next.gameId
      || current.revision !== next.revision
      || current.fen !== next.fen;
    const visualMetaChanged = positionChanged
      || current?.status !== next.status
      || current?.turn !== next.turn
      || current?.checkSquare !== next.checkSquare
      || current?.lastMove?.from !== next.lastMove?.from
      || current?.lastMove?.to !== next.lastMove?.to
      || current?.lastMove?.promotion !== next.lastMove?.promotion;

    cacheChessGameSnapshot(next);
    stateRef.current = next;
    setState(next);
    if (positionChanged) setMoveDeltas([]);
    if (visualMetaChanged) setSnapshotEpoch((value) => value + 1);
    return true;
  }, []);

  // Accept the authoritative snapshot already held by ChessRealtimeContext.
  // Accept/invite flows receive this state before navigation, so the game route
  // can paint immediately instead of throwing the snapshot away and showing a
  // blank loader while a second game:join ACK is in flight.
  useEffect(() => {
    const seed = initialState?.gameId === gameId ? initialState : null;
    const current = stateRef.current;

    if (!gameId) {
      stateRef.current = null;
      setState(null);
      setMoveDeltas([]);
      setLoading(false);
      return;
    }

    if (seed && runtimeActive) {
      const maySeed = !current
        || current.gameId !== gameId
        || (!joinedOnceRef.current && seed.revision >= current.revision);
      if (maySeed) commitSnapshot(seed, "seed");
      setLoading(false);
      setError(null);
      if (chessSocketService.isConnected()) setConnectionPhase("connected");
      return;
    }

    if (current && current.gameId !== gameId) {
      stateRef.current = null;
      setState(null);
      setMoveDeltas([]);
      setSnapshotEpoch((value) => value + 1);
      setLoading(true);
      setConnectionPhase("connecting");
    }
  }, [commitSnapshot, gameId, initialState, runtimeActive]);

  const commitMoveDelta = useCallback((delta: ChessMoveDelta): "applied" | "stale" | "gap" => {
    const current = stateRef.current;
    if (!current || current.gameId !== delta.gameId) {
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "delta_commit_stale", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: "NO_CURRENT_STATE" });
      return "stale";
    }
    const key = `${delta.gameId}:${delta.version}:${delta.clientMoveId}`;
    if (lastDeltaKeyRef.current === key || delta.version <= current.revision) {
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "delta_commit_stale", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: `current=${current.revision}` });
      return "stale";
    }
    // Do not apply a packet across a missing version. A full server snapshot is
    // safer than inventing one or more visual moves from incomplete history.
    if (delta.version !== current.revision + 1) {
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "delta_commit_gap", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: `expected=${current.revision + 1}` });
      return "gap";
    }
    lastDeltaKeyRef.current = key;
    const next = applyChessMoveDelta(current, delta);
    stateRef.current = next;
    setState(next);
    setMoveDeltas((items) => [...items, delta].slice(-16));
    chessDiagnostics.mark({ gameId: delta.gameId, stage: "delta_commit_applied", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });
    return "applied";
  }, []);

  const reportBoardPresence = useCallback((visible: boolean) => {
    if (!gameId || !chessSocketService.isConnected()) return;
    // Fire immediately before focus cleanup tears down the game-specific
    // listeners. Socket.IO still supplies an ACK callback, but navigation never
    // waits on it; only the server may turn this transition into a loss.
    chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId, visible });
  }, [gameId]);

  const resync = useCallback(async (): Promise<ChessGameState | null> => {
    if (!gameId) return null;
    if (!runtimeActiveRef.current) return stateRef.current;
    chessDiagnostics.mark({ gameId, stage: "resync_start" });
    const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameResync, { gameId });
    if (response.ok) {
      commitSnapshot(response.data, "resync");
      chessDiagnostics.mark({ gameId, stage: "resync_ok", version: response.data.revision });
      setError(null);
      return response.data;
    }
    chessDiagnostics.mark({ gameId, stage: "resync_fail", detail: response.errorCode });
    setError(response.errorCode);
    return null;
  }, [commitSnapshot, gameId]);

  useEffect(() => {
    if (!runtimeActive || !familyId || !gameId) gameRuntimePerf.setActiveListeners("chess", 0);
  }, [familyId, gameId, runtimeActive]);

  useEffect(() => {
    if (!familyId || !gameId || !runtimeActive) return;
    let live = true;
    // state + move + connected + disconnected + AppState. The global presence
    // provider is intentionally NOT counted here because it remains alive while
    // the foreground app is outside the game route.
    gameRuntimePerf.setActiveListeners("chess", 5);

    const stopState = chessSocketService.on("state", (next) => {
      if (live && next.gameId === gameId) {
        commitSnapshot(next, "socket");
        setLoading(false);
        setError(null);
      }
    });
    const stopMove = chessSocketService.on("move", (delta) => {
      if (live && delta.gameId === gameId) {
        chessDiagnostics.mark({ gameId: delta.gameId, stage: "move_applied_received", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });
        const result = commitMoveDelta(delta);
        if (result === "gap") void resync();
        if (result === "applied") setError(null);
        setLoading(false);
      }
    });

    const rejoin = async () => {
      if (!joinedOnceRef.current || !live) return;
      setConnectionPhase("reconnecting");
      const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId });
      if (live && response.ok) {
        commitSnapshot(response.data, "rejoin");
        setError(null);
        setConnectionPhase("connected");
        reportBoardPresence(true);
      } else if (live) {
        setError(response.errorCode);
      }
    };
    const stopConnected = chessSocketService.on("connected", () => {
      if (joinedOnceRef.current) void rejoin();
      else setConnectionPhase("connected");
    });
    const stopDisconnected = chessSocketService.on("disconnected", () => {
      if (live) setConnectionPhase(stateRef.current ? "reconnecting" : "connecting");
    });

    void (async () => {
      try {
        await chessSocketService.connect();
        const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId });
        if (!live) return;
        if (response.ok) {
          joinedOnceRef.current = true;
          commitSnapshot(response.data, "join");
          setError(null);
          setConnectionPhase("connected");
          reportBoardPresence(true);
        } else setError(response.errorCode);
      } catch {
        if (live) setError("CHESS_SERVER_RECOVERING");
      } finally {
        if (live) setLoading(false);
      }
    })();

    const appState = AppState.addEventListener("change", (next) => {
      if (next === "active") {
        reportBoardPresence(true);
        void resync();
      } else {
        reportBoardPresence(false);
      }
    });

    return () => {
      reportBoardPresence(false);
      live = false;
      gameRuntimePerf.setActiveListeners("chess", 0);
      joinedOnceRef.current = false;
      stopState();
      stopMove();
      stopConnected();
      stopDisconnected();
      appState.remove();
      chessSocketService.disconnectIfIdle(
        stateRef.current?.status === "active" || stateRef.current?.status === "paused" ? gameId : null,
      );
    };
  }, [commitMoveDelta, commitSnapshot, familyId, gameId, reportBoardPresence, resync, runtimeActive]);

  const applyStateMutation = useCallback(async (event: string, payload: Record<string, unknown>): Promise<ChessAck<ChessGameState>> => {
    const response = await chessSocketService.emitAck<ChessGameState>(event, payload);
    if (response.ok) {
      commitSnapshot(response.data, "ack");
      setError(null);
    } else if (response.errorCode === "CHESS_STATE_CONFLICT") {
      void resync();
    }
    return response;
  }, [commitSnapshot, resync]);

  const move = useCallback(async (
    from: string,
    to: string,
    promotion?: ChessPromotionPiece,
    clientMoveId = commandId(),
    expectedVersion?: number,
  ): Promise<ChessAck<ChessMoveCommandAck>> => {
    const current = stateRef.current;
    if (!current) return { ok: false, errorCode: "CHESS_GAME_NOT_FOUND" };
    const commandVersion = expectedVersion ?? current.revision;
    chessDiagnostics.mark({ gameId: current.gameId, stage: "socket_emit", clientMoveId, from, to, version: commandVersion });
    const response = await chessSocketService.emitAck<ChessMoveCommandAck>(CHESS_EVENTS.gameMove, {
      clientMoveId,
      gameId: current.gameId,
      expectedVersion: commandVersion,
      from,
      to,
      promotion,
    });
    chessDiagnostics.mark({ gameId: current.gameId, stage: response.ok ? "socket_ack_ok" : "socket_ack_fail", clientMoveId, from, to, version: response.ok ? response.data.version : current.revision, detail: response.ok ? undefined : response.errorCode });
    return response;
  }, []);

  const resign = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.gameResign, { requestId: commandId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);
  const offerDraw = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.drawOffer, { requestId: commandId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);
  const acceptDraw = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.drawAccept, { requestId: commandId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);
  const rejectDraw = useCallback(() => gameId
    ? applyStateMutation(CHESS_EVENTS.drawReject, { requestId: commandId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [applyStateMutation, gameId]);
  const rematch = useCallback(() => gameId
    ? chessSocketService.emitAck<{ waiting: boolean; gameId?: string; state?: ChessGameState }>(CHESS_EVENTS.gameRematch, { requestId: commandId(), gameId })
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [gameId]);

  return { state, moveDeltas, snapshotEpoch, loading, error, connectionPhase, resync, move, resign, offerDraw, acceptDraw, rejectDraw, rematch };
}
