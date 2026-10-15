import { useSyncExternalStore } from "react";
function canReleaseChessSurface(currentOwnerId: string | null, requestedOwnerId?: string) {
  if (!currentOwnerId) return true;
  return !!requestedOwnerId && currentOwnerId === requestedOwnerId;
}


export type ChessSurfaceMode = "hidden" | "full" | "mini";
export type ChessSurfacePrepareReason = "outgoing_challenge" | "accept_invite" | "active_game" | "route" | "rematch";

export type ChessSurfaceState = {
  prepared: boolean;
  preparing: boolean;
  prepareReason: ChessSurfacePrepareReason | null;
  mode: ChessSurfaceMode;
  gameId: string | null;
  generation: number;
  presentationReady: boolean;
  /** P2.15 route-instance ownership prevents stale cleanup from hiding a new surface. */
  ownerId: string | null;
};

type MiniPosition = { x: number; y: number };

const initialState: ChessSurfaceState = {
  prepared: false,
  preparing: false,
  prepareReason: null,
  mode: "hidden",
  gameId: null,
  generation: 0,
  presentationReady: false,
  ownerId: null,
};

let state = initialState;
let miniPosition: MiniPosition | null = null;
const terminalGameIds: string[] = [];
const terminalGameIdSet = new Set<string>();
const TERMINAL_GAME_LIMIT = 64;

export function markChessSurfaceGameTerminal(gameIdInput: string) {
  const gameId = gameIdInput.trim();
  if (!gameId || terminalGameIdSet.has(gameId)) return;
  terminalGameIdSet.add(gameId);
  terminalGameIds.push(gameId);
  while (terminalGameIds.length > TERMINAL_GAME_LIMIT) {
    const oldest = terminalGameIds.shift();
    if (oldest) terminalGameIdSet.delete(oldest);
  }
}

export function isChessSurfaceGameTerminal(gameId: string) {
  return terminalGameIdSet.has(gameId.trim());
}

const listeners = new Set<() => void>();

function emit(next: ChessSurfaceState) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getChessSurfaceState() {
  return state;
}

export function setChessSurfacePresentationReady(ready: boolean) {
  if (state.presentationReady === ready) return;
  emit({ ...state, presentationReady: ready });
}

export function subscribeChessSurface(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useChessSurfaceState() {
  return useSyncExternalStore(subscribeChessSurface, getChessSurfaceState, getChessSurfaceState);
}

/** Fine-grained selector for app chrome that only cares about board visibility. */
export function useChessSurfaceMode() {
  const getMode = () => state.mode;
  return useSyncExternalStore(subscribeChessSurface, getMode, getMode);
}

export function useChessSurfacePrepared() {
  const getPrepared = () => state.prepared;
  return useSyncExternalStore(subscribeChessSurface, getPrepared, getPrepared);
}

export function getChessMiniPosition(): MiniPosition | null {
  return miniPosition ? { ...miniPosition } : null;
}

export function setChessMiniPosition(next: MiniPosition) {
  if (!Number.isFinite(next.x) || !Number.isFinite(next.y)) return;
  miniPosition = { x: next.x, y: next.y };
}

/**
 * First-session warmup. This is deliberately NOT called from app boot.
 * The natural wait around sending/accepting the first challenge pays the one-time
 * native board construction cost. Once prepared, the board remains alive until
 * the current JS process ends.
 */
export function prepareChessSurface(reason: ChessSurfacePrepareReason) {
  if (state.prepared) {
    if (state.prepareReason !== reason) emit({ ...state, prepareReason: reason });
    return;
  }
  emit({
    ...state,
    prepared: true,
    preparing: true,
    prepareReason: reason,
    generation: state.generation + 1,
  });
}

export function markChessSurfacePrepared() {
  if (!state.prepared || !state.preparing) return;
  emit({ ...state, preparing: false });
}

export function activateChessSurface(gameId: string, mode: ChessSurfaceMode = "full", ownerId?: string) {
  if (!gameId) return;
  // P2.27: assigning a server game id is NOT proof that the native board has
  // painted. Keep a cold/preparing surface in preparation until ChessBoard
  // reports layout + controllers + assets + two painted frames. Otherwise the
  // first game can clear `preparing` before its snapshot arrives and sleep the
  // board exactly while its ready callbacks are being registered.
  const coldActivation = !state.prepared;
  emit({
    ...state,
    prepared: true,
    preparing: state.preparing || coldActivation,
    prepareReason: state.prepareReason ?? "active_game",
    gameId,
    mode,
    ownerId: ownerId ?? state.ownerId,
    generation: state.generation + (state.gameId === gameId ? 0 : 1),
  });
}

export function showChessSurfaceFull(gameId?: string | null, ownerId?: string) {
  const nextGameId = gameId || state.gameId;
  if (!nextGameId) return;
  activateChessSurface(nextGameId, "full", ownerId);
}

export function minimizeChessSurface(ownerId?: string) {
  if (!state.gameId) return;
  if (!canReleaseChessSurface(state.ownerId, ownerId)) return;
  emit({ ...state, mode: "mini", preparing: false, ownerId: null });
}

export function hideChessSurface(ownerId: string) {
  if (!canReleaseChessSurface(state.ownerId, ownerId)) return;
  emit({ ...state, mode: "hidden", preparing: false, ownerId: null });
}

export function finishChessSurfaceGame(gameId?: string | null) {
  if (gameId) markChessSurfaceGameTerminal(gameId);
  if (gameId && state.gameId && gameId !== state.gameId) return;
  emit({ ...state, mode: "hidden", gameId: null, preparing: false, prepareReason: null, ownerId: null });
}

/**
 * Clears user/family-bound Chess state without throwing away the already-created
 * native piece pool. This runs on auth/family identity changes so a warm surface
 * can never stay attached to a previous household/session.
 */
export function resetChessSurfaceSession() {
  miniPosition = null;
  terminalGameIds.length = 0;
  terminalGameIdSet.clear();
  emit({
    ...state,
    mode: "hidden",
    gameId: null,
    preparing: false,
    prepareReason: null,
    ownerId: null,
    generation: state.generation + 1,
  });
}
