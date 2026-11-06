import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, Image, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { BloomText as Text } from './BloomText';
import { COLORS, UI } from "../../constants/theme";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";
import { BLOOM_CARD_TITLE_SIZE, BLOOM_CARD_TITLE_LINE_HEIGHT } from "./BloomCardTypography";
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type IoniconName = keyof typeof Ionicons.glyphMap;

type BloomCardTone = "default" | "soft" | "accent";

export function BloomBackButton({ onPress }: { onPress: () => void }) {
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors } = useA3Theme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Quay lại"
      hitSlop={8}
      onPress={() => { onPress(); }}
      style={({ pressed }) => [__a3_styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }, pressed && __a3_styles.cardPressed]}
    >
      <Ionicons name="arrow-back" size={21} color={colors.primaryText} />
    </Pressable>
  );
}


export function BloomStickyHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  right?: ReactNode;
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors } = useA3Theme();
  return (
    <View style={[__a3_styles.stickyHeader, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.shadow }]}>
      <BloomBackButton onPress={onBack} />
      <View style={__a3_styles.stickyHeaderCopy}>
        <Text appearanceTone="primaryText" style={__a3_styles.stickyHeaderTitle} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text appearanceTone="secondaryText" style={__a3_styles.stickyHeaderSubtitle} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={__a3_styles.stickyHeaderRight}>{right ?? <View style={__a3_styles.stickyHeaderPlaceholder} />}</View>
    </View>
  );
}

