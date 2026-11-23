import { BLOOM_ABSOLUTE_FILL } from "../../../components/ui/bloomAbsoluteFill";
import { getBloomStatusBarStyle } from "../../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { avatarFileFromUri } from "../../../services/media/avatarFile";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, SectionList, StyleSheet, View,  } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { BloomButton, BloomChipButton } from "../../../components/ui/BloomButtonComponents";
import { BloomConfirmDialog } from "../../../components/ui/BloomConfirmDialog";
import { BloomFullScreenFlow } from "../../../components/ui/BloomFullScreenFlow";
import { BloomDatePicker, BloomInputAvatar, BloomTextInput } from "../../../components/ui/BloomInputComponents";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { BloomCard, BloomEmptyState, BloomSectionHeader } from "../../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { APP_CATEGORIES } from "../../../constants/appPaths";
import { COLORS } from "../../../constants/theme";
import { parseAppError } from "../../../constants/errorConstants";
import { useAuth } from "../../../context/AuthContext";
import { useFamilyGraph } from "../../../hooks/family/useFamilyGraph";
import { useFamilyMembers } from "../../../hooks/family/useFamilyMembers";
import { familyGraphMutationService } from "../../../services/familyGraph/familyGraphMutationService";
import { checkGraphRelationshipCandidates } from "../../../services/familyGraph/familyGraphIntegrity";
import { getParentChildRelationshipId, getPartnerRelationshipId } from "../../../utils/familyGraph";
import { activityService } from "../../../services/activity/activityService";
import { graphActivitySessionService, type GraphActivitySession, type GraphActivityChange } from "../../../services/activity/graphActivitySessionService";
import { mediaService } from "../../../services/media/mediaService";
import type {
  FamilyPerson,
  FamilyPersonLifeStatus,
  FamilyRelationship,
  ParentChildSubtype,
  PartnerStatus,
} from "../../../types/familyGraph";
import type { Gender } from "../../../types/user";
import { compareDisplayNamesByGivenName, getGivenNameInitial, groupByGivenNameInitial } from "../../../utils/personName";
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
  birthDate: Date | undefined;
  deathYear: string;
  deathDate: Date | undefined;
  birthPlace: string;
  description: string;
  linkedUid: string | null;
  avatarUri: string | null;
  avatarDirty: boolean;
};

type RelationshipMode = "parent_of" | "child_of" | "partner";
type RelationshipModalConfig = { basePersonId: string | null; mode: RelationshipMode } | null;

type GraphConfirmAction =
  | { kind: "unlink"; personId: string; personName: string }
  | { kind: "delete_person"; personId: string; personName: string }
  | { kind: "delete_relationship"; relationshipId: string; label: string };

const parentSubtypeLabel: Record<ParentChildSubtype, string> = {
  biological: "Ruột",
  adoptive: "Nhận nuôi",
  step: "Kế",
  unknown: "Chưa rõ",
};

