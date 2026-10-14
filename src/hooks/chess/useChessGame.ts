import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useChessRealtimeActions } from "../../context/ChessRealtimeContext";
import {
  getChessGameStoreSnapshot,
  publishChessGameSnapshot,
  subscribeChessGameStore,
} from "../../services/chess/chessGameStore";
import type {
  ChessAck,
  ChessGameState,
  ChessMoveCommandAck,
  ChessPromotionPiece,
} from "../../types/chess";

/**
 * UI-only game binding.
 *
 * Phase 17.9A2 invariant: this hook must never import Socket.IO, AppState or
 * connection lifecycle code. ChessRealtimeProvider owns transport, reconnect,
 * join/resync and authoritative commands. The surface only reads the external
 * game store and sends small intents through the provider action channel.
 */
export function useChessGame(
  _familyId: string | null,
  gameId: string | null,
  boardVisible = true,
  initialState: ChessGameState | null = null,
  liveSubscription = true,
) {
  const actions = useChessRealtimeActions();
  const store = useSyncExternalStore(
    useCallback((listener) => liveSubscription ? subscribeChessGameStore(gameId, listener) : () => undefined, [gameId, liveSubscription]),
    useCallback(() => getChessGameStoreSnapshot(gameId), [gameId]),
    useCallback(() => getChessGameStoreSnapshot(gameId), [gameId]),
  );

  useEffect(() => {
    const seed = initialState?.gameId === gameId ? initialState : null;
    if (seed && !getChessGameStoreSnapshot(gameId).state) publishChessGameSnapshot(seed);
  }, [gameId, initialState]);

  useEffect(() => {
    actions.setBoardPresence(gameId, !!gameId && boardVisible);
    return () => actions.setBoardPresence(gameId, false);
  }, [actions, boardVisible, gameId]);

  const resync = useCallback(() => gameId
    ? actions.resyncGame(gameId)
    : Promise.resolve(null), [actions, gameId]);

  const move = useCallback((
    from: string,
    to: string,
    promotion?: ChessPromotionPiece,
    clientMoveId?: string,
    expectedVersion?: number,
  ): Promise<ChessAck<ChessMoveCommandAck>> => gameId
    ? actions.moveGame(gameId, from, to, promotion, clientMoveId, expectedVersion)
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" }), [actions, gameId]);

  const resign = useCallback(() => gameId
    ? actions.resignGame(gameId)
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [actions, gameId]);
  const offerDraw = useCallback(() => gameId
    ? actions.offerDraw(gameId)
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [actions, gameId]);
  const acceptDraw = useCallback(() => gameId
    ? actions.acceptDraw(gameId)
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [actions, gameId]);
  const rejectDraw = useCallback(() => gameId
    ? actions.rejectDraw(gameId)
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [actions, gameId]);
  const rematch = useCallback((stableRequestId?: string) => gameId
    ? actions.rematchGame(gameId, stableRequestId)
    : Promise.resolve({ ok: false, errorCode: "CHESS_GAME_NOT_FOUND" } as const), [actions, gameId]);

  return {
    state: store.state,
    moveDeltas: store.moveDeltas,
    snapshotEpoch: store.snapshotEpoch,
    loading: !!gameId && !store.state,
    error: store.error,
    connectionPhase: store.connectionPhase,
    resync,
    move,
    resign,
    offerDraw,
    acceptDraw,
    rejectDraw,
    rematch,
  };
}
