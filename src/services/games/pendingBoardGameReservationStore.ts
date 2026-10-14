import { useSyncExternalStore } from "react";

export type PendingBoardGameKind = "chess" | "xiangqi";
export type PendingBoardGameSource = "server" | "local";
export type PendingBoardGamePhase = "connecting" | "requesting" | "waiting_confirmation";

export type PendingBoardGameReservation = {
  gameKind: PendingBoardGameKind;
  familyId: string | null;
  inviteId: string;
  expiresAt: number | null;
  source: PendingBoardGameSource;
  phase: PendingBoardGamePhase;
  generation: number;
};

let generation = 0;
let state: PendingBoardGameReservation | null = null;
const listeners = new Set<() => void>();
const localCancelRequested = new Set<string>();
const localCancelWaiters = new Map<string, Array<(ok: boolean) => void>>();

function emit(next: PendingBoardGameReservation | null) {
  if (
    state?.gameKind === next?.gameKind
    && state?.familyId === next?.familyId
    && state?.inviteId === next?.inviteId
    && state?.expiresAt === next?.expiresAt
    && state?.source === next?.source
    && state?.phase === next?.phase
  ) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getPendingBoardGameReservation() {
  if (state?.expiresAt && state.expiresAt <= Date.now()) emit(null);
  return state;
}

export function subscribePendingBoardGameReservation(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePendingBoardGameReservation() {
  return useSyncExternalStore(
    subscribePendingBoardGameReservation,
    getPendingBoardGameReservation,
    getPendingBoardGameReservation,
  );
}

export function setPendingBoardGameReservation(input: {
  gameKind: PendingBoardGameKind;
  familyId?: string | null;
  inviteId: string;
  expiresAt?: number | null;
  source?: PendingBoardGameSource;
  phase?: PendingBoardGamePhase;
}) {
  const inviteId = input.inviteId.trim();
  if (!inviteId) return false;
  const current = getPendingBoardGameReservation();
  if (current && current.gameKind !== input.gameKind && current.source === "server" && input.source !== "server") return false;
  generation += 1;
  emit({
    gameKind: input.gameKind,
    familyId: input.familyId ?? null,
    inviteId,
    expiresAt: input.expiresAt ?? null,
    source: input.source ?? "local",
    phase: input.phase ?? (input.source === "server" ? "waiting_confirmation" : "connecting"),
    generation,
  });
  return true;
}

export function beginLocalBoardGameReservation(
  gameKind: PendingBoardGameKind,
  familyId: string | null,
  phase: Extract<PendingBoardGamePhase, "connecting" | "requesting">,
) {
  const current = getPendingBoardGameReservation();
  if (current) return null;
  const token = `${phase}:${gameKind}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
  const ok = setPendingBoardGameReservation({ gameKind, familyId, inviteId: token, source: "local", phase });
  return ok ? token : null;
}

export function updateLocalBoardGameReservationPhase(token: string, phase: PendingBoardGamePhase) {
  const current = getPendingBoardGameReservation();
  if (!current || current.source !== "local" || current.inviteId !== token) return false;
  generation += 1;
  emit({ ...current, phase, generation });
  return true;
}

export function promoteLocalBoardGameReservation(input: {
  token: string;
  inviteId: string;
  expiresAt?: number | null;
  familyId?: string | null;
}) {
  const current = getPendingBoardGameReservation();
  if (!current || current.source !== "local" || current.inviteId !== input.token) return false;
  return setPendingBoardGameReservation({
    gameKind: current.gameKind,
    familyId: input.familyId ?? current.familyId,
    inviteId: input.inviteId,
    expiresAt: input.expiresAt ?? null,
    source: "server",
    phase: "waiting_confirmation",
  });
}

export function isLocalBoardGameCancellationRequested(token: string) {
  return localCancelRequested.has(token);
}

export function requestLocalBoardGameCancellation(token: string) {
  localCancelRequested.add(token);
  return new Promise<boolean>((resolve) => {
    const current = getPendingBoardGameReservation();
    if (!current || current.source !== "local" || current.inviteId !== token) {
      resolve(true);
      return;
    }
    const waiters = localCancelWaiters.get(token) ?? [];
    waiters.push(resolve);
    localCancelWaiters.set(token, waiters);
  });
}

export function finishLocalBoardGameReservation(token: string, cancelSucceeded = true) {
  const current = getPendingBoardGameReservation();
  if (current?.source === "local" && current.inviteId === token) emit(null);
  localCancelRequested.delete(token);
  const waiters = localCancelWaiters.get(token) ?? [];
  localCancelWaiters.delete(token);
  for (const resolve of waiters) resolve(cancelSucceeded);
}

export function clearPendingBoardGameReservation(match?: {
  gameKind?: PendingBoardGameKind;
  inviteId?: string | null;
}) {
  const current = getPendingBoardGameReservation();
  if (!current) return;
  if (match?.gameKind && current.gameKind !== match.gameKind) return;
  if (match?.inviteId && current.inviteId !== match.inviteId) return;
  emit(null);
}

export function resetPendingBoardGameReservation() {
  const current = state;
  emit(null);
  if (current?.source === "local") finishLocalBoardGameReservation(current.inviteId, false);
}

export function canStartBoardGame(kind: PendingBoardGameKind) {
  const pending = getPendingBoardGameReservation();
  return !pending || pending.gameKind === kind;
}
