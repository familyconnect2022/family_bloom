import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { cloudinaryImageThumbnail, cloudinaryVideoThumbnail, useMediaViewer } from "../media/MediaViewerProvider";
import { COLORS, UI } from "../../constants/theme";
import { momentsService } from "../../services/moments/momentsService";
import type {
  FamilyMember,
  MomentComment,
  MomentMedia,
  MomentPost,
  MomentReaction,
  MomentReactionPageCursor,
  MomentReactionRecord,
} from "../../types";

const reactionItems: Array<[MomentReaction, string, string]> = [
  ["like", "👍", "Thích"],
  ["love", "❤️", "Yêu"],
  ["haha", "😂", "Haha"],
  ["wow", "😮", "Wow"],
  ["sad", "😢", "Buồn"],
  ["celebrate", "🎉", "Chúc mừng"],
];

const reactionEmoji = Object.fromEntries(reactionItems.map(([key, emoji]) => [key, emoji])) as Record<MomentReaction, string>;

type LocalComment = MomentComment & { delivery: "sending" | "sent" | "failed" };

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Vừa xong";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function MediaTile({ media, style, remaining, onPress }: { media: MomentMedia; style?: object; remaining?: number; onPress: () => void }) {
  const source = media.type === "video"
    ? cloudinaryVideoThumbnail(media.thumbnailUrl || media.secureUrl)
    : cloudinaryImageThumbnail(media.thumbnailUrl || media.secureUrl);
  return (
    <Pressable onPress={onPress} style={[styles.mediaTile, style]}>
      {source ? (
        <Image
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={media.id}
          transition={80}
        />
      ) : (
        <View style={styles.videoFallback}><Ionicons name="videocam-outline" size={25} color={COLORS.primary} /></View>
      )}
      {media.type === "video" && (
        <View style={styles.videoOverlay}>
          <Ionicons name="play" size={17} color={COLORS.white} />
        </View>
      )}
      {!!remaining && remaining > 0 && (
        <View style={styles.remainingOverlay}>
          <Text style={styles.remainingText}>+{remaining}</Text>
        </View>
      )}
    </Pressable>
  );
}

const MomentMediaGrid = React.memo(function MomentMediaGrid({ media, onOpen }: { media: MomentMedia[]; onOpen: (index: number) => void }) {
  if (!media.length) return null;
  const visible = media.slice(0, 4);

  if (visible.length === 1) {
    return (
      <View style={styles.mediaSingle}>
        <MediaTile media={visible[0]} style={styles.mediaSingleTile} onPress={() => onOpen(0)} />
      </View>
    );
  }

  return (
    <View style={styles.mediaGrid}>
      {visible.map((item, index) => (
        <MediaTile
          key={item.id}
          media={item}
          style={visible.length === 3 && index === 0 ? styles.mediaWide : styles.mediaHalf}
          remaining={index === visible.length - 1 ? Math.max(0, media.length - visible.length) : 0}
          onPress={() => onOpen(index)}
        />
      ))}
    </View>
  );
});

const EMPTY_MEDIA: MomentMedia[] = [];

