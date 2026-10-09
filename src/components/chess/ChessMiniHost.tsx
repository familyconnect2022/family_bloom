import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Image, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../../context/AuthContext";
import { getChessGameStoreSnapshot, subscribeChessGameStore } from "../../services/chess/chessGameStore";
import {
  getChessMiniPosition,
  setChessMiniPosition,
  showChessSurfaceFull,
  useChessSurfaceState,
} from "../../services/chess/chessSurfaceStore";
import type { ChessColor } from "../../types/chess";

const MINI_PIECE_IMAGES = {
  wp: require("../../../assets/images/chess/pieces-png-default/wp.png"),
  wn: require("../../../assets/images/chess/pieces-png-default/wn.png"),
  wb: require("../../../assets/images/chess/pieces-png-default/wb.png"),
  wr: require("../../../assets/images/chess/pieces-png-default/wr.png"),
  wq: require("../../../assets/images/chess/pieces-png-default/wq.png"),
  wk: require("../../../assets/images/chess/pieces-png-default/wk.png"),
  bp: require("../../../assets/images/chess/pieces-png-default/bp.png"),
  bn: require("../../../assets/images/chess/pieces-png-default/bn.png"),
  bb: require("../../../assets/images/chess/pieces-png-default/bb.png"),
  br: require("../../../assets/images/chess/pieces-png-default/br.png"),
  bq: require("../../../assets/images/chess/pieces-png-default/bq.png"),
  bk: require("../../../assets/images/chess/pieces-png-default/bk.png"),
} as const;

type MiniPieceKey = keyof typeof MINI_PIECE_IMAGES;

function pieceKeyAtSquare(fen: string, square: string | undefined): MiniPieceKey | null {
  if (!square || square.length !== 2) return null;
  const file = square.charCodeAt(0) - 97;
  const rank = Number(square[1]);
  if (file < 0 || file > 7 || rank < 1 || rank > 8) return null;
  const rows = fen.split(" ")[0]?.split("/");
  const row = rows?.[8 - rank];
  if (!row) return null;
  let column = 0;
  for (const token of row) {
    if (/\d/.test(token)) {
      column += Number(token);
      continue;
    }
    if (column === file) {
      const color = token === token.toUpperCase() ? "w" : "b";
      const type = token.toLowerCase();
      const key = `${color}${type}` as MiniPieceKey;
      return key in MINI_PIECE_IMAGES ? key : null;
    }
    column += 1;
  }
  return null;
}

const MINI_WIDTH = 88;
const MINI_HEIGHT = 40;
const MINI_EDGE = 7;
const MINI_BOTTOM_TRACK = 58;

/**
 * A12: Mini Chess is an independent lightweight sibling of the persistent
 * full-board surface. It owns only the tiny card subscription/clock/gesture;
 * the 32-piece native board does not participate in mini renders.
 */
