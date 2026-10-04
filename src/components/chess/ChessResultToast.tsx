import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";

export type ChessResultOutcome = "win" | "loss" | "draw";

type Props = {
  visible: boolean;
  outcome: ChessResultOutcome;
  reason: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary: () => void;
  onDismiss: () => void;
};

const PETALS = [
  { left: "4%", top: "7%", rotate: -30, delay: 0, size: 14 },
  { left: "14%", top: "28%", rotate: 18, delay: 70, size: 11 },
  { left: "27%", top: "4%", rotate: 34, delay: 140, size: 13 },
  { left: "70%", top: "5%", rotate: -18, delay: 210, size: 11 },
  { left: "87%", top: "24%", rotate: 38, delay: 280, size: 14 },
  { left: "6%", top: "70%", rotate: 14, delay: 350, size: 12 },
  { left: "23%", top: "84%", rotate: -42, delay: 420, size: 10 },
  { left: "76%", top: "84%", rotate: 26, delay: 490, size: 12 },
  { left: "90%", top: "66%", rotate: -34, delay: 560, size: 13 },
] as const;

function WinPetal({ left, top, rotate, delay, size }: (typeof PETALS)[number]) {
  const phase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(phase, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(phase, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, phase]);

  const translateY = phase.interpolate({ inputRange: [0, 1], outputRange: [-8, 26] });
  const translateX = phase.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 8, -5] });
  const opacity = phase.interpolate({ inputRange: [0, 0.12, 0.82, 1], outputRange: [0, 0.95, 0.72, 0] });
  const spin = phase.interpolate({ inputRange: [0, 1], outputRange: [`${rotate}deg`, `${rotate + 72}deg`] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.petal,
        {
          left,
          top,
          width: size,
          height: size * 1.5,
          borderRadius: size,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: spin }],
        },
      ]}
    />
  );
}

function Blossom({ side }: { side: "left" | "right" }) {
  return (
    <View pointerEvents="none" style={[styles.blossom, side === "left" ? styles.blossomLeft : styles.blossomRight]}>
      {[0, 1, 2, 3, 4].map((index) => (
        <View
          key={index}
          style={[
            styles.blossomPetal,
            { transform: [{ rotate: `${index * 72}deg` }, { translateY: -8 }] },
          ]}
        />
      ))}
      <View style={styles.blossomCore} />
    </View>
  );
}

/**
 * Board-local result overlay.
 *
 * Intentionally NOT a React Native Modal: it is mounted inside boardStage and
 * absolutely fills only the board. This guarantees it can never participate in
 * ScrollView layout or push the player rail down on Android/Fabric.
 */
