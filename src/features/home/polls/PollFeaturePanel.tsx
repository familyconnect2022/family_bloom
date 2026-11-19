import { BloomScaledInput } from '../../../components/ui/BloomScaledInput';
import { useBloomThemeRevision } from '../../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, View, type TextInput } from 'react-native';
import { BloomText as Text } from '../../../components/ui/BloomText';
import { useAuth } from "@/context/AuthContext";
import { familyService } from "@/services/family/familyService";
import { FamilyMemberPicker } from "@/components/family/FamilyMemberPicker";
import { endOfLocalDay, homePollService, isHomePollExpired } from "@/services/home/homePollService";
import type { FamilyMember } from "@/types";
import type { HomePoll, HomePollChoice } from "@/types/homeLiving";
import { COLORS } from "@/constants/theme";
import { BloomConfirmModal } from "@/components/ui/BloomConfirmModal";
import { useBloomToast } from "@/components/ui/BloomToast";
import { BloomTextInput } from "@/components/ui/BloomInputComponents";
import { BloomNoteCallout } from "@/components/ui/BloomNoteCallout";
import { useA3Theme } from '../../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../../appearance3/compatReactiveStyles';


const addDays = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return endOfLocalDay(d);
};
const dateText = (value: unknown) => {
  const maybe = value as { toDate?: () => Date } | null;
  const d = maybe?.toDate?.();
  return d ? d.toLocaleDateString("vi-VN") : "";
};

type ExpiryMode = "today" | "tomorrow" | "custom";

