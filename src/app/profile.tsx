import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton } from "../components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomTextInput } from "../components/ui/BloomInputComponents";
import {
  BloomBackButton,
  BloomCard,
  BloomInfoRow,
  BloomPageHeader,
  BloomPill,
  BloomSectionHeader,
} from "../components/ui/BloomPageComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { parseAppError } from "../constants/errorConstants";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { profileService } from "../services/profile/profileService";
import type { BloodType, Gender } from "../types/user";

const roleLabel: Record<string, string> = {
  owner: "Chủ nhà",
  admin: "Quản trị viên",
  member: "Thành viên",
  child: "Thành viên nhỏ",
};

const GENDER_OPTIONS: Array<{ key: Gender; label: string }> = [
  { key: "male", label: "Nam" },
  { key: "female", label: "Nữ" },
  { key: "other", label: "Khác" },
];

const BLOOD_TYPES: BloodType[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "other"];
const INTEREST_OPTIONS = ["music", "reading", "cooking", "travel", "plant", "photo"];
const INTEREST_LABEL: Record<string, string> = {
  music: "🎵 Âm nhạc",
  reading: "📚 Đọc sách",
  cooking: "🍳 Nấu ăn",
  travel: "✈️ Du lịch",
  plant: "🌱 Trồng cây",
  photo: "📸 Nhiếp ảnh",
};

const formatBirthDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const parseDate = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

