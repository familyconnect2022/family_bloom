import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyMembers } from "../../../hooks/family/useFamilyMembers";
import { chessSocketService } from "../../../services/chess/chessSocketService";
import { syncChessPresentationFromState } from "../../../services/games/boardGamePresentationBridge";
import { getBoardGamePresentationSnapshot, restoreBoardGamePresentation } from "../../../services/games/boardGamePresentationStore";
import { CHESS_EVENTS, CHESS_TIME_CONTROLS, type ChessInvite, type ChessGameState } from "../../../types/chess";
import { ArenaPlayerRow, ArenaRuleLine, mayChallengeMember, type ArenaPalette, type ArenaPresence } from "../../../components/games/FamilyBoardGameLobbyVisuals";
import { createFirebaseInvitation, watchInvitationSlots, type InvitationSlot } from "../../../services/games/firebaseBoardInvitations";

const PALETTE: ArenaPalette = { primary: '#AA3C75', deep:'#78304F', background:'#FFF2F8', surface:'#FFFCFC', pale:'#FCE4EF', border:'#F0D4E3' };
const ART = require("../../../../assets/images/chess/pieces-png-default/wk.png");
const makeRequestId = () => `chess-family-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

/** Chess owns its route/session/subscription; there is no shared game controller. */
export default function ChessFamilyLobby() {
  const router=useRouter();
  const { user, activeFamilyId }=useAuth();
  const { showToast }=useBloomToast();
  const { members,loading:loadingMembers,error:memberError }=useFamilyMembers(activeFamilyId);
  const [presence,setPresence]=useState<Record<string,ArenaPresence>>({});
  const [slots,setSlots]=useState<Record<string,InvitationSlot>>({});
  const [online,setOnline]=useState(false);
  const [connecting,setConnecting]=useState(true);
  const [sendingUid,setSendingUid]=useState<string|null>(null);
  const [selectedControl,setSelectedControl]=useState("10+0");
  const [recovering,setRecovering]=useState(false);
  const alive=useRef(true);
  const familyId=activeFamilyId ?? "";
  const options=CHESS_TIME_CONTROLS;
  const players=useMemo(()=>members.filter(m=>!!m.uid && m.uid!==user?.uid).sort((a,b)=> {
    const rank=(uid:string)=> slots[uid]?1:0;
    return rank(a.uid)-rank(b.uid) || (a.shortName||a.displayName).localeCompare(b.shortName||b.displayName,"vi");
  }),[members,slots,user?.uid]);
  const readyCount=players.filter(m=>!slots[m.uid]).length;
  const selectControl=options.find(o=>o.id===selectedControl)?.value ?? options[0].value;

  // Firebase invite availability only. Opening the lobby never wakes Render.
  useFocusEffect(useCallback(()=>{
    if (!familyId || !user?.uid) return;
    alive.current=true;
    setConnecting(true);
    const unsub=watchInvitationSlots(familyId,items=>{
      if(!alive.current)return;
      setSlots(items);setConnecting(false);setOnline(true);
    },e=>{
      if(alive.current){setConnecting(false);setOnline(false);showToast({title:"Chưa tải được danh sách mời",message:e.message,type:"warning"});}
    });
    return ()=>{alive.current=false;unsub();};
  },[familyId,user?.uid,showToast]));

  const invitePlayer=async(toUid:string)=>{
    if(!familyId || !online || sendingUid)return;
    const player=players.find(p=>p.uid===toUid);
    if(!player || slots[toUid])return;
    const surface=getBoardGamePresentationSnapshot();
    if(surface.activeGameId){showToast({title:"Đang có ván cờ",message:"Hãy trở lại ván đang mở trước khi mời người khác.",type:"warning"});return;}
    setSendingUid(toUid);
    try{
      await createFirebaseInvitation({
        familyId,gameKind:"chess",fromUid:user!.uid,toUid,
        fromDisplayName:user?.displayName || "Người thân",
        toDisplayName:player.shortName||player.displayName||"Người thân",timeControl:selectControl,
      });
      // Global ChessChallengeGate owns the authoritative 60s countdown + cancel.
      showToast({title:"Đã gửi lời thách đấu",message:`Đang chờ ${player.shortName||player.displayName} trả lời trong 60 giây.`,duration:3500});
    }catch(e){showToast({title:"Không gửi được lời mời",message:e instanceof Error?e.message:String(e),type:"warning",duration:4500});}
    finally{if(alive.current)setSendingUid(null);}
  };

  const resume=async()=>{
    if(!familyId || recovering)return;
    setRecovering(true);
    try{
      const response=await chessSocketService.emitAck<{kind:string;gameId?:string;gameKind?:string}>(CHESS_EVENTS.sessionRecover,{familyId},20_000);
      if(!response.ok)throw new Error(response.errorCode);
      if(response.data.kind==="active"&&response.data.gameId){
        const game=await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin,{familyId,gameId:response.data.gameId},20_000);
        if(!game.ok)throw new Error(game.errorCode);
        syncChessPresentationFromState(game.data);
        restoreBoardGamePresentation();
      }else if(response.data.kind==="pending"){showToast({title:"Lời mời đang chờ",message:"Vui lòng xử lý lời mời hiện tại trước khi tạo ván mới."});}
      else if(response.data.kind==="busy_other_game"){showToast({title:"Đang có ván ở trò khác",message:"Hãy kết thúc hoặc thu nhỏ ván đang chơi trước nhé."});}
      else showToast({title:"Sảnh đã sẵn sàng",message:"Chọn thành viên gia đình để gửi lời mời."});
    }catch(e){showToast({title:"Chưa khôi phục được",message:e instanceof Error?e.message:String(e),type:"warning"});}
    finally{if(alive.current)setRecovering(false);}
  };

  return <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={PALETTE.background}>
    <StatusBar translucent backgroundColor="transparent" style="dark"/>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.page}>
      <View style={[styles.hero,{backgroundColor:PALETTE.background}]}>
        <Pressable accessibilityLabel="Về Trò chơi Nhà Mình" onPress={()=>router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={PALETTE.deep}/></Pressable>
        <Text style={[styles.eyebrow,{color:PALETTE.deep}]}>✦ BLOOM ARENA · CỜ VUA ✦</Text>
        <Image source={ART} style={styles.royalPiece} resizeMode="contain"/>
        <Text style={styles.title}>Đấu trường Cờ vua</Text>
        <Text style={styles.subtitle}>Một cuộc đấu trí vui cùng người thân trong Nhà Mình. Gửi lời mời cho người thân, không cần họ đang online!</Text>
        <View style={styles.heroStats}>
          <View style={styles.statItem}><View style={[styles.onlineDot,{backgroundColor:online?"#38BD82":"#D7AB54"}]}/><Text style={styles.statText}>{connecting?"Đang kết nối…":online?"Lời mời Firebase":"Chưa kết nối Firebase"}</Text></View>
          <View style={styles.statDivider}/>
          <View style={styles.statItem}><Ionicons name="people" size={15} color={PALETTE.deep}/><Text style={styles.statText}>{readyCount} người sẵn sàng</Text></View>
        </View>
      </View>
      <View style={styles.body}>
        <View style={[styles.panel,{borderColor:PALETTE.border}]}>
          <View style={styles.headingLine}><Text style={styles.sectionEyebrow}>THIẾT LẬP VÁN ĐẤU</Text><Ionicons name="timer-outline" color={PALETTE.primary} size={20}/></View>
          <Text style={styles.sectionTitle}>Chọn thời gian</Text>
          <View style={styles.timeRow}>{options.map(o=><Pressable key={o.id} onPress={()=>setSelectedControl(o.id)}
            style={[styles.timeChip,{backgroundColor:selectedControl===o.id?PALETTE.primary:PALETTE.pale,borderColor:selectedControl===o.id?PALETTE.primary:PALETTE.border}]}><Text style={[styles.timeText,{color:selectedControl===o.id?"#FFFFFF":PALETTE.deep}]}>{o.id}</Text></Pressable>)}</View>
          <Text style={styles.helper}>Đồng hồ do máy chủ quản lý · Hai người sẵn sàng mới bắt đầu.</Text>
        </View>
        <View style={styles.sectionHead}><View><Text style={styles.sectionEyebrow}>THÁCH ĐẤU NGƯỜI NHÀ</Text><Text style={styles.sectionTitle}>Mời người thân cùng chơi</Text></View><View style={[styles.countPill,{backgroundColor:PALETTE.pale}]}><Text style={[styles.countText,{color:PALETTE.deep}]}>{readyCount} có thể mời</Text></View></View>
        <Text style={styles.description}>Danh sách thành viên từ Firebase. Có thể mời dù đối phương chưa mở ứng dụng; thời hạn phản hồi là 60 giây.</Text>
        {memberError?<Text style={styles.empty}>Không tải được danh sách tài khoản. Hãy kiểm tra quyền gia đình.</Text>:null}
        {loadingMembers?<Text style={styles.empty}>Đang lấy danh sách thành viên…</Text>:players.length===0?<Text style={styles.empty}>Chưa có tài khoản người thân khác trong gia đình.</Text>:
          players.map(person=><ArenaPlayerRow key={person.uid} member={person} presence={slots[person.uid]?"busy":undefined} inviteWithoutPresence theme={PALETTE} waiting={sendingUid!==null||!online} onChallenge={()=>void invitePlayer(person.uid)}/>)}
        <Pressable onPress={()=>void resume()} disabled={recovering} style={[styles.resume,{borderColor:PALETTE.border}]}><Ionicons name="refresh-circle-outline" color={PALETTE.primary} size={23}/><Text style={[styles.resumeText,{color:PALETTE.deep}]}>{recovering?"Đang tìm ván cũ…":"Tiếp tục ván đang chơi"}</Text><Ionicons name="arrow-forward" size={17} color={PALETTE.primary}/></Pressable>
        <View style={[styles.panel,{borderColor:PALETTE.border}]}><Text style={styles.sectionEyebrow}>CÁCH CHƠI CÙNG NHAU</Text>
          <ArenaRuleLine icon="people-outline" theme={PALETTE}>Mời thành viên gia đình qua Firebase, không cần họ đang online.</ArenaRuleLine>
          <ArenaRuleLine icon="notifications-outline" theme={PALETTE}>Người nhận có 60 giây để đồng ý hoặc từ chối.</ArenaRuleLine>
          <ArenaRuleLine icon="sparkles-outline" theme={PALETTE}>Khi cả hai sẵn sàng, bàn cờ Full mở ra; có thể thu nhỏ để dùng các tab khác.</ArenaRuleLine>
        </View>
        <Text style={styles.footer}>✦ FAMILY BLOOM · PLAY TOGETHER ✦</Text>
      </View>
    </ScrollView>
  </ScreenContainer>;
}
const styles=StyleSheet.create({
 page:{paddingBottom:50},hero:{alignItems:"center",paddingHorizontal:22,paddingTop:55,paddingBottom:26,borderBottomLeftRadius:35,borderBottomRightRadius:35},
 back:{position:"absolute",top:54,left:20,width:41,height:41,borderRadius:15,backgroundColor:"#FFFFFF",alignItems:"center",justifyContent:"center",zIndex:2},
 eyebrow:{fontSize:10,fontWeight:"800",letterSpacing:1.4,marginBottom:9},royalPiece:{width:114,height:114,marginTop:3,marginBottom:5},
 title:{fontSize:28,fontWeight:"900",color:"#4B2C3B",textAlign:"center"},subtitle:{fontSize:12.5,lineHeight:20,color:"#8B6575",textAlign:"center",marginTop:10,maxWidth:300},
 heroStats:{marginTop:22,flexDirection:"row",borderRadius:19,backgroundColor:"#FFFFFF",paddingVertical:13,paddingHorizontal:17,alignItems:"center",justifyContent:"center",gap:14,borderWidth:1,borderColor:"#FFFFFF"},
 statItem:{flexDirection:"row",alignItems:"center",gap:7},statText:{fontSize:11.5,color:"#67505A",fontWeight:"700"},statDivider:{height:18,width:1,backgroundColor:"#EFE0E5"},onlineDot:{width:9,height:9,borderRadius:99},
 body:{paddingHorizontal:16,paddingTop:19,gap:13},panel:{borderWidth:1,backgroundColor:"#FFFFFF",padding:17,borderRadius:25},headingLine:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},
 sectionEyebrow:{fontSize:10,letterSpacing:1,color:"#986B7C",fontWeight:"900"},sectionTitle:{fontSize:19,color:"#492E39",fontWeight:"900",marginTop:6},
 timeRow:{flexDirection:"row",flexWrap:"wrap",gap:7,marginTop:15},timeChip:{paddingHorizontal:14,minHeight:38,borderRadius:14,borderWidth:1,justifyContent:"center"},timeText:{fontSize:12,fontWeight:"900"},
 helper:{fontSize:10.5,color:"#9C8790",marginTop:13,lineHeight:17},sectionHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:11},
 countPill:{paddingHorizontal:12,paddingVertical:7,borderRadius:99},countText:{fontSize:11,fontWeight:"900"},description:{fontSize:11.5,lineHeight:19,color:"#907C86",marginBottom:1},
 empty:{paddingVertical:18,color:"#8D7A82",fontSize:12,textAlign:"center"},resume:{backgroundColor:"#FFFFFF",borderRadius:18,borderWidth:1,padding:14,flexDirection:"row",alignItems:"center",gap:10},resumeText:{flex:1,fontSize:13,fontWeight:"800"},
 footer:{fontSize:10,letterSpacing:1,color:"#A47F90",fontWeight:"800",textAlign:"center",marginTop:14},
});
