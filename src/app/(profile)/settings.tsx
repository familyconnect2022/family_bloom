import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { Image } from "expo-image";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { COLORS } from "../../constants/theme";
import { BloomThemeSettingsPanel } from "../../components/ui/BloomThemeSettingsPanel";
import { BloomLivingAppearancePanel } from "../../components/ui/BloomLivingAppearancePanel";
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from "../../constants/performanceTest";
import { DraftCatalogue } from '../../features/learning/familyDocument/DraftCatalogue';
import { nativeDraftRequest } from '../../features/learning/familyDocument/draftRequest';
import { useAuth } from "../../context/AuthContext";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


function SettingRow({ icon, title, caption, onPress, accent = false }: { icon:keyof typeof Ionicons.glyphMap; title:string; caption:string; onPress:()=>void; accent?:boolean }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return <Pressable onPress={onPress} style={({pressed})=>[__a3_styles.row, accent&&__a3_styles.rowAccent, pressed&&__a3_styles.pressed]}>
    <View style={[__a3_styles.icon, accent&&__a3_styles.iconAccent]}><Ionicons name={icon} size={20} color={accent?__a3Colors.primary:__a3Colors.primaryText}/></View>
    <View style={__a3_styles.copy}><Text style={__a3_styles.title}>{title}</Text><Text style={__a3_styles.caption}>{caption}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={__a3Colors.secondaryText}/>
  </Pressable>;
}

