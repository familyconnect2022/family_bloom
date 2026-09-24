import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import {
  BloomCard,
  BloomEmptyState,
  BloomPageHeader,
  BloomPill,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";

const roleLabel: Record<string, string> = {
  owner: "Chủ nhà",
  admin: "Quản trị viên",
  member: "Thành viên",
  child: "Thành viên nhỏ",
};

export default function FamilyScreen() {
  useTabStartupTask("family");
  const router = useRouter();
  const { userProfile, families } = useAuth();
  const membership = families.find((item) => item.familyId === userProfile?.activeFamilyId);
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const familyId = userProfile?.activeFamilyId ?? null;
  const { members } = useFamilyMembers(familyId);

  const sortedMembers = useMemo(() => [...members].sort((a, b) => {
    const weight = (role: string) => role === "owner" ? 0 : role === "admin" ? 1 : role === "member" ? 2 : 3;
    return weight(a.role) - weight(b.role) || a.displayName.localeCompare(b.displayName, "vi");
  }), [members]);

  const openFamilyGraph = useCallback(() => {
    // Navigation must never depend on a Firestore probe. The graph screen already
    // owns loading/empty/error states and offers the builder CTA for admins when empty.
    router.push("/family-graph" as never);
  }, [router]);

  const openGraphAdmin = useCallback(() => {
    if (!familyId) return;
    router.push({ pathname: "/family-graph-admin", params: { from: "family" } } as never);
  }, [familyId, router]);

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow="Gia đình"
          title="Cây nhà 🌿"
          subtitle="Một nơi để nhìn thấy mọi người, vai trò và những kết nối trong gia đình."
        />

        <BloomCard tone="accent" style={styles.activeFamilyCard}>
          <View style={styles.familyTop}>
            <View style={styles.familyIcon}>
              <Ionicons name="home" size={25} color={COLORS.primaryText} />
            </View>
            <View style={styles.familyCopy}>
              <Text style={styles.familyLabel}>NHÀ ĐANG XEM</Text>
              <Text style={styles.familyName}>{membership?.familyName || "Gia đình của mình"}</Text>
            </View>
          </View>
          <View style={styles.pills}>
            <BloomPill
              icon="shield-checkmark-outline"
              label={membership?.role ? roleLabel[membership.role] ?? "Thành viên" : "Thành viên"}
            />
            <BloomPill icon="layers-outline" label={`${families.length || 1} nhà`} />
          </View>
        </BloomCard>

        <View style={styles.section}>
          <BloomSectionHeader
            title="Thành viên trong nhà"
            subtitle={sortedMembers.length ? `${sortedMembers.length} người đang cùng ở trong tổ ấm này` : "Bloom đang tải danh sách thành viên"}
          />
          {sortedMembers.length ? (
            <BloomCard style={styles.membersCard}>
              {sortedMembers.map((member, index) => (
                <View key={member.uid}>
                  <Pressable
                    onPress={() => router.push(`/member/${member.uid}` as never)}
                    style={({ pressed }) => [styles.memberRow, pressed && styles.memberRowPressed]}
                  >
                    <View style={styles.memberAvatar}>
                      {member.avatarUrl ? (
                        <Image source={{ uri: member.avatarUrl }} style={styles.memberAvatarImage} contentFit="cover" />
                      ) : (
                        <Text style={styles.memberInitial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={styles.memberCopy}>
                      <Text style={styles.memberName}>{member.displayName}</Text>
                      <Text style={styles.memberMeta}>
                        {member.shortName ? `${member.shortName} · ` : ""}{roleLabel[member.role] ?? "Thành viên"}
                      </Text>
                    </View>
                    <View style={styles.memberRolePill}>
                      <Text style={styles.memberRoleText}>{roleLabel[member.role] ?? "Thành viên"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={COLORS.secondaryText} />
                  </Pressable>
                  {index < sortedMembers.length - 1 && <View style={styles.memberDivider} />}
                </View>
              ))}
            </BloomCard>
          ) : (
            <BloomEmptyState
              icon="people-outline"
              title="Đang tìm mọi người trong nhà"
              description="Danh sách sẽ tự cập nhật khi thành viên được duyệt vào gia đình."
              compact
            />
          )}
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <BloomSectionHeader title="Quản lý nhà" subtitle="Các công việc dành cho quản trị viên" />
            <BloomCard onPress={() => router.push("/family-join-requests")} style={styles.managementCard}>
              <View style={styles.managementIcon}>
                <Ionicons name="person-add-outline" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.managementCopy}>
                <Text style={styles.managementTitle}>Duyệt thành viên</Text>
                <Text style={styles.managementText}>Xem hồ sơ của những người đang xin vào nhà.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.secondaryText} />
            </BloomCard>
          </View>
        )}

        <View style={styles.section}>
          <BloomSectionHeader
            title="Phả hệ gia đình"
            subtitle="Nơi Bloom cùng bạn lưu lại các thế hệ trong gia đình"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở cây phả hệ gia đình"
            onPress={openFamilyGraph}
            style={({ pressed }) => [
              styles.genealogyHero,
              pressed && styles.genealogyHeroPressed,
            ]}
          >
            <View pointerEvents="none" style={styles.heroGlowOne} />
            <View pointerEvents="none" style={styles.heroGlowTwo} />
            <View pointerEvents="none" style={styles.heroSparkle}>
              <Ionicons name="sparkles" size={14} color={COLORS.primary} />
            </View>

            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="leaf-outline" size={14} color={COLORS.primaryText} />
                <Text style={styles.heroBadgeText}>DÒNG CHẢY GIA ĐÌNH</Text>
              </View>
              <View style={styles.heroArrowBubble}>
                <Ionicons name="arrow-forward" size={19} color={COLORS.primaryText} />
              </View>
            </View>

            <View style={styles.heroBody}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>Mở cây phả hệ</Text>
                <Text style={styles.heroSubtitle}>
                  Nhìn lại các thế hệ, lần theo từng nhánh và hiểu mối quan hệ giữa mọi người trong nhà.
                </Text>
              </View>

              <View pointerEvents="none" style={styles.miniTree}>
                <View style={[styles.miniTreeNode, styles.miniTreeNodeTopLeft]}>
                  <Ionicons name="person" size={12} color={COLORS.primaryText} />
                </View>
                <View style={[styles.miniTreeNode, styles.miniTreeNodeTopRight]}>
                  <Ionicons name="person" size={12} color={COLORS.primaryText} />
                </View>
                <View style={styles.miniTreePartnerLine} />
                <View style={styles.miniTreeStem} />
                <View style={styles.miniTreeBranch} />
                <View style={[styles.miniTreeNodeSmall, styles.miniTreeNodeBottomLeft]} />
                <View style={[styles.miniTreeNodeSmall, styles.miniTreeNodeBottomCenter]} />
                <View style={[styles.miniTreeNodeSmall, styles.miniTreeNodeBottomRight]} />
              </View>
            </View>

            <View style={styles.heroFeatureRow}>
              <View style={styles.heroFeaturePill}>
                <Ionicons name="layers-outline" size={14} color={COLORS.primaryText} />
                <Text style={styles.heroFeatureText}>3 / 5 thế hệ</Text>
              </View>
              <View style={styles.heroFeaturePill}>
                <Ionicons name="git-network-outline" size={14} color={COLORS.primaryText} />
                <Text style={styles.heroFeatureText}>Tìm quan hệ</Text>
              </View>
              <View style={styles.heroFeaturePill}>
                <Ionicons name="albums-outline" size={14} color={COLORS.primaryText} />
                <Text style={styles.heroFeatureText}>Ký ức từng người</Text>
              </View>
            </View>

            <View style={styles.heroCtaRow}>
              <Text style={styles.heroCtaText}>
                Chạm để bước vào phả hệ
              </Text>
              <Ionicons name="chevron-forward" size={17} color={COLORS.primary} />
            </View>
          </Pressable>

          {isAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quản lý phả hệ"
              onPress={openGraphAdmin}
              style={({ pressed }) => [styles.graphAdminShortcut, pressed && styles.graphAdminShortcutPressed]}
            >
              <View style={styles.graphAdminIcon}>
                <Ionicons name="construct-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.graphAdminCopy}>
                <Text style={styles.graphAdminTitle}>Quản lý phả hệ</Text>
                <Text style={styles.graphAdminText}>Thêm người · Nối quan hệ · Chỉnh từng nhánh</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} />
            </Pressable>
          )}
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Gợi ý xây cây" />
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
            </View>
            <View style={styles.tipCopy}>
              <Text style={styles.tipTitle}>Bắt đầu từ những người gần nhất</Text>
              <Text style={styles.tipText}>
                Nối cha mẹ – con và vợ/chồng trước. Những quan hệ xa hơn sẽ được Bloom suy ra từ các đường nối đã xác nhận.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 30 },
  activeFamilyCard: { marginBottom: 25 },
  familyTop: { flexDirection: "row", alignItems: "center" },
  familyIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    marginRight: 12,
  },
  familyCopy: { flex: 1 },
  familyLabel: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  familyName: { marginTop: 4, color: COLORS.primaryText, fontSize: 19, fontWeight: "900" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 },
  section: { marginBottom: 25 },

  membersCard: { paddingVertical: 4, paddingHorizontal: 14 },
  memberRow: { minHeight: 72, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  memberRowPressed: { opacity: 0.68 },
  memberAvatar: { width: 46, height: 46, borderRadius: 17, backgroundColor: COLORS.accentBg, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  memberAvatarImage: { width: "100%", height: "100%" },
  memberInitial: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  memberMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11.5 },
  memberRolePill: { backgroundColor: COLORS.softSurface, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6 },
  memberRoleText: { color: COLORS.primaryText, fontSize: 10, fontWeight: "800" },
  memberDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 57 },
  managementCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  managementIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softSurface,
  },
  managementCopy: { flex: 1 },
  managementTitle: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  managementText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },

  genealogyHero: {
    minHeight: 320,
    borderRadius: 30,
    padding: 20,
    overflow: "hidden",
    backgroundColor: "#FFF8FA",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.primaryText,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  genealogyHeroPressed: { transform: [{ scale: 0.992 }], opacity: 0.94 },
  genealogyHeroBusy: { opacity: 0.82 },
  heroGlowOne: {
    position: "absolute",
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -76,
    top: -82,
    backgroundColor: "#FFE3ED",
    opacity: 0.82,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -72,
    bottom: -68,
    backgroundColor: "#F1F8F4",
    opacity: 0.95,
  },
  heroSparkle: {
    position: "absolute",
    right: 72,
    top: 78,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  heroBadgeText: { color: COLORS.primaryText, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  heroArrowBubble: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroBody: { marginTop: 20, flexDirection: "row", alignItems: "center", gap: 12, zIndex: 2 },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: { color: COLORS.primaryText, fontSize: 24, lineHeight: 29, fontWeight: "900", letterSpacing: -0.4 },
  heroSubtitle: { marginTop: 8, color: COLORS.secondaryText, fontSize: 13, lineHeight: 19 },

  miniTree: { width: 116, height: 106, position: "relative" },
  miniTreeNode: {
    position: "absolute",
    top: 4,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: "#F4CCD9",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  miniTreeNodeTopLeft: { left: 14 },
  miniTreeNodeTopRight: { right: 14, borderColor: "#DCECF5" },
  miniTreePartnerLine: { position: "absolute", left: 51, right: 51, top: 22, height: 2, backgroundColor: "#D7B9C4" },
  miniTreeStem: { position: "absolute", left: 57, top: 41, width: 2, height: 28, backgroundColor: "#D7B9C4" },
  miniTreeBranch: { position: "absolute", left: 20, right: 20, top: 68, height: 2, backgroundColor: "#D7B9C4" },
  miniTreeNodeSmall: {
    position: "absolute",
    bottom: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF1F6",
    borderWidth: 1.5,
    borderColor: "#F4CCD9",
    zIndex: 3,
  },
  miniTreeNodeBottomLeft: { left: 10 },
  miniTreeNodeBottomCenter: { left: 47, backgroundColor: "#F3F8FF", borderColor: "#DCECF5" },
  miniTreeNodeBottomRight: { right: 10, backgroundColor: "#F1F8F4", borderColor: "#D7EADD" },

  heroFeatureRow: { marginTop: 22, flexDirection: "row", flexWrap: "wrap", gap: 7, zIndex: 2 },
  heroFeaturePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  heroFeatureText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  heroCtaRow: {
    marginTop: 18,
    minHeight: 45,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(240,142,170,0.12)",
    borderWidth: 1,
    borderColor: "rgba(240,142,170,0.24)",
    zIndex: 2,
  },
  heroCtaText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },

  graphAdminShortcut: {
    marginTop: 12,
    minHeight: 76,
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  graphAdminShortcutPressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
  graphAdminIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softSurface,
  },
  graphAdminCopy: { flex: 1, minWidth: 0 },
  graphAdminTitle: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  graphAdminText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16 },

  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 22,
    padding: 16,
    backgroundColor: "#FFF9FB",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softSurface,
  },
  tipCopy: { flex: 1, minWidth: 0 },
  tipTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  tipText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 11.8, lineHeight: 17 },
});
