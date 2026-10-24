import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { BloomSwitch } from "../../components/ui/BloomButtonComponents";
import { cloudFeatureService, type CloudFeatureSwitches } from "../../services/cloud/cloudFeatureService";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { useBloomToast } from "../../components/ui/BloomToast";
import { COLORS } from "../../constants/theme";
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from "../../constants/performanceTest";
import { useAuth } from "../../context/AuthContext";
import { performanceTestService } from "../../services/performance/performanceTestService";
import { localNotificationService } from "../../services/push/localNotificationService";
import { getSharedRealtimeRegistrySnapshot } from "../../services/realtime/sharedRealtimeRegistry";
import { DEV_DUAL_APP_LEASE_EVENT, loadDualAppTestSetting, setDualAppTestSetting } from "../../services/games/developerDualAppTest";
import { chessSocketService } from "../../services/chess/chessSocketService";
import { CHESS_EVENTS } from "../../types/chess";

function ToolButton({icon,label,onPress,disabled=false}:{icon:keyof typeof Ionicons.glyphMap;label:string;onPress:()=>void;disabled?:boolean}){return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>[styles.toolButton,disabled&&styles.disabled,pressed&&styles.pressed]}><Ionicons name={icon} size={17} color={COLORS.primary}/><Text style={styles.toolButtonText}>{label}</Text><Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText}/></Pressable>}

