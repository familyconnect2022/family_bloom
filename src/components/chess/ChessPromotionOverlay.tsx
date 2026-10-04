import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import type { ChessColor, ChessPromotionPiece } from "../../types/chess";

const PROMOTION_IMAGES = {
  wq: require("../../../assets/images/chess/pieces-webp-default/wq.webp"),
  wr: require("../../../assets/images/chess/pieces-webp-default/wr.webp"),
  wb: require("../../../assets/images/chess/pieces-webp-default/wb.webp"),
  wn: require("../../../assets/images/chess/pieces-webp-default/wn.webp"),
  bq: require("../../../assets/images/chess/pieces-webp-default/bq.webp"),
  br: require("../../../assets/images/chess/pieces-webp-default/br.webp"),
  bb: require("../../../assets/images/chess/pieces-webp-default/bb.webp"),
  bn: require("../../../assets/images/chess/pieces-webp-default/bn.webp"),
} as const;

const OPTIONS: { piece: ChessPromotionPiece; accessibilityLabel: string }[] = [
  { piece: "q", accessibilityLabel: "Phong Hậu" },
  { piece: "r", accessibilityLabel: "Phong Xe" },
  { piece: "b", accessibilityLabel: "Phong Tượng" },
  { piece: "n", accessibilityLabel: "Phong Mã" },
];

export const ChessPromotionOverlay = React.memo(function ChessPromotionOverlay({
  visible,
  color,
  onSelect,
}: {
  visible: boolean;
  color: ChessColor;
  onSelect: (piece: ChessPromotionPiece) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => undefined}
    >
      <View style={styles.overlay} pointerEvents="auto">
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Phong quân</Text>
          <Text style={styles.subtitle}>Chạm vào quân bạn muốn chọn</Text>

          <View style={styles.options}>
            {OPTIONS.map(({ piece, accessibilityLabel }) => {
              const key = `${color}${piece}` as keyof typeof PROMOTION_IMAGES;
              return (
                <Pressable
                  key={piece}
                  accessibilityRole="button"
                  accessibilityLabel={accessibilityLabel}
                  onPress={() => onSelect(piece)}
                  style={({ pressed }) => [styles.pieceButton, pressed && styles.pieceButtonPressed]}
                >
                  <Image source={PROMOTION_IMAGES[key]} style={styles.pieceImage} resizeMode="contain" fadeDuration={0} />
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 900,
    elevation: 90,
    backgroundColor: "rgba(75,38,54,0.22)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 370,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "#EEC8D7",
    backgroundColor: "#FFFDFE",
    paddingHorizontal: 16,
    paddingTop: 19,
    paddingBottom: 18,
    alignItems: "center",
    shadowColor: "#744257",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 9 },
    elevation: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 17,
    backgroundColor: "#FFEAF2",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { marginTop: 8, fontSize: 21, lineHeight: 26, fontWeight: "900", color: COLORS.primaryText },
  subtitle: { marginTop: 3, fontSize: 11.5, lineHeight: 17, fontWeight: "700", color: COLORS.secondaryText, textAlign: "center" },
  options: { width: "100%", marginTop: 16, flexDirection: "row", gap: 8 },
  pieceButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 19,
    borderWidth: 1.2,
    borderColor: "#EFCFDC",
    backgroundColor: "#FFF6F9",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pieceButtonPressed: { transform: [{ scale: 0.94 }], backgroundColor: "#FDE8F0", borderColor: "#E58BAA" },
  pieceImage: { width: "90%", height: "90%" },
});