export const ChessMiniHost = React.memo(function ChessMiniHost() {
  const surface = useChessSurfaceState();
  const { user } = useAuth();
  const gameId = surface.gameId;
  const me = user?.uid || "";
  const visible = surface.presentationReady && !!gameId && surface.mode === "mini";
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const snapshot = useSyncExternalStore(
    useCallback((listener) => subscribeChessGameStore(gameId, listener), [gameId]),
    useCallback(() => getChessGameStoreSnapshot(gameId), [gameId]),
    useCallback(() => getChessGameStoreSnapshot(gameId), [gameId]),
  );
  const state = snapshot.state;
  const [, tick] = useState(0);
  const receivedAt = useRef(Date.now());
  useEffect(() => { receivedAt.current = Date.now(); }, [state?.revision, state?.serverNowMs]);

  const myColor: ChessColor = state?.whiteUid === me ? "w" : "b";
  const myTurn = state?.status === "active" && state.turn === myColor;
  const base = state ? (myColor === "w" ? state.whiteRemainingMs : state.blackRemainingMs) : null;
  const actuallyVisible = !!state && visible && (state.status === "active" || state.status === "paused");
  const running = actuallyVisible && myTurn && state?.timeControl.kind === "clocked";

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const remaining = base == null ? null : Math.max(0, base - (running ? Date.now() - receivedAt.current : 0));
  const clock = remaining == null
    ? "∞"
    : `${Math.floor(remaining / 60000).toString().padStart(2, "0")}:${Math.floor((remaining % 60000) / 1000).toString().padStart(2, "0")}`;
  const pieceKey = state ? (pieceKeyAtSquare(state.fen, state.lastMove?.to) ?? (myColor === "w" ? "wn" : "bn")) : "wn";

  const saved = getChessMiniPosition();
  const maxX = Math.max(MINI_EDGE, width - MINI_WIDTH - MINI_EDGE);
  const minY = Math.max(MINI_EDGE, insets.top + 6);
  const maxY = Math.max(minY, height - insets.bottom - MINI_BOTTOM_TRACK - MINI_HEIGHT - 8);
  const clampX = useCallback((value: number) => Math.max(MINI_EDGE, Math.min(maxX, value)), [maxX]);
  const clampY = useCallback((value: number) => Math.max(minY, Math.min(maxY, value)), [maxY, minY]);
  const x = useSharedValue(clampX(saved?.x ?? maxX));
  const y = useSharedValue(clampY(saved?.y ?? Math.round(height * 0.43)));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const progress = useSharedValue(actuallyVisible ? 1 : 0);
  const attention = useSharedValue(myTurn ? 1 : 0.76);

  useEffect(() => {
    progress.value = withTiming(actuallyVisible ? 1 : 0, { duration: actuallyVisible ? 92 : 55 });
  }, [actuallyVisible, progress]);
  useEffect(() => {
    attention.value = withTiming(myTurn ? 1 : 0.76, { duration: 100 });
  }, [attention, myTurn]);
  useEffect(() => {
    const nextX = clampX(x.value);
    const nextY = clampY(y.value);
    x.value = withTiming(nextX, { duration: 80 });
    y.value = withTiming(nextY, { duration: 80 });
    setChessMiniPosition({ x: nextX, y: nextY });
  }, [clampX, clampY, height, insets.bottom, insets.top, maxX, maxY, minY, width, x, y]);

  const openFull = useCallback(() => {
    if (gameId) showChessSurfaceFull(gameId);
  }, [gameId]);

  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .minDistance(6)
      .onStart(() => { startX.value = x.value; startY.value = y.value; })
      .onUpdate((event) => {
        x.value = Math.max(MINI_EDGE, Math.min(maxX, startX.value + event.translationX));
        y.value = Math.max(minY, Math.min(maxY, startY.value + event.translationY));
      })
      .onEnd(() => {
        const targetX = x.value + MINI_WIDTH / 2 < width / 2 ? MINI_EDGE : maxX;
        const targetY = Math.max(minY, Math.min(maxY, y.value));
        x.value = withTiming(targetX, { duration: 105 });
        y.value = withTiming(targetY, { duration: 80 });
        runOnJS(setChessMiniPosition)({ x: targetX, y: targetY });
      });
    const tap = Gesture.Tap().maxDistance(6).onEnd((_event, success) => {
      if (success) runOnJS(openFull)();
    });
    return Gesture.Race(pan, tap);
  }, [maxX, maxY, minY, openFull, startX, startY, width, x, y]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value * attention.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { scale: Math.max(0.001, progress.value) },
    ],
  }));

  if (!state) return null;
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View pointerEvents={actuallyVisible ? "auto" : "none"} style={[styles.miniCardShell, animatedStyle]}>
        <View accessibilityRole="button" accessibilityLabel="Mở lại bàn cờ" style={styles.miniCard}>
          <View style={styles.miniIcon}>
            <Image source={MINI_PIECE_IMAGES[pieceKey]} resizeMode="contain" style={styles.miniPiece} />
          </View>
          <Text style={styles.miniClock}>{clock}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  miniCardShell: {
    position: "absolute",
    left: 0,
    top: 0,
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    zIndex: 11000,
    elevation: 18,
  },
  miniCard: {
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    borderRadius: 14,
    backgroundColor: "#B53666",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    gap: 5,
    shadowColor: "#7B294A",
    shadowOpacity: 0.20,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  miniIcon: {
    width: 26,
    height: 26,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  miniPiece: { width: 22, height: 22 },
  miniClock: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.25,
  },
});