const partnerStatusLabel: Record<PartnerStatus, string> = {
  partner: "Bạn đời",
  married: "Vợ/Chồng",
  separated: "Ly thân",
  divorced: "Ly hôn",
  widowed: "Góa",
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
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatHumanDate = (value?: Date): string => {
  if (!value) return "";
  return `${String(value.getDate()).padStart(2, "0")}/${String(value.getMonth() + 1).padStart(2, "0")}/${value.getFullYear()}`;
};

export default function FamilyGraphAdminScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  const themeRevision = useBloomThemeRevision();
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string; editPersonId?: string }>();
  const openedEditParamRef = useRef<string | null>(null);
  const cameFromGraph = params.from === "graph";
  const { showToast } = useBloomToast();
  const { user, userProfile, families } = useAuth();
  const familyId = userProfile?.activeFamilyId ?? null;
  const membership = families.find((item) => item.familyId === familyId);
  const isAdmin = membership?.role === "owner" || membership?.role === "admin";
  const [screenFocused, setScreenFocused] = useState(true);
  const [graphActivitySession, setGraphActivitySession] = useState<GraphActivitySession | null>(null);
  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    setGraphActivitySession(graphActivitySessionService.get(familyId));
    return () => setScreenFocused(false);
  }, [familyId]));
  const { snapshot, loading, error } = useFamilyGraph(familyId, user?.uid, screenFocused);
  const { members } = useFamilyMembers(familyId);

  const [busy, setBusy] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personModalVisible, setPersonModalVisible] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [personDraft, setPersonDraft] = useState<PersonDraft>(EMPTY_PERSON);
  const [relationshipModalConfig, setRelationshipModalConfig] = useState<RelationshipModalConfig>(null);
  const [linkModalPersonId, setLinkModalPersonId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<GraphConfirmAction | null>(null);
  const [showAllRelationships, setShowAllRelationships] = useState(false);

  const peopleById = useMemo(
    () => new Map(snapshot.persons.map((person) => [person.id, person])),
    [snapshot.persons],
  );
  const connectedPersonIds = useMemo(() => {
    const ids = new Set<string>();
    snapshot.relationships.forEach((relationship) => {
      ids.add(relationship.personAId);
      ids.add(relationship.personBId);
    });
    return ids;
  }, [snapshot.relationships]);
  const relationshipCountByPerson = useMemo(() => {
    const counts = new Map<string, number>();
    snapshot.relationships.forEach((relationship) => {
      counts.set(relationship.personAId, (counts.get(relationship.personAId) ?? 0) + 1);
      counts.set(relationship.personBId, (counts.get(relationship.personBId) ?? 0) + 1);
    });
    return counts;
  }, [snapshot.relationships]);
  const personSections = useMemo(
    () => groupByGivenNameInitial(snapshot.persons),
    [snapshot.persons],
  );
  const memberByUid = useMemo(
    () => new Map(members.map((member) => [member.uid, member])),
    [members],
  );
  const unassignedPersonCount = useMemo(
    () => snapshot.persons.reduce((count, person) => count + (connectedPersonIds.has(person.id) ? 0 : 1), 0),
    [connectedPersonIds, snapshot.persons],
  );
  const linkedUids = useMemo(
    () => new Set(snapshot.persons.map((person) => person.linkedUid).filter(Boolean) as string[]),
    [snapshot.persons],
  );
  const availableMembers = useMemo(
    () => members.filter((member) => !linkedUids.has(member.uid)),
    [linkedUids, members],
  );

  const visibleRelationships = useMemo(
    () => showAllRelationships ? snapshot.relationships : snapshot.relationships.slice(0, 10),
    [showAllRelationships, snapshot.relationships],
  );

  const linkModalPerson = linkModalPersonId ? peopleById.get(linkModalPersonId) ?? null : null;

  const runMutation = async (task: () => Promise<unknown>, successMessage: string) => {
    if (!familyId || busy) return false;
    setBusy(true);
    try {
      await task();
      showToast({ type: "success", title: "Đã cập nhật", message: successMessage, duration: 2400, magicMoment: true });
      return true;
    } catch (nextError) {
      showToast({ ...parseAppError(nextError), duration: 3800 });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const recordGraphChange = useCallback((change: GraphActivityChange) => {
    if (!familyId) return;
    setGraphActivitySession(graphActivitySessionService.record(familyId, change));
  }, [familyId]);

  const notifyGraphChanges = useCallback(async () => {
    if (!familyId || !user || !graphActivitySession || busy) return;
    const copy = graphActivitySessionService.copyFor(graphActivitySession);
    setBusy(true);
    try {
      await activityService.createGraphNotice({
        familyId,
        actorUid: user.uid,
        actorName: userProfile?.displayName || "Người giữ nhà",
        title: copy.title,
        body: copy.body,
        sessionId: graphActivitySession.id,
      });
      graphActivitySessionService.clear(familyId);
      setGraphActivitySession(null);
      showToast({ type: "success", title: "Đã báo cho gia đình", message: "Thay đổi trên Cây nhà đã được thêm vào Chuyện trong nhà.", duration: 2800 });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3600 });
    } finally {
      setBusy(false);
    }
  }, [busy, familyId, graphActivitySession, showToast, user, userProfile?.displayName]);

  const openCreatePerson = useCallback(() => {
    router.push("/family-graph-person-editor" as never);
  }, [router]);

  const openEditPerson = useCallback((person: FamilyPerson) => {
    router.push({
      pathname: "/family-graph-person-editor",
      params: { personId: person.id },
    } as never);
  }, [router]);

  useEffect(() => {
    const requestedId = typeof params.editPersonId === "string" ? params.editPersonId : null;
    if (!requestedId || openedEditParamRef.current === requestedId) return;
    const person = peopleById.get(requestedId);
    if (!person) return;
    openedEditParamRef.current = requestedId;
    router.replace({
      pathname: "/family-graph-person-editor",
      params: { personId: requestedId },
    } as never);
  }, [params.editPersonId, peopleById, router]);

  const goToTree = useCallback(() => {
    if (cameFromGraph) {
      router.back();
      return;
    }
    router.replace("/family-graph" as never);
  }, [cameFromGraph, router]);

  const submitPerson = async () => {
    if (!familyId || !user || busy) return;

    const currentYear = new Date().getFullYear();
    const birthYearText = personDraft.birthYear.trim();
    const deathYearText = personDraft.deathYear.trim();
    const birthYear = birthYearText ? Number(birthYearText) : null;
    const deathYear = personDraft.lifeStatus === "deceased" && deathYearText ? Number(deathYearText) : null;

    if (!personDraft.displayName.trim()) {
      showToast({ type: "warning", title: "Thiếu họ tên", message: "Hãy nhập họ và tên của người này." });
      return;
    }
    if (birthYearText && (!Number.isInteger(birthYear) || birthYear! < 1800 || birthYear! > currentYear)) {
      showToast({ type: "warning", title: "Năm sinh chưa hợp lệ", message: "Hãy nhập năm sinh bằng 4 chữ số hợp lệ." });
      return;
    }
    if (deathYearText && personDraft.lifeStatus === "deceased" && (!Number.isInteger(deathYear) || deathYear! < 1800 || deathYear! > currentYear)) {
      showToast({ type: "warning", title: "Năm mất chưa hợp lệ", message: "Hãy nhập năm mất bằng 4 chữ số hợp lệ." });
      return;
    }
    if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
      showToast({ type: "warning", title: "Mốc thời gian chưa hợp lệ", message: "Năm mất không thể nhỏ hơn năm sinh." });
      return;
    }

    const commonPayload = {
      displayName: personDraft.displayName.trim(),
      nickname: personDraft.nickname.trim() || null,
      gender: personDraft.gender,
      lifeStatus: personDraft.lifeStatus,
      birthDate: dateToDateOnly(personDraft.birthDate),
      birthYear,
      deathDate: personDraft.lifeStatus === "deceased" ? dateToDateOnly(personDraft.deathDate) : null,
      deathYear: personDraft.lifeStatus === "deceased" ? deathYear : null,
      birthPlace: personDraft.birthPlace.trim() || null,
      description: personDraft.description.trim() || null,
    };

    setBusy(true);
    try {
      let personId = editingPersonId;
      if (editingPersonId) {
        await familyGraphMutationService.updatePerson(familyId, editingPersonId, commonPayload);
      } else {
        const created = await familyGraphMutationService.createPerson(familyId, {
          ...commonPayload,
          linkedUid: personDraft.linkedUid,
        });
        personId = created.personId;
      }

      let avatarUpdated = true;
      if (personId && personDraft.avatarDirty) {
        try {
          if (!personDraft.avatarUri) {
            await familyGraphMutationService.setPersonAvatar(familyId, personId, null, null);
          } else {
            const fileId = `person-avatar-${personId}-${Date.now()}`;
            const { asset, result } = await mediaService.uploadManaged(
              avatarFileFromUri(personDraft.avatarUri, fileId),
              {
                ownerUid: user.uid,
                familyId,
                purpose: "avatar",
                entityType: "person",
                entityId: personId,
                category: APP_CATEGORIES.PERSONS,
              },
            );

            try {
              await familyGraphMutationService.setPersonAvatar(familyId, personId, result.secureUrl, asset.id);
            } catch (avatarAttachError) {
              await mediaService.markCleanupPending(asset.id).catch(() => {});
              throw avatarAttachError;
            }
          }
        } catch (avatarError) {
          avatarUpdated = false;
          showToast({
            type: "warning",
            title: "Thông tin đã lưu, ảnh chưa cập nhật",
            message: "Avatar là tùy chọn. Bạn có thể mở lại người này và thử chọn ảnh sau.",
            duration: 4200,
          });
        }
      }

      let sentNewPersonNotice = false;
      if (!editingPersonId && personId) {
        try {
          await activityService.createGraphNotice({
            familyId,
            actorUid: user.uid,
            actorName: userProfile?.displayName || "Người giữ nhà",
            title: `Nhà Mình vừa thêm hồ sơ ${commonPayload.displayName}`,
            body: "Đã thêm người thân vào hồ sơ phả hệ; hãy nối quan hệ để hiển thị trên cây.",
            sessionId: `person-created-${personId}`,
          });
          sentNewPersonNotice = true;
        } catch {
          // A notification failure cannot roll back the successful Person write.
        }
      }
      if (editingPersonId || !sentNewPersonNotice) recordGraphChange({
        kind: editingPersonId ? "person_updated" : "person_added",
        personName: commonPayload.displayName,
      });
      if (!personDraft.avatarDirty || avatarUpdated) {
        showToast({
          type: "success",
          title: editingPersonId ? "Đã lưu thay đổi" : sentNewPersonNotice ? "Đã thêm người, báo cả nhà" : "Đã thêm người, cần báo cả nhà",
          message: editingPersonId
            ? "Thông tin người trong phả hệ đã được lưu."
            : sentNewPersonNotice ? "Người thân được thêm và thông báo đã được gửi." : "Hồ sơ đã lưu; bạn có thể chọn Báo cả nhà để gửi lại.",
          duration: 2600,
        });
      }
      if (editingPersonId) {
        setPersonModalVisible(false);
      } else {
        // Standalone person creation is repeatable without navigating to Full Tree.
        setPersonDraft({ ...EMPTY_PERSON });
        setEditingPersonId(null);
        setSelectedPersonId(null);
      }
    } catch (nextError) {
      showToast({ ...parseAppError(nextError), duration: 4200 });
    } finally {
      setBusy(false);
    }
  };

  const openRelationship = useCallback((basePersonId?: string, mode: RelationshipMode = "parent_of") => {
    router.push({
      pathname: "/family-graph-relationship-editor",
      params: {
        ...(basePersonId ? { basePersonId } : {}),
        mode,
      },
    } as never);
  }, [router]);

  const unlinkPerson = useCallback((person: FamilyPerson) => {
    if (!familyId || !person.linkedUid) return;
    setConfirmAction({ kind: "unlink", personId: person.id, personName: person.displayName });
  }, [familyId]);

  const deletePerson = useCallback((person: FamilyPerson) => {
    if (!familyId) return;
    setConfirmAction({ kind: "delete_person", personId: person.id, personName: person.displayName });
  }, [familyId]);

  const deleteRelationship = useCallback((relationship: FamilyRelationship) => {
    if (!familyId) return;
    const a = peopleById.get(relationship.personAId)?.displayName ?? "Người A";
    const b = peopleById.get(relationship.personBId)?.displayName ?? "Người B";
    setConfirmAction({
      kind: "delete_relationship",
      relationshipId: relationship.id,
      label: relationship.type === "partner" ? `${a} ↔ ${b}` : `${a} → ${b}`,
    });
  }, [familyId, peopleById]);

  const performConfirmAction = async () => {
    if (!familyId || !confirmAction || busy) return;
    let ok = false;
    if (confirmAction.kind === "unlink") {
      ok = await runMutation(
        () => familyGraphMutationService.unlinkPerson(familyId, confirmAction.personId),
        "Đã bỏ liên kết tài khoản; người này vẫn còn trong cây.",
      );
    } else if (confirmAction.kind === "delete_person") {
      ok = await runMutation(
        () => familyGraphMutationService.deletePersonCascade(familyId, confirmAction.personId),
        "Đã xóa người và các đường quan hệ trực tiếp khỏi phả hệ.",
      );
    } else {
      ok = await runMutation(
        () => familyGraphMutationService.deleteRelationship(familyId, confirmAction.relationshipId),
        "Đã gỡ mối quan hệ; cả hai người vẫn được giữ nguyên.",
      );
    }
    if (ok) {
      if (confirmAction.kind === "delete_person") {
        recordGraphChange({ kind: "person_deleted", personName: confirmAction.personName });
      } else if (confirmAction.kind === "delete_relationship") {
        recordGraphChange({ kind: "relationship_deleted" });
      } else {
        recordGraphChange({ kind: "link_changed", personName: confirmAction.personName });
      }
      setConfirmAction(null);
    }
  };

  const closeRelationshipModal = useCallback(() => setRelationshipModalConfig(null), []);

  const confirmDialogCopy = confirmAction?.kind === "unlink"
    ? {
        eyebrow: "LIÊN KẾT TÀI KHOẢN",
        icon: "unlink-outline" as const,
        title: "Bỏ liên kết tài khoản?",
        message: `${confirmAction.personName} vẫn được giữ nguyên trong phả hệ. Bloom chỉ gỡ liên kết với tài khoản Family Bloom.`,
        confirmLabel: "Bỏ liên kết",
      }
    : confirmAction?.kind === "delete_person"
      ? {
          eyebrow: "XÓA NGƯỜI",
          icon: "person-remove-outline" as const,
          title: `Xóa ${confirmAction.personName} khỏi phả hệ?`,
          message: "Người này sẽ được gỡ khỏi phả hệ cùng các mối quan hệ trực tiếp. Những kỷ niệm và tài khoản đã liên kết vẫn được Bloom bảo vệ.",
          confirmLabel: "Xóa người",
        }
      : confirmAction?.kind === "delete_relationship"
        ? {
            eyebrow: "SỬA ĐƯỜNG NỐI",
            icon: "git-branch-outline" as const,
            title: "Xóa đường quan hệ này?",
            message: `${confirmAction.label} sẽ được gỡ khỏi cây. Cả hai người vẫn được giữ nguyên để bạn nối lại đúng.`,
            confirmLabel: "Xóa đường nối",
          }
        : null;

  const renderAdminPersonItem = useCallback(({ item: person }: { item: FamilyPerson }) => {
    const linkedMember = person.linkedUid ? memberByUid.get(person.linkedUid) ?? null : null;
    const selected = selectedPersonId === person.id;
    const unassigned = !connectedPersonIds.has(person.id);
    const branchCount = relationshipCountByPerson.get(person.id) ?? 0;
    return (
      <Pressable
        onPress={() => setSelectedPersonId(selected ? null : person.id)}
        style={({ pressed }) => [
          __a3_styles.personCard,
          unassigned && __a3_styles.personCardUnassigned,
          selected && __a3_styles.personCardSelected,
          pressed && __a3_styles.pressed,
        ]}
      >
        <View style={__a3_styles.personAvatar}>
          <Text style={__a3_styles.personAvatarText}>{getGivenNameInitial(person.displayName)}</Text>
        </View>
        <View style={__a3_styles.personCopy}>
          <View style={__a3_styles.personNameRow}>
            <Text style={__a3_styles.personName} numberOfLines={1}>{person.displayName}</Text>
            <View style={[__a3_styles.branchPill, branchCount === 0 && __a3_styles.branchPillEmpty]}>
              <Ionicons name="git-branch-outline" size={11} color={branchCount === 0 ? __a3Colors.secondaryText : __a3Colors.primary} />
              <Text style={[__a3_styles.branchPillText, branchCount === 0 && __a3_styles.branchPillTextEmpty]}>{branchCount} nhánh</Text>
            </View>
          </View>
          <View style={__a3_styles.personStatusRow}>
            {unassigned && (
              <View style={__a3_styles.unassignedPill}>
                <Ionicons name="leaf-outline" size={11} color={__a3Colors.primary} />
                <Text style={__a3_styles.unassignedPillText}>Chưa vào cây</Text>
              </View>
            )}
            <Text style={__a3_styles.personMeta} numberOfLines={1}>
              {genderLabel[person.gender]} · {person.birthYear ?? "chưa rõ năm sinh"} · {lifeLabel[person.lifeStatus]}
            </Text>
          </View>
          <View style={__a3_styles.linkStatus}>
            <Ionicons name={person.linkedUid ? "link" : "unlink-outline"} size={13} color={person.linkedUid ? __a3Colors.primary : __a3Colors.secondaryText} />
            <Text style={__a3_styles.linkStatusText} numberOfLines={1}>
              {linkedMember?.displayName || (person.linkedUid ? "Đã liên kết thành viên" : "Chưa liên kết tài khoản")}
            </Text>
          </View>
        </View>
        <Ionicons name={selected ? "chevron-up" : "chevron-down"} size={18} color={__a3Colors.secondaryText} />

        {selected && (
          <View style={__a3_styles.personActions}>
            <SmallAction icon="create-outline" label="Sửa" onPress={() => openEditPerson(person)} />
            <SmallAction icon="arrow-up-circle-outline" label="Cha/Mẹ" onPress={() => openRelationship(person.id, "child_of")} />
            <SmallAction icon="arrow-down-circle-outline" label="Con" onPress={() => openRelationship(person.id, "parent_of")} />
            <SmallAction icon="heart-outline" label="Vợ/Chồng" onPress={() => openRelationship(person.id, "partner")} />
            {person.linkedUid ? (
              <SmallAction icon="unlink-outline" label="Bỏ link" onPress={() => unlinkPerson(person)} />
            ) : (
              <SmallAction icon="link-outline" label="Liên kết" onPress={() => setLinkModalPersonId(person.id)} />
            )}
            <SmallAction icon="person-remove-outline" label="Xóa người" danger onPress={() => deletePerson(person)} />
          </View>
        )}
      </Pressable>
    );
  }, [themeRevision, connectedPersonIds, deletePerson, memberByUid, openEditPerson, openRelationship, relationshipCountByPerson, selectedPersonId, unlinkPerson, __a3Colors, __a3_styles]);

  const renderAdminSectionHeader = useCallback(({ section }: { section: { title: string; data: FamilyPerson[] } }) => (
    <View style={__a3_styles.alphaHeader}>
      <Text style={__a3_styles.alphaHeaderText}>{section.title}</Text>
      <View style={__a3_styles.alphaHeaderLine} />
      <Text style={__a3_styles.alphaHeaderCount}>{section.data.length}</Text>
    </View>
  ), [__a3_styles]);

  const adminListHeader = useMemo(() => (
    <>
      <BloomCard tone="accent" style={__a3_styles.summaryCard}>
        <View style={__a3_styles.summaryIcon}><Ionicons name="git-network-outline" size={25} color={__a3Colors.primary} /></View>
        <View style={__a3_styles.summaryCopy}>
          <Text style={__a3_styles.summaryTitle}>{membership?.familyName || "Gia đình của mình"}</Text>
          <Text style={__a3_styles.summaryText}>{snapshot.persons.length} người · {snapshot.relationships.length} mối quan hệ</Text>
        </View>
      </BloomCard>

      {graphActivitySession && (
        <BloomCard style={__a3_styles.graphNoticeCard}>
          <View style={__a3_styles.graphNoticeIcon}><Ionicons name="notifications-outline" size={20} color={__a3Colors.primary} /></View>
          <View style={__a3_styles.graphNoticeCopy}>
            <Text style={__a3_styles.graphNoticeTitle}>Thông báo thay đổi cho gia đình?</Text>
            <Text style={__a3_styles.graphNoticeText}>
              {graphActivitySession.changes.length === 1
                ? "Bloom sẽ nói ngắn gọn về thay đổi vừa hoàn tất."
                : `${graphActivitySession.changes.length} thay đổi sẽ được gom thành một thông báo ngắn.`}
            </Text>
          </View>
          <Pressable disabled={busy} onPress={() => void notifyGraphChanges()} style={({ pressed }) => [__a3_styles.graphNoticeButton, pressed && __a3_styles.pressed]}>
            <Text style={__a3_styles.graphNoticeButtonText}>{busy ? "Đang gửi…" : "Thông báo"}</Text>
          </Pressable>
        </BloomCard>
      )}

      <View style={__a3_styles.actionRow}>
        <BloomButton title="Thêm người" icon="person-add-outline" onPress={openCreatePerson} customStyle={__a3_styles.actionButton} />
        <BloomButton
          title="Nối quan hệ"
          icon="git-branch-outline"
          variant="outline"
          disabled={snapshot.persons.length < 2}
          onPress={() => openRelationship()}
          customStyle={__a3_styles.actionButton}
        />
      </View>

      <View style={__a3_styles.section}>
        <BloomSectionHeader
          title="Người trong phả hệ"
          subtitle={unassignedPersonCount
            ? `${unassignedPersonCount} người chưa được nối vào cây · Chạm để chỉnh hoặc nối quan hệ`
            : "Chọn một người để chỉnh, liên kết tài khoản hoặc nối thêm nhánh"}
        />
        {loading ? (
          <BloomEmptyState icon="hourglass-outline" title="Đang tải phả hệ" description="Bloom đang mở dữ liệu phả hệ của nhà mình." compact />
        ) : error ? (
          <BloomEmptyState icon="cloud-offline-outline" title="Chưa tải được dữ liệu" description="Kiểm tra kết nối rồi thử lại nhé." compact />
        ) : snapshot.persons.length === 0 ? (
          <BloomEmptyState icon="leaf-outline" title="Chưa có người nào" description="Bấm “Thêm người” để tạo người đầu tiên trong phả hệ. Bạn có thể liên kết người đó với chính mình." compact />
        ) : null}
      </View>
    </>
  ), [themeRevision, busy, error, graphActivitySession, loading, membership?.familyName, notifyGraphChanges, openCreatePerson, openRelationship, snapshot.persons.length, snapshot.relationships.length, unassignedPersonCount, __a3Colors, __a3_styles]);

  const adminListFooter = useMemo(() => (
    <>
      <View style={__a3_styles.section}>
        <BloomSectionHeader title="Các đường quan hệ" subtitle="Dùng phần này để kiểm tra và xóa nhanh một quan hệ tạo nhầm" />
        {snapshot.relationships.length === 0 ? (
          <BloomEmptyState icon="git-branch-outline" title="Chưa có mối quan hệ" description="Thêm ít nhất hai người rồi nối cha/mẹ–con hoặc vợ/chồng." compact />
        ) : (
          <BloomCard style={__a3_styles.relationshipCard}>
            {visibleRelationships.map((relationship, index) => {
              const a = peopleById.get(relationship.personAId);
              const b = peopleById.get(relationship.personBId);
              return (
                <View key={relationship.id}>
                  <View style={__a3_styles.relationshipRow}>
                    <View style={__a3_styles.relationshipIcon}>
                      <Ionicons name={relationship.type === "partner" ? "heart" : "git-branch-outline"} size={17} color={__a3Colors.primary} />
                    </View>
                    <View style={__a3_styles.relationshipCopy}>
                      <Text style={__a3_styles.relationshipTitle} numberOfLines={2}>
                        {relationship.type === "partner"
                          ? `${a?.displayName ?? "?"} ↔ ${b?.displayName ?? "?"}`
                          : `${a?.displayName ?? "?"} → ${b?.displayName ?? "?"}`}
                      </Text>
                      <Text style={__a3_styles.relationshipMeta}>
                        {relationship.type === "partner"
                          ? partnerStatusLabel[relationship.partnerStatus ?? "partner"]
                          : `Cha/Mẹ → Con · ${parentSubtypeLabel[relationship.subtype ?? "unknown"]}`}
                      </Text>
                    </View>
                    <Pressable onPress={() => deleteRelationship(relationship)} hitSlop={8} style={__a3_styles.deleteIcon}>
                      <Ionicons name="trash-outline" size={18} color={__a3Colors.destructive} />
                    </Pressable>
                  </View>
                  {index < visibleRelationships.length - 1 && <View style={__a3_styles.divider} />}
                </View>
              );
            })}
            {snapshot.relationships.length > 10 && (
              <Pressable
                onPress={() => setShowAllRelationships((value) => !value)}
                style={({ pressed }) => [__a3_styles.relationshipMoreButton, pressed && __a3_styles.pressed]}
              >
                <Ionicons name={showAllRelationships ? "chevron-up" : "chevron-down"} size={16} color={__a3Colors.primary} />
                <Text style={__a3_styles.relationshipMoreText}>
                  {showAllRelationships ? "Thu gọn danh sách" : `Xem thêm ${snapshot.relationships.length - visibleRelationships.length} đường quan hệ`}
                </Text>
              </Pressable>
            )}
          </BloomCard>
        )}
      </View>

      <BloomButton title="Xem cây phả hệ" icon="git-network-outline" onPress={goToTree} customStyle={__a3_styles.treeButton} />
    </>
  ), [themeRevision, deleteRelationship, goToTree, peopleById, showAllRelationships, snapshot.relationships.length, visibleRelationships, __a3Colors, __a3_styles]);

  if (!familyId) {
    return (
      <ScreenContainer>
        <View style={__a3_styles.centerState}><Text style={__a3_styles.emptyTitle}>Chưa có family đang hoạt động.</Text></View>
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
        <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
        <View style={__a3_styles.screen}>
          <AdminHeader title="Quản lý phả hệ" onBack={() => router.back()} />
          <View style={__a3_styles.centerState}>
            <Ionicons name="lock-closed-outline" size={34} color={__a3Colors.secondaryText} />
            <Text style={__a3_styles.emptyTitle}>Chỉ người giữ nhà mới có thể chỉnh phả hệ</Text>
            <Text style={__a3_styles.emptyText}>Bạn vẫn có thể quay lại màn hình cây để xem dữ liệu gia đình.</Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <View style={__a3_styles.screen}>
        <AdminHeader title="Xây phả hệ" onBack={() => router.back()} onTree={goToTree} />

        <SectionList
          sections={loading || error ? [] : personSections}
          keyExtractor={(item) => item.id}
          renderItem={renderAdminPersonItem}
          renderSectionHeader={renderAdminSectionHeader}
          ListHeaderComponent={adminListHeader}
          ListFooterComponent={adminListFooter}
          extraData={selectedPersonId}
          contentContainerStyle={__a3_styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          stickySectionHeadersEnabled={false}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          updateCellsBatchingPeriod={48}
          removeClippedSubviews={Platform.OS === "android"}
        />
      </View>

      <LinkMemberModal
        visible={!!linkModalPerson}
        person={linkModalPerson}
        members={availableMembers}
        busy={busy}
        onClose={() => !busy && setLinkModalPersonId(null)}
        onSelect={async (uid) => {
          if (!familyId || !linkModalPerson) return;
          const ok = await runMutation(
            () => familyGraphMutationService.linkPerson(familyId, linkModalPerson.id, uid),
            "Đã liên kết người này với thành viên Family Bloom.",
          );
          if (ok) {
            recordGraphChange({ kind: "link_changed", personName: linkModalPerson.displayName });
            setLinkModalPersonId(null);
          }
        }}
      />

      <BloomConfirmDialog
        visible={!!confirmAction && !!confirmDialogCopy}
        eyebrow={confirmDialogCopy?.eyebrow}
        icon={confirmDialogCopy?.icon}
        title={confirmDialogCopy?.title ?? "Xác nhận thay đổi"}
        message={confirmDialogCopy?.message ?? ""}
        cancelLabel="Giữ nguyên"
        confirmLabel={confirmDialogCopy?.confirmLabel ?? "Xác nhận"}
        destructive={confirmAction?.kind !== "unlink"}
        loading={busy}
        onCancel={() => !busy && setConfirmAction(null)}
        onConfirm={() => void performConfirmAction()}
      />
    </ScreenContainer>
  );
}

function AdminHeader({ title, onBack, onTree }: { title: string; onBack: () => void; onTree?: () => void }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <BloomHeroHeader
      eyebrow="PHẢ HỆ GIA ĐÌNH"
      title={title}
      subtitle={title === "Xây phả hệ"
        ? "Cùng lưu giữ và nối các thế hệ để mỗi nhánh trong nhà đều có một câu chuyện rõ ràng."
        : "Chăm chút từng người và từng đường nối để phả hệ của gia đình luôn đúng và dễ hiểu."}
      variant="tree"
      onBack={onBack}
      right={onTree ? (
        <Pressable onPress={onTree} style={({ pressed }) => [__a3_styles.headerIcon, pressed && __a3_styles.pressed]}>
          <Ionicons name="git-network-outline" size={22} color={__a3Colors.primaryText} />
        </Pressable>
      ) : undefined}
    />
  );
}

