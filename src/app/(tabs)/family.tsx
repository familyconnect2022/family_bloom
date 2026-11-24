import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { usePendingFamilyReviews } from "../../hooks/family/usePendingFamilyReviews";
import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { FamilySwitcherModal } from "../../components/family/FamilySwitcherModal";
import {
  BloomCard,
  BloomEmptyState,
  BloomPill,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomRouteEntrance } from "../../motion/BloomMotion";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

import { useFamilyMembers } from "../../hooks/family/useFamilyMembers";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { FamilyGraphScreen } from '../(family)/(graph)/family-graph';
import { FamilyGraphWebDashboard } from '../../components/familyGraph/FamilyGraphWebDashboard';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const roleLabel: Record<string, string> = {
  owner: "Chủ nhà",
  admin: "Người giữ nhà",
  member: "Thành viên",
  child: "Thành viên nhỏ",
};

function FamilyOverview() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const [familySwitcherVisible, setFamilySwitcherVisible] = useState(false);
  const [memberPageSize, setMemberPageSize] = useState(18);
  const [memberSearch, setMemberSearch] = useState('');
  const { user, userProfile, families } = useAuth();
  const membership = families.find((item) => item.familyId === userProfile?.activeFamilyId);
  const isAdmin = membership?.role === "admin" || membership?.role === "owner";
  const familyId = userProfile?.activeFamilyId ?? null;
  const { members } = useFamilyMembers(familyId, { runtimeTabId: "family" });
  const pendingReviews = usePendingFamilyReviews(familyId, user?.uid, isAdmin);

  const sortedMembers = useMemo(() => [...members].sort((a, b) => {
    const weight = (role: string) => role === "owner" ? 0 : role === "admin" ? 1 : role === "member" ? 2 : 3;
    return weight(a.role) - weight(b.role) || a.displayName.localeCompare(b.displayName, "vi");
  }), [members]);

  const shownMembers = useMemo(() => {
    const query = memberSearch.trim().toLocaleLowerCase("vi");
    return query ? sortedMembers.filter(member =>
      `${member.displayName} ${member.shortName ?? ""}`.toLocaleLowerCase("vi").includes(query)) : sortedMembers;
  }, [sortedMembers, memberSearch]);

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
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <ScrollView contentContainerStyle={__a3_styles.content} showsVerticalScrollIndicator={false}>
        <BloomRouteEntrance>
        <BloomHeroHeader
          eyebrow="CÂY NHÀ"
          title="Phả hệ gia đình"
          subtitle="Cùng lưu giữ, kết nối và truyền lại câu chuyện của các thế hệ trong nhà mình."
          variant="tree"
          roundedBottom
        />
        </BloomRouteEntrance>

        <View style={__a3_styles.pageBody}>
        <Pressable
          onPress={() => router.push({ pathname: "/memory-book", params: { scope: "family" } } as never)}
          style={({ pressed }) => [__a3_styles.timelineHero, pressed && __a3_styles.timelineHeroPressed]}
        >
          <View style={__a3_styles.timelineHeroIcon}><Ionicons name="book-outline" size={22} color={__a3Colors.primary} /></View>
          <View style={__a3_styles.timelineHeroCopy}>
            <Text style={__a3_styles.timelineHeroEyebrow}>KỶ YẾU BLOOM</Text>
            <Text style={__a3_styles.timelineHeroTitle}>Chuyện của nhà mình</Text>
            <Text style={__a3_styles.timelineHeroText}>Đọc và biên tập một cuốn sách sống từ những kỷ niệm đã có.</Text>
          </View>
          <Ionicons name="arrow-forward" size={19} color={__a3Colors.primaryText} />
        </Pressable>

        <Pressable
          onPress={() => router.push("/family-timeline" as never)}
          style={({ pressed }) => [__a3_styles.timelineHero, pressed && __a3_styles.timelineHeroPressed]}
        >
          <View style={__a3_styles.timelineHeroIcon}><Ionicons name="flower-outline" size={22} color={__a3Colors.primary} /></View>
          <View style={__a3_styles.timelineHeroCopy}>
            <Text style={__a3_styles.timelineHeroEyebrow}>KÝ ỨC CỦA CẢ NHÀ</Text>
            <Text style={__a3_styles.timelineHeroTitle}>Dòng thời gian gia đình</Text>
            <Text style={__a3_styles.timelineHeroText}>Chỉ những kỷ niệm được chọn “Toàn gia đình” mới xuất hiện ở đây.</Text>
          </View>
          <Ionicons name="arrow-forward" size={19} color={__a3Colors.primaryText} />
        </Pressable>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title={isAdmin?"Quản lý nhà":"Cùng xây phả hệ"} subtitle={isAdmin?"Những việc giúp mái nhà luôn gọn gàng":"Góp phần lưu lại thông tin của gia đình"} />
          {isAdmin&&<BloomCard onPress={() => router.push("/family-join-requests")} style={__a3_styles.managementCard}>
            <View style={__a3_styles.managementIcon}><Ionicons name="person-add-outline" size={22} color={__a3Colors.primary}/></View>
            <View style={__a3_styles.managementCopy}>
              <Text style={__a3_styles.managementTitle}>Duyệt thành viên</Text>
              <ReviewNotice status={pendingReviews.joins}/>
              <Text style={__a3_styles.managementText}>Xem hồ sơ của những người đang xin vào nhà.</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={__a3Colors.secondaryText}/>
          </BloomCard>}
          <BloomCard onPress={() => router.push("/family-graph-proposals" as never)} style={[__a3_styles.managementCard,{marginTop:isAdmin?12:0}]}>
            <View style={__a3_styles.managementIcon}><Ionicons name={isAdmin?"checkmark-done-outline":"chatbubble-ellipses-outline"} size={22} color={__a3Colors.primary}/></View>
            <View style={__a3_styles.managementCopy}>
              <Text style={__a3_styles.managementTitle}>Góp ý phả hệ</Text>
              {isAdmin&&<ReviewNotice status={pendingReviews.proposals}/>}
              <Text style={__a3_styles.managementText}>{isAdmin?"Xem và chăm chút những góp ý của cả nhà":"Đề xuất cập nhật người và quan hệ"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={__a3Colors.secondaryText}/>
          </BloomCard>
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader
            title="Thành viên trong nhà"
            subtitle={sortedMembers.length ? `${sortedMembers.length} người đang cùng ở trong tổ ấm này` : "Bloom đang tải danh sách thành viên"}
          />
          <View style={__a3_styles.memberSearchBox}>
            <Ionicons name="search-outline" size={19} color={__a3Colors.primary}/>
            <TextInput
              accessibilityLabel="Tìm thành viên trong nhà"
              value={memberSearch}
              onChangeText={setMemberSearch}
              placeholder="Tìm theo tên thành viên…"
              placeholderTextColor={__a3Colors.secondaryText}
              style={__a3_styles.memberSearchInput}
            />
          </View>
          {sortedMembers.length ? (
            <BloomCard style={__a3_styles.membersCard}>
              {shownMembers.slice(0, memberPageSize).map((member, index) => (
                <View key={member.uid}>
                  <Pressable
                    onPress={() => router.push(`/member/${member.uid}` as never)}
                    style={({ pressed }) => [__a3_styles.memberRow, pressed && __a3_styles.memberRowPressed]}
                  >
                    <View style={__a3_styles.memberAvatar}>
                      {member.avatarUrl ? (
                        <Image source={{ uri: member.avatarUrl }} style={__a3_styles.memberAvatarImage} contentFit="cover" />
                      ) : (
                        <Text style={__a3_styles.memberInitial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                      )}
                    </View>
                    <View style={__a3_styles.memberCopy}>
                      <Text style={__a3_styles.memberName}>{member.displayName}</Text>
                      <Text style={__a3_styles.memberMeta}>
                        {member.shortName ? `${member.shortName} · ` : ""}{roleLabel[member.role] ?? "Thành viên"}
                      </Text>
                    </View>
                    <View style={__a3_styles.memberRolePill}>
                      <Text style={__a3_styles.memberRoleText}>{roleLabel[member.role] ?? "Thành viên"}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={17} color={__a3Colors.secondaryText} />
                  </Pressable>
                  {index < Math.min(shownMembers.length, memberPageSize) - 1 && <View style={__a3_styles.memberDivider} />}
                </View>
              ))}
              {shownMembers.length > memberPageSize && (
                <Pressable accessibilityRole="button" accessibilityLabel="Tải thêm thành viên" onPress={() => setMemberPageSize(n => n + 18)} style={__a3_styles.loadMembersButton}>
                  <Ionicons name="chevron-down-circle-outline" color={__a3Colors.primary} size={20} />
                  <Text style={__a3_styles.loadMembersText}>Xem thêm {Math.min(18, shownMembers.length - memberPageSize)} thành viên</Text>
                </Pressable>
              )}
              {shownMembers.length === 0 && (
                <Text style={__a3_styles.memberNoMatches}>Không tìm thấy thành viên phù hợp.</Text>
              )}
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

        <View style={__a3_styles.section}>
          <BloomSectionHeader
            title="Khám phá cây nhà"
            subtitle="Lần theo từng nhánh, tìm quan hệ và mở lại ký ức của mỗi người"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mở cây phả hệ gia đình"
            onPress={openFamilyGraph}
            style={({ pressed }) => [
              __a3_styles.genealogyHero,
              pressed && __a3_styles.genealogyHeroPressed,
            ]}
          >
            <View pointerEvents="none" style={__a3_styles.heroGlowOne} />
            <View pointerEvents="none" style={__a3_styles.heroGlowTwo} />
            <View pointerEvents="none" style={__a3_styles.heroSparkle}>
              <Ionicons name="sparkles" size={14} color={__a3Colors.primary} />
            </View>

            <View style={__a3_styles.heroTopRow}>
              <View style={__a3_styles.heroBadge}>
                <Ionicons name="leaf-outline" size={14} color={__a3Colors.primaryText} />
                <Text style={__a3_styles.heroBadgeText}>DÒNG CHẢY GIA ĐÌNH</Text>
              </View>
              <View style={__a3_styles.heroArrowBubble}>
                <Ionicons name="arrow-forward" size={19} color={__a3Colors.primaryText} />
              </View>
            </View>

            <View style={__a3_styles.heroBody}>
              <View style={__a3_styles.heroCopy}>
                <Text style={__a3_styles.heroTitle}>Mở cây phả hệ</Text>
                <Text style={__a3_styles.heroSubtitle}>
                  Nhìn lại các thế hệ, lần theo từng nhánh và hiểu mối quan hệ giữa mọi người trong nhà.
                </Text>
              </View>

              <View pointerEvents="none" style={__a3_styles.miniTree}>
                <View style={[__a3_styles.miniTreeNode, __a3_styles.miniTreeNodeTopLeft]}>
                  <Ionicons name="person" size={12} color={__a3Colors.primaryText} />
                </View>
                <View style={[__a3_styles.miniTreeNode, __a3_styles.miniTreeNodeTopRight]}>
                  <Ionicons name="person" size={12} color={__a3Colors.primaryText} />
                </View>
                <View style={__a3_styles.miniTreePartnerLine} />
                <View style={__a3_styles.miniTreeStem} />
                <View style={__a3_styles.miniTreeBranch} />
                <View style={[__a3_styles.miniTreeNodeSmall, __a3_styles.miniTreeNodeBottomLeft]} />
                <View style={[__a3_styles.miniTreeNodeSmall, __a3_styles.miniTreeNodeBottomCenter]} />
                <View style={[__a3_styles.miniTreeNodeSmall, __a3_styles.miniTreeNodeBottomRight]} />
              </View>
            </View>

            <View style={__a3_styles.heroFeatureRow}>
              <View style={__a3_styles.heroFeaturePill}>
                <Ionicons name="layers-outline" size={14} color={__a3Colors.primaryText} />
                <Text style={__a3_styles.heroFeatureText}>3 / 5 thế hệ</Text>
              </View>
              <View style={__a3_styles.heroFeaturePill}>
                <Ionicons name="git-network-outline" size={14} color={__a3Colors.primaryText} />
                <Text style={__a3_styles.heroFeatureText}>Tìm quan hệ</Text>
              </View>
              <View style={__a3_styles.heroFeaturePill}>
                <Ionicons name="albums-outline" size={14} color={__a3Colors.primaryText} />
                <Text style={__a3_styles.heroFeatureText}>Ký ức từng người</Text>
              </View>
            </View>

            <View style={__a3_styles.heroCtaRow}>
              <Text style={__a3_styles.heroCtaText}>
                Chạm để bước vào phả hệ
              </Text>
              <Ionicons name="chevron-forward" size={17} color={__a3Colors.primary} />
            </View>
          </Pressable>

          {isAdmin && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quản lý phả hệ"
              onPress={openGraphAdmin}
              style={({ pressed }) => [__a3_styles.graphAdminShortcut, pressed && __a3_styles.graphAdminShortcutPressed]}
            >
              <View style={__a3_styles.graphAdminIcon}>
                <Ionicons name="construct-outline" size={20} color={__a3Colors.primary} />
              </View>
              <View style={__a3_styles.graphAdminCopy}>
                <Text style={__a3_styles.graphAdminTitle}>Quản lý phả hệ</Text>
                <Text style={__a3_styles.graphAdminText}>Thêm người · Nối quan hệ · Chỉnh từng nhánh</Text>
              </View>
              <Ionicons name="chevron-forward" size={19} color={__a3Colors.secondaryText} />
            </Pressable>
          )}
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title={isAdmin ? "Gợi ý xây cây" : "Gợi ý góp ý phả hệ"} />
          <View style={__a3_styles.tipCard}>
            <View style={__a3_styles.tipIcon}>
              <Ionicons name="heart-outline" size={22} color={__a3Colors.primary} />
            </View>
            <View style={__a3_styles.tipCopy}>
              <Text style={__a3_styles.tipTitle}>{isAdmin ? "Bắt đầu từ những người gần nhất" : "Cùng bổ sung ký ức gia đình"}</Text>
              <Text style={__a3_styles.tipText}>
                {isAdmin ? "Nối cha mẹ – con và vợ/chồng trước. Những quan hệ xa hơn sẽ được Bloom suy ra từ các đường nối đã xác nhận." : "Bạn thấy thông tin còn thiếu hoặc chưa đúng? Mở Góp ý phả hệ để gửi lời nhắn và nguồn thông tin cho người giữ nhà xem lại."}
              </Text>
            </View>
          </View>
        </View>

        </View>
      </ScrollView>
      <FamilySwitcherModal visible={familySwitcherVisible} onClose={() => setFamilySwitcherVisible(false)} />
    </ScreenContainer>
  );
}

function ReviewNotice({status}: {status: string}) {
  const __a3Colors = useA3Theme().colors;

  useBloomColorsRevision();
  if (status === "error") return <Text style={{color:__a3Colors.secondaryText,fontSize:12}}>Chưa tải được trạng thái chờ duyệt</Text>;
  if (status !== "pending") return null;
  return <View accessibilityLabel="Có yêu cầu đang chờ duyệt" style={{alignSelf:"flex-start",flexDirection:"row",alignItems:"center",gap:5,backgroundColor:__a3Colors.accentBg,borderRadius:12,paddingHorizontal:9,paddingVertical:4,marginTop:5,marginBottom:3}}>
    <Ionicons name="notifications" size={14} color={__a3Colors.primaryText}/>
    <Text style={{color:__a3Colors.primaryText,fontWeight:"700",fontSize:12}}>Chờ duyệt</Text>
  </View>;
}

const styles = createBloomStyles(() => StyleSheet.create({
  content: { paddingBottom: 160, backgroundColor: COLORS.background },
  pageBody: { marginTop: -18, paddingHorizontal: 16, paddingTop: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: COLORS.background },
  activeFamilyCard: { marginBottom: 25 },
  familyTop: { flexDirection: "row", alignItems: "center" },
  familyIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    marginRight: 12,
  },
  familyCopy: { flex: 1 },
  familyLabel: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  familyName: { marginTop: 4, color: COLORS.primaryText, fontSize: 19, fontWeight: "900" },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 },
  section: { marginBottom: 25 },
  timelineHero: { marginBottom: 24, minHeight: 88, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 14, paddingVertical: 13, flexDirection: "row", alignItems: "center", gap: 12 },
  timelineHeroPressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  timelineHeroIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  timelineHeroCopy: { flex: 1, minWidth: 0 },
  timelineHeroEyebrow: { color: COLORS.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  timelineHeroTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  timelineHeroText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 14, fontWeight: "600" },

  membersCard: { paddingVertical: 4, paddingHorizontal: 14 },
  memberSearchBox: { marginBottom: 10, minHeight: 46, flexDirection: "row", gap: 8, alignItems: "center", borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, backgroundColor: COLORS.surface, paddingHorizontal: 12 },
  memberSearchInput: { flex: 1, minWidth: 0, paddingVertical: 11, color: COLORS.primaryText, fontSize: 14 },
  memberNoMatches: { textAlign: "center", paddingVertical: 18, color: COLORS.secondaryText, fontSize: 12 },
  loadMembersButton: { minHeight: 51, flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderTopWidth: 1, borderTopColor: COLORS.border },
  loadMembersText: { fontSize: 12, color: COLORS.primary, fontWeight: "900" },
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
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.softSurface,
    opacity: 0.82,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -72,
    bottom: -68,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
  },
  heroTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 2 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  miniTreeNodeTopLeft: { left: 14 },
  miniTreeNodeTopRight: { right: 14, borderColor: COLORS.border },
  miniTreePartnerLine: { position: "absolute", left: 51, right: 51, top: 22, height: 2, backgroundColor: COLORS.selectedBackground },
  miniTreeStem: { position: "absolute", left: 57, top: 41, width: 2, height: 28, backgroundColor: COLORS.selectedBackground },
  miniTreeBranch: { position: "absolute", left: 20, right: 20, top: 68, height: 2, backgroundColor: COLORS.selectedBackground },
  miniTreeNodeSmall: {
    position: "absolute",
    bottom: 7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    zIndex: 3,
  },
  miniTreeNodeBottomLeft: { left: 10 },
  miniTreeNodeBottomCenter: { left: 47, backgroundColor: COLORS.surface, borderColor: COLORS.border },
  miniTreeNodeBottomRight: { right: 10, backgroundColor: COLORS.surface, borderColor: COLORS.border },

  heroFeatureRow: { marginTop: 22, flexDirection: "row", flexWrap: "wrap", gap: 7, zIndex: 2 },
  heroFeaturePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.iconBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    backgroundColor: COLORS.surface,
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
    backgroundColor: COLORS.surface,
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
}));

