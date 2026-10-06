import { useCallback, useMemo } from "react";
import { useSharedValue } from "react-native-reanimated";
import { squareToIndex } from "./moveMask";

type InitialVisualState = {
  lastMove?: { from: string; to: string } | null;
  checkSquare?: string | null;
};

/**
 * V4J: shared values are reserved for the tiny set of persistent board
 * highlights. Legal-move hints moved to a sparse plain-View layer so selecting
 * a piece no longer creates a 64-worklet animation graph.
 */
export function useChessVisualState(initial: InitialVisualState = {}) {
  const selectedSquareIndex = useSharedValue(-1);
  const lastMoveFromIndex = useSharedValue(initial.lastMove ? squareToIndex(initial.lastMove.from) : -1);
  const lastMoveToIndex = useSharedValue(initial.lastMove ? squareToIndex(initial.lastMove.to) : -1);
  const checkedKingIndex = useSharedValue(initial.checkSquare ? squareToIndex(initial.checkSquare) : -1);
  const premoveFromIndex = useSharedValue(-1);
  const premoveToIndex = useSharedValue(-1);

  const clearHints = useCallback(() => {
    selectedSquareIndex.value = -1;
  }, [selectedSquareIndex]);

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
    checkedKingIndex, clearHints, lastMoveFromIndex, lastMoveToIndex,
    premoveFromIndex, premoveToIndex, selectedSquareIndex, setCheckSquare,
    setLastMove, setPremove,
  ]);
}

export type ChessVisualState = ReturnType<typeof useChessVisualState>;
