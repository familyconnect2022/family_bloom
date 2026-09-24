import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  BloomCard,
  BloomEmptyState,
  BloomPageHeader,
  BloomPill,
} from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useMomentPublish, type PendingMoment } from "../../context/MomentPublishContext";
import { useFamilyMoments } from "../../hooks/useFamilyMoments";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";
import { useFamilyPersonDirectory } from "../../hooks/useFamilyPersonDirectory";
import { momentsService } from "../../services/moments/momentsService";
import type { MediaFile } from "../../types";
import type { MomentPost } from "../../types/moments";

type FeedItem =
  | { kind: "pending"; key: string; item: PendingMoment }
  | { kind: "post"; key: string; item: MomentPost };

export default function MomentsScreen() {
  const router = useRouter();
  const { user, userProfile, activeFamilyId, families } = useAuth();
  const params = useLocalSearchParams<{ personId?: string | string[]; highlightMomentId?: string | string[] }>();
  const requestedPersonId = Array.isArray(params.personId) ? params.personId[0] : params.personId;
  const highlightMomentId = Array.isArray(params.highlightMomentId) ? params.highlightMomentId[0] : params.highlightMomentId;
  const { width: screenWidth } = useWindowDimensions();
  const listRef = useRef<FlatList<FeedItem>>(null);
  const feedItemsRef = useRef<FeedItem[]>([]);
  const listOffsetRef = useRef(0);
  const focusedCommentInputRef = useRef<TextInput | null>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardReserve, setKeyboardReserve] = useState(0);
  const [commentScrollLocked, setCommentScrollLocked] = useState(false);
  const [modal, setModal] = useState(false);
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<MediaFile[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [moderationVisible, setModerationVisible] = useState(false);
  const [hiddenPosts, setHiddenPosts] = useState<MomentPost[]>([]);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const [screenFocused, setScreenFocused] = useState(true);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(() => new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 24, minimumViewTime: 120 }).current;
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = new Set<string>();
    viewableItems.forEach((token) => {
      const feedItem = token.item as FeedItem | undefined;
      if (feedItem?.kind === "post") next.add(feedItem.item.id);
    });
    setVisiblePostIds((current) => {
      if (current.size === next.size && [...current].every((id) => next.has(id))) return current;
      return next;
    });
  }).current;

  useFocusEffect(useCallback(() => {
    setScreenFocused(true);
    return () => {
      setScreenFocused(false);
      setCommentScrollLocked(false);
    };
  }, []));

  const membership = families.find((item) => item.familyId === activeFamilyId);
  const canModerate = membership?.role === "admin" || membership?.role === "owner";
  const { openMediaViewer } = useMediaViewer();
  const { memberByUid } = useFamilyMembers(activeFamilyId);
  const { persons, personById } = useFamilyPersonDirectory(activeFamilyId, !!activeFamilyId);
  const consumedPersonParamRef = useRef<string | null>(null);
  const highlightAttemptRef = useRef<{ id: string | null; pages: number }>({ id: null, pages: 0 });
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


  useEffect(() => {
    if (!requestedPersonId || !personById.has(requestedPersonId) || consumedPersonParamRef.current === requestedPersonId) return;
    consumedPersonParamRef.current = requestedPersonId;
    setPersonIds([requestedPersonId]);
    setModal(true);
    router.setParams({ personId: undefined } as never);
  }, [personById, requestedPersonId, router]);

  useEffect(() => {
    setHiddenPosts([]);
    setModerationVisible(false);
    if (!activeFamilyId || !canModerate) return;
    return momentsService.subscribeHiddenForModeration(
      activeFamilyId,
      setHiddenPosts,
      () => setHiddenPosts([]),
    );
  }, [activeFamilyId, canModerate]);

  const restoreHiddenPost = useCallback(async (postId: string) => {
    if (!activeFamilyId || !canModerate || moderationBusyId) return;
    setModerationBusyId(postId);
    try {
      await momentsService.setModerationStatus(activeFamilyId, postId, "visible");
    } catch {
      Alert.alert("Chưa khôi phục được", "Bloom chưa đưa bài trở lại trang Kỷ niệm. Bạn thử lại nhé.");
    } finally {
      setModerationBusyId(null);
    }
  }, [activeFamilyId, canModerate, moderationBusyId]);

  const familyPending = useMemo(
    () => pendingMoments.filter((item) => item.familyId === activeFamilyId),
    [activeFamilyId, pendingMoments],
  );

  const feedItems = useMemo<FeedItem[]>(() => [
    ...familyPending.map((item) => ({ kind: "pending" as const, key: `pending-${item.localId}`, item })),
    ...moments.map((item) => ({ kind: "post" as const, key: `post-${item.id}`, item })),
  ], [familyPending, moments]);

  feedItemsRef.current = feedItems;

  useEffect(() => {
    if (!highlightMomentId) return;
    if (highlightAttemptRef.current.id !== highlightMomentId) {
      highlightAttemptRef.current = { id: highlightMomentId, pages: 0 };
    }
    const index = feedItems.findIndex((item) => item.kind === "post" && item.item.id === highlightMomentId);
    if (index >= 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.12 });
      });
      router.setParams({ highlightMomentId: undefined } as never);
      highlightAttemptRef.current = { id: null, pages: 0 };
      return;
    }
    if (hasMore && !loadingMore && highlightAttemptRef.current.pages < 2) {
      highlightAttemptRef.current.pages += 1;
      void loadMore();
      return;
    }
    if (!loadingMore && (!hasMore || highlightAttemptRef.current.pages >= 2)) {
      router.setParams({ highlightMomentId: undefined } as never);
      highlightAttemptRef.current = { id: null, pages: 0 };
    }
  }, [feedItems, hasMore, highlightMomentId, loadMore, loadingMore, router]);

  useEffect(() => {
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

  useEffect(() => {
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
    return () => { showSub.remove(); hideSub.remove(); };
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
      Alert.alert("Cần cấp quyền 🌸", "Cho phép Family Bloom truy cập ảnh/video để chia sẻ khoảnh khắc nhé.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 10,
    });

    if (!result.canceled) {
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

  const removeSelected = (id: string) => setSelected((current) => current.filter((item) => item.id !== id));
  const openComposer = () => {
    setPersonIds([]);
    setModal(true);
  };
  const closeComposer = () => setModal(false);

  const create = () => {
    if (!activeFamilyId || !user || !userProfile || (!caption.trim() && !selected.length)) return;
    publishMoment({
      familyId: activeFamilyId,
      author: {
        uid: user.uid,
        displayName: userProfile.displayName,
        avatarUrl: userProfile.avatarUrl || undefined,
      },
      caption,
      personIds,
      files: selected,
    });
    setCaption("");
    setSelected([]);
    setPersonIds([]);
    setModal(false);
  };

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

  const renderFeedItem = useCallback(({ item }: { item: FeedItem }) => {
    if (item.kind === "pending") {
      return (
        <PendingMomentCard
          item={item.item}
          onRetry={() => retryMoment(item.item.localId)}
          onRemove={() => removePendingMoment(item.item.localId)}
        />
      );
    }

    const post = item.item;
    return (
      <MomentCard
        post={post}
        familyId={activeFamilyId!}
        currentUid={user?.uid || ""}
        currentName={userProfile?.displayName || "Thành viên"}
        currentAvatarUrl={userProfile?.avatarUrl || undefined}
        onCommentFocus={revealCommentInput}
        onCommentScrollLockChange={setCommentScrollLocked}
        memberByUid={memberByUid}
        realtimeEnabled={screenFocused && visiblePostIds.has(post.id)}
        canModerate={canModerate}
        linkedPersons={(post.personIds || []).map((id) => personById.get(id)).filter((person) => !!person).map((person) => ({ id: person!.id, name: person!.nickname || person!.displayName }))}
      />
    );
  }, [activeFamilyId, canModerate, memberByUid, removePendingMoment, retryMoment, revealCommentInput, user?.uid, userProfile?.avatarUrl, userProfile?.displayName, visiblePostIds, screenFocused, personById]);

  const listHeader = useMemo(() => (
    <View style={styles.headerBlock}>
      <BloomPageHeader
        eyebrow="Gia đình"
        title="Khoảnh khắc 🌸"
        subtitle="Những điều nhỏ bé làm nên câu chuyện của nhà mình."
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Chia sẻ khoảnh khắc"
            onPress={openComposer}
            style={({ pressed }) => [styles.compose, pressed && styles.composePressed]}
          >
            <Ionicons name="add" size={25} color={COLORS.white} />
          </Pressable>
        }
      />

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
            <Text style={styles.moderationHint}>Admin chỉ ẩn/cho hiện bài · không sửa hoặc xóa nội dung của người khác</Text>
          </View>
          <BloomPill icon="eye-off-outline" label={`${hiddenPosts.length} đang ẩn`} />
        </Pressable>
      )}
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
    <ScreenContainer>
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
          scrollEventThrottle={16}
          onScroll={(event) => { listOffsetRef.current = event.nativeEvent.contentOffset.y; }}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, info.averageItemLength * info.index),
              animated: true,
            });
          }}
        />
      </KeyboardAvoidingView>

      <Modal visible={moderationVisible} animationType="fade" transparent onRequestClose={() => setModerationVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.moderationSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetEyebrow}>KIỂM DUYỆT KỶ NIỆM</Text>
                <Text style={styles.sheetTitle}>Bài đang không hiển thị</Text>
              </View>
              <Pressable onPress={() => setModerationVisible(false)} hitSlop={8} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={COLORS.primaryText} />
              </Pressable>
            </View>
            <Text style={styles.moderationPolicy}>Admin chỉ quyết định bài có xuất hiện trên trang Kỷ niệm hay không. Quyền sửa/xóa vẫn thuộc người tạo bài.</Text>
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
        </View>
      </Modal>

      <Modal visible={modal} animationType="fade" transparent onRequestClose={closeComposer}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <BloomKeyboardScreen rootStyle={styles.sheetKeyboard} contentContainerStyle={styles.sheetContent}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>KHOẢNH KHẮC MỚI</Text>
                  <Text style={styles.sheetTitle}>Chia sẻ với cả nhà</Text>
                </View>
                <Pressable onPress={closeComposer} hitSlop={8} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={COLORS.primaryText} />
                </Pressable>
              </View>

              <BloomTextInput
                multiline
                value={caption}
                onChangeText={setCaption}
                placeholder="Hôm nay nhà mình có chuyện gì vui?"
                leftIcon="heart-outline"
                containerStyle={styles.captionField}
              />

              <FamilyPersonMultiPicker
                label="Gắn Person vào kỷ niệm"
                hint="Kỷ niệm sẽ xuất hiện trong hồ sơ của những Person được chọn."
                persons={persons}
                selectedIds={personIds}
                onChange={setPersonIds}
              />

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
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listRoot: { flex: 1 },
  listContent: { paddingBottom: 34 },
  headerBlock: { marginBottom: 4 },
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
  emptyWrap: { marginTop: 6, gap: 14 },
  emptyButton: { marginTop: 2 },
  feedGap: { height: 16 },
  loadingState: { alignItems: "center", paddingHorizontal: 30, paddingVertical: 44 },
  loadingFlower: { width: 52, height: 52, borderRadius: 19, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  loadingTitle: { marginTop: 13, color: COLORS.primaryText, fontSize: 14.5, fontWeight: "900", textAlign: "center" },
  loadingText: { marginTop: 6, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center" },
  footerLoading: { paddingVertical: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  footerLoadingText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  historyEnd: { paddingVertical: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  historyEndText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  footerSpacer: { height: 12 },
  moderationButton: { marginTop: -7, marginBottom: 16, minHeight: 62, borderRadius: 20, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  moderationIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  moderationCopy: { flex: 1, minWidth: 0 },
  moderationTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  moderationHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13, fontWeight: "600" },
  moderationSheet: { height: "72%", backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 24 },
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
  captionField: { marginBottom: 12 },
  mediaPicker: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 11,
    alignItems: "center",
    backgroundColor: COLORS.softSurface,
    marginBottom: 12,
  },
  mediaPickerIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  mediaPickerCopy: { flex: 1 },
  pickerTitle: { fontWeight: "900", color: COLORS.primaryText, fontSize: 13.5 },
  pickerSub: { fontSize: 11.5, color: COLORS.secondaryText, marginTop: 2 },
  previewGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 15 },
  thumbWrap: { position: "relative", borderRadius: 14, overflow: "hidden", backgroundColor: COLORS.softSurface },
  thumb: { width: "100%", height: "100%" },
  videoPreviewPlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: "#FFF4F8" },
  videoPreviewText: { color: COLORS.primaryText, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  removeThumb: { position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  videoBadge: { position: "absolute", left: 6, bottom: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.48)", alignItems: "center", justifyContent: "center" },
  previewMoreOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(67,39,49,0.52)", alignItems: "center", justifyContent: "center" },
  previewMoreText: { color: COLORS.white, fontSize: 24, fontWeight: "900" },
});
