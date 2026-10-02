import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton, BloomSwitch } from "../components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { useBloomToast } from "../components/ui/BloomToast";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { profileService } from "../services/profile/profileService";
import { smartReminderService } from "../services/activity/smartReminderService";
import { localNotificationService } from "../services/push/localNotificationService";
import { pushTokenService } from "../services/push/pushTokenService";
import { DEFAULT_SMART_REMINDER_PREFERENCES, type SmartReminderPreferences } from "../types";

const OPTIONS: Array<{
  key: keyof SmartReminderPreferences;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}> = [
  { key: "birthdays", icon: "gift-outline", title: "Sinh nhật", description: "Nhắc trước một ngày và trong ngày để cả nhà không bỏ lỡ." },
  { key: "memorials", icon: "leaf-outline", title: "Ngày giỗ", description: "Một lời nhắc nhẹ trước một ngày và trong ngày." },
  { key: "events", icon: "calendar-outline", title: "Sự kiện gia đình", description: "Dựa vào mức Bình thường, Khá quan trọng hoặc Quan trọng của sự kiện." },
  { key: "onThisDay", icon: "time-outline", title: "Ngày này năm xưa", description: "Hiện lại một kỷ niệm cũ trong Chuyện trong nhà, không tạo badge làm phiền." },
];

