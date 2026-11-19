import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { BloomButton, COLORS } from "@/components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomTextInput } from "@/components/ui/BloomInputComponents";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/profile/useUserProfile";
import { avatarAsyncSync } from "@/services/media/avatarAsyncSync";
import { useBloomToast } from "@/components/ui/BloomToast";
import { getColorByName } from "@/utils";
import type { Gender, BloodType } from "@/types/user";
import type { CreateProfileInput } from "@/types/profile";
import { StatusBar } from "expo-status-bar";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { useState } from "react";
import { BloomInputAvatar } from "@/components/ui/BloomInputComponents/BloomInputAvatar";
import { StyleSheet, TouchableOpacity, View,  } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';
import { useA3Theme } from '../../appearance3/useAppearance3';



// Danh sách sở thích mẫu
const GENDER_OPTIONS = [
  { key: "male", label: "Nam ⚽" },
  { key: "female", label: "Nữ 🎀" },
  { key: "other", label: "Khác ✨" },
] as const satisfies ReadonlyArray<{ key: Gender; label: string }>;

const INTEREST_OPTIONS = [
  { id: "music", label: "🎵 Âm nhạc" },
  { id: "reading", label: "📚 Đọc sách" },
  { id: "cooking", label: "🍳 Nấu ăn" },
  { id: "travel", label: "✈️ Du lịch" },
  { id: "plant", label: "🌱 Trồng cây" },
  { id: "photo", label: "📸 Nhiếp ảnh" },
];

