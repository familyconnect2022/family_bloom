import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { COLORS } from '../../constants/theme';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, useWindowDimensions, PanResponder, StyleSheet, TouchableOpacity, View,  } from 'react-native';
import { BloomText as Text } from './BloomText';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BLOOM_MOTION } from "../../constants/motion";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';
import { useBloomMotionSetting } from '../../motion/BloomMotion';
import { useA3Theme } from '../../appearance3/useAppearance3';


export type ToastType = "success" | "warning" | "error" | "info" | "notification";
export type ToastPosition = "top" | "bottom" | "center";
export type ToastAnimation = "spring" | "slide" | "fade" | "bounce";

export interface ToastConfig {
  type?: ToastType;
  title?: string;
  message?: string;
  duration?: number;
  autoHide?: boolean;
  showProgressBar?: boolean;
  position?: ToastPosition;
  animationType?: ToastAnimation;
  enableQueue?: boolean;
  customNode?: React.ReactNode;
  onPress?: () => void;
  /** Compact task feedback used by non-blocking Event/Moment publishes. */
  compact?: boolean;
  /** Queue-level dedupe key. Identical pending/current messages collapse to one. */
  dedupeKey?: string;
  /** Shows a spinner instead of the semantic icon while a task is running. */
  loading?: boolean;
  /** Opt-in: petals only AFTER the caller confirms a real success. */
  magicMoment?: boolean;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
}

// Type is conveyed by icon and left progress bar, while the card surface follows
// the active theme. Info always remains distinct from Error in both modes.
const getToastStyles = () => ({
  success: { bg: COLORS.surface, border: COLORS.border, text: COLORS.primaryText,
    icon: "checkmark-circle" as const, bar: COLORS.positive },
  warning: { bg: COLORS.surface, border: COLORS.border, text: COLORS.primaryText,
    icon: "alert-circle-outline" as const, bar: COLORS.attention },
  error: { bg: COLORS.surface, border: COLORS.border, text: COLORS.primaryText,
    icon: "alert-circle" as const, bar: COLORS.destructive },
  info: { bg: COLORS.surface, border: COLORS.border, text: COLORS.primaryText,
    icon: "information-circle-outline" as const, bar: COLORS.primary },
  notification: { bg: COLORS.surface, border: COLORS.border, text: COLORS.primaryText,
    icon: "sparkles" as const, bar: COLORS.primary },
});

/** Small, touch-transparent Bloom Magic inside an already-confirmed success toast.
 * No provider state or Firebase interaction is introduced. */
function BloomSuccessPetals() {
  const { enabled } = useBloomMotionSetting();
  const { colors } = useA3Theme();
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) return;
    progress.setValue(0);
    const anim = Animated.timing(progress, {toValue: 1, duration: 720, useNativeDriver: true});
    anim.start();
    return () => anim.stop();
  }, [enabled, progress]);
  if (!enabled) return null;
  return (
    <View pointerEvents="none" style={{position:'absolute', width:42,height:42,top:0,left:0,overflow:'visible'}}>
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const a = angle * Math.PI / 180;
        return <Animated.View key={angle} style={{
          position:'absolute', left:18, top:16, width:6, height:11, borderRadius:5,
          backgroundColor:colors.primary,
          opacity: progress.interpolate({inputRange:[0,0.15,0.62,1],outputRange:[0,1,0.85,0]}),
          transform:[
            {translateX: progress.interpolate({inputRange:[0,1],outputRange:[0,Math.cos(a)*19]})},
            {translateY: progress.interpolate({inputRange:[0,1],outputRange:[0,Math.sin(a)*19]})},
            {rotate:`${angle}deg`},
          ],
        }}/>
      })}
    </View>
  );
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useBloomToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useBloomToast phải được bọc trong BloomToastProvider");
  return context;
};

