import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { cloudinaryVideoThumbnail, inferMediaViewerType, useMediaViewer } from "../../components/media/MediaViewerProvider";
import { BloomBackButton, BloomCard, BloomEmptyState, BloomInfoRow, BloomPill } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { eventService } from "../../services/event/eventService";
import { useFamilyEvent } from "../../hooks/useFamilyEvent";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";
import { useFamilyPersonDirectory } from "../../hooks/useFamilyPersonDirectory";
import type { FamilyMember } from "../../types";
import { formatEventDate, getEventStatus } from "../../utils/event";

const statusCopy = (status: ReturnType<typeof getEventStatus>) => {
  if (status === "today") return "Hôm nay";
  if (status === "past") return "Đã qua";
  return "Sắp tới";
};

const roleLabel = (role: FamilyMember["role"]) => {
  if (role === "admin" || role === "owner") return "Quản trị viên";
  if (role === "child") return "Thành viên nhỏ";
  return "Thành viên";
};

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ eventId?: string | string[] }>();
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId;
  const { activeFamilyId, families } = useAuth();
  const { event, loading } = useFamilyEvent(activeFamilyId, eventId);
  const { members, memberByUid } = useFamilyMembers(activeFamilyId);
  const { personById } = useFamilyPersonDirectory(activeFamilyId, !!event);
  const { openMediaViewer } = useMediaViewer();
  const membership = families.find((item) => item.familyId === activeFamilyId);
  const canModerate = membership?.role === "owner" || membership?.role === "admin";

  if (loading) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.primary} />
          <Text style={styles.loadingText}>Bloom đang mở sự kiện…</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!event) {
    return (
      <ScreenContainer>
        <View style={styles.headerRow}><BloomBackButton onPress={() => router.back()} /></View>
        <BloomEmptyState icon="calendar-clear-outline" title="Không tìm thấy sự kiện" description="Sự kiện có thể đã được xóa hoặc bạn không còn quyền xem." />
      </ScreenContainer>
    );
  }

  const creator = memberByUid.get(event.createdByUid);
  const selectedMembers = event.participantsMode === "selected"
    ? event.participantIds.map((uid) => memberByUid.get(uid)).filter((member): member is FamilyMember => !!member)
    : members;
  const missingCount = event.participantsMode === "selected" ? Math.max(0, event.participantIds.length - selectedMembers.length) : 0;
  const status = getEventStatus(event);
  const hideEvent = () => {
    if (!activeFamilyId || !canModerate || event.moderationStatus === "hidden") return;
    Alert.alert(
      "Ẩn sự kiện khỏi lịch gia đình?",
      "Sự kiện vẫn được giữ nguyên và người tạo vẫn là chủ sở hữu nội dung. Admin chỉ thay đổi trạng thái hiển thị.",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Ẩn sự kiện",
          style: "destructive",
          onPress: () => void eventService.setModerationStatus(activeFamilyId, event.id, "hidden")
            .then(() => router.back())
            .catch(() => Alert.alert("Chưa ẩn được", "Bloom chưa thể ẩn sự kiện lúc này. Bạn thử lại nhé.")),
        },
      ],
    );
  };

  const eventMedia = event.attachments.map((uri, index) => {
    const type = inferMediaViewerType(uri);
    return {
      id: event.attachmentPublicIds[index] || `event-media-${index}`,
      type,
      uri,
      thumbnailUri: type === "video" ? cloudinaryVideoThumbnail(uri) : uri,
      caption: event.title,
    };
  });

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <BloomBackButton onPress={() => router.back()} />
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>SỰ KIỆN GIA ĐÌNH</Text>
            <Text style={styles.title}>{event.title}</Text>
          </View>
        </View>

        <BloomCard tone="accent" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroIcon}><Ionicons name="calendar" size={26} color={COLORS.primaryText} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroDate}>{formatEventDate(event)}</Text>
              <View style={styles.pills}>
                <BloomPill label={statusCopy(status)} icon={status === "past" ? "checkmark-circle-outline" : "sparkles-outline"} />
                {event.recurrence === "yearly" && <BloomPill label="Lặp mỗi năm" icon="repeat-outline" />}
              </View>
            </View>
          </View>
        </BloomCard>

        {canModerate && event.moderationStatus !== "hidden" && (
          <Pressable onPress={hideEvent} style={({ pressed }) => [styles.moderationAction, pressed && styles.mediaPressed]}>
            <Ionicons name="eye-off-outline" size={18} color={COLORS.primary} />
            <View style={styles.moderationCopy}>
              <Text style={styles.moderationTitle}>Ẩn sự kiện</Text>
              <Text style={styles.moderationHint}>Admin chỉ ẩn/cho hiện · không sửa hoặc xóa nội dung của người khác</Text>
            </View>
          </Pressable>
        )}

        <BloomCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Thông tin</Text>
          <BloomInfoRow icon="time-outline" label="Thời gian" value={event.allDay ? "Cả ngày" : formatEventDate(event).split(" · ")[0]} />
          <BloomInfoRow icon="location-outline" label="Địa điểm" value={event.location} />
          <BloomInfoRow icon="person-outline" label="Người tạo" value={creator?.displayName || "Thành viên không còn trong nhà"} />
          <BloomInfoRow icon="people-outline" label="Phạm vi" value={event.participantsMode === "all" ? "Cả gia đình" : `${event.participantIds.length} thành viên được chọn`} />
        </BloomCard>

        {!!event.personIds?.length && (
          <BloomCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Person liên quan</Text>
            <Text style={styles.sectionSubtitle}>Những người trong phả hệ được gắn với sự kiện này.</Text>
            <View style={styles.personChipWrap}>
              {event.personIds.map((personId) => {
                const person = personById.get(personId);
                if (!person) return null;
                return (
                  <Pressable
                    key={personId}
                    onPress={() => router.push({
                      pathname: "/family-graph",
                      params: { focusPersonId: personId, detailPersonId: personId },
                    } as never)}
                    style={({ pressed }) => [styles.personChip, pressed && styles.mediaPressed]}
                  >
                    <View style={styles.personChipAvatar}>
                      <Text style={styles.personChipInitial}>{(person.nickname || person.displayName).trim().split(/\s+/).pop()?.slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.personChipText} numberOfLines={1}>{person.nickname || person.displayName}</Text>
                    <Ionicons name="chevron-forward" size={13} color={COLORS.secondaryText} />
                  </Pressable>
                );
              })}
            </View>
          </BloomCard>
        )}

        {!!event.description && (
          <BloomCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Một chút về ngày này</Text>
            <Text style={styles.description}>{event.description}</Text>
          </BloomCard>
        )}

        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Người tham gia</Text>
          <Text style={styles.sectionSubtitle}>{event.participantsMode === "all" ? "Tất cả thành viên hiện tại của nhà" : "Danh sách được lưu bằng UID và luôn resolve từ member hiện tại"}</Text>
          <View style={styles.memberList}>
            {selectedMembers.slice(0, 30).map((member) => (
              <View key={member.uid} style={styles.memberRow}>
                <View style={styles.avatar}>
                  {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.initial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>}
                </View>
                <View style={styles.memberCopy}>
                  <Text style={styles.memberName}>{member.displayName}</Text>
                  <Text style={styles.memberRole}>{roleLabel(member.role)}</Text>
                </View>
              </View>
            ))}
            {selectedMembers.length > 30 && <Text style={styles.moreMembers}>+{selectedMembers.length - 30} thành viên khác</Text>}
            {missingCount > 0 && <Text style={styles.missingMembers}>{missingCount} thành viên không còn trong nhà</Text>}
          </View>
        </View>

        {!!eventMedia.length && (
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Ảnh / video</Text>
            <Text style={styles.sectionSubtitle}>Chạm để xem toàn màn hình và vuốt qua từng media.</Text>
            <FlatList
              horizontal
              data={eventMedia.slice(0, 8)}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRow}
              initialNumToRender={4}
              maxToRenderPerBatch={4}
              windowSize={3}
              renderItem={({ item, index }) => (
                <Pressable
                  onPress={() => openMediaViewer({ items: eventMedia, initialIndex: index, title: event.title })}
                  style={({ pressed }) => [styles.mediaThumbWrap, pressed && styles.mediaPressed]}
                >
                  {item.thumbnailUri ? (
                    <Image source={{ uri: item.thumbnailUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={80} />
                  ) : (
                    <View style={styles.mediaFallback}><Ionicons name="videocam-outline" size={22} color={COLORS.primary} /></View>
                  )}
                  {item.type === "video" && (
                    <View style={styles.mediaPlay}><Ionicons name="play" size={14} color={COLORS.white} /></View>
                  )}
                  {index === 7 && eventMedia.length > 8 && (
                    <View style={styles.mediaMore}><Text style={styles.mediaMoreText}>+{eventMedia.length - 8}</Text></View>
                  )}
                </Pressable>
              )}
            />
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 4 },
  headerCopy: { flex: 1, paddingTop: 2 },
  eyebrow: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  title: { marginTop: 5, color: COLORS.primaryText, fontSize: 26, lineHeight: 31, fontWeight: "900" },
  heroCard: { gap: 12 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroDate: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  pills: { marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  moderationAction: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 14, paddingVertical: 10 },
  moderationCopy: { flex: 1 },
  moderationTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  moderationHint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  sectionCard: { gap: 3 },
  sectionBlock: { gap: 10 },
  sectionTitle: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  sectionSubtitle: { marginTop: -5, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  personChipWrap: { marginTop: 7, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  personChip: { maxWidth: "100%", minHeight: 42, flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, paddingHorizontal: 9 },
  personChipAvatar: { width: 28, height: 28, borderRadius: 11, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  personChipInitial: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  personChipText: { maxWidth: 210, flexShrink: 1, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  description: { color: COLORS.primaryText, fontSize: 14, lineHeight: 21 },
  memberList: { gap: 8 },
  memberRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 19, backgroundColor: COLORS.white, paddingHorizontal: 11, paddingVertical: 8 },
  avatar: { width: 39, height: 39, borderRadius: 14, overflow: "hidden", backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  initial: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  memberCopy: { flex: 1 },
  memberName: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  memberRole: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  moreMembers: { color: COLORS.primary, fontSize: 12, fontWeight: "800", textAlign: "center", paddingVertical: 6 },
  missingMembers: { color: COLORS.secondaryText, fontSize: 11.5, textAlign: "center", paddingVertical: 4 },
  mediaRow: { gap: 9, paddingRight: 12 },
  mediaThumbWrap: { width: 136, height: 102, borderRadius: 18, overflow: "hidden", backgroundColor: COLORS.softSurface },
  mediaPressed: { opacity: 0.76 },
  mediaFallback: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  mediaPlay: { position: "absolute", left: 10, bottom: 10, width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(58,38,46,0.58)", alignItems: "center", justifyContent: "center" },
  mediaMore: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(54,34,42,0.5)", alignItems: "center", justifyContent: "center" },
  mediaMoreText: { color: COLORS.white, fontSize: 23, fontWeight: "900" },
});
