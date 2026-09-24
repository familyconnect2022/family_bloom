import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { cloudinaryImageThumbnail, cloudinaryVideoThumbnail } from "../../components/media/MediaViewerProvider";
import {
  BloomAvatarButton,
  BloomIconButton,
} from "../../components/ui/BloomButtonComponents";
import {
  BloomCard,
  BloomEmptyState,
  BloomPageHeader,
  BloomPill,
  BloomQuickAction,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { DATA_LIMITS } from "../../constants/dataLimits";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyDashboard } from "../../hooks/useFamilyDashboard";
import type { FamilyEvent, MomentPost } from "../../types";
import { formatEventDate } from "../../utils/event";

const roleLabel: Record<string, string> = {
  owner: "Chủ nhà",
  admin: "Quản trị viên",
  member: "Thành viên",
  child: "Thành viên nhỏ",
};

const greetingForNow = () => {
  const hour = new Date().getHours();
  if (hour < 11) return "Chào buổi sáng";
  if (hour < 18) return "Chào buổi chiều";
  return "Buổi tối an lành";
};

const compactMomentTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  return sameDay
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
};

function DashboardEventRow({ event, creatorName, onPress }: { event: FamilyEvent; creatorName?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.eventRow, pressed && styles.rowPressed]}>
      <View style={styles.eventDateBox}>
        <Text style={styles.eventDay}>{String(event.day).padStart(2, "0")}</Text>
        <Text style={styles.eventMonth}>TH{event.month}</Text>
      </View>
      <View style={styles.eventCopy}>
        <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
        <Text style={styles.eventMeta} numberOfLines={1}>
          {event.location || (event.participantsMode === "all" ? "Cả nhà cùng nhớ" : `${event.participantIds.length} người tham gia`)}
        </Text>
        {!!creatorName && <Text style={styles.eventCreator}>Gieo bởi {creatorName}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.secondaryText} />
    </Pressable>
  );
}

