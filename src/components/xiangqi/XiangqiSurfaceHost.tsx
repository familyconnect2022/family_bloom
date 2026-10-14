import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ScreenContainer } from "../layout/ScreenContainer";
import { BloomHeroHeader } from "../ui/BloomHeroHeader";
import { BloomCard } from "../ui/BloomPageComponents";
import { BloomGameBottomModal } from "../chess/BloomGameBottomModal";
import { XiangqiGameBoard } from "./XiangqiGameBoard";
import { XiangqiPiece } from "./XiangqiPiece";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import {
  cacheXiangqiBootstrapState,
  getCachedXiangqiBootstrapState,
  markXiangqiSurfacePrepared,
  useXiangqiSurfaceState,
} from "../../services/xiangqi/xiangqiSurfaceStore";
import { gameRuntimePerf } from "../../services/games/gameRuntimePerf";
import { publishXiangqiTerminalResult } from "../../services/games/boardGameTerminalResultStore";
import { isActiveBoardGameSessionTerminal } from "../../services/games/activeBoardGameSessionStore";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import { XIANGQI_EVENTS, type XiangqiRealtimeState, type XiangqiMoveDelta } from "../../types/xiangqiRealtime";
import { useBoardGameSoundscape } from "../games/useBoardGameSoundscape";
import { resolveBoardMoveSound, type BoardGamePremove, type RealtimeBoardRoundPhase } from "../../games/shared/boardGameFramework";
import { isBoardGameSurfacePresented } from "../../services/games/boardGameSurfaceLifecycle";
import { useBloomSurfaceRailState } from "../../services/presentation/bloomSurfaceRailStore";
import { finishClaimedBoardGame } from "../../services/presentation/boardGamePresentationCoordinator";
import {
  createInitialXiangqiState,
  getXiangqiLegalMoves,
  getXiangqiLegalMovesForColor,
  type XiangqiMove,
} from "../../games/xiangqi/xiangqiEngine";

function formatClock(ms: number) {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

const reqId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function XiangqiClockValue({
  baseMs,
  active,
  startedAtMs,
  runtimeActive,
  onTenSeconds,
}: {
  baseMs: number | null;
  active: boolean;
  startedAtMs: number;
  runtimeActive: boolean;
  onTenSeconds?: () => void;
}) {
  // Only this tiny text node ticks. The screen/board never re-render every
  // second just to paint a clock. Server-style truth remains a base snapshot
  // plus an anchor timestamp.
  const [now, setNow] = useState(() => Date.now());
  const finiteBaseMs = baseMs ?? 0;
  const warnedTurnRef = useRef<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!runtimeActive || !active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active, baseMs, runtimeActive, startedAtMs]);

  const shownMs = active && runtimeActive
    ? Math.max(0, finiteBaseMs - Math.max(0, now - startedAtMs))
    : finiteBaseMs;
  useEffect(() => {
    if (baseMs == null || !onTenSeconds || !active || !runtimeActive || shownMs <= 0 || shownMs > 10_000) return;
    if (warnedTurnRef.current === startedAtMs) return;
    warnedTurnRef.current = startedAtMs;
    onTenSeconds();
  }, [active, baseMs, onTenSeconds, runtimeActive, shownMs, startedAtMs]);
  return <Text style={[styles.clockText, active && styles.clockTextActive]}>{baseMs == null ? "∞" : formatClock(shownMs)}</Text>;
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
  onTenSeconds,
}: {
  side: "red" | "black";
  name: string;
  avatarUrl?: string | null;
  active: boolean;
  thinking?: boolean;
  clockMs: number | null;
  clockStartedAtMs: number;
  runtimeActive: boolean;
  phase: RealtimeBoardRoundPhase;
  onTenSeconds?: () => void;
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
        <XiangqiClockValue baseMs={clockMs} active={active} startedAtMs={clockStartedAtMs} runtimeActive={runtimeActive} onTenSeconds={onTenSeconds} />
      </View>
    </BloomCard>
  );
}

