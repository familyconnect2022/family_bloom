import { getBloomStatusBarStyle } from "../../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { avatarFileFromUri } from "../../../services/media/avatarFile";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomButton, BloomChipButton } from "../../../components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomInputAvatar, BloomTextInput } from "../../../components/ui/BloomInputComponents";
import type { AvatarUploadVisualState } from "../../../components/ui/BloomInputComponents/AvatarUploadFrame";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { APP_CATEGORIES } from "../../../constants/appPaths";
import { parseAppError } from "../../../constants/errorConstants";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyGraph } from "../../../hooks/family/useFamilyGraph";
import { useFamilyMembers } from "../../../hooks/family/useFamilyMembers";
import { familyGraphMutationService } from "../../../services/familyGraph/familyGraphMutationService";
import { graphActivitySessionService } from "../../../services/activity/graphActivitySessionService";
import { activityService } from "../../../services/activity/activityService";
import { mediaService } from "../../../services/media/mediaService";
import { momentMediaApi } from "../../../services/media/momentMediaApi";
import type { FamilyPersonLifeStatus } from "../../../types/familyGraph";
import type { Gender } from "../../../types/user";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


const genderLabel: Record<Gender, string> = { male: "Nam", female: "Nữ", other: "Chưa xác định" };
const lifeLabel: Record<FamilyPersonLifeStatus, string> = {
  living: "Đang sống",
  deceased: "Đã mất",
  unknown: "Chưa rõ",
};

type PersonDraft = {
  displayName: string;
  nickname: string;
  gender: Gender;
  lifeStatus: FamilyPersonLifeStatus;
  birthYear: string;
  birthDate?: Date;
  deathYear: string;
  deathDate?: Date;
  birthPlace: string;
  description: string;
  linkedUid: string | null;
  avatarUri: string | null;
  avatarDirty: boolean;
};

const EMPTY_PERSON: PersonDraft = {
  displayName: "",
  nickname: "",
  gender: "other",
  lifeStatus: "living",
  birthYear: "",
  birthDate: undefined,
  deathYear: "",
  deathDate: undefined,
  birthPlace: "",
  description: "",
  linkedUid: null,
  avatarUri: null,
  avatarDirty: false,
};

const dateOnlyToDate = (value?: string | null): Date | undefined => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const dateToDateOnly = (value?: Date): string | null => {
  if (!value || Number.isNaN(value.getTime())) return null;
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
};

