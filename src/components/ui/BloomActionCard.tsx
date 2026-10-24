import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";

/** A single prominent, accessible CTA for creation flows. No remote assets or animation loops. */
export const BloomActionCard = memo(function BloomActionCard({
  icon, title, subtitle, onPress, testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View pointerEvents="none" style={styles.glow} />
      <View style={styles.icon}><Ionicons name={icon} size={24} color={COLORS.white} /></View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>CÙNG BLOOM GIEO ĐIỀU MỚI <Ionicons name="sparkles" size={11} /></Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.arrow}><Ionicons name="add" size={21} color={COLORS.primaryText} /></View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { minHeight: 86, marginBottom: 14, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5, borderColor: "#D96992", backgroundColor: "#FFE2EE", shadowColor: "#A44B73", shadowOpacity: 0.17, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  glow: { position: "absolute", width: 130, height: 130, right: -28, top: -65, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.45)" },
  icon: { height: 48, width: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#D95A88" },
  copy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 8.5, fontWeight: "900", letterSpacing: 0.55, color: "#BE527A" },
  title: { marginTop: 4, fontSize: 15.5, fontWeight: "900", color: COLORS.primaryText },
  subtitle: { marginTop: 3, fontSize: 10.5, lineHeight: 15, color: COLORS.secondaryText },
  arrow: { height: 34, width: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.88)" },
  pressed: { opacity: 0.84, transform: [{ scale: 0.992 }] },
});