export function PollFeaturePanel() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);
  const { showToast } = useBloomToast();

  
  const { user, userProfile, activeFamilyId } = useAuth();
  const uid = user?.uid ?? "";
  const myName = userProfile?.shortName || userProfile?.displayName || "Người thân";
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [polls, setPolls] = useState<HomePoll[]>([]);
  const [tab, setTab] = useState<"active" | "done">("active");
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [audience, setAudience] = useState<"family" | "group">("family");
  const [selectedUids, setSelectedUids] = useState<string[]>(uid ? [uid] : []);
  const [anonymous, setAnonymous] = useState(false);
  const [expiryMode, setExpiryMode] = useState<ExpiryMode>("tomorrow");
  const [customDate, setCustomDate] = useState(addDays(2));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [memberLoadError, setMemberLoadError] = useState(false);
  const [voteBusyIds, setVoteBusyIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [localVotes, setLocalVotes] = useState<Record<string, HomePollChoice>>({});
  const [questionInvalid, setQuestionInvalid] = useState(false);
  const [namedResultText, setNamedResultText] = useState<string | null>(null);
  const questionRef = useRef<React.ElementRef<typeof BloomScaledInput>>(null);

  useEffect(() => {
    if (uid) setSelectedUids(current => current.includes(uid) ? current : [uid, ...current]);
  }, [uid]);

  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    void homePollService.cleanupExpired(activeFamilyId, uid).catch(() => {});
  }, [activeFamilyId, uid]);

  useEffect(() => {
    if (!activeFamilyId) return;
    let alive = true;
    familyService.listMembers(activeFamilyId)
      .then(rows => { if (alive) { setMembers(rows); setMemberLoadError(false); } })
      .catch(() => { if (alive) {setMembers([]);setMemberLoadError(true);} });
    return () => { alive = false; };
  }, [activeFamilyId]);

  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    setLoading(true);
    const unsub = homePollService.watchVisible(
      activeFamilyId,
      uid,
      rows => { setPolls(rows); setLoading(false); setError(null); },
      e => { setError(e instanceof Error ? e.message : "Không tải được cuộc bỏ phiếu."); setLoading(false); },
    );
    return unsub;
  }, [activeFamilyId, uid]);

  const active = useMemo(() => polls.filter(p => !isHomePollExpired(p)), [polls]);
  const done = useMemo(() => polls.filter(p => isHomePollExpired(p)), [polls]);

  useEffect(() => {
    if (!activeFamilyId || !uid || !active.length) return;
    let alive = true;
    Promise.all(active.slice(0, 20).map(async poll => [poll.id, await homePollService.getMyBallot(activeFamilyId, poll.id, uid)] as const))
      .then(rows => {
        if (!alive) return;
        setLocalVotes(current => {
          const next = { ...current };
          for (const [pollId, ballot] of rows) {
            if (ballot) next[pollId] = ballot.choice;
          }
          return next;
        });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [activeFamilyId, uid, active]);

  const expiry = () => expiryMode === "today" ? addDays(0) : expiryMode === "tomorrow" ? addDays(1) : endOfLocalDay(customDate);

  const create = useCallback(async () => {
    if (creating) return;
    if (!activeFamilyId || !uid) {setError("Bạn cần đăng nhập và chọn gia đình trước khi tạo cuộc bỏ phiếu.");return;}
    setError(null);
    setFeedback("");
    if (memberLoadError || (audience === "family" && !members.length)) {
      setError("Chưa tải được danh sách thành viên. Hãy vào lại trang và thử lại, không tạo phiếu thiếu người.");
      return;
    }
    if (!question.trim()) {
      setQuestionInvalid(true);
      questionRef.current?.focus();
      return;
    }
    setQuestionInvalid(false);
    const eligible = audience === "family" ? members.map(m => m.uid) : selectedUids;
    if (audience === "group" && new Set(eligible).size < 3) {
      setError("Nhóm bỏ phiếu phải có ít nhất 3 người.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await homePollService.create({
        familyId: activeFamilyId,
        createdByUid: uid,
        createdByName: myName,
        question,
        description,
        audience,
        eligibleUids: eligible,
        anonymous,
        expiresAt: expiry(),
      });
      setQuestion("");
      setDescription("");
      setAudience("family");
      setSelectedUids([uid]);
      setAnonymous(false);
      setExpiryMode("tomorrow");
      setFeedback("Đã mở cuộc bỏ phiếu. Thành viên đủ điều kiện có thể tham gia.");
      showToast({type:"success",title:"Đã mở bỏ phiếu",message:"Mời thành viên trong nhà cùng chọn.",duration:2600});
    } catch (e) {
      const message = e instanceof Error ? e.message : "Không tạo được cuộc bỏ phiếu.";
      setError(message);
      showToast({type:"error",title:"Không mở được bỏ phiếu",message,duration:3800});
    } finally {
      setCreating(false);
    }
  }, [activeFamilyId, uid, creating, audience, members, selectedUids, myName, question, description, anonymous, expiryMode, customDate, memberLoadError, showToast]);

  const vote = async (poll: HomePoll, choice: HomePollChoice) => {
    if (!activeFamilyId || !uid || voteBusyIds.includes(poll.id)) return;
    setVoteBusyIds(current => [...current, poll.id]);
    setLocalVotes(current => ({ ...current, [poll.id]: choice }));
    try {
      await homePollService.vote(activeFamilyId, poll.id, uid, myName, choice);
    } catch (e) {
      setLocalVotes(current => { const next = { ...current }; delete next[poll.id]; return next; });
      const message = e instanceof Error ? e.message : "Không ghi nhận được lựa chọn.";
      setError(message);
      showToast({type:"error",title:"Chưa ghi nhận phiếu",message,duration:3300});
    } finally {setVoteBusyIds(current => current.filter(id => id !== poll.id));}
  };

  const showNamedResults = async (poll: HomePoll) => {
    if (!activeFamilyId || poll.anonymous) return;
    try {
      const ballots = await homePollService.listNamedBallots(activeFamilyId, poll);
      const agree = ballots.filter(b => b.choice === "agree").map(b => b.displayName);
      const disagree = ballots.filter(b => b.choice === "disagree").map(b => b.displayName);
      setNamedResultText(`Đồng ý (${agree.length})${agree.length ? `\n${agree.join(", ")}` : ""}\n\nKhông đồng ý (${disagree.length})${disagree.length ? `\n${disagree.join(", ")}` : ""}`);
    } catch (e) { setError(e instanceof Error ? e.message : "Không tải được danh sách."); }
  };

  const renderPoll = (poll: HomePoll, ended: boolean) => {
    const pct = homePollService.percentages(poll);
    const myChoice = localVotes[poll.id];
    return (
      <View key={poll.id} style={__a3_styles.pollCard}>
        <View style={__a3_styles.pollHeader}>
          <View style={__a3_styles.pollTitleCopy}>
            <Text style={__a3_styles.pollTitle}>{poll.question}</Text>
            <Text style={__a3_styles.pollMeta}>{poll.audience === "family" ? "Cả nhà" : `Nhóm ${poll.eligibleCount} người`} · {poll.anonymous ? "Ẩn danh" : "Hiện tên"} · đến {dateText(poll.expiresAt)}</Text>
          </View>
          <Ionicons name={poll.anonymous ? "eye-off-outline" : "people-outline"} size={20} color={__a3Colors.primary} />
        </View>
        {!!poll.description && <Text style={__a3_styles.description}>{poll.description}</Text>}

        {!ended && (
          <View style={__a3_styles.voteRow}>
            <Pressable disabled={voteBusyIds.includes(poll.id)} onPress={() => void vote(poll, "agree")} style={[__a3_styles.voteButton, myChoice === "agree" && __a3_styles.voteSelected]}>
              <Ionicons name="checkmark-circle-outline" size={18} color={__a3Colors.primaryText} /><Text style={__a3_styles.voteLabel}>Đồng ý</Text>
            </Pressable>
            <Pressable disabled={voteBusyIds.includes(poll.id)} onPress={() => void vote(poll, "disagree")} style={[__a3_styles.voteButton, myChoice === "disagree" && __a3_styles.voteSelected]}>
              <Ionicons name="close-circle-outline" size={18} color={__a3Colors.primaryText} /><Text style={__a3_styles.voteLabel}>Không đồng ý</Text>
            </Pressable>
          </View>
        )}

        <View style={__a3_styles.stats}>
          <View style={__a3_styles.stat}><Text style={__a3_styles.statValue}>{pct.agree}%</Text><Text style={__a3_styles.statLabel}>Đồng ý · {poll.agreeCount}</Text></View>
          <View style={__a3_styles.stat}><Text style={__a3_styles.statValue}>{pct.disagree}%</Text><Text style={__a3_styles.statLabel}>Không đồng ý · {poll.disagreeCount}</Text></View>
          <View style={__a3_styles.stat}><Text style={__a3_styles.statValue}>{pct.noVote}%</Text><Text style={__a3_styles.statLabel}>{ended ? "Không bỏ phiếu" : "Chưa bỏ phiếu"} · {pct.noVoteCount}</Text></View>
        </View>
        <Text style={__a3_styles.denominator}>Tính trên {poll.eligibleCount} người đủ điều kiện từ lúc tạo cuộc bỏ phiếu.</Text>
        {!poll.anonymous && poll.votedCount > 0 && (
          <Pressable onPress={() => void showNamedResults(poll)} style={__a3_styles.resultLink}>
            <Text style={__a3_styles.resultLinkText}>Xem người đã chọn</Text><Ionicons name="chevron-forward" size={15} color={__a3Colors.primary} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={__a3_styles.wrapper}>
      <View style={__a3_styles.composer}>
        <Text style={__a3_styles.heading}>Tạo một quyết định</Text>
        <BloomTextInput
          ref={questionRef}
          label="Điều cả nhà cùng chọn"
          value={question}
          onChangeText={value => { setQuestion(value); if (value.trim()) setQuestionInvalid(false); }}
          maxLength={220}
          placeholder="Cả nhà đi đâu cuối tuần?"
          leftIcon="chatbubble-ellipses-outline"
          error={questionInvalid ? "Viết điều bạn muốn cả nhà cùng quyết định trước nhé." : undefined}
        />
        <BloomTextInput
          label="Nói thêm một chút (không bắt buộc)"
          value={description}
          onChangeText={setDescription}
          maxLength={1200}
          multiline
          placeholder="Thêm lời giải thích…"
          leftIcon="heart-outline"
          helperText="Một câu ngắn, gần gũi sẽ giúp cả nhà chọn dễ hơn."
        />

        <View style={__a3_styles.segmentRow}>
          <Pressable onPress={() => setAudience("family")} style={[__a3_styles.segment, audience === "family" && __a3_styles.segmentActive]}><Text style={__a3_styles.segmentLabel}>Cả nhà</Text></Pressable>
          <Pressable onPress={() => setAudience("group")} style={[__a3_styles.segment, audience === "group" && __a3_styles.segmentActive]}><Text style={__a3_styles.segmentLabel}>Nhóm riêng</Text></Pressable>
        </View>

        {audience === "group" && (
          <FamilyMemberPicker
            label="Nhóm tham gia"
            hint="Tối thiểu 3 người. Người tạo luôn nằm trong nhóm và không thể bỏ chọn."
            members={members}
            selectedUids={selectedUids}
            onChange={setSelectedUids}
            mode="multiple"
            currentUid={uid}
            lockedUids={[uid]}
            variant="poll"
          />
        )}

        <Pressable onPress={() => setAnonymous(v => !v)} style={__a3_styles.toggleRow}>
          <View style={__a3_styles.toggleCopy}><Text style={__a3_styles.toggleTitle}>Bỏ phiếu ẩn danh</Text><Text style={__a3_styles.help}>Chỉ hiện số lượng; kể cả người tạo cũng không thấy ai chọn gì.</Text></View>
          <View style={[__a3_styles.switchTrack, anonymous && __a3_styles.switchTrackOn]}><View style={[__a3_styles.switchKnob, anonymous && __a3_styles.switchKnobOn]} /></View>
        </Pressable>

        <Text style={__a3_styles.label}>Ngày hết hạn</Text>
        <View style={__a3_styles.expiryRow}>
          {([['today','Hôm nay'],['tomorrow','Ngày mai'],['custom','Chọn ngày']] as Array<[ExpiryMode,string]>).map(([key,label]) => (
            <Pressable key={key} onPress={() => { setExpiryMode(key); if (key === "custom") setShowDatePicker(true); }} style={[__a3_styles.expiryChip, expiryMode === key && __a3_styles.expiryChipActive]}>
              <Text style={__a3_styles.expiryText}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {expiryMode === "custom" && <Text style={__a3_styles.help}>Đã chọn: {customDate.toLocaleDateString("vi-VN")}</Text>}
        {showDatePicker && (
          <DateTimePicker
            value={customDate}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, date) => { if (Platform.OS !== "ios") setShowDatePicker(false); if (date) setCustomDate(date); }}
          />
        )}

        {!!error && <Text accessibilityRole="alert" style={__a3_styles.error}>{error}</Text>}
        <Pressable disabled={creating} onPress={() => void create()} style={[__a3_styles.createButton, creating && __a3_styles.disabled]}>
          {creating ? <ActivityIndicator color={__a3Colors.white} /> : <><Ionicons name="checkmark-done" size={18} color={__a3Colors.white} /><Text style={__a3_styles.createText}>Mở bỏ phiếu</Text></>}
        </Pressable>
      </View>

      {!!error && <Text accessibilityRole="alert" style={__a3_styles.error}>{error}</Text>}
      {!!feedback && <Text accessibilityRole="alert" style={__a3_styles.help}>{feedback}</Text>}
      <View style={__a3_styles.tabs}>
        <Pressable onPress={() => setTab("active")} style={[__a3_styles.tab, tab === "active" && __a3_styles.tabActive]}><Text style={[__a3_styles.tabText, tab === "active" && __a3_styles.tabTextActive]}>Đang diễn ra · {active.length}</Text></Pressable>
        <Pressable onPress={() => setTab("done")} style={[__a3_styles.tab, tab === "done" && __a3_styles.tabActive]}><Text style={[__a3_styles.tabText, tab === "done" && __a3_styles.tabTextActive]}>Đã kết thúc · {done.length}</Text></Pressable>
      </View>

      {loading ? <ActivityIndicator color={__a3Colors.primary} style={{ paddingVertical: 22 }} /> : (
        <View style={__a3_styles.list}>
          {(tab === "active" ? active : done).map(p => renderPoll(p, tab === "done"))}
          {!(tab === "active" ? active : done).length && <Text style={__a3_styles.empty}>{tab === "active" ? "Chưa có cuộc bỏ phiếu đang diễn ra." : "Chưa có cuộc bỏ phiếu đã kết thúc."}</Text>}
        </View>
      )}
      <BloomNoteCallout title="Kết quả vẫn ở lại thêm 30 ngày" icon="time-outline" tone="violet">
        Sau khi kết thúc, cả nhà vẫn có thời gian xem lại kết quả trước khi Bloom dọn cuộc bình chọn đi.
      </BloomNoteCallout>

      <BloomConfirmModal
        visible={!!namedResultText}
        title="Ai đã chọn?"
        message={namedResultText || ""}
        cancelLabel="Đóng"
        icon="people-outline"
        onCancel={() => setNamedResultText(null)}
      />
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  wrapper: { marginTop: 18, gap: 14, paddingBottom: 24 },
  composer: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 15, gap: 12 },
  heading: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  titleInput: { minHeight: 48, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, color: COLORS.primaryText, fontSize: 14 },
  inputInvalid: { borderColor: COLORS.primary, borderWidth: 1.5, backgroundColor: COLORS.surface },
  validationCallout: { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 13, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 9 },
  validationText: { flex: 1, color: COLORS.primaryText, fontSize: 10.7, lineHeight: 15.5, fontWeight: "700" },
  descriptionInput: { minHeight: 88, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, color: COLORS.primaryText, textAlignVertical: "top", fontSize: 13.5 },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 13, backgroundColor: COLORS.softSurface },
  segmentActive: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.primary },
  segmentLabel: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  toggleRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 3 },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  help: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  switchTrack: { width: 44, height: 26, borderRadius: 99, backgroundColor: COLORS.softSurface, padding: 3 },
  switchTrackOn: { backgroundColor: COLORS.primary },
  switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.surface },
  switchKnobOn: { alignSelf: "flex-end" },
  label: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  expiryRow: { flexDirection: "row", gap: 7 },
  expiryChip: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.softSurface },
  expiryChipActive: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.primary },
  expiryText: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "800" },
  createButton: { minHeight: 46, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  createText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
  disabled: { opacity: 0.55 },
  error: { color: COLORS.primary, backgroundColor: COLORS.surface, padding: 10, borderRadius: 12, fontSize: 12 },
  tabs: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 14, backgroundColor: COLORS.softSurface },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "900" },
  tabTextActive: { color: COLORS.white },
  list: { gap: 10 },
  pollCard: { borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, padding: 15 },
  pollHeader: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  pollTitleCopy: { flex: 1 },
  pollTitle: { color: COLORS.primaryText, fontSize: 14.5, lineHeight: 20, fontWeight: "900" },
  pollMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  description: { marginTop: 10, color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18 },
  voteRow: { flexDirection: "row", gap: 8, marginTop: 13 },
  voteButton: { flex: 1, minHeight: 42, borderRadius: 13, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  voteSelected: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.primary },
  voteLabel: { color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 7, marginTop: 13 },
  stat: { flex: 1, backgroundColor: COLORS.softSurface, borderRadius: 13, padding: 9, minHeight: 64 },
  statValue: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  statLabel: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13 },
  denominator: { marginTop: 8, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  resultLink: { marginTop: 8, flexDirection: "row", alignItems: "center", alignSelf: "flex-start" },
  resultLinkText: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  empty: { textAlign: "center", color: COLORS.secondaryText, paddingVertical: 22, fontSize: 12 },
  retention: { textAlign: "center", color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
}));
