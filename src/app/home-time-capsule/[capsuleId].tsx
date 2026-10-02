import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomConfirmModal } from "../../components/ui/BloomConfirmModal";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomCard } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { TimeCapsuleRevealPrototype } from "../../features/home/timeCapsule/TimeCapsuleRevealPrototype";
import { homeTimeCapsuleService, isTimeCapsuleOpen, timeCapsuleOpenMillis } from "../../services/home/homeTimeCapsuleService";
import { activityService } from "../../services/activity/activityService";
import type { HomeTimeCapsule, HomeTimeCapsuleContent, HomeTimeCapsuleRevealTheme } from "../../types/homeLiving";

const THEME_UI: Record<HomeTimeCapsuleRevealTheme, { label: string; bg: string; accent: string; icon: keyof typeof Ionicons.glyphMap }> = {
  warm: { label: "Ấm áp", bg: "#FFF1F4", accent: "#DB6F8D", icon: "heart-outline" },
  formal: { label: "Trang trọng", bg: "#ECF5FF", accent: "#3978C5", icon: "shield-checkmark-outline" },
  festive: { label: "Rộn ràng", bg: "#FFF6D4", accent: "#E67F91", icon: "sparkles-outline" },
};

const openText = (capsule: HomeTimeCapsule) => {
  const millis = timeCapsuleOpenMillis(capsule);
  return millis ? new Date(millis).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Chưa rõ";
};

const waitedDaysFor = (capsule: HomeTimeCapsule) => {
  const created = Date.parse(capsule.createdAt);
  const openAt = timeCapsuleOpenMillis(capsule);
  if (!created || !openAt || openAt <= created) return 1;
  return Math.max(1, Math.ceil((openAt - created) / 86_400_000));
};

