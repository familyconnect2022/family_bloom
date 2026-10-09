import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  type TextInput,
  type ViewToken,
  View,
  useWindowDimensions,
} from "react-native";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { useMediaViewer } from "../../components/media/MediaViewerProvider";
import { MomentCard } from "../../components/moments/MomentCard";
import { FamilyPersonMultiPicker } from "../../components/familyGraph/FamilyPersonMultiPicker";
import { PendingMomentCard } from "../../components/moments/PendingMomentCard";
import { BloomButton } from "../../components/ui/BloomButtonComponents";
import { BloomTextInput } from "../../components/ui/BloomInputComponents";
import { BloomFullScreenFlow } from "../../components/ui/BloomFullScreenFlow";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { StatusBar } from "expo-status-bar";
import { useBloomDialog } from "../../components/ui/BloomDialogProvider";
import {
  BloomCard,
  BloomEmptyState,
  BloomPill,
} from "../../components/ui/BloomPageComponents";
import { COLORS, SPACING } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useTabLiveEffect, useTabRuntime } from "../../context/TabRuntimeContext";
import { useMomentPublish, type PendingMoment } from "../../context/MomentPublishContext";
import { useFamilyMoments } from "../../hooks/moments/useFamilyMoments";
import { useFamilyMembers } from "../../hooks/family/useFamilyMembers";
import { useFamilyPersonDirectory } from "../../hooks/family/useFamilyPersonDirectory";
import { useFamilyPersonsByIds } from "../../hooks/family/useFamilyPersonsByIds";
import { momentsService } from "../../services/moments/momentsService";
import { momentDeepLinkCache } from "../../services/moments/momentDeepLinkCache";
import { mediaService } from "../../services/media/mediaService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";
import type { FamilyMember, MediaFile } from "../../types";
import type { MomentMedia, MomentPost } from "../../types/moments";
import { useBloomTaskToast } from "../../hooks/ui/useBloomTaskToast";

type FeedItem =
  | { kind: "pending"; key: string; item: PendingMoment }
  | { kind: "post"; key: string; item: MomentPost };

type LinkedPerson = { id: string; name: string };
type VisibilityListener = () => void;

type MomentVisibilityStore = {
  isVisible: (postId: string) => boolean;
  subscribe: (postId: string, listener: VisibilityListener) => () => void;
  replaceVisibleIds: (next: Set<string>) => void;
};

const createMomentVisibilityStore = (): MomentVisibilityStore => {
  let visibleIds = new Set<string>();
  const listeners = new Map<string, Set<VisibilityListener>>();

  return {
    isVisible: (postId) => visibleIds.has(postId),
    subscribe: (postId, listener) => {
      const bucket = listeners.get(postId) ?? new Set<VisibilityListener>();
      bucket.add(listener);
      listeners.set(postId, bucket);
      return () => {
        bucket.delete(listener);
        if (!bucket.size) listeners.delete(postId);
      };
    },
    replaceVisibleIds: (next) => {
      const changed = new Set<string>();
      visibleIds.forEach((id) => { if (!next.has(id)) changed.add(id); });
      next.forEach((id) => { if (!visibleIds.has(id)) changed.add(id); });
      visibleIds = next;
      changed.forEach((id) => listeners.get(id)?.forEach((listener) => listener()));
    },
  };
};

