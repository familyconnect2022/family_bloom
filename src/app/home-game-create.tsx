import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../components/layout/BloomKeyboardScreen";
import { FamilyMemberPicker } from "../components/family/FamilyMemberPicker";
import { BloomButton } from "../components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "../components/ui/BloomHeroHeader";
import { BloomCard, BloomPill } from "../components/ui/BloomPageComponents";
import { useBloomToast } from "../components/ui/BloomToast";
import { COLORS } from "../constants/theme";
import { GAME_COPY } from "../data/homeGameQuestionBank";
import { useAuth } from "../context/AuthContext";
import { familyService } from "../services/family/familyService";
import { homeGameService } from "../services/home/homeGameService";
import type { FamilyMember } from "../types";
import type { HomeGameType } from "../types/homeLiving";

const VALID_TYPES = new Set<HomeGameType>(["know_each_other", "guess_person", "memory_owner", "truth_lie", "story_chain", "family_bingo"]);
const needsSubject = (type: HomeGameType) => type === "know_each_other" || type === "guess_person" || type === "truth_lie";

export default function HomeGameCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { user, userProfile, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const raw = typeof params.type === "string" ? params.type : "know_each_other";
  const gameType: HomeGameType = VALID_TYPES.has(raw as HomeGameType) ? raw as HomeGameType : "know_each_other";
  const meta = GAME_COPY[gameType];
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [subjectUids, setSubjectUids] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const uid = user?.uid ?? "";
  const displayName = userProfile?.shortName || userProfile?.displayName || "Bạn";

  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    let live = true;
    setLoading(true);
    familyService.listMembers(activeFamilyId)
      .then(rows => {
        if (!live) return;
        const sorted = [...rows].sort((a, b) => (a.shortName || a.displayName).localeCompare(b.shortName || b.displayName, "vi"));
        setMembers(sorted);
        const all = sorted.slice(0, 50).map(item => item.uid);
        setSelectedUids(all.includes(uid) ? all : [uid, ...all].slice(0, 50));
        setSubjectUids([uid]);
      })
      .catch(() => showToast({ title: "Chưa tải được thành viên", message: "Thử lại khi mạng ổn định hơn.", duration: 3000 }))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [activeFamilyId, showToast, uid]);

  useEffect(() => {
    if (!subjectUids[0] || selectedUids.includes(subjectUids[0])) return;
    setSubjectUids([selectedUids[0] || uid]);
  }, [selectedUids, subjectUids, uid]);

  const selectedMembers = useMemo(() => selectedUids.map(id => members.find(member => member.uid === id)).filter((item): item is FamilyMember => !!item), [members, selectedUids]);
  const subject = useMemo(() => members.find(member => member.uid === subjectUids[0]) ?? null, [members, subjectUids]);

  const subjectLabel = gameType === "guess_person" ? "Người bí mật" : gameType === "truth_lie" ? "Người ra 3 câu" : "Người để cả nhà đoán";
  const subjectHint = gameType === "guess_person"
    ? "Người này sẽ trả lời 3 manh mối. Danh tính chỉ lộ khi mở kết quả."
    : gameType === "truth_lie"
      ? "Mỗi ván một người viết 2 câu thật + 1 câu bịa. Tạo ván khác để đổi lượt."
      : "Người này trả lời 5 câu trước, những người còn lại đoán lựa chọn của họ.";

  const create = async () => {
    if (!activeFamilyId || !uid || saving) return;
    if (gameType !== "family_bingo" && selectedMembers.length < 2) {
      showToast({ title: "Cần thêm người chơi", message: "Chọn ít nhất 2 người trong Nhà Mình.", duration: 2800 });
      return;
    }
    if (needsSubject(gameType) && !subject) {
      showToast({ title: "Chưa chọn người", message: "Chọn một người trong nhóm để bắt đầu ván.", duration: 2800 });
      return;
    }
    setSaving(true);
    try {
      const id = await homeGameService.create({
        familyId: activeFamilyId,
        creatorUid: uid,
        creatorName: displayName,
        gameType,
        participantUids: selectedMembers.map(item => item.uid),
        participantNames: selectedMembers.map(item => item.shortName || item.displayName),
        subjectUid: subject?.uid ?? null,
        subjectName: subject ? (subject.shortName || subject.displayName) : null,
      });
      router.replace(`/home-game/${id}` as never);
    } catch (error) {
      showToast({ title: "Chưa tạo được ván", message: error instanceof Error ? error.message : "Thử lại sau nhé.", duration: 3500 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BloomKeyboardScreen contentContainerStyle={styles.content}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="TẠO VÁN NHÀ MÌNH"
        title={meta.title}
        subtitle={meta.short}
        variant="game"
        onBack={() => router.back()}
        roundedBottom
        compact
      />

      <View style={styles.body}>
        <BloomCard style={styles.ruleCard}>
          <View style={[styles.icon, { backgroundColor: meta.tone }]}><Ionicons name={meta.icon as any} size={26} color={COLORS.primaryText} /></View>
          <View style={styles.ruleCopy}>
            <Text style={styles.ruleTitle}>Chơi theo lượt, không cần online cùng lúc</Text>
            <Text style={styles.ruleText}>Bloom đóng băng danh sách người chơi khi tạo ván. Câu trả lời bí mật chỉ hiện khi người tạo mở kết quả.</Text>
            <View style={styles.pills}><BloomPill icon="time-outline" label={meta.minutes} /><BloomPill icon="leaf-outline" label="Không áp lực điểm số" /></View>
          </View>
        </BloomCard>

        <FamilyMemberPicker
          label="Ai sẽ chơi?"
          hint="Danh sách lấy từ membership thật của Nhà Mình. Có thể chọn tối đa 50 người."
          members={members}
          selectedUids={selectedUids}
          onChange={setSelectedUids}
          mode="multiple"
          currentUid={uid}
          lockedUids={[uid]}
          variant="game"
        />

        {needsSubject(gameType) && (
          <FamilyMemberPicker
            label={subjectLabel}
            hint={subjectHint}
            members={members.filter(member => selectedUids.includes(member.uid))}
            selectedUids={subjectUids}
            onChange={setSubjectUids}
            mode="single"
            currentUid={uid}
            variant="game"
          />
        )}

        {gameType === "memory_owner" && (
          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="images-outline" size={21} color={COLORS.primary} />
            <Text style={styles.noteText}>Bloom sẽ lấy ngẫu nhiên một Moment gia đình gần đây trong nhóm người chơi, giấu tên người đăng và chỉ lộ đáp án khi kết thúc.</Text>
          </BloomCard>
        )}

        {gameType === "family_bingo" && (
          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="grid-outline" size={21} color={COLORS.primary} />
            <Text style={styles.noteText}>Mỗi người có cùng một bảng 3×3 nhưng tự đánh dấu trên thiết bị của mình. Cả nhà có thể chơi xuyên suốt một ngày.</Text>
          </BloomCard>
        )}

        <BloomButton
          title={saving ? "Đang tạo ván…" : loading ? "Đang tải thành viên…" : "Bắt đầu ván"}
          icon="game-controller-outline"
          isLoading={saving}
          disabled={loading || saving || !selectedMembers.length}
          onPress={() => void create()}
        />
      </View>
    </BloomKeyboardScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 36 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },
  ruleCard: { padding: 15, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  icon: { width: 50, height: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  ruleCopy: { flex: 1 },
  ruleTitle: { color: COLORS.primaryText, fontSize: 13.5, lineHeight: 18, fontWeight: "900" },
  ruleText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15.5 },
  pills: { marginTop: 9, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
});
