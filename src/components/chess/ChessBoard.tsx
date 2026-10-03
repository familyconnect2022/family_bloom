import { Image } from "expo-image";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { CHESS_PIECE_THEME_SOURCES, DEFAULT_CHESS_PIECE_THEME } from "../../constants/chessThemes";
import type { ChessColor, ChessGameState, ChessPieceThemeId } from "../../types/chess";

const BOARD_FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const BOARD_RANKS = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const MOVE_ANIMATION_MS = 145;
const ROLLBACK_ANIMATION_MS = 110;

type VisualMove = {
  from: string;
  to: string;
  piece: string;
  baseRevision: number;
  optimistic: boolean;
  animationFinished: boolean;
  serverConfirmed: boolean;
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

export function ChessBoard({
  state,
  myColor,
  onMove,
  onPromotion,
  pieceTheme = DEFAULT_CHESS_PIECE_THEME,
}: {
  state: ChessGameState;
  myColor: ChessColor;
  onMove: (from: string, to: string) => Promise<boolean>;
  onPromotion: (from: string, to: string) => void;
  pieceTheme?: ChessPieceThemeId;
}) {
  const { width } = useWindowDimensions();
  const size = Math.min(width - 28, 430);
  const cell = Math.floor(size / 8);
  const boardSize = cell * 8;
  const ranks = myColor === "w" ? [...BOARD_RANKS].reverse() : [...BOARD_RANKS];
  const files = myColor === "w" ? [...BOARD_FILES] : [...BOARD_FILES].reverse();
  const pieceImages = CHESS_PIECE_THEME_SOURCES[pieceTheme] ?? CHESS_PIECE_THEME_SOURCES[DEFAULT_CHESS_PIECE_THEME];

  const [selected, setSelected] = useState<string | null>(null);
  const [displayFen, setDisplayFen] = useState(state.fen);
  const [visualMove, setVisualMove] = useState<VisualMove | null>(null);
  const visualMoveRef = useRef<VisualMove | null>(null);
  const previousStateRef = useRef(state);
  const latestStateRef = useRef(state);
  const progress = useRef(new Animated.Value(0)).current;

  visualMoveRef.current = visualMove;
  latestStateRef.current = state;

  const board = useMemo(() => parseFen(displayFen), [displayFen]);
  const authoritativeBoard = useMemo(() => parseFen(state.fen), [state.fen]);
  const legal = selected ? state.legalMoves.filter((move) => move.from === selected) : [];

  const squarePoint = (square: string) => {
    const fileIndex = files.indexOf(square[0] as (typeof BOARD_FILES)[number]);
    const rankIndex = ranks.indexOf(Number(square[1]) as (typeof BOARD_RANKS)[number]);
    return { x: fileIndex * cell, y: rankIndex * cell };
  };

  const startSlide = (nextMove: VisualMove, onFinished?: () => void) => {
    progress.stopAnimation();
    progress.setValue(0);
    visualMoveRef.current = nextMove;
    setVisualMove(nextMove);
    Animated.timing(progress, {
      toValue: 1,
      duration: MOVE_ANIMATION_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      setVisualMove((current) => {
        if (!current || current.from !== nextMove.from || current.to !== nextMove.to) return current;
        const updated = { ...current, animationFinished: true };
        if (updated.serverConfirmed) {
          setDisplayFen(latestStateRef.current.fen);
          progress.setValue(0);
          return null;
        }
        return updated;
      });
      onFinished?.();
    });
  };

  const rollbackVisualMove = (move: VisualMove) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: ROLLBACK_ANIMATION_MS,
      useNativeDriver: true,
    }).start(() => {
      setVisualMove(null);
      setDisplayFen(state.fen);
      progress.setValue(0);
    });
  };

  useEffect(() => {
    const previous = previousStateRef.current;
    previousStateRef.current = state;
    if (state.revision === previous.revision && state.fen === previous.fen) return;

    const pending = visualMoveRef.current;
    if (pending?.optimistic && state.revision > pending.baseRevision) {
      const confirmed = { ...pending, serverConfirmed: true };
      setVisualMove(confirmed);
      if (confirmed.animationFinished) {
        setDisplayFen(state.fen);
        setVisualMove(null);
        progress.setValue(0);
      }
      return;
    }

    if (!pending && state.lastMove && state.fen !== displayFen) {
      const oldBoard = parseFen(displayFen);
      const piece = oldBoard.get(state.lastMove.from);
      if (piece) {
        startSlide(
          {
            from: state.lastMove.from,
            to: state.lastMove.to,
            piece,
            baseRevision: previous.revision,
            optimistic: false,
            animationFinished: false,
            serverConfirmed: true,
          },
          () => setDisplayFen(state.fen),
        );
        return;
      }
    }

    if (!pending) setDisplayFen(state.fen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.revision, state.fen]);

  const submitNormalMove = async (from: string, to: string) => {
    if (visualMoveRef.current) return;
    const piece = authoritativeBoard.get(from);
    if (!piece) return;
    const nextMove: VisualMove = {
      from,
      to,
      piece,
      baseRevision: state.revision,
      optimistic: true,
      animationFinished: false,
      serverConfirmed: false,
    };
    startSlide(nextMove);
    const accepted = await onMove(from, to);
    const latest = visualMoveRef.current;
    if (!latest || latest.from !== from || latest.to !== to) return;
    if (!accepted) {
      rollbackVisualMove(latest);
      return;
    }
    setVisualMove((current) => (current ? { ...current, serverConfirmed: true } : current));
  };

  const tap = (square: string) => {
    if (visualMoveRef.current) return;
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
              const lastMove = !!state.lastMove && (state.lastMove.from === square || state.lastMove.to === square);
              const check = state.checkSquare === square;
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
                    <Image source={pieceImages[piece]} style={{ width: cell * 0.8, height: cell * 0.8 }} contentFit="contain" />
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
            <Image source={pieceImages[visualMove.piece]} style={{ width: cell * 0.8, height: cell * 0.8 }} contentFit="contain" />
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
