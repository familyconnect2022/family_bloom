import { BloomScaledInput } from '../../components/ui/BloomScaledInput';
import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { useBloomToast } from "../../components/ui/BloomToast";
import { COLORS } from "../../constants/theme";
import { ENV, SERVER_CONFIG_SOURCES } from "../../config/env";
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from "../../constants/performanceTest";
import { useAuth } from "../../context/AuthContext";
import { probeRenderChessXiangqi, probeVercelMedia, type ServerProbeResult } from "../../services/network/serverStatusService";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


function StatusDetails({data}: {data:ServerProbeResult|null}) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
 if(!data) return <Text style={__a3_styles.hint}>Chưa kiểm tra · chỉ gọi khi bạn bấm nút.</Text>;
 const color = data.state === "healthy" ? "#188560" : data.state === "limited" ? "#A36B10" : "#BE3754";
 return <View style={__a3_styles.result}>
  <View style={__a3_styles.statusLine}><Ionicons name={data.state === "healthy" ? "checkmark-circle" : "alert-circle"} size={18} color={color}/><Text style={[__a3_styles.resultTitle,{color}]}>{data.summary}</Text></View>
  <Text style={__a3_styles.hint}>{data.detail}</Text>
  <Text style={__a3_styles.meta}>HTTP: {data.httpStatuses} · {data.elapsedMs} ms</Text>
  <Text style={__a3_styles.meta}>Lúc: {new Date(data.checkedAt).toLocaleString("vi-VN")}</Text>
  <Text selectable style={__a3_styles.url}>{data.endpoint}</Text>
 </View>;
}

