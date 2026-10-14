import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { FamilyMemberPicker } from "../../../components/family/FamilyMemberPicker";
import { BloomConfirmModal } from "../../../components/ui/BloomConfirmModal";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomDatePicker, BloomTextInput } from "../../../components/ui/BloomInputComponents";
import { BloomTimePicker } from "../../../components/ui/BloomTimePicker";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyMembers } from "../../../hooks/family/useFamilyMembers";
import { HOME_TIME_CAPSULE_LIMITS, homeTimeCapsuleService, timeCapsuleOpenMillis } from "../../../services/home/homeTimeCapsuleService";
import { activityService } from "../../../services/activity/activityService";
import type { HomeTimeCapsuleAudience, HomeTimeCapsulePreviewMode, HomeTimeCapsuleRevealTheme } from "../../../types/homeLiving";

const THEME_OPTIONS: Array<{ key: HomeTimeCapsuleRevealTheme; label: string; hint: string; icon: keyof typeof Ionicons.glyphMap; bg: string; accent: string }> = [
  { key: "warm", label: "Ấm áp", hint: "Hồng kem · cánh hoa · chuyển động mềm", icon: "heart-outline", bg: "#FFF1F4", accent: "#DB6F8D" },
  { key: "formal", label: "Trang trọng", hint: "Xanh dương · ánh bạc · nhịp chắc", icon: "shield-checkmark-outline", bg: "#ECF5FF", accent: "#3978C5" },
  { key: "festive", label: "Rộn ràng", hint: "Vàng bơ pha hồng · confetti · pop vui", icon: "sparkles-outline", bg: "#FFF6D4", accent: "#E67F91" },
];

const addDays = (days: number) => {
  const next = new Date();
  next.setDate(next.getDate() + days);
  next.setHours(20, 0, 0, 0);
  return next;
};

const combineDateAndTime = (date: Date, time: Date) => {
  const next = new Date(date);
  next.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return next;
};

function ComposerFields({
  title,
  setTitle,
  message,
  setMessage,
}: {
  title: string;
  setTitle: (value: string) => void;
  message: string;
  setMessage: (value: string) => void;
}) {
  return (
    <>
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}><Text style={styles.label}>Tiêu đề</Text><Text style={styles.counter}>{title.length}/{HOME_TIME_CAPSULE_LIMITS.title}</Text></View>
        <BloomTextInput
          value={title}
          onChangeText={setTitle}
          maxLength={HOME_TIME_CAPSULE_LIMITS.title}
          placeholder="Ví dụ: Vào ngày sinh nhật của em…"
          leftIcon="gift-outline"
          containerStyle={styles.bloomField}
        />
      </View>
      <View style={styles.fieldBlock}>
        <View style={styles.labelRow}><Text style={styles.label}>Lời nhắn</Text><Text style={styles.counter}>{message.length}/{HOME_TIME_CAPSULE_LIMITS.message}</Text></View>
        <BloomTextInput
          value={message}
          onChangeText={setMessage}
          maxLength={HOME_TIME_CAPSULE_LIMITS.message}
          multiline
          textAlignVertical="top"
          placeholder="Viết điều bạn muốn người thân đọc vào đúng ngày đó…"
          leftIcon="heart-outline"
          containerStyle={styles.bloomField}
          helperText="Bloom sẽ cất riêng lời nhắn này và chỉ trao cho người nhận khi đến đúng giờ mở."
        />
      </View>
    </>
  );
}

export default function HomeTimeCapsuleComposeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const editId = typeof params.editId === "string" ? params.editId : "";
  const { user, userProfile, activeFamilyId } = useAuth();
  const uid = user?.uid ?? "";
  const authorName = userProfile?.shortName || userProfile?.displayName || "Người thân";
  const { members, loading: membersLoading } = useFamilyMembers(activeFamilyId);
  const otherMembers = useMemo(() => members.filter(member => member.uid !== uid), [members, uid]);

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<HomeTimeCapsuleAudience>("selected");
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<HomeTimeCapsulePreviewMode>("locked");
  const [theme, setTheme] = useState<HomeTimeCapsuleRevealTheme>("warm");
  const [openDate, setOpenDate] = useState(addDays(7));
  const [openTime, setOpenTime] = useState(addDays(7));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(!!editId);
  const [error, setError] = useState<string | null>(null);
  const [confirmFamily, setConfirmFamily] = useState(false);

  useEffect(() => {
    if (!editId || !activeFamilyId || !uid) return;
    let alive = true;
    setLoadingEdit(true);
    Promise.all([
      homeTimeCapsuleService.get(activeFamilyId, editId),
      homeTimeCapsuleService.getContent(activeFamilyId, editId),
    ]).then(([capsule, content]) => {
      if (!alive) return;
      if (!capsule || capsule.createdByUid !== uid) throw new Error("Bạn không thể chỉnh sửa Hộp thời gian này.");
      const millis = timeCapsuleOpenMillis(capsule);
      const date = millis ? new Date(millis) : addDays(7);
      setTitle(content?.title || "");
      setMessage(content?.message || "");
      setAudience(capsule.audience);
      setSelectedUids(capsule.recipientUids);
      setPreviewMode(capsule.previewMode);
      setTheme(capsule.revealTheme);
      setOpenDate(date);
      setOpenTime(date);
      setError(null);
    }).catch(e => {
      if (alive) setError(e instanceof Error ? e.message : "Không tải được Hộp thời gian để sửa.");
    }).finally(() => { if (alive) setLoadingEdit(false); });
    return () => { alive = false; };
  }, [activeFamilyId, editId, uid]);

  const finalRecipients = audience === "family" ? otherMembers.map(member => member.uid) : selectedUids.filter(value => value !== uid);
  const finalOpenAt = combineDateAndTime(openDate, openTime);

  const validate = () => {
    if (!title.trim()) return "Hãy viết tiêu đề cho Hộp thời gian.";
    if (!message.trim()) return "Hãy viết lời nhắn trước khi gửi.";
    if (!finalRecipients.length) return audience === "family" ? "Nhà hiện chưa có người nhận khác." : "Hãy chọn ít nhất một người nhận.";
    if (finalOpenAt.getTime() <= Date.now() + 15_000) return "Thời gian mở phải ở tương lai.";
    return null;
  };

  const save = useCallback(async () => {
    if (!activeFamilyId || !uid || saving) return;
    const validation = validate();
    if (validation) { setError(validation); return; }
    setSaving(true);
    setError(null);
    try {
      let capsuleId = editId;
      if (editId) {
        await homeTimeCapsuleService.update({
          familyId: activeFamilyId,
          capsuleId: editId,
          actorUid: uid,
          createdByName: authorName,
          audience,
          recipientUids: finalRecipients,
          previewMode,
          openAt: finalOpenAt,
          revealTheme: theme,
          title,
          message,
        });
      } else {
        capsuleId = await homeTimeCapsuleService.create({
          familyId: activeFamilyId,
          createdByUid: uid,
          createdByName: authorName,
          audience,
          recipientUids: finalRecipients,
          previewMode,
          openAt: finalOpenAt,
          revealTheme: theme,
          title,
          message,
        });
        // "Báo trước" means recipients should know a sealed box exists without
        // exposing its title/message. Persist this in Chuyện trong nhà as well;
        // the existing target-activity push transport can deliver it remotely
        // when Cloud Functions are deployed. Hidden boxes intentionally do not.
        if (previewMode === "locked") {
          await activityService.createTimeCapsuleWaitingNotices({
            familyId: activeFamilyId,
            capsuleId,
            actorUid: uid,
            actorName: authorName,
            recipientUids: finalRecipients,
          }).catch(() => undefined);
        }
      }
      router.replace(`/home-time-capsule/${capsuleId}` as never);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được Hộp thời gian.");
    } finally {
      setSaving(false);
    }
  }, [activeFamilyId, audience, authorName, editId, finalOpenAt, finalRecipients, message, previewMode, router, saving, theme, title, uid]);

  const requestSave = () => {
    const validation = validate();
    if (validation) { setError(validation); return; }
    if (audience === "family" && !editId) setConfirmFamily(true);
    else void save();
  };

  if (loadingEdit) {
    return <View style={styles.loader}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Đang mở bản nháp Hộp thời gian…</Text></View>;
  }

  return (
    <View style={styles.root}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomKeyboardScreen contentContainerStyle={styles.scrollContent}>
        <BloomHeroHeader
          eyebrow={editId ? "CHỈNH SỬA HỘP THỜI GIAN" : "TẠO HỘP THỜI GIAN"}
          title={editId ? "Giữ đúng điều bạn muốn gửi" : "Một lời cho tương lai"}
          subtitle="Chọn người nhận thật trong Nhà Mình, ngày mở và cách khoảnh khắc ấy xuất hiện."
          variant="living"
          compact
          roundedBottom
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <ComposerFields title={title} setTitle={setTitle} message={message} setMessage={setMessage} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ai sẽ nhận?</Text>
            <Text style={styles.sectionHint}>Danh sách lấy trực tiếp từ membership của gia đình, không dùng Person trong phả hệ.</Text>
            <View style={styles.segmentRow}>
              <Pressable onPress={() => setAudience("selected")} style={[styles.segment, audience === "selected" && styles.segmentActive]}>
                <Ionicons name="people-outline" size={17} color={COLORS.primaryText} /><Text style={styles.segmentText}>Người được chọn</Text>
              </Pressable>
              <Pressable onPress={() => setAudience("family")} style={[styles.segment, audience === "family" && styles.segmentActive]}>
                <Ionicons name="home-outline" size={17} color={COLORS.primaryText} /><Text style={styles.segmentText}>Cả nhà</Text>
              </Pressable>
            </View>
            {audience === "selected" ? (
              <FamilyMemberPicker
                label="Người nhận"
                hint="Có thể chọn nhiều người. Mỗi người có trạng thái đã mở riêng."
                members={members}
                selectedUids={selectedUids}
                onChange={setSelectedUids}
                currentUid={uid}
                excludeUids={[uid]}
                mode="multiple"
                variant="living"
              />
            ) : (
              <View style={styles.familyAudience}>
                <Ionicons name="home" size={20} color={COLORS.primary} />
                <View style={styles.familyAudienceCopy}>
                  <Text style={styles.familyAudienceTitle}>{membersLoading ? "Đang tải thành viên…" : `${otherMembers.length} người thân sẽ nhận`}</Text>
                  <Text style={styles.familyAudienceText}>Bloom chụp snapshot membership lúc gửi; người tạo không tự nằm trong danh sách người nhận.</Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trước ngày mở</Text>
            <Text style={styles.sectionHint}>Cả hai chế độ đều khóa nội dung. Khác nhau ở việc người nhận có biết đang có một chiếc hộp chờ mình hay không.</Text>
            <View style={styles.optionStack}>
              <Pressable onPress={() => setPreviewMode("hidden")} style={[styles.optionCard, previewMode === "hidden" && styles.optionSelected]}>
                <View style={styles.optionIcon}><Ionicons name="eye-off-outline" size={20} color={COLORS.primary} /></View>
                <View style={styles.optionCopy}><Text style={styles.optionTitle}>Ẩn hoàn toàn</Text><Text style={styles.optionText}>Không hiện card cho người nhận trước giờ mở. Đến đúng lúc, thông báo mới đánh thức chiếc hộp.</Text></View>
                {previewMode === "hidden" && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
              </Pressable>
              <Pressable onPress={() => setPreviewMode("locked")} style={[styles.optionCard, previewMode === "locked" && styles.optionSelected]}>
                <View style={styles.optionIcon}><Ionicons name="lock-closed-outline" size={20} color={COLORS.primary} /></View>
                <View style={styles.optionCopy}><Text style={styles.optionTitle}>Báo trước</Text><Text style={styles.optionText}>Người nhận thấy một chiếc hộp đang khóa và thời điểm mở, nhưng không thấy tiêu đề hay lời nhắn.</Text></View>
                {previewMode === "locked" && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mở vào lúc nào?</Text>
            <View style={styles.quickRow}>
              {[{ label: "Ngày mai", days: 1 }, { label: "1 tuần", days: 7 }, { label: "1 tháng", days: 30 }].map(item => (
                <Pressable key={item.label} onPress={() => { const next = addDays(item.days); setOpenDate(next); setOpenTime(next); }} style={styles.quickChip}><Text style={styles.quickText}>{item.label}</Text></Pressable>
              ))}
            </View>
            <View style={styles.dateRow}>
              <BloomDatePicker
                selectedDate={openDate}
                minimumDate={new Date()}
                onDateChange={(date) => {
                  setOpenDate(date);
                  if (combineDateAndTime(date, openTime).getTime() <= Date.now() + 15_000) {
                    const next = new Date();
                    next.setMinutes(next.getMinutes() + 5, 0, 0);
                    setOpenTime(next);
                  }
                }}
                containerStyle={styles.datePickerContainer}
                trigger={(open) => (
                  <Pressable onPress={open} style={styles.dateButton}>
                    <Ionicons name="calendar-outline" size={19} color={COLORS.primary} />
                    <View style={styles.dateCopy}><Text style={styles.dateLabel}>Ngày</Text><Text style={styles.dateValue}>{openDate.toLocaleDateString("vi-VN")}</Text></View>
                    <Ionicons name="chevron-down" size={17} color={COLORS.secondaryText} />
                  </Pressable>
                )}
              />
              <Pressable onPress={() => setShowTimePicker(true)} style={styles.dateButton}>
                <Ionicons name="time-outline" size={19} color={COLORS.primary} />
                <View style={styles.dateCopy}><Text style={styles.dateLabel}>Giờ</Text><Text style={styles.dateValue}>{String(openTime.getHours()).padStart(2, "0")}:{String(openTime.getMinutes()).padStart(2, "0")}</Text></View>
                <Ionicons name="chevron-down" size={17} color={COLORS.secondaryText} />
              </Pressable>
            </View>
            <BloomTimePicker visible={showTimePicker} value={openTime} selectedDate={openDate} onClose={() => setShowTimePicker(false)} onConfirm={setOpenTime} />
            <View style={styles.openAtCallout}><Ionicons name="hourglass-outline" size={17} color={COLORS.primary} /><Text style={styles.openAtText}>Hộp sẽ mở lúc {finalOpenAt.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Text></View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Phong cách mở hộp</Text>
            <Text style={styles.sectionHint}>Ba theme dùng chung dữ liệu và quyền, nhưng khác rõ hộp, ánh sáng, particle và nhịp chuyển động.</Text>
            <View style={styles.themeStack}>
              {THEME_OPTIONS.map(option => {
                const active = theme === option.key;
                return (
                  <Pressable key={option.key} onPress={() => setTheme(option.key)} style={[styles.themeCard, { backgroundColor: option.bg }, active && { borderColor: option.accent, borderWidth: 2 }]}>
                    <View style={[styles.themeIcon, { backgroundColor: `${option.accent}22` }]}><Ionicons name={option.icon} size={22} color={option.accent} /></View>
                    <View style={styles.themeCopy}><Text style={styles.themeTitle}>{option.label}</Text><Text style={styles.themeHint}>{option.hint}</Text></View>
                    {active && <Ionicons name="checkmark-circle" size={23} color={option.accent} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!!error && <View style={styles.error}><Ionicons name="alert-circle-outline" size={18} color="#A7475B" /><Text style={styles.errorText}>{error}</Text></View>}

          <Pressable disabled={saving} onPress={requestSave} style={[styles.saveButton, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color={COLORS.white} /> : <><Ionicons name={editId ? "save-outline" : "paper-plane-outline"} size={20} color={COLORS.white} /><Text style={styles.saveText}>{editId ? "Lưu thay đổi" : "Gửi Hộp thời gian"}</Text></>}
          </Pressable>
        </View>
      </BloomKeyboardScreen>

      <BloomConfirmModal
        visible={confirmFamily}
        title="Gửi cho cả nhà?"
        message={`Hộp này sẽ dành cho ${finalRecipients.length} người thân. Nội dung vẫn được khóa đến đúng thời điểm bạn chọn.`}
        confirmLabel="Gửi cho cả nhà"
        cancelLabel="Xem lại"
        icon="home-outline"
        onCancel={() => setConfirmFamily(false)}
        onConfirm={() => { setConfirmFamily(false); void save(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background, gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 12 },
  scrollContent: { paddingBottom: 34 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 16 },
  bloomField: { marginBottom: 0 },
  fieldBlock: { borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 15 },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  label: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  counter: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "700" },
  titleInput: { marginTop: 9, minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.inputBorder, backgroundColor: "#FFFDFE", paddingHorizontal: 13, color: COLORS.primaryText, fontSize: 14 },
  messageInput: { marginTop: 9, minHeight: 150, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.inputBorder, backgroundColor: "#FFFDFE", padding: 13, color: COLORS.primaryText, fontSize: 13.5, lineHeight: 20 },
  helper: { marginTop: 8, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  section: { borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 15, gap: 11 },
  sectionTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  sectionHint: { marginTop: -5, color: COLORS.secondaryText, fontSize: 10.7, lineHeight: 15.5 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "transparent" },
  segmentActive: { backgroundColor: COLORS.surfaceFocus, borderColor: COLORS.primary },
  segmentText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  familyAudience: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 17, backgroundColor: COLORS.surfaceFocus, padding: 12 },
  familyAudienceCopy: { flex: 1 },
  familyAudienceTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  familyAudienceText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  optionStack: { gap: 8 },
  optionCard: { minHeight: 75, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#FFFDFE", flexDirection: "row", alignItems: "center", gap: 10, padding: 11 },
  optionSelected: { backgroundColor: COLORS.surfaceFocus, borderColor: COLORS.primary },
  optionIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  optionCopy: { flex: 1 },
  optionTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  optionText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.3, lineHeight: 14.5 },
  quickRow: { flexDirection: "row", gap: 7 },
  quickChip: { flex: 1, minHeight: 38, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  quickText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "900" },
  dateRow: { flexDirection: "row", gap: 8 },
  datePickerContainer: { flex: 1, marginBottom: 0 },
  dateButton: { flex: 1, height: 64, minHeight: 64, maxHeight: 64, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#FFFDFE", flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 11 },
  dateCopy: { flex: 1 },
  dateLabel: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "700" },
  dateValue: { marginTop: 2, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  openAtCallout: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 14, backgroundColor: COLORS.softSurface, paddingHorizontal: 10, paddingVertical: 9 },
  openAtText: { flex: 1, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "700" },
  themeStack: { gap: 8 },
  themeCard: { minHeight: 68, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 10, padding: 11 },
  themeIcon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  themeCopy: { flex: 1 },
  themeTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  themeHint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.3, lineHeight: 14.5 },
  error: { flexDirection: "row", gap: 8, alignItems: "flex-start", borderRadius: 16, backgroundColor: "#FFF0F3", padding: 12 },
  errorText: { flex: 1, color: "#A7475B", fontSize: 11.5, lineHeight: 16 },
  saveButton: { minHeight: 56, borderRadius: 19, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  saveText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  disabled: { opacity: 0.5 },
});
