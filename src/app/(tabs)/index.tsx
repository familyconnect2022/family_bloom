import { getBloomHeroArt } from '../../theme/storybookHeroRegistry';
import { getBloomSelection } from '../../theme/runtime';
import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { StatusBar } from "expo-status-bar";
import { memo, useCallback, useState } from "react";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { FamilySwitcherModal } from "../../components/family/FamilySwitcherModal";
import { cloudinaryImageThumbnail, cloudinaryVideoThumbnail } from "../../components/media/MediaViewerProvider";
import {
  BloomAvatarButton,
} from "../../components/ui/BloomButtonComponents";
import {
  BloomCard,
  BloomEmptyState,
  BloomPill,
  BloomQuickAction,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BLOOM_CARD_TITLE_SIZE, BLOOM_CARD_TITLE_LINE_HEIGHT } from '../../components/ui/BloomCardTypography';
import { DATA_LIMITS } from "../../constants/dataLimits";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";

import { useFamilyDashboard } from "../../hooks/family/useFamilyDashboard";
import { useOnThisDayMemories } from "../../hooks/moments/useOnThisDayMemories";
import type { FamilyEvent, FamilyMember, MomentPost } from "../../types";
import { formatEventDate } from "../../utils/event";
import { HomeActivityBell } from "../../components/home/HomeActivityBell";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';
import { BloomMotionReveal, BloomRouteEntrance } from '../../motion/BloomMotion';


const roleLabel: Record<string, string> = {
  owner: "Người giữ nhà",
  admin: "Người giữ nhà",
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const eventDate = new Date(event.dateISO);
  const clock = !event.allDay && Number.isFinite(eventDate.getTime())
    ? eventDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [__a3_styles.eventRow, __a3_styles.eventTicket, { backgroundColor: __a3Colors.card, borderColor: __a3Colors.border }, pressed && __a3_styles.rowPressed]}>
      <View style={__a3_styles.eventDateBox}>
        <Text style={__a3_styles.eventDay}>{String(event.day).padStart(2, "0")}</Text>
        <Text style={__a3_styles.eventMonth}>TH{event.month}</Text>
      </View>
      <View style={__a3_styles.eventCopy}>
        <Text style={__a3_styles.eventTitle} numberOfLines={2}>{event.title}</Text>
        <Text style={__a3_styles.eventMeta} numberOfLines={1}>
          {event.location || (event.participantsMode === "all" ? "Cả nhà cùng nhớ" : `${event.participantIds.length} người tham gia`)}
        </Text>
        {!!creatorName && <Text style={__a3_styles.eventCreator}>Gieo bởi {creatorName}</Text>}
      </View>
      {clock && <View style={__a3_styles.eventClock}><Ionicons name="time-outline" size={13} color={__a3Colors.primary} /><Text style={__a3_styles.eventClockText}>{clock}</Text></View>}
      <Ionicons name="chevron-forward" size={17} color={__a3Colors.secondaryText} />
    </Pressable>
  );
}


function HomeFeatureCard({
  icon,
  title,
  caption,
  badge,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption: string;
  badge?: string;
  onPress: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <BloomCard tone="soft" onPress={onPress} shape="storybook" style={__a3_styles.featureCard}>
      <View pointerEvents="none" style={__a3_styles.featureArtHalo}><Ionicons name={icon} size={54} color={__a3Colors.primary} /></View>
      <View style={__a3_styles.featureTop}>
        <View style={__a3_styles.featureIcon}><Ionicons name={icon} size={21} color={__a3Colors.primaryText} /></View>
        {!!badge && <View style={__a3_styles.featureBadge}><Text style={__a3_styles.featureBadgeText}>{badge}</Text></View>}
      </View>
      <Text style={__a3_styles.featureTitle}>{title}</Text>
      <Text style={__a3_styles.featureCaption} numberOfLines={2}>{caption}</Text>
      <View style={__a3_styles.featureArrow}><Ionicons name="arrow-forward" size={15} color={__a3Colors.primary} /></View>
    </BloomCard>
  );
}

