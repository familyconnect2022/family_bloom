import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomCard } from "../../components/ui/BloomPageComponents";
import { BloomGameBottomModal } from "../../components/chess/BloomGameBottomModal";
import { ChessVictoryConfetti } from "../../components/chess/ChessVictoryConfetti";
import { XiangqiBattleEffects, deriveXiangqiBattleEvent, type XiangqiBattleEvent } from "../../components/xiangqi/XiangqiBattleEffects";
import { XiangqiGameBoard } from "../../components/xiangqi/XiangqiGameBoard";
import { XiangqiPiece } from "../../components/xiangqi/XiangqiPiece";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useDeferredGameSurface } from "../../hooks/games/useDeferredGameSurface";
import { gameRuntimePerf } from "../../services/games/gameRuntimePerf";
import {
  chooseXiangqiBotMove,
  createInitialXiangqiState,
  getXiangqiLegalMoves,
  playXiangqiMove,
  resignXiangqi,
  timeoutXiangqi,
  xiangqiFinishCopy,
  type XiangqiGameState,
} from "../../games/xiangqi/xiangqiEngine";

type XiangqiRoundPhase = "preparing" | "ready" | "playing";

function formatClock(ms: number) {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const XIANGQI_INITIAL_CLOCK_MS = 600_000;
const XIANGQI_BOT_MOVE_DELAY_MS = 1_000;

function XiangqiClockValue({
  baseMs,
  active,
  startedAtMs,
  runtimeActive,
}: {
  baseMs: number;
  active: boolean;
  startedAtMs: number;
  runtimeActive: boolean;
}) {
  // Only this tiny text node ticks. The screen/board never re-render every
  // second just to paint a clock. Server-style truth remains a base snapshot
  // plus an anchor timestamp.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (!runtimeActive || !active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active, baseMs, runtimeActive, startedAtMs]);

  const shownMs = active && runtimeActive
    ? Math.max(0, baseMs - Math.max(0, now - startedAtMs))
    : baseMs;
  return <Text style={[styles.clockText, active && styles.clockTextActive]}>{formatClock(shownMs)}</Text>;
}

function PlayerRail({
  side,
  name,
  avatarUrl,
  active,
  thinking,
  clockMs,
  clockStartedAtMs,
  runtimeActive,
  phase,
}: {
  side: "red" | "black";
  name: string;
  avatarUrl?: string | null;
  active: boolean;
  thinking?: boolean;
  clockMs: number;
  clockStartedAtMs: number;
  runtimeActive: boolean;
  phase: XiangqiRoundPhase;
}) {
  const meta = phase === "preparing"
    ? "Đang chuẩn bị bàn cờ…"
    : phase === "ready"
      ? side === "red" ? "Sẵn sàng đi trước" : "Sẵn sàng"
      : thinking
        ? "Bloom đang nghĩ một nước…"
        : active
          ? "Đang tới lượt"
          : "Đang chờ lượt";

  return (
    <BloomCard style={[styles.playerRail, active && styles.playerRailActive]}>
      <View style={styles.avatar}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <XiangqiPiece color={side} type="general" size={58} />}
      </View>
      <View style={styles.playerCopy}>
        <Text style={styles.playerName}>{name}</Text>
        <Text style={styles.playerMeta}>{meta}</Text>
      </View>
      <View style={[styles.clock, active && styles.clockActive]}>
        <XiangqiClockValue baseMs={clockMs} active={active} startedAtMs={clockStartedAtMs} runtimeActive={runtimeActive} />
      </View>
    </BloomCard>
  );
}

