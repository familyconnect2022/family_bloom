import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, SectionList, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomButton, BloomChipButton } from "../../../components/ui/BloomButtonComponents";
import { BloomBackButton } from "../../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomTextInput } from "../../../components/ui/BloomInputComponents";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { parseAppError } from "../../../constants/errorConstants";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyGraph } from "../../../hooks/family/useFamilyGraph";
import { checkGraphRelationshipCandidates } from "../../../services/familyGraph/familyGraphIntegrity";
import { getParentChildRelationshipId, getPartnerRelationshipId } from "../../../utils/familyGraph";
import { familyGraphMutationService } from "../../../services/familyGraph/familyGraphMutationService";
import { graphActivitySessionService } from "../../../services/activity/graphActivitySessionService";
import { activityService } from "../../../services/activity/activityService";
import type { FamilyPerson, FamilyRelationship, ParentChildSubtype, PartnerStatus } from "../../../types/familyGraph";
import { compareDisplayNamesByGivenName, getGivenNameInitial, groupByGivenNameInitial } from "../../../utils/personName";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


type RelationshipMode = "parent_of" | "child_of" | "partner";
type PickerSide = "base" | "target";

// UI labels are relative to the Person currently being edited. The storage
// remains an oriented parent_child edge, independent of word order.
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
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <Pressable
      onPress={() => onToggle(person.id)}
      style={({ pressed }) => [__a3_styles.personRow, selected && __a3_styles.personRowSelected, pressed && __a3_styles.pressed]}
    >
      <View style={[__a3_styles.avatar, selected && __a3_styles.avatarSelected]}><Text style={[__a3_styles.avatarText, selected && __a3_styles.avatarTextSelected]}>{getGivenNameInitial(person.displayName)}</Text></View>
      <View style={__a3_styles.personCopy}>
        <Text style={__a3_styles.personName} numberOfLines={1}>{person.displayName}</Text>
        <Text style={__a3_styles.personMeta} numberOfLines={1}>{genderLabel[person.gender]} · {person.birthYear ?? "chưa rõ năm sinh"}</Text>
      </View>
      <View style={[__a3_styles.branchBadge, branchCount === 0 && __a3_styles.branchBadgeEmpty]}>
        <Ionicons name="git-branch-outline" size={12} color={branchCount ? __a3Colors.primary : __a3Colors.secondaryText} />
        <Text style={[__a3_styles.branchText, branchCount === 0 && __a3_styles.branchTextEmpty]}>{branchCount}</Text>
      </View>
      <View style={[__a3_styles.multiCheck, selected && __a3_styles.multiCheckSelected]}>
        {selected && <Ionicons name="checkmark" size={16} color={__a3Colors.white} />}
      </View>
    </Pressable>
  );
});

