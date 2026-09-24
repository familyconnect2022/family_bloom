import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import {
  BloomBackButton,
  BloomCard,
  BloomEmptyState,
  BloomListRow,
  BloomPageHeader,
  BloomPill,
  BloomSectionHeader,
} from "../components/ui/BloomPageComponents";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";

export default function Notifications() {
  const router = useRouter();
  const { families, activeFamilyId } = useAuth();
  const membership = families.find((item) => item.familyId === activeFamilyId);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow="Gia đình"
          title="Thông báo"
          subtitle="Những điều quan trọng của nhà mình sẽ được gom lại tại đây."
          right={<BloomBackButton onPress={() => router.back()} />}
        />

        <BloomCard tone="accent" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}>
              <Ionicons name="notifications-outline" size={25} color={COLORS.primaryText} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>ĐANG THEO DÕI</Text>
              <Text style={styles.heroTitle}>{membership?.familyName || "Gia đình của mình"}</Text>
            </View>
          </View>
          <View style={styles.pillRow}>
            <BloomPill icon="checkmark-circle-outline" label="Không có thông báo mới" />
          </View>
        </BloomCard>

        <View style={styles.section}>
          <BloomSectionHeader title="Hộp thư gia đình" subtitle="Thông báo mới nhất sẽ xuất hiện ở đầu danh sách" />
          <BloomEmptyState
            icon="mail-open-outline"
            title="Mọi thứ đang yên bình"
            description="Hiện chưa có thông báo mới từ gia đình. Khi có hoạt động cần chú ý, bạn sẽ thấy tại đây."
          />
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Những loại thông báo bạn sẽ thấy" />
          <BloomCard>
            <BloomListRow
              icon="person-add-outline"
              title="Thành viên"
              subtitle="Yêu cầu gia nhập và thay đổi liên quan đến nhà"
            />
            <View style={styles.divider} />
            <BloomListRow
              icon="calendar-outline"
              title="Lịch nhà"
              subtitle="Những ngày quan trọng và kế hoạch chung"
            />
            <View style={styles.divider} />
            <BloomListRow
              icon="images-outline"
              title="Khoảnh khắc"
              subtitle="Hoạt động mới trên tường gia đình"
            />
          </BloomCard>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  heroCard: { marginBottom: 26 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  heroCopy: { flex: 1 },
  heroLabel: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  heroTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  pillRow: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  section: { marginBottom: 26 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 56 },
});
