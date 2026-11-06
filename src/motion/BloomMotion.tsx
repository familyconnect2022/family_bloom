/**
 * Family Bloom R11 / Motion Lab: UI-thread motion primitives.
 * Zero Firebase traffic, zero navigation side effects, no recurring timers.
 * Opt-out is immediate for Still or Android Reduce Motion.
 */
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, type PressableProps } from 'react-native';
import Animated, {
  cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withTiming,
} from 'react-native-reanimated';
import { useBloomMotionRevision } from '../theme/BloomThemeProvider';
import { getLivingAppearance } from '../theme/livingAppearance';

export const BLOOM_MOTION_R11 = Object.freeze({
  pressDown: 110,
  pressUp: 175,
  hero: 560,
  reveal: 330,
  revealStagger: 70,
  magic: 820,
  pressScale: 0.978,
});

/** Consume only motion updates, not theme/font snapshots or authentication state. */
export function useBloomMotionSetting() {
  useBloomMotionRevision();
  const systemReduceMotion = useReducedMotion();
  const level = getLivingAppearance().motion;
  const enabled = level !== 'still' && !systemReduceMotion;
  return { level, enabled, systemReduceMotion, intensity: level === 'vivid' ? 1 : 0.58 } as const;
}

/** Keep native Pressable callback-based styles intact.
 * Animated.createAnimatedComponent(Pressable) with a style callback broke
 * existing card borders/surfaces in R11R2, so do NOT decorate card roots. */
export function BloomMotionPressable(props: PressableProps) {
  return <Pressable {...props} />;
}

/** Scene entrance happens at most once per app session. Never blocks navigation. */
const revealedScenes = new Set<string>();
export function BloomMotionReveal({ children, sceneKey, delayMs = 0, distance = 10, startOpacity = 0, active = true }: {
  children: ReactNode;
  sceneKey: string;
  delayMs?: number;
  distance?: number;
  startOpacity?: number;
  active?: boolean;
}) {
  const motion = useBloomMotionSetting();
  const isFirstMount = useRef(!revealedScenes.has(sceneKey));
  // Avoid hiding an off-screen tab, and do not mark animation played until it has focus.
  const opacity = useSharedValue(isFirstMount.current && active && motion.enabled ? startOpacity : 1);
  const translateY = useSharedValue(0);
  useEffect(() => {
    if (!motion.enabled || !isFirstMount.current) {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      opacity.value = 1;
      translateY.value = 0;
      return;
    }
    if (!active) return;
    // Mark only when the tab is truly focused, not during pre-mount/tab warmup.
    revealedScenes.add(sceneKey);
    isFirstMount.current = false;
    opacity.value = startOpacity;
    translateY.value = distance * motion.intensity;
    const duration = sceneKey.endsWith('hero') ? BLOOM_MOTION_R11.hero : BLOOM_MOTION_R11.reveal;
    const easing = Easing.out(Easing.cubic);
    opacity.value = withDelay(delayMs, withTiming(1, { duration, easing }));
    translateY.value = withDelay(delayMs, withTiming(0, { duration, easing }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
    };
  }, [active, delayMs, distance, sceneKey, startOpacity, motion.enabled, motion.intensity, opacity, translateY]);
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}


/** R11R4: visible, focus-scoped entry for real Auth/Tab screens.
 * This never intercepts touches or wraps a Pressable/card surface. The wrapper
 * preserves layout, only changes transform/opacity, and never changes routes.
 * Prewarmed tabs remain fully visible when blurred, so restored scroll state
 * and Android freezeOnBlur cannot leave an invisible scene behind. */
export function BloomRouteEntrance({ children, kind = 'tab', delayMs = 0 }: {
  children: ReactNode;
  kind?: 'tab' | 'login';
  delayMs?: number;
}) {
  const motion = useBloomMotionSetting();
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  useFocusEffect(useCallback(() => {
    cancelAnimation(opacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);
    if (!motion.enabled) {
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
      return;
    }
    const vivid = motion.level === 'vivid';
    const duration = kind === 'login' ? 560 : (vivid ? 440 : 340);
    const easing = Easing.out(Easing.cubic);
    opacity.value = kind === 'login' ? 0.36 : vivid ? 0.57 : 0.7;
    translateY.value = kind === 'login' ? 16 : vivid ? 12 : 8;
    scale.value = kind === 'login' ? 0.987 : 0.995;
    opacity.value = withDelay(delayMs, withTiming(1, { duration, easing }));
    translateY.value = withDelay(delayMs, withTiming(0, { duration, easing }));
    scale.value = withDelay(delayMs, withTiming(1, { duration, easing }));
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(translateY);
      cancelAnimation(scale);
      opacity.value = 1;
      translateY.value = 0;
      scale.value = 1;
    };
  }, [delayMs, kind, motion.enabled, motion.level, opacity, translateY, scale]));
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));
  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
