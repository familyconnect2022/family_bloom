import { Chess } from "chess.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import type {
  ChessAck,
  ChessAppliedMove,
  ChessColor,
  ChessGameState,
  ChessMoveCommandAck,
  ChessMoveDelta,
  ChessPromotionPiece,
} from "../../types/chess";
import { HighlightLayer } from "./v2/HighlightLayer";
import { HintLayer } from "./v2/HintLayer";
import { PieceLayer } from "./v2/PieceLayer";
import { SquareLayer } from "./v2/SquareLayer";
import type { ChessPieceController } from "./v2/ChessPiece";
import { positionToSquare, squareToPosition, type BoardOrientation } from "./v2/coordinateMapper";
import { buildPieceDescriptors, runtimeFromDescriptors, type PieceDescriptor, type PieceKey, type PieceRuntime } from "./v2/pieceIdentity";
import { buildMoveMasks, squareToIndex } from "./v2/moveMask";
import { useChessVisualState } from "./v2/useChessVisualState";

const MOVE_MS = 115;
const OPPONENT_MOVE_MS = 130;
const ILLEGAL_RETURN_MS = 95;

type PendingLocal = {
  clientMoveId: string;
  from: string;
  to: string;
  promotion?: ChessPromotionPiece;
  visual: Promise<void>;
};

type Premove = { from: string; to: string; promotion?: ChessPromotionPiece };

function forcedTurnFen(fen: string, color: ChessColor) {
  const fields = fen.split(" ");
  fields[1] = color;
  return fields.join(" ");
}

function captureSquare(move: ChessAppliedMove) {
  if (!move.captured) return null;
  if (move.flags.includes("e")) return `${move.to[0]}${move.from[1]}`;
  return move.to;
}

function castleRook(move: ChessAppliedMove) {
  if (!move.flags.includes("k") && !move.flags.includes("q")) return null;
  const rank = move.color === "w" ? "1" : "8";
  return move.flags.includes("k") ? { from: `h${rank}`, to: `f${rank}` } : { from: `a${rank}`, to: `d${rank}` };
}

