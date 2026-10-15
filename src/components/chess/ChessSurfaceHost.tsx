import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { useChessRealtimeActions } from "../../context/ChessRealtimeContext";
import { useChessGame } from "../../hooks/chess/useChessGame";
import { getCachedChessGameSnapshot } from "../../services/chess/chessGameSnapshotCache";
import {
  markChessSurfacePrepared,
  minimizeChessSurface,
  useChessSurfaceState,
} from "../../services/chess/chessSurfaceStore";
import { emptyChessCaptureSummary, type ChessAppliedMove, type ChessColor, type ChessGameState, type ChessMoveDelta, type ChessPromotionPiece } from "../../types/chess";
import { useBloomDialog } from "../ui/BloomDialogProvider";
import { useBloomToast } from "../ui/BloomToast";
import { ChessBoard } from "./ChessBoard";
import { CHESS_GAME_HEADER_BODY_HEIGHT, ChessGameHeader } from "./ChessGameHeader";
import { ChessPlayerRail } from "./ChessPlayerRail";
import { useChessSoundscape } from "./useChessSoundscape";
import { capturePoints, ChessMaterialStrip } from "./ChessMaterialStrip";
import { resolveBoardMoveSound } from "../../games/shared/boardGameFramework";

const CHESS_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
type SurfaceEntryPhase = "preparing" | "playing";
const CHESS_SCREEN_GUTTER = 5;
const CHESS_HUD_HEIGHT = 56;
const CHESS_CONTENT_GAP = 5;
const CHESS_MATERIAL_HEIGHT = 18;
const PROMOTION_IMAGES = {
  w: {
    q: require("../../../assets/images/chess/pieces-png-default/wq.png"),
    r: require("../../../assets/images/chess/pieces-png-default/wr.png"),
    b: require("../../../assets/images/chess/pieces-png-default/wb.png"),
    n: require("../../../assets/images/chess/pieces-png-default/wn.png"),
  },
  b: {
    q: require("../../../assets/images/chess/pieces-png-default/bq.png"),
    r: require("../../../assets/images/chess/pieces-png-default/br.png"),
    b: require("../../../assets/images/chess/pieces-png-default/bb.png"),
    n: require("../../../assets/images/chess/pieces-png-default/bn.png"),
  },
} as const;