export default function DeveloperToolsScreen(){
 const router=useRouter(); const {user,activeFamilyId,families}=useAuth(); const {showToast}=useBloomToast();
 const allowed=isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user); const [busy,setBusy]=useState(false); const [listenerRows,setListenerRows]=useState(()=>getSharedRealtimeRegistrySnapshot()); const [dualAppEnabled,setDualAppEnabled]=useState(false);
 const [cloudFlags,setCloudFlags]=useState<CloudFeatureSwitches>(cloudFeatureService.snapshot()); const [cloudBusy,setCloudBusy]=useState(false); const [cloudReady,setCloudReady]=useState<boolean|null>(null);
 useEffect(()=>{if(allowed&&user?.uid) void loadDualAppTestSetting(user.uid).then(setDualAppEnabled);},[allowed,user?.uid]);
 useEffect(()=>{if(allowed) void cloudFeatureService.refresh(true).then(setCloudFlags);},[allowed]);
 useEffect(()=>{if(!allowed) router.replace('/settings' as never);},[allowed,router]);
 if(!allowed) return null;
 const toggleDualApp=async()=>{
   if(!user?.uid)return;
   try {
     const familyId = activeFamilyId ?? families[0]?.familyId;
     if (!familyId) throw new Error("Chưa chọn gia đình để thử nghiệm");
     // Arm the lease before switching apps: Android can suspend JavaScript
     // before the final AppState background packet reaches Render.
     const joined = await chessSocketService.emitAck(CHESS_EVENTS.appJoin, {familyId}, 20_000);
     if (!joined.ok) throw new Error(joined.errorCode ?? "CHESS_CONNECT_TIMEOUT");
     const result = await chessSocketService.emitAck(DEV_DUAL_APP_LEASE_EVENT, {familyId,enabled:!dualAppEnabled}, 12_000);
     if (!result.ok) throw new Error(result.errorCode ?? "DEV_DUAL_APP_SERVER_NOT_READY");
     await setDualAppTestSetting(user.uid,!dualAppEnabled);
     setDualAppEnabled(!dualAppEnabled);
     showToast({title:!dualAppEnabled?"Đã bật thử nghiệm ứng dụng kép":"Đã tắt thử nghiệm ứng dụng kép",message:"Tài khoản developer được giữ sẵn sàng tối đa 3 phút sau khi chuyển app. Lời mời chỉ có hiệu lực 60 giây.",duration:4500});
   } catch(e) {showToast({title:"Không thể đổi chế độ",message:e instanceof Error?e.message:String(e),type:"warning"});}
 };
 const checkCloud=async()=>{setCloudBusy(true);try{const ok=await cloudFeatureService.verifyDeployed();setCloudReady(ok);showToast({title:ok?"Cloud Functions đã sẵn sàng":"Chưa triển khai Cloud Functions",message:ok?"Bạn có thể bật các tính năng cloud bên dưới.":"Sau khi nâng cấp Blaze, chạy Family_Bloom_BLAZE_SETUP_ONCE.bat trên máy tính.",type:ok?"info":"warning",duration:4200});}finally{setCloudBusy(false);}};
 const toggleCloud=async(key:keyof CloudFeatureSwitches,value:boolean)=>{if(cloudBusy)return;setCloudBusy(true);try{const next=await cloudFeatureService.setEnabled(key,value);setCloudFlags(next);showToast({title:value?"Đã bật tính năng Cloud":"Đã tắt tính năng Cloud",message:"Thiết lập lưu trên Firebase, các thiết bị sẽ nhận lại khi vào app.",duration:3400});}catch(e){showToast({title:"Chưa thay đổi được",message:e instanceof Error?e.message:String(e),type:"warning",duration:5000});}finally{setCloudBusy(false);}};
 const copyPerf=async()=>{await Clipboard.setStringAsync(performanceTestService.exportText());showToast({title:'Đã sao chép báo cáo',message:'Báo cáo hiệu năng hiện tại đã ở trong clipboard.',duration:2400});};
 const oneNotif=async()=>{setBusy(true);try{const x=await localNotificationService.scheduleTest(activeFamilyId??families[0]?.familyId??null);showToast({title:x.permissionGranted?'Đã hẹn thông báo thử 🌸':'Chưa có quyền thông báo',message:x.permissionGranted?'Thông báo sẽ tới sau khoảng 8 giây.':'Bật quyền Thông báo của Family Bloom rồi thử lại.',duration:3200});}finally{setBusy(false);}};
 const fullNotif=async()=>{setBusy(true);try{const x=await localNotificationService.scheduleFullTestSuite(activeFamilyId??families[0]?.familyId??null);showToast({title:x.permissionGranted?`Đã hẹn ${x.scheduled} thông báo`:'Chưa có quyền thông báo',message:x.permissionGranted?`Bộ 9 ca sẽ chạy trong khoảng ${x.durationSeconds} giây.`:'Bật quyền Thông báo rồi thử lại.',duration:4200});}catch(e){showToast({title:'Chưa tạo được bộ test',message:e instanceof Error?e.message:String(e),type:'warning',duration:4200});}finally{setBusy(false);}};
 const refreshListeners=()=>setListenerRows(getSharedRealtimeRegistrySnapshot());
 const copyListeners=async()=>{const rows=getSharedRealtimeRegistrySnapshot();setListenerRows(rows);await Clipboard.setStringAsync(JSON.stringify(rows,null,2));showToast({message:`Đã sao chép ${rows.length} Firebase listener đang hoạt động.`,duration:2400});};
 return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}><StatusBar translucent backgroundColor="transparent" style="dark"/><BloomHeroHeader eyebrow="PRIVATE · DEVELOPER" title="Kiểm thử & chẩn đoán" subtitle="Chỉ chạy khi bạn chủ động bấm. Không có HUD, timer hay listener test trong lúc dùng app bình thường." variant="profile" onBack={()=>router.back()} compact roundedBottom/><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
  <View style={styles.section}><BloomSectionHeader title="Hiệu năng & tải" subtitle="Các bài cùng mục đích được gom về một nhóm"/><BloomCard style={styles.card}><ToolButton icon="pulse-outline" label="Đo tương tác JS trong 60 giây" onPress={()=>{performanceTestService.reset();performanceTestService.startInteractionProbe(60_000,'developer_tools');showToast({title:'Đã bắt đầu đo 60 giây',message:'Hãy thao tác app bình thường rồi quay lại sao chép báo cáo.',duration:3200});}}/><View style={styles.divider}/><ToolButton icon="copy-outline" label="Sao chép báo cáo hiệu năng" onPress={()=>void copyPerf()}/><View style={styles.divider}/><ToolButton icon="git-network-outline" label="Graph RAM · 100 người" onPress={()=>router.push({pathname:'/performance-graph-test',params:{count:'100'}} as never)}/><View style={styles.divider}/><ToolButton icon="git-network-outline" label="Graph RAM · 500 người" onPress={()=>router.push({pathname:'/performance-graph-test',params:{count:'500'}} as never)}/><View style={styles.divider}/><ToolButton icon="list-outline" label="Long-list RAM · 200 mục" onPress={()=>router.push({pathname:'/performance-data-test',params:{kind:'moments',count:'200'}} as never)}/></BloomCard></View>
  <View style={styles.section}><BloomSectionHeader title="Cloud · Sẵn sàng cho Blaze" subtitle="Cấu hình cho cả nhà · chỉ developer được thay đổi"/><BloomCard style={styles.card}>
   <ToolButton disabled={cloudBusy} icon="cloud-done-outline" label={cloudReady===true?"Cloud đã triển khai · kiểm tra lại":"Kiểm tra kết nối Cloud Functions"} onPress={()=>void checkCloud()}/>
   <View style={styles.divider}/><View pointerEvents={cloudBusy?"none":"auto"} style={[styles.cloudRow,cloudBusy&&styles.disabled]}><View style={styles.cloudCopy}><Text style={styles.toolButtonText}>Cloud Functions cho Phả hệ</Text><Text style={styles.cloudHint}>Bật API kiểm tra quan hệ phía server. Tắt để dùng chế độ Firestore hiện tại.</Text></View><BloomSwitch value={cloudFlags.cloudFunctionsEnabled} onValueChange={v=>void toggleCloud("cloudFunctionsEnabled",v)}/></View>
   <View style={styles.divider}/><View pointerEvents={cloudBusy?"none":"auto"} style={[styles.cloudRow,cloudBusy&&styles.disabled]}><View style={styles.cloudCopy}><Text style={styles.toolButtonText}>Thông báo đẩy từ Cloud (FCM)</Text><Text style={styles.cloudHint}>Xin vào nhà, đề xuất, lời thì thầm, sự kiện. Khác lời nhắc cục bộ Android.</Text></View><BloomSwitch value={cloudFlags.remotePushEnabled} onValueChange={v=>void toggleCloud("remotePushEnabled",v)}/></View>
   <Text style={styles.note}>Mặc định TẮT. Sau khi nâng cấp Blaze cần chạy BAT triển khai một lần. Bật không tự thanh toán, triển khai dịch vụ hay cấp quyền hệ thống Android; Cloud đã triển khai vẫn có thể phát sinh phí gọi hàm dù tắt gửi thông báo.</Text>
  </BloomCard></View>
  <View style={styles.section}><BloomSectionHeader title="Thông báo Android" subtitle="Test cục bộ, không cần Cloud Functions"/><BloomCard style={styles.card}><ToolButton disabled={busy} icon="notifications-outline" label="Một thông báo thử · ~8 giây" onPress={()=>void oneNotif()}/><View style={styles.divider}/><ToolButton disabled={busy} icon="albums-outline" label="Bộ 9 thông báo đầy đủ" onPress={()=>void fullNotif()}/></BloomCard></View>
  <View style={styles.section}><BloomSectionHeader title="Firebase listeners" subtitle="A14 · một query key chỉ có một listener vật lý"/><BloomCard style={styles.card}><ToolButton icon="refresh-outline" label="Làm mới danh sách listener" onPress={refreshListeners}/><View style={styles.divider}/><ToolButton icon="copy-outline" label="Sao chép listener diagnostics" onPress={()=>void copyListeners()}/>{listenerRows.length?<View style={styles.listenerList}>{listenerRows.map(row=><View key={row.key} style={styles.listenerRow}><Text style={styles.listenerName}>{row.listenerName}</Text><Text style={styles.listenerMeta}>{row.subscribers} consumer · {row.physicalStarts} physical</Text><Text style={styles.listenerKey} numberOfLines={2}>{row.key}</Text></View>)}</View>:<Text style={styles.listenerEmpty}>Chưa có Firebase listener dùng chung đang hoạt động.</Text>}</BloomCard></View>
  <View style={styles.section}><BloomSectionHeader title="Thử nghiệm ứng dụng kép" subtitle="Một điện thoại · hai tài khoản · chỉ developer đã xác minh"/><BloomCard style={styles.card}><ToolButton icon={dualAppEnabled?"toggle":"toggle-outline"} label={dualAppEnabled?"Đang bật · Tắt thử nghiệm 3 phút":"Bật thử nghiệm online khi chạy ứng dụng kép"} onPress={()=>void toggleDualApp()}/><Text style={styles.note}>Khi tài khoản developer xuống Background, server cho phép nhận lời thách đấu thêm tối đa 3 phút. Hết hạn tự offline; không thay đổi luật vắng mặt khi đang chơi. Mở lại app để nhận lời mời còn hiệu lực (60 giây).</Text></BloomCard></View>
  <View style={styles.section}><BloomSectionHeader title="Game foundation" subtitle="Bloom Bot, lời mời, realtime và recovery — không dùng UI cờ cũ"/><BloomCard style={styles.card}><ToolButton icon="flask-outline" label="Bloom Bot · Chess & Xiangqi protocol test" onPress={()=>router.push('/board-game-bot-test' as never)}/></BloomCard></View>
  <Text style={styles.note}>Chỉ tài khoản Firebase huynh235@gmail.com đã xác minh mới dùng được bộ công cụ này trên cả Debug và Build & Share.</Text>
 </ScrollView></ScreenContainer>;
}
const styles=StyleSheet.create({content:{padding:16,paddingBottom:40,gap:20},section:{gap:9},card:{paddingHorizontal:14},toolButton:{minHeight:58,flexDirection:'row',alignItems:'center',gap:10,paddingVertical:10},toolButtonText:{flex:1,fontSize:12.5,fontWeight:'900',color:COLORS.primaryText},divider:{borderTopWidth:1,borderTopColor:COLORS.border},pressed:{opacity:.68},disabled:{opacity:.45},listenerList:{paddingBottom:12},listenerRow:{paddingVertical:10,borderTopWidth:1,borderTopColor:COLORS.border},listenerName:{fontSize:11.5,fontWeight:'900',color:COLORS.primaryText},listenerMeta:{marginTop:2,fontSize:10.5,fontWeight:'700',color:COLORS.primary},listenerKey:{marginTop:3,fontSize:9.5,lineHeight:13,color:COLORS.secondaryText},cloudRow:{flexDirection:"row",alignItems:"center",paddingVertical:14,gap:12},cloudCopy:{flex:1,gap:4},cloudHint:{fontSize:10,lineHeight:15,color:COLORS.secondaryText},listenerEmpty:{paddingVertical:14,fontSize:10.5,color:COLORS.secondaryText},note:{fontSize:10.5,lineHeight:16,color:COLORS.secondaryText,textAlign:'center',paddingHorizontal:18}});
