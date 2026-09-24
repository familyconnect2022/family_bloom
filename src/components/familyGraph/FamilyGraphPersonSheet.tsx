import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { parseAppError } from "../../constants/errorConstants";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyPersonContent } from "../../hooks/useFamilyPersonContent";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";
import { useFamilyPersonIntegrations } from "../../hooks/useFamilyPersonIntegrations";
import { familyPersonContentService } from "../../services/familyGraph/familyPersonContentService";
import type { FamilyPersonAlbumMedia, FamilyPersonTimelineEntry } from "../../types/familyGraph";
import type { MediaFile } from "../../types/media";
import type { FamilyGraphVietnameseRelationship } from "../../types/familyGraphQuery";
import { getGivenNameInitial } from "../../utils/personName";
import { BloomKeyboardScreen } from "../layout/BloomKeyboardScreen";
import {
  cloudinaryImageThumbnail,
  cloudinaryVideoThumbnail,
  useMediaViewer,
} from "../media/MediaViewerProvider";
import { BloomConfirmDialog } from "../ui/BloomConfirmDialog";
import { BloomDatePicker, BloomTextInput } from "../ui/BloomInputComponents";
import { useBloomToast } from "../ui/BloomToast";
import type { FamilyGraphPrototypePerson } from "./familyGraphPrototypeData";

type DetailTab = "info" | "relations" | "timeline" | "moments" | "album";

type DirectRelationshipItem = {
  id: string;
  label: string;
  type: "parent_child" | "partner";
};

type TimelineDisplayItem = {
  id: string;
  date: string | null;
  year: string;
  title: string;
  description: string;
  persisted: boolean;
  kind: "derived" | "entry" | "event";
  createdByUid?: string;
  eventId?: string;
};

const tabs: Array<{ key: DetailTab; label: string }> = [
  { key: "info", label: "Thông tin" },
  { key: "relations", label: "Quan hệ" },
  { key: "timeline", label: "Dòng thời gian" },
  { key: "moments", label: "Kỷ niệm" },
  { key: "album", label: "Album" },
];

const relationDisplayPriority = (label: string) => {
  const normalized = label.trim().toLocaleLowerCase("vi");
  if (normalized.startsWith("cha") || normalized.startsWith("mẹ") || normalized.startsWith("bố")) return 0;
  if (normalized.startsWith("vợ/chồng") || normalized.startsWith("vợ") || normalized.startsWith("chồng") || normalized.startsWith("bạn đời") || normalized.startsWith("đối tác")) return 1;
  if (normalized.startsWith("anh/chị/em") || normalized.startsWith("anh") || normalized.startsWith("chị") || normalized.startsWith("em")) return 2;
  if (normalized.startsWith("con")) return 3;
  return 4;
};

function stableSortRelations<T extends { label: string }>(items: T[]) {
  return items
    .map((item, index) => ({ item, index, priority: relationDisplayPriority(item.label) }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(({ item }) => item);
}

const toDateOnly = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateOnly = (value?: string | null) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
};

function AlbumMediaPreview({ item }: { item: FamilyPersonAlbumMedia }) {
  const candidates = useMemo(() => {
    const values = item.type === "video"
      ? [
          item.thumbnailUrl,
          cloudinaryVideoThumbnail(item.secureUrl, 720),
          cloudinaryVideoThumbnail(item.secureUrl, 1080),
        ]
      : [
          // Fullscreen already uses secureUrl successfully. Prefer that exact
          // delivery URL for the grid, then fall back to stored/derived thumbs.
          item.secureUrl,
          item.thumbnailUrl,
          cloudinaryImageThumbnail(item.secureUrl, 720),
        ];
    return [...new Set(values.filter((value): value is string => !!value))];
  }, [item.secureUrl, item.thumbnailUrl, item.type]);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSourceIndex(0);
    setLoaded(false);
  }, [item.id, item.secureUrl, item.thumbnailUrl, item.type]);

  const uri = candidates[sourceIndex] ?? null;
  const moveToNextSource = () => {
    setLoaded(false);
    setSourceIndex((index) => index + 1);
  };

  if (!uri) {
    return (
      <View style={styles.albumFallback}>
        <Ionicons name={item.type === "video" ? "videocam-outline" : "image-outline"} size={28} color={COLORS.primary} />
        <Text style={styles.albumFallbackText}>{item.type === "video" ? "Video" : "Ảnh"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.albumPreview}>
      {!loaded && (
        <View style={styles.albumPreviewPlaceholder}>
          <Ionicons name={item.type === "video" ? "videocam-outline" : "image-outline"} size={24} color={COLORS.primary} />
        </View>
      )}
      <Image
        source={{ uri }}
        style={styles.albumMediaImage}
        resizeMode="cover"
        onLoad={() => setLoaded(true)}
        onError={moveToNextSource}
      />
    </View>
  );
}