function YearDateControl({
  label,
  year,
  date,
  placeholder,
  minimumDate,
  maximumDate,
  onYearChange,
  onDateChange,
  onClearDate,
}: {
  label: string;
  year: string;
  date?: Date;
  placeholder: string;
  minimumDate?: Date;
  maximumDate?: Date;
  onYearChange: (value: string) => void;
  onDateChange: (date: Date) => void;
  onClearDate: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.dateBlock}>
      <Text style={__a3_styles.fieldLabel}>{label}</Text>
      <View style={__a3_styles.dateRow}>
        <BloomTextInput
          value={year}
          onChangeText={(value) => onYearChange(value.replace(/[^0-9]/g, "").slice(0, 4))}
          keyboardType="number-pad"
          placeholder={placeholder}
          containerStyle={__a3_styles.yearInput}
        />
        <BloomDatePicker
          selectedDate={date}
          onDateChange={onDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          trigger={(open) => (
            <Pressable onPress={open} style={({ pressed }) => [__a3_styles.dateButton, pressed && __a3_styles.pressed]}>
              <Ionicons name="calendar-outline" size={18} color={__a3Colors.primary} />
              <Text style={__a3_styles.dateButtonText}>{date ? "Đổi ngày" : "Chọn ngày"}</Text>
            </Pressable>
          )}
        />
      </View>
      {!!date && (
        <Pressable onPress={onClearDate} style={__a3_styles.clearDateButton}>
          <Ionicons name="close-circle-outline" size={15} color={__a3Colors.secondaryText} />
          <Text style={__a3_styles.clearDateText}>Chỉ giữ năm</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function FamilyGraphPersonEditorScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string }>();
  const personId = typeof params.personId === "string" && params.personId ? params.personId : null;
  const editing = !!personId;
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const membership = families.find((item) => item.familyId === familyId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const { snapshot, loading } = useFamilyGraph(familyId, user?.uid);
  const { members } = useFamilyMembers(familyId);
  const [draft, setDraft] = useState<PersonDraft>(EMPTY_PERSON);
  const [busy, setBusy] = useState(false);
  const [avatarUpload, setAvatarUpload] = useState<AvatarUploadVisualState>({ phase: "idle", progress: null });
  const [initializedId, setInitializedId] = useState<string | null>(null);

  const person = useMemo(
    () => personId ? snapshot.persons.find((item) => item.id === personId) ?? null : null,
    [personId, snapshot.persons],
  );
  const linkedUids = useMemo(
    () => new Set(snapshot.persons.filter((item) => item.id !== personId).map((item) => item.linkedUid).filter(Boolean) as string[]),
    [personId, snapshot.persons],
  );
  const availableMembers = useMemo(
    () => members.filter((member) => !linkedUids.has(member.uid)),
    [linkedUids, members],
  );

  useEffect(() => {
    if (!editing) {
      if (initializedId !== "__create__") {
        setDraft(EMPTY_PERSON);
        setInitializedId("__create__");
      }
      return;
    }
    if (!person || initializedId === person.id) return;
    setDraft({
      displayName: person.displayName,
      nickname: person.nickname ?? "",
      gender: person.gender,
      lifeStatus: person.lifeStatus,
      birthYear: person.birthYear ? String(person.birthYear) : "",
      birthDate: dateOnlyToDate(person.birthDate),
      deathYear: person.deathYear ? String(person.deathYear) : (person.deathDate?.slice(0, 4) ?? ""),
      deathDate: dateOnlyToDate(person.deathDate),
      birthPlace: person.birthPlace ?? "",
      description: person.description ?? "",
      linkedUid: person.linkedUid,
      avatarUri: person.avatarUrl,
      avatarDirty: false,
    });
    setInitializedId(person.id);
  }, [editing, initializedId, person]);

  const patch = (next: Partial<PersonDraft>) => setDraft((current) => ({ ...current, ...next }));

  const save = async () => {
    if (!familyId || !user || busy || !isAdmin) return;
    const currentYear = new Date().getFullYear();
    const birthYearText = draft.birthYear.trim();
    const deathYearText = draft.deathYear.trim();
    const birthYear = birthYearText ? Number(birthYearText) : null;
    const deathYear = draft.lifeStatus === "deceased" && deathYearText ? Number(deathYearText) : null;

    if (draft.description.trim().length > 2500) {
      showToast({ type: "warning", title: "Note quá dài", message: "Nội dung Note tối đa 2.500 ký tự." });
      return;
    }
    if (!draft.displayName.trim()) {
      showToast({ type: "warning", title: "Thiếu họ tên", message: "Hãy nhập họ và tên của người này." });
      return;
    }
    if (birthYearText && (!Number.isInteger(birthYear) || birthYear! < 1800 || birthYear! > currentYear)) {
      showToast({ type: "warning", title: "Năm sinh chưa hợp lệ", message: "Hãy nhập năm sinh bằng 4 chữ số hợp lệ." });
      return;
    }
    if (deathYearText && draft.lifeStatus === "deceased" && (!Number.isInteger(deathYear) || deathYear! < 1800 || deathYear! > currentYear)) {
      showToast({ type: "warning", title: "Năm mất chưa hợp lệ", message: "Hãy nhập năm mất bằng 4 chữ số hợp lệ." });
      return;
    }
    if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
      showToast({ type: "warning", title: "Mốc thời gian chưa hợp lệ", message: "Năm mất không thể nhỏ hơn năm sinh." });
      return;
    }

    const payload = {
      displayName: draft.displayName.trim(),
      nickname: draft.nickname.trim() || null,
      gender: draft.gender,
      lifeStatus: draft.lifeStatus,
      birthDate: dateToDateOnly(draft.birthDate),
      birthYear,
      deathDate: draft.lifeStatus === "deceased" ? dateToDateOnly(draft.deathDate) : null,
      deathYear: draft.lifeStatus === "deceased" ? deathYear : null,
      birthPlace: draft.birthPlace.trim() || null,
      description: draft.description.trim() || null,
    };

    setBusy(true);
    setAvatarUpload({ phase: "idle", progress: null });
    try {
      let savedPersonId = personId;
      if (personId) {
        await familyGraphMutationService.updatePerson(familyId, personId, payload);
      } else {
        const created = await familyGraphMutationService.createPerson(familyId, { ...payload, linkedUid: draft.linkedUid });
        savedPersonId = created.personId;
      }

      if (savedPersonId && draft.avatarDirty) {
        const oldAvatarAssetId = person?.avatarAssetId ?? null;
        if (!draft.avatarUri) {
          await familyGraphMutationService.setPersonAvatar(familyId, savedPersonId, null, null);
        } else {
          const fileId = `person-avatar-${savedPersonId}-${Date.now()}`;
          setAvatarUpload({ phase: "uploading", progress: null });
          const { asset, result } = await mediaService.uploadManaged(
            avatarFileFromUri(draft.avatarUri, fileId),
            {
              ownerUid: user.uid,
              familyId,
              purpose: "avatar",
              entityType: "person",
              entityId: savedPersonId,
              category: APP_CATEGORIES.PERSONS,
            },
            (value) => setAvatarUpload({ phase: "uploading", progress: Math.max(0, Math.min(100, value)) }),
          );
          try {
            await familyGraphMutationService.setPersonAvatar(familyId, savedPersonId, result.secureUrl, asset.id);
            setAvatarUpload({ phase: "complete", progress: 100 });
          } catch (error) {
            await mediaService.markCleanupPending(asset.id).catch(() => undefined);
            throw error;
          }
        }
        // Cleanup only after the new avatar has been committed. A previous uploader
        // may be another admin; the server enforces ownership and its cron reconciles.
        if (oldAvatarAssetId) {
          void momentMediaApi.requestCleanup([oldAvatarAssetId]).catch(() => undefined);
        }
      }

      let graphNoticeSent = false;
      if (!editing && savedPersonId) {
        try {
          await activityService.createGraphNotice({
            familyId, actorUid: user.uid,
            actorName: userProfile?.displayName || "Người giữ nhà",
            title: `Nhà Mình vừa thêm hồ sơ ${payload.displayName}`,
            body: "Người thân mới đã được ghi vào hồ sơ phả hệ. Sau khi nối quan hệ, người ấy sẽ xuất hiện trên cây.",
            sessionId: `person-created-${savedPersonId}`,
          });
          graphNoticeSent = true;
        } catch {
          // Person save succeeded: failure of a separate activity write must
          // never undo, hide or falsely report a successful Person mutation.
        }
      }
      if (editing || !graphNoticeSent) graphActivitySessionService.record(familyId, {
        kind: editing ? "person_updated" : "person_added",
        personName: payload.displayName,
      });
      showToast({
        type: graphNoticeSent || editing ? "success" : "warning",
        title: editing ? "Đã lưu thay đổi" : graphNoticeSent ? "Đã thêm người và báo cả nhà" : "Đã thêm người, chưa gửi được thông báo",
        message: editing ? "Thông tin đã được cập nhật." : graphNoticeSent ? "Hồ sơ đã lưu; cả nhà có thông báo trong Chuyện trong nhà." : "Hồ sơ đã lưu. Mở Cây nhà và chọn Báo cả nhà để gửi lại.",
        duration: 2600,
      });
      router.back();
    } catch (error) {
      if (draft.avatarDirty) setAvatarUpload({ phase: "failed", progress: null });
      showToast({ ...parseAppError(error), duration: 4200 });
    } finally {
      setBusy(false);
    }
  };

  if (!familyId || !isAdmin) {
    return (
      <ScreenContainer>
        <View style={__a3_styles.centerState}>
          <Ionicons name="lock-closed-outline" size={38} color={__a3Colors.secondaryText} />
          <Text style={__a3_styles.centerTitle}>Phần này đang được người giữ nhà chăm sóc</Text>
          <BloomButton title="Quay lại" variant="outline" onPress={() => router.back()} customStyle={__a3_styles.centerButton} />
        </View>
      </ScreenContainer>
    );
  }

  if (editing && loading && !person) {
    return (
      <ScreenContainer>
        <View style={__a3_styles.centerState}><ActivityIndicator color={__a3Colors.primary} /><Text style={__a3_styles.centerText}>Bloom đang mở thông tin…</Text></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <View style={__a3_styles.root}>
        <BloomHeroHeader
          eyebrow={editing ? "CHỈNH THÔNG TIN" : "NGƯỜI MỚI"}
          title={editing ? "Chăm chút một người trong nhà" : "Thêm một người vào phả hệ"}
          subtitle={editing
            ? "Cập nhật những điều bạn biết là đúng để câu chuyện của người thân luôn rõ ràng và gần gũi."
            : "Ghi lại một người thân trước, rồi Bloom sẽ giúp bạn nối đúng nhánh ở bước tiếp theo."}
          variant="profile"
          onBack={() => router.back()}
        />

        <View style={__a3_styles.body}>
        <BloomKeyboardScreen contentContainerStyle={__a3_styles.content}>
          <View style={__a3_styles.hero}>
            <View style={__a3_styles.heroOrbLarge} />
            <View style={__a3_styles.heroOrbSmall} />
            <View style={__a3_styles.heroIcon}><Ionicons name="flower-outline" size={27} color={__a3Colors.primary} /></View>
            <Text style={__a3_styles.heroTitle}>{editing ? "Chăm chút lại một nhành gia đình" : "Gieo một nhành mới vào Family Bloom"}</Text>
            <Text style={__a3_styles.heroText}>Chỉ lưu những điều bạn biết là đúng. Quan hệ sẽ được nối ở màn riêng sau khi người này được thêm.</Text>
          </View>

          <View style={__a3_styles.card}>
            <BloomInputAvatar
              value={draft.avatarUri}
              pickerScope={user?.uid && familyId ? `person:${user.uid}:${familyId}:${personId || "new"}` : undefined}
              fallbackText={draft.displayName || "Thành viên"}
              disabled={busy}
              size={92}
              upload={avatarUpload}
              onRetry={() => { if (!busy) void save(); }}
              onChange={(avatarUri) => { setAvatarUpload({ phase: "idle", progress: null }); patch({ avatarUri, avatarDirty: true }); }}
            />
            <BloomTextInput label="Họ và tên *" value={draft.displayName} onChangeText={(displayName) => patch({ displayName })} placeholder="Nguyễn Văn An" leftIcon="person-outline" />
            <BloomTextInput label="Tên thường gọi" value={draft.nickname} onChangeText={(nickname) => patch({ nickname })} placeholder="An" leftIcon="happy-outline" />

            <Text style={__a3_styles.fieldLabel}>Giới tính</Text>
            <View style={__a3_styles.chips}>{(["male", "female", "other"] as Gender[]).map((gender) => (
              <BloomChipButton key={gender} label={genderLabel[gender]} selected={draft.gender === gender} onPress={() => patch({ gender })} />
            ))}</View>

            <Text style={[__a3_styles.fieldLabel, __a3_styles.fieldGap]}>Tình trạng</Text>
            <View style={__a3_styles.chips}>{(["living", "deceased", "unknown"] as FamilyPersonLifeStatus[]).map((status) => (
              <BloomChipButton key={status} label={lifeLabel[status]} selected={draft.lifeStatus === status} onPress={() => patch(status === "deceased" ? { lifeStatus: status } : { lifeStatus: status, deathYear: "", deathDate: undefined })} />
            ))}</View>

            <YearDateControl
              label="Năm sinh"
              year={draft.birthYear}
              date={draft.birthDate}
              placeholder="1988"
              maximumDate={new Date()}
              onYearChange={(birthYear) => patch({ birthYear, birthDate: draft.birthDate && birthYear === String(draft.birthDate.getFullYear()) ? draft.birthDate : undefined })}
              onDateChange={(birthDate) => patch({ birthDate, birthYear: String(birthDate.getFullYear()) })}
              onClearDate={() => patch({ birthDate: undefined })}
            />

            {draft.lifeStatus === "deceased" && (
              <>
                <View style={__a3_styles.notice}><Ionicons name="shield-checkmark-outline" size={18} color={__a3Colors.primary} /><Text style={__a3_styles.noticeText}>Nếu chưa chắc ngày/năm mất, bạn có thể để trống và bổ sung sau.</Text></View>
                <YearDateControl
                  label="Năm mất"
                  year={draft.deathYear}
                  date={draft.deathDate}
                  placeholder="2020"
                  minimumDate={draft.birthDate}
                  maximumDate={new Date()}
                  onYearChange={(deathYear) => patch({ deathYear, deathDate: draft.deathDate && deathYear === String(draft.deathDate.getFullYear()) ? draft.deathDate : undefined })}
                  onDateChange={(deathDate) => patch({ deathDate, deathYear: String(deathDate.getFullYear()) })}
                  onClearDate={() => patch({ deathDate: undefined })}
                />
              </>
            )}

            <BloomTextInput label="Nơi sinh" value={draft.birthPlace} onChangeText={(birthPlace) => patch({ birthPlace })} placeholder="Hà Nội" leftIcon="location-outline" />
            <View style={__a3_styles.fieldGap}>
              <View style={__a3_styles.cardTitleRow}>
                <View style={__a3_styles.softIcon}><Ionicons name="document-text-outline" size={18} color={__a3Colors.primary} /></View>
                <View style={__a3_styles.cardTitleCopy}>
                  <Text style={__a3_styles.cardTitle}>Câu chuyện / Note về người thân</Text>
                  <Text style={__a3_styles.cardSubtitle}>Nội dung hiện có trong hồ sơ sẽ xuất hiện trên node cây phả hệ</Text>
                </View>
              </View>
              <BloomTextInput
                label={`Nội dung Note (không bắt buộc) · ${draft.description.length}/2500`}
                value={draft.description}
                onChangeText={(description) => patch({ description })}
                maxLength={2500}
                multiline
                placeholder="Kỷ niệm, lời nhắn, một điều đáng nhớ về người thân…"
                leftIcon="document-text-outline"
                helperText="Viết đôi điều về người thân. Ghi chú sẽ hiện trên cây gia đình sau khi lưu."
              />
            </View>
          </View>

          {!editing && availableMembers.length > 0 && (
            <View style={__a3_styles.card}>
              <View style={__a3_styles.cardTitleRow}>
                <View style={__a3_styles.softIcon}><Ionicons name="link-outline" size={18} color={__a3Colors.primary} /></View>
                <View style={__a3_styles.cardTitleCopy}><Text style={__a3_styles.cardTitle}>Liên kết tài khoản</Text><Text style={__a3_styles.cardSubtitle}>Không bắt buộc · có thể làm sau</Text></View>
              </View>
              <View style={__a3_styles.memberChips}>
                <BloomChipButton label="Không liên kết" selected={!draft.linkedUid} onPress={() => patch({ linkedUid: null })} />
                {availableMembers.map((member) => (
                  <BloomChipButton key={member.uid} label={member.displayName} selected={draft.linkedUid === member.uid} onPress={() => patch({ linkedUid: member.uid })} />
                ))}
              </View>
            </View>
          )}

          <View style={__a3_styles.saveCard}>
            <View style={__a3_styles.saveCopy}><Text style={__a3_styles.saveTitle}>{editing ? "Sẵn sàng lưu thay đổi?" : "Người mới chưa có mối quan hệ"}</Text><Text style={__a3_styles.saveText}>{editing ? "Bloom sẽ giữ nguyên các đường nối hiện có." : "Sau khi lưu, dùng màn “Nối quan hệ” để đưa người này vào đúng nhánh."}</Text></View>
            <BloomButton title={editing ? "Lưu thay đổi" : "Thêm người"} icon="checkmark-circle-outline" isLoading={busy} disabled={busy} onPress={() => void save()} />
          </View>
        </BloomKeyboardScreen>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  body: { flex: 1, marginTop: -18, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden", backgroundColor: COLORS.background },
  content: { paddingHorizontal: 16, paddingTop: 28, paddingBottom: 36, gap: 14 },
  hero: { overflow: "hidden", borderRadius: 26, backgroundColor: COLORS.surface, padding: 20, borderWidth: 1, borderColor: COLORS.border, minHeight: 176 },
  heroOrbLarge: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: COLORS.softSurface, right: -45, top: -55, opacity: 0.7 },
  heroOrbSmall: { position: "absolute", width: 74, height: 74, borderRadius: 37, backgroundColor: COLORS.softSurface, right: 42, bottom: -28, opacity: 0.7 },
  heroIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: COLORS.border },
  heroTitle: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900", maxWidth: "82%" },
  heroText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, fontWeight: "600", maxWidth: "88%", marginTop: 7 },
  card: { backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
  fieldLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900", marginBottom: 8 },
  fieldGap: { marginTop: 16 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  dateBlock: { marginTop: 16 },
  dateRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  yearInput: { flex: 1, marginBottom: 0 },
  dateButton: { minHeight: 52, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  dateButtonText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "800" },
  clearDateButton: { alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  clearDateText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  notice: { marginTop: 14, flexDirection: "row", gap: 9, alignItems: "flex-start", padding: 12, borderRadius: 17, backgroundColor: COLORS.surface },
  noticeText: { flex: 1, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "600" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  softIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  cardTitleCopy: { flex: 1 },
  cardTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  cardSubtitle: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600", marginTop: 2 },
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  saveCard: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 24, padding: 16, gap: 14 },
  saveCopy: { gap: 4 },
  saveTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  saveText: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "600" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  centerTitle: { color: COLORS.primaryText, fontSize: 16, lineHeight: 22, fontWeight: "900", textAlign: "center" },
  centerText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "600" },
  centerButton: { minWidth: 160, marginTop: 6 },
  pressed: { opacity: 0.65 },
}));
