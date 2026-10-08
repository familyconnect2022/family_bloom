import { applyChessMoveDelta, type ChessGameState, type ChessMoveDelta } from "../../types/chess";
import { cacheChessGameSnapshot } from "./chessGameSnapshotCache";

export type ChessGameConnectionPhase = "connecting" | "synchronizing" | "connected" | "reconnecting";

export type GameStoreSnapshot = {
  state: ChessGameState | null;
  moveDeltas: ChessMoveDelta[];
  snapshotEpoch: number;
  connectionPhase: ChessGameConnectionPhase;
  error: string | null;
};

const EMPTY: GameStoreSnapshot = Object.freeze({
  state: null,
  moveDeltas: [],
  snapshotEpoch: 0,
  connectionPhase: "connecting",
  error: null,
});
const snapshots = new Map<string, GameStoreSnapshot>();
const listeners = new Map<string, Set<() => void>>();

function emit(gameId: string) {
  listeners.get(gameId)?.forEach((listener) => listener());
}

export function getChessGameStoreSnapshot(gameId: string | null): GameStoreSnapshot {
  if (!gameId) return EMPTY;
  return snapshots.get(gameId) ?? EMPTY;
}

export function subscribeChessGameStore(gameId: string | null, listener: () => void) {
  if (!gameId) return () => undefined;
  let bucket = listeners.get(gameId);
  if (!bucket) {
    bucket = new Set();
    listeners.set(gameId, bucket);
  }
  bucket.add(listener);
  return () => {
    bucket?.delete(listener);
    if (bucket?.size === 0) listeners.delete(gameId);
  };
}

export function publishChessGameSnapshot(next: ChessGameState) {
  const current = snapshots.get(next.gameId) ?? EMPTY;
  const previous = current.state;
  if (previous) {
    if (next.revision < previous.revision) return previous;
    if (next.revision === previous.revision && next.fen !== previous.fen) return previous;
    if (next.revision === previous.revision && next.fen === previous.fen && next.serverNowMs <= previous.serverNowMs) return previous;
  }

  const positionChanged = !previous
    || previous.revision !== next.revision
    || previous.fen !== next.fen;
  const visualMetaChanged = positionChanged
    || previous?.status !== next.status
    || previous?.turn !== next.turn
    || previous?.checkSquare !== next.checkSquare
    || previous?.lastMove?.from !== next.lastMove?.from
    || previous?.lastMove?.to !== next.lastMove?.to
    || previous?.lastMove?.promotion !== next.lastMove?.promotion;

  cacheChessGameSnapshot(next);
  const samePositionAlreadyBuffered = previous
    && previous.revision === next.revision
    && previous.fen === next.fen;
  const updated: GameStoreSnapshot = {
    state: next,
    moveDeltas: samePositionAlreadyBuffered ? current.moveDeltas : (positionChanged ? [] : current.moveDeltas),
    snapshotEpoch: visualMetaChanged && !samePositionAlreadyBuffered ? current.snapshotEpoch + 1 : current.snapshotEpoch,
    connectionPhase: current.connectionPhase,
    error: null,
  };
  snapshots.set(next.gameId, updated);
  emit(next.gameId);
  return next;
}

export function publishChessMoveDelta(delta: ChessMoveDelta, fallbackState?: ChessGameState | null) {
  const currentSnapshot = snapshots.get(delta.gameId) ?? EMPTY;
  const current = currentSnapshot.state ?? fallbackState ?? null;
  if (!current || current.gameId !== delta.gameId || delta.version <= current.revision) return current;
  if (delta.version !== current.revision + 1) return null;

  const next = applyChessMoveDelta(current, delta);
  cacheChessGameSnapshot(next);
  snapshots.set(delta.gameId, {
    state: next,
    moveDeltas: [...currentSnapshot.moveDeltas, delta].slice(-16),
    // Delta history owns normal move animation. Do not force a full snapshot
    // reconciliation for the same authoritative revision.
    snapshotEpoch: currentSnapshot.snapshotEpoch,
    connectionPhase: currentSnapshot.connectionPhase,
    error: null,
  });
  emit(delta.gameId);
  return next;
}

export function publishChessGameNetwork(
  gameId: string | null,
  patch: Partial<Pick<GameStoreSnapshot, "connectionPhase" | "error">>,
) {
  if (!gameId) return;
  const current = snapshots.get(gameId) ?? EMPTY;
  const connectionPhase = patch.connectionPhase ?? current.connectionPhase;
  const error = patch.error !== undefined ? patch.error : current.error;
  if (connectionPhase === current.connectionPhase && error === current.error) return;
  snapshots.set(gameId, { ...current, connectionPhase, error });
  emit(gameId);
}

export function clearChessGameStore(gameId?: string | null) {
  if (gameId) {
    snapshots.delete(gameId);
    emit(gameId);
    return;
  }
  const ids = Array.from(snapshots.keys());
  snapshots.clear();
  ids.forEach(emit);
}
