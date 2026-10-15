import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../components/ui/BloomToast";
import { XiangqiPiece } from "../../components/xiangqi/XiangqiPiece";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { useXiangqiRealtime } from "../../context/XiangqiRealtimeContext";
import { getHomeGamePlayWindow } from "../../services/games/gameRoomPolicy";
import { prepareXiangqiSurface } from "../../services/xiangqi/xiangqiSurfaceStore";
import { XIANGQI_TIME_CONTROLS, type XiangqiTimeControl } from "../../types/xiangqiRealtime";
import { safeRouterBack } from "../../utils/safeRouterBack";

const errorCopy = (code?: string) => {
  switch (code) {
    case "XIANGQI_ALREADY_IN_GAME": return "Bạn hoặc người được mời đang bận ở một ván Cờ vua/Cờ tướng khác.";
    case "XIANGQI_INVITE_EXPIRED": return "Lời mời đã khép lại. Bạn có thể gửi một lời mời mới từ sảnh.";
    case "XIANGQI_QUIET_HOURS": return "Nhà mình đang nghỉ ngơi. Lời thách đấu người thân mở lại từ 6:00 sáng.";
    case "XIANGQI_OFFLINE": return "Người thân vừa rời Family Bloom. Bạn thử lại sau nhé.";
    default: return "Bloom chưa gửi được lời thách đấu lúc này. Bạn thử lại nhé.";
  }
};