export const BloomToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const [queue, setQueue] = useState<ToastConfig[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastConfig | null>(null);
  const currentToastRef = useRef<ToastConfig | null>(null);
  currentToastRef.current = currentToast;

  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const hideToastRef = useRef<() => void>(() => undefined);

  const hideToast = useCallback(() => {
    if (!currentToastRef.current || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: BLOOM_MOTION.durations.fast,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.94,
        duration: BLOOM_MOTION.durations.fast,
        useNativeDriver: true,
      }),
    ]).start(() => {
      currentToastRef.current = null;
      setCurrentToast(null);
      panY.setValue(0);
      isAnimatingRef.current = false;
    });
  }, [opacity, scale, panY]);

  hideToastRef.current = hideToast;

  const showToast = useCallback((config: ToastConfig) => {
    const normalizedConfig: ToastConfig = { type: "info", ...config };
    const useQueue = normalizedConfig.enableQueue ?? true;
    const dedupeKey = normalizedConfig.dedupeKey
      ?? `${normalizedConfig.type ?? "info"}|${normalizedConfig.title ?? ""}|${normalizedConfig.message ?? ""}`;

    if (!useQueue) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setQueue([]);
      currentToastRef.current = normalizedConfig;
      setCurrentToast(normalizedConfig);
      return;
    }

    const current = currentToastRef.current;
    const currentKey = current?.dedupeKey ?? (current ? `${current.type ?? "info"}|${current.title ?? ""}|${current.message ?? ""}` : null);
    if (currentKey === dedupeKey) return;
    setQueue((prev) => {
      const duplicate = prev.some((item) => (item.dedupeKey ?? `${item.type ?? "info"}|${item.title ?? ""}|${item.message ?? ""}`) === dedupeKey);
      return duplicate ? prev : [...prev, { ...normalizedConfig, dedupeKey }];
    });
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dy) > 40) {
          hideToastRef.current();
        } else {
          Animated.spring(panY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (!currentToast && queue.length > 0) {
      const nextToast = queue[0];
      setQueue((prev) => prev.slice(1));
      setCurrentToast(nextToast);
    }
  }, [queue, currentToast]);

  useEffect(() => {
    if (!currentToast) return;

    const duration = currentToast.duration ?? 4000;
    const autoHide = currentToast.autoHide ?? true;
    const position = currentToast.position ?? "top";
    const animationType = currentToast.animationType ?? "spring";

    panY.setValue(0);
    progressAnim.setValue(1);
    opacity.setValue(0);

    const initialY = position === "bottom" ? 200 : position === "top" ? -200 : 0;
    translateY.setValue(initialY);

    const animations = [];

    if (animationType === "fade") {
      translateY.setValue(0);
      scale.setValue(1);
      animations.push(
        Animated.timing(opacity, {
          toValue: 1,
          duration: BLOOM_MOTION.durations.standard,
          useNativeDriver: true,
        }),
      );
    } else if (animationType === "slide") {
      scale.setValue(1);
      animations.push(
        Animated.timing(translateY, {
          toValue: 0,
          duration: BLOOM_MOTION.durations.standard,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: BLOOM_MOTION.durations.fast,
          useNativeDriver: true,
        }),
      );
    } else if (animationType === "bounce") {
      scale.setValue(0.3);
      animations.push(
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 20,
          speed: 12,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, bounciness: 16, useNativeDriver: true }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: BLOOM_MOTION.durations.fast,
          useNativeDriver: true,
        }),
      );
    } else {
      scale.setValue(0.8);
      animations.push(
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 10,
          speed: 14,
          useNativeDriver: true,
        }),
        Animated.spring(scale, { toValue: 1, bounciness: 8, useNativeDriver: true }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: BLOOM_MOTION.durations.fast,
          useNativeDriver: true,
        }),
      );
    }

    Animated.parallel(animations).start();

    if (autoHide) {
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: duration,
        useNativeDriver: false,
      }).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentToast, hideToast, opacity, panY, progressAnim, scale, translateY]);

  const getPositionStyle = (pos: ToastPosition = "top") => {
    switch (pos) {
      case "bottom":
        return { bottom: insets.bottom + 12 };
      case "center":
        return { top: Math.max(insets.top + 16, viewportHeight / 2 - 52) };
      default:
        return { top: insets.top + 12 };
    }
  };

  const toastStyles = getToastStyles();
  const styleConfig = currentToast ? toastStyles[currentToast.type ?? "info"] : toastStyles.info;

  const contextValue = useMemo(() => ({ showToast, hideToast }), [hideToast, showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {currentToast && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            __a3_styles.toastContainer,
            currentToast.compact && __a3_styles.toastCompact,
            getPositionStyle(currentToast.position),
            {
              opacity,
              transform: [{ translateY: Animated.add(translateY, panY) }, { scale }],
              padding: currentToast.customNode ? 0 : currentToast.compact ? 10 : 14,
              backgroundColor: styleConfig.bg,
              borderColor: styleConfig.border,
            },
          ]}
        >
          {currentToast.customNode ? (
            <View style={__a3_styles.customRoot}>{currentToast.customNode}</View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (currentToast.onPress) currentToast.onPress();
                hideToast();
              }}
              style={__a3_styles.toastContent}
            >
              <View style={[__a3_styles.iconWrapper, currentToast.compact && __a3_styles.iconWrapperCompact]}>
                {currentToast.magicMoment && currentToast.type === 'success' && !currentToast.loading ? <BloomSuccessPetals /> : null}
                {currentToast.loading ? (
                  <ActivityIndicator size="small" color={styleConfig.text} />
                ) : (
                  <Ionicons name={styleConfig.icon} size={currentToast.compact ? 20 : 26} color={styleConfig.text} />
                )}
              </View>
              <View style={__a3_styles.textWrapper}>
                {currentToast.title && (
                  <Text style={[__a3_styles.title, currentToast.compact && __a3_styles.titleCompact, { color: styleConfig.text }]}>
                    {currentToast.title}
                  </Text>
                )}
                {currentToast.message && (
                  <Text style={[__a3_styles.message, currentToast.compact && __a3_styles.messageCompact, { color: styleConfig.text }]}>
                    {currentToast.message}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {(currentToast.autoHide ?? true) && (currentToast.showProgressBar ?? true) && (
            <View style={__a3_styles.progressTrack}>
              <Animated.View
                style={[
                  __a3_styles.progressBar,
                  {
                    backgroundColor: styleConfig.bar,
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ["0%", "100%"],
                    }),
                  },
                ]}
              />
            </View>
          )}
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = createBloomStyles(() => StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: BLOOM_SUPPER.radius.card,
    borderWidth: 1.25,
    shadowColor: BLOOM_SUPPER.shadow.color,
    shadowOffset: { width: 0, height: BLOOM_SUPPER.shadow.y },
    shadowOpacity: 0.15,
    shadowRadius: BLOOM_SUPPER.shadow.radius,
    elevation: 7,
    overflow: "hidden",
  },
  toastContent: { flexDirection: "row", alignItems: "center" },
  toastCompact: { left: 28, right: 28, borderRadius: BLOOM_SUPPER.radius.compact },
  customRoot: { width: "100%" },
  iconWrapper: { width: 42, height: 42, borderRadius: 15, marginRight: 12, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(255,255,255,0.72)", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)" },
  iconWrapperCompact: { width: 34, height: 34, borderRadius: 12, marginRight: 9 },
  textWrapper: { flex: 1, justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "900", marginBottom: 2 },
  titleCompact: { fontSize: 13.5, marginBottom: 0 },
  message: { fontSize: 13, fontWeight: "600", opacity: 0.9, lineHeight: 18 },
  messageCompact: { fontSize: 11.5, lineHeight: 16, marginTop: 2 },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  progressBar: {
    height: "100%",
    borderRadius: 1.5,
  },
}));
