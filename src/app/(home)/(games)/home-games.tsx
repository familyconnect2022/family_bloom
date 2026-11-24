import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { Image, ScrollView, StyleSheet, View } from "react-native";
import { BloomText as Text } from "../../../components/ui/BloomText";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomCard, BloomSectionHeader } from "../../../components/ui/BloomPageComponents";
import { COLORS } from "../../../constants/theme";
import { useA3Theme } from "../../../appearance3/useAppearance3";
import { useA3LegacyStyles } from "../../../appearance3/compatReactiveStyles";
import { createBloomStyles } from "../../../theme/createBloomStyles";

/** FB-10: Android games contain Chess and Xiangqi only.
 * Both keep their established native boards, invitation and Render backends.
 * Legacy mini-game records in Firestore are left untouched for safe migration.
 */
export default function HomeGamesScreen() {
  const theme = useA3Theme();
  const styles = useA3LegacyStyles(baseStyles);
  const router = useRouter();
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={theme.colors.background}>
      <StatusBar style={theme.resolvedMode === "dark" ? "light" : "dark"} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="TRÒ CHƠI NHÀ MÌNH"
          title="Hai bàn cờ, một mái nhà"
          subtitle="Cờ vua và Cờ tướng — cùng người thân so tài, kết nối và lưu những ván cờ đáng nhớ."
          variant="game"
          onBack={() => router.back()}
          roundedBottom compact
        />
        <View style={styles.body}>
          <BloomSectionHeader title="Chọn bàn cờ" subtitle="Mời người thân và cùng chơi trực tuyến" />
          <View style={styles.row}>
            <BloomCard style={styles.card} shape="storybook" onPress={() => router.push("/home-chess" as never)}>
              <View style={styles.icon}><Image accessibilityLabel="Quân Tốt cờ vua" source={require("../../../../assets/images/chess/pieces-png-default/bp.png")} resizeMode="contain" style={styles.piece} /></View>
              <Text style={styles.title}>Cờ vua</Text>
              <Text style={styles.description}>Chọn người thân, thách đấu và trở lại ván đang chơi.</Text>
              <View style={styles.action}><Text style={styles.actionText}>Vào bàn cờ</Text><Ionicons name="arrow-forward" size={15} color={theme.colors.white} /></View>
            </BloomCard>
            <BloomCard style={styles.card} shape="ticket" onPress={() => router.push("/home-xiangqi" as never)}>
              <View style={styles.icon}><Image accessibilityLabel="Quân Tướng cờ tướng" source={require("../../../../assets/xiangqi/red_general.png")} resizeMode="contain" style={styles.piece} /></View>
              <Text style={styles.title}>Cờ tướng</Text>
              <Text style={styles.description}>So tài cờ tướng trên bàn cờ riêng của Nhà Mình.</Text>
              <View style={styles.action}><Text style={styles.actionText}>Vào bàn cờ</Text><Ionicons name="arrow-forward" size={15} color={theme.colors.white} /></View>
            </BloomCard>
          </View>
          <BloomCard tone="soft" style={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.noteText}>Chọn một trò cờ để mời người thân cùng chơi hoặc tiếp tục ván cờ của bạn.</Text>
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
const baseStyles = createBloomStyles(() => StyleSheet.create({
  content: { paddingBottom: 50 },
  body: { paddingHorizontal: 16, paddingTop: 20, gap: 20 },
  row: { flexDirection: "row", gap: 12 },
  card: { flex: 1, minWidth: 0, minHeight: 244, alignItems: "center", gap: 10, padding: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  icon: { width: 66, height: 66, borderRadius: 20, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  piece: { width: 57, height: 57 },
  title: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  description: { flex: 1, minHeight: 68, color: COLORS.secondaryText, fontSize: 11, lineHeight: 17, textAlign: "center" },
  action: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 10, minHeight: 40, marginTop: "auto", borderRadius: 13, backgroundColor: COLORS.primary, alignSelf: "stretch" },
  actionText: { color: COLORS.white, fontWeight: "900", fontSize: 11.5 },
  note: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 12, lineHeight: 18 },
}));
