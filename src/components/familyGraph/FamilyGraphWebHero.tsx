import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { getBloomHeroArt } from '../../theme/storybookHeroRegistry';
import { getBloomFogArt } from '../../theme/storybookFogRegistry';
import { getBloomHeroTextShade } from '../../theme/storybookShadeRegistry';

/** Same compact, full-bleed family-art masthead layout as the approved Web tab.
 * Native system type is intentional: this header should not inherit the legacy
 * serif title treatment used on Android detail subpages. */
export function FamilyGraphWebHero({
  count, familyName, onBack, onOverview,
}: {
  count: number;
  familyName: string;
  onBack?: () => void;
  onOverview?: () => void;
}) {
  const theme = useA3Theme();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const palette = theme.selection.palette;
  const isDark = theme.resolvedMode === 'dark';
  const mastheadHeight = useMemo(
    () => Math.max(208, Math.min(292, Math.round(windowHeight * 0.295))),
    [windowHeight],
  );
  return (
    <View testID="family-graph-web-hero" style={[styles.root, { height: mastheadHeight, backgroundColor: theme.colors.background }]}>
      <Image
        source={getBloomHeroArt('family', palette)}
        contentFit="cover"
        contentPosition="top"
        transition={0}
        cachePolicy="memory-disk"
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={getBloomHeroTextShade(palette, isDark ? 'dark' : 'light')}
        contentFit="fill"
        transition={0}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={getBloomFogArt(palette, isDark ? 'dark' : 'light')}
        contentFit="fill"
        transition={0}
        style={styles.fog}
      />
      <View style={[styles.controls, { top: Math.max(insets.top, 8) + 6 }]}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.topButton}>
            <Ionicons name="arrow-back" color={theme.colors.primary} size={22} />
          </Pressable>
        ) : <View style={styles.topPlaceholder} />}
        <View style={styles.flexSpace} />
        {onOverview && (
          <Pressable accessibilityRole="button" accessibilityLabel="Mở những chức năng khác của Cây nhà" onPress={onOverview} style={styles.topButton}>
            <Ionicons name="ellipsis-horizontal" color={theme.colors.primaryText} size={23} />
          </Pressable>
        )}
      </View>
      <View style={styles.copy}>
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit style={[styles.title, { color: theme.colors.primaryText }]}>Phả hệ gia đình</Text>
        <Text allowFontScaling={false} numberOfLines={2} style={[styles.subtitle, { color: theme.colors.primaryText }]}>
          {count} người · {familyName}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  fog: { position: 'absolute', left: -1, right: -1, bottom: -1, height: '31%' },
  controls: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', alignItems: 'center', zIndex: 4 },
  topButton: { width: 43, height: 43, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.89)' },
  topPlaceholder: { width: 43, height: 43 },
  flexSpace: { flex: 1 },
  copy: { position: 'absolute', left: 21, right: 20, bottom: 25, zIndex: 3 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7 },
  subtitle: { fontSize: 14.5, lineHeight: 21, fontWeight: '500', marginTop: 5 },
});