function standbyState(familyId: string | null): ChessGameState {
  const now = new Date().toISOString();
  return {
    gameId: "__family_bloom_chess_warm_surface__",
    familyId: familyId || "warm",
    whiteUid: "warm-white",
    blackUid: "warm-black",
    status: "waiting",
    fen: CHESS_START_FEN,
    turn: "w",
    revision: 0,
    ply: 0,
    whiteRemainingMs: null,
    blackRemainingMs: null,
    timeControl: { kind: "unlimited", initialMs: null, incrementMs: 0 },
    result: null,
    finishReason: null,
    lastMove: null,
    checkSquare: null,
    captureSummary: emptyChessCaptureSummary(),
    drawOfferByUid: null,
    serverNowMs: Date.now(),
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

const noopMove = async () => ({ ok: false, errorCode: "CHESS_INVALID_REQUEST" } as const);
const noopResync = async () => null;
const noopPromotion = async () => null;

/**
 * One persistent Chess native surface for the whole Family Bloom process.
 * Main-screen renders are siblings of this host and cannot remount the board.
 * The board is first constructed only when challenge send/accept requests warmup.
 */
export const ChessSurfaceHost = React.memo(function ChessSurfaceHost({
  occludedByHigherSurface = false,
  onContentPainted,
}: {
  occludedByHigherSurface?: boolean;
  onContentPainted?: () => void;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const surface = useChessSurfaceState();
  const presentationMode = surface.mode;
  const presentationReady = surface.presentationReady;
  const { user, activeFamilyId } = useAuth();
  const members = useFamilyMembersRealtime();
  const realtimeActions = useChessRealtimeActions();
  const { confirm } = useBloomDialog();
  const { showToast } = useBloomToast();
  const {
    criticalAudioReady,
    playMoveKind,
    playPremove,
    playIllegal,
    playTenSeconds,
    playGameStart,
    playReconnect,
  } = useChessSoundscape(surface.prepared);
  const seed = getCachedChessGameSnapshot(surface.gameId);
  // The Presentation Rail claims `full` before paint. Keep the expensive game-store
  // subscription tied to runtime mode so a blurred route/minimized game still
  // sleeps exactly as before; root-rail pixels may remain visually retained
  // during the native transition without keeping realtime render work awake.
  const game = useChessGame(activeFamilyId, surface.gameId, presentationMode === "full" && !!surface.gameId, seed, presentationMode === "full");
  const warmState = useMemo(() => standbyState(activeFamilyId), [activeFamilyId]);
  const state = game.state ?? warmState;
  const me = user?.uid || "";
  const myColor: ChessColor = state.gameId === warmState.gameId
    ? "w"
    : state.whiteUid === me ? "w" : "b";
  const opponentUid = state.gameId === warmState.gameId ? "" : (myColor === "w" ? state.blackUid : state.whiteUid);
  const opponent = members?.memberByUid.get(opponentUid);
  const isBot = !!state.testBotUid && state.testBotUid === opponentUid;
  const opponentName = isBot ? "Bloom Bot" : (opponent?.shortName || opponent?.displayName || "Người thân");
  const meMember = members?.memberByUid.get(me);
  const actualGame = !!surface.gameId && state.gameId !== warmState.gameId;

  const [promotion, setPromotion] = useState<{ resolve: (piece: ChessPromotionPiece | null) => void } | null>(null);
  const [warmReady, setWarmReady] = useState(false);
  const [boardVisualReady, setBoardVisualReady] = useState(false);
  const [entryPhase, setEntryPhase] = useState<SurfaceEntryPhase>("preparing");
  const [menuOpen, setMenuOpen] = useState(false);
  const [readyAwaitingOpponent, setReadyAwaitingOpponent] = useState(false);
  const [visualRevision, setVisualRevision] = useState(-1);
  const [readyRetryNonce, setReadyRetryNonce] = useState(0);
  const readySentForGameRef = useRef<string | null>(null);
  const previousSurfaceGameIdRef = useRef<string | null>(surface.gameId);
  const visualRevisionRef = useRef(-1);
  const soundGameIdRef = useRef<string | null>(null);
  const lastSoundStatusRef = useRef<ChessGameState["status"] | null>(null);
  const reconnectSoundArmedRef = useRef(false);
  const acceptedMoveSoundIdsRef = useRef<Set<string>>(new Set());
  const lastMoveSoundFingerprintRef = useRef<{ key: string; at: number } | null>(null);
  const whiteTurn = useSharedValue(0);
  const blackTurn = useSharedValue(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const offscreenX = windowWidth + 48;
  const fullSurfaceX = useSharedValue(presentationMode === "full" ? 0 : offscreenX);
  const surfaceRootRef = useRef<View | null>(null);
  const [screenOrigin, setScreenOrigin] = useState({ x: 0, y: 0, measured: false });
  const frozenBoardStateRef = useRef<ChessGameState>(state);
  const frozenMoveDeltasRef = useRef(game.moveDeltas);
  const frozenSnapshotEpochRef = useRef(game.snapshotEpoch);

  // Phase 17.9A6: fixed screen geometry. The board is width-owned only:
  // screen width minus one 5dp gutter per side, snapped to whole squares.
  // Vertical placement never feeds back into board size.
  const boardViewportSize = useMemo(() => {
    const raw = Math.max(8, windowWidth - CHESS_SCREEN_GUTTER * 2);
    return Math.max(8, Math.floor(raw / 8) * 8);
  }, [windowWidth]);
  const gameStackHeight = CHESS_HUD_HEIGHT * 2 + CHESS_MATERIAL_HEIGHT * 2 + CHESS_CONTENT_GAP * 4 + boardViewportSize;
  const headerBlockHeight = insets.top + CHESS_GAME_HEADER_BODY_HEIGHT;
  const gameStackTop = headerBlockHeight + Math.max(0, Math.floor((windowHeight - headerBlockHeight - gameStackHeight) / 2));
  const fullSurfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fullSurfaceX.value }],
  }));
  const actionMenuProgress = useSharedValue(0);
  const actionMenuLayerStyle = useAnimatedStyle(() => ({
    opacity: actionMenuProgress.value,
  }));
  const actionMenuCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(actionMenuProgress.value, [0, 1], [-12, 0]) },
      { scale: interpolate(actionMenuProgress.value, [0, 1], [0.94, 1]) },
    ],
  }));

  useEffect(() => {
    actionMenuProgress.value = withTiming(menuOpen ? 1 : 0, { duration: menuOpen ? 180 : 120 });
  }, [actionMenuProgress, menuOpen]);

  // A12: never toggle display on the persistent native board. Full/minimized
  // presentation only moves the already-laid-out surface on/off screen.
  useLayoutEffect(() => {
    fullSurfaceX.value = presentationMode === "full" && !occludedByHigherSurface ? 0 : offscreenX;
  }, [fullSurfaceX, occludedByHigherSurface, offscreenX, presentationMode]);

  // React Navigation/react-native-screens can give this sibling host a native
  // window origin that is not (0, 0), even though the React parent is flex:1.
  // Measure that origin once after prewarm, then translate the entire persistent
  // Chess surface back to physical window coordinates. Board size itself remains
  // width-owned and never participates in this correction.
  useEffect(() => {
    if (!surface.prepared || screenOrigin.measured) return undefined;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      surfaceRootRef.current?.measureInWindow((x, y) => {
        if (cancelled) return;
        setScreenOrigin({ x: Math.round(x), y: Math.round(y), measured: true });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [screenOrigin.measured, surface.prepared]);

  useEffect(() => {
    previousSurfaceGameIdRef.current = surface.gameId;

    if (!surface.gameId) {
      visualRevisionRef.current = -1;
      setVisualRevision(-1);
      setReadyRetryNonce(0);
      setEntryPhase("preparing");
      setPromotion((current) => { current?.resolve(null); return null; });
      readySentForGameRef.current = null;
      setReadyAwaitingOpponent(false);

      // Terminal detach must be truly quiescent. P2.21 briefly re-activated the
      // hidden Chess board for 240ms to repaint its warm starting position. That
      // overlaps the first mount/paint of Xiangqi during a fast Chess -> Xiangqi
      // handoff and keeps Reanimated/native piece work alive after the session is
      // already dead. Keep the retained layer asleep instead; when Chess is claimed
      // again its authoritative snapshot is rebuilt before interaction is enabled.
      return undefined;
    }

    setMenuOpen(false);
    visualRevisionRef.current = -1;
    setVisualRevision(-1);
    setReadyRetryNonce(0);
    setEntryPhase("preparing");
    readySentForGameRef.current = null;
    setReadyAwaitingOpponent(false);
    return undefined;
  }, [surface.gameId]);

  useEffect(() => {
    const active = state.status === "active";
    whiteTurn.value = active && state.turn === "w" ? 1 : 0;
    blackTurn.value = active && state.turn === "b" ? 1 : 0;
  }, [blackTurn, state.status, state.turn, whiteTurn]);

  useEffect(() => {
    const gameId = surface.gameId;
    if (!actualGame || !gameId) {
      soundGameIdRef.current = null;
      lastSoundStatusRef.current = null;
      reconnectSoundArmedRef.current = false;
      acceptedMoveSoundIdsRef.current.clear();
      lastMoveSoundFingerprintRef.current = null;
      return;
    }
    if (soundGameIdRef.current === gameId) return;
    soundGameIdRef.current = gameId;
    lastSoundStatusRef.current = state.status;
    reconnectSoundArmedRef.current = false;
    acceptedMoveSoundIdsRef.current.clear();
    lastMoveSoundFingerprintRef.current = null;
  }, [actualGame, state.revision, state.status, surface.gameId]);

  const handleMoveStarted = useCallback((move: ChessAppliedMove, check: boolean, eventId?: string) => {
    if (!actualGame || presentationMode !== "full") return;
    if (eventId) {
      const seen = acceptedMoveSoundIdsRef.current;
      if (seen.has(eventId)) return;
      seen.add(eventId);
      if (seen.size > 512) {
        const oldest = seen.values().next().value as string | undefined;
        if (oldest) seen.delete(oldest);
      }
    }

    // Defensive semantic dedupe. The optimistic client event and the authoritative
    // socket packet should share clientMoveId, but a reconnect/replay edge can
    // still deliver the same physical move under a different envelope. One exact
    // move by the same colour cannot legitimately repeat within this short window.
    const fingerprint = `${move.color}:${move.from}:${move.to}:${move.promotion ?? ""}`;
    const now = Date.now();
    const previous = lastMoveSoundFingerprintRef.current;
    if (previous?.key === fingerprint && now - previous.at < 1800) return;
    lastMoveSoundFingerprintRef.current = { key: fingerprint, at: now };

    // Castle is a semantic move, not a best-effort SAN decoration. Keep the
    // chess.js flags/SAN checks, but also recognize the invariant king travel of
    // exactly two files. Some authoritative/recovered payloads normalize flags
    // differently; the geometry fallback guarantees O-O/O-O-O still selects the
    // supplied castle.mp3 instead of a normal move cue.
    const kingFileDelta = move.piece === "k"
      ? Math.abs(move.to.charCodeAt(0) - move.from.charCodeAt(0))
      : 0;
    const castleBySquares = /^(?:e1g1|e1c1|e8g8|e8c8)$/.test(`${move.from}${move.to}`);
    const castle = move.flags.includes("k")
      || move.flags.includes("q")
      || /^O-O(?:-O)?[+#]?$/.test(move.san)
      || kingFileDelta === 2
      || castleBySquares;
    const kind = resolveBoardMoveSound({
      isSelf: move.color === myColor,
      captured: !!move.captured,
      check,
      castle,
      promotion: !!move.promotion,
    });
    playMoveKind(kind);
  }, [actualGame, myColor, playMoveKind, presentationMode]);

  useEffect(() => {
    const gameId = surface.gameId;
    if (!actualGame || !gameId) {
      lastSoundStatusRef.current = null;
      return;
    }
    const previousStatus = lastSoundStatusRef.current;
    lastSoundStatusRef.current = state.status;
    if (presentationMode === "full" && previousStatus === "waiting" && state.status === "active") playGameStart();
  }, [actualGame, playGameStart, state.status, surface.gameId, presentationMode]);

  useEffect(() => {
    const gameId = surface.gameId;
    if (!actualGame || !gameId) {
      reconnectSoundArmedRef.current = false;
      return;
    }
    if (game.connectionPhase === "reconnecting") {
      reconnectSoundArmedRef.current = true;
      return;
    }
    if (game.connectionPhase === "connected" && reconnectSoundArmedRef.current) {
      reconnectSoundArmedRef.current = false;
      if (presentationMode === "full") playReconnect();
    }
  }, [actualGame, game.connectionPhase, playReconnect, surface.gameId, presentationMode]);

  useEffect(() => {
    if (!surface.gameId || presentationMode !== "full" || state.status !== "active" || !state.drawOfferByUid || state.drawOfferByUid === me) return;
    let live = true;
    void confirm({
      eyebrow: "ĐỀ NGHỊ HÒA",
      title: "Người thân muốn hòa ván này",
      message: "Bạn có thể đồng ý hoặc tiếp tục chơi.",
      confirmLabel: "Đồng ý hòa",
      cancelLabel: "Tiếp tục chơi",
      icon: "hand-left-outline",
    }).then(async (ok) => {
      if (!live) return;
      const response = ok ? await game.acceptDraw() : await game.rejectDraw();
      if (!response.ok) showToast({ type: "warning", message: "Bloom chưa xử lý được đề nghị hòa." });
    });
    return () => { live = false; };
  }, [confirm, game.acceptDraw, game.rejectDraw, me, showToast, state.drawOfferByUid, state.status, surface.gameId, presentationMode]);

  const handleBoardReady = useCallback(() => {
    setBoardVisualReady(true);
    onContentPainted?.();
  }, [onContentPainted]);

  useEffect(() => {
    // P2.17: visual presentation is independent from audio warmup. The root-rail
    // board may never stay blank because an audio player has not attached yet.
    if (!boardVisualReady || warmReady) return;
    setWarmReady(true);
    markChessSurfacePrepared();
  }, [boardVisualReady, warmReady]);

  const handleVisualRevision = useCallback((revision: number) => {
    visualRevisionRef.current = revision;
    setVisualRevision((current) => current === revision ? current : revision);
  }, []);
  const requestPromotion = useCallback((_from: string, _to: string) => new Promise<ChessPromotionPiece | null>((resolve) => {
    setPromotion({ resolve });
  }), []);

  const runMove = useCallback(async (from: string, to: string, piece: ChessPromotionPiece | undefined, clientMoveId: string, expectedVersion: number) => {
    const response = await game.move(from, to, piece, clientMoveId, expectedVersion);
    if (!response.ok) showToast({ type: "warning", message: "Bloom chưa đi được nước này. Bàn cờ sẽ tự đồng bộ lại." });
    return response;
  }, [game.move, showToast]);

  const captureSummary = state.captureSummary ?? emptyChessCaptureSummary();
  const whitePoints = capturePoints(captureSummary.byWhite);
  const blackPoints = capturePoints(captureSummary.byBlack);
  const sessionSynced = !surface.gameId || game.state?.gameId === surface.gameId;

  useEffect(() => {
    const gameId = surface.gameId;
    if (!gameId || !actualGame || presentationMode !== "full" || !warmReady || !criticalAudioReady || !sessionSynced || state.status !== "waiting" || game.connectionPhase !== "connected") return undefined;
    // Asset/layout warmness is process-wide, but a NEW game must not start its
    // server clock until the new authoritative FEN/revision is actually painted.
    // ChessBoard reports visual revision only after its persistent native slots
    // reconcile. Two extra frames make the ready handshake a painted-board gate.
    if (visualRevision < state.revision) return undefined;
    if (readySentForGameRef.current === gameId) return undefined;
    readySentForGameRef.current = gameId;
    setReadyAwaitingOpponent(true);
    let cancelled = false;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (cancelled || readySentForGameRef.current !== gameId) return;
        void realtimeActions.readyGame(gameId).then((response) => {
          if (cancelled) return;
          if (!response.ok) {
            if (readySentForGameRef.current === gameId) readySentForGameRef.current = null;
            setReadyAwaitingOpponent(false);
            showToast({ type: "warning", message: "Bloom chưa thể bắt đầu đồng hồ. Bàn cờ sẽ thử lại khi kết nối ổn định." });
            setTimeout(() => {
              if (previousSurfaceGameIdRef.current === gameId && readySentForGameRef.current === null) setReadyRetryNonce((value) => value + 1);
            }, 900);
            return;
          }
          if (response.data.status === "active") setReadyAwaitingOpponent(false);
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [actualGame, criticalAudioReady, game.connectionPhase, readyRetryNonce, realtimeActions, sessionSynced, showToast, state.revision, state.status, surface.gameId, presentationMode, visualRevision, warmReady]);

  useEffect(() => {
    if (state.status === "active" || state.status === "finished" || state.status === "cancelled") setReadyAwaitingOpponent(false);
  }, [state.status]);

  useEffect(() => {
    if (!actualGame || presentationMode !== "full") return undefined;
    if (state.status === "finished" || state.status === "cancelled") {
      setEntryPhase("playing");
      return undefined;
    }
    if (!warmReady || game.loading || !sessionSynced || state.status === "waiting" || state.status === "paused") {
      setEntryPhase("preparing");
      return undefined;
    }
    // The server starts the authoritative clock exactly when waiting -> active.
    // Do not keep a post-activation Ready ceremony over the board: the first
    // active frame must also be the first interactive/uncovered frame.
    setEntryPhase("playing");
    return undefined;
  }, [actualGame, game.loading, sessionSynced, state.status, presentationMode, warmReady]);
  const boardInteractive = !!surface.gameId
    && presentationMode === "full"
    && game.connectionPhase === "connected"
    && state.status === "active"
    && sessionSynced
    && entryPhase === "playing"
    && !promotion;


  const minimize = useCallback(() => {
    const gameId = surface.gameId;
    if (!gameId) return;
    setMenuOpen(false);
    // One live session, two presentations. This MUST NOT clear gameId/socket or
    // create another route. Move the retained board outside first, expose the
    // lightweight mini sibling, then return to the route underneath.
    fullSurfaceX.value = offscreenX;
    requestAnimationFrame(() => {
      minimizeChessSurface();
      router.back();
    });
  }, [fullSurfaceX, offscreenX, router, surface.gameId]);


  const offerDraw = useCallback(async () => {
    const ok = await confirm({ title: "Cầu hòa ván này?", message: "Bloom sẽ gửi lời cầu hòa để người thân quyết định.", confirmLabel: "Gửi lời cầu hòa", cancelLabel: "Chưa gửi", icon: "hand-left-outline" });
    if (!ok) return;
    const response = await game.offerDraw();
    if (!response.ok) showToast({ type: "warning", message: "Chưa gửi được đề nghị hòa." });
  }, [confirm, game.offerDraw, showToast]);

  const resign = useCallback(async () => {
    const ok = await confirm({ title: "Xin thua ván này?", message: "Kết quả sẽ được lưu và không thể hoàn tác.", confirmLabel: "Xin thua", cancelLabel: "Chơi tiếp", destructive: true, icon: "flag-outline" });
    if (!ok) return;
    const response = await game.resign();
    if (!response.ok) showToast({ type: "warning", message: "Bloom chưa thể kết thúc ván lúc này." });
  }, [confirm, game.resign, showToast]);


  if (!surface.prepared) return null;

  // P2.17: the root Presentation Rail is the only pixel owner. Routes never
  // bypass rail visibility, so a parked board cannot intercept or repaint over
  // another surface.
  const fullVisible = presentationMode === "full" && !occludedByHigherSurface;
  if (fullVisible || !actualGame) {
    frozenBoardStateRef.current = state;
    frozenMoveDeltasRef.current = actualGame ? game.moveDeltas : [];
    frozenSnapshotEpochRef.current = actualGame ? game.snapshotEpoch : 0;
  }
  const boardState = fullVisible ? state : frozenBoardStateRef.current;
  const boardMoveDeltas = fullVisible && actualGame ? game.moveDeltas : frozenMoveDeltasRef.current;
  const boardSnapshotEpoch = fullVisible && actualGame ? game.snapshotEpoch : frozenSnapshotEpochRef.current;
  // P2.16.2: once the native board is painted, network/session recovery is a
  // non-blocking board status, not another full-screen ceremony. Interaction is
  // still guarded by `boardInteractive`; this only stops a healthy painted board
  // from being visually covered for tens of seconds by app:join/resync latency.
  const showPreparing = fullVisible && !actualGame && !warmReady;
  const showSyncPill = fullVisible && actualGame && (
    game.connectionPhase !== "connected"
    || !sessionSynced
    || state.status === "paused"
  );
  const modalVisible = fullVisible && (showPreparing || (!!promotion && actualGame));
  const modalInteractive = !!promotion;

  return (
    <View
      ref={surfaceRootRef}
      collapsable={false}
      pointerEvents="box-none"
      style={[
        styles.chessSurfaceRoot,
        {
          width: windowWidth,
          height: windowHeight,
          left: -screenOrigin.x,
          top: -screenOrigin.y,
          opacity: 1,
        },
      ]}
    >
      {/* Persistent content layer. Geometry is owned here; modal chrome is a sibling. */}
      <Animated.View
        pointerEvents={fullVisible ? "auto" : "none"}
        style={[
          styles.chessContentLayer,
          { width: windowWidth, height: windowHeight },
          fullSurfaceStyle,
        ]}
      >
        <ChessGameHeader
          opponentName={opponentName}
          subtitle={state.status === "active" ? "đồng hồ đang chạy" : "đang chuẩn bị ván"}
          onBack={actualGame ? minimize : undefined}
        />
        <View style={[styles.gameStack, { top: gameStackTop, width: windowWidth, height: gameStackHeight }]}>
        <View style={[styles.hudWrap, { width: boardViewportSize }]}>
          {actualGame ? (
            <ChessPlayerRail
              state={state}
              color={myColor === "w" ? "b" : "w"}
              displayName={opponentName}
              avatarUrl={opponent?.avatarUrl}
              avatarFallback={opponentName.slice(0, 1)}
              isBot={isBot}
              activeSignal={myColor === "w" ? blackTurn : whiteTurn}
              runtimeActive={fullVisible && state.status === "active"}
              statusText={state.status === "waiting" ? "chưa sẵn sàng" : null}
              actions={(
                <View style={styles.topActions}>
                  <>
                    <Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn ván cờ" onPress={() => setMenuOpen((value) => !value)} style={styles.topButton}>
                      <Ionicons name="ellipsis-vertical" size={18} color={COLORS.primaryText} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Thu nhỏ bàn cờ"
                      disabled={state.status === "waiting" || entryPhase !== "playing"}
                      onPress={minimize}
                      style={[styles.topButton, (state.status === "waiting" || entryPhase !== "playing") && styles.topButtonDisabled]}
                    >
                      <Ionicons name="contract-outline" size={18} color={COLORS.primaryText} />
                    </Pressable>
                  </>
                </View>
              )}
            />
          ) : <View style={styles.railPlaceholder} />}
        </View>

        <View style={[styles.materialRow, { width: boardViewportSize, height: CHESS_MATERIAL_HEIGHT }]}>
          {actualGame ? (
            <ChessMaterialStrip
              captures={myColor === "w" ? captureSummary.byBlack : captureSummary.byWhite}
              playerColor={myColor === "w" ? "b" : "w"}
              advantage={myColor === "w" ? Math.max(0, blackPoints - whitePoints) : Math.max(0, whitePoints - blackPoints)}
            />
          ) : null}
        </View>

        <View style={[styles.boardFrame, { width: boardViewportSize, height: boardViewportSize }]}>
          <View style={styles.boardPersistent}>
            <ChessBoard
              state={boardState}
              myColor={myColor}
              moveDeltas={boardMoveDeltas}
              snapshotEpoch={boardSnapshotEpoch}
              onMove={actualGame ? runMove : noopMove}
              onResync={actualGame ? game.resync : noopResync}
              onPromotion={actualGame ? requestPromotion : noopPromotion}
              onVisualRevisionChange={handleVisualRevision}
              onBoardReady={handleBoardReady}
              onPremoveQueued={actualGame ? playPremove : undefined}
              onMoveStarted={actualGame ? handleMoveStarted : undefined}
              onIllegalMove={actualGame ? playIllegal : undefined}
              hintsEnabled={actualGame}
              motionFxEnabled={actualGame && presentationMode === "full"}
              interactionBlocked={!boardInteractive}
              runtimeActive={actualGame ? fullVisible : surface.preparing}
              boardSize={boardViewportSize}
            />
          </View>
          {showSyncPill ? (
            <View pointerEvents="none" style={styles.reconnectPill}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.reconnectText}>{!sessionSynced || game.connectionPhase === "synchronizing"
                ? "Đang đồng bộ ván cờ…"
                : game.connectionPhase !== "connected"
                  ? "Đang kết nối lại… bàn cờ được giữ nguyên"
                  : state.status === "waiting"
                    ? readyAwaitingOpponent ? "Bạn đã sẵn sàng • đang chờ bắt đầu" : "Đang bắt đầu ván cờ…"
                    : "Ván cờ đang tạm dừng…"}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.materialRow, styles.materialRowBottom, { width: boardViewportSize, height: CHESS_MATERIAL_HEIGHT }]}>
          {actualGame ? (
            <ChessMaterialStrip
              captures={myColor === "w" ? captureSummary.byWhite : captureSummary.byBlack}
              playerColor={myColor}
              advantage={myColor === "w" ? Math.max(0, whitePoints - blackPoints) : Math.max(0, blackPoints - whitePoints)}
            />
          ) : null}
        </View>

        <View style={[styles.hudWrap, { width: boardViewportSize }]}>
          {actualGame ? (
            <ChessPlayerRail
              state={state}
              color={myColor}
              displayName={meMember?.shortName || meMember?.displayName || "Bạn"}
              avatarUrl={meMember?.avatarUrl}
              avatarFallback={(meMember?.shortName || meMember?.displayName || "B").slice(0, 1)}
              activeSignal={myColor === "w" ? whiteTurn : blackTurn}
              runtimeActive={fullVisible && state.status === "active"}
              onTenSeconds={playTenSeconds}
            />
          ) : <View style={styles.railPlaceholder} />}
        </View>
        </View>
      </Animated.View>

      {/* P2.10 game actions live in the root screen coordinate system. Keeping this
          panel outside ChessPlayerRail prevents Android's native board layer from
          painting over Cầu hòa / Xin thua. */}
      {fullVisible && actualGame && state.status !== "finished" ? (
        <Animated.View
          pointerEvents={menuOpen ? "auto" : "none"}
          style={[
            styles.gameActionLayer,
            { width: windowWidth, height: windowHeight },
            actionMenuLayerStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đóng tùy chọn ván cờ"
            onPress={() => setMenuOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View
            style={[
              styles.gameActionHero,
              { top: Math.max(72, gameStackTop + CHESS_HUD_HEIGHT + 8) },
              actionMenuCardStyle,
            ]}
          >
            <View pointerEvents="none" style={styles.gameActionGlowA} />
            <View pointerEvents="none" style={styles.gameActionGlowB} />
            <View style={styles.gameActionHeading}>
              <View style={styles.gameActionSpark}>
                <Ionicons name="sparkles" size={16} color="#B64E78" />
              </View>
              <View style={styles.gameActionHeadingCopy}>
                <Text style={styles.gameActionEyebrow}>BLOOM SUPER HERO</Text>
                <Text style={styles.gameActionTitle}>Chọn cách khép lại ván</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Đóng" onPress={() => setMenuOpen(false)} style={styles.gameActionClose}>
                <Ionicons name="close" size={17} color={COLORS.primaryText} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cầu hòa"
              onPress={() => { setMenuOpen(false); void offerDraw(); }}
              style={({ pressed }) => [styles.gameActionChoice, pressed && styles.gameActionChoicePressed]}
            >
              <View style={[styles.gameActionChoiceIcon, styles.gameActionChoiceIconDraw]}>
                <Ionicons name="hand-left-outline" size={22} color="#8D4D73" />
              </View>
              <View style={styles.gameActionChoiceCopy}>
                <Text style={styles.gameActionChoiceTitle}>Cầu hòa</Text>
                <Text style={styles.gameActionChoiceText}>Gửi một lời hòa nhã để cả hai cùng quyết định.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C46F94" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Xin thua"
              onPress={() => { setMenuOpen(false); void resign(); }}
              style={({ pressed }) => [styles.gameActionChoice, styles.gameActionChoiceResign, pressed && styles.gameActionChoicePressed]}
            >
              <View style={[styles.gameActionChoiceIcon, styles.gameActionChoiceIconResign]}>
                <Ionicons name="flag-outline" size={22} color="#A4455A" />
              </View>
              <View style={styles.gameActionChoiceCopy}>
                <Text style={[styles.gameActionChoiceTitle, styles.gameActionChoiceTitleResign]}>Xin thua</Text>
                <Text style={styles.gameActionChoiceText}>Khép ván ngay và lưu kết quả cho cả hai.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#C86378" />
            </Pressable>
          </Animated.View>
        </Animated.View>
      ) : null}

      {/* One explicit screen coordinate system for Ready / Promotion / Result. */}
      {modalVisible ? (
        <View
          pointerEvents={modalInteractive ? "auto" : "none"}
          style={[styles.chessModalLayer, { width: windowWidth, height: windowHeight }]}
        >
          {showPreparing ? (
            <View style={styles.prepareCard}>
              {readyAwaitingOpponent ? <Ionicons name="checkmark-circle" size={24} color="#4E9B72" /> : <ActivityIndicator size="small" color={COLORS.primary} />}
              <Text style={styles.prepareTitle}>{readyAwaitingOpponent && state.status === "waiting" ? "Bạn đã sẵn sàng" : !warmReady ? "Đang vẽ bàn cờ…" : !criticalAudioReady ? "Đang chuẩn bị âm thanh…" : "Đang đồng bộ ván cờ…"}</Text>
              <Text style={styles.prepareText}>{readyAwaitingOpponent && state.status === "waiting" ? "Đồng hồ chưa chạy. Bloom đang chờ người thân sẵn sàng trên bàn cờ của họ." : "Bloom đang hoàn tất bàn cờ để bạn có thể chơi ngay."}</Text>
            </View>
          ) : null}

          {promotion && actualGame ? (
            <View style={styles.promotionCard}>
              <Text style={styles.promotionTitle}>Phong quân</Text>
              <View style={styles.promotionRow}>
                {(["q", "r", "b", "n"] as const).map((piece) => (
                  <Pressable key={piece} style={styles.promotionButton} onPress={() => { const resolve = promotion.resolve; setPromotion(null); resolve(piece); }}>
                    <Image source={PROMOTION_IMAGES[myColor][piece]} resizeMode="contain" style={styles.promotionPiece} />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

        </View>
      ) : null}

      {presentationReady
        && surface.preparing
        && presentationMode === "hidden"
        && surface.prepareReason !== "active_game" ? (
        <View pointerEvents="none" style={styles.prewarmNoticeWrap}>
          <View style={styles.prewarmNotice}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <View style={styles.prewarmCopy}>
              <Text style={styles.prewarmTitle}>Đang chuẩn bị bàn cờ…</Text>
              <Text style={styles.prewarmText}>Bloom đang vẽ quân cờ trong lúc chờ lời thách đấu.</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  chessSurfaceRoot: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 10000,
    overflow: "visible",
  },
  chessContentLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    backgroundColor: "#FFF8FB",
    overflow: "hidden",
  },
  gameStack: {
    position: "absolute",
    left: 0,
    alignItems: "center",
    gap: CHESS_CONTENT_GAP,
  },
  hudWrap: { alignItems: "stretch" },
  materialRow: { alignItems: "flex-start", justifyContent: "center", paddingHorizontal: 4 },
  materialRowBottom: { alignItems: "flex-end" },
  topActions: { position: "relative", flexDirection: "row", alignItems: "center", gap: 4, zIndex: 80 },
  topButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: "rgba(252,231,239,0.92)", alignItems: "center", justifyContent: "center" },
  gameActionLayer: { position: "absolute", left: 0, top: 0, zIndex: 15000, elevation: 40 },
  gameActionHero: {
    position: "absolute",
    left: 18,
    right: 18,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "rgba(255,249,252,0.985)",
    borderWidth: 1,
    borderColor: "#EABFD1",
    padding: 14,
    gap: 10,
    shadowColor: "#74374F",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 24,
  },
  gameActionGlowA: { position: "absolute", width: 94, height: 94, borderRadius: 47, backgroundColor: "rgba(239,125,169,0.13)", right: -26, top: -34 },
  gameActionGlowB: { position: "absolute", width: 76, height: 76, borderRadius: 38, backgroundColor: "rgba(255,207,130,0.11)", left: -20, bottom: -30 },
  gameActionHeading: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 2, paddingBottom: 2 },
  gameActionSpark: { width: 38, height: 38, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#FCE6EF", borderWidth: 1, borderColor: "#F0CBD9" },
  gameActionHeadingCopy: { flex: 1, minWidth: 0 },
  gameActionEyebrow: { color: "#B15C7F", fontSize: 8.5, fontWeight: "900", letterSpacing: 0.8 },
  gameActionTitle: { marginTop: 2, color: COLORS.primaryText, fontSize: 14.5, lineHeight: 19, fontWeight: "900" },
  gameActionClose: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(246,225,234,0.82)" },
  gameActionChoice: { minHeight: 68, borderRadius: 20, paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#FFF5F9", borderWidth: 1, borderColor: "#F0D4E0" },
  gameActionChoiceResign: { backgroundColor: "#FFF6F6", borderColor: "#F0D2D7" },
  gameActionChoicePressed: { transform: [{ scale: 0.985 }], opacity: 0.86 },
  gameActionChoiceIcon: { width: 44, height: 44, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  gameActionChoiceIconDraw: { backgroundColor: "#F7E1EC" },
  gameActionChoiceIconResign: { backgroundColor: "#FBE2E5" },
  gameActionChoiceCopy: { flex: 1, minWidth: 0 },
  gameActionChoiceTitle: { color: "#80415F", fontSize: 13.5, lineHeight: 18, fontWeight: "900" },
  gameActionChoiceTitleResign: { color: "#9A4053" },
  gameActionChoiceText: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13.5 },
  railPlaceholder: { height: CHESS_HUD_HEIGHT },
  boardFrame: { alignItems: "center", justifyContent: "center", overflow: "visible", borderRadius: 22 },
  boardPersistent: { alignItems: "center", justifyContent: "center" },
  reconnectPill: { position: "absolute", top: 10, alignSelf: "center", minHeight: 34, borderRadius: 17, paddingHorizontal: 12, backgroundColor: "rgba(255,249,252,0.95)", borderWidth: 1, borderColor: "#EACFD9", flexDirection: "row", alignItems: "center", gap: 7, zIndex: 35 },
  reconnectText: { color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  chessModalLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,249,252,0.72)",
    padding: 18,
    zIndex: 20000,
    elevation: 0,
  },
  prepareCard: { width: "86%", maxWidth: 330, borderRadius: 24, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#EBCAD7", paddingHorizontal: 18, paddingVertical: 18, alignItems: "center", gap: 7, elevation: 6 },
  prepareTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  prepareText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16, textAlign: "center" },
  promotionCard: { width: "88%", maxWidth: 340, borderRadius: 24, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#EBCAD7", padding: 16, alignItems: "center" },
  promotionTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900", marginBottom: 12 },
  promotionRow: { flexDirection: "row", gap: 8 },
  promotionButton: { width: 62, height: 62, borderRadius: 19, backgroundColor: "#F9E9F0", alignItems: "center", justifyContent: "center" },
  promotionPiece: { width: 52, height: 52 },

  prewarmNoticeWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1490, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  prewarmNotice: { width: "100%", maxWidth: 370, minHeight: 82, borderRadius: 24, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#E9C9D5", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, elevation: 12, shadowColor: "#3B202C", shadowOpacity: 0.16, shadowRadius: 18 },
  prewarmCopy: { flex: 1 },
  prewarmTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  prewarmText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
});
