import { BloomAvatarButton, BloomButton, COLORS } from "@/components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomTextInput } from "@/components/ui/BloomInputComponents";
import { parseAppError } from "@/constants/errorConstants";
import { useAuth } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { useBloomToast } from "@/components/ui/BloomToast";
import { getColorByName } from "@/utils";
import type { Gender, BloodType } from "@/types/user";
import type { CreateProfileInput } from "@/types/profile";
import { Ionicons } from "@expo/vector-icons";
import { BloomKeyboardScreen } from "../components/layout/BloomKeyboardScreen";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

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
  const { user, userProfile, refreshProfile } = useAuth();
  const { createUserProfile } = useUserProfile();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const { handleSelectAvatar } = useMediaUpload();
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
      showToast({ ...parseAppError({ code: "VALIDATION_REQUIRED" }), duration: 3000 });
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

      await createUserProfile(
        user.uid,
        profileInput,
        avatarUri
          ? {
              id: `avatar-${user.uid}`,
              uri: avatarUri,
              type: "image",
              mimeType: "image/jpeg",
              fileName: `avatar-${user.uid}.jpg`,
              purpose: "avatar",
            }
          : undefined,
      );

      // Root Navigator sở hữu quyết định điều hướng. Sau khi profile được
      // refresh, user chưa có activeFamilyId sẽ đi tới /family-gateway; không
      // render /(tabs) tạm thời.
      await refreshProfile();
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BloomKeyboardScreen
      rootStyle={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
        {/* ================= HEADER ================= */}
        <View style={styles.headerContainer}>
          <View style={styles.headerIconWrapper}>
            <Ionicons name="sparkles" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.headerTitle}>Chào người bạn mới! 👋</Text>
          <Text style={styles.headerSubtitle}>
            Hãy hoàn tất hồ sơ để Bloom đồng hành cùng bạn một cách trọn vẹn nhất nhé ✨
Sau khi lưu, bạn có thể tạo gia đình mới hoặc dùng Family ID để xin gia nhập một gia đình có sẵn.
          </Text>
        </View>

        {/* ================= FORM NHẬP LIỆU ================= */}
        <View style={styles.formContainer}>
          {/* Avatar Căn Giữa Cắt Lên Header */}
          <View style={styles.avatarWrapper}>
            <BloomAvatarButton
              source={avatarUri ? { uri: avatarUri } : null}
              text={user?.displayName || "Khách"}
              size={140}
              onPress={() => handleSelectAvatar(setAvatarUri)}
              showOnlineIndicator={true}
              customStyle={styles.avatarButton}
            />
            <View
              style={[
                styles.cameraBadge,
                {
                  backgroundColor: userProfile?.avatarUrl
                    ? COLORS.primary
                    : getColorByName(user?.displayName || "Khách"),
                },
              ]}
            >
              <Ionicons name="camera" size={16} color={COLORS.white} />
            </View>
          </View>

          {/* Các trường thông tin */}
          <View style={styles.inputsWrapper}>
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
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Giới tính</Text>
              <View style={styles.genderContainer}>
                {GENDER_OPTIONS.map((item) => {
                  const isSelected = gender === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[styles.genderOption, isSelected && styles.genderOptionSelected]}
                      onPress={() => setGender(item.key)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.genderText, isSelected && styles.genderTextSelected]}>
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
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Nhóm máu</Text>
              <View style={styles.interestChipsContainer}>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "other"].map((item) => {
                  const selected = bloodType === item;
                  return (
                    <TouchableOpacity key={item} style={[styles.chip, selected && styles.chipSelected]} onPress={() => setBloodType(item as typeof bloodType)}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item === "other" ? "Khác" : item}</Text>
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
            <View style={styles.fieldSection}>
              <Text style={styles.fieldLabel}>Sở thích của bạn</Text>
              <View style={styles.interestChipsContainer}>
                {INTEREST_OPTIONS.map((item) => {
                  const isSelected = selectedInterests.includes(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => toggleInterest(item.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
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
            title="Hoàn tất & Bắt đầu 🚀"
            variant="primary"
            isLoading={isLoading}
            onPress={handleSaveProfile}
            customStyle={styles.submitButton}
          />
        </View>
    </BloomKeyboardScreen>
  );
}

// ================= STYLESHEET =================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.white,
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
    marginTop: -70,
  },
  avatarWrapper: {
    alignItems: "center",
    marginBottom: 70,
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
});
