import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState, BloomSectionHeader } from "../components/ui/BloomPageComponents";
import { useBloomDialog } from "../components/ui/BloomDialogProvider";
import { useBloomToast } from "../components/ui/BloomToast";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useFamilyMembersRealtime } from "../context/FamilyRealtimeContext";
import { useChessLobby } from "../hooks/chess/useChessLobby";
import { CHESS_ERROR_COPY, CHESS_TIME_CONTROLS, type ChessTimeControl } from "../types/chess";

export default function ChessLobbyScreen() {
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const membersRealtime = useFamilyMembersRealtime();
  const { confirm } = useBloomDialog();
  const { showToast } = useBloomToast();
  const [timeControl, setTimeControl] = useState<ChessTimeControl>(CHESS_TIME_CONTROLS[2].value);
  const lobby = useChessLobby(activeFamilyId);
  const presence = useMemo(() => new Map(lobby.presence.map((item) => [item.uid, item.status])), [lobby.presence]);
  const members = membersRealtime?.familyId === activeFamilyId ? membersRealtime.members : [];
  const outgoingMember = lobby.outgoingInvite ? members.find((member) => member.uid === lobby.outgoingInvite?.toUid) : null;

  useEffect(() => {
    if (lobby.activeGameId) {
      router.replace({ pathname: "/chess-game/[gameId]" as never, params: { gameId: lobby.activeGameId } } as never);
    }
  }, [lobby.activeGameId, router]);

  useEffect(() => {
    const incoming = lobby.invite;
    if (!incoming) return;
    const from = members.find((member) => member.uid === incoming.fromUid);
    void confirm({
      eyebrow: "CỜ VUA NHÀ MÌNH",
      title: `${from?.shortName || from?.displayName || "Người thân"} thách đấu bạn`,
      message: "Ván sẽ bắt đầu ngay khi bạn nhận lời. Nếu có đồng hồ, thời gian được tính bởi máy chủ.",
      confirmLabel: "Nhận lời",
      cancelLabel: "Để lần sau",
      icon: "grid-outline",
    }).then(async (accepted) => {
      const response = accepted ? await lobby.accept(incoming.inviteId) : await lobby.reject(incoming.inviteId);
      if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
    });
  }, [confirm, lobby.accept, lobby.invite, lobby.reject, members, showToast]);

  const challenge = async (uid: string) => {
    const response = await lobby.challenge(uid, timeControl);
    if (response.ok) {
      showToast({ type: "success", title: "Đã gửi lời thách đấu", message: "Lời mời tự hết hạn sau 45 giây." });
    } else {
      showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
    }
  };

  const connectionCopy = lobby.connection === "waking"
    ? "Đang đánh thức bàn cờ…"
    : lobby.connection === "connecting"
      ? "Đang kết nối máy chủ cờ vua…"
      : lobby.connection === "ready"
        ? "Sẵn sàng"
        : "Không thể kết nối máy chủ cờ vua.";

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ VUA REALTIME"
          title="Một bàn cờ, hai người thân"
          subtitle="Luật, lượt và đồng hồ đều do máy chủ giữ. Bạn chỉ cần chọn người muốn chơi."
          variant="game"
          onBack={() => router.back()}
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

          <BloomSectionHeader
            title="Người thân trong sảnh"
            subtitle="Chỉ người đang mở sảnh Cờ vua và chưa có ván khác mới nhận thách đấu"
            actionLabel="Lịch sử"
            onAction={() => router.push("/chess-history" as never)}
          />

          {members.filter((member) => member.uid !== user?.uid).length ? (
            members.filter((member) => member.uid !== user?.uid).map((member) => {
              const status = presence.get(member.uid) ?? "offline";
              const ready = status === "in_lobby";
              const statusCopy = status === "in_game" ? "Đang chơi" : ready ? "Sẵn sàng" : status === "online" ? "Đang bận" : "Chưa ở sảnh cờ";
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
                    onPress={() => void challenge(member.uid)}
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
              description="Khi người thân mở sảnh Cờ vua, trạng thái sẵn sàng sẽ hiện ở đây."
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
