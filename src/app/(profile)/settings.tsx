import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { COLORS } from "../../constants/theme";
import { isPerformanceTestAccount } from "../../constants/performanceTest";
import { useAuth } from "../../context/AuthContext";

function SettingRow({ icon, title, caption, onPress, accent = false }: { icon:keyof typeof Ionicons.glyphMap; title:string; caption:string; onPress:()=>void; accent?:boolean }) {
  return <Pressable onPress={onPress} style={({pressed})=>[styles.row, accent&&styles.rowAccent, pressed&&styles.pressed]}>
    <View style={[styles.icon, accent&&styles.iconAccent]}><Ionicons name={icon} size={20} color={accent?COLORS.primary:COLORS.primaryText}/></View>
    <View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.caption}>{caption}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.secondaryText}/>
  </Pressable>;
}

export default function SettingsScreen(){
  const router=useRouter();
  const {user,userProfile,families}=useAuth();
  const showDeveloperTools=isPerformanceTestAccount(user?.email);
  const initial=(userProfile?.displayName||user?.displayName||"F").trim().slice(0,1).toUpperCase();
  return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
    <StatusBar translucent backgroundColor="transparent" style="dark"/>
    <BloomHeroHeader eyebrow="CÀI ĐẶT" title="Góc điều chỉnh của bạn" subtitle="Hồ sơ, mái nhà, lời nhắc và những công cụ nội bộ được giữ gọn ở một nơi." variant="profile" onBack={()=>router.back()} compact roundedBottom/>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <BloomCard style={styles.accountCard}>
        <View style={styles.avatar}>{userProfile?.avatarUrl?<Image source={{uri:userProfile.avatarUrl}} style={StyleSheet.absoluteFill} contentFit="cover"/>:<Text style={styles.avatarText}>{initial}</Text>}</View>
        <View style={styles.copy}><Text style={styles.accountName}>{userProfile?.displayName||"Thành viên Family Bloom"}</Text><Text style={styles.accountEmail}>{user?.email||"Tài khoản Family Bloom"}</Text><Text style={styles.accountMeta}>{families.length} mái nhà đang kết nối</Text></View>
      </BloomCard>
      <View style={styles.section}>
        <BloomSectionHeader title="Tài khoản & mái nhà" subtitle="Những điều bạn thường cần chỉnh"/>
        <BloomCard style={styles.listCard}>
          <SettingRow icon="person-circle-outline" title="Hồ sơ của tôi" caption="Tên gọi, ảnh đại diện và thông tin cá nhân" onPress={()=>router.push('/profile' as never)}/>
          <View style={styles.divider}/>
          <SettingRow icon="home-outline" title="Những mái nhà của tôi" caption="Xem, đổi và quản lý các gia đình đang tham gia" onPress={()=>router.push('/family-memberships' as never)}/>
          <View style={styles.divider}/>
          <SettingRow icon="notifications-outline" title="Thông báo & lời nhắc" caption="Chọn những điều Bloom được phép nhắc trên thiết bị" onPress={()=>router.push('/notification-preferences' as never)}/>
        </BloomCard>
      </View>
      {showDeveloperTools&&<View style={styles.section}>
        <BloomSectionHeader title="Công cụ phát triển" subtitle="Chỉ hiện cho tài khoản nội bộ của Family Bloom"/>
        <BloomCard style={styles.listCard}>
          <SettingRow accent icon="flask-outline" title="Kiểm thử & chẩn đoán" caption="Hiệu năng, thông báo Android và công cụ game — chỉ chạy khi bạn chủ động bấm" onPress={()=>router.push('/developer-tools' as never)}/>
        </BloomCard>
      </View>}
    </ScrollView>
  </ScreenContainer>;
}
const styles=StyleSheet.create({content:{padding:16,paddingBottom:36,gap:18},accountCard:{padding:15,flexDirection:'row',alignItems:'center',gap:13},avatar:{width:58,height:58,borderRadius:22,overflow:'hidden',backgroundColor:COLORS.softSurface,alignItems:'center',justifyContent:'center'},avatarText:{fontSize:22,fontWeight:'900',color:COLORS.primary},copy:{flex:1,minWidth:0},accountName:{fontSize:16,fontWeight:'900',color:COLORS.primaryText},accountEmail:{marginTop:3,fontSize:11,color:COLORS.secondaryText},accountMeta:{marginTop:5,fontSize:10,fontWeight:'800',color:COLORS.primary},section:{gap:9},listCard:{paddingHorizontal:14},row:{minHeight:76,flexDirection:'row',alignItems:'center',gap:11,paddingVertical:12},rowAccent:{backgroundColor:'#FFF7FA',marginHorizontal:-14,paddingHorizontal:14,borderRadius:20},icon:{width:42,height:42,borderRadius:15,backgroundColor:COLORS.softSurface,alignItems:'center',justifyContent:'center'},iconAccent:{backgroundColor:'#FFE5EE'},title:{fontSize:13.5,fontWeight:'900',color:COLORS.primaryText},caption:{marginTop:3,fontSize:10.5,lineHeight:15,color:COLORS.secondaryText},divider:{borderTopWidth:1,borderTopColor:COLORS.border},pressed:{opacity:.7}});
