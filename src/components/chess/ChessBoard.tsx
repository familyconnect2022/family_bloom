import { Chess, type PieceSymbol } from "chess.js";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
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
import { HintLayer, type ChessHintController, type ChessHintTarget } from "./v2/HintLayer";
import { InteractionLayer } from "./v2/InteractionLayer";
import { PieceLayer } from "./v2/PieceLayer";
import { SquareLayer } from "./v2/SquareLayer";
import type { ChessPieceController, ChessPieceMotionProfile } from "./v2/ChessPiece";
import { squareToPosition, type BoardOrientation } from "./v2/coordinateMapper";
import { buildPieceDescriptors, runtimeFromDescriptors, type PieceDescriptor, type PieceKey, type PieceRuntime } from "./v2/pieceIdentity";
import { squareToIndex } from "./v2/moveMask";
import { useChessVisualState } from "./v2/useChessVisualState";
import { chessDiagnostics } from "../../services/chess/chessDiagnostics";
import { gameRuntimePerf } from "../../services/games/gameRuntimePerf";

type CapturablePiece = NonNullable<ChessAppliedMove["captured"]>;
function asCapturablePiece(piece: PieceSymbol | undefined): CapturablePiece | undefined {
  if (!piece) return undefined;
  // Legal chess never captures a king; chess.js includes `k` only in the broad PieceSymbol type.
  if (piece === "k") throw new Error("CHESS_INVARIANT_CAPTURED_KING");
  return piece;
}

const MOVE_MS = 132;
const OPPONENT_MOVE_MS = 136;
const PREMOVE_MOVE_MS = 108;
const RECONCILE_MS = 150;
const CHESS_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
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

