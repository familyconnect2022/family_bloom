import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS, UI } from "../../constants/theme";
import type { FamilyEvent, FamilyMember } from "../../types";
import { formatEventDate, getEventStatus } from "../../utils/event";

const iconFor = (type: FamilyEvent["eventType"]): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "birthday": return "gift-outline";
    case "anniversary": return "heart-outline";
    case "personal": return "person-outline";
    case "other": return "sparkles-outline";
    default: return "people-outline";
  }
};

const statusLabel = (event: FamilyEvent) => {
  const status = getEventStatus(event);
  if (status === "today") return "HÔM NAY";
  if (status === "past") return "ĐÃ QUA";
  return event.recurrence === "yearly" ? "HÀNG NĂM" : "SẮP TỚI";
};

export function EventCard({
  event,
  memberByUid,
  onPress,
  pending = false,
}: {
  event: FamilyEvent;
  memberByUid: Map<string, FamilyMember>;
  onPress?: () => void;
  pending?: boolean;
}) {
  const creator = memberByUid.get(event.createdByUid);
  const participantNames = event.participantsMode === "all"
    ? "Cả gia đình"
    : event.participantIds
        .slice(0, 3)
        .map((uid) => memberByUid.get(uid)?.shortName || memberByUid.get(uid)?.displayName || "Thành viên")
        .join(", ");
  const extra = event.participantsMode === "selected" && event.participantIds.length > 3
    ? ` +${event.participantIds.length - 3}`
    : "";

  const content = (
    <>
      <View style={styles.iconBox}>
        {pending ? (
          <Ionicons name="cloud-upload-outline" size={21} color={COLORS.primary} />
        ) : (
          <Ionicons name={iconFor(event.eventType)} size={21} color={COLORS.primaryText} />
        )}
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{event.title}</Text>
          <View style={[styles.badge, getEventStatus(event) === "past" && styles.badgePast]}>
            <Text style={styles.badgeText}>{pending ? "ĐANG ĐĂNG" : statusLabel(event)}</Text>
          </View>
        </View>
        <Text style={styles.date}>{formatEventDate(event)}</Text>
        <View style={styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={COLORS.secondaryText} />
          <Text style={styles.metaText} numberOfLines={1}>{participantNames}{extra}</Text>
        </View>
        {!!event.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.secondaryText} />
            <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
          </View>
        )}
        {!!creator && <Text style={styles.creator}>Tạo bởi {creator.shortName || creator.displayName}</Text>}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} />}
    </>
  );

  if (!onPress) return <View style={[styles.card, pending && styles.pending]}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pending && styles.pending, pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 104,
    padding: 14,
    borderRadius: UI.borderRadiusCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.994 }] },
  pending: { backgroundColor: "#FFF8FB", borderColor: "#F2BED0" },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: COLORS.softSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, color: COLORS.primaryText, fontSize: 15.5, fontWeight: "900" },
  badge: { backgroundColor: COLORS.accentBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgePast: { backgroundColor: "#F4F1F3" },
  badgeText: { color: COLORS.primaryText, fontSize: 8.8, fontWeight: "900", letterSpacing: 0.35 },
  date: { marginTop: 5, color: COLORS.primary, fontSize: 12.5, fontWeight: "800" },
  metaRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5 },
  creator: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5 },
});
