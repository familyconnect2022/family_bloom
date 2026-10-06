import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomButton } from "../../../components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import type { UserFamilyMembership } from "../../../types";

const ROLE_LABEL: Record<string, string> = { owner: "Chủ nhà", admin: "Người giữ nhà", member: "Thành viên", child: "Thành viên nhỏ" };

export default function FamilySelectScreen() {
  const router = useRouter();
  const { families, familyTransition, switchFamily, logout } = useAuth();
  const busy = !!familyTransition;

  const choose = async (item: UserFamilyMembership) => {
    if (busy) return;
    const ok = await switchFamily(item.familyId);
    if (ok) router.replace("/(tabs)" as never);
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="CHỌN NGÔI NHÀ ĐỂ TIẾP TỤC"
        title="Bạn muốn trở về nhà nào?"
        subtitle="Bloom không tự đoán khi bạn có nhiều gia đình. Chọn đúng mái nhà rồi mình tiếp tục câu chuyện ở đó."
        variant="family"
      />
      <View style={styles.pageBody}>
      <FlatList
        data={families}
        keyExtractor={(item) => item.familyId}
        renderItem={({ item }) => (
          <Pressable disabled={busy} onPress={() => void choose(item)} style={({ pressed }) => [styles.card, pressed && !busy && styles.pressed]}>
            <View style={styles.cardIcon}><Ionicons name="home" size={20} color={COLORS.primary} /></View>
            <View style={styles.cardCopy}>
              <Text style={styles.familyName}>{item.familyName}</Text>
              <Text style={styles.role}>{ROLE_LABEL[item.role] ?? "Thành viên"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} />
          </Pressable>
        )}
        contentContainerStyle={styles.list}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
      />

      <View style={styles.footer}>
        <BloomButton title="Tham gia / tạo nhà khác" variant="outline" onPress={() => router.push("/family-memberships" as never)} disabled={busy} />
        <BloomButton title="Đăng xuất" variant="link" onPress={() => void logout()} disabled={busy} />
      </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageBody: { flex: 1, marginTop: -24, paddingHorizontal: 16, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", backgroundColor: COLORS.background },
  header: { alignItems: "center", paddingHorizontal: 18, paddingTop: 28, paddingBottom: 18 },
  heroIcon: { width: 64, height: 64, borderRadius: 24, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  title: { marginTop: 5, color: COLORS.primaryText, fontSize: 25, fontWeight: "900", textAlign: "center" },
  subtitle: { marginTop: 8, color: COLORS.secondaryText, fontSize: 13.5, lineHeight: 20, textAlign: "center" },
  list: { gap: 10, paddingVertical: 8, paddingBottom: 18 },
  card: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1 },
  familyName: { color: COLORS.primaryText, fontSize: 16, fontWeight: "800" },
  role: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "600" },
  footer: { gap: 4, paddingBottom: 12 },
  pressed: { opacity: 0.72 },
});
