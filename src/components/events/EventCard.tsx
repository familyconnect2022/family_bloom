import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { COLORS } from "../../constants/theme";
import { BLOOM_CARD_TITLE_SIZE, BLOOM_CARD_TITLE_LINE_HEIGHT } from "../ui/BloomCardTypography";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";
import type { FamilyEvent, FamilyMember } from "../../types";
import { formatEventDate, getEventStatus } from "../../utils/event";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const iconFor = (type: FamilyEvent["eventType"]): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "birthday": return "gift-outline";
    case "memorial": return "flower-outline";
    case "anniversary": return "heart-outline";
    case "gathering": return "home-outline";
    case "wedding": return "heart-circle-outline";
    case "travel": return "airplane-outline";
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
      <View style={__a3_styles.iconBox}>
        {pending ? (
          <Ionicons name="cloud-upload-outline" size={21} color={__a3Colors.primary} />
        ) : (
          <Ionicons name={iconFor(event.eventType)} size={21} color={__a3Colors.primaryText} />
        )}
      </View>
      <View style={__a3_styles.copy}>
        <Text style={__a3_styles.title}>{event.title}</Text>
        <View style={__a3_styles.titleRow}>
          <View style={[__a3_styles.badge, getEventStatus(event) === "past" && __a3_styles.badgePast]}>
            <Text style={__a3_styles.badgeText}>{pending ? "ĐANG ĐĂNG" : statusLabel(event)}</Text>
          </View>
          {!pending && event.notificationLevel !== "normal" && (
            <View style={[__a3_styles.importanceBadge, event.notificationLevel === "important" && __a3_styles.importanceBadgeStrong]}>
              <Text style={[__a3_styles.importanceText, event.notificationLevel === "important" && __a3_styles.importanceTextStrong]}>{event.notificationLevel === "important" ? "QUAN TRỌNG" : "ĐÁNG CHÚ Ý"}</Text>
            </View>
          )}
        </View>
        <Text style={__a3_styles.date}>{formatEventDate(event)}</Text>
        <View style={__a3_styles.metaRow}>
          <Ionicons name="people-outline" size={13} color={__a3Colors.secondaryText} />
          <Text style={__a3_styles.metaText} numberOfLines={1}>{participantNames}{extra}</Text>
        </View>
        {!!event.location && (
          <View style={__a3_styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={__a3Colors.secondaryText} />
            <Text style={__a3_styles.metaText} numberOfLines={1}>{event.location}</Text>
          </View>
        )}
        {!!creator && <Text style={__a3_styles.creator}>Tạo bởi {creator.shortName || creator.displayName}</Text>}
      </View>
      {!!onPress && <Ionicons name="chevron-forward" size={19} color={__a3Colors.secondaryText} />}
    </>
  );

  if (!onPress) return <View style={[__a3_styles.card, pending && __a3_styles.pending]}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [__a3_styles.card, pending && __a3_styles.pending, pressed && __a3_styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 104,
    padding: 14,
    borderRadius: BLOOM_SUPPER.radius.card,
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.card,
    backgroundColor: BLOOM_SUPPER.surface.card,
    shadowColor: BLOOM_SUPPER.shadow.color,
    shadowOffset: { width: 0, height: BLOOM_SUPPER.shadow.y },
    shadowOpacity: BLOOM_SUPPER.shadow.opacity,
    shadowRadius: BLOOM_SUPPER.shadow.radius,
    elevation: BLOOM_SUPPER.shadow.elevation,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.994 }] },
  pending: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: COLORS.softSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 7 },
  title: { flexShrink: 1, color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900" },
  badge: { backgroundColor: COLORS.accentBg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  badgePast: { backgroundColor: COLORS.surface },
  badgeText: { color: COLORS.primaryText, fontSize: 8.8, fontWeight: "900", letterSpacing: 0.35 },
  importanceBadge: { backgroundColor: COLORS.surfaceFocus, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 4 },
  importanceBadgeStrong: { backgroundColor: COLORS.primary },
  importanceTextStrong: { color: COLORS.onPrimary },
  importanceText: { color: COLORS.primaryText, fontSize: 7.8, fontWeight: "900", letterSpacing: 0.3 },
  date: { marginTop: 5, color: COLORS.primary, fontSize: 12.5, fontWeight: "800" },
  metaRow: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5 },
  creator: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5 },
}));
