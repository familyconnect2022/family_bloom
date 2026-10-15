import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/theme";

export const XIANGQI_GAME_HEADER_BODY_HEIGHT = 46;

export const XiangqiGameHeader = React.memo(function XiangqiGameHeader({
  opponentName,
  subtitle,
  onBack,
}: {
  opponentName: string;
  subtitle?: string | null;
  onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { height: insets.top + XIANGQI_GAME_HEADER_BODY_HEIGHT, paddingTop: insets.top }]}> 
      <View style={styles.body}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          disabled={!onBack}
          onPress={onBack}
          style={[styles.back, !onBack && styles.backHidden]}
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.primaryText} />
        </Pressable>
        <View style={styles.copy}>
          <Text style={styles.eyebrow}>CỜ TƯỚNG NHÀ MÌNH</Text>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.title}>Ván với {opponentName}</Text>
            <Text numberOfLines={1} style={styles.subtitle}>{subtitle || " "}</Text>
          </View>
        </View>
        <View style={styles.rightMark} pointerEvents="none">
          <Ionicons name="flower-outline" size={17} color="#B65A80" />
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: "100%", backgroundColor: "#FFF8FB", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F0DCE4" },
  body: { height: XIANGQI_GAME_HEADER_BODY_HEIGHT, paddingHorizontal: 8, flexDirection: "row", alignItems: "center", gap: 7 },
  back: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FBEAF1" },
  backHidden: { opacity: 0 },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { color: "#B15C7F", fontSize: 8, lineHeight: 10, fontWeight: "900", letterSpacing: 0.75 },
  titleRow: { marginTop: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7 },
  title: { flexShrink: 1, color: COLORS.primaryText, fontSize: 13.5, lineHeight: 17, fontWeight: "900" },
  subtitle: { flexShrink: 1, color: COLORS.secondaryText, opacity: 0.72, fontSize: 9.5, lineHeight: 13, fontWeight: "800" },
  rightMark: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F6" },
});
