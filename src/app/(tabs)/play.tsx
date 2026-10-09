import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useTabLiveEffect, useTabRuntime } from "../../context/TabRuntimeContext";
import { homeTimeCapsuleService, isTimeCapsuleOpen, timeCapsuleOpenMillis } from "../../services/home/homeTimeCapsuleService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";
import type { HomeTimeCapsule } from "../../types/homeLiving";

type HubCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  accent: string;
  badge?: string;
  statusLine?: string;
  attention?: boolean;
  onPress?: () => void;
};

function HubCard({ icon, title, description, accent, badge, statusLine, attention, onPress }: HubCardProps) {
  return (
    <BloomCard style={[styles.hubCard, attention && styles.hubCardAttention]} onPress={onPress}>
      <View style={[styles.hubIcon, { backgroundColor: accent }]}><Ionicons name={icon} size={25} color={COLORS.primaryText} /></View>
      <View style={styles.hubCopy}>
        <View style={styles.titleRow}>
          <Text style={styles.hubTitle}>{title}</Text>
          {!!badge && <View style={[styles.badge, attention && styles.badgeAttention]}><Text style={[styles.badgeText, attention && styles.badgeTextAttention]}>{badge}</Text></View>}
        </View>
        <Text style={styles.hubDescription}>{description}</Text>
        {!!statusLine && (
          <View style={[styles.hubStatus, attention && styles.hubStatusAttention]}>
            <View style={[styles.hubStatusDot, attention && styles.hubStatusDotAttention]} />
            <Text style={[styles.hubStatusText, attention && styles.hubStatusTextAttention]}>{statusLine}</Text>
          </View>
        )}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={COLORS.primary} /> : null}
    </BloomCard>
  );
}

