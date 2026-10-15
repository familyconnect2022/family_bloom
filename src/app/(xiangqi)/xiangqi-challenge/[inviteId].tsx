import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";

import { useBoardGameSoundscape } from "../../../components/games/useBoardGameSoundscape";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { XiangqiGameBoard } from "../../../components/xiangqi/XiangqiGameBoard";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../../context/FamilyRealtimeContext";
import { useXiangqiRealtime } from "../../../context/XiangqiRealtimeContext";
import { createInitialXiangqiState } from "../../../games/xiangqi/xiangqiEngine";
import {
  finishXiangqiChallengeMini,
  setXiangqiChallengeMiniVisible,
  startXiangqiChallengeMini,
} from "../../../services/xiangqi/xiangqiChallengeMiniStore";
import { prepareXiangqiSurface } from "../../../services/xiangqi/xiangqiSurfaceStore";

export default function XiangqiChallengeRoom() {
  const { inviteId: rawInviteId } = useLocalSearchParams<{ inviteId: string }>();
  const inviteId = typeof rawInviteId === "string" ? rawInviteId.trim() : "";
  const router = useRouter();
  const { activeFamilyId } = useAuth();
  const members = useFamilyMembersRealtime();
  const realtime = useXiangqiRealtime();
  const audio = useBoardGameSoundscape(true);
  const [boardReady, setBoardReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [yielding, setYielding] = useState(false);
  const board = useMemo(() => createInitialXiangqiState(), []);

  const invite = realtime.outgoingInvite?.inviteId === inviteId ? realtime.outgoingInvite : null;
  const terminal = realtime.outgoingChallengeTerminal?.inviteId === inviteId ? realtime.outgoingChallengeTerminal : null;
  const opponentName = useMemo(() => {
    if (terminal) return terminal.opponentName;
    if (!invite) return "người thân";
    if (invite.isTestBot) return "Bloom Bot";
    const member = members?.memberByUid.get(invite.toUid);
    return member?.shortName || member?.displayName || "người thân";
  }, [invite, members?.memberByUid, terminal]);

  const remainingMs = Math.max(0, (invite?.expiresAt ?? now) - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const remainingCopy = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  useEffect(() => { prepareXiangqiSurface("outgoing_challenge"); }, []);

  useEffect(() => {
    if (!invite) return;
    startXiangqiChallengeMini({
      inviteId: invite.inviteId,
      familyId: invite.familyId || activeFamilyId || "pending",
      opponentUid: invite.toUid,
      opponentName,
      expiresAt: invite.expiresAt,
      ...(invite.testCycleStep ? { testCycleStep: invite.testCycleStep } : {}),
    });
  }, [activeFamilyId, invite, opponentName]);

  useEffect(() => {
    if (terminal || realtime.activeGameId) finishXiangqiChallengeMini(inviteId);
  }, [inviteId, realtime.activeGameId, terminal]);

  useEffect(() => {
    if (!invite) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [invite]);

  const yieldToLobby = useCallback((cancelInvite: boolean) => {
    if (yielding) return;
    setYielding(true);
    const id = invite?.inviteId;
    if (id) finishXiangqiChallengeMini(id);
    router.replace("/(xiangqi)/xiangqi-lobby" as never);
    if (cancelInvite && id) requestAnimationFrame(() => { void realtime.cancelInvite(id); });
  }, [invite?.inviteId, realtime, router, yielding]);

  useFocusEffect(useCallback(() => {
    if (inviteId) setXiangqiChallengeMiniVisible(inviteId, false);
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      yieldToLobby(!!invite);
      return true;
    });
    return () => {
      sub.remove();
      if (inviteId && invite && !terminal && !realtime.activeGameId && !yielding) setXiangqiChallengeMiniVisible(inviteId, true);
    };
  }, [invite, inviteId, realtime.activeGameId, terminal, yieldToLobby, yielding]));

  useEffect(() => {
    if (invite || terminal || realtime.activeGameId) return;
    router.replace("/(xiangqi)/xiangqi-lobby" as never);
  }, [invite, realtime.activeGameId, router, terminal]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor="#FFF8FB">
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="PHÒNG THI ĐẤU CỜ TƯỚNG"
        title={`Đang chờ ${opponentName}`}
        subtitle="Bàn cờ và âm thanh được chuẩn bị ngay; đồng hồ chưa chạy trong lúc chờ lời đồng ý."
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

        <View style={styles.boardShell}>
          <XiangqiGameBoard
            pieces={board.pieces}
            selectedId={null}
            legalTargets={[]}
            lastMove={null}
            checkedColor={null}
            onTap={() => undefined}
            runtimeActive
            onReady={() => setBoardReady(true)}
            readyEpoch={1}
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
                finishXiangqiChallengeMini(inviteId);
                realtime.acknowledgeOutgoingChallengeTerminal();
                router.replace("/(xiangqi)/xiangqi-lobby" as never);
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
                <Text style={styles.waitText}>Lời mời còn {remainingCopy}. Ván Cờ tướng chưa bắt đầu.</Text>
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
  boardShell: { maxWidth: "100%", overflow: "hidden", borderRadius: 18, backgroundColor: "#F5E1CB" },
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
