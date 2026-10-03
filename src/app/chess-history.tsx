import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { BloomCard, BloomEmptyState } from "../components/ui/BloomPageComponents";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useFamilyMembersRealtime } from "../context/FamilyRealtimeContext";
import { chessHistoryService, type ChessHistoryItem } from "../services/chess/chessHistoryService";

const control = (value: ChessHistoryItem["timeControl"]) => value.kind === "unlimited"
  ? "Không giờ"
  : `${Math.round(value.initialMs / 60_000)} + ${Math.round(value.incrementMs / 1_000)}`;

const reason = (value: string | null) => ({
  checkmate: "Chiếu hết",
  resignation: "Đầu hàng",
  timeout: "Hết giờ",
  stalemate: "Hết nước hợp lệ",
  draw: "Đồng ý hòa",
  insufficient_material: "Không đủ quân",
  threefold_repetition: "Lặp thế cờ",
  fifty_move_rule: "Luật 50 nước",
  abandoned: "Kết thúc",
}[value || ""] || "Kết thúc");

export default function ChessHistoryScreen() {
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const members = useFamilyMembersRealtime();
  const [items, setItems] = useState<ChessHistoryItem[]>([]);
  const [cursor, setCursor] = useState<unknown | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (reset = false) => {
    if (!activeFamilyId || !user) return;
    setLoading(true);
    setError(null);
    try {
      const page = await chessHistoryService.list(activeFamilyId, user.uid, reset ? null : cursor);
      setItems((current) => reset ? page.items : [...current, ...page.items]);
      setCursor(page.cursor);
      setHasMore(page.hasMore);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause ?? "Unknown error");
      if (__DEV__) console.warn("[ChessDebug] history:load_failed", { message });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, cursor, user]);

  useEffect(() => {
    void load(true);
    // Cursor is intentionally excluded from the initial-load trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFamilyId, user?.uid]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <BloomHeroHeader
          eyebrow="LỊCH SỬ CỜ VUA"
          title="Những ván đã chơi"
          subtitle="Chỉ hai người trong ván mới đọc được bản ghi và PGN của ván đó."
          variant="game"
          onBack={() => router.back()}
          roundedBottom
          compact
        />
        <View style={styles.body}>
          {error ? (
            <BloomCard tone="soft" style={styles.errorCard}>
              <View style={styles.copy}>
                <Text style={styles.errorTitle}>Chưa tải được lịch sử</Text>
                <Text style={styles.errorText}>Kết nối vẫn an toàn. Bạn thử tải lại sau một chút nhé.</Text>
              </View>
              <Pressable disabled={loading} style={styles.retry} onPress={() => void load(true)}>
                <Text style={styles.retryText}>{loading ? "Đang tải…" : "Thử lại"}</Text>
              </Pressable>
            </BloomCard>
          ) : null}

          {items.map((item) => {
            const opponentUid = item.whiteUid === user?.uid ? item.blackUid : item.whiteUid;
            const opponent = members?.memberByUid.get(opponentUid);
            const isBot = !!item.testBotUid && item.testBotUid === opponentUid;
            const opponentName = isBot ? "Bloom Bot" : (opponent?.shortName || opponent?.displayName || "Người thân");
            const myWhite = item.whiteUid === user?.uid;
            const won = (item.result === "white" && myWhite) || (item.result === "black" && !myWhite);
            const result = item.result === "draw" ? "Hòa" : won ? "Thắng" : "Thua";
            return (
              <BloomCard key={item.id} style={styles.card}>
                <View style={styles.avatar}>
                  {opponent?.avatarUrl ? (
                    <Image source={{ uri: opponent.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={styles.initial}>{isBot ? "♞" : opponentName.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <View style={styles.copy}>
                  <Text style={styles.title}>{opponentName} · {result}{isBot ? " · Thử nghiệm" : ""}</Text>
                  <Text style={styles.meta}>{myWhite ? "Quân trắng" : "Quân đen"} · {control(item.timeControl)} · {reason(item.finishReason)}</Text>
                  <Text style={styles.date}>{item.endedAt ? new Date(item.endedAt).toLocaleString("vi-VN") : ""}</Text>
                </View>
              </BloomCard>
            );
          })}

          {!items.length && !loading && !error ? (
            <BloomEmptyState
              icon="grid-outline"
              title="Chưa có ván cờ nào"
              description="Sau khi một ván kết thúc, lịch sử sẽ được lưu gọn ở đây."
            />
          ) : null}

          {hasMore && !error ? (
            <Pressable disabled={loading} style={styles.more} onPress={() => void load(false)}>
              <Text style={styles.moreText}>{loading ? "Đang tải…" : "Xem thêm 20 ván"}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, padding: 13 },
  errorCard: { flexDirection: "row", alignItems: "center", gap: 12 },
  errorTitle: { fontSize: 13, fontWeight: "900", color: COLORS.primaryText },
  errorText: { marginTop: 4, fontSize: 10.5, color: COLORS.secondaryText },
  retry: { minHeight: 38, paddingHorizontal: 14, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  retryText: { fontSize: 11, fontWeight: "900", color: COLORS.white },
  avatar: { width: 44, height: 44, borderRadius: 16, overflow: "hidden", backgroundColor: "#F9E8EF", alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 16, fontWeight: "900", color: COLORS.primary },
  copy: { flex: 1 },
  title: { fontSize: 13.5, fontWeight: "900", color: COLORS.primaryText },
  meta: { marginTop: 3, fontSize: 10.5, color: COLORS.secondaryText },
  date: { marginTop: 5, fontSize: 9.5, color: COLORS.secondaryText },
  more: { minHeight: 46, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  moreText: { fontSize: 12, fontWeight: "900", color: COLORS.primary },
});