export function FamilyGraphPersonSheet({
  person,
  visible,
  onClose,
  onOpenBranch,
  canEdit = false,
  onEditPerson,
  onDeletePerson,
  onDeleteRelationship,
  directRelationships = [],
  familyId,
  showPrototypeNote = true,
  focusPersonName,
  relationshipToFocus,
}: {
  person: FamilyGraphPrototypePerson | null;
  visible: boolean;
  onClose: () => void;
  onOpenBranch: (personId: string) => void;
  canEdit?: boolean;
  onEditPerson?: (personId: string) => void;
  onDeletePerson?: (personId: string) => void | Promise<void>;
  onDeleteRelationship?: (relationshipId: string) => void | Promise<void>;
  directRelationships?: DirectRelationshipItem[];
  familyId?: string | null;
  showPrototypeNote?: boolean;
  focusPersonName?: string | null;
  relationshipToFocus?: FamilyGraphVietnameseRelationship | null;
}) {
  const [tab, setTab] = useState<DetailTab>("info");
  const [timelineComposerVisible, setTimelineComposerVisible] = useState(false);
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineDescription, setTimelineDescription] = useState("");
  const [timelineDate, setTimelineDate] = useState(() => new Date());
  const [savingTimeline, setSavingTimeline] = useState(false);
  const [editingTimelineEntry, setEditingTimelineEntry] = useState<FamilyPersonTimelineEntry | null>(null);
  const [albumUploading, setAlbumUploading] = useState(false);
  const [albumProgress, setAlbumProgress] = useState(0);
  const [optimisticAlbum, setOptimisticAlbum] = useState<FamilyPersonAlbumMedia[]>([]);
  const [personDeleteVisible, setPersonDeleteVisible] = useState(false);
  const [relationshipToDelete, setRelationshipToDelete] = useState<DirectRelationshipItem | null>(null);
  const [timelineToDelete, setTimelineToDelete] = useState<{ id: string; title: string } | null>(null);
  const [destructiveBusy, setDestructiveBusy] = useState(false);
  const { showToast } = useBloomToast();
  const router = useRouter();
  const { user, families } = useAuth();
  const { memberByUid } = useFamilyMembers(familyId);
  const membership = families.find((item) => item.familyId === familyId);
  const timelineAdmin = membership?.role === "owner" || membership?.role === "admin";
  const { openMediaViewer } = useMediaViewer();
  const { width: windowWidth } = useWindowDimensions();
  const albumTileSize = useMemo(() => Math.max(132, Math.floor((windowWidth - 46) / 2)), [windowWidth]);

  const liveEnabled = !!familyId && !!person && visible && !showPrototypeNote;
  const {
    timeline: savedTimeline,
    album,
    timelineLoading,
    albumLoading,
    albumError,
  } = useFamilyPersonContent({
    familyId,
    personId: person?.id,
    enabled: liveEnabled,
  });
  const {
    moments: linkedMoments,
    events: linkedEvents,
    momentsLoading,
    eventsLoading,
  } = useFamilyPersonIntegrations({
    familyId,
    personId: person?.id,
    momentsEnabled: liveEnabled && tab === "moments",
    eventsEnabled: liveEnabled && tab === "timeline",
  });

  useEffect(() => {
    if (visible) setTab("info");
    setOptimisticAlbum([]);
  }, [visible, person?.id]);

  useEffect(() => {
    if (!visible) {
      setTimelineComposerVisible(false);
      setEditingTimelineEntry(null);
      setAlbumUploading(false);
      setAlbumProgress(0);
      setPersonDeleteVisible(false);
      setRelationshipToDelete(null);
      setTimelineToDelete(null);
    }
  }, [visible]);

  useEffect(() => {
    if (!album.length) return;
    const persistedIds = new Set(album.map((item) => item.id));
    setOptimisticAlbum((current) => current.filter((item) => !persistedIds.has(item.id)));
  }, [album]);

  const displayAlbum = useMemo(() => {
    const merged = new Map<string, FamilyPersonAlbumMedia>();
    optimisticAlbum.forEach((item) => merged.set(item.id, item));
    album.forEach((item) => merged.set(item.id, item));
    return [...merged.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [album, optimisticAlbum]);

  const sortedRelationSummary = useMemo(() => {
    if (!person) return [];
    return person.relationSummary
      .map((label, index) => ({ label, index, priority: relationDisplayPriority(label) }))
      .sort((a, b) => a.priority - b.priority || a.index - b.index)
      .map(({ label }) => label);
  }, [person]);

  const sortedDirectRelationships = useMemo(
    () => stableSortRelations(directRelationships),
    [directRelationships],
  );

  const lifeLabel = useMemo(() => {
    if (!person) return "";
    return person.lifeStatus === "deceased" ? "Đã mất" : person.lifeStatus === "living" ? "Đang sống" : "Chưa rõ";
  }, [person]);
  const linkedMember = person?.linkedUid ? memberByUid.get(person.linkedUid) ?? null : null;
  const displayAvatarUrl = person?.avatarUrl || linkedMember?.avatarUrl || null;
  const timelineEntryById = useMemo(
    () => new Map(savedTimeline.map((entry) => [entry.id, entry])),
    [savedTimeline],
  );

  const timelineItems = useMemo<TimelineDisplayItem[]>(() => {
    if (!person) return [];
    const derived: TimelineDisplayItem[] = person.timeline.map((item, index) => ({
      id: `derived-${index}-${item.year}-${item.title}`,
      date: null,
      year: item.year,
      title: item.title,
      description: item.description,
      persisted: false,
      kind: "derived",
    }));
    const persisted: TimelineDisplayItem[] = savedTimeline.map((item) => ({
      id: item.id,
      date: item.date,
      year: item.date.slice(0, 4),
      title: item.title,
      description: item.description ?? "Một dấu mốc được gia đình lưu lại.",
      persisted: true,
      kind: "entry",
      createdByUid: item.createdByUid,
    }));
    const events: TimelineDisplayItem[] = linkedEvents.map((event) => ({
      id: `event-${event.id}`,
      date: event.dateISO.slice(0, 10),
      year: String(event.year),
      title: event.title,
      description: [event.eventType === "birthday" ? "Sinh nhật" : event.eventType === "anniversary" ? "Kỷ niệm" : "Sự kiện gia đình", event.location].filter(Boolean).join(" · "),
      persisted: false,
      kind: "event",
      createdByUid: event.createdByUid,
      eventId: event.id,
    }));
    return [...derived, ...persisted, ...events].sort((a, b) => {
      const aKey = a.date ?? `${a.year}-01-01`;
      const bKey = b.date ?? `${b.year}-01-01`;
      return aKey.localeCompare(bKey) || a.title.localeCompare(b.title, "vi");
    });
  }, [linkedEvents, person, savedTimeline]);

  const contributorName = (uid?: string) => {
    if (!uid) return "Dữ liệu phả hệ";
    if (uid === user?.uid) return "Bạn";
    const member = memberByUid.get(uid);
    return member?.shortName || member?.displayName || "Thành viên trong nhà";
  };


  if (!person) return null;

  const openTimelineComposer = (entry?: FamilyPersonTimelineEntry) => {
    setEditingTimelineEntry(entry ?? null);
    setTimelineTitle(entry?.title ?? "");
    setTimelineDescription(entry?.description ?? "");
    setTimelineDate(entry?.date ? new Date(`${entry.date}T12:00:00`) : new Date());
    setTimelineComposerVisible(true);
  };

  const saveTimelineEntry = async () => {
    if (!familyId || !timelineTitle.trim() || savingTimeline) return;
    setSavingTimeline(true);
    try {
      const input = {
        date: toDateOnly(timelineDate),
        title: timelineTitle,
        description: timelineDescription,
      };
      if (editingTimelineEntry) {
        await familyPersonContentService.updateTimelineEntry(familyId, person.id, editingTimelineEntry.id, input);
      } else {
        await familyPersonContentService.createTimelineEntry(familyId, person.id, input);
      }
      setTimelineComposerVisible(false);
      setEditingTimelineEntry(null);
      showToast({
        title: editingTimelineEntry ? "Đã cập nhật dấu mốc 🌷" : "Đã thêm một dấu mốc 🌷",
        message: `Con đường ký ức của ${person.shortName || person.displayName} vừa được cập nhật.`,
        type: "success",
        duration: 2800,
      });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3200 });
    } finally {
      setSavingTimeline(false);
    }
  };

  const deleteTimelineEntry = (entryId: string, title: string) => {
    if (!familyId) return;
    setTimelineToDelete({ id: entryId, title });
  };

  const confirmTimelineDelete = async () => {
    if (!familyId || !timelineToDelete || destructiveBusy) return;
    setDestructiveBusy(true);
    try {
      await familyPersonContentService.deleteTimelineEntry(familyId, person.id, timelineToDelete.id);
      setTimelineToDelete(null);
      showToast({ type: "success", title: "Đã gỡ dấu mốc", message: "Con đường ký ức đã được cập nhật.", duration: 2400 });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3200 });
    } finally {
      setDestructiveBusy(false);
    }
  };


  const requestPersonDelete = () => {
    if (person.linkedAccount) {
      showToast({
        type: "info",
        title: "Hãy bỏ liên kết tài khoản trước",
        message: `${person.displayName} vẫn đang liên kết với một tài khoản Family Bloom.`,
        duration: 3200,
      });
      return;
    }
    setPersonDeleteVisible(true);
  };

  const confirmPersonDelete = async () => {
    if (!onDeletePerson || destructiveBusy) return;
    setDestructiveBusy(true);
    try {
      await onDeletePerson(person.id);
      setPersonDeleteVisible(false);
      onClose();
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3600 });
    } finally {
      setDestructiveBusy(false);
    }
  };

  const confirmRelationshipDelete = async () => {
    if (!relationshipToDelete || !onDeleteRelationship || destructiveBusy) return;
    setDestructiveBusy(true);
    try {
      await onDeleteRelationship(relationshipToDelete.id);
      setRelationshipToDelete(null);
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3600 });
    } finally {
      setDestructiveBusy(false);
    }
  };

  const addAlbumMedia = async () => {
    if (!familyId || albumUploading) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      showToast({ type: "info", title: "Cần cấp quyền 🌸", message: "Cho phép Family Bloom truy cập ảnh/video để lưu vào album gia đình nhé.", duration: 3200 });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.82,
    });
    if (result.canceled || !result.assets.length) return;

    const files: MediaFile[] = result.assets.map((asset, index) => ({
      id: `person-album-${Date.now()}-${index}`,
      uri: asset.uri,
      type: asset.type === "video" ? "video" : "image",
      mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      fileName: asset.fileName || `person-album-${index}`,
      fileSize: asset.fileSize ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      duration: asset.duration ?? null,
      purpose: "album",
    }));

    setAlbumUploading(true);
    setAlbumProgress(0);
    let successCount = 0;
    try {
      // Sequential by design: a Person album can contain high-resolution images/video,
      // so avoid a native memory/network spike on Android while this sheet is open.
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const uploadedItem = await familyPersonContentService.addAlbumFile(
          familyId,
          person.id,
          file,
          null,
          (value) => {
            const overall = Math.round(((index + Math.max(0, Math.min(100, value)) / 100) / files.length) * 100);
            setAlbumProgress(overall);
          },
        );
        setOptimisticAlbum((current) => [uploadedItem, ...current.filter((item) => item.id !== uploadedItem.id)]);
        successCount += 1;
        setAlbumProgress(Math.round(((index + 1) / files.length) * 100));
      }
      showToast({
        title: "Album vừa nở thêm ảnh 🌸",
        message: `${successCount} mục đã được lưu cho ${person.shortName || person.displayName}.`,
        type: "success",
        duration: 3000,
      });
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3600 });
    } finally {
      setAlbumUploading(false);
      setAlbumProgress(0);
    }
  };

  const openAlbumAt = (index: number) => {
    openMediaViewer({
      items: displayAlbum.map((item) => ({
        id: item.id,
        type: item.type,
        uri: item.secureUrl,
        thumbnailUri: item.thumbnailUrl,
        caption: item.caption,
      })),
      initialIndex: index,
      title: `Album · ${person.shortName || person.displayName}`,
    });
  };

  return (
    <>
      <Modal
        visible={visible}
        transparent={false}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={onClose}
      >
        <SafeAreaView style={styles.detailRoot}>
          <View style={styles.headerRow}>
              <Pressable onPress={onClose} style={styles.iconButton} hitSlop={8}>
                <Ionicons name="close" size={27} color={COLORS.primaryText} />
              </Pressable>
              <Text style={styles.sheetTitle}>Thông tin thành viên</Text>
              <View style={styles.iconButtonPlaceholder} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
              <View style={styles.personHero}>
                <View style={[styles.avatar, person.gender === "female" ? styles.avatarFemale : styles.avatarMale]}>
                  {displayAvatarUrl ? (
                    <Image source={{ uri: displayAvatarUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{getGivenNameInitial(person.displayName)}</Text>
                  )}
                  <View style={[styles.lifeDot, person.lifeStatus === "deceased" && styles.lifeDotDeceased]} />
                </View>
                <View style={styles.heroCopy}>
                  <Text style={styles.personName}>{person.displayName}</Text>
                  <Text style={styles.personMeta}>
                    {person.gender === "female" ? "Nữ" : person.gender === "male" ? "Nam" : "Chưa rõ"} · {person.birthYear ?? "Chưa rõ"}
                    {person.deathYear ? ` – ${person.deathYear}` : person.lifeStatus === "living" ? " – nay" : ""}
                  </Text>
                  <View style={styles.statusRow}>
                    <View style={[styles.statusDot, person.lifeStatus === "deceased" && styles.statusDotDeceased]} />
                    <Text style={styles.statusText}>{lifeLabel}</Text>
                  </View>
                  <View style={styles.linkRow}>
                    <Ionicons
                      name={person.linkedAccount ? "link" : "unlink-outline"}
                      size={17}
                      color={person.linkedAccount ? COLORS.primary : COLORS.secondaryText}
                    />
                    <Text style={styles.linkText}>
                      {person.linkedAccount ? "Đã liên kết tài khoản" : "Chưa có tài khoản liên kết"}
                    </Text>
                  </View>
                </View>
              </View>

              {!!person.description && (
                <View style={styles.quoteCard}>
                  <Text style={styles.quoteText}>“{person.description}”</Text>
                </View>
              )}

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => {
                    onOpenBranch(person.id);
                    onClose();
                  }}
                  style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                >
                  <View style={styles.actionIcon}><Ionicons name="git-network-outline" size={23} color={COLORS.primaryText} /></View>
                  <Text style={styles.actionText}>Mở nhánh</Text>
                </Pressable>
                {canEdit && onEditPerson ? (
                  <Pressable
                    accessibilityLabel={`Sửa thông tin ${person.displayName}`}
                    onPress={() => {
                      onClose();
                      onEditPerson(person.id);
                    }}
                    style={({ pressed }) => [styles.actionButton, styles.actionButtonActive, pressed && styles.pressed]}
                  >
                    <View style={[styles.actionIcon, styles.actionIconActive]}><Ionicons name="create-outline" size={23} color={COLORS.white} /></View>
                    <Text style={[styles.actionText, styles.actionTextActive]}>Sửa</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.actionButton, styles.actionButtonActive]}>
                    <View style={[styles.actionIcon, styles.actionIconActive]}><Ionicons name="person-outline" size={23} color={COLORS.white} /></View>
                    <Text style={[styles.actionText, styles.actionTextActive]}>Chi tiết</Text>
                  </View>
                )}
              </View>

              {canEdit && onDeletePerson && (
                <Pressable
                  accessibilityLabel={`Xóa người ${person.displayName} khỏi phả hệ`}
                  onPress={requestPersonDelete}
                  style={({ pressed }) => [styles.deleteNodeButton, pressed && styles.pressed]}
                >
                  <View style={styles.deleteNodeIcon}>
                    <Ionicons name="person-remove-outline" size={18} color={COLORS.destructive} />
                  </View>
                  <View style={styles.deleteNodeCopy}>
                    <Text style={styles.deleteNodeTitle}>Xóa người khỏi phả hệ</Text>
                    <Text style={styles.deleteNodeHint}>Chỉ dùng khi muốn xóa hẳn người này. Muốn sửa cây, hãy xóa đúng đường quan hệ ở tab Quan hệ.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={COLORS.secondaryText} />
                </Pressable>
              )}

              <View style={styles.tabs}>
                {tabs.map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setTab(item.key)}
                    style={[styles.tab, tab === item.key && styles.tabActive]}
                  >
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={[styles.tabText, tab === item.key && styles.tabTextActive]}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>

              {tab === "info" && (
                <>
                  <View style={styles.infoCard}>
                    <InfoRow icon="person-outline" label="Họ tên" value={person.displayName} />
                    <InfoRow icon="male-female-outline" label="Giới tính" value={person.gender === "female" ? "Nữ" : person.gender === "male" ? "Nam" : "Chưa rõ"} />
                    <InfoRow icon="calendar-outline" label={person.birthDate ? "Ngày sinh" : "Năm sinh"} value={formatDateOnly(person.birthDate) ?? (person.birthYear ? String(person.birthYear) : "Chưa cập nhật")} />
                    {person.lifeStatus === "deceased" && (
                      <InfoRow icon="leaf-outline" label={person.deathDate ? "Ngày mất" : "Năm mất"} value={formatDateOnly(person.deathDate) ?? (person.deathYear ? String(person.deathYear) : "Chưa cập nhật")} />
                    )}
                    <InfoRow icon="location-outline" label="Nơi sinh" value={person.birthPlace ?? "Chưa cập nhật"} />
                    <InfoRow icon="heart-outline" label="Tình trạng" value={lifeLabel} />
                    <InfoRow icon="people-outline" label="Vai trò" value={person.roleLabel ?? "Thành viên gia phả"} />
                  </View>
                  {person.linkedUid && (
                    <Pressable
                      onPress={() => router.push(`/member/${person.linkedUid}` as never)}
                      style={({ pressed }) => [styles.profileBridgeCard, pressed && styles.pressed]}
                    >
                      <View style={styles.profileBridgeIcon}>
                        <Ionicons name="person-circle-outline" size={22} color={COLORS.primary} />
                      </View>
                      <View style={styles.profileBridgeCopy}>
                        <Text style={styles.profileBridgeTitle}>Hồ sơ Family Bloom đã liên kết</Text>
                        <Text style={styles.profileBridgeHint}>
                          {linkedMember?.displayName || person.displayName} · dữ liệu hồ sơ chỉ dùng làm bridge/fallback, không tự ghi đè gia phả.
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={17} color={COLORS.secondaryText} />
                    </Pressable>
                  )}
                </>
              )}

              {tab === "relations" && (
                <View style={styles.relationsStack}>
                  {!!relationshipToFocus && relationshipToFocus.kind !== "self" && (
                    <View style={styles.kinshipInsightCard}>
                      <View style={styles.kinshipInsightHeader}>
                        <View style={styles.kinshipInsightIcon}>
                          <Ionicons name="git-network-outline" size={17} color={COLORS.primary} />
                        </View>
                        <View style={styles.kinshipInsightCopy}>
                          <Text style={styles.kinshipInsightEyebrow}>Quan hệ với tâm cây{focusPersonName ? ` · ${focusPersonName}` : ""}</Text>
                          <Text style={styles.kinshipInsightSentence}>{relationshipToFocus.sentence}</Text>
                        </View>
                      </View>
                      {!!relationshipToFocus.detail && (
                        <Text style={styles.kinshipInsightDetail}>{relationshipToFocus.detail}</Text>
                      )}
                    </View>
                  )}

                  {!!relationshipToFocus && relationshipToFocus.kind === "self" && (
                    <View style={styles.focusSelfCard}>
                      <Ionicons name="locate-outline" size={17} color={COLORS.primary} />
                      <Text style={styles.focusSelfText}>Đây là người đang được dùng làm tâm cây.</Text>
                    </View>
                  )}

                  <View style={styles.infoCard}>
                    {sortedRelationSummary.length ? sortedRelationSummary.map((relation) => (
                      <View key={relation} style={styles.relationRow}>
                        <View style={styles.relationIcon}>
                          <Ionicons name={getRelationSummaryIcon(relation)} size={17} color="#A86F83" />
                        </View>
                        <Text style={styles.relationText}>{relation}</Text>
                      </View>
                    )) : (
                      <View style={styles.simpleEmpty}><Text style={styles.simpleEmptyText}>Chưa có quan hệ trực tiếp nào được nối cho Person này.</Text></View>
                    )}
                  </View>
                  {canEdit && onDeleteRelationship && sortedDirectRelationships.length > 0 && (
                    <View style={styles.relationshipManageCard}>
                      <View style={styles.relationshipManageHeader}>
                        <View style={styles.relationshipManageIcon}>
                          <Ionicons name="cut-outline" size={17} color={COLORS.primary} />
                        </View>
                        <View style={styles.relationshipManageCopy}>
                          <Text style={styles.relationshipManageTitle}>Sửa đường nối</Text>
                          <Text style={styles.relationshipManageHint}>Xóa một đường tạo nhầm sẽ giữ nguyên cả hai người trong phả hệ.</Text>
                        </View>
                      </View>
                      {sortedDirectRelationships.map((relationship, index) => (
                        <View key={relationship.id}>
                          {index > 0 && <View style={styles.relationshipManageDivider} />}
                          <View style={styles.relationshipManageRow}>
                            <View style={styles.relationshipManageRowCopy}>
                              <Ionicons name={relationship.type === "partner" ? "heart-outline" : "git-branch-outline"} size={16} color="#A86F83" />
                              <Text style={styles.relationshipManageLabel}>{relationship.label}</Text>
                            </View>
                            <Pressable
                              accessibilityLabel={`Xóa đường quan hệ ${relationship.label}`}
                              onPress={() => setRelationshipToDelete(relationship)}
                              hitSlop={8}
                              style={({ pressed }) => [styles.relationshipDeleteButton, pressed && styles.pressed]}
                            >
                              <Ionicons name="trash-outline" size={16} color={COLORS.destructive} />
                            </Pressable>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {tab === "timeline" && (
                <View style={styles.timelineRoadCard}>
                  <View style={styles.timelineRoadHeader}>
                    <View style={styles.timelineRoadHeaderIcon}><Ionicons name="flower-outline" size={18} color={COLORS.primary} /></View>
                    <View style={styles.timelineRoadHeaderCopy}>
                      <Text style={styles.timelineRoadTitle}>Con đường ký ức</Text>
                      <Text style={styles.timelineRoadSubtitle}>Những mốc gia đình đã lưu cho {person.shortName || person.displayName}.</Text>
                    </View>
                    {!!user && familyId && !showPrototypeNote && (
                      <View style={styles.timelineHeaderActions}>
                        <Pressable
                          accessibilityLabel="Tạo sự kiện liên quan tới Person này"
                          onPress={() => router.push({ pathname: "/(tabs)/planner", params: { personId: person.id } } as never)}
                          style={({ pressed }) => [styles.miniOutlineButton, pressed && styles.pressed]}
                        >
                          <Ionicons name="calendar-outline" size={17} color={COLORS.primary} />
                        </Pressable>
                        <Pressable onPress={() => openTimelineComposer()} style={({ pressed }) => [styles.miniAddButton, pressed && styles.pressed]}>
                          <Ionicons name="add" size={18} color={COLORS.white} />
                          <Ionicons name="sparkles" size={8} color={COLORS.white} style={styles.miniSparkle} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {timelineLoading && liveEnabled ? (
                    <View style={styles.inlineLoading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.inlineLoadingText}>Bloom đang xếp lại con đường ký ức…</Text></View>
                  ) : (timelineLoading || eventsLoading) && liveEnabled && !timelineItems.length ? (
                    <View style={styles.inlineLoading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.inlineLoadingText}>Bloom đang ghép dấu mốc và sự kiện…</Text></View>
                  ) : timelineItems.length ? timelineItems.map((item, index) => {
                    const isCreator = item.kind === "entry" && !!user && item.createdByUid === user.uid;
                    const canDeleteEntry = item.kind === "entry" && item.persisted && (isCreator || timelineAdmin);
                    const canEditEntry = item.kind === "entry" && item.persisted && isCreator;
                    const savedEntry = item.kind === "entry" ? timelineEntryById.get(item.id) : null;
                    return (
                      <View key={item.id} style={styles.timelineRoadRow}>
                        <View style={styles.timelineRoadRail}>
                          <View style={[styles.timelineRoadDot, index % 2 === 1 && styles.timelineRoadDotAlt]}>
                            <Ionicons name={item.kind === "event" ? "calendar" : index % 3 === 0 ? "heart" : index % 3 === 1 ? "sparkles" : "leaf"} size={9} color={COLORS.white} />
                          </View>
                          {index < timelineItems.length - 1 && <View style={styles.timelineRoadLine} />}
                        </View>
                        <Pressable
                          disabled={item.kind !== "event" || !item.eventId}
                          onPress={() => item.eventId && router.push(`/event/${item.eventId}` as never)}
                          style={[styles.timelineMemoryCard, index % 2 === 1 && styles.timelineMemoryCardAlt]}
                        >
                          <View style={styles.timelineMemoryHeader}>
                            <Text style={styles.timelineYear}>{item.date ? formatDateOnly(item.date) : item.year}</Text>
                            <View style={styles.timelineEntryActions}>
                              {canEditEntry && savedEntry && (
                                <Pressable onPress={() => openTimelineComposer(savedEntry)} hitSlop={8} style={styles.timelineDeleteButton}>
                                  <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                                </Pressable>
                              )}
                              {canDeleteEntry && familyId && (
                                <Pressable onPress={() => deleteTimelineEntry(item.id, item.title)} hitSlop={8} style={styles.timelineDeleteButton}>
                                  <Ionicons name="trash-outline" size={14} color={timelineAdmin && !isCreator ? COLORS.destructive : COLORS.secondaryText} />
                                </Pressable>
                              )}
                              {item.kind === "event" && <Ionicons name="chevron-forward" size={15} color={COLORS.secondaryText} />}
                            </View>
                          </View>
                          <Text style={styles.timelineTitle}>{item.title}</Text>
                          <Text style={styles.timelineDescription}>{item.description}</Text>
                          {item.kind === "entry" && (
                            <View style={styles.contributorRow}>
                              <Ionicons name="person-outline" size={12} color={COLORS.secondaryText} />
                              <Text style={styles.contributorText}>Được thêm bởi {contributorName(item.createdByUid)}</Text>
                            </View>
                          )}
                          {item.kind === "event" && (
                            <View style={styles.contributorRow}>
                              <Ionicons name="calendar-outline" size={12} color={COLORS.primary} />
                              <Text style={styles.contributorText}>Sự kiện đã liên kết · chạm để mở</Text>
                            </View>
                          )}
                        </Pressable>
                      </View>
                    );
                  }) : (
                    <View style={styles.timelineEmpty}>
                      <Ionicons name="footsteps-outline" size={25} color={COLORS.primary} />
                      <Text style={styles.timelineEmptyTitle}>Chưa có mốc ký ức</Text>
                      <Text style={styles.timelineEmptyText}>Bloom sẽ đặt những dấu mốc cuộc đời lên con đường này khi gia đình bổ sung dữ liệu.</Text>
                    </View>
                  )}
                </View>
              )}

              {tab === "moments" && (
                <View style={styles.momentsSection}>
                  <View style={styles.momentsHeader}>
                    <View style={styles.momentsHeaderCopy}>
                      <Text style={styles.albumHeaderTitle}>Kỷ niệm có {person.shortName || person.displayName}</Text>
                      <Text style={styles.albumHeaderSubtitle}>Moment được gắn Person sẽ tự xuất hiện ở đây, không tạo bản sao dữ liệu.</Text>
                    </View>
                    {!!user && familyId && !showPrototypeNote && (
                      <Pressable
                        onPress={() => router.push({ pathname: "/(tabs)/moments", params: { personId: person.id } } as never)}
                        style={({ pressed }) => [styles.albumAddButton, pressed && styles.pressed]}
                      >
                        <Ionicons name="add" size={19} color={COLORS.white} />
                      </Pressable>
                    )}
                  </View>

                  {momentsLoading && liveEnabled ? (
                    <View style={styles.inlineLoading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.inlineLoadingText}>Bloom đang tìm những kỷ niệm liên quan…</Text></View>
                  ) : linkedMoments.length ? (
                    <View style={styles.personMomentList}>
                      {linkedMoments.map((moment) => (
                        <Pressable
                          key={moment.id}
                          onPress={() => router.push({ pathname: "/(tabs)/moments", params: { highlightMomentId: moment.id } } as never)}
                          style={({ pressed }) => [styles.personMomentCard, pressed && styles.pressed]}
                        >
                          <View style={styles.personMomentIcon}>
                            <Ionicons name={moment.media?.length ? "images-outline" : "heart-outline"} size={19} color={COLORS.primary} />
                          </View>
                          <View style={styles.personMomentCopy}>
                            <Text style={styles.personMomentTitle} numberOfLines={2}>{moment.caption || "Một kỷ niệm gia đình"}</Text>
                            <Text style={styles.personMomentMeta}>
                              {moment.authorName} · {new Date(moment.createdAt).toLocaleDateString("vi-VN")}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={COLORS.secondaryText} />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.albumEmpty}>
                      <View style={styles.albumEmptyIcon}><Ionicons name="heart-outline" size={26} color={COLORS.primary} /></View>
                      <Text style={styles.albumEmptyTitle}>Chưa có kỷ niệm nào được gắn</Text>
                      <Text style={styles.albumEmptyText}>Tạo một Moment và chọn Person này để câu chuyện xuất hiện ở đây.</Text>
                    </View>
                  )}
                </View>
              )}

              {tab === "album" && (
                <View style={styles.albumSection}>
                  <View style={styles.albumHeader}>
                    <View style={styles.albumHeaderCopy}>
                      <Text style={styles.albumHeaderTitle}>Album của {person.shortName || person.displayName}</Text>
                      <Text style={styles.albumHeaderSubtitle}>Ảnh/video dùng media_assets + Cloudinary hiện có, Graph chỉ giữ reference.</Text>
                    </View>
                    {canEdit && familyId && !showPrototypeNote && (
                      <Pressable onPress={addAlbumMedia} disabled={albumUploading} style={({ pressed }) => [styles.albumAddButton, pressed && styles.pressed, albumUploading && styles.disabledButton]}>
                        {albumUploading ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="images-outline" size={18} color={COLORS.white} />}
                        <Ionicons name="add-circle" size={11} color={COLORS.white} style={styles.albumAddBadge} />
                      </Pressable>
                    )}
                  </View>

                  {albumUploading && (
                    <View style={styles.uploadProgressCard}>
                      <View style={styles.uploadProgressTop}>
                        <Ionicons name="cloud-upload-outline" size={17} color={COLORS.primary} />
                        <Text style={styles.uploadProgressText}>Bloom đang cất ảnh vào album… {albumProgress}%</Text>
                      </View>
                      <View style={styles.uploadTrack}><View style={[styles.uploadFill, { width: `${Math.max(3, albumProgress)}%` }]} /></View>
                    </View>
                  )}

                  {albumLoading && liveEnabled ? (
                    <View style={styles.inlineLoading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.inlineLoadingText}>Bloom đang mở album…</Text></View>
                  ) : albumError && !displayAlbum.length ? (
                    <View style={styles.albumErrorCard}>
                      <Ionicons name="cloud-offline-outline" size={24} color={COLORS.primary} />
                      <Text style={styles.albumErrorTitle}>Chưa đọc được album</Text>
                      <Text style={styles.albumErrorText}>Ảnh đã tải lên vẫn được giữ nguyên. Mở lại chi tiết hoặc kiểm tra kết nối nếu trạng thái này còn xuất hiện.</Text>
                    </View>
                  ) : displayAlbum.length ? (
                    <View style={styles.albumGrid}>
                      {displayAlbum.map((item, index) => {
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => openAlbumAt(index)}
                            style={({ pressed }) => [styles.albumMediaTile, { width: albumTileSize, height: albumTileSize }, pressed && styles.pressed]}
                          >
                            <AlbumMediaPreview item={item} />
                            {item.type === "video" && (
                              <View style={styles.albumVideoBadge}><Ionicons name="play" size={13} color={COLORS.white} /></View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : person.albumLabels.length && showPrototypeNote ? (
                    <View style={styles.albumGrid}>
                      {person.albumLabels.map((label, index) => (
                        <View key={`${label}-${index}`} style={styles.albumTile}>
                          <Ionicons name="images-outline" size={24} color={COLORS.primary} />
                          <Text style={styles.albumLabel}>{label}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={styles.albumEmpty}>
                      <View style={styles.albumEmptyIcon}><Ionicons name="images-outline" size={26} color={COLORS.primary} /></View>
                      <Text style={styles.albumEmptyTitle}>Album đang chờ những tấm ảnh đầu tiên</Text>
                      <Text style={styles.albumEmptyText}>{canEdit ? "Bấm nút ảnh phía trên để thêm ký ức đầu tiên." : "Khi quản trị viên thêm ảnh, album sẽ tự cập nhật ở đây."}</Text>
                    </View>
                  )}
                </View>
              )}

              {showPrototypeNote && (
                <View style={styles.prototypeNote}>
                  <Ionicons name="flask-outline" size={16} color={COLORS.attention} />
                  <Text style={styles.prototypeNoteText}>Dữ liệu trên màn hình này chỉ là mock data để duyệt UI/UX Phase 6.0.</Text>
                </View>
              )}
            </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={timelineComposerVisible} transparent animationType="fade" statusBarTranslucent onRequestClose={() => { setTimelineComposerVisible(false); setEditingTimelineEntry(null); }}>
        <View style={styles.composerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => { setTimelineComposerVisible(false); setEditingTimelineEntry(null); }} />
          <View style={styles.composerSheet}>
            <View style={styles.composerHandle} />
            <View style={styles.composerHeader}>
              <View style={styles.composerHeaderCopy}>
                <Text style={styles.composerEyebrow}>CON ĐƯỜNG KÝ ỨC</Text>
                <Text style={styles.composerTitle}>{editingTimelineEntry ? "Chỉnh dấu mốc 🌷" : "Thêm một dấu mốc 🌷"}</Text>
              </View>
              <Pressable onPress={() => { setTimelineComposerVisible(false); setEditingTimelineEntry(null); }} style={styles.composerClose}><Ionicons name="close" size={20} color={COLORS.primaryText} /></Pressable>
            </View>
            <BloomKeyboardScreen rootStyle={styles.composerKeyboard} contentContainerStyle={styles.composerContent}>
              <BloomTextInput label="Tên dấu mốc" value={timelineTitle} onChangeText={setTimelineTitle} placeholder="Ví dụ: Ngày cưới, tốt nghiệp…" leftIcon="sparkles-outline" maxLength={160} />
              <BloomDatePicker label="Ngày diễn ra" selectedDate={timelineDate} onDateChange={setTimelineDate} leftIcon="calendar-outline" maximumDate={new Date()} />
              <BloomTextInput label="Câu chuyện" value={timelineDescription} onChangeText={setTimelineDescription} placeholder="Một vài dòng để người sau vẫn nhớ câu chuyện này…" leftIcon="heart-outline" multiline maxLength={4000} />
              <Pressable disabled={!timelineTitle.trim() || savingTimeline} onPress={saveTimelineEntry} style={({ pressed }) => [styles.composerSave, pressed && styles.pressed, (!timelineTitle.trim() || savingTimeline) && styles.disabledButton]}>
                {savingTimeline ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="flower-outline" size={18} color={COLORS.white} />}
                <Text style={styles.composerSaveText}>{savingTimeline ? "Đang lưu…" : editingTimelineEntry ? "Lưu thay đổi" : "Gieo dấu mốc này"}</Text>
              </Pressable>
            </BloomKeyboardScreen>
          </View>
        </View>
      </Modal>
      <BloomConfirmDialog
        visible={personDeleteVisible}
        eyebrow="XÓA NGƯỜI"
        icon="person-remove-outline"
        title={`Xóa ${person.displayName} khỏi phả hệ?`}
        message="Đây là thao tác xóa Person thật. Các đường quan hệ đang nối với người này cũng sẽ được gỡ. Timeline/Album và tài khoản liên kết vẫn được Bloom bảo vệ."
        cancelLabel="Giữ người này"
        confirmLabel="Xóa người"
        destructive
        loading={destructiveBusy}
        onCancel={() => !destructiveBusy && setPersonDeleteVisible(false)}
        onConfirm={() => void confirmPersonDelete()}
      />

      <BloomConfirmDialog
        visible={!!relationshipToDelete}
        eyebrow="SỬA ĐƯỜNG NỐI"
        icon="git-branch-outline"
        title="Xóa đường quan hệ này?"
        message={`${relationshipToDelete?.label ?? "Quan hệ"} sẽ được gỡ khỏi cây. Cả hai người vẫn được giữ nguyên để bạn có thể nối lại đúng.`}
        cancelLabel="Giữ đường nối"
        confirmLabel="Xóa đường nối"
        destructive
        loading={destructiveBusy}
        onCancel={() => !destructiveBusy && setRelationshipToDelete(null)}
        onConfirm={() => void confirmRelationshipDelete()}
      />

      <BloomConfirmDialog
        visible={!!timelineToDelete}
        eyebrow="CON ĐƯỜNG KÝ ỨC"
        icon="flower-outline"
        title="Gỡ dấu mốc này?"
        message={`“${timelineToDelete?.title ?? "Dấu mốc"}” sẽ được gỡ khỏi con đường ký ức của ${person.shortName || person.displayName}.${timelineAdmin ? " Admin chỉ dùng quyền này khi nội dung đã được xác minh là không đúng." : ""}`}
        cancelLabel="Giữ lại"
        confirmLabel="Gỡ dấu mốc"
        destructive
        loading={destructiveBusy}
        onCancel={() => !destructiveBusy && setTimelineToDelete(null)}
        onConfirm={() => void confirmTimelineDelete()}
      />
    </>
  );
}

function getRelationSummaryIcon(relation: string): keyof typeof Ionicons.glyphMap {
  const normalized = relation.trim().toLocaleLowerCase("vi");

  if (normalized.startsWith("vợ/chồng")) return "heart";
  if (normalized.startsWith("bác")) return "ribbon-outline";
  if (normalized.startsWith("chú")) return "man-outline";
  if (normalized.startsWith("cô")) return "woman-outline";
  if (normalized.startsWith("dì")) return "flower-outline";
  if (normalized.startsWith("anh") || normalized.startsWith("chị") || normalized.startsWith("em")) return "people-outline";
  if (normalized.startsWith("cháu") || normalized.startsWith("con")) return "happy-outline";
  if (normalized.startsWith("cha") || normalized.startsWith("mẹ") || normalized.startsWith("ông") || normalized.startsWith("bà")) return "people-outline";
  return "git-branch-outline";
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={17} color={COLORS.primary} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRoot: { flex: 1, backgroundColor: COLORS.white },
  headerRow: { minHeight: 62, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, backgroundColor: COLORS.white },
  iconButton: { width: 44, height: 44, borderRadius: 17, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  iconButtonPlaceholder: { width: 44, height: 44 },
  sheetTitle: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  scrollContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 42 },
  personHero: { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 7 },
  avatar: { width: 88, height: 88, borderRadius: 29, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  avatarMale: { backgroundColor: "#EEF7FF" },
  avatarFemale: { backgroundColor: "#FFF0F5" },
  avatarText: { color: COLORS.primaryText, fontSize: 30, fontWeight: "900" },
  lifeDot: { position: "absolute", width: 18, height: 18, right: -2, bottom: 5, borderRadius: 9, backgroundColor: COLORS.positive, borderWidth: 3, borderColor: COLORS.white },
  lifeDotDeceased: { backgroundColor: COLORS.secondaryText },
  heroCopy: { flex: 1 },
  personName: { color: COLORS.primaryText, fontSize: 24, fontWeight: "900", letterSpacing: -0.35 },
  personMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 14.5 },
  statusRow: { marginTop: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: COLORS.positive },
  statusDotDeceased: { backgroundColor: COLORS.secondaryText },
  statusText: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  linkRow: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  linkText: { color: COLORS.secondaryText, fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
  quoteCard: { marginTop: 18, backgroundColor: "#FBF8F3", borderRadius: 18, padding: 14 },
  quoteText: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 18, fontStyle: "italic" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionButton: { flex: 1, minHeight: 62, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", gap: 4, backgroundColor: COLORS.white },
  actionButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionIcon: { width: 35, height: 35, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  actionIconActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  actionText: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  actionTextActive: { color: COLORS.white },
  deleteNodeButton: { marginTop: 10, minHeight: 58, borderRadius: 18, borderWidth: 1, borderColor: "#F2D8DD", backgroundColor: "#FFF7F8", paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 9 },
  deleteNodeIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  deleteNodeCopy: { flex: 1, minWidth: 0 },
  deleteNodeTitle: { color: COLORS.destructive, fontSize: 11.5, fontWeight: "900" },
  deleteNodeHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13 },
  pressed: { opacity: 0.66 },
  tabs: { flexDirection: "row", gap: 5, marginTop: 20, backgroundColor: COLORS.softSurface, borderRadius: 18, padding: 4 },
  tab: { flex: 1, minHeight: 36, borderRadius: 14, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabActive: { backgroundColor: COLORS.white },
  tabText: { color: COLORS.secondaryText, fontSize: 10.2, fontWeight: "700", textAlign: "center" },
  tabTextActive: { color: COLORS.primaryText, fontWeight: "900" },
  profileBridgeCard: { marginTop: 10, minHeight: 66, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#FFF7FA", flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  profileBridgeIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  profileBridgeCopy: { flex: 1, minWidth: 0 },
  profileBridgeTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  profileBridgeHint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.8, lineHeight: 14 },
  infoCard: { marginTop: 14, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, backgroundColor: COLORS.white, paddingHorizontal: 14 },
  infoRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  infoLabel: { width: 83, color: COLORS.secondaryText, fontSize: 11.5 },
  infoValue: { flex: 1, textAlign: "right", color: COLORS.primaryText, fontSize: 12.5, fontWeight: "700" },
  relationsStack: { gap: 10 },
  kinshipInsightCard: {
    borderRadius: 18,
    padding: 13,
    backgroundColor: "#FFF3F7",
    borderWidth: 1,
    borderColor: "#F0D7E0",
  },
  kinshipInsightHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  kinshipInsightIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  kinshipInsightCopy: { flex: 1 },
  kinshipInsightEyebrow: { color: COLORS.secondaryText, fontSize: 10, fontWeight: "800" },
  kinshipInsightSentence: { marginTop: 3, color: COLORS.primaryText, fontSize: 13, lineHeight: 19, fontWeight: "900" },
  kinshipInsightDetail: { marginTop: 9, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16 },
  focusSelfCard: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: "#F8F4FB", borderWidth: 1, borderColor: COLORS.border },
  focusSelfText: { flex: 1, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  relationRow: { minHeight: 54, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  relationIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: "#FFF5F8", borderWidth: 1, borderColor: "#EADCE1", alignItems: "center", justifyContent: "center" },
  relationText: { flex: 1, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "700" },
  relationshipManageCard: { marginTop: 10, borderRadius: 20, borderWidth: 1, borderColor: "#EEDCE3", backgroundColor: "#FFF9FB", paddingHorizontal: 13, paddingVertical: 13 },
  relationshipManageHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  relationshipManageIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  relationshipManageCopy: { flex: 1, minWidth: 0 },
  relationshipManageTitle: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  relationshipManageHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.7, lineHeight: 13.5, fontWeight: "600" },
  relationshipManageDivider: { height: 1, backgroundColor: "#F2E8EC", marginVertical: 4 },
  relationshipManageRow: { minHeight: 45, flexDirection: "row", alignItems: "center", gap: 9 },
  relationshipManageRowCopy: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  relationshipManageLabel: { flex: 1, color: COLORS.primaryText, fontSize: 11.5, lineHeight: 16, fontWeight: "800" },
  relationshipDeleteButton: { width: 35, height: 35, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F2" },
  simpleEmpty: { paddingVertical: 22 },
  simpleEmptyText: { color: COLORS.secondaryText, textAlign: "center", fontSize: 11.5 },
  timelineRoadCard: { marginTop: 14, borderRadius: 24, backgroundColor: "#FFF9F5", borderWidth: 1, borderColor: "#F1E2DD", padding: 14, overflow: "hidden" },
  timelineHeaderActions: { flexDirection: "row", alignItems: "center", gap: 7 },
  miniOutlineButton: { width: 36, height: 36, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  timelineEntryActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  contributorRow: { marginTop: 7, flexDirection: "row", alignItems: "center", gap: 4 },
  contributorText: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "700" },
  timelineRoadHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  timelineRoadHeaderIcon: { width: 38, height: 38, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F5" },
  timelineRoadHeaderCopy: { flex: 1 },
  timelineRoadTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  timelineRoadSubtitle: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 14 },
  miniAddButton: { width: 40, height: 40, borderRadius: 16, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", position: "relative" },
  miniSparkle: { position: "absolute", right: 6, top: 6 },
  timelineRoadRow: { flexDirection: "row", gap: 11, minHeight: 92 },
  timelineRoadRail: { width: 28, alignItems: "center" },
  timelineRoadDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", marginTop: 14, borderWidth: 4, borderColor: "#FFF9F5", zIndex: 2 },
  timelineRoadDotAlt: { backgroundColor: "#D6A7B9" },
  timelineRoadLine: { width: 7, flex: 1, minHeight: 52, marginTop: -2, marginBottom: -2, borderRadius: 999, backgroundColor: "#F1CDD9" },
  timelineMemoryCard: { flex: 1, alignSelf: "flex-start", marginTop: 8, marginBottom: 10, borderRadius: 18, padding: 12, backgroundColor: COLORS.white, borderWidth: 1, borderColor: "#F0DDE4", shadowColor: "#E7C3CF", shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  timelineMemoryCardAlt: { backgroundColor: "#FFF5F8", marginLeft: 10 },
  timelineMemoryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  timelineYear: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  timelineDeleteButton: { width: 26, height: 26, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF7F8" },
  timelineTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  timelineDescription: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16 },
  timelineEmpty: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 18 },
  timelineEmptyTitle: { marginTop: 8, color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  timelineEmptyText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
  inlineLoading: { minHeight: 88, alignItems: "center", justifyContent: "center", gap: 8 },
  inlineLoadingText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700", textAlign: "center" },
  momentsSection: { gap: 12 },
  momentsHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  momentsHeaderCopy: { flex: 1 },
  personMomentList: { gap: 9 },
  personMomentCard: { minHeight: 66, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", gap: 10, padding: 11 },
  personMomentIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  personMomentCopy: { flex: 1, minWidth: 0 },
  personMomentTitle: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 17, fontWeight: "900" },
  personMomentMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.5 },
  albumSection: { marginTop: 14 },
  albumHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  albumHeaderCopy: { flex: 1 },
  albumHeaderTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  albumHeaderSubtitle: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14 },
  albumAddButton: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.primary, position: "relative" },
  albumAddBadge: { position: "absolute", right: 5, bottom: 5 },
  disabledButton: { opacity: 0.48 },
  uploadProgressCard: { marginTop: 12, borderRadius: 16, backgroundColor: "#FFF6FA", borderWidth: 1, borderColor: COLORS.border, padding: 10 },
  uploadProgressTop: { flexDirection: "row", alignItems: "center", gap: 7 },
  uploadProgressText: { flex: 1, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  uploadTrack: { height: 5, borderRadius: 999, backgroundColor: "#F5DDE6", overflow: "hidden", marginTop: 8 },
  uploadFill: { height: "100%", borderRadius: 999, backgroundColor: COLORS.primary },
  albumGrid: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 10, marginTop: 14 },
  albumTile: { width: "48%", aspectRatio: 1.35, borderRadius: 18, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", gap: 7, borderWidth: 1, borderColor: COLORS.border },
  albumMediaTile: { borderRadius: 18, overflow: "hidden", backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, position: "relative" },
  albumPreview: { width: "100%", height: "100%", backgroundColor: "#FFF5F8" },
  albumMediaImage: { width: "100%", height: "100%" },
  albumPreviewPlaceholder: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF5F8" },
  albumFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5 },
  albumFallbackText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "800" },
  albumVideoBadge: { position: "absolute", right: 8, bottom: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(80,49,61,0.72)", alignItems: "center", justifyContent: "center" },
  albumLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800", textAlign: "center" },
  albumErrorCard: { marginTop: 14, minHeight: 150, borderRadius: 22, backgroundColor: "#FFF8FB", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  albumErrorTitle: { marginTop: 8, color: COLORS.primaryText, fontSize: 13, fontWeight: "900", textAlign: "center" },
  albumErrorText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
  albumEmpty: { marginTop: 14, minHeight: 180, borderRadius: 22, backgroundColor: "#FFF8FB", borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  albumEmptyIcon: { width: 54, height: 54, borderRadius: 20, backgroundColor: "#FFF0F5", alignItems: "center", justifyContent: "center" },
  albumEmptyTitle: { marginTop: 10, color: COLORS.primaryText, fontSize: 13, fontWeight: "900", textAlign: "center" },
  albumEmptyText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, textAlign: "center" },
  prototypeNote: { marginTop: 17, borderRadius: 16, backgroundColor: "#FFF8E9", padding: 12, flexDirection: "row", gap: 8, alignItems: "flex-start" },
  prototypeNoteText: { flex: 1, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  composerOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(62,45,51,0.28)" },
  composerSheet: { maxHeight: "84%", minHeight: 510, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: COLORS.white, paddingTop: 8, overflow: "hidden" },
  composerHandle: { width: 42, height: 4, borderRadius: 999, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 6 },
  composerHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingVertical: 10, gap: 10 },
  composerHeaderCopy: { flex: 1 },
  composerEyebrow: { color: COLORS.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  composerTitle: { marginTop: 3, color: COLORS.primaryText, fontSize: 20, fontWeight: "900" },
  composerClose: { width: 42, height: 42, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  composerKeyboard: { flex: 1 },
  composerContent: { paddingHorizontal: 18, paddingTop: 4, paddingBottom: 30, gap: 12 },
  composerSave: { minHeight: 54, marginTop: 4, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  composerSaveText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
});
