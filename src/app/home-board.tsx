import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { BloomCard, BloomPill, BloomSectionHeader } from "../components/ui/BloomPageComponents";
import { COLORS } from "../constants/theme";

const FEED_PREVIEW = [
  { icon: "megaphone-outline" as const, title: "Thông báo chung", text: "Một nơi cho những điều cả nhà cần biết, không trôi mất giữa các cuộc trò chuyện.", tone: "#FFF0F4" },
  { icon: "calendar-outline" as const, title: "Lời nhắc từ lịch", text: "Những sự kiện sắp tới có thể xuất hiện ở đây theo cách ngắn gọn và dễ nhìn.", tone: "#FFF6E9" },
  { icon: "heart-circle-outline" as const, title: "Tin vui trong nhà", text: "Một thành viên mới, một cột mốc đẹp hoặc điều đáng mừng có thể được cả nhà cùng thấy.", tone: "#F0F8F3" },
];

export default function HomeBoardScreen() {
  const router = useRouter();
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="BẢNG TIN NHÀ MÌNH"
          title="Chuyện cần cả nhà để ý"
          subtitle="Tin quan trọng, lời nhắc và những điều đáng nhớ được gom lại thật gọn để ai cũng dễ theo dõi."
          variant="notice"
          onBack={() => router.back()}
          roundedBottom
          compact
        />

        <View style={styles.body}>
          <View style={styles.previewRow}>
            <BloomPill icon="color-palette-outline" label="Bloom Supper UI" />
            <BloomPill icon="construct-outline" label="Nội dung sẽ chốt sau" />
          </View>

          <BloomCard style={styles.pinnedCard}>
            <View style={styles.pinnedTop}>
              <View style={styles.pinIcon}><Ionicons name="pin" size={18} color={COLORS.primary} /></View>
              <Text style={styles.pinnedLabel}>MẪU · ĐƯỢC GHIM</Text>
            </View>
            <Text style={styles.pinnedTitle}>Một nơi thật rõ ràng cho những điều quan trọng</Text>
            <Text style={styles.pinnedText}>Bản này mới dựng trải nghiệm thị giác. Khi bạn trình bày luồng Bảng tin cụ thể, nội dung thật sẽ thay thế hoàn toàn dữ liệu mẫu này.</Text>
            <View style={styles.pinnedMeta}>
              <Ionicons name="people-outline" size={15} color={COLORS.primary} />
              <Text style={styles.pinnedMetaText}>Cả gia đình</Text>
              <View style={styles.dot} />
              <Text style={styles.pinnedMetaText}>Vừa cập nhật</Text>
            </View>
          </BloomCard>

          <BloomSectionHeader title="Bảng tin có thể kể nhiều kiểu chuyện" subtitle="Khung giao diện đã sẵn sàng để bạn quyết định loại nội dung nào thực sự cần xuất hiện" />
          <View style={styles.list}>
            {FEED_PREVIEW.map((item) => (
              <BloomCard key={item.title} style={styles.feedCard}>
                <View style={[styles.feedIcon, { backgroundColor: item.tone }]}><Ionicons name={item.icon} size={22} color={COLORS.primaryText} /></View>
                <View style={styles.feedCopy}>
                  <Text style={styles.feedTitle}>{item.title}</Text>
                  <Text style={styles.feedText}>{item.text}</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={COLORS.primary} />
              </BloomCard>
            ))}
          </View>

          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="sparkles-outline" size={20} color={COLORS.primary} />
            <Text style={styles.noteText}>Phase 14B.1 chỉ chốt hình thức. Quyền tạo tin, ghim, phạm vi người xem và nguồn tự động sẽ chờ ý tưởng cụ thể của bạn.</Text>
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 17 },
  previewRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pinnedCard: { gap: 10, padding: 17, backgroundColor: "#FFF9FB" },
  pinnedTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  pinIcon: { width: 34, height: 34, borderRadius: 13, backgroundColor: COLORS.surfaceFocus, alignItems: "center", justifyContent: "center" },
  pinnedLabel: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  pinnedTitle: { color: COLORS.primaryText, fontSize: 18, lineHeight: 24, fontWeight: "900" },
  pinnedText: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 18 },
  pinnedMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2 },
  pinnedMetaText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.inputBorder },
  list: { gap: 10 },
  feedCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  feedIcon: { width: 48, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  feedCopy: { flex: 1 },
  feedTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  feedText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
});
