import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import {
  BloomCard,
  BloomPageHeader,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";

type PlayCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  tag: string;
};

function PlayCard({ icon, title, description, tag }: PlayCardProps) {
  return (
    <BloomCard style={styles.playCard}>
      <View style={styles.playIcon}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.playCopy}>
        <View style={styles.titleRow}>
          <Text style={styles.playTitle}>{title}</Text>
          <View style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
        </View>
        <Text style={styles.playDescription}>{description}</Text>
      </View>
    </BloomCard>
  );
}

export default function PlayScreen() {
  useTabStartupTask("play");
  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow="Thư giãn"
          title="Góc chơi 🎈"
          subtitle="Những hoạt động nhỏ để cả nhà có thêm chuyện để cười cùng nhau."
        />

        <BloomCard tone="accent" style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="happy-outline" size={30} color={COLORS.primaryText} />
          </View>
          <Text style={styles.heroTitle}>Một chút vui cho cả nhà</Text>
          <Text style={styles.heroText}>
            Family Bloom sẽ gom các trò chơi nhẹ, câu hỏi kết nối và thử thách gia đình vào không gian này.
          </Text>
        </BloomCard>

        <View style={styles.section}>
          <BloomSectionHeader title="Sắp có trong Góc chơi" subtitle="Ưu tiên những hoạt động đơn giản, vui và dễ chơi cùng nhau" />
          <View style={styles.list}>
            <PlayCard
              icon="help-circle-outline"
              title="Hỏi nhau một câu"
              description="Những câu hỏi ngắn giúp mọi người biết thêm một điều thú vị về nhau."
              tag="Sắp mở"
            />
            <PlayCard
              icon="shuffle-outline"
              title="Bốc thăm vui"
              description="Chọn ngẫu nhiên một người, một nhiệm vụ hoặc một hoạt động cho cả nhà."
              tag="Sắp mở"
            />
            <PlayCard
              icon="trophy-outline"
              title="Thử thách gia đình"
              description="Những thử thách nhỏ theo ngày hoặc cuối tuần để cùng tạo thêm kỷ niệm."
              tag="Sắp mở"
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  hero: { alignItems: "center", marginBottom: 25, paddingVertical: 24 },
  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.76)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },
  heroTitle: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  heroText: { marginTop: 7, maxWidth: 275, color: COLORS.primaryText, opacity: 0.76, fontSize: 12.5, lineHeight: 18, textAlign: "center" },
  section: { marginBottom: 24 },
  list: { gap: 10 },
  playCard: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 15 },
  playIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  playCopy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  playTitle: { flex: 1, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  playDescription: { marginTop: 5, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  tag: { backgroundColor: COLORS.softSurface, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  tagText: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", textTransform: "uppercase" },
});