export default function PlayScreen() {
  useTabStartupTask("play");
  useTabRuntime("play");
  const router = useRouter();
  const { user, userProfile, activeMembership, activeFamilyId } = useAuth();
  const [timeCapsules, setTimeCapsules] = useState<HomeTimeCapsule[]>([]);
  const [capsuleClock, setCapsuleClock] = useState(0);
  const name = userProfile?.shortName || userProfile?.displayName || "bạn";
  const familyName = activeMembership?.familyName || "gia đình mình";


  useEffect(() => {
    if (!activeFamilyId || !user?.uid) setTimeCapsules([]);
  }, [activeFamilyId, user?.uid]);

  useTabLiveEffect("play", (scope) => {
    if (!activeFamilyId || !user?.uid) return;
    return subscribeSharedRealtime<HomeTimeCapsule[]>({
      key: `home.time_capsules.recipient.all:${activeFamilyId}:${user.uid}`,
      listenerName: "home.time_capsules.recipient",
      start: (onData, onError) => homeTimeCapsuleService.watchRecipientCapsules(activeFamilyId, user.uid, onData, onError),
      onData: (items) => { if (scope.isCurrent()) setTimeCapsules(items); },
      onError: () => undefined,
    });
  }, [activeFamilyId, user?.uid]);

  useTabLiveEffect("play", () => {
    const now = Date.now();
    const next = timeCapsules
      .map(timeCapsuleOpenMillis)
      .filter(value => value > now)
      .sort((a, b) => a - b)[0];
    if (!next) return;
    const timer = setTimeout(() => setCapsuleClock(value => value + 1), Math.max(180, Math.min(2_147_000_000, next - now + 150)));
    return () => clearTimeout(timer);
  }, [timeCapsules, capsuleClock]);

  const timeCapsuleHub = useMemo(() => {
    const uid = user?.uid || "";
    const now = Date.now();
    const visibleUnopened = timeCapsules
      .filter(item => item.previewMode === "locked" || isTimeCapsuleOpen(item, now))
      .filter(item => !(item.openedByUids ?? []).includes(uid));
    const ready = visibleUnopened.filter(item => isTimeCapsuleOpen(item, now));
    const upcoming = visibleUnopened
      .filter(item => !isTimeCapsuleOpen(item, now))
      .sort((a, b) => timeCapsuleOpenMillis(a) - timeCapsuleOpenMillis(b));
    if (ready.length) {
      return {
        attention: true,
        badge: ready.length === 1 ? "MỞ NGAY" : `${ready.length} MỞ NGAY`,
        statusLine: ready.length === 1 ? "Có một Hộp thời gian đã đến giờ mở" : `Có ${ready.length} Hộp thời gian đã đến giờ mở`,
      };
    }
    if (upcoming.length) {
      const nextAt = timeCapsuleOpenMillis(upcoming[0]);
      const dateText = nextAt ? new Date(nextAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "sắp tới";
      return {
        attention: true,
        badge: upcoming.length === 1 ? "1 HỘP ĐANG CHỜ" : `${upcoming.length} HỘP ĐANG CHỜ`,
        statusLine: `Hộp gần nhất sẽ mở ${dateText}`,
      };
    }
    return { attention: false, badge: "Dùng ngay", statusLine: "Chưa có hộp nào đang chờ bạn mở" };
  }, [capsuleClock, timeCapsules, user?.uid]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="NHÀ MÌNH"
          title="Chỗ cả nhà cùng vui"
          subtitle="Chơi một chút, hỏi nhau một điều, vào bếp cùng nhau và gom những chuyện chỉ nhà mình mới có."
          variant="living"
          compact
          roundedBottom
        />

        <View style={styles.pageBody}>
          <BloomSectionHeader
            title="Góc Nhà Mình"
            subtitle="Tin tức, trò chơi và quỹ chung — ba nơi cả nhà ghé thường xuyên nhất."
          />
          <View style={styles.list}>
            <HubCard
              icon="notifications-outline"
              title="Bảng tin Nhà Mình"
              description="Thông báo, lời nhắc và những chuyện cả nhà cần cùng để ý."
              accent="#FFF0F4"
              badge="Xem ngay"
              onPress={() => router.push("/home-board" as never)}
            />
            <HubCard
              icon="game-controller-outline"
              title="Trò chơi Nhà Mình"
              description="6 trò turn-based: hiểu nhau, đoán người, ký ức, thật/bịa, nối chuyện và Bingo."
              accent="#FFF0D9"
              badge="Chơi ngay"
              onPress={() => router.push("/home-games" as never)}
            />
            <HubCard
              icon="wallet-outline"
              title="Quỹ gia đình"
              description="Thủ quỹ, nhóm giữ quỹ, thu chi, dấu chân và thống kê Ngày/Tháng/Năm."
              accent="#E8F7F2"
              badge="Dùng ngay"
              onPress={() => router.push("/home-fund" as never)}
            />
          </View>
          <BloomCard style={styles.welcomeCard}>
            <View style={styles.welcomeIcon}><Ionicons name="home" size={25} color={COLORS.primaryText} /></View>
            <View style={styles.welcomeCopy}>
              <Text style={styles.welcomeKicker}>HÔM NAY Ở {familyName.toLocaleUpperCase("vi")}</Text>
              <Text style={styles.welcomeTitle}>Chào {name} 🌷</Text>
              <Text style={styles.welcomeText}>Không cần có việc lớn. Một câu hỏi vui hay một lời nhỏ cũng đủ làm ngôi nhà gần nhau hơn.</Text>
            </View>
          </BloomCard>

          <BloomSectionHeader title="Cùng nhau trong nhà" subtitle="Ba không gian đầu tiên của Nhà Mình đã có thể dùng thật" />
          <View style={styles.list}>
            <HubCard
              icon="chatbubble-ellipses-outline"
              title="Thì thầm"
              description="Gửi riêng cho một người thân hoặc chia sẻ với cả nhà, kèm cảm xúc và tim phản hồi."
              accent="#FFE3EC"
              badge="Dùng ngay"
              onPress={() => router.push("/home-whispers" as never)}
            />
            <HubCard
              icon="stats-chart-outline"
              title="Cùng quyết định"
              description="Mời cả nhà hoặc một nhóm từ 3 người cùng chọn Đồng ý/Không đồng ý trước ngày hết hạn."
              accent="#F6E8FF"
              badge="Dùng ngay"
              onPress={() => router.push("/home-polls" as never)}
            />
            <HubCard
              icon="restaurant-outline"
              title="Bếp Nhà Mình"
              description="100 món Việt được Bloom chuẩn bị sẵn, thay đổi theo ngày và có thể dịu dàng theo khẩu vị của từng người."
              accent="#E8F5EB"
              badge="Dùng ngay"
              onPress={() => router.push("/home-kitchen" as never)}
            />
          </View>

          <BloomSectionHeader title="Một lời dành cho tương lai" subtitle="Chọn người nhận, cất lời nhắn đến đúng ngày rồi mở ra theo một trong ba sắc thái: Ấm áp · Trang trọng · Rộn ràng" />
          <View style={styles.list}>
            <HubCard
              icon={timeCapsuleHub.attention ? "gift" : "gift-outline"}
              title="Hộp thời gian"
              description={timeCapsuleHub.attention
                ? "Có một chiếc hộp đang cần bạn để ý. Chạm để xem ngay, không cần vào trong mới biết trạng thái."
                : "Gửi một lời cho tương lai, ẩn hoàn toàn hoặc báo trước, rồi để Bloom mở đúng khoảnh khắc đã hẹn."}
              accent={timeCapsuleHub.attention ? "#FFD4E1" : "#FFE1E5"}
              badge={timeCapsuleHub.badge}
              statusLine={timeCapsuleHub.statusLine}
              attention={timeCapsuleHub.attention}
              onPress={() => router.push("/home-time-capsules" as never)}
            />
          </View>

        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  pageBody: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },
  welcomeCard: { flexDirection: "row", gap: 12, alignItems: "flex-start", backgroundColor: COLORS.surfaceFocus },
  welcomeIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.78)", alignItems: "center", justifyContent: "center" },
  welcomeCopy: { flex: 1 },
  welcomeKicker: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  welcomeTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  welcomeText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  list: { gap: 10 },
  hubCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  hubCardAttention: { borderWidth: 1.5, borderColor: "#E77C9D", backgroundColor: "#FFF4F7", shadowColor: "#B54A6C", shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  hubIcon: { width: 52, height: 52, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  hubCopy: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  hubTitle: { flex: 1, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  hubDescription: { marginTop: 5, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16.5 },
  hubStatus: { marginTop: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, backgroundColor: COLORS.softSurface, paddingHorizontal: 9, paddingVertical: 5 },
  hubStatusAttention: { backgroundColor: "#FFE0E9" },
  hubStatusDot: { width: 6, height: 6, borderRadius: 99, backgroundColor: COLORS.secondaryText },
  hubStatusDotAttention: { backgroundColor: "#D9577D" },
  hubStatusText: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "800" },
  hubStatusTextAttention: { color: "#A63F61" },
  badge: { borderRadius: 999, backgroundColor: COLORS.softSurface, paddingHorizontal: 8, paddingVertical: 4 },
  badgeAttention: { backgroundColor: "#D9577D" },
  badgeText: { color: COLORS.primary, fontSize: 8.5, fontWeight: "900", letterSpacing: 0.35 },
  badgeTextAttention: { color: COLORS.white },
});
