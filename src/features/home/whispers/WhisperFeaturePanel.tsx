import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, type TextInput } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { familyService } from "@/services/family/familyService";
import { FamilyMemberPicker } from "@/components/family/FamilyMemberPicker";
import { BloomFullScreenFlow } from "@/components/ui/BloomFullScreenFlow";
import { homeWhisperService, type WhisperPageCursor } from "@/services/home/homeWhisperService";
import type { FamilyMember } from "@/types";
import type { HomeWhisper, HomeWhisperEmotion, HomeWhisperFeedMode, SavedHomeWhisper } from "@/types/homeLiving";
import { COLORS } from "@/constants/theme";
import { BloomConfirmModal } from "@/components/ui/BloomConfirmModal";
import { BloomTextInput } from "@/components/ui/BloomInputComponents";
import { BloomNoteCallout } from "@/components/ui/BloomNoteCallout";
import { appWidePerformanceService } from "@/services/performance/appWidePerformanceService";

const EMOTIONS: Array<{ value: HomeWhisperEmotion; emoji: string; label: string }> = [
  { value: "heart", emoji: "❤️", label: "Thương" },
  { value: "love", emoji: "🥰", label: "Yêu" },
  { value: "smile", emoji: "😊", label: "Vui" },
  { value: "touched", emoji: "🥹", label: "Xúc động" },
  { value: "sad", emoji: "😢", label: "Buồn" },
  { value: "hug", emoji: "🤗", label: "Ôm" },
  { value: "thanks", emoji: "🙏", label: "Biết ơn" },
  { value: "laugh", emoji: "😂", label: "Cười" },
  { value: "flower", emoji: "🌷", label: "Dịu dàng" },
  { value: "sparkles", emoji: "✨", label: "Lấp lánh" },
];
const emojiFor = (emotion: HomeWhisperEmotion) => EMOTIONS.find(x => x.value === emotion)?.emoji ?? "❤️";

const FILTERS: Array<{ key: HomeWhisperFeedMode; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "all", label: "Mới nhất", description: "Tất cả lời bạn có quyền xem", icon: "sparkles-outline" },
  { key: "toMe", label: "Gửi riêng cho tôi", description: "Những lời người thân gửi riêng cho bạn", icon: "mail-unread-outline" },
  { key: "sent", label: "Tôi đã gửi", description: "Những lời bạn đã gửi cho người thân hoặc cả nhà", icon: "paper-plane-outline" },
  { key: "family", label: "Chia sẻ với cả nhà", description: "Những lời mọi thành viên trong Nhà Mình có thể xem", icon: "people-outline" },
];

const displayTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
};