export const ChessResultToast = React.memo(function ChessResultToast({
  visible,
  outcome,
  reason,
  primaryLabel,
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  onDismiss,
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const lift = useRef(new Animated.Value(12)).current;
  const trophy = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      scale.setValue(0.88);
      lift.setValue(12);
      trophy.setValue(0.8);
      return;
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 20, bounciness: 7, useNativeDriver: true }),
      Animated.timing(lift, { toValue: 0, duration: 190, useNativeDriver: true }),
      Animated.spring(trophy, { toValue: 1, speed: 17, bounciness: 11, useNativeDriver: true }),
    ]).start();
  }, [lift, opacity, scale, trophy, visible]);

  const copy = useMemo(() => {
    if (outcome === "win") return { title: "Bạn thắng!", icon: "trophy" as const, accent: "#C82F71" };
    if (outcome === "loss") return { title: "Ván đấu khép lại", icon: "heart-outline" as const, accent: "#8E5B70" };
    return { title: "Ván hòa", icon: "remove-circle-outline" as const, accent: "#8E6575" };
  }, [outcome]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="auto">
      <View style={styles.backdrop} pointerEvents="none" />
      {outcome === "win" ? <View pointerEvents="none" style={styles.aura} /> : null}
      {outcome === "win" ? PETALS.map((petal, index) => <WinPetal key={index} {...petal} />) : null}

      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          styles.card,
          outcome === "win" && styles.winCard,
          { opacity, transform: [{ translateY: lift }, { scale }] },
        ]}
      >
        {outcome === "win" ? (
          <>
            <View pointerEvents="none" style={styles.winGlowLarge} />
            <View pointerEvents="none" style={styles.winGlowSmall} />
            <Blossom side="left" />
            <Blossom side="right" />
            <View pointerEvents="none" style={styles.sparkleLeft}><Ionicons name="sparkles" size={19} color="#F2B83E" /></View>
            <View pointerEvents="none" style={styles.sparkleRight}><Ionicons name="sparkles" size={19} color="#F2B83E" /></View>
          </>
        ) : null}

        <Animated.View
          style={[
            styles.iconHalo,
            outcome === "win" && styles.iconHaloWin,
            outcome === "win" ? { transform: [{ scale: trophy }] } : null,
          ]}
        >
          <Ionicons name={copy.icon} size={outcome === "win" ? 35 : 29} color={outcome === "win" ? "#D6A02C" : copy.accent} />
        </Animated.View>

        {outcome === "win" ? (
          <View pointerEvents="none" style={styles.sparkleRow}>
            <Ionicons name="sparkles" size={16} color="#F0B239" />
            <Ionicons name="sparkles" size={12} color="#E870A0" />
            <Ionicons name="sparkles" size={16} color="#F0B239" />
          </View>
        ) : null}

        <Text style={[styles.title, { color: copy.accent }]}>{copy.title}</Text>
        <Text style={styles.reason}>{reason}</Text>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={primaryDisabled || primaryLoading}
            onPress={onPrimary}
            style={({ pressed }) => [
              styles.secondaryButton,
              (primaryDisabled || primaryLoading) && styles.buttonDisabled,
              pressed && !primaryDisabled && !primaryLoading && styles.buttonPressed,
            ]}
          >
            {primaryLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="refresh" size={20} color={COLORS.primary} />}
            <Text numberOfLines={1} style={styles.secondaryButtonText}>{primaryLoading ? "Đang chuẩn bị…" : primaryLabel}</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onDismiss}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="checkmark" size={23} color={COLORS.white} />
            <Text style={styles.primaryButtonText}>Đồng ý</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    elevation: 90,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 20,
    overflow: "visible",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    backgroundColor: "rgba(68,30,46,0.18)",
  },
  aura: {
    position: "absolute",
    width: "82%",
    height: "58%",
    borderRadius: 180,
    backgroundColor: "rgba(255,237,169,0.25)",
    shadowColor: "#F0C054",
    shadowOpacity: 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  card: {
    width: "88%",
    maxWidth: 360,
    minHeight: 260,
    borderRadius: 30,
    borderWidth: 1.6,
    borderColor: "#EECAD8",
    backgroundColor: "rgba(255,252,253,0.985)",
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#743D55",
    shadowOpacity: 0.33,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 11 },
    elevation: 20,
  },
  winCard: {
    borderColor: "#F2C1D2",
    backgroundColor: "rgba(255,250,252,0.992)",
  },
  winGlowLarge: {
    position: "absolute",
    top: -92,
    width: 350,
    height: 210,
    borderRadius: 180,
    backgroundColor: "#FFEBA4",
    opacity: 0.38,
  },
  winGlowSmall: {
    position: "absolute",
    top: -22,
    width: 220,
    height: 128,
    borderRadius: 120,
    backgroundColor: "#FFF8D9",
    opacity: 0.82,
  },
  iconHalo: {
    width: 60,
    height: 60,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0F5",
    borderWidth: 1,
    borderColor: "#F0CEDA",
    zIndex: 2,
  },
  iconHaloWin: {
    width: 68,
    height: 68,
    borderRadius: 25,
    backgroundColor: "#FFF8E3",
    borderColor: "#EED070",
    shadowColor: "#E2B23E",
    shadowOpacity: 0.31,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sparkleRow: {
    width: 158,
    marginTop: -2,
    marginBottom: -4,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  sparkleLeft: { position: "absolute", left: 20, top: 26, zIndex: 2 },
  sparkleRight: { position: "absolute", right: 20, top: 31, zIndex: 2 },
  title: {
    marginTop: 4,
    fontSize: 35,
    lineHeight: 42,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -0.7,
    zIndex: 2,
  },
  reason: {
    marginTop: 0,
    color: "#735763",
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "800",
    textAlign: "center",
    zIndex: 2,
  },
  actions: {
    width: "100%",
    marginTop: 18,
    flexDirection: "row",
    gap: 9,
    zIndex: 2,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#EDC6D6",
    backgroundColor: "rgba(255,250,252,0.96)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  primaryButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: "#E94D8B",
    borderWidth: 1.2,
    borderColor: "#F4A1C0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
    shadowColor: "#D8467F",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  secondaryButtonText: { flexShrink: 1, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  petal: {
    position: "absolute",
    backgroundColor: "#EF88AD",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    zIndex: 3,
  },
  blossom: {
    position: "absolute",
    bottom: -4,
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.94,
    zIndex: 1,
  },
  blossomLeft: { left: -6, transform: [{ rotate: "-16deg" }] },
  blossomRight: { right: -6, transform: [{ rotate: "16deg" }] },
  blossomPetal: {
    position: "absolute",
    width: 16,
    height: 26,
    borderRadius: 14,
    backgroundColor: "#F6A3BF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
  },
  blossomCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#F3C14F" },
});
