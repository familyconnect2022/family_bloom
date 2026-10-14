import { useSyncExternalStore } from "react";

export type ActiveBoardGameKind = "chess" | "xiangqi";
export type ActiveBoardGameSource = "server" | "session" | "route";

export type ActiveBoardGameSession = {
  kind: ActiveBoardGameKind;
  gameId: string;
  familyId: string | null;
  source: ActiveBoardGameSource;
  generation: number;
};

let state: ActiveBoardGameSession | null = null;
let generation = 0;
const terminalTombstones: string[] = [];
const terminalTombstoneSet = new Set<string>();
const TERMINAL_TOMBSTONE_LIMIT = 64;

function terminalKey(kind: ActiveBoardGameKind, gameId: string) {
  return `${kind}:${gameId}`;
}
const listeners = new Set<() => void>();

function emit(next: ActiveBoardGameSession | null) {
  if (
    state?.kind === next?.kind
    && state?.gameId === next?.gameId
    && state?.familyId === next?.familyId
    && state?.source === next?.source
  ) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getActiveBoardGameSession() {
  return state;
}

export function subscribeActiveBoardGameSession(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useActiveBoardGameSession() {
  return useSyncExternalStore(
    subscribeActiveBoardGameSession,
    getActiveBoardGameSession,
    getActiveBoardGameSession,
  );
}

const SOURCE_PRIORITY: Record<ActiveBoardGameSource, number> = {
  route: 1,
  session: 2,
  server: 3,
};

/**
 * Single authoritative client-side board-game lease.
 *
 * A weaker local request can never evict another active game. Server/session
 * recovery may replace stale local state because the backend already enforces
 * one realtime board game per uid.
 */
export function claimActiveBoardGameSession(input: {
  kind: ActiveBoardGameKind;
  gameId: string;
  familyId?: string | null;
  source?: ActiveBoardGameSource;
}) {
  const gameId = input.gameId.trim();
  if (!gameId) return false;
  if (terminalTombstoneSet.has(terminalKey(input.kind, gameId))) return false;
  const source = input.source ?? "session";
  const nextFamilyId = input.familyId ?? null;
  const current = state;

  if (current && (current.kind !== input.kind || current.gameId !== gameId)) {
    // Cross-game arbitration is intentionally stricter than source priority:
    // only an authoritative server recovery may replace Chess with Xiangqi (or
    // vice versa). Local routes/session bootstraps can advance a rematch id of
    // the SAME kind, but can never steal the other game's lease.
    if (current.kind !== input.kind && source !== "server") return false;
    if (source === "route") return false;
    if (SOURCE_PRIORITY[source] < SOURCE_PRIORITY[current.source]) return false;
  }

  generation += 1;
  emit({
    kind: input.kind,
    gameId,
    familyId: nextFamilyId,
    source,
    generation,
  });
  return true;
}

export function markActiveBoardGameSessionTerminal(kind: ActiveBoardGameKind, gameIdInput: string) {
  const gameId = gameIdInput.trim();
  if (!gameId) return;
  const key = terminalKey(kind, gameId);
  if (!terminalTombstoneSet.has(key)) {
    terminalTombstoneSet.add(key);
    terminalTombstones.push(key);
    while (terminalTombstones.length > TERMINAL_TOMBSTONE_LIMIT) {
      const oldest = terminalTombstones.shift();
      if (oldest) terminalTombstoneSet.delete(oldest);
    }
  }
  if (state?.kind === kind && state.gameId === gameId) emit(null);
}

export function isActiveBoardGameSessionTerminal(kind: ActiveBoardGameKind, gameId: string) {
  return terminalTombstoneSet.has(terminalKey(kind, gameId));
}

export function clearActiveBoardGameSession(match?: {
  kind?: ActiveBoardGameKind;
  gameId?: string | null;
}) {
  if (!state) return;
  if (match?.kind && state.kind !== match.kind) return;
  if (match?.gameId && state.gameId !== match.gameId) return;
  emit(null);
}

export function canOpenBoardGame(kind: ActiveBoardGameKind) {
  return !state || state.kind === kind;
}

export function resetActiveBoardGameSession() {
  emit(null);
  terminalTombstones.length = 0;
  terminalTombstoneSet.clear();
}