function SmallAction({ icon, label, danger, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <Pressable onPress={(event) => { event.stopPropagation(); onPress(); }} style={({ pressed }) => [__a3_styles.smallAction, danger && __a3_styles.smallActionDanger, pressed && __a3_styles.pressed]}>
      <Ionicons name={icon} size={16} color={danger ? __a3Colors.destructive : __a3Colors.primaryText} />
      <Text style={[__a3_styles.smallActionText, danger && __a3_styles.smallActionTextDanger]}>{label}</Text>
    </Pressable>
  );
}

function PersonEditorModal({
  visible,
  editing,
  draft,
  setDraft,
  availableMembers,
  busy,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  editing: boolean;
  draft: PersonDraft;
  setDraft: (next: PersonDraft) => void;
  availableMembers: Array<{ uid: string; displayName: string }>;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const patch = (next: Partial<PersonDraft>) => setDraft({ ...draft, ...next });
  return (
    <BloomFullScreenFlow
      visible={visible}
      eyebrow={editing ? "CHỈNH NGƯỜI TRONG PHẢ HỆ" : "NGƯỜI MỚI TRONG NHÀ"}
      title={editing ? "Chăm chút câu chuyện của người thân" : "Thêm một người vào dòng chảy gia đình"}
      subtitle={editing
        ? "Sửa những điều bạn biết là đúng để mỗi nhánh trong phả hệ luôn rõ ràng và gần gũi."
        : "Bắt đầu bằng vài thông tin quen thuộc. Quan hệ với mọi người có thể nối ngay sau đó."}
      variant="profile"
      onBack={onClose}
      backDisabled={busy}
    >
      <BloomKeyboardScreen contentContainerStyle={__a3_styles.fullFlowContent}>
          <View style={__a3_styles.personEditorIntro}>
            <View style={__a3_styles.personEditorIntroIcon}>
              <Ionicons name={editing ? "create-outline" : "person-add-outline"} size={20} color={__a3Colors.primary} />
            </View>
            <View style={__a3_styles.personEditorIntroCopy}>
              <Text style={__a3_styles.personEditorIntroTitle}>{editing ? "Một người, một câu chuyện" : "Gieo một nhành mới"}</Text>
              <Text style={__a3_styles.personEditorIntroText}>Chỉ cần điền những điều cả nhà nhớ rõ. Phần nào chưa chắc, mình cứ để dành rồi bổ sung sau nhé.</Text>
            </View>
          </View>

          <BloomInputAvatar
            value={draft.avatarUri}
            fallbackText={draft.displayName || "Thành viên"}
            disabled={busy}
            onChange={(avatarUri) => patch({ avatarUri, avatarDirty: true })}
          />

          <BloomTextInput label="Họ và tên *" value={draft.displayName} onChangeText={(value) => patch({ displayName: value })} placeholder="Nguyễn Văn An" autoCapitalize="words" />
          <BloomTextInput label="Tên thường gọi" value={draft.nickname} onChangeText={(value) => patch({ nickname: value })} placeholder="An" autoCapitalize="words" />
          <Field label="Giới tính">
            <View style={__a3_styles.chips}>{(["male", "female", "other"] as Gender[]).map((gender) => <BloomChipButton key={gender} label={genderLabel[gender]} selected={draft.gender === gender} onPress={() => patch({ gender })} />)}</View>
          </Field>

          <Field label="Tình trạng">
            <View style={__a3_styles.chips}>
              {(["living", "deceased", "unknown"] as FamilyPersonLifeStatus[]).map((status) => (
                <BloomChipButton
                  key={status}
                  label={lifeLabel[status]}
                  selected={draft.lifeStatus === status}
                  onPress={() => patch(status === "deceased"
                    ? { lifeStatus: status }
                    : { lifeStatus: status, deathYear: "", deathDate: undefined })}
                />
              ))}
            </View>
          </Field>

          {draft.lifeStatus === "deceased" && (
            <View style={__a3_styles.sensitiveNotice}>
              <Ionicons name="shield-checkmark-outline" size={18} color={__a3Colors.primary} />
              <Text style={__a3_styles.sensitiveNoticeText}>
                Với người đã đi xa, mình chỉ cần giữ lại những mốc cả nhà nhớ rõ. Điều nào chưa chắc, cứ để trống để câu chuyện luôn nhẹ nhàng và đúng với ký ức.
              </Text>
            </View>
          )}

          <YearDateField
            label="Năm sinh"
            year={draft.birthYear}
            date={draft.birthDate}
            placeholder="1988"
            maximumDate={new Date()}
            onYearChange={(value) => patch({
              birthYear: value,
              birthDate: draft.birthDate && value === String(draft.birthDate.getFullYear()) ? draft.birthDate : undefined,
            })}
            onDateChange={(date) => patch({ birthDate: date, birthYear: String(date.getFullYear()) })}
            onClearDate={() => patch({ birthDate: undefined })}
          />

          {draft.lifeStatus === "deceased" && (
            <YearDateField
              label="Năm mất"
              year={draft.deathYear}
              date={draft.deathDate}
              placeholder="2020"
              minimumDate={draft.birthDate}
              maximumDate={new Date()}
              onYearChange={(value) => patch({
                deathYear: value,
                deathDate: draft.deathDate && value === String(draft.deathDate.getFullYear()) ? draft.deathDate : undefined,
              })}
              onDateChange={(date) => patch({ deathDate: date, deathYear: String(date.getFullYear()) })}
              onClearDate={() => patch({ deathDate: undefined })}
            />
          )}

          <BloomTextInput label="Nơi sinh" value={draft.birthPlace} onChangeText={(value) => patch({ birthPlace: value })} placeholder="TP. Hồ Chí Minh" helperText="Một nơi thân quen cũng đủ để câu chuyện của người thân rõ hơn một chút." />
          <BloomTextInput label={`Câu chuyện / Note · ${draft.description.length}/2500`} value={draft.description} onChangeText={(value) => patch({ description: value })} maxLength={2500} placeholder="Một thói quen, một câu nói hay điều cả nhà luôn nhớ…" multiline helperText="Không cần viết nhiều — vài lời ấm áp cũng đủ để giữ lại nét riêng của người ấy." />

          {!editing && (
            <Field label="Liên kết tài khoản Family Bloom (không bắt buộc)">
              <View style={__a3_styles.chips}>
                <BloomChipButton label="Chưa liên kết" selected={!draft.linkedUid} onPress={() => patch({ linkedUid: null })} />
                {availableMembers.map((member) => (
                  <BloomChipButton key={member.uid} label={member.displayName} selected={draft.linkedUid === member.uid} onPress={() => patch({ linkedUid: member.uid })} />
                ))}
              </View>
            </Field>
          )}

          <BloomButton title={editing ? "Lưu thay đổi" : "Thêm vào phả hệ"} icon={editing ? "save-outline" : "person-add-outline"} isLoading={busy} onPress={onSubmit} customStyle={__a3_styles.submitButton} />
      </BloomKeyboardScreen>
    </BloomFullScreenFlow>
  );
}

const joinNames = (names: string[]): string => {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} và ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} và ${names[names.length - 1]}`;
};

const parentChildPhrase = (mode: Exclude<RelationshipMode, "partner">, subtype: ParentChildSubtype): string => {
  if (mode === "child_of") {
    if (subtype === "biological") return "là con ruột của";
    if (subtype === "adoptive") return "là con nuôi của";
    if (subtype === "step") return "là con kế của";
    return "là con của";
  }
  if (subtype === "biological") return "là cha/mẹ ruột của";
  if (subtype === "adoptive") return "là cha/mẹ nuôi của";
  if (subtype === "step") return "là cha/mẹ kế của";
  return "là cha/mẹ của";
};

const RelationshipPickerPersonRow = memo(function RelationshipPickerPersonRow({
  person,
  selected,
  branchCount,
  onToggle,
}: {
  person: FamilyPerson;
  selected: boolean;
  branchCount: number;
  onToggle: (personId: string) => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <Pressable
      onPress={() => onToggle(person.id)}
      style={({ pressed }) => [__a3_styles.pickerPersonRow, selected && __a3_styles.pickerPersonRowSelected, pressed && __a3_styles.pressed]}
    >
      <View style={[__a3_styles.pickerPersonAvatar, selected && __a3_styles.pickerPersonAvatarSelected]}>
        <Text style={__a3_styles.pickerPersonAvatarText}>{getGivenNameInitial(person.displayName)}</Text>
      </View>
      <View style={__a3_styles.pickerPersonCopy}>
        <Text style={__a3_styles.pickerPersonName} numberOfLines={1}>{person.displayName}</Text>
        <Text style={__a3_styles.pickerPersonMeta} numberOfLines={1}>{genderLabel[person.gender]} · {person.birthYear ?? "chưa rõ năm sinh"}</Text>
      </View>
      <View style={__a3_styles.pickerBranchBadge}>
        <Ionicons name="git-branch-outline" size={12} color={branchCount ? __a3Colors.primary : __a3Colors.secondaryText} />
        <Text style={__a3_styles.pickerBranchText}>{branchCount}</Text>
      </View>
      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? __a3Colors.primary : __a3Colors.border} />
    </Pressable>
  );
});

const RelationshipModal = memo(function RelationshipModal({
  visible,
  familyId,
  people,
  relationships,
  initialMode,
  initialBasePersonId,
  onClose,
}: {
  visible: boolean;
  familyId: string | null;
  people: FamilyPerson[];
  relationships: FamilyRelationship[];
  initialMode: RelationshipMode;
  initialBasePersonId: string | null;
  onClose: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const { showToast } = useBloomToast();
  const [mode, setMode] = useState<RelationshipMode>(initialMode);
  const [subtype, setSubtype] = useState<ParentChildSubtype>("unknown");
  const [partnerStatus, setPartnerStatus] = useState<PartnerStatus>("married");
  const [baseIds, setBaseIds] = useState<string[]>(initialBasePersonId ? [initialBasePersonId] : []);
  const [targetIds, setTargetIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [pickerSide, setPickerSide] = useState<"base" | "target" | null>(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerReady, setPickerReady] = useState(false);
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const relationshipCountByPerson = useMemo(() => {
    const counts = new Map<string, number>();
    relationships.forEach((relationship) => {
      counts.set(relationship.personAId, (counts.get(relationship.personAId) ?? 0) + 1);
      counts.set(relationship.personBId, (counts.get(relationship.personBId) ?? 0) + 1);
    });
    return counts;
  }, [relationships]);
  const parentRelationshipByPair = useMemo(() => {
    const map = new Map<string, FamilyRelationship>();
    relationships.forEach((relationship) => {
      if (relationship.type === "parent_child") map.set(`${relationship.personAId}::${relationship.personBId}`, relationship);
    });
    return map;
  }, [relationships]);
  const partnerPairs = useMemo(() => {
    const pairs = new Set<string>();
    relationships.forEach((relationship) => {
      if (relationship.type !== "partner") return;
      const [a, b] = [relationship.personAId, relationship.personBId].sort();
      pairs.add(`${a}::${b}`);
    });
    return pairs;
  }, [relationships]);

  useEffect(() => {
    if (!visible) {
      setPickerSide(null);
      setPickerSearch("");
      return;
    }
    setMode(initialMode);
    setSubtype("unknown");
    setPartnerStatus("married");
    setBaseIds(initialBasePersonId ? [initialBasePersonId] : []);
    setTargetIds([]);
    setPickerSide(null);
    setPickerSearch("");
    setBusy(false);
  }, [initialBasePersonId, initialMode, visible]);

  useEffect(() => {
    let frame2: number | null = null;
    if (!pickerSide) {
      setPickerReady(false);
      return;
    }
    setPickerReady(false);
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setPickerReady(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      if (frame2 !== null) cancelAnimationFrame(frame2);
    };
  }, [pickerSide]);

  const selectedNames = baseIds.map((id) => peopleById.get(id)?.displayName).filter((name): name is string => !!name);
  const referenceNames = targetIds.map((id) => peopleById.get(id)?.displayName).filter((name): name is string => !!name);
  const parentIds = mode === "parent_of" ? baseIds : targetIds;
  const childIds = mode === "parent_of" ? targetIds : baseIds;

  const batchStats = useMemo(() => {
    if (mode === "partner") {
      const a = baseIds[0];
      const b = targetIds[0];
      const key = a && b ? [a, b].sort().join("::") : "";
      const exists = !!key && partnerPairs.has(key);
      return { requested: a && b ? 1 : 0, existing: exists ? 1 : 0, conflict: 0 };
    }

    let existing = 0;
    let conflict = 0;
    for (const parentId of parentIds) {
      for (const childId of childIds) {
        const relationship = parentRelationshipByPair.get(`${parentId}::${childId}`);
        if (!relationship) continue;
        if ((relationship.subtype ?? "unknown") === subtype) existing += 1;
        else conflict += 1;
      }
    }
    return { requested: parentIds.length * childIds.length, existing, conflict };
  }, [baseIds, childIds, mode, parentIds, parentRelationshipByPair, partnerPairs, subtype, targetIds]);

  const preview = selectedNames.length && referenceNames.length
    ? mode === "partner"
      ? `${joinNames(selectedNames)} là ${partnerStatusLabel[partnerStatus].toLowerCase()} của ${joinNames(referenceNames)}.`
      : `${joinNames(selectedNames)} ${parentChildPhrase(mode, subtype)} ${joinNames(referenceNames)}.`
    : "Chọn đủ hai phía để Bloom kiểm tra các đường quan hệ sẽ tạo.";

  const changeMode = (nextMode: RelationshipMode) => {
    setMode(nextMode);
    if (nextMode === "partner") {
      setBaseIds(baseIds.slice(0, 1));
      setTargetIds(targetIds.slice(0, 1));
    }
  };

  const disabled = busy
    || baseIds.length === 0
    || targetIds.length === 0
    || batchStats.conflict > 0
    || (mode === "partner" && (baseIds.length !== 1 || targetIds.length !== 1 || batchStats.existing > 0));

  const submitRelationship = async (warningsApproved=false) => {
    if (!familyId || baseIds.length === 0 || targetIds.length === 0 || busy) {
      if (!busy) showToast({ type: "warning", title: "Chưa đủ người", message: "Hãy chọn người ở cả hai phía của mối quan hệ." });
      return;
    }

    // Preflight only when Save is tapped; the graph snapshot is already in memory.
    // No read per selection, and no background scan on screen mount.
    // Re-run blockers even when an admin acknowledges a warning. A confirmation
    // must NEVER bypass structural integrity if selections changed meanwhile.
    {
      const stamp='2026-01-01T00:00:00.000Z';
      const make=(a:string,b:string,type:'partner'|'parent_child'):FamilyRelationship=>({
        id:type==='partner'?getPartnerRelationshipId(a,b):getParentChildRelationshipId(a,b),
        familyId,type,personAId:a,personBId:b,
        subtype:type==='parent_child'?subtype:null,partnerStatus:type==='partner'?partnerStatus:null,
        startDate:null,endDate:null,createdByUid:'',createdAt:stamp,updatedAt:stamp,
      });
      const currentSnapshot = { familyId, persons: people, relationships };
      const existing = new Set(currentSnapshot.relationships.map(r => r.id));
      const proposed:FamilyRelationship[] = mode==='partner'
        ? baseIds[0]!==targetIds[0]?[make(baseIds[0],targetIds[0],'partner')]:[]
        : (mode==='parent_of'?baseIds:targetIds).flatMap(a=>
            (mode==='parent_of'?targetIds:baseIds).filter(b=>a!==b).map(b=>make(a,b,'parent_child')));
      const additions=proposed.filter(r=>!existing.has(r.id));
      if (additions.length>80) {
        Alert.alert('Quá nhiều quan hệ cùng lúc','Chia thành các nhóm tối đa 80 mối nối để kiểm tra an toàn.');return;
      }
      const issues=checkGraphRelationshipCandidates(currentSnapshot, additions);
      const blocker=issues.find(i=>i.severity==='block');
      if (blocker) {Alert.alert('Quan hệ chưa hợp lệ',`${blocker.code}: ${blocker.message}`);return;}
      const warnings=issues.filter(i=>i.severity==='warning');
      if(warnings.length && !warningsApproved) {
        Alert.alert('Cần xác minh quan hệ',warnings.slice(0,3).map(i=>`${i.code}: ${i.message}`).join('\n\n'),
          [{text:'Sửa lại',style:'cancel'},{text:'Xác nhận ngoại lệ',onPress:()=>void submitRelationship(true)}]);
        return;
      }
    }
    setBusy(true);
    try {
      if (mode === "partner") {
        const baseId = baseIds[0];
        const targetId = targetIds[0];
        if (!baseId || !targetId || baseId === targetId) {
          showToast({ type: "warning", title: "Chưa đủ người", message: "Quan hệ vợ/chồng cần đúng hai người khác nhau." });
          return;
        }
        await familyGraphMutationService.createRelationship(familyId, {
          type: "partner",
          personAId: baseId,
          personBId: targetId,
          partnerStatus,
        });
        showToast({ type: "success", title: "Đã nối gia phả", message: "Đã nối quan hệ vợ/chồng.", duration: 2600 });
        onClose();
        return;
      }

      const parentIds = mode === "parent_of" ? baseIds : targetIds;
      const childIds = mode === "parent_of" ? targetIds : baseIds;
      const requestedCount = parentIds.length * childIds.length;
      const result = await familyGraphMutationService.createParentChildRelationshipsBatch(familyId, {
        parentIds,
        childIds,
        subtype,
      });
      const created = result.createdRelationshipIds.length;
      const existing = result.existingRelationshipIds.length;
      showToast({
        type: "success",
        title: created > 0 ? "Đã nối gia phả" : "Quan hệ đã có",
        message: created > 0
          ? `Đã tạo ${created}/${requestedCount} đường quan hệ${existing ? ` · ${existing} đường đã có sẵn` : ""}.`
          : `Cả ${existing} đường quan hệ đã tồn tại, dữ liệu được giữ nguyên.`,
        duration: 3200,
      });
      onClose();
    } catch (nextError) {
      showToast({ ...parseAppError(nextError), duration: 4200 });
    } finally {
      setBusy(false);
    }
  };

  const activeIds = pickerSide === "base" ? baseIds : targetIds;
  const activeIdSet = useMemo(() => new Set(activeIds), [activeIds]);
  const blockedIds = useMemo(
    () => new Set(pickerSide === "base" ? targetIds : baseIds),
    [baseIds, pickerSide, targetIds],
  );
  const sortedPeople = useMemo(() => [...people].sort(compareDisplayNamesByGivenName), [people]);
  const pickerSearchIndex = useMemo(() => new Map(people.map((person) => [
    person.id,
    `${person.displayName} ${person.nickname ?? ""}`.toLocaleLowerCase("vi"),
  ])), [people]);
  const normalizedPickerSearch = pickerSearch.trim().toLocaleLowerCase("vi");
  const pickerPeople = useMemo(() => {
    if (!pickerSide) return [];
    return sortedPeople
      .filter((person) => !blockedIds.has(person.id))
      .filter((person) => !normalizedPickerSearch || pickerSearchIndex.get(person.id)?.includes(normalizedPickerSearch));
  }, [blockedIds, normalizedPickerSearch, pickerSearchIndex, pickerSide, sortedPeople]);
  const pickerSections = useMemo(() => groupByGivenNameInitial(pickerPeople), [pickerPeople]);

  const togglePickerPerson = useCallback((personId: string) => {
    if (!pickerSide) return;
    const single = mode === "partner";
    const toggle = (current: string[]) => {
      if (single) return current[0] === personId ? [] : [personId];
      return current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId];
    };
    if (pickerSide === "base") setBaseIds(toggle);
    else setTargetIds(toggle);
  }, [mode, pickerSide]);

  const renderSelectionSummary = (side: "base" | "target", label: string, ids: string[]) => {
    const selected = ids.map((id) => peopleById.get(id)).filter((person): person is FamilyPerson => !!person);
    return (
      <View style={__a3_styles.relationshipPickerSummary}>
        <View style={__a3_styles.relationshipPickerSummaryTop}>
          <View style={__a3_styles.relationshipPickerSummaryCopy}>
            <Text style={__a3_styles.relationshipPickerSummaryLabel}>{label}</Text>
            <Text style={__a3_styles.relationshipPickerSummaryMeta}>
              {selected.length ? `Đã chọn ${selected.length} người` : "Chưa chọn ai"}
            </Text>
          </View>
          <Pressable
            onPress={() => { setPickerSearch(""); setPickerSide(side); }}
            style={({ pressed }) => [__a3_styles.relationshipPickerButton, pressed && __a3_styles.pressed]}
          >
            <Ionicons name={selected.length ? "people-outline" : "person-add-outline"} size={17} color={__a3Colors.primary} />
            <Text style={__a3_styles.relationshipPickerButtonText}>{selected.length ? "Chọn lại" : "Chọn người"}</Text>
          </Pressable>
        </View>
        {selected.length > 0 && (
          <View style={__a3_styles.relationshipSelectedList}>
            {selected.map((person) => (
              <View key={person.id} style={__a3_styles.relationshipSelectedPerson}>
                <View style={__a3_styles.relationshipSelectedAvatar}><Text style={__a3_styles.relationshipSelectedAvatarText}>{getGivenNameInitial(person.displayName)}</Text></View>
                <Text style={__a3_styles.relationshipSelectedName} numberOfLines={1}>{person.displayName}</Text>
                <Text style={__a3_styles.relationshipSelectedBranch}>{relationshipCountByPerson.get(person.id) ?? 0} nhánh</Text>
                <Pressable
                  onPress={() => side === "base"
                    ? setBaseIds(ids.filter((id) => id !== person.id))
                    : setTargetIds(ids.filter((id) => id !== person.id))}
                  hitSlop={7}
                >
                  <Ionicons name="close-circle" size={18} color={__a3Colors.secondaryText} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <BloomFullScreenFlow
      visible={visible}
      eyebrow={pickerSide ? "CHỌN NGƯỜI TRONG PHẢ HỆ" : "NỐI MỘT MỐI QUAN HỆ"}
      title={pickerSide
        ? pickerSide === "base" ? "Chọn người bắt đầu" : "Chọn người để nối"
        : "Nối đúng người, đúng nhánh"}
      subtitle={pickerSide
        ? mode === "partner"
          ? "Quan hệ vợ/chồng chỉ chọn một người mỗi phía. Bạn có thể quay lại để đổi loại quan hệ."
          : "Có thể chọn nhiều người. Bloom xếp theo tên gọi để bạn tìm nhanh hơn."
        : "Chọn hai phía, nói Bloom biết họ liên hệ với nhau thế nào, rồi xem lại trước khi lưu."}
      variant="relationship"
      compactHeader={!!pickerSide}
      onBack={pickerSide ? () => setPickerSide(null) : onClose}
      backDisabled={busy}
    >
      {pickerSide ? (
        <View style={__a3_styles.relationshipPickerPage}>
          <View style={__a3_styles.relationshipPickerGuide}>
            <Ionicons name="git-branch-outline" size={18} color={__a3Colors.primary} />
            <Text style={__a3_styles.relationshipPickerGuideText}>
              {pickerSide === "base" ? "Chọn người ở phía đầu của mối quan hệ." : "Chọn người ở phía còn lại để Bloom ghép đúng nhánh."}
            </Text>
          </View>
          <BloomTextInput
            value={pickerSearch}
            onChangeText={setPickerSearch}
            placeholder="Tìm người thân theo tên"
            isSearch
            autoCorrect={false}
            containerStyle={__a3_styles.pickerBloomSearch}
          />
          {pickerReady ? (
            <SectionList
              sections={pickerSections}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              stickySectionHeadersEnabled
              initialNumToRender={7}
              maxToRenderPerBatch={5}
              windowSize={5}
              updateCellsBatchingPeriod={56}
              removeClippedSubviews={Platform.OS === "android"}
              contentContainerStyle={__a3_styles.pickerListContent}
              renderSectionHeader={({ section }) => (
                <View style={__a3_styles.pickerSectionHeader}>
                  <Text style={__a3_styles.pickerSectionLetter}>{section.title}</Text>
                  <View style={__a3_styles.pickerSectionLine} />
                  <Text style={__a3_styles.pickerSectionCount}>{section.data.length}</Text>
                </View>
              )}
              renderItem={({ item }) => (
                <RelationshipPickerPersonRow
                  person={item}
                  selected={activeIdSet.has(item.id)}
                  branchCount={relationshipCountByPerson.get(item.id) ?? 0}
                  onToggle={togglePickerPerson}
                />
              )}
              ListEmptyComponent={<Text style={__a3_styles.pickerEmptyState}>Không tìm thấy người phù hợp.</Text>}
            />
          ) : (
            <View style={__a3_styles.pickerLoading}>
              <ActivityIndicator size="small" color={__a3Colors.primary} />
              <Text style={__a3_styles.pickerLoadingText}>Đang chuẩn bị danh sách…</Text>
            </View>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={__a3_styles.relationshipFullContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={__a3_styles.relationshipWarmIntro}>
            <View style={__a3_styles.relationshipWarmIcon}><Ionicons name="people-outline" size={20} color={__a3Colors.primary} /></View>
            <View style={__a3_styles.relationshipWarmCopy}>
              <Text style={__a3_styles.relationshipWarmTitle}>Mỗi đường nối nên kể đúng một điều</Text>
              <Text style={__a3_styles.relationshipWarmText}>Bloom sẽ kiểm tra quan hệ đã có trước khi tạo để tránh nối trùng hoặc làm sai nhánh.</Text>
            </View>
          </View>

          {renderSelectionSummary("base", "1. Người được chọn", baseIds)}

          <Field label="2. Loại quan hệ">
            <View style={__a3_styles.chips}>
              <BloomChipButton label="Là cha/mẹ của" icon="arrow-down-circle-outline" selected={mode === "parent_of"} onPress={() => changeMode("parent_of")} />
              <BloomChipButton label="Là con của" icon="arrow-up-circle-outline" selected={mode === "child_of"} onPress={() => changeMode("child_of")} />
              <BloomChipButton label="Vợ/Chồng" icon="heart-outline" selected={mode === "partner"} onPress={() => changeMode("partner")} />
            </View>
          </Field>

          {mode === "partner" ? (
            <Field label="Trạng thái quan hệ">
              <View style={__a3_styles.chips}>
                {(Object.keys(partnerStatusLabel) as PartnerStatus[]).map((status) => (
                  <BloomChipButton key={status} label={partnerStatusLabel[status]} selected={partnerStatus === status} onPress={() => setPartnerStatus(status)} />
                ))}
              </View>
            </Field>
          ) : (
            <Field label="Loại cha/mẹ – con">
              <View style={__a3_styles.chips}>
                {(Object.keys(parentSubtypeLabel) as ParentChildSubtype[]).map((nextSubtype) => (
                  <BloomChipButton key={nextSubtype} label={parentSubtypeLabel[nextSubtype]} selected={subtype === nextSubtype} onPress={() => setSubtype(nextSubtype)} />
                ))}
              </View>
            </Field>
          )}

          {renderSelectionSummary("target", "3. Người tham chiếu", targetIds)}

          <View style={[__a3_styles.relationshipPreview, batchStats.conflict > 0 && __a3_styles.relationshipPreviewWarning]}>
            <View style={__a3_styles.relationshipPreviewTitleRow}>
              <Ionicons name={batchStats.conflict > 0 ? "warning-outline" : "sparkles-outline"} size={17} color={batchStats.conflict > 0 ? __a3Colors.destructive : __a3Colors.primary} />
              <Text style={[__a3_styles.relationshipPreviewTitle, batchStats.conflict > 0 && __a3_styles.relationshipPreviewTitleWarning]}>
                {batchStats.conflict > 0 ? "Cần xử lý quan hệ cũ" : "Bloom sẽ nối như sau"}
              </Text>
            </View>
            <Text style={__a3_styles.relationshipPreviewSentence}>{preview}</Text>
            {batchStats.requested > 0 && (
              <Text style={__a3_styles.relationshipPreviewMeta}>
                {mode === "partner"
                  ? batchStats.existing > 0 ? "Quan hệ vợ/chồng này đã tồn tại." : "Sẽ tạo 1 đường quan hệ."
                  : batchStats.conflict > 0
                    ? `${batchStats.conflict} đường đã tồn tại nhưng khác loại. Hãy xóa/sửa quan hệ cũ trước để dữ liệu không bị hiểu sai.`
                    : `${batchStats.requested} đường được kiểm tra · ${batchStats.requested - batchStats.existing} mới · ${batchStats.existing} đã có.`}
              </Text>
            )}
          </View>

          <BloomButton
            title={mode === "partner" ? "Tạo mối quan hệ" : `Nối ${Math.max(0, batchStats.requested - batchStats.existing)} đường quan hệ`}
            icon="git-branch-outline"
            isLoading={busy}
            disabled={disabled}
            onPress={submitRelationship}
            customStyle={__a3_styles.submitButton}
          />
        </ScrollView>
      )}
    </BloomFullScreenFlow>
  );
});

function LinkMemberModal({ visible, person, members, busy, onClose, onSelect }: {
  visible: boolean;
  person: FamilyPerson | null;
  members: Array<{ uid: string; displayName: string }>;
  busy: boolean;
  onClose: () => void;
  onSelect: (uid: string) => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <BloomFullScreenFlow
      visible={visible}
      eyebrow="LIÊN KẾT THÀNH VIÊN"
      title={person ? `Ai là ${person.displayName} trong Bloom?` : "Chọn thành viên để liên kết"}
      subtitle="Liên kết đúng tài khoản giúp kỷ niệm, thông báo và phả hệ tìm về đúng người trong nhà."
      variant="relationship"
      onBack={onClose}
      backDisabled={busy}
    >
      <ScrollView contentContainerStyle={__a3_styles.linkFullContent}>
        <Text style={__a3_styles.linkIntro}>
          {person ? `Chọn tài khoản tương ứng với ${person.displayName}.` : "Chọn thành viên."}
        </Text>
        {members.length ? members.map((member) => (
          <Pressable
            key={member.uid}
            disabled={busy}
            onPress={() => onSelect(member.uid)}
            style={({ pressed }) => [__a3_styles.memberChoice, pressed && __a3_styles.pressed]}
          >
            <View style={__a3_styles.memberChoiceAvatar}>
              <Text style={__a3_styles.memberChoiceInitial}>{getGivenNameInitial(member.displayName)}</Text>
            </View>
            <Text style={__a3_styles.memberChoiceName}>{member.displayName}</Text>
            <Ionicons name="link-outline" size={18} color={__a3Colors.primary} />
          </Pressable>
        )) : (
          <BloomEmptyState
            icon="people-outline"
            title="Không còn thành viên khả dụng"
            description="Mỗi tài khoản chỉ được liên kết với một người trong phả hệ của cùng gia đình."
            compact
          />
        )}
      </ScrollView>
    </BloomFullScreenFlow>
  );
}

function YearDateField({
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
    <Field label={label}>
      <View style={__a3_styles.yearDateRow}>
        <BloomTextInput
          value={date ? formatHumanDate(date) : year}
          editable={!date}
          onChangeText={(value) => onYearChange(value.replace(/[^0-9]/g, "").slice(0, 4))}
          keyboardType="number-pad"
          placeholder={placeholder}
          containerStyle={__a3_styles.yearBloomField}
          inputStyle={[__a3_styles.yearInput, date && __a3_styles.fullDateInput]}
        />
        <BloomDatePicker
          selectedDate={date}
          onDateChange={onDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          containerStyle={__a3_styles.datePickerCompact}
          trigger={(open) => (
            <Pressable
              accessibilityLabel={`Chọn ngày đầy đủ cho ${label.toLowerCase()}`}
              onPress={open}
              style={({ pressed }) => [__a3_styles.dateIconButton, pressed && __a3_styles.pressed]}
            >
              <Ionicons name="calendar-outline" size={21} color={__a3Colors.primary} />
            </Pressable>
          )}
        />
      </View>
      <View style={__a3_styles.dateHelperRow}>
        <Text style={__a3_styles.dateHelperText}>
          {date ? "Đang lưu ngày/tháng/năm đầy đủ. Muốn chỉ lưu năm, bấm “Chỉ giữ năm”." : "Nhập năm, hoặc bấm biểu tượng lịch để chọn đủ ngày/tháng/năm."}
        </Text>
        {date && (
          <Pressable onPress={onClearDate} hitSlop={8} style={({ pressed }) => [__a3_styles.clearDateButton, pressed && __a3_styles.pressed]}>
            <Ionicons name="close-circle-outline" size={16} color={__a3Colors.secondaryText} />
            <Text style={__a3_styles.clearDateText}>Chỉ giữ năm</Text>
          </Pressable>
        )}
      </View>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return <View style={__a3_styles.field}><Text style={__a3_styles.fieldLabel}>{label}</Text>{children}</View>;
}

const styles = createBloomStyles(() => StyleSheet.create({
  screen: { flex: 1, paddingBottom: 4, backgroundColor: COLORS.background },
  headerIcon: { width: 50, height: 50, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.86)", borderWidth: 1, borderColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 34 },
  summaryCard: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  summaryIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  summaryText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5 },
  graphNoticeCard: { marginTop: 12, marginBottom: 12, minHeight: 78, flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  graphNoticeIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  graphNoticeCopy: { flex: 1, minWidth: 0 },
  graphNoticeTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  graphNoticeText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8, lineHeight: 14 },
  graphNoticeButton: { minHeight: 38, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
  graphNoticeButtonText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  actionRow: { flexDirection: "row", gap: 12, marginBottom: 22 },
  actionButton: { flex: 1, minHeight: 48, paddingHorizontal: 10 },
  section: { marginBottom: 24 },
  personList: { gap: 14 },
  alphaSection: { gap: 8 },
  alphaSectionList: { gap: 8 },
  alphaHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 3, paddingTop: 4, paddingBottom: 4 },
  alphaHeaderText: { minWidth: 22, color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  alphaHeaderLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  alphaHeaderCount: { minWidth: 18, textAlign: "right", color: COLORS.secondaryText, fontSize: 10, fontWeight: "800" },
  personCard: { marginBottom: 8, backgroundColor: COLORS.surface, borderRadius: 20, padding: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "transparent", shadowColor: COLORS.shadow, shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  personCardUnassigned: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  personCardSelected: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  personAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  personAvatarText: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  personCopy: { flex: 1, minWidth: 0 },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  personName: { flexShrink: 1, color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  personStatusRow: { marginTop: 4, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  branchPill: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  branchPillEmpty: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  branchPillText: { color: COLORS.primary, fontSize: 9.2, fontWeight: "900" },
  branchPillTextEmpty: { color: COLORS.secondaryText },
  unassignedPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, minHeight: 22, borderRadius: 999, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border },
  unassignedPillText: { color: COLORS.primary, fontSize: 9.2, fontWeight: "900" },
  personMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  linkStatus: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  linkStatusText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5 },
  personActions: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  smallAction: { minHeight: 34, borderRadius: 12, paddingHorizontal: 9, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 4 },
  smallActionDanger: { backgroundColor: COLORS.surface },
  smallActionText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  smallActionTextDanger: { color: COLORS.destructive },
  relationshipCard: { paddingVertical: 5, paddingHorizontal: 12 },
  relationshipMoreButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 3 },
  relationshipMoreText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  relationshipRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  relationshipIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  relationshipCopy: { flex: 1, minWidth: 0 },
  relationshipTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  relationshipMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  deleteIcon: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  divider: { height: 1, backgroundColor: COLORS.border, marginLeft: 46 },
  treeButton: { marginTop: 2 },
  centerState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 30 },
  emptyTitle: { marginTop: 12, color: COLORS.primaryText, fontSize: 16, fontWeight: "900", textAlign: "center" },
  emptyText: { marginTop: 6, color: COLORS.secondaryText, fontSize: 12, lineHeight: 18, textAlign: "center" },
  pressed: { opacity: 0.65 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...BLOOM_ABSOLUTE_FILL, backgroundColor: "rgba(61,43,49,0.28)" },
  sheet: { maxHeight: "91%", backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 9, overflow: "hidden" },
  relationshipSheet: { maxHeight: "88%" },
  relationshipPickerSheet: { height: "92%", maxHeight: "92%" },
  relationshipPickerSummary: { marginBottom: 15, padding: 12, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  relationshipPickerSummaryTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  relationshipPickerSummaryCopy: { flex: 1, minWidth: 0 },
  relationshipPickerSummaryLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  relationshipPickerSummaryMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8 },
  relationshipPickerButton: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  relationshipPickerButtonText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  relationshipSelectedList: { marginTop: 10, gap: 7 },
  relationshipSelectedPerson: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, borderRadius: 13, backgroundColor: COLORS.surface, borderWidth: 1.6, borderColor: COLORS.inputBorder },
  relationshipSelectedAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  relationshipSelectedAvatarText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  relationshipSelectedName: { flex: 1, minWidth: 0, color: COLORS.primaryText, fontSize: 11.2, fontWeight: "800" },
  relationshipSelectedBranch: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "700" },
  pickerLoading: { flex: 1, minHeight: 150, alignItems: "center", justifyContent: "center", gap: 10 },
  pickerLoadingText: { color: COLORS.secondaryText, fontSize: 12 },
  pickerBackButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  pickerHeaderCopy: { flex: 1, minWidth: 0, marginHorizontal: 9 },
  pickerDoneButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  pickerDoneText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  pickerBloomSearch: { marginBottom: 12 },
  pickerSearchContainer: { marginHorizontal: 18, marginTop: 4, marginBottom: 8, minHeight: 45, paddingHorizontal: 12, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderWidth: 1.6, borderColor: COLORS.inputBorder },
  pickerSearchInput: { flex: 1, minHeight: 43, color: COLORS.primaryText, fontSize: 12.5 },
  pickerListContent: { paddingHorizontal: 18, paddingBottom: 28 },
  pickerSectionHeader: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 5, paddingBottom: 4, backgroundColor: COLORS.surface },
  pickerSectionLetter: { minWidth: 22, color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  pickerSectionLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  pickerSectionCount: { color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "800" },
  pickerPersonRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, marginBottom: 7, borderRadius: 17, backgroundColor: COLORS.surface, borderWidth: 1.6, borderColor: COLORS.inputBorder },
  pickerPersonRowSelected: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  pickerPersonAvatar: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  pickerPersonAvatarSelected: { backgroundColor: COLORS.surface },
  pickerPersonAvatarText: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  pickerPersonCopy: { flex: 1, minWidth: 0 },
  pickerPersonName: { color: COLORS.primaryText, fontSize: 12.3, fontWeight: "900" },
  pickerPersonMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8 },
  pickerBranchBadge: { minWidth: 38, height: 27, paddingHorizontal: 7, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: COLORS.surface },
  pickerBranchText: { color: COLORS.primaryText, fontSize: 9.8, fontWeight: "900" },
  pickerEmptyState: { paddingVertical: 24, color: COLORS.secondaryText, textAlign: "center", fontSize: 11.5 },
  relationshipSheetHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  relationshipPreview: { marginBottom: 15, padding: 13, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  relationshipPreviewWarning: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  relationshipPreviewTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  relationshipPreviewTitle: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  relationshipPreviewTitleWarning: { color: COLORS.destructive },
  relationshipPreviewSentence: { marginTop: 8, color: COLORS.primaryText, fontSize: 12.5, lineHeight: 19, fontWeight: "800" },
  relationshipPreviewMeta: { marginTop: 7, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16 },
  selectedPeopleBox: { marginBottom: 9, padding: 10, borderRadius: 15, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  selectedPeopleLabel: { marginBottom: 7, color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "800" },
  personSearchWrap: { minHeight: 43, marginBottom: 9, paddingHorizontal: 11, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1.6, borderColor: COLORS.inputBorder, flexDirection: "row", alignItems: "center", gap: 7 },
  personSearchInput: { flex: 1, minHeight: 41, color: COLORS.primaryText, fontSize: 12 },
  pickerHintText: { marginTop: 8, color: COLORS.secondaryText, fontSize: 9.8, lineHeight: 14 },
  pickerEmptyText: { color: COLORS.secondaryText, fontSize: 10.5, paddingVertical: 8 },
  linkSheet: { maxHeight: "72%" },
  sheetHandle: { width: 42, height: 4, borderRadius: 999, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 7 },
  sheetHeader: { minHeight: 50, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  sheetContent: { paddingHorizontal: 18, paddingBottom: 30 },
  field: { marginBottom: 15 },
  fieldLabel: { marginBottom: 7, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  input: { minHeight: 47, borderRadius: 16, backgroundColor: COLORS.surface, paddingHorizontal: 14, color: COLORS.primaryText, fontSize: 13, borderWidth: 1.6, borderColor: COLORS.inputBorder },
  yearDateRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  yearBloomField: { flex: 1, marginBottom: 0 },
  yearInput: { flex: 1 },
  fullDateInput: { color: COLORS.primaryText, fontWeight: "800", backgroundColor: COLORS.surface },
  datePickerCompact: { width: 50, marginBottom: 0 },
  dateIconButton: { width: 50, height: 47, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1.6, borderColor: COLORS.inputBorder, alignItems: "center", justifyContent: "center" },
  dateHelperRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  dateHelperText: { flex: 1, color: COLORS.secondaryText, fontSize: 9.8, lineHeight: 14 },
  clearDateButton: { flexDirection: "row", alignItems: "center", gap: 3 },
  clearDateText: { color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "700" },
  sensitiveNotice: { marginBottom: 15, padding: 12, borderRadius: 16, flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  sensitiveNoticeText: { flex: 1, color: COLORS.primaryText, fontSize: 10.5, lineHeight: 16 },
  textarea: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  submitButton: { marginTop: 4 },
  fullFlowKeyboard: { flex: 1 },
  fullFlowContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 40 },
  personEditorIntro: { marginBottom: 18, padding: 14, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  personEditorIntroIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  personEditorIntroCopy: { flex: 1, minWidth: 0 },
  personEditorIntroTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  personEditorIntroText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  relationshipFullContent: { paddingHorizontal: 18, paddingTop: 20, paddingBottom: 42 },
  relationshipWarmIntro: { marginBottom: 18, padding: 14, borderRadius: 20, flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  relationshipWarmIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  relationshipWarmCopy: { flex: 1, minWidth: 0 },
  relationshipWarmTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  relationshipWarmText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  relationshipPickerPage: { flex: 1, paddingTop: 14, backgroundColor: COLORS.background },
  relationshipPickerGuide: { marginHorizontal: 18, marginBottom: 10, padding: 12, borderRadius: 18, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  relationshipPickerGuideText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  linkFullContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 34, gap: 10 },
  linkIntro: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  memberChoice: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberChoiceAvatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  memberChoiceInitial: { color: COLORS.primaryText, fontWeight: "900" },
  memberChoiceName: { flex: 1, color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
}));