const useMomentVisibility = (store: MomentVisibilityStore, postId: string) => {
  const subscribe = useCallback((listener: VisibilityListener) => store.subscribe(postId, listener), [postId, store]);
  const getSnapshot = useCallback(() => store.isVisible(postId), [postId, store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

const EMPTY_LINKED_PERSONS: LinkedPerson[] = [];

type MomentPostRowProps = {
  post: MomentPost;
  familyId: string;
  currentUid: string;
  currentName: string;
  currentAvatarUrl?: string;
  memberByUid: Map<string, FamilyMember>;
  screenFocused: boolean;
  canModerate: boolean;
  linkedPersons: LinkedPerson[];
  visibilityStore: MomentVisibilityStore;
  onCommentFocus: (input: TextInput | null) => void;
  onCommentScrollLockChange: (locked: boolean) => void;
  onEditRequest: (post: MomentPost) => void;
};

const MomentPostRow = memo(function MomentPostRow({
  post,
  familyId,
  currentUid,
  currentName,
  currentAvatarUrl,
  memberByUid,
  screenFocused,
  canModerate,
  linkedPersons,
  visibilityStore,
  onCommentFocus,
  onCommentScrollLockChange,
  onEditRequest,
}: MomentPostRowProps) {
  const visible = useMomentVisibility(visibilityStore, post.id);
  return (
    <View style={styles.feedItemInset}>
      <MomentCard
        post={post}
        familyId={familyId}
        currentUid={currentUid}
        currentName={currentName}
        currentAvatarUrl={currentAvatarUrl}
        onCommentFocus={onCommentFocus}
        onCommentScrollLockChange={onCommentScrollLockChange}
        memberByUid={memberByUid}
        realtimeEnabled={screenFocused && visible}
        canModerate={canModerate}
        linkedPersons={linkedPersons}
        onEditRequest={onEditRequest}
      />
    </View>
  );
});

export default function MomentsScreen() {
  useTabRuntime("moments");
  const router = useRouter();
  const { user, userProfile, activeFamilyId, families } = useAuth();
  const params = useLocalSearchParams<{ personId?: string | string[]; highlightMomentId?: string | string[]; highlightFamilyId?: string | string[] }>();
  const requestedPersonId = Array.isArray(params.personId) ? params.personId[0] : params.personId;
  const highlightMomentId = Array.isArray(params.highlightMomentId) ? params.highlightMomentId[0] : params.highlightMomentId;
  const highlightFamilyId = Array.isArray(params.highlightFamilyId) ? params.highlightFamilyId[0] : params.highlightFamilyId;
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<FeedItem>>(null);
  const feedItemsRef = useRef<FeedItem[]>([]);
  const listOffsetRef = useRef(0);
  const focusedCommentInputRef = useRef<TextInput | null>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardReserve, setKeyboardReserve] = useState(0);
  const [commentScrollLocked, setCommentScrollLocked] = useState(false);
  const [modal, setModal] = useState(false);
  const [composerDirty, setComposerDirty] = useState(false);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<MediaFile[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [timelineAudience, setTimelineAudience] = useState<"self" | "family" | "persons">("self");
  const [notifyFamily, setNotifyFamily] = useState(false);
  const [editPost, setEditPost] = useState<MomentPost | null>(null);
  const [editCaption, setEditCaption] = useState("");
  const [editTimelineAudience, setEditTimelineAudience] = useState<"self" | "family" | "persons">("self");
  const [editNotifyFamily, setEditNotifyFamily] = useState(false);
  const [editPersonIds, setEditPersonIds] = useState<string[]>([]);
  const [editExistingMedia, setEditExistingMedia] = useState<MomentMedia[]>([]);
  const [editNewFiles, setEditNewFiles] = useState<MediaFile[]>([]);
  const [editUploadedFiles, setEditUploadedFiles] = useState<Array<{ fileId: string; assetId: string; media: MomentMedia; metadataSynced: boolean }>>([]);
  const [editBusy, setEditBusy] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const [moderationVisible, setModerationVisible] = useState(false);
  const [hiddenPosts, setHiddenPosts] = useState<MomentPost[]>([]);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [screenFocused, setScreenFocused] = useState(false);
  const screenFocusGateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const screenFocusMountedRef = useRef(true);
  const [highlightedMoment, setHighlightedMoment] = useState<MomentPost | null>(null);
  const [highlightOpening, setHighlightOpening] = useState(false);
  const highlightFetchRef = useRef(0);
  const visibilityStoreRef = useRef<MomentVisibilityStore | null>(null);
  if (!visibilityStoreRef.current) visibilityStoreRef.current = createMomentVisibilityStore();
  const visibilityStore = visibilityStoreRef.current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 24, minimumViewTime: 120 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = new Set<string>();
    viewableItems.forEach((token) => {
      const feedItem = token.item as FeedItem | undefined;
      if (feedItem?.kind === "post") next.add(feedItem.item.id);
    });
    visibilityStoreRef.current?.replaceVisibleIds(next);
  }).current;


  useEffect(() => {
    screenFocusMountedRef.current = true;
    return () => {
      screenFocusMountedRef.current = false;
      if (screenFocusGateTimerRef.current) clearTimeout(screenFocusGateTimerRef.current);
      screenFocusGateTimerRef.current = null;
    };
  }, []);

  // Phase 17.9A17: keep the navigation commit window free of feed-wide React
  // renders. Per-card realtime may stay warm for a fraction of a second while
  // the tab indicator finishes on the UI thread; focus state is reconciled only
  // after that visual handoff, so Moments cannot compete with the tabbar commit.
  useFocusEffect(useCallback(() => {
    if (screenFocusGateTimerRef.current) clearTimeout(screenFocusGateTimerRef.current);
    screenFocusGateTimerRef.current = setTimeout(() => {
      screenFocusGateTimerRef.current = null;
      if (!screenFocusMountedRef.current) return;
      setScreenFocused(true);
    }, 280);
    return () => {
      if (screenFocusGateTimerRef.current) clearTimeout(screenFocusGateTimerRef.current);
      screenFocusGateTimerRef.current = setTimeout(() => {
        screenFocusGateTimerRef.current = null;
        if (!screenFocusMountedRef.current) return;
        setScreenFocused(false);
        setCommentScrollLocked(false);
      }, 280);
    };
  }, [activeFamilyId]));

  const membership = families.find((item) => item.familyId === activeFamilyId);
  const canModerate = membership?.role === "admin" || membership?.role === "owner";
  const { openMediaViewer } = useMediaViewer();
  const { startTask, finishTask, failTask } = useBloomTaskToast();
  const { confirm, inform } = useBloomDialog();
  const { memberByUid } = useFamilyMembers(activeFamilyId);
  const consumedPersonParamRef = useRef<string | null>(null);
  const {
    pendingMoments,
    publishMoment,
    retryMoment,
    removePendingMoment,
    reconcilePublished,
  } = useMomentPublish();
  const {
    moments,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    retry,
    error,
  } = useFamilyMoments(activeFamilyId);
  const linkedPersonIds = useMemo(
    () => Array.from(new Set(moments.flatMap((item) => item.personIds || []))),
    [moments],
  );
  const { personById: linkedPersonById } = useFamilyPersonsByIds(activeFamilyId, linkedPersonIds);
  const personDirectoryEnabled = !!activeFamilyId && (!!requestedPersonId || modal || !!editPost);
  const { persons, personById: directoryPersonById } = useFamilyPersonDirectory(activeFamilyId, personDirectoryEnabled);
  const personById = useMemo(() => {
    if (!directoryPersonById.size) return linkedPersonById;
    if (!linkedPersonById.size) return directoryPersonById;
    return new Map([...linkedPersonById, ...directoryPersonById]);
  }, [directoryPersonById, linkedPersonById]);
  useTabStartupTask("moments", !loading);


  useEffect(() => {
    if (!requestedPersonId || !directoryPersonById.has(requestedPersonId) || consumedPersonParamRef.current === requestedPersonId) return;
    consumedPersonParamRef.current = requestedPersonId;
    setPersonIds([requestedPersonId]);
    setTimelineAudience("persons");
    setComposerDirty(false);
    setModal(true);
    router.setParams({ personId: undefined } as never);
  }, [directoryPersonById, requestedPersonId, router]);

  useEffect(() => {
    setHiddenPosts([]);
    setModerationVisible(false);
  }, [activeFamilyId, canModerate]);

  useTabLiveEffect("moments", (scope) => {
    if (!activeFamilyId || !canModerate) return;
    return subscribeSharedRealtime<MomentPost[]>({
      key: `moments.moderation_hidden:${activeFamilyId}`,
      listenerName: "moments.moderation_hidden",
      start: (onData, onError) => momentsService.subscribeHiddenForModeration(activeFamilyId, onData, onError),
      onData: (items) => { if (scope.isCurrent()) setHiddenPosts(items); },
      onError: () => { if (scope.isCurrent()) setHiddenPosts([]); },
    });
  }, [activeFamilyId, canModerate]);

  const restoreHiddenPost = useCallback(async (postId: string) => {
    if (!activeFamilyId || !canModerate || moderationBusyId) return;
    setModerationBusyId(postId);
    try {
      await momentsService.setModerationStatus(activeFamilyId, postId, "visible");
    } catch {
      void inform({ title: "Chưa khôi phục được", message: "Bloom chưa đưa bài trở lại trang Kỷ niệm. Bạn thử lại nhé.", icon: "refresh-outline" });
    } finally {
      setModerationBusyId(null);
    }
  }, [activeFamilyId, canModerate, moderationBusyId]);

  const familyPending = useMemo(
    () => pendingMoments.filter((item) => item.familyId === activeFamilyId),
    [activeFamilyId, pendingMoments],
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    const posts = [...moments];
    if (highlightedMoment && !posts.some((item) => item.id === highlightedMoment.id)) posts.unshift(highlightedMoment);
    return [
      ...familyPending.map((item) => ({ kind: "pending" as const, key: `pending-${item.localId}`, item })),
      ...posts.map((item) => ({ kind: "post" as const, key: `post-${item.id}`, item })),
    ];
  }, [familyPending, highlightedMoment, moments]);

  feedItemsRef.current = feedItems;

  useEffect(() => {
    if (!highlightMomentId || !activeFamilyId) return;
    if (highlightFamilyId && highlightFamilyId !== activeFamilyId) return;

    const existingIndex = feedItems.findIndex((item) => item.kind === "post" && item.item.id === highlightMomentId);
    if (existingIndex >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: existingIndex, animated: true, viewPosition: 0.08 });
      });
      router.setParams({ highlightMomentId: undefined, highlightFamilyId: undefined } as never);
      return;
    }

    const requestId = ++highlightFetchRef.current;
    setHighlightOpening(true);
    const cachedPost = momentDeepLinkCache.get(activeFamilyId, highlightMomentId);
    const pendingPost = momentDeepLinkCache.getPending(activeFamilyId, highlightMomentId);
    const targetPromise = cachedPost ? Promise.resolve(cachedPost) : pendingPost ?? momentsService.getById(activeFamilyId, highlightMomentId);
    void targetPromise
      .then((post) => {
        if (requestId !== highlightFetchRef.current || !post) return;
        setHighlightedMoment(post);
        momentDeepLinkCache.clear(activeFamilyId, highlightMomentId);
        requestAnimationFrame(() => {
          // Pending cards may sit before the injected post; find the exact index after state commit.
          requestAnimationFrame(() => {
            if (requestId !== highlightFetchRef.current) return;
            const index = feedItemsRef.current.findIndex((item) => item.kind === "post" && item.item.id === highlightMomentId);
            if (index >= 0) listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.08 });
            setHighlightOpening(false);
          });
        });
      })
      .catch(() => {
        if (requestId === highlightFetchRef.current) setHighlightOpening(false);
      })
      .finally(() => {
        if (requestId === highlightFetchRef.current) {
          router.setParams({ highlightMomentId: undefined, highlightFamilyId: undefined } as never);
        }
      });
  }, [activeFamilyId, feedItems, highlightFamilyId, highlightMomentId, router]);

  useEffect(() => {
    setHighlightedMoment(null);
    setHighlightOpening(false);
    highlightFetchRef.current += 1;
  }, [activeFamilyId]);


  useTabLiveEffect("moments", () => {
    if (!activeFamilyId || moments.length === 0) return;
    reconcilePublished(activeFamilyId, moments.map((post) => post.id));
  }, [activeFamilyId, moments, reconcilePublished]);

  const revealCommentInput = useCallback((input: TextInput | null) => {
    focusedCommentInputRef.current = input;
    if (!input) return;

    const reveal = () => {
      requestAnimationFrame(() => {
        input.measureInWindow((_x, y, _width, height) => {
          const keyboardTop = keyboardTopRef.current;
          if (keyboardTop == null) return;
          const safeBottom = keyboardTop - 22;
          const overlap = y + height - safeBottom;
          if (overlap <= 0) return;
          listRef.current?.scrollToOffset({
            offset: Math.max(0, listOffsetRef.current + overlap + 18),
            animated: true,
          });
        });
      });
    };

    setTimeout(reveal, Platform.OS === "android" ? 90 : 35);
    setTimeout(reveal, Platform.OS === "android" ? 240 : 130);
  }, []);

  useTabLiveEffect("moments", () => {
    const onShow = (event: any) => {
      const frame = event.endCoordinates;
      const screenHeight = Dimensions.get("screen").height;
      keyboardTopRef.current = frame.screenY > 0 ? frame.screenY : Math.max(0, screenHeight - frame.height);
      setKeyboardReserve(Platform.OS === "android" ? Math.min(Math.max(frame.height, 0), 380) : 0);
      revealCommentInput(focusedCommentInputRef.current);
    };
    const onHide = () => {
      keyboardTopRef.current = null;
      focusedCommentInputRef.current = null;
      setKeyboardReserve(0);
    };
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
      keyboardTopRef.current = null;
      focusedCommentInputRef.current = null;
    };
  }, [revealCommentInput]);

  const previewColumns = screenWidth >= 430 ? 4 : 3;
  const previewLimit = previewColumns * 2;
  const previewItems = selected.slice(0, previewLimit);
  const previewRemaining = Math.max(0, selected.length - previewItems.length);
  const previewTileSize = Math.max(
    72,
    Math.floor((Math.min(screenWidth, 560) - 40 - (previewColumns - 1) * 8) / previewColumns),
  );

  const pickMedia = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      void inform({ title: "Cần cấp quyền 🌸", message: "Cho phép Family Bloom truy cập ảnh/video để chia sẻ khoảnh khắc nhé.", icon: "images-outline" });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      setComposerDirty(true);
      setSelected(
        result.assets.map((asset, index) => ({
          id: `moment-${Date.now()}-${index}`,
          uri: asset.uri,
          type: asset.type === "video" ? "video" : "image",
          mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
          fileName: asset.fileName || `moment-${index}`,
          fileSize: asset.fileSize ?? null,
          width: asset.width ?? null,
          height: asset.height ?? null,
          duration: asset.duration ?? null,
        })),
      );
    }
  };

  const removeSelected = (id: string) => { setComposerDirty(true); setSelected((current) => current.filter((item) => item.id !== id)); };
  const openComposer = () => {
    setPersonIds([]);
    setTimelineAudience("self");
    setNotifyFamily(false);
    setComposerDirty(false);
    setModal(true);
  };

  const closeComposerNow = useCallback(() => {
    setModal(false);
    setComposerDirty(false);
  }, []);

  const requestCloseComposer = useCallback(() => {
    if (!composerDirty) {
      closeComposerNow();
      return;
    }
    void confirm({
      eyebrow: "KHOẢNH KHẮC ĐANG VIẾT",
      title: "Hủy khoảnh khắc này?",
      message: "Ảnh, lời nhắn và lựa chọn bạn vừa thêm chưa được đăng. Bloom có thể giữ trang này để bạn viết tiếp.",
      icon: "images-outline",
      cancelLabel: "Viết tiếp",
      confirmLabel: "Hủy thay đổi",
      destructive: true,
    }).then((discard) => { if (discard) closeComposerNow(); });
  }, [closeComposerNow, composerDirty, confirm]);

  const create = () => {
    if (!activeFamilyId || !user || !userProfile || (!caption.trim() && !selected.length)) return;
    if (timelineAudience === "persons" && personIds.length === 0) {
      void inform({ title: "Chọn thành viên", message: "Hãy chọn ít nhất một người cho Dòng thời gian, hoặc chuyển về Tôi / Toàn gia đình.", icon: "people-outline" });
      return;
    }
    publishMoment({
      familyId: activeFamilyId,
      author: {
        uid: user.uid,
        displayName: userProfile.displayName,
        avatarUrl: userProfile.avatarUrl || undefined,
      },
      caption,
      personIds: timelineAudience === "persons" ? personIds : [],
      timelineAudience,
      notifyFamily: timelineAudience === "family" && notifyFamily,
      additionalFamilyIds: [],
      files: selected,
    });
    setCaption("");
    setSelected([]);
    setPersonIds([]);
    setTimelineAudience("self");
    setNotifyFamily(false);
    setComposerDirty(false);
    setModal(false);
  };

  const openEditPost = useCallback((post: MomentPost) => {
    setEditPost(post);
    setEditCaption(post.caption);
    setEditTimelineAudience(post.timelineAudience || (post.personIds?.length ? "persons" : "self"));
    setEditNotifyFamily(post.timelineAudience === "family" && post.notifyFamily === true);
    setEditPersonIds([...(post.personIds || [])]);
    setEditExistingMedia([...(post.media || [])]);
    setEditNewFiles([]);
    setEditUploadedFiles([]);
    setEditDirty(false);
  }, []);

  const discardEditUploads = useCallback(() => {
    if (!editUploadedFiles.length) return;
    void mediaService.markCleanupPendingMany(editUploadedFiles.map((item) => item.assetId)).catch(() => undefined);
  }, [editUploadedFiles]);

  const closeEditPostNow = useCallback(() => {
    if (editBusy) return;
    discardEditUploads();
    setEditPost(null);
    setEditNewFiles([]);
    setEditUploadedFiles([]);
    setEditDirty(false);
  }, [discardEditUploads, editBusy]);

  const requestCloseEditPost = useCallback(() => {
    if (editBusy) return;
    if (!editDirty) {
      closeEditPostNow();
      return;
    }
    void confirm({
      eyebrow: "CHỈNH KỶ NIỆM",
      title: "Bỏ những thay đổi này?",
      message: "Kỷ niệm vẫn an toàn như trước. Những chỉnh sửa chưa lưu sẽ được bỏ đi.",
      icon: "create-outline",
      cancelLabel: "Chỉnh tiếp",
      confirmLabel: "Bỏ thay đổi",
      destructive: true,
    }).then((discard) => { if (discard) closeEditPostNow(); });
  }, [closeEditPostNow, confirm, editBusy, editDirty]);

  const pickEditMedia = useCallback(async () => {
    if (!editPost || editBusy) return;
    const remaining = Math.max(0, 10 - editExistingMedia.length - editNewFiles.length);
    if (!remaining) {
      void inform({ title: "Đã đủ 10 tệp", message: "Bạn có thể bỏ bớt ảnh/video hiện tại rồi chọn tệp khác nhé.", icon: "images-outline" });
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      void inform({ title: "Cần cấp quyền 🌸", message: "Cho phép Family Bloom truy cập ảnh/video để cập nhật kỷ niệm nhé.", icon: "images-outline" });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });
    if (result.canceled) return;
    setEditDirty(true);
    const picked = result.assets.map((asset, index) => ({
      id: `moment-edit-${Date.now()}-${index}`,
      uri: asset.uri,
      type: asset.type === "video" ? "video" as const : "image" as const,
      mimeType: asset.mimeType || (asset.type === "video" ? "video/mp4" : "image/jpeg"),
      fileName: asset.fileName || `moment-edit-${index}`,
      fileSize: asset.fileSize ?? null,
      width: asset.width ?? null,
      height: asset.height ?? null,
      duration: asset.duration ?? null,
    }));
    setEditNewFiles((current) => [...current, ...picked].slice(0, Math.max(0, 10 - editExistingMedia.length)));
  }, [editBusy, editExistingMedia.length, editNewFiles.length, editPost]);

  const saveEditedPost = useCallback(async () => {
    if (!editPost || !activeFamilyId || !user || editBusy) return;
    if (editTimelineAudience === "persons" && editPersonIds.length === 0) {
      void inform({ title: "Chọn thành viên", message: "Hãy chọn ít nhất một người, hoặc chuyển về Tôi / Toàn gia đình.", icon: "people-outline" });
      return;
    }
    if (!editCaption.trim() && !editExistingMedia.length && !editNewFiles.length) {
      void inform({ title: "Kỷ niệm đang trống", message: "Giữ lại một lời nhắn, ảnh hoặc video trước khi lưu nhé.", icon: "heart-outline" });
      return;
    }

    setEditBusy(true);
    startTask({ title: "Đang cập nhật kỷ niệm…", message: editCaption.trim() || "Bloom đang chuẩn bị ảnh và video." });
    const uploadedByFile = new Map(editUploadedFiles.map((item) => [item.fileId, item]));
    try {
      for (const file of editNewFiles) {
        if (uploadedByFile.has(file.id)) continue;
        let completed: { fileId: string; assetId: string; media: MomentMedia; metadataSynced: boolean } | null = null;
        try {
          const uploaded = await mediaService.uploadManaged(file, {
            ownerUid: user.uid,
            familyId: activeFamilyId,
            purpose: "moment",
            entityType: "moment",
            entityId: editPost.id,
            category: "moments",
          });
          completed = {
            fileId: file.id,
            assetId: uploaded.asset.id,
            metadataSynced: true,
            media: {
              id: uploaded.asset.id,
              type: file.type,
              secureUrl: uploaded.result.secureUrl,
              publicId: uploaded.result.publicId,
              thumbnailUrl: uploaded.result.thumbnailUrl || undefined,
              width: file.width ?? undefined,
              height: file.height ?? undefined,
              duration: file.duration ?? undefined,
            },
          };
        } catch (error) {
          const checkpoint = (error as { managedUploadCheckpoint?: { asset: { id: string }; result: { secureUrl: string; publicId: string; thumbnailUrl?: string | null } } } | null)?.managedUploadCheckpoint;
          if (!checkpoint) throw error;
          completed = {
            fileId: file.id,
            assetId: checkpoint.asset.id,
            metadataSynced: false,
            media: {
              id: checkpoint.asset.id,
              type: file.type,
              secureUrl: checkpoint.result.secureUrl,
              publicId: checkpoint.result.publicId,
              thumbnailUrl: checkpoint.result.thumbnailUrl || undefined,
              width: file.width ?? undefined,
              height: file.height ?? undefined,
              duration: file.duration ?? undefined,
            },
          };
          uploadedByFile.set(file.id, completed);
          setEditUploadedFiles([...uploadedByFile.values()]);
          await mediaService.setUploaded(checkpoint.asset.id, {
            secureUrl: checkpoint.result.secureUrl,
            publicId: checkpoint.result.publicId,
            thumbnailUrl: checkpoint.result.thumbnailUrl || "",
            resourceType: file.type,
          });
          completed = { ...completed, metadataSynced: true };
        }
        if (completed) {
          uploadedByFile.set(file.id, completed);
          setEditUploadedFiles([...uploadedByFile.values()]);
        }
      }

      for (const uploaded of uploadedByFile.values()) {
        if (uploaded.metadataSynced) continue;
        await mediaService.setUploaded(uploaded.assetId, {
          secureUrl: uploaded.media.secureUrl,
          publicId: uploaded.media.publicId,
          thumbnailUrl: uploaded.media.thumbnailUrl || "",
          resourceType: uploaded.media.type,
        });
        uploadedByFile.set(uploaded.fileId, { ...uploaded, metadataSynced: true });
        setEditUploadedFiles([...uploadedByFile.values()]);
      }

      const originalAssetIds = new Set(editPost.mediaAssetIds || []);
      const keptExistingAssetIds = editExistingMedia
        .map((media) => media.id)
        .filter((assetId) => originalAssetIds.has(assetId));
      const newUploads = editNewFiles.map((file) => uploadedByFile.get(file.id)).filter((item): item is { fileId: string; assetId: string; media: MomentMedia; metadataSynced: boolean } => !!item);
      const nextMedia = [...editExistingMedia, ...newUploads.map((item) => item.media)];
      const nextAssetIds = [...keptExistingAssetIds, ...newUploads.map((item) => item.assetId)];

      await momentsService.updateOwnPost(
        activeFamilyId,
        editPost.id,
        {
          caption: editCaption,
          media: nextMedia,
          personIds: editTimelineAudience === "persons" ? editPersonIds : [],
          timelineAudience: editTimelineAudience,
          notifyFamily: editTimelineAudience === "family" && editNotifyFamily,
        },
        nextAssetIds,
      );
      finishTask({ title: "Đã cập nhật kỷ niệm 🌸", message: "Những thay đổi của bạn đã được lưu." });
      setEditPost(null);
      setEditNotifyFamily(false);
      setEditNewFiles([]);
      setEditUploadedFiles([]);
      setEditDirty(false);
    } catch (error) {
      setEditUploadedFiles([...uploadedByFile.values()]);
      failTask(error, { title: "Chưa cập nhật được", message: "Phần đã tải xong vẫn được giữ để bạn thử lưu lại." });
    } finally {
      setEditBusy(false);
    }
  }, [activeFamilyId, editBusy, editCaption, editExistingMedia, editNewFiles, editPersonIds, editPost, editTimelineAudience, editUploadedFiles, failTask, finishTask, startTask, user]);

  const openEditMediaAt = useCallback((index: number) => {
    if (!editPost) return;
    const items = [
      ...editExistingMedia.map((media) => ({ id: media.id, type: media.type, uri: media.secureUrl, thumbnailUri: media.thumbnailUrl || null, caption: editCaption.trim() || null })),
      ...editNewFiles.map((file) => ({ id: file.id, type: file.type, uri: file.uri, caption: editCaption.trim() || null })),
    ];
    if (!items.length) return;
    openMediaViewer({ items, initialIndex: index, title: "Sửa kỷ niệm" });
  }, [editCaption, editExistingMedia, editNewFiles, editPost, openMediaViewer]);

  const openSelectedAt = (index: number) => {
    openMediaViewer({
      items: selected.map((file) => ({
        id: file.id,
        type: file.type,
        uri: file.uri,
        caption: caption.trim() || null,
      })),
      initialIndex: index,
      title: "Khoảnh khắc mới",
    });
  };

  const linkedPersonsByPostId = useMemo(() => {
    const byPostId = new Map<string, LinkedPerson[]>();
    feedItems.forEach((feedItem) => {
      if (feedItem.kind !== "post" || !feedItem.item.personIds?.length) return;
      const linked = feedItem.item.personIds
        .map((id) => personById.get(id))
        .filter((person) => !!person)
        .map((person) => ({ id: person!.id, name: person!.nickname || person!.displayName }));
      if (linked.length) byPostId.set(feedItem.item.id, linked);
    });
    return byPostId;
  }, [feedItems, personById]);

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === "pending") {
      return (
        <View style={styles.feedItemInset}>
          <PendingMomentCard
            item={item.item}
            onRetry={() => retryMoment(item.item.localId)}
            onRemove={() => removePendingMoment(item.item.localId)}
          />
        </View>
      );
    }

    const post = item.item;
    if (!activeFamilyId) return null;
    return (
      <MomentPostRow
        post={post}
        familyId={activeFamilyId}
        currentUid={user?.uid || ""}
        currentName={userProfile?.displayName || "Thành viên"}
        currentAvatarUrl={userProfile?.avatarUrl || undefined}
        onCommentFocus={revealCommentInput}
        onCommentScrollLockChange={setCommentScrollLocked}
        memberByUid={memberByUid}
        screenFocused={screenFocused}
        canModerate={canModerate}
        linkedPersons={linkedPersonsByPostId.get(post.id) ?? EMPTY_LINKED_PERSONS}
        visibilityStore={visibilityStore}
        onEditRequest={openEditPost}
      />
    );
  }, [activeFamilyId, canModerate, linkedPersonsByPostId, memberByUid, openEditPost, removePendingMoment, retryMoment, revealCommentInput, screenFocused, user?.uid, userProfile?.avatarUrl, userProfile?.displayName, visibilityStore]);

  const listHeader = useMemo(() => (
    <View style={styles.headerBlock}>
      <BloomHeroHeader
        eyebrow="KỶ NIỆM"
        title="Những điều đáng nhớ"
        subtitle="Ảnh, video và những lời nhỏ bé cùng nở thành câu chuyện của nhà mình."
        variant="moment"
        compact
        roundedBottom
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chia sẻ khoảnh khắc"
            onPress={openComposer}
            style={({ pressed }) => [styles.heroCompose, pressed && styles.composePressed]}
          >
            <Ionicons name="add" size={25} color={COLORS.primaryText} />
          </Pressable>
        }
      />

      <View style={styles.headerInset}>
        <BloomCard tone="accent" style={styles.familyStrip}>
          <View style={styles.familyStripIcon}>
            <Ionicons name="images-outline" size={22} color={COLORS.primaryText} />
          </View>
          <View style={styles.familyStripCopy}>
            <Text style={styles.familyStripLabel}>TƯỜNG CỦA NHÀ</Text>
            <Text style={styles.familyStripName}>{membership?.familyName || "Gia đình của mình"}</Text>
          </View>
          <BloomPill
            icon="sparkles-outline"
            label={hasMore ? `${moments.length} gần nhất` : `${moments.length + familyPending.length} khoảnh khắc`}
          />
        </BloomCard>

        {canModerate && (
          <Pressable
            onPress={() => setModerationVisible(true)}
            style={({ pressed }) => [styles.moderationButton, pressed && styles.composePressed]}
          >
            <View style={styles.moderationIcon}>
              <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} />
            </View>
            <View style={styles.moderationCopy}>
              <Text style={styles.moderationTitle}>Kiểm duyệt trang Kỷ niệm</Text>
              <Text style={styles.moderationHint}>Người giữ nhà chỉ giúp ẩn hoặc đưa kỷ niệm trở lại · nội dung vẫn thuộc người tạo</Text>
            </View>
            <BloomPill icon="eye-off-outline" label={`${hiddenPosts.length} đang ẩn`} />
          </Pressable>
        )}
      </View>
    </View>
  ), [canModerate, familyPending.length, hasMore, hiddenPosts.length, membership?.familyName, moments.length]);

  const listEmpty = () => {
    if (loading) {
      return (
        <View style={styles.loadingState}>
          <View style={styles.loadingFlower}>
            <ActivityIndicator size="small" color={COLORS.primary} />
          </View>
          <Text style={styles.loadingTitle}>Bloom đang mở album của nhà…</Text>
          <Text style={styles.loadingText}>Chỉ những khoảnh khắc mới nhất được tải trước để mọi thứ luôn nhẹ nhàng.</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.emptyWrap}>
          <BloomEmptyState
            icon="cloud-offline-outline"
            title="Bloom chưa mở được tường nhà"
            description="Có vẻ kết nối vừa chập chờn. Những kỷ niệm vẫn an toàn nhé."
          />
          <BloomButton title="Thử mở lại" icon="refresh-outline" onPress={retry} customStyle={styles.emptyButton} />
        </View>
      );
    }

    return (
      <View style={styles.emptyWrap}>
        <BloomEmptyState
          icon="camera-outline"
          title="Khoảnh khắc đầu tiên của nhà mình?"
          description="Đăng một tấm ảnh, video hoặc lời nhắn để mọi người cùng lưu giữ."
        />
        <BloomButton
          title="Chia sẻ khoảnh khắc"
          icon="add-circle-outline"
          onPress={openComposer}
          customStyle={styles.emptyButton}
        />
      </View>
    );
  };

  const listFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.footerLoadingText}>Đang mở thêm ký ức…</Text>
        </View>
      );
    }
    if (!hasMore && moments.length > 18) {
      return (
        <View style={styles.historyEnd}>
          <Ionicons name="flower-outline" size={17} color={COLORS.primary} />
          <Text style={styles.historyEndText}>Bạn đã đi tới cuối những khoảnh khắc đang có 🌷</Text>
        </View>
      );
    }
    return <View style={styles.footerSpacer} />;
  };

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <KeyboardAvoidingView style={styles.listRoot} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <FlatList
          ref={listRef}
          data={feedItems}
          keyExtractor={(item) => item.key}
          renderItem={renderFeedItem}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
          ItemSeparatorComponent={() => <View style={styles.feedGap} />}
          contentContainerStyle={[styles.listContent, keyboardReserve > 0 && { paddingBottom: 34 + keyboardReserve }]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!commentScrollLocked}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onEndReached={() => {
            if (hasMore && !loadingMore) void loadMore();
          }}
          onEndReachedThreshold={0.45}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          initialNumToRender={3}
          maxToRenderPerBatch={3}
          updateCellsBatchingPeriod={80}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          onScrollEndDrag={(event) => { listOffsetRef.current = event.nativeEvent.contentOffset.y; }}
          onMomentumScrollEnd={(event) => { listOffsetRef.current = event.nativeEvent.contentOffset.y; }}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, info.averageItemLength * info.index),
              animated: true,
            });
          }}
        />
      </KeyboardAvoidingView>

      {highlightOpening && (
        <View pointerEvents="none" style={styles.deepLinkOpening}>
          <View style={styles.deepLinkOpeningCard}>
            <View style={styles.deepLinkOpeningIcon}>
              <Ionicons name="flower-outline" size={26} color={COLORS.primary} />
            </View>
            <Text style={styles.deepLinkOpeningTitle}>Đang mở kỷ niệm…</Text>
            <View style={styles.deepLinkOpeningProgress}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.deepLinkOpeningText}>Đang đưa bạn tới đúng khoảnh khắc.</Text>
            </View>
          </View>
        </View>
      )}

      {editPost && <BloomFullScreenFlow
        visible
        eyebrow="SỬA KỶ NIỆM"
        title="Giữ câu chuyện đúng như bạn muốn"
        subtitle="Chỉnh lời nhắn, người liên quan và ảnh/video theo cách bạn muốn lưu giữ lâu dài."
        variant="moment"
        onBack={requestCloseEditPost}
        backDisabled={editBusy}
      >
        <BloomKeyboardScreen rootStyle={styles.sheetKeyboard} contentContainerStyle={styles.editMomentContent}>

              <BloomTextInput
                multiline
                value={editCaption}
                onChangeText={(value) => { setEditCaption(value); setEditDirty(true); }}
                placeholder="Viết lại lời bạn muốn lưu giữ…"
                leftIcon="heart-outline"
                containerStyle={styles.captionField}
              />

              <View style={styles.timelineTargetBlock}>
                <Text style={styles.timelineTargetLabel}>KỶ NIỆM NÀY THUỘC VỀ</Text>
                <Text style={styles.timelineTargetHint}>Chọn nơi kỷ niệm xuất hiện trong dòng thời gian.</Text>
                <View style={styles.timelineTargetRow}>
                  {[
                    { key: "self" as const, label: "Tôi", icon: "person-outline" as const },
                    { key: "family" as const, label: "Toàn gia đình", icon: "people-outline" as const },
                    { key: "persons" as const, label: "Thành viên", icon: "flower-outline" as const },
                  ].map((item) => {
                    const active = editTimelineAudience === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        disabled={editBusy}
                        onPress={() => { setEditTimelineAudience(item.key); if (item.key !== "persons") setEditPersonIds([]); if (item.key !== "family") setEditNotifyFamily(false); setEditDirty(true); }}
                        style={({ pressed }) => [styles.timelineTargetChoice, active && styles.timelineTargetChoiceActive, pressed && styles.composePressed]}
                      >
                        <Ionicons name={item.icon} size={17} color={active ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.timelineTargetChoiceText, active && styles.timelineTargetChoiceTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {editTimelineAudience === "family" && (
                <Pressable
                  disabled={editBusy}
                  onPress={() => { setEditNotifyFamily((value) => !value); setEditDirty(true); }}
                  style={({ pressed }) => [styles.notifyFamilyRow, editNotifyFamily && styles.notifyFamilyRowActive, pressed && styles.composePressed]}
                >
                  <View style={[styles.notifyFamilyIcon, editNotifyFamily && styles.notifyFamilyIconActive]}>
                    <Ionicons name={editNotifyFamily ? "notifications" : "notifications-outline"} size={19} color={editNotifyFamily ? COLORS.white : COLORS.primary} />
                  </View>
                  <View style={styles.notifyFamilyCopy}>
                    <Text style={styles.notifyFamilyTitle}>Thông báo cho cả nhà</Text>
                    <Text style={styles.notifyFamilyHint}>Tắt mặc định. Chỉ bật khi đây là kỷ niệm bạn muốn mọi người cùng chú ý.</Text>
                  </View>
                  <Ionicons name={editNotifyFamily ? "checkmark-circle" : "ellipse-outline"} size={22} color={editNotifyFamily ? COLORS.primary : COLORS.secondaryText} />
                </Pressable>
              )}

              {editTimelineAudience === "persons" && (
                <View style={styles.personPickerSection}>
                  <FamilyPersonMultiPicker
                    label="Chọn thành viên"
                    hint="Kỷ niệm sẽ vào dòng thời gian của người bạn chọn; người đã liên kết tài khoản sẽ thấy thông báo trong Chuyện trong nhà."
                    persons={persons}
                    selectedIds={editPersonIds}
                    onChange={(ids) => { setEditPersonIds(ids); setEditDirty(true); }}
                    disabled={editBusy}
                  />
                </View>
              )}

              <Pressable style={styles.mediaPicker} disabled={editBusy} onPress={() => void pickEditMedia()}>
                <View style={styles.mediaPickerIcon}><Ionicons name="images-outline" size={22} color={COLORS.primary} /></View>
                <View style={styles.mediaPickerCopy}>
                  <Text style={styles.pickerTitle}>Ảnh / Video</Text>
                  <Text style={styles.pickerSub}>{editExistingMedia.length + editNewFiles.length}/10 tệp · có thể thêm hoặc bỏ</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} />
              </Pressable>

              {(editExistingMedia.length > 0 || editNewFiles.length > 0) && (
                <View style={styles.previewGrid}>
                  {[
                    ...editExistingMedia.map((media) => ({ id: `existing-${media.id}`, kind: "existing" as const, media })),
                    ...editNewFiles.map((file) => ({ id: `new-${file.id}`, kind: "new" as const, file })),
                  ].slice(0, previewLimit).map((entry, index) => {
                    const uri = entry.kind === "existing"
                      ? (entry.media.thumbnailUrl || entry.media.secureUrl)
                      : entry.file.uri;
                    const type = entry.kind === "existing" ? entry.media.type : entry.file.type;
                    return (
                      <Pressable
                        key={entry.id}
                        onPress={() => openEditMediaAt(index)}
                        style={[styles.thumbWrap, { width: previewTileSize, height: previewTileSize }]}
                      >
                        {type === "video" && !uri ? (
                          <View style={styles.videoPreviewPlaceholder}><Ionicons name="videocam" size={24} color={COLORS.primary} /><Text style={styles.videoPreviewText}>VIDEO</Text></View>
                        ) : (
                          <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={0} cachePolicy="memory-disk" />
                        )}
                        <Pressable
                          disabled={editBusy}
                          onPress={() => {
                            setEditDirty(true);
                            if (entry.kind === "existing") setEditExistingMedia((current) => current.filter((media) => media.id !== entry.media.id));
                            else {
                              setEditNewFiles((current) => current.filter((file) => file.id !== entry.file.id));
                              const uploaded = editUploadedFiles.find((item) => item.fileId === entry.file.id);
                              if (uploaded) {
                                void mediaService.markCleanupPending(uploaded.assetId).catch(() => undefined);
                                setEditUploadedFiles((current) => current.filter((item) => item.fileId !== entry.file.id));
                              }
                            }
                          }}
                          style={styles.removeThumb}
                          hitSlop={6}
                        >
                          <Ionicons name="close" size={13} color={COLORS.white} />
                        </Pressable>
                        {type === "video" && <View style={styles.videoBadge}><Ionicons name="play" size={12} color={COLORS.white} /></View>}
                      </Pressable>
                    );
                  })}
                </View>
              )}

          <BloomButton
            title="Lưu thay đổi"
            icon="checkmark-outline"
            isLoading={editBusy}
            disabled={editBusy}
            onPress={() => void saveEditedPost()}
          />
        </BloomKeyboardScreen>
      </BloomFullScreenFlow>}

      {moderationVisible && <BloomFullScreenFlow
        visible
        eyebrow="KIỂM DUYỆT KỶ NIỆM"
        title="Những bài đang tạm ẩn"
        subtitle="Bloom giữ quyền sửa và xóa cho người tạo; người giữ nhà chỉ giúp chăm sóc phần đang hiện trong Kỷ niệm."
        variant="moderation"
        compactHeader
        onBack={() => setModerationVisible(false)}
      >
        <View style={styles.moderationFullBody}>
          <Text style={styles.moderationPolicy}>Người giữ nhà chỉ giúp quyết định kỷ niệm có xuất hiện trên tường chung hay không. Người tạo vẫn giữ quyền sửa hoặc xóa câu chuyện của mình.</Text>
          <FlatList
            data={hiddenPosts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={hiddenPosts.length ? styles.hiddenList : styles.hiddenListEmpty}
            ListEmptyComponent={
              <BloomEmptyState
                icon="shield-checkmark-outline"
                title="Không có bài nào đang ẩn"
                description="Trang Kỷ niệm hiện đang hiển thị tất cả bài hợp lệ của gia đình."
              />
            }
            renderItem={({ item }) => (
              <View style={styles.hiddenPostCard}>
                <View style={styles.hiddenPostIcon}>
                  <Ionicons name="eye-off-outline" size={18} color={COLORS.secondaryText} />
                </View>
                <View style={styles.hiddenPostCopy}>
                  <Text style={styles.hiddenPostAuthor}>{item.authorName}</Text>
                  <Text style={styles.hiddenPostCaption} numberOfLines={3}>{item.caption || "Khoảnh khắc không có lời nhắn"}</Text>
                </View>
                <Pressable
                  disabled={moderationBusyId === item.id}
                  onPress={() => void restoreHiddenPost(item.id)}
                  style={({ pressed }) => [styles.restoreButton, pressed && styles.composePressed]}
                >
                  {moderationBusyId === item.id
                    ? <ActivityIndicator size="small" color={COLORS.white} />
                    : <Ionicons name="eye-outline" size={17} color={COLORS.white} />}
                  <Text style={styles.restoreText}>Cho hiện</Text>
                </Pressable>
              </View>
            )}
          />
        </View>
      </BloomFullScreenFlow>}

      {modal && <BloomFullScreenFlow
        visible
        eyebrow="KHOẢNH KHẮC MỚI"
        title="Chia sẻ một điều đáng nhớ"
        subtitle="Một lời nhắn nhỏ, một tấm ảnh hay một video đều có thể thành ký ức đẹp của cả nhà."
        variant="moment"
        onBack={requestCloseComposer}
      >
        <BloomKeyboardScreen rootStyle={styles.sheetKeyboard} contentContainerStyle={styles.sheetContent}>

              <BloomTextInput
                multiline
                value={caption}
                onChangeText={(value) => { setCaption(value); setComposerDirty(true); }}
                placeholder="Hôm nay nhà mình có chuyện gì vui?"
                leftIcon="heart-outline"
                containerStyle={styles.captionField}
              />

              <View style={styles.timelineTargetBlock}>
                <Text style={styles.timelineTargetLabel}>KỶ NIỆM NÀY THUỘC VỀ</Text>
                <Text style={styles.timelineTargetHint}>Chỉ quyết định nơi xuất hiện trên Dòng thời gian, không thay đổi quyền xem bài.</Text>
                <View style={styles.timelineTargetRow}>
                  {[
                    { key: "self" as const, label: "Tôi", icon: "person-outline" as const },
                    { key: "family" as const, label: "Toàn gia đình", icon: "people-outline" as const },
                    { key: "persons" as const, label: "Thành viên", icon: "flower-outline" as const },
                  ].map((item) => {
                    const active = timelineAudience === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => { setTimelineAudience(item.key); if (item.key !== "persons") setPersonIds([]); if (item.key !== "family") setNotifyFamily(false); setComposerDirty(true); }}
                        style={({ pressed }) => [styles.timelineTargetChoice, active && styles.timelineTargetChoiceActive, pressed && styles.composePressed]}
                      >
                        <Ionicons name={item.icon} size={17} color={active ? COLORS.white : COLORS.primary} />
                        <Text style={[styles.timelineTargetChoiceText, active && styles.timelineTargetChoiceTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {timelineAudience === "family" && (
                <Pressable
                  onPress={() => { setNotifyFamily((value) => !value); setComposerDirty(true); }}
                  style={({ pressed }) => [styles.notifyFamilyRow, notifyFamily && styles.notifyFamilyRowActive, pressed && styles.composePressed]}
                >
                  <View style={[styles.notifyFamilyIcon, notifyFamily && styles.notifyFamilyIconActive]}>
                    <Ionicons name={notifyFamily ? "notifications" : "notifications-outline"} size={19} color={notifyFamily ? COLORS.white : COLORS.primary} />
                  </View>
                  <View style={styles.notifyFamilyCopy}>
                    <Text style={styles.notifyFamilyTitle}>Thông báo cho cả nhà</Text>
                    <Text style={styles.notifyFamilyHint}>Mặc định tắt để Chuyện trong nhà luôn nhẹ nhàng, không làm phiền mọi người.</Text>
                  </View>
                  <Ionicons name={notifyFamily ? "checkmark-circle" : "ellipse-outline"} size={22} color={notifyFamily ? COLORS.primary : COLORS.secondaryText} />
                </Pressable>
              )}

              {timelineAudience === "persons" && (
                <View style={styles.personPickerSection}>
                  <FamilyPersonMultiPicker
                    label="Chọn thành viên"
                    hint="Kỷ niệm sẽ vào dòng thời gian của người bạn chọn; người đã liên kết tài khoản sẽ thấy thông báo trong Chuyện trong nhà."
                    persons={persons}
                    selectedIds={personIds}
                    onChange={(ids) => { setPersonIds(ids); setComposerDirty(true); }}
                  />
                </View>
              )}

              <Pressable style={styles.mediaPicker} onPress={pickMedia}>
                <View style={styles.mediaPickerIcon}>
                  <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                </View>
                <View style={styles.mediaPickerCopy}>
                  <Text style={styles.pickerTitle}>Ảnh / Video</Text>
                  <Text style={styles.pickerSub}>Chọn tối đa 10 tệp từ thư viện</Text>
                </View>
                <Ionicons name="chevron-forward" size={19} color={COLORS.secondaryText} />
              </Pressable>

              {selected.length > 0 && (
                <View style={styles.previewGrid}>
                  {previewItems.map((file, index) => {
                    const isLastVisible = index === previewItems.length - 1;
                    return (
                      <Pressable
                        key={file.id}
                        onPress={() => openSelectedAt(index)}
                        style={[styles.thumbWrap, { width: previewTileSize, height: previewTileSize }]}
                      >
                        {file.type === "video" ? (
                          <View style={styles.videoPreviewPlaceholder}>
                            <Ionicons name="videocam" size={24} color={COLORS.primary} />
                            <Text style={styles.videoPreviewText}>VIDEO</Text>
                          </View>
                        ) : (
                          <Image
                            source={{ uri: file.uri }}
                            style={styles.thumb}
                            contentFit="cover"
                            transition={0}
                            cachePolicy="memory"
                            recyclingKey={`composer-${file.id}`}
                          />
                        )}
                        <Pressable onPress={() => removeSelected(file.id)} style={styles.removeThumb} hitSlop={6}>
                          <Ionicons name="close" size={13} color={COLORS.white} />
                        </Pressable>
                        {file.type === "video" && (
                          <View style={styles.videoBadge}>
                            <Ionicons name="play" size={12} color={COLORS.white} />
                          </View>
                        )}
                        {isLastVisible && previewRemaining > 0 && (
                          <View pointerEvents="none" style={styles.previewMoreOverlay}>
                            <Text style={styles.previewMoreText}>+{previewRemaining}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

          <BloomButton
            title="Đăng & tiếp tục"
            disabled={!caption.trim() && !selected.length}
            onPress={create}
          />
        </BloomKeyboardScreen>
      </BloomFullScreenFlow>}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listRoot: { flex: 1 },
  listContent: { paddingBottom: 34 },
  headerBlock: { marginBottom: 4 },
  headerInset: { paddingHorizontal: 16, paddingTop: 16 },
  feedItemInset: { paddingHorizontal: 16 },
  heroCompose: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7E5260",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 2,
  },
  compose: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  composePressed: { opacity: 0.76, transform: [{ scale: 0.97 }] },
  familyStrip: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 18, padding: 14 },
  familyStripIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  familyStripCopy: { flex: 1, minWidth: 0 },
  familyStripLabel: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.75 },
  familyStripName: { marginTop: 3, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900" },
  emptyWrap: { marginTop: 6, gap: 14, paddingHorizontal: 16 },
  emptyButton: { marginTop: 2 },
  feedGap: { height: SPACING.lg },
  loadingState: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 44 },
  loadingFlower: { width: 52, height: 52, borderRadius: 19, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  loadingTitle: { marginTop: 13, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900", textAlign: "center" },
  loadingText: { marginTop: 6, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center" },
  footerLoading: { paddingVertical: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  footerLoadingText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  historyEnd: { paddingVertical: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  historyEndText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  footerSpacer: { height: 12 },
  moderationButton: { marginTop: 0, marginBottom: 16, minHeight: 62, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  moderationIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  moderationCopy: { flex: 1, minWidth: 0 },
  moderationTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  moderationHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13, fontWeight: "600" },
  moderationSheet: { height: "72%", backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },
  moderationFullBody: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  moderationPolicy: { color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "600", marginBottom: 12 },
  hiddenList: { paddingBottom: 18, gap: 10 },
  hiddenListEmpty: { flexGrow: 1, justifyContent: "center", paddingBottom: 30 },
  hiddenPostCard: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, borderRadius: 18, padding: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  hiddenPostIcon: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  hiddenPostCopy: { flex: 1, minWidth: 0 },
  hiddenPostAuthor: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  hiddenPostCaption: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 14 },
  restoreButton: { minHeight: 38, borderRadius: 13, backgroundColor: COLORS.primary, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  restoreText: { color: COLORS.white, fontSize: 10.5, fontWeight: "900" },

  overlay: { flex: 1, backgroundColor: "rgba(74,45,56,0.32)", justifyContent: "flex-end" },
  editMomentSheet: {
    height: "90%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  editMomentContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 34 },
  sheet: {
    height: "74%",
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: "hidden",
  },
  sheetKeyboard: { flex: 1 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  sheetHandle: { alignSelf: "center", width: 44, height: 5, borderRadius: 999, backgroundColor: COLORS.border, marginBottom: 16 },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  sheetEyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  sheetTitle: { marginTop: 4, fontSize: 20, fontWeight: "900", color: COLORS.primaryText },
  closeButton: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  captionField: { marginBottom: SPACING.md },
  timelineTargetBlock: { marginBottom: SPACING.md },
  timelineTargetLabel: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.75 },
  timelineTargetHint: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  notifyFamilyRow: { marginBottom: SPACING.md, minHeight: 72, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", alignItems: "center", gap: 10 },
  notifyFamilyRowActive: { borderColor: COLORS.focusBorder, backgroundColor: COLORS.surfaceFocus },
  notifyFamilyIcon: { width: 40, height: 40, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  notifyFamilyIconActive: { backgroundColor: COLORS.primary },
  notifyFamilyCopy: { flex: 1, minWidth: 0 },
  notifyFamilyTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  notifyFamilyHint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14, fontWeight: "600" },
  timelineTargetRow: { flexDirection: "row", gap: 12, marginTop: 10 },
  timelineTargetChoice: { flex: 1, minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 5 },
  timelineTargetChoiceActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timelineTargetChoiceText: { color: COLORS.primaryText, fontSize: 10, fontWeight: "900", textAlign: "center" },
  timelineTargetChoiceTextActive: { color: COLORS.white },
  personPickerSection: { marginBottom: SPACING.md },
  deepLinkOpening: { ...StyleSheet.absoluteFillObject, zIndex: 40, backgroundColor: "rgba(255,247,250,0.96)", alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  deepLinkOpeningCard: { width: "100%", maxWidth: 360, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 26, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.focusBorder, alignItems: "center", shadowColor: "#6B3A4C", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 4 },
  deepLinkOpeningIcon: { width: 60, height: 60, borderRadius: 22, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", marginBottom: 13 },
  deepLinkOpeningTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900", textAlign: "center" },
  deepLinkOpeningProgress: { marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  deepLinkOpeningText: { color: COLORS.secondaryText, fontSize: 11, lineHeight: 16, fontWeight: "700" },
  mediaPicker: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    backgroundColor: COLORS.softSurface,
    marginBottom: SPACING.md,
  },
  mediaPickerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  mediaPickerCopy: { flex: 1 },
  pickerTitle: { fontWeight: "900", color: COLORS.primaryText, fontSize: 13.5 },
  pickerSub: { fontSize: 11.5, color: COLORS.secondaryText, marginTop: 2 },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginBottom: SPACING.lg },
  thumbWrap: { position: "relative", borderRadius: 14, overflow: "hidden", backgroundColor: COLORS.softSurface },
  thumb: { width: "100%", height: "100%" },
  videoPreviewPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFF4F8" },
  videoPreviewText: { color: COLORS.primaryText, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  removeThumb: { position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  videoBadge: { position: "absolute", left: 6, bottom: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center" },
  previewMoreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(67,39,49,0.52)", alignItems: "center", justifyContent: "center" },
  previewMoreText: { color: COLORS.white, fontSize: 24, fontWeight: "900" },
});