export default function XiangqiPreviewScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [screenFocused, setScreenFocused] = useState(true);
  useFocusEffect(React.useCallback(() => {
    setScreenFocused(true);
    return () => setScreenFocused(false);
  }, []));
  const heavySurfaceMounted = useDeferredGameSurface(screenFocused);
  const [game, setGame] = useState<XiangqiGameState>(() => createInitialXiangqiState());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [clockMs, setClockMs] = useState({ red: XIANGQI_INITIAL_CLOCK_MS, black: XIANGQI_INITIAL_CLOCK_MS });
  const clockMsRef = useRef(clockMs);
  const turnStartedAtRef = useRef(Date.now());
  const [turnStartedAtMs, setTurnStartedAtMs] = useState(() => Date.now());
  const [boardReady, setBoardReady] = useState(false);
  const [roundPhase, setRoundPhase] = useState<XiangqiRoundPhase>("preparing");
  const [roundEpoch, setRoundEpoch] = useState(0);
  const [battleEvent, setBattleEvent] = useState<XiangqiBattleEvent | null>(null);
  const [resultRevealReady, setResultRevealReady] = useState(false);
  const previousGameRef = useRef<XiangqiGameState | null>(null);

  const legalTargets = useMemo(() => selectedId ? getXiangqiLegalMoves(game, selectedId) : [], [game, selectedId]);
  const finish = xiangqiFinishCopy(game);
  const myName = userProfile?.shortName || userProfile?.displayName || "Bạn";
  const didWin = game.winner === "red";
  const resultPalette = didWin
    ? {
        backdrop: "rgba(78,31,51,0.50)",
        hero: "#D56591",
        border: "#F2CDDC",
        primary: "#C94F7D",
        secondaryBg: "#FFF3F7",
        secondaryText: "#A9486D",
      }
    : {
        backdrop: "rgba(38,30,35,0.58)",
        hero: "#6E5361",
        border: "#DCCCD4",
        primary: "#795668",
        secondaryBg: "#F5EDF1",
        secondaryText: "#654B58",
      };

  useEffect(() => {
    if (!screenFocused) return undefined;
    setResultRevealReady(false);
    // Returning to an in-progress round must never replay the ready ceremony.
    // The heavy native board may remount from cache, but round state stays live.
    if (roundPhase === "playing") return undefined;
    if (!boardReady) {
      setRoundPhase("preparing");
      return undefined;
    }
    // The board itself owns readiness: layout + every piece image + two painted
    // frames. Only then may the shield say ready and eventually slide away.
    if (roundPhase !== "ready") setRoundPhase("ready");
    const playTimer = setTimeout(() => setRoundPhase("playing"), 620);
    return () => clearTimeout(playTimer);
  }, [boardReady, roundEpoch, roundPhase, screenFocused]);

  useEffect(() => {
    gameRuntimePerf.markSurface("xiangqi", heavySurfaceMounted);
    if (!heavySurfaceMounted) setBoardReady(false);
  }, [heavySurfaceMounted, roundPhase, screenFocused]);

  useEffect(() => {
    if (!screenFocused) return;
    const previous = previousGameRef.current;
    const event = deriveXiangqiBattleEvent(previous, game, "red");
    if (event) setBattleEvent(event);
    previousGameRef.current = game;
  }, [game, screenFocused]);

  useEffect(() => {
    if (!screenFocused) {
      setResultRevealReady(false);
      return undefined;
    }
    if (!game.gameOver) {
      setResultRevealReady(false);
      return undefined;
    }
    setSelectedId(null);
    setBotThinking(false);
    const timer = setTimeout(() => setResultRevealReady(true), 820);
    return () => clearTimeout(timer);
  }, [game.gameOver, game.moveNumber, screenFocused]);

  const commitActiveClock = React.useCallback((side: "red" | "black") => {
    const now = Date.now();
    const elapsed = Math.max(0, now - turnStartedAtRef.current);
    const current = clockMsRef.current;
    const remaining = Math.max(0, current[side] - elapsed);
    const next = { ...current, [side]: remaining };
    clockMsRef.current = next;
    turnStartedAtRef.current = now;
    setClockMs(next);
    return remaining > 0;
  }, []);

  useEffect(() => {
    if (!screenFocused || roundPhase !== "playing" || game.gameOver) return undefined;
    const active = game.turn;
    const now = Date.now();
    turnStartedAtRef.current = now;
    setTurnStartedAtMs(now);
    const remaining = clockMsRef.current[active];
    const timer = setTimeout(() => {
      setGame((state) => state.gameOver || state.turn !== active ? state : timeoutXiangqi(state, active));
    }, Math.max(25, remaining + 25));
    return () => clearTimeout(timer);
  }, [game.gameOver, game.turn, roundPhase, screenFocused]);

  useEffect(() => {
    if (!screenFocused || roundPhase !== "playing" || game.gameOver || game.turn !== "black") {
      setBotThinking(false);
      return undefined;
    }
    setSelectedId(null);
    setBotThinking(true);
    const timer = setTimeout(() => {
      if (!commitActiveClock("black")) {
        setGame((current) => timeoutXiangqi(current, "black"));
        setBotThinking(false);
        return;
      }
      setGame((current) => {
        const move = chooseXiangqiBotMove(current);
        return move ? playXiangqiMove(current, move.pieceId, move.to) : current;
      });
      setBotThinking(false);
    }, XIANGQI_BOT_MOVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [commitActiveClock, game.gameOver, game.moveNumber, game.turn, roundPhase, screenFocused]);

  useEffect(() => {
    if (screenFocused) return;
    setSelectedId(null);
    setBotThinking(false);
    setBattleEvent(null);
  }, [screenFocused]);

  const handleBoardReady = React.useCallback(() => {
    setBoardReady(true);
  }, []);

  const onBoardTap = (col: number, row: number) => {
    if (!screenFocused || !boardReady || roundPhase !== "playing" || game.gameOver || game.turn !== "red" || botThinking) return;
    const tapped = game.pieces.find((piece) => piece.col === col && piece.row === row);

    if (selectedId) {
      const legal = legalTargets.some((target) => target.col === col && target.row === row);
      if (legal) {
        if (!commitActiveClock("red")) {
          setGame((current) => timeoutXiangqi(current, "red"));
          setSelectedId(null);
          return;
        }
        setGame((current) => playXiangqiMove(current, selectedId, { col, row }));
        setSelectedId(null);
        return;
      }
      if (tapped?.color === "red") {
        setSelectedId(tapped.id);
        return;
      }
      setSelectedId(null);
      return;
    }

    if (tapped?.color === "red") setSelectedId(tapped.id);
  };

  const reset = () => {
    setSelectedId(null);
    setBotThinking(false);
    setBattleEvent(null);
    setResultRevealReady(false);
    setBoardReady(false);
    setRoundPhase("preparing");
    const resetClock = { red: XIANGQI_INITIAL_CLOCK_MS, black: XIANGQI_INITIAL_CLOCK_MS };
    clockMsRef.current = resetClock;
    const now = Date.now();
    turnStartedAtRef.current = now;
    setTurnStartedAtMs(now);
    setClockMs(resetClock);
    setGame(createInitialXiangqiState());
    setRoundEpoch((current) => current + 1);
  };

  const statusCopy = roundPhase === "preparing"
    ? "Đang chuẩn bị ván đấu…"
    : roundPhase === "ready"
      ? "Sẵn sàng • Đỏ đi trước"
      : game.gameOver
        ? finish?.reason ?? "Ván đã khép lại"
        : game.inCheck
          ? game.inCheck === "red" ? "Bạn đang bị chiếu Tướng" : "Bloom Bot đang bị chiếu Tướng"
          : game.turn === "red"
            ? "Đến lượt bạn"
            : botThinking
              ? "Bloom Bot đang tính nước…"
              : "Đến lượt Bloom Bot";

  const readyPhase = roundPhase === "ready";
  const phaseTitle = readyPhase ? "Sẵn sàng • Đỏ đi trước" : "Đang chuẩn bị bàn cờ";
  const phaseText = readyPhase
    ? "Bàn cờ đã ổn định. Bloom sẽ tự thu thẻ xuống để bạn bắt đầu nước đầu tiên."
    : "Bloom đang xếp quân, đồng bộ đồng hồ và khóa thao tác để tránh chạm nhầm.";
  const playing = roundPhase === "playing";
  // The entry shield is already visible on the route first frame. The board is
  // mounted independently after navigation interactions settle, so there is no
  // modal -> board callback dependency that can deadlock on Android.
  const boardSurfaceVisible = heavySurfaceMounted;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ TƯỚNG NHÀ MÌNH"
          title="Qua sông, giữ Tướng, vui cùng nhà"
          subtitle="Bộ quân bạn đã duyệt giờ đi cùng luật thật. Thử trọn một ván với Bloom Bot trước khi Bloom nối đấu realtime cùng người thân."
          variant="game"
          roundedBottom
          compact
          onBack={() => router.back()}
        />

        <View style={styles.body}>
          <PlayerRail side="black" name="Bloom Bot" active={playing && game.turn === "black" && !game.gameOver} thinking={botThinking} clockMs={clockMs.black} clockStartedAtMs={turnStartedAtMs} runtimeActive={screenFocused && playing && boardSurfaceVisible} phase={roundPhase} />

          <View style={[styles.statusRow, roundPhase === "ready" && styles.statusRowReady, roundPhase === "preparing" && styles.statusRowPreparing, game.inCheck && playing && styles.statusRowAlert]}>
            <View style={[styles.statusDot, roundPhase === "preparing" && styles.statusDotPreparing, roundPhase === "ready" && styles.statusDotReady, game.inCheck && playing && styles.statusDotAlert]} />
            <Text style={[styles.statusText, roundPhase === "ready" && styles.statusTextReady, game.inCheck && playing && styles.statusTextAlert]}>{statusCopy}</Text>
          </View>

          <View style={styles.boardWrap}>
            {boardSurfaceVisible ? (
              <>
                <XiangqiGameBoard
                  pieces={game.pieces}
                  selectedId={selectedId}
                  legalTargets={legalTargets}
                  lastMove={game.lastMove}
                  checkedColor={game.inCheck}
                  onTap={onBoardTap}
                  runtimeActive={screenFocused && boardSurfaceVisible}
                  readyEpoch={roundEpoch}
                  onReady={handleBoardReady}
                />
                {screenFocused && boardSurfaceVisible ? <XiangqiBattleEffects event={battleEvent} /> : null}
              </>
            ) : (
              <View pointerEvents="none" style={styles.boardPreloadSlot}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
                <Text style={styles.boardPreloadText}>Bloom mở thẻ chuẩn bị trước, rồi mới xếp quân ở nhịp kế tiếp.</Text>
              </View>
            )}
          </View>

          <PlayerRail side="red" name={myName} avatarUrl={userProfile?.avatarUrl} active={playing && game.turn === "red" && !game.gameOver} clockMs={clockMs.red} clockStartedAtMs={turnStartedAtMs} runtimeActive={screenFocused && playing && boardSurfaceVisible} phase={roundPhase} />

          <View style={styles.actions}>
            <Pressable onPress={reset} style={styles.actionSecondary}>
              <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
              <Text style={styles.actionSecondaryText}>Ván mới</Text>
            </Pressable>
            <Pressable disabled={game.gameOver || !playing} onPress={() => setGame((current) => resignXiangqi(current, "red"))} style={[styles.actionPrimary, (game.gameOver || !playing) && styles.disabled]}>
              <Ionicons name="flag-outline" size={20} color={COLORS.white} />
              <Text style={styles.actionPrimaryText}>Đầu hàng</Text>
            </Pressable>
          </View>

          <BloomCard tone="soft" style={styles.ruleNote}>
            <Ionicons name="shield-checkmark-outline" size={21} color={COLORS.primary} />
            <Text style={styles.ruleText}>Bloom đã giữ các luật nền: Tướng trong cung và không được nhìn thẳng nhau, Sĩ trong cung, Tượng không qua sông và có mắt Tượng, Mã có chân Mã, Pháo cần đúng một ngòi để ăn, Tốt đổi cách đi sau khi qua sông và không được tự để Tướng bị chiếu.</Text>
          </BloomCard>
        </View>
      </ScrollView>

      <BloomGameBottomModal
        visible={screenFocused && !playing && !game.gameOver}
        staticFirstPresentation
        suspended={!screenFocused}
        eyebrow={readyPhase ? "BLOOM READY" : "BLOOM ĐANG CHUẨN BỊ"}
        title={phaseTitle}
        subtitle={phaseText}
        icon={readyPhase ? "play" : "sparkles"}
        accent={readyPhase ? "pink" : "soft"}
      >
        <View style={styles.flowStatusRow}>
          <View style={[styles.flowStatusDot, readyPhase && styles.flowStatusDotReady]} />
          <View style={styles.flowStatusCopy}>
            <Text style={styles.flowStatusTitle}>{readyPhase ? "Bàn cờ sẵn sàng • Đỏ đi trước" : "Đang khóa thao tác trên bàn cờ"}</Text>
            <Text style={styles.flowStatusText}>{readyPhase ? "Thẻ sẽ tự trượt xuống, sau đó bạn có thể chọn quân ngay." : "Không cần chạm gì thêm — Bloom sẽ tự mở bàn cờ khi trạng thái ổn định."}</Text>
          </View>
          {!readyPhase ? <ActivityIndicator size="small" color={COLORS.primary} /> : <Ionicons name="checkmark-circle" size={24} color="#4E9B72" />}
        </View>
      </BloomGameBottomModal>

      <Modal visible={screenFocused && game.gameOver && resultRevealReady} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent presentationStyle="overFullScreen" onRequestClose={() => undefined}>
        <View style={[styles.resultBackdrop, { backgroundColor: resultPalette.backdrop }]}>
          <View style={styles.resultGlowOne} />
          <View style={styles.resultGlowTwo} />
          <View style={[styles.resultCard, { borderColor: resultPalette.border }]}>
            <View style={[styles.resultHero, { backgroundColor: resultPalette.hero }]}>
              <View style={styles.resultBubbleLarge} />
              <View style={styles.resultBubbleSmall} />
              <ChessVictoryConfetti active={screenFocused && didWin && game.gameOver && resultRevealReady} />
              <View style={styles.resultIcon}>
                <Ionicons name={didWin ? "trophy" : "heart"} size={34} color="#FFFFFF" />
              </View>
              <View style={styles.resultBadge}><Text style={styles.resultBadgeText}>{didWin ? "CHIẾN THẮNG" : "VÁN ĐẤU KHÉP LẠI"}</Text></View>
              <Text style={styles.resultTitle}>{didWin ? "Bạn thắng!" : "Bạn thua"}</Text>
              <Text style={styles.resultReason}>{finish?.reason}</Text>
            </View>
            <View style={styles.resultBody}>
              <Text style={styles.resultMessage}>{didWin ? "Một ván Cờ tướng thật đẹp. Bloom đã giữ lại khoảnh khắc chiến thắng này." : "Nghỉ một chút rồi mình trở lại. Ván sau có thể là một câu chuyện hoàn toàn khác."}</Text>
              <Pressable onPress={reset} style={[styles.resultButton, { backgroundColor: resultPalette.primary }]}><Ionicons name="refresh-outline" size={20} color={COLORS.white} /><Text style={styles.resultButtonText}>Chơi ván mới</Text></Pressable>
              <Pressable onPress={() => router.back()} style={[styles.resultClose, { backgroundColor: resultPalette.secondaryBg }]}><Text style={[styles.resultCloseText, { color: resultPalette.secondaryText }]}>Về phòng game</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 42 },
  body: { paddingHorizontal: 12, paddingTop: 16, gap: 12 },
  playerRail: { minHeight: 104, padding: 13, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#FFF9FC" },
  playerRailActive: { borderColor: "rgba(218,74,132,0.45)", shadowOpacity: 0.14, elevation: 4 },
  avatar: { width: 60, height: 60, borderRadius: 22, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#FBE8EF" },
  playerCopy: { flex: 1 },
  playerName: { color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  playerMeta: { marginTop: 4, color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  clock: { minWidth: 104, height: 64, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1.4, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  clockActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  clockText: { color: COLORS.primaryText, fontSize: 25, lineHeight: 30, fontWeight: "900", fontVariant: ["tabular-nums"] },
  clockTextActive: { color: COLORS.white },
  statusRow: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "center" },
  statusRowPreparing: { backgroundColor: "#FFF5DF" },
  statusRowReady: { backgroundColor: "#ECF8F0" },
  statusRowAlert: { backgroundColor: "#FFF0F2" },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#79C69B" },
  statusDotPreparing: { backgroundColor: "#D49B31" },
  statusDotReady: { backgroundColor: "#58A777" },
  statusDotAlert: { backgroundColor: "#D65369" },
  statusText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "900" },
  statusTextReady: { color: "#4D7E61" },
  statusTextAlert: { color: "#B13E55" },
  boardWrap: { position: "relative", alignItems: "center", paddingVertical: 4, overflow: "visible" },
  boardPreloadSlot: { width: "100%", maxWidth: 430, minWidth: 314, aspectRatio: 0.89, borderRadius: 24, borderWidth: 1, borderColor: "#E9C9D6", backgroundColor: "#FFF9FC", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 28 },
  boardPreloadText: { maxWidth: 280, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "800", textAlign: "center" },
  flowStatusRow: {
    minHeight: 68,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EFD5DF",
    backgroundColor: "#FFF7FA",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  flowStatusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#E3A65C" },
  flowStatusDotReady: { backgroundColor: "#4E9B72" },
  flowStatusCopy: { flex: 1 },
  flowStatusTitle: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 17, fontWeight: "900" },
  flowStatusText: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "700" },
  actions: { flexDirection: "row", gap: 10 },
  actionSecondary: { flex: 1, height: 52, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  actionSecondaryText: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  actionPrimary: { flex: 1, height: 52, borderRadius: 20, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  actionPrimaryText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  ruleNote: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  ruleText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17.5 },
  resultBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, paddingVertical: 42 },
  resultGlowOne: { position: "absolute", width: 250, height: 250, borderRadius: 125, backgroundColor: "rgba(255,228,169,0.18)", top: "18%", left: -74 },
  resultGlowTwo: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,218,232,0.16)", bottom: "14%", right: -64 },
  resultCard: { width: "100%", maxWidth: 400, borderRadius: 34, overflow: "hidden", backgroundColor: "#FFFDFE", borderWidth: 1, shadowColor: "#321D25", shadowOpacity: 0.24, shadowRadius: 26, shadowOffset: { width: 0, height: 13 }, elevation: 16 },
  resultHero: { minHeight: 228, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  resultBubbleLarge: { position: "absolute", width: 205, height: 205, borderRadius: 103, backgroundColor: "rgba(255,255,255,0.09)", right: -54, top: -78 },
  resultBubbleSmall: { position: "absolute", width: 118, height: 118, borderRadius: 59, backgroundColor: "rgba(255,255,255,0.10)", left: -20, bottom: -39 },
  resultIcon: { width: 68, height: 68, borderRadius: 25, backgroundColor: "rgba(255,255,255,0.17)", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", alignItems: "center", justifyContent: "center" },
  resultBadge: { marginTop: 13, minHeight: 25, borderRadius: 13, paddingHorizontal: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  resultBadgeText: { color: "#FFFFFF", fontSize: 9.5, lineHeight: 12, fontWeight: "900", letterSpacing: 1.1 },
  resultTitle: { marginTop: 7, color: "#FFFFFF", fontSize: 34, lineHeight: 39, fontWeight: "900", textAlign: "center" },
  resultReason: { marginTop: 6, color: "rgba(255,255,255,0.88)", fontSize: 13, fontWeight: "800", textAlign: "center" },
  resultBody: { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 22 },
  resultMessage: { color: COLORS.primaryText, fontSize: 13.2, lineHeight: 20, fontWeight: "700", textAlign: "center" },
  resultButton: { marginTop: 20, width: "100%", height: 54, borderRadius: 20, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  resultButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  resultClose: { marginTop: 9, minHeight: 46, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  resultCloseText: { fontSize: 12.5, fontWeight: "900" },
});
