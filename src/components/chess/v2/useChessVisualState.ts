import { useCallback, useMemo } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";
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
  const hintRevealProgress = useSharedValue(0);
  const hintMode = useSharedValue(0); // 0 = normal move, 1 = premove
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
    hintRevealProgress.value = 0;
    hintMode.value = 0;
  }, [captureHigh, captureLow, hintMode, hintRevealProgress, legalMoveHigh, legalMoveLow, selectedSquareIndex]);

  const revealHints = useCallback((originSquare: string, premove: boolean) => {
    selectedSquareIndex.value = squareToIndex(originSquare);
    hintMode.value = premove ? 1 : 0;
    hintRevealProgress.value = 0;
    hintRevealProgress.value = withTiming(1, { duration: 110 });
  }, [hintMode, hintRevealProgress, selectedSquareIndex]);

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
    hintRevealProgress,
    hintMode,
    lastMoveFromIndex,
    lastMoveToIndex,
    checkedKingIndex,
    premoveFromIndex,
    premoveToIndex,
    clearHints,
    revealHints,
    setLastMove,
    setCheckSquare,
    setPremove,
  }), [
    captureHigh, captureLow, checkedKingIndex, clearHints, hintMode, hintRevealProgress,
    legalMoveHigh, legalMoveLow, lastMoveFromIndex, lastMoveToIndex, premoveFromIndex,
    premoveToIndex, revealHints, selectedSquareIndex, setCheckSquare, setLastMove, setPremove,
  ]);
}

export type ChessVisualState = ReturnType<typeof useChessVisualState>;
