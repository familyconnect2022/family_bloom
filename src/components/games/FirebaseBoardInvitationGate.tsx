import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { chessSocketService } from '../../services/chess/chessSocketService';
import { xiangqiSocketService } from '../../services/xiangqi/xiangqiSocketService';
import { syncChessPresentationFromState, syncXiangqiPresentationFromState } from '../../services/games/boardGamePresentationBridge';
import { getBoardGamePresentationSnapshot, restoreBoardGamePresentation } from '../../services/games/boardGamePresentationStore';
import { type BoardInvitation, transitionFirebaseInvitation, watchMyFirebaseInvitations } from '../../services/games/firebaseBoardInvitations';
import { CHESS_EVENTS, type ChessGameState } from '../../types/chess';
import { XIANGQI_EVENTS, type XiangqiRealtimeState } from '../../types/xiangqiRealtime';

const KING = require('../../../assets/game-state/chess-king-superbloom.png');
const GENERAL = require('../../../assets/game-state/xiangqi-general-superbloom.png');
const ACTIVE = new Set(['PENDING','ACCEPT_REQUESTED','ACCEPTED']);
const acknowledge = new Set<string>();
const forwarded = new Set<string>();

type Props = { uid: string; familyId: string; ready: boolean };

/** H25 one retained Super Bloom form; Firestore moves the invitation state. */
export function FirebaseBoardInvitationGate({uid,familyId,ready}:Props) {
  const [records,setRecords]=useState<BoardInvitation[]>([]);
  const [seconds,setSeconds]=useState(0);
  const [foreground,setForeground]=useState(AppState.currentState==='active');
  const [busy,setBusy]=useState(false);
  const [connectionMessage,setConnectionMessage]=useState('');
  const [transportError,setTransportError]=useState('');
  const timerExpired = useRef(new Set<string>());
  const pendingAction = useRef(false);
  useEffect(()=>{
    if (!ready || !familyId || !uid) return;
    return watchMyFirebaseInvitations(familyId,uid,setRecords,error=>setTransportError(error.message));
  },[uid,familyId,ready]);
  useEffect(()=>{
    const sub=AppState.addEventListener('change',s=>setForeground(s==='active'));
    return ()=>sub.remove();
  },[]);
  const chosen=useMemo(()=>{
    const latest=records.filter(i=>i.familyId===familyId && [i.fromUid,i.toUid].includes(uid))
      .filter(i=>i.status!=='COMPLETED' && (ACTIVE.has(i.status)|| (i.createdAtMs>Date.now()-10*60_000 && !acknowledge.has(`${i.inviteId}:${i.status}`))));
    return latest.sort((a,b)=> Number(ACTIVE.has(b.status))-Number(ACTIVE.has(a.status)) || b.createdAtMs-a.createdAtMs)[0]??null;
  },[records,uid,familyId,seconds]);
  useEffect(()=>{
    if (!chosen || chosen.status!=='PENDING') {setSeconds(0);return;}
    const tick=()=>{
      const remaining=Math.max(0,Math.ceil((chosen.expiresAtMs-Date.now())/1000));
      setSeconds(prev=>prev===remaining?prev:remaining);
      if (!remaining && !timerExpired.current.has(chosen.inviteId)) {
        timerExpired.current.add(chosen.inviteId);
        void transitionFirebaseInvitation(familyId,chosen.inviteId,uid,'expire').catch(()=>{timerExpired.current.delete(chosen.inviteId);});
      }
    };
    tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[chosen?.inviteId,chosen?.status,chosen?.expiresAtMs,uid,familyId]);

  useEffect(()=>{
    const invitation=chosen;
    if (!invitation || !foreground || !ready || !['ACCEPT_REQUESTED','ACCEPTED'].includes(invitation.status)) return;
    const key=`${invitation.inviteId}:${invitation.status}`;
    if (forwarded.has(key)) return;
    forwarded.add(key);
    let cancelled=false;
    const run=async()=>{
      const chess=invitation.gameKind==='chess';
      setConnectionMessage(invitation.status==='ACCEPT_REQUESTED'?'Đang kết nối máy chủ ván cờ…':'Đang mở bàn cờ đã xác nhận…');
      try {
        const service=chess?chessSocketService:xiangqiSocketService;
        await service.connect(); // ONLY after accepted request; never on Home boot.
        if (cancelled || AppState.currentState!=='active') {forwarded.delete(key);return;}
        if (invitation.status==='ACCEPT_REQUESTED') {
          if (chess) {
            const response=await chessSocketService.emitAck<{gameId:string;state:ChessGameState}>('chess:firebase:claim',
              {familyId,inviteId:invitation.inviteId},35_000);
            if (!response.ok) throw new Error(response.errorCode);
            if (!cancelled) {syncChessPresentationFromState(response.data.state);restoreBoardGamePresentation();}
          } else {
            const response=await xiangqiSocketService.emitAck<{gameId:string;state:XiangqiRealtimeState}>('xiangqi:firebase:claim',
              {familyId,inviteId:invitation.inviteId},35_000);
            if (!response.ok) throw new Error(response.errorCode);
            if (!cancelled) {syncXiangqiPresentationFromState(response.data.state);restoreBoardGamePresentation();}
          }
        } else if (invitation.gameId) {
          if (chess) {
            const response=await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin,{familyId,gameId:invitation.gameId},25_000);
            if (!response.ok) throw new Error(response.errorCode);
            if (!cancelled) {syncChessPresentationFromState(response.data);restoreBoardGamePresentation();}
          } else {
            const response=await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin,{familyId,gameId:invitation.gameId},25_000);
            if (!response.ok) throw new Error(response.errorCode);
            if (!cancelled) {syncXiangqiPresentationFromState(response.data);restoreBoardGamePresentation();}
          }
        }
        if (!cancelled) setConnectionMessage('');
      } catch(error) {
        forwarded.delete(key);
        if (!cancelled) setConnectionMessage('Máy chủ đang kết nối lại. Bạn có thể thử tiếp tục.');
      }
    };
    void run();
    return()=>{cancelled=true;};
  },[chosen?.inviteId,chosen?.status,chosen?.gameId,foreground,ready,familyId]);

  useEffect(()=>{
    if (!chosen || chosen.status!=='ACCEPT_REQUESTED') return;
    const accepted=(chosen.acceptedAt as {toMillis?:()=>number}|undefined)?.toMillis?.();
    if (!accepted) return;
    const tick=()=>{if (Date.now()>=accepted+180_000) void transitionFirebaseInvitation(familyId,chosen.inviteId,uid,'fail').catch(()=>undefined);};
    tick();const timer=setInterval(tick,3_000);return()=>clearInterval(timer);
  },[chosen?.inviteId,chosen?.status,chosen?.acceptedAt,familyId,uid]);

  const act=async(action:'accept'|'cancel'|'decline'|'expire'|'fail')=>{
    if (!chosen || pendingAction.current) return;
    pendingAction.current=true;setBusy(true);
    try {await transitionFirebaseInvitation(familyId,chosen.inviteId,uid,action);}
    catch(error){setTransportError(error instanceof Error?error.message:String(error));}
    finally{pendingAction.current=false;setBusy(false);}
  };
  const person=chosen?(chosen.fromUid===uid?chosen.toDisplayName:chosen.fromDisplayName):'';
  const isInviter=chosen?.fromUid===uid;
  const result=chosen?.status??'';
  const inMatch=result==='ACCEPT_REQUESTED'||result==='ACCEPTED';
  const visible=!!chosen && foreground && (!getBoardGamePresentationSnapshot().activeGameId || !inMatch)
    && !acknowledge.has(`${chosen?.inviteId}:${result}`);
  const done=!ACTIVE.has(result);
  const headline=result==='PENDING'?(isInviter?'ĐÃ GỬI LỜI MỜI':`${person} MỜI BẠN CHƠI!`)
    :result==='CANCELLED'?(isInviter?'Bạn đã hủy lời mời':`${person} đã hủy lời mời`)
    :result==='DECLINED'?(isInviter?`${person} chưa thể tham gia`:'Bạn đã từ chối lời mời')
    :result==='EXPIRED'?(isInviter?`${person} chưa kịp phản hồi`:'Lời mời đã hết thời gian')
    :result==='FAILED'?'Chưa thể bắt đầu ván cờ':result==='ACCEPTED'?'VÁN CỜ ĐÃ ĐƯỢC TẠO':'ĐANG XÁC NHẬN VÁN CỜ';
  const detail=result==='PENDING'?(isInviter?`Đang chờ ${person} phản hồi lời mời của bạn.`:'Bạn có muốn cùng người thân chơi một ván cờ không?')
    :result==='ACCEPT_REQUESTED'?(isInviter?`${person} đã đồng ý. Đang chờ máy chủ xác nhận…`:'Đã gửi yêu cầu đồng ý. Đang chuẩn bị kết nối…')
    :result==='ACCEPTED'?'Máy chủ đã khóa màu quân. Hai bạn đang chuẩn bị bàn cờ và âm thanh.'
    :result==='CANCELLED'?'Lời mời đã được hủy. Hẹn một ván khác nhé!'
    :result==='DECLINED'?'Hẹn gặp nhau ở một ván cờ khác nhé!'
    :result==='EXPIRED'?'Hai bạn có thể gửi lời mời mới khi thuận tiện.'
    :'Có thể thử lại sau, không có kết quả thua cuộc.';
  const isChess=chosen?.gameKind==='chess';
  const base=isChess?'#963A70':'#A77030';
  return <Modal visible={visible} transparent animationType="fade" statusBarTranslucent
    onRequestClose={()=>{if(done&&chosen)acknowledge.add(`${chosen.inviteId}:${result}`); else if(isInviter)void act('cancel');}}>
    <View style={styles.backdrop}>
      <View style={[styles.form,{borderColor:isChess?'#F1CBDF':'#EED8A5'}]}>
        <Image source={isChess?KING:GENERAL} resizeMode="contain" style={styles.crest}/>
        <Text style={[styles.eyebrow,{color:base}]}>✦ FAMILY BLOOM · {isChess?'CỜ VUA':'CỜ TƯỚNG'} ✦</Text>
        <Text style={[styles.title,{color:base}]}>{headline}</Text>
        <Text style={styles.description}>{detail}</Text>
        {result==='PENDING' ? <View style={styles.timerBox}>
          <Text style={styles.clock}>{`00:${String(seconds).padStart(2,'0')}`}</Text>
          <Text style={styles.helper}>Thời gian phản hồi còn lại</Text>
        </View> : inMatch?<Text style={styles.progress}>{connectionMessage || 'Đang chuẩn bị phiên chơi…'}</Text>:null}
        {transportError?<Text style={styles.error}>{transportError}</Text>:null}
        {result==='PENDING' && !isInviter ? <View style={styles.actions}>
          <Pressable disabled={busy||seconds===0} onPress={()=>void act('decline')} style={[styles.button,styles.secondary]}><Text style={styles.secondaryLabel}>Từ chối</Text></Pressable>
          <Pressable disabled={busy||seconds===0} onPress={()=>void act('accept')} style={[styles.button,{backgroundColor:base}]}><Text style={styles.primaryLabel}>Đồng ý</Text></Pressable>
        </View>:result==='PENDING' && isInviter?<Pressable disabled={busy} onPress={()=>void act('cancel')} style={[styles.button,styles.secondary,styles.full]}><Text style={styles.secondaryLabel}>Hủy lời mời</Text></Pressable>
        :done?<Pressable onPress={()=>{acknowledge.add(`${chosen?.inviteId}:${result}`);setSeconds(x=>x+0.00001);}} style={[styles.button,{backgroundColor:base},styles.full]}><Text style={styles.primaryLabel}>Đồng ý</Text></Pressable>
        :inMatch&&connectionMessage?<Pressable onPress={()=>{forwarded.delete(`${chosen?.inviteId}:${result}`);setForeground(false);setTimeout(()=>setForeground(true),100);}} style={[styles.button,styles.secondary,styles.full]}><Text style={styles.secondaryLabel}>Thử kết nối lại</Text></Pressable>:null}
      </View>
    </View>
  </Modal>;
}
const styles=StyleSheet.create({
  backdrop:{flex:1,justifyContent:'center',paddingHorizontal:20,backgroundColor:'rgba(38,21,33,.42)'},
  form:{backgroundColor:'#FFFCFA',borderWidth:2,borderRadius:31,paddingTop:88,paddingBottom:22,paddingHorizontal:23,alignItems:'center',overflow:'visible',elevation:13},
  crest:{position:'absolute',height:146,width:146,top:-73,alignSelf:'center',zIndex:10},
  eyebrow:{fontSize:11,fontWeight:'800',letterSpacing:1.0,textAlign:'center'},
  title:{fontSize:21,lineHeight:28,fontWeight:'900',marginTop:15,textAlign:'center'},
  description:{fontSize:14,lineHeight:22,color:'#7D6471',marginTop:11,textAlign:'center'},
  timerBox:{width:'100%',backgroundColor:'#FAEDF3',borderRadius:17,padding:15,marginTop:20,alignItems:'center'},
  clock:{fontSize:33,color:'#883E6B',fontWeight:'900',fontVariant:['tabular-nums']},
  helper:{fontSize:11,color:'#9B6A84',marginTop:3},
  progress:{fontSize:12,color:'#967087',textAlign:'center',marginTop:20},
  error:{fontSize:11,color:'#BC5260',marginTop:10,textAlign:'center'},
  actions:{flexDirection:'row',gap:10,marginTop:19,width:'100%'},
  button:{minHeight:46,borderRadius:16,justifyContent:'center',alignItems:'center',paddingHorizontal:15,flex:1},
  secondary:{backgroundColor:'#FFF0F6',borderWidth:1,borderColor:'#EED5E0'},
  full:{marginTop:20,width:'100%',flex:0},
  primaryLabel:{color:'#FFF',fontWeight:'800',fontSize:13},secondaryLabel:{color:'#85526A',fontWeight:'800',fontSize:13},
});
