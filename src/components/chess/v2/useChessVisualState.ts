import { useCallback, useMemo } from "react";
import { useSharedValue } from "react-native-reanimated";
import { squareToIndex } from "./moveMask";

type InitialVisualState = {
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
};

export function useChessVisualState(initial: InitialVisualState = {}) {
  const selectedSquareIndex = useSharedValue(-1);
  const legalMoveLow = useSharedValue(0);
  const legalMoveHigh = useSharedValue(0);
  const captureLow = useSharedValue(0);
  const captureHigh = useSharedValue(0);
  const lastMoveFromIndex = useSharedValue(initial.lastMove ? squareToIndex(initial.lastMove.from) : -1);
  const lastMoveToIndex = useSharedValue(initial.lastMove ? squareToIndex(initial.lastMove.to) : -1);
  const checkedKingIndex = useSharedValue(initial.checkSquare ? squareToIndex(initial.checkSquare) : -1);
  const premoveFromIndex = useSharedValue(-1);
  const premoveToIndex = useSharedValue(-1);

  const clearHints = useCallback(() => {
    selectedSquareIndex.value = -1;
    legalMoveLow.value = 0;
    legalMoveHigh.value = 0;
    captureLow.value = 0;
    captureHigh.value = 0;
  }, [captureHigh, captureLow, legalMoveHigh, legalMoveLow, selectedSquareIndex]);

  const setLastMove = useCallback((from: string | null | undefined, to: string | null | undefined) => {
    lastMoveFromIndex.value = from ? squareToIndex(from) : -1;
    lastMoveToIndex.value = to ? squareToIndex(to) : -1;
  }, [lastMoveFromIndex, lastMoveToIndex]);

  const setCheckSquare = useCallback((square: string | null | undefined) => {
    checkedKingIndex.value = square ? squareToIndex(square) : -1;
  }, [checkedKingIndex]);

  const setPremove = useCallback((from: string | null | undefined, to: string | null | undefined) => {
    premoveFromIndex.value = from ? squareToIndex(from) : -1;
    premoveToIndex.value = to ? squareToIndex(to) : -1;
  }, [premoveFromIndex, premoveToIndex]);

  return useMemo(() => ({
    selectedSquareIndex,
    legalMoveLow,
    legalMoveHigh,
    captureLow,
    captureHigh,
    lastMoveFromIndex,
    lastMoveToIndex,
    checkedKingIndex,
    premoveFromIndex,
    premoveToIndex,
    clearHints,
    setLastMove,
    setCheckSquare,
    setPremove,
  }), [
    captureHigh, captureLow, checkedKingIndex, clearHints, legalMoveHigh, legalMoveLow,
    lastMoveFromIndex, lastMoveToIndex, premoveFromIndex, premoveToIndex,
    selectedSquareIndex, setCheckSquare, setLastMove, setPremove,
  ]);
}

export type ChessVisualState = ReturnType<typeof useChessVisualState>;
