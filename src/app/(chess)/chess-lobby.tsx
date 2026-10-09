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
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { useChessLobby } from "../../hooks/chess/useChessLobby";
import { CHESS_ERROR_COPY, CHESS_TIME_CONTROLS, type ChessTimeControl } from "../../types/chess";
import { getHomeGamePlayWindow } from "../../services/games/gameRoomPolicy";
import { safeRouterBack } from "../../utils/safeRouterBack";
import { showChessSurfaceFull } from "../../services/chess/chessSurfaceStore";
import { publishChessSoundUiEvent } from "../../services/chess/chessSoundEventBus";

export default function ChessLobbyScreen() {
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const membersRealtime = useFamilyMembersRealtime();
  const { showToast } = useBloomToast();
  const [timeControl, setTimeControl] = useState<ChessTimeControl>(CHESS_TIME_CONTROLS[2].value);
  const [clockNow, setClockNow] = useState(Date.now());
  const playWindow = useMemo(() => getHomeGamePlayWindow(clockNow), [clockNow]);
  const lobby = useChessLobby(activeFamilyId);
  const presence = useMemo(() => new Map(lobby.presence.map((item) => [item.uid, item.status])), [lobby.presence]);
  const members = membersRealtime?.familyId === activeFamilyId ? membersRealtime.members : [];
  const outgoingMember = lobby.outgoingInvite ? members.find((member) => member.uid === lobby.outgoingInvite?.toUid) : null;
  // In DEV we keep the Bloom Bot surface visible even while capability is resolving.
  // The button still calls the server; Render remains the only authority that can allow/deny it.
  const showBotCard = lobby.testBotEnabled || __DEV__;

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const gameId = lobby.pendingResultGameId || lobby.activeGameId;
    if (gameId) showChessSurfaceFull(gameId);
  }, [lobby.activeGameId, lobby.pendingResultGameId]);

  const sendChallenge = async (uid: string) => {
    const latest = getHomeGamePlayWindow();
    if (!latest.canCreate) {
      showToast({ type: "info", title: "Nhà mình nghỉ ngơi nhé 🌙", message: "Lời thách đấu mới sẽ mở lại từ 6:00 sáng." });
      return;
    }
    const response = await lobby.challenge(uid, timeControl);
    if (response.ok) {
      publishChessSoundUiEvent("challenge_sent");
      showToast({ type: "success", title: "Đã gửi lời thách đấu", message: "Lời mời tự hết hạn sau 45 giây." });
    } else {
      showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
    }
  };


  const summonTestBot = async () => {
    // Bloom Bot is intentionally available outside the family 06:00–22:00 play window.
    const response = await lobby.requestTestBotChallenge(timeControl, 5_000);
    if (!response.ok) {
      showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
      return;
    }
    showToast({ type: "info", title: "Bloom Bot sẽ gọi sau 5 giây ♟️", message: "Bloom đưa bạn ra khỏi sảnh để kiểm tra lời thách đấu có hiện ở tab khác." });
    setTimeout(() => safeRouterBack(router, "/home-games" as never), 250);
  };

  const connectionCopy = lobby.connection === "waking"
    ? "Đang đánh thức bàn cờ…"
    : lobby.connection === "connecting"
      ? "Bloom đang mở bàn cờ…"
      : lobby.connection === "ready"
        ? "Sẵn sàng"
        : "Bloom chưa nối được bàn cờ lúc này. Bạn thử lại nhé.";

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ VUA REALTIME"
          title="Một bàn cờ, hai người thân"
          subtitle="Luật, lượt và đồng hồ đều do máy chủ giữ. Bạn chỉ cần chọn người muốn chơi."
          variant="game"
          onBack={() => safeRouterBack(router, "/home-games" as never)}
          roundedBottom
          compact
        />
        <View style={styles.body}>
          <BloomCard tone="soft" style={styles.statusCard}>
            <Ionicons name={lobby.connection === "ready" ? "radio-outline" : "cloud-outline"} size={20} color={COLORS.primary} />
            <Text style={styles.statusText}>{connectionCopy}</Text>
            {lobby.connection === "error" ? (
              <Pressable onPress={() => router.replace("/chess-lobby" as never)}>
                <Text style={styles.retry}>Thử lại</Text>
              </Pressable>
            ) : null}
          </BloomCard>

          {!playWindow.canCreate ? (
            <BloomCard tone="soft" style={styles.sleepCard}>
              <Ionicons name="moon-outline" size={21} color={COLORS.primary} />
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>Nhà mình nghỉ ngơi nhé 🌙</Text>
                <Text style={styles.memberStatus}>Bạn vẫn có thể xem lịch sử hoặc kết thúc ván đang chơi. Thách đấu người thân mở lại từ 6:00 sáng; Bloom Bot vẫn có thể chơi bất kỳ lúc nào.</Text>
              </View>
            </BloomCard>
          ) : null}

          {lobby.outgoingInvite ? (
            <BloomCard style={styles.waitingCard}>
              <View style={styles.waitingIcon}><Ionicons name="hourglass-outline" size={21} color={COLORS.primary} /></View>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>Đang chờ {outgoingMember?.shortName || outgoingMember?.displayName || "người thân"}</Text>
                <Text style={styles.memberStatus}>Lời thách đấu sẽ tự hết hạn sau 45 giây.</Text>
              </View>
              <Pressable
                style={styles.cancelInvite}
                onPress={async () => {
                  const response = await lobby.cancel(lobby.outgoingInvite!.inviteId);
                  if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
                }}
              >
                <Text style={styles.cancelInviteText}>Hủy</Text>
              </Pressable>
            </BloomCard>
          ) : null}

          <BloomSectionHeader title="Nhịp ván" subtitle="Có thể đổi trước khi gửi lời thách đấu" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.controls}>
            {CHESS_TIME_CONTROLS.map((item) => {
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
              <View style={styles.botAvatar}><Text style={styles.botPiece}>♞</Text></View>
              <View style={styles.memberCopy}>
                <Text style={styles.memberName}>Bloom Bot</Text>
                <Text style={styles.memberStatus}>{lobby.testBotEnabled
                  ? "Dành cho lúc bạn chỉ có 1 máy. Bot chơi được 24/7; các ván với người thân vẫn giữ khung 06:00–22:00."
                  : "Đang xác nhận Bloom Bot với máy chủ. Trong DEV bạn vẫn có thể gọi bot; chính server sẽ quyết định bật hay tắt."}</Text>
              </View>
              <Pressable
                disabled={lobby.connection !== "ready" || !!lobby.outgoingInvite || !!lobby.invite}
                onPress={() => void summonTestBot()}
                style={[styles.challenge, (lobby.connection !== "ready" || !!lobby.outgoingInvite || !!lobby.invite) && styles.disabled]}
              >
                <Text style={styles.challengeText}>Thách đấu Bloom Bot</Text>
              </Pressable>
            </BloomCard>
          ) : null}

          <BloomSectionHeader
            title="Người thân đang dùng Family Bloom"
            subtitle="Ai đang online trong app và chưa có ván khác đều có thể nhận thách đấu"
            actionLabel="Lịch sử"
            onAction={() => router.push("/chess-history" as never)}
          />

          {members.filter((member) => member.uid !== user?.uid).length ? (
            members.filter((member) => member.uid !== user?.uid).map((member) => {
              const status = presence.get(member.uid) ?? "offline";
              const ready = (status === "in_lobby" || status === "online_app") && playWindow.canCreate;
              const statusCopy = status === "in_game" ? "Đang chơi" : status === "busy" ? "Đang bận ở một ván khác" : (status === "in_lobby" || status === "online_app") && !playWindow.canCreate ? "Hẹn từ 6:00 sáng" : ready ? (status === "in_lobby" ? "Đang ở sảnh · Sẵn sàng" : "Đang online · Sẵn sàng") : "Ngoại tuyến";
              return (
                <BloomCard key={member.uid} style={styles.memberCard}>
                  <View style={styles.avatar}>
                    {member.avatarUrl ? (
                      <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                    ) : (
                      <Text style={styles.initial}>{(member.shortName || member.displayName || "?").slice(0, 1).toUpperCase()}</Text>
                    )}
                  </View>
                  <View style={styles.memberCopy}>
                    <Text style={styles.memberName}>{member.shortName || member.displayName}</Text>
                    <Text style={styles.memberStatus}>{statusCopy}</Text>
                  </View>
                  <Pressable
                    disabled={!ready || lobby.connection !== "ready" || !!lobby.outgoingInvite}
                    onPress={() => void sendChallenge(member.uid)}
                    style={[styles.challenge, (!ready || lobby.connection !== "ready" || !!lobby.outgoingInvite) && styles.disabled]}
                  >
                    <Text style={styles.challengeText}>Thách đấu</Text>
                  </Pressable>
                </BloomCard>
              );
            })
          ) : (
            <BloomEmptyState
              icon="people-outline"
              title="Chưa có người để thách đấu"
              description="Khi người thân đang dùng Family Bloom, trạng thái sẵn sàng sẽ hiện ở đây."
            />
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
  retry: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  waitingCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF9FC" },
  sleepCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  botCard: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#FFF8ED" },
  botAvatar: { width: 48, height: 48, borderRadius: 17, backgroundColor: "#F4E7CF", alignItems: "center", justifyContent: "center" },
  botPiece: { fontSize: 30, lineHeight: 34, color: COLORS.primaryText, fontWeight: "900" },
  waitingIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: "#F7E3EC", alignItems: "center", justifyContent: "center" },
  cancelInvite: { minHeight: 38, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  cancelInviteText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  controls: { gap: 8, paddingRight: 8 },
  control: { minHeight: 40, paddingHorizontal: 15, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  controlActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  controlText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  controlTextActive: { color: COLORS.white },
  memberCard: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 },
  avatar: { width: 44, height: 44, borderRadius: 16, overflow: "hidden", backgroundColor: "#F9E8EF", alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 16, color: COLORS.primary, fontWeight: "900" },
  memberCopy: { flex: 1 },
  memberName: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  memberStatus: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5 },
  challenge: { minHeight: 40, paddingHorizontal: 13, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  challengeText: { color: COLORS.white, fontSize: 10.5, fontWeight: "900" },
  disabled: { opacity: 0.38 },
});
