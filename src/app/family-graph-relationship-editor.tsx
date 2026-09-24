import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, SectionList, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton, BloomChipButton } from "../components/ui/BloomButtonComponents";
import { BloomTextInput } from "../components/ui/BloomInputComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { parseAppError } from "../constants/errorConstants";
import { COLORS } from "../constants/theme";
import { useAuth } from "../context/AuthContext";
import { useFamilyGraph } from "../hooks/useFamilyGraph";
import { familyGraphMutationService } from "../services/familyGraph/familyGraphMutationService";
import type { FamilyPerson, FamilyRelationship, ParentChildSubtype, PartnerStatus } from "../types/familyGraph";
import { compareDisplayNamesByGivenName, getGivenNameInitial, groupByGivenNameInitial } from "../utils/personName";

type RelationshipMode = "parent_of" | "child_of" | "partner";
type PickerSide = "base" | "target";

const parentSubtypeLabel: Record<ParentChildSubtype, string> = {
  biological: "Con ruột",
  adoptive: "Con nuôi",
  step: "Con kế",
  unknown: "Chưa rõ",
};
const partnerStatusLabel: Record<PartnerStatus, string> = {
  partner: "Bạn đời",
  married: "Vợ/Chồng",
  separated: "Ly thân",
  divorced: "Ly hôn",
  widowed: "Góa",
};
const genderLabel = { male: "Nam", female: "Nữ", other: "Khác" } as const;

const joinNames = (names: string[]) => {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} và ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
};

const relationshipSentence = (
  mode: RelationshipMode,
  subtype: ParentChildSubtype,
  partnerStatus: PartnerStatus,
  selectedNames: string[],
  referenceNames: string[],
) => {
  if (!selectedNames.length || !referenceNames.length) return "Chọn đủ hai phía để Bloom kiểm tra các đường quan hệ sẽ tạo.";
  if (mode === "partner") return `${joinNames(selectedNames)} là ${partnerStatusLabel[partnerStatus].toLowerCase()} của ${joinNames(referenceNames)}.`;
  const relation = subtype === "biological" ? "ruột" : subtype === "adoptive" ? "nuôi" : subtype === "step" ? "kế" : "";
  return mode === "parent_of"
    ? `${joinNames(selectedNames)} là cha/mẹ${relation ? ` ${relation}` : ""} của ${joinNames(referenceNames)}.`
    : `${joinNames(selectedNames)} là con${relation ? ` ${relation}` : ""} của ${joinNames(referenceNames)}.`;
};

