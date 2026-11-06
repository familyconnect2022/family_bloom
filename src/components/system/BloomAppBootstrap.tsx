import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import React, { useEffect, useRef } from "react";
import { Animated, ActivityIndicator, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { Image } from "expo-image";
import { COLORS } from "@/components/ui/BloomButtonComponents";
import { BLOOM_MOTION } from "@/constants/motion";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type Props = { ready: boolean; message?: string };

/** App readiness gate. It stays visible until auth, profile and navigation are stable. */
export function BloomAppBootstrap({ ready, message }: Props) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
    <Animated.View pointerEvents="auto" style={[StyleSheet.absoluteFill, __a3_styles.overlay, { opacity }]}>
      <View pointerEvents="none" style={__a3_styles.glowOne} />
      <View pointerEvents="none" style={__a3_styles.glowTwo} />
      <View pointerEvents="none" style={__a3_styles.petalOne} />
      <View pointerEvents="none" style={__a3_styles.petalTwo} />
      <View style={__a3_styles.artworkHalo}>
        <Image source={require("../../../assets/images/login-family-icon.png")} style={__a3_styles.artwork} contentFit="contain" transition={0} cachePolicy="memory-disk" />
      </View>
      <Text style={__a3_styles.eyebrow}>FAMILY BLOOM</Text>
      <Text style={__a3_styles.title}>Nhà mình đang nở hoa</Text>
      <Text style={__a3_styles.subtitle}>{message || (ready ? "Mọi thứ đã sẵn sàng…" : "Bloom đang gom những điều thân thương về đúng ngôi nhà của bạn…")}</Text>
      <View style={__a3_styles.spinnerWrap}><ActivityIndicator size="small" color={__a3Colors.primary} /><Text style={__a3_styles.spinnerText}>Một chút thôi nhé</Text></View>
    </Animated.View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  overlay: { backgroundColor: COLORS.softSurface, justifyContent: "center", alignItems: "center", zIndex: 9999, paddingHorizontal: 32, overflow: "hidden" },
  glowOne: { position: "absolute", width: 360, height: 360, borderRadius: 180, backgroundColor: "rgba(255,255,255,0.38)", right: -150, top: -120 },
  glowTwo: { position: "absolute", width: 300, height: 300, borderRadius: 150, backgroundColor: COLORS.iconBackground, left: -170, bottom: -120 },
  petalOne: { position: "absolute", top: "20%", left: "18%", width: 24, height: 11, borderRadius: 999, backgroundColor: COLORS.selectedBackground, transform: [{ rotate: "-24deg" }] },
  petalTwo: { position: "absolute", top: "28%", right: "15%", width: 17, height: 9, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.82)", transform: [{ rotate: "31deg" }] },
  artworkHalo: { width: 190, height: 190, borderRadius: 95, backgroundColor: "rgba(255,255,255,0.4)", alignItems: "center", justifyContent: "center", marginBottom: 22 },
  artwork: { width: 172, height: 172 },
  eyebrow: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900", letterSpacing: 1.4 },
  title: { marginTop: 8, fontSize: 29, lineHeight: 34, fontWeight: "900", color: COLORS.primaryText, textAlign: "center", letterSpacing: -0.6 },
  subtitle: { marginTop: 10, maxWidth: 310, fontSize: 13.5, lineHeight: 20, fontWeight: "600", color: COLORS.secondaryText, textAlign: "center" },
  spinnerWrap: { marginTop: 24, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999 },
  spinnerText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
}));
