import { Chess, type PieceSymbol } from "chess.js";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { applyChessMoveDelta } from "../../types/chess";
import { HighlightLayer } from "./v2/HighlightLayer";
import { HintLayer } from "./v2/HintLayer";
import { InteractionLayer } from "./v2/InteractionLayer";
import { PieceLayer } from "./v2/PieceLayer";
import { SquareLayer } from "./v2/SquareLayer";
import type { ChessPieceController, ChessPieceMotionProfile } from "./v2/ChessPiece";
import { positionToSquare, squareToPosition, type BoardOrientation } from "./v2/coordinateMapper";
import { buildPieceDescriptors, runtimeFromDescriptors, type PieceDescriptor, type PieceKey, type PieceRuntime } from "./v2/pieceIdentity";
import { buildMoveMasks, squareToIndex } from "./v2/moveMask";
import { useChessVisualState } from "./v2/useChessVisualState";
import { chessDiagnostics } from "../../services/chess/chessDiagnostics";

type CapturablePiece = NonNullable<ChessAppliedMove["captured"]>;
function asCapturablePiece(piece: PieceSymbol | undefined): CapturablePiece | undefined {
  if (!piece) return undefined;
  // Legal chess never captures a king; chess.js includes `k` only in the broad PieceSymbol type.
  if (piece === "k") throw new Error("CHESS_INVARIANT_CAPTURED_KING");
  return piece;
}

