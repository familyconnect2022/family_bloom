import { useSyncExternalStore } from "react";

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
};

let state = initialState;
let miniPosition: MiniPosition | null = null;
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

export function activateChessSurface(gameId: string, mode: ChessSurfaceMode = "full") {
  if (!gameId) return;
  emit({
    ...state,
    prepared: true,
    preparing: false,
    prepareReason: state.prepareReason ?? "active_game",
    gameId,
    mode,
    generation: state.generation + (state.gameId === gameId ? 0 : 1),
  });
}

export function showChessSurfaceFull(gameId?: string | null) {
  const nextGameId = gameId || state.gameId;
  if (!nextGameId) return;
  activateChessSurface(nextGameId, "full");
}

export function minimizeChessSurface() {
  if (!state.gameId) return;
  emit({ ...state, mode: "mini", preparing: false });
}

export function hideChessSurface() {
  emit({ ...state, mode: "hidden", preparing: false });
}

export function finishChessSurfaceGame(gameId?: string | null) {
  if (gameId && state.gameId && gameId !== state.gameId) return;
  emit({ ...state, mode: "hidden", gameId: null, preparing: false, prepareReason: null });
}

/**
 * Clears user/family-bound Chess state without throwing away the already-created
 * native piece pool. This runs on auth/family identity changes so a warm surface
 * can never stay attached to a previous household/session.
 */
export function resetChessSurfaceSession() {
  miniPosition = null;
  emit({
    ...state,
    mode: "hidden",
    gameId: null,
    preparing: false,
    prepareReason: null,
    generation: state.generation + 1,
  });
}
