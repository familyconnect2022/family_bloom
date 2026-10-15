import { useSyncExternalStore } from "react";

export type XiangqiChallengeMiniState = {
  inviteId: string;
  familyId: string;
  opponentUid: string;
  opponentName: string;
  expiresAt: number;
  testCycleStep?: 1 | 2 | 3;
  visible: boolean;
  generation: number;
};

type MiniPosition = { x: number; y: number };
let state: XiangqiChallengeMiniState | null = null;
let position: MiniPosition | null = null;
const listeners = new Set<() => void>();

function emit(next: XiangqiChallengeMiniState | null) {
  state = next;
  for (const listener of listeners) listener();
}

export function getXiangqiChallengeMiniState() { return state; }
export function subscribeXiangqiChallengeMini(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
export function useXiangqiChallengeMiniState() {
  return useSyncExternalStore(subscribeXiangqiChallengeMini, getXiangqiChallengeMiniState, getXiangqiChallengeMiniState);
}

export function startXiangqiChallengeMini(input: Omit<XiangqiChallengeMiniState, "visible" | "generation">) {
  const current = state;
  if (current?.inviteId === input.inviteId) {
    emit({ ...current, ...input });
    return;
  }
  emit({ ...input, visible: false, generation: (current?.generation ?? 0) + 1 });
}

export function setXiangqiChallengeMiniVisible(inviteId: string, visible: boolean) {
  if (!state || state.inviteId !== inviteId || state.visible === visible) return;
  emit({ ...state, visible });
}

export function finishXiangqiChallengeMini(inviteId?: string | null) {
  if (!state) return;
  if (inviteId && state.inviteId !== inviteId) return;
  emit(null);
}

export function getXiangqiChallengeMiniPosition() { return position; }
export function setXiangqiChallengeMiniPosition(next: MiniPosition) { position = next; }
