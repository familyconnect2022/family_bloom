import { useEffect, useRef, useState } from "react";
import { AppState, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
    const outgoing = xiangqiSocketService.onOutgoingInvite(invite => { if (invite.fromUid === uid) assign(invite, "outgoing"); });
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
  const isIncoming = challenge?.kind === "incoming";
  const progress = Math.max(0, Math.min(100, remaining / 60 * 100));
  const seconds = `00:${String(remaining).padStart(2, "0")}`;
  return (
    <Modal visible={!!invite && remaining > 0} transparent statusBarTranslucent animationType="fade"
      onRequestClose={() => { if (isIncoming) void act("reject"); else void act("cancel"); }}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View pointerEvents="none" style={styles.kingSlot}>
            <View style={styles.kingBadge}>
            <Image source={require("../../../assets/xiangqi/red_general_modal.png")} style={styles.kingImage} resizeMode="contain" />
            </View>
          </View>
          <Text style={styles.eyebrow}>✦  BLOOM ARENA · CỜ TƯỚNG  ✦</Text>
          <Text style={styles.title}>{isIncoming ? "MỜI BẠN VÀO TRẬN!" : "MỘT LỜI MỜI ĐẶC BIỆT"}</Text>
          <Text style={styles.divider}>✦     ───────     ✦</Text>
          <Text style={styles.message}>{isIncoming
            ? `${invite?.fromDisplayName || "Người thân"} đang đợi bạn ở đấu trường Cờ tướng. Một ván cờ thật vui sắp bắt đầu!`
            : "Bloom đã gửi lời mời. Hãy chờ người thân sẵn sàng cùng mình nhé!"}</Text>
          <View style={styles.timerCard}>
            <Text style={styles.timerLabel}>THỜI GIAN CÒN LẠI</Text>
            <Text style={styles.count}>{seconds}</Text>
            <View style={styles.timerTrack}><View style={[styles.timerFill, { width: `${progress}%` }]} /></View>
            <Text style={styles.caption}>Lời mời tự kết thúc sau 60 giây</Text>
          </View>
          {isIncoming ? <View style={styles.actions}>
            <Pressable accessibilityRole="button" disabled={busy} style={[styles.action, styles.secondary]} onPress={() => void act("reject")}>
              <Text style={styles.secondaryText}>Để lần sau</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} style={[styles.action, styles.primary]} onPress={() => void act("accept")}>
              <Text style={styles.primaryText}>{busy ? "Đang kết nối…" : "Vào trận ✨"}</Text>
            </Pressable>
          </View> : <Pressable accessibilityRole="button" disabled={busy} style={[styles.action, styles.secondary, styles.cancel]} onPress={() => void act("cancel")}>
            <Text style={styles.secondaryText}>{busy ? "Đang hủy lời mời…" : "Hủy lời mời"}</Text>
          </Pressable>}
          <Text style={styles.brand}>✦  FAMILY BLOOM  ·  PLAY TOGETHER  ✦</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(255,240,249,.83)", justifyContent: "center", paddingHorizontal: 21 },
  // Overflow must stay visible: half of the King physically floats above card.
  panel: { backgroundColor: "#FFFAFC", borderRadius: 32, paddingHorizontal: 22, paddingTop: 83, paddingBottom: 20, alignItems: "center", borderWidth: 2, borderColor: "#EEC5DA", elevation: 18, overflow: "visible" },
  kingSlot: { position: "absolute", top: -55, left: 0, right: 0, height: 110, alignItems: "center", justifyContent: "center", zIndex: 20, overflow: "visible" },
  kingBadge: { width: 110, height: 110, borderRadius: 55, backgroundColor: "#FFF7FB", borderWidth: 3, borderColor: "#EBC4D9", alignItems: "center", justifyContent: "center", elevation: 19, zIndex: 20 },
  kingImage: { width: 100, height: 100 },
  eyebrow: { color: "#873A63", fontSize: 11, fontWeight: "800", letterSpacing: 1.4, textAlign: "center" },
  title: { color: "#79385F", fontSize: 21, textAlign: "center", fontWeight: "900", letterSpacing: .4, marginTop: 17 },
  divider: { color: "#E2B6CD", fontSize: 14, marginTop: 13 },
  message: { color: "#8F5A77", fontSize: 14.5, lineHeight: 23, textAlign: "center", marginTop: 16, marginBottom: 18 },
  timerCard: { width: "100%", borderRadius: 19, borderWidth: 1, borderColor: "#F2D4E1", backgroundColor: "#FFF5FA", alignItems: "center", paddingHorizontal: 18, paddingTop: 13, paddingBottom: 15 },
  timerLabel: { fontSize: 10.5, color: "#AC6D8B", letterSpacing: 1.5, fontWeight: "800" },
  count: { fontSize: 35, fontWeight: "900", color: "#9D376E", marginTop: 5, marginBottom: 8, fontVariant: ["tabular-nums"] },
  timerTrack: { width: "100%", height: 6, borderRadius: 5, backgroundColor: "#F2D5E4", overflow: "hidden" },
  timerFill: { height: 6, backgroundColor: "#BA588C", borderRadius: 5 },
  caption: { color: "#A87D96", fontSize: 11, marginTop: 9 },
  actions: { flexDirection: "row", width: "100%", gap: 10, marginTop: 19 },
  action: { paddingVertical: 15, paddingHorizontal: 15, borderRadius: 17, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  primary: { backgroundColor: "#A73674", borderColor: "#A73674", borderWidth: 1 },
  secondary: { backgroundColor: "#FFF5FA", borderColor: "#E3BFD0", borderWidth: 1 },
  cancel: { width: "100%", marginTop: 18 },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
  secondaryText: { color: "#91456E", fontWeight: "800", fontSize: 14 },
  brand: { color: "#AA7290", fontSize: 10, letterSpacing: .7, marginTop: 22, fontWeight: "600" },
});
