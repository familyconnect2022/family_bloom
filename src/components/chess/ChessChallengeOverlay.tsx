import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import type { FamilyMember } from "../../types";
import type { ChessInvite } from "../../types/chess";

const timeControlLabel = (invite: ChessInvite) => invite.timeControl.kind === "unlimited"
  ? "Không giới hạn thời gian"
  : `${Math.round(invite.timeControl.initialMs / 60_000)} phút${invite.timeControl.incrementMs ? ` + ${Math.round(invite.timeControl.incrementMs / 1000)} giây/nước` : ""}`;

export function ChessChallengeOverlay({
  invite,
  challenger,
  busy,
  onAccept,
  onReject,
}: {
  invite: ChessInvite | null;
  challenger: FamilyMember | null | undefined;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!invite) return;
    setNow(Date.now());
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [invite?.inviteId]);

  const secondsLeft = useMemo(() => invite ? Math.max(0, Math.ceil((invite.expiresAt - now) / 1000)) : 0, [invite, now]);
  if (!invite) return null;

  const displayName = invite.fromDisplayName || challenger?.shortName || challenger?.displayName || "Người thân";

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent onRequestClose={onReject}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.eyebrowRow}>
            <View style={styles.sparkle}><Ionicons name="sparkles" size={15} color={COLORS.primary} /></View>
            <Text style={styles.eyebrow}>LỜI THÁCH ĐẤU CỜ VUA</Text>
          </View>

          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {challenger?.avatarUrl ? (
                <Image source={{ uri: challenger.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : invite.isTestBot ? (
                <Text style={styles.botPiece}>♞</Text>
              ) : (
                <Text style={styles.initial}>{displayName.slice(0, 1).toUpperCase()}</Text>
              )}
            </View>
            <View style={styles.chessBadge}><Text style={styles.chessBadgeText}>♟</Text></View>
          </View>

          <Text style={styles.title}>{displayName} muốn đấu một ván với bạn</Text>
          <Text style={styles.subtitle}>{invite.isTestBot ? "Bloom Bot sẽ tự đáp lại bằng những nước hợp lệ để bạn có thể chơi ngay trên một máy." : "Một bàn cờ đang chờ. Nhận lời là vào trận ngay."}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}><Ionicons name="timer-outline" size={15} color={COLORS.primaryText} /><Text style={styles.metaText}>{timeControlLabel(invite)}</Text></View>
            <View style={styles.metaPill}><Ionicons name="hourglass-outline" size={15} color={COLORS.primaryText} /><Text style={styles.metaText}>{secondsLeft}s</Text></View>
          </View>

          <View style={styles.actions}>
            <Pressable disabled={busy} style={[styles.reject, busy && styles.disabled]} onPress={onReject}>
              <Text style={styles.rejectText}>Để lần sau</Text>
            </Pressable>
            <Pressable disabled={busy} style={[styles.accept, busy && styles.disabled]} onPress={onAccept}>
              <Ionicons name="flash" size={18} color={COLORS.white} />
              <Text style={styles.acceptText}>{busy ? "Đang vào ván…" : "Nhận lời"}</Text>
            </Pressable>
          </View>

          <Text style={styles.footnote}>{invite.isTestBot ? "Bloom Bot đang ở đây để cùng bạn chơi một ván nhẹ nhàng." : "Bloom chỉ hiện lời mời này khi bạn đang dùng Family Bloom."}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(47, 28, 39, 0.42)", alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  card: { width: "100%", maxWidth: 410, borderRadius: 32, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#E9C9D5", paddingHorizontal: 22, paddingTop: 22, paddingBottom: 18, alignItems: "center", shadowColor: "#2D1720", shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.22, shadowRadius: 28, elevation: 14 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  sparkle: { width: 28, height: 28, borderRadius: 12, backgroundColor: "#FBE7EF", alignItems: "center", justifyContent: "center" },
  eyebrow: { color: COLORS.primary, fontSize: 10.5, letterSpacing: 1.2, fontWeight: "900" },
  avatarRing: { width: 92, height: 92, marginTop: 18, marginBottom: 14, borderRadius: 34, borderWidth: 5, borderColor: "#F4D4E0", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  avatar: { width: 76, height: 76, borderRadius: 28, overflow: "hidden", backgroundColor: "#F8E3EC", alignItems: "center", justifyContent: "center" },
  initial: { color: COLORS.primary, fontSize: 30, fontWeight: "900" },
  botPiece: { color: COLORS.primaryText, fontSize: 38, lineHeight: 44, fontWeight: "900" },
  chessBadge: { position: "absolute", right: -4, bottom: -4, width: 34, height: 34, borderRadius: 14, backgroundColor: COLORS.primaryText, borderWidth: 3, borderColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  chessBadgeText: { color: COLORS.white, fontSize: 20, lineHeight: 23 },
  title: { textAlign: "center", color: COLORS.primaryText, fontSize: 21, lineHeight: 27, fontWeight: "900", paddingHorizontal: 8 },
  subtitle: { marginTop: 8, textAlign: "center", color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 19, fontWeight: "600" },
  metaRow: { marginTop: 16, flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  metaPill: { minHeight: 34, borderRadius: 14, backgroundColor: "#FBEAF0", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  actions: { width: "100%", flexDirection: "row", gap: 10, marginTop: 20 },
  reject: { flex: 1, minHeight: 50, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  rejectText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  accept: { flex: 1.15, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", gap: 7, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  acceptText: { color: COLORS.white, fontSize: 12.5, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  footnote: { marginTop: 13, color: "#9A8790", fontSize: 9.5, lineHeight: 14, textAlign: "center" },
});
