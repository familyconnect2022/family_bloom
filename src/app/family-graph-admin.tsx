import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { BloomButton, BloomChipButton } from "../components/ui/BloomButtonComponents";
import { BloomConfirmDialog } from "../components/ui/BloomConfirmDialog";
import { BloomDatePicker, BloomInputAvatar } from "../components/ui/BloomInputComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { BloomCard, BloomEmptyState, BloomSectionHeader } from "../components/ui/BloomPageComponents";
import { APP_CATEGORIES } from "../constants/appPaths";
import { COLORS } from "../constants/theme";
import { parseAppError } from "../constants/errorConstants";
import { useAuth } from "../context/AuthContext";
import { useFamilyGraph } from "../hooks/useFamilyGraph";
import { useFamilyMembers } from "../hooks/useFamilyMembers";
import { familyGraphMutationService } from "../services/familyGraph/familyGraphMutationService";
import { mediaService } from "../services/media/mediaService";
import type {
  FamilyPerson,
  FamilyPersonLifeStatus,
  FamilyRelationship,
  ParentChildSubtype,
  PartnerStatus,
} from "../types/familyGraph";
import type { Gender } from "../types/user";
import { compareDisplayNamesByGivenName, getGivenNameInitial, groupByGivenNameInitial } from "../utils/personName";

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
  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));
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
      showToast({ type: "success", title: "Đã cập nhật", message: successMessage, duration: 2400 });
      return true;
    } catch (nextError) {
      showToast({ ...parseAppError(nextError), duration: 3800 });
      return false;
    } finally {
      setBusy(false);
    }
  };

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
      showToast({ type: "info", title: "Thiếu họ tên", message: "Hãy nhập họ và tên của người này." });
      return;
    }
    if (birthYearText && (!Number.isInteger(birthYear) || birthYear! < 1800 || birthYear! > currentYear)) {
      showToast({ type: "info", title: "Năm sinh chưa hợp lệ", message: "Hãy nhập năm sinh bằng 4 chữ số hợp lệ." });
      return;
    }
    if (deathYearText && personDraft.lifeStatus === "deceased" && (!Number.isInteger(deathYear) || deathYear! < 1800 || deathYear! > currentYear)) {
      showToast({ type: "info", title: "Năm mất chưa hợp lệ", message: "Hãy nhập năm mất bằng 4 chữ số hợp lệ." });
      return;
    }
    if (birthYear !== null && deathYear !== null && deathYear < birthYear) {
      showToast({ type: "info", title: "Mốc thời gian chưa hợp lệ", message: "Năm mất không thể nhỏ hơn năm sinh." });
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
              {
                id: fileId,
                uri: personDraft.avatarUri,
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
            type: "info",
            title: "Thông tin đã lưu, ảnh chưa cập nhật",
            message: "Avatar là tùy chọn. Bạn có thể mở lại người này và thử chọn ảnh sau.",
            duration: 4200,
          });
        }
      }

      if (!personDraft.avatarDirty || avatarUpdated) {
        showToast({
          type: "success",
          title: editingPersonId ? "Đã lưu thay đổi" : "Đã thêm vào phả hệ",
          message: editingPersonId
            ? "Thông tin người trong phả hệ đã được lưu."
            : "Đã thêm một người vào phả hệ.",
          duration: 2600,
        });
      }
      setPersonModalVisible(false);
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
    const a = peopleById.get(relationship.personAId)?.displayName ?? "Person A";
    const b = peopleById.get(relationship.personBId)?.displayName ?? "Person B";
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
        "Đã xóa đường quan hệ; cả hai Person vẫn được giữ nguyên.",
      );
    }
    if (ok) setConfirmAction(null);
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
          message: "Đây là thao tác xóa Person thật. Các đường quan hệ trực tiếp cũng sẽ được gỡ; Timeline/Album và tài khoản liên kết vẫn được Bloom bảo vệ.",
          confirmLabel: "Xóa người",
        }
      : confirmAction?.kind === "delete_relationship"
        ? {
            eyebrow: "SỬA ĐƯỜNG NỐI",
            icon: "git-branch-outline" as const,
            title: "Xóa đường quan hệ này?",
            message: `${confirmAction.label} sẽ được gỡ khỏi cây. Hai Person vẫn được giữ nguyên để bạn nối lại đúng.`,
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
          styles.personCard,
          unassigned && styles.personCardUnassigned,
          selected && styles.personCardSelected,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.personAvatar}>
          <Text style={styles.personAvatarText}>{getGivenNameInitial(person.displayName)}</Text>
        </View>
        <View style={styles.personCopy}>
          <View style={styles.personNameRow}>
            <Text style={styles.personName} numberOfLines={1}>{person.displayName}</Text>
            <View style={[styles.branchPill, branchCount === 0 && styles.branchPillEmpty]}>
              <Ionicons name="git-branch-outline" size={11} color={branchCount === 0 ? COLORS.secondaryText : COLORS.primary} />
              <Text style={[styles.branchPillText, branchCount === 0 && styles.branchPillTextEmpty]}>{branchCount} nhánh</Text>
            </View>
          </View>
          <View style={styles.personStatusRow}>
            {unassigned && (
              <View style={styles.unassignedPill}>
                <Ionicons name="leaf-outline" size={11} color="#A67754" />
                <Text style={styles.unassignedPillText}>Chưa vào cây</Text>
              </View>
            )}
            <Text style={styles.personMeta} numberOfLines={1}>
              {genderLabel[person.gender]} · {person.birthYear ?? "chưa rõ năm sinh"} · {lifeLabel[person.lifeStatus]}
            </Text>
          </View>
          <View style={styles.linkStatus}>
            <Ionicons name={person.linkedUid ? "link" : "unlink-outline"} size={13} color={person.linkedUid ? COLORS.primary : COLORS.secondaryText} />
            <Text style={styles.linkStatusText} numberOfLines={1}>
              {linkedMember?.displayName || (person.linkedUid ? "Đã liên kết thành viên" : "Chưa liên kết tài khoản")}
            </Text>
          </View>
        </View>
        <Ionicons name={selected ? "chevron-up" : "chevron-down"} size={18} color={COLORS.secondaryText} />

        {selected && (
          <View style={styles.personActions}>
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
  }, [connectedPersonIds, deletePerson, memberByUid, openEditPerson, openRelationship, relationshipCountByPerson, selectedPersonId, unlinkPerson]);

  const renderAdminSectionHeader = useCallback(({ section }: { section: { title: string; data: FamilyPerson[] } }) => (
    <View style={styles.alphaHeader}>
      <Text style={styles.alphaHeaderText}>{section.title}</Text>
      <View style={styles.alphaHeaderLine} />
      <Text style={styles.alphaHeaderCount}>{section.data.length}</Text>
    </View>
  ), []);

  const adminListHeader = useMemo(() => (
    <>
      <BloomCard tone="accent" style={styles.summaryCard}>
        <View style={styles.summaryIcon}><Ionicons name="git-network-outline" size={25} color={COLORS.primary} /></View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>{membership?.familyName || "Gia đình của mình"}</Text>
          <Text style={styles.summaryText}>{snapshot.persons.length} Person · {snapshot.relationships.length} mối quan hệ</Text>
        </View>
      </BloomCard>

      <View style={styles.actionRow}>
        <BloomButton title="Thêm người" icon="person-add-outline" onPress={openCreatePerson} customStyle={styles.actionButton} />
        <BloomButton
          title="Nối quan hệ"
          icon="git-branch-outline"
          variant="outline"
          disabled={snapshot.persons.length < 2}
          onPress={() => openRelationship()}
          customStyle={styles.actionButton}
        />
      </View>

      <View style={styles.section}>
        <BloomSectionHeader
          title="Người trong phả hệ"
          subtitle={unassignedPersonCount
            ? `${unassignedPersonCount} người chưa được nối vào cây · Chạm để chỉnh hoặc nối quan hệ`
            : "Chọn một người để chỉnh, liên kết tài khoản hoặc nối thêm nhánh"}
        />
        {loading ? (
          <BloomEmptyState icon="hourglass-outline" title="Đang tải phả hệ" description="Bloom đang đồng bộ dữ liệu thật từ Firestore." compact />
        ) : error ? (
          <BloomEmptyState icon="cloud-offline-outline" title="Chưa tải được dữ liệu" description="Kiểm tra kết nối hoặc Firestore Rules rồi thử lại." compact />
        ) : snapshot.persons.length === 0 ? (
          <BloomEmptyState icon="leaf-outline" title="Chưa có người nào" description="Bấm “Thêm người” để tạo người đầu tiên trong phả hệ. Bạn có thể liên kết người đó với chính mình." compact />
        ) : null}
      </View>
    </>
  ), [error, loading, membership?.familyName, openCreatePerson, openRelationship, snapshot.persons.length, snapshot.relationships.length, unassignedPersonCount]);

  const adminListFooter = useMemo(() => (
    <>
      <View style={styles.section}>
        <BloomSectionHeader title="Các đường quan hệ" subtitle="Dùng phần này để kiểm tra và xóa nhanh một quan hệ tạo nhầm" />
        {snapshot.relationships.length === 0 ? (
          <BloomEmptyState icon="git-branch-outline" title="Chưa có mối quan hệ" description="Tạo ít nhất hai Person rồi nối cha/mẹ–con hoặc vợ/chồng." compact />
        ) : (
          <BloomCard style={styles.relationshipCard}>
            {visibleRelationships.map((relationship, index) => {
              const a = peopleById.get(relationship.personAId);
              const b = peopleById.get(relationship.personBId);
              return (
                <View key={relationship.id}>
                  <View style={styles.relationshipRow}>
                    <View style={styles.relationshipIcon}>
                      <Ionicons name={relationship.type === "partner" ? "heart" : "git-branch-outline"} size={17} color={COLORS.primary} />
                    </View>
                    <View style={styles.relationshipCopy}>
                      <Text style={styles.relationshipTitle} numberOfLines={2}>
                        {relationship.type === "partner"
                          ? `${a?.displayName ?? "?"} ↔ ${b?.displayName ?? "?"}`
                          : `${a?.displayName ?? "?"} → ${b?.displayName ?? "?"}`}
                      </Text>
                      <Text style={styles.relationshipMeta}>
                        {relationship.type === "partner"
                          ? partnerStatusLabel[relationship.partnerStatus ?? "partner"]
                          : `Cha/Mẹ → Con · ${parentSubtypeLabel[relationship.subtype ?? "unknown"]}`}
                      </Text>
                    </View>
                    <Pressable onPress={() => deleteRelationship(relationship)} hitSlop={8} style={styles.deleteIcon}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.destructive} />
                    </Pressable>
                  </View>
                  {index < visibleRelationships.length - 1 && <View style={styles.divider} />}
                </View>
              );
            })}
            {snapshot.relationships.length > 10 && (
              <Pressable
                onPress={() => setShowAllRelationships((value) => !value)}
                style={({ pressed }) => [styles.relationshipMoreButton, pressed && styles.pressed]}
              >
                <Ionicons name={showAllRelationships ? "chevron-up" : "chevron-down"} size={16} color={COLORS.primary} />
                <Text style={styles.relationshipMoreText}>
                  {showAllRelationships ? "Thu gọn danh sách" : `Xem thêm ${snapshot.relationships.length - visibleRelationships.length} đường quan hệ`}
                </Text>
              </Pressable>
            )}
          </BloomCard>
        )}
      </View>

      <BloomButton title="Xem cây phả hệ" icon="git-network-outline" onPress={goToTree} customStyle={styles.treeButton} />
    </>
  ), [deleteRelationship, goToTree, peopleById, showAllRelationships, snapshot.relationships.length, visibleRelationships]);

  if (!familyId) {
    return (
      <ScreenContainer>
        <View style={styles.centerState}><Text style={styles.emptyTitle}>Chưa có family đang hoạt động.</Text></View>
      </ScreenContainer>
    );
  }

  if (!isAdmin) {
    return (
      <ScreenContainer>
        <View style={styles.screen}>
          <AdminHeader title="Quản lý phả hệ" onBack={() => router.back()} />
          <View style={styles.centerState}>
            <Ionicons name="lock-closed-outline" size={34} color={COLORS.secondaryText} />
            <Text style={styles.emptyTitle}>Chỉ Owner/Admin mới được chỉnh phả hệ</Text>
            <Text style={styles.emptyText}>Bạn vẫn có thể quay lại màn hình cây để xem dữ liệu gia đình.</Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.screen}>
        <AdminHeader title="Xây phả hệ" onBack={() => router.back()} onTree={goToTree} />

        <SectionList
          sections={loading || error ? [] : personSections}
          keyExtractor={(item) => item.id}
          renderItem={renderAdminPersonItem}
          renderSectionHeader={renderAdminSectionHeader}
          ListHeaderComponent={adminListHeader}
          ListFooterComponent={adminListFooter}
          extraData={selectedPersonId}
          contentContainerStyle={styles.content}
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
            "Đã liên kết Person với thành viên Family Bloom.",
          );
          if (ok) setLinkModalPersonId(null);
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
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
        <Ionicons name="chevron-back" size={23} color={COLORS.primaryText} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      {onTree ? (
        <Pressable onPress={onTree} style={({ pressed }) => [styles.headerIcon, pressed && styles.pressed]}>
          <Ionicons name="git-network-outline" size={21} color={COLORS.primary} />
        </Pressable>
      ) : <View style={styles.headerPlaceholder} />}
    </View>
  );
}