const PickerRow = memo(function PickerRow({
  person,
  selected,
  branchCount,
  onToggle,
}: {
  person: FamilyPerson;
  selected: boolean;
  branchCount: number;
  onToggle: (id: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onToggle(person.id)}
      style={({ pressed }) => [styles.personRow, selected && styles.personRowSelected, pressed && styles.pressed]}
    >
      <View style={[styles.avatar, selected && styles.avatarSelected]}><Text style={[styles.avatarText, selected && styles.avatarTextSelected]}>{getGivenNameInitial(person.displayName)}</Text></View>
      <View style={styles.personCopy}>
        <Text style={styles.personName} numberOfLines={1}>{person.displayName}</Text>
        <Text style={styles.personMeta} numberOfLines={1}>{genderLabel[person.gender]} · {person.birthYear ?? "chưa rõ năm sinh"}</Text>
      </View>
      <View style={[styles.branchBadge, branchCount === 0 && styles.branchBadgeEmpty]}>
        <Ionicons name="git-branch-outline" size={12} color={branchCount ? COLORS.primary : COLORS.secondaryText} />
        <Text style={[styles.branchText, branchCount === 0 && styles.branchTextEmpty]}>{branchCount}</Text>
      </View>
      <View style={[styles.multiCheck, selected && styles.multiCheckSelected]}>
        {selected && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
      </View>
    </Pressable>
  );
});

export default function FamilyGraphRelationshipEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ basePersonId?: string; mode?: string }>();
  const initialBasePersonId = typeof params.basePersonId === "string" && params.basePersonId ? params.basePersonId : null;
  const initialMode: RelationshipMode = params.mode === "child_of" || params.mode === "partner" ? params.mode : "parent_of";
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const membership = families.find((item) => item.familyId === familyId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const { snapshot, loading, error } = useFamilyGraph(familyId, user?.uid);

  const [mode, setMode] = useState<RelationshipMode>(initialMode);
  const [subtype, setSubtype] = useState<ParentChildSubtype>("unknown");
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus>("married");
  const [baseIds, setBaseIds] = useState<string[]>(initialBasePersonId ? [initialBasePersonId] : []);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [pickerSide, setPickerSide] = useState<PickerSide | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMode(initialMode);
    setBaseIds(initialBasePersonId ? [initialBasePersonId] : []);
    setTargetIds([]);
  }, [initialBasePersonId, initialMode]);

  const peopleById = useMemo(() => new Map(snapshot.persons.map((person) => [person.id, person])), [snapshot.persons]);
  const relationshipCountByPerson = useMemo(() => {
    const counts = new Map<string, number>();
    snapshot.relationships.forEach((relationship) => {
      counts.set(relationship.personAId, (counts.get(relationship.personAId) ?? 0) + 1);
      counts.set(relationship.personBId, (counts.get(relationship.personBId) ?? 0) + 1);
    });
    return counts;
  }, [snapshot.relationships]);
  const parentRelationshipByPair = useMemo(() => {
    const map = new Map<string, FamilyRelationship>();
    snapshot.relationships.forEach((relationship) => {
      if (relationship.type === "parent_child") map.set(`${relationship.personAId}::${relationship.personBId}`, relationship);
    });
    return map;
  }, [snapshot.relationships]);
  const partnerPairs = useMemo(() => {
    const pairs = new Set<string>();
    snapshot.relationships.forEach((relationship) => {
      if (relationship.type !== "partner") return;
      pairs.add([relationship.personAId, relationship.personBId].sort().join("::"));
    });
    return pairs;
  }, [snapshot.relationships]);

  const sortedPeople = useMemo(() => [...snapshot.persons].sort(compareDisplayNamesByGivenName), [snapshot.persons]);
  const searchIndex = useMemo(() => new Map(sortedPeople.map((person) => [person.id, `${person.displayName} ${person.nickname ?? ""}`.toLocaleLowerCase("vi")])), [sortedPeople]);
  const activeIds = pickerSide === "base" ? baseIds : targetIds;
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds]);
  const blockedIds = useMemo(() => new Set(pickerSide === "base" ? targetIds : baseIds), [baseIds, pickerSide, targetIds]);
  const normalizedSearch = search.trim().toLocaleLowerCase("vi");
  const pickerPeople = useMemo(() => sortedPeople.filter((person) => !blockedIds.has(person.id) && (!normalizedSearch || searchIndex.get(person.id)?.includes(normalizedSearch))), [blockedIds, normalizedSearch, searchIndex, sortedPeople]);
  const pickerSections = useMemo(() => groupByGivenNameInitial(pickerPeople), [pickerPeople]);

  const parentIds = mode === "parent_of" ? baseIds : targetIds;
  const childIds = mode === "parent_of" ? targetIds : baseIds;
  const batchStats = useMemo(() => {
    if (mode === "partner") {
      const a = baseIds[0];
      const b = targetIds[0];
      const exists = !!a && !!b && partnerPairs.has([a, b].sort().join("::"));
      return { requested: a && b ? 1 : 0, existing: exists ? 1 : 0, conflict: 0 };
    }
    let existing = 0;
    let conflict = 0;
    parentIds.forEach((parentId) => childIds.forEach((childId) => {
      const relation = parentRelationshipByPair.get(`${parentId}::${childId}`);
      if (!relation) return;
      if ((relation.subtype ?? "unknown") === subtype) existing += 1;
      else conflict += 1;
    }));
    return { requested: parentIds.length * childIds.length, existing, conflict };
  }, [baseIds, childIds, mode, parentIds, parentRelationshipByPair, partnerPairs, subtype, targetIds]);

  const selectedNames = useMemo(() => baseIds.map((id) => peopleById.get(id)?.displayName).filter((value): value is string => !!value), [baseIds, peopleById]);
  const referenceNames = useMemo(() => targetIds.map((id) => peopleById.get(id)?.displayName).filter((value): value is string => !!value), [peopleById, targetIds]);
  const preview = relationshipSentence(mode, subtype, partnerStatus, selectedNames, referenceNames);

  const changeMode = (nextMode: RelationshipMode) => {
    setMode(nextMode);
    if (nextMode === "partner") {
      setBaseIds((current) => current.slice(0, 1));
      setTargetIds((current) => current.slice(0, 1));
    }
  };

  const togglePerson = useCallback((personId: string) => {
    if (!pickerSide) return;
    const single = mode === "partner";
    const toggle = (current: string[]) => single
      ? (current[0] === personId ? [] : [personId])
      : (current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId]);
    if (pickerSide === "base") setBaseIds(toggle);
    else setTargetIds(toggle);
  }, [mode, pickerSide]);

  const submit = async () => {
    if (!familyId || busy || !baseIds.length || !targetIds.length) {
      if (!busy) showToast({ type: "info", title: "Chưa đủ người", message: "Hãy chọn người ở cả hai phía của mối quan hệ." });
      return;
    }
    setBusy(true);
    try {
      if (mode === "partner") {
        const a = baseIds[0];
        const b = targetIds[0];
        if (!a || !b || a === b || batchStats.existing > 0) {
          showToast({ type: "info", title: "Chưa thể nối", message: batchStats.existing ? "Quan hệ vợ/chồng này đã tồn tại." : "Hãy chọn đúng hai người khác nhau." });
          return;
        }
        await familyGraphMutationService.createRelationship(familyId, { type: "partner", personAId: a, personBId: b, partnerStatus });
        showToast({ type: "success", title: "Đã nối gia phả", message: "Quan hệ vợ/chồng đã được tạo.", duration: 2600 });
        router.back();
        return;
      }

      if (batchStats.conflict > 0) {
        showToast({ type: "info", title: "Có quan hệ xung đột", message: "Một số đường đã tồn tại nhưng khác loại. Hãy sửa hoặc xóa đường cũ trước." });
        return;
      }
      const result = await familyGraphMutationService.createParentChildRelationshipsBatch(familyId, { parentIds, childIds, subtype });
      const created = result.createdRelationshipIds.length;
      const existing = result.existingRelationshipIds.length;
      showToast({
        type: "success",
        title: created ? "Đã nối gia phả" : "Quan hệ đã có",
        message: created ? `Đã tạo ${created} đường${existing ? ` · ${existing} đường đã có` : ""}.` : `${existing} đường đã tồn tại, dữ liệu được giữ nguyên.`,
        duration: 3000,
      });
      router.back();
    } catch (nextError) {
      showToast({ ...parseAppError(nextError), duration: 4200 });
    } finally {
      setBusy(false);
    }
  };

  const renderSelected = (side: PickerSide, ids: string[], title: string, subtitle: string) => {
    const selected = ids.map((id) => peopleById.get(id)).filter((person): person is FamilyPerson => !!person);
    return (
      <View style={styles.selectCard}>
        <View style={styles.selectTop}>
          <View style={styles.selectCopy}><Text style={styles.selectTitle}>{title}</Text><Text style={styles.selectSubtitle}>{selected.length ? `${selected.length} người đã chọn` : subtitle}</Text></View>
          <Pressable onPress={() => { setSearch(""); setPickerSide(side); }} style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed]}>
            <Ionicons name={selected.length ? "people-outline" : "person-add-outline"} size={17} color={COLORS.primary} />
            <Text style={styles.chooseButtonText}>{selected.length ? "Chọn lại" : "Chọn người"}</Text>
          </Pressable>
        </View>
        {selected.length > 0 && <View style={styles.selectedList}>{selected.map((person) => (
          <View key={person.id} style={styles.selectedPerson}>
            <View style={styles.selectedAvatar}><Text style={styles.selectedAvatarText}>{getGivenNameInitial(person.displayName)}</Text></View>
            <Text style={styles.selectedName} numberOfLines={1}>{person.displayName}</Text>
            <View style={styles.miniBranch}><Ionicons name="git-branch-outline" size={11} color={COLORS.primary} /><Text style={styles.miniBranchText}>{relationshipCountByPerson.get(person.id) ?? 0}</Text></View>
            <Pressable hitSlop={7} onPress={() => side === "base" ? setBaseIds(ids.filter((id) => id !== person.id)) : setTargetIds(ids.filter((id) => id !== person.id))}><Ionicons name="close-circle" size={19} color={COLORS.secondaryText} /></Pressable>
          </View>
        ))}</View>}
      </View>
    );
  };

  if (!familyId || !isAdmin) {
    return <ScreenContainer><View style={styles.centerState}><Ionicons name="lock-closed-outline" size={38} color={COLORS.secondaryText} /><Text style={styles.centerTitle}>Chỉ Owner/Admin mới được nối phả hệ</Text><BloomButton title="Quay lại" variant="outline" onPress={() => router.back()} /></View></ScreenContainer>;
  }

  if (loading && snapshot.persons.length === 0) {
    return <ScreenContainer><View style={styles.centerState}><ActivityIndicator color={COLORS.primary} /><Text style={styles.centerText}>Bloom đang chuẩn bị danh sách Person…</Text></View></ScreenContainer>;
  }

  if (error) {
    return <ScreenContainer><View style={styles.centerState}><Ionicons name="cloud-offline-outline" size={38} color={COLORS.secondaryText} /><Text style={styles.centerTitle}>Chưa tải được dữ liệu phả hệ</Text><BloomButton title="Quay lại" variant="outline" onPress={() => router.back()} /></View></ScreenContainer>;
  }

  if (pickerSide) {
    const sideLabel = pickerSide === "base" ? (mode === "child_of" ? "Chọn người con" : mode === "partner" ? "Chọn người thứ nhất" : "Chọn cha/mẹ") : (mode === "child_of" ? "Chọn cha/mẹ" : mode === "partner" ? "Chọn người thứ hai" : "Chọn người con");
    return (
      <ScreenContainer>
        <View style={styles.root}>
          <View style={styles.header}>
            <Pressable onPress={() => setPickerSide(null)} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}><Ionicons name="chevron-back" size={23} color={COLORS.primaryText} /></Pressable>
            <View style={styles.headerCopy}><Text style={styles.eyebrow}>CHỌN PERSON</Text><Text style={styles.headerTitle}>{sideLabel}</Text></View>
            <Pressable onPress={() => setPickerSide(null)} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}><Text style={styles.doneText}>Xong</Text></Pressable>
          </View>
          <SectionList
            sections={pickerSections}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={7}
            updateCellsBatchingPeriod={55}
            windowSize={5}
            removeClippedSubviews={Platform.OS === "android"}
            contentContainerStyle={styles.pickerContent}
            ListHeaderComponent={(
              <View style={styles.pickerHeader}>
                <View style={styles.pickerHero}><View style={styles.pickerHeroIcon}><Ionicons name="people-outline" size={22} color={COLORS.primary} /></View><View style={styles.pickerHeroCopy}><Text style={styles.pickerHeroTitle}>{activeIds.length ? `${activeIds.length} người đang được chọn` : "Chưa chọn ai"}</Text><Text style={styles.pickerHeroText}>Sắp xếp theo tên gọi · số bên phải là số nhánh đang nối.</Text></View></View>
                <BloomTextInput value={search} onChangeText={setSearch} placeholder="Tìm theo tên…" isSearch leftIcon="search-outline" />
              </View>
            )}
            renderSectionHeader={({ section }) => <View style={styles.alphaHeader}><Text style={styles.alphaLetter}>{section.title}</Text><View style={styles.alphaLine} /><Text style={styles.alphaCount}>{section.data.length}</Text></View>}
            renderItem={({ item }) => <PickerRow person={item} selected={activeIdSet.has(item.id)} branchCount={relationshipCountByPerson.get(item.id) ?? 0} onToggle={togglePerson} />}
            ListEmptyComponent={<View style={styles.emptyPicker}><Ionicons name="search-outline" size={28} color={COLORS.secondaryText} /><Text style={styles.emptyPickerText}>Không tìm thấy Person phù hợp.</Text></View>}
          />
        </View>
      </ScreenContainer>
    );
  }

  const disabled = busy || !baseIds.length || !targetIds.length || batchStats.conflict > 0 || (mode === "partner" && (baseIds.length !== 1 || targetIds.length !== 1 || batchStats.existing > 0));

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}><Ionicons name="chevron-back" size={23} color={COLORS.primaryText} /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>DG-11 · SỰ THẬT PHẢ HỆ</Text><Text style={styles.headerTitle}>Nối quan hệ</Text></View>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <View style={styles.heroBubbleOne} /><View style={styles.heroBubbleTwo} />
            <View style={styles.heroIcon}><Ionicons name="git-branch-outline" size={25} color={COLORS.primary} /></View>
            <Text style={styles.heroTitle}>Nối đúng người, cây sẽ tự kể đúng câu chuyện</Text>
            <Text style={styles.heroText}>Bloom không tự suy đoán quan hệ. Chỉ những Person bạn chọn và xác nhận mới trở thành đường nối thật.</Text>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>1</Text></View>
              <View style={styles.sectionTitleCopy}>
                <Text style={styles.sectionTitle}>Người được chọn</Text>
                <Text style={styles.sectionSubtitle}>{mode === "partner" ? "Quan hệ vợ/chồng chọn 1 người ở mỗi phía." : "Có thể chọn nhiều người cùng lúc."}</Text>
              </View>
            </View>
            {renderSelected("base", baseIds, mode === "child_of" ? "Người con" : mode === "partner" ? "Người thứ nhất" : "Cha/Mẹ", mode === "partner" ? "Chọn 1 người" : "Chọn một hoặc nhiều Person")}
          </View>

          <View style={[styles.sectionCard, styles.relationTypeCard]}>
            <View style={styles.sectionTitleRow}>
              <View style={[styles.sectionNumber, styles.sectionNumberSoft]}><Text style={styles.sectionNumberText}>2</Text></View>
              <View style={styles.sectionTitleCopy}>
                <Text style={styles.sectionTitle}>Loại quan hệ</Text>
                <Text style={styles.sectionSubtitle}>Chọn chiều quan hệ trước khi xác nhận.</Text>
              </View>
            </View>
            <View style={styles.modeRow}>
              <BloomChipButton label="Cha/Mẹ → Con" selected={mode === "parent_of"} onPress={() => changeMode("parent_of")} />
              <BloomChipButton label="Con → Cha/Mẹ" selected={mode === "child_of"} onPress={() => changeMode("child_of")} />
              <BloomChipButton label="Vợ/Chồng" selected={mode === "partner"} onPress={() => changeMode("partner")} />
            </View>
            {mode === "partner" ? (
              <>
                <View style={styles.partnerNotice}>
                  <Ionicons name="heart-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.partnerNoticeText}>Vợ/chồng là quan hệ 1 ↔ 1, nên Bloom chỉ giữ một người ở mỗi phía.</Text>
                </View>
                <Text style={styles.optionLabel}>Trạng thái</Text>
                <View style={styles.modeRow}>{(["married", "partner", "separated", "divorced", "widowed"] as PartnerStatus[]).map((status) => <BloomChipButton key={status} label={partnerStatusLabel[status]} selected={partnerStatus === status} onPress={() => setPartnerStatus(status)} />)}</View>
              </>
            ) : (
              <>
                <Text style={styles.optionLabel}>Loại cha/mẹ – con</Text>
                <View style={styles.modeRow}>{(["biological", "adoptive", "step", "unknown"] as ParentChildSubtype[]).map((value) => <BloomChipButton key={value} label={parentSubtypeLabel[value]} selected={subtype === value} onPress={() => setSubtype(value)} />)}</View>
              </>
            )}
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionNumber}><Text style={styles.sectionNumberText}>3</Text></View>
              <View style={styles.sectionTitleCopy}>
                <Text style={styles.sectionTitle}>Người tham chiếu</Text>
                <Text style={styles.sectionSubtitle}>{mode === "partner" ? "Chọn người còn lại để tạo cặp 1 ↔ 1." : "Có thể chọn nhiều người để tạo N × M đường quan hệ."}</Text>
              </View>
            </View>
            {renderSelected("target", targetIds, mode === "child_of" ? "Cha/Mẹ" : mode === "partner" ? "Người thứ hai" : "Người con", mode === "partner" ? "Chọn 1 người" : "Chọn một hoặc nhiều Person")}
          </View>

          <View style={[styles.previewCard, batchStats.conflict > 0 && styles.previewCardWarning]}>
            <View style={styles.previewIcon}><Ionicons name={batchStats.conflict > 0 ? "warning-outline" : "sparkles-outline"} size={20} color={batchStats.conflict > 0 ? "#B36B32" : COLORS.primary} /></View>
            <View style={styles.previewCopy}>
              <Text style={styles.previewTitle}>Bloom sẽ ghi nhận</Text>
              <Text style={styles.previewSentence}>{preview}</Text>
              {batchStats.requested > 0 && <Text style={[styles.previewMeta, batchStats.conflict > 0 && styles.previewMetaWarning]}>{mode === "partner" ? (batchStats.existing ? "Quan hệ này đã tồn tại." : "Sẽ tạo 1 đường quan hệ.") : batchStats.conflict ? `${batchStats.conflict} đường đang xung đột loại quan hệ.` : `${batchStats.requested} đường kiểm tra · ${batchStats.requested - batchStats.existing} mới · ${batchStats.existing} đã có.`}</Text>}
            </View>
          </View>

          <BloomButton title={mode === "partner" ? "Tạo mối quan hệ" : `Nối ${Math.max(0, batchStats.requested - batchStats.existing)} đường quan hệ`} icon="git-branch-outline" isLoading={busy} disabled={disabled} onPress={() => void submit()} customStyle={styles.submitButton} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { height: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerButtonPlaceholder: { width: 42 },
  doneButton: { minWidth: 52, height: 38, borderRadius: 18, backgroundColor: "#FFF0F4", alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  doneText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  headerCopy: { flex: 1, alignItems: "center" },
  eyebrow: { color: COLORS.primary, fontSize: 9.2, fontWeight: "900", letterSpacing: 1 },
  headerTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", marginTop: 2 },
  content: { paddingTop: 14, paddingBottom: 36, gap: 14 },
  hero: { minHeight: 170, borderRadius: 26, padding: 20, backgroundColor: "#FFF1F5", borderWidth: 1, borderColor: "#F4D8E1", overflow: "hidden" },
  heroBubbleOne: { position: "absolute", width: 156, height: 156, borderRadius: 78, right: -55, top: -60, backgroundColor: "#F7D7E5", opacity: 0.72 },
  heroBubbleTwo: { position: "absolute", width: 72, height: 72, borderRadius: 36, right: 54, bottom: -26, backgroundColor: "#EEDDEF", opacity: 0.8 },
  heroIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#F0CED9", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900", maxWidth: "82%" },
  heroText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, fontWeight: "600", marginTop: 7, maxWidth: "90%" },
  sectionCard: { backgroundColor: COLORS.white, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 12 },
  relationTypeCard: { backgroundColor: "#FFFAFC" },
  sectionEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.9 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionNumber: { width: 31, height: 31, borderRadius: 11, backgroundColor: "#F8DFE8", alignItems: "center", justifyContent: "center" },
  sectionNumberSoft: { backgroundColor: "#F1E8F7" },
  sectionNumberText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  sectionTitleCopy: { flex: 1 },
  sectionTitle: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  sectionSubtitle: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  partnerNotice: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: "#FFF2F6", borderWidth: 1, borderColor: "#F1D8E1" },
  partnerNoticeText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "700" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900", marginTop: 5 },
  selectCard: { borderRadius: 20, borderWidth: 1, borderColor: "#EEDDE3", backgroundColor: "#FFFBFC", padding: 13 },
  selectTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectCopy: { flex: 1 },
  selectTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  selectSubtitle: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600", marginTop: 2 },
  chooseButton: { minHeight: 38, borderRadius: 17, backgroundColor: "#FFF0F4", borderWidth: 1, borderColor: "#F1D6DF", paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  chooseButtonText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  selectedList: { gap: 7, marginTop: 10 },
  selectedPerson: { minHeight: 42, borderRadius: 15, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  selectedAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#F8E7ED", alignItems: "center", justifyContent: "center" },
  selectedAvatarText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  selectedName: { flex: 1, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  miniBranch: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, height: 24, borderRadius: 12, backgroundColor: "#FFF1F5" },
  miniBranchText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  connectorHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 35 },
  connectorLine: { height: 1, backgroundColor: "#E7C9D3", flex: 1 },
  connectorCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF0F4", borderWidth: 1, borderColor: "#EBCBD6", alignItems: "center", justifyContent: "center", marginHorizontal: 8 },
  previewCard: { borderRadius: 22, padding: 15, backgroundColor: "#F8F4FF", borderWidth: 1, borderColor: "#E6DCF4", flexDirection: "row", gap: 10 },
  previewCardWarning: { backgroundColor: "#FFF7EE", borderColor: "#F1D6B8" },
  previewIcon: { width: 37, height: 37, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  previewCopy: { flex: 1 },
  previewTitle: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  previewSentence: { color: COLORS.primaryText, fontSize: 13, lineHeight: 19, fontWeight: "800", marginTop: 4 },
  previewMeta: { color: COLORS.primary, fontSize: 10.5, lineHeight: 15, fontWeight: "800", marginTop: 5 },
  previewMetaWarning: { color: "#9C612F" },
  submitButton: { marginTop: 2 },
  pickerContent: { paddingBottom: 34 },
  pickerHeader: { paddingTop: 14 },
  pickerHero: { backgroundColor: "#FFF1F5", borderRadius: 22, borderWidth: 1, borderColor: "#F2D8E1", padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  pickerHeroIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  pickerHeroCopy: { flex: 1 },
  pickerHeroTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  pickerHeroText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600", marginTop: 3 },
  alphaHeader: { height: 40, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.softSurface, paddingTop: 5 },
  alphaLetter: { width: 28, height: 28, borderRadius: 10, backgroundColor: "#FFF0F4", color: COLORS.primary, fontSize: 12, fontWeight: "900", textAlign: "center", textAlignVertical: "center", lineHeight: 28 },
  alphaLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  alphaCount: { color: COLORS.secondaryText, fontSize: 10, fontWeight: "800" },
  personRow: { minHeight: 66, borderRadius: 19, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  personRowSelected: { borderColor: "#E5B5C5", backgroundColor: "#FFF5F8" },
  avatar: { width: 40, height: 40, borderRadius: 15, backgroundColor: "#F4EFF1", alignItems: "center", justifyContent: "center" },
  avatarSelected: { backgroundColor: "#F5DCE5" },
  avatarText: { color: COLORS.secondaryText, fontSize: 15, fontWeight: "900" },
  avatarTextSelected: { color: COLORS.primary },
  personCopy: { flex: 1, minWidth: 0 },
  personName: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  personMeta: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600", marginTop: 3 },
  branchBadge: { minWidth: 35, height: 26, borderRadius: 13, backgroundColor: "#FFF0F4", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 6 },
  branchBadgeEmpty: { backgroundColor: "#F3F1F2" },
  branchText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  branchTextEmpty: { color: COLORS.secondaryText },
  multiCheck: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: "#DCC8CF", backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  multiCheckSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  emptyPicker: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyPickerText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "700" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  centerTitle: { color: COLORS.primaryText, fontSize: 16, lineHeight: 22, fontWeight: "900", textAlign: "center" },
  centerText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.65 },
});