export const ChessBoard = React.memo(function ChessBoard({
  state,
  myColor,
  moveDeltas,
  snapshotEpoch,
  onMove,
  onResync,
  onPromotion,
  onMotionChange,
  onVisualRevisionChange,
}: {
  state: ChessGameState;
  myColor: ChessColor;
  moveDeltas: ChessMoveDelta[];
  snapshotEpoch: number;
  onMove: (from: string, to: string, promotion: ChessPromotionPiece | undefined, clientMoveId: string) => Promise<ChessAck<ChessMoveCommandAck>>;
  onResync: () => Promise<ChessGameState | null>;
  onPromotion: (from: string, to: string) => Promise<ChessPromotionPiece | null>;
  onMotionChange?: (moving: boolean) => void;
  onVisualRevisionChange?: (revision: number) => void;
}) {
  const { width } = useWindowDimensions();
  const squareSize = Math.floor(Math.min(width - 28, 430) / 8);
  const boardSize = squareSize * 8;
  const orientation: BoardOrientation = myColor === "w" ? "white" : "black";

  const initialPieces = useMemo(() => buildPieceDescriptors(state.fen), [state.gameId]);
  const [pieces, setPieces] = useState<PieceDescriptor[]>(initialPieces);
  const [pieceGeneration, setPieceGeneration] = useState(0);

  const stateRef = useRef(state);
  const selectedRef = useRef<string | null>(null);
  const layoutKeyRef = useRef(`${orientation}:${squareSize}`);
  const runtimeRef = useRef<Map<string, PieceRuntime>>(runtimeFromDescriptors(initialPieces));
  const controllersRef = useRef(new Map<string, ChessPieceController>());
  const pendingRef = useRef<PendingLocal | null>(null);
  const premoveRef = useRef<Premove | null>(null);
  const motionRef = useRef(false);
  const lastQueuedVersionRef = useRef(state.revision);
  const lastSnapshotEpochRef = useRef(snapshotEpoch);
  const animationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const attemptRef = useRef<(from:string,to:string,promotion?:ChessPromotionPiece,source?:"tap"|"drag"|"premove")=>void>(()=>undefined);
  const sessionPrefixRef = useRef(`fbv2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`);
  const moveCounterRef = useRef(0);

  const boardLocked = useSharedValue(state.status === "active" ? 0 : 1);
  const boardOpacity = useSharedValue(1);
  const visual = useChessVisualState({
    lastMove: state.lastMove ? { from: state.lastMove.from, to: state.lastMove.to } : null,
    checkSquare: state.checkSquare,
  });
  const fadeStyle = useAnimatedStyle(() => ({ opacity: boardOpacity.value }));
  stateRef.current = state;

  const setMotion = useCallback((moving: boolean) => {
    if (motionRef.current === moving) return;
    motionRef.current = moving;
    onMotionChange?.(moving);
  }, [onMotionChange]);

  const register = useCallback((id: string, controller: ChessPieceController | null) => {
    if (controller) controllersRef.current.set(id, controller);
    else controllersRef.current.delete(id);
  }, []);

  const findPieceAt = useCallback((square: string, color?: ChessColor, type?: string) => {
    for (const [id, piece] of runtimeRef.current) {
      if (!piece.alive || piece.square !== square) continue;
      if (color && piece.pieceKey[0] !== color) continue;
      if (type && piece.pieceKey[1] !== type) continue;
      return { id, piece };
    }
    return null;
  }, []);

  const moveController = useCallback((id: string, square: string, duration: number) => new Promise<void>((resolve) => {
    const controller = controllersRef.current.get(id);
    if (!controller) { resolve(); return; }
    const p = squareToPosition(square, squareSize, orientation);
    controller.moveTo(p.x, p.y, duration, resolve);
  }), [orientation, squareSize]);

  const applyRuntimeMove = useCallback((move: ChessAppliedMove) => {
    const primary = findPieceAt(move.from, move.color, move.piece);
    if (primary) {
      primary.piece.square = move.to;
      if (move.promotion) {
        primary.piece.pieceKey = `${move.color}${move.promotion}` as PieceKey;
        controllersRef.current.get(primary.id)?.setPieceKey(primary.piece.pieceKey);
      }
    }
    const capturedAt = captureSquare(move);
    if (capturedAt) {
      const captured = findPieceAt(capturedAt, move.color === "w" ? "b" : "w");
      if (captured && captured.id !== primary?.id) captured.piece.alive = false;
    }
    const rookMove = castleRook(move);
    if (rookMove) {
      const rook = findPieceAt(rookMove.from, move.color, "r");
      if (rook) rook.piece.square = rookMove.to;
    }
  }, [findPieceAt]);

  const animateMove = useCallback(async (move: ChessAppliedMove, duration: number) => {
    const primary = findPieceAt(move.from, move.color, move.piece);
    if (!primary) return;
    const tasks: Promise<void>[] = [moveController(primary.id, move.to, duration)];
    const capturedAt = captureSquare(move);
    if (capturedAt) {
      const captured = findPieceAt(capturedAt, move.color === "w" ? "b" : "w");
      if (captured && captured.id !== primary.id) controllersRef.current.get(captured.id)?.fadeTo(0, 70, 55);
    }
    const rookMove = castleRook(move);
    if (rookMove) {
      const rook = findPieceAt(rookMove.from, move.color, "r");
      if (rook) tasks.push(moveController(rook.id, rookMove.to, duration));
    }
    await Promise.all(tasks);
  }, [findPieceAt, moveController]);

  const rebuildFromSnapshot = useCallback((snapshot: ChessGameState) => new Promise<void>((resolve) => {
    boardLocked.value = 1;
    setMotion(true);
    boardOpacity.value = withTiming(0, { duration: 60 });
    setTimeout(() => {
      const nextPieces = buildPieceDescriptors(snapshot.fen);
      controllersRef.current.clear();
      runtimeRef.current = runtimeFromDescriptors(nextPieces);
      lastQueuedVersionRef.current = snapshot.revision;
      setPieces(nextPieces);
      setPieceGeneration((value) => value + 1);
      selectedRef.current = null;
      visual.clearHints();
      pendingRef.current = null;
      premoveRef.current = null;
      visual.setPremove(null, null);
      visual.setLastMove(snapshot.lastMove?.from, snapshot.lastMove?.to);
      visual.setCheckSquare(snapshot.checkSquare);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        boardOpacity.value = withTiming(1, { duration: 90 });
        setTimeout(() => {
          boardLocked.value = snapshot.status === "active" ? 0 : 1;
          setMotion(false);
          onVisualRevisionChange?.(snapshot.revision);
          resolve();
        }, 95);
      }));
    }, 65);
  }), [boardLocked, boardOpacity, onVisualRevisionChange, setMotion, visual]);

  const legalMovesFor = useCallback((fen: string, from: string, allowPremove: boolean) => {
    try {
      const chess = new Chess(allowPremove ? forcedTurnFen(fen, myColor) : fen);
      return chess.moves({ square: from as never, verbose: true }) as Array<any>;
    } catch { return [] as Array<any>; }
  }, [myColor]);

  const clearSelection = useCallback(() => {
    selectedRef.current = null;
    visual.clearHints();
  }, [visual]);

  const selectSquare = useCallback((square: string) => {
    const current = stateRef.current;
    const piece = findPieceAt(square);
    if (!piece || piece.piece.pieceKey[0] !== myColor || current.status !== "active" || pendingRef.current) {
      clearSelection();
      return;
    }
    const allowPremove = current.turn !== myColor;
    const moves = legalMovesFor(current.fen, square, allowPremove);
    const masks = buildMoveMasks(moves);
    selectedRef.current = square;
    visual.selectedSquareIndex.value = squareToIndex(square);
    visual.legalMoveLow.value = masks.legal.low;
    visual.legalMoveHigh.value = masks.legal.high;
    visual.captureLow.value = masks.capture.low;
    visual.captureHigh.value = masks.capture.high;
  }, [clearSelection, findPieceAt, legalMovesFor, myColor, visual]);

  const snapPieceBack = useCallback((id: string, square: string, unlock = true) => {
    const p = squareToPosition(square, squareSize, orientation);
    controllersRef.current.get(id)?.moveTo(p.x, p.y, ILLEGAL_RETURN_MS, () => {
      if (unlock) boardLocked.value = stateRef.current.status === "active" ? 0 : 1;
      setMotion(false);
    });
  }, [boardLocked, orientation, setMotion, squareSize]);

  const executeAttempt = useCallback(async (from: string, to: string, promotion: ChessPromotionPiece | undefined, source: "tap"|"drag"|"premove" = "tap") => {
    const current = stateRef.current;
    const movingPiece = findPieceAt(from);
    if (!movingPiece || movingPiece.piece.pieceKey[0] !== myColor || current.status !== "active" || pendingRef.current) {
      if (source === "drag" && movingPiece) snapPieceBack(movingPiece.id, from);
      return;
    }

    const isPremove = current.turn !== myColor;
    const candidates = legalMovesFor(current.fen, from, isPremove).filter((move) => move.to === to);
    if (!candidates.length) {
      clearSelection();
      if (source === "drag") snapPieceBack(movingPiece.id, from);
      else { setMotion(false); boardLocked.value = 0; }
      return;
    }

    let chosenPromotion = promotion;
    const promotionCandidates = candidates.filter((move) => !!move.promotion);
    if (promotionCandidates.length && !chosenPromotion) {
      chosenPromotion = await onPromotion(from, to) ?? undefined;
      if (!chosenPromotion) {
        clearSelection();
        if (source === "drag") snapPieceBack(movingPiece.id, from);
        return;
      }
    }
    const candidate = candidates.find((move) => !move.promotion || move.promotion === chosenPromotion) ?? candidates[0];

    clearSelection();
    if (isPremove) {
      const queued = { from, to, ...(chosenPromotion ? { promotion: chosenPromotion } : {}) };
      premoveRef.current = queued;
      visual.setPremove(from, to);
      if (source === "drag") snapPieceBack(movingPiece.id, from);
      else { boardLocked.value = 0; setMotion(false); }
      return;
    }

    premoveRef.current = null;
    visual.setPremove(null, null);
    boardLocked.value = 1;
    setMotion(true);
    const clientMoveId = `${sessionPrefixRef.current}-${++moveCounterRef.current}`;
    const applied: ChessAppliedMove = {
      from, to, san: candidate.san, color: candidate.color, piece: candidate.piece, flags: candidate.flags,
      ...(candidate.captured ? { captured: candidate.captured } : {}),
      ...(candidate.promotion ? { promotion: candidate.promotion } : {}),
    };
    const visualPromise = animateMove(applied, source === "drag" ? 85 : MOVE_MS).then(() => {
      if (pendingRef.current?.clientMoveId === clientMoveId) applyRuntimeMove(applied);
      setMotion(false);
    });
    pendingRef.current = { clientMoveId, from, to, promotion: chosenPromotion, visual: visualPromise };

    void onMove(from, to, chosenPromotion, clientMoveId).then(async (ack) => {
      if (!ack.ok) {
        if (pendingRef.current?.clientMoveId !== clientMoveId) return;
        pendingRef.current = null;
        const snapshot = await onResync();
        if (snapshot) await rebuildFromSnapshot(snapshot);
        else { boardLocked.value = 0; setMotion(false); }
        return;
      }
      setTimeout(() => {
        if (pendingRef.current?.clientMoveId === clientMoveId && stateRef.current.revision < ack.data.version) void onResync().then((snapshot) => snapshot && rebuildFromSnapshot(snapshot));
      }, 700);
    });
  }, [animateMove, applyRuntimeMove, boardLocked, clearSelection, findPieceAt, legalMovesFor, myColor, onMove, onPromotion, onResync, rebuildFromSnapshot, setMotion, snapPieceBack, visual]);
  attemptRef.current = executeAttempt;

  const onTapPiece = useCallback((id: string) => {
    const runtime = runtimeRef.current.get(id);
    if (!runtime?.alive) return;
    const selectedNow = selectedRef.current;
    if (selectedNow && runtime.pieceKey[0] !== myColor) { void attemptRef.current(selectedNow, runtime.square, undefined, "tap"); return; }
    selectSquare(runtime.square);
  }, [myColor, selectSquare]);

  const onPressSquare = useCallback((square: string) => {
    if (motionRef.current || pendingRef.current) return;
    const selectedNow = selectedRef.current;
    if (selectedNow) { void attemptRef.current(selectedNow, square, undefined, "tap"); return; }
    selectSquare(square);
  }, [selectSquare]);

  const onDragStart = useCallback((id: string) => {
    const runtime = runtimeRef.current.get(id);
    if (!runtime?.alive) return;
    // Selection/hints are SharedValue-only. Starting a drag does not call a
    // React state setter or notify the parent screen.
    selectSquare(runtime.square);
    boardLocked.value = 1;
  }, [boardLocked, selectSquare]);

  const onDragCancel = useCallback((_id: string) => {
    clearSelection();
    boardLocked.value = stateRef.current.status === "active" ? 0 : 1;
  }, [boardLocked, clearSelection]);

  const onDrop = useCallback((id: string, centerX: number, centerY: number) => {
    const runtime = runtimeRef.current.get(id);
    if (!runtime?.alive) return;
    const target = positionToSquare(centerX, centerY, squareSize, orientation);
    if (!target) { clearSelection(); snapPieceBack(id, runtime.square); return; }
    void attemptRef.current(runtime.square, target, undefined, "drag");
  }, [clearSelection, orientation, snapPieceBack, squareSize]);

  const processDelta = useCallback(async (delta: ChessMoveDelta) => {
    const pending = pendingRef.current;
    if (pending && delta.clientMoveId === pending.clientMoveId) {
      await pending.visual;
      visual.setLastMove(delta.move.from, delta.move.to);
      visual.setCheckSquare(delta.checkSquare);
      pendingRef.current = null;
      boardLocked.value = delta.status === "active" ? 0 : 1;
      onVisualRevisionChange?.(delta.version);
      return;
    }

    boardLocked.value = 1;
    setMotion(true);
    await animateMove(delta.move, OPPONENT_MOVE_MS);
    applyRuntimeMove(delta.move);
    clearSelection();
    visual.setLastMove(delta.move.from, delta.move.to);
    visual.setCheckSquare(delta.checkSquare);
    setMotion(false);
    boardLocked.value = delta.status === "active" ? 0 : 1;
    onVisualRevisionChange?.(delta.version);

    const queued = premoveRef.current;
    if (queued && delta.turn === myColor && delta.status === "active") {
      premoveRef.current = null;
      visual.setPremove(null, null);
      requestAnimationFrame(() => void attemptRef.current(queued.from, queued.to, queued.promotion, "premove"));
    }
  }, [animateMove, applyRuntimeMove, boardLocked, clearSelection, myColor, onVisualRevisionChange, setMotion, visual]);

  useEffect(() => {
    // A full snapshot scheduled in the same React batch supersedes buffered
    // deltas. Rebuild the latest authoritative position instead of animating
    // against a stale visual base.
    if (lastSnapshotEpochRef.current !== snapshotEpoch) return;
    const pending = moveDeltas
      .filter((delta) => delta.gameId === state.gameId && delta.version > lastQueuedVersionRef.current)
      .sort((a, b) => a.version - b.version);
    if (!pending.length) return;

    for (const delta of pending) {
      const expected = lastQueuedVersionRef.current + 1;
      if (delta.version !== expected) {
        // Missing/out-of-order visual history: authoritative snapshot wins.
        lastQueuedVersionRef.current = state.revision;
        animationQueueRef.current = animationQueueRef.current.then(async () => {
          const snapshot = await onResync();
          if (snapshot) await rebuildFromSnapshot(snapshot);
        });
        return;
      }
      lastQueuedVersionRef.current = delta.version;
      animationQueueRef.current = animationQueueRef.current.then(() => processDelta(delta)).catch(async () => {
        const snapshot = await onResync();
        if (snapshot) await rebuildFromSnapshot(snapshot);
      });
    }
  }, [moveDeltas, onResync, processDelta, rebuildFromSnapshot, snapshotEpoch, state.gameId, state.revision]);

  useEffect(() => {
    if (lastSnapshotEpochRef.current === snapshotEpoch) return;
    lastSnapshotEpochRef.current = snapshotEpoch;
    animationQueueRef.current = animationQueueRef.current.then(() => rebuildFromSnapshot(state));
  }, [rebuildFromSnapshot, snapshotEpoch, state]);

  useEffect(() => {
    const key = `${orientation}:${squareSize}`;
    if (layoutKeyRef.current === key) return;
    layoutKeyRef.current = key;
    boardLocked.value = 1;
    // Resize/flip is visual only. Preserve piece identity and logical squares;
    // derive fresh pixels and move the existing native nodes directly.
    for (const [id, runtime] of runtimeRef.current) {
      if (!runtime.alive) continue;
      const point = squareToPosition(runtime.square, squareSize, orientation);
      controllersRef.current.get(id)?.setPosition(point.x, point.y);
    }
    boardLocked.value = stateRef.current.status === "active" ? 0 : 1;
  }, [boardLocked, orientation, squareSize]);

  useEffect(() => {
    if (state.status !== "active") boardLocked.value = 1;
  }, [boardLocked, state.status]);

  useEffect(() => () => { onMotionChange?.(false); }, [onMotionChange]);

  return (
    <GestureHandlerRootView style={[styles.board, { width:boardSize,height:boardSize }]}>
      <SquareLayer squareSize={squareSize} boardSize={boardSize} orientation={orientation} onPressSquare={onPressSquare}/>
      <Animated.View pointerEvents="box-none" style={[StyleSheet.absoluteFill, fadeStyle]}>
        <HighlightLayer
          squareSize={squareSize}
          orientation={orientation}
          selectedSquareIndex={visual.selectedSquareIndex}
          lastMoveFromIndex={visual.lastMoveFromIndex}
          lastMoveToIndex={visual.lastMoveToIndex}
          checkedKingIndex={visual.checkedKingIndex}
          premoveFromIndex={visual.premoveFromIndex}
          premoveToIndex={visual.premoveToIndex}
        />
        <HintLayer
          squareSize={squareSize}
          orientation={orientation}
          legalMoveLow={visual.legalMoveLow}
          legalMoveHigh={visual.legalMoveHigh}
          captureLow={visual.captureLow}
          captureHigh={visual.captureHigh}
        />
        <PieceLayer key={`piece-layer-${pieceGeneration}`} pieces={pieces} squareSize={squareSize} orientation={orientation} myColor={myColor} boardLocked={boardLocked} register={register} onTapPiece={onTapPiece} onDragStart={onDragStart} onDragCancel={onDragCancel} onDrop={onDrop}/>
      </Animated.View>
    </GestureHandlerRootView>
  );
});

const styles=StyleSheet.create({board:{alignSelf:"center",borderRadius:12,overflow:"hidden",backgroundColor:"#B77A68"}});