function SmallAction({ icon, label, danger, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={(event) => { event.stopPropagation(); onPress(); }} style={({ pressed }) => [styles.smallAction, danger && styles.smallActionDanger, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={danger ? COLORS.destructive : COLORS.primaryText} />
      <Text style={[styles.smallActionText, danger && styles.smallActionTextDanger]}>{label}</Text>
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
  const patch = (next: Partial<PersonDraft>) => setDraft({ ...draft, ...next });
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalRoot} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{editing ? "Sửa thông tin" : "Thêm người"}</Text>
            <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={23} color={COLORS.primaryText} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <BloomInputAvatar
              value={draft.avatarUri}
              fallbackText={draft.displayName || "Thành viên"}
              disabled={busy}
              onChange={(avatarUri) => patch({ avatarUri, avatarDirty: true })}
            />

            <Field label="Họ và tên *"><TextInput value={draft.displayName} onChangeText={(value) => patch({ displayName: value })} placeholder="Nguyễn Văn An" placeholderTextColor={COLORS.secondaryText} style={styles.input} /></Field>
            <Field label="Tên thường gọi"><TextInput value={draft.nickname} onChangeText={(value) => patch({ nickname: value })} placeholder="An" placeholderTextColor={COLORS.secondaryText} style={styles.input} /></Field>
            <Field label="Giới tính">
              <View style={styles.chips}>{(["male", "female", "other"] as Gender[]).map((gender) => <BloomChipButton key={gender} label={genderLabel[gender]} selected={draft.gender === gender} onPress={() => patch({ gender })} />)}</View>
            </Field>

            <Field label="Tình trạng">
              <View style={styles.chips}>
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
              <View style={styles.sensitiveNotice}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
                <Text style={styles.sensitiveNoticeText}>
                  Thông tin người đã mất là dữ liệu nhạy cảm của gia đình. Hãy chỉ nhập những mốc bạn biết là đúng; nếu chưa chắc, có thể để trống năm/ngày mất.
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

            <Field label="Nơi sinh"><TextInput value={draft.birthPlace} onChangeText={(value) => patch({ birthPlace: value })} placeholder="TP. Hồ Chí Minh" placeholderTextColor={COLORS.secondaryText} style={styles.input} /></Field>
            <Field label="Mô tả"><TextInput value={draft.description} onChangeText={(value) => patch({ description: value })} placeholder="Một vài dòng về người này…" placeholderTextColor={COLORS.secondaryText} multiline style={[styles.input, styles.textarea]} /></Field>

            {!editing && (
              <Field label="Liên kết tài khoản Family Bloom (không bắt buộc)">
                <View style={styles.chips}>
                  <BloomChipButton label="Chưa liên kết" selected={!draft.linkedUid} onPress={() => patch({ linkedUid: null })} />
                  {availableMembers.map((member) => (
                    <BloomChipButton key={member.uid} label={member.displayName} selected={draft.linkedUid === member.uid} onPress={() => patch({ linkedUid: member.uid })} />
                  ))}
                </View>
              </Field>
            )}

            <BloomButton title={editing ? "Lưu thay đổi" : "Thêm vào phả hệ"} icon={editing ? "save-outline" : "person-add-outline"} isLoading={busy} onPress={onSubmit} customStyle={styles.submitButton} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
  return (
    <Pressable
      onPress={() => onToggle(person.id)}
      style={({ pressed }) => [styles.pickerPersonRow, selected && styles.pickerPersonRowSelected, pressed && styles.pressed]}
    >
      <View style={[styles.pickerPersonAvatar, selected && styles.pickerPersonAvatarSelected]}>
        <Text style={styles.pickerPersonAvatarText}>{getGivenNameInitial(person.displayName)}</Text>
      </View>
      <View style={styles.pickerPersonCopy}>
        <Text style={styles.pickerPersonName} numberOfLines={1}>{person.displayName}</Text>
        <Text style={styles.pickerPersonMeta} numberOfLines={1}>{genderLabel[person.gender]} · {person.birthYear ?? "chưa rõ năm sinh"}</Text>
      </View>
      <View style={styles.pickerBranchBadge}>
        <Ionicons name="git-branch-outline" size={12} color={branchCount ? COLORS.primary : COLORS.secondaryText} />
        <Text style={styles.pickerBranchText}>{branchCount}</Text>
      </View>
      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? COLORS.primary : COLORS.border} />
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

  const submitRelationship = async () => {
    if (!familyId || baseIds.length === 0 || targetIds.length === 0 || busy) {
      if (!busy) showToast({ type: "info", title: "Chưa đủ người", message: "Hãy chọn người ở cả hai phía của mối quan hệ." });
      return;
    }

    setBusy(true);
    try {
      if (mode === "partner") {
        const baseId = baseIds[0];
        const targetId = targetIds[0];
        if (!baseId || !targetId || baseId === targetId) {
          showToast({ type: "info", title: "Chưa đủ người", message: "Quan hệ vợ/chồng cần đúng hai người khác nhau." });
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
      <View style={styles.relationshipPickerSummary}>
        <View style={styles.relationshipPickerSummaryTop}>
          <View style={styles.relationshipPickerSummaryCopy}>
            <Text style={styles.relationshipPickerSummaryLabel}>{label}</Text>
            <Text style={styles.relationshipPickerSummaryMeta}>
              {selected.length ? `Đã chọn ${selected.length} người` : "Chưa chọn ai"}
            </Text>
          </View>
          <Pressable
            onPress={() => { setPickerSearch(""); setPickerSide(side); }}
            style={({ pressed }) => [styles.relationshipPickerButton, pressed && styles.pressed]}
          >
            <Ionicons name={selected.length ? "people-outline" : "person-add-outline"} size={17} color={COLORS.primary} />
            <Text style={styles.relationshipPickerButtonText}>{selected.length ? "Chọn lại" : "Chọn người"}</Text>
          </Pressable>
        </View>
        {selected.length > 0 && (
          <View style={styles.relationshipSelectedList}>
            {selected.map((person) => (
              <View key={person.id} style={styles.relationshipSelectedPerson}>
                <View style={styles.relationshipSelectedAvatar}><Text style={styles.relationshipSelectedAvatarText}>{getGivenNameInitial(person.displayName)}</Text></View>
                <Text style={styles.relationshipSelectedName} numberOfLines={1}>{person.displayName}</Text>
                <Text style={styles.relationshipSelectedBranch}>{relationshipCountByPerson.get(person.id) ?? 0} nhánh</Text>
                <Pressable
                  onPress={() => side === "base"
                    ? setBaseIds(ids.filter((id) => id !== person.id))
                    : setTargetIds(ids.filter((id) => id !== person.id))}
                  hitSlop={7}
                >
                  <Ionicons name="close-circle" size={18} color={COLORS.secondaryText} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      hardwareAccelerated={Platform.OS === "android"}
      animationType={Platform.OS === "android" ? "fade" : "slide"}
      statusBarTranslucent
      onRequestClose={pickerSide ? () => setPickerSide(null) : onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={pickerSide ? () => setPickerSide(null) : onClose} />
        <View style={[styles.sheet, styles.relationshipSheet, pickerSide && styles.relationshipPickerSheet]}>
          <View style={styles.sheetHandle} />
          {pickerSide ? (
            <>
              <View style={styles.sheetHeader}>
                <Pressable onPress={() => setPickerSide(null)} hitSlop={8} style={styles.pickerBackButton}>
                  <Ionicons name="chevron-back" size={22} color={COLORS.primaryText} />
                </Pressable>
                <View style={styles.pickerHeaderCopy}>
                  <Text style={styles.sheetTitle}>{pickerSide === "base" ? "Chọn người" : "Chọn người tham chiếu"}</Text>
                  <Text style={styles.relationshipSheetHint}>{mode === "partner" ? "Quan hệ vợ/chồng chỉ chọn một người mỗi phía." : "Có thể chọn nhiều người. Danh sách xếp theo tên gọi."}</Text>
                </View>
                <Pressable onPress={() => setPickerSide(null)} style={styles.pickerDoneButton}>
                  <Text style={styles.pickerDoneText}>Xong</Text>
                </Pressable>
              </View>
              <View style={styles.pickerSearchContainer}>
                <Ionicons name="search-outline" size={18} color={COLORS.secondaryText} />
                <TextInput
                  value={pickerSearch}
                  onChangeText={setPickerSearch}
                  placeholder="Tìm theo tên"
                  placeholderTextColor={COLORS.secondaryText}
                  style={styles.pickerSearchInput}
                  autoCorrect={false}
                />
                {!!pickerSearch && <Pressable onPress={() => setPickerSearch("")} hitSlop={8}><Ionicons name="close-circle" size={18} color={COLORS.secondaryText} /></Pressable>}
              </View>
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
                  contentContainerStyle={styles.pickerListContent}
                  renderSectionHeader={({ section }) => (
                    <View style={styles.pickerSectionHeader}>
                      <Text style={styles.pickerSectionLetter}>{section.title}</Text>
                      <View style={styles.pickerSectionLine} />
                      <Text style={styles.pickerSectionCount}>{section.data.length}</Text>
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
                  ListEmptyComponent={<Text style={styles.pickerEmptyState}>Không tìm thấy người phù hợp.</Text>}
                />
              ) : (
                <View style={styles.pickerLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.pickerLoadingText}>Đang chuẩn bị danh sách…</Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Nối quan hệ</Text>
                  <Text style={styles.relationshipSheetHint}>Chọn người → loại quan hệ → người tham chiếu.</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={23} color={COLORS.primaryText} /></Pressable>
              </View>
              <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {renderSelectionSummary("base", "1. Người được chọn", baseIds)}

                <Field label="2. Loại quan hệ">
                  <View style={styles.chips}>
                    <BloomChipButton label="Là cha/mẹ của" icon="arrow-down-circle-outline" selected={mode === "parent_of"} onPress={() => changeMode("parent_of")} />
                    <BloomChipButton label="Là con của" icon="arrow-up-circle-outline" selected={mode === "child_of"} onPress={() => changeMode("child_of")} />
                    <BloomChipButton label="Vợ/Chồng" icon="heart-outline" selected={mode === "partner"} onPress={() => changeMode("partner")} />
                  </View>
                </Field>

                {mode === "partner" ? (
                  <Field label="Trạng thái quan hệ">
                    <View style={styles.chips}>
                      {(Object.keys(partnerStatusLabel) as PartnerStatus[]).map((status) => (
                        <BloomChipButton key={status} label={partnerStatusLabel[status]} selected={partnerStatus === status} onPress={() => setPartnerStatus(status)} />
                      ))}
                    </View>
                  </Field>
                ) : (
                  <Field label="Loại cha/mẹ – con">
                    <View style={styles.chips}>
                      {(Object.keys(parentSubtypeLabel) as ParentChildSubtype[]).map((nextSubtype) => (
                        <BloomChipButton key={nextSubtype} label={parentSubtypeLabel[nextSubtype]} selected={subtype === nextSubtype} onPress={() => setSubtype(nextSubtype)} />
                      ))}
                    </View>
                  </Field>
                )}

                {renderSelectionSummary("target", "3. Người tham chiếu", targetIds)}

                <View style={[styles.relationshipPreview, batchStats.conflict > 0 && styles.relationshipPreviewWarning]}>
                  <View style={styles.relationshipPreviewTitleRow}>
                    <Ionicons name={batchStats.conflict > 0 ? "warning-outline" : "sparkles-outline"} size={17} color={batchStats.conflict > 0 ? COLORS.destructive : COLORS.primary} />
                    <Text style={[styles.relationshipPreviewTitle, batchStats.conflict > 0 && styles.relationshipPreviewTitleWarning]}>
                      {batchStats.conflict > 0 ? "Cần xử lý quan hệ cũ" : "Bloom sẽ nối như sau"}
                    </Text>
                  </View>
                  <Text style={styles.relationshipPreviewSentence}>{preview}</Text>
                  {batchStats.requested > 0 && (
                    <Text style={styles.relationshipPreviewMeta}>
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
                  customStyle={styles.submitButton}
                />
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
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
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, styles.linkSheet]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Liên kết thành viên</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={23} color={COLORS.primaryText} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.linkIntro}>
              {person ? `Chọn tài khoản tương ứng với ${person.displayName}.` : "Chọn thành viên."}
            </Text>
            {members.length ? members.map((member) => (
              <Pressable
                key={member.uid}
                disabled={busy}
                onPress={() => onSelect(member.uid)}
                style={({ pressed }) => [styles.memberChoice, pressed && styles.pressed]}
              >
                <View style={styles.memberChoiceAvatar}>
                  <Text style={styles.memberChoiceInitial}>{getGivenNameInitial(member.displayName)}</Text>
                </View>
                <Text style={styles.memberChoiceName}>{member.displayName}</Text>
                <Ionicons name="link-outline" size={18} color={COLORS.primary} />
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
        </View>
      </View>
    </Modal>
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
  return (
    <Field label={label}>
      <View style={styles.yearDateRow}>
        <TextInput
          value={date ? formatHumanDate(date) : year}
          editable={!date}
          onChangeText={(value) => onYearChange(value.replace(/[^0-9]/g, "").slice(0, 4))}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={COLORS.secondaryText}
          style={[styles.input, styles.yearInput, date && styles.fullDateInput]}
        />
        <BloomDatePicker
          selectedDate={date}
          onDateChange={onDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          containerStyle={styles.datePickerCompact}
          trigger={(open) => (
            <Pressable
              accessibilityLabel={`Chọn ngày đầy đủ cho ${label.toLowerCase()}`}
              onPress={open}
              style={({ pressed }) => [styles.dateIconButton, pressed && styles.pressed]}
            >
              <Ionicons name="calendar-outline" size={21} color={COLORS.primary} />
            </Pressable>
          )}
        />
      </View>
      <View style={styles.dateHelperRow}>
        <Text style={styles.dateHelperText}>
          {date ? "Đang lưu ngày/tháng/năm đầy đủ. Muốn chỉ lưu năm, bấm “Chỉ giữ năm”." : "Nhập năm, hoặc bấm biểu tượng lịch để chọn đủ ngày/tháng/năm."}
        </Text>
        {date && (
          <Pressable onPress={onClearDate} hitSlop={8} style={({ pressed }) => [styles.clearDateButton, pressed && styles.pressed]}>
            <Ionicons name="close-circle-outline" size={16} color={COLORS.secondaryText} />
            <Text style={styles.clearDateText}>Chỉ giữ năm</Text>
          </Pressable>
        )}
      </View>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingBottom: 4 },
  header: { height: 50, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerIcon: { width: 42, height: 42, borderRadius: 16, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  headerPlaceholder: { width: 42, height: 42 },
  headerTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  content: { paddingBottom: 34 },
  summaryCard: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  summaryIcon: { width: 48, height: 48, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.72)", alignItems: "center", justifyContent: "center", marginRight: 12 },
  summaryCopy: { flex: 1 },
  summaryTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  summaryText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5 },
  actionRow: { flexDirection: "row", gap: 10, marginBottom: 22 },
  actionButton: { flex: 1, minHeight: 48, paddingHorizontal: 10 },
  section: { marginBottom: 24 },
  personList: { gap: 14 },
  alphaSection: { gap: 8 },
  alphaSectionList: { gap: 8 },
  alphaHeader: { minHeight: 32, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 3, paddingTop: 4, paddingBottom: 4 },
  alphaHeaderText: { minWidth: 22, color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  alphaHeaderLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  alphaHeaderCount: { minWidth: 18, textAlign: "right", color: COLORS.secondaryText, fontSize: 10, fontWeight: "800" },
  personCard: { marginBottom: 8, backgroundColor: COLORS.white, borderRadius: 20, padding: 12, flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "transparent", shadowColor: "#E6C9D2", shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  personCardUnassigned: { backgroundColor: "#FFF9F0", borderColor: "#F2DDC8" },
  personCardSelected: { backgroundColor: "#FFF5F8", borderColor: "#EED4DE" },
  personAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  personAvatarText: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  personCopy: { flex: 1, minWidth: 0 },
  personNameRow: { flexDirection: "row", alignItems: "center", gap: 7, minWidth: 0 },
  personName: { flexShrink: 1, color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  personStatusRow: { marginTop: 4, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  branchPill: { minHeight: 22, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, borderRadius: 999, backgroundColor: "#FFF0F5", borderWidth: 1, borderColor: "#F1D7E0" },
  branchPillEmpty: { backgroundColor: COLORS.softSurface, borderColor: COLORS.border },
  branchPillText: { color: COLORS.primary, fontSize: 9.2, fontWeight: "900" },
  branchPillTextEmpty: { color: COLORS.secondaryText },
  unassignedPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, minHeight: 22, borderRadius: 999, backgroundColor: "#FFF1DD", borderWidth: 1, borderColor: "#ECD3B6" },
  unassignedPillText: { color: "#8B684B", fontSize: 9.2, fontWeight: "900" },
  personMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  linkStatus: { marginTop: 5, flexDirection: "row", alignItems: "center", gap: 4 },
  linkStatusText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5 },
  personActions: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border },
  smallAction: { minHeight: 34, borderRadius: 12, paddingHorizontal: 9, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", gap: 4 },
  smallActionDanger: { backgroundColor: "#FFF1F2" },
  smallActionText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  smallActionTextDanger: { color: COLORS.destructive },
  relationshipCard: { paddingVertical: 5, paddingHorizontal: 12 },
  relationshipMoreButton: { minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderTopWidth: 1, borderTopColor: COLORS.border, marginTop: 3 },
  relationshipMoreText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  relationshipRow: { minHeight: 60, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  relationshipIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(61,43,49,0.28)" },
  sheet: { maxHeight: "91%", backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 9, overflow: "hidden" },
  relationshipSheet: { maxHeight: "88%" },
  relationshipPickerSheet: { height: "92%", maxHeight: "92%" },
  relationshipPickerSummary: { marginBottom: 15, padding: 12, borderRadius: 18, backgroundColor: "#FFF9FB", borderWidth: 1, borderColor: "#F0DEE5" },
  relationshipPickerSummaryTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  relationshipPickerSummaryCopy: { flex: 1, minWidth: 0 },
  relationshipPickerSummaryLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  relationshipPickerSummaryMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8 },
  relationshipPickerButton: { minHeight: 36, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: "#FFF0F5", borderWidth: 1, borderColor: "#EFD5DF" },
  relationshipPickerButtonText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  relationshipSelectedList: { marginTop: 10, gap: 7 },
  relationshipSelectedPerson: { minHeight: 40, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 9, borderRadius: 13, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  relationshipSelectedAvatar: { width: 28, height: 28, borderRadius: 10, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  relationshipSelectedAvatarText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  relationshipSelectedName: { flex: 1, minWidth: 0, color: COLORS.primaryText, fontSize: 11.2, fontWeight: "800" },
  relationshipSelectedBranch: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "700" },
  pickerBackButton: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  pickerHeaderCopy: { flex: 1, minWidth: 0, marginHorizontal: 9 },
  pickerDoneButton: { minHeight: 34, paddingHorizontal: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F5" },
  pickerDoneText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  pickerSearchContainer: { marginHorizontal: 18, marginTop: 4, marginBottom: 8, minHeight: 45, paddingHorizontal: 12, borderRadius: 15, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border },
  pickerSearchInput: { flex: 1, minHeight: 43, color: COLORS.primaryText, fontSize: 12.5 },
  pickerListContent: { paddingHorizontal: 18, paddingBottom: 28 },
  pickerSectionHeader: { minHeight: 30, flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 5, paddingBottom: 4, backgroundColor: COLORS.white },
  pickerSectionLetter: { minWidth: 22, color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  pickerSectionLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  pickerSectionCount: { color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "800" },
  pickerPersonRow: { minHeight: 62, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 11, marginBottom: 7, borderRadius: 17, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  pickerPersonRowSelected: { backgroundColor: "#FFF5F8", borderColor: "#E9BFD0" },
  pickerPersonAvatar: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  pickerPersonAvatarSelected: { backgroundColor: "#FFE7F0" },
  pickerPersonAvatarText: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  pickerPersonCopy: { flex: 1, minWidth: 0 },
  pickerPersonName: { color: COLORS.primaryText, fontSize: 12.3, fontWeight: "900" },
  pickerPersonMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8 },
  pickerBranchBadge: { minWidth: 38, height: 27, paddingHorizontal: 7, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 3, backgroundColor: "#FFF5F8" },
  pickerBranchText: { color: COLORS.primaryText, fontSize: 9.8, fontWeight: "900" },
  pickerEmptyState: { paddingVertical: 24, color: COLORS.secondaryText, textAlign: "center", fontSize: 11.5 },
  relationshipSheetHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  relationshipPreview: { marginBottom: 15, padding: 13, borderRadius: 18, backgroundColor: "#FFF7FA", borderWidth: 1, borderColor: "#F2DDE5" },
  relationshipPreviewWarning: { backgroundColor: "#FFF5F5", borderColor: "#F3C7CB" },
  relationshipPreviewTitleRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  relationshipPreviewTitle: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  relationshipPreviewTitleWarning: { color: COLORS.destructive },
  relationshipPreviewSentence: { marginTop: 8, color: COLORS.primaryText, fontSize: 12.5, lineHeight: 19, fontWeight: "800" },
  relationshipPreviewMeta: { marginTop: 7, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16 },
  selectedPeopleBox: { marginBottom: 9, padding: 10, borderRadius: 15, backgroundColor: "#FFF7FA", borderWidth: 1, borderColor: "#F2DDE5" },
  selectedPeopleLabel: { marginBottom: 7, color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "800" },
  personSearchWrap: { minHeight: 43, marginBottom: 9, paddingHorizontal: 11, borderRadius: 14, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 7 },
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
  input: { minHeight: 47, borderRadius: 16, backgroundColor: COLORS.softSurface, paddingHorizontal: 14, color: COLORS.primaryText, fontSize: 13, borderWidth: 1, borderColor: COLORS.border },
  yearDateRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  yearInput: { flex: 1 },
  fullDateInput: { color: COLORS.primaryText, fontWeight: "800", backgroundColor: "#FFF7FA" },
  datePickerCompact: { width: 50, marginBottom: 0 },
  dateIconButton: { width: 50, height: 47, borderRadius: 16, backgroundColor: "#FFF4F7", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  dateHelperRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 8 },
  dateHelperText: { flex: 1, color: COLORS.secondaryText, fontSize: 9.8, lineHeight: 14 },
  clearDateButton: { flexDirection: "row", alignItems: "center", gap: 3 },
  clearDateText: { color: COLORS.secondaryText, fontSize: 9.8, fontWeight: "700" },
  sensitiveNotice: { marginBottom: 15, padding: 12, borderRadius: 16, flexDirection: "row", alignItems: "flex-start", gap: 9, backgroundColor: "#FFF6F1", borderWidth: 1, borderColor: "#F2DDD0" },
  sensitiveNoticeText: { flex: 1, color: COLORS.primaryText, fontSize: 10.5, lineHeight: 16 },
  textarea: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  submitButton: { marginTop: 4 },
  linkIntro: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  memberChoice: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  memberChoiceAvatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  memberChoiceInitial: { color: COLORS.primaryText, fontWeight: "900" },
  memberChoiceName: { flex: 1, color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
});