export function BloomPageHeader({
  eyebrow,
  title,
  subtitle,
  left,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  return (
    <View style={__a3_styles.pageHeader}>
      {!!left && <View style={__a3_styles.pageHeaderLeft}>{left}</View>}
      <View style={__a3_styles.pageHeaderCopy}>
        {!!eyebrow && <Text appearanceTone="primary" style={__a3_styles.eyebrow}>{eyebrow}</Text>}
        <Text appearanceTone="primaryText" style={__a3_styles.pageTitle}>{title}</Text>
        {!!subtitle && <Text appearanceTone="secondaryText" style={__a3_styles.pageSubtitle}>{subtitle}</Text>}
      </View>
      {!!right && <View style={__a3_styles.pageHeaderRight}>{right}</View>}
    </View>
  );
}

export function BloomSectionHeader({
  title,
  subtitle,
  actionLabel,
  actionIcon,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionIcon?: IoniconName;
  onAction?: () => void;
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors } = useA3Theme();
  return (
    <View style={__a3_styles.sectionHeader}>
      <View style={__a3_styles.sectionCopy}>
        <Text appearanceTone="primaryText" style={__a3_styles.sectionTitle}>{title}</Text>
        {!!subtitle && <Text appearanceTone="secondaryText" style={__a3_styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {!!onAction && (!!actionLabel || !!actionIcon) && (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel || "Xem chi tiết"} onPress={onAction} hitSlop={8} style={({ pressed }) => [actionIcon && __a3_styles.sectionIconButton, pressed && __a3_styles.pressedOpacity]}>
          {actionIcon ? <Ionicons name={actionIcon} size={22} color={colors.primary} /> : <Text appearanceTone="primary" style={__a3_styles.sectionAction}>{actionLabel}</Text>}
        </Pressable>
      )}
    </View>
  );
}

/** Living Storybook: data cards stay clean; featured cards may opt in to
 * artwork and distinctive silhouettes. No tint is applied to real family photos.
 */
export function BloomCard({
  children,
  tone = 'default',
  style,
  onPress,
  artwork,
  shape = 'standard',
}: {
  children: ReactNode;
  tone?: BloomCardTone;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  artwork?: ImageSourcePropType;
  shape?: 'standard' | 'storybook' | 'ticket' | 'polaroid';
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors } = useA3Theme();
  // Explicit live colors prevent a retained native card from displaying a
  // previous palette until a press/focus forces a layout pass.
  const cardStyle = [__a3_styles.card,
    tone === 'soft' && __a3_styles.cardSoft,
    tone === 'accent' && __a3_styles.cardAccent,
    // Explicit reactive values MUST come after legacy theme-aware styles.
    // In Rose, all data cards share the same white surface.
    { backgroundColor: colors.card, borderColor: colors.border },
    shape === 'storybook' && { borderTopRightRadius: 39, borderBottomLeftRadius: 32, borderTopLeftRadius: 18 },
    shape === 'ticket' && { borderTopLeftRadius: 12, borderBottomRightRadius: 12, borderTopRightRadius: 27, borderBottomLeftRadius: 27 },
    shape === 'polaroid' && { borderRadius: 8, borderWidth: 5, borderColor: colors.surface },
    style,
  ];
  const content = <>
    {artwork ? <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { overflow: 'hidden', borderRadius: 17, opacity: 0.32 }]}>
      <Image source={artwork} resizeMode="cover" style={StyleSheet.absoluteFillObject}/>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.surface, opacity: 0.52 }]}/>
    </View> : null}
    {children}
  </>;
  if (onPress) {
    return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [cardStyle, pressed && __a3_styles.cardPressed]}>{content}</Pressable>;
  }
  return <View style={cardStyle}>{content}</View>;
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <Pressable onPress={() => { onPress(); }} style={({ pressed }) => [__a3_styles.quickAction, { backgroundColor: __a3Colors.surface, borderColor: __a3Colors.border }, pressed && __a3_styles.cardPressed]}>
      <View style={__a3_styles.quickIcon}>
        <Ionicons name={icon} size={22} color={__a3Colors.primaryText} />
      </View>
      <Text style={[__a3_styles.quickLabel, { color: __a3Colors.primaryText }]}>{label}</Text>
      {!!caption && <Text style={[__a3_styles.quickCaption, { color: __a3Colors.secondaryText }]}>{caption}</Text>}
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <View style={__a3_styles.infoRow}>
      <View style={__a3_styles.infoIcon}>
        <Ionicons name={icon} size={18} color={__a3Colors.primary} />
      </View>
      <View style={__a3_styles.infoCopy}>
        <Text style={__a3_styles.infoLabel}>{label}</Text>
        <Text style={[__a3_styles.infoValue, !value && __a3_styles.infoValueEmpty]}>{value || "Chưa có thông tin"}</Text>
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const content = (
    <>
      <View style={__a3_styles.listIcon}>
        <Ionicons name={icon} size={20} color={__a3Colors.primaryText} />
      </View>
      <View style={__a3_styles.listCopy}>
        <View style={__a3_styles.listTitleRow}>
          <Text style={__a3_styles.listTitle}>{title}</Text>
          {!!badge && (
            <View style={__a3_styles.listBadge}>
              <Text style={__a3_styles.listBadgeText}>{badge}</Text>
            </View>
          )}
        </View>
        {!!subtitle && <Text style={__a3_styles.listSubtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? (onPress ? <Ionicons name="chevron-forward" size={19} color={__a3Colors.secondaryText} /> : null)}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={() => { onPress(); }} style={({ pressed }) => [__a3_styles.listRow, pressed && __a3_styles.listRowPressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={__a3_styles.listRow}>{content}</View>;
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <View style={[__a3_styles.emptyState, compact && __a3_styles.emptyStateCompact]}>
      <View style={__a3_styles.emptyIcon}>
        <Ionicons name={icon} size={24} color={__a3Colors.primary} />
      </View>
      <View style={__a3_styles.emptyCopy}>
        <Text style={__a3_styles.emptyTitle}>{title}</Text>
        <Text style={__a3_styles.emptyDescription}>{description}</Text>
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <View style={__a3_styles.pill}>
      {!!icon && <Ionicons name={icon} size={13} color={__a3Colors.primaryText} />}
      <Text style={__a3_styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stickyHeader: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 7,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    zIndex: 20,
  },
  stickyHeaderCopy: { flex: 1, minWidth: 0 },
  stickyHeaderTitle: { color: COLORS.primaryText, fontSize: 15.5, fontWeight: "900" },
  stickyHeaderSubtitle: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600" },
  stickyHeaderRight: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  stickyHeaderPlaceholder: { width: 44, height: 44 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 4,
    paddingBottom: 20,
  },
  pageHeaderLeft: { flexShrink: 0, alignSelf: "flex-start", marginTop: 18 },
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
  sectionIconButton: { width: 43, height: 43, borderRadius: 16, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  sectionAction: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: "800",
    paddingVertical: 2,
  },
  pressedOpacity: { opacity: 0.55 },
  card: {
    backgroundColor: BLOOM_SUPPER.surface.card,
    borderRadius: Math.max(UI.borderRadiusCard, BLOOM_SUPPER.radius.card),
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.card,
    padding: 17,
    shadowColor: BLOOM_SUPPER.shadow.color,
    shadowOffset: { width: 0, height: BLOOM_SUPPER.shadow.y },
    shadowOpacity: BLOOM_SUPPER.shadow.opacity,
    shadowRadius: BLOOM_SUPPER.shadow.radius,
    elevation: BLOOM_SUPPER.shadow.elevation,
  },
  cardSoft: { backgroundColor: BLOOM_SUPPER.surface.soft, borderColor: BLOOM_SUPPER.border.soft },
  cardAccent: { backgroundColor: BLOOM_SUPPER.surface.accent, borderColor: BLOOM_SUPPER.border.strong },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.992 }] },
  quickAction: {
    width: "48.2%",
    minHeight: 132,
    backgroundColor: BLOOM_SUPPER.surface.card,
    borderRadius: BLOOM_SUPPER.radius.card,
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.card,
    padding: 15,
    justifyContent: "flex-start",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.075,
    shadowRadius: 13,
    elevation: 2,
  },
  quickIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BLOOM_SUPPER.surface.icon,
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.icon,
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
  listTitle: { flexShrink: 1, color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900" },
  listSubtitle: { marginTop: 4, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  listBadge: { backgroundColor: COLORS.accentBg, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 },
  listBadgeText: { color: COLORS.primaryText, fontSize: 9.5, fontWeight: "900" },
  emptyState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: BLOOM_SUPPER.surface.soft,
    borderRadius: BLOOM_SUPPER.radius.card,
    borderWidth: 1,
    borderColor: BLOOM_SUPPER.border.soft,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.055,
    shadowRadius: 12,
    elevation: 1,
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
  emptyTitle: { color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "800" },
  emptyDescription: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
}));
