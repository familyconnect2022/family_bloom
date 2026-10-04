import React from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import { COLORS } from "../../constants/theme";
import type { ChessCaptureCounts, ChessColor, ChessGameState } from "../../types/chess";
import { ChessClock } from "./ChessClock";
import { ChessMaterialStrip } from "./ChessMaterialStrip";

/**
 * Production player rail: identity + captured material + clock only.
 * Turn is communicated by the solid active clock, so redundant copy such as
 * "Bạn", "Đối thủ", "Quân trắng", "Quân đen" and turn-status rows are gone.
 */
export const ChessPlayerRail = React.memo(function ChessPlayerRail({
  state,
  color,
  displayName,
  avatarUrl,
  avatarFallback,
  isBot,
  activeSignal,
  captures,
  advantage,
}: {
  state: ChessGameState;
  color: ChessColor;
  displayName: string;
  avatarUrl?: string | null;
  avatarFallback: string;
  isBot?: boolean;
  activeSignal: SharedValue<number>;
  captures: ChessCaptureCounts;
  advantage: number;
}) {
  const focus = useDerivedValue(() => withTiming(activeSignal.value, { duration: 135 }));
  const railStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#F1D9E3", "#E9B2C6"]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ["#FFFBFD", "#FFF8FB"]),
  }));

  return (
    <Animated.View style={[styles.rail, railStyle]}>
      <View style={styles.identityWrap}>
        <View style={styles.avatar}>
          {avatarUrl
            ? <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
            : <Text style={[styles.avatarText, isBot && styles.botAvatarText]}>{isBot ? "♞" : avatarFallback}</Text>}
        </View>
        <View style={styles.copy}>
          <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
          <View style={styles.materialWrap}>
            <ChessMaterialStrip captures={captures} playerColor={color} advantage={advantage} />
          </View>
        </View>
      </View>
      <ChessClock state={state} color={color} activeSignal={activeSignal} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rail: {
    minHeight: 90,
    borderRadius: 22,
    borderWidth: 1.2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    shadowColor: "#8F526A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  identityWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 16, overflow: "hidden", backgroundColor: "#F9E3EC", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 15, fontWeight: "900", color: COLORS.primary },
  botAvatarText: { fontSize: 29, lineHeight: 32 },
  copy: { flex: 1, minWidth: 0, justifyContent: "center" },
  name: { fontSize: 16, lineHeight: 20, fontWeight: "900", color: COLORS.primaryText },
  materialWrap: { width: "100%", minHeight: 38, marginTop: 2, justifyContent: "flex-start", overflow: "hidden" },
});
