import { useSyncExternalStore } from "react";

export type RouteSurfaceKind = "focus" | "chess" | "xiangqi";
export type RouteSurfacePhase = "idle" | "requested" | "shell_painted" | "hydrating" | "content_painted" | "active";

export type RouteSurfaceSnapshot = {
  kind: RouteSurfaceKind;
  requestId: number;
  ownerId: string | null;
  phase: RouteSurfacePhase;
  requestedAt: number | null;
  shellPaintedAt: number | null;
  contentPaintedAt: number | null;
};

const phaseRank: Record<RouteSurfacePhase, number> = {
  idle: 0,
  requested: 1,
  shell_painted: 2,
  hydrating: 3,
  content_painted: 4,
  active: 5,
};

function initial(kind: RouteSurfaceKind): RouteSurfaceSnapshot {
  return {
    kind,
    requestId: 0,
    ownerId: null,
    phase: "idle",
    requestedAt: null,
    shellPaintedAt: null,
    contentPaintedAt: null,
  };
}

let state: Record<RouteSurfaceKind, RouteSurfaceSnapshot> = {
  focus: initial("focus"),
  chess: initial("chess"),
  xiangqi: initial("xiangqi"),
};
const listeners = new Set<() => void>();

function emit(kind: RouteSurfaceKind, next: RouteSurfaceSnapshot) {
  if (state[kind] === next) return;
  state = { ...state, [kind]: next };
  for (const listener of listeners) listener();
}

export function getRouteSurfaceSnapshot(kind: RouteSurfaceKind) {
  return state[kind];
}

export function subscribeRouteSurfaceLifecycle(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRouteSurfaceLifecycle(kind: RouteSurfaceKind) {
  const getSnapshot = () => state[kind];
  return useSyncExternalStore(subscribeRouteSurfaceLifecycle, getSnapshot, getSnapshot);
}

export function requestRouteSurface(kind: RouteSurfaceKind, ownerId: string, requestId?: number) {
  const current = state[kind];
  const nextRequestId = requestId ?? current.requestId + 1;
  emit(kind, {
    kind,
    requestId: nextRequestId,
    ownerId,
    phase: "requested",
    requestedAt: Date.now(),
    shellPaintedAt: null,
    contentPaintedAt: null,
  });
  return nextRequestId;
}

function owns(kind: RouteSurfaceKind, ownerId: string, requestId: number) {
  const current = state[kind];
  return current.ownerId === ownerId && current.requestId === requestId;
}

/**
 * P2.16.1: Paint ACK is observational, never a hydration gate.
 *
 * Android may deliver layout/paint callbacks later than the JS hydration that
 * produced the content. Therefore shell/content ACKs are recorded independently:
 * content is allowed to finish before shell ACK, but Root arbitration still
 * treats the surface as presented only after a real shell paint timestamp exists.
 */
export function markRouteSurfaceShellPainted(kind: RouteSurfaceKind, ownerId: string, requestId: number) {
  if (!owns(kind, ownerId, requestId)) return false;
  const current = state[kind];
  const now = Date.now();
  const shellPaintedAt = current.shellPaintedAt ?? now;
  const phase: RouteSurfacePhase = current.contentPaintedAt != null ? "content_painted" : "shell_painted";
  emit(kind, { ...current, shellPaintedAt, phase });
  return true;
}

export function markRouteSurfaceHydrating(kind: RouteSurfaceKind, ownerId: string, requestId: number) {
  if (!owns(kind, ownerId, requestId)) return false;
  const current = state[kind];
  // Hydration may begin before shell ACK. Do not synthesize presentation proof.
  if (current.shellPaintedAt == null) return true;
  if (phaseRank[current.phase] >= phaseRank.hydrating) return true;
  emit(kind, { ...current, phase: "hydrating" });
  return true;
}

export function markRouteSurfaceContentPainted(kind: RouteSurfaceKind, ownerId: string, requestId: number) {
  if (!owns(kind, ownerId, requestId)) return false;
  const current = state[kind];
  const contentPaintedAt = current.contentPaintedAt ?? Date.now();
  const phase: RouteSurfacePhase = current.shellPaintedAt != null ? "content_painted" : current.phase;
  emit(kind, { ...current, contentPaintedAt, phase });
  return true;
}

export function markRouteSurfaceActive(kind: RouteSurfaceKind, ownerId: string, requestId: number) {
  if (!owns(kind, ownerId, requestId)) return false;
  const current = state[kind];
  // ACTIVE means both shell and content have actually painted. If one ACK is
  // late, keep the recorded evidence and let the late ACK finish the transition.
  if (current.shellPaintedAt == null || current.contentPaintedAt == null) return true;
  if (current.phase === "active") return true;
  emit(kind, { ...current, phase: "active" });
  return true;
}

export function releaseRouteSurface(kind: RouteSurfaceKind, ownerId: string) {
  const current = state[kind];
  if (current.ownerId !== ownerId) return false;
  emit(kind, {
    ...initial(kind),
    requestId: current.requestId,
  });
  return true;
}

export function isRouteSurfacePresented(snapshot: RouteSurfaceSnapshot) {
  // Never infer visibility from hydration/content. Root arbitration requires a
  // real route shell paint ACK.
  return snapshot.shellPaintedAt != null;
}
