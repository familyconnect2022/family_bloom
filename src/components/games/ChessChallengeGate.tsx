import { useEffect, useRef, useState } from "react";
import { AppState, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
  return (
    <Modal visible={!!invite && remaining > 0} transparent statusBarTranslucent animationType="fade" onRequestClose={() => {
      if (challenge?.kind === "incoming") void act("reject");
      else if (challenge?.kind === "outgoing") void act("cancel");
    }}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>✦ BLOOM CHESS · THÁCH ĐẤU</Text>
          <Text style={styles.queen}>♛</Text>
          <Text style={styles.title}>{challenge?.kind === "incoming" ? "Một ván cờ đang chờ bạn!" : "Đang gửi lời mời yêu thương…"}</Text>
          <Text style={styles.message}>{challenge?.kind === "incoming"
            ? `${invite?.fromDisplayName || "Người thân"} muốn cùng bạn mở một ván cờ. Bloom đã chuẩn bị một điều thật thú vị!`
            : "Người thân của bạn có thể tham gia trước khi đồng hồ lời mời kết thúc."}</Text>
          <Text style={styles.seconds}>{remaining}s</Text>
          <Text style={styles.caption}>Lời mời chỉ có hiệu lực trong 60 giây</Text>
          {challenge?.kind === "incoming" ? <View style={styles.actions}>
            <Pressable disabled={busy} style={[styles.action, styles.secondary]} onPress={() => void act("reject")}><Text style={styles.secondaryText}>Để lần sau</Text></Pressable>
            <Pressable disabled={busy} style={[styles.action, styles.primary]} onPress={() => void act("accept")}><Text style={styles.primaryText}>{busy ? "Đang kết nối…" : "Vào trận ✨"}</Text></Pressable>
          </View> : <Pressable disabled={busy} style={[styles.action, styles.secondary]} onPress={() => void act("cancel")}><Text style={styles.secondaryText}>{busy ? "Đang hủy…" : "Hủy lời mời"}</Text></Pressable>}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(65,24,51,0.47)", justifyContent: "center", paddingHorizontal: 24 },
  panel: { backgroundColor: "#FFF8FC", borderRadius: 32, paddingHorizontal: 24, paddingVertical: 28, alignItems: "center", borderWidth: 1, borderColor: "#F4C7DD", elevation: 16 },
  eyebrow: { color: "#BB5685", fontSize: 12, fontWeight: "800", letterSpacing: 1.4 },
  queen: { color: "#B63874", fontSize: 60, marginTop: 12 },
  title: { color: "#6E2048", textAlign: "center", fontWeight: "900", fontSize: 23, marginTop: 10 },
  message: { color: "#855771", fontSize: 15, lineHeight: 23, textAlign: "center", marginTop: 12 },
  seconds: { fontSize: 38, fontWeight: "900", color: "#C23276", marginTop: 20, fontVariant: ["tabular-nums"] },
  caption: { color: "#9F6D85", fontSize: 12, marginTop: 2, marginBottom: 24 },
  actions: { flexDirection: "row", width: "100%", gap: 10 },
  action: { paddingVertical: 16, paddingHorizontal: 16, borderRadius: 20, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  primary: { backgroundColor: "#BD3977" }, secondary: { backgroundColor: "#FCE5EF", borderWidth: 1, borderColor: "#E9B7CD" },
  primaryText: { color: "white", fontWeight: "800", fontSize: 15 }, secondaryText: { color: "#91476C", fontWeight: "800", fontSize: 15 },
});
