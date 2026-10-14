import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const PARTICLES = [
  { x: -126, delay: 0, w: 8, h: 15, r: -34 },
  { x: -102, delay: 70, w: 10, h: 8, r: 42 },
  { x: -80, delay: 125, w: 7, h: 14, r: 18 },
  { x: -58, delay: 30, w: 9, h: 9, r: -55 },
  { x: -36, delay: 160, w: 8, h: 15, r: 32 },
  { x: -18, delay: 88, w: 10, h: 7, r: -18 },
  { x: 8, delay: 190, w: 8, h: 13, r: 58 },
  { x: 28, delay: 18, w: 9, h: 8, r: -40 },
  { x: 48, delay: 112, w: 7, h: 14, r: 22 },
  { x: 70, delay: 48, w: 10, h: 9, r: 52 },
  { x: 92, delay: 175, w: 8, h: 15, r: -28 },
  { x: 116, delay: 95, w: 9, h: 8, r: 36 },
  { x: -112, delay: 215, w: 7, h: 12, r: 62 },
  { x: -66, delay: 235, w: 9, h: 7, r: -24 },
  { x: 56, delay: 245, w: 8, h: 13, r: 44 },
  { x: 108, delay: 225, w: 10, h: 8, r: -50 },
] as const;

const COLORS = ["#FFEAF2", "#FFFFFF", "#FFDDA2", "#F7A9C5", "#FFF3C8"] as const;

function BloomConfettiParticle({
  active,
  particle,
  color,
}: {
  active: boolean;
  particle: (typeof PARTICLES)[number];
  color: string;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = 0;
    if (!active) return;

    // Infinite UI-thread loop. No JS interval is kept alive after a game, and
    // cancelling `active` stops the celebration immediately when the winner
    // closes the result or starts the next round.
    progress.value = withRepeat(
      withSequence(
        withDelay(
          particle.delay,
          withTiming(1, {
            duration: 980,
            easing: Easing.bezier(0.18, 0.62, 0.28, 1),
          }),
        ),
        withTiming(0, { duration: 1 }),
        withDelay(180, withTiming(0, { duration: 1 })),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(progress);
      progress.value = 0;
    };
  }, [active, particle.delay, progress]);

  const style = useAnimatedStyle(() => {
    const value = progress.value;
    const opacity = value <= 0.08
      ? value / 0.08
      : value < 0.78
        ? 1
        : Math.max(0, (1 - value) / 0.22);
    const scale = value < 0.2
      ? 0.55 + (value / 0.2) * 0.45
      : 1 - ((value - 0.2) / 0.8) * 0.16;
    return {
      opacity,
      transform: [
        { translateX: particle.x * value },
        { translateY: 96 - 246 * value },
        { rotate: `${particle.r + 280 * value}deg` },
        { scale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: particle.w,
          height: particle.h,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function ChessVictoryConfetti({ active }: { active: boolean }) {
  // Keep the particle nodes pooled while the result card is mounted. The
  // SharedValues alone wake/sleep; React never has to recreate the confetti.
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PARTICLES.map((particle, index) => (
        <BloomConfettiParticle
          key={`${particle.x}:${particle.delay}`}
          active={active}
          particle={particle}
          color={COLORS[index % COLORS.length]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    left: "50%",
    bottom: 8,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.52)",
  },
});