export default function NotificationPreferencesScreen() {
  const router = useRouter();
  const { user, userProfile, families, refreshProfile } = useAuth();
  const { showToast } = useBloomToast();
  const initial = useMemo(
    () => userProfile?.smartReminderPreferences ?? DEFAULT_SMART_REMINDER_PREFERENCES,
    [userProfile?.smartReminderPreferences],
  );
  const [preferences, setPreferences] = useState<SmartReminderPreferences>(initial);
  const [savingKey, setSavingKey] = useState<keyof SmartReminderPreferences | null>(null);
  const [pushEnabled, setPushEnabled] = useState(userProfile?.pushNotificationsEnabled ?? true);
  const [savingPush, setSavingPush] = useState(false);

  useEffect(() => setPreferences(initial), [initial]);
  useEffect(() => setPushEnabled(userProfile?.pushNotificationsEnabled ?? true), [userProfile?.pushNotificationsEnabled]);

  const updatePushEnabled = async (value: boolean) => {
    if (!user || savingPush) return;
    const previous = pushEnabled;
    setPushEnabled(value);
    setSavingPush(true);
    try {
      await profileService.updatePushNotificationsEnabled(user.uid, value);
      const result = await localNotificationService.setEnabled(value);
      if (value && result.permissionGranted) {
        await pushTokenService.syncCurrentDevice(user.uid, true, true).catch(() => undefined);
        await localNotificationService.syncSmartReminders({
          uid: user.uid,
          families,
          preferences,
          enabled: true,
          force: true,
        });
      } else if (!value) {
        await Promise.allSettled([
          localNotificationService.clearForUser(user.uid),
          pushTokenService.disableCurrentDevice(user.uid),
        ]);
      }
      await refreshProfile();
      if (value && !result.permissionGranted) {
        showToast({ title: "Android chưa cho phép thông báo", message: "Bạn có thể bật quyền Thông báo trong Cài đặt hệ thống của Family Bloom.", type: "warning", duration: 3600 });
      } else {
        showToast({ title: value ? "Đã bật lời nhắc trên thiết bị 🌸" : "Đã tắt lời nhắc trên thiết bị", message: value ? "Bloom sẽ nhắc những sinh nhật, ngày giỗ và sự kiện đã đồng bộ trên máy này." : "Chuyện trong nhà vẫn hoạt động bình thường trong app.", type: "info", duration: 2400 });
      }
    } catch {
      setPushEnabled(previous);
      showToast({ title: "Chưa cập nhật được", message: "Thử lại sau một chút nhé.", type: "warning", duration: 2600 });
    } finally {
      setSavingPush(false);
    }
  };


  const sendLocalTest = async () => {
    if (!user) return;
    try {
      const result = await localNotificationService.scheduleTest(userProfile?.activeFamilyId ?? null);
      if (!result.permissionGranted) {
        showToast({ title: "Android chưa cho phép thông báo", message: "Hãy bật quyền Thông báo cho Family Bloom rồi thử lại.", type: "warning", duration: 3000 });
        return;
      }
      showToast({ title: "Đã hẹn lời nhắc thử", message: "Đưa app xuống nền. Khoảng 8 giây nữa Bloom sẽ nhắc bạn.", type: "info", duration: 3200 });
    } catch {
      showToast({ title: "Chưa tạo được lời nhắc thử", message: "Thử build lại Android rồi kiểm tra quyền Thông báo.", type: "warning", duration: 3000 });
    }
  };

  const updatePreference = async (key: keyof SmartReminderPreferences, value: boolean) => {
    if (!user || savingKey) return;
    const previous = preferences;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    setSavingKey(key);
    try {
      await profileService.updateSmartReminderPreferences(user.uid, next);
      smartReminderService.invalidate();
      if (pushEnabled) {
        await localNotificationService.syncSmartReminders({
          uid: user.uid,
          families,
          preferences: next,
          enabled: true,
          force: true,
        });
      }
      await refreshProfile();
      showToast({ title: "Đã cập nhật 🌸", message: "Bloom sẽ nhắc bạn theo lựa chọn mới.", type: "info", duration: 1800 });
    } catch {
      setPreferences(previous);
      showToast({ title: "Chưa lưu được", message: "Thử lại sau một chút nhé.", type: "warning", duration: 2600 });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="LỜI NHẮC CỦA BLOOM"
        title="Nhắc vừa đủ để luôn nhớ nhau"
        subtitle="Bạn chọn điều đáng được nhắc. Bloom giữ mọi thứ nhẹ nhàng, rõ ràng và đúng lúc."
        variant="settings"
        onBack={() => router.back()}
      />
      <View style={styles.pageBody}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}><Ionicons name="sparkles-outline" size={22} color={COLORS.primary} /></View>
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>Nhẹ nhàng, không làm phiền</Text>
            <Text style={styles.introText}>Bloom chỉ nhắc những điều bạn chọn và gom chúng vào Chuyện trong nhà để bạn dễ theo dõi.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}><Ionicons name="notifications-outline" size={20} color={COLORS.primary} /></View>
            <View style={styles.copy}>
              <Text style={styles.title}>Lời nhắc trên thiết bị Android</Text>
              <Text style={styles.description}>Bloom dùng quyền này cho lời nhắc đã hẹn và những thông báo riêng như Lời thì thầm hoặc Hộp thời gian. Khi app đang mở, Bloom ưu tiên một thông báo nhẹ trong app.</Text>
            </View>
            <View pointerEvents={savingPush ? "none" : "auto"} style={savingPush ? styles.saving : undefined}>
              <BloomSwitch value={pushEnabled} onValueChange={(value) => void updatePushEnabled(value)} />
            </View>
          </View>
          <View style={styles.rowBorder} />
          {OPTIONS.map((option, index) => (
            <View key={option.key} style={[styles.row, index > 0 && styles.rowBorder]}>
              <View style={styles.iconWrap}><Ionicons name={option.icon} size={20} color={COLORS.primary} /></View>
              <View style={styles.copy}>
                <Text style={styles.title}>{option.title}</Text>
                <Text style={styles.description}>{option.description}</Text>
              </View>
              <View pointerEvents={savingKey ? "none" : "auto"} style={savingKey === option.key ? styles.saving : undefined}>
                <BloomSwitch
                value={preferences[option.key]}
                onValueChange={(value) => void updatePreference(option.key, value)}
              />
              </View>
            </View>
          ))}
        </View>

        <BloomButton
          title="Gửi lời nhắc thử sau 8 giây"
          variant="outline"
          icon="notifications-outline"
          onPress={() => void sendLocalTest()}
          customStyle={styles.testButton}
        />

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.secondaryText} />
          <Text style={styles.noteText}>Lời thì thầm “Người thân” chỉ báo đúng người được chọn. Lời gửi “Cả nhà” không phát thông báo hàng loạt. Một số thông báo vẫn cần kết nối mạng để đến ngay khi app đã đóng hẳn.</Text>
        </View>
      </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  pageBody: { flex: 1, marginTop: -24, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: "hidden", backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 34 },
  intro: { borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 15, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  introIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  introCopy: { flex: 1, minWidth: 0 },
  introTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  introText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.8, lineHeight: 16, fontWeight: "600" },
  card: { marginTop: 16, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 14 },
  row: { minHeight: 82, flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: COLORS.border },
  iconWrap: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, minWidth: 0 },
  title: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  description: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.3, lineHeight: 15, fontWeight: "600" },
  saving: { opacity: 0.55 },
  testButton: { marginTop: 2 },
  note: { marginTop: 15, borderRadius: 18, backgroundColor: COLORS.softSurface, padding: 13, flexDirection: "row", gap: 9, alignItems: "flex-start" },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.3, lineHeight: 15, fontWeight: "600" },
});
