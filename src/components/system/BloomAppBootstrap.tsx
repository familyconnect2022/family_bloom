import React, { useEffect, useRef } from "react";
import { Animated, ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/components/ui/BloomButtonComponents";
import { BLOOM_MOTION } from "@/constants/motion";

type Props = { ready: boolean };

/** App readiness gate. It stays visible until auth, profile and navigation are stable. */
export function BloomAppBootstrap({ ready }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = React.useState(true);

  useEffect(() => {
    if (!ready) {
      // Mỗi lần state machine quay lại trạng thái resolving (logout/refresh/profile change),
      // bootstrap phải xuất hiện lại để che chuyển route trung gian.
      opacity.stopAnimation();
      opacity.setValue(1);
      setVisible(true);
      return;
    }

    setVisible(true);
    Animated.timing(opacity, {
      toValue: 0,
      duration: BLOOM_MOTION.durations.gentle,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [ready, opacity]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}>
      <View style={styles.logo}><Text style={styles.logoText}>B</Text></View>
      <Text style={styles.title}>Family Bloom</Text>
      <Text style={styles.subtitle}>{ready ? "Chuẩn bị xong…" : "Đang chuẩn bị tổ ấm của bạn…"}</Text>
      <ActivityIndicator size="small" color={COLORS.primary} style={styles.spinner} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: { backgroundColor: COLORS.white, justifyContent: "center", alignItems: "center", zIndex: 9999 },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  logoText: { fontSize: 34, fontWeight: "900", color: COLORS.primary },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.primaryText },
  subtitle: { marginTop: 8, fontSize: 14, color: COLORS.secondaryText },
  spinner: { marginTop: 20 },
});