/** Web parity: Cây nhà is a real management dashboard; one explicit
 * "Khám phá cây gia đình" action enters the whole-tree native canvas.
 * Keep legacy timeline, family switcher and memory book reachable via utilities.
 */
export default function FamilyTab() {
  useTabStartupTask('family');
  const { userProfile } = useAuth();
  const [view, setView] = useState<'dashboard' | 'tree' | 'legacy'>('dashboard');
  if (!userProfile?.activeFamilyId) return <FamilyOverview />;
  if (view === 'legacy') {
    return (
      <View style={{ flex: 1 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Trở về Cây nhà"
          onPress={() => setView('dashboard')}
          style={{ position: 'absolute', top: 36, left: 17, zIndex: 100, minHeight: 44,
            flexDirection: 'row', alignItems: 'center', borderRadius: 16,
            paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.93)' }}>
          <Ionicons name="arrow-back" size={20} color="#A64A75" />
          <Text style={{ marginLeft: 6, color: '#A64A75', fontWeight: '800' }}>Cây nhà</Text>
        </Pressable>
        <FamilyOverview />
      </View>
    );
  }
  if (view === 'tree') return <FamilyGraphScreen embeddedInTab onOpenOverview={() => setView('dashboard')} />;
  return <FamilyGraphWebDashboard onExplore={() => setView('tree')} onLegacy={() => setView('legacy')} />;
}
