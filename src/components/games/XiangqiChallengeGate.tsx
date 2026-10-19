import { useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import { getBoardGamePresentationSnapshot } from "../../services/games/boardGamePresentationStore";
import { syncXiangqiPresentationFromState } from "../../services/games/boardGamePresentationBridge";
import { XIANGQI_EVENTS, type XiangqiRealtimeState, type XiangqiInvite } from "../../types/xiangqiRealtime";
import { useBloomDialog } from "../ui/BloomDialogProvider";

/** Xiangqi alone owns this 60s invite & app-wide presence gate. Chess is untouched. */
export function XiangqiChallengeGate({ uid, familyId, ready }: { uid: string; familyId: string; ready: boolean }) {
  const { inform } = useBloomDialog();
  const [challenge, setChallenge] = useState<{ invite: XiangqiInvite; kind: "incoming" | "outgoing" } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef<string | null>(null);
  const current = useRef<typeof challenge>(null); current.current = challenge;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const assign = (invite: XiangqiInvite, kind: "incoming" | "outgoing") => {
      if (!alive || invite.familyId !== familyId || invite.expiresAt <= Date.now() || invite.isTestBot) return;
      const showing = getBoardGamePresentationSnapshot();
      if (showing.activeKind && showing.activeGameId && !showing.activeGameId.startsWith("pending-xiangqi:")) return;
      setChallenge(prev => prev?.invite.inviteId && prev.invite.inviteId !== invite.inviteId ? prev : { invite, kind });
    };
    const incoming = xiangqiSocketService.on("invite", invite => { if (invite.toUid === uid) assign(invite, "incoming"); });
    const outgoing = xiangqiSocketService.on("outgoingInvite", invite => { if (invite.fromUid === uid) assign(invite, "outgoing"); });
    const clear = ({ inviteId }: { inviteId: string }) => {
      setChallenge(prev => prev?.invite.inviteId === inviteId ? null : prev);
      if (pending.current === inviteId) pending.current = null;
    };
    const expired = xiangqiSocketService.on("inviteExpired", clear);
    const rejected = xiangqiSocketService.on("inviteRejected", clear);
    const live = xiangqiSocketService.on("state", state => {
      if (state.familyId !== familyId) return;
      if (state.status === "waiting") setChallenge(old => old?.invite.familyId === familyId ? null : old);
      if (state.status === "cancelled" && state.finishReason === "abandoned") {
        void inform({ eyebrow: "BLOOM CỜ TƯỚNG · CHỜ CHUẨN BỊ", title: "Hẹn bạn ván khác nhé!",
          message: "Bàn cờ chưa sẵn sàng trong thời gian quy định. Bloom đã giải phóng trận chờ để cả hai có thể mời lại khi thuận tiện.", icon: "flower-outline" });
      }
    });
    const joinFamily = async () => {
      if (!alive || AppState.currentState !== "active") return;
      const reply = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.appJoin, { familyId }, 20_000);
      if (!reply.ok || !alive) return;
      const showing = getBoardGamePresentationSnapshot();
      if (showing.activeKind === "xiangqi" && showing.activeGameId && !showing.activeGameId.startsWith("pending-xiangqi:"))
        xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.gameBoardPresence, { gameId: showing.activeGameId, visible: true });
    };
    void joinFamily();
    const app = AppState.addEventListener("change", next => {
      const showing = getBoardGamePresentationSnapshot();
      const gameId = showing.activeKind === "xiangqi" ? showing.activeGameId : null;
      if (next !== "active") {
        if (gameId && !gameId.startsWith("pending-xiangqi:"))
          xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.gameBoardPresence, { gameId, visible: false });
        if (next === "background") xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.appLeave, { familyId });
      } else void joinFamily();
    });
    const connected = xiangqiSocketService.on("connected", () => { if (AppState.currentState === "active") void joinFamily(); });
    return () => { alive = false; incoming(); outgoing(); expired(); rejected(); live(); connected(); app.remove(); };
  }, [uid, familyId, ready, inform]);

  useEffect(() => {
    if (!challenge) { setRemaining(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((challenge.invite.expiresAt - Date.now()) / 1000));
      setRemaining(prev => prev === left ? prev : left);
      if (!left) setChallenge(old => old?.invite.inviteId === challenge.invite.inviteId ? null : old);
    };
    tick(); const interval = setInterval(tick, 1000); return () => clearInterval(interval);
  }, [challenge?.invite.inviteId, challenge?.invite.expiresAt]);

  const act = async (action: "accept" | "reject" | "cancel") => {
    const selected = current.current;
    if (!selected || busy || pending.current === selected.invite.inviteId) return;
    pending.current = selected.invite.inviteId; setBusy(true);
    const event = action === "accept" ? XIANGQI_EVENTS.inviteAccept : action === "cancel" ? XIANGQI_EVENTS.inviteCancel : XIANGQI_EVENTS.inviteReject;
    try {
      if (action === "accept") {
        const reply = await xiangqiSocketService.emitAck<{gameId:string;state:XiangqiRealtimeState}>(event,
          { inviteId:selected.invite.inviteId,requestId:`xq-accept-${Date.now()}-${uid.slice(0,8)}` });
        if (reply.ok) { syncXiangqiPresentationFromState(reply.data.state); setChallenge(old => old?.invite.inviteId === selected.invite.inviteId ? null : old); }
      } else {
        const reply = await xiangqiSocketService.emitAck(event,
          { inviteId:selected.invite.inviteId,requestId:`xq-${action}-${Date.now()}-${uid.slice(0,8)}` });
        if (reply.ok || remaining === 0) setChallenge(old => old?.invite.inviteId === selected.invite.inviteId ? null : old);
      }
    } finally { pending.current = null; setBusy(false); }
  };

  const invite = challenge?.invite;
  return <Modal visible={!!invite && remaining > 0} transparent statusBarTranslucent animationType="fade"
    onRequestClose={() => { if (challenge?.kind === "incoming") void act("reject"); else void act("cancel"); }}>
    <View style={styles.backdrop}><View style={styles.panel}>
      <Text style={styles.eyebrow}>✦ BLOOM CỜ TƯỚNG · THÁCH ĐẤU</Text>
      <Text style={styles.symbol}>帥</Text>
      <Text style={styles.title}>{challenge?.kind === "incoming" ? "Một ván cờ tướng đang chờ bạn!" : "Đang mời người thân vào trận…"}</Text>
      <Text style={styles.message}>{challenge?.kind === "incoming"
        ? `${invite?.fromDisplayName || "Người thân"} muốn cùng bạn chơi một ván cờ tướng.`
        : "Người được mời có thể tham gia trước khi đồng hồ kết thúc."}</Text>
      <Text style={styles.count}>{remaining}s</Text><Text style={styles.caption}>Lời mời có hiệu lực trong 60 giây</Text>
      {challenge?.kind === "incoming" ? <View style={styles.actions}>
        <Pressable disabled={busy} style={[styles.action,styles.secondary]} onPress={() => void act("reject")}><Text style={styles.secondaryText}>Để lần sau</Text></Pressable>
        <Pressable disabled={busy} style={[styles.action,styles.primary]} onPress={() => void act("accept")}><Text style={styles.primaryText}>{busy ? "Đang kết nối…" : "Vào trận ✨"}</Text></Pressable>
      </View> : <Pressable disabled={busy} style={[styles.action,styles.secondary]} onPress={() => void act("cancel")}><Text style={styles.secondaryText}>{busy ? "Đang hủy…" : "Hủy lời mời"}</Text></Pressable>}
    </View></View>
  </Modal>;
}
const styles=StyleSheet.create({
  backdrop:{flex:1,backgroundColor:"rgba(68,38,13,.52)",justifyContent:"center",paddingHorizontal:24},
  panel:{backgroundColor:"#FFF8EA",borderRadius:30,paddingHorizontal:24,paddingVertical:28,alignItems:"center",borderWidth:1,borderColor:"#E8C989",elevation:16},
  eyebrow:{color:"#A6752D",fontSize:12,fontWeight:"800",letterSpacing:1.2},
  symbol:{color:"#C64231",fontSize:56,marginTop:10},
  title:{color:"#673315",fontSize:22,textAlign:"center",fontWeight:"900",marginTop:10},
  message:{color:"#896243",fontSize:15,lineHeight:23,textAlign:"center",marginTop:12},
  count:{fontSize:38,fontWeight:"900",color:"#B74829",marginTop:18,fontVariant:["tabular-nums"]},
  caption:{color:"#9B7B57",fontSize:12,marginTop:2,marginBottom:24},
  actions:{flexDirection:"row",width:"100%",gap:10},
  action:{paddingVertical:16,paddingHorizontal:16,borderRadius:19,alignItems:"center",justifyContent:"center",flexGrow:1},
  primary:{backgroundColor:"#B9442D"},secondary:{backgroundColor:"#FFE8C1",borderWidth:1,borderColor:"#E7C58D"},
  primaryText:{color:"#FFFFFF",fontWeight:"800",fontSize:15},secondaryText:{color:"#885A32",fontWeight:"800",fontSize:15},
});
