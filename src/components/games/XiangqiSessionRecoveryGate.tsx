import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { XIANGQI_EVENTS, type XiangqiRealtimeState } from "../../types/xiangqiRealtime";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import { syncXiangqiPresentationFromState } from "../../services/games/boardGamePresentationBridge";
import { getBoardGamePresentationSnapshot } from "../../services/games/boardGamePresentationStore";
import { useBloomDialog } from "../ui/BloomDialogProvider";

type Recovery = {kind:"active"|"finished_unseen"|"pending"|"busy_other_game"|"none";gameId?:string};
/** Xiangqi-owned recovery; stale persisted locks are settled server-side BEFORE any prompt. */
export function XiangqiSessionRecoveryGate({uid,familyId,ready}:{uid:string;familyId:string;ready:boolean}) {
  const {confirm} = useBloomDialog();
  const prompted=useRef(new Set<string>()), inFlight=useRef(false), lastProbe=useRef(0),generation=useRef(0);
  useEffect(()=>{
    let alive=true; const token=++generation.current;prompted.current.clear();lastProbe.current=0;
    const probe=async()=>{
      if(!alive||!ready||inFlight.current||Date.now()-lastProbe.current<45_000)return;
      lastProbe.current=Date.now();
      const shown=getBoardGamePresentationSnapshot();
      if(shown.activeKind==="xiangqi"&&shown.activeGameId)return;
      inFlight.current=true;
      try {
        if(!xiangqiSocketService.isConnected()){await xiangqiSocketService.prewake();await xiangqiSocketService.connect();}
        if(!alive||generation.current!==token)return;
        const reply=await xiangqiSocketService.emitAck<Recovery>(XIANGQI_EVENTS.sessionRecover,{familyId},20_000);
        if(!reply.ok||(reply.data.kind!=="active"&&reply.data.kind!=="finished_unseen"))return;
        const gameId=reply.data.gameId;if(!gameId||prompted.current.has(gameId))return;
        prompted.current.add(gameId);
        const resume=reply.data.kind==="finished_unseen"?true:await confirm({
          eyebrow:"CỜ TƯỚNG · VÁN ĐẤU ĐANG DIỄN RA",title:"Bạn có muốn tiếp tục ván cờ tướng?",
          message:"Bloom đã đồng bộ trạng thái với máy chủ. Tiếp tục để mở lại bàn cờ và thời gian còn lại.",
          confirmLabel:"Tiếp tục ván",cancelLabel:"Để sau",icon:"game-controller-outline",
        });
        if(!resume||!alive||generation.current!==token)return;
        const joined=await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin,{familyId,gameId},20_000);
        if(!joined.ok||joined.data.gameId!==gameId||joined.data.familyId!==familyId||!alive||generation.current!==token)return;
        syncXiangqiPresentationFromState(joined.data);
        if(AppState.currentState==="active"&&(joined.data.status==="waiting"||joined.data.status==="active"||joined.data.status==="paused"))
          xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.gameBoardPresence,{gameId,visible:true});
      } catch { /* App shell must remain interactive if Render is waking up. */ }
      finally {inFlight.current=false;}
    };
    if(ready)void probe();
    const subscription=AppState.addEventListener("change",next=>{if(next==="active")void probe();});
    return()=>{alive=false;++generation.current;subscription.remove();};
  },[uid,familyId,ready,confirm]);
  return null;
}