export default function SettingsScreen(){
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router=useRouter();
  const {user,userProfile,families,activeFamilyId}=useAuth();
  const showDeveloperTools=isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user);
  const initial=(userProfile?.displayName||user?.displayName||"F").trim().slice(0,1).toUpperCase();
  return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
    <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')}/>
    <BloomHeroHeader eyebrow="CÀI ĐẶT" title="Góc điều chỉnh của bạn" subtitle="Hồ sơ, mái nhà, lời nhắc và những công cụ nội bộ được giữ gọn ở một nơi." variant="settings" onBack={()=>router.back()} compact roundedBottom/>
    <ScrollView contentContainerStyle={__a3_styles.content} showsVerticalScrollIndicator={false}>
      <BloomCard style={__a3_styles.accountCard}>
        <View style={__a3_styles.avatar}>{userProfile?.avatarUrl?<Image source={{uri:userProfile.avatarUrl}} style={StyleSheet.absoluteFill} contentFit="cover"/>:<Text style={__a3_styles.avatarText}>{initial}</Text>}</View>
        <View style={__a3_styles.copy}><Text style={__a3_styles.accountName}>{userProfile?.displayName||"Thành viên Family Bloom"}</Text><Text style={__a3_styles.accountEmail}>{user?.email||"Tài khoản Family Bloom"}</Text><Text style={__a3_styles.accountMeta}>{families.length} mái nhà đang kết nối</Text></View>
      </BloomCard>
      <View style={__a3_styles.section}>
        <BloomSectionHeader title="Tài khoản & mái nhà" subtitle="Những điều bạn thường cần chỉnh"/>
        <BloomCard style={__a3_styles.listCard}>
          <SettingRow icon="person-circle-outline" title="Hồ sơ của tôi" caption="Tên gọi, ảnh đại diện và thông tin cá nhân" onPress={()=>router.push('/profile' as never)}/>
          <View style={__a3_styles.divider}/>
          <SettingRow icon="home-outline" title="Những mái nhà của tôi" caption="Xem, đổi và quản lý các gia đình đang tham gia" onPress={()=>router.push('/family-memberships' as never)}/>
          <View style={__a3_styles.divider}/>
          <SettingRow icon="notifications-outline" title="Thông báo & lời nhắc" caption="Chọn những điều Bloom được phép nhắc trên thiết bị" onPress={()=>router.push('/notification-preferences' as never)}/>
        </BloomCard>
      </View>
      {user&&activeFamilyId&&<View style={__a3_styles.section}>
        <BloomSectionHeader title="Bản nháp của tôi" subtitle="Quản lý những nội dung đang viết trong nhà này"/>
        <BloomCard style={__a3_styles.listCard}>
          <SettingRow icon="book-outline" title="Góc học tập" caption="Mở bản nháp tài liệu và bài học" onPress={()=>router.push('/learning-editor' as never)}/>
          {process.env.EXPO_PUBLIC_FAMILY_FORM_DRAFTS_ENABLED==='1'&&<><View style={__a3_styles.divider}/><SettingRow icon="images-outline" title="Kỷ niệm" caption="Mở bản nháp ảnh, video và lời nhắn" onPress={()=>router.push({pathname:'/(tabs)/moments',params:{drafts:'1'}} as never)}/></>}
          <DraftCatalogue uid={user.uid} familyId={activeFamilyId} key={JSON.stringify([user.uid,activeFamilyId])} learning={process.env.EXPO_PUBLIC_FAMILY_EDITOR_DRAFTS_ENABLED==='1'} moment={process.env.EXPO_PUBLIC_FAMILY_FORM_DRAFTS_ENABLED==='1'} colors={__a3Colors} request={async body=>{const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),35000);try{return await nativeDraftRequest(user.uid,activeFamilyId,body,ctrl.signal);}finally{clearTimeout(timer);}}} onOpen={kind=>kind==='learning'?router.push('/learning-editor' as never):router.push({pathname:'/(tabs)/moments',params:{drafts:'1'}} as never)}/>
        </BloomCard>
      </View>}
      <View style={__a3_styles.section}>
        <BloomSectionHeader title="Giao diện & chủ đề" subtitle="4 theme · Kiểu chữ · Cỡ chữ · Chuyển động"/>
        <BloomThemeSettingsPanel />
        <BloomLivingAppearancePanel />
      </View>
      {showDeveloperTools&&<View style={__a3_styles.section}>
        <BloomSectionHeader title="Công cụ phát triển" subtitle="Chỉ hiện cho tài khoản nội bộ của Family Bloom"/>
        <BloomCard style={__a3_styles.listCard}>
          <SettingRow accent icon="cloud-outline" title="Bloom Cloud Manager" caption="Kiểm tra Cloudinary Family và nguồn học liệu, không chuyển quota" onPress={()=>router.push('/cloud-manager' as never)}/>
          <View style={__a3_styles.divider}/>
          <SettingRow accent icon="flask-outline" title="Kiểm thử & chẩn đoán" caption="Hiệu năng, thông báo Android và công cụ game — chỉ chạy khi bạn chủ động bấm" onPress={()=>router.push('/developer-tools' as never)}/>
        </BloomCard>
      </View>}
    </ScrollView>
  </ScreenContainer>;
}
const styles=createBloomStyles(() => StyleSheet.create({content:{padding:16,paddingBottom:36,gap:18},accountCard:{padding:15,flexDirection:'row',alignItems:'center',gap:13},avatar:{width:58,height:58,borderRadius:22,overflow:'hidden',backgroundColor:COLORS.softSurface,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:22,fontWeight:'900',color:COLORS.primary},copy:{flex:1,minWidth:0},accountName:{fontSize:16,fontWeight:'900',color:COLORS.primaryText},accountEmail:{marginTop:3,fontSize:11,color:COLORS.secondaryText},accountMeta:{marginTop:5,fontSize:10,fontWeight:'800',color:COLORS.primary},section:{gap:9},listCard:{paddingHorizontal:14},row:{minHeight:76,flexDirection:'row',alignItems:'center',gap:11,paddingVertical:12},rowAccent:{backgroundColor:COLORS.surface,marginHorizontal:-14,paddingHorizontal:14,borderRadius:20},icon:{width:42,height:42,borderRadius:15,backgroundColor:COLORS.softSurface,alignItems:'center',justifyContent:'center'},iconAccent:{backgroundColor:COLORS.softSurface},title:{fontSize:13.5,fontWeight:'900',color:COLORS.primaryText},caption:{marginTop:3,fontSize:10.5,lineHeight:15,color:COLORS.secondaryText},divider:{borderTopWidth:1,borderTopColor:COLORS.border},pressed:{opacity:.7}}));
