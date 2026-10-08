import React, { type ReactNode } from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import { COLORS } from "../../constants/theme";
import type { ChessColor, ChessGameState } from "../../types/chess";
import { ChessClock } from "./ChessClock";

export const ChessPlayerRail = React.memo(function ChessPlayerRail({
  state,
  color,
  displayName,
  avatarUrl,
  avatarFallback,
  isBot,
  activeSignal,
  runtimeActive = true,
  actions,
}: {
  state: ChessGameState;
  color: ChessColor;
  displayName: string;
  avatarUrl?: string | null;
  avatarFallback: string;
  isBot?: boolean;
  activeSignal: SharedValue<number>;
  runtimeActive?: boolean;
  actions?: ReactNode;
}) {
  const focus = useDerivedValue(() => withTiming(activeSignal.value, { duration: 150 }));
  const railStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#F1D9E3", "#E6A5BC"]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ["#FFFBFD", "#FFF7FA"]),
  }));

  return (
    <Animated.View style={[styles.rail, railStyle]}>
      <View style={styles.identityWrap}>
        <View style={styles.avatar}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : <Text style={[styles.avatarText, isBot && styles.botAvatarText]}>{isBot ? "♞" : avatarFallback}</Text>}
        </View>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
      </View>
      <View style={styles.rightSide}>
        <ChessClock state={state} color={color} activeSignal={activeSignal} runtimeActive={runtimeActive} />
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rail: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    shadowColor: "#8F526A",
    shadowOpacity: 0.045,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  identityWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7 },
  avatar: { width: 32, height: 32, borderRadius: 11, overflow: "hidden", backgroundColor: "#F9E3EC", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 12, fontWeight: "900", color: COLORS.primary },
  botAvatarText: { fontSize: 22, lineHeight: 24 },
  name: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 16, fontWeight: "900", color: COLORS.primaryText },
  rightSide: { flexDirection: "row", alignItems: "center", gap: 5 },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
});
