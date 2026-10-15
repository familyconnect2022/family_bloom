import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { AppState, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { ScreenContainer } from "../layout/ScreenContainer";
import { BloomCard } from "../ui/BloomPageComponents";
import { XiangqiGameBoard } from "./XiangqiGameBoard";
import { XiangqiGameHeader } from "./XiangqiGameHeader";
import { XiangqiPlayerRail } from "./XiangqiPlayerRail";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import {
  cacheXiangqiBootstrapState,
  finishXiangqiSurfaceGame,
  getCachedXiangqiBootstrapState,
  isXiangqiSurfaceGameTerminal,
  markXiangqiSurfacePrepared,
  useXiangqiSurfaceState,
} from "../../services/xiangqi/xiangqiSurfaceStore";
import { gameRuntimePerf } from "../../services/games/gameRuntimePerf";
import { publishXiangqiTerminalResult } from "../../services/games/boardGameTerminalResultStore";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import { XIANGQI_EVENTS, type XiangqiRealtimeState, type XiangqiMoveDelta } from "../../types/xiangqiRealtime";
import { useBoardGameSoundscape } from "../games/useBoardGameSoundscape";
import { resolveBoardMoveSound, type BoardGamePremove, type RealtimeBoardRoundPhase } from "../../games/shared/boardGameFramework";
import {
  createInitialXiangqiState,
  getXiangqiLegalMoves,
  getXiangqiLegalMovesForColor,
  type XiangqiMove,
} from "../../games/xiangqi/xiangqiEngine";

const reqId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

function XiangqiPreparedSurface({
  occludedByHigherSurface,
  onContentPainted,
}: {
  occludedByHigherSurface: boolean;
  onContentPainted?: () => void;
}) {
  const router = useRouter();
  const surface = useXiangqiSurfaceState();
  const presentationMode = surface.mode;
  const { width: windowWidth } = useWindowDimensions();
  const { user, userProfile, activeFamilyId } = useAuth();
  const membersRealtime = useFamilyMembersRealtime();
  // P2.24: player identity is derived inside the prepared surface that renders
  // the rail. Never rely on a route/local variable that is outside this scope.
  const myName = userProfile?.shortName?.trim()
    || userProfile?.displayName?.trim()
    || user?.displayName?.trim()
    || "Bạn";
  const { criticalAudioReady, playMoveKind, playPremove, playIllegal, playTenSeconds, playGameStart } = useBoardGameSoundscape();
  // P2.17: only the root Presentation Rail owns Xiangqi pixels. A parked
  // surface is translated out and non-interactive; no route can force it visible.
  // Xiangqi owns its presentation decision locally. It no longer depends on a
  // shared Chess/Xiangqi surface-lifecycle predicate.
  const screenFocused = presentationMode === "full" && !occludedByHigherSurface;
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => { const sub = AppState.addEventListener("change", (next) => setAppActive(next === "active")); return () => sub.remove(); }, []);
  const [serverState, setServerState] = useState<XiangqiRealtimeState | null>(() => getCachedXiangqiBootstrapState(surface.gameId));
  const serverStateRef = useRef<XiangqiRealtimeState | null>(serverState);
  serverStateRef.current = serverState;
  // P2.17 rail architecture: the heavy Xiangqi host is mounted only after a
  // concrete server game has been resolved by the lightweight route bootstrap.
  const warmBoard = useMemo(() => createInitialXiangqiState(), []);
  const game = serverState?.board ?? warmBoard;
  const mySide: "red" | "black" = serverState?.blackUid === user?.uid ? "black" : "red";
  const opponentSide: "red" | "black" = mySide === "red" ? "black" : "red";
  const opponentUid = serverState ? (mySide === "red" ? serverState.blackUid : serverState.redUid) : null;
  const opponentMember = opponentUid ? membersRealtime?.memberByUid.get(opponentUid) : null;
  const opponentIsBot = !!opponentUid && !!serverState?.testBotUid && opponentUid === serverState.testBotUid;
  const opponentName = opponentIsBot
    ? "Bloom Bot"
    : opponentMember?.shortName?.trim() || opponentMember?.displayName?.trim() || "Người thân";
  const opponentAvatar = opponentIsBot ? null : opponentMember?.avatarUrl;
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
    finishXiangqiSurfaceGame(terminalState.gameId);
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
    if (isXiangqiSurfaceGameTerminal(next.gameId)) return;
    if (surface.gameId && next.gameId !== surface.gameId) return;
    if (next.status === "finished" || next.status === "cancelled") {
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
    if (isXiangqiSurfaceGameTerminal(delta.gameId)) return;
    if (surface.gameId && delta.gameId !== surface.gameId) return;
    const current = serverStateRef.current;
    if (!current || current.gameId !== delta.gameId) return;
    const next: XiangqiRealtimeState = {
      ...current, board: delta.board, revision: delta.version, redRemainingMs: delta.redRemainingMs,
      blackRemainingMs: delta.blackRemainingMs, status: delta.status, result: delta.result,
      finishReason: delta.finishReason, serverNowMs: delta.serverNowMs, endedAt: delta.endedAt,
    };
    if (next.status === "finished" || next.status === "cancelled") {
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
      if (!gameAck.ok) {
        if (gameAck.errorCode === "XIANGQI_GAME_NOT_FOUND" || gameAck.errorCode === "XIANGQI_GAME_FINISHED") {
          // Server lifetime always wins. A retained surface/gameId is only a
          // cache; when the server says it is gone, delete the local session
          // immediately instead of retrying the dead id forever.
          finishXiangqiSurfaceGame(gameId);
          serverStateRef.current = null;
          setServerState(null);
          setSelectedId(null);
          setPremove(null);
          setBoardReady(false);
          setRoundPhase("preparing");
          readySentForGameRef.current = null;
          return;
        }
        throw new Error(gameAck.message ?? gameAck.errorCode);
      }
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
    return game.turn === mySide
      ? getXiangqiLegalMoves(game, selectedId)
      : getXiangqiLegalMovesForColor(game, selectedId, mySide);
  }, [game, mySide, selectedId, serverState]);


  useEffect(() => {
    if (!screenFocused) return undefined;
    if (!serverState || !boardReady) { setRoundPhase("preparing"); return undefined; }
    // Reconnect to an already-active game must never be held behind audio, but a
    // waiting game may only announce Ready after both the native board scene and
    // critical sound bank are actually usable.
    if (serverState.status === "active") { setRoundPhase("playing"); return undefined; }
    if (serverState.status === "finished") return undefined;
    if (!criticalAudioReady) { setRoundPhase("preparing"); return undefined; }
    setRoundPhase("ready");
    if (readySentForGameRef.current !== serverState.gameId) {
      readySentForGameRef.current = serverState.gameId;
      void xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameReady, { gameId: serverState.gameId, requestId: reqId("xq-ready") }).then((ack) => {
        if (ack.ok) applyState(ack.data);
        else if (readySentForGameRef.current === serverState.gameId) readySentForGameRef.current = null;
      });
    }
    return undefined;
  }, [applyState, boardReady, criticalAudioReady, screenFocused, serverState]);

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
    playMoveKind(resolveBoardMoveSound({ isSelf: mover?.color === mySide, captured: !!move.capturedId, check: !!game.inCheck }));
    const queued = premoveRef.current;
    if (!queued || mover?.color === mySide || game.turn !== mySide || game.gameOver) return;
    const legal = getXiangqiLegalMoves(game, queued.pieceId);
    const stillLegal = legal.some((target) => target.col === queued.to.col && target.row === queued.to.row);
    setPremove(null);
    if (!stillLegal) { playIllegal(); return; }
    requestAnimationFrame(() => { void sendMove(queued.pieceId, queued.to); });
  }, [game, mySide, playIllegal, playMoveKind, screenFocused, sendMove]);

  const onBoardTap = (col: number, row: number) => {
    if (!screenFocused || !boardReady || roundPhase !== "playing" || game.gameOver || !serverState) return;
    const tapped = game.pieces.find((piece) => piece.col === col && piece.row === row);
    const premoveMode = game.turn !== mySide;
    if (selectedId) {
      const selectedPiece = game.pieces.find((piece) => piece.id === selectedId);
      const legal = legalTargets.some((target) => target.col === col && target.row === row);
      if (legal && selectedPiece) {
        if (premoveMode) { setPremove({ pieceId:selectedId, from:{col:selectedPiece.col,row:selectedPiece.row}, to:{col,row}, queuedAtRevision:serverState.revision }); playPremove(); setSelectedId(null); return; }
        void sendMove(selectedId,{col,row}); setSelectedId(null); return;
      }
      if (tapped?.color === mySide) { if (premoveMode && premoveRef.current) setPremove(null); setSelectedId(tapped.id); return; }
      playIllegal(); setSelectedId(null); return;
    }
    if (premove && ((premove.from.col===col&&premove.from.row===row)||(premove.to.col===col&&premove.to.row===row))) { setPremove(null); return; }
    if (tapped?.color === mySide) { if (premoveMode && premoveRef.current) setPremove(null); setSelectedId(tapped.id); }
  };

  const resign = async () => { const current=serverStateRef.current;if(!current)return;const ack=await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameResign,{gameId:current.gameId,requestId:reqId("xq-resign")});if(ack.ok)applyState(ack.data); };
  const opponentThinking = opponentIsBot && serverState?.status === "active" && game.turn === opponentSide;
  const clockMs = { red: serverState?.redRemainingMs ?? null, black: serverState?.blackRemainingMs ?? null };
  const myClockMs = mySide === "red" ? clockMs.red : clockMs.black;
  const opponentClockMs = opponentSide === "red" ? clockMs.red : clockMs.black;
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
      <XiangqiGameHeader
        opponentName={opponentName}
        subtitle={serverState?.status === "active" ? "đồng hồ đang chạy" : "đang chuẩn bị ván"}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.body}>
          <XiangqiPlayerRail side={opponentSide} name={opponentName} avatarUrl={opponentAvatar} active={playing && game.turn === opponentSide && !game.gameOver} thinking={opponentThinking} clockMs={opponentClockMs} clockStartedAtMs={turnStartedAtMs} runtimeActive={screenFocused && playing && boardSurfaceVisible} phase={roundPhase} waitingStatus={serverState?.status === "waiting" ? "chưa sẵn sàng" : null} />


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
                  orientation={mySide}
                />
              </>
            ) : (
              <View pointerEvents="none" style={styles.boardPreloadSlot}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
                <Text style={styles.boardPreloadText}>Bloom mở thẻ chuẩn bị trước, rồi mới xếp quân ở nhịp kế tiếp.</Text>
              </View>
            )}
          </View>

          <XiangqiPlayerRail side={mySide} name={myName} avatarUrl={userProfile?.avatarUrl} active={playing && game.turn === mySide && !game.gameOver} clockMs={myClockMs} clockStartedAtMs={turnStartedAtMs} runtimeActive={screenFocused && playing && boardSurfaceVisible} phase={roundPhase} onTenSeconds={playTenSeconds} />

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
  boardWrap: { position: "relative", alignItems: "center", paddingVertical: 4, overflow: "visible" },
  boardPreloadSlot: { width: "100%", maxWidth: 430, minWidth: 314, aspectRatio: 0.89, borderRadius: 24, borderWidth: 1, borderColor: "#E9C9D6", backgroundColor: "#FFF9FC", alignItems: "center", justifyContent: "center", gap: 10, paddingHorizontal: 28 },
  boardPreloadText: { maxWidth: 280, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "800", textAlign: "center" },
  actions: { flexDirection: "row", gap: 10 },
  actionPrimary: { flex: 1, height: 52, borderRadius: 20, backgroundColor: COLORS.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  actionPrimaryText: { color: COLORS.white, fontSize: 13.5, fontWeight: "900" },
  disabled: { opacity: 0.45 },
  ruleNote: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  ruleText: { flex: 1, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17.5 },
});