function XiangqiPreparedSurface({
  occludedByHigherSurface,
  onContentPainted,
}: {
  occludedByHigherSurface: boolean;
  onContentPainted?: () => void;
}) {
  const router = useRouter();
  const surface = useXiangqiSurfaceState();
  const rail = useBloomSurfaceRailState();
  const presentationMode = rail.gameKind === "xiangqi" && rail.gameId === surface.gameId
    ? rail.gamePresentation
    : "hidden";
  const { width: windowWidth } = useWindowDimensions();
  const { user, userProfile, activeFamilyId } = useAuth();
  const { playMoveKind, playPremove, playIllegal, playTenSeconds, playGameStart } = useBoardGameSoundscape();
  // P2.17: only the root Presentation Rail owns Xiangqi pixels. A parked
  // surface is translated out and non-interactive; no route can force it visible.
  const screenFocused = isBoardGameSurfacePresented(surface.presentationReady, presentationMode)
    && !occludedByHigherSurface;
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => { const sub = AppState.addEventListener("change", (next) => setAppActive(next === "active")); return () => sub.remove(); }, []);
  const [serverState, setServerState] = useState<XiangqiRealtimeState | null>(() => getCachedXiangqiBootstrapState(surface.gameId));
  const serverStateRef = useRef<XiangqiRealtimeState | null>(serverState);
  serverStateRef.current = serverState;
  // P2.17 rail architecture: the heavy Xiangqi host is mounted only after a
  // concrete server game has been resolved by the lightweight route bootstrap.
  const warmBoard = useMemo(() => createInitialXiangqiState(), []);
  const game = serverState?.board ?? warmBoard;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [premove, setPremove] = useState<BoardGamePremove<{ col: number; row: number }, { col: number; row: number }, never> & { pieceId: string } | null>(null);
  const premoveRef = useRef<typeof premove>(null);
  premoveRef.current = premove;
  const landedSoundMoveRef = useRef(0);
  const gameStartSoundEpochRef = useRef<number | null>(null);
  const gameEndSoundMoveRef = useRef<number | null>(null);
  const [turnStartedAtMs, setTurnStartedAtMs] = useState(() => Date.now());
  const [boardReady, setBoardReady] = useState(false);
  const [roundPhase, setRoundPhase] = useState<RealtimeBoardRoundPhase>("preparing");
  const [roundEpoch, setRoundEpoch] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [joinRetryNonce, setJoinRetryNonce] = useState(0);
  const joinInFlightRef = useRef(false);
  const readySentForGameRef = useRef<string | null>(null);
  const identityRef = useRef(`${user?.uid ?? "none"}:${activeFamilyId ?? "none"}`);

  useEffect(() => {
    const nextIdentity = `${user?.uid ?? "none"}:${activeFamilyId ?? "none"}`;
    if (identityRef.current === nextIdentity) return;
    identityRef.current = nextIdentity;
    setServerState(getCachedXiangqiBootstrapState(surface.gameId));
    setSelectedId(null);
    setPremove(null);
    setBoardReady(false);
    setRoundPhase("preparing");
    setServerError(null);
    readySentForGameRef.current = null;
    landedSoundMoveRef.current = 0;
    gameEndSoundMoveRef.current = null;
  }, [activeFamilyId, surface.gameId, user?.uid]);

  const terminateAuthoritativeGame = React.useCallback((terminalState: XiangqiRealtimeState) => {
    publishXiangqiTerminalResult(terminalState);
    finishClaimedBoardGame("xiangqi", terminalState.gameId);
    // The result receipt is history-only. ACK immediately so server recovery can
    // never return this finished game as a blocker for the next Chess/Xiangqi.
    void xiangqiSocketService.emitAck(
      XIANGQI_EVENTS.gameResultAck,
      { familyId: terminalState.familyId, gameId: terminalState.gameId },
    );
    serverStateRef.current = null;
    setServerState(null);
    setSelectedId(null);
    setPremove(null);
    setBoardReady(false);
    setRoundPhase("preparing");
    setServerError(null);
    readySentForGameRef.current = null;
  }, []);

  const applyState = React.useCallback((next: XiangqiRealtimeState) => {
    if (isActiveBoardGameSessionTerminal("xiangqi", next.gameId)) return;
    if (surface.gameId && next.gameId !== surface.gameId) return;
    if (next.status === "finished") {
      terminateAuthoritativeGame(next);
      return;
    }
    const previousGameId = serverStateRef.current?.gameId ?? null;
    cacheXiangqiBootstrapState(next);
    serverStateRef.current = next;
    setServerState(next);
    setTurnStartedAtMs(Date.now());
    if (previousGameId !== next.gameId) {
      setSelectedId(null); setPremove(null); setBoardReady(false); setRoundEpoch((value) => value + 1);
      landedSoundMoveRef.current = 0; gameEndSoundMoveRef.current = null; readySentForGameRef.current = null;
    }
  }, [surface.gameId, terminateAuthoritativeGame]);

  const applyDelta = React.useCallback((delta: XiangqiMoveDelta) => {
    if (isActiveBoardGameSessionTerminal("xiangqi", delta.gameId)) return;
    if (surface.gameId && delta.gameId !== surface.gameId) return;
    const current = serverStateRef.current;
    if (!current || current.gameId !== delta.gameId) return;
    const next: XiangqiRealtimeState = {
      ...current, board: delta.board, revision: delta.version, redRemainingMs: delta.redRemainingMs,
      blackRemainingMs: delta.blackRemainingMs, status: delta.status, result: delta.result,
      finishReason: delta.finishReason, serverNowMs: delta.serverNowMs, endedAt: delta.endedAt,
    };
    if (next.status === "finished") {
      terminateAuthoritativeGame(next);
      return;
    }
    cacheXiangqiBootstrapState(next);
    serverStateRef.current = next;
    setServerState(next);
    setTurnStartedAtMs(Date.now());
  }, [surface.gameId, terminateAuthoritativeGame]);

  const joinKnownGame = React.useCallback(async () => {
    const gameId = surface.gameId;
    if (!activeFamilyId || !user?.uid || !gameId || joinInFlightRef.current) return;
    if (serverStateRef.current?.gameId === gameId) return;
    joinInFlightRef.current = true;
    setServerError(null);
    try {
      void xiangqiSocketService.prewake().catch(() => undefined);
      await xiangqiSocketService.connect();
      const joined = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled: boolean }>(XIANGQI_EVENTS.appJoin, { familyId: activeFamilyId });
      if (!joined.ok) throw new Error(joined.message ?? joined.errorCode);
      const gameAck = await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin, { familyId: activeFamilyId, gameId });
      if (!gameAck.ok) throw new Error(gameAck.message ?? gameAck.errorCode);
      applyState(gameAck.data);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : String(error));
    } finally {
      joinInFlightRef.current = false;
    }
  }, [activeFamilyId, applyState, surface.gameId, user?.uid]);

  useEffect(() => {
    if (surface.gameId) return;
    // P2.20: detaching a finished Xiangqi surface is a hard local reset. The
    // retained native layer stays mounted off-screen, but it owns no finished
    // server snapshot, selection, premove, result, or Ready state afterward.
    serverStateRef.current = null;
    setServerState(null);
    setSelectedId(null);
    setPremove(null);
    setBoardReady(false);
    setRoundPhase("preparing");
    setServerError(null);
    readySentForGameRef.current = null;
    landedSoundMoveRef.current = 0;
    gameEndSoundMoveRef.current = null;
  }, [surface.gameId]);

  useEffect(() => {
    const cached = getCachedXiangqiBootstrapState(surface.gameId);
    if (cached && cached.gameId === surface.gameId) applyState(cached);
  }, [applyState, surface.gameId]);

  useEffect(() => {
    const offState = xiangqiSocketService.onState(applyState);
    const offMove = xiangqiSocketService.onMove(applyDelta);
    const offConnect = xiangqiSocketService.onConnected(() => { void joinKnownGame(); });
    return () => { offState(); offMove(); offConnect(); };
  }, [applyDelta, applyState, joinKnownGame]);

  useEffect(() => {
    if (screenFocused && surface.gameId && serverStateRef.current?.gameId !== surface.gameId) void joinKnownGame();
  }, [joinKnownGame, joinRetryNonce, screenFocused, surface.gameId]);

  useEffect(() => {
    if (!screenFocused || !serverError || !/(recover|timeout|network|socket|transport|fetch|connect)/i.test(serverError)) return undefined;
    const timer = setTimeout(() => setJoinRetryNonce((value) => value + 1), 1_500);
    return () => clearTimeout(timer);
  }, [screenFocused, serverError]);

  useEffect(() => {
    const current = serverStateRef.current;
    if (!current) return;
    xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.gameBoardPresence, { gameId: current.gameId, visible: screenFocused && appActive });
  }, [appActive, screenFocused, serverState?.gameId]);

  const legalTargets = useMemo(() => {
    if (!selectedId || !serverState) return [];
    return game.turn === "red" ? getXiangqiLegalMoves(game, selectedId) : getXiangqiLegalMovesForColor(game, selectedId, "red");
  }, [game, selectedId, serverState]);


  useEffect(() => {
    if (!screenFocused) return undefined;
    if (!serverState || !boardReady) { setRoundPhase("preparing"); return undefined; }
    if (serverState.status === "active") { setRoundPhase("playing"); return undefined; }
    if (serverState.status === "finished") return undefined;
    setRoundPhase("ready");
    if (readySentForGameRef.current !== serverState.gameId) {
      readySentForGameRef.current = serverState.gameId;
      void xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameReady, { gameId: serverState.gameId, requestId: reqId("xq-ready") }).then((ack) => { if (ack.ok) applyState(ack.data); });
    }
    return undefined;
  }, [applyState, boardReady, screenFocused, serverState]);

  useEffect(() => { gameRuntimePerf.markSurface("xiangqi", surface.prepared); }, [surface.prepared]);
  useEffect(() => { if (!screenFocused) { setSelectedId(null); setPremove(null); } }, [screenFocused]);
  const handleBoardReady = React.useCallback(() => {
    setBoardReady(true);
    markXiangqiSurfacePrepared();
    onContentPainted?.();
  }, [onContentPainted]);
  useEffect(() => { if (!screenFocused || serverState?.status !== "active") return; if (gameStartSoundEpochRef.current === roundEpoch) return; gameStartSoundEpochRef.current = roundEpoch; playGameStart(); }, [playGameStart, roundEpoch, screenFocused, serverState?.status]);

  const sendMove = React.useCallback(async (pieceId: string, to: { col: number; row: number }) => {
    const current = serverStateRef.current; if (!current) return false;
    const ack = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameMove, { gameId: current.gameId, clientMoveId: reqId("xq-move"), expectedVersion: current.revision, pieceId, to });
    if (!ack.ok) { if (ack.errorCode === "XIANGQI_ILLEGAL_MOVE" || ack.errorCode === "XIANGQI_STATE_CONFLICT") playIllegal(); return false; }
    return true;
  }, [playIllegal]);

  const handleXiangqiMoveLanded = React.useCallback((move: XiangqiMove) => {
    if (!screenFocused || landedSoundMoveRef.current === game.moveNumber) return;
    landedSoundMoveRef.current = game.moveNumber;
    const mover = game.pieces.find((piece) => piece.id === move.pieceId);
    playMoveKind(resolveBoardMoveSound({ isSelf: mover?.color === "red", captured: !!move.capturedId, check: !!game.inCheck }));
    const queued = premoveRef.current;
    if (!queued || mover?.color !== "black" || game.turn !== "red" || game.gameOver) return;
    const legal = getXiangqiLegalMoves(game, queued.pieceId);
    const stillLegal = legal.some((target) => target.col === queued.to.col && target.row === queued.to.row);
    setPremove(null);
    if (!stillLegal) { playIllegal(); return; }
    requestAnimationFrame(() => { void sendMove(queued.pieceId, queued.to); });
  }, [game, playIllegal, playMoveKind, screenFocused, sendMove]);

  const onBoardTap = (col: number, row: number) => {
    if (!screenFocused || !boardReady || roundPhase !== "playing" || game.gameOver || !serverState) return;
    const tapped = game.pieces.find((piece) => piece.col === col && piece.row === row);
    const premoveMode = game.turn === "black";
    if (selectedId) {
      const selectedPiece = game.pieces.find((piece) => piece.id === selectedId);
      const legal = legalTargets.some((target) => target.col === col && target.row === row);
      if (legal && selectedPiece) {
        if (premoveMode) { setPremove({ pieceId:selectedId, from:{col:selectedPiece.col,row:selectedPiece.row}, to:{col,row}, queuedAtRevision:serverState.revision }); playPremove(); setSelectedId(null); return; }
        void sendMove(selectedId,{col,row}); setSelectedId(null); return;
      }
      if (tapped?.color === "red") { if (premoveMode && premoveRef.current) setPremove(null); setSelectedId(tapped.id); return; }
      playIllegal(); setSelectedId(null); return;
    }
    if (premove && ((premove.from.col===col&&premove.from.row===row)||(premove.to.col===col&&premove.to.row===row))) { setPremove(null); return; }
    if (tapped?.color === "red") { if (premoveMode && premoveRef.current) setPremove(null); setSelectedId(tapped.id); }
  };

  const resign = async () => { const current=serverStateRef.current;if(!current)return;const ack=await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameResign,{gameId:current.gameId,requestId:reqId("xq-resign")});if(ack.ok)applyState(ack.data); };
  const botThinking = serverState?.status === "active" && game.turn === "black";
  const clockMs = { red: serverState?.redRemainingMs ?? null, black: serverState?.blackRemainingMs ?? null };
  const statusCopy = serverError
    ? `Máy chủ Cờ tướng: ${serverError}`
    : roundPhase === "preparing"
    ? "Đang chuẩn bị ván đấu…"
    : roundPhase === "ready"
      ? "Sẵn sàng • Đỏ đi trước"
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
  const boardSurfaceVisible = surface.prepared;

  return (
    <View
      pointerEvents={screenFocused ? "auto" : "none"}
      style={[styles.persistentRoot, !screenFocused && { transform: [{ translateX: windowWidth + 64 }] }]}
      accessibilityElementsHidden={!screenFocused}
      importantForAccessibility={screenFocused ? "auto" : "no-hide-descendants"}
    >
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomHeroHeader
          eyebrow="CỜ TƯỚNG NHÀ MÌNH"
          title="Qua sông, giữ Tướng, vui cùng nhà"
          subtitle="Bàn Cờ tướng nay chạy trên cùng máy chủ realtime với Cờ vua: server giữ luật, đồng hồ, reconnect và Bloom Bot 3s/5s."
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
                  premove={premove}
                  onTap={onBoardTap}
                  onMoveLanded={handleXiangqiMoveLanded}
                  runtimeActive={screenFocused && boardSurfaceVisible}
                  readyEpoch={roundEpoch}
                  onReady={handleBoardReady}
                />
              </>
            ) : (
              <View pointerEvents="none" style={styles.boardPreloadSlot}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
                <Text style={styles.boardPreloadText}>Bloom mở thẻ chuẩn bị trước, rồi mới xếp quân ở nhịp kế tiếp.</Text>
              </View>
            )}
          </View>

          <PlayerRail side="red" name={myName} avatarUrl={userProfile?.avatarUrl} active={playing && game.turn === "red" && !game.gameOver} clockMs={clockMs.red} clockStartedAtMs={turnStartedAtMs} runtimeActive={screenFocused && playing && boardSurfaceVisible} phase={roundPhase} onTenSeconds={playTenSeconds} />

          <View style={styles.actions}>
            <Pressable disabled={game.gameOver || !playing} onPress={() => { void resign(); }} style={[styles.actionPrimary, (game.gameOver || !playing) && styles.disabled]}>
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

    </ScreenContainer>
    </View>
  );
}

export const XiangqiSurfaceHost = React.memo(function XiangqiSurfaceHost({
  occludedByHigherSurface = false,
  onContentPainted,
}: {
  occludedByHigherSurface?: boolean;
  onContentPainted?: () => void;
}) {
  const surface = useXiangqiSurfaceState();
  // Heavy Xiangqi pixels do not exist until a concrete active-game lease prepares
  // this parked host. Route mount alone can never create a board.
  if (!surface.prepared) return null;
  return <XiangqiPreparedSurface
    occludedByHigherSurface={occludedByHigherSurface}
    onContentPainted={onContentPainted}
  />;
});

const styles = StyleSheet.create({
  persistentRoot: { ...StyleSheet.absoluteFillObject, zIndex: 2, elevation: 2, backgroundColor: COLORS.background },
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
  actionPrimary: { flex: 1, height: 52, borderRadius: 20, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  actionPrimaryText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  ruleNote: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  ruleText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17.5 },
});
