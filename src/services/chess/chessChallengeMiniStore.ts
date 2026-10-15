import { useSyncExternalStore } from "react";

export type ChessChallengeMiniState = {
  inviteId: string;
  familyId: string;
  opponentUid: string;
  opponentName: string;
  expiresAt: number;
  testCycleStep?: 1 | 2 | 3;
  visible: boolean;
  generation: number;
};

let state: ChessChallengeMiniState | null = null;
const listeners = new Set<() => void>();

function emit(next: ChessChallengeMiniState | null) {
  state = next;
  for (const listener of listeners) listener();
}

export function getChessChallengeMiniState() { return state; }
export function subscribeChessChallengeMini(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useChessChallengeMiniState() {
  return useSyncExternalStore(subscribeChessChallengeMini, getChessChallengeMiniState, getChessChallengeMiniState);
}

export function startChessChallengeMini(input: Omit<ChessChallengeMiniState, "visible" | "generation">) {
  const current = state;
  if (current?.inviteId === input.inviteId) {
    emit({ ...current, ...input });
    return;
  }
  emit({ ...input, visible: false, generation: (current?.generation ?? 0) + 1 });
}

export function setChessChallengeMiniVisible(inviteId: string, visible: boolean) {
  if (!state || state.inviteId !== inviteId || state.visible === visible) return;
  emit({ ...state, visible });
}

export function finishChessChallengeMini(inviteId?: string | null) {
  if (!state) return;
  if (inviteId && state.inviteId !== inviteId) return;
  emit(null);
}