export default function FamilyGraphRelationshipEditorScreen() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
  // Incremental preflight from the snapshot already held by useFamilyGraph.
  // Does NOT re-query Firebase while choosing people or scrolling.
  const integrityPreview = useMemo(() => {
    if (!baseIds.length || !targetIds.length || batchStats.requested > 80) return {issues:[],blocks:0,warnings:0};
    const existingIds=new Set(snapshot.relationships.map(r=>r.id));
    const stamp='2026-01-01T00:00:00.000Z';
    const createEdge=(a:string,b:string,type:'parent_child'|'partner')=>({
      id:a===b ? `__invalid_self_${a}` : type==='parent_child'?getParentChildRelationshipId(a,b):getPartnerRelationshipId(a,b),
      familyId:familyId??'',type,personAId:a,personBId:b,
      subtype:type==='parent_child'?subtype:null,partnerStatus:type==='partner'?partnerStatus:null,
      startDate:null,endDate:null,createdByUid:'',createdAt:stamp,updatedAt:stamp,
    } as FamilyRelationship);
    const edges=mode==='partner' ? [createEdge(baseIds[0],targetIds[0],'partner')]
      : parentIds.flatMap(a=>childIds.map(b=>createEdge(a,b,'parent_child')));
    const newEdges=edges.filter(r=>!existingIds.has(r.id));
    if (!newEdges.length) return {issues:[],blocks:0,warnings:0};
    const issues=checkGraphRelationshipCandidates(snapshot,newEdges);
    return {issues,blocks:issues.filter(i=>i.severity==='block').length,warnings:issues.filter(i=>i.severity==='warning').length};
  },[baseIds,targetIds,mode,parentIds,childIds,subtype,partnerStatus,batchStats.requested,snapshot,familyId]);

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

  const submit = async (warningsApproved=false) => {
    // Prevent bypassing preview on very large Cartesian-product batches.
    if (batchStats.requested > 80) {
      showToast({type:'warning',title:'Xin chia nhỏ lượt nối',message:'Mỗi lần nối tối đa 80 quan hệ để Bloom kiểm tra đầy đủ và tránh làm giật màn hình.',duration:4500});
      return;
    }
    if (integrityPreview.blocks) {
      Alert.alert('Quan hệ chưa hợp lệ',integrityPreview.issues.find(i=>i.severity==='block')?.message??'Vui lòng sửa mối nối trước khi lưu.');
      return;
    }
    if (!warningsApproved && integrityPreview.warnings) {
      Alert.alert('Cần xác minh quan hệ',
        integrityPreview.issues.filter(i=>i.severity==='warning').slice(0,3).map(i=>`${i.code}: ${i.message}`).join('\n\n'),
        [{text:'Sửa lựa chọn',style:'cancel'},{text:'Xác nhận ngoại lệ',onPress:()=>void submit(true)}]);
      return;
    }
    if (!familyId || busy || !baseIds.length || !targetIds.length) {
      if (!busy) showToast({ type: "warning", title: "Chưa đủ người", message: "Hãy chọn người ở cả hai phía của mối quan hệ." });
      return;
    }
    setBusy(true);
    try {
      if (mode === "partner") {
        const a = baseIds[0];
        const b = targetIds[0];
        if (!a || !b || a === b || batchStats.existing > 0) {
          showToast({ type: "warning", title: "Chưa thể nối", message: batchStats.existing ? "Quan hệ vợ/chồng này đã tồn tại." : "Hãy chọn đúng hai người khác nhau." });
          return;
        }
        await familyGraphMutationService.createRelationship(familyId, { type: "partner", personAId: a, personBId: b, partnerStatus });
        let notified = false;
        try {
          await activityService.createGraphNotice({
            familyId, actorUid: user?.uid || "", actorName: userProfile?.displayName || "Người giữ nhà",
            title: "Cây nhà vừa có thêm một mối quan hệ",
            body: "Đã kết nối mối quan hệ đôi lứa trong phả hệ.",
            sessionId: `relationship-${getPartnerRelationshipId(a, b)}`,
          });
          notified = true;
        } catch { graphActivitySessionService.record(familyId, { kind: "relationship_added" }); }
        showToast({ type: notified ? "success" : "warning", title: "Đã nối gia phả", message: notified ? "Đã tạo quan hệ và thông báo cho cả nhà." : "Đã tạo quan hệ nhưng chưa gửi được thông báo; có thể chọn Báo cả nhà để gửi lại.", duration: 3000 });
        router.replace({ pathname: "/family-graph", params: { focusPersonId: b, focusZoom: "1.2" } } as never);
        return;
      }

      if (batchStats.conflict > 0) {
        showToast({ type: "warning", title: "Có quan hệ xung đột", message: "Một số đường đã tồn tại nhưng khác loại. Hãy sửa hoặc xóa đường cũ trước." });
        return;
      }
      const result = await familyGraphMutationService.createParentChildRelationshipsBatch(familyId, { parentIds, childIds, subtype });
      const created = result.createdRelationshipIds.length;
      let notified = false;
      if (created > 0) {
        try {
          await activityService.createGraphNotice({
            familyId, actorUid: user?.uid || "", actorName: userProfile?.displayName || "Người giữ nhà",
            title: "Cây nhà vừa có thêm đường nối phả hệ",
            body: `Đã thêm ${created} quan hệ gia đình vào cây nhà.`,
            sessionId: `relationships-${result.createdRelationshipIds[0]}-${created}`,
          });
          notified = true;
        } catch {
          for (let index = 0; index < created; index += 1) graphActivitySessionService.record(familyId, { kind: "relationship_added" });
        }
      }
      const existing = result.existingRelationshipIds.length;
      showToast({
        type: created > 0 && !notified ? "warning" : "success",
        title: created ? "Đã nối gia phả" : "Quan hệ đã có",
        message: created ? `Đã tạo ${created} đường${existing ? ` · ${existing} đường đã có` : ""}.${notified ? " Đã báo cả nhà." : " Chưa gửi được thông báo, có thể báo lại từ Cây nhà."}` : `${existing} đường đã tồn tại, dữ liệu được giữ nguyên.`,
        duration: 3000,
      });
      if (created > 0) {
        // Route intent is consumed only by the Graph camera after the new branch is loaded.
        const connectedPersonId = targetIds[0] ?? childIds[0] ?? baseIds[0];
        router.replace({ pathname: "/family-graph", params: { focusPersonId: connectedPersonId, focusZoom: "1.2" } } as never);
      }
    } catch (nextError) {
      showToast({ ...parseAppError(nextError), duration: 4200 });
    } finally {
      setBusy(false);
    }
  };

  const renderSelected = (side: PickerSide, ids: string[], title: string, subtitle: string) => {
    const selected = ids.map((id) => peopleById.get(id)).filter((person): person is FamilyPerson => !!person);
    return (
      <View style={__a3_styles.selectCard}>
        <View style={__a3_styles.selectTop}>
          <View style={__a3_styles.selectCopy}><Text style={__a3_styles.selectTitle}>{title}</Text><Text style={__a3_styles.selectSubtitle}>{selected.length ? `${selected.length} người đã chọn` : subtitle}</Text></View>
          <Pressable onPress={() => { setSearch(""); setPickerSide(side); }} style={({ pressed }) => [__a3_styles.chooseButton, pressed && __a3_styles.pressed]}>
            <Ionicons name={selected.length ? "people-outline" : "person-add-outline"} size={17} color={__a3Colors.primary} />
            <Text style={__a3_styles.chooseButtonText}>{selected.length ? "Chọn lại" : "Chọn người"}</Text>
          </Pressable>
        </View>
        {selected.length > 0 && <View style={__a3_styles.selectedList}>{selected.map((person) => (
          <View key={person.id} style={__a3_styles.selectedPerson}>
            <View style={__a3_styles.selectedAvatar}><Text style={__a3_styles.selectedAvatarText}>{getGivenNameInitial(person.displayName)}</Text></View>
            <Text style={__a3_styles.selectedName} numberOfLines={1}>{person.displayName}</Text>
            <View style={__a3_styles.miniBranch}><Ionicons name="git-branch-outline" size={11} color={__a3Colors.primary} /><Text style={__a3_styles.miniBranchText}>{relationshipCountByPerson.get(person.id) ?? 0}</Text></View>
            <Pressable hitSlop={7} onPress={() => side === "base" ? setBaseIds(ids.filter((id) => id !== person.id)) : setTargetIds(ids.filter((id) => id !== person.id))}><Ionicons name="close-circle" size={19} color={__a3Colors.secondaryText} /></Pressable>
          </View>
        ))}</View>}
      </View>
    );
  };

  if (!familyId || !isAdmin) {
    return <ScreenContainer keyboardSafe><View style={__a3_styles.centerState}><Ionicons name="lock-closed-outline" size={38} color={__a3Colors.secondaryText} /><Text style={__a3_styles.centerTitle}>Chỉ người quản lý nhà mới có thể nối thêm quan hệ</Text><BloomButton title="Quay lại" variant="outline" onPress={() => router.back()} /></View></ScreenContainer>;
  }

  if (loading && snapshot.persons.length === 0) {
    return <ScreenContainer keyboardSafe><View style={__a3_styles.centerState}><ActivityIndicator color={__a3Colors.primary} /><Text style={__a3_styles.centerText}>Bloom đang chuẩn bị danh sách thành viên…</Text></View></ScreenContainer>;
  }

  if (error) {
    return <ScreenContainer keyboardSafe><View style={__a3_styles.centerState}><Ionicons name="cloud-offline-outline" size={38} color={__a3Colors.secondaryText} /><Text style={__a3_styles.centerTitle}>Bloom chưa mở được phả hệ lúc này</Text><BloomButton title="Quay lại" variant="outline" onPress={() => router.back()} /></View></ScreenContainer>;
  }

  if (pickerSide) {
    const sideLabel = pickerSide === "base" ? (mode === "child_of" ? "Chọn người con" : mode === "partner" ? "Chọn người thứ nhất" : "Chọn cha/mẹ") : (mode === "child_of" ? "Chọn cha/mẹ" : mode === "partner" ? "Chọn người thứ hai" : "Chọn người con");
    return (
      <ScreenContainer keyboardSafe>
        <View style={__a3_styles.root}>
          <View style={__a3_styles.header}>
            <Pressable onPress={() => setPickerSide(null)} style={({ pressed }) => [__a3_styles.headerButton, pressed && __a3_styles.pressed]}><Ionicons name="chevron-back" size={23} color={__a3Colors.primaryText} /></Pressable>
            <View style={__a3_styles.headerCopy}><Text style={__a3_styles.eyebrow}>CHỌN NGƯỜI</Text><Text style={__a3_styles.headerTitle}>{sideLabel}</Text></View>
            <Pressable onPress={() => setPickerSide(null)} style={({ pressed }) => [__a3_styles.doneButton, pressed && __a3_styles.pressed]}><Text style={__a3_styles.doneText}>Xong</Text></Pressable>
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
            contentContainerStyle={__a3_styles.pickerContent}
            ListHeaderComponent={(
              <View style={__a3_styles.pickerHeader}>
                <View style={__a3_styles.pickerHero}><View style={__a3_styles.pickerHeroIcon}><Ionicons name="people-outline" size={22} color={__a3Colors.primary} /></View><View style={__a3_styles.pickerHeroCopy}><Text style={__a3_styles.pickerHeroTitle}>{activeIds.length ? `${activeIds.length} người đang được chọn` : "Chưa chọn ai"}</Text><Text style={__a3_styles.pickerHeroText}>Sắp xếp theo tên gọi · số bên phải là số nhánh đang nối.</Text></View></View>
                <BloomTextInput value={search} onChangeText={setSearch} placeholder="Tìm theo tên…" isSearch leftIcon="search-outline" />
              </View>
            )}
            renderSectionHeader={({ section }) => <View style={__a3_styles.alphaHeader}><Text style={__a3_styles.alphaLetter}>{section.title}</Text><View style={__a3_styles.alphaLine} /><Text style={__a3_styles.alphaCount}>{section.data.length}</Text></View>}
            renderItem={({ item }) => <PickerRow person={item} selected={activeIdSet.has(item.id)} branchCount={relationshipCountByPerson.get(item.id) ?? 0} onToggle={togglePerson} />}
            ListEmptyComponent={<View style={__a3_styles.emptyPicker}><Ionicons name="search-outline" size={28} color={__a3Colors.secondaryText} /><Text style={__a3_styles.emptyPickerText}>Không tìm thấy người phù hợp.</Text></View>}
          />
        </View>
      </ScreenContainer>
    );
  }

  const disabled = busy || integrityPreview.blocks > 0 || !baseIds.length || !targetIds.length || batchStats.conflict > 0 || (mode === "partner" && (baseIds.length !== 1 || targetIds.length !== 1 || batchStats.existing > 0));

  return (
    <ScreenContainer keyboardSafe>
      <View style={__a3_styles.root}>
        <View style={__a3_styles.header}>
          <BloomBackButton onPress={() => router.back()} />
          <View style={__a3_styles.headerCopy}><Text style={__a3_styles.eyebrow}>KẾT NỐI GIA ĐÌNH</Text><Text style={__a3_styles.headerTitle}>Nối quan hệ</Text></View>
          <View style={__a3_styles.headerButtonPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={__a3_styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <BloomHeroHeader
            eyebrow="MỖI NHÁNH LÀ MỘT CÂU CHUYỆN"
            title="Nối đúng người, cây sẽ kể đúng chuyện"
            subtitle="Chỉ những mối quan hệ bạn chọn và xác nhận mới được Bloom giữ lại trong phả hệ."
            variant="relationship"
            compact
            roundedBottom
          />

          <View style={__a3_styles.sectionCard}>
            <View style={__a3_styles.sectionTitleRow}>
              <View style={__a3_styles.sectionNumber}><Text style={__a3_styles.sectionNumberText}>1</Text></View>
              <View style={__a3_styles.sectionTitleCopy}>
                <Text style={__a3_styles.sectionTitle}>Người được chọn</Text>
                <Text style={__a3_styles.sectionSubtitle}>{mode === "partner" ? "Quan hệ vợ/chồng chọn 1 người ở mỗi phía." : "Có thể chọn nhiều người cùng lúc."}</Text>
              </View>
            </View>
            {renderSelected("base", baseIds, mode === "child_of" ? "Người con" : mode === "partner" ? "Người thứ nhất" : "Cha/Mẹ", mode === "partner" ? "Chọn 1 người" : "Chọn một hoặc nhiều người")}
          </View>

          <View style={[__a3_styles.sectionCard, __a3_styles.relationTypeCard]}>
            <View style={__a3_styles.sectionTitleRow}>
              <View style={[__a3_styles.sectionNumber, __a3_styles.sectionNumberSoft]}><Text style={__a3_styles.sectionNumberText}>2</Text></View>
              <View style={__a3_styles.sectionTitleCopy}>
                <Text style={__a3_styles.sectionTitle}>Loại quan hệ</Text>
                <Text style={__a3_styles.sectionSubtitle}>Chọn chiều quan hệ trước khi xác nhận.</Text>
              </View>
            </View>
            <View style={__a3_styles.modeRow}>
              <BloomChipButton label="Cha/Mẹ → Con" selected={mode === "parent_of"} onPress={() => changeMode("parent_of")} />
              <BloomChipButton label="Con → Cha/Mẹ" selected={mode === "child_of"} onPress={() => changeMode("child_of")} />
              <BloomChipButton label="Vợ/Chồng" selected={mode === "partner"} onPress={() => changeMode("partner")} />
            </View>
            {mode === "partner" ? (
              <>
                <View style={__a3_styles.partnerNotice}>
                  <Ionicons name="heart-outline" size={16} color={__a3Colors.primary} />
                  <Text style={__a3_styles.partnerNoticeText}>Vợ/chồng là quan hệ 1 ↔ 1, nên Bloom chỉ giữ một người ở mỗi phía.</Text>
                </View>
                <Text style={__a3_styles.optionLabel}>Trạng thái</Text>
                <View style={__a3_styles.modeRow}>{(["married", "partner", "separated", "divorced", "widowed"] as PartnerStatus[]).map((status) => <BloomChipButton key={status} label={partnerStatusLabel[status]} selected={partnerStatus === status} onPress={() => setPartnerStatus(status)} />)}</View>
              </>
            ) : (
              <>
                <Text style={__a3_styles.optionLabel}>Loại cha/mẹ – con</Text>
                <View style={__a3_styles.modeRow}>{(["biological", "adoptive", "step", "unknown"] as ParentChildSubtype[]).map((value) => <BloomChipButton key={value} label={parentSubtypeLabel[value]} selected={subtype === value} onPress={() => setSubtype(value)} />)}</View>
              </>
            )}
          </View>

          <View style={__a3_styles.sectionCard}>
            <View style={__a3_styles.sectionTitleRow}>
              <View style={__a3_styles.sectionNumber}><Text style={__a3_styles.sectionNumberText}>3</Text></View>
              <View style={__a3_styles.sectionTitleCopy}>
                <Text style={__a3_styles.sectionTitle}>Người tham chiếu</Text>
                <Text style={__a3_styles.sectionSubtitle}>{mode === "partner" ? "Chọn người còn lại để tạo cặp 1 ↔ 1." : "Có thể chọn nhiều người ở mỗi phía; Bloom sẽ nối từng cặp phù hợp cho bạn."}</Text>
              </View>
            </View>
            {renderSelected("target", targetIds, mode === "child_of" ? "Cha/Mẹ" : mode === "partner" ? "Người thứ hai" : "Người con", mode === "partner" ? "Chọn 1 người" : "Chọn một hoặc nhiều người")}
          </View>

          <View style={[__a3_styles.previewCard, batchStats.conflict > 0 && __a3_styles.previewCardWarning]}>
            <View style={__a3_styles.previewIcon}><Ionicons name={batchStats.conflict > 0 ? "warning-outline" : "sparkles-outline"} size={20} color={batchStats.conflict > 0 ? __a3Colors.primary : __a3Colors.primary} /></View>
            <View style={__a3_styles.previewCopy}>
              <Text style={__a3_styles.previewTitle}>Bloom sẽ ghi nhận</Text>
              <Text style={__a3_styles.previewSentence}>{preview}</Text>
              {integrityPreview.issues.slice(0,4).map((issue,i)=><Text key={`${issue.code}-${i}`} style={[__a3_styles.previewMeta,{color:issue.severity==='block'?__a3Colors.destructive:__a3Colors.attention}]}>{issue.severity==='block'?'Cần sửa':'Cần xác minh'} · {issue.code}: {issue.message}</Text>)}
              {batchStats.requested > 0 && <Text style={[__a3_styles.previewMeta, batchStats.conflict > 0 && __a3_styles.previewMetaWarning]}>{mode === "partner" ? (batchStats.existing ? "Quan hệ này đã tồn tại." : "Sẽ tạo 1 đường quan hệ.") : batchStats.conflict ? `${batchStats.conflict} mối nối đang khác với điều đã lưu trước đó.` : `${batchStats.requested - batchStats.existing} mối nối mới · ${batchStats.existing} mối nối đã có sẵn.`}</Text>}
            </View>
          </View>

          <BloomButton title={mode === "partner" ? "Tạo mối quan hệ" : `Nối ${Math.max(0, batchStats.requested - batchStats.existing)} đường quan hệ`} icon="git-branch-outline" isLoading={busy} disabled={disabled} onPress={() => void submit()} customStyle={__a3_styles.submitButton} />
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  root: { flex: 1 },
  header: { height: 58, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: COLORS.border },
  headerButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerButtonPlaceholder: { width: 42 },
  doneButton: { minWidth: 52, height: 38, borderRadius: 18, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  doneText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  headerCopy: { flex: 1, alignItems: "center" },
  eyebrow: { color: COLORS.primary, fontSize: 9.2, fontWeight: "900", letterSpacing: 1 },
  headerTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", marginTop: 2 },
  content: { paddingTop: 14, paddingBottom: 36, gap: 14 },
  hero: { minHeight: 170, borderRadius: 26, padding: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  heroBubbleOne: { position: "absolute", width: 156, height: 156, borderRadius: 78, right: -55, top: -60, backgroundColor: COLORS.softSurface, opacity: 0.72 },
  heroBubbleTwo: { position: "absolute", width: 72, height: 72, borderRadius: 36, right: 54, bottom: -26, backgroundColor: COLORS.softSurface, opacity: 0.8 },
  heroIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroTitle: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900", maxWidth: "82%" },
  heroText: { color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18, fontWeight: "600", marginTop: 7, maxWidth: "90%" },
  sectionCard: { backgroundColor: COLORS.surface, borderRadius: 24, borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 12 },
  relationTypeCard: { backgroundColor: COLORS.surface },
  sectionEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.9 },
  sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionNumber: { width: 31, height: 31, borderRadius: 11, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  sectionNumberSoft: { backgroundColor: COLORS.surface },
  sectionNumberText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  sectionTitleCopy: { flex: 1 },
  sectionTitle: { color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  sectionSubtitle: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600", marginTop: 2 },
  partnerNotice: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 15, paddingHorizontal: 11, paddingVertical: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  partnerNoticeText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "700" },
  modeRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  optionLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900", marginTop: 5 },
  selectCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 13 },
  selectTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectCopy: { flex: 1 },
  selectTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  selectSubtitle: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600", marginTop: 2 },
  chooseButton: { minHeight: 38, borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 6 },
  chooseButtonText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  selectedList: { gap: 7, marginTop: 10 },
  selectedPerson: { minHeight: 42, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 8 },
  selectedAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  selectedAvatarText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
  selectedName: { flex: 1, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  miniBranch: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, height: 24, borderRadius: 12, backgroundColor: COLORS.surface },
  miniBranchText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  connectorHint: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 35 },
  connectorLine: { height: 1, backgroundColor: COLORS.softSurface, flex: 1 },
  connectorCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", marginHorizontal: 8 },
  previewCard: { borderRadius: 22, padding: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", gap: 10 },
  previewCardWarning: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  previewIcon: { width: 37, height: 37, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  previewCopy: { flex: 1 },
  previewTitle: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  previewSentence: { color: COLORS.primaryText, fontSize: 13, lineHeight: 19, fontWeight: "800", marginTop: 4 },
  previewMeta: { color: COLORS.primary, fontSize: 10.5, lineHeight: 15, fontWeight: "800", marginTop: 5 },
  previewMetaWarning: { color: COLORS.primary },
  submitButton: { marginTop: 2 },
  pickerContent: { paddingBottom: 34 },
  pickerHeader: { paddingTop: 14 },
  pickerHero: { backgroundColor: COLORS.surface, borderRadius: 22, borderWidth: 1, borderColor: COLORS.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  pickerHeroIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  pickerHeroCopy: { flex: 1 },
  pickerHeroTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  pickerHeroText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600", marginTop: 3 },
  alphaHeader: { height: 40, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.softSurface, paddingTop: 5 },
  alphaLetter: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.surface, color: COLORS.primary, fontSize: 12, fontWeight: "900", textAlign: "center", textAlignVertical: "center", lineHeight: 28 },
  alphaLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  alphaCount: { color: COLORS.secondaryText, fontSize: 10, fontWeight: "800" },
  personRow: { minHeight: 66, borderRadius: 19, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginBottom: 8, paddingHorizontal: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  personRowSelected: { borderColor: COLORS.border, backgroundColor: COLORS.surface },
  avatar: { width: 40, height: 40, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  avatarSelected: { backgroundColor: COLORS.softSurface },
  avatarText: { color: COLORS.secondaryText, fontSize: 15, fontWeight: "900" },
  avatarTextSelected: { color: COLORS.primary },
  personCopy: { flex: 1, minWidth: 0 },
  personName: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  personMeta: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "600", marginTop: 3 },
  branchBadge: { minWidth: 35, height: 26, borderRadius: 13, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 6 },
  branchBadgeEmpty: { backgroundColor: COLORS.softSurface },
  branchText: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  branchTextEmpty: { color: COLORS.secondaryText },
  multiCheck: { width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  multiCheckSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  emptyPicker: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyPickerText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "700" },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, gap: 12 },
  centerTitle: { color: COLORS.primaryText, fontSize: 16, lineHeight: 22, fontWeight: "900", textAlign: "center" },
  centerText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "600" },
  pressed: { opacity: 0.65 },
}));
