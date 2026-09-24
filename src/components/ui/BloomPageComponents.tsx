import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { COLORS, UI } from "../../constants/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

type BloomCardTone = "default" | "soft" | "accent";

export function BloomBackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.backButton, pressed && styles.cardPressed]}
    >
      <Ionicons name="arrow-back" size={21} color={COLORS.primaryText} />
    </Pressable>
  );
}

export function BloomPageHeader({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageHeaderCopy}>
        {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.pageTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.pageSubtitle}>{subtitle}</Text>}
      </View>
      {!!right && <View style={styles.pageHeaderRight}>{right}</View>}
    </View>
  );
}

export function BloomSectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {!!actionLabel && !!onAction && (
        <Pressable onPress={onAction} hitSlop={10} style={({ pressed }) => pressed && styles.pressedOpacity}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function BloomCard({
  children,
  tone = "default",
  style,
  onPress,
}: {
  children: ReactNode;
  tone?: BloomCardTone;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  const cardStyle = [
    styles.card,
    tone === "soft" && styles.cardSoft,
    tone === "accent" && styles.cardAccent,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [cardStyle, pressed && styles.cardPressed]}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

export function BloomQuickAction({
  icon,
  label,
  caption,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  caption?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.quickAction, pressed && styles.cardPressed]}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={22} color={COLORS.primaryText} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      {!!caption && <Text style={styles.quickCaption}>{caption}</Text>}
    </Pressable>
  );
}

export function BloomInfoRow({
  icon,
  label,
  value,
}: {
  icon: IoniconName;
  label: string;
  value?: string | null;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, !value && styles.infoValueEmpty]}>{value || "Chưa cập nhật"}</Text>
      </View>
    </View>
  );
}

export function BloomListRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  trailing,
}: {
  icon: IoniconName;
  title: string;
  subtitle?: string;
  badge?: string;
  onPress?: () => void;
  trailing?: ReactNode;
}) {
  const content = (
    <>
      <View style={styles.listIcon}>
        <Ionicons name={icon} size={20} color={COLORS.primaryText} />
      </View>
      <View style={styles.listCopy}>
        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>{title}</Text>
          {!!badge && (
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {!!subtitle && <Text style={styles.listSubtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} /> : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && styles.listRowPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.listRow}>{content}</View>;
}

export function BloomEmptyState({
  icon,
  title,
  description,
  compact = false,
}: {
  icon: IoniconName;
  title: string;
  description: string;
  compact?: boolean;
}) {
  return (
    <View style={[styles.emptyState, compact && styles.emptyStateCompact]}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={COLORS.primary} />
      </View>
      <View style={styles.emptyCopy}>
        <Text style={styles.emptyTitle}>{title}</Text>
        <Text style={styles.emptyDescription}>{description}</Text>
      </View>
    </View>
  );
}

export function BloomPill({
  label,
  icon,
}: {
  label: string;
  icon?: IoniconName;
}) {
  return (
    <View style={styles.pill}>
      {!!icon && <Ionicons name={icon} size={13} color={COLORS.primaryText} />}
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 4,
    paddingBottom: 20,
  },
  pageHeaderCopy: { flex: 1 },
  pageHeaderRight: { flexShrink: 0 },
  eyebrow: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  pageTitle: {
    fontSize: 27,
    lineHeight: 32,
    fontWeight: "900",
    color: COLORS.primaryText,
    letterSpacing: -0.45,
  },
  pageSubtitle: {
    marginTop: 6,
    color: COLORS.secondaryText,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  sectionCopy: { flex: 1 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primaryText,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    lineHeight: 18,
    color: COLORS.secondaryText,
  },
  sectionAction: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 2,
  },
  pressedOpacity: { opacity: 0.55 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.borderRadiusCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    shadowColor: "#7E5260",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },
  cardSoft: { backgroundColor: COLORS.softSurface },
  cardAccent: { backgroundColor: COLORS.accentBg, borderColor: "#F3CEDA" },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  quickAction: {
    width: "48.2%",
    minHeight: 132,
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    justifyContent: "flex-start",
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.softSurface,
    marginBottom: 13,
  },
  quickLabel: {
    color: COLORS.primaryText,
    fontSize: 15,
    fontWeight: "800",
  },
  quickCaption: {
    marginTop: 4,
    color: COLORS.secondaryText,
    fontSize: 11.5,
    lineHeight: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: COLORS.softSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCopy: { flex: 1 },
  infoLabel: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  infoValue: { marginTop: 3, color: COLORS.primaryText, fontSize: 14, fontWeight: "800" },
  infoValueEmpty: { color: COLORS.secondaryText, fontWeight: "600" },
  listRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 2,
  },
  listRowPressed: { opacity: 0.62 },
  listIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: COLORS.softSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  listCopy: { flex: 1, minWidth: 0 },
  listTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  listTitle: { flexShrink: 1, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  listSubtitle: { marginTop: 4, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  listBadge: { backgroundColor: COLORS.accentBg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  listBadgeText: { color: COLORS.primaryText, fontSize: 9.5, fontWeight: "900" },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  emptyStateCompact: { paddingVertical: 13 },
  emptyIcon: {
    width: 45,
    height: 45,
    borderRadius: 16,
    backgroundColor: COLORS.softSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCopy: { flex: 1 },
  emptyTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "800" },
  emptyDescription: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
});
