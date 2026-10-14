import type { ChessGameState } from "../../types/chess";

// Tiny non-reactive bridge between the global foreground socket and a game
// route. It lets a newly opened board paint from the already-authoritative
// snapshot without subscribing the hidden route to every global context update.
const snapshots = new Map<string, ChessGameState>();
const MAX_SNAPSHOTS = 8;

export function cacheChessGameSnapshot(state: ChessGameState) {
  const current = snapshots.get(state.gameId);
  if (current && current.revision > state.revision) return;
  snapshots.delete(state.gameId);
  snapshots.set(state.gameId, state);
  while (snapshots.size > MAX_SNAPSHOTS) {
    const oldest = snapshots.keys().next().value as string | undefined;
    if (!oldest) break;
    snapshots.delete(oldest);
  }
}

export function getCachedChessGameSnapshot(gameId: string | null | undefined) {
  if (!gameId) return null;
  return snapshots.get(gameId) ?? null;
}

export function clearCachedChessGameSnapshot(gameId?: string | null) {
  if (gameId) snapshots.delete(gameId);
  else snapshots.clear();
}
