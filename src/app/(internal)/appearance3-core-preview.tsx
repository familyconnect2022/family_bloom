/** Appearance 3.0 CORE preview: exercises actual reusable PRODUCT components,
 * unlike the sandbox A/B Lab. This route is restricted to the developer account.
 * Does not change member preferences or create a Firestore listener. */
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { useA3Theme, useA3Typography } from '../../appearance3/useAppearance3';
import { applyBloomSelection, getBloomSelection, updateBloomMode, updateBloomPalette } from '../../theme/runtime';
import { applyLivingAppearance, getLivingAppearance } from '../../theme/livingAppearance';
import { BLOOM_PALETTE_IDS, BLOOM_PALETTE_LABELS } from '../../theme/palette';
import { BloomText } from '../../components/ui/BloomText';
import { BloomCard, BloomSectionHeader } from '../../components/ui/BloomPageComponents';
import { BloomButton } from '../../components/ui/BloomButtonComponents/BloomButton';
import { BloomTextInput } from '../../components/ui/BloomInputComponents/BloomTextInput';
import { BloomActionCard } from '../../components/ui/BloomActionCard';
import { BloomConfirmModal } from '../../components/ui/BloomConfirmModal';
import { BloomHeroHeader } from '../../components/ui/BloomHeroHeader';

export default function Appearance3CorePreview() {
  const __a3Theme = useA3Theme();

  const { user } = useAuth();
  const router = useRouter();
  const allowed = isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user);
  const theme = useA3Theme();
  const typography = useA3Typography();
  const [draft, setDraft] = useState('Chào cả nhà Family Bloom');
  const [pressCount, setPressCount] = useState(0);
  const [modal, setModal] = useState(false);
  // Dev-only in-memory toggles; no persistence calls and therefore
  // no local/cloud preference write. Restore the original snapshot on exit.
  useEffect(() => {
    if (!allowed) return;
    const originalSelection = __a3Theme.selection;
    const originalTypography = getLivingAppearance();
    return () => {
      applyBloomSelection(originalSelection, 'dev-core-preview-restore');
      applyLivingAppearance(originalTypography);
    };
  }, [allowed]);
  if (!allowed) return <View style={{flex:1,padding:24}}><BloomText>Chỉ tài khoản kiểm thử đã xác minh được mở Preview.</BloomText></View>;
  const colors = theme.colors;
  return <View style={{flex:1,backgroundColor:colors.background}}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{paddingBottom:80,gap:14}}>
      <BloomHeroHeader variant="settings" compact title="Appearance 3.0 · Core" subtitle="Preview các component ứng dụng thật" onBack={()=>router.back()} />
      <View style={{paddingHorizontal:16,gap:16}}>
        <BloomCard>
          <BloomText appearanceRole="title" appearanceTone="primaryText" style={{fontWeight:'700'}}>Snapshot đang áp dụng</BloomText>
          <BloomText appearanceRole="body" appearanceTone="secondaryText">
            {theme.selection.palette} / {theme.resolvedMode} · {typography.font} · {typography.scale}%
          </BloomText>
          <BloomText appearanceRole="caption" appearanceTone="secondaryText">
            Preview dùng theme LIVE; không thay đổi cài đặt và không ghi Firebase khi render.
          </BloomText>
        </BloomCard>
        <BloomCard>
          <BloomText appearanceRole="title" appearanceTone="primaryText" style={{fontWeight:'700'}}>Điều khiển thử ngay trên màn hình</BloomText>
          <BloomText appearanceRole="caption" appearanceTone="secondaryText">Chỉ thay đổi trạng thái trong RAM. Không ghi Firebase hoặc thay đổi cài đặt đã lưu; khi rời Preview sẽ khôi phục lựa chọn ban đầu.</BloomText>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>
            {BLOOM_PALETTE_IDS.map(id=><View key={id} style={{minWidth:'46%',flexGrow:1}}>
              <BloomButton title={BLOOM_PALETTE_LABELS[id]} variant={theme.selection.palette===id?'primary':'outline'}
                onPress={()=>updateBloomPalette(id)}/>
            </View>)}
          </View>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {(['light','dark','system'] as const).map(id=><View key={id} style={{flexGrow:1}}>
              <BloomButton title={id==='light'?'Sáng':id==='dark'?'Tối':'Theo máy'}
                variant={theme.selection.mode===id?'primary':'outline'} onPress={()=>updateBloomMode(id)}/>
            </View>)}
          </View>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {(['modern','rounded','cute','clear','classic'] as const).map(id=><View key={id} style={{minWidth:'29%',flexGrow:1}}>
              <BloomButton title={id} variant={typography.font===id?'primary':'outline'}
                onPress={()=>applyLivingAppearance({...getLivingAppearance(),font:id})}/>
            </View>)}
          </View>
          <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
            {[90,100,120,140,160].map(value=><View key={value} style={{flexGrow:1}}>
              <BloomButton title={`${value}%`} variant={typography.scale===value?'primary':'outline'}
                onPress={()=>applyLivingAppearance({...getLivingAppearance(),fontScale:value})}/>
            </View>)}
          </View>
        </BloomCard>
        <BloomSectionHeader title="Card cha và chữ con" subtitle="Các thành phần phải đổi đồng bộ" />
        <BloomCard tone="soft">
          <BloomText appearanceRole="title" appearanceTone="primaryText" style={{fontWeight:'800'}}>Gia đình mình</BloomText>
          <BloomText appearanceRole="body" appearanceTone="secondaryText">
            Thử cỡ chữ 160% để kiểm tra chữ xuống dòng, thẻ mở rộng và không bị cắt nội dung.
          </BloomText>
          <BloomCard shape="ticket">
            <BloomText appearanceRole="caption" appearanceTone="primary">Card lồng trong card — cùng palette</BloomText>
          </BloomCard>
        </BloomCard>
        <BloomActionCard icon="heart-outline" title="Thẻ hành động mẫu" subtitle="Màu, icon và chữ cùng cập nhật" onPress={()=>setPressCount(v=>v+1)} />
        <BloomCard>
          <BloomSectionHeader title="Input" subtitle="Giữ bàn phím, focus và nội dung khi theme đổi" />
          <BloomTextInput label="Tên thành viên" value={draft} onChangeText={setDraft} placeholder="Nhập tên…" />
          <BloomButton title={`Button Primary · ${pressCount}`} onPress={()=>setPressCount(v=>v+1)} />
          <BloomButton title="Button Outline" variant="outline" onPress={()=>setPressCount(v=>v+1)} />
          <BloomButton title="Mở Modal" variant="link" onPress={()=>setModal(true)} />
        </BloomCard>
        <Pressable onPress={()=>router.back()} accessibilityRole="button" style={{padding:12,alignItems:'center'}}>
          <BloomText appearanceTone="primary">Quay lại Appearance Lab</BloomText>
        </Pressable>
      </View>
    </ScrollView>
    <BloomConfirmModal visible={modal} title="Appearance 3.0" message="Modal, nút và chữ dùng token hiện tại. Đóng modal không làm mất nội dung input." onCancel={()=>setModal(false)} onConfirm={()=>setModal(false)} />
  </View>;
}
