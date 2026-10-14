import { useSyncExternalStore } from "react";
import type { ActiveBoardGameKind } from "../games/activeBoardGameSessionStore";
import { getActiveBoardGameSession } from "../games/activeBoardGameSessionStore";

export type BloomRailSurface = ActiveBoardGameKind | null;
export type BloomGamePresentation = "hidden" | "full" | "mini";

export type BloomSurfaceRailState = {
  visibleSurface: BloomRailSurface;
  gameKind: ActiveBoardGameKind | null;
  gameId: string | null;
  gamePresentation: BloomGamePresentation;
  generation: number;
};

const initialState: BloomSurfaceRailState = {
  visibleSurface: null,
  gameKind: null,
  gameId: null,
  gamePresentation: "hidden",
  generation: 0,
};

let state = initialState;
const listeners = new Set<() => void>();

function emit(patch: Partial<BloomSurfaceRailState>) {
  const next = { ...state, ...patch, generation: state.generation + 1 };
  if (
    next.visibleSurface === state.visibleSurface
    && next.gameKind === state.gameKind
    && next.gameId === state.gameId
    && next.gamePresentation === state.gamePresentation
  ) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getBloomSurfaceRailState() { return state; }
export function subscribeBloomSurfaceRail(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useBloomSurfaceRailState() {
  return useSyncExternalStore(subscribeBloomSurfaceRail, getBloomSurfaceRailState, getBloomSurfaceRailState);
}

/** Keep the rail's one game identity synchronized with the server-owned session. */
export function syncBloomRailGameSession(kind: ActiveBoardGameKind | null, gameId: string | null) {
  if (!kind || !gameId) {
    if (state.gameKind || state.gameId || state.visibleSurface) {
      emit({ gameKind: null, gameId: null, gamePresentation: "hidden", visibleSurface: null });
    }
    return;
  }
  if (state.gameKind === kind && state.gameId === gameId) return;
  emit({ gameKind: kind, gameId, gamePresentation: "hidden", visibleSurface: null });
}

export function requestBloomGameSurface(
  kind: ActiveBoardGameKind,
  gameId: string,
  presentation: Exclude<BloomGamePresentation, "hidden"> = "full",
) {
  const session = getActiveBoardGameSession();
  if (!session || session.kind !== kind || session.gameId !== gameId) return false;
  emit({
    gameKind: kind,
    gameId,
    gamePresentation: presentation,
    visibleSurface: presentation === "full" ? kind : null,
  });
  return true;
}

export function minimizeBloomGameSurface(kind: ActiveBoardGameKind, gameId: string) {
  if (state.gameKind !== kind || state.gameId !== gameId) return false;
  emit({ gamePresentation: "mini", visibleSurface: null });
  return true;
}

export function parkBloomGameSurface(kind: ActiveBoardGameKind, gameId?: string | null) {
  if (state.gameKind !== kind) return false;
  if (gameId && state.gameId !== gameId) return false;
  emit({ gamePresentation: "hidden", visibleSurface: null });
  return true;
}

export function resetBloomSurfaceRail() {
  state = initialState;
  for (const listener of listeners) listener();
}
