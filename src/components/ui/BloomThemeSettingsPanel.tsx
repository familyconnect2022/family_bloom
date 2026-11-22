import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { refreshAppearanceFromCloud } from '../../theme/appearanceCloudSync';
import { useBloomToast } from './BloomToast';
import { BloomText as Text } from './BloomText';
import { Image } from 'expo-image';
import { getBloomHeroArt, getBloomHeroPreview } from '../../theme/storybookHeroRegistry';
import { BLOOM_PALETTE_IDS, BLOOM_PALETTE_LABELS, getBloomColors, type BloomDisplayMode, type BloomPaletteId } from '../../theme/palette';
import { useBloomTheme , useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { COLORS } from '../../constants/theme';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const MODES: { id: BloomDisplayMode; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'light', label: 'Sáng', description: 'Card trắng, nền dịu', icon: 'sunny-outline' },
  { id: 'dark', label: 'Tối', description: 'Dịu mắt, tương phản rõ', icon: 'moon-outline' },
  { id: 'system', label: 'Theo hệ thống', description: 'Đổi theo cài đặt Android', icon: 'phone-portrait-outline' },
];
export function BloomThemeSettingsPanel() {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const { selection, colors, resolvedMode, setPalette, setMode } = useBloomTheme();
  const [cloudBusy,setCloudBusy] = useState(false);
  const {showToast} = useBloomToast();
  async function manualSync() {
    if (cloudBusy) return;
    setCloudBusy(true);
    try {
      const outcome = await refreshAppearanceFromCloud();
      const message = outcome === 'updated' ? 'Đã nhận cài đặt từ thiết bị khác.'
        : outcome === 'unchanged' ? 'Cài đặt đang khớp với đám mây.'
        : outcome === 'pending' ? 'Máy đang có thay đổi chưa đồng bộ; không ghi đè lựa chọn của bạn.'
        : 'Không thể tải cài đặt. Vẫn giữ giao diện đang dùng.';
      showToast({type:outcome==='unavailable'?'warning':'info',title:'Cài đặt giao diện',message,duration:3400});
    } finally { setCloudBusy(false); }
  }
  return (
    <View style={__a3_styles.root}>
      <Text style={__a3_styles.heading}>Màu sắc Family Bloom</Text>
      <Text style={__a3_styles.hint}>Chạm một màu để áp dụng ngay trên tất cả màn hình.</Text>
      <View style={__a3_styles.paletteGrid}>
        {BLOOM_PALETTE_IDS.map(id => {
          const sample = getBloomColors(id, resolvedMode);
          const active = selection.palette === id;
          return (
            <Pressable key={id} accessibilityRole="radio" accessibilityState={{ checked: active }} accessibilityLabel={BLOOM_PALETTE_LABELS[id]}
              onPress={() => setPalette(id)} style={[__a3_styles.palette, active && __a3_styles.paletteActive]}>
              <View style={[__a3_styles.palettePreview, { backgroundColor: sample.background }]}>
                <Image source={getBloomHeroArt('home', id)} placeholder={getBloomHeroPreview('home', id)} placeholderContentFit="cover" recyclingKey={id} contentFit="cover" contentPosition="top" cachePolicy="memory-disk" priority="high" transition={0} style={__a3_styles.paletteHeroArt} accessibilityIgnoresInvertColors />
                <View style={[__a3_styles.previewCard, { backgroundColor: sample.surface, borderColor: sample.border }]}>
                  <View style={[__a3_styles.previewDot, { backgroundColor: sample.primary }]} />
                  <View style={[__a3_styles.previewLine, { backgroundColor: sample.primaryText }]} />
                  <View style={[__a3_styles.previewLineShort, { backgroundColor: sample.muted }]} />
                </View>
                {active && <View style={[__a3_styles.selectedIcon, { backgroundColor: sample.primary }]}>
                  <Ionicons name="checkmark" size={13} color={sample.onPrimary} />
                </View>}
              </View>
              <Text style={[__a3_styles.paletteLabel, active && __a3_styles.paletteLabelActive]}>{BLOOM_PALETTE_LABELS[id].replace('Bloom ', '')}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[__a3_styles.heading, __a3_styles.modeHeading]}>Chế độ hiển thị</Text>
      <View style={__a3_styles.modeGroup}>
        {MODES.map((mode, index) => {
          const active = selection.mode === mode.id;
          return (
            <Pressable key={mode.id} accessibilityRole="radio" accessibilityState={{ checked: active }}
              onPress={() => setMode(mode.id)} style={[__a3_styles.modeRow, index > 0 && __a3_styles.modeDivider]}>
              <View style={__a3_styles.modeIcon}><Ionicons name={mode.icon} size={19} color={colors.primary} /></View>
              <View style={__a3_styles.modeText}>
                <Text style={__a3_styles.modeLabel}>{mode.label}</Text>
                <Text style={__a3_styles.modeDescription}>{mode.description}</Text>
              </View>
              <Ionicons name={active ? 'radio-button-on' : 'radio-button-off'} color={active ? colors.primary : colors.secondaryText} size={23} />
            </Pressable>
          );
        })}
      </View>
      <Pressable accessibilityRole="button" disabled={cloudBusy} onPress={()=>void manualSync()} style={__a3_styles.manualSync}>
        <Ionicons name="cloud-download-outline" size={19} color={colors.primary}/>
        <Text style={__a3_styles.manualSyncText}>{cloudBusy ? 'Đang kiểm tra cài đặt...' : 'Đồng bộ cài đặt từ thiết bị khác'}</Text>
      </Pressable>
      <Text style={__a3_styles.footer}>Family Bloom ưu tiên cài đặt đã lưu trong máy. Đổi màu/chữ áp dụng ngay; Firebase chỉ được ghi sau khi bạn thay đổi và các thao tác liên tiếp được gộp. Nút này chỉ tải từ đám mây khi bạn chủ động yêu cầu.</Text>
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  root: { backgroundColor: COLORS.surface, borderRadius: 24, borderColor: COLORS.border, borderWidth: 1, padding: 16, gap: 6 },
  heading: { fontSize: 15, fontWeight: '800', color: COLORS.primaryText },
  hint: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, marginBottom: 10 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  palette: { width: '47%', flexGrow: 1, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, borderRadius: 17, padding: 7, gap: 8 },
  paletteActive: { borderColor: COLORS.primary, borderWidth: 2, padding: 6 },
  palettePreview: { height: 115, borderRadius: 12, overflow: 'hidden', justifyContent: 'flex-end', padding: 7 },
  paletteHeroArt: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  previewCard: { borderRadius: 9, borderWidth: 1, padding: 6, width: '77%', height: 36, justifyContent: 'center', gap: 3 },
  previewDot: { width: 11, height: 11, borderRadius: 6, position: 'absolute', top: 10, right: 10 },
  previewLine: { width: '55%', height: 4, opacity: 0.75, borderRadius: 3 },
  previewLineShort: { width: '70%', height: 3, opacity: 0.6, borderRadius: 3 },
  selectedIcon: { position: 'absolute', right: 7, top: 7, width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paletteLabel: { fontSize: 12, fontWeight: '700', color: COLORS.primaryText, textAlign: 'center', marginBottom: 3 },
  paletteLabelActive: { color: COLORS.primary },
  modeHeading: { marginTop: 15, marginBottom: 6 },
  modeGroup: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, overflow: 'hidden' },
  modeRow: { minHeight: 63, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 10 },
  modeDivider: { borderTopWidth: 1, borderTopColor: COLORS.border },
  modeIcon: { backgroundColor: COLORS.iconBackground, borderRadius: 11, width: 37, height: 37, alignItems: 'center', justifyContent: 'center' },
  modeText: { flex: 1, gap: 2 },
  modeLabel: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: '700' },
  modeDescription: { color: COLORS.secondaryText, fontSize: 10.5 },
  footer: { marginTop: 10, fontSize: 10.5, lineHeight: 16, color: COLORS.secondaryText },
  manualSync: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginTop: 10, minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, backgroundColor: COLORS.surface },
  manualSyncText: { flex: 1, fontSize: 12.5, fontWeight: '700', color: COLORS.primary },
}));