function DashboardMomentCard({ post, onPress }: { post: MomentPost; onPress: () => void }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const first = post.media?.[0];
  const thumb = !first
    ? null
    : first.type === "video"
      ? cloudinaryVideoThumbnail(first.thumbnailUrl || first.secureUrl)
      : cloudinaryImageThumbnail(first.thumbnailUrl || first.secureUrl);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [__a3_styles.momentMiniCard, pressed && __a3_styles.rowPressed]}>
      <View style={__a3_styles.momentThumb}>
        {thumb ? (
          <Image
            source={{ uri: thumb }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`home-${post.id}`}
          />
        ) : (
          <View style={__a3_styles.momentFallback}>
            <Ionicons name="heart-outline" size={24} color={__a3Colors.primary} />
          </View>
        )}
        {first?.type === "video" && (
          <View style={__a3_styles.videoBadge}><Ionicons name="play" size={13} color={__a3Colors.white} /></View>
        )}
      </View>
      <View style={__a3_styles.momentMiniCopy}>
        <Text style={__a3_styles.momentAuthor} numberOfLines={1}>{post.authorName}</Text>
        <Text style={__a3_styles.momentCaption} numberOfLines={2}>{post.caption || "Một khoảnh khắc nhỏ của nhà 🌷"}</Text>
        <Text style={__a3_styles.momentTime}>{compactMomentTime(post.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

function HomeSectionSkeleton({ kind = "rows" }: { kind?: "rows" | "grid" | "members" }) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  // P2.5: on a true cache miss keep first-install geometry stable without
  // running several independent opacity loops during the first visual frame.
  if (kind === "grid") {
    return (
      <View style={__a3_styles.skeletonGrid}>
        {[0, 1, 2, 3].map((index) => (
          <View key={index} style={__a3_styles.skeletonMoment}>
            <View style={__a3_styles.skeletonMomentMedia} />
            <View style={__a3_styles.skeletonLineWide} />
            <View style={__a3_styles.skeletonLineShort} />
          </View>
        ))}
      </View>
    );
  }

  if (kind === "members") {
    return (
      <View style={[__a3_styles.skeletonCard, __a3_styles.skeletonMembers]}>
        {[0, 1, 2].map((index) => (
          <View key={index} style={__a3_styles.skeletonMember}>
            <View style={__a3_styles.skeletonAvatar} />
            <View style={__a3_styles.skeletonMemberLine} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={__a3_styles.skeletonCard}>
      {[0, 1, 2].map((index) => (
        <View key={index} style={[__a3_styles.skeletonRow, index > 0 && __a3_styles.skeletonRowBorder]}>
          <View style={__a3_styles.skeletonSquare} />
          <View style={__a3_styles.skeletonCopy}>
            <View style={__a3_styles.skeletonLineWide} />
            <View style={__a3_styles.skeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

const HomeSummaryIsland = memo(function HomeSummaryIsland({
  membersCount, summaryEvents, summaryMoments, currentRole, familyCount,
}: { membersCount: number; summaryEvents: string; summaryMoments: string; currentRole: string; familyCount: number }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  return (
    <>
      <View style={__a3_styles.summaryGrid}>
        <Pressable onPress={() => router.push("/family")} style={({ pressed }) => [__a3_styles.summaryCard, pressed && __a3_styles.rowPressed]}>
          <View style={__a3_styles.summaryIcon}><Ionicons name="people-circle-outline" size={19} color={__a3Colors.primaryText} /></View>
          <Text style={__a3_styles.summaryValue}>{membersCount || "–"}</Text><Text style={__a3_styles.summaryLabel}>Thành viên</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/planner")} style={({ pressed }) => [__a3_styles.summaryCard, pressed && __a3_styles.rowPressed]}>
          <View style={__a3_styles.summaryIcon}><Ionicons name="calendar-outline" size={19} color={__a3Colors.primaryText} /></View>
          <Text style={__a3_styles.summaryValue}>{summaryEvents}</Text><Text style={__a3_styles.summaryLabel}>Sự kiện gần</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/moments")} style={({ pressed }) => [__a3_styles.summaryCard, pressed && __a3_styles.rowPressed]}>
          <View style={__a3_styles.summaryIcon}><Ionicons name="images-outline" size={19} color={__a3Colors.primaryText} /></View>
          <Text style={__a3_styles.summaryValue}>{summaryMoments}</Text><Text style={__a3_styles.summaryLabel}>Kỷ niệm mới</Text>
        </Pressable>
      </View>
      <View style={__a3_styles.homePillRow}>
        <BloomPill icon="heart-circle-outline" label={currentRole} />
        <BloomPill icon="people-outline" label={`${membersCount || 1} người thương`} />
        <BloomPill icon="layers-outline" label={`${familyCount || 1} mái nhà`} />
      </View>
    </>
  );
});

const HomeOnThisDayIsland = memo(function HomeOnThisDayIsland({ posts, loading }: { posts: MomentPost[]; loading: boolean }) {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  return (
    <View style={__a3_styles.section}>
      <BloomSectionHeader title="Ngày này năm xưa" subtitle="Bloom nhặt lại những kỷ niệm của cả nhà đúng ngày hôm nay" />
      {posts.length ? (
        <BloomCard style={__a3_styles.onThisDayCard} shape="polaroid" artwork={getBloomHeroArt('moments', __a3Theme.selection.palette)}>
          {posts.slice(0, 3).map((post, index) => {
            const memoryDate = new Date(post.createdAt);
            const yearsAgo = Math.max(1, new Date().getFullYear() - memoryDate.getFullYear());
            const first = post.media?.[0];
            const thumb = !first ? null : first.type === "video"
              ? cloudinaryVideoThumbnail(first.thumbnailUrl || first.secureUrl)
              : cloudinaryImageThumbnail(first.thumbnailUrl || first.secureUrl);
            return (
              <View key={post.id}>
                {index > 0 && <View style={__a3_styles.onThisDayDivider} />}
                <Pressable onPress={() => router.navigate({ pathname: "/(tabs)/moments", params: { highlightMomentId: post.id } } as never)} style={({ pressed }) => [__a3_styles.onThisDayRow, pressed && __a3_styles.rowPressed]}>
                  <View style={__a3_styles.onThisDayThumb}>
                    {thumb ? <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={`today-${post.id}`} /> : <Ionicons name="flower-outline" size={22} color={__a3Colors.primary} />}
                    {first?.type === "video" && <View style={__a3_styles.onThisDayPlay}><Ionicons name="play" size={10} color={__a3Colors.white} /></View>}
                  </View>
                  <View style={__a3_styles.onThisDayCopy}>
                    <Text style={__a3_styles.onThisDayAgo}>{yearsAgo} NĂM TRƯỚC</Text>
                    <Text style={__a3_styles.onThisDayTitle} numberOfLines={2}>{post.caption.trim() || "Một kỷ niệm của cả nhà"}</Text>
                    <Text style={__a3_styles.onThisDayMeta}>{post.authorName}{post.media.length ? ` · ${post.media.length} ảnh/video` : ""}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={__a3Colors.secondaryText} />
                </Pressable>
              </View>
            );
          })}
        </BloomCard>
      ) : loading ? <HomeSectionSkeleton /> : (
        <BloomCard style={__a3_styles.onThisDayEmpty}>
          <View style={__a3_styles.onThisDayEmptyIcon}><Ionicons name="time-outline" size={22} color={__a3Colors.primary} /></View>
          <View style={__a3_styles.onThisDayEmptyCopy}>
            <Text style={__a3_styles.onThisDayEmptyTitle}>Hôm nay chưa có kỷ niệm cũ</Text>
            <Text style={__a3_styles.onThisDayEmptyText}>Khi cả nhà từng giữ một kỷ niệm vào ngày này, Bloom sẽ nhẹ nhàng mang nó trở lại đây.</Text>
          </View>
        </BloomCard>
      )}
    </View>
  );
});

const HomeUpcomingIsland = memo(function HomeUpcomingIsland({
  events,
  memberByUid,
  hasMore,
  loading,
}: {
  events: FamilyEvent[];
  memberByUid: Map<string, FamilyMember>;
  hasMore: boolean;
  loading: boolean;
}) {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  return (
    <View style={__a3_styles.section}>
      <BloomSectionHeader
        title="Sắp tới trong nhà"
        subtitle="Những ngày cả nhà đang cùng mong chờ"
        actionIcon="calendar-outline"
        onAction={() => router.push("/planner")}
      />
      {events.length ? (
        <View style={__a3_styles.eventTicketList}>
          {events.slice(0, 3).map((event) => (
            <DashboardEventRow
              key={event.id}
              event={event}
              creatorName={memberByUid.get(event.createdByUid)?.shortName || memberByUid.get(event.createdByUid)?.displayName}
              onPress={() => router.push(`/event/${event.id}` as never)}
            />
          ))}
          {hasMore && (
            <Pressable onPress={() => router.push("/planner")} style={({ pressed }) => [__a3_styles.softMore, pressed && __a3_styles.rowPressed]}>
              <Ionicons name="flower-outline" size={15} color={__a3Colors.primary} />
              <Text style={__a3_styles.softMoreText}>Còn những ngày vui khác đang chờ 🌷</Text>
            </Pressable>
          )}
        </View>
      ) : loading ? <HomeSectionSkeleton /> : (
        <BloomEmptyState icon="calendar-outline" title="Lịch nhà đang thật thảnh thơi" description="Gieo một ngày đáng nhớ để cả nhà cùng mong chờ nhé." compact />
      )}
    </View>
  );
});

const HomeMomentsIsland = memo(function HomeMomentsIsland({ moments, loading }: { moments: MomentPost[]; loading: boolean }) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  return (
    <View style={__a3_styles.section}>
      <BloomSectionHeader title="Kỷ niệm mới nở" subtitle="Một vài điều vừa được giữ lại cho nhà mình" actionIcon="images-outline" onAction={() => router.push("/moments")} />
      {moments.length ? (
        <View style={__a3_styles.momentGrid}>
          {moments.slice(0, 4).map((post) => <DashboardMomentCard key={post.id} post={post} onPress={() => router.push("/moments")} />)}
        </View>
      ) : loading ? <HomeSectionSkeleton kind="grid" /> : (
        <BloomEmptyState icon="images-outline" title="Tường nhà đang chờ chuyện mới" description="Một bức ảnh nhỏ cũng đủ làm ngôi nhà ấm hơn đó 🌸" compact />
      )}
    </View>
  );
});

const HomeMembersIsland = memo(function HomeMembersIsland({ members, loading }: { members: FamilyMember[]; loading: boolean }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const visibleMembers = members.slice(0, DATA_LIMITS.dashboard.visibleMembers);
  return (
    <View style={__a3_styles.section}>
      <BloomSectionHeader
        title="Mọi người trong nhà"
        subtitle={members.length ? `${members.length} người đang cùng vun một mái nhà` : "Những gương mặt thân quen sẽ hiện ở đây"}
      />
      {visibleMembers.length ? (
        <BloomCard style={__a3_styles.memberStripCard}>
          <View style={__a3_styles.memberStrip}>
            {visibleMembers.map((member) => (
              <Pressable key={member.uid} onPress={() => router.push(`/member/${member.uid}` as never)} style={({ pressed }) => [__a3_styles.memberMini, pressed && __a3_styles.rowPressed]}>
                <View style={__a3_styles.memberMiniAvatar}>
                  {member.avatarUrl ? (
                    <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" recyclingKey={`home-member-${member.uid}`} />
                  ) : <Text style={__a3_styles.memberInitial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>}
                </View>
                <Text style={__a3_styles.memberMiniName} numberOfLines={1}>{member.shortName || member.displayName}</Text>
              </Pressable>
            ))}
          </View>
          {members.length > visibleMembers.length && <Text style={__a3_styles.memberExtra}>Và {members.length - visibleMembers.length} người thương khác 🌷</Text>}
          <Pressable accessibilityRole="button" accessibilityLabel="Xem tất cả thành viên" onPress={() => router.push("/family")} style={__a3_styles.memberViewAll}>
            <Ionicons name="people-circle-outline" size={20} color={__a3Colors.primary} /><Text style={__a3_styles.memberViewAllText}>Xem thành viên</Text><Ionicons name="arrow-forward" size={17} color={__a3Colors.primary} />
          </Pressable>
        </BloomCard>
      ) : loading ? <HomeSectionSkeleton kind="members" /> : (
        <BloomEmptyState icon="people-outline" title="Mái nhà đang chờ thêm người thương" description="Khi có thành viên, những gương mặt thân quen sẽ hiện ở đây." compact />
      )}
    </View>
  );
});

export default function HomeScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  useTabStartupTask("home");
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const [familySwitcherVisible, setFamilySwitcherVisible] = useState(false);
  const [homeFocused, setHomeFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setHomeFocused(true);
    return () => setHomeFocused(false);
  }, []));
  const { user, userProfile, families } = useAuth();
  const activeMembership = families.find((item) => item.familyId === userProfile?.activeFamilyId);
  const activeFamilyId = userProfile?.activeFamilyId;
  const originalName = (userProfile?.shortName || userProfile?.displayName || "bạn").trim();
  const displayName = originalName.length > 17 ? originalName.split(/\s+/).filter(Boolean).slice(-1)[0] || "bạn" : originalName;
  const avatarSource = userProfile?.avatarUrl ? { uri: userProfile.avatarUrl } : undefined;
  const currentRole = activeMembership?.role ? roleLabel[activeMembership.role] ?? "Thành viên" : "Thành viên";
  const { items: onThisDay, loading: onThisDayLoading } = useOnThisDayMemories(activeFamilyId);
  const {
    members,
    memberByUid,
    upcomingEvents,
    upcomingHasMore,
    recentMoments,
    momentsHaveMore,
    membersLoading,
    eventsLoading,
    momentsLoading,
  } = useFamilyDashboard(activeFamilyId);

  const summaryEvents = eventsLoading && !upcomingEvents.length
    ? "–"
    : `${Math.min(upcomingEvents.length, DATA_LIMITS.dashboard.upcomingEvents)}${upcomingHasMore ? "+" : ""}`;
  const summaryMoments = momentsLoading && !recentMoments.length
    ? "–"
    : `${Math.min(recentMoments.length, DATA_LIMITS.dashboard.recentMoments)}${momentsHaveMore ? "+" : ""}`;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <ScrollView contentContainerStyle={__a3_styles.content} showsVerticalScrollIndicator={false}>
        <BloomRouteEntrance><BloomHeroHeader
          eyebrow={greetingForNow().toUpperCase()}
          title={`Xin chào, ${displayName} 🌸`}
          subtitle="Mỗi ngày một niềm vui, mỗi khoảnh khắc một kỷ niệm Nhà Mình."
          variant="living"
          roundedBottom
          topLeft={
            <Pressable
              onPress={() => setFamilySwitcherVisible(true)}
              style={({ pressed }) => [__a3_styles.heroFamilyPill, { width: Math.max(115, Math.min(224, screenWidth - 160)) }, pressed && __a3_styles.rowPressed]}
            >
              <View style={__a3_styles.heroFamilyIcon}><Ionicons name="home" size={17} color={__a3Colors.primaryText} /></View>
              <View style={__a3_styles.heroFamilyCopy}>
                <Text style={__a3_styles.heroFamilyEyebrow}>MÁI NHÀ HÔM NAY</Text>
                <Text style={__a3_styles.heroFamilyName} numberOfLines={1}>{activeMembership?.familyName || "Gia đình của mình"}</Text>
              </View>
              <Ionicons name="chevron-down" size={17} color={__a3Colors.primaryText} />
            </Pressable>
          }
          right={
            <View style={__a3_styles.headerActions}>
              <HomeActivityBell invalidationKey={`${recentMoments[0]?.id ?? ""}|${upcomingEvents[0]?.id ?? ""}`} />
              <BloomAvatarButton
                source={avatarSource}
                text={userProfile?.displayName || displayName}
                size={44}
                onPress={() => router.push("/settings" as never)}
                customStyle={__a3_styles.avatar}
              />
            </View>
          }
        /></BloomRouteEntrance>

        <View style={__a3_styles.pageBody}>
        <BloomMotionReveal sceneKey="home-summary" active={homeFocused} distance={13} startOpacity={0.28} delayMs={120}><HomeSummaryIsland
          membersCount={members.length}
          summaryEvents={summaryEvents}
          summaryMoments={summaryMoments}
          currentRole={currentRole}
          familyCount={families.length}
        /></BloomMotionReveal>

        <View style={__a3_styles.section}>
          <BloomSectionHeader
            title="Nhà Mình đang nở"
            subtitle="Những góc nhỏ để cùng sẻ chia, cùng chơi và cùng giữ điều đáng nhớ"
            actionIcon="arrow-forward-circle-outline"
            onAction={() => router.push("/play" as never)}
          />
          <View style={__a3_styles.featureGrid}>
            <HomeFeatureCard icon="chatbubble-ellipses-outline" title="Lời thì thầm" caption="Gửi một lời nhỏ chỉ người thương mới nhận được." onPress={() => router.push("/home-whispers" as never)} />
            <HomeFeatureCard icon="hourglass-outline" title="Hộp thời gian" caption="Cất một lời nhắn và để Bloom trao vào đúng ngày." badge="MỚI" onPress={() => router.push("/home-time-capsules" as never)} />
            <HomeFeatureCard icon="restaurant-outline" title="Bếp Nhà Mình" caption="Mỗi ngày một gợi ý vừa miệng với cả nhà." onPress={() => router.push("/home-kitchen" as never)} />
            <HomeFeatureCard icon="checkbox-outline" title="Cùng quyết định" caption="Một câu hỏi nhỏ để cả nhà cùng chọn." onPress={() => router.push("/home-polls" as never)} />
            <HomeFeatureCard icon="game-controller-outline" title="Trò chơi" caption="Cùng nhau chơi Cờ vua và Cờ tướng." onPress={() => router.push("/home-games" as never)} />
            <HomeFeatureCard icon="wallet-outline" title="Quỹ gia đình" caption="Giữ những khoản chung thật rõ ràng và nhẹ nhàng." onPress={() => router.push("/home-fund" as never)} />
          </View>
        </View>

        <HomeUpcomingIsland events={upcomingEvents} memberByUid={memberByUid} hasMore={upcomingHasMore} loading={eventsLoading} />

        <HomeOnThisDayIsland posts={onThisDay} loading={onThisDayLoading} />

        <HomeMomentsIsland moments={recentMoments} loading={momentsLoading} />

        <HomeMembersIsland members={members} loading={membersLoading} />

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Đi nhanh" subtitle="Những việc nhà mình hay ghé" />
          <View style={__a3_styles.quickGrid}>
            <BloomQuickAction icon="images-outline" label="Khoảnh khắc" caption="Giữ lại chuyện nhỏ hôm nay" onPress={() => router.push("/moments")} />
            <BloomQuickAction icon="calendar-outline" label="Lịch nhà" caption="Nhớ những ngày quan trọng" onPress={() => router.push("/planner")} />
            <BloomQuickAction icon="people-outline" label="Cây nhà" caption="Ghé thăm mọi người" onPress={() => router.push("/family")} />
            {/* Trò chuyện đang tạm ẩn; giữ route/feature để phát triển trong giai đoạn sau. */}
            <BloomQuickAction icon="school-outline" label="Góc học tập" caption="Mỗi ngày một điều mới" onPress={() => router.push("/learning-library" as never)} />
          </View>
        </View>

        <View style={__a3_styles.bottomSpace} />
        </View>
      </ScrollView>
      <FamilySwitcherModal visible={familySwitcherVisible} onClose={() => setFamilySwitcherVisible(false)} />
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  content: { paddingBottom: 158, backgroundColor: COLORS.background },
  pageBody: { marginTop: -3, paddingHorizontal: 16, paddingTop: 16, backgroundColor: COLORS.background },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 9 },
  avatar: { borderColor: COLORS.white, borderWidth: 2 },
  heroFamilyPill: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.shadow, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 },
  heroFamilyIcon: { width: 36, height: 36, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  heroFamilyCopy: { flex: 1, minWidth: 0 },
  heroFamilyEyebrow: { color: COLORS.primary, fontSize: 8, fontWeight: "900", letterSpacing: 0.8 },
  heroFamilyName: { marginTop: 2, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  homePillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: -10, marginBottom: 27 },
  familyHero: { marginBottom: 16, padding: 18 },
  familyHeroTop: { flexDirection: "row", alignItems: "center" },
  familyIconWrap: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, marginRight: 12 },
  familyHeroTitleWrap: { flex: 1, minWidth: 0 },
  familyKicker: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  familyName: { marginTop: 4, color: COLORS.primaryText, fontSize: 19, fontWeight: "900" },
  pillRow: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  summaryGrid: { flexDirection: "row", gap: 9, marginBottom: 27 },
  summaryCard: { flex: 1, minHeight: 116, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 12 },
  summaryIcon: { width: 34, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  summaryValue: { marginTop: 9, color: COLORS.primaryText, fontSize: 21, fontWeight: "900" },
  summaryLabel: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 14 },
  section: { marginBottom: 24 },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  featureCard: { width: "48.3%", minHeight: 170, padding: 15, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  featureArtHalo: { position: "absolute", top: -19, right: -15, width: 98, height: 98, borderRadius: 49, opacity: 0.12, backgroundColor: COLORS.heroSurface, justifyContent: "center", alignItems: "center", transform: [{rotate: "-13deg"}] },
  featureTop: { minHeight: 42, flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  featureIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  featureBadge: { borderRadius: 999, backgroundColor: COLORS.softSurface, paddingHorizontal: 8, paddingVertical: 4 },
  featureBadgeText: { color: COLORS.primary, fontSize: 8, fontWeight: "900", letterSpacing: 0.6 },
  featureTitle: { marginTop: 13, color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900" },
  featureCaption: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.6, lineHeight: 15.5 },
  featureArrow: { marginTop: 10, alignSelf: "flex-end", width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  compactCard: { paddingVertical: 4, paddingHorizontal: 13, overflow: "hidden" },
  // R11R3: one independent ticket per event; never a nested card.
  eventTicketList: { gap: 9 },
  eventTicket: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, minHeight: 84, shadowColor: COLORS.shadow, shadowOpacity: 0.045, shadowRadius: 8, shadowOffset: {width:0,height:3}, elevation: 1 },
  eventClock: { alignItems: "center", gap: 2, padding: 6, backgroundColor: COLORS.softSurface, borderRadius: 10 },
  eventClockText: { fontSize: 11, fontWeight: "900", color: COLORS.primaryText },
  eventRow: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 10 },
  eventDateBox: { width: 48, height: 54, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  eventDay: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  eventMonth: { marginTop: 1, color: COLORS.primary, fontSize: 8.5, fontWeight: "900" },
  eventCopy: { flex: 1, minWidth: 0 },
  eventTitle: { color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900" },
  eventMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11.5 },
  eventCreator: { marginTop: 3, color: COLORS.primary, fontSize: 10.5, fontWeight: "700" },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 59 },
  softMore: { minHeight: 43, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginVertical: 6, borderRadius: 14, backgroundColor: COLORS.softSurface },
  softMoreText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "800" },
  onThisDayCard: { paddingVertical: 4, paddingHorizontal: 13 },
  onThisDayRow: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  onThisDayThumb: { width: 58, height: 58, borderRadius: 20, overflow: "hidden", backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  onThisDayPlay: { position: "absolute", right: 5, bottom: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.overlay, alignItems: "center", justifyContent: "center" },
  onThisDayCopy: { flex: 1, minWidth: 0 },
  onThisDayAgo: { color: COLORS.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  onThisDayTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900" },
  onThisDayMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5 },
  onThisDayDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 70 },
  onThisDayEmpty: { minHeight: 92, flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  onThisDayEmptyIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  onThisDayEmptyCopy: { flex: 1, minWidth: 0 },
  onThisDayEmptyTitle: { color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900" },
  onThisDayEmptyText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.8, lineHeight: 15.5 },
  momentGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 11 },
  momentMiniCard: { width: "48.4%", overflow: "hidden", borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  momentThumb: { width: "100%", aspectRatio: 1.35, backgroundColor: COLORS.softSurface, overflow: "hidden" },
  momentFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  videoBadge: { position: "absolute", left: 9, bottom: 9, width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.overlay, alignItems: "center", justifyContent: "center" },
  momentMiniCopy: { padding: 11 },
  momentAuthor: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  momentCaption: { marginTop: 4, minHeight: 32, color: COLORS.primaryText, fontSize: 11.5, lineHeight: 16 },
  momentTime: { marginTop: 7, color: COLORS.secondaryText, fontSize: 10 },
  memberStripCard: { padding: 14 },
  memberStrip: { flexDirection: "row", flexWrap: "wrap", justifyContent: "flex-start", gap: 13 },
  memberMini: { width: "29.5%", alignItems: "center" },
  memberMiniAvatar: { width: 54, height: 54, borderRadius: 20, overflow: "hidden", backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  memberInitial: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  memberMiniName: { marginTop: 6, width: "100%", color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800", textAlign: "center" },
  memberViewAll: { marginTop: 15, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  memberViewAllText: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },
  memberExtra: { marginTop: 13, color: COLORS.secondaryText, fontSize: 10.5, textAlign: "center" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 12 },
  skeletonCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 13, overflow: "hidden" },
  skeletonRow: { minHeight: 79, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 },
  skeletonRowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  skeletonSquare: { width: 48, height: 54, borderRadius: 16, backgroundColor: COLORS.softSurface },
  skeletonCopy: { flex: 1, gap: 8 },
  skeletonLineWide: { width: "78%", height: 11, borderRadius: 6, backgroundColor: COLORS.softSurface },
  skeletonLineShort: { width: "52%", height: 9, borderRadius: 5, backgroundColor: COLORS.softSurface },
  skeletonGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 11 },
  skeletonMoment: { width: "48.4%", minHeight: 180, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, overflow: "hidden", paddingBottom: 13 },
  skeletonMomentMedia: { width: "100%", aspectRatio: 1.35, backgroundColor: COLORS.softSurface, marginBottom: 12 },
  skeletonMembers: { minHeight: 104, flexDirection: "row", justifyContent: "space-around", alignItems: "center", paddingVertical: 14 },
  skeletonMember: { width: "30%", alignItems: "center", gap: 8 },
  skeletonAvatar: { width: 54, height: 54, borderRadius: 20, backgroundColor: COLORS.softSurface },
  skeletonMemberLine: { width: 58, height: 9, borderRadius: 5, backgroundColor: COLORS.softSurface },
  rowPressed: { opacity: 0.68 },
  bottomSpace: { height: 12 },
}));
