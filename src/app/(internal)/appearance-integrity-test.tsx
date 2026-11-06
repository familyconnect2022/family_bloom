import { useState } from 'react';
import { ScrollView, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { BloomText as Text } from '../../components/ui/BloomText';
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { COLORS } from '../../constants/theme';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { getAppearanceSyncMetrics } from '../../theme/appearanceCloudSync';
import { getBloomSelection, getBloomThemeRevision, getBloomThemeAuditTrail } from '../../theme/runtime';
import { getLivingAppearance, getLivingTypographyRevision, getLivingMotionRevision } from '../../theme/livingAppearance';
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { useAuth } from '../../context/AuthContext';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';

/** Dev diagnostics are read-only and opt-in: no timers, Firebase or writes on render. */
function readState() { return { metrics:getAppearanceSyncMetrics(), selection:getBloomSelection(), living:getLivingAppearance(), colorRevision:getBloomThemeRevision(), typographyRevision:getLivingTypographyRevision(), motionRevision:getLivingMotionRevision(), events:getBloomThemeAuditTrail() }; }
export default function AppearanceIntegrityTest() {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const {user}=useAuth();
  const router=useRouter();
  const [state,setState]=useState(readState);
  const allowed=isPerformanceTestAccount(user?.email)&&isVerifiedDeveloperAccount(user);
  if (!allowed) return <View style={__a3_styles.root}><Text style={__a3_styles.heading}>Không có quyền truy cập công cụ Dev.</Text></View>;
  return <ScrollView style={__a3_styles.root} contentContainerStyle={__a3_styles.content}>
    <Text style={__a3_styles.heading}>Dev · Appearance Integrity</Text>
    <Text style={__a3_styles.note}>Bộ đếm trong phiên ứng dụng. Chỉ cập nhật khi bấm Làm mới; mở trang này không tự gọi Firebase.</Text>
    <View style={__a3_styles.card}>
      <Text style={__a3_styles.text}>Theme: {state.selection.palette} / {state.selection.mode}</Text>
      <Text style={__a3_styles.text}>Font: {state.living.font}, cỡ chữ {state.living.fontScale}%, motion {state.living.motion}</Text>
      <Text style={__a3_styles.text}>Color revision: {state.colorRevision}</Text>
      <Text style={__a3_styles.text}>Typography revision: {state.typographyRevision}</Text>
      <Text style={__a3_styles.text}>Motion revision: {state.motionRevision}</Text>
    </View>
    <View style={__a3_styles.card}>
      <Text style={__a3_styles.text}>Appearance Firebase reads: {state.metrics.cloudReads}</Text>
      <Text style={__a3_styles.text}>Appearance Firebase writes: {state.metrics.cloudWrites}</Text>
      <Text style={__a3_styles.text}>Cache hit/miss: {state.metrics.cacheHits}/{state.metrics.cacheMisses}</Text>
      <Text style={__a3_styles.text}>Thao tác user: {state.metrics.userEdits}</Text>
      <Text style={__a3_styles.text}>Đã gộp thay đổi: {state.metrics.coalescedEdits}</Text>
      <Text style={__a3_styles.text}>Có dữ liệu đang chờ: {state.metrics.hasPending?'Có':'Không'}</Text>
    </View>
    <View style={__a3_styles.card}>
      <Text style={__a3_styles.text}>Nhật ký chọn theme (32 thay đổi gần nhất):</Text>
      {state.events.slice(-12).reverse().map((event, index) => <Text style={__a3_styles.text} key={`${event.revision}-${index}`}>
        #{event.revision} · {event.source} · {event.palette}/{event.mode}
      </Text>)}
    </View>
    <Pressable style={__a3_styles.button} onPress={()=>setState(readState())}><Text style={__a3_styles.buttonText}>Làm mới số đo</Text></Pressable>
    <Pressable style={__a3_styles.button} onPress={()=>router.back()}><Text style={__a3_styles.buttonText}>Quay lại</Text></Pressable>
    <Text style={__a3_styles.note}>Kiểm thử: đổi Garden → Rose, nhấn Làm mới, theo dõi revision; không phát sinh ghi do mở màn hình. Test Firebase thực tế cần dùng APK.</Text>
  </ScrollView>;
}
const styles=createBloomStyles(()=>StyleSheet.create({
  root:{flex:1,backgroundColor:COLORS.background},content:{padding:18,paddingBottom:52,gap:14},
  heading:{fontSize:22,fontWeight:'800',color:COLORS.primaryText},note:{fontSize:12,lineHeight:20,color:COLORS.secondaryText},
  card:{padding:16,borderRadius:18,borderColor:COLORS.border,borderWidth:1,backgroundColor:COLORS.surface,gap:9},
  text:{fontSize:13,color:COLORS.primaryText},button:{minHeight:48,padding:12,borderRadius:14,backgroundColor:COLORS.softSurface,justifyContent:'center',alignItems:'center'},
  buttonText:{fontSize:14,fontWeight:'700',color:COLORS.primary},
}));