export default function XiangqiLobbyScreen() {
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const membersRealtime = useFamilyMembersRealtime();
  const realtime = useXiangqiRealtime();
  const { showToast } = useBloomToast();
  const [timeControl, setTimeControl] = useState<XiangqiTimeControl>(XIANGQI_TIME_CONTROLS[2].value);
  const [clockNow, setClockNow] = useState(Date.now());
  const [busyUid, setBusyUid] = useState<string | null>(null);

  const playWindow = useMemo(() => getHomeGamePlayWindow(clockNow), [clockNow]);
  const presence = useMemo(() => new Map(realtime.presence.map((item) => [item.uid, item.status])), [realtime.presence]);
  const members = membersRealtime?.familyId === activeFamilyId ? membersRealtime.members : [];
  const outgoingMember = realtime.outgoingInvite ? members.find((member) => member.uid === realtime.outgoingInvite?.toUid) : null;
  const showBotCard = realtime.testBotEnabled || __DEV__;

  useEffect(() => {
    void realtime.enterLobby();
    return () => realtime.leaveLobby();
  }, [realtime.enterLobby, realtime.leaveLobby]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const openChallengeRoom = (inviteId: string) => {
    prepareXiangqiSurface("outgoing_challenge");
    router.push({ pathname: "/(xiangqi)/xiangqi-challenge/[inviteId]", params: { inviteId } } as never);
  };

  const sendChallenge = async (uid: string) => {
    if (realtime.outgoingInvite || busyUid) return;
    const latest = getHomeGamePlayWindow();
    if (!latest.canCreate) {
      showToast({ type: "info", title: "Nhà mình nghỉ ngơi nhé 🌙", message: "Lời thách đấu mới sẽ mở lại từ 6:00 sáng." });
      return;
    }
    setBusyUid(uid);
    const response = await realtime.challenge(uid, timeControl);
    setBusyUid(null);
    if (!response.ok) {
      showToast({ type: "warning", message: errorCopy(response.errorCode) });
      return;
    }
    openChallengeRoom(response.data.inviteId);
  };

  const challengeBot = async () => {
    if (realtime.outgoingInvite || busyUid) return;
    setBusyUid("bot-out");
    const response = await realtime.challengeTestBot(timeControl);
    setBusyUid(null);
    if (!response.ok) {
      showToast({ type: "warning", message: errorCopy(response.errorCode) });
      return;
    }
    const step = response.data.testCycleStep ?? 1;
    showToast({
      type: "info",
      title: `Test Bạn mời Bot · lượt ${step}/3`,
      message: step === 3
        ? "Lượt này Bloom Bot sẽ từ chối để bạn kiểm tra thông báo kết thúc lời mời."
        : "Lượt này Bloom Bot sẽ đồng ý sau một nhịp ngắn.",
      duration: 1800,
    });
    openChallengeRoom(response.data.inviteId);
  };

  const summonBot = async () => {
    if (realtime.outgoingInvite || busyUid) return;
    setBusyUid("bot-in");
    const response = await realtime.requestTestBotInvite(timeControl);
    setBusyUid(null);
    if (!response.ok) {
      showToast({ type: "warning", message: errorCopy(response.errorCode) });
      return;
    }
    showToast({
      type: "info",
      title: "Bloom Bot sẽ mời bạn",
      message: "Bloom đưa bạn ra khỏi sảnh để kiểm tra lời mời Cờ tướng xuất hiện từ màn hình khác.",
    });
    setTimeout(() => safeRouterBack(router, "/home-games" as never), 180);
  };

  const connectionCopy = realtime.connection === "connecting"
    ? "Bloom đang kết nối Cờ tướng…"
    : realtime.connection === "ready"
      ? "Sẵn sàng"
      : realtime.connection === "error"
        ? "Bloom chưa nối được bàn cờ lúc này."
        : "Đang chuẩn bị…";

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ TƯỚNG REALTIME"
          title="Mời người thân vào một ván"
          subtitle="Cờ tướng có sảnh, lời mời và phiên riêng. Chỉ máy chủ kiểm tra xem hai người có đang bận ở Cờ vua/Cờ tướng khác hay không."
          variant="game"
          onBack={() => safeRouterBack(router, "/home-games" as never)}
          roundedBottom
          compact
        />

        <View style={styles.body}>
          <BloomCard tone="soft" style={styles.statusCard}>
            <Ionicons name={realtime.connection === "ready" ? "radio-outline" : "cloud-outline"} size={20} color={COLORS.primary} />
            <Text style={styles.statusText}>{connectionCopy}</Text>
          </BloomCard>

          {!playWindow.canCreate ? (
            <BloomCard tone="soft" style={styles.sleepCard}>
              <Ionicons name="moon-outline" size={21} color={COLORS.primary} />
              <View style={styles.copy}>
                <Text style={styles.name}>Nhà mình nghỉ ngơi nhé 🌙</Text>
                <Text style={styles.meta}>Thách đấu người thân mở lại từ 6:00 sáng. Bloom Bot vẫn dùng được để test.</Text>
              </View>
            </BloomCard>
          ) : null}

          {realtime.outgoingInvite ? (
            <BloomCard style={styles.waitingCard}>
              <View style={styles.waitingIcon}><Ionicons name="hourglass-outline" size={21} color={COLORS.primary} /></View>
              <View style={styles.copy}>
                <Text style={styles.name}>Đang chờ {realtime.outgoingInvite.isTestBot ? "Bloom Bot" : outgoingMember?.shortName || outgoingMember?.displayName || "người thân"}</Text>
                <Text style={styles.meta}>{realtime.outgoingInvite.isTestBot && realtime.outgoingInvite.testCycleStep ? `Test lượt ${realtime.outgoingInvite.testCycleStep}/3 · ` : ""}Lời mời tự khép lại sau 2 phút.</Text>
              </View>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  const id = realtime.outgoingInvite?.inviteId;
                  if (id) void realtime.cancelInvite(id);
                }}
              >
                <Text style={styles.cancelText}>Hủy</Text>
              </Pressable>
            </BloomCard>
          ) : null}

          <BloomSectionHeader title="Nhịp ván" subtitle="Có thể đổi trước khi gửi lời thách đấu" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controls}>
            {XIANGQI_TIME_CONTROLS.map((item) => {
              const active = JSON.stringify(item.value) === JSON.stringify(timeControl);
              return (
                <Pressable key={item.id} onPress={() => setTimeControl(item.value)} style={[styles.control, active && styles.controlActive]}>
                  <Text style={[styles.controlText, active && styles.controlTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {showBotCard ? (
            <BloomCard tone="soft" style={styles.botCard}>
              <View style={styles.botAvatar}><XiangqiPiece color="red" type="general" size={44} /></View>
              <View style={styles.copy}>
                <Text style={styles.name}>Bloom Bot · kiểm tra 2 chiều</Text>
                <Text style={styles.meta}>Bạn → Bot chạy chu kỳ Đồng ý · Đồng ý · Từ chối. Bot → Bạn kiểm tra lời mời ngoài sảnh.</Text>
                <View style={styles.botActions}>
                  <Pressable disabled={!!busyUid || !!realtime.outgoingInvite} style={[styles.primarySmall, (!!busyUid || !!realtime.outgoingInvite) && styles.disabled]} onPress={() => void challengeBot()}>
                    <Text style={styles.primarySmallText}>{busyUid === "bot-out" ? "Đang gửi…" : "Tôi mời Bot"}</Text>
                  </Pressable>
                  <Pressable disabled={!!busyUid || !!realtime.outgoingInvite} style={[styles.secondarySmall, (!!busyUid || !!realtime.outgoingInvite) && styles.disabled]} onPress={() => void summonBot()}>
                    <Text style={styles.secondarySmallText}>{busyUid === "bot-in" ? "Đang gọi…" : "Bot mời tôi"}</Text>
                  </Pressable>
                </View>
              </View>
            </BloomCard>
          ) : null}

          <BloomSectionHeader title="Người thân đang dùng Family Bloom" subtitle="Chỉ những người đang rảnh mới nhận được lời thách đấu" />
          {members.filter((member) => member.uid !== user?.uid).length ? (
            members.filter((member) => member.uid !== user?.uid).map((member) => {
              const status = presence.get(member.uid) ?? "offline";
              const ready = (status === "in_lobby" || status === "online_app") && playWindow.canCreate;
              const canInvite = ready && realtime.connection === "ready" && !realtime.outgoingInvite && !busyUid;
              const statusCopy = status === "in_game" || status === "busy"
                ? "Đang bận ở một ván khác"
                : ready
                  ? status === "in_lobby" ? "Đang ở sảnh · Sẵn sàng" : "Đang online · Sẵn sàng"
                  : status === "reconnecting" ? "Đang kết nối lại" : "Ngoại tuyến";
              return (
                <BloomCard key={member.uid} style={[styles.memberCard, !canInvite && styles.cardUnavailable]} onPress={canInvite ? () => void sendChallenge(member.uid) : undefined}>
                  <View style={styles.avatar}>
                    {member.avatarUrl ? <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Text style={styles.initial}>{(member.shortName || member.displayName || "?").slice(0, 1).toUpperCase()}</Text>}
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.name}>{member.shortName || member.displayName}</Text>
                    <Text style={styles.meta}>{statusCopy}</Text>
                  </View>
                  <View pointerEvents="none" style={[styles.challenge, !canInvite && styles.disabled]}><Text style={styles.challengeText}>{busyUid === member.uid ? "Đang gửi…" : "Thách đấu"}</Text></View>
                </BloomCard>
              );
            })
          ) : (
            <BloomEmptyState icon="people-outline" title="Chưa có người để thách đấu" description="Khi người thân đang dùng Family Bloom, trạng thái sẵn sàng sẽ hiện ở đây." />
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 16 },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 9 },
  statusText: { flex: 1, color: COLORS.secondaryText, fontSize: 12, fontWeight: "800" },
  sleepCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  waitingCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF9FC" },
  waitingIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: "#F7E3EC", alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  name: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  meta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  cancelButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  cancelText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  controls: { gap: 8, paddingRight: 8 },
  control: { minHeight: 40, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  controlActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  controlText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  controlTextActive: { color: COLORS.white },
  botCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#FFF8ED" },
  botAvatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: "#F4E7CF", alignItems: "center", justifyContent: "center" },
  botActions: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  primarySmall: { minHeight: 38, paddingHorizontal: 13, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  primarySmallText: { color: COLORS.white, fontSize: 10.5, fontWeight: "900" },
  secondarySmall: { minHeight: 38, paddingHorizontal: 13, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  secondarySmallText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  avatar: { width: 44, height: 44, borderRadius: 16, overflow: "hidden", backgroundColor: "#F9E8EF", alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 16, color: COLORS.primary, fontWeight: "900" },
  challenge: { minHeight: 40, paddingHorizontal: 13, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  challengeText: { color: COLORS.white, fontSize: 10.5, fontWeight: "900" },
  disabled: { opacity: 0.38 },
  cardUnavailable: { opacity: 0.72 },
});
