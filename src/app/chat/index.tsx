import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import {
  BloomBackButton,
  BloomCard,
  BloomEmptyState,
  BloomListRow,
  BloomPageHeader,
  BloomPill,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

export default function ChatScreen() {
  const router = useRouter();
  const { families, activeFamilyId } = useAuth();
  const membership = families.find((item) => item.familyId === activeFamilyId);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow="Kết nối"
          title="Trò chuyện"
          subtitle="Một góc riêng để cả nhà luôn gần nhau hơn."
          right={<BloomBackButton onPress={() => router.back()} />}
        />

        <BloomCard tone="accent" style={styles.familyCard}>
          <View style={styles.familyTop}>
            <View style={styles.familyIcon}>
              <Ionicons name="chatbubbles-outline" size={26} color={COLORS.primaryText} />
            </View>
            <View style={styles.familyCopy}>
              <Text style={styles.familyLabel}>PHÒNG CỦA NHÀ</Text>
              <Text style={styles.familyName}>{membership?.familyName || "Gia đình của mình"}</Text>
            </View>
          </View>
          <View style={styles.pills}>
            <BloomPill icon="people-outline" label="Dành cho thành viên trong nhà" />
          </View>
        </BloomCard>

        <View style={styles.section}>
          <BloomSectionHeader title="Cuộc trò chuyện" subtitle="Tin nhắn của gia đình sẽ được sắp xếp tại đây" />
          <BloomEmptyState
            icon="chatbubble-ellipses-outline"
            title="Chưa có cuộc trò chuyện nào"
            description="Khi nhà mình bắt đầu trò chuyện, nội dung gần nhất sẽ xuất hiện tại đây."
          />
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Trong lúc chờ nhau" subtitle="Bạn vẫn có thể ghé những góc đang hoạt động của Family Bloom" />
          <BloomCard>
            <BloomListRow
              icon="images-outline"
              title="Khoảnh khắc gia đình"
              subtitle="Xem ảnh, video và câu chuyện mới"
              onPress={() => router.push("/(tabs)/moments" as never)}
            />
            <View style={styles.divider} />
            <BloomListRow
              icon="people-outline"
              title="Cây nhà"
              subtitle="Xem thông tin và vai trò thành viên"
              onPress={() => router.push("/(tabs)/family" as never)}
            />
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  familyCard: { marginBottom: 26 },
  familyTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  familyIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  familyCopy: { flex: 1 },
  familyLabel: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  familyName: { marginTop: 4, color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  pills: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  section: { marginBottom: 26 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },
});
