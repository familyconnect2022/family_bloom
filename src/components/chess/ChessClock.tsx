import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import { COLORS } from "../../constants/theme";
import type { ChessColor, ChessGameState } from "../../types/chess";

const mono = () => globalThis.performance?.now?.() ?? Date.now();

export function ChessClock({
  state,
  color,
  label,
  activeSignal,
}: {
  state: ChessGameState;
  color: ChessColor;
  label: string;
  activeSignal?: SharedValue<number>;
}) {
  const received = useRef(mono());
  const [, tick] = useState(0);

  useEffect(() => {
    received.current = mono();
    tick((value) => value + 1);
  }, [state.revision, state.serverNowMs]);

  useEffect(() => {
    if (state.status !== "active" || state.timeControl.kind !== "clocked") return;
    const id = setInterval(() => tick((value) => value + 1), 250);
    return () => clearInterval(id);
  }, [state.status, state.timeControl.kind]);

  const base = color === "w" ? state.whiteRemainingMs : state.blackRemainingMs;
  const ms = base == null
    ? null
    : state.status !== "active" || state.turn !== color
      ? base
      : Math.max(0, base - (mono() - received.current));
  const text = ms == null
    ? "∞"
    : `${Math.floor(ms / 60000).toString().padStart(2, "0")}:${Math.floor((ms % 60000) / 1000).toString().padStart(2, "0")}`;

  const focus = useDerivedValue(() => withTiming(activeSignal?.value ?? (state.turn === color && state.status === "active" ? 1 : 0), { duration: 150 }));
  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#ECD8E1", "#E6709A"]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ["#FFFFFF", "#FFF1F6"]),
    transform: [{ scale: 1 + focus.value * 0.018 }],
  }));

  return (
    <Animated.View style={[styles.box, animatedStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.time}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    minWidth: 94,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 17,
    borderWidth: 1.5,
  },
  label: { fontSize: 9.5, color: COLORS.secondaryText, fontWeight: "800" },
  time: { marginTop: 2, fontSize: 20, color: COLORS.primaryText, fontWeight: "900", fontVariant: ["tabular-nums"] },
});
