import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import type { ChessColor, ChessGameState } from "../../types/chess";

const AnimatedText = Animated.createAnimatedComponent(Text);
const mono = () => globalThis.performance?.now?.() ?? Date.now();

/**
 * Production clock: server time remains authoritative. Only the active clock
 * ticks locally once per second; the active side is deliberately high-contrast
 * so turn ownership is readable without extra copy around the board.
 */
export const ChessClock = React.memo(function ChessClock({
  state,
  color,
  activeSignal,
  runtimeActive = true,
}: {
  state: ChessGameState;
  color: ChessColor;
  activeSignal?: SharedValue<number>;
  runtimeActive?: boolean;
}) {
  const received = useRef(mono());
  const [, tick] = useState(0);

  useEffect(() => {
    received.current = mono();
    tick((value) => value + 1);
  }, [state.revision, state.serverNowMs]);

  const clockRunning = runtimeActive && state.status === "active" && state.timeControl.kind === "clocked" && state.turn === color;
  useEffect(() => {
    if (!clockRunning) return;
    const id = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(id);
  }, [clockRunning]);

  const base = color === "w" ? state.whiteRemainingMs : state.blackRemainingMs;
  const ms = base == null
    ? null
    : !clockRunning
      ? base
      : Math.max(0, base - (mono() - received.current));
  const text = ms == null
    ? "∞"
    : `${Math.floor(ms / 60000).toString().padStart(2, "0")}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}`;

  const focus = useDerivedValue(() => withTiming(
    activeSignal?.value ?? (state.turn === color && state.status === "active" ? 1 : 0),
    { duration: 150 },
  ));
  const boxStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#EAD4DE", "#A92F5D"]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ["#FFF9FC", "#A92F5D"]),
    transform: [{ scale: 1 + focus.value * 0.02 }],
  }));
  const timeStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], ["#6F334A", "#FFFFFF"]),
  }));

  return (
    <Animated.View style={[styles.box, boxStyle]}>
      <AnimatedText style={[styles.time, timeStyle]}>{text}</AnimatedText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  box: {
    minWidth: 72,
    minHeight: 38,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.2,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 16,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
});