const MOVE_MS = 115;
const OPPONENT_MOVE_MS = 130;
const PREMOVE_MOVE_MS = 92;
const ILLEGAL_RETURN_MS = 95;
const canInteract = (state: ChessGameState, myColor: ChessColor) => state.status === "active" && state.turn === myColor;
const canTouchBoard = (state: ChessGameState) => state.status === "active";

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
  onVisualTurnChange,
}: {
  state: ChessGameState;
  myColor: ChessColor;
  moveDeltas: ChessMoveDelta[];
  snapshotEpoch: number;
  onMove: (from: string, to: string, promotion: ChessPromotionPiece | undefined, clientMoveId: string, expectedVersion: number) => Promise<ChessAck<ChessMoveCommandAck>>;
  onResync: () => Promise<ChessGameState | null>;
  onPromotion: (from: string, to: string) => Promise<ChessPromotionPiece | null>;
  onMotionChange?: (moving: boolean) => void;
  onVisualRevisionChange?: (revision: number) => void;
  onVisualTurnChange?: (turn: ChessColor, status: ChessGameState["status"]) => void;
}) {
  const { width } = useWindowDimensions();
  const squareSize = Math.floor(Math.min(width - 28, 430) / 8);
  const boardSize = squareSize * 8;
  const orientation: BoardOrientation = myColor === "w" ? "white" : "black";

  const initialPieces = useMemo(() => buildPieceDescriptors(state.fen), [state.gameId]);
  const [pieces, setPieces] = useState<PieceDescriptor[]>(initialPieces);
  const [pieceGeneration, setPieceGeneration] = useState(0);

  const stateRef = useRef(state);
  // Interaction truth follows the position that is already visible on screen.
  // Network state may advance before the visual animation queue catches up.
  const interactionStateRef = useRef(state);
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

  // V4G: opponent turn is still touchable for ONE local premove. Server truth
  // remains authoritative; boardLocked now means visual/input transaction lock,
  // not simply "not my turn".
  const boardLocked = useSharedValue(canTouchBoard(state) ? 0 : 1);
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

  const moveController = useCallback((id: string, square: string, duration: number, profile: ChessPieceMotionProfile = "lift") => new Promise<void>((resolve) => {
    const controller = controllersRef.current.get(id);
    if (!controller) { resolve(); return; }
    const p = squareToPosition(square, squareSize, orientation);
    controller.moveTo(p.x, p.y, duration, resolve, profile);
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

  const animateMove = useCallback(async (move: ChessAppliedMove, duration: number, profile: ChessPieceMotionProfile = "lift") => {
    const primary = findPieceAt(move.from, move.color, move.piece);
    if (!primary) return;
    const tasks: Promise<void>[] = [moveController(primary.id, move.to, duration, profile)];
    const capturedAt = captureSquare(move);
    if (capturedAt) {
      const captured = findPieceAt(capturedAt, move.color === "w" ? "b" : "w");
      if (captured && captured.id !== primary.id) controllersRef.current.get(captured.id)?.fadeTo(0, 70, 55);
    }
    const rookMove = castleRook(move);
    if (rookMove) {
      const rook = findPieceAt(rookMove.from, move.color, "r");
      if (rook) tasks.push(moveController(rook.id, rookMove.to, duration, profile));
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
      interactionStateRef.current = snapshot;
      onVisualTurnChange?.(snapshot.turn, snapshot.status);
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
          boardLocked.value = canTouchBoard(snapshot) ? 0 : 1;
          setMotion(false);
          onVisualRevisionChange?.(snapshot.revision);
          resolve();
        }, 95);
      }));
    }, 65);
  }), [boardLocked, boardOpacity, myColor, onVisualRevisionChange, onVisualTurnChange, setMotion, visual]);

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

  const clearPremove = useCallback((detail = "clear") => {
    const queued = premoveRef.current;
    if (queued) {
      chessDiagnostics.mark({ gameId: interactionStateRef.current.gameId, stage: "premove_clear", from: queued.from, to: queued.to, version: interactionStateRef.current.revision, detail });
    }
    premoveRef.current = null;
    visual.setPremove(null, null);
  }, [visual]);

  const selectSquare = useCallback((square: string) => {
    const current = interactionStateRef.current;
    const premoveMode = current.status === "active" && current.turn !== myColor;
    chessDiagnostics.mark({
      gameId: current.gameId,
      stage: "selection",
      from: square,
      version: current.revision,
      detail: `${premoveMode ? "premove" : "move"}:visual-v${current.revision}`,
    });

    const piece = findPieceAt(square);
    if (!piece || piece.piece.pieceKey[0] !== myColor || current.status !== "active" || pendingRef.current) {
      const reason = pendingRef.current
        ? "PENDING_MOVE"
        : current.status !== "active"
          ? `STATUS_${current.status}`
          : !piece
            ? "NO_PIECE"
            : "WRONG_COLOR";
      chessDiagnostics.mark({ gameId: current.gameId, stage: "input_blocked", from: square, version: current.revision, detail: reason });
      clearSelection();
      return;
    }

    // Tapping the queued source again is a quick premove cancel gesture.
    if (premoveMode && premoveRef.current?.from === square && !selectedRef.current) {
      clearPremove("tap-source-toggle");
      clearSelection();
      return;
    }

    const moves = legalMovesFor(current.fen, square, premoveMode);
    const masks = buildMoveMasks(moves);
    if (premoveMode && premoveRef.current) clearPremove("replace-selection");
    selectedRef.current = square;
    visual.legalMoveLow.value = masks.legal.low;
    visual.legalMoveHigh.value = masks.legal.high;
    visual.captureLow.value = masks.capture.low;
    visual.captureHigh.value = masks.capture.high;
    visual.revealHints(square, premoveMode);
  }, [clearPremove, clearSelection, findPieceAt, legalMovesFor, myColor, visual]);

  const snapPieceBack = useCallback((id: string, square: string, unlock = true) => {
    const p = squareToPosition(square, squareSize, orientation);
    controllersRef.current.get(id)?.moveTo(p.x, p.y, ILLEGAL_RETURN_MS, () => {
      if (unlock) boardLocked.value = canTouchBoard(interactionStateRef.current) ? 0 : 1;
      setMotion(false);
    }, "settle");
  }, [boardLocked, orientation, setMotion, squareSize]);

  const queuePremove = useCallback(async (
    from: string,
    to: string,
    promotion: ChessPromotionPiece | undefined,
    source: "tap" | "drag" = "tap",
  ) => {
    const current = interactionStateRef.current;
    const movingPiece = findPieceAt(from);
    if (!movingPiece || movingPiece.piece.pieceKey[0] !== myColor || current.status !== "active" || current.turn === myColor || pendingRef.current) {
      const reason = current.turn === myColor ? "TURN_ALREADY_MINE" : pendingRef.current ? "PENDING_MOVE" : !movingPiece ? "NO_PIECE" : current.status !== "active" ? `STATUS_${current.status}` : "WRONG_COLOR";
      chessDiagnostics.mark({ gameId: current.gameId, stage: "premove_blocked", from, to, version: current.revision, detail: reason });
      clearSelection();
      if (source === "drag" && movingPiece) snapPieceBack(movingPiece.id, from);
      else boardLocked.value = canTouchBoard(current) ? 0 : 1;
      return;
    }

    // A premove is only an intent cache. For UI guidance we use chess.js with
    // the turn forced locally, but the move is validated again on the NEW
    // authoritative FEN after the opponent actually moves.
    const candidates = legalMovesFor(current.fen, from, true).filter((move) => move.to === to);
    if (!candidates.length) {
      chessDiagnostics.mark({ gameId: current.gameId, stage: "premove_invalid", from, to, version: current.revision, detail: source });
      clearSelection();
      if (source === "drag") snapPieceBack(movingPiece.id, from);
      else boardLocked.value = 0;
      return;
    }

    let chosenPromotion = promotion;
    const promotionCandidates = candidates.filter((move) => !!move.promotion);
    if (promotionCandidates.length && !chosenPromotion) {
      chosenPromotion = await onPromotion(from, to) ?? undefined;
      if (!chosenPromotion) {
        clearSelection();
        if (source === "drag") snapPieceBack(movingPiece.id, from);
        else boardLocked.value = 0;
        return;
      }
    }

    const replacing = !!premoveRef.current;
    premoveRef.current = { from, to, promotion: chosenPromotion };
    visual.setPremove(from, to);
    clearSelection();
    chessDiagnostics.mark({
      gameId: current.gameId,
      stage: replacing ? "premove_replace" : "premove_set",
      from,
      to,
      version: current.revision,
      detail: source,
    });

    // The real piece never leaves the authoritative source square while a
    // premove is queued. A dragged piece settles back; the lavender from/to
    // overlay communicates the queued intent without lying about game truth.
    if (source === "drag") snapPieceBack(movingPiece.id, from);
    else boardLocked.value = 0;
  }, [boardLocked, clearSelection, findPieceAt, legalMovesFor, myColor, onPromotion, snapPieceBack, visual]);

  const executeAttempt = useCallback(async (from: string, to: string, promotion: ChessPromotionPiece | undefined, source: "tap"|"drag"|"premove" = "tap") => {
    const current = interactionStateRef.current;
    chessDiagnostics.mark({ gameId: current.gameId, stage: "attempt_start", from, to, version: current.revision, detail: `${source}:visual-v${current.revision}` });
    const movingPiece = findPieceAt(from);
    if (!movingPiece || movingPiece.piece.pieceKey[0] !== myColor || current.status !== "active" || current.turn !== myColor || pendingRef.current) {
      const reason = current.turn !== myColor ? "NOT_MY_TURN" : !movingPiece ? "NO_PIECE" : pendingRef.current ? "PENDING_MOVE" : current.status !== "active" ? `STATUS_${current.status}` : "WRONG_COLOR";
      chessDiagnostics.mark({ gameId: current.gameId, stage: "attempt_blocked", from, to, version: current.revision, detail: reason });
      chessDiagnostics.mark({ gameId: current.gameId, stage: "input_blocked", from, to, version: current.revision, detail: reason });
      if (source === "drag" && movingPiece) snapPieceBack(movingPiece.id, from);
      else if (source === "premove") {
        clearPremove("execute-blocked");
        boardLocked.value = canTouchBoard(current) ? 0 : 1;
      }
      return;
    }

    const candidates = legalMovesFor(current.fen, from, false).filter((move) => move.to === to);
    if (!candidates.length) {
      chessDiagnostics.mark({ gameId: current.gameId, stage: source === "premove" ? "premove_revalidate_fail" : "local_validate_illegal", from, to, version: current.revision, detail: source });
      clearSelection();
      clearPremove("revalidate-fail");
      if (source === "drag") snapPieceBack(movingPiece.id, from);
      else { setMotion(false); boardLocked.value = canTouchBoard(current) ? 0 : 1; }
      return;
    }
    chessDiagnostics.mark({ gameId: current.gameId, stage: source === "premove" ? "premove_revalidate_ok" : "local_validate_ok", from, to, version: current.revision, detail: `${source}:${candidates.length}` });

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
    clearPremove(source === "premove" ? "execute" : "normal-move");
    boardLocked.value = 1;
    setMotion(true);
    const clientMoveId = `${sessionPrefixRef.current}-${++moveCounterRef.current}`;
    chessDiagnostics.mark({ gameId: current.gameId, stage: "optimistic_start", clientMoveId, from, to, version: current.revision, detail: source });
    const captured = asCapturablePiece(candidate.captured);
    const applied: ChessAppliedMove = {
      from, to, san: candidate.san, color: candidate.color, piece: candidate.piece, flags: candidate.flags,
      ...(captured ? { captured } : {}),
      ...(candidate.promotion ? { promotion: candidate.promotion } : {}),
    };
    const duration = source === "drag" ? 85 : source === "premove" ? PREMOVE_MOVE_MS : MOVE_MS;
    const profile: ChessPieceMotionProfile = source === "drag" ? "settle" : "lift";
    const visualPromise = animateMove(applied, duration, profile).then(() => {
      if (pendingRef.current?.clientMoveId === clientMoveId) applyRuntimeMove(applied);
      chessDiagnostics.mark({ gameId: current.gameId, stage: "optimistic_settle", clientMoveId, from, to, version: current.revision });
      setMotion(false);
    });
    pendingRef.current = { clientMoveId, from, to, promotion: chosenPromotion, visual: visualPromise };

    void onMove(from, to, chosenPromotion, clientMoveId, current.revision).then(async (ack) => {
      chessDiagnostics.mark({ gameId: current.gameId, stage: ack.ok ? "socket_ack_ok" : "socket_ack_fail", clientMoveId, from, to, version: ack.ok ? ack.data.version : current.revision, detail: ack.ok ? undefined : ack.errorCode });
      if (!ack.ok) {
        if (pendingRef.current?.clientMoveId !== clientMoveId) return;
        pendingRef.current = null;
        const snapshot = await onResync();
        if (snapshot) await rebuildFromSnapshot(snapshot);
        else { boardLocked.value = canTouchBoard(current) ? 0 : 1; setMotion(false); }
        return;
      }
      setTimeout(() => {
        if (pendingRef.current?.clientMoveId === clientMoveId && stateRef.current.revision < ack.data.version) void onResync().then((snapshot) => snapshot && rebuildFromSnapshot(snapshot));
      }, 700);
    });
  }, [animateMove, applyRuntimeMove, boardLocked, clearPremove, clearSelection, findPieceAt, legalMovesFor, myColor, onMove, onPromotion, onResync, rebuildFromSnapshot, setMotion, snapPieceBack, visual]);
  attemptRef.current = executeAttempt;

  const onTapPiece = useCallback((id: string) => {
    const current = interactionStateRef.current;
    const runtime = runtimeRef.current.get(id);
    chessDiagnostics.mark({ gameId: current.gameId, stage: "piece_hit", from: runtime?.square, version: current.revision, detail: id });
    if (!runtime?.alive) return;
    const selectedNow = selectedRef.current;
    if (selectedNow && runtime.pieceKey[0] !== myColor) {
      if (current.turn === myColor) void attemptRef.current(selectedNow, runtime.square, undefined, "tap");
      else void queuePremove(selectedNow, runtime.square, undefined, "tap");
      return;
    }
    if (!selectedNow && premoveRef.current && (runtime.square === premoveRef.current.from || runtime.square === premoveRef.current.to)) {
      clearPremove("tap-highlight");
      return;
    }
    selectSquare(runtime.square);
  }, [clearPremove, myColor, queuePremove, selectSquare]);

  const onPressSquare = useCallback((square: string) => {
    const visible = interactionStateRef.current;
    const networkAhead = stateRef.current.gameId === visible.gameId && stateRef.current.revision > visible.revision;
    const lockReason = networkAhead ? "VISUAL_CATCHUP_LOCK" : motionRef.current ? "MOTION_LOCK" : pendingRef.current ? "PENDING_LOCK" : undefined;
    chessDiagnostics.mark({ gameId: visible.gameId, stage: "square_hit", to: square, version: visible.revision, detail: lockReason });
    if (lockReason) {
      chessDiagnostics.mark({ gameId: visible.gameId, stage: "input_blocked", to: square, version: visible.revision, detail: lockReason });
      return;
    }
    const selectedNow = selectedRef.current;
    if (selectedNow) {
      if (visible.turn === myColor) void attemptRef.current(selectedNow, square, undefined, "tap");
      else void queuePremove(selectedNow, square, undefined, "tap");
      return;
    }
    if (premoveRef.current && (square === premoveRef.current.from || square === premoveRef.current.to)) {
      clearPremove("tap-highlight");
      return;
    }
    selectSquare(square);
  }, [clearPremove, myColor, queuePremove, selectSquare]);

  const onDragStart = useCallback((id: string) => {
    const runtime = runtimeRef.current.get(id);
    if (!runtime?.alive) return;
    selectSquare(runtime.square);
    boardLocked.value = 1;
  }, [boardLocked, selectSquare]);

  const onDragCancel = useCallback((_id: string) => {
    clearSelection();
    boardLocked.value = canTouchBoard(interactionStateRef.current) ? 0 : 1;
  }, [boardLocked, clearSelection]);

  const resolveDropTarget = useCallback((from: string, centerX: number, centerY: number) => {
    const current = interactionStateRef.current;
    const raw = positionToSquare(centerX, centerY, squareSize, orientation);
    const allowPremove = current.status === "active" && current.turn !== myColor;
    const moves = current.status === "active" ? legalMovesFor(current.fen, from, allowPremove) : [];
    const legalTargets = Array.from(new Set(moves.map((move) => String(move.to))));
    if (raw && legalTargets.includes(raw)) return { target: raw, raw, adjusted: false };

    const maxDistance = squareSize * 0.56;
    let best: { square: string; distance: number } | null = null;
    for (const square of legalTargets) {
      const p = squareToPosition(square, squareSize, orientation);
      const dx = centerX - (p.x + squareSize / 2);
      const dy = centerY - (p.y + squareSize / 2);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= maxDistance && (!best || distance < best.distance)) best = { square, distance };
    }
    return { target: best?.square ?? raw, raw, adjusted: !!best && best.square !== raw };
  }, [legalMovesFor, myColor, orientation, squareSize]);

  const onDrop = useCallback((id: string, centerX: number, centerY: number) => {
    const runtime = runtimeRef.current.get(id);
    if (!runtime?.alive) return;
    const current = interactionStateRef.current;
    const resolved = resolveDropTarget(runtime.square, centerX, centerY);
    chessDiagnostics.mark({
      gameId: current.gameId,
      stage: resolved.adjusted ? "drop_target_adjusted" : "drop_target",
      from: runtime.square,
      to: resolved.target ?? resolved.raw ?? undefined,
      version: current.revision,
      detail: resolved.adjusted ? `raw=${resolved.raw ?? "outside"}` : resolved.raw ? "exact" : "outside",
    });
    if (!resolved.target) { clearSelection(); snapPieceBack(id, runtime.square); return; }
    if (current.turn === myColor) void attemptRef.current(runtime.square, resolved.target, undefined, "drag");
    else void queuePremove(runtime.square, resolved.target, undefined, "drag");
  }, [clearSelection, myColor, queuePremove, resolveDropTarget, snapPieceBack]);

  const processDelta = useCallback(async (delta: ChessMoveDelta) => {
    chessDiagnostics.mark({ gameId: delta.gameId, stage: "board_delta_start", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });
    const pending = pendingRef.current;
    if (pending && delta.clientMoveId === pending.clientMoveId) {
      await pending.visual;
      visual.setLastMove(delta.move.from, delta.move.to);
      visual.setCheckSquare(delta.checkSquare);
      interactionStateRef.current = applyChessMoveDelta(interactionStateRef.current, delta);
      onVisualTurnChange?.(interactionStateRef.current.turn, interactionStateRef.current.status);
      pendingRef.current = null;
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "authoritative_commit", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: "LOCAL_CONFIRM" });
      // Once our move is authoritative, the opponent turn is still touchable
      // so the player can queue exactly one premove.
      boardLocked.value = delta.status === "active" ? 0 : 1;
      onVisualRevisionChange?.(delta.version);
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "visual_settle", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });
      return;
    }

    boardLocked.value = 1;
    setMotion(true);
    await animateMove(delta.move, OPPONENT_MOVE_MS);
    applyRuntimeMove(delta.move);
    interactionStateRef.current = applyChessMoveDelta(interactionStateRef.current, delta);
    onVisualTurnChange?.(interactionStateRef.current.turn, interactionStateRef.current.status);
    chessDiagnostics.mark({ gameId: delta.gameId, stage: "authoritative_commit", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: "REMOTE_APPLY" });
    clearSelection();
    visual.setLastMove(delta.move.from, delta.move.to);
    visual.setCheckSquare(delta.checkSquare);
    setMotion(false);
    onVisualRevisionChange?.(delta.version);
    chessDiagnostics.mark({ gameId: delta.gameId, stage: "visual_settle", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });

    const queued = premoveRef.current;
    if (delta.status === "active" && delta.turn === myColor && queued) {
      // The premove only becomes a real command AFTER the opponent move is
      // visually committed. Revalidate on the new authoritative FEN/version,
      // then animate+emit just like a normal local move.
      boardLocked.value = 1;
      premoveRef.current = null;
      visual.setPremove(null, null);
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "premove_fire", from: queued.from, to: queued.to, version: delta.version });
      requestAnimationFrame(() => void attemptRef.current(queued.from, queued.to, queued.promotion, "premove"));
    } else {
      if (delta.status !== "active") clearPremove("game-not-active");
      boardLocked.value = delta.status === "active" ? 0 : 1;
    }
  }, [animateMove, applyRuntimeMove, boardLocked, clearPremove, clearSelection, myColor, onVisualRevisionChange, onVisualTurnChange, setMotion, visual]);

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
    boardLocked.value = canTouchBoard(stateRef.current) ? 0 : 1;
  }, [boardLocked, myColor, orientation, squareSize]);

  useLayoutEffect(() => {
    const visible = interactionStateRef.current;
    if (state.gameId === visible.gameId && state.revision > visible.revision) {
      // Network truth has advanced but the user is still looking at the prior
      // visual position. Block new gestures until the queued animation commits.
      boardLocked.value = 1;
    }
  }, [boardLocked, state.gameId, state.revision]);

  useEffect(() => {
    // Opponent turn remains interactive for one local premove. Only terminal /
    // paused states hard-lock the board. Visual turn changes are committed by
    // processDelta/rebuildFromSnapshot, not by network state racing ahead.
    if (state.status !== "active") {
      boardLocked.value = 1;
      clearSelection();
      clearPremove("status-lock");
    }
  }, [boardLocked, clearPremove, clearSelection, state.status]);

  useEffect(() => {
    onVisualTurnChange?.(interactionStateRef.current.turn, interactionStateRef.current.status);
  }, [onVisualTurnChange, state.gameId]);

  useEffect(() => () => { onMotionChange?.(false); }, [onMotionChange]);

  return (
    <GestureHandlerRootView style={[styles.board, { width:boardSize,height:boardSize }]}>
      <SquareLayer squareSize={squareSize} boardSize={boardSize} orientation={orientation}/>
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
          selectedSquareIndex={visual.selectedSquareIndex}
          hintRevealProgress={visual.hintRevealProgress}
          hintMode={visual.hintMode}
        />
        <InteractionLayer squareSize={squareSize} orientation={orientation} onPressSquare={onPressSquare}/>
        <PieceLayer key={`piece-layer-${pieceGeneration}`} pieces={pieces} squareSize={squareSize} orientation={orientation} myColor={myColor} boardLocked={boardLocked} register={register} onTapPiece={onTapPiece} onDragStart={onDragStart} onDragCancel={onDragCancel} onDrop={onDrop}/>
      </Animated.View>
    </GestureHandlerRootView>
  );
});

const styles=StyleSheet.create({board:{alignSelf:"center",borderRadius:18,overflow:"hidden",backgroundColor:"#C98BA7",borderWidth:1,borderColor:"#E6B3C7",elevation:3,shadowColor:"#8E4D68",shadowOpacity:.16,shadowRadius:8,shadowOffset:{width:0,height:3}}});
