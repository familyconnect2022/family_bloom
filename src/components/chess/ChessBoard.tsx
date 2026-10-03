import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import type { ChessColor, ChessGameState } from "../../types/chess";

const PIECE_IMAGES: Record<string, number> = {
  wp: require("../../../assets/images/chess/pieces-webp-default/wp.webp"),
  wn: require("../../../assets/images/chess/pieces-webp-default/wn.webp"),
  wb: require("../../../assets/images/chess/pieces-webp-default/wb.webp"),
  wr: require("../../../assets/images/chess/pieces-webp-default/wr.webp"),
  wq: require("../../../assets/images/chess/pieces-webp-default/wq.webp"),
  wk: require("../../../assets/images/chess/pieces-webp-default/wk.webp"),
  bp: require("../../../assets/images/chess/pieces-webp-default/bp.webp"),
  bn: require("../../../assets/images/chess/pieces-webp-default/bn.webp"),
  bb: require("../../../assets/images/chess/pieces-webp-default/bb.webp"),
  br: require("../../../assets/images/chess/pieces-webp-default/br.webp"),
  bq: require("../../../assets/images/chess/pieces-webp-default/bq.webp"),
  bk: require("../../../assets/images/chess/pieces-webp-default/bk.webp"),
};

const BOARD_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const BOARD_RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const MOVE_ANIMATION_MS = 145;
const ROLLBACK_ANIMATION_MS = 110;

type VisualMove = {
  id: number;
  from: string;
  to: string;
  piece: string;
  baseRevision: number;
  basePly: number;
  optimistic: boolean;
  animationFinished: boolean;
  confirmedState: ChessGameState | null;
};

function parseFen(fen: string) {
  const out = new Map<string, string>();
  const ranks = fen.split(" ")[0].split("/");
  ranks.forEach((row, rowIndex) => {
    let file = 0;
    for (const token of row) {
      if (/\d/.test(token)) {
        file += Number(token);
        continue;
      }
      const color = token === token.toUpperCase() ? "w" : "b";
      out.set(`${BOARD_FILES[file]}${8 - rowIndex}`, `${color}${token.toLowerCase()}`);
      file += 1;
    }
  });
  return out;
}

function isLightSquare(square: string) {
  const file = BOARD_FILES.indexOf(square[0] as (typeof BOARD_FILES)[number]);
  const rank = Number(square[1]);
  return (file + rank) % 2 === 1;
}

function moveMatchesState(move: VisualMove, next: ChessGameState) {
  const lastMove = next.lastMove;
  return (
    next.revision > move.baseRevision
    && next.ply > move.basePly
    && !!lastMove
    && lastMove.from === move.from
    && lastMove.to === move.to
  );
}

