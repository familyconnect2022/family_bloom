import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text as NativeText, View } from 'react-native';
import { BloomText as Text } from './BloomText';
import { COLORS } from '../../constants/theme';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { useBloomLivingAppearance } from '../../theme/BloomThemeProvider';
import { getLivingFontFamily, getLivingLetterSpacing, type BloomFontStyle, type BloomMotionLevel } from '../../theme/livingAppearance';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const FONTS: ReadonlyArray<{id: BloomFontStyle; name: string; caption: string; example: string}> = [
  {id: 'modern', name: 'Hiện đại', caption: 'Dễ đọc · Sans Serif', example: 'Gia đình là nhà'},
  {id: 'rounded', name: 'Mềm mại', caption: 'Nét nhẹ · Thân thiện', example: 'Nhà mình yêu thương'},
  {id: 'cute', name: 'Dễ thương', caption: 'Bo tròn · Vui mắt', example: 'Một ngày thật đẹp!'},
  {id: 'clear', name: 'Rõ ràng', caption: 'Thoáng · Cho người lớn tuổi', example: 'Cùng nhau lưu kỷ niệm'},
  {id: 'classic', name: 'Truyền thống', caption: 'Serif · Giấy thư', example: 'Lời gửi người thân'},
];
const MOTIONS: ReadonlyArray<{id: BloomMotionLevel; label: string; detail: string; icon: keyof typeof Ionicons.glyphMap}> = [
  {id: 'vivid', label: 'Sống động', detail: 'Hiệu ứng đầy đủ', icon: 'sparkles-outline'},
  {id: 'gentle', label: 'Dịu nhẹ', detail: 'Ưu tiên dễ chịu', icon: 'leaf-outline'},
  {id: 'still', label: 'Tĩnh', detail: 'Ít chuyển động', icon: 'remove-outline'},
];
export function BloomLivingAppearancePanel() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const { value, setFont, setFontScale, setMotion } = useBloomLivingAppearance();
  const { font, fontScale, motion } = value;
  const sampleSize = Math.round(16 * 1.15 * fontScale / 100 * 10) / 10;
  return (
    <View style={__a3_styles.root}>
      <Text style={__a3_styles.heading}>Kiểu chữ dành cho nhà mình</Text>
      <Text style={__a3_styles.hint}>Kiểu chữ thay đổi ngay khi chọn. Thư Ngõ sử dụng riêng font Lora hỗ trợ tiếng Việt; các màn hình khác ưu tiên font Android dễ đọc.</Text>
      {FONTS.map(item => <Pressable key={item.id} onPress={() => setFont(item.id)}
        accessibilityRole="radio" accessibilityState={{ checked: font === item.id }}
        style={[__a3_styles.fontRow, font === item.id && __a3_styles.selected]}>
        <View style={__a3_styles.fontSample}>
          <NativeText style={[__a3_styles.fontSampleText, { fontFamily: getLivingFontFamily(item.id), letterSpacing: getLivingLetterSpacing(item.id) }]} maxFontSizeMultiplier={1.3}>Ab</NativeText>
        </View>
        <View style={__a3_styles.copy}>
          <Text style={__a3_styles.fontName}>{item.name}</Text>
          <Text style={__a3_styles.fontCaption}>{item.caption}</Text>
          <NativeText numberOfLines={2} style={[__a3_styles.fontExample, {
            fontFamily: getLivingFontFamily(item.id), letterSpacing: getLivingLetterSpacing(item.id),
            fontSize: sampleSize, lineHeight: Math.ceil(sampleSize * 1.35),
          }]}>{item.example}</NativeText>
        </View>
        <Ionicons name={font === item.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={font === item.id ? __a3Colors.primary : __a3Colors.secondaryText}/>
      </Pressable>)}
      <View style={__a3_styles.separate}/>
      <View style={__a3_styles.headingRow}><Text style={__a3_styles.heading}>Cỡ chữ dễ đọc</Text><Text style={__a3_styles.number}>{fontScale}%</Text></View>
      <Text style={__a3_styles.fontCaption}>100% là cỡ chữ chuẩn của Family Bloom. Các mức khác điều chỉnh theo tỷ lệ này.</Text>
      <View style={__a3_styles.scaleControls}>
        <Pressable onPress={() => setFontScale(Math.max(90, fontScale - 10))} disabled={fontScale <= 90} accessibilityRole="button" accessibilityLabel="Giảm cỡ chữ" style={__a3_styles.scaleButton}><Ionicons name="remove" size={21} color={__a3Colors.primary}/></Pressable>
        <View style={__a3_styles.scaleMiddle}><Text style={__a3_styles.scalePreview} numberOfLines={3}>Nhà mình luôn bên nhau</Text><Text style={__a3_styles.fontCaption}>90% — 160% · chữ tự xuống dòng</Text></View>
        <Pressable onPress={() => setFontScale(Math.min(160, fontScale + 10))} disabled={fontScale >= 160} accessibilityRole="button" accessibilityLabel="Tăng cỡ chữ" style={__a3_styles.scaleButton}><Ionicons name="add" size={21} color={__a3Colors.primary}/></Pressable>
      </View>
      <View accessibilityRole="radiogroup" style={__a3_styles.scalePresets}>
        {[90, 100, 120, 140, 160].map(size => (
          <Pressable key={size} onPress={() => setFontScale(size)} accessibilityRole="radio"
            accessibilityLabel={`Cỡ chữ ${size} phần trăm`}
            accessibilityState={{checked: fontScale === size}}
            style={[__a3_styles.scalePreset, fontScale === size && __a3_styles.scalePresetSelected]}>
            <Text style={[__a3_styles.scalePresetLabel, fontScale === size && __a3_styles.scalePresetLabelSelected]}>{size}%</Text>
          </Pressable>
        ))}
      </View>
      <View style={__a3_styles.separate}/>
      <Text style={__a3_styles.heading}>Chuyển động & hiệu ứng</Text>
      {MOTIONS.map(item => <Pressable key={item.id} onPress={() => setMotion(item.id)} accessibilityRole="radio" accessibilityState={{ checked: motion === item.id }} style={[__a3_styles.fontRow, motion === item.id && __a3_styles.selected]}>
        <View style={__a3_styles.fontSample}><Ionicons name={item.icon} size={22} color={__a3Colors.primary}/></View>
        <View style={__a3_styles.copy}><Text style={__a3_styles.fontName}>{item.label}</Text><Text style={__a3_styles.fontCaption}>{item.detail}</Text></View>
        <Ionicons name={motion === item.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={motion === item.id ? __a3Colors.primary : __a3Colors.secondaryText}/>
      </Pressable>)}
      <Text style={__a3_styles.hint}>Chế độ Tĩnh ưu tiên giảm chuyển động; lựa chọn giảm chuyển động ở Android luôn được tôn trọng.</Text>
    </View>
  );
}
const styles = createBloomStyles(() => StyleSheet.create({
  root: { backgroundColor: COLORS.surface, borderRadius: 26, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 8 },
  heading: { color: COLORS.primaryText, fontSize: 15, fontWeight: '800' },
  hint: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, marginBottom: 6 },
  fontRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 9, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  selected: { backgroundColor: COLORS.selectedBackground, borderColor: COLORS.primary },
  fontSample: { width: 41, height: 41, borderRadius: 14, backgroundColor: COLORS.iconBackground, justifyContent: 'center', alignItems: 'center' },
  fontSampleText: { color: COLORS.primary, fontSize: 18, fontWeight: '800' },
  fontExample: { color: COLORS.primaryText, marginTop: 3, flexShrink: 1 },
  copy: { flex: 1, minWidth: 0 }, fontName: { color: COLORS.primaryText, fontSize: 13, fontWeight: '700' },
  fontCaption: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, marginTop: 2 },
  separate: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  headingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, number: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  scaleControls: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 6 },
  scaleButton: { width: 45, height: 50, borderRadius: 16, backgroundColor: COLORS.softSurface, justifyContent: 'center', alignItems: 'center' },
  scaleMiddle: { flex: 1, minWidth: 0, alignItems: 'center' },
  scalePreview: { fontSize: 14, color: COLORS.primaryText, fontWeight: '700', textAlign: 'center' },
  scalePresets: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 },
  scalePreset: { flexGrow: 1, minWidth: 49, minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  scalePresetSelected: { backgroundColor: COLORS.selectedBackground, borderColor: COLORS.primary },
  scalePresetLabel: { color: COLORS.secondaryText, fontSize: 11, fontWeight: '700' },
  scalePresetLabelSelected: { color: COLORS.primary, fontWeight: '900' },
}));