export default function ServerStatusScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
 const router=useRouter(); const {user}=useAuth(); const {showToast}=useBloomToast();
 const allowed=isPerformanceTestAccount(user?.email)&&isVerifiedDeveloperAccount(user);
 const [renderUrl,setRenderUrl]=useState(ENV.chessSocketUrl);
 const [mediaUrl,setMediaUrl]=useState(ENV.momentMediaApiUrl);
 const [renderCheck,setRenderCheck]=useState<ServerProbeResult|null>(null);
 const [mediaCheck,setMediaCheck]=useState<ServerProbeResult|null>(null);
 const [busy,setBusy]=useState(false);
 useEffect(()=>{if(!allowed)router.replace("/settings" as never);},[allowed,router]);
 if(!allowed)return null;
 const run=async()=>{
   if(busy)return;
   setBusy(true);setRenderCheck(null);setMediaCheck(null);
   try {
     await Promise.all([
       probeRenderChessXiangqi(renderUrl).then(setRenderCheck),
       probeVercelMedia(mediaUrl).then(setMediaCheck),
     ]);
   } catch(e){showToast({title:"Lỗi kiểm tra",message:e instanceof Error?e.message:String(e),type:"warning"});}
   finally{setBusy(false);}
 };
 const copyReport=async()=>{
   const rows=[
     "FAMILY BLOOM · BÁO CÁO TRẠNG THÁI SERVER (KHÔNG CÓ TOKEN)",
     `Render cấu hình trong APK: ${ENV.chessSocketUrl} [${SERVER_CONFIG_SOURCES.render}]`,
     `Render URL thử: ${renderUrl}`,
     `Render: ${renderCheck ? JSON.stringify(renderCheck) : "Chưa kiểm tra"}`,
     `Vercel cấu hình trong APK: ${ENV.momentMediaApiUrl} [${SERVER_CONFIG_SOURCES.media}]`,
     `Vercel URL thử: ${mediaUrl}`,
     `Vercel: ${mediaCheck ? JSON.stringify(mediaCheck) : "Chưa kiểm tra"}`,
     "Lưu ý: GET chỉ kiểm tra health/routing, không xác minh Socket.IO/Firebase/Cloudinary.",
   ];
   await Clipboard.setStringAsync(rows.join("\n"));
   showToast({type:"success",title:"Đã sao chép báo cáo",message:"Bạn có thể dán báo cáo vào cuộc trò chuyện để phân tích lỗi.",duration:3500});
 };
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
 <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')}/>
 <BloomHeroHeader eyebrow="PRIVATE · DEVELOPER" title="Trạng thái các server" subtitle="Render Chess/Xiangqi và Vercel Media · kiểm tra thủ công, không tạo phiên game" variant="profile" onBack={()=>router.back()} compact roundedBottom/>
 <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={__a3_styles.content}>
  <View style={__a3_styles.section}><BloomSectionHeader title="Render · Chess & Xiangqi" subtitle="HTTP /health · cả hai game dùng chung server"/><BloomCard style={__a3_styles.card}>
    <Text style={__a3_styles.name}>URL trong APK</Text><Text selectable style={__a3_styles.url}>{ENV.chessSocketUrl}</Text>
    <Text style={__a3_styles.meta}>Nguồn: {SERVER_CONFIG_SOURCES.render}</Text>
    <Text style={__a3_styles.name}>URL muốn kiểm tra</Text>
    <BloomScaledInput autoCapitalize="none" autoCorrect={false} keyboardType="url" selectTextOnFocus value={renderUrl} onChangeText={s=>{setRenderUrl(s);setRenderCheck(null);}} placeholder="https://ten-server.onrender.com" style={__a3_styles.input}/>
    <StatusDetails data={renderCheck}/>
   </BloomCard></View>
  <View style={__a3_styles.section}><BloomSectionHeader title="Vercel · Media" subtitle="GET sign (405) + Cron không khóa (401)"/><BloomCard style={__a3_styles.card}>
    <Text style={__a3_styles.name}>URL trong APK</Text><Text selectable style={__a3_styles.url}>{ENV.momentMediaApiUrl}</Text>
    <Text style={__a3_styles.meta}>Nguồn: {SERVER_CONFIG_SOURCES.media}</Text>
    <Text style={__a3_styles.name}>URL muốn kiểm tra</Text>
    <BloomScaledInput autoCapitalize="none" autoCorrect={false} keyboardType="url" selectTextOnFocus value={mediaUrl} onChangeText={s=>{setMediaUrl(s);setMediaCheck(null);}} placeholder="https://ten-project.vercel.app" style={__a3_styles.input}/>
    <StatusDetails data={mediaCheck}/>
   </BloomCard></View>
  <BloomCard style={__a3_styles.card}>
    <Pressable disabled={busy} onPress={()=>void run()} style={[__a3_styles.action,busy&&__a3_styles.disabled]}>
      {busy?<ActivityIndicator size="small" color="white"/>:<Ionicons name="pulse-outline" size={18} color="white"/>}
      <Text style={__a3_styles.actionText}>{busy?"Đang kiểm tra hai server...":"Kiểm tra cả hai server"}</Text>
    </Pressable>
    <Pressable disabled={busy} onPress={()=>{setRenderUrl(ENV.chessSocketUrl);setMediaUrl(ENV.momentMediaApiUrl);setRenderCheck(null);setMediaCheck(null);}} style={__a3_styles.secondaryButton}><Ionicons name="refresh-outline" size={17} color={__a3Colors.primary}/><Text style={__a3_styles.secondaryText}>Khôi phục URL trong APK</Text></Pressable>
    <Pressable onPress={()=>void copyReport()} style={__a3_styles.secondaryButton}><Ionicons name="copy-outline" size={17} color={__a3Colors.primary}/><Text style={__a3_styles.secondaryText}>Sao chép báo cáo</Text></Pressable>
    <Text style={__a3_styles.note}>Bạn có thể dán URL Render mới để kiểm tra, nhưng việc chỉnh ô này CHỈ dùng cho chẩn đoán, KHÔNG đổi server chơi cờ. Để đổi server thật cần cập nhật EXPO_PUBLIC_CHESS_SOCKET_URL và tạo bản APK/OTA phù hợp.</Text>
    <Text style={__a3_styles.note}>Màu xanh chỉ xác nhận health/routing; không phải kiểm thử đăng nhập, tạo phòng, upload Cloudinary hoặc quyền Firebase. Không gửi secret hay token khi sao chép báo cáo.</Text>
  </BloomCard>
 </ScrollView></ScreenContainer>;
}
const styles=createBloomStyles(() => StyleSheet.create({content:{padding:16,paddingBottom:52,gap:18},section:{gap:10},card:{padding:14,gap:10},name:{color:COLORS.primaryText,fontSize:12,fontWeight:"800"},url:{fontSize:11,lineHeight:18,color:COLORS.secondaryText},meta:{fontSize:11,color:COLORS.secondaryText},hint:{fontSize:12,lineHeight:18,color:COLORS.secondaryText},input:{minHeight:46,borderWidth:1,borderColor:COLORS.border,borderRadius:12,paddingHorizontal:12,color:COLORS.primaryText,fontSize:12,backgroundColor:COLORS.surface},result:{gap:5,padding:10,borderWidth:1,borderColor:COLORS.border,borderRadius:12},resultTitle:{fontWeight:"900",fontSize:13,flex:1},statusLine:{flexDirection:"row",alignItems:"center",gap:8},action:{minHeight:48,flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",padding:12,borderRadius:14,backgroundColor:COLORS.primary},actionText:{fontSize:13,fontWeight:"900",color:COLORS.white},disabled:{opacity:.5},secondaryButton:{minHeight:44,flexDirection:"row",gap:9,alignItems:"center",justifyContent:"center",borderRadius:12,borderWidth:1,borderColor:COLORS.border},secondaryText:{fontSize:12,fontWeight:"800",color:COLORS.primary},note:{fontSize:11,color:COLORS.secondaryText,lineHeight:17}}));