export function WhisperFeaturePanel() {
  const { user, userProfile, activeFamilyId } = useAuth();
  const uid = user?.uid ?? "";
  const myName = userProfile?.shortName || userProfile?.displayName || "Người thân";
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [audience, setAudience] = useState<"family" | "direct">("family");
  const [recipientUid, setRecipientUid] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [emotion, setEmotion] = useState<HomeWhisperEmotion>("heart");
  const [mode, setMode] = useState<HomeWhisperFeedMode | "saved">("all");
  const [filterVisible, setFilterVisible] = useState(false);
  const [items, setItems] = useState<HomeWhisper[]>([]);
  const [savedItems, setSavedItems] = useState<SavedHomeWhisper[]>([]);
  const [cursor, setCursor] = useState<WhisperPageCursor>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFamilyVisible, setConfirmFamilyVisible] = useState(false);
  const [savedInfoVisible, setSavedInfoVisible] = useState(false);
  const [messageInvalid, setMessageInvalid] = useState(false);
  const [recipientInvalid, setRecipientInvalid] = useState(false);
  const messageRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    // Performance sweep is strictly read-only: never let maintenance cleanup write
    // to Firestore while automated profiling is moving through production screens.
    if (!appWidePerformanceService.isNoWriteMode()) {
      void homeWhisperService.cleanupExpired(activeFamilyId, uid).catch(() => {});
    }
    let alive = true;
    familyService.listMembers(activeFamilyId)
      .then(list => { if (alive) setMembers(list); })
      .catch(() => { if (alive) setMembers([]); });
    return () => { alive = false; };
  }, [activeFamilyId, uid]);

  const recipient = useMemo(() => members.find(m => m.uid === recipientUid) ?? null, [members, recipientUid]);
  const currentFilter = useMemo(() => FILTERS.find(filter => filter.key === mode) ?? FILTERS[0], [mode]);

  const load = useCallback(async (append = false) => {
    if (!activeFamilyId || !uid) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "saved") {
        const rows = await homeWhisperService.listSaved(uid);
        setSavedItems(rows);
        setHasMore(false);
        setCursor(null);
      } else {
        const page = await homeWhisperService.fetchPage(activeFamilyId, uid, mode, append ? cursor : null);
        setItems(current => append ? [...current, ...page.items.filter(x => !current.some(c => c.id === x.id))] : page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được Lời thì thầm.");
    } finally {
      setLoading(false);
    }
  }, [activeFamilyId, uid, mode, cursor]);

  useEffect(() => {
    setCursor(null);
    setItems([]);
    setSavedItems([]);
    void load(false);
    // load intentionally re-runs when mode/family/account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFamilyId, uid, mode]);

  const performSend = useCallback(async () => {
    if (!activeFamilyId || !uid || sending) return;
    setSending(true);
    setError(null);
    try {
      await homeWhisperService.create({
        familyId: activeFamilyId,
        authorUid: uid,
        authorName: myName,
        audience,
        recipientUid: audience === "direct" ? recipientUid : null,
        recipientName: audience === "direct" ? (recipient?.shortName || recipient?.displayName || null) : null,
        familyMemberUids: members.map(m => m.uid),
        message,
        emotion,
      });
      setMessage("");
      setRecipientUid(null);
      setEmotion("heart");
      setMode(audience === "family" ? "family" : "sent");
      setCursor(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được Lời thì thầm.");
    } finally {
      setSending(false);
    }
  }, [activeFamilyId, uid, sending, myName, audience, recipientUid, recipient, members, message, emotion, load]);

  const send = useCallback(() => {
    setError(null);
    if (!message.trim()) {
      setMessageInvalid(true);
      setError("Viết một lời nhỏ trước khi gửi nhé.");
      messageRef.current?.focus();
      return;
    }
    if (audience === "direct" && !recipientUid) {
      setRecipientInvalid(true);
      setError("Chọn người bạn muốn gửi lời này tới nhé.");
      return;
    }
    setMessageInvalid(false);
    setRecipientInvalid(false);
    if (audience === "family") {
      setConfirmFamilyVisible(true);
      return;
    }
    void performSend();
  }, [message, audience, recipientUid, performSend]);

  const toggleHeart = async (item: HomeWhisper) => {
    if (!activeFamilyId || !uid) return;
    const had = item.heartUids.includes(uid);
    setItems(current => current.map(x => x.id === item.id
      ? { ...x, heartUids: had ? x.heartUids.filter(v => v !== uid) : [...x.heartUids, uid] }
      : x));
    try { await homeWhisperService.toggleHeart(activeFamilyId, item.id, uid); }
    catch { await load(false); }
  };

  const saveItem = async (item: HomeWhisper) => {
    if (!uid) return;
    try {
      await homeWhisperService.save(uid, item);
      setSavedInfoVisible(true);
    } catch (e) { setError(e instanceof Error ? e.message : "Không lưu được."); }
  };

  return (
    <View style={styles.wrapper}>
      <BloomNoteCallout title="Một lời nhỏ sẽ ở lại 60 ngày" icon="moon-outline">
        Muốn giữ lâu hơn? Hãy lưu lại những lời bạn không muốn mất.
      </BloomNoteCallout>

      <View style={styles.composer}>
        <Text style={styles.heading}>Gửi một lời nhỏ</Text>
        <View style={styles.segmentRow}>
          <Pressable onPress={() => setAudience("family")} style={[styles.segment, audience === "family" && styles.segmentActive]}>
            <Text style={[styles.segmentText, audience === "family" && styles.segmentTextActive]}>Cả nhà</Text>
          </Pressable>
          <Pressable onPress={() => setAudience("direct")} style={[styles.segment, audience === "direct" && styles.segmentActive]}>
            <Text style={[styles.segmentText, audience === "direct" && styles.segmentTextActive]}>Người thân</Text>
          </Pressable>
        </View>

        {audience === "direct" && (
          <FamilyMemberPicker
            label="Người nhận"
            hint="Chọn đúng một người thân đang ở trong Nhà Mình."
            members={members}
            selectedUids={recipientUid ? [recipientUid] : []}
            onChange={uids => { setRecipientUid(uids[0] ?? null); if (uids[0]) setRecipientInvalid(false); }}
            mode="single"
            currentUid={uid}
            excludeUids={[uid]}
            variant="whisper"
            emptyText="Chưa có người thân khác trong nhà."
          />
        )}
        {audience === "direct" && recipientInvalid && (
          <View style={styles.validationCallout}><Ionicons name="heart-outline" size={16} color={COLORS.primary} /><Text style={styles.validationText}>Chọn một người thân để lời này đến đúng người nhé.</Text></View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.emojiRow}>
          {EMOTIONS.map(item => (
            <Pressable key={item.value} accessibilityLabel={item.label} onPress={() => setEmotion(item.value)} style={[styles.emoji, emotion === item.value && styles.emojiActive]}>
              <Text style={styles.emojiText}>{item.emoji}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <BloomTextInput
          ref={messageRef}
          label="Lời bạn muốn gửi"
          value={message}
          onChangeText={value => { setMessage(value); if (value.trim()) setMessageInvalid(false); }}
          placeholder="Bạn muốn nói điều gì?"
          multiline
          maxLength={500}
          leftIcon="heart-outline"
          error={messageInvalid ? "Viết vài chữ trước khi gửi nhé — Bloom sẽ giữ nguyên điều bạn muốn nói." : undefined}
          helperText="Một câu thật lòng là đủ để người nhận thấy mình được nhớ đến."
        />
        <View style={styles.composerFooter}>
          <Text style={styles.counter}>{message.length}/500</Text>
          <Pressable disabled={sending} onPress={send} style={[styles.sendButton, sending && styles.disabled]}>
            {sending ? <ActivityIndicator color="#fff" /> : <><Ionicons name="paper-plane" size={16} color="#fff" /><Text style={styles.sendText}>Gửi</Text></>}
          </Pressable>
        </View>
      </View>

      <View style={styles.feedSection}>
        <View style={styles.feedHeadingRow}>
          <View style={styles.feedHeadingCopy}>
            <Text style={styles.feedTitle}>Những lời gần đây</Text>
            <Text style={styles.feedSubtitle}>{mode === "saved" ? "Những lời bạn đã chủ động giữ lại" : currentFilter.description}</Text>
          </View>
          <Pressable
            accessibilityLabel="Lời đã lưu"
            onPress={() => setMode(mode === "saved" ? "all" : "saved")}
            style={[styles.savedButton, mode === "saved" && styles.savedButtonActive]}
          >
            <Ionicons name={mode === "saved" ? "bookmark" : "bookmark-outline"} size={19} color={mode === "saved" ? COLORS.white : COLORS.primary} />
          </Pressable>
        </View>

        {mode !== "saved" && (
          <Pressable onPress={() => setFilterVisible(true)} style={({ pressed }) => [styles.filterControl, pressed && styles.controlPressed]}>
            <View style={styles.filterIcon}><Ionicons name={currentFilter.icon} size={18} color={COLORS.primary} /></View>
            <View style={styles.filterCopy}>
              <Text style={styles.filterLabel}>{currentFilter.label}</Text>
              <Text style={styles.filterHint}>Chạm để đổi nội dung muốn xem</Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={COLORS.secondaryText} />
          </Pressable>
        )}
      </View>

      <BloomFullScreenFlow
        visible={filterVisible}
        eyebrow="LỌC LỜI THÌ THẦM"
        title="Bạn muốn xem lời nào?"
        subtitle="Chọn một nhóm nội dung. Feed vẫn tải theo từng trang để giữ màn hình nhẹ khi có nhiều lời."
        variant="whisper"
        compactHeader
        onBack={() => setFilterVisible(false)}
      >
        <View style={styles.filterList}>
          {FILTERS.map(filter => {
            const active = mode === filter.key;
            return (
              <Pressable
                key={filter.key}
                onPress={() => { setMode(filter.key); setFilterVisible(false); }}
                style={({ pressed }) => [styles.filterOption, active && styles.filterOptionActive, pressed && styles.controlPressed]}
              >
                <View style={[styles.filterOptionIcon, active && styles.filterOptionIconActive]}>
                  <Ionicons name={filter.icon} size={20} color={active ? COLORS.white : COLORS.primary} />
                </View>
                <View style={styles.filterOptionCopy}>
                  <Text style={styles.filterOptionTitle}>{filter.label}</Text>
                  <Text style={styles.filterOptionDescription}>{filter.description}</Text>
                </View>
                {active && <Ionicons name="checkmark-circle" size={22} color={COLORS.primary} />}
              </Pressable>
            );
          })}
        </View>
      </BloomFullScreenFlow>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {loading && !items.length && !savedItems.length ? <ActivityIndicator style={styles.loader} color={COLORS.primary} /> : null}

      {mode === "saved" ? (
        <View style={styles.list}>
          {savedItems.map(item => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.avatarEmoji}>{emojiFor(item.emotion)}</Text>
                <View style={styles.cardCopy}><Text style={styles.author}>{item.authorName}</Text><Text style={styles.meta}>{displayTime(item.originalCreatedAt)} · Đã lưu</Text></View>
              </View>
              <Text style={styles.message}>{item.message}</Text>
              <Pressable onPress={() => homeWhisperService.removeSaved(uid, item.id).then(() => load(false))} style={styles.textButton}>
                <Ionicons name="bookmark" size={16} color={COLORS.primary} /><Text style={styles.textButtonLabel}>Bỏ lưu</Text>
              </Pressable>
            </View>
          ))}
          {!savedItems.length && !loading && <Text style={styles.empty}>Bạn chưa lưu lời thì thầm nào.</Text>}
        </View>
      ) : (
        <View style={styles.list}>
          {items.map(item => {
            const hearted = item.heartUids.includes(uid);
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.avatarEmoji}>{emojiFor(item.emotion)}</Text>
                  <View style={styles.cardCopy}>
                    <Text style={styles.author}>{item.authorName}</Text>
                    <Text style={styles.meta}>{item.audience === "family" ? "Cả nhà" : `Riêng cho ${item.recipientName || "người thân"}`} · {displayTime(item.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.message}>{item.message}</Text>
                <View style={styles.actions}>
                  <Pressable onPress={() => void toggleHeart(item)} style={[styles.action, hearted && styles.actionActive]}>
                    <Ionicons name={hearted ? "heart" : "heart-outline"} size={18} color={hearted ? COLORS.primary : COLORS.secondaryText} />
                    <Text style={styles.actionLabel}>{item.heartUids.length || "Tim"}</Text>
                  </Pressable>
                  <Pressable onPress={() => void saveItem(item)} style={styles.action}>
                    <Ionicons name="bookmark-outline" size={18} color={COLORS.secondaryText} /><Text style={styles.actionLabel}>Lưu</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
          {!items.length && !loading && <Text style={styles.empty}>Chưa có lời thì thầm phù hợp bộ lọc này.</Text>}
          {hasMore && <Pressable disabled={loading} onPress={() => void load(true)} style={styles.more}><Text style={styles.moreText}>{loading ? "Đang tải…" : "Xem thêm"}</Text></Pressable>}
        </View>
      )}

      <BloomConfirmModal
        visible={confirmFamilyVisible}
        title="Gửi cho cả nhà?"
        message="Mọi người trong Nhà Mình sẽ nhìn thấy lời thì thầm này. Bloom sẽ không gửi thông báo hàng loạt để mọi thứ vẫn nhẹ nhàng."
        confirmLabel="Gửi cho cả nhà"
        cancelLabel="Để mình xem lại"
        icon="home-outline"
        confirmDisabled={sending}
        onCancel={() => setConfirmFamilyVisible(false)}
        onConfirm={() => { setConfirmFamilyVisible(false); void performSend(); }}
      />
      <BloomConfirmModal
        visible={savedInfoVisible}
        title="Đã giữ lời này lại"
        message="Lời đã lưu là một bản riêng của bạn, nên vẫn còn ngay cả khi lời gốc hết 60 ngày."
        cancelLabel="Xong"
        icon="bookmark-outline"
        onCancel={() => setSavedInfoVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 14, marginTop: 18, paddingBottom: 24 },
  notice: { flexDirection: "row", gap: 9, alignItems: "flex-start", backgroundColor: COLORS.softSurface, borderRadius: 16, padding: 12 },
  noticeText: { flex: 1, color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  composer: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 15, gap: 12 },
  heading: { fontSize: 16, fontWeight: "900", color: COLORS.primaryText },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 14, backgroundColor: COLORS.softSurface },
  segmentActive: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.primary },
  segmentText: { color: COLORS.secondaryText, fontWeight: "800", fontSize: 12 },
  segmentTextActive: { color: COLORS.primaryText },
  emojiRow: { gap: 7, paddingVertical: 2 },
  emoji: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  emojiActive: { borderWidth: 1.5, borderColor: COLORS.primary, backgroundColor: COLORS.accentBg },
  emojiText: { fontSize: 20 },
  input: { minHeight: 90, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.primaryText, textAlignVertical: "top", fontSize: 14 },
  inputInvalid: { borderColor: COLORS.primary, borderWidth: 1.5, backgroundColor: "#FFF9FB" },
  validationCallout: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 13, backgroundColor: "#FFF0F5", paddingHorizontal: 10, paddingVertical: 9 },
  validationText: { flex: 1, color: COLORS.primaryText, fontSize: 10.7, lineHeight: 15.5, fontWeight: "700" },
  composerFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  counter: { color: COLORS.secondaryText, fontSize: 11 },
  sendButton: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: COLORS.primary, paddingHorizontal: 16, minHeight: 42, borderRadius: 14, justifyContent: "center" },
  sendText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  feedSection: { gap: 10 },
  feedHeadingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  feedHeadingCopy: { flex: 1 },
  feedTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  feedSubtitle: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11, lineHeight: 16 },
  savedButton: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  savedButtonActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterControl: { minHeight: 62, borderRadius: 19, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12 },
  filterIcon: { width: 39, height: 39, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  filterCopy: { flex: 1 },
  filterLabel: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  filterHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  controlPressed: { opacity: 0.68 },
  filterList: { paddingHorizontal: 16, paddingTop: 16, gap: 9 },
  filterOption: { minHeight: 76, borderRadius: 21, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 13, paddingVertical: 10 },
  filterOptionActive: { backgroundColor: COLORS.surfaceFocus, borderColor: COLORS.focusBorder },
  filterOptionIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  filterOptionIconActive: { backgroundColor: COLORS.primary },
  filterOptionCopy: { flex: 1 },
  filterOptionTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  filterOptionDescription: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  list: { gap: 10 },
  card: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 15 },
  cardTop: { flexDirection: "row", gap: 10, alignItems: "center" },
  avatarEmoji: { width: 40, fontSize: 25, textAlign: "center" },
  cardCopy: { flex: 1 },
  author: { color: COLORS.primaryText, fontWeight: "900", fontSize: 13.5 },
  meta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  message: { marginTop: 12, color: COLORS.primaryText, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: "row", gap: 9, marginTop: 13 },
  action: { flexDirection: "row", gap: 5, alignItems: "center", backgroundColor: COLORS.softSurface, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  actionActive: { backgroundColor: COLORS.accentBg },
  actionLabel: { color: COLORS.secondaryText, fontSize: 11, fontWeight: "800" },
  textButton: { marginTop: 12, flexDirection: "row", alignSelf: "flex-start", gap: 5, paddingVertical: 6 },
  textButtonLabel: { color: COLORS.primary, fontSize: 12, fontWeight: "800" },
  loader: { paddingVertical: 24 },
  empty: { textAlign: "center", color: COLORS.secondaryText, paddingVertical: 22, fontSize: 12 },
  error: { color: "#A7475B", backgroundColor: "#FFF0F3", padding: 10, borderRadius: 12, fontSize: 12 },
  more: { alignSelf: "center", paddingHorizontal: 18, paddingVertical: 10 },
  moreText: { color: COLORS.primary, fontWeight: "900", fontSize: 12 },
});
