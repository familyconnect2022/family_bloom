import { useEffect, useRef, useState } from "react";
import { AppState, Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { chessSocketService } from "../../services/chess/chessSocketService";
import { getBoardGamePresentationSnapshot } from "../../services/games/boardGamePresentationStore";
import { syncChessPresentationFromState } from "../../services/games/boardGamePresentationBridge";
import { CHESS_EVENTS, type ChessGameState, type ChessInvite } from "../../types/chess";
import { useBloomDialog } from "../ui/BloomDialogProvider";

/** H21: Chess-only app-shell invitation gate and OS background presence.
 * The countdown updates only this isolated Modal (once/sec). No board store,
 * native board, Home tab, Chess/Xiangqi runtime subscribes to this timer.
 */
export function ChessChallengeGate({ uid, familyId, ready }: { uid: string; familyId: string; ready: boolean }) {
  const { inform } = useBloomDialog();
  const [challenge, setChallenge] = useState<{ invite: ChessInvite; kind: "incoming" | "outgoing" } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef<string | null>(null);
  const currentChallenge = useRef<typeof challenge>(null);
  currentChallenge.current = challenge;

  useEffect(() => {
    if (!ready) return;
    let active = true;
    const assign = (invite: ChessInvite, kind: "incoming" | "outgoing") => {
      if (!active || invite.familyId !== familyId || invite.expiresAt <= Date.now() || invite.isTestBot) return;
      // A challenge may only replace itself. Never open over an active match.
      const visible = getBoardGamePresentationSnapshot();
      if (visible.activeKind && !visible.activeGameId?.startsWith("pending-chess:")) return;
      setChallenge(previous => previous?.invite.inviteId && previous.invite.inviteId !== invite.inviteId ? previous : { invite, kind });
    };
    const incoming = chessSocketService.on("invite", invite => {
      if (invite.toUid === uid) assign(invite, "incoming");
    });
    const outgoing = chessSocketService.on("outgoingInvite", invite => {
      if (invite.fromUid === uid) assign(invite, "outgoing");
    });
    const clear = ({ inviteId }: { inviteId: string }) => {
      setChallenge(old => old?.invite.inviteId === inviteId ? null : old);
      if (pending.current === inviteId) pending.current = null;
    };
    const started = chessSocketService.on("state", state => {
      if (state.familyId !== familyId) return;
      if (state.status === "waiting") {
        setChallenge(current => current?.invite.familyId === familyId ? null : current);
      } else if (state.status === "cancelled" && state.finishReason === "abandoned") {
        void inform({
          eyebrow: "BLOOM CHESS · CHỜ CHUẨN BỊ",
          title: "Mình hẹn ván khác nhé!",
          message: "Một trong hai bàn cờ chưa sẵn sàng kịp thời. Bloom đã giải phóng trận chờ, hai bạn có thể mời đấu lại sau.",
          icon: "flower-outline",
        });
      }
    });
    const expired = chessSocketService.on("inviteExpired", clear);
    const rejected = chessSocketService.on("inviteRejected", clear);
    // Family-wide Chess presence is owned by the foreground app, not the
    // diagnostic Bot screen. Otherwise real relatives never appear online and
    // receive no cross-tab invitation.
    const joinFamily = async () => {
      if (!active || AppState.currentState !== "active") return;
      const result = await chessSocketService.emitAck(CHESS_EVENTS.appJoin, { familyId }, 20_000);
      if (!result.ok || !active) return;
      const visible = getBoardGamePresentationSnapshot();
      if (visible.activeKind === "chess" && visible.activeGameId && !visible.activeGameId.startsWith("pending-chess:")) {
        chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId: visible.activeGameId, visible: true });
      }
    };
    void joinFamily();
    const appState = AppState.addEventListener("change", state => {
      const gameId = getBoardGamePresentationSnapshot().activeKind === "chess"
        ? getBoardGamePresentationSnapshot().activeGameId : null;
      if (!gameId || gameId.startsWith("pending-chess:")) {
        if (state === "background") chessSocketService.emitBestEffort(CHESS_EVENTS.appLeave, { familyId });
        if (state === "active") void joinFamily();
        return;
      }
      // Only leave app -> background/inactive counts. Changing tabs does not.
      if (state === "background" || state === "inactive") {
        chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId, visible: false });
      } else if (state === "active") {
        void joinFamily();
      }
    });
    const connected = chessSocketService.on("connected", () => {
      if (AppState.currentState === "active") void joinFamily();
    });
    return () => { active = false; incoming(); outgoing(); started(); expired(); rejected(); connected(); appState.remove(); };
  }, [uid, familyId, ready, inform]);

  useEffect(() => {
    if (!challenge) { setRemaining(0); return; }
    const tick = () => {
      const left = Math.max(0, Math.ceil((challenge.invite.expiresAt - Date.now()) / 1000));
      setRemaining(previous => previous === left ? previous : left);
      if (left === 0) setChallenge(previous => previous?.invite.inviteId === challenge.invite.inviteId ? null : previous);
    };
    tick();
    const ticker = setInterval(tick, 1000);
    return () => clearInterval(ticker);
  }, [challenge?.invite.inviteId, challenge?.invite.expiresAt]);

  const act = async (action: "accept" | "reject" | "cancel") => {
    const current = currentChallenge.current;
    if (!current || busy || pending.current === current.invite.inviteId) return;
    pending.current = current.invite.inviteId;
    setBusy(true);
    const event = action === "accept" ? CHESS_EVENTS.inviteAccept
      : action === "cancel" ? CHESS_EVENTS.inviteCancel : CHESS_EVENTS.inviteReject;
    try {
      if (action === "accept") {
        const response = await chessSocketService.emitAck<{ gameId: string; state: ChessGameState }>(event, {
          inviteId: current.invite.inviteId, requestId: `invite-accept-${Date.now()}-${uid.slice(0, 7)}`,
        });
        if (response.ok && response.data?.state) syncChessPresentationFromState(response.data.state);
        // If accepted by server but ACK was lost, the authoritative state
        // broadcast still opens the same Full Surface for both users.
        if (response.ok) setChallenge(old => old?.invite.inviteId === current.invite.inviteId ? null : old);
      } else {
        const response = await chessSocketService.emitAck(event, {
          inviteId: current.invite.inviteId, requestId: `invite-${action}-${Date.now()}-${uid.slice(0, 7)}`,
        });
        if (response.ok || remaining === 0) setChallenge(old => old?.invite.inviteId === current.invite.inviteId ? null : old);
      }
    } finally {
      setBusy(false); pending.current = null;
    }
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
          <View pointerEvents="none" style={styles.kingBadge}>
            <Image source={require("../../../assets/images/chess/pieces-png-default/wk.png")} style={styles.kingImage} resizeMode="contain" />
          </View>
          <Text style={styles.eyebrow}>✦  BLOOM ARENA · CỜ VUA  ✦</Text>
          <Text style={styles.title}>{isIncoming ? "MỘT VÁN CỜ ĐANG CHỜ BẠN!" : "ĐÃ GỬI LỜI THÁCH ĐẤU"}</Text>
          <Text style={styles.divider}>✦     ───────     ✦</Text>
          <Text style={styles.message}>{isIncoming
            ? `${invite?.fromDisplayName || "Người thân"} muốn cùng bạn mở một ván cờ thật vui. Bloom đang đợi bạn sẵn sàng!`
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
  kingBadge: { position: "absolute", top: -55, left: "50%", transform: [{ translateX: -55 }], width: 110, height: 110, borderRadius: 55, backgroundColor: "#FFF7FB", borderWidth: 3, borderColor: "#EBC4D9", alignItems: "center", justifyContent: "center", elevation: 19, zIndex: 20 },
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
