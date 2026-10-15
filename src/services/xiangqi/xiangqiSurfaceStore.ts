import { useSyncExternalStore } from "react";
import { canReleaseBoardGameSurface } from "../games/boardGameSurfaceLifecycle";
import type { XiangqiRealtimeState } from "../../types/xiangqiRealtime";

export type XiangqiSurfaceMode = "hidden" | "full" | "mini";
export type XiangqiSurfacePrepareReason = "route" | "outgoing_challenge" | "accept_invite" | "active_game" | "rematch";

export type XiangqiSurfaceState = {
  prepared: boolean;
  preparing: boolean;
  prepareReason: XiangqiSurfacePrepareReason | null;
  mode: XiangqiSurfaceMode;
  gameId: string | null;
  generation: number;
  presentationReady: boolean;
  ownerId: string | null;
};

let state: XiangqiSurfaceState = {
  prepared: false,
  preparing: false,
  prepareReason: null,
  mode: "hidden",
  gameId: null,
  generation: 0,
  presentationReady: false,
  ownerId: null,
};
let bootstrapState: XiangqiRealtimeState | null = null;
const terminalGameIds: string[] = [];
const terminalGameIdSet = new Set<string>();
const TERMINAL_GAME_LIMIT = 64;

export type XiangqiMiniPosition = { x: number; y: number };
let miniPosition: XiangqiMiniPosition | null = null;

export function markXiangqiSurfaceGameTerminal(gameIdInput: string) {
  const gameId = gameIdInput.trim();
  if (!gameId || terminalGameIdSet.has(gameId)) return;
  terminalGameIdSet.add(gameId);
  terminalGameIds.push(gameId);
  while (terminalGameIds.length > TERMINAL_GAME_LIMIT) {
    const oldest = terminalGameIds.shift();
    if (oldest) terminalGameIdSet.delete(oldest);
  }
}

export function isXiangqiSurfaceGameTerminal(gameId: string) {
  return terminalGameIdSet.has(gameId.trim());
}

const listeners = new Set<() => void>();

function emit(next: XiangqiSurfaceState) {
  if (next === state) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getXiangqiSurfaceState() { return state; }
export function getXiangqiMiniPosition() { return miniPosition; }
export function setXiangqiMiniPosition(position: XiangqiMiniPosition) { miniPosition = position; }
export function subscribeXiangqiSurface(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useXiangqiSurfaceState() {
  return useSyncExternalStore(subscribeXiangqiSurface, getXiangqiSurfaceState, getXiangqiSurfaceState);
}

export function useXiangqiSurfacePrepared() {
  const getPrepared = () => state.prepared;
  return useSyncExternalStore(subscribeXiangqiSurface, getPrepared, getPrepared);
}

export function setXiangqiSurfacePresentationReady(ready: boolean) {
  if (state.presentationReady === ready) return;
  emit({ ...state, presentationReady: ready });
}

export function cacheXiangqiBootstrapState(next: XiangqiRealtimeState) {
  bootstrapState = next;
}

export function getCachedXiangqiBootstrapState(gameId?: string | null) {
  if (!bootstrapState) return null;
  if (gameId && bootstrapState.gameId !== gameId) return null;
  return bootstrapState;
}

export function prepareXiangqiSurface(reason: XiangqiSurfacePrepareReason) {
  if (state.prepared) {
    if (state.prepareReason !== reason) emit({ ...state, prepareReason: reason });
    return;
  }
  emit({ ...state, prepared: true, preparing: true, prepareReason: reason, generation: state.generation + 1 });
}

export function markXiangqiSurfacePrepared() {
  if (!state.prepared || !state.preparing) return;
  emit({ ...state, preparing: false });
}

/** A Xiangqi surface can only be activated after a concrete server game exists. */
export function activateXiangqiSurface(
  gameId: string,
  mode: XiangqiSurfaceMode = "full",
  reason: XiangqiSurfacePrepareReason = "active_game",
  ownerId?: string,
) {
  if (!gameId) return;
  prepareXiangqiSurface(reason);
  emit({
    ...state,
    gameId,
    mode,
    preparing: false,
    prepareReason: reason,
    ownerId: ownerId ?? state.ownerId,
    generation: state.generation + (state.gameId === gameId ? 0 : 1),
  });
}

export function showXiangqiSurfaceFull(gameId?: string | null, ownerId?: string) {
  const nextGameId = gameId || state.gameId;
  if (!nextGameId) return;
  activateXiangqiSurface(nextGameId, "full", "active_game", ownerId);
}

export function minimizeXiangqiSurface(ownerId?: string) {
  if (!state.gameId) return;
  if (!canReleaseBoardGameSurface(state.ownerId, ownerId)) return;
  emit({ ...state, mode: "mini", ownerId: null, preparing: false });
}

export function hideXiangqiSurface(ownerId?: string) {
  if (ownerId && !canReleaseBoardGameSurface(state.ownerId, ownerId)) return;
  if (state.mode === "hidden" && !state.ownerId) return;
  emit({ ...state, mode: "hidden", ownerId: null, preparing: false });
}

export function finishXiangqiSurfaceGame(gameId?: string | null) {
  if (gameId) markXiangqiSurfaceGameTerminal(gameId);
  if (gameId && state.gameId && state.gameId !== gameId) return;
  if (!gameId || bootstrapState?.gameId === gameId) bootstrapState = null;
  emit({
    ...state,
    mode: "hidden",
    gameId: null,
    preparing: false,
    prepareReason: null,
    ownerId: null,
  });
}

export function resetXiangqiSurfaceSession() {
  bootstrapState = null;
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
