import { Ionicons } from "@expo/vector-icons";
import React, { ReactNode, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLOOM_SUPPER } from "../../constants/bloomSupper";

export type BloomGameBottomModalProps = {
  visible: boolean;
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
  footer?: ReactNode;
  accent?: "pink" | "soft";
  /** Keep the overlay tree warm so opening it never creates a native Modal/window. */
  keepMounted?: boolean;
  /** Fired after the sheet has completed its entrance motion on the UI thread. */
  onOpenSettled?: () => void;
  /** First visible presentation is already on-screen; do not animate it over the route transition. */
  staticFirstPresentation?: boolean;
  /** Immediately park the overlay with no closing animation while its route is blurred. */
  suspended?: boolean;
};

/**
 * Screen-root Bloom Supper game surface. The sheet is kept on the UI thread:
 * backdrop, translate and scale are independent SharedValues so React does not
 * participate in any animation frame. The modal stays mounted until the close
 * motion has fully settled, preventing the abrupt pop that the old RN Animated
 * implementation could show on Android.
 */
export function BloomGameBottomModal({
  visible,
  eyebrow,
  title,
  subtitle,
  icon = "sparkles",
  children,
  footer,
  accent = "pink",
  keepMounted = false,
  onOpenSettled,
  staticFirstPresentation = false,
  suspended = false,
}: BloomGameBottomModalProps) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible || keepMounted);
  const onOpenSettledRef = useRef(onOpenSettled);
  const hasPresentedRef = useRef(false);
  onOpenSettledRef.current = onOpenSettled;
  const notifyOpenSettled = useCallback(() => { onOpenSettledRef.current?.(); }, []);

  const backdropOpacity = useSharedValue(0);
  const sheetOpacity = useSharedValue(0);
  const translateY = useSharedValue(76);
  const scale = useSharedValue(0.965);

  useEffect(() => {
    if ((visible || keepMounted) && !mounted) setMounted(true);
  }, [keepMounted, mounted, visible]);

  useLayoutEffect(() => {
    cancelAnimation(backdropOpacity);
    cancelAnimation(sheetOpacity);
    cancelAnimation(translateY);
    cancelAnimation(scale);

    if (suspended) {
      backdropOpacity.value = 0;
      sheetOpacity.value = 0;
      translateY.value = 52;
      scale.value = 0.984;
      return;
    }

    if (visible && mounted) {
      const firstPresentation = !hasPresentedRef.current;
      hasPresentedRef.current = true;

      // The entry shield is part of the route's first frame. Showing it already
      // settled avoids competing with the navigation transition; the expensive
      // board is mounted independently after interactions have finished.
      if (staticFirstPresentation && firstPresentation) {
        backdropOpacity.value = 1;
        sheetOpacity.value = 1;
        translateY.value = 0;
        scale.value = 1;
        requestAnimationFrame(notifyOpenSettled);
        return;
      }

      // No spring/overshoot here: Android was doing image decode + board mount
      // while the sheet spring was settling, which made the first ready modal
      // look like two small jumps. A single deterministic UI-thread curve is
      // cheaper and visually more Bloom-like.
      backdropOpacity.value = 0;
      sheetOpacity.value = 0;
      translateY.value = 58;
      scale.value = 0.975;

      backdropOpacity.value = withTiming(1, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
      });
      sheetOpacity.value = withTiming(1, {
        duration: 190,
        easing: Easing.out(Easing.quad),
      });
      translateY.value = withTiming(0, {
        duration: 255,
        easing: Easing.bezier(0.16, 0.82, 0.24, 1),
      }, (finished) => {
        if (finished) runOnJS(notifyOpenSettled)();
      });
      scale.value = withTiming(1, {
        duration: 245,
        easing: Easing.bezier(0.16, 0.82, 0.24, 1),
      });
      return;
    }

    if (!visible && mounted) {
      backdropOpacity.value = withTiming(0, {
        duration: 165,
        easing: Easing.inOut(Easing.quad),
      });
      sheetOpacity.value = withTiming(0, {
        duration: 145,
        easing: Easing.in(Easing.quad),
      });
      scale.value = withTiming(0.984, {
        duration: 175,
        easing: Easing.inOut(Easing.quad),
      });
      translateY.value = withTiming(52, {
        duration: 190,
        easing: Easing.in(Easing.cubic),
      }, (finished) => {
        if (finished && !keepMounted) runOnJS(setMounted)(false);
      });
    }
  }, [backdropOpacity, keepMounted, mounted, notifyOpenSettled, scale, sheetOpacity, staticFirstPresentation, suspended, translateY, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  if (!mounted) return null;

  return (
    <View
      style={styles.root}
      pointerEvents={visible ? "auto" : "none"}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? "yes" : "no-hide-descendants"}
    >
      <Animated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 12) }]} pointerEvents="box-none">
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <View style={[styles.hero, accent === "soft" && styles.heroSoft]}>
            <View pointerEvents="none" style={styles.heroBubbleLarge} />
            <View pointerEvents="none" style={styles.heroBubbleSmall} />
            <View pointerEvents="none" style={styles.heroPetalOne} />
            <View pointerEvents="none" style={styles.heroPetalTwo} />
            <View style={styles.heroIcon}>
              <Ionicons name={icon} size={23} color="#FFFFFF" />
            </View>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
          {children || footer ? (
            <View style={styles.body}>
              {children}
              {footer ? <View style={styles.footer}>{footer}</View> : null}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1200,
    elevation: 120,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(50,22,35,0.56)",
  },
  bottomDock: {
    width: "100%",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    overflow: "hidden",
    backgroundColor: BLOOM_SUPPER.surface.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.74)",
    shadowColor: "#401726",
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: -8 },
    elevation: 24,
  },
  hero: {
    minHeight: 154,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#C43C72",
  },
  heroSoft: { backgroundColor: "#AE5577" },
  heroBubbleLarge: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    top: -110,
    right: -38,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroBubbleSmall: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    left: -28,
    bottom: -58,
    backgroundColor: "rgba(255,213,229,0.16)",
  },
  heroPetalOne: {
    position: "absolute",
    width: 24,
    height: 12,
    borderRadius: 12,
    right: 46,
    bottom: 28,
    backgroundColor: "rgba(255,222,234,0.30)",
    transform: [{ rotate: "24deg" }],
  },
  heroPetalTwo: {
    position: "absolute",
    width: 18,
    height: 10,
    borderRadius: 10,
    left: 42,
    top: 34,
    backgroundColor: "rgba(255,255,255,0.22)",
    transform: [{ rotate: "-28deg" }],
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 18,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  eyebrow: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "900",
    letterSpacing: 1.45,
    textAlign: "center",
  },
  title: {
    marginTop: 5,
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    maxWidth: 360,
    color: "rgba(255,255,255,0.88)",
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    paddingHorizontal: 18,
    paddingTop: 17,
    paddingBottom: 18,
    backgroundColor: BLOOM_SUPPER.surface.card,
  },
  footer: { marginTop: 14 },
});