export default function CreateProfileScreen() {
  const __a3Theme = useA3Theme();

  const __a3_styles = useA3LegacyStyles(styles);

  
  // State quản lý thông tin hồ sơ
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<Gender>("other");
  const [bloodType, setBloodType] = useState<BloodType>("other");
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [saveStage, setSaveStage] = useState<"profile" | "avatar" | null>(null);
  const { user, userProfile, refreshProfile } = useAuth();
  const { createUserProfile } = useUserProfile();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const { showToast } = useBloomToast();
  // Xử lý chọn/bỏ chọn sở thích
  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter((item) => item !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!name.trim()) {
      showToast({ type: "warning", title: "Bạn chưa nhập họ tên", message: "Hãy cho cả nhà biết tên của bạn nhé 🌷", duration: 3000 });
      return;
    }

    setIsLoading(true);
    try {
      // Không đưa `undefined` vào payload. Firestore từ chối field có giá trị undefined.
      const profileInput: CreateProfileInput = {
        displayName: name.trim(),
        color: getColorByName(name.trim()),
        gender,
        bloodType,
        interests: selectedInterests,
      };

      const nicknameValue = nickname.trim();
      if (nicknameValue) profileInput.shortName = nicknameValue;

      const phoneValue = phone.trim() || user.phoneNumber?.trim();
      if (phoneValue) profileInput.phoneNumber = phoneValue;
      if (birthDate) profileInput.birthDate = birthDate.toISOString();

      const locationValue = location.trim();
      if (locationValue) profileInput.currentLocation = locationValue;

      const bioValue = bio.trim();
      if (bioValue) profileInput.bio = bioValue;

      // A Firestore profile and an uploaded avatar are TWO different writes.
      // Do not unlock the next onboarding screen until both are complete.
      if (!profileSaved) {
        setSaveStage("profile");
        await createUserProfile(user.uid, profileInput);
        setProfileSaved(true);
      }
      if (avatarUri) {
        setSaveStage("avatar");
        await avatarAsyncSync.enqueue(user.uid, avatarUri);
        const result = await avatarAsyncSync.waitForCompletion(user.uid);
        if (result !== "complete") {
          showToast({ type: "warning", title: "Ảnh chưa lưu xong",
            message: result === "timeout" ? "Mạng đang chậm. Bạn có thể thử lưu lại hoặc tiếp tục không có ảnh."
              : "Bạn có thể chọn ảnh khác và thử lại. Hồ sơ đã được giữ an toàn.", duration: 4500 });
          return;
        }
      }
      setSaveStage("profile");
      const verified = await refreshProfile();
      if (!verified?.uid || verified.uid !== user.uid) throw new Error("PROFILE_VERIFY_FAILED");
      // RouteGate now takes the user to family-gateway; no toast can arrive
      // from the previous screen after that transition.
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[ProfileSave]", error);
      showToast({ type: "error", title: "Chưa hoàn tất hồ sơ",
        message: "Thông tin của bạn vẫn được giữ trên màn hình. Vui lòng kiểm tra kết nối và thử lại.", duration: 4000 });
    } finally {
      setSaveStage(null);
      setIsLoading(false);
    }
  };

  const continueWithoutAvatar = async () => {
    if (!user || !profileSaved || isLoading) return;
    setIsLoading(true);
    try {
      await avatarAsyncSync.discard(user.uid);
      const profile = await refreshProfile();
      if (!profile?.uid || profile.uid !== user.uid) throw new Error("PROFILE_VERIFY_FAILED");
    } catch {
      showToast({ type: "warning", title: "Chưa thể tiếp tục", message: "Hãy kiểm tra mạng rồi thử lại." });
    } finally { setIsLoading(false); }
  };

  return (
    <BloomKeyboardScreen
      rootStyle={__a3_styles.container}
      contentContainerStyle={__a3_styles.scrollContent}
    >
        <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
        <BloomHeroHeader
          eyebrow="CHÀO MỪNG BẠN ĐẾN BLOOM"
          title="Để cả nhà nhận ra bạn ngay từ lần đầu"
          subtitle="Thêm vài điều thân thuộc về bạn. Sau khi lưu, bạn có thể tạo một mái nhà mới hoặc xin gia nhập gia đình đã có."
          variant="profile"
        />

        {/* ================= FORM NHẬP LIỆU ================= */}
        <View style={__a3_styles.formContainer}>
          <View style={__a3_styles.avatarWrapper}>
            <BloomInputAvatar label="" centered size={140} value={avatarUri} pickerScope={user?.uid ? `profile:create:${user.uid}` : undefined}
              fallbackText={user?.displayName || "Khách"} disabled={isLoading}
              onChange={setAvatarUri}/>
          </View>
          {/* Các trường thông tin */}
          <View style={__a3_styles.inputsWrapper}>
            {/* 1. Họ và tên & Biệt danh */}
            <BloomTextInput
              label="Họ và tên"
              placeholder="Tên bạn trong nhà 🌷"
              leftIcon="person-outline"
              value={name}
              onChangeText={setName}
            />

            <BloomTextInput
              label="Tên gọi thân mật (Biệt danh, không bắt buộc)"
              placeholder="Bloom nên gọi bạn là gì nhở?"
              leftIcon="happy-outline"
              value={nickname}
              onChangeText={setNickname}
            />

            {/* 2. Chọn Giới Tính */}
            <View style={__a3_styles.fieldSection}>
              <Text style={__a3_styles.fieldLabel}>Giới tính</Text>
              <View style={__a3_styles.genderContainer}>
                {GENDER_OPTIONS.map((item) => {
                  const isSelected = gender === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[__a3_styles.genderOption, isSelected && __a3_styles.genderOptionSelected]}
                      onPress={() => setGender(item.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[__a3_styles.genderText, isSelected && __a3_styles.genderTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Ngày sinh & Số điện thoại */}
            <BloomDatePicker
              label="Ngày sinh nhật"
              selectedDate={birthDate}
              onDateChange={setBirthDate}
              placeholder="Chọn ngày bạn cất tiếng khóc chào đời"
              leftIcon="gift-outline"
            />

            <BloomTextInput
              label="Số điện thoại"
              placeholder="Số để nhà mình tìm nhau"
              leftIcon="call-outline"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {/* 4. Nhóm máu */}
            <View style={__a3_styles.fieldSection}>
              <Text style={__a3_styles.fieldLabel}>Nhóm máu</Text>
              <View style={__a3_styles.interestChipsContainer}>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "other"].map((item) => {
                  const selected = bloodType === item;
                  return (
                    <TouchableOpacity key={item} style={[__a3_styles.chip, selected && __a3_styles.chipSelected]} onPress={() => setBloodType(item as typeof bloodType)}>
                      <Text style={[__a3_styles.chipText, selected && __a3_styles.chipTextSelected]}>{item === "other" ? "Khác" : item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 5. Nơi ở / Địa chỉ */}
            <BloomTextInput
              label="Tỉnh / Thành phố đang sống"
              placeholder="Bạn đang ở đâu nè?"
              leftIcon="location-outline"
              value={location}
              onChangeText={setLocation}
            />

            {/* 6. Sở thích (Tags Select) */}
            <View style={__a3_styles.fieldSection}>
              <Text style={__a3_styles.fieldLabel}>Sở thích của bạn</Text>
              <View style={__a3_styles.interestChipsContainer}>
                {INTEREST_OPTIONS.map((item) => {
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[__a3_styles.chip, isSelected && __a3_styles.chipSelected]}
                      onPress={() => toggleInterest(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[__a3_styles.chipText, isSelected && __a3_styles.chipTextSelected]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 7. Tiểu sử ngắn */}
            <BloomTextInput
              label="Đôi nét về bạn (Bio)"
              placeholder="Chia sở một vài điều đáng yêu về bản thân..."
              leftIcon="heart-outline"
              multiline={true}
              value={bio}
              onChangeText={setBio}
            />
          </View>

          {/* Nút Hoàn Tất */}
          <BloomButton
            title={saveStage === "avatar" ? "Đang lưu ảnh đại diện…" : saveStage === "profile" ? "Đang lưu hồ sơ…" : profileSaved ? "Hoàn tất hồ sơ" : "Hoàn tất & Bắt đầu 🚀"}
            variant="primary"
            isLoading={isLoading}
            onPress={handleSaveProfile}
            customStyle={__a3_styles.submitButton}
          />
          {profileSaved && avatarUri && !isLoading ? (
            <View style={{ marginTop: 12 }}>
              <BloomButton title="Tiếp tục trước, thêm ảnh sau" variant="outline"
                onPress={continueWithoutAvatar} />
            </View>
          ) : null}
        </View>
    </BloomKeyboardScreen>
  );
}

// ================= STYLESHEET =================
const styles = createBloomStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Header Styles
  headerContainer: {
    backgroundColor: COLORS.accentBg,
    paddingTop: 65,
    paddingBottom: 70,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  headerIconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.primaryText,
    marginBottom: 6,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.secondaryText,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },

  // Form Styles
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 0,
    paddingTop: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    backgroundColor: COLORS.background,
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 18,
    position: "relative",
  },
  avatarButton: {
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: COLORS.softSurface,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: "27%",

    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  inputsWrapper: {
    gap: 16,
  },

  // Custom Field Section
  fieldSection: {
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
    marginBottom: 8,
    marginLeft: 4,
  },

  // Gender Switcher
  genderContainer: {
    flexDirection: "row",
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  genderOptionSelected: {
    backgroundColor: COLORS.accentBg,
    borderColor: COLORS.primary,
  },
  genderText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.secondaryText,
  },
  genderTextSelected: {
    color: COLORS.primary,
  },

  // Interests Chips
  interestChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.softSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.secondaryText,
  },
  chipTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },

  submitButton: {
    marginTop: 32,
    height: 56,
    borderRadius: 28,
  },
}));