function squareDistance(a: string, b: string) {
  const ax = a.charCodeAt(0) - 97;
  const ay = Number(a[1]) - 1;
  const bx = b.charCodeAt(0) - 97;
  const by = Number(b[1]) - 1;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

function deriveAppliedMoveFromSnapshot(previous: ChessGameState, next: ChessGameState): ChessAppliedMove | null {
  if (previous.gameId !== next.gameId || next.revision !== previous.revision + 1 || !next.lastMove) return null;
  try {
    const chess = new Chess(previous.fen);
    const moved = chess.move({
      from: next.lastMove.from,
      to: next.lastMove.to,
      ...(next.lastMove.promotion ? { promotion: next.lastMove.promotion } : {}),
    });
    if (!moved || chess.fen().split(" ")[0] !== next.fen.split(" ")[0]) return null;
    const captured = asCapturablePiece(moved.captured);
    return {
      from: moved.from,
      to: moved.to,
      san: moved.san,
      color: moved.color,
      piece: moved.piece,
      flags: moved.flags,
      ...(captured ? { captured } : {}),
      ...(moved.promotion ? { promotion: moved.promotion } : {}),
    };
  } catch {
    return null;
  }
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
  onBoardReady,
  onPremoveQueued,
  onMoveLanded,
  onIllegalMove,
  hintsEnabled = false,
  motionFxEnabled = false,
  interactionBlocked = false,
  runtimeActive = true,
  boardSize,
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
  onBoardReady?: () => void;
  onPremoveQueued?: () => void;
  onMoveLanded?: (delta: ChessMoveDelta) => void;
  onIllegalMove?: () => void;
  hintsEnabled?: boolean;
  motionFxEnabled?: boolean;
  interactionBlocked?: boolean;
  runtimeActive?: boolean;
  boardSize: number;
}) {
  useEffect(() => { gameRuntimePerf.markRender("chess"); });
  useEffect(() => {
    gameRuntimePerf.markMount("chess");
    return () => gameRuntimePerf.markUnmount("chess");
  }, []);
  useEffect(() => { gameRuntimePerf.markRuntime("chess", runtimeActive); }, [runtimeActive]);
  // Geometry is owned by ChessSurfaceHost. Keep the board pixel-stable and
  // never clamp it against window width or a legacy hard cap inside the board.
  const normalizedBoardSize = Math.max(8, Math.floor(boardSize / 8) * 8);
  const squareSize = Math.max(1, Math.floor(normalizedBoardSize / 8));
  const orientation: BoardOrientation = myColor === "w" ? "white" : "black";

  // Keep a fixed 32-slot native piece pool for the lifetime of the board.
  // Game snapshots only reconcile slot state; they never decide how many
  // ChessPiece native nodes exist. This makes prewarm/new-game transitions
  // reuse the same nodes instead of rebuilding the piece layer.
  const initialPieces = useMemo(() => buildPieceDescriptors(CHESS_START_FEN), []);
  const pieces = initialPieces;

  const stateRef = useRef(state);
  const externalBlockedRef = useRef(interactionBlocked);
  const runtimeActiveRef = useRef(runtimeActive);
  const runtimeEpochRef = useRef(0);
  // Interaction truth follows the position that is already visible on screen.
  // Network state may advance before the visual animation queue catches up.
  const interactionStateRef = useRef(state);
  const selectedRef = useRef<string | null>(null);
  const layoutKeyRef = useRef(`${orientation}:${squareSize}`);
  const runtimeRef = useRef<Map<string, PieceRuntime>>(runtimeFromDescriptors(initialPieces));
  const controllersRef = useRef(new Map<string, ChessPieceController>());
  const hintControllerRef = useRef<ChessHintController | null>(null);
  const pendingRef = useRef<PendingLocal | null>(null);
  const premoveRef = useRef<Premove | null>(null);
  const motionRef = useRef(false);
  const lastQueuedVersionRef = useRef(state.revision);
  const lastSnapshotEpochRef = useRef(snapshotEpoch);
  const animationQueueRef = useRef<Promise<void>>(Promise.resolve());
  const attemptRef = useRef<(from:string,to:string,promotion?:ChessPromotionPiece,source?:"tap"|"premove")=>void>(()=>undefined);
  const sessionPrefixRef = useRef(`fbv2-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`);
  const moveCounterRef = useRef(0);
  const layoutReadyRef = useRef(false);
  const assetReadyIdsRef = useRef(new Set<string>());
  const readyReportedRef = useRef(false);
  const readyScheduledRef = useRef(false);

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
  externalBlockedRef.current = interactionBlocked;
  runtimeActiveRef.current = runtimeActive;

  const setMotion = useCallback((moving: boolean) => {
    if (motionRef.current === moving) return;
    motionRef.current = moving;
    onMotionChange?.(moving);
  }, [onMotionChange]);

  const epochIsCurrent = useCallback((epoch: number) => (
    runtimeActiveRef.current && runtimeEpochRef.current === epoch
  ), []);

  const lockValueFor = useCallback((snapshot: ChessGameState) => (
    canTouchBoard(snapshot) && !externalBlockedRef.current ? 0 : 1
  ), []);

  const maybeReportBoardReady = useCallback(() => {
    if (!onBoardReady || !runtimeActiveRef.current || readyReportedRef.current || readyScheduledRef.current) return;
    if (!layoutReadyRef.current) return;
    if (controllersRef.current.size < initialPieces.length) return;
    if (assetReadyIdsRef.current.size < initialPieces.length) return;
    readyScheduledRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      readyScheduledRef.current = false;
      if (!runtimeActiveRef.current || readyReportedRef.current) return;
      if (!layoutReadyRef.current || controllersRef.current.size < initialPieces.length || assetReadyIdsRef.current.size < initialPieces.length) return;
      readyReportedRef.current = true;
      onBoardReady();
    }));
  }, [initialPieces.length, onBoardReady]);

  const register = useCallback((id: string, controller: ChessPieceController | null) => {
    if (controller) controllersRef.current.set(id, controller);
    else controllersRef.current.delete(id);
    maybeReportBoardReady();
  }, [maybeReportBoardReady]);

  const onPieceAssetReady = useCallback((id: string) => {
    assetReadyIdsRef.current.add(id);
    maybeReportBoardReady();
  }, [maybeReportBoardReady]);

  const findPieceAt = useCallback((square: string, color?: ChessColor, type?: string) => {
    for (const [id, piece] of runtimeRef.current) {
      if (!piece.alive || piece.square !== square) continue;
      if (color && piece.pieceKey[0] !== color) continue;
      if (type && piece.pieceKey[1] !== type) continue;
      return { id, piece };
    }
    return null;
  }, []);

  const moveController = useCallback((id: string, square: string, duration: number, profile: ChessPieceMotionProfile = "flat") => new Promise<void>((resolve) => {
    const controller = controllersRef.current.get(id);
    if (!controller) { resolve(); return; }
    const p = squareToPosition(square, squareSize, orientation);
    if (!motionFxEnabled) {
      controller.setPosition(p.x, p.y);
      resolve();
      return;
    }
    controller.moveTo(p.x, p.y, duration, resolve, profile);
  }), [motionFxEnabled, orientation, squareSize]);

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

  const animateMove = useCallback(async (move: ChessAppliedMove, duration: number, profile: ChessPieceMotionProfile = "travel") => {
    const primary = findPieceAt(move.from, move.color, move.piece);
    if (!primary) return;
    const tasks: Promise<void>[] = [moveController(primary.id, move.to, duration, profile)];
    const capturedAt = captureSquare(move);
    if (capturedAt) {
      const captured = findPieceAt(capturedAt, move.color === "w" ? "b" : "w");
      if (captured && captured.id !== primary.id) controllersRef.current.get(captured.id)?.fadeTo(0, motionFxEnabled ? 70 : 0, motionFxEnabled ? 55 : 0);
    }
    const rookMove = castleRook(move);
    if (rookMove) {
      const rook = findPieceAt(rookMove.from, move.color, "r");
      if (rook) tasks.push(moveController(rook.id, rookMove.to, duration, profile));
    }
    await Promise.all(tasks);
  }, [findPieceAt, motionFxEnabled, moveController]);

  const reconcileRuntimeToSnapshot = useCallback(async (snapshot: ChessGameState, forceSnap = false) => {
    const targets = buildPieceDescriptors(snapshot.fen);
    const slots = Array.from(runtimeRef.current.entries());
    const freeIds = new Set(slots.map(([id]) => id));
    const freeTargets = new Set(targets.map((_, index) => index));
    const assignments = new Map<string, PieceDescriptor>();

    const assign = (id: string, targetIndex: number) => {
      assignments.set(id, targets[targetIndex]);
      freeIds.delete(id);
      freeTargets.delete(targetIndex);
    };

    // 1) Preserve pieces already at the authoritative square. This makes the
    // overwhelmingly common reconnect-to-the-same-FEN path literally zero move.
    for (const [id, runtime] of slots) {
      if (!runtime.alive || !freeIds.has(id)) continue;
      const targetIndex = Array.from(freeTargets).find((index) => {
        const target = targets[index];
        return target.square === runtime.square && target.pieceKey === runtime.pieceKey;
      });
      if (targetIndex !== undefined) assign(id, targetIndex);
    }

    // 2) Match same artwork/color by nearest logical square. Piece identity stays
    // native/persistent even when several network revisions were missed.
    for (const targetIndex of Array.from(freeTargets)) {
      const target = targets[targetIndex];
      let best: { id: string; score: number } | null = null;
      for (const id of freeIds) {
        const runtime = runtimeRef.current.get(id)!;
        if (runtime.pieceKey !== target.pieceKey) continue;
        const score = (runtime.alive ? 0 : 20) + squareDistance(runtime.square, target.square);
        if (!best || score < best.score) best = { id, score };
      }
      if (best) assign(best.id, targetIndex);
    }

    // 3) Promotions can change artwork, but a persistent slot NEVER changes
    // color. White and black each own 16 immutable native slots for the whole
    // process. This keeps gesture ownership stable across promotion/resync.
    for (const targetIndex of Array.from(freeTargets)) {
      const target = targets[targetIndex];
      let best: { id: string; score: number } | null = null;
      for (const id of freeIds) {
        const runtime = runtimeRef.current.get(id)!;
        if (runtime.pieceKey[0] !== target.pieceKey[0]) continue;
        const score = (runtime.alive ? 0 : 18) + squareDistance(runtime.square, target.square);
        if (!best || score < best.score) best = { id, score };
      }
      if (best) assign(best.id, targetIndex);
    }

    const tasks: Promise<void>[] = [];
    for (const [id, runtime] of slots) {
      const target = assignments.get(id);
      const controller = controllersRef.current.get(id);
      if (!target) {
        runtime.alive = false;
        if (forceSnap) {
          const point = squareToPosition(runtime.square, squareSize, orientation);
          controller?.sync(runtime.pieceKey, point.x, point.y, false);
        } else {
          controller?.fadeTo(0, motionFxEnabled ? 105 : 0);
        }
        continue;
      }

      if (forceSnap) {
        const point = squareToPosition(target.square, squareSize, orientation);
        controller?.sync(target.pieceKey, point.x, point.y, true);
      } else {
        if (runtime.pieceKey !== target.pieceKey) controller?.setPieceKey(target.pieceKey);
        if (!runtime.alive) controller?.fadeTo(1, motionFxEnabled ? 105 : 0);
        if (runtime.square !== target.square) {
          tasks.push(moveController(id, target.square, motionFxEnabled ? RECONCILE_MS : 0, "reconcile"));
        } else if (!motionFxEnabled) {
          const point = squareToPosition(target.square, squareSize, orientation);
          controller?.setPosition(point.x, point.y);
        }
      }
      runtime.square = target.square;
      runtime.pieceKey = target.pieceKey;
      runtime.alive = true;
    }
    await Promise.all(tasks);
  }, [motionFxEnabled, moveController, orientation, squareSize]);

  const rebuildFromSnapshot = useCallback(async (snapshot: ChessGameState, forceSnap = false) => {
    const epoch = runtimeEpochRef.current;
    if (!epochIsCurrent(epoch)) return;
    boardLocked.value = 1;
    setMotion(true);
    const previous = interactionStateRef.current;

    // If a local optimistic move was already rendered and reconnect confirms the
    // exact move, do not animate it a second time. Just promote it to truth.
    const pending = pendingRef.current;
    if (pending && snapshot.lastMove && snapshot.revision > previous.revision
      && pending.from === snapshot.lastMove.from && pending.to === snapshot.lastMove.to) {
      await pending.visual;
      if (!epochIsCurrent(epoch)) return;
      pendingRef.current = null;
    } else if (forceSnap || !(previous.gameId === snapshot.gameId && previous.fen === snapshot.fen && !pending)) {
      const singleMove = !forceSnap && !pending ? deriveAppliedMoveFromSnapshot(previous, snapshot) : null;
      if (singleMove) {
        await animateMove(singleMove, OPPONENT_MOVE_MS, "travel");
        if (!epochIsCurrent(epoch)) return;
        applyRuntimeMove(singleMove);
      } else {
        // No fade, no PieceLayer remount: reconcile existing native nodes to FEN.
        await reconcileRuntimeToSnapshot(snapshot, forceSnap);
        if (!epochIsCurrent(epoch)) return;
      }
    }

    interactionStateRef.current = snapshot;
    onVisualTurnChange?.(snapshot.turn, snapshot.status);
    lastQueuedVersionRef.current = snapshot.revision;
    selectedRef.current = null;
    visual.clearHints();
    pendingRef.current = null;
    premoveRef.current = null;
    visual.setPremove(null, null);
    visual.setLastMove(snapshot.lastMove?.from, snapshot.lastMove?.to);
    visual.setCheckSquare(snapshot.checkSquare);
    boardOpacity.value = 1;
    boardLocked.value = lockValueFor(snapshot);
    setMotion(false);
    onVisualRevisionChange?.(snapshot.revision);
  }, [animateMove, applyRuntimeMove, boardLocked, boardOpacity, epochIsCurrent, lockValueFor, onVisualRevisionChange, onVisualTurnChange, reconcileRuntimeToSnapshot, setMotion, visual]);

  const legalMovesFor = useCallback((fen: string, from: string, allowPremove: boolean) => {
    try {
      const chess = new Chess(allowPremove ? forcedTurnFen(fen, myColor) : fen);
      return chess.moves({ square: from as never, verbose: true }) as Array<any>;
    } catch { return [] as Array<any>; }
  }, [myColor]);

  const clearSelection = useCallback(() => {
    selectedRef.current = null;
    visual.clearHints();
    hintControllerRef.current?.clear();
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
    if (!runtimeActiveRef.current || externalBlockedRef.current) {
      chessDiagnostics.mark({ gameId: current.gameId, stage: "input_blocked", from: square, version: current.revision, detail: !runtimeActiveRef.current ? "RUNTIME_SLEEP" : "EXTERNAL_BLOCK" });
      return;
    }
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
    if (premoveMode && premoveRef.current) clearPremove("replace-selection");
    selectedRef.current = square;
    visual.selectedSquareIndex.value = squareToIndex(square);
    if (hintsEnabled) {
      const seen = new Set<number>();
      const targets: ChessHintTarget[] = [];
      for (const move of moves) {
        const index = squareToIndex(String(move.to));
        if (index < 0 || seen.has(index)) continue;
        seen.add(index);
        targets.push({ index, capture: !!move.captured || String(move.flags || "").includes("e") });
      }
      hintControllerRef.current?.show(targets, premoveMode, square);
    } else {
      hintControllerRef.current?.clear();
    }
  }, [clearPremove, clearSelection, findPieceAt, hintsEnabled, legalMovesFor, myColor, visual]);

  const queuePremove = useCallback(async (
    from: string,
    to: string,
    promotion: ChessPromotionPiece | undefined,
    source: "tap" = "tap",
  ) => {
    const epoch = runtimeEpochRef.current;
    if (!epochIsCurrent(epoch)) return;
    const current = interactionStateRef.current;
    const movingPiece = findPieceAt(from);
    if (!movingPiece || movingPiece.piece.pieceKey[0] !== myColor || current.status !== "active" || current.turn === myColor || pendingRef.current) {
      const reason = current.turn === myColor ? "TURN_ALREADY_MINE" : pendingRef.current ? "PENDING_MOVE" : !movingPiece ? "NO_PIECE" : current.status !== "active" ? `STATUS_${current.status}` : "WRONG_COLOR";
      chessDiagnostics.mark({ gameId: current.gameId, stage: "premove_blocked", from, to, version: current.revision, detail: reason });
      clearSelection();
      boardLocked.value = lockValueFor(current);
      return;
    }

    // A premove is only an intent cache. For UI guidance we use chess.js with
    // the turn forced locally, but the move is validated again on the NEW
    // authoritative FEN after the opponent actually moves.
    const candidates = legalMovesFor(current.fen, from, true).filter((move) => move.to === to);
    if (!candidates.length) {
      chessDiagnostics.mark({ gameId: current.gameId, stage: "premove_invalid", from, to, version: current.revision, detail: source });
      clearSelection();
      onIllegalMove?.();
      boardLocked.value = externalBlockedRef.current ? 1 : 0;
      return;
    }

    let chosenPromotion = promotion;
    const promotionCandidates = candidates.filter((move) => !!move.promotion);
    if (promotionCandidates.length && !chosenPromotion) {
      chosenPromotion = await onPromotion(from, to) ?? undefined;
      if (!epochIsCurrent(epoch)) return;
      if (!chosenPromotion) {
        clearSelection();
        boardLocked.value = externalBlockedRef.current ? 1 : 0;
        return;
      }
    }

    const replacing = !!premoveRef.current;
    premoveRef.current = { from, to, promotion: chosenPromotion };
    visual.setPremove(from, to);
    onPremoveQueued?.();
    clearSelection();
    chessDiagnostics.mark({
      gameId: current.gameId,
      stage: replacing ? "premove_replace" : "premove_set",
      from,
      to,
      version: current.revision,
      detail: source,
    });

    // Premove is intent-only: the authoritative piece stays on its source
    // square while the lavender from/to overlay shows the queued tap move.
    boardLocked.value = externalBlockedRef.current ? 1 : 0;
  }, [boardLocked, clearSelection, epochIsCurrent, findPieceAt, legalMovesFor, myColor, onPremoveQueued, onPromotion, visual]);

  const executeAttempt = useCallback(async (from: string, to: string, promotion: ChessPromotionPiece | undefined, source: "tap"|"premove" = "tap") => {
    const epoch = runtimeEpochRef.current;
    if (!epochIsCurrent(epoch)) return;
    const current = interactionStateRef.current;
    chessDiagnostics.mark({ gameId: current.gameId, stage: "attempt_start", from, to, version: current.revision, detail: `${source}:visual-v${current.revision}` });
    const movingPiece = findPieceAt(from);
    if (!movingPiece || movingPiece.piece.pieceKey[0] !== myColor || current.status !== "active" || current.turn !== myColor || pendingRef.current) {
      const reason = current.turn !== myColor ? "NOT_MY_TURN" : !movingPiece ? "NO_PIECE" : pendingRef.current ? "PENDING_MOVE" : current.status !== "active" ? `STATUS_${current.status}` : "WRONG_COLOR";
      chessDiagnostics.mark({ gameId: current.gameId, stage: "attempt_blocked", from, to, version: current.revision, detail: reason });
      chessDiagnostics.mark({ gameId: current.gameId, stage: "input_blocked", from, to, version: current.revision, detail: reason });
      if (source === "premove") {
        clearPremove("execute-blocked");
        boardLocked.value = lockValueFor(current);
      }
      return;
    }

    const candidates = legalMovesFor(current.fen, from, false).filter((move) => move.to === to);
    if (!candidates.length) {
      chessDiagnostics.mark({ gameId: current.gameId, stage: source === "premove" ? "premove_revalidate_fail" : "local_validate_illegal", from, to, version: current.revision, detail: source });
      clearSelection();
      clearPremove("revalidate-fail");
      onIllegalMove?.();
      setMotion(false); boardLocked.value = lockValueFor(current);
      return;
    }
    chessDiagnostics.mark({ gameId: current.gameId, stage: source === "premove" ? "premove_revalidate_ok" : "local_validate_ok", from, to, version: current.revision, detail: `${source}:${candidates.length}` });

    let chosenPromotion = promotion;
    const promotionCandidates = candidates.filter((move) => !!move.promotion);
    if (promotionCandidates.length && !chosenPromotion) {
      chosenPromotion = await onPromotion(from, to) ?? undefined;
      if (!epochIsCurrent(epoch)) return;
      if (!chosenPromotion) {
        clearSelection();
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
    const duration = !motionFxEnabled ? 0 : source === "premove" ? PREMOVE_MOVE_MS : MOVE_MS;
    const profile: ChessPieceMotionProfile = "travel";
    const visualPromise = animateMove(applied, duration, profile).then(() => {
      if (!epochIsCurrent(epoch)) return;
      if (pendingRef.current?.clientMoveId === clientMoveId) applyRuntimeMove(applied);
      chessDiagnostics.mark({ gameId: current.gameId, stage: "optimistic_settle", clientMoveId, from, to, version: current.revision });
      setMotion(false);
    });
    pendingRef.current = { clientMoveId, from, to, promotion: chosenPromotion, visual: visualPromise };

    void onMove(from, to, chosenPromotion, clientMoveId, current.revision).then(async (ack) => {
      if (!epochIsCurrent(epoch)) return;
      chessDiagnostics.mark({ gameId: current.gameId, stage: ack.ok ? "socket_ack_ok" : "socket_ack_fail", clientMoveId, from, to, version: ack.ok ? ack.data.version : current.revision, detail: ack.ok ? undefined : ack.errorCode });
      if (!ack.ok) {
        if (pendingRef.current?.clientMoveId !== clientMoveId) return;
        pendingRef.current = null;
        const snapshot = await onResync();
        if (snapshot) await rebuildFromSnapshot(snapshot);
        else { boardLocked.value = lockValueFor(current); setMotion(false); }
        return;
      }
      setTimeout(() => {
        if (!epochIsCurrent(epoch)) return;
        if (pendingRef.current?.clientMoveId === clientMoveId && stateRef.current.revision < ack.data.version) void onResync().then((snapshot) => {
          if (snapshot && epochIsCurrent(epoch)) return rebuildFromSnapshot(snapshot);
          return undefined;
        });
      }, 700);
    });
  }, [animateMove, applyRuntimeMove, boardLocked, clearPremove, clearSelection, epochIsCurrent, findPieceAt, legalMovesFor, motionFxEnabled, myColor, onIllegalMove, onMove, onPromotion, onResync, rebuildFromSnapshot, setMotion, visual]);
  attemptRef.current = executeAttempt;

  const onPressSquare = useCallback((square: string) => {
    if (!runtimeActiveRef.current) return;
    const visible = interactionStateRef.current;
    const networkAhead = stateRef.current.gameId === visible.gameId && stateRef.current.revision > visible.revision;
    // Opponent motion is a valid premove window. Do not drop taps just because
    // the authoritative packet is one visual revision ahead or a remote piece
    // is still settling. Local pending moves remain locked.
    const premoveWindow = visible.status === "active" && visible.turn !== myColor && !pendingRef.current;
    const lockReason = pendingRef.current
      ? "PENDING_LOCK"
      : !premoveWindow && networkAhead
        ? "VISUAL_CATCHUP_LOCK"
        : !premoveWindow && motionRef.current
          ? "MOTION_LOCK"
          : undefined;
    chessDiagnostics.mark({ gameId: visible.gameId, stage: "square_hit", to: square, version: visible.revision, detail: lockReason });
    if (lockReason) {
      chessDiagnostics.mark({ gameId: visible.gameId, stage: "input_blocked", to: square, version: visible.revision, detail: lockReason });
      return;
    }
    const selectedNow = selectedRef.current;
    if (selectedNow) {
      const tappedPiece = findPieceAt(square);
      if (tappedPiece?.piece.pieceKey[0] === myColor && square !== selectedNow) {
        selectSquare(square);
        return;
      }
      if (visible.turn === myColor) void attemptRef.current(selectedNow, square, undefined, "tap");
      else void queuePremove(selectedNow, square, undefined, "tap");
      return;
    }
    if (premoveRef.current && (square === premoveRef.current.from || square === premoveRef.current.to)) {
      clearPremove("tap-highlight");
      return;
    }
    selectSquare(square);
  }, [clearPremove, findPieceAt, myColor, queuePremove, selectSquare]);

  const processDelta = useCallback(async (delta: ChessMoveDelta) => {
    const epoch = runtimeEpochRef.current;
    if (!epochIsCurrent(epoch)) return;
    chessDiagnostics.mark({ gameId: delta.gameId, stage: "board_delta_start", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });
    const pending = pendingRef.current;
    if (pending && delta.clientMoveId === pending.clientMoveId) {
      await pending.visual;
      if (!epochIsCurrent(epoch)) return;
      onMoveLanded?.(delta);
      visual.setLastMove(delta.move.from, delta.move.to);
      visual.setCheckSquare(delta.checkSquare);
      const previousVisualState = interactionStateRef.current;
      interactionStateRef.current = applyChessMoveDelta(previousVisualState, delta);
      onVisualTurnChange?.(interactionStateRef.current.turn, interactionStateRef.current.status);
      pendingRef.current = null;
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "authoritative_commit", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: "LOCAL_CONFIRM" });
      // Once our move is authoritative, the opponent turn is still touchable
      // so the player can queue exactly one premove.
      boardLocked.value = delta.status === "active" && !externalBlockedRef.current ? 0 : 1;
      onVisualRevisionChange?.(delta.version);
      chessDiagnostics.mark({ gameId: delta.gameId, stage: "visual_settle", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version });
      return;
    }

    // Keep taps alive while the opponent piece is travelling: this is the
    // natural premove window. Server state still remains authoritative.
    boardLocked.value = externalBlockedRef.current ? 1 : 0;
    setMotion(true);
    await animateMove(delta.move, OPPONENT_MOVE_MS, "travel");
    if (!epochIsCurrent(epoch)) return;
    onMoveLanded?.(delta);
    applyRuntimeMove(delta.move);
    const previousVisualState = interactionStateRef.current;
    interactionStateRef.current = applyChessMoveDelta(previousVisualState, delta);
    onVisualTurnChange?.(interactionStateRef.current.turn, interactionStateRef.current.status);
    chessDiagnostics.mark({ gameId: delta.gameId, stage: "authoritative_commit", clientMoveId: delta.clientMoveId, from: delta.move.from, to: delta.move.to, version: delta.version, detail: "REMOTE_APPLY" });
    const selectedDuringOpponentMotion = selectedRef.current;
    visual.setLastMove(delta.move.from, delta.move.to);
    visual.setCheckSquare(delta.checkSquare);
    setMotion(false);
    if (selectedDuringOpponentMotion && !premoveRef.current) {
      const selectedPiece = findPieceAt(selectedDuringOpponentMotion);
      if (selectedPiece?.piece.pieceKey[0] === myColor) selectSquare(selectedDuringOpponentMotion);
      else clearSelection();
    }
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
      boardLocked.value = delta.status === "active" && !externalBlockedRef.current ? 0 : 1;
    }
  }, [animateMove, applyRuntimeMove, boardLocked, clearPremove, clearSelection, epochIsCurrent, findPieceAt, myColor, onMoveLanded, onVisualRevisionChange, onVisualTurnChange, selectSquare, setMotion, visual]);

  useEffect(() => {
    if (!runtimeActive) return;
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
  }, [moveDeltas, onResync, processDelta, rebuildFromSnapshot, runtimeActive, snapshotEpoch, state.gameId, state.revision]);

  useEffect(() => {
    if (!runtimeActive) return;
    if (lastSnapshotEpochRef.current === snapshotEpoch) return;
    lastSnapshotEpochRef.current = snapshotEpoch;
    animationQueueRef.current = animationQueueRef.current.then(() => rebuildFromSnapshot(state));
  }, [rebuildFromSnapshot, runtimeActive, snapshotEpoch, state]);

  useEffect(() => {
    // Phase 16B14: the route may stay mounted in Expo Router after navigation.
    // Runtime work therefore follows focus, not mount lifetime. Every blur bumps
    // the epoch so stale Promise chains become inert, resolves any in-flight
    // piece motion, clears gestures/hints and snaps native nodes to logical slots.
    runtimeEpochRef.current += 1;
    const epoch = runtimeEpochRef.current;
    animationQueueRef.current = Promise.resolve();
    boardLocked.value = 1;
    clearSelection();
    clearPremove(runtimeActive ? "focus-resume" : "focus-suspend");
    pendingRef.current = null;
    setMotion(false);

    if (!runtimeActive) {
      // Persistent-surface invariant: hiding/minimizing the board must be O(1).
      // Do not walk/sync all 32 native piece controllers here. The frozen board
      // remains exactly where it was; the next FULL resume performs one hidden
      // authoritative snap before interaction is re-enabled.
      return;
    }

    // Focus resume uses the latest authoritative snapshot but never remounts the
    // PieceLayer. A force-snap removes half-finished move transforms left by
    // the previous screen without showing a reconnect flash.
    void rebuildFromSnapshot(stateRef.current, true).then(() => {
      if (!epochIsCurrent(epoch)) return;
      boardLocked.value = lockValueFor(interactionStateRef.current);
      maybeReportBoardReady();
    });
  }, [boardLocked, clearPremove, clearSelection, epochIsCurrent, lockValueFor, maybeReportBoardReady, orientation, rebuildFromSnapshot, runtimeActive, setMotion, squareSize]);

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
    boardLocked.value = runtimeActiveRef.current ? lockValueFor(stateRef.current) : 1;
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
    if (!runtimeActive) {
      boardLocked.value = 1;
      return;
    }
    if (interactionBlocked) {
      boardLocked.value = 1;
      clearSelection();
      return;
    }
    boardLocked.value = lockValueFor(interactionStateRef.current);
  }, [boardLocked, clearSelection, interactionBlocked, lockValueFor, runtimeActive]);

  useEffect(() => {
    onVisualTurnChange?.(interactionStateRef.current.turn, interactionStateRef.current.status);
  }, [onVisualTurnChange, state.gameId]);

  useEffect(() => {
    if (!hintsEnabled) {
      hintControllerRef.current?.clear();
      return;
    }
    const selected = selectedRef.current;
    if (!selected) return;
    const current = interactionStateRef.current;
    const premoveMode = current.status === "active" && current.turn !== myColor;
    const moves = legalMovesFor(current.fen, selected, premoveMode);
    const seen = new Set<number>();
    const targets: ChessHintTarget[] = [];
    for (const move of moves) {
      const index = squareToIndex(String(move.to));
      if (index < 0 || seen.has(index)) continue;
      seen.add(index);
      targets.push({ index, capture: !!move.captured || String(move.flags || "").includes("e") });
    }
    hintControllerRef.current?.show(targets, premoveMode, selected);
  }, [hintsEnabled, legalMovesFor, myColor]);

  useEffect(() => () => {
    runtimeActiveRef.current = false;
    runtimeEpochRef.current += 1;
    animationQueueRef.current = Promise.resolve();
    boardLocked.value = 1;
    onMotionChange?.(false);
  }, [boardLocked, onMotionChange]);

  return (
    <View
      style={[styles.boardShell, { width: normalizedBoardSize, height: normalizedBoardSize }]}
      onLayout={() => {
        layoutReadyRef.current = true;
        maybeReportBoardReady();
      }}
    >
      <InteractionLayer
        squareSize={squareSize}
        orientation={orientation}
        onPressSquare={onPressSquare}
        enabled={runtimeActive && !interactionBlocked}
      >
        <View collapsable={false} style={styles.boardClip}>
          <SquareLayer squareSize={squareSize} boardSize={normalizedBoardSize} orientation={orientation}/>
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
            {hintsEnabled ? (
              <HintLayer
                ref={hintControllerRef}
                squareSize={squareSize}
                orientation={orientation}
              />
            ) : null}
            <PieceLayer
              pieces={pieces}
              squareSize={squareSize}
              orientation={orientation}
              motionFxEnabled={motionFxEnabled}
              register={register}
              onAssetReady={onPieceAssetReady}
            />
          </Animated.View>
        </View>
      </InteractionLayer>
      <View pointerEvents="none" style={styles.boardBorder}/>
    </View>
  );
});

const styles=StyleSheet.create({
  boardShell:{alignSelf:"center",borderRadius:22,overflow:"hidden",backgroundColor:"#C98BA7"},
  boardClip:{...StyleSheet.absoluteFillObject,borderRadius:22,overflow:"hidden",backgroundColor:"#C98BA7"},
  boardBorder:{...StyleSheet.absoluteFillObject,borderRadius:22,borderWidth:1,borderColor:"#E6B3C7"},
});
