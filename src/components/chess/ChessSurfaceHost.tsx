import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue } from "react-native-reanimated";

import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { useChessRealtimeActions } from "../../context/ChessRealtimeContext";
import { useChessGame } from "../../hooks/chess/useChessGame";
import { getCachedChessGameSnapshot, cacheChessGameSnapshot } from "../../services/chess/chessGameSnapshotCache";
import { shouldReleaseRematchPreparing } from "../../services/chess/chessRematchUiPolicy";
import { subscribeChessSoundUiEvents } from "../../services/chess/chessSoundEventBus";
import { getHomeGamePlayWindow } from "../../services/games/gameRoomPolicy";
import {
  activateChessSurface,
  finishChessSurfaceGame,
  markChessSurfacePrepared,
  prepareChessSurface,
  minimizeChessSurface,
  useChessSurfaceState,
} from "../../services/chess/chessSurfaceStore";
import { emptyChessCaptureSummary, type ChessColor, type ChessGameState, type ChessMoveDelta, type ChessPromotionPiece } from "../../types/chess";
import { useBloomDialog } from "../ui/BloomDialogProvider";
import { useBloomToast } from "../ui/BloomToast";
import { ChessBoard } from "./ChessBoard";
import { ChessPlayerRail } from "./ChessPlayerRail";
import { ChessVictoryConfetti } from "./ChessVictoryConfetti";
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
export const ChessSurfaceHost = React.memo(function ChessSurfaceHost() {
  const surface = useChessSurfaceState();
  const presentationReady = surface.presentationReady;
  const { user, activeFamilyId } = useAuth();
  const members = useFamilyMembersRealtime();
  const realtimeActions = useChessRealtimeActions();
  const { confirm } = useBloomDialog();
  const { showToast } = useBloomToast();
  const {
    playMoveKind,
    playPremove,
    playIllegal,
    playTenSeconds,
    playGameStart,
    playGameEnd,
    playReconnect,
    playChallengeSent,
    playChallengeAccepted,
  } = useChessSoundscape();
  const seed = getCachedChessGameSnapshot(surface.gameId);
  const game = useChessGame(activeFamilyId, surface.gameId, surface.mode === "full" && !!surface.gameId, seed, surface.mode === "full");
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
  const [resultDismissed, setResultDismissed] = useState(false);
  const [entryPhase, setEntryPhase] = useState<SurfaceEntryPhase>("preparing");
  const [resettingWarmBoard, setResettingWarmBoard] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rematchPreparing, setRematchPreparing] = useState(false);
  const [rematchWaitingUntil, setRematchWaitingUntil] = useState<number | null>(null);
  const [readyAwaitingOpponent, setReadyAwaitingOpponent] = useState(false);
  const [visualRevision, setVisualRevision] = useState(-1);
  const [readyRetryNonce, setReadyRetryNonce] = useState(0);
  const rematchInFlightRef = useRef(false);
  const rematchRequestIdRef = useRef<string | null>(null);
  const readySentForGameRef = useRef<string | null>(null);
  const rematchTargetGameIdRef = useRef<string | null>(null);
  const rematchSourceGameIdRef = useRef<string | null>(null);
  const previousSurfaceGameIdRef = useRef<string | null>(surface.gameId);
  const visualRevisionRef = useRef(-1);
  const soundGameIdRef = useRef<string | null>(null);
  const lastSoundStatusRef = useRef<ChessGameState["status"] | null>(null);
  const reconnectSoundArmedRef = useRef(false);
  const resultSoundPlayedForGameRef = useRef<string | null>(null);
  const resultSoundTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const whiteTurn = useSharedValue(0);
  const blackTurn = useSharedValue(0);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const offscreenX = windowWidth + 48;
  const fullSurfaceX = useSharedValue(surface.mode === "full" ? 0 : offscreenX);
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
  const gameStackTop = Math.max(0, Math.floor((windowHeight - gameStackHeight) / 2));
  const fullSurfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: fullSurfaceX.value }],
  }));

  // A12: never toggle display on the persistent native board. Full/minimized
  // presentation only moves the already-laid-out surface on/off screen.
  useLayoutEffect(() => {
    fullSurfaceX.value = presentationReady && surface.mode === "full" ? 0 : offscreenX;
  }, [fullSurfaceX, offscreenX, presentationReady, surface.mode]);

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
    const previousGameId = previousSurfaceGameIdRef.current;
    previousSurfaceGameIdRef.current = surface.gameId;

    if (!surface.gameId) {
      visualRevisionRef.current = -1;
      setVisualRevision(-1);
      setReadyRetryNonce(0);
      setResultDismissed(false);
      setEntryPhase("preparing");
      setPromotion((current) => { current?.resolve(null); return null; });
      readySentForGameRef.current = null;
      setReadyAwaitingOpponent(false);
      setRematchWaitingUntil(null);
      rematchRequestIdRef.current = null;

      // After a finished session is detached, briefly wake the hidden persistent
      // board so its fixed 32 native piece slots reconcile back to the starting
      // position. The surface then sleeps again without unmounting. The next game
      // therefore starts from a clean warm board instead of replaying stale pieces.
      if (previousGameId) {
        setResettingWarmBoard(true);
        const timer = setTimeout(() => setResettingWarmBoard(false), 240);
        return () => clearTimeout(timer);
      }
      setResettingWarmBoard(false);
      return undefined;
    }

    setResettingWarmBoard(false);
    setMenuOpen(false);
    visualRevisionRef.current = -1;
    setVisualRevision(-1);
    setReadyRetryNonce(0);
    setResultDismissed(false);
    setEntryPhase("preparing");
    readySentForGameRef.current = null;
    setReadyAwaitingOpponent(false);
    setRematchWaitingUntil(null);
    rematchRequestIdRef.current = null;
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
      resultSoundPlayedForGameRef.current = null;
      if (resultSoundTimerRef.current) clearTimeout(resultSoundTimerRef.current);
      resultSoundTimerRef.current = null;
      return;
    }
    if (soundGameIdRef.current === gameId) return;
    soundGameIdRef.current = gameId;
    lastSoundStatusRef.current = state.status;
    reconnectSoundArmedRef.current = false;
    resultSoundPlayedForGameRef.current = null;
    if (resultSoundTimerRef.current) clearTimeout(resultSoundTimerRef.current);
    resultSoundTimerRef.current = null;
  }, [actualGame, state.revision, state.status, surface.gameId]);

  const handleMoveLanded = useCallback((delta: ChessMoveDelta) => {
    if (!actualGame || surface.mode !== "full") return;
    const kind = resolveBoardMoveSound({
      isSelf: delta.move.color === myColor,
      captured: !!delta.move.captured,
      check: !!delta.checkSquare,
      castle: delta.move.flags.includes("k") || delta.move.flags.includes("q"),
      promotion: !!delta.move.promotion,
    });
    playMoveKind(kind);

    // A15: a move-triggered game end must never sound before the moving piece
    // physically reaches its destination. The authoritative delta arms the
    // terminal sound, but the renderer landing callback owns the exact moment.
    if (delta.status === "finished" && delta.gameId === surface.gameId && resultSoundPlayedForGameRef.current !== delta.gameId) {
      resultSoundPlayedForGameRef.current = delta.gameId;
      if (resultSoundTimerRef.current) clearTimeout(resultSoundTimerRef.current);
      resultSoundTimerRef.current = setTimeout(() => {
        resultSoundTimerRef.current = null;
        playGameEnd();
      }, 120);
    }
  }, [actualGame, myColor, playGameEnd, playMoveKind, surface.gameId, surface.mode]);

  useEffect(() => {
    const gameId = surface.gameId;
    if (!actualGame || !gameId) {
      lastSoundStatusRef.current = null;
      return;
    }
    const previousStatus = lastSoundStatusRef.current;
    lastSoundStatusRef.current = state.status;
    if (surface.mode === "full" && previousStatus === "waiting" && state.status === "active") playGameStart();
  }, [actualGame, playGameStart, state.status, surface.gameId, surface.mode]);

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
      if (surface.mode === "full") playReconnect();
    }
  }, [actualGame, game.connectionPhase, playReconnect, surface.gameId, surface.mode]);

  useEffect(() => {
    const gameId = surface.gameId;
    if (!actualGame || !gameId || surface.mode !== "full" || state.status !== "finished") return undefined;
    if (resultSoundPlayedForGameRef.current === gameId) return undefined;

    // Resign/draw/timeout have no landing callback, so keep a short fallback.
    // For checkmate/stalemate caused by a move, handleMoveLanded cancels this
    // timer and schedules game-end only after the final piece has landed.
    resultSoundTimerRef.current = setTimeout(() => {
      resultSoundTimerRef.current = null;
      if (resultSoundPlayedForGameRef.current === gameId) return;
      resultSoundPlayedForGameRef.current = gameId;
      playGameEnd();
    }, 420);
    return () => {
      if (resultSoundTimerRef.current) clearTimeout(resultSoundTimerRef.current);
      resultSoundTimerRef.current = null;
    };
  }, [actualGame, playGameEnd, state.status, surface.gameId, surface.mode]);

  useEffect(() => subscribeChessSoundUiEvents((event) => {
    if (event === "challenge_sent") playChallengeSent();
    else if (event === "challenge_accepted") playChallengeAccepted();
  }), [playChallengeAccepted, playChallengeSent]);

  useEffect(() => {
    if (!surface.gameId || surface.mode !== "full" || state.status !== "active" || !state.drawOfferByUid || state.drawOfferByUid === me) return;
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
  }, [confirm, game.acceptDraw, game.rejectDraw, me, showToast, state.drawOfferByUid, state.status, surface.gameId, surface.mode]);

  const handleBoardReady = useCallback(() => {
    setWarmReady(true);
    markChessSurfacePrepared();
  }, []);

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
    if (!gameId || !actualGame || surface.mode !== "full" || !warmReady || !sessionSynced || state.status !== "waiting" || game.connectionPhase !== "connected") return undefined;
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
  }, [actualGame, game.connectionPhase, readyRetryNonce, realtimeActions, sessionSynced, showToast, state.revision, state.status, surface.gameId, surface.mode, visualRevision, warmReady]);

  useEffect(() => {
    if (state.status === "active" || state.status === "finished" || state.status === "cancelled") setReadyAwaitingOpponent(false);
  }, [state.status]);

  useEffect(() => {
    if (!actualGame || surface.mode !== "full") return undefined;
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
  }, [actualGame, game.loading, sessionSynced, state.status, surface.mode, warmReady]);
  const boardInteractive = !!surface.gameId
    && surface.mode === "full"
    && game.connectionPhase === "connected"
    && state.status === "active"
    && sessionSynced
    && entryPhase === "playing"
    && !promotion;

  const didWin = state.result === "white" ? myColor === "w" : state.result === "black" ? myColor === "b" : false;
  const resultTitle = state.result === "draw" ? "Ván cờ hòa" : didWin ? "Bạn thắng" : "Bạn thua";

  const minimize = useCallback(() => {
    setMenuOpen(false);
    // Visual handoff first: move the full native surface out of the viewport on
    // the UI thread. Only on the next frame do we change lifecycle/subscriptions.
    fullSurfaceX.value = offscreenX;
    requestAnimationFrame(() => minimizeChessSurface());
  }, [fullSurfaceX, offscreenX]);

  const leaveFinished = useCallback(() => {
    const finishedGameId = surface.gameId;
    setResultDismissed(true);
    setMenuOpen(false);
    // Hide Chess first so confetti/modal/full-board composition leaves the
    // screen before result ACK + store cleanup run on the following frame.
    fullSurfaceX.value = offscreenX;
    requestAnimationFrame(() => {
      if (finishedGameId) realtimeActions.acknowledgeResult(finishedGameId);
      if (rematchWaitingUntil && finishedGameId) void realtimeActions.cancelRematch(finishedGameId);
      finishChessSurfaceGame(finishedGameId);
    });
  }, [fullSurfaceX, offscreenX, realtimeActions, rematchWaitingUntil, surface.gameId]);

  const offerDraw = useCallback(async () => {
    const ok = await confirm({ title: "Đề nghị hòa?", message: "Người thân có thể đồng ý hoặc tiếp tục ván.", confirmLabel: "Gửi đề nghị", cancelLabel: "Chưa gửi", icon: "hand-left-outline" });
    if (!ok) return;
    const response = await game.offerDraw();
    if (!response.ok) showToast({ type: "warning", message: "Chưa gửi được đề nghị hòa." });
  }, [confirm, game.offerDraw, showToast]);

  const resign = useCallback(async () => {
    const ok = await confirm({ title: "Đầu hàng ván này?", message: "Kết quả sẽ được lưu và không thể hoàn tác.", confirmLabel: "Đầu hàng", cancelLabel: "Chơi tiếp", destructive: true, icon: "flag-outline" });
    if (!ok) return;
    const response = await game.resign();
    if (!response.ok) showToast({ type: "warning", message: "Bloom chưa thể kết thúc ván lúc này." });
  }, [confirm, game.resign, showToast]);

  const rematch = useCallback(async () => {
    if (rematchInFlightRef.current || rematchWaitingUntil) return;
    const sourceGameId = surface.gameId;
    if (!sourceGameId) return;
    realtimeActions.acknowledgeResult(sourceGameId);
    const latest = getHomeGamePlayWindow();
    if (!isBot && !latest.canCreate) {
      showToast({ type: "info", title: "Ván này khép lại rồi 🌙", message: "Mình hẹn nhau chơi tiếp từ 6:00 sáng nhé." });
      return;
    }
    rematchInFlightRef.current = true;
    const stableRequestId = rematchRequestIdRef.current ?? `rematch-${sourceGameId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    rematchRequestIdRef.current = stableRequestId;
    setResultDismissed(true);
    setRematchPreparing(true);
    rematchSourceGameIdRef.current = sourceGameId;
    rematchTargetGameIdRef.current = null;
    prepareChessSurface("rematch");
    try {
      const response = await game.rematch(stableRequestId);
      if (!response.ok) {
        setRematchPreparing(false);
        setResultDismissed(false);
        rematchSourceGameIdRef.current = null;
        rematchTargetGameIdRef.current = null;
        // A transport timeout is ambiguous: the server may already have accepted
        // this exact rematch. Preserve the request id so the next tap is a true
        // idempotent retry instead of a second logical request.
        if (response.errorCode !== "CHESS_SERVER_RECOVERING") rematchRequestIdRef.current = null;
        showToast({ type: "warning", message: response.errorCode === "CHESS_SERVER_RECOVERING" ? "Kết nối chưa ổn định. Bạn có thể bấm Chơi lại lần nữa để Bloom kiểm tra đúng yêu cầu vừa gửi." : "Bloom chưa chuẩn bị được ván mới." });
        return;
      }
      if (response.data.state) cacheChessGameSnapshot(response.data.state);
      if (response.data.gameId) {
        rematchTargetGameIdRef.current = response.data.gameId;
        setRematchWaitingUntil(null);
        rematchRequestIdRef.current = null;
        activateChessSurface(response.data.gameId, "full");
        return;
      }
      if (response.data.waiting) {
        setRematchPreparing(false);
        setResultDismissed(false);
        setRematchWaitingUntil(response.data.expiresAt ?? Date.now() + 45_000);
        rematchSourceGameIdRef.current = null;
        showToast({ type: "info", message: "Đã gửi lời chơi lại. Bloom sẽ mở bàn cờ khi người thân đồng ý." });
        return;
      }
      setRematchPreparing(false);
      setResultDismissed(false);
      rematchSourceGameIdRef.current = null;
      rematchRequestIdRef.current = null;
      showToast({ type: "warning", message: "Bloom chưa nhận được trạng thái ván mới." });
    } finally {
      rematchInFlightRef.current = false;
    }
  }, [game.rematch, isBot, realtimeActions, rematchWaitingUntil, showToast, state.finishReason, surface.gameId]);

  const cancelRematch = useCallback(async () => {
    const gameId = surface.gameId;
    if (!gameId || !rematchWaitingUntil) return;
    setRematchWaitingUntil(null);
    rematchRequestIdRef.current = null;
    const response = await realtimeActions.cancelRematch(gameId);
    showToast({
      type: response.ok ? "info" : "warning",
      message: response.ok ? "Đã hủy lời chơi lại." : "Bloom chưa hủy được lời chơi lại. Lời mời sẽ tự hết hạn.",
    });
  }, [realtimeActions, rematchWaitingUntil, showToast, surface.gameId]);

  useEffect(() => {
    if (!rematchWaitingUntil) return undefined;
    const delay = Math.max(0, rematchWaitingUntil - Date.now());
    const timer = setTimeout(() => {
      setRematchWaitingUntil(null);
      rematchRequestIdRef.current = null;
    }, delay + 50);
    return () => clearTimeout(timer);
  }, [rematchWaitingUntil]);

  useEffect(() => {
    if (!rematchPreparing) return;
    const sourceGameId = rematchSourceGameIdRef.current;
    const targetGameId = rematchTargetGameIdRef.current;
    const serverOwnsNewGame = shouldReleaseRematchPreparing({
      sourceGameId,
      targetGameId,
      surfaceGameId: surface.gameId,
      stateGameId: state.gameId,
      status: state.status,
    });
    if (serverOwnsNewGame) {
      // Do not wait for local Ready -> Playing animation to release the rematch
      // shield. The authoritative new game already owns the surface; normal
      // normal ready gating can briefly show its own card if needed.
      setRematchPreparing(false);
      setRematchWaitingUntil(null);
      rematchSourceGameIdRef.current = null;
      rematchTargetGameIdRef.current = null;
      rematchRequestIdRef.current = null;
    }
  }, [rematchPreparing, state.gameId, state.status, surface.gameId]);

  if (!surface.prepared) return null;

  const fullVisible = presentationReady && surface.mode === "full";
  if (fullVisible || !actualGame) {
    frozenBoardStateRef.current = state;
    frozenMoveDeltasRef.current = actualGame ? game.moveDeltas : [];
    frozenSnapshotEpochRef.current = actualGame ? game.snapshotEpoch : 0;
  }
  const boardState = fullVisible ? state : frozenBoardStateRef.current;
  const boardMoveDeltas = fullVisible && actualGame ? game.moveDeltas : frozenMoveDeltasRef.current;
  const boardSnapshotEpoch = fullVisible && actualGame ? game.snapshotEpoch : frozenSnapshotEpochRef.current;
  const showPreparing = fullVisible && (rematchPreparing || !actualGame || entryPhase !== "playing");
  const showResult = fullVisible && actualGame && state.status === "finished" && !resultDismissed && !rematchPreparing;

  const modalVisible = fullVisible && (showPreparing || (!!promotion && actualGame) || showResult);
  const modalInteractive = !!promotion || showResult;

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
          opacity: presentationReady ? 1 : 0,
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
              actions={(
                <View style={styles.topActions}>
                  {state.status === "finished" ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Thoát bàn cờ" onPress={leaveFinished} style={styles.topButton}>
                      <Ionicons name="close" size={19} color={COLORS.primaryText} />
                    </Pressable>
                  ) : (
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
                  )}
                  {menuOpen && state.status !== "finished" ? (
                    <View style={styles.overflowMenu}>
                      <Pressable onPress={() => { setMenuOpen(false); void offerDraw(); }} style={styles.overflowItem}>
                        <Ionicons name="hand-left-outline" size={17} color={COLORS.primaryText} />
                        <Text style={styles.overflowText}>Xin hòa</Text>
                      </Pressable>
                      <View style={styles.overflowDivider} />
                      <Pressable onPress={() => { setMenuOpen(false); void resign(); }} style={styles.overflowItem}>
                        <Ionicons name="flag-outline" size={17} color={COLORS.destructive} />
                        <Text style={[styles.overflowText, styles.overflowDestructive]}>Đầu hàng</Text>
                      </Pressable>
                    </View>
                  ) : null}
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
              onMoveLanded={actualGame ? handleMoveLanded : undefined}
              onIllegalMove={actualGame ? playIllegal : undefined}
              hintsEnabled={actualGame}
              motionFxEnabled={actualGame && surface.mode === "full"}
              interactionBlocked={!boardInteractive}
              runtimeActive={actualGame ? fullVisible : (surface.preparing || resettingWarmBoard)}
              boardSize={boardViewportSize}
            />
          </View>
          {actualGame && fullVisible && game.connectionPhase !== "connected" ? (
            <View pointerEvents="none" style={styles.reconnectPill}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.reconnectText}>{game.connectionPhase === "synchronizing"
                ? "Đang đồng bộ ván cờ…"
                : "Đang kết nối lại… bàn cờ được giữ nguyên"}</Text>
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

      {/* One explicit screen coordinate system for Ready / Promotion / Result. */}
      {modalVisible ? (
        <View
          pointerEvents={modalInteractive ? "auto" : "none"}
          style={[styles.chessModalLayer, { width: windowWidth, height: windowHeight }, showResult && styles.chessModalResultLayer]}
        >
          {showPreparing ? (
            <View style={styles.prepareCard}>
              {readyAwaitingOpponent && !rematchPreparing ? <Ionicons name="checkmark-circle" size={24} color="#4E9B72" /> : <ActivityIndicator size="small" color={COLORS.primary} />}
              <Text style={styles.prepareTitle}>{rematchPreparing ? "Đang chuẩn bị ván mới…" : readyAwaitingOpponent && state.status === "waiting" ? "Bạn đã sẵn sàng" : warmReady ? "Đang đồng bộ ván cờ…" : "Đang vẽ bàn cờ…"}</Text>
              <Text style={styles.prepareText}>{rematchPreparing ? "Bloom đang giữ bàn cờ warm và đồng bộ trạng thái mới." : readyAwaitingOpponent && state.status === "waiting" ? "Đồng hồ chưa chạy. Bloom đang chờ người thân sẵn sàng trên bàn cờ của họ." : "Bloom chỉ làm bước vẽ native một lần trong phiên ứng dụng."}</Text>
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

          {showResult ? (
            <>
              <ChessVictoryConfetti active={didWin} />
              <View style={styles.resultCard}>
                <Ionicons name={didWin ? "trophy" : state.result === "draw" ? "sparkles" : "heart"} size={34} color={COLORS.primary} />
                <Text style={styles.resultBadge}>{state.finishReason === "away_timeout" ? "HẾT THỜI GIAN RỜI BÀN" : state.result === "draw" ? "HÒA" : didWin ? "CHIẾN THẮNG" : "VÁN ĐẤU KHÉP LẠI"}</Text>
                <Text style={styles.resultTitle}>{resultTitle}</Text>
                <Text style={styles.resultText}>{state.finishReason === "away_timeout" ? (didWin ? "Đối thủ đã rời bàn quá thời gian cho phép. Máy chủ ghi nhận chiến thắng cho bạn." : "Bạn đã rời bàn quá thời gian cho phép. Máy chủ đã khép ván.") : "Ván cờ đã khép lại. Bàn cờ vẫn được giữ warm để ván kế tiếp mở nhanh hơn."}</Text>
                <View style={styles.resultActions}>
                  <Pressable style={styles.resultSecondary} onPress={leaveFinished}><Text style={styles.resultSecondaryText}>Về Nhà Mình</Text></Pressable>
                  <Pressable disabled={!!rematchWaitingUntil || rematchPreparing} style={[styles.resultButton, (rematchWaitingUntil || rematchPreparing) && styles.resultButtonDisabled]} onPress={rematch}><Text style={styles.resultButtonText}>{rematchWaitingUntil ? "Đã gửi ✓" : rematchPreparing ? "Đang gửi…" : "Chơi lại"}</Text></Pressable>
                </View>
                {rematchWaitingUntil ? <Pressable onPress={() => void cancelRematch()} style={styles.cancelRematchButton}><Text style={styles.cancelRematchText}>Hủy lời chơi lại</Text></Pressable> : null}
              </View>
            </>
          ) : null}
        </View>
      ) : null}

      {presentationReady
        && surface.preparing
        && surface.mode === "hidden"
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
  overflowMenu: { position: "absolute", right: 0, top: 38, width: 148, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: "#EFD7E0", paddingVertical: 5, zIndex: 95, elevation: 18, shadowColor: "#7E4057", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  overflowItem: { minHeight: 42, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  overflowText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "800" },
  overflowDestructive: { color: COLORS.destructive },
  overflowDivider: { height: 1, backgroundColor: "#F3E4EA", marginHorizontal: 10 },
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
  chessModalResultLayer: { backgroundColor: "rgba(53,31,42,0.48)" },
  prepareCard: { width: "86%", maxWidth: 330, borderRadius: 24, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#EBCAD7", paddingHorizontal: 18, paddingVertical: 18, alignItems: "center", gap: 7, elevation: 6 },
  prepareTitle: { color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  prepareText: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16, textAlign: "center" },
  promotionCard: { width: "88%", maxWidth: 340, borderRadius: 24, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#EBCAD7", padding: 16, alignItems: "center" },
  promotionTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900", marginBottom: 12 },
  promotionRow: { flexDirection: "row", gap: 8 },
  promotionButton: { width: 62, height: 62, borderRadius: 19, backgroundColor: "#F9E9F0", alignItems: "center", justifyContent: "center" },
  promotionPiece: { width: 52, height: 52 },

  resultCard: { width: "92%", maxWidth: 360, borderRadius: 28, backgroundColor: "rgba(255,249,252,0.97)", padding: 20, alignItems: "center", borderWidth: 1, borderColor: "#EDCEDA" },
  resultBadge: { marginTop: 10, color: COLORS.primary, fontSize: 9.5, letterSpacing: 1.1, fontWeight: "900" },
  resultTitle: { marginTop: 6, color: COLORS.primaryText, fontSize: 24, fontWeight: "900" },
  resultText: { marginTop: 8, color: COLORS.secondaryText, fontSize: 12, lineHeight: 18, textAlign: "center" },
  resultActions: { marginTop: 18, alignSelf: "stretch", flexDirection: "row", gap: 10 },
  resultSecondary: { flex: 1, minHeight: 48, borderRadius: 18, borderWidth: 1, borderColor: "#E7CFD9", backgroundColor: "#FFF", alignItems: "center", justifyContent: "center" },
  resultSecondaryText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  resultButton: { flex: 1, minHeight: 48, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  resultButtonText: { color: "#FFF", fontSize: 12.5, fontWeight: "900" },
  resultButtonDisabled: { opacity: 0.68 },
  cancelRematchButton: { marginTop: 10, minHeight: 34, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
  cancelRematchText: { color: COLORS.secondaryText, fontSize: 11, fontWeight: "800", textDecorationLine: "underline" },
  prewarmNoticeWrap: { ...StyleSheet.absoluteFillObject, zIndex: 1490, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  prewarmNotice: { width: "100%", maxWidth: 370, minHeight: 82, borderRadius: 24, backgroundColor: "#FFF9FC", borderWidth: 1, borderColor: "#E9C9D5", flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, elevation: 12, shadowColor: "#3B202C", shadowOpacity: 0.16, shadowRadius: 18 },
  prewarmCopy: { flex: 1 },
  prewarmTitle: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  prewarmText: { marginTop: 4, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
});
