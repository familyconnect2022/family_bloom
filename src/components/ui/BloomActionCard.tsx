import { useA3Theme } from '../../appearance3/useAppearance3';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { memo } from "react";
import { Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from './BloomText';
import { COLORS } from "../../constants/theme";
import { BLOOM_CARD_TITLE_SIZE, BLOOM_CARD_TITLE_LINE_HEIGHT } from './BloomCardTypography';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


/** A single prominent, accessible CTA for creation flows. No remote assets or animation loops. */
export const BloomActionCard = memo(function BloomActionCard({
  icon, title, subtitle, onPress, testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  const __a3_styles = useA3LegacyStyles(styles);

  const { colors } = useA3Theme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [__a3_styles.card, { backgroundColor: colors.card, borderColor: colors.border, shadowColor: colors.shadow }, pressed && __a3_styles.pressed]}
    >
      <View pointerEvents="none" style={[__a3_styles.glow, { backgroundColor: colors.iconBackground }]} />
      <View style={[__a3_styles.icon, { backgroundColor: colors.selectedBackground }]}><Ionicons name={icon} size={24} color={colors.primary} /></View>
      <View style={__a3_styles.copy}>
        <Text appearanceTone="primary" style={__a3_styles.kicker}>CÙNG BLOOM GIEO ĐIỀU MỚI <Ionicons name="sparkles" size={11} /></Text>
        <Text appearanceTone="primaryText" style={__a3_styles.title}>{title}</Text>
        <Text appearanceTone="secondaryText" style={__a3_styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={[__a3_styles.arrow, { backgroundColor: colors.surface }]}><Ionicons name="add" size={21} color={colors.primaryText} /></View>
    </Pressable>
  );
});

const styles = createBloomStyles(() => StyleSheet.create({
  card: { minHeight: 86, marginBottom: 14, overflow: "hidden", flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 24, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, shadowColor: COLORS.shadow, shadowOpacity: 0.17, shadowRadius: 13, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  glow: { position: "absolute", width: 130, height: 130, right: -28, top: -65, borderRadius: 65, backgroundColor: COLORS.iconBackground },
  icon: { height: 48, width: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.selectedBackground },
  copy: { flex: 1, minWidth: 0 },
  kicker: { fontSize: 8.5, fontWeight: "900", letterSpacing: 0.55, color: COLORS.primary },
  title: { marginTop: 4, fontSize: BLOOM_CARD_TITLE_SIZE, lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, fontWeight: "900", color: COLORS.primaryText },
  subtitle: { marginTop: 3, fontSize: 10.5, lineHeight: 15, color: COLORS.secondaryText },
  arrow: { height: 34, width: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  pressed: { opacity: 0.84, transform: [{ scale: 0.992 }] },
}));
