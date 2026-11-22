import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { familyService } from "../../services/family/familyService";
import type { Family } from "../../types/user";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomButton } from "../../components/ui/BloomButtonComponents";
import { BloomInputAvatar } from "../../components/ui/BloomInputComponents/BloomInputAvatar";
import { AvatarUploadFrame } from "../../components/ui/BloomInputComponents/AvatarUploadFrame";
import { BloomAvatarButton } from "../../components/ui/BloomButtonComponents/BloomAvatarButton";
import type { AvatarSyncState } from "../../services/media/avatarAsyncSync";
import { avatarAsyncSync } from "../../services/media/avatarAsyncSync";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomDatePicker, BloomTextInput } from "../../components/ui/BloomInputComponents";
import {
  BloomCard,
  BloomInfoRow,
  BloomPill,
  BloomSectionHeader,
} from "../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../components/ui/BloomToast";
import { useBloomDialog } from "../../components/ui/BloomDialogProvider";
import { parseAppError } from "../../constants/errorConstants";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { profileService } from "../../services/profile/profileService";
import { momentMediaApi } from "../../services/media/momentMediaApi";
import type { BloodType, Gender } from "../../types/user";
import { familyIntroCharacters, FAMILY_INTRO_MAX } from "../../utils/familyIntroduction";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const roleLabel: Record<string, string> = {
  owner: "Chủ nhà",
  admin: "Người giữ nhà",
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
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { user, userProfile, families, refreshProfile, logout } = useAuth();
  const { showToast } = useBloomToast();
  const { confirm } = useBloomDialog();
  const membership = families.find((item) => item.familyId === userProfile?.activeFamilyId);
  const initials = (userProfile?.displayName || "F").trim().slice(0, 1).toUpperCase();
  const activeFamilyId = userProfile?.activeFamilyId ?? membership?.familyId ?? null;

  const [inviteFamily, setInviteFamily] = useState<Family | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [editIntro, setEditIntro] = useState(false);
  const [introDraft, setIntroDraft] = useState("");
  const canEditIntro = membership?.role === "admin" || membership?.role === "owner" || inviteFamily?.ownerId === user?.uid;
  useEffect(() => {
    let active = true;
    setInviteFamily(null);
    if (activeFamilyId) void familyService.getFamily(activeFamilyId)
      .then(async value => {
        // Legacy families get a unique generated invitation name on first admin visit.
        // This never changes the old familyCode, ID, membership or pending requests.
        if (value && !value.introName && user?.uid && (membership?.role === 'admin' || membership?.role === 'owner' || value.ownerId === user.uid)) {
          try {
            await familyService.updateFamilyIntroName(activeFamilyId, user.uid, `Nhà-${activeFamilyId.slice(0,10)}`);
            value = await familyService.getFamily(activeFamilyId);
          } catch { /* Old codes remain valid; admin can use the manual editor after rules deploy. */ }
        }
        if (active) setInviteFamily(value);
      })
      .catch(error => { if (active) showToast({ ...parseAppError(error) }); });
    return () => { active = false; };
  }, [activeFamilyId, membership?.role, user?.uid, showToast]);
  const createInviteCode = async () => {
    if (!activeFamilyId || inviteBusy) return;
    setInviteBusy(true);
    try {
      await familyService.ensureFamilyCode(activeFamilyId);
      setInviteFamily(await familyService.getFamily(activeFamilyId));
    } catch (error) { showToast({ ...parseAppError(error) }); }
    finally { setInviteBusy(false); }
  };
  const saveIntroductionName = async () => {
    if (!activeFamilyId || !user?.uid || inviteBusy) return;
    setInviteBusy(true);
    try {
      await familyService.updateFamilyIntroName(activeFamilyId, user.uid, introDraft);
      setInviteFamily(await familyService.getFamily(activeFamilyId));
      setEditIntro(false);
      showToast({ type: "success", title: "Đã cập nhật tên giới thiệu 🌸", message: "Người thân có thể dùng tên mới để xin vào nhà." });
    } catch (error) { showToast({ type: "warning", title: "Chưa đổi được tên", message: error instanceof Error ? error.message : "Vui lòng thử lại." }); }
    finally { setInviteBusy(false); }
  };
  const copyIntroductionName = async () => {
    const value = inviteFamily?.introName || inviteFamily?.familyCode;
    if (value) { await Clipboard.setStringAsync(value); showToast({ type: "success", message: "Đã sao chép tên giới thiệu 🌸" }); }
  };
  const copyHouseCode = async () => {
    if (!inviteFamily?.familyCode) return;
    try { await Clipboard.setStringAsync(inviteFamily.familyCode); showToast({ type: "success", message: "Đã sao chép mã nhà 🌸" }); }
    catch (error) { showToast({ ...parseAppError(error) }); }
  };

  const [editVisible, setEditVisible] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarSyncState, setAvatarSyncState] = useState<AvatarSyncState>({ phase: "idle", progress: null, uri: null });
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = avatarAsyncSync.subscribe(user.uid, setAvatarSyncState);
    avatarAsyncSync.resume(user.uid);
    return unsubscribe;
  }, [user?.uid]);
  const liveAvatarUri = avatarSyncState.uri || userProfile?.avatarUrl || null;
  const retryAvatar = () => {
    if (!user?.uid) return;
    avatarAsyncSync.retry(user.uid);
    showToast({ type: "info", title: "Đang thử lưu ảnh", message: "Bạn có thể theo dõi tiến trình ngay trên ảnh đại diện.", duration: 2400 });
  };
  const [avatarDirty, setAvatarDirty] = useState(false);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>(undefined);
  const [location, setLocation] = useState("");
  const [hometown, setHometown] = useState("");
  const [occupation, setOccupation] = useState("");
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
    setAvatarUri(avatarSyncState.uri || userProfile.avatarUrl || null);
    setAvatarDirty(false);
    setShortName(userProfile.shortName || "");
    setPhone(userProfile.phoneNumber || "");
    setBirthDate(parseDate(userProfile.birthDate));
    setLocation(userProfile.currentLocation || "");
    setHometown(userProfile.hometown || "");
    setOccupation(userProfile.occupation || "");
    setBio(userProfile.bio || "");
    setGender(userProfile.gender || "other");
    setBloodType(userProfile.bloodType || "other");
    setInterests(userProfile.interests || []);
    setEditDirty(false);
    setEditVisible(true);
  };

  const closeEditNow = () => {
    if (saving) return;
    setEditDirty(false);
    setAvatarDirty(false);
    setEditVisible(false);
  };

  const requestCloseEdit = () => {
    if (saving) return;
    if (!editDirty) {
      closeEditNow();
      return;
    }
    void confirm({
      eyebrow: "HỒ SƠ CỦA BẠN",
      title: "Bỏ những thay đổi này?",
      message: "Hồ sơ hiện tại vẫn được giữ nguyên. Những điều bạn vừa sửa sẽ chưa được lưu.",
      icon: "person-circle-outline",
      cancelLabel: "Chỉnh tiếp",
      confirmLabel: "Bỏ thay đổi",
      destructive: true,
    }).then((discard) => { if (discard) closeEditNow(); });
  };

  const toggleInterest = (interest: string) => {
    setEditDirty(true);
    setInterests((current) => current.includes(interest)
      ? current.filter((item) => item !== interest)
      : [...current, interest]);
  };

  const saveProfile = async () => {
    if (!user || !name.trim()) {
      showToast({ type: "warning", message: "Tên của bạn chưa thể để trống nhé 🌸", duration: 2800 });
      return;
    }
    setSaving(true);
    try {
      const replacedAvatarAssetId = avatarDirty ? userProfile?.avatarAssetId : null;
      // Save profile fields, then keep editing open until the selected image is confirmed.
      // Removing an avatar also cancels any pending background replacement.
      if (avatarDirty && !avatarUri) await avatarAsyncSync.discard(user.uid);
      await profileService.update(user.uid, {
        ...(avatarDirty && !avatarUri ? { avatarUrl: null, avatarPublicId: null, avatarAssetId: null } : {}),
        displayName: name.trim(),
        shortName: shortName.trim() || null,
        phoneNumber: phone.trim() || null,
        birthDate: birthDate ? birthDate.toISOString() : null,
        currentLocation: location.trim() || null,
        hometown: hometown.trim() || null,
        occupation: occupation.trim() || null,
        bio: bio.trim() || null,
        gender,
        bloodType,
        interests,
      });
      if (avatarDirty && avatarUri && avatarUri !== userProfile?.avatarUrl) {
        await avatarAsyncSync.enqueue(user.uid, avatarUri);
        const outcome = await avatarAsyncSync.waitForCompletion(user.uid);
        if (outcome !== "complete") {
          showToast({ type: "warning", title: "Ảnh chưa lưu xong",
            message: outcome === "timeout" ? "Mạng đang chậm. Vui lòng thử lại hoặc giữ ảnh cũ."
              : "Thông tin hồ sơ đã lưu. Hãy chọn ảnh khác hoặc thử lưu lại.", duration: 4300 });
          return; // Keep the edit form and its draft; NEVER navigate to Welcome.
        }
      }
      const verifiedProfile = await refreshProfile();
      if (!verifiedProfile || verifiedProfile.uid !== user.uid) throw new Error("PROFILE_VERIFY_FAILED");
      if (avatarDirty && !avatarUri && replacedAvatarAssetId) {
        void momentMediaApi.requestCleanup([replacedAvatarAssetId]).catch(() => {});
      }
      setEditDirty(false);
      setEditVisible(false);
      showToast({ type: "success", title: "Đã lưu hồ sơ 🌷",
        message: "Thông tin và ảnh đại diện của bạn đã được cập nhật.", duration: 2600 });
    } catch (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[ProfileUpdate]", error);
      showToast({ type: "error", title: "Chưa lưu được hồ sơ",
        message: "Vui lòng kiểm tra kết nối và thử lại. Nội dung bạn vừa nhập vẫn ở đây.", duration: 4500 });
    } finally {
      setSaving(false);
    }
  };

  const copyFamilyId = async () => {
    if (!activeFamilyId) return;
    await Clipboard.setStringAsync(activeFamilyId);
    showToast({
      type: "success",
      title: "Đã sao chép mã gia đình",
      message: "Gửi mã này cho người thân để họ xin vào đúng gia đình của bạn.",
      duration: 2800,
    });
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomHeroHeader
        eyebrow="HỒ SƠ GIA ĐÌNH"
        title="Family CV"
        subtitle="Một câu chuyện đời, những mối thân thương và dấu ấn của riêng bạn."
        variant="profile"
        onBack={() => router.back()}
        roundedBottom
        compact

      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={__a3_styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <BloomCard style={__a3_styles.heroCard}>
          <View style={__a3_styles.cvEyebrowRow}>
            <Ionicons name="sparkles-outline" size={16} color={__a3Colors.primary}/>
            <Text style={__a3_styles.cvEyebrow}>CHÂN DUNG THÀNH VIÊN</Text>
            <View style={{ flex: 1 }}/>
            <Pressable onPress={editVisible ? requestCloseEdit : openEdit} disabled={saving}
              accessibilityRole="button" accessibilityLabel={editVisible ? "Hủy chỉnh sửa hồ sơ" : "Chỉnh sửa hồ sơ"}
              hitSlop={8} style={({ pressed }) => [__a3_styles.editButton, pressed && __a3_styles.pressed]}>
              <Ionicons name={editVisible ? "close-outline" : "pencil-outline"} size={16} color={__a3Colors.primary}/>
              <Text style={__a3_styles.editButtonLabel}>{editVisible ? "Hủy sửa" : "Chỉnh sửa hồ sơ"}</Text>
            </Pressable>
          </View>
          <View style={__a3_styles.heroTop}>
            {editVisible ? (
              <BloomInputAvatar label="" compact value={avatarUri} pickerScope={user?.uid ? `profile:edit:${user.uid}` : undefined}
                fallbackText={userProfile?.displayName || "Bạn"} size={112} disabled={saving}
                upload={avatarSyncState} onRetry={retryAvatar}
                onChange={(uri) => { setAvatarUri(uri); setAvatarDirty(true); setEditDirty(true); }}/>
            ) : (
              <AvatarUploadFrame size={112} upload={avatarSyncState} onRetry={retryAvatar}>
                <BloomAvatarButton size={112} shape="square" source={liveAvatarUri ? { uri: liveAvatarUri } : null}
                  previewRevision={liveAvatarUri ? 1 : 0} text={userProfile?.displayName || "Thành viên"}
                  showOnlineIndicator={false} onPress={openEdit} customStyle={__a3_styles.cvAvatarButton}/>
              </AvatarUploadFrame>
            )}
            <View style={__a3_styles.heroCopy}>
              <Text style={__a3_styles.name} numberOfLines={3}>{(editVisible ? name : userProfile?.displayName) || "Thành viên Family Bloom"}</Text>
              {!!(editVisible ? shortName : userProfile?.shortName) && <Text style={__a3_styles.shortName} numberOfLines={2}>{editVisible ? shortName : userProfile?.shortName}</Text>}
              <Text style={__a3_styles.cvRole}>Thành viên · {membership?.role ? roleLabel[membership.role] || "Thành viên" : "Family Bloom"}</Text>
              <Text style={__a3_styles.cvSubtitle}>{membership?.familyName || "Mái nhà Family Bloom"}</Text>
            </View>
          </View>
          {editVisible && <View style={__a3_styles.cvNameEditor}>
            <BloomTextInput label="Họ và tên" value={name} onChangeText={(value) => { setName(value); setEditDirty(true); }} leftIcon="person-outline"/>
            <BloomTextInput label="Tên thân mật" value={shortName} onChangeText={(value) => { setShortName(value); setEditDirty(true); }} leftIcon="happy-outline"/>
            <Text style={__a3_styles.editHint}>Vai trò gia đình chỉ hiển thị, không chỉnh sửa từ CV.</Text>
          </View>}
          <View style={__a3_styles.cvBiography}>
            <View style={__a3_styles.cvSectionTitleRow}>
              <Ionicons name="book-outline" size={19} color={__a3Colors.primary}/>
              <Text style={__a3_styles.cvSectionTitle}>Giới thiệu bản thân</Text>
              {editVisible && <Ionicons name="pencil" size={15} color={__a3Colors.primary}/>} 
            </View>
            {editVisible ? <BloomTextInput label="Đôi nét về bạn" value={bio} multiline
              onChangeText={(value) => { setBio(value); setEditDirty(true); }} leftIcon="heart-outline"/>
              : <Text style={__a3_styles.bio}>{userProfile?.bio || "Chưa có câu chuyện giới thiệu. Hãy viết vài dòng về bản thân khi bạn sẵn sàng."}</Text>}
          </View>
        </BloomCard>

        {editVisible && <View style={__a3_styles.section}>
          <BloomSectionHeader title="Hoàn thiện Family CV" subtitle="Chỉnh sửa tại chỗ; bấm Lưu thay đổi khi hoàn tất."/>
          <BloomCard>
            <View style={__a3_styles.formBlock}><Text style={__a3_styles.formLabel}>Giới tính</Text>
              <View style={__a3_styles.optionRow}>{GENDER_OPTIONS.map((item) => (
                <Pressable key={item.key} onPress={() => { setGender(item.key); setEditDirty(true); }}
                  style={[__a3_styles.optionChip, gender === item.key && __a3_styles.optionChipActive]}>
                  <Text style={[__a3_styles.optionText, gender === item.key && __a3_styles.optionTextActive]}>{item.label}</Text>
                </Pressable>
              ))}</View>
            </View>
            <BloomDatePicker label="Ngày sinh" selectedDate={birthDate} onDateChange={(date) => { setBirthDate(date); setEditDirty(true); }} leftIcon="gift-outline"/>
            <BloomTextInput label="Số điện thoại" value={phone} keyboardType="phone-pad" leftIcon="call-outline" onChangeText={(v) => { setPhone(v); setEditDirty(true); }}/>
            <BloomTextInput label="Nơi sinh sống" value={location} leftIcon="location-outline" onChangeText={(v) => { setLocation(v); setEditDirty(true); }}/>
            <BloomTextInput label="Quê quán" value={hometown} leftIcon="home-outline" onChangeText={(v) => { setHometown(v); setEditDirty(true); }}/>
            <BloomTextInput label="Nghề nghiệp" value={occupation} leftIcon="briefcase-outline" onChangeText={(v) => { setOccupation(v); setEditDirty(true); }}/>
            <View style={__a3_styles.formBlock}><Text style={__a3_styles.formLabel}>Nhóm máu</Text>
              <View style={__a3_styles.chipWrap}>{BLOOD_TYPES.map((item) => (
                <Pressable key={item} onPress={() => { setBloodType(item); setEditDirty(true); }}
                  style={[__a3_styles.smallChip, bloodType === item && __a3_styles.smallChipActive]}>
                  <Text style={[__a3_styles.smallChipText, bloodType === item && __a3_styles.smallChipTextActive]}>{item === "other" ? "Khác" : item}</Text>
                </Pressable>
              ))}</View>
            </View>
            <View style={__a3_styles.formBlock}><Text style={__a3_styles.formLabel}>Sở thích</Text>
              <View style={__a3_styles.chipWrap}>{INTEREST_OPTIONS.map((item) => (
                <Pressable key={item} onPress={() => toggleInterest(item)}
                  style={[__a3_styles.interestEditChip, interests.includes(item) && __a3_styles.interestEditChipActive]}>
                  <Text style={[__a3_styles.interestEditText, interests.includes(item) && __a3_styles.interestEditTextActive]}>{INTEREST_LABEL[item]}</Text>
                </Pressable>
              ))}</View>
            </View>
          </BloomCard>
        </View>}
        <View style={__a3_styles.section}>
          <BloomSectionHeader
            title="Những ngôi nhà của tôi"
            subtitle={`${families.length} mái nhà đang đồng hành cùng bạn`}
          />
          <BloomCard onPress={() => router.push("/family-memberships" as never)}>
            <View style={__a3_styles.multiFamilyRow}>
              <View style={__a3_styles.multiFamilyIcon}>
                <Ionicons name="layers-outline" size={21} color={__a3Colors.primary} />
              </View>
              <View style={__a3_styles.multiFamilyCopy}>
                <Text style={__a3_styles.multiFamilyTitle}>{membership?.familyName || "Gia đình hiện tại"}</Text>
                <Text style={__a3_styles.multiFamilyText}>Đổi nhà · tham gia thêm · tạo gia đình mới</Text>
              </View>
              <BloomPill icon="home-outline" label={`${families.length || 1} nhà`} />
              <Ionicons name="chevron-forward" size={18} color={__a3Colors.secondaryText} />
            </View>
          </BloomCard>
        </View>

        {!!activeFamilyId && (
          <View style={__a3_styles.section}>
            <BloomSectionHeader
              title="Mời người thân vào nhà"
              subtitle="Người thân nhập tên giới thiệu để gửi lời xin gia nhập, sau đó admin duyệt."
            />
            <BloomCard style={__a3_styles.familyInviteCard}>
              <View style={__a3_styles.familyInviteTop}>
                <View style={__a3_styles.familyInviteIcon}>
                  <Ionicons name="people-outline" size={21} color={__a3Colors.primary} />
                </View>
                <View style={__a3_styles.familyInviteCopy}>
                  <Text style={__a3_styles.familyInviteLabel}>{membership?.familyName || "Gia đình hiện tại"}</Text>
                  <Text style={__a3_styles.familyInviteHint}>Mã gia đình</Text>
                </View>
              </View>
              <View style={__a3_styles.familyIdRow}>
                <Text selectable style={__a3_styles.familyIdText} numberOfLines={1}>{activeFamilyId}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Sao chép mã gia đình"
                  onPress={() => void copyFamilyId()}
                  style={({ pressed }) => [__a3_styles.copyFamilyIdButton, pressed && __a3_styles.pressed]}
                >
                  <Ionicons name="copy-outline" size={17} color={__a3Colors.white} />
                  <Text style={__a3_styles.copyFamilyIdText}>Sao chép</Text>
                </Pressable>
              </View>
              <Text style={__a3_styles.familyInviteHint}>Tên giới thiệu để xin vào nhà (phân biệt HOA/thường)</Text>
              <View style={__a3_styles.familyIdRow}>
                <Text selectable style={[__a3_styles.familyIdText, { flex: 1 }]}>{inviteFamily?.introName || inviteFamily?.familyCode || "Chưa có tên giới thiệu"}</Text>
                {(inviteFamily?.introName || inviteFamily?.familyCode) && <Pressable accessibilityRole="button" onPress={() => void copyIntroductionName()} style={__a3_styles.copyFamilyIdButton}>
                  <Ionicons name="copy-outline" size={17} color={__a3Colors.white} /><Text style={__a3_styles.copyFamilyIdText}>Sao chép</Text>
                </Pressable>}
              </View>
              {canEditIntro && !editIntro && <BloomButton title="Đổi tên giới thiệu" onPress={() => { setIntroDraft(inviteFamily?.introName || inviteFamily?.familyCode || ""); setEditIntro(true); }} />}
              {canEditIntro && editIntro && <View style={{ gap: 9, marginVertical: 8 }}>
                <BloomTextInput label="Tên mới" value={introDraft} onChangeText={setIntroDraft} autoCorrect={false} autoCapitalize="none" placeholder="Ví dụ: Nhà Bắp 🌷" helperText={`${familyIntroCharacters(introDraft)}/${FAMILY_INTRO_MAX} ký tự · Có dấu, khoảng trắng, ký hiệu đặc biệt · Phân biệt hoa/thường`} />
                <BloomButton title="Lưu tên giới thiệu" disabled={inviteBusy || familyIntroCharacters(introDraft.trim()) > FAMILY_INTRO_MAX || !introDraft.trim()} isLoading={inviteBusy} onPress={() => void saveIntroductionName()} />
                <BloomButton title="Huỷ đổi tên" disabled={inviteBusy} onPress={() => setEditIntro(false)} />
              </View>}
              <Text style={__a3_styles.familyInviteHint}>Mã nhà cũ (vẫn dùng được)</Text>
              <View style={__a3_styles.familyIdRow}>
                <Text selectable style={__a3_styles.familyIdText}>{inviteFamily?.familyCode || "Chưa có mã nhà"}</Text>
                {!!inviteFamily?.familyCode && <Pressable accessibilityRole="button" accessibilityLabel="Sao chép mã nhà" onPress={() => void copyHouseCode()} style={__a3_styles.copyFamilyIdButton}>
                  <Ionicons name="copy-outline" size={17} color={__a3Colors.white} /><Text style={__a3_styles.copyFamilyIdText}>Sao chép</Text>
                </Pressable>}
              </View>
              {inviteFamily && !inviteFamily.familyCode && inviteFamily.ownerId === user?.uid && <BloomButton title="Tạo mã nhà" isLoading={inviteBusy} onPress={() => void createInviteCode()} />}
              <View style={__a3_styles.familyInviteNote}>
                <Ionicons name="information-circle-outline" size={15} color={__a3Colors.primary} />
                <Text style={__a3_styles.familyInviteNoteText}>Người nhận vẫn gửi lời xin vào nhà và chờ người giữ nhà mở cửa.</Text>
              </View>
            </BloomCard>
          </View>
        )}

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Thông tin cá nhân" subtitle="Một vài nét về bạn" />
          <BloomCard>
            <BloomInfoRow icon="call-outline" label="Số điện thoại" value={userProfile?.phoneNumber} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="calendar-outline" label="Ngày sinh" value={formatBirthDate(userProfile?.birthDate)} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="location-outline" label="Nơi ở hiện tại" value={userProfile?.currentLocation} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="home-outline" label="Quê quán" value={userProfile?.hometown} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="briefcase-outline" label="Nghề nghiệp" value={userProfile?.occupation} />
            <View style={__a3_styles.divider} />
            <BloomInfoRow icon="water-outline" label="Nhóm máu" value={userProfile?.bloodType} />
          </BloomCard>
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Điều bạn yêu thích" subtitle="Những sở thích đang có trong hồ sơ" />
          <BloomCard>
            {userProfile?.interests?.length ? (
              <View style={__a3_styles.interestWrap}>
                {userProfile.interests.map((item) => (
                  <View key={item} style={__a3_styles.interestChip}>
                    <Ionicons name="sparkles-outline" size={13} color={__a3Colors.primary} />
                    <Text style={__a3_styles.interestText}>{INTEREST_LABEL[item] || item}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={__a3_styles.interestEmpty}>
                <Ionicons name="heart-outline" size={22} color={__a3Colors.primary} />
                <Text style={__a3_styles.interestEmptyText}>Chưa có sở thích nào được thêm vào hồ sơ.</Text>
              </View>
            )}
          </BloomCard>
        </View>

        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Hành trình & kỷ niệm" subtitle="Những dấu ấn được lưu trong mái nhà"/>
          <BloomCard>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/moments" as never)} style={__a3_styles.cvActionRow}>
              <View style={__a3_styles.cvActionIcon}><Ionicons name="images-outline" size={23} color={__a3Colors.primary}/></View>
              <View style={{ flex: 1 }}><Text style={__a3_styles.cvActionTitle}>Khoảnh khắc của nhà mình</Text>
                <Text style={__a3_styles.cvActionHint}>Xem lại ảnh và câu chuyện đã chia sẻ</Text></View>
              <Ionicons name="chevron-forward" size={20} color={__a3Colors.secondaryText}/>
            </Pressable>
            <View style={__a3_styles.cvActionDivider}/>
            <Pressable accessibilityRole="button" onPress={() => router.push("/(tabs)/family" as never)} style={__a3_styles.cvActionRow}>
              <View style={__a3_styles.cvActionIcon}><Ionicons name="git-network-outline" size={23} color={__a3Colors.primary}/></View>
              <View style={{ flex: 1 }}><Text style={__a3_styles.cvActionTitle}>Cây gia đình</Text>
                <Text style={__a3_styles.cvActionHint}>Kết nối cha mẹ, con cái và người thân</Text></View>
              <Ionicons name="chevron-forward" size={20} color={__a3Colors.secondaryText}/>
            </Pressable>
          </BloomCard>
        </View>

        <BloomButton
          title="Đăng xuất"
          variant="outline"
          icon={<Ionicons name="log-out-outline" size={18} />}
          onPress={confirmLogout}
          customStyle={__a3_styles.logoutButton}
        />
      </ScrollView>
      {editVisible && <View style={__a3_styles.cvSaveBar}>
        <Pressable disabled={saving} onPress={requestCloseEdit} style={__a3_styles.cvCancel}><Text style={__a3_styles.cvCancelText}>Hủy</Text></Pressable>
        <View style={{ flex: 1 }}><BloomButton title="Lưu thay đổi" isLoading={saving} onPress={saveProfile}/></View>
      </View>}
      </KeyboardAvoidingView>

      <Modal
        visible={logoutVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !loggingOut && setLogoutVisible(false)}
      >
        <View style={__a3_styles.logoutOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={loggingOut}
            onPress={() => setLogoutVisible(false)}
          />
          <View style={__a3_styles.logoutDialog}>
            <View style={__a3_styles.logoutBloomIcon}>
              <Ionicons name="flower-outline" size={30} color={__a3Colors.primary} />
            </View>
            <Text style={__a3_styles.logoutEyebrow}>TẠM RỜI KHU VƯỜN</Text>
            <Text style={__a3_styles.logoutTitle}>Bloom giữ nhà giúp bạn nhé? 🌷</Text>
            <Text style={__a3_styles.logoutMessage}>
              Những khoảnh khắc của cả nhà vẫn nằm yên ở đây. Khi nhớ, bạn chỉ cần đăng nhập lại là cánh cửa Bloom mở ra ngay.
            </Text>

            <View style={__a3_styles.logoutActions}>
              <Pressable
                disabled={loggingOut}
                onPress={() => setLogoutVisible(false)}
                style={({ pressed }) => [__a3_styles.stayButton, pressed && __a3_styles.pressed]}
              >
                <Ionicons name="home-outline" size={18} color={__a3Colors.primaryText} />
                <Text style={__a3_styles.stayButtonText}>Ở lại với nhà</Text>
              </Pressable>
              <Pressable
                disabled={loggingOut}
                onPress={() => void performLogout()}
                style={({ pressed }) => [__a3_styles.leaveButton, pressed && __a3_styles.pressed, loggingOut && __a3_styles.logoutDisabled]}
              >
                {loggingOut ? (
                  <ActivityIndicator size="small" color={__a3Colors.white} />
                ) : (
                  <Ionicons name="log-out-outline" size={18} color={__a3Colors.white} />
                )}
                <Text style={__a3_styles.leaveButtonText}>{loggingOut ? "Đang khép cửa…" : "Tạm rời Bloom"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 32, paddingBottom: 42 },
  editButton: { paddingHorizontal: 10, gap: 5, minHeight: 37, flexDirection: "row", borderRadius: 13, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  pressed: { opacity: 0.68, transform: [{ scale: 0.97 }] },
  editButtonLabel: { color: COLORS.primary, fontSize: 11, fontWeight: "800" },
  heroCard: { marginBottom: 26, backgroundColor: COLORS.surface, borderColor: COLORS.border, borderRadius: 24, shadowOpacity: 0.07 },
  cvNameEditor: { marginTop: 16, gap: 6, width: "100%" },
  editHint: { fontSize: 11, color: COLORS.secondaryText, marginBottom: 5 },
  heroTop: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 19, minHeight: 128 },
  avatarWrap: { width: 76, height: 76, borderRadius: 27, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface, borderWidth: 3, borderColor: "rgba(255,255,255,0.92)" },
  avatarImage: { width: "100%", height: "100%" },
  avatarInitial: { color: COLORS.primaryText, fontSize: 28, fontWeight: "900" },
  heroCopy: { flex: 1, minWidth: 0 },
  name: { color: COLORS.primaryText, fontSize: 20, lineHeight: 26, fontWeight: "900", flexShrink: 1 },
  shortName: { marginTop: 3, color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "700" },
  pillRow: { marginTop: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  bio: { marginTop: 8, color: COLORS.primaryText, opacity: 0.86, fontSize: 13, lineHeight: 20 },
  cvEyebrowRow: { flexDirection: "row", alignItems: "center", gap: 7, flexWrap: "wrap" },
  cvEyebrow: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 1 },
  cvAvatarButton: { borderWidth: 0, backgroundColor: COLORS.softSurface },
  cvRole: { color: COLORS.primary, fontSize: 11.5, marginTop: 7, fontWeight: "800" },
  cvSubtitle: { color: COLORS.secondaryText, fontSize: 12, marginTop: 4 },
  cvBiography: { marginTop: 22, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 17 },
  cvSectionTitleRow: { flexDirection: "row", gap: 9, alignItems: "center" },
  cvSectionTitle: { flex: 1, fontSize: 14, color: COLORS.primaryText, fontWeight: "900" },
  cvSaveBar: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.background, paddingHorizontal: 17, paddingTop: 10, paddingBottom: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  cvCancel: { minWidth: 68, minHeight: 43, borderRadius: 15, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.softSurface },
  cvCancelText: { fontWeight: "800", color: COLORS.primaryText },
  cvActionRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 12 },
  cvActionIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  cvActionTitle: { color: COLORS.primaryText, fontWeight: "800", fontSize: 13 },
  cvActionHint: { color: COLORS.secondaryText, marginTop: 4, fontSize: 11.5 },
  cvActionDivider: { height: 1, backgroundColor: COLORS.border },
  familyInviteCard: { gap: 12 },
  familyInviteTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  familyInviteIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  familyInviteCopy: { flex: 1 },
  familyInviteLabel: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  familyInviteHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  familyIdRow: { minHeight: 52, flexDirection: "row", alignItems: "center", gap: 9, borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingLeft: 12, paddingRight: 6 },
  familyIdText: { flex: 1, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  copyFamilyIdButton: { minHeight: 40, borderRadius: 14, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 11 },
  copyFamilyIdText: { color: COLORS.white, fontSize: 11, fontWeight: "900" },
  familyInviteNote: { flexDirection: "row", alignItems: "flex-start", gap: 7 },
  familyInviteNoteText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  section: { marginBottom: 26 },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 50 },
  interestWrap: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  interestChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  interestText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  interestEmpty: { flexDirection: "row", alignItems: "center", gap: 10 },
  interestEmptyText: { flex: 1, color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18 },
  logoutButton: { marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(74,45,56,0.34)", justifyContent: "flex-end" },
  editSheet: { height: "92%", backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden", paddingTop: 9 },
  multiFamilyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  multiFamilyIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  multiFamilyCopy: { flex: 1, minWidth: 0 },
  multiFamilyTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  multiFamilyText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16 },
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
  editHintPanel: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: COLORS.softSurface, borderRadius: 16, padding: 12 },
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
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: COLORS.shadow,
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
    borderColor: COLORS.border,
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

}));
