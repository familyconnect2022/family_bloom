import { useSyncExternalStore } from "react";

import type { ChessGameState } from "../../types/chess";
import type { XiangqiRealtimeState } from "../../types/xiangqiRealtime";

export type BoardGameTerminalResult =
  | {
      kind: "chess";
      gameId: string;
      familyId: string;
      capturedAt: number;
      state: ChessGameState;
    }
  | {
      kind: "xiangqi";
      gameId: string;
      familyId: string;
      capturedAt: number;
      state: XiangqiRealtimeState;
    };

let state: BoardGameTerminalResult | null = null;
const listeners = new Set<() => void>();

function emit(next: BoardGameTerminalResult | null) {
  if (
    state?.kind === next?.kind
    && state?.gameId === next?.gameId
    && state?.capturedAt === next?.capturedAt
  ) return;
  state = next;
  for (const listener of listeners) listener();
}

export function getBoardGameTerminalResult() {
  return state;
}

export function subscribeBoardGameTerminalResult(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBoardGameTerminalResult() {
  return useSyncExternalStore(
    subscribeBoardGameTerminalResult,
    getBoardGameTerminalResult,
    getBoardGameTerminalResult,
  );
}

export function publishChessTerminalResult(result: ChessGameState) {
  if (result.status !== "finished" && result.status !== "cancelled") return false;
  if (state?.kind === "chess" && state.gameId === result.gameId) return true;
  emit({
    kind: "chess",
    gameId: result.gameId,
    familyId: result.familyId,
    capturedAt: Date.now(),
    state: result,
  });
  return true;
}

export function publishXiangqiTerminalResult(result: XiangqiRealtimeState) {
  if (result.status !== "finished") return false;
  if (state?.kind === "xiangqi" && state.gameId === result.gameId) return true;
  emit({
    kind: "xiangqi",
    gameId: result.gameId,
    familyId: result.familyId,
    capturedAt: Date.now(),
    state: result,
  });
  return true;
}

export function clearBoardGameTerminalResult(match?: { kind?: "chess" | "xiangqi"; gameId?: string | null }) {
  if (!state) return;
  if (match?.kind && state.kind !== match.kind) return;
  if (match?.gameId && state.gameId !== match.gameId) return;
  emit(null);
}

export function resetBoardGameTerminalResult() {
  emit(null);
}
