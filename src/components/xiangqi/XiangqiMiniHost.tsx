import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useAuth } from "../../context/AuthContext";
import {
  getCachedXiangqiBootstrapState,
  getXiangqiMiniPosition,
  setXiangqiMiniPosition,
  showXiangqiSurfaceFull,
  useXiangqiSurfaceState,
} from "../../services/xiangqi/xiangqiSurfaceStore";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import type { XiangqiMoveDelta, XiangqiRealtimeState } from "../../types/xiangqiRealtime";
import { XiangqiPiece } from "./XiangqiPiece";

const MINI_WIDTH = 92;
const MINI_HEIGHT = 42;
const MINI_EDGE = 7;
const MINI_BOTTOM_TRACK = 58;

function formatClock(ms: number | null) {
  if (ms == null) return "∞";
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Lightweight active Xiangqi projection.
 *
 * The full Xiangqi board belongs to the Xiangqi route. This root mini listens
 * only to Xiangqi transport/state and cannot create, revive, or lock a session.
 */
export const XiangqiMiniHost = React.memo(function XiangqiMiniHost() {
  const router = useRouter();
  const { user } = useAuth();
  const surface = useXiangqiSurfaceState();
  const gameId = surface.gameId;
  const [snapshot, setSnapshot] = useState<XiangqiRealtimeState | null>(() => getCachedXiangqiBootstrapState(gameId));
  const [clockTick, setClockTick] = useState(0);
  const receivedAtRef = useRef(Date.now());
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    setSnapshot(getCachedXiangqiBootstrapState(gameId));
    receivedAtRef.current = Date.now();
  }, [gameId]);

  useEffect(() => {
    const offState = xiangqiSocketService.onState((next) => {
      if (!gameId || next.gameId !== gameId) return;
      receivedAtRef.current = Date.now();
      setSnapshot(next.status === "finished" || next.status === "cancelled" ? null : next);
    });
    const offMove = xiangqiSocketService.onMove((delta: XiangqiMoveDelta) => {
      if (!gameId || delta.gameId !== gameId) return;
      receivedAtRef.current = Date.now();
      setSnapshot((current) => {
        if (!current || current.gameId !== delta.gameId) return current;
        if (delta.status === "finished") return null;
        return {
          ...current,
          board: delta.board,
          revision: delta.version,
          redRemainingMs: delta.redRemainingMs,
          blackRemainingMs: delta.blackRemainingMs,
          status: delta.status,
          result: delta.result,
          finishReason: delta.finishReason,
          serverNowMs: delta.serverNowMs,
          endedAt: delta.endedAt,
        };
      });
    });
    return () => { offState(); offMove(); };
  }, [gameId]);

  const mySide: "red" | "black" = snapshot?.blackUid === user?.uid ? "black" : "red";
  const myTurn = snapshot?.status === "active" && snapshot.board.turn === mySide;
  const visible = !!gameId && surface.mode === "mini" && !!snapshot && (snapshot.status === "active" || snapshot.status === "paused" || snapshot.status === "waiting");
  const baseClock = snapshot ? (mySide === "red" ? snapshot.redRemainingMs : snapshot.blackRemainingMs) : null;
  const running = visible && myTurn && snapshot?.timeControl.kind === "clocked";

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setClockTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  void clockTick;
  const remaining = baseClock == null
    ? null
    : Math.max(0, baseClock - (running ? Date.now() - receivedAtRef.current : 0));
  const clock = formatClock(remaining);

  const saved = getXiangqiMiniPosition();
  const maxX = Math.max(MINI_EDGE, width - MINI_WIDTH - MINI_EDGE);
  const minY = Math.max(MINI_EDGE, insets.top + 6);
  const maxY = Math.max(minY, height - insets.bottom - MINI_BOTTOM_TRACK - MINI_HEIGHT - 8);
  const clampX = useCallback((value: number) => Math.max(MINI_EDGE, Math.min(maxX, value)), [maxX]);
  const clampY = useCallback((value: number) => Math.max(minY, Math.min(maxY, value)), [maxY, minY]);
  const x = useSharedValue(clampX(saved?.x ?? maxX));
  const y = useSharedValue(clampY(saved?.y ?? Math.round(height * 0.49)));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const progress = useSharedValue(visible ? 1 : 0);
  const attention = useSharedValue(myTurn ? 1 : 0.78);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: visible ? 92 : 55 });
  }, [progress, visible]);
  useEffect(() => {
    attention.value = withTiming(myTurn ? 1 : 0.78, { duration: 100 });
  }, [attention, myTurn]);
  useEffect(() => {
    const nextX = clampX(x.value);
    const nextY = clampY(y.value);
    x.value = withTiming(nextX, { duration: 80 });
    y.value = withTiming(nextY, { duration: 80 });
    setXiangqiMiniPosition({ x: nextX, y: nextY });
  }, [clampX, clampY, height, insets.bottom, insets.top, maxX, maxY, minY, width, x, y]);

  const openFull = useCallback(() => {
    if (!gameId) return;
    showXiangqiSurfaceFull(gameId);
    router.navigate("/(xiangqi)/xiangqi-preview" as never);
  }, [gameId, router]);

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
        runOnJS(setXiangqiMiniPosition)({ x: targetX, y: targetY });
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

  if (!snapshot) return null;
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View pointerEvents={visible ? "auto" : "none"} style={[styles.shell, animatedStyle]}>
        <View accessibilityRole="button" accessibilityLabel="Mở lại bàn Cờ tướng" style={styles.card}>
          <View style={styles.icon}>
            <XiangqiPiece color={mySide} type="general" size={28} />
          </View>
          <Text style={styles.clock}>{clock}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  shell: {
    position: "absolute",
    left: 0,
    top: 0,
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    zIndex: 11000,
    elevation: 18,
  },
  card: {
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    borderRadius: 14,
    backgroundColor: "#8E3F38",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    gap: 5,
    shadowColor: "#5E2A25",
    shadowOpacity: 0.2,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  icon: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  clock: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.25,
  },
});
