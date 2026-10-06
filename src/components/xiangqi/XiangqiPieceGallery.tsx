import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BloomCard } from "../ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { XiangqiPiece, type XiangqiColor, type XiangqiPieceState, type XiangqiPieceType } from "./XiangqiPiece";

const PIECES: Array<{ type: XiangqiPieceType; label: string }> = [
  { type: "general", label: "Tướng" },
  { type: "advisor", label: "Sĩ" },
  { type: "elephant", label: "Tượng" },
  { type: "chariot", label: "Xe" },
  { type: "horse", label: "Mã" },
  { type: "cannon", label: "Pháo" },
  { type: "soldier", label: "Tốt" },
];

const STATES: Array<{ state: XiangqiPieceState; label: string }> = [
  { state: "normal", label: "Bình thường" },
  { state: "selected", label: "Đang chọn" },
  { state: "hint", label: "Gợi ý" },
  { state: "drag", label: "Đang kéo" },
  { state: "disabled", label: "Tạm khóa" },
];

function PieceRow({ color, size }: { color: XiangqiColor; size: number }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pieceRail}>
      {PIECES.map(item => (
        <View key={`${color}-${item.type}`} style={styles.pieceCell}>
          <XiangqiPiece color={color} type={item.type} size={size} />
          <Text style={styles.pieceLabel}>{item.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export function XiangqiPieceGallery({ size }: { size: number }) {
  return (
    <View style={styles.stack}>
      <BloomCard style={styles.card}>
        <Text style={styles.kicker}>BÊN ĐỎ</Text>
        <Text style={styles.title}>Bộ quân Đỏ</Text>
        <Text style={styles.copy}>Đây là chính bộ hình Bloom sẽ dùng trên bàn cờ thật.</Text>
        <PieceRow color="red" size={size} />
      </BloomCard>

      <BloomCard style={styles.card}>
        <Text style={styles.kicker}>BÊN ĐEN</Text>
        <Text style={styles.title}>Bộ quân Đen</Text>
        <Text style={styles.copy}>Nét chữ và chất gỗ được giữ nguyên, không phụ thuộc font chữ trên từng máy.</Text>
        <PieceRow color="black" size={size} />
      </BloomCard>

      <BloomCard style={styles.card}>
        <Text style={styles.kicker}>TRẠNG THÁI THẬT</Text>
        <Text style={styles.title}>Một quân, năm trạng thái</Text>
        <Text style={styles.copy}>Hiệu ứng chỉ bao quanh quân; bản thân hình quân vẫn luôn giữ nguyên.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateRail}>
          {STATES.map(item => (
            <View key={item.state} style={styles.stateCell}>
              <XiangqiPiece color="red" type="general" size={Math.max(52, size)} state={item.state} />
              <Text style={styles.stateLabel}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      </BloomCard>
    </View>
  );
}

export const XIANGQI_GALLERY_PIECES = PIECES;
export const XIANGQI_GALLERY_STATES = STATES;

const styles = StyleSheet.create({
  stack: { gap: 14 },
  card: { padding: 16, gap: 7, overflow: "hidden" },
  kicker: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.9 },
  title: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  copy: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 18 },
  pieceRail: { paddingTop: 10, paddingBottom: 2, gap: 10, paddingRight: 12 },
  pieceCell: { minWidth: 72, alignItems: "center", gap: 6 },
  pieceLabel: { color: COLORS.primaryText, fontSize: 11, fontWeight: "800" },
  stateRail: { paddingTop: 12, paddingBottom: 4, gap: 18, paddingRight: 16 },
  stateCell: { minWidth: 84, minHeight: 102, alignItems: "center", justifyContent: "flex-end", gap: 8 },
  stateLabel: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
});
