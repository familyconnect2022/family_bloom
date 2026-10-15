import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { ChessBoard } from "../../../components/chess/ChessBoard";
import { useChessSoundscape } from "../../../components/chess/useChessSoundscape";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useChessRealtime } from "../../../context/ChessRealtimeContext";
import { useFamilyMembersRealtime } from "../../../context/FamilyRealtimeContext";
import { prepareChessSurface } from "../../../services/chess/chessSurfaceStore";
import { finishChessChallengeMini, setChessChallengeMiniVisible, startChessChallengeMini } from "../../../services/chess/chessChallengeMiniStore";
import {
  emptyChessCaptureSummary,
  isChessTestBotUid,
  type ChessAck,
  type ChessGameState,
  type ChessMoveCommandAck,
} from "../../../types/chess";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function pendingBoardState(inviteId: string, familyId: string | null): ChessGameState {
  const now = new Date().toISOString();
  return {
    gameId: `pending-${inviteId}`,
    familyId: familyId || "pending",
    whiteUid: "pending-me",
    blackUid: "pending-opponent",
    status: "waiting",
    fen: START_FEN,
    turn: "w",
    revision: 0,
    ply: 0,
    whiteRemainingMs: null,
    blackRemainingMs: null,
    timeControl: { kind: "unlimited", initialMs: null, incrementMs: 0 },
    result: null,
    finishReason: null,
    lastMove: null,
    checkSquare: null,
    captureSummary: emptyChessCaptureSummary(),
    drawOfferByUid: null,
    serverNowMs: Date.now(),
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

const blockedMove = async (): Promise<ChessAck<ChessMoveCommandAck>> => ({ ok: false, errorCode: "CHESS_INVALID_REQUEST" });
const blockedResync = async () => null;
const blockedPromotion = async () => null;

export default function ChessChallengeRoom() {
  const { inviteId: rawInviteId } = useLocalSearchParams<{ inviteId: string }>();
  const inviteId = typeof rawInviteId === "string" ? rawInviteId.trim() : "";
  const router = useRouter();
  const { activeFamilyId } = useAuth();
  const members = useFamilyMembersRealtime();
  const realtime = useChessRealtime();
  const { width } = useWindowDimensions();
  const audio = useChessSoundscape(true);
  const [boardReady, setBoardReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [yielding, setYielding] = useState(false);

  const invite = realtime.outgoingInvite?.inviteId === inviteId ? realtime.outgoingInvite : null;
  const terminal = realtime.outgoingChallengeTerminal?.inviteId === inviteId ? realtime.outgoingChallengeTerminal : null;
  const opponentName = useMemo(() => {
    if (terminal) return terminal.opponentName;
    if (!invite) return "người thân";
    if (isChessTestBotUid(invite.toUid)) return "Bloom Bot";
    const member = members?.memberByUid.get(invite.toUid);
    return member?.shortName || member?.displayName || "người thân";
  }, [invite, members?.memberByUid, terminal]);
  const boardState = useMemo(() => pendingBoardState(inviteId || "warming", activeFamilyId), [activeFamilyId, inviteId]);
  const boardSize = Math.max(8, Math.floor(Math.max(8, width - 20) / 8) * 8);
  const remainingMs = Math.max(0, (invite?.expiresAt ?? now) - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const remainingCopy = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    prepareChessSurface("outgoing_challenge");
  }, []);

  useEffect(() => {
    if (!invite) return;
    startChessChallengeMini({
      inviteId: invite.inviteId,
      familyId: invite.familyId,
      opponentUid: invite.toUid,
      opponentName,
      expiresAt: invite.expiresAt,
      ...(invite.testCycleStep ? { testCycleStep: invite.testCycleStep } : {}),
    });
  }, [invite, opponentName]);

  useEffect(() => {
    if (terminal) finishChessChallengeMini(inviteId);
  }, [inviteId, terminal]);

  useEffect(() => {
    if (!invite) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [invite]);

  const yieldToLobby = useCallback((cancelInvite: boolean) => {
    if (yielding) return;
    setYielding(true);
    const id = invite?.inviteId;
    if (id) finishChessChallengeMini(id);
    // Yield first: navigation is never held by socket cleanup or board/audio work.
    router.replace("/chess-lobby" as never);
    if (cancelInvite && id) {
      requestAnimationFrame(() => { void realtime.cancelInvite(id); });
    }
  }, [invite?.inviteId, realtime, router, yielding]);

  useFocusEffect(useCallback(() => {
    if (inviteId) setChessChallengeMiniVisible(inviteId, false);
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      yieldToLobby(!!invite);
      return true;
    });
    return () => {
      sub.remove();
      if (inviteId && invite && !terminal && !yielding) setChessChallengeMiniVisible(inviteId, true);
    };
  }, [invite, inviteId, terminal, yieldToLobby, yielding]));

  useEffect(() => {
    if (invite || terminal || realtime.activeGameId) return;
    router.replace("/chess-lobby" as never);
  }, [invite, realtime.activeGameId, router, terminal]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor="#FFF8FB">
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="PHÒNG THI ĐẤU"
        title={`Đang chờ ${opponentName}`}
        subtitle="Bàn cờ và âm thanh được chuẩn bị ngay trong lúc chờ lời đồng ý."
        variant="game"
        compact
        roundedBottom
        onBack={() => yieldToLobby(!!invite)}
      />

      <View style={styles.content}>
        <View style={styles.statusRow}>
          <View style={[styles.statusPill, boardReady && styles.statusPillReady]}>
            <Ionicons name={boardReady ? "checkmark-circle" : "grid-outline"} size={15} color={boardReady ? "#287A51" : COLORS.primary} />
            <Text style={styles.statusText}>{boardReady ? "Bàn cờ sẵn sàng" : "Đang dựng bàn cờ"}</Text>
          </View>
          <View style={[styles.statusPill, audio.criticalAudioReady && styles.statusPillReady]}>
            <Ionicons name={audio.criticalAudioReady ? "checkmark-circle" : "volume-medium-outline"} size={15} color={audio.criticalAudioReady ? "#287A51" : COLORS.primary} />
            <Text style={styles.statusText}>{audio.criticalAudioReady ? "Âm thanh sẵn sàng" : `Âm thanh ${audio.audioLoadedCount}/${audio.audioExpectedCount}`}</Text>
          </View>
        </View>

        <View style={[styles.boardShell, { width: boardSize, height: boardSize }]}> 
          <ChessBoard
            state={boardState}
            myColor="w"
            moveDeltas={[]}
            snapshotEpoch={0}
            onMove={blockedMove}
            onResync={blockedResync}
            onPromotion={blockedPromotion}
            onBoardReady={() => setBoardReady(true)}
            interactionBlocked
            runtimeActive
            hintsEnabled={false}
            motionFxEnabled={false}
            boardSize={boardSize}
          />
        </View>

        {terminal ? (
          <View style={styles.terminalCard}>
            <View style={styles.terminalIcon}><Ionicons name="leaf-outline" size={24} color={COLORS.primary} /></View>
            <Text style={styles.terminalTitle}>{terminal.opponentName} chưa sẵn sàng chơi lúc này</Text>
            <Text style={styles.terminalText}>{terminal.reason === "expired" ? "Lời mời đã khép lại sau 2 phút." : "Có lẽ mình sẽ gặp nhau ở một ván khác nhé."}</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                finishChessChallengeMini(inviteId);
                realtime.acknowledgeOutgoingChallengeTerminal();
                router.replace("/chess-lobby" as never);
              }}
            >
              <Text style={styles.primaryButtonText}>Đồng ý</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.waitCard}>
            <View style={styles.waitTop}>
              <View style={styles.waitIcon}><Ionicons name="hourglass-outline" size={19} color={COLORS.primary} /></View>
              <View style={styles.waitCopy}>
                <Text style={styles.waitTitle}>Đang chờ {opponentName} đồng ý…</Text>
                <Text style={styles.waitText}>Lời mời còn {remainingCopy}. Đồng hồ ván cờ chưa chạy.</Text>
                {invite?.isTestBot && invite.testCycleStep ? (
                  <Text style={styles.testState}>TEST BOT · lượt {invite.testCycleStep}/3 · {invite.testCycleStep === 3 ? "sẽ từ chối" : "sẽ đồng ý"}</Text>
                ) : null}
              </View>
            </View>
            <Pressable disabled={yielding} style={[styles.cancelButton, yielding && styles.disabled]} onPress={() => yieldToLobby(true)}>
              <Text style={styles.cancelButtonText}>{yielding ? "Đang rời phòng…" : "Hủy và về trang game"}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", paddingHorizontal: 10, paddingTop: 12, paddingBottom: 16, gap: 10 },
  statusRow: { width: "100%", flexDirection: "row", justifyContent: "center", gap: 7, flexWrap: "wrap" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, minHeight: 32, paddingHorizontal: 10, borderRadius: 999, backgroundColor: "#FFF0F6", borderWidth: 1, borderColor: "#F2D8E4" },
  statusPillReady: { backgroundColor: "#EFFAF4", borderColor: "#CDEBD9" },
  statusText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  boardShell: { overflow: "hidden", borderRadius: 18, backgroundColor: "#F7D9E6" },
  waitCard: { width: "100%", borderRadius: 20, padding: 14, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  waitTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  waitIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F6" },
  waitCopy: { flex: 1 },
  waitTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  waitText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  testState: { marginTop: 6, color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  cancelButton: { minHeight: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7FA", borderWidth: 1, borderColor: COLORS.border },
  cancelButtonText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  terminalCard: { width: "100%", borderRadius: 22, padding: 18, alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: COLORS.border },
  terminalIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F6", marginBottom: 10 },
  terminalTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900", textAlign: "center" },
  terminalText: { marginTop: 6, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "700", textAlign: "center" },
  primaryButton: { marginTop: 16, minWidth: 150, minHeight: 44, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  primaryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  disabled: { opacity: 0.55 },
});