function DashboardMomentCard({ post, onPress }: { post: MomentPost; onPress: () => void }) {
  const first = post.media?.[0];
  const thumb = !first
    ? null
    : first.type === "video"
      ? cloudinaryVideoThumbnail(first.thumbnailUrl || first.secureUrl)
      : cloudinaryImageThumbnail(first.thumbnailUrl || first.secureUrl);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.momentMiniCard, pressed && styles.rowPressed]}>
      <View style={styles.momentThumb}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`home-${post.id}`}
          />
        ) : (
          <View style={styles.momentFallback}>
            <Ionicons name="heart-outline" size={24} color={COLORS.primary} />
          </View>
        )}
        {first?.type === "video" && (
          <View style={styles.videoBadge}><Ionicons name="play" size={13} color={COLORS.white} /></View>
        )}
      </View>
      <View style={styles.momentMiniCopy}>
        <Text style={styles.momentAuthor} numberOfLines={1}>{post.authorName}</Text>
        <Text style={styles.momentCaption} numberOfLines={2}>{post.caption || "Một khoảnh khắc nhỏ của nhà 🌷"}</Text>
        <Text style={styles.momentTime}>{compactMomentTime(post.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  useTabStartupTask("home");
  const router = useRouter();
  const { userProfile, families } = useAuth();
  const activeMembership = families.find((item) => item.familyId === userProfile?.activeFamilyId);
  const activeFamilyId = userProfile?.activeFamilyId;
  const displayName = userProfile?.shortName || userProfile?.displayName || "bạn";
  const avatarSource = userProfile?.avatarUrl ? { uri: userProfile.avatarUrl } : undefined;
  const currentRole = activeMembership?.role ? roleLabel[activeMembership.role] ?? "Thành viên" : "Thành viên";
  const {
    members,
    memberByUid,
    upcomingEvents,
    upcomingHasMore,
    recentMoments,
    momentsHaveMore,
    loading,
  } = useFamilyDashboard(activeFamilyId);

  const visibleMembers = members.slice(0, DATA_LIMITS.dashboard.visibleMembers);
  const summaryEvents = `${Math.min(upcomingEvents.length, DATA_LIMITS.dashboard.upcomingEvents)}${upcomingHasMore ? "+" : ""}`;
  const summaryMoments = `${Math.min(recentMoments.length, DATA_LIMITS.dashboard.recentMoments)}${momentsHaveMore ? "+" : ""}`;

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow={greetingForNow()}
          title={`Xin chào, ${displayName} 🌸`}
          subtitle="Nhà mình hôm nay có gì đáng yêu nhỉ?"
          right={
            <View style={styles.headerActions}>
              <BloomIconButton
                icon="notifications-outline"
                onPress={() => router.push("/notifications")}
                customStyle={styles.headerIconButton}
              />
              <BloomAvatarButton
                source={avatarSource}
                text={userProfile?.displayName || displayName}
                size={44}
                onPress={() => router.push("/profile")}
                customStyle={styles.avatar}
              />
            </View>
          }
        />

        <BloomCard tone="accent" style={styles.familyHero} onPress={() => router.push("/family")}>
          <View style={styles.familyHeroTop}>
            <View style={styles.familyIconWrap}>
              <Ionicons name="home" size={25} color={COLORS.primaryText} />
            </View>
            <View style={styles.familyHeroTitleWrap}>
              <Text style={styles.familyKicker}>NHÀ ĐANG HOẠT ĐỘNG</Text>
              <Text style={styles.familyName} numberOfLines={1}>
                {activeMembership?.familyName || "Gia đình của mình"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primaryText} />
          </View>

          <View style={styles.pillRow}>
            <BloomPill icon="shield-checkmark-outline" label={currentRole} />
            <BloomPill icon="people-outline" label={`${members.length || 1} người trong nhà`} />
          </View>
        </BloomCard>

        <View style={styles.summaryGrid}>
          <Pressable onPress={() => router.push("/family")} style={({ pressed }) => [styles.summaryCard, pressed && styles.rowPressed]}>
            <View style={styles.summaryIcon}><Ionicons name="people-outline" size={19} color={COLORS.primaryText} /></View>
            <Text style={styles.summaryValue}>{members.length || "–"}</Text>
            <Text style={styles.summaryLabel}>Thành viên</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/planner")} style={({ pressed }) => [styles.summaryCard, pressed && styles.rowPressed]}>
            <View style={styles.summaryIcon}><Ionicons name="calendar-outline" size={19} color={COLORS.primaryText} /></View>
            <Text style={styles.summaryValue}>{summaryEvents}</Text>
            <Text style={styles.summaryLabel}>Sự kiện gần</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/moments")} style={({ pressed }) => [styles.summaryCard, pressed && styles.rowPressed]}>
            <View style={styles.summaryIcon}><Ionicons name="images-outline" size={19} color={COLORS.primaryText} /></View>
            <Text style={styles.summaryValue}>{summaryMoments}</Text>
            <Text style={styles.summaryLabel}>Kỷ niệm mới</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader
            title="Sắp tới trong nhà"
            subtitle="Những ngày cả nhà đang cùng mong chờ"
            actionLabel="Mở lịch"
            onAction={() => router.push("/planner")}
          />
          {upcomingEvents.length ? (
            <BloomCard style={styles.compactCard}>
              {upcomingEvents.slice(0, 3).map((event, index) => (
                <View key={event.id}>
                  <DashboardEventRow
                    event={event}
                    creatorName={memberByUid.get(event.createdByUid)?.shortName || memberByUid.get(event.createdByUid)?.displayName}
                    onPress={() => router.push(`/event/${event.id}` as never)}
                  />
                  {index < Math.min(upcomingEvents.length, 3) - 1 && <View style={styles.divider} />}
                </View>
              ))}
              {upcomingHasMore && (
                <Pressable onPress={() => router.push("/planner")} style={({ pressed }) => [styles.softMore, pressed && styles.rowPressed]}>
                  <Ionicons name="flower-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.softMoreText}>Còn những ngày vui khác đang chờ 🌷</Text>
                </Pressable>
              )}
            </BloomCard>
          ) : (
            <BloomEmptyState
              icon="calendar-outline"
              title={loading ? "Bloom đang ngó lịch nhà" : "Lịch nhà đang thật thảnh thơi"}
              description={loading ? "Một chút thôi, những ngày gần nhất sẽ hiện ra đây." : "Gieo một ngày đáng nhớ để cả nhà cùng mong chờ nhé."}
              compact
            />
          )}
        </View>

        <View style={styles.section}>
          <BloomSectionHeader
            title="Kỷ niệm mới nở"
            subtitle="Một vài điều vừa được giữ lại cho nhà mình"
            actionLabel="Xem tường nhà"
            onAction={() => router.push("/moments")}
          />
          {recentMoments.length ? (
            <View style={styles.momentGrid}>
              {recentMoments.slice(0, 4).map((post) => (
                <DashboardMomentCard key={post.id} post={post} onPress={() => router.push("/moments")} />
              ))}
            </View>
          ) : (
            <BloomEmptyState
              icon="images-outline"
              title={loading ? "Đang gom những điều dễ thương" : "Tường nhà đang chờ chuyện mới"}
              description={loading ? "Bloom đang lấy vài kỷ niệm gần nhất." : "Một bức ảnh nhỏ cũng đủ làm ngôi nhà ấm hơn đó 🌸"}
              compact
            />
          )}
        </View>

        <View style={styles.section}>
          <BloomSectionHeader
            title="Mọi người trong nhà"
            subtitle={members.length ? `${members.length} người đang cùng vun một mái nhà` : "Những gương mặt thân quen sẽ hiện ở đây"}
            actionLabel="Xem cả nhà"
            onAction={() => router.push("/family")}
          />
          {visibleMembers.length ? (
            <BloomCard style={styles.memberStripCard}>
              <View style={styles.memberStrip}>
                {visibleMembers.map((member) => (
                  <Pressable
                    key={member.uid}
                    onPress={() => router.push(`/member/${member.uid}` as never)}
                    style={({ pressed }) => [styles.memberMini, pressed && styles.rowPressed]}
                  >
                    <View style={styles.memberMiniAvatar}>
                      {member.avatarUrl ? (
                        <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={`home-member-${member.uid}`} />
                      ) : (
                        <Text style={styles.memberInitial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={styles.memberMiniName} numberOfLines={1}>{member.shortName || member.displayName}</Text>
                  </Pressable>
                ))}
              </View>
              {members.length > visibleMembers.length && (
                <Text style={styles.memberExtra}>Và {members.length - visibleMembers.length} người thương khác 🌷</Text>
              )}
            </BloomCard>
          ) : (
            <BloomEmptyState icon="people-outline" title="Bloom đang gọi mọi người về nhà" description="Danh sách sẽ tự xuất hiện khi dữ liệu thành viên sẵn sàng." compact />
          )}
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Đi nhanh" subtitle="Những việc nhà mình hay ghé" />
          <View style={styles.quickGrid}>
            <BloomQuickAction icon="images-outline" label="Khoảnh khắc" caption="Giữ lại chuyện nhỏ hôm nay" onPress={() => router.push("/moments")} />
            <BloomQuickAction icon="calendar-outline" label="Lịch nhà" caption="Nhớ những ngày quan trọng" onPress={() => router.push("/planner")} />
            <BloomQuickAction icon="people-outline" label="Cây nhà" caption="Ghé thăm mọi người" onPress={() => router.push("/family")} />
            <BloomQuickAction icon="chatbubbles-outline" label="Trò chuyện" caption="Một góc để luôn gần nhau" onPress={() => router.push("/chat")} />
          </View>
        </View>

        <View style={styles.bottomSpace} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  headerIconButton: { width: 44, height: 44, backgroundColor: COLORS.white },
  avatar: { borderColor: COLORS.white, borderWidth: 2 },
  familyHero: { marginBottom: 16, padding: 18 },
  familyHeroTop: { flexDirection: "row", alignItems: "center" },
  familyIconWrap: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.78)", marginRight: 12 },
  familyHeroTitleWrap: { flex: 1, minWidth: 0 },
  familyKicker: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  familyName: { marginTop: 4, color: COLORS.primaryText, fontSize: 19, fontWeight: "900" },
  pillRow: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryGrid: { flexDirection: "row", gap: 9, marginBottom: 27 },
  summaryCard: { flex: 1, minHeight: 116, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 12 },
  summaryIcon: { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  summaryValue: { marginTop: 9, color: COLORS.primaryText, fontSize: 21, fontWeight: "900" },
  summaryLabel: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 14 },
  section: { marginBottom: 27 },
  compactCard: { paddingVertical: 4, paddingHorizontal: 13 },
  eventRow: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  eventDateBox: { width: 48, height: 54, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  eventDay: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  eventMonth: { marginTop: 1, color: COLORS.primary, fontSize: 8.5, fontWeight: "900" },
  eventCopy: { flex: 1, minWidth: 0 },
  eventTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  eventMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11.5 },
  eventCreator: { marginTop: 3, color: COLORS.primary, fontSize: 10.5, fontWeight: "700" },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 59 },
  softMore: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginVertical: 6, borderRadius: 14, backgroundColor: COLORS.softSurface },
  softMoreText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "800" },
  momentGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 11 },
  momentMiniCard: { width: "48.4%", overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white },
  momentThumb: { width: "100%", aspectRatio: 1.35, backgroundColor: COLORS.softSurface, overflow: "hidden" },
  momentFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  videoBadge: { position: "absolute", left: 9, bottom: 9, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(89,54,67,0.72)", alignItems: "center", justifyContent: "center" },
  momentMiniCopy: { padding: 11 },
  momentAuthor: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  momentCaption: { marginTop: 4, minHeight: 32, color: COLORS.primaryText, fontSize: 11.5, lineHeight: 16 },
  momentTime: { marginTop: 7, color: COLORS.secondaryText, fontSize: 10 },
  memberStripCard: { padding: 14 },
  memberStrip: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 13 },
  memberMini: { width: "30.5%", alignItems: "center" },
  memberMiniAvatar: { width: 54, height: 54, borderRadius: 20, overflow: "hidden", backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  memberInitial: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  memberMiniName: { marginTop: 6, width: "100%", color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800", textAlign: "center" },
  memberExtra: { marginTop: 13, color: COLORS.secondaryText, fontSize: 10.5, textAlign: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  rowPressed: { opacity: 0.68 },
  bottomSpace: { height: 12 },
});
