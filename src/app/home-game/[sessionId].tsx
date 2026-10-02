import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { BloomButton } from "../../components/ui/BloomButtonComponents";
import { BloomConfirmModal } from "../../components/ui/BloomConfirmModal";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomTextInput } from "../../components/ui/BloomInputComponents";
import { BloomCard, BloomEmptyState, BloomPill, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../components/ui/BloomToast";
import { COLORS } from "../../constants/theme";
import { GAME_COPY, TRUTH_LIE_IDEAS, getBingoCell } from "../../data/homeGameQuestionBank";
import { useAuth } from "../../context/AuthContext";
import { familyService } from "../../services/family/familyService";
import { homeGameService } from "../../services/home/homeGameService";
import { momentsService } from "../../services/moments/momentsService";
import type { FamilyMember } from "../../types";
import type { HomeGameResponse, HomeGameSecret, HomeGameSession } from "../../types/homeLiving";

const nameOf = (member: FamilyMember) => member.shortName || member.displayName || "Thành viên";

function OptionButton({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && !disabled && styles.pressed, disabled && styles.disabled]}>
      <View style={[styles.optionDot, selected && styles.optionDotSelected]}>{selected ? <Ionicons name="checkmark" size={13} color={COLORS.white} /> : null}</View>
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const bingoWon = (selected: string[], board: string[]) => {
  const s = new Set(selected);
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  return lines.some(line => line.every(index => board[index] && s.has(board[index])));
};

export default function HomeGameDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string }>();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : "";
  const { user, userProfile, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const uid = user?.uid ?? "";
  const displayName = userProfile?.shortName || userProfile?.displayName || "Bạn";
  const [session, setSession] = useState<HomeGameSession | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [publicResponses, setPublicResponses] = useState<HomeGameResponse[]>([]);
  const [allResponses, setAllResponses] = useState<HomeGameResponse[]>([]);
  const [myResponse, setMyResponse] = useState<HomeGameResponse | null>(null);
  const [secret, setSecret] = useState<HomeGameSecret | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [guessUid, setGuessUid] = useState<string | null>(null);
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [truthLines, setTruthLines] = useState(["", "", ""]);
  const [truthLieIndex, setTruthLieIndex] = useState<number | null>(null);
  const [storyLine, setStoryLine] = useState("");
  const [bingoSelected, setBingoSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedStory, setSavedStory] = useState(false);

  const reloadMine = useCallback(async () => {
    if (!activeFamilyId || !sessionId || !uid) return;
    const mine = await homeGameService.getMyResponse(activeFamilyId, sessionId, uid).catch(() => null);
    setMyResponse(mine);
    if (mine?.selectedIds) setBingoSelected(mine.selectedIds);
  }, [activeFamilyId, sessionId, uid]);

  useEffect(() => {
    if (!activeFamilyId || !sessionId || !uid) return;
    const stop = homeGameService.watchSession(activeFamilyId, sessionId, setSession, () => {
      showToast({ title: "Chưa tải được ván", message: "Kiểm tra kết nối rồi thử lại.", duration: 2800 });
    });
    return stop;
  }, [activeFamilyId, sessionId, showToast, uid]);

  useEffect(() => {
    if (!activeFamilyId || !sessionId || !uid) return;
    void reloadMine();
    void familyService.listMembers(activeFamilyId).then(setMembers).catch(() => undefined);
    void homeGameService.getSecret(activeFamilyId, sessionId).then(setSecret).catch(() => setSecret(null));
    const stop = homeGameService.watchPublicResponses(activeFamilyId, sessionId, setPublicResponses, () => undefined);
    return stop;
  }, [activeFamilyId, reloadMine, sessionId, uid]);

  useEffect(() => {
    if (!activeFamilyId || !sessionId || !session || session.status === "playing") {
      setAllResponses([]);
      return;
    }
    void Promise.all([
      homeGameService.listResponses(activeFamilyId, sessionId),
      homeGameService.getSecret(activeFamilyId, sessionId),
    ]).then(([rows, sec]) => {
      setAllResponses(rows);
      setSecret(sec);
    }).catch(() => undefined);
  }, [activeFamilyId, session?.status, sessionId]);

  const meta = session ? GAME_COPY[session.gameType] : null;
  const isCreator = session?.createdByUid === uid;
  const subjectPublic = session?.subjectUid === uid;
  const secretSubject = secret?.subjectUid === uid;
  const subjectResponse = useMemo(() => {
    const subjectUid = session?.subjectUid || secret?.subjectUid;
    return publicResponses.find(item => item.uid === subjectUid) || allResponses.find(item => item.uid === subjectUid) || null;
  }, [allResponses, publicResponses, secret?.subjectUid, session?.subjectUid]);
  const revealRows = session?.status === "playing" ? publicResponses : allResponses;
  const memberByUid = useMemo(() => new Map(members.map(member => [member.uid, member])), [members]);
  const participantMembers = useMemo(() => session ? session.participantUids.map(id => memberByUid.get(id)).filter((item): item is FamilyMember => !!item) : [], [memberByUid, session]);

  const showError = (error: unknown, title = "Chưa lưu được") => showToast({ title, message: error instanceof Error ? error.message : "Thử lại sau nhé.", duration: 3200 });

  const submitAnswers = async (publicFlag = false) => {
    if (!activeFamilyId || !session || !uid || busy) return;
    if (answers.length !== session.prompts.length || answers.some(value => !value)) {
      showToast({ title: "Còn câu chưa chọn", message: "Trả lời đủ các câu rồi gửi nhé.", duration: 2500 });
      return;
    }
    setBusy(true);
    try {
      await homeGameService.submitResponse({ familyId: activeFamilyId, sessionId: session.id, uid, displayName, answers, public: publicFlag });
      await reloadMine();
      showToast({ title: "Đã gửi câu trả lời", message: "Bloom giữ câu trả lời đúng trạng thái của ván.", duration: 2200 });
    } catch (e) { showError(e); } finally { setBusy(false); }
  };

  const submitGuess = async () => {
    if (!activeFamilyId || !session || !uid || busy) return;
    if (!guessUid) {
      showToast({ title: "Chọn một người", message: "Bạn nghĩ đáp án là ai?", duration: 2200 });
      return;
    }
    const member = memberByUid.get(guessUid);
    setBusy(true);
    try {
      await homeGameService.submitResponse({ familyId: activeFamilyId, sessionId: session.id, uid, displayName, guessUid, guessName: member ? nameOf(member) : "Thành viên", public: false });
      await reloadMine();
    } catch (e) { showError(e); } finally { setBusy(false); }
  };

  const submitTruth = async () => {
    if (!activeFamilyId || !session || !uid || busy) return;
    if (truthLines.some(line => !line.trim()) || truthLieIndex == null) {
      showToast({ title: "Chưa đủ 3 câu", message: "Viết đủ ba câu và đánh dấu câu bịa trước khi gửi.", duration: 2500 });
      return;
    }
    setBusy(true);
    try {
      await homeGameService.submitTruthStatements({ familyId: activeFamilyId, sessionId: session.id, uid, displayName, textLines: truthLines, public: true, lieIndex: truthLieIndex });
      await reloadMine();
      setSecret(await homeGameService.getSecret(activeFamilyId, session.id));
    } catch (e) { showError(e); } finally { setBusy(false); }
  };

  const submitTruthGuess = async () => {
    if (!activeFamilyId || !session || !uid || choiceIndex == null || busy) return;
    setBusy(true);
    try {
      await homeGameService.submitResponse({ familyId: activeFamilyId, sessionId: session.id, uid, displayName, choiceIndex, public: false });
      await reloadMine();
    } catch (e) { showError(e); } finally { setBusy(false); }
  };

  const submitStory = async () => {
    if (!activeFamilyId || !session || !uid || !storyLine.trim() || busy) return;
    setBusy(true);
    try {
      await homeGameService.submitResponse({ familyId: activeFamilyId, sessionId: session.id, uid, displayName, textLines: [storyLine.trim()], public: true });
      setStoryLine("");
      await reloadMine();
    } catch (e) { showError(e); } finally { setBusy(false); }
  };

  const toggleBingo = async (cellId: string) => {
    if (!activeFamilyId || !session || !uid || busy) return;
    const next = bingoSelected.includes(cellId) ? bingoSelected.filter(id => id !== cellId) : [...bingoSelected, cellId];
    setBingoSelected(next);
    try {
      await homeGameService.submitResponse({ familyId: activeFamilyId, sessionId: session.id, uid, displayName, selectedIds: next, public: true });
      await reloadMine();
    } catch (e) {
      setBingoSelected(bingoSelected);
      showError(e);
    }
  };

  const reveal = async () => {
    if (!activeFamilyId || !session || !uid || busy) return;
    setBusy(true);
    try {
      await homeGameService.setStatus(activeFamilyId, session.id, uid, "revealed");
    } catch (e) { showError(e, "Chưa mở được kết quả"); } finally { setBusy(false); }
  };

  const saveStoryMoment = async () => {
    if (!activeFamilyId || !session || !user || !userProfile || savedStory || busy) return;
    const ordered = session.turnUids.map(turnUid => publicResponses.find(row => row.uid === turnUid)).filter((row): row is HomeGameResponse => !!row);
    if (ordered.length !== session.turnUids.length) return;
    const starter = session.prompts[0]?.prompt || "Câu chuyện Nhà Mình";
    const caption = [`📖 Nối chuyện Nhà Mình`, starter, ...ordered.map(row => `${row.displayName}: ${row.textLines[0] || ""}`)].join("\n\n").slice(0, 4000);
    setBusy(true);
    try {
      await momentsService.create(activeFamilyId, { uid: user.uid, displayName: displayName, avatarUrl: userProfile.avatarUrl || undefined }, { caption, media: [], personIds: [], timelineAudience: "family", notifyFamily: false });
      setSavedStory(true);
      showToast({ title: "Đã lưu thành Moment", message: "Câu chuyện này giờ nằm trong Kỷ niệm của Nhà Mình.", duration: 2800 });
    } catch (e) { showError(e, "Chưa lưu được Moment"); } finally { setBusy(false); }
  };

  const remove = async () => {
    if (!activeFamilyId || !session || !uid || busy) return;
    setBusy(true);
    try {
      await homeGameService.delete(activeFamilyId, session.id, uid);
      router.back();
    } catch (e) { showError(e, "Chưa xóa được ván"); } finally { setBusy(false); setConfirmDelete(false); }
  };

  if (!session || !meta) {
    return (
      <BloomKeyboardScreen contentContainerStyle={styles.content}>
        <StatusBar translucent backgroundColor="transparent" style="dark" />
        <BloomHeroHeader eyebrow="TRÒ CHƠI NHÀ MÌNH" title="Đang mở ván…" subtitle="Bloom đang lấy trạng thái mới nhất của ván." variant="game" onBack={() => router.back()} roundedBottom compact />
        <View style={styles.body}><BloomEmptyState icon="hourglass-outline" title="Chờ một chút" description="Nếu ván vừa được tạo, dữ liệu có thể cần một nhịp để đồng bộ." /></View>
      </BloomKeyboardScreen>
    );
  }

  const progress = `${session.submittedUids.length}/${session.participantUids.length}`;
  const revealReady = session.gameType === "know_each_other"
    ? !!session.subjectUid && session.submittedUids.includes(session.subjectUid)
    : session.gameType === "guess_person"
      ? !!secret?.subjectUid && session.submittedUids.includes(secret.subjectUid)
      : session.gameType === "truth_lie"
        ? !!session.subjectUid && session.submittedUids.includes(session.subjectUid)
        : session.gameType === "story_chain"
          ? session.turnUids.length > 0 && session.turnUids.every(turnUid => session.submittedUids.includes(turnUid))
          : session.submittedUids.length >= 1;
  const canReveal = isCreator && session.status === "playing" && revealReady;

  const renderChoicePrompts = (targetLabel: string, publicFlag: boolean) => (
    <View style={styles.sectionStack}>
      <BloomSectionHeader title={targetLabel} subtitle={`${session.prompts.length} câu · chọn một đáp án cho mỗi câu`} />
      {session.prompts.map((prompt, index) => (
        <BloomCard key={prompt.id} style={styles.questionCard}>
          <Text style={styles.questionCategory}>{prompt.category.toLocaleUpperCase("vi")}</Text>
          <Text style={styles.question}>{index + 1}. {prompt.prompt}</Text>
          <View style={styles.options}>{prompt.options.map(option => <OptionButton key={option} label={option} selected={answers[index] === option} onPress={() => setAnswers(current => { const next = [...current]; next[index] = option; return next; })} />)}</View>
        </BloomCard>
      ))}
      <BloomButton title={busy ? "Đang gửi…" : "Gửi câu trả lời"} isLoading={busy} onPress={() => void submitAnswers(publicFlag)} />
    </View>
  );

  const renderMemberGuess = (title: string, excludeUid?: string | null) => (
    <View style={styles.sectionStack}>
      <BloomSectionHeader title={title} subtitle="Chọn một người trong đúng nhóm tham gia ván này" />
      <View style={styles.memberGrid}>
        {participantMembers.filter(member => member.uid !== excludeUid).map(member => {
          const selected = guessUid === member.uid;
          return (
            <Pressable key={member.uid} onPress={() => setGuessUid(member.uid)} style={[styles.memberChoice, selected && styles.memberChoiceSelected]}>
              <View style={[styles.memberAvatar, selected && styles.memberAvatarSelected]}><Text style={[styles.memberInitial, selected && styles.memberInitialSelected]}>{nameOf(member).slice(0,1).toLocaleUpperCase("vi")}</Text></View>
              <Text style={styles.memberChoiceName} numberOfLines={2}>{nameOf(member)}{member.uid === uid ? " · Bạn" : ""}</Text>
              {selected ? <Ionicons name="checkmark-circle" size={18} color={COLORS.primary} /> : null}
            </Pressable>
          );
        })}
      </View>
      <BloomButton title={busy ? "Đang gửi…" : "Chốt lựa chọn"} isLoading={busy} disabled={!guessUid} onPress={() => void submitGuess()} />
    </View>
  );

  const knowResult = () => {
    const rows = allResponses.length ? allResponses : revealRows;
    const truth = rows.find(row => row.uid === session.subjectUid);
    if (!truth) return <BloomEmptyState icon="hourglass-outline" title="Chưa có đáp án gốc" description="Người được chọn cần trả lời trước khi kết quả có ý nghĩa." />;
    const scores = rows.filter(row => row.uid !== session.subjectUid).map(row => ({ row, score: row.answers.reduce((sum, value, index) => sum + (value === truth.answers[index] ? 1 : 0), 0) })).sort((a,b) => b.score - a.score);
    return <View style={styles.sectionStack}><BloomSectionHeader title={`Đáp án của ${session.subjectName}`} subtitle="Điểm chỉ để vui — điều đáng nhớ là những chỗ cả nhà đoán khác nhau." />{session.prompts.map((prompt,index)=><BloomCard key={prompt.id} style={styles.resultCard}><Text style={styles.resultPrompt}>{prompt.prompt}</Text><Text style={styles.resultAnswer}>{truth.answers[index] || "—"}</Text></BloomCard>)}<BloomSectionHeader title="Ai đoán gần nhất?" />{scores.map(({row,score})=><BloomCard key={row.uid} style={styles.scoreRow}><Text style={styles.scoreName}>{row.displayName}</Text><Text style={styles.scoreValue}>{score}/{session.prompts.length}</Text></BloomCard>)}</View>;
  };

  const renderGame = () => {
    if (session.gameType === "know_each_other") {
      if (session.status !== "playing") return knowResult();
      if (myResponse) return <BloomEmptyState icon="checkmark-circle-outline" title="Bạn đã trả lời" description={isCreator ? "Khi đủ vui, bạn có thể mở kết quả cho cả nhà." : "Đợi người tạo ván mở kết quả nhé."} />;
      return renderChoicePrompts(subjectPublic ? "Trả lời thật về bạn" : `Bạn nghĩ ${session.subjectName} sẽ chọn gì?`, false);
    }

    if (session.gameType === "guess_person") {
      if (session.status !== "playing") {
        return <View style={styles.sectionStack}><BloomSectionHeader title="Người bí mật là…" /><BloomCard style={styles.revealCard}><Ionicons name="person-circle" size={46} color={COLORS.primary} /><Text style={styles.revealTitle}>{secret?.subjectName || "Một người trong nhà"}</Text><Text style={styles.revealSub}>{allResponses.filter(row => row.guessUid === secret?.subjectUid).length}/{Math.max(1, allResponses.filter(row => row.uid !== secret?.subjectUid).length)} người đoán đúng</Text></BloomCard></View>;
      }
      if (secretSubject) {
        if (myResponse) return <BloomEmptyState icon="checkmark-circle-outline" title="Ba manh mối đã sẵn sàng" description="Cả nhà đang nhìn thấy câu trả lời nhưng chưa thấy tên bạn." />;
        return renderChoicePrompts("Bạn đang là người bí mật", true);
      }
      if (!subjectResponse) return <BloomEmptyState icon="eye-off-outline" title="Người bí mật đang chuẩn bị manh mối" description="Khi họ trả lời xong 3 câu, phần đoán người sẽ tự hiện ở đây." />;
      if (myResponse) return <BloomEmptyState icon="checkmark-circle-outline" title="Bạn đã chốt đáp án" description="Đợi người tạo ván mở danh tính nhé." />;
      return <View style={styles.sectionStack}><BloomSectionHeader title="Ba manh mối" subtitle="Các câu trả lời này đến từ chính người bí mật" />{session.prompts.map((prompt,index)=><BloomCard key={prompt.id} style={styles.resultCard}><Text style={styles.resultPrompt}>{prompt.prompt}</Text><Text style={styles.resultAnswer}>{subjectResponse.answers[index] || "…"}</Text></BloomCard>)}{renderMemberGuess("Bạn nghĩ đó là ai?")}</View>;
    }

    if (session.gameType === "memory_owner") {
      if (session.status !== "playing") {
        return <View style={styles.sectionStack}><BloomSectionHeader title="Ký ức này thuộc về…" /><BloomCard style={styles.revealCard}><Ionicons name="images" size={42} color={COLORS.primary} /><Text style={styles.revealTitle}>{secret?.memoryAuthorName || "Một người thân"}</Text><Text style={styles.revealSub}>{allResponses.filter(row => row.guessUid === secret?.memoryAuthorUid).length}/{Math.max(1, allResponses.length)} người đoán đúng</Text></BloomCard></View>;
      }
      if (myResponse) return <BloomEmptyState icon="checkmark-circle-outline" title="Bạn đã đoán" description="Đợi người tạo ván mở tên người đã lưu Moment này." />;
      return <View style={styles.sectionStack}><BloomSectionHeader title="Một Moment đã giấu tên" subtitle="Bloom chỉ dùng Moment gia đình trong nhóm người chơi" /><BloomCard style={styles.memoryCard}>{session.memoryPreview.mediaUrl ? <Image source={{ uri: session.memoryPreview.mediaUrl }} style={styles.memoryImage} contentFit="cover" /> : <View style={styles.memoryPlaceholder}><Ionicons name="images-outline" size={34} color={COLORS.primary} /></View>}<Text style={styles.memoryCaption}>{session.memoryPreview.caption}</Text></BloomCard>{renderMemberGuess("Ai đã lưu ký ức này?")}</View>;
    }

    if (session.gameType === "truth_lie") {
      if (session.status !== "playing") {
        const statements = subjectResponse?.textLines ?? [];
        return <View style={styles.sectionStack}><BloomSectionHeader title="Câu bịa là…" subtitle={`Ván của ${session.subjectName}`} />{statements.map((line,index)=><BloomCard key={index} style={[styles.resultCard, secret?.lieIndex === index && styles.lieCard]}><Text style={styles.statementIndex}>CÂU {index + 1}</Text><Text style={styles.resultPrompt}>{line}</Text>{secret?.lieIndex === index ? <Text style={styles.lieLabel}>CÂU BỊA ✨</Text> : <Text style={styles.truthLabel}>Câu thật</Text>}</BloomCard>)}</View>;
      }
      if (subjectPublic) {
        if (myResponse) return <BloomEmptyState icon="checkmark-circle-outline" title="Ba câu đã gửi" description="Cả nhà đang đoán xem câu nào là bịa." />;
        return <View style={styles.sectionStack}><BloomSectionHeader title="Viết 2 thật · 1 bịa" subtitle="Đừng làm câu bịa quá lộ nhé" />{truthLines.map((value,index)=><View key={index} style={styles.truthInputBlock}><BloomTextInput label={`Câu ${index + 1}`} value={value} multiline maxLength={400} onChangeText={text=>setTruthLines(current=>current.map((item,i)=>i===index?text:item))} placeholder={TRUTH_LIE_IDEAS[(index * 13 + session.id.length) % TRUTH_LIE_IDEAS.length]} /><Pressable onPress={()=>setTruthLieIndex(index)} style={[styles.liePick, truthLieIndex===index && styles.liePickActive]}><Ionicons name={truthLieIndex===index?"radio-button-on":"radio-button-off"} size={18} color={truthLieIndex===index?COLORS.primary:COLORS.secondaryText}/><Text style={styles.liePickText}>Đây là câu bịa</Text></Pressable></View>)}<BloomButton title="Gửi 3 câu" isLoading={busy} onPress={()=>void submitTruth()} /></View>;
      }
      if (!subjectResponse) return <BloomEmptyState icon="create-outline" title={`${session.subjectName} đang nghĩ 3 câu`} description="Khi ba câu xuất hiện, bạn sẽ chọn câu mình nghĩ là bịa." />;
      if (myResponse) return <BloomEmptyState icon="checkmark-circle-outline" title="Bạn đã đoán" description="Chờ mở kết quả để xem mình có bắt bài được không." />;
      return <View style={styles.sectionStack}><BloomSectionHeader title={`Câu nào của ${session.subjectName} là bịa?`} />{subjectResponse.textLines.map((line,index)=><Pressable key={index} onPress={()=>setChoiceIndex(index)} style={[styles.statementCard, choiceIndex===index && styles.statementCardSelected]}><View style={[styles.statementNumber, choiceIndex===index && styles.statementNumberSelected]}><Text style={[styles.statementNumberText, choiceIndex===index && styles.statementNumberTextSelected]}>{index+1}</Text></View><Text style={styles.statementText}>{line}</Text></Pressable>)}<BloomButton title="Chốt câu bịa" disabled={choiceIndex==null} isLoading={busy} onPress={()=>void submitTruthGuess()} /></View>;
    }

    if (session.gameType === "story_chain") {
      const ordered = session.turnUids.map(turnUid => publicResponses.find(row => row.uid === turnUid)).filter((row): row is HomeGameResponse => !!row);
      const nextIndex = session.turnUids.findIndex(turnUid => !publicResponses.some(row => row.uid === turnUid));
      const nextUid = nextIndex >= 0 ? session.turnUids[nextIndex] : null;
      const nextName = nextIndex >= 0 ? session.turnNames[nextIndex] : null;
      const finished = ordered.length === session.turnUids.length;
      if (session.status !== "playing") {
        return <View style={styles.sectionStack}><BloomSectionHeader title="Câu chuyện hoàn chỉnh" subtitle="Mỗi người chỉ thêm một đoạn, nhưng cả nhà cùng tạo ra kết thúc." /><BloomCard style={styles.storyFull}><Text style={styles.storyStarter}>{session.prompts[0]?.prompt}</Text>{ordered.map((row,index)=><View key={row.uid} style={styles.storyLineRow}><Text style={styles.storyLineName}>{index+1}. {row.displayName}</Text><Text style={styles.storyLineText}>{row.textLines[0]}</Text></View>)}</BloomCard>{isCreator&&<BloomButton title={savedStory?"Đã lưu thành Moment":"Lưu thành Moment"} variant={savedStory?"positive":"outline"} disabled={savedStory} icon="images-outline" onPress={()=>void saveStoryMoment()} />}</View>;
      }
      return <View style={styles.sectionStack}><BloomSectionHeader title="Mở đầu" /><BloomCard style={styles.storyStarterCard}><Text style={styles.storyStarter}>{session.prompts[0]?.prompt}</Text></BloomCard>{ordered.length>0&&<BloomCard tone="soft" style={styles.lastLineCard}><Text style={styles.lastLineKicker}>CÂU GẦN NHẤT · {ordered[ordered.length-1].displayName}</Text><Text style={styles.lastLineText}>{ordered[ordered.length-1].textLines[0]}</Text></BloomCard>}{finished?<BloomEmptyState icon="book-outline" title="Câu chuyện đã đủ lượt" description={isCreator?"Bạn có thể mở toàn bộ câu chuyện ngay bây giờ.":"Đợi người tạo ván mở toàn bộ câu chuyện."}/>:nextUid===uid?<><BloomTextInput label="Tới lượt bạn" value={storyLine} onChangeText={setStoryLine} multiline maxLength={220} placeholder="Thêm một hoặc hai câu để nối tiếp…" /><BloomButton title="Gửi câu của tôi" disabled={!storyLine.trim()} isLoading={busy} onPress={()=>void submitStory()} /></>:<BloomEmptyState icon="hourglass-outline" title={`Đang tới lượt ${nextName}`} description="Bạn sẽ được báo ngay trong ván khi tới lượt mình." />}</View>;
    }

    if (session.gameType === "family_bingo") {
      const won = bingoWon(bingoSelected, session.bingoCellIds);
      return <View style={styles.sectionStack}><BloomSectionHeader title="Bingo 3×3" subtitle="Chạm khi khoảnh khắc đó thật sự xảy ra trong nhà" /><View style={styles.bingoGrid}>{session.bingoCellIds.map(cellId=>{const selected=bingoSelected.includes(cellId);return <Pressable key={cellId} onPress={()=>void toggleBingo(cellId)} style={[styles.bingoCell, selected&&styles.bingoCellSelected]}><Text style={[styles.bingoText, selected&&styles.bingoTextSelected]}>{getBingoCell(cellId)}</Text>{selected?<Ionicons name="checkmark-circle" size={20} color={COLORS.primary}/>:null}</Pressable>})}</View><BloomCard style={[styles.bingoStatus, won&&styles.bingoWon]}><Ionicons name={won?"trophy":"flower-outline"} size={26} color={won?"#B97917":COLORS.primary}/><View style={{flex:1}}><Text style={styles.bingoStatusTitle}>{won?"BINGO! 🌷":`${bingoSelected.length}/9 ô đã đánh dấu`}</Text><Text style={styles.bingoStatusText}>{won?"Một hàng đã đầy. Chụp lại khoảnh khắc hoặc tiếp tục lấp cả bảng nhé.":"Mỗi người giữ tiến độ riêng, cả nhà cùng chơi trên một bảng."}</Text></View></BloomCard></View>;
    }

    return null;
  };

  return (
    <>
      <BloomKeyboardScreen contentContainerStyle={styles.content}>
        <StatusBar translucent backgroundColor="transparent" style="dark" />
        <BloomHeroHeader eyebrow="TRÒ CHƠI NHÀ MÌNH" title={session.title} subtitle={`${session.participantUids.length} người · ${progress} đã tham gia`} variant="game" onBack={() => router.back()} roundedBottom compact />
        <View style={styles.body}>
          <View style={styles.topPills}><BloomPill icon="people-outline" label={`${session.participantUids.length} người`} /><BloomPill icon={session.status==="playing"?"play-circle-outline":"sparkles-outline"} label={session.status==="playing"?"Đang chơi":"Đã mở kết quả"} /><BloomPill icon="person-outline" label={`Tạo bởi ${session.createdByName}`} /></View>

          {renderGame()}

          {canReveal && session.gameType !== "family_bingo" && (
            <BloomCard style={styles.hostCard}>
              <View style={styles.hostIcon}><Ionicons name="key-outline" size={21} color={COLORS.primary} /></View>
              <View style={styles.hostCopy}><Text style={styles.hostTitle}>Bạn là người tạo ván</Text><Text style={styles.hostText}>Mở kết quả khi đã đủ vui. Người chưa trả lời vẫn có thể xem đáp án sau khi mở.</Text></View>
              <BloomButton title="Mở kết quả" customStyle={styles.hostButton} onPress={()=>void reveal()} />
            </BloomCard>
          )}

          {isCreator && (
            <Pressable onPress={()=>setConfirmDelete(true)} style={styles.deleteLink}><Ionicons name="trash-outline" size={16} color={COLORS.destructive}/><Text style={styles.deleteText}>Xóa ván này</Text></Pressable>
          )}
        </View>
      </BloomKeyboardScreen>
      <BloomConfirmModal visible={confirmDelete} title="Xóa ván này?" message="Câu trả lời trong ván sẽ bị xóa cùng. Những Moment đã lưu trước đó không bị ảnh hưởng." confirmLabel="Xóa ván" cancelLabel="Giữ lại" destructive confirmDisabled={busy} onCancel={()=>setConfirmDelete(false)} onConfirm={()=>void remove()} />
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  body: { paddingHorizontal: 16, paddingTop: 18, gap: 18 },
  topPills: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  sectionStack: { gap: 12 },
  questionCard: { padding: 15, gap: 10 },
  questionCategory: { color: COLORS.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.7 },
  question: { color: COLORS.primaryText, fontSize: 14, lineHeight: 20, fontWeight: "900" },
  options: { gap: 8 },
  option: { minHeight: 46, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 9 },
  optionSelected: { borderColor: COLORS.primary, backgroundColor: "#FFF1F5" },
  optionDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  optionDotSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionText: { flex: 1, color: COLORS.primaryText, fontSize: 12, fontWeight: "700" },
  optionTextSelected: { color: COLORS.primary },
  resultCard: { padding: 14, gap: 6 },
  resultPrompt: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 18, fontWeight: "800" },
  resultAnswer: { color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  scoreRow: { paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  scoreName: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  scoreValue: { color: COLORS.primary, fontSize: 14, fontWeight: "900" },
  memberGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  memberChoice: { width: "48.5%", minHeight: 74, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 },
  memberChoiceSelected: { borderColor: COLORS.primary, backgroundColor: "#FFF3F7" },
  memberAvatar: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  memberAvatarSelected: { backgroundColor: COLORS.primary },
  memberInitial: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  memberInitialSelected: { color: COLORS.white },
  memberChoiceName: { flex: 1, color: COLORS.primaryText, fontSize: 10.5, lineHeight: 14, fontWeight: "800" },
  revealCard: { padding: 20, alignItems: "center", gap: 8, backgroundColor: "#FFF8FB" },
  revealTitle: { color: COLORS.primaryText, fontSize: 22, fontWeight: "900", textAlign: "center" },
  revealSub: { color: COLORS.secondaryText, fontSize: 11.5, textAlign: "center" },
  memoryCard: { padding: 0, overflow: "hidden" },
  memoryImage: { width: "100%", height: 220, backgroundColor: COLORS.softSurface },
  memoryPlaceholder: { height: 150, alignItems: "center", justifyContent: "center", backgroundColor: "#F7EDF2" },
  memoryCaption: { padding: 16, color: COLORS.primaryText, fontSize: 13, lineHeight: 20, fontWeight: "700" },
  truthInputBlock: { gap: 7 },
  liePick: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: COLORS.softSurface },
  liePickActive: { backgroundColor: "#FFE4ED" },
  liePickText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  statementCard: { minHeight: 74, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  statementCardSelected: { borderColor: COLORS.primary, backgroundColor: "#FFF2F6" },
  statementNumber: { width: 34, height: 34, borderRadius: 13, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  statementNumberSelected: { backgroundColor: COLORS.primary },
  statementNumberText: { color: COLORS.primaryText, fontWeight: "900" },
  statementNumberTextSelected: { color: COLORS.white },
  statementText: { flex: 1, color: COLORS.primaryText, fontSize: 12, lineHeight: 17, fontWeight: "700" },
  statementIndex: { color: COLORS.secondaryText, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  lieCard: { borderColor: "#E8B358", backgroundColor: "#FFF8E7" },
  lieLabel: { color: "#B97917", fontSize: 10.5, fontWeight: "900" },
  truthLabel: { color: "#5B9B79", fontSize: 10.5, fontWeight: "900" },
  storyStarterCard: { backgroundColor: "#FFF8EC", padding: 16 },
  storyStarter: { color: COLORS.primaryText, fontSize: 14, lineHeight: 21, fontWeight: "900" },
  lastLineCard: { padding: 15 },
  lastLineKicker: { color: COLORS.primary, fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  lastLineText: { marginTop: 5, color: COLORS.primaryText, fontSize: 13, lineHeight: 19, fontWeight: "700" },
  storyFull: { padding: 16, gap: 14 },
  storyLineRow: { paddingTop: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border },
  storyLineName: { color: COLORS.primary, fontSize: 10, fontWeight: "900" },
  storyLineText: { marginTop: 4, color: COLORS.primaryText, fontSize: 12.5, lineHeight: 19 },
  bingoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bingoCell: { width: "31.6%", aspectRatio: 1, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, padding: 9, alignItems: "center", justifyContent: "center", gap: 5 },
  bingoCellSelected: { borderColor: COLORS.primary, backgroundColor: "#FFF0F5" },
  bingoText: { color: COLORS.primaryText, fontSize: 9.5, lineHeight: 13, fontWeight: "800", textAlign: "center" },
  bingoTextSelected: { color: COLORS.primary },
  bingoStatus: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14 },
  bingoWon: { backgroundColor: "#FFF5DA", borderColor: "#E9C46B" },
  bingoStatusTitle: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  bingoStatusText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  hostCard: { padding: 14, gap: 10, flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  hostIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  hostCopy: { flex: 1, minWidth: 180 },
  hostTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  hostText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14.5 },
  hostButton: { width: "100%" },
  deleteLink: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 12 },
  deleteText: { color: COLORS.destructive, fontSize: 11, fontWeight: "800" },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
});
