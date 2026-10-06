import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../../../components/layout/BloomKeyboardScreen";
import { BloomButton } from "../../../components/ui/BloomButtonComponents";
import { BloomHeroHeader } from "../../../components/ui/BloomHeroHeader";
import { BloomCard, BloomPill } from "../../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../../components/ui/BloomToast";
import { COLORS } from "../../../constants/theme";
import { GAME_COPY } from "../../../data/games/homeGameQuestionBank";
import { useAuth } from "../../../context/AuthContext";
import { familyService } from "../../../services/family/familyService";
import { homeGameService } from "../../../services/home/homeGameService";
import { formatHomeGameDeadline, getHomeGamePlayWindow, HOME_GAME_MAX_ACTIVE_PER_TYPE } from "../../../services/home/homeGamePolicy";
import type { FamilyMember } from "../../../types";
import type { HomeGameType } from "../../../types/homeLiving";

const VALID_TYPES = new Set<HomeGameType>(["know_each_other", "guess_person", "memory_owner", "truth_lie", "story_chain", "family_bingo"]);
const subjectGame = (type: HomeGameType) => type === "know_each_other" || type === "guess_person" || type === "truth_lie";

export default function HomeGameCreateScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string }>();
  const { user, userProfile, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const raw = typeof params.type === "string" ? params.type : "know_each_other";
  const gameType: HomeGameType = VALID_TYPES.has(raw as HomeGameType) ? raw as HomeGameType : "know_each_other";
  const meta = GAME_COPY[gameType];
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clockNow, setClockNow] = useState(Date.now());
  const uid = user?.uid ?? "";
  const displayName = userProfile?.shortName || userProfile?.displayName || "Bạn";
  const window = useMemo(() => getHomeGamePlayWindow(clockNow), [clockNow]);

  useEffect(() => {
    const timer = setInterval(() => setClockNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeFamilyId || !uid) return;
    let live = true;
    setLoading(true);
    familyService.listMembers(activeFamilyId)
      .then(rows => {
        if (!live) return;
        const sorted = [...rows]
          .filter(member => !!member.uid)
          .sort((a, b) => (a.shortName || a.displayName).localeCompare(b.shortName || b.displayName, "vi"));
        setMembers(sorted.slice(0, 50));
      })
      .catch(() => showToast({ title: "Chưa tải được thành viên", message: "Thử lại khi mạng ổn định hơn.", duration: 3000 }))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [activeFamilyId, showToast, uid]);

  const create = async () => {
    if (!activeFamilyId || !uid || saving) return;
    const latestWindow = getHomeGamePlayWindow();
    if (!latestWindow.canCreate) {
      showToast({ title: "Hẹn nhà mình sáng mai nhé", message: latestWindow.message || "Trò chơi mới sẽ mở lại từ 6:00 sáng.", duration: 4200 });
      return;
    }
    if (gameType !== "family_bingo" && members.length < 2) {
      showToast({ title: "Nhà mình cần thêm người", message: "Trò này cần ít nhất 2 thành viên thật trong Nhà Mình.", duration: 3000 });
      return;
    }
    setSaving(true);
    try {
      const id = await homeGameService.create({
        familyId: activeFamilyId,
        creatorUid: uid,
        creatorName: displayName,
        gameType,
        participantUids: members.map(item => item.uid),
        participantNames: members.map(item => item.shortName || item.displayName),
      });
      router.replace(`/home-game/${id}` as never);
    } catch (error) {
      showToast({ title: "Chưa tạo được lượt chơi", message: error instanceof Error ? error.message : "Thử lại sau nhé.", duration: 4200 });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BloomKeyboardScreen contentContainerStyle={styles.content}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader
        eyebrow="TẠO LƯỢT NHÀ MÌNH"
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
            <Text style={styles.ruleTitle}>Cả nhà tự động cùng tham gia</Text>
            <Text style={styles.ruleText}>Không cần chọn người chơi. Bloom lấy snapshot membership thật của Nhà Mình khi tạo lượt để mọi người có thể ghé vào lúc thuận tiện.</Text>
            <View style={styles.pills}><BloomPill icon="people-outline" label={`${members.length} thành viên`} /><BloomPill icon="time-outline" label="Tối đa 4 giờ" /></View>
          </View>
        </BloomCard>

        <BloomCard tone="soft" style={styles.policyCard}>
          <Ionicons name={window.canCreate ? "sunny-outline" : "moon-outline"} size={22} color={COLORS.primary} />
          <View style={styles.policyCopy}>
            <Text style={styles.policyTitle}>{window.canCreate ? "Phòng game đang mở" : "Nhà mình nghỉ ngơi nhé 🌙"}</Text>
            <Text style={styles.policyText}>
              {window.canCreate
                ? `Có thể tạo lượt từ 06:00 đến trước 22:00. Mỗi lượt tối đa 4 giờ và lượt này sẽ tự khép lại lúc ${formatHomeGameDeadline(window.endsAtMs)}.`
                : window.message}
            </Text>
            <Text style={styles.policySub}>Mỗi trò có tối đa {HOME_GAME_MAX_ACTIVE_PER_TYPE} lượt đang hoạt động cùng lúc trong một nhà.</Text>
          </View>
        </BloomCard>

        {subjectGame(gameType) && (
          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="shuffle-outline" size={21} color={COLORS.primary} />
            <Text style={styles.noteText}>Nhân vật của lượt được Bloom chọn theo vòng xoay công bằng trong gia đình. Người tạo chỉ là người mở lượt, không mặc định trở thành nhân vật chính.</Text>
          </BloomCard>
        )}

        {gameType === "memory_owner" && (
          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="images-outline" size={21} color={COLORS.primary} />
            <Text style={styles.noteText}>Bloom lấy ngẫu nhiên một Moment gia đình phù hợp, giấu người đăng và chỉ mở đáp án khi lượt hết thời gian.</Text>
          </BloomCard>
        )}

        {gameType === "story_chain" && (
          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="book-outline" size={21} color={COLORS.primary} />
            <Text style={styles.noteText}>Thứ tự được xáo tự động cho cả nhà. Không cần chờ đủ mọi người để “kết thúc” — đến 22:00 lượt sẽ tự khép lại với những đoạn đã có.</Text>
          </BloomCard>
        )}

        {gameType === "family_bingo" && (
          <BloomCard tone="soft" style={styles.noteCard}>
            <Ionicons name="grid-outline" size={21} color={COLORS.primary} />
            <Text style={styles.noteText}>Mỗi người giữ tiến độ riêng trên cùng bảng 3×3. Lượt Bingo cũng tự khép lại khi hết thời gian thay vì chờ đủ thành viên.</Text>
          </BloomCard>
        )}

        <BloomButton
          title={saving ? "Đang tạo lượt…" : loading ? "Đang tải thành viên…" : window.canCreate ? "Bắt đầu cho cả nhà" : "Mở lại lúc 06:00"}
          icon={window.canCreate ? "game-controller-outline" : "moon-outline"}
          isLoading={saving}
          disabled={loading || saving || !members.length || !window.canCreate}
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
  policyCard: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  policyCopy: { flex: 1 },
  policyTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  policyText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.8, lineHeight: 16 },
  policySub: { marginTop: 7, color: COLORS.primary, fontSize: 9.8, lineHeight: 14, fontWeight: "800" },
  noteCard: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
});