export function ChessBoard({
  state,
  myColor,
  onMove,
  onPromotion,
}: {
  state: ChessGameState;
  myColor: ChessColor;
  onMove: (from: string, to: string) => Promise<ChessGameState | null>;
  onPromotion: (from: string, to: string) => void;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 28, 430);
  const cell = Math.floor(size / 8);
  const boardSize = cell * 8;
  const ranks = myColor === "w" ? [...BOARD_RANKS].reverse() : [...BOARD_RANKS];
  const files = myColor === "w" ? [...BOARD_FILES] : [...BOARD_FILES].reverse();

  const [selected, setSelected] = useState<string | null>(null);
  const [displayFen, setDisplayFen] = useState(state.fen);
  const [displayMarkers, setDisplayMarkers] = useState(() => ({ lastMove: state.lastMove, checkSquare: state.checkSquare }));
  const [visualMove, setVisualMove] = useState<VisualMove | null>(null);
  const visualMoveRef = useRef<VisualMove | null>(null);
  const latestStateRef = useRef(state);
  const displayFenRef = useRef(state.fen);
  const displayRevisionRef = useRef(state.revision);
  const queuedStateRef = useRef<ChessGameState | null>(null);
  const moveIdRef = useRef(0);
  const mountedRef = useRef(true);
  const progress = useRef(new Animated.Value(0)).current;

  latestStateRef.current = state;

  const board = useMemo(() => parseFen(displayFen), [displayFen]);
  const authoritativeBoard = useMemo(() => parseFen(state.fen), [state.fen]);
  const legal = selected ? state.legalMoves.filter((move) => move.from === selected) : [];

  useEffect(() => () => {
    mountedRef.current = false;
    progress.stopAnimation();
  }, [progress]);

  const squarePoint = (square: string) => {
    const fileIndex = files.indexOf(square[0] as (typeof BOARD_FILES)[number]);
    const rankIndex = ranks.indexOf(Number(square[1]) as (typeof BOARD_RANKS)[number]);
    return { x: fileIndex * cell, y: rankIndex * cell };
  };

  const commitDisplayState = (next: ChessGameState) => {
    if (next.revision < displayRevisionRef.current) return;
    displayRevisionRef.current = next.revision;
    setDisplayMarkers({ lastMove: next.lastMove, checkSquare: next.checkSquare });
    if (displayFenRef.current !== next.fen) {
      displayFenRef.current = next.fen;
      setDisplayFen(next.fen);
    }
  };

  const queueAuthoritativeState = (next: ChessGameState) => {
    if (next.gameId !== latestStateRef.current.gameId) return;
    const queued = queuedStateRef.current;
    if (!queued || next.revision > queued.revision || (next.revision === queued.revision && next.serverNowMs > queued.serverNowMs)) {
      queuedStateRef.current = next;
    }
  };

  function drainAuthoritativeQueue() {
    if (!mountedRef.current || visualMoveRef.current) return;

    const latest = latestStateRef.current;
    const queued = queuedStateRef.current;
    const candidate = !queued || latest.revision > queued.revision ? latest : queued;
    queuedStateRef.current = null;

    if (candidate.gameId !== latest.gameId) return;
    if (candidate.revision < displayRevisionRef.current) return;

    if (candidate.fen === displayFenRef.current) {
      displayRevisionRef.current = Math.max(displayRevisionRef.current, candidate.revision);
      return;
    }

    const lastMove = candidate.lastMove;
    const oldBoard = parseFen(displayFenRef.current);
    const piece = lastMove ? oldBoard.get(lastMove.from) : undefined;
    if (!lastMove || !piece) {
      // A large reconnect jump can legitimately skip more than one ply. In that case a clean
      // authoritative snap is safer than inventing an animation from a square that is no longer valid.
      commitDisplayState(candidate);
      return;
    }

    startSlide({
      id: ++moveIdRef.current,
      from: lastMove.from,
      to: lastMove.to,
      piece,
      baseRevision: displayRevisionRef.current,
      basePly: Math.max(0, candidate.ply - 1),
      optimistic: false,
      animationFinished: false,
      confirmedState: candidate,
    });
  }

  const scheduleQueueDrain = () => {
    requestAnimationFrame(() => {
      if (mountedRef.current) drainAuthoritativeQueue();
    });
  };

  const settleVisualMove = (move: VisualMove, confirmedState: ChessGameState) => {
    const current = visualMoveRef.current;
    if (!current || current.id !== move.id) return;

    // Critical anti-jitter ordering: first put the authoritative destination FEN underneath the
    // overlay, then remove the moving overlay. React batches these updates into the same commit,
    // so there is never a frame where the old source square can flash back on screen.
    commitDisplayState(confirmedState);
    visualMoveRef.current = null;
    setVisualMove(null);
    progress.setValue(0);

    const latest = latestStateRef.current;
    if (latest.revision > confirmedState.revision || latest.fen !== confirmedState.fen) {
      queueAuthoritativeState(latest);
    }
    scheduleQueueDrain();
  };

  const confirmVisualMove = (moveId: number, confirmedState: ChessGameState) => {
    const current = visualMoveRef.current;
    if (!current || current.id !== moveId) return false;
    if (current.optimistic && !moveMatchesState(current, confirmedState)) return false;

    const updated: VisualMove = { ...current, confirmedState };
    visualMoveRef.current = updated;
    setVisualMove(updated);

    if (updated.animationFinished) settleVisualMove(updated, confirmedState);
    return true;
  };

  function startSlide(nextMove: VisualMove) {
    progress.stopAnimation();
    progress.setValue(0);
    visualMoveRef.current = nextMove;
    setVisualMove(nextMove);

    Animated.timing(progress, {
      toValue: 1,
      duration: MOVE_ANIMATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !mountedRef.current) return;
      const current = visualMoveRef.current;
      if (!current || current.id !== nextMove.id) return;

      const updated: VisualMove = { ...current, animationFinished: true };
      visualMoveRef.current = updated;
      setVisualMove(updated);

      if (updated.confirmedState) {
        settleVisualMove(updated, updated.confirmedState);
      }
    });
  }

  const rollbackVisualMove = (move: VisualMove) => {
    const current = visualMoveRef.current;
    if (!current || current.id !== move.id) return;

    Animated.timing(progress, {
      toValue: 0,
      duration: ROLLBACK_ANIMATION_MS,
      useNativeDriver: true,
    }).start(() => {
      if (!mountedRef.current) return;
      const latestMove = visualMoveRef.current;
      if (!latestMove || latestMove.id !== move.id) return;
      visualMoveRef.current = null;
      setVisualMove(null);
      progress.setValue(0);

      const latest = latestStateRef.current;
      if (latest.revision > displayRevisionRef.current || latest.fen !== displayFenRef.current) {
        queueAuthoritativeState(latest);
      }
      scheduleQueueDrain();
    });
  };

  useEffect(() => {
    const pending = visualMoveRef.current;
    if (pending) {
      if (pending.optimistic && moveMatchesState(pending, state)) {
        confirmVisualMove(pending.id, state);
      } else if (state.revision > displayRevisionRef.current || state.fen !== displayFenRef.current) {
        // Do not let a fast bot/opponent state replace the board underneath an active move.
        // Keep only the newest authoritative state and play it after the current overlay settles.
        queueAuthoritativeState(state);
      }
      return;
    }

    if (state.fen === displayFenRef.current) {
      displayRevisionRef.current = Math.max(displayRevisionRef.current, state.revision);
      return;
    }

    queueAuthoritativeState(state);
    drainAuthoritativeQueue();
    // state.revision/fen are the authoritative visual transition key. Clock-only packets do not
    // need to restart board reconciliation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revision, state.fen]);

  const submitNormalMove = async (from: string, to: string) => {
    if (visualMoveRef.current || queuedStateRef.current) return;
    const piece = authoritativeBoard.get(from);
    if (!piece) return;

    const nextMove: VisualMove = {
      id: ++moveIdRef.current,
      from,
      to,
      piece,
      baseRevision: state.revision,
      basePly: state.ply,
      optimistic: true,
      animationFinished: false,
      confirmedState: null,
    };
    startSlide(nextMove);

    const confirmedState = await onMove(from, to);
    const latest = visualMoveRef.current;
    if (!latest || latest.id !== nextMove.id) return;

    if (!confirmedState) {
      rollbackVisualMove(latest);
      return;
    }

    // ACK acceptance alone never removes the overlay. We latch the exact authoritative FEN returned
    // by the server and wait until BOTH that state and the native animation are ready.
    if (!confirmVisualMove(nextMove.id, confirmedState)) {
      if (__DEV__) {
        console.warn("[ChessPerf] visual:ack-move-mismatch", {
          from,
          to,
          baseRevision: nextMove.baseRevision,
          confirmedRevision: confirmedState.revision,
          confirmedLastMove: confirmedState.lastMove,
        });
      }
      rollbackVisualMove(latest);
    }
  };

  const tap = (square: string) => {
    if (visualMoveRef.current || queuedStateRef.current) return;
    const piece = authoritativeBoard.get(square);
    if (selected) {
      const candidates = legal.filter((move) => move.to === square);
      if (candidates.length) {
        const from = selected;
        setSelected(null);
        if (candidates.some((move) => move.promotion)) onPromotion(from, square);
        else void submitNormalMove(from, square);
        return;
      }
    }
    if (piece?.startsWith(myColor) && state.turn === myColor && state.status === "active") {
      setSelected(square);
      return;
    }
    setSelected(null);
  };

  const hiddenSquares = visualMove ? new Set([visualMove.from, visualMove.to]) : null;
  const fromPoint = visualMove ? squarePoint(visualMove.from) : { x: 0, y: 0 };
  const toPoint = visualMove ? squarePoint(visualMove.to) : { x: 0, y: 0 };
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, toPoint.x - fromPoint.x] });
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [0, toPoint.y - fromPoint.y] });

  return (
    <View style={styles.frame}>
      <View style={[styles.board, { width: boardSize, height: boardSize }]}> 
        {ranks.map((rank, rankIndex) => (
          <View key={`rank-${rank}`} style={styles.row}>
            {files.map((file, fileIndex) => {
              const square = `${file}${rank}`;
              const piece = hiddenSquares?.has(square) ? undefined : board.get(square);
              const target = !visualMove && legal.some((move) => move.to === square);
              const lastMove = !!displayMarkers.lastMove && (displayMarkers.lastMove.from === square || displayMarkers.lastMove.to === square);
              const check = displayMarkers.checkSquare === square;
              const light = isLightSquare(square);
              const showRankLabel = fileIndex === 0;
              const showFileLabel = rankIndex === ranks.length - 1;
              return (
                <Pressable
                  key={square}
                  onPress={() => tap(square)}
                  style={[
                    styles.square,
                    { width: cell, height: cell },
                    light ? styles.light : styles.dark,
                    selected === square && styles.selected,
                    lastMove && styles.lastMove,
                    check && styles.check,
                  ]}
                >
                  {showRankLabel ? <Text style={[styles.rankLabel, light ? styles.labelOnLight : styles.labelOnDark]}>{rank}</Text> : null}
                  {showFileLabel ? <Text style={[styles.fileLabel, light ? styles.labelOnLight : styles.labelOnDark]}>{file}</Text> : null}
                  {piece ? (
                    <Image source={PIECE_IMAGES[piece]} style={{ width: cell * 0.8, height: cell * 0.8 }} contentFit="contain" />
                  ) : null}
                  {target ? <View style={styles.targetDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
        {visualMove ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.movingPiece,
              {
                width: cell,
                height: cell,
                transform: [{ translateX: fromPoint.x }, { translateY: fromPoint.y }, { translateX }, { translateY }],
              },
            ]}
          >
            <Image source={PIECE_IMAGES[visualMove.piece]} style={{ width: cell * 0.8, height: cell * 0.8 }} contentFit="contain" />
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignSelf: "center",
    borderRadius: 20,
    padding: 8,
    backgroundColor: "#FFF9FC",
    borderWidth: 1,
    borderColor: "#DFA7BE",
    shadowColor: "#6F2749",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  board: {
    overflow: "hidden",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#C98DA8",
  },
  row: { flexDirection: "row" },
  square: { alignItems: "center", justifyContent: "center" },
  light: { backgroundColor: "#F7EAF1" },
  dark: { backgroundColor: "#C98AA7" },
  selected: { backgroundColor: "#F1C9D8" },
  lastMove: { backgroundColor: "#F6D86C88" },
  check: { backgroundColor: "#F4A2A2" },
  rankLabel: {
    position: "absolute",
    top: 3,
    left: 4,
    fontSize: 9,
    fontWeight: "800",
  },
  fileLabel: {
    position: "absolute",
    right: 4,
    bottom: 3,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "lowercase",
  },
  labelOnLight: { color: "#995073" },
  labelOnDark: { color: "#FFF5FA" },
  targetDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(111,39,73,0.26)",
  },
  movingPiece: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
});
