import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";

type BloomLoadingOverlayProps = {
  visible: boolean;
  title: string;
  message?: string;
  icon?: ComponentProps<typeof Ionicons>["name"];
};

/**
 * A single Bloom Supper loading surface for transitions that must briefly block interaction.
 * Copy should describe what Bloom is doing in warm language; technical diagnostics stay in logs.
 */
export function BloomLoadingOverlay({
  visible,
  title,
  message = "Một chút thôi nhé, Bloom đang đưa mọi thứ về đúng chỗ.",
  icon = "flower-outline",
}: BloomLoadingOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View pointerEvents="none" style={styles.glowOne} />
          <View pointerEvents="none" style={styles.glowTwo} />
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={27} color={COLORS.primary} />
          </View>
          <Text style={styles.eyebrow}>FAMILY BLOOM</Text>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.progressRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.message}>{message}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    backgroundColor: BLOOM_SUPPER.modal.backdrop,
  },
  card: {
    width: "100%",
    maxWidth: 370,
    borderRadius: BLOOM_SUPPER.radius.modal,
    paddingHorizontal: 24,
    paddingTop: 25,
    paddingBottom: 23,
    backgroundColor: BLOOM_SUPPER.surface.card,
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.card,
    shadowColor: BLOOM_SUPPER.shadow.color,
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    overflow: "hidden",
    alignItems: "center",
  },
  glowOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: BLOOM_SUPPER.modal.glowPink, right: -72, top: -94 },
  glowTwo: { position: "absolute", width: 120, height: 120, borderRadius: 60, backgroundColor: BLOOM_SUPPER.modal.glowGold, left: -50, bottom: -58 },
  iconWrap: { width: 60, height: 60, borderRadius: 22, backgroundColor: BLOOM_SUPPER.surface.icon, borderWidth: 1, borderColor: BLOOM_SUPPER.border.icon, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1.05 },
  title: { marginTop: 6, color: COLORS.primaryText, fontSize: 18, lineHeight: 24, fontWeight: "900", textAlign: "center" },
  progressRow: { marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  message: { flexShrink: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "700", textAlign: "center" },
});