function MomentCardComponent({
  post,
  familyId,
  currentUid,
  currentName,
  currentAvatarUrl,
  onCommentFocus,
  onCommentScrollLockChange,
  memberByUid,
  realtimeEnabled = true,
  canModerate = false,
  linkedPersons = [],
}: {
  post: MomentPost;
  familyId: string;
  currentUid: string;
  currentName: string;
  currentAvatarUrl?: string;
  onCommentFocus?: (input: TextInput | null) => void;
  onCommentScrollLockChange?: (locked: boolean) => void;
  memberByUid?: Map<string, FamilyMember>;
  realtimeEnabled?: boolean;
  canModerate?: boolean;
  linkedPersons?: Array<{ id: string; name: string }>;
}) {
  const [comments, setComments] = useState<MomentComment[]>([]);
  const [olderComments, setOlderComments] = useState<MomentComment[]>([]);
  const [pendingComments, setPendingComments] = useState<LocalComment[]>([]);
  const [comment, setComment] = useState("");
  const [myReaction, setMyReaction] = useState<MomentReaction | null>(null);
  const [reactionCounts, setReactionCounts] = useState(post.reactionCounts || {} as Record<MomentReaction, number>);
  const [showComments, setShowComments] = useState((post.commentCount || 0) > 0);
  const [commentViewportHeight, setCommentViewportHeight] = useState(0);
  const [commentContentHeight, setCommentContentHeight] = useState(0);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactionPending, setReactionPending] = useState(false);
  const [reactionDetailVisible, setReactionDetailVisible] = useState(false);
  const [reactionRecords, setReactionRecords] = useState<MomentReactionRecord[]>([]);
  const [reactionCursor, setReactionCursor] = useState<MomentReactionPageCursor | null>(null);
  const [reactionHasMore, setReactionHasMore] = useState(false);
  const [reactionLoading, setReactionLoading] = useState(false);
  const [olderCommentsLoading, setOlderCommentsLoading] = useState(false);
  const [olderCommentsExhausted, setOlderCommentsExhausted] = useState(false);
  const [reactionFilter, setReactionFilter] = useState<MomentReaction | null>(null);
  const [postMenuVisible, setPostMenuVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [postActionBusy, setPostActionBusy] = useState(false);
  const commentInputRef = useRef<TextInput>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reactionVersionRef = useRef(0);
  const desiredReactionRef = useRef<MomentReaction | null>(null);
  const reactionDirtyRef = useRef(false);
  const reactionHydratedRef = useRef(false);
  const router = useRouter();
  const { openMediaViewer } = useMediaViewer();

  const openMediaAt = useCallback((index: number) => {
    const media = post.media || EMPTY_MEDIA;
    openMediaViewer({
      items: media.map((item) => ({
        id: item.id,
        type: item.type,
        uri: item.secureUrl,
        thumbnailUri: item.thumbnailUrl || null,
        caption: post.caption || null,
      })),
      initialIndex: index,
      title: post.authorName,
    });
  }, [openMediaViewer, post.media, post.caption, post.authorName]);

  const isOwner = post.authorUid === currentUid;
  const canManagePost = isOwner || canModerate;

  const saveOwnEdit = async () => {
    if (!isOwner || postActionBusy) return;
    setPostActionBusy(true);
    try {
      await momentsService.updateOwnCaption(familyId, post.id, editCaption);
      setEditVisible(false);
      setPostMenuVisible(false);
    } catch {
      Alert.alert("Chưa sửa được 🌷", "Bloom chưa lưu được thay đổi. Bạn thử lại nhé.");
    } finally {
      setPostActionBusy(false);
    }
  };

  const confirmDeleteOwnPost = () => {
    if (!isOwner || postActionBusy) return;
    setPostMenuVisible(false);
    Alert.alert(
      "Xóa khoảnh khắc?",
      "Khoảnh khắc sẽ rời khỏi trang Kỷ niệm của gia đình.",
      [
        { text: "Giữ lại", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setPostActionBusy(true);
            void momentsService.delete(familyId, post.id)
              .catch(() => Alert.alert("Chưa xóa được", "Bạn thử lại sau nhé."))
              .finally(() => setPostActionBusy(false));
          },
        },
      ],
    );
  };

  const hideFromMemories = async () => {
    if (!canModerate || postActionBusy) return;
    setPostActionBusy(true);
    try {
      await momentsService.setModerationStatus(familyId, post.id, "hidden");
      setPostMenuVisible(false);
    } catch {
      Alert.alert("Chưa ẩn được bài", "Quyền kiểm duyệt hoặc kết nối chưa sẵn sàng.");
    } finally {
      setPostActionBusy(false);
    }
  };

  // Comments are lazy and visibility-aware: only an expanded card that is
  // actually inside the FlatList viewability window owns a listener. Offscreen
  // cards keep their last tiny snapshot but release Firestore immediately.
  useEffect(() => {
    if (!showComments || !realtimeEnabled) return;
    return momentsService.listComments(familyId, post.id, setComments);
  }, [familyId, post.id, realtimeEnabled, showComments]);

  useEffect(() => {
    if (!comments.length) return;
    const serverIds = new Set(comments.map((item) => item.id));
    setPendingComments((current) => current.filter((item) => !serverIds.has(item.id)));
  }, [comments]);

  useEffect(() => {
    if ((post.commentCount || 0) > 0) setShowComments(true);
  }, [post.commentCount]);


  useEffect(() => {
    if (!realtimeEnabled || reactionHydratedRef.current) return;
    let active = true;
    momentsService
      .getMyReaction(familyId, post.id, currentUid)
      .then((result) => {
        if (!active || reactionDirtyRef.current) return;
        const reaction = result?.reaction ?? null;
        reactionHydratedRef.current = true;
        setMyReaction(reaction);
        desiredReactionRef.current = reaction;
      })
      .catch(() => {});
    return () => { active = false; };
  }, [familyId, post.id, currentUid, realtimeEnabled]);

  useEffect(() => {
    if (!reactionPending) {
      setReactionCounts(post.reactionCounts || {} as Record<MomentReaction, number>);
    }
  }, [post.reactionCounts, post.updatedAt, reactionPending]);

  useEffect(() => () => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (reactionDirtyRef.current) {
      void momentsService
        .setReaction(familyId, post.id, currentUid, desiredReactionRef.current)
        .catch(() => {});
    }
  }, [familyId, post.id, currentUid]);

  const reactionCount = useMemo(
    () => Object.values(reactionCounts || {}).reduce((sum, value) => sum + value, 0),
    [reactionCounts],
  );

  const activeReactionIcons = useMemo(
    () => reactionItems
      .map(([reaction, emoji]) => ({ reaction, emoji, count: reactionCounts?.[reaction] || 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3),
    [reactionCounts],
  );

  const quickReactions = useMemo(() => {
    const preferred: MomentReaction[] = ["love", "haha", "like"];
    if (myReaction && !preferred.includes(myReaction)) preferred.unshift(myReaction);
    return preferred.slice(0, 3);
  }, [myReaction]);

  const visibleComments = useMemo(() => {
    const merged = [...olderComments, ...comments, ...pendingComments];
    const byId = new Map(merged.map((item) => [item.id, item]));
    return Array.from(byId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [comments, olderComments, pendingComments]);

  const hasOlderComments = !olderCommentsExhausted && Math.max(0, (post.commentCount || 0) - comments.length - olderComments.length) > 0;
  const commentCanScroll = commentContentHeight > commentViewportHeight + 4;

  const loadOlderComments = async () => {
    if (olderCommentsLoading || !hasOlderComments) return;
    const beforeCreatedAt = olderComments[olderComments.length - 1]?.createdAt || comments[comments.length - 1]?.createdAt;
    if (!beforeCreatedAt) return;
    setOlderCommentsLoading(true);
    try {
      const page = await momentsService.listOlderComments(familyId, post.id, beforeCreatedAt);
      setOlderComments((current) => {
        const merged = [...page.items, ...current];
        return Array.from(new Map(merged.map((item) => [item.id, item])).values())
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      });
      if (!page.hasMore || page.items.length === 0) setOlderCommentsExhausted(true);
    } finally {
      setOlderCommentsLoading(false);
    }
  };

  const filteredReactionRecords = useMemo(
    () => reactionFilter ? reactionRecords.filter((item) => item.reaction === reactionFilter) : reactionRecords,
    [reactionFilter, reactionRecords],
  );

  const persistReactionLater = (desired: MomentReaction | null) => {
    desiredReactionRef.current = desired;
    reactionDirtyRef.current = true;
    reactionVersionRef.current += 1;
    const version = reactionVersionRef.current;

    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setReactionPending(true);

    reactionTimerRef.current = setTimeout(async () => {
      try {
        const committed = await momentsService.setReaction(familyId, post.id, currentUid, desired);
        if (version === reactionVersionRef.current) {
          reactionDirtyRef.current = false;
          setReactionCounts(committed.reactionCounts);
          setMyReaction(committed.reaction);
          desiredReactionRef.current = committed.reaction;
          setReactionPending(false);
        }
      } catch {
        if (version === reactionVersionRef.current) {
          reactionDirtyRef.current = false;
          setReactionPending(false);
          try {
            const [serverPost, serverReaction] = await Promise.all([
              momentsService.getById(familyId, post.id),
              momentsService.getMyReaction(familyId, post.id, currentUid),
            ]);
            setMyReaction(serverReaction?.reaction ?? null);
            desiredReactionRef.current = serverReaction?.reaction ?? null;
            if (serverPost?.reactionCounts) setReactionCounts(serverPost.reactionCounts);
          } catch {
            setReactionCounts(post.reactionCounts || {} as Record<MomentReaction, number>);
          }
        }
      }
    }, 2200);
  };

  const react = (reaction: MomentReaction) => {
    // Ref is the synchronous source of truth between rapid taps. React state can
    // still contain the previous render for a few milliseconds; using it here
    // caused the visible total to jump 2 → 3 → 2 when switching emoji quickly.
    const previousReaction = desiredReactionRef.current;
    const nextReaction = previousReaction === reaction ? null : reaction;
    desiredReactionRef.current = nextReaction;

    setMyReaction(nextReaction);
    setReactionCounts((current) => {
      const nextCounts = { ...(current || {}) } as Record<MomentReaction, number>;
      if (previousReaction) {
        nextCounts[previousReaction] = Math.max(0, (nextCounts[previousReaction] || 0) - 1);
      }
      if (nextReaction) {
        nextCounts[nextReaction] = (nextCounts[nextReaction] || 0) + 1;
      }
      return nextCounts;
    });
    setShowReactionPicker(false);
    persistReactionLater(nextReaction);
  };

  const submitOptimisticComment = async (item: LocalComment) => {
    try {
      await momentsService.addCommentWithId(
        familyId,
        post.id,
        item.id,
        { uid: currentUid, displayName: currentName, avatarUrl: currentAvatarUrl },
        item.text,
      );
      // Keep it visible until the lazy realtime listener sees the exact reserved id.
      setPendingComments((current) => current.map((entry) => entry.id === item.id ? { ...entry, delivery: "sent" } : entry));
    } catch {
      setPendingComments((current) => current.map((entry) => entry.id === item.id ? { ...entry, delivery: "failed" } : entry));
    }
  };

  const sendComment = () => {
    const clean = comment.trim();
    if (!clean) return;
    const id = momentsService.reserveCommentId(familyId, post.id);
    const optimistic: LocalComment = {
      id,
      postId: post.id,
      authorUid: currentUid,
      authorName: currentName,
      ...(currentAvatarUrl ? { authorAvatarUrl: currentAvatarUrl } : {}),
      text: clean,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      delivery: "sending",
    };
    setComment("");
    setShowComments(true);
    setPendingComments((current) => [...current, optimistic]);
    void submitOptimisticComment(optimistic);
  };

  const retryComment = (item: LocalComment) => {
    const sending = { ...item, delivery: "sending" as const };
    setPendingComments((current) => current.map((entry) => entry.id === item.id ? sending : entry));
    void submitOptimisticComment(sending);
  };

  const loadReactionPage = async (reset = false) => {
    if (reactionLoading) return;
    setReactionLoading(true);
    try {
      const page = await momentsService.listReactionsPage(
        familyId,
        post.id,
        reset ? null : reactionCursor,
      );
      setReactionRecords((current) => {
        const next = reset ? page.items : [...current, ...page.items];
        return Array.from(new Map(next.map((item) => [item.uid, item])).values());
      });
      setReactionCursor(page.cursor);
      setReactionHasMore(page.hasMore);
    } finally {
      setReactionLoading(false);
    }
  };

  const openReactionDetails = () => {
    if (!reactionCount) return;
    setReactionFilter(null);
    setReactionRecords([]);
    setReactionCursor(null);
    setReactionHasMore(false);
    setReactionDetailVisible(true);
    void loadReactionPage(true);
  };

  const reactionPerson = (record: MomentReactionRecord) => {
    if (record.uid === currentUid) {
      return { displayName: `${currentName} · Bạn`, avatarUrl: currentAvatarUrl || null };
    }
    const member = memberByUid?.get(record.uid);
    return {
      displayName: member?.shortName || member?.displayName || "Thành viên trong nhà",
      avatarUrl: member?.avatarUrl || null,
    };
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push(`/member/${post.authorUid}` as never)}
          style={({ pressed }) => [styles.authorPress, pressed && styles.authorPressPressed]}
        >
          <View style={styles.avatar}>
            {post.authorAvatarUrl ? (
              <Image source={{ uri: post.authorAvatarUrl }} style={styles.avatarImg} contentFit="cover" cachePolicy="memory-disk" recyclingKey={`author-${post.authorUid}`} />
            ) : (
              <Text style={styles.initial}>{post.authorName.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.author}>{post.authorName}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.time}>{formatTime(post.createdAt)}</Text>
              <View style={styles.dot} />
              <Ionicons name="people" size={12} color={COLORS.secondaryText} />
              <Text style={styles.visibility}>Gia đình</Text>
            </View>
          </View>
        </Pressable>
        {canManagePost ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tùy chọn bài đăng"
            onPress={() => { setEditCaption(post.caption); setPostMenuVisible(true); }}
            style={({ pressed }) => [styles.moreButton, pressed && styles.reactionPressed]}
          >
            <Ionicons name="ellipsis-horizontal" size={19} color={COLORS.secondaryText} />
          </Pressable>
        ) : <View style={styles.moreButtonPlaceholder} />}
      </View>

      {!!post.caption && <Text style={styles.caption}>{post.caption}</Text>}
      {!!linkedPersons.length && (
        <View style={styles.personLinks}>
          <View style={styles.personLinksLabel}>
            <Ionicons name="leaf-outline" size={13} color={COLORS.primary} />
            <Text style={styles.personLinksLabelText}>Có trong kỷ niệm</Text>
          </View>
          <View style={styles.personLinksWrap}>
            {linkedPersons.slice(0, 6).map((linkedPerson) => (
              <Pressable
                key={linkedPerson.id}
                onPress={() => router.push({
                  pathname: "/family-graph",
                  params: { focusPersonId: linkedPerson.id, detailPersonId: linkedPerson.id },
                } as never)}
                style={({ pressed }) => [styles.personLinkChip, pressed && styles.reactionPressed]}
              >
                <Ionicons name="person-outline" size={12} color={COLORS.primary} />
                <Text style={styles.personLinkText} numberOfLines={1}>{linkedPerson.name}</Text>
              </Pressable>
            ))}
            {linkedPersons.length > 6 && (
              <View style={styles.personLinkMore}>
                <Text style={styles.personLinkMoreText}>+{linkedPersons.length - 6}</Text>
              </View>
            )}
          </View>
        </View>
      )}
      <MomentMediaGrid media={post.media || EMPTY_MEDIA} onOpen={openMediaAt} />

      <View style={styles.stats}>
        <Pressable onPress={openReactionDetails} disabled={!reactionCount} style={styles.statLeft} hitSlop={6}>
          {activeReactionIcons.length > 0 ? (
            <View style={styles.statEmojiStack}>
              {activeReactionIcons.map((item, index) => (
                <View key={item.reaction} style={[styles.statEmoji, index > 0 && styles.statEmojiOverlap]}>
                  <Text style={styles.statEmojiText}>{item.emoji}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.statEmoji}>
              <Ionicons name="heart-outline" size={12} color={COLORS.primary} />
            </View>
          )}
          <Text style={styles.statsText}>{reactionCount ? `${reactionCount} cảm xúc` : "Hãy là người đầu tiên thả cảm xúc"}</Text>
        </Pressable>
        <Pressable onPress={() => setShowComments((current) => !current)} hitSlop={7}>
          <Text style={styles.statsText}>{post.commentCount || 0} bình luận</Text>
        </Pressable>
      </View>

      <View style={styles.actionArea}>
        <View style={styles.reactionRow}>
          {quickReactions.map((reaction) => (
            <Pressable
              key={reaction}
              onPress={() => react(reaction)}
              style={({ pressed }) => [styles.reactionButton, myReaction === reaction && styles.reactionActive, pressed && styles.reactionPressed]}
            >
              <Text style={styles.reactionEmoji}>{reactionEmoji[reaction]}</Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityLabel="Mở thêm cảm xúc"
            onPress={() => setShowReactionPicker(true)}
            style={({ pressed }) => [styles.reactionMoreButton, pressed && styles.reactionPressed]}
          >
            <Ionicons name="happy-outline" size={18} color={COLORS.primaryText} />
            <Ionicons name="add" size={10} color={COLORS.primary} style={styles.reactionMorePlus} />
          </Pressable>
        </View>
        {!showComments && (
          <Pressable onPress={() => setShowComments(true)} style={({ pressed }) => [styles.commentToggle, pressed && styles.reactionPressed]}>
            <Ionicons name="chatbubble-outline" size={17} color={COLORS.primaryText} />
            <Text style={styles.commentToggleText}>
              {(post.commentCount || 0) > 0 ? "Mở lời thương" : "Bình luận"}
            </Text>
          </Pressable>
        )}
      </View>

      {showComments && (
        <View style={styles.comments}>
          {visibleComments.length ? (
            <>
              <ScrollView
                style={styles.commentViewport}
                contentContainerStyle={styles.commentViewportContent}
                nestedScrollEnabled
                scrollEnabled={commentCanScroll}
                onLayout={(event) => setCommentViewportHeight(event.nativeEvent.layout.height)}
                onContentSizeChange={(_width, height) => setCommentContentHeight(height)}
                onTouchStart={() => {
                  if (commentCanScroll) onCommentScrollLockChange?.(true);
                }}
                onTouchEnd={() => onCommentScrollLockChange?.(false)}
                onTouchCancel={() => onCommentScrollLockChange?.(false)}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {visibleComments.map((item) => {
                  const local = pendingComments.find((entry) => entry.id === item.id);
                  return (
                    <View key={item.id} style={[styles.comment, local?.delivery === "sending" && styles.commentSending]}>
                      <Pressable
                        onPress={() => router.push(`/member/${item.authorUid}` as never)}
                        style={({ pressed }) => [styles.commentAvatar, pressed && styles.authorPressPressed]}
                      >
                        {item.authorAvatarUrl ? (
                          <Image source={{ uri: item.authorAvatarUrl }} style={styles.commentAvatarImage} contentFit="cover" cachePolicy="memory-disk" recyclingKey={`comment-${item.id}`} />
                        ) : (
                          <Text style={styles.commentInitial}>{item.authorName.slice(0, 1).toUpperCase()}</Text>
                        )}
                      </Pressable>
                      <View style={[styles.commentBubble, local?.delivery === "failed" && styles.commentBubbleFailed]}>
                        <Text style={styles.commentAuthor}>{item.authorName}</Text>
                        <Text style={styles.commentText}>{item.text}</Text>
                        {local?.delivery === "sending" && <Text style={styles.commentDelivery}>Đang gửi vào nhà…</Text>}
                        {local?.delivery === "sent" && <Text style={styles.commentDelivery}>Đã gửi 🌸</Text>}
                        {local?.delivery === "failed" && (
                          <Pressable onPress={() => retryComment(local)} style={styles.commentRetry}>
                            <Ionicons name="refresh" size={12} color={COLORS.destructive} />
                            <Text style={styles.commentRetryText}>Chưa gửi được · chạm để thử lại</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
              {hasOlderComments && (
                <Pressable
                  disabled={olderCommentsLoading}
                  onPress={() => void loadOlderComments()}
                  style={({ pressed }) => [styles.moreCommentsButton, styles.moreCommentsAfterViewport, pressed && styles.reactionPressed]}
                >
                  {olderCommentsLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Ionicons name="flower-outline" size={15} color={COLORS.primary} />
                  )}
                  <Text style={styles.moreCommentsText}>Mở thêm lời thương 🌷</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.noCommentText}>Chưa có bình luận nào. Gửi một lời nhỏ cho khoảnh khắc này nhé 🌷</Text>
          )}

          <View style={styles.commentInput}>
            <TextInput
              ref={commentInputRef}
              value={comment}
              onChangeText={setComment}
              onFocus={() => onCommentFocus?.(commentInputRef.current)}
              placeholder="Nói điều gì thật thương…"
              placeholderTextColor={COLORS.secondaryText}
              style={styles.commentTextInput}
              returnKeyType="send"
              onSubmitEditing={sendComment}
            />
            <Pressable
              disabled={!comment.trim()}
              onPress={sendComment}
              style={({ pressed }) => [styles.sendButton, !comment.trim() && styles.sendButtonDisabled, pressed && styles.reactionPressed]}
            >
              <Ionicons name="send" size={17} color={COLORS.white} />
            </Pressable>
          </View>
        </View>
      )}

      <Modal visible={postMenuVisible} transparent animationType="fade" onRequestClose={() => setPostMenuVisible(false)}>
        <Pressable style={styles.postMenuBackdrop} onPress={() => setPostMenuVisible(false)}>
          <Pressable style={styles.postMenuSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.postMenuTitle}>Khoảnh khắc này</Text>
            {isOwner && (
              <Pressable
                style={styles.postMenuAction}
                onPress={() => { setPostMenuVisible(false); setEditCaption(post.caption); setEditVisible(true); }}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
                <Text style={styles.postMenuActionText}>Sửa lời kỷ niệm của tôi</Text>
              </Pressable>
            )}
            {isOwner && (
              <Pressable style={styles.postMenuAction} onPress={confirmDeleteOwnPost}>
                <Ionicons name="trash-outline" size={20} color={COLORS.destructive} />
                <Text style={[styles.postMenuActionText, { color: COLORS.destructive }]}>Xóa bài đăng của tôi</Text>
              </Pressable>
            )}
            {canModerate && (
              <Pressable style={styles.postMenuAction} onPress={() => void hideFromMemories()}>
                <Ionicons name="eye-off-outline" size={20} color={COLORS.secondaryText} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.postMenuActionText}>Không cho hiện trên trang Kỷ niệm</Text>
                  <Text style={styles.postMenuHint}>Admin chỉ kiểm duyệt hiển thị, không sửa hoặc xóa nội dung.</Text>
                </View>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <Pressable style={styles.postMenuBackdrop} onPress={() => setEditVisible(false)}>
          <Pressable style={styles.editSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.postMenuTitle}>Sửa lời kỷ niệm</Text>
            <TextInput
              value={editCaption}
              onChangeText={setEditCaption}
              placeholder="Viết lại lời bạn muốn lưu giữ…"
              placeholderTextColor={COLORS.secondaryText}
              multiline
              style={styles.editCaptionInput}
            />
            <Pressable
              disabled={postActionBusy}
              onPress={() => void saveOwnEdit()}
              style={({ pressed }) => [styles.editSaveButton, pressed && styles.reactionPressed, postActionBusy && { opacity: 0.55 }]}
            >
              {postActionBusy ? <ActivityIndicator size="small" color={COLORS.white} /> : <Ionicons name="checkmark" size={18} color={COLORS.white} />}
              <Text style={styles.editSaveText}>Lưu thay đổi</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showReactionPicker} transparent animationType="fade" onRequestClose={() => setShowReactionPicker(false)}>
        <Pressable style={styles.pickerBackdrop} onPress={() => setShowReactionPicker(false)}>
          <Pressable style={styles.pickerSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.pickerSheetEyebrow}>MỘT CHÚT CẢM XÚC</Text>
            <Text style={styles.pickerSheetTitle}>Bạn đang thấy thế nào? 🌷</Text>
            <View style={styles.pickerGrid}>
              {reactionItems.map(([reaction, emoji, label]) => (
                <Pressable
                  key={reaction}
                  onPress={() => react(reaction)}
                  style={({ pressed }) => [
                    styles.pickerReaction,
                    myReaction === reaction && styles.pickerReactionActive,
                    pressed && styles.reactionPressed,
                  ]}
                >
                  <Text style={styles.pickerEmoji}>{emoji}</Text>
                  <Text style={styles.pickerLabel}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={reactionDetailVisible} transparent animationType="fade" onRequestClose={() => setReactionDetailVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReactionDetailVisible(false)}>
          <Pressable style={styles.reactionSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.reactionSheetHeader}>
              <View>
                <Text style={styles.reactionSheetEyebrow}>CẢM XÚC CỦA NHÀ</Text>
                <Text style={styles.reactionSheetTitle}>{reactionCount} lượt thương mến</Text>
              </View>
              <Pressable onPress={() => setReactionDetailVisible(false)} style={styles.sheetClose}>
                <Ionicons name="close" size={20} color={COLORS.primaryText} />
              </Pressable>
            </View>

            <View style={styles.reactionFilters}>
              <Pressable onPress={() => setReactionFilter(null)} style={[styles.reactionFilterChip, !reactionFilter && styles.reactionFilterChipActive]}>
                <Text style={[styles.reactionFilterText, !reactionFilter && styles.reactionFilterTextActive]}>Tất cả {reactionCount}</Text>
              </Pressable>
              {reactionItems.filter(([reaction]) => (reactionCounts?.[reaction] || 0) > 0).map(([reaction, emoji]) => (
                <Pressable key={reaction} onPress={() => setReactionFilter(reaction)} style={[styles.reactionFilterChip, reactionFilter === reaction && styles.reactionFilterChipActive]}>
                  <Text style={styles.reactionFilterEmoji}>{emoji}</Text>
                  <Text style={[styles.reactionFilterText, reactionFilter === reaction && styles.reactionFilterTextActive]}>{reactionCounts?.[reaction] || 0}</Text>
                </Pressable>
              ))}
            </View>

            {reactionLoading && !reactionRecords.length ? (
              <View style={styles.reactionLoading}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.reactionLoadingText}>Bloom đang mở những lời thương…</Text>
              </View>
            ) : (
              <FlatList
                data={filteredReactionRecords}
                keyExtractor={(item) => item.uid}
                style={styles.reactionPeopleList}
                contentContainerStyle={styles.reactionPeopleContent}
                renderItem={({ item }) => {
                  const person = reactionPerson(item);
                  return (
                    <Pressable
                      onPress={() => {
                        setReactionDetailVisible(false);
                        router.push(`/member/${item.uid}` as never);
                      }}
                      style={({ pressed }) => [styles.reactionPersonRow, pressed && styles.authorPressPressed]}
                    >
                      <View style={styles.reactionPersonAvatar}>
                        {person.avatarUrl ? (
                          <Image source={{ uri: person.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
                        ) : (
                          <Text style={styles.reactionPersonInitial}>{person.displayName.slice(0, 1).toUpperCase()}</Text>
                        )}
                      </View>
                      <Text style={styles.reactionPersonName} numberOfLines={1}>{person.displayName}</Text>
                      <Text style={styles.reactionPersonEmoji}>{reactionEmoji[item.reaction]}</Text>
                      <Ionicons name="chevron-forward" size={15} color={COLORS.secondaryText} />
                    </Pressable>
                  );
                }}
                ListEmptyComponent={<Text style={styles.reactionEmpty}>Chưa thấy cảm xúc này trong phần đã tải.</Text>}
                ListFooterComponent={reactionHasMore ? (
                  <Pressable disabled={reactionLoading} onPress={() => void loadReactionPage(false)} style={styles.loadMoreReactions}>
                    {reactionLoading ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Text style={styles.loadMoreReactionsText}>Xem thêm</Text>}
                  </Pressable>
                ) : <View style={{ height: 8 }} />}
              />
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const sameLinkedPersons = (
  left: Array<{ id: string; name: string }> = [],
  right: Array<{ id: string; name: string }> = [],
) => left.length === right.length
  && left.every((person, index) => person.id === right[index]?.id && person.name === right[index]?.name);

export const MomentCard = React.memo(
  MomentCardComponent,
  (previous, next) =>
    previous.familyId === next.familyId
    && previous.currentUid === next.currentUid
    && previous.currentName === next.currentName
    && previous.currentAvatarUrl === next.currentAvatarUrl
    && previous.memberByUid === next.memberByUid
    && previous.realtimeEnabled === next.realtimeEnabled
    && previous.canModerate === next.canModerate
    && previous.post.id === next.post.id
    && previous.post.updatedAt === next.post.updatedAt
    && sameLinkedPersons(previous.linkedPersons, next.linkedPersons),
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: UI.borderRadiusCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#7E5260",
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.055,
    shadowRadius: 14,
    elevation: 2,
  },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, gap: 10 },
  authorPress: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10 },
  authorPressPressed: { opacity: 0.72 },
  avatar: { width: 45, height: 45, borderRadius: 18, backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  initial: { fontWeight: "900", color: COLORS.primaryText, fontSize: 17 },
  headerCopy: { flex: 1, minWidth: 0 },
  author: { fontSize: 15, fontWeight: "900", color: COLORS.primaryText },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  time: { fontSize: 11.5, color: COLORS.secondaryText },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.secondaryText, opacity: 0.6 },
  visibility: { fontSize: 11, color: COLORS.secondaryText },
  moreButtonPlaceholder: { width: 38, height: 38 },
  moreButton: { width: 35, height: 35, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  caption: { paddingHorizontal: 16, paddingBottom: 14, fontSize: 14.5, lineHeight: 21, color: COLORS.primaryText },
  mediaSingle: { paddingHorizontal: 10 },
  mediaSingleTile: { width: "100%", height: 320, borderRadius: 18 },
  mediaGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 10 },
  mediaTile: { overflow: "hidden", backgroundColor: COLORS.softSurface, borderRadius: 14 },
  mediaHalf: { width: "49%", height: 184 },
  mediaWide: { width: "100%", height: 230 },
  videoFallback: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  videoOverlay: { position: "absolute", left: 10, bottom: 10, width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(0,0,0,0.46)", alignItems: "center", justifyContent: "center" },
  remainingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(44,27,34,0.48)", alignItems: "center", justifyContent: "center" },
  remainingText: { color: COLORS.white, fontSize: 28, fontWeight: "900" },
  personLinks: { paddingHorizontal: 16, paddingBottom: 14, marginTop: 10, gap: 7 },
  personLinksLabel: { flexDirection: "row", alignItems: "center", gap: 5 },
  personLinksLabelText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  personLinksWrap: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  personLinkChip: { maxWidth: "72%", minHeight: 30, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9 },
  personLinkText: { flexShrink: 1, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  personLinkMore: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  personLinkMoreText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  stats: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  statLeft: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 7 },
  statEmojiStack: { flexDirection: "row", alignItems: "center", paddingRight: 2 },
  statEmoji: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  statEmojiOverlap: { marginLeft: -6 },
  statEmojiText: { fontSize: 11 },
  statsText: { fontSize: 11.5, color: COLORS.secondaryText },
  postMenuBackdrop: { flex: 1, backgroundColor: "rgba(74,45,56,0.34)", justifyContent: "flex-end" },
  postMenuSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28, gap: 8 },
  editSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  postMenuTitle: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900", marginBottom: 8 },
  postMenuAction: { minHeight: 54, borderRadius: 18, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  postMenuActionText: { color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
  postMenuHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  editCaptionInput: { minHeight: 120, maxHeight: 220, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, color: COLORS.primaryText, fontSize: 14, lineHeight: 20, textAlignVertical: "top", backgroundColor: COLORS.softSurface },
  editSaveButton: { marginTop: 14, height: 50, borderRadius: 18, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  editSaveText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },

  pickerBackdrop: { flex: 1, backgroundColor: "rgba(65,39,49,0.38)", justifyContent: "flex-end" },
  pickerSheet: { backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 9, paddingHorizontal: 18, paddingBottom: 26 },
  pickerSheetEyebrow: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  pickerSheetTitle: { marginTop: 4, marginBottom: 15, color: COLORS.primaryText, fontSize: 20, fontWeight: "900" },
  pickerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pickerReaction: { width: "31.5%", minHeight: 78, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: "#FFFCFD" },
  pickerReactionActive: { backgroundColor: COLORS.accentBg, borderColor: "#F2BED0" },
  pickerEmoji: { fontSize: 25 },
  pickerLabel: { marginTop: 5, fontSize: 10, color: COLORS.secondaryText, fontWeight: "800" },
  actionArea: { borderTopWidth: 1, borderTopColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  reactionRow: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, padding: 4, borderRadius: 16, backgroundColor: "#FFFCFD", borderWidth: 1, borderColor: COLORS.border },
  reactionButton: { width: 38, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  reactionMoreButton: { width: 38, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  reactionMorePlus: { position: "absolute", right: 6, bottom: 6 },
  reactionActive: { backgroundColor: COLORS.accentBg, borderColor: "#F2BED0" },
  reactionPressed: { opacity: 0.62, transform: [{ scale: 0.97 }] },
  reactionEmoji: { fontSize: 18 },
  commentToggle: { minHeight: 38, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: COLORS.softSurface },
  commentToggleText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  comments: { padding: 13, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: "#FFFAFC" },
  commentViewport: { maxHeight: 272 },
  commentViewportContent: { paddingBottom: 2 },
  moreCommentsButton: { minHeight: 38, marginBottom: 5, borderRadius: 13, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  moreCommentsAfterViewport: { marginTop: 7, marginBottom: 0 },
  moreCommentsText: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  comment: { flexDirection: "row", alignItems: "flex-start", gap: 9, paddingVertical: 5 },
  commentSending: { opacity: 0.82 },
  commentAvatar: { width: 31, height: 31, borderRadius: 12, overflow: "hidden", backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  commentAvatarImage: { width: "100%", height: "100%" },
  commentInitial: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  commentBubble: { flex: 1, backgroundColor: COLORS.white, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 11, paddingVertical: 8 },
  commentBubbleFailed: { borderColor: "#F0B7C6", backgroundColor: "#FFF7FA" },
  commentAuthor: { fontWeight: "900", fontSize: 11.5, color: COLORS.primaryText },
  commentText: { marginTop: 3, fontSize: 12.5, lineHeight: 17, color: COLORS.primaryText },
  commentDelivery: { marginTop: 5, color: COLORS.primary, fontSize: 9.5, fontWeight: "800" },
  commentRetry: { marginTop: 6, flexDirection: "row", alignItems: "center", gap: 4 },
  commentRetryText: { color: COLORS.destructive, fontSize: 9.5, fontWeight: "800" },
  noCommentText: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, textAlign: "center", paddingVertical: 6 },
  commentInput: { marginTop: 10, backgroundColor: COLORS.white, borderRadius: 18, paddingLeft: 12, paddingRight: 6, paddingVertical: 6, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  commentTextInput: { flex: 1, minHeight: 36, color: COLORS.primaryText, fontSize: 13 },
  sendButton: { width: 36, height: 36, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  sendButtonDisabled: { opacity: 0.45 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(65,39,49,0.34)", justifyContent: "flex-end" },
  reactionSheet: { height: "62%", backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 9, paddingHorizontal: 18, paddingBottom: 22 },
  sheetHandle: { width: 44, height: 5, borderRadius: 99, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 15 },
  reactionSheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  reactionSheetEyebrow: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  reactionSheetTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 20, fontWeight: "900" },
  sheetClose: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  reactionFilters: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14, marginBottom: 10 },
  reactionFilterChip: { minHeight: 34, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.white },
  reactionFilterChipActive: { backgroundColor: COLORS.accentBg, borderColor: "#F1BCD0" },
  reactionFilterEmoji: { fontSize: 14 },
  reactionFilterText: { color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  reactionFilterTextActive: { color: COLORS.primaryText },
  reactionLoading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  reactionLoadingText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  reactionPeopleList: { flex: 1 },
  reactionPeopleContent: { paddingBottom: 12 },
  reactionPersonRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  reactionPersonAvatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.accentBg, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  reactionPersonInitial: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  reactionPersonName: { flex: 1, color: COLORS.primaryText, fontSize: 13, fontWeight: "800" },
  reactionPersonEmoji: { fontSize: 20 },
  reactionEmpty: { color: COLORS.secondaryText, textAlign: "center", paddingVertical: 28, fontSize: 11.5 },
  loadMoreReactions: { minHeight: 42, marginTop: 10, alignItems: "center", justifyContent: "center", borderRadius: 14, backgroundColor: COLORS.softSurface },
  loadMoreReactionsText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
});
