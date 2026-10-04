import React from "react";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import Animated, { interpolateColor, type SharedValue, useAnimatedStyle, useDerivedValue, withTiming } from "react-native-reanimated";

import { COLORS } from "../../constants/theme";
import type { ChessCaptureCounts, ChessColor, ChessGameState } from "../../types/chess";
import { ChessClock } from "./ChessClock";
import { ChessMaterialStrip } from "./ChessMaterialStrip";

const AnimatedText = Animated.createAnimatedComponent(Text);

export const ChessPlayerRail = React.memo(function ChessPlayerRail({
  state,
  color,
  clockLabel,
  displayName,
  colorLabel,
  avatarUrl,
  avatarFallback,
  isBot,
  activeSignal,
  activeCopy,
  inactiveCopy,
  captures,
  advantage,
}: {
  state: ChessGameState;
  color: ChessColor;
  clockLabel: string;
  displayName: string;
  colorLabel: string;
  avatarUrl?: string | null;
  avatarFallback: string;
  isBot?: boolean;
  activeSignal: SharedValue<number>;
  activeCopy: string;
  inactiveCopy: string;
  captures: ChessCaptureCounts;
  advantage: number;
}) {
  const focus = useDerivedValue(() => withTiming(activeSignal.value, { duration: 150 }));
  const railStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], ["#F1D9E3", "#E67FA5"]),
    backgroundColor: interpolateColor(focus.value, [0, 1], ["#FFFBFD", "#FFF3F7"]),
    transform: [{ scale: 1 + focus.value * 0.008 }],
  }));
  const activeTextStyle = useAnimatedStyle(() => ({ opacity: focus.value, transform: [{ translateY: (1 - focus.value) * 2 }] }));
  const idleTextStyle = useAnimatedStyle(() => ({ opacity: 1 - focus.value }));

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
          <Text style={styles.colorLabel}>{colorLabel}</Text>
          <View style={styles.turnLine}>
            <AnimatedText style={[styles.turnActive, activeTextStyle]}>{activeCopy}</AnimatedText>
            <AnimatedText style={[styles.turnIdle, idleTextStyle]}>{inactiveCopy}</AnimatedText>
          </View>
          <ChessMaterialStrip captures={captures} playerColor={color} advantage={advantage} />
        </View>
      </View>
      <ChessClock state={state} color={color} label={clockLabel} activeSignal={activeSignal} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rail: {
    minHeight: 82,
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
  identityWrap: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { width: 40, height: 40, borderRadius: 15, overflow: "hidden", backgroundColor: "#F9E3EC", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontWeight: "900", color: COLORS.primary },
  botAvatarText: { fontSize: 28, lineHeight: 31 },
  copy: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "900", color: COLORS.primaryText },
  colorLabel: { fontSize: 10, color: COLORS.secondaryText, marginTop: 1 },
  turnLine: { height: 17, marginTop: 2, justifyContent: "center" },
  turnActive: { position: "absolute", fontSize: 10.5, fontWeight: "900", color: COLORS.primary },
  turnIdle: { position: "absolute", fontSize: 10, fontWeight: "700", color: "#A98A96" },
});