export default function HomeTimeCapsuleDetailScreen() {
  const router = useRouter();
  const { capsuleId: rawId } = useLocalSearchParams<{ capsuleId?: string }>();
  const capsuleId = typeof rawId === "string" ? rawId : "";
  const { user, userProfile, activeFamilyId } = useAuth();
  const uid = user?.uid ?? "";
  const [capsule, setCapsule] = useState<HomeTimeCapsule | null>(null);
  const [content, setContent] = useState<HomeTimeCapsuleContent | null>(null);
  const [openedBefore, setOpenedBefore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replay, setReplay] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!activeFamilyId || !capsuleId || !uid) return;
    setLoading(true);
    try {
      const row = await homeTimeCapsuleService.get(activeFamilyId, capsuleId);
      if (!row) throw new Error("Hộp thời gian không còn tồn tại.");
      setCapsule(row);
      const open = isTimeCapsuleOpen(row);
      const mine = row.createdByUid === uid;
      if (open || mine) {
        const [body, receipt, openedByUids] = await Promise.all([
          homeTimeCapsuleService.getContent(activeFamilyId, capsuleId),
          mine ? Promise.resolve(null) : homeTimeCapsuleService.getOpen(activeFamilyId, capsuleId, uid).catch(() => null),
          mine && open ? homeTimeCapsuleService.listOpenedByUids(activeFamilyId, capsuleId).catch(() => row.openedByUids ?? []) : Promise.resolve(row.openedByUids ?? []),
        ]);
        setCapsule(mine ? { ...row, openedByUids } : row);
        setContent(body);
        const alreadyOpened = !mine && (!!receipt || (row.openedByUids ?? []).includes(uid));
        setOpenedBefore(alreadyOpened);
        if (!mine && receipt && !(row.openedByUids ?? []).includes(uid)) {
          void homeTimeCapsuleService.syncOpenedSummary(activeFamilyId, capsuleId, uid);
        }
      } else {
        setContent(null);
        setOpenedBefore(false);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không mở được Hộp thời gian.");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, capsuleId, uid]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const mine = capsule?.createdByUid === uid;
  const available = !!capsule && isTimeCapsuleOpen(capsule);
  const openedCount = capsule ? new Set((capsule.openedByUids ?? []).filter(value => capsule.recipientUids.includes(value))).size : 0;
  const firstReveal = !!capsule && !!content && available && !mine && !openedBefore;
  const showReveal = !!capsule && !!content && (firstReveal || replay);
  const theme = capsule ? THEME_UI[capsule.revealTheme] : THEME_UI.warm;
  const canEdit = !!capsule && !!mine && !available;
  const hiddenBeforeOpen = !!capsule && !mine && !available && capsule.previewMode === "hidden";
  const recipientLabel = capsule?.audience === "family" ? "Cả nhà" : `${capsule?.recipientUids.length || 0} người được chọn`;

  // If the recipient stays on this page until the seal expires, transition into
  // the first-open ceremony automatically instead of requiring Back/refresh.
  useEffect(() => {
    if (!capsule || mine || available) return;
    const openAt = timeCapsuleOpenMillis(capsule);
    if (!openAt) return;
    const delay = Math.min(2_147_000_000, Math.max(120, openAt - Date.now() + 180));
    const timer = setTimeout(() => { void load(); }, delay);
    return () => clearTimeout(timer);
  }, [available, capsule, load, mine]);

  const revealContent = useMemo(() => content && capsule ? {
    kicker: capsule.revealTheme === "formal" ? "DÀNH RIÊNG CHO BẠN" : capsule.revealTheme === "festive" ? "MỘT NIỀM VUI CHO BẠN" : "MỘT LỜI DÀNH CHO BẠN",
    title: content.title,
    message: content.message,
    sender: capsule.createdByName,
  } : undefined, [capsule, content]);

  if (showReveal && capsule && revealContent) {
    return (
      <>
        <StatusBar translucent backgroundColor="transparent" style="light" />
        <TimeCapsuleRevealPrototype
          onBack={() => { if (replay) setReplay(false); else router.back(); }}
          initialThemeKey={capsule.revealTheme}
          allowThemeSwitch={false}
          content={revealContent}
          waitedDays={waitedDaysFor(capsule)}
          onOpened={() => {
            if (!mine && activeFamilyId && uid && !openedBefore) {
              void homeTimeCapsuleService.markOpened(activeFamilyId, capsule.id, uid).then(async () => {
                setOpenedBefore(true);
                const openerName = userProfile?.shortName || userProfile?.displayName || "Một người thân";
                await activityService.createTimeCapsuleOpenedNotice({
                  familyId: activeFamilyId,
                  capsuleId: capsule.id,
                  creatorUid: capsule.createdByUid,
                  openerUid: uid,
                  openerName,
                  openedCount: Math.min(capsule.recipientUids.length, openedCount + 1),
                  recipientCount: capsule.recipientUids.length,
                }).catch(() => undefined);
              }).catch(() => undefined);
            }
          }}
        />
      </>
    );
  }

  const remove = async () => {
    if (!activeFamilyId || !capsule || !uid || deleting) return;
    setDeleting(true);
    try {
      await homeTimeCapsuleService.remove(activeFamilyId, capsule.id, uid);
      setConfirmDelete(false);
      router.replace("/home-time-capsules" as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được Hộp thời gian.");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="NHÀ MÌNH · HỘP THỜI GIAN"
          title={hiddenBeforeOpen ? "Chưa đến lúc" : (!mine && openedBefore) ? "Hộp đã mở" : available ? "Đúng lúc rồi" : "Một lời đang chờ"}
          subtitle={hiddenBeforeOpen
            ? "Bloom sẽ giữ kín chiếc hộp này cho tới đúng khoảnh khắc đã được hẹn."
            : (!mine && openedBefore)
              ? "Lời nhắn này đã được bạn mở. Bạn có thể đọc lại hoặc xem lại hiệu ứng bất cứ lúc nào."
              : available
                ? "Khoảnh khắc đã đến. Lời nhắn bên trong không còn bị khóa nữa."
                : `Chiếc hộp sẽ mở vào ${capsule ? openText(capsule) : "đúng thời điểm"}.`}
          variant="living"
          compact
          roundedBottom
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          {loading ? (
            <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang kiểm tra niêm phong…</Text></View>
          ) : !capsule ? (
            <BloomCard><Text style={styles.errorText}>{error || "Không tìm thấy Hộp thời gian."}</Text></BloomCard>
          ) : hiddenBeforeOpen ? (
            <BloomCard style={styles.lockCard}>
              <View style={styles.lockIcon}><Ionicons name="moon-outline" size={28} color={COLORS.primary} /></View>
              <Text style={styles.lockTitle}>Hộp vẫn đang ngủ</Text>
              <Text style={styles.lockText}>Chế độ Ẩn hoàn toàn không hé lộ người gửi, theme, tiêu đề, nội dung hay thời điểm mở trước khi đến giờ.</Text>
              <View style={styles.hiddenSealRow}><Ionicons name="eye-off-outline" size={16} color={COLORS.primary} /><Text style={styles.hiddenSealText}>Được Bloom giữ kín</Text></View>
            </BloomCard>
          ) : (
            <>
              <View style={[styles.themeBanner, { backgroundColor: theme.bg }]}>
                <View style={[styles.themeIcon, { backgroundColor: `${theme.accent}22` }]}><Ionicons name={theme.icon} size={24} color={theme.accent} /></View>
                <View style={styles.themeCopy}>
                  <Text style={styles.themeKicker}>PHONG CÁCH {theme.label.toLocaleUpperCase("vi")}</Text>
                  <Text style={styles.themeTitle}>{mine ? "Hộp thời gian của bạn" : available ? `Một lời từ ${capsule.createdByName}` : capsule.previewMode === "hidden" ? "Một điều vẫn đang được giữ kín" : `Một chiếc hộp từ ${capsule.createdByName}`}</Text>
                </View>
              </View>

              {!available && !mine ? (
                <BloomCard style={styles.lockCard}>
                  <View style={styles.lockIcon}><Ionicons name="lock-closed" size={28} color={COLORS.primary} /></View>
                  <Text style={styles.lockTitle}>{capsule.previewMode === "hidden" ? "Hộp vẫn đang ngủ" : "Chưa đến lúc mở"}</Text>
                  <Text style={styles.lockText}>{capsule.previewMode === "hidden" ? "Bloom sẽ không hé lộ thêm điều gì trước thời điểm đã hẹn." : "Bạn có thể biết chiếc hộp đang ở đây, nhưng tiêu đề và lời nhắn vẫn được khóa bằng Firestore Rules."}</Text>
                  <View style={styles.whenRow}><Ionicons name="time-outline" size={17} color={COLORS.primary} /><Text style={styles.whenText}>{openText(capsule)}</Text></View>
                </BloomCard>
              ) : content ? (
                <BloomCard style={styles.letterCard}>
                  <Text style={[styles.letterKicker, { color: theme.accent }]}>{mine && !available ? "BẢN XEM TRƯỚC CỦA NGƯỜI GỬI" : "LỜI ĐÃ ĐƯỢC GIỮ LẠI"}</Text>
                  <Text style={styles.letterTitle}>{content.title}</Text>
                  <View style={[styles.rule, { backgroundColor: theme.accent }]} />
                  <Text style={styles.letterBody}>{content.message}</Text>
                  <View style={styles.senderRow}><Text style={styles.senderLabel}>Được gửi bởi</Text><Text style={styles.sender}>{capsule.createdByName}</Text></View>
                </BloomCard>
              ) : (
                <BloomCard><Text style={styles.errorText}>{error || "Nội dung chưa thể mở. Thử tải lại sau vài giây nếu vừa đúng giờ mở."}</Text></BloomCard>
              )}

              <BloomCard tone="soft" style={styles.metaCard}>
                <View style={styles.metaRow}><Ionicons name="people-outline" size={18} color={COLORS.primary} /><Text style={styles.metaText}>{recipientLabel}</Text></View>
                <View style={styles.metaRow}><Ionicons name={capsule.previewMode === "hidden" ? "eye-off-outline" : "lock-closed-outline"} size={18} color={COLORS.primary} /><Text style={styles.metaText}>{capsule.previewMode === "hidden" ? "Ẩn hoàn toàn trước giờ mở" : "Báo trước nhưng khóa nội dung"}</Text></View>
                <View style={styles.metaRow}><Ionicons name="calendar-outline" size={18} color={COLORS.primary} /><Text style={styles.metaText}>Mở lúc {openText(capsule)}</Text></View>
                {mine && available && <View style={styles.metaRow}><Ionicons name="gift-outline" size={18} color={COLORS.primary} /><Text style={styles.metaText}>{openedCount}/{capsule.recipientUids.length} người thân đã mở hộp</Text></View>}
                {!mine && openedBefore && <View style={styles.metaRow}><Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} /><Text style={styles.metaText}>Trạng thái: Đã mở</Text></View>}
              </BloomCard>

              {!!error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}

              {available && content && (
                <Pressable onPress={() => setReplay(true)} style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.accent }, pressed && styles.pressed]}>
                  <Ionicons name="sparkles-outline" size={20} color="#fff" />
                  <Text style={styles.primaryText}>Xem lại hiệu ứng {theme.label}</Text>
                </Pressable>
              )}

              {canEdit && (
                <View style={styles.editRow}>
                  <Pressable onPress={() => router.push({ pathname: "/home-time-capsule-compose", params: { editId: capsule.id } } as never)} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                    <Ionicons name="create-outline" size={19} color={COLORS.primary} /><Text style={styles.secondaryText}>Chỉnh sửa</Text>
                  </Pressable>
                  <Pressable disabled={deleting} onPress={() => setConfirmDelete(true)} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
                    <Ionicons name="trash-outline" size={19} color="#A7475B" /><Text style={styles.deleteText}>Xóa hộp</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      <BloomConfirmModal
        visible={confirmDelete}
        title="Xóa Hộp thời gian?"
        message="Hộp chưa đến giờ mở nên người gửi vẫn có thể xóa. Hành động này sẽ xóa cả nội dung đã niêm phong."
        confirmLabel={deleting ? "Đang xóa…" : "Xóa hộp"}
        cancelLabel="Giữ lại"
        icon="trash-outline"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 13 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 11.5 },
  themeBanner: { borderRadius: 23, padding: 14, flexDirection: "row", alignItems: "center", gap: 11 },
  themeIcon: { width: 50, height: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  themeCopy: { flex: 1 },
  themeKicker: { color: COLORS.secondaryText, fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  themeTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  lockCard: { alignItems: "center", paddingVertical: 24 },
  lockIcon: { width: 62, height: 62, borderRadius: 23, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  lockTitle: { marginTop: 12, color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  lockText: { marginTop: 6, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center", maxWidth: 310 },
  whenRow: { marginTop: 14, borderRadius: 14, backgroundColor: COLORS.surfaceFocus, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, paddingVertical: 9 },
  whenText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  hiddenSealRow: { marginTop: 14, borderRadius: 14, backgroundColor: COLORS.surfaceFocus, flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 11, paddingVertical: 9 },
  hiddenSealText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  letterCard: { paddingHorizontal: 21, paddingVertical: 24, alignItems: "center" },
  letterKicker: { fontSize: 9.5, fontWeight: "900", letterSpacing: 1.2, textAlign: "center" },
  letterTitle: { marginTop: 7, color: COLORS.primaryText, fontSize: 21, lineHeight: 27, fontWeight: "900", textAlign: "center" },
  rule: { width: 46, height: 2, borderRadius: 99, marginVertical: 15 },
  letterBody: { color: COLORS.secondaryText, fontSize: 13, lineHeight: 20.5, textAlign: "center" },
  senderRow: { marginTop: 18, alignItems: "center" },
  senderLabel: { color: COLORS.secondaryText, fontSize: 9.5 },
  sender: { marginTop: 2, color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  metaCard: { gap: 9 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  metaText: { flex: 1, color: COLORS.secondaryText, fontSize: 11, lineHeight: 15.5 },
  errorBox: { borderRadius: 14, backgroundColor: "#FFF0F3", padding: 11 },
  errorText: { color: "#A7475B", fontSize: 11.5, lineHeight: 16 },
  primaryButton: { minHeight: 55, borderRadius: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  primaryText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  editRow: { flexDirection: "row", gap: 8 },
  secondaryButton: { flex: 1, minHeight: 50, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  secondaryText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  deleteButton: { flex: 1, minHeight: 50, borderRadius: 17, borderWidth: 1, borderColor: "#F0CED6", backgroundColor: "#FFF7F9", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  deleteText: { color: "#A7475B", fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.72 },
});
