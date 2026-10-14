import { useSyncExternalStore } from "react";
import type { ChessPresence } from "../../types/chess";

let snapshot: ChessPresence[] = [];
const listeners = new Set<() => void>();

const presenceEqual = (a: ChessPresence[], b: ChessPresence[]) => a.length === b.length && a.every((item, index) => {
  const next = b[index];
  return !!next && item.uid === next.uid && item.status === next.status;
});

export const publishChessPresence = (next: ChessPresence[]) => {
  if (presenceEqual(snapshot, next)) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
};

export const clearChessPresence = () => publishChessPresence([]);
export const getChessPresenceSnapshot = () => snapshot;
export const subscribeChessPresence = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Lobby-only selector channel. Presence packets never mutate ChessRealtimeContext. */
export const useChessPresence = () => useSyncExternalStore(
  subscribeChessPresence,
  getChessPresenceSnapshot,
  getChessPresenceSnapshot,
);
