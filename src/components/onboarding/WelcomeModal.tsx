import React from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Image } from "expo-image";
import { BloomButton, COLORS } from "@/components/ui/BloomButtonComponents";
import { BLOOM_SUPPER } from "@/constants/bloomSupper";

type Props = { visible: boolean; name?: string; onContinue: () => void };

/** Transient post-auth greeting. It is not a navigation route and should not reappear on app restore. */
export function WelcomeModal({ visible, name, onContinue }: Props) {
  // Keep this as an in-tree overlay: the previous Android native Modal
  // triggered a zero-height React Navigation host after first sign-in (H4).
  // Root navigator layout may temporarily report a height larger than the
  // physical window while auth -> tabs swaps native Screens. Explicit viewport
  // bounds prevent the centered card from appearing BELOW the tabbar.
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  if (!visible) return null;

  return (
    <View
      pointerEvents="auto"
      accessibilityViewIsModal
      style={[styles.overlayHost, { width: windowWidth, height: windowHeight }]}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View pointerEvents="none" style={styles.glowOne} />
          <View pointerEvents="none" style={styles.glowTwo} />
          <View style={styles.artHalo}><Image source={require("../../../assets/images/login-family-icon.png")} style={styles.art} contentFit="contain" transition={0} cachePolicy="memory-disk" /></View>
          <Text style={styles.eyebrow}>CHÀO MỪNG VỀ NHÀ</Text>
          <Text style={styles.title}>Một góc nhỏ để cả nhà luôn gần nhau</Text>
          <Text style={styles.body}>{name ? `${name}, ` : ""}mọi thứ đã sẵn sàng. Mình cùng lưu lại những người thương và những ngày đáng nhớ nhé.</Text>
          <BloomButton title="Vào tổ ấm ngay" onPress={onContinue} customStyle={styles.button} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayHost: { ...StyleSheet.absoluteFillObject, zIndex: 20000, elevation: 20000 },
  backdrop: { flex: 1, backgroundColor: BLOOM_SUPPER.modal.backdrop, justifyContent: "center", padding: 24 },
  card: { overflow: "hidden", backgroundColor: BLOOM_SUPPER.surface.card, borderRadius: BLOOM_SUPPER.radius.modal, padding: 28, alignItems: "center", borderWidth: 1, borderColor: BLOOM_SUPPER.border.card, shadowColor: BLOOM_SUPPER.shadow.color, shadowOpacity: 0.18, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  glowOne: { position: "absolute", width: 190, height: 190, borderRadius: 95, right: -74, top: -96, backgroundColor: BLOOM_SUPPER.modal.glowPink },
  glowTwo: { position: "absolute", width: 130, height: 130, borderRadius: 65, left: -54, bottom: -62, backgroundColor: BLOOM_SUPPER.modal.glowGold },
  artHalo: { width: 132, height: 132, borderRadius: 66, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  art: { width: 120, height: 120 },
  eyebrow: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 1.1, marginBottom: 6 },
  title: { fontSize: 23, lineHeight: 28, fontWeight: "900", color: COLORS.primaryText, textAlign: "center" },
  body: { marginTop: 10, fontSize: 15, lineHeight: 22, color: COLORS.secondaryText, textAlign: "center" },
  button: { width: "100%", marginTop: 24 },
});
