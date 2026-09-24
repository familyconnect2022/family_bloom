import { Ionicons } from "@expo/vector-icons";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BLOOM_MOTION } from "../../constants/motion";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export type ToastType = "success" | "error" | "info" | "notification";
export type ToastPosition = "top" | "bottom" | "center";
export type ToastAnimation = "spring" | "slide" | "fade" | "bounce";

export interface ToastConfig {
  type?: ToastType;
  title?: string;
  message?: string;
  duration?: number; // Mặc định 4000ms
  autoHide?: boolean; // Mặc định true (truyền false để tắt thủ công)
  showProgressBar?: boolean; // Mặc định true
  position?: ToastPosition; // "top" | "bottom" | "center" (Mặc định: "top")
  animationType?: ToastAnimation; // "spring" | "slide" | "fade" | "bounce" (Mặc định: "spring")
  enableQueue?: boolean; // Mặc định true (truyền false để ghi đè ngay lập tức)
  customNode?: React.ReactNode;
  onPress?: () => void;
  /** Compact task feedback used by non-blocking Event/Moment publishes. */
  compact?: boolean;
  /** Shows a spinner instead of the semantic icon while a task is running. */
  loading?: boolean;
}

interface ToastContextType {
  showToast: (config: ToastConfig) => void;
  hideToast: () => void;
}

const TOAST_STYLES = {
  success: {
    bg: "#E8F5E9",
    border: "#C8E6C9",
    text: "#2E7D32",
    icon: "checkmark-circle" as const,
    bar: "#81C784",
  },
  error: {
    bg: "#FFEBEE",
    border: "#FFCDD2",
    text: "#C62828",
    icon: "alert-circle" as const,
    bar: "#E57373",
  },
  info: {
    bg: "#E3F2FD",
    border: "#BBDEFB",
    text: "#1565C0",
    icon: "information-circle" as const,
    bar: "#64B5F6",
  },
  notification: {
    bg: "#FCE4EC",
    border: "#F8BBD0",
    text: "#C2185B",
    icon: "sparkles" as const,
    bar: "#F06292",
  },
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useBloomToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useBloomToast phải được bọc trong BloomToastProvider");
  return context;
};

export const BloomToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<ToastConfig[]>([]);
  const [currentToast, setCurrentToast] = useState<ToastConfig | null>(null);

  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const panY = useRef(new Animated.Value(0)).current;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimatingRef = useRef(false);
  const hideToastRef = useRef<() => void>(() => undefined);

  const hideToast = useCallback(() => {
    if (!currentToast || isAnimatingRef.current) return;
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
      setCurrentToast(null);
      panY.setValue(0);
      isAnimatingRef.current = false;
    });
  }, [currentToast, opacity, scale, panY]);

  hideToastRef.current = hideToast;

  const showToast = useCallback((config: ToastConfig) => {
    const normalizedConfig: ToastConfig = { type: "info", ...config };
    const useQueue = normalizedConfig.enableQueue ?? true;

    if (!useQueue) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setQueue([]);
      setCurrentToast(normalizedConfig);
      return;
    }

    setQueue((prev) => [...prev, normalizedConfig]);
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
        return { top: SCREEN_HEIGHT / 2 - 50 };
      default:
        return { top: insets.top + 12 };
    }
  };

  const styleConfig = currentToast ? TOAST_STYLES[currentToast.type ?? "info"] : TOAST_STYLES.info;

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {currentToast && (
        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.toastContainer,
            currentToast.compact && styles.toastCompact,
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
            <View style={styles.customRoot}>{currentToast.customNode}</View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                if (currentToast.onPress) currentToast.onPress();
                hideToast();
              }}
              style={styles.toastContent}
            >
              <View style={[styles.iconWrapper, currentToast.compact && styles.iconWrapperCompact]}>
                {currentToast.loading ? (
                  <ActivityIndicator size="small" color={styleConfig.text} />
                ) : (
                  <Ionicons name={styleConfig.icon} size={currentToast.compact ? 20 : 26} color={styleConfig.text} />
                )}
              </View>
              <View style={styles.textWrapper}>
                {currentToast.title && (
                  <Text style={[styles.title, currentToast.compact && styles.titleCompact, { color: styleConfig.text }]}>
                    {currentToast.title}
                  </Text>
                )}
                {currentToast.message && (
                  <Text style={[styles.message, currentToast.compact && styles.messageCompact, { color: styleConfig.text }]}>
                    {currentToast.message}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}

          {(currentToast.autoHide ?? true) && (currentToast.showProgressBar ?? true) && (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
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

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 20,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    overflow: "hidden",
  },
  toastContent: { flexDirection: "row", alignItems: "center" },
  toastCompact: { left: 28, right: 28, borderRadius: 16 },
  customRoot: { width: "100%" },
  iconWrapper: { marginRight: 14, justifyContent: "center" },
  iconWrapperCompact: { marginRight: 10 },
  textWrapper: { flex: 1, justifyContent: "center" },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 2 },
  titleCompact: { fontSize: 13.5, marginBottom: 0 },
  message: { fontSize: 13, fontWeight: "500", opacity: 0.9, lineHeight: 18 },
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
});
