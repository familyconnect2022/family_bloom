import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton, BloomChipButton } from "../components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomInputAvatar, BloomTextInput } from "../components/ui/BloomInputComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { APP_CATEGORIES } from "../constants/appPaths";
import { parseAppError } from "../constants/errorConstants";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useFamilyGraph } from "../hooks/useFamilyGraph";
import { useFamilyMembers } from "../hooks/useFamilyMembers";
import { familyGraphMutationService } from "../services/familyGraph/familyGraphMutationService";
import { mediaService } from "../services/media/mediaService";
import type { FamilyPersonLifeStatus } from "../types/familyGraph";
import type { Gender } from "../types/user";

const genderLabel: Record<Gender, string> = { male: "Nam", female: "Nữ", other: "Khác" };
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
  gender: "male",
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
  return (
    <View style={styles.dateBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.dateRow}>
        <BloomTextInput
          value={year}
          onChangeText={(value) => onYearChange(value.replace(/[^0-9]/g, "").slice(0, 4))}
          keyboardType="number-pad"
          placeholder={placeholder}
          containerStyle={styles.yearInput}
        />
        <BloomDatePicker
          selectedDate={date}
          onDateChange={onDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          trigger={(open) => (
            <Pressable onPress={open} style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
              <Text style={styles.dateButtonText}>{date ? "Đổi ngày" : "Chọn ngày"}</Text>
            </Pressable>
          )}
        />
      </View>
      {!!date && (
        <Pressable onPress={onClearDate} style={styles.clearDateButton}>
          <Ionicons name="close-circle-outline" size={15} color={COLORS.secondaryText} />
          <Text style={styles.clearDateText}>Chỉ giữ năm</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function FamilyGraphPersonEditorScreen() {
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

    if (!draft.displayName.trim()) {
      showToast({ type: "info", title: "Thiếu họ tên", message: "Hãy nhập họ và tên của người này." });
      return;
    }
    if (birthYearText && (!Number.isInteger(birthYear) || birthYear! < 1800 || birthYear! > currentYear)) {
      showToast({ type: "info", title: "Năm sinh chưa hợp lệ", message: "Hãy nhập năm sinh bằng 4 chữ số hợp lệ." });
      return;
    }
    if (deathYearText && draft.lifeStatus === "deceased" && (!Number.isInteger(deathYear) || deathYear! < 1800 || deathYear! > currentYear)) {
      showToast({ type: "info", title: "Năm mất chưa hợp lệ", message: "Hãy nhập năm mất bằng 4 chữ số hợp lệ." });
      return;
    }
    if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
      showToast({ type: "info", title: "Mốc thời gian chưa hợp lệ", message: "Năm mất không thể nhỏ hơn năm sinh." });
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
    try {
      let savedPersonId = personId;
      if (personId) {
        await familyGraphMutationService.updatePerson(familyId, personId, payload);
      } else {
        const created = await familyGraphMutationService.createPerson(familyId, { ...payload, linkedUid: draft.linkedUid });
        savedPersonId = created.personId;
      }

      if (savedPersonId && draft.avatarDirty) {
        if (!draft.avatarUri) {
          await familyGraphMutationService.setPersonAvatar(familyId, savedPersonId, null, null);
        } else {
          const fileId = `person-avatar-${savedPersonId}-${Date.now()}`;
          const { asset, result } = await mediaService.uploadManaged(
            {
              id: fileId,
              uri: draft.avatarUri,
              type: "image",
              mimeType: "image/jpeg",
              fileName: `${fileId}.jpg`,
              purpose: "avatar",
            },
            {
              ownerUid: user.uid,
              familyId,
              purpose: "avatar",
              entityType: "person",
              entityId: savedPersonId,
              category: APP_CATEGORIES.PERSONS,
            },
          );
          try {
            await familyGraphMutationService.setPersonAvatar(familyId, savedPersonId, result.secureUrl, asset.id);
          } catch (error) {
            await mediaService.markCleanupPending(asset.id).catch(() => undefined);
            throw error;
          }
        }
      }

      showToast({
        type: "success",
        title: editing ? "Đã lưu thay đổi" : "Đã thêm người",
        message: editing ? "Thông tin Person đã được cập nhật." : "Người mới đã sẵn sàng để nối vào cây.",
        duration: 2600,
      });
      router.back();
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 4200 });
    } finally {
      setBusy(false);
    }
  };

  if (!familyId || !isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.centerState}>
          <Ionicons name="lock-closed-outline" size={38} color={COLORS.secondaryText} />
          <Text style={styles.centerTitle}>Chỉ Owner/Admin mới được chỉnh Person</Text>
          <BloomButton title="Quay lại" variant="outline" onPress={() => router.back()} customStyle={styles.centerButton} />
        </View>
      </ScreenContainer>
    );
  }

  if (editing && loading && !person) {
    return (
      <ScreenContainer>
        <View style={styles.centerState}><ActivityIndicator color={COLORS.primary} /><Text style={styles.centerText}>Bloom đang mở thông tin…</Text></View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
            <Ionicons name="chevron-back" size={23} color={COLORS.primaryText} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>{editing ? "CHỈNH THÔNG TIN" : "NGƯỜI MỚI"}</Text>
            <Text style={styles.headerTitle}>{editing ? "Sửa Person" : "Thêm Person"}</Text>
          </View>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        <BloomKeyboardScreen contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <View style={styles.heroOrbLarge} />
            <View style={styles.heroOrbSmall} />
            <View style={styles.heroIcon}><Ionicons name="flower-outline" size={27} color={COLORS.primary} /></View>
            <Text style={styles.heroTitle}>{editing ? "Chăm chút lại một nhành gia đình" : "Gieo một nhành mới vào Family Bloom"}</Text>
            <Text style={styles.heroText}>Chỉ lưu những điều bạn biết là đúng. Quan hệ sẽ được nối ở màn riêng sau khi Person được tạo.</Text>
          </View>

          <View style={styles.card}>
            <BloomInputAvatar
              value={draft.avatarUri}
              fallbackText={draft.displayName || "Thành viên"}
              disabled={busy}
              size={92}
              onChange={(avatarUri) => patch({ avatarUri, avatarDirty: true })}
            />
            <BloomTextInput label="Họ và tên *" value={draft.displayName} onChangeText={(displayName) => patch({ displayName })} placeholder="Nguyễn Văn An" leftIcon="person-outline" />
            <BloomTextInput label="Tên thường gọi" value={draft.nickname} onChangeText={(nickname) => patch({ nickname })} placeholder="An" leftIcon="happy-outline" />

            <Text style={styles.fieldLabel}>Giới tính</Text>
            <View style={styles.chips}>{(["male", "female", "other"] as Gender[]).map((gender) => (
              <BloomChipButton key={gender} label={genderLabel[gender]} selected={draft.gender === gender} onPress={() => patch({ gender })} />
            ))}</View>

            <Text style={[styles.fieldLabel, styles.fieldGap]}>Tình trạng</Text>
            <View style={styles.chips}>{(["living", "deceased", "unknown"] as FamilyPersonLifeStatus[]).map((status) => (
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
                <View style={styles.notice}><Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} /><Text style={styles.noticeText}>Nếu chưa chắc ngày/năm mất, bạn có thể để trống và bổ sung sau.</Text></View>
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
            <BloomTextInput label="Một vài dòng về người này" value={draft.description} onChangeText={(description) => patch({ description })} placeholder="Kỷ niệm, nghề nghiệp, nét đặc biệt…" multiline leftIcon="leaf-outline" />
          </View>

          {!editing && availableMembers.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <View style={styles.softIcon}><Ionicons name="link-outline" size={18} color={COLORS.primary} /></View>
                <View style={styles.cardTitleCopy}><Text style={styles.cardTitle}>Liên kết tài khoản</Text><Text style={styles.cardSubtitle}>Không bắt buộc · có thể làm sau</Text></View>
              </View>
              <View style={styles.memberChips}>
                <BloomChipButton label="Không liên kết" selected={!draft.linkedUid} onPress={() => patch({ linkedUid: null })} />
                {availableMembers.map((member) => (
                  <BloomChipButton key={member.uid} label={member.displayName} selected={draft.linkedUid === member.uid} onPress={() => patch({ linkedUid: member.uid })} />
                ))}
              </View>
            </View>
          )}

          <View style={styles.saveCard}>
            <View style={styles.saveCopy}><Text style={styles.saveTitle}>{editing ? "Sẵn sàng lưu thay đổi?" : "Person sẽ chưa tự sinh quan hệ"}</Text><Text style={styles.saveText}>{editing ? "Bloom sẽ giữ nguyên các đường nối hiện có." : "Sau khi lưu, dùng màn “Nối quan hệ” để đưa người này vào đúng nhánh."}</Text></View>
            <BloomButton title={editing ? "Lưu thay đổi" : "Tạo Person"} icon="checkmark-circle-outline" isLoading={busy} disabled={busy} onPress={() => void save()} />
          </View>
        </BloomKeyboardScreen>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border, marginHorizontal: -2 },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  headerButtonPlaceholder: { width: 42 },
  headerCopy: { flex: 1, alignItems: "center" },
  eyebrow: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 1.1 },
  headerTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", marginTop: 2 },
  content: { paddingTop: 14, paddingBottom: 36, gap: 14 },
  hero: { overflow: "hidden", borderRadius: 26, backgroundColor: "#FFF1F5", padding: 20, borderWidth: 1, borderColor: "#F5D8E2", minHeight: 176 },
  heroOrbLarge: { position: "absolute", width: 150, height: 150, borderRadius: 75, backgroundColor: "#F9D7E3", right: -45, top: -55, opacity: 0.7 },
  heroOrbSmall: { position: "absolute", width: 74, height: 74, borderRadius: 37, backgroundColor: "#F3DCEB", right: 42, bottom: -28, opacity: 0.7 },
  heroIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1, borderColor: "#F4CEDB" },
  heroTitle: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900", maxWidth: "82%" },
  heroText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, fontWeight: "600", maxWidth: "88%", marginTop: 7 },
  card: { backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, padding: 16 },
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
  notice: { marginTop: 14, flexDirection: "row", gap: 9, alignItems: "flex-start", padding: 12, borderRadius: 17, backgroundColor: "#FFF6F8" },
  noticeText: { flex: 1, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "600" },
  cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  softIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: "#FFF0F4", alignItems: "center", justifyContent: "center" },
  cardTitleCopy: { flex: 1 },
  cardTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  cardSubtitle: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600", marginTop: 2 },
  memberChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  saveCard: { backgroundColor: "#FFF9FB", borderWidth: 1, borderColor: "#F3D9E2", borderRadius: 24, padding: 16, gap: 14 },
  saveCopy: { gap: 4 },
  saveTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  saveText: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "600" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  centerTitle: { color: COLORS.primaryText, fontSize: 16, lineHeight: 22, fontWeight: "900", textAlign: "center" },
  centerText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "600" },
  centerButton: { minWidth: 160, marginTop: 6 },
  pressed: { opacity: 0.65 },
});
