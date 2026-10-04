import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import type { ChessColor, ChessGameState } from "../../types/chess";

const AnimatedText = Animated.createAnimatedComponent(Text);
const mono = () => globalThis.performance?.now?.() ?? Date.now();

/**
 * Production clock: only the running side ticks once per second. The active
 * side is rendered as a solid Bloom clock with white numerals so turn focus is
 * visible without labels like "Bạn" / "Đối thủ".
 */
export const ChessClock = React.memo(function ChessClock({
  state,
  color,
  activeSignal,
}: {
  state: ChessGameState;
  color: ChessColor;
  activeSignal?: SharedValue<number>;
}) {
  const received = useRef(mono());
  const [, tick] = useState(0);

  useEffect(() => {
    received.current = mono();
    tick((value) => value + 1);
  }, [state.revision, state.serverNowMs]);

  const clockRunning = state.status === "active" && state.timeControl.kind === "clocked" && state.turn === color;
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

  const focus = useDerivedValue(() => withTiming(activeSignal?.value ?? (state.turn === color && state.status === "active" ? 1 : 0), { duration: 135 }));
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#E7CFD9", "#D84F85"]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ["#FFF9FC", "#D84F85"]),
    transform: [{ scale: 1 + focus.value * 0.025 }],
  }));
  const timeStyle = useAnimatedStyle(() => ({
    color: interpolateColor(focus.value, [0, 1], ["#874C62", "#FFFFFF"]),
  }));

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <AnimatedText style={[styles.time, timeStyle]}>{text}</AnimatedText>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  box: {
    minWidth: 96,
    minHeight: 54,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 21,
    lineHeight: 26,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.15,
  },
});