export default function Profile() {
  const router = useRouter();
  const { user, userProfile, families, refreshProfile, logout } = useAuth();
  const { showToast } = useBloomToast();
  const membership = families.find((item) => item.familyId === userProfile?.activeFamilyId);
  const initials = (userProfile?.displayName || "F").trim().slice(0, 1).toUpperCase();
  const activeFamilyId = userProfile?.activeFamilyId ?? membership?.familyId ?? null;

  const [editVisible, setEditVisible] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState<Gender>("other");
  const [bloodType, setBloodType] = useState<BloodType>("other");
  const [interests, setInterests] = useState<string[]>([]);

  const confirmLogout = () => setLogoutVisible(true);

  const performLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setLogoutVisible(false);
    } catch (error) {
      setLoggingOut(false);
      showToast({ ...parseAppError(error), duration: 3500 });
    }
  };

  const openEdit = () => {
    if (!userProfile) return;
    setName(userProfile.displayName || "");
    setShortName(userProfile.shortName || "");
    setPhone(userProfile.phoneNumber || "");
    setBirthDate(parseDate(userProfile.birthDate));
    setLocation(userProfile.currentLocation || "");
    setBio(userProfile.bio || "");
    setGender(userProfile.gender || "other");
    setBloodType(userProfile.bloodType || "other");
    setInterests(userProfile.interests || []);
    setEditVisible(true);
  };

  const toggleInterest = (interest: string) => {
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const saveProfile = async () => {
    if (!user || !name.trim()) {
      showToast({ message: "Tên của bạn chưa thể để trống nhé 🌸", duration: 2800 });
      return;
    }
    setSaving(true);
    try {
      await profileService.update(user.uid, {
        displayName: name.trim(),
        shortName: shortName.trim() || null,
        phoneNumber: phone.trim() || null,
        birthDate: birthDate ? birthDate.toISOString() : null,
        currentLocation: location.trim() || null,
        bio: bio.trim() || null,
        gender,
        bloodType,
        interests,
      });
      await refreshProfile();
      setEditVisible(false);
      showToast({ message: "Hồ sơ vừa nở thêm một chút rồi 🌷", duration: 2800 });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setSaving(false);
    }
  };

  const copyFamilyId = async () => {
    if (!activeFamilyId) return;
    await Clipboard.setStringAsync(activeFamilyId);
    showToast({
      type: "success",
      title: "Đã sao chép Family ID",
      message: "Gửi mã này cho người thân để họ xin vào đúng gia đình của bạn.",
      duration: 2800,
    });
  };

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomPageHeader
          eyebrow="Cá nhân"
          title="Hồ sơ của bạn"
          subtitle="Những thông tin giúp cả nhà nhận ra và hiểu bạn hơn."
          right={
            <View style={styles.headerActions}>
              <Pressable onPress={openEdit} hitSlop={8} style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
                <Ionicons name="pencil" size={19} color={COLORS.primary} />
              </Pressable>
              <BloomBackButton onPress={() => router.back()} />
            </View>
          }
        />

        <BloomCard tone="accent" style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.avatarWrap}>
              {userProfile?.avatarUrl ? (
                <Image source={{ uri: userProfile.avatarUrl }} style={styles.avatarImage} contentFit="cover" />
              ) : (
                <Text style={styles.avatarInitial}>{initials}</Text>
              )}
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.name}>{userProfile?.displayName || "Thành viên Family Bloom"}</Text>
              {!!userProfile?.shortName && <Text style={styles.shortName}>{userProfile.shortName}</Text>}
              <View style={styles.pillRow}>
                <BloomPill icon="home-outline" label={membership?.familyName || "Gia đình của mình"} />
                <BloomPill
                  icon="shield-checkmark-outline"
                  label={membership?.role ? roleLabel[membership.role] ?? "Thành viên" : "Thành viên"}
                />
              </View>
            </View>
          </View>
          {!!userProfile?.bio && <Text style={styles.bio}>{userProfile.bio}</Text>}
        </BloomCard>

        {!!activeFamilyId && (
          <View style={styles.section}>
            <BloomSectionHeader
              title="Mời người thân vào nhà"
              subtitle="Chia sẻ Family ID để người khác tìm đúng gia đình và gửi yêu cầu tham gia."
            />
            <BloomCard tone="soft" style={styles.familyInviteCard}>
              <View style={styles.familyInviteTop}>
                <View style={styles.familyInviteIcon}>
                  <Ionicons name="people-outline" size={21} color={COLORS.primary} />
                </View>
                <View style={styles.familyInviteCopy}>
                  <Text style={styles.familyInviteLabel}>{membership?.familyName || "Gia đình hiện tại"}</Text>
                  <Text style={styles.familyInviteHint}>Family ID</Text>
                </View>
              </View>
              <View style={styles.familyIdRow}>
                <Text selectable style={styles.familyIdText} numberOfLines={1}>{activeFamilyId}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sao chép Family ID"
                  onPress={() => void copyFamilyId()}
                  style={({ pressed }) => [styles.copyFamilyIdButton, pressed && styles.pressed]}
                >
                  <Ionicons name="copy-outline" size={17} color={COLORS.white} />
                  <Text style={styles.copyFamilyIdText}>Sao chép</Text>
                </Pressable>
              </View>
              <View style={styles.familyInviteNote}>
                <Ionicons name="information-circle-outline" size={15} color={COLORS.primary} />
                <Text style={styles.familyInviteNoteText}>Người nhận vẫn phải gửi yêu cầu và chờ quản trị viên duyệt trước khi vào nhà.</Text>
              </View>
            </BloomCard>
          </View>
        )}

        <View style={styles.section}>
          <BloomSectionHeader title="Thông tin cá nhân" subtitle="Chạm bút chì phía trên để cập nhật bất cứ lúc nào" />
          <BloomCard>
            <BloomInfoRow icon="call-outline" label="Số điện thoại" value={userProfile?.phoneNumber} />
            <View style={styles.divider} />
            <BloomInfoRow icon="calendar-outline" label="Ngày sinh" value={formatBirthDate(userProfile?.birthDate)} />
            <View style={styles.divider} />
            <BloomInfoRow icon="location-outline" label="Nơi ở hiện tại" value={userProfile?.currentLocation} />
            <View style={styles.divider} />
            <BloomInfoRow icon="water-outline" label="Nhóm máu" value={userProfile?.bloodType} />
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Điều bạn yêu thích" subtitle="Những sở thích đang có trong hồ sơ" />
          <BloomCard tone="soft">
            {userProfile?.interests?.length ? (
              <View style={styles.interestWrap}>
                {userProfile.interests.map((item) => (
                  <View key={item} style={styles.interestChip}>
                    <Ionicons name="sparkles-outline" size={13} color={COLORS.primary} />
                    <Text style={styles.interestText}>{INTEREST_LABEL[item] || item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.interestEmpty}>
                <Ionicons name="heart-outline" size={22} color={COLORS.primary} />
                <Text style={styles.interestEmptyText}>Chưa có sở thích nào được thêm vào hồ sơ.</Text>
              </View>
            )}
          </BloomCard>
        </View>

        <BloomButton
          title="Đăng xuất"
          variant="outline"
          icon={<Ionicons name="log-out-outline" size={18} />}
          onPress={confirmLogout}
          customStyle={styles.logoutButton}
        />
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => !saving && setEditVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetEyebrow}>CHỈNH SỬA HỒ SƠ</Text>
                <Text style={styles.sheetTitle}>Bạn muốn Bloom biết gì thêm?</Text>
              </View>
              <Pressable disabled={saving} onPress={() => setEditVisible(false)} style={styles.closeButton} hitSlop={8}>
                <Ionicons name="close" size={21} color={COLORS.primaryText} />
              </Pressable>
            </View>

            <BloomKeyboardScreen rootStyle={styles.editKeyboard} contentContainerStyle={styles.editContent}>
              <BloomTextInput label="Họ và tên" value={name} onChangeText={setName} leftIcon="person-outline" />
              <BloomTextInput label="Tên gọi thân mật" value={shortName} onChangeText={setShortName} leftIcon="happy-outline" />

              <View style={styles.formBlock}>
                <Text style={styles.formLabel}>Giới tính</Text>
                <View style={styles.optionRow}>
                  {GENDER_OPTIONS.map((item) => (
                    <Pressable
                      key={item.key}
                      onPress={() => setGender(item.key)}
                      style={[styles.optionChip, gender === item.key && styles.optionChipActive]}
                    >
                      <Text style={[styles.optionText, gender === item.key && styles.optionTextActive]}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <BloomDatePicker label="Ngày sinh" selectedDate={birthDate} onDateChange={setBirthDate} leftIcon="gift-outline" />
              <BloomTextInput label="Số điện thoại" value={phone} onChangeText={setPhone} leftIcon="call-outline" keyboardType="phone-pad" />

              <View style={styles.formBlock}>
                <Text style={styles.formLabel}>Nhóm máu</Text>
                <View style={styles.chipWrap}>
                  {BLOOD_TYPES.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => setBloodType(item)}
                      style={[styles.smallChip, bloodType === item && styles.smallChipActive]}
                    >
                      <Text style={[styles.smallChipText, bloodType === item && styles.smallChipTextActive]}>{item === "other" ? "Khác" : item}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <BloomTextInput label="Tỉnh / Thành phố đang sống" value={location} onChangeText={setLocation} leftIcon="location-outline" />

              <View style={styles.formBlock}>
                <Text style={styles.formLabel}>Sở thích</Text>
                <View style={styles.chipWrap}>
                  {INTEREST_OPTIONS.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => toggleInterest(item)}
                      style={[styles.interestEditChip, interests.includes(item) && styles.interestEditChipActive]}
                    >
                      <Text style={[styles.interestEditText, interests.includes(item) && styles.interestEditTextActive]}>{INTEREST_LABEL[item]}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              <BloomTextInput label="Đôi nét về bạn" value={bio} onChangeText={setBio} leftIcon="heart-outline" multiline />

              <View style={styles.editHint}>
                <Ionicons name="people-outline" size={16} color={COLORS.primary} />
                <Text style={styles.editHintText}>Khi lưu, thông tin hiển thị trong danh sách thành viên của các nhà bạn tham gia cũng được đồng bộ.</Text>
              </View>

              <BloomButton title="Lưu thay đổi" onPress={saveProfile} isLoading={saving} />
            </BloomKeyboardScreen>
          </View>
        </View>
      </Modal>

      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !loggingOut && setLogoutVisible(false)}
      >
        <View style={styles.logoutOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={loggingOut}
            onPress={() => setLogoutVisible(false)}
          />
          <View style={styles.logoutDialog}>
            <View style={styles.logoutBloomIcon}>
              <Ionicons name="flower-outline" size={30} color={COLORS.primary} />
            </View>
            <Text style={styles.logoutEyebrow}>TẠM RỜI KHU VƯỜN</Text>
            <Text style={styles.logoutTitle}>Bloom giữ nhà giúp bạn nhé? 🌷</Text>
            <Text style={styles.logoutMessage}>
              Những khoảnh khắc của cả nhà vẫn nằm yên ở đây. Khi nhớ, bạn chỉ cần đăng nhập lại là cánh cửa Bloom mở ra ngay.
            </Text>

            <View style={styles.logoutActions}>
              <Pressable
                disabled={loggingOut}
                onPress={() => setLogoutVisible(false)}
                style={({ pressed }) => [styles.stayButton, pressed && styles.pressed]}
              >
                <Ionicons name="home-outline" size={18} color={COLORS.primaryText} />
                <Text style={styles.stayButtonText}>Ở lại với nhà</Text>
              </Pressable>
              <Pressable
                disabled={loggingOut}
                onPress={() => void performLogout()}
                style={({ pressed }) => [styles.leaveButton, pressed && styles.pressed, loggingOut && styles.logoutDisabled]}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Ionicons name="log-out-outline" size={18} color={COLORS.white} />
                )}
                <Text style={styles.leaveButtonText}>{loggingOut ? "Đang khép cửa…" : "Tạm rời Bloom"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  heroCard: { marginBottom: 26 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatarWrap: { width: 76, height: 76, borderRadius: 27, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, borderWidth: 3, borderColor: "rgba(255,255,255,0.92)" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: COLORS.primaryText, fontSize: 28, fontWeight: "900" },
  heroCopy: { flex: 1, minWidth: 0 },
  name: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900" },
  shortName: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "700" },
  pillRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  bio: { marginTop: 15, color: COLORS.primaryText, opacity: 0.86, fontSize: 13, lineHeight: 19 },
  familyInviteCard: { gap: 12 },
  familyInviteTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  familyInviteIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  familyInviteCopy: { flex: 1 },
  familyInviteLabel: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  familyInviteHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  familyIdRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 17, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingLeft: 12, paddingRight: 6 },
  familyIdText: { flex: 1, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  copyFamilyIdButton: { minHeight: 40, borderRadius: 14, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 11 },
  copyFamilyIdText: { color: COLORS.white, fontSize: 11, fontWeight: "900" },
  familyInviteNote: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  familyInviteNoteText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  section: { marginBottom: 26 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },
  interestWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  interestChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  interestText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  interestEmpty: { flexDirection: "row", alignItems: "center", gap: 10 },
  interestEmptyText: { flex: 1, color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18 },
  logoutButton: { marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(74,45,56,0.34)", justifyContent: "flex-end" },
  editSheet: { height: "92%", backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden", paddingTop: 9 },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: COLORS.border, marginBottom: 14 },
  sheetHeader: { paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  sheetHeaderCopy: { flex: 1 },
  sheetEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  sheetTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 20, fontWeight: "900" },
  closeButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  editKeyboard: { flex: 1 },
  editContent: { paddingHorizontal: 20, paddingBottom: 36, gap: 14 },
  formBlock: { gap: 8 },
  formLabel: { marginLeft: 4, color: COLORS.primaryText, fontSize: 13.5, fontWeight: "800" },
  optionRow: { flexDirection: "row", gap: 8 },
  optionChip: { flex: 1, alignItems: "center", borderRadius: 16, paddingVertical: 11, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border },
  optionChipActive: { backgroundColor: COLORS.accentBg, borderColor: COLORS.primary },
  optionText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "800" },
  optionTextActive: { color: COLORS.primaryText },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  smallChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border },
  smallChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  smallChipText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "800" },
  smallChipTextActive: { color: COLORS.white },
  interestEditChip: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border },
  interestEditChipActive: { backgroundColor: COLORS.accentBg, borderColor: COLORS.primary },
  interestEditText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "800" },
  interestEditTextActive: { color: COLORS.primaryText },
  editHint: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: COLORS.softSurface, borderRadius: 16, padding: 12 },
  editHintText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  logoutOverlay: {
    flex: 1,
    backgroundColor: "rgba(69,43,53,0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoutDialog: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COLORS.white,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#6E4352",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 12,
  },
  logoutBloomIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1,
    borderColor: "#F7D6E1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  logoutEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  logoutTitle: { marginTop: 7, color: COLORS.primaryText, fontSize: 21, lineHeight: 27, fontWeight: "900", textAlign: "center" },
  logoutMessage: { marginTop: 10, color: COLORS.secondaryText, fontSize: 13, lineHeight: 20, textAlign: "center" },
  logoutActions: { width: "100%", gap: 9, marginTop: 20 },
  stayButton: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stayButtonText: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  leaveButton: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 9,
    elevation: 4,
  },
  leaveButtonText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  logoutDisabled: { opacity: 0.72 },

});
