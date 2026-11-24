import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/** Legacy component retained for old archived previews. R16R11R2: main graph & Focus do not render a floating title plate. */
export const FamilyGraphRelationPlate = memo(function FamilyGraphRelationPlate({
  label, tint, ink, surface,
}: { label: string | null; tint: string; ink: string; surface: string }) {
  if (!label) return null;
  return (
    <View pointerEvents="none" accessible={false} style={[styles.plate, { borderColor: tint, backgroundColor: surface }]}>
      <View style={[styles.engravedLine, { backgroundColor: tint }]} />
      <Text allowFontScaling={false} numberOfLines={3} ellipsizeMode="tail"
        style={[styles.label, { color: ink }]}>{label}</Text>
      <View style={[styles.foot, { backgroundColor: surface, borderColor: tint }]} />
    </View>
  );
});

const styles = StyleSheet.create({
  plate: {
    position: 'absolute', zIndex: 16,
    bottom: 169, // 176-pt card: lower edge overlaps by 7pt, joins the border.
    left: 9, right: 9, minHeight: 24, maxHeight: 54,
    paddingHorizontal: 8, paddingVertical: 5,
    borderWidth: 1.1, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#513A43', shadowOpacity: 0.09, shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  engravedLine: { position: 'absolute', height: 1, left: 11, right: 11, top: 3, opacity: 0.20 },
  label: { fontSize: 10.5, lineHeight: 13.2, fontWeight: '800', textAlign: 'center', includeFontPadding: false },
  foot: { position: 'absolute', width: 16, height: 4, bottom: -4,
    borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 0, opacity: 0.8 },
});
