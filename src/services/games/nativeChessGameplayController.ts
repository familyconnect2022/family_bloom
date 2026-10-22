import { AppState } from "react-native";
/**
 * H10 Chess Native gameplay: local-first visual feedback + authoritative socket.
 * Chess has its own lifecycle, no Xiangqi state is held by this controller.
 * A premove is always a LOCAL proposal, never a server-side mutation until
 * our turn is confirmed by an authoritative revision.
 */
import { Chess, type Square } from "chess.js";
import { getAuth } from "@react-native-firebase/auth";

import {
  CHESS_ERROR_COPY, CHESS_EVENTS, applyChessMoveDelta,
  type ChessGameState, type ChessMoveCommandAck, type ChessMoveDelta,
  type ChessPromotionPiece,
} from "../../types/chess";
import { chessSocketService } from "../chess/chessSocketService";
import { emitBoardGamePresentationDiagnostic } from "./boardGamePresentationDiagnostics";
import { setBoardGameNativeChessState, type NativeChessAction } from "./boardGameNativeOverlay";
import { closeBoardGamePresentationForGame, markChessResultDismissed } from "./boardGamePresentationStore";

// H12: A single queued premove cannot silently project a chain of hypothetical
// turns onto the authoritative board (6453.mp4 desynchronization).
const MAX_PREMOVES = 1;
type PlannedMove = { from: Square; to: Square; promotion?: ChessPromotionPiece };
type PromotionChoice = PlannedMove & { isPremove: boolean };

let currentState: ChessGameState | null = null;
let selectedSquare: Square | null = null;
let movePending = false;
let readyPending = false;
// Each game owns a single server mutation in flight. The same requestId is
// retained after an uncertain timeout so a retry cannot create another vote.
type ChessDecision = 'resign' | 'drawOffer' | 'drawAccept' | 'drawReject';
let chessDecision: {gameId:string;action:ChessDecision;requestId:string} | null = null;
let chessDecisionBusy = false;
let chessDecisionError = '';
let chessDecisionCompleted = '';

// Exactly one automatic READY intent per waiting game; never start clocks locally.
let readyRequestedForGame: string | null = null;
let boardReadyRequestedForGame: string | null = null;
let boardAssetsReadyForGame: string | null = null;
// A Ready ACK can disappear during reconnect and a queued animation frame can
// be invalidated by a newer revision. Separate scheduled, in-flight and retry
// states so neither handoff can become a permanent one-shot latch.
let readyScheduledForGame: string | null = null;
let readinessRetryTimer: ReturnType<typeof setTimeout> | null = null;
// Server deadlines are authoritative. A native/Socke.IO state broadcast may be
// lost while Android is backgrounded; poll only after the immutable preparation
// deadline, never decide a winner locally or create a new deadline on reconnect.
let waitingDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
let waitingDeadlineGame: string | null = null;
function clearWaitingDeadlineWatchdog() {
  if (waitingDeadlineTimer) clearTimeout(waitingDeadlineTimer);
  waitingDeadlineTimer = null;
  waitingDeadlineGame = null;
}
function watchWaitingDeadline(state: ChessGameState) {
  if (state.status !== "waiting") { clearWaitingDeadlineWatchdog(); return; }
  if (waitingDeadlineTimer && waitingDeadlineGame === state.gameId) return;
  clearWaitingDeadlineWatchdog();
  const started = Date.parse(state.createdAt);
  const leftMs = Number.isFinite(started) ? Math.max(0, started + 180_000 - state.serverNowMs) : 0;
  const gameId = state.gameId;
  waitingDeadlineGame = gameId;
  waitingDeadlineTimer = setTimeout(() => {
    waitingDeadlineTimer = null;
    if (currentState?.gameId !== gameId || currentState.status !== "waiting") {
      waitingDeadlineGame = null;
      return;
    }
    // An authoritative resync converts an expired waiting session into a
    // result/cancellation even when its original push event was lost.
    if (transportOnline) void resyncCurrent(gameId, "waiting-deadline-expired");
    waitingDeadlineGame = null;
    // If Render is sleeping or its deploy is outdated, retry slowly rather
    // than leaving the modal permanently frozen at 00:00.
    waitingDeadlineTimer = setTimeout(() => {
      waitingDeadlineTimer = null;
      if (currentState?.gameId === gameId && currentState.status === "waiting") {
        watchWaitingDeadline(currentState);
      }
    }, 10_000);
    waitingDeadlineGame = gameId;
  }, leftMs + 900);
}
function clearReadinessRetry() {
  if (readinessRetryTimer) clearTimeout(readinessRetryTimer);
  readinessRetryTimer = null;
}
function retryReadiness(gameId: string, reason: string) {
  if (readinessRetryTimer) return;
  readinessRetryTimer = setTimeout(() => {
    readinessRetryTimer = null;
    if (currentState?.gameId !== gameId || currentState.status !== "waiting" || !transportOnline) return;
    emitBoardGamePresentationDiagnostic("chess", "CHESS_READY_RECOVERY", reason, {gameId});
    if (currentState.preparationPhase === "board") {
      if (boardAssetsReadyForGame !== gameId || boardReadyRequestedForGame === gameId) return;
      boardReadyRequestedForGame = gameId;
      void markBoardReady();
    } else if (currentState.preparationPhase === "colors" && !readyPending) {
      void pushState("ready-retry");
    }
  }, 1_500);
}

let invalidResyncKey: string | null = null;
// H17: this preview never replaces the authoritative game snapshot/FEN.
// It is permitted only while exactly one local move is in flight.
let optimisticFen: string | null = null;
let optimisticMove: PlannedMove | null = null;
let pendingClientMoveId: string | null = null;
let pendingBaseRevision = -1;
let pendingPromotion: PromotionChoice | null = null;
// H19: at most one local intent survives an offline interval/ambiguous ACK.
// It is NEVER treated as a server move. Server FEN/revision is checked before replay.
type BufferedMove = {
  gameId: string; familyId: string; baseFen: string; baseRevision: number;
  move: PlannedMove; clientMoveId: string; predictedFen: string;
};
let bufferedMove: BufferedMove | null = null;
let bufferedSendInProgress = false;
let offlineNotice = "";
let queuedPremoves: PlannedMove[] = [];
let staleMoveTimer: ReturnType<typeof setTimeout> | null = null;
let soundCue = "";
let soundToken = 0;
let renderSerial = 0;
// H18: keep pixels stable while the transport changes; no speculative FEN is
// committed to currentState. The last server-backed motion is a visual hint.
let transportOnline = true;
let reconciliationPending = false;
let reconciliationSerial = 0;
let resyncInFlight: Promise<void> | null = null;
let resyncRequestedAgain = false;
let recoveryMotion: { revision: number; afterFen: string; beforeFen: string } | null = null;
let conflictingSnapshotKey: string | null = null;

const requestId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const isSquare = (value: string): value is Square => /^[a-h][1-8]$/.test(value);
const safeMove = (chess: Chess, move: PlannedMove) => {
  try { return chess.move(move); } catch { return null; }
};

// Fail closed on contradictory membership or turn/FEN metadata. The local
// board's orientation and side-to-move must never override authenticated UID.
function verifiedSide(state: ChessGameState): "w" | "b" | null {
  const uid = getAuth().currentUser?.uid;
  if (!uid || !state.whiteUid || !state.blackUid || state.whiteUid === state.blackUid) return null;
  if (state.testBotUid && (state.testBotUid !== state.whiteUid && state.testBotUid !== state.blackUid)) return null;
  return state.whiteUid === uid ? "w" : state.blackUid === uid ? "b" : null;
}
function isConsistentPosition(state: ChessGameState): boolean {
  if (!state.fen || (state.turn !== "w" && state.turn !== "b")) return false;
  const parts = state.fen.split(" ");
  if (parts.length !== 6 || parts[1] !== state.turn) return false;
  try {
    const chess = new Chess(state.fen);
    const fullmove = Number(parts[5]);
    // Starting position must be White's turn, even when this user is Black.
    const derivedPly = (fullmove - 1) * 2 + (state.turn === "b" ? 1 : 0);
    return chess.turn() === state.turn && Number.isSafeInteger(derivedPly)
      && derivedPly >= 0 && derivedPly === state.ply;
  } catch { return false; }
}

/** Reconstruct an authoritative delta with chess.js. Reject any packet whose
 * claimed color, target position, ply or turn differs from the legal move.
 * Never allow a visually plausible delta to mutate the board without proof.
 */
function isLegalServerDelta(previous: ChessGameState, delta: ChessMoveDelta): boolean {
  if (!isConsistentPosition(previous) || !delta.move || delta.ply !== previous.ply + 1) return false;
  if (delta.move.color !== previous.turn || delta.version !== previous.revision + 1) return false;
  try {
    const board = new Chess(previous.fen);
    const piece = board.get(delta.move.from as Square);
    if (!piece || piece.color !== previous.turn || piece.type !== delta.move.piece) return false;
    const move = board.move({from: delta.move.from, to: delta.move.to,
      ...(delta.move.promotion ? {promotion: delta.move.promotion} : {})});
    return !!move && move.color === delta.move.color && move.san === delta.move.san
      && board.fen() === delta.fen && board.turn() === delta.turn;
  } catch { return false; }
}
/** The last move is *never* inferred from an arbitrary FEN diff. Prove it
 * using chess.js before allowing a resync to animate. For multi-ply gaps the
 * server provides the immediate predecessor, not an imagined move sequence.
 * Compatible with older Render builds: a single missed ply may be verified
 * against our own previously authoritative FEN.
 */
function verifiedRecoveryPredecessor(old: ChessGameState | null, next: ChessGameState): string | null {
  if (!old || old.gameId !== next.gameId || next.ply <= old.ply || !next.lastMove) return null;
  const move = next.lastMove;
  if (!isSquare(move.from) || !isSquare(move.to)) return null;
  const candidate = next.lastMoveBeforeFen ??
    (next.ply === old.ply + 1 ? old.fen : null);
  if (!candidate) return null;
  try {
    const before = new Chess(candidate);
    const result = before.move({ from: move.from, to: move.to,
      ...(move.promotion ? { promotion: move.promotion } : {}) });
    if (!result || result.san !== move.san || before.fen() !== next.fen) return null;
    if (candidate.split(" ")[1] !== result.color) return null;
    return candidate;
  } catch { return null; }
}

function myColor(state: ChessGameState): "w" | "b" | null {
  return isConsistentPosition(state) ? verifiedSide(state) : null;
}
function opponentLabel(state: ChessGameState) {
  const mine = myColor(state);
  if (!mine) return "Đối thủ";
  const uid = mine === "w" ? state.blackUid : state.whiteUid;
  return state.testBotUid && uid === state.testBotUid ? "Bloom Bot" : "Người thân";
}
function playCue(cue: string) { soundCue = cue; soundToken += 1; }
function cueForMove(move: { flags?: string; captured?: string; san?: string; promotion?: string }, opponent: boolean) {
  if (move.san?.includes("+") || move.san?.includes("#")) return "move-check";
  if (move.promotion) return "promote";
  if (move.flags?.includes("k") || move.flags?.includes("q")) return "castle";
  if (move.captured || move.flags?.includes("c") || move.flags?.includes("e")) return "capture";
  return opponent ? "move-opponent" : "move-self";
}
function resetInFlight() {
  movePending = false;
  optimisticFen = null;
  optimisticMove = null;
  pendingClientMoveId = null;
  pendingBaseRevision = -1;
  bufferedMove = null;
  bufferedSendInProgress = false;
  if (staleMoveTimer) clearTimeout(staleMoveTimer);
  staleMoveTimer = null;
}
function resetForNewGame() {
  resetInFlight();
  readyPending = false;
  chessDecision = null; chessDecisionBusy = false; chessDecisionError = ''; chessDecisionCompleted = '';
  readyRequestedForGame = null;
  boardReadyRequestedForGame = null;
  boardAssetsReadyForGame = null;
  readyScheduledForGame = null;
  clearReadinessRetry();
  clearWaitingDeadlineWatchdog();
  invalidResyncKey = null;
  selectedSquare = null;
  pendingPromotion = null;
  queuedPremoves = [];
  soundCue = "";
  soundToken = 0;
  recoveryMotion = null;
  conflictingSnapshotKey = null;
  reconciliationPending = false;
  resyncRequestedAgain = false;
  offlineNotice = "";
}

/** Visual speculation for a premove chain. Opponent replies are NOT invented:
 * only the player's prospective board changes are shown for validation.
 * The server revalidates each queued action against the real position later.
 */
function planner(state: ChessGameState, mine: "w" | "b") {
  let fen = optimisticFen ?? state.fen;
  for (const move of queuedPremoves) {
    const parts = fen.split(" ");
    parts[1] = mine;
    parts[3] = "-"; // unknown opponent reply; never invent an en-passant right
    try {
      const chess = new Chess(parts.join(" "));
      if (!safeMove(chess, move)) return null;
      fen = chess.fen();
    } catch { return null; }
  }
  const parts = fen.split(" ");
  parts[1] = mine;
  parts[3] = "-";
  try { return new Chess(parts.join(" ")); } catch { return null; }
}
function legalForSelection(chess: Chess | null, square: Square | null) {
  if (!square || !chess) return { targets: [] as string[], captures: [] as string[], promotionTargets: [] as string[] };
  try {
    const moves = chess.moves({ square, verbose: true });
    return {
      targets: [...new Set(moves.map(move => move.to))],
      captures: [...new Set(moves.filter(move => !!move.captured).map(move => move.to))],
      promotionTargets: [...new Set(moves.filter(move => !!move.promotion).map(move => move.to))],
    };
  } catch { return { targets: [], captures: [], promotionTargets: [] }; }
}

async function pushState(reason: string) {
  const state = currentState;
  if (!state) return;
  const serial = ++renderSerial;
  const mine = myColor(state);
  const active = state.status === "active" && !!mine && transportOnline && !reconciliationPending;
  // Allow ONE validated local chess.js move while disconnected. Other taps,
  // premoves and all authoritative updates remain locked until reconciliation.
  const offlineMyTurn = state.status === "active" && !!mine && !transportOnline &&
    state.turn === mine && !movePending && !bufferedMove;
  const myTurn = (active && state.turn === mine || offlineMyTurn) && !movePending;
  const isPremove = active && !myTurn;
  const game = !(active || offlineMyTurn) ? null : isPremove && mine ? planner(state, mine) : (() => {
    try { return new Chess(state.fen); } catch { return null; }
  })();
  const legal = legalForSelection(game, selectedSquare);
  // A move is shown immediately only if it was validated locally against
  // the SAME authoritative revision, FEN and authenticated side.
  const showOptimistic = state.status === "active" && !!mine && movePending && !!optimisticFen && !!optimisticMove
    && !!pendingClientMoveId && pendingBaseRevision === state.revision
    && state.turn === mine;
  const sent = await setBoardGameNativeChessState({
    gameId: state.gameId,
    // Visual FEN is a preview, not an authoritative state mutation. Premove
    // NEVER paints a hypothetical board; it only highlights queued squares.
    fen: showOptimistic ? optimisticFen! : state.fen,
    optimisticMoveId: showOptimistic ? pendingClientMoveId : null,
    // Source is permitted only for this exact, chess.js-verified revision.
    // Native performs a single last-move animation, not a full-board fade.
    motionFromFen: !showOptimistic && recoveryMotion?.revision === state.revision &&
      recoveryMotion.afterFen === state.fen ? recoveryMotion.beforeFen : null,
    renderSequence: serial,
    orientation: verifiedSide(state) ?? "w",
    status: state.status === "active" && (!mine || !transportOnline || reconciliationPending)
      ? "syncing" : state.status,
    turn: state.turn,
    selectedSquare,
    legalTargets: active || offlineMyTurn ? legal.targets : [],
    captureTargets: active || offlineMyTurn ? legal.captures : [],
    promotionTargets: active || offlineMyTurn ? legal.promotionTargets : [],
    lastFrom: showOptimistic ? optimisticMove!.from : (state.lastMove?.from ?? null),
    lastTo: showOptimistic ? optimisticMove!.to : (state.lastMove?.to ?? null),
    checkSquare: state.checkSquare,
    canMove: !!myTurn,
    canPremove: !!isPremove && !!game,
    queuedPremoveSquares: queuedPremoves.flatMap(move => [move.from, move.to]),
    premoveCount: queuedPremoves.length,
    promotionPending: !!pendingPromotion,
    movePending,
    actionPending: chessDecisionBusy ? chessDecision?.action : "",
    actionError: chessDecisionError,
    actionCompleted: chessDecisionCompleted,
    readyPending,
    waitingForMe: state.status === "waiting" && !readyPending,
    whiteRemainingMs: state.whiteRemainingMs,
    blackRemainingMs: state.blackRemainingMs,
    result: state.result,
    finishReason: state.finishReason,
    drawOfferByUid: state.drawOfferByUid,
    serverNowMs: state.serverNowMs,
    meColor: mine,
    myUid: getAuth().currentUser?.uid ?? null,
    meLabel: "Bạn",
    opponentLabel: opponentLabel(state),
    revision: state.revision,
    ply: state.ply,
    soundCue, soundToken,
    // The timeout is measured from the immutable server creation timestamp.
    // Every reconnect/rebind can refine its estimate, but never extend it.
    waitingRemainingMs: state.status === "waiting" && Number.isFinite(Date.parse(state.createdAt))
      ? Math.max(0, 180_000 - (state.serverNowMs - Date.parse(state.createdAt))) : null,
    waitingMessage: offlineNotice || (state.status === "waiting" &&
      Number.isFinite(Date.parse(state.createdAt)) &&
      state.serverNowMs - Date.parse(state.createdAt) >= 180_000
      ? "Thời gian chuẩn bị đã hết · Đang xác nhận kết quả với máy chủ…"
      : state.status === "waiting" ?
      (state.preparationPhase === "board" ? "Đang chuẩn bị bàn cờ cho cả hai người…" : `Đã chốt màu quân · Đợi ${opponentLabel(state)} sẵn sàng`)
      : state.status === "active" && (!transportOnline || reconciliationPending) ? "Đang đồng bộ ván cờ…"
      : state.status === "active" && !mine ? "Đang xác minh màu quân và lượt đi với máy chủ…" : ""),
  });
  if (serial !== renderSerial || !sent.accepted) return;
  // Stage 2 only after Native has accepted a board with its authoritative
  // orientation. This is separate from board/assets/audio readiness.
  if (state.status === "waiting" && state.preparationPhase === "colors" && mine &&
      boardAssetsReadyForGame === state.gameId &&
      readyRequestedForGame !== state.gameId && readyScheduledForGame !== state.gameId &&
      !readyPending && transportOnline) {
    readyScheduledForGame = state.gameId;
    // Two frames settle native orientation. Do NOT consume the one-shot ready
    // intent until those frames actually passed the current-session check.
    const orientationRevision = state.revision;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (readyScheduledForGame !== state.gameId) return;
      readyScheduledForGame = null;
      if (currentState?.gameId === state.gameId && currentState.status === "waiting" &&
          currentState.preparationPhase === "colors" && currentState.revision === orientationRevision &&
          transportOnline && !readyPending && readyRequestedForGame !== state.gameId) {
        readyRequestedForGame = state.gameId;
        void markReady();
      } else if (currentState?.gameId === state.gameId && currentState.status === "waiting" &&
          currentState.preparationPhase === "colors") retryReadiness(state.gameId, "orientation-frame-invalidated");
    }));
  }
  if (reason === "move-rejected" || reason === "move-delta-timeout") {
    emitBoardGamePresentationDiagnostic("chess", "NATIVE_CHESS_FEEDBACK", reason, { gameId: state.gameId });
  }
}

/** Preview only: never insert a fake game into currentState or send moves/READY.
 * The server remains the sole authority for creating/starting a match.
 */
export async function showNativeChessConnectingPreview(previewId: string) {
  if (currentState) return;
  await setBoardGameNativeChessState({
    gameId: previewId,
    fen: new Chess().fen(),
    optimisticMoveId: null,
    motionFromFen: null,
    renderSequence: ++renderSerial,
    orientation: "w", status: "waiting", turn: "w",
    selectedSquare: null, legalTargets: [], captureTargets: [], promotionTargets: [],
    lastFrom: null, lastTo: null, checkSquare: null, canMove: false, canPremove: false,
    queuedPremoveSquares: [], premoveCount: 0, promotionPending: false,
    movePending: false, readyPending: false, waitingForMe: false,
    whiteRemainingMs: 600_000, blackRemainingMs: 600_000, serverNowMs: Date.now(),
    meColor: "w", myUid: getAuth().currentUser?.uid ?? null,
    meLabel: "Người chơi", opponentLabel: "Bloom Bot",
    revision: 0, ply: 0, soundCue: "", soundToken: 0,
    result: null, finishReason: null, drawOfferByUid: null,
    waitingMessage: "Đang kết nối…",
  });
}

/** Called on socket status; never unmount or clear the persistent board. */
export function setNativeChessTransportConnected(connected: boolean) {
  transportOnline = connected;
  if (!currentState) return;
  if (!connected) {
    // An ACK may have been lost after the server already committed this move.
    // Preserve ID/FEN as an intent until an authoritative snapshot resolves it.
    if (currentState && movePending && optimisticFen && optimisticMove && pendingClientMoveId) {
      bufferedMove = {
        gameId: currentState.gameId, familyId: currentState.familyId,
        baseFen: currentState.fen, baseRevision: pendingBaseRevision,
        move: optimisticMove, clientMoveId: pendingClientMoveId, predictedFen: optimisticFen,
      };
    }
    if (staleMoveTimer) { clearTimeout(staleMoveTimer); staleMoveTimer = null; }
    bufferedSendInProgress = false;
    ++reconciliationSerial;
    // Invalidate any prior resync ACK; an old request must not block a new
    // recovery after the socket ID changes.
    resyncInFlight = null;
    resyncRequestedAgain = false;
    reconciliationPending = true;
    boardReadyRequestedForGame = null;
    readyRequestedForGame = null;
    readyScheduledForGame = null;
    readyPending = false;
    clearReadinessRetry();
    void pushState("transport-offline");
    return;
  }
  // Socket reconnect alone is not an authoritative resync.
  // Keep inputs gated until the server returns a valid FEN.
  void resyncCurrent(currentState.gameId, "transport-reconnected");
}

export function syncNativeChessAuthoritativeState(state: ChessGameState) {
  const old = currentState;
  const changedGame = old?.gameId !== state.gameId;
  if (!changedGame && state.revision < old!.revision) return;
  // A same-version board change is not a valid server move. Avoid a visual
  // oscillation as reconnect/join/resync responses arrive out of order.
  if (old && !changedGame && state.revision === old.revision && state.fen !== old.fen) {
    const key = `${state.gameId}:${state.revision}:${state.fen}`;
    if (conflictingSnapshotKey !== key) {
      conflictingSnapshotKey = key;
      emitBoardGamePresentationDiagnostic("chess", "CHESS_SAME_REV_FEN_CONFLICT", "Ignored contradictory FEN at same revision", { gameId: state.gameId, revision: state.revision });
      void resyncCurrent(state.gameId, "same-revision-fen-conflict");
    }
    return;
  }
  // Prove FEN and membership BEFORE replacing currentState; invalid packets
  // must not blank or repaint a board which was already valid.
  if (!isConsistentPosition(state) || (!verifiedSide(state) && !(state.status === "waiting" && state.preparationPhase === "board"))) {
    if (changedGame) {
      resetForNewGame();
      currentState = state; // first snapshot: show safe syncing state, no moves
    }
    reconciliationPending = true;
    emitBoardGamePresentationDiagnostic("chess", "CHESS_SIDE_OR_TURN_INVALID", "Preserved last board: invalid UID/color/FEN/ply", {
      gameId: state.gameId, revision: state.revision, turn: state.turn,
      fenTurn: state.fen?.split(" ")[1],
    });
    void pushState("side-invalid");
    if (state.status === "active") {
      const key = `${state.gameId}:${state.revision}`;
      if (invalidResyncKey !== key) {
        invalidResyncKey = key;
        void resyncCurrent(state.gameId, "invalid-color-or-ply");
      }
    }
    return;
  }
  if (changedGame) resetForNewGame();
  invalidResyncKey = null;
  conflictingSnapshotKey = null;
  const optimisticConfirmed = !changedGame && movePending && optimisticFen === state.fen &&
    state.revision > pendingBaseRevision;
  // If newer server state cannot be the buffered move, do not silently replay
  // an input based on a stale board. Ask the user to select again instead.
  const bufferedAlreadyCommitted = bufferedMove && bufferedMove.gameId === state.gameId &&
    state.revision > bufferedMove.baseRevision &&
    (state.fen === bufferedMove.predictedFen ||
      // The server may already have played the Bot's reply while offline.
      // Its verified predecessor is the local predicted FEN: no resend.
      (state.revision >= bufferedMove.baseRevision + 2 &&
       state.lastMoveBeforeFen === bufferedMove.predictedFen));
  if (bufferedAlreadyCommitted) {
    resetInFlight();
    offlineNotice = "";
  } else if (bufferedMove && bufferedMove.gameId === state.gameId &&
      (state.revision > bufferedMove.baseRevision || state.fen !== bufferedMove.baseFen) &&
      state.fen !== bufferedMove.predictedFen) {
    resetInFlight();
    offlineNotice = "Bàn cờ đã thay đổi, hãy chọn lại nước đi.";
    playCue("illegal");
  } else if (optimisticConfirmed) {
    offlineNotice = "";
  }
  // Only one visual animation after a verified authoritative resync.
  // A matched optimistic move already animated and must never be replayed.
  const predecessor = !changedGame && !optimisticConfirmed
    ? verifiedRecoveryPredecessor(old, state) : null;
  recoveryMotion = predecessor ? { revision: state.revision, afterFen: state.fen, beforeFen: predecessor } : null;
  currentState = state;
  watchWaitingDeadline(state);
  if (transportOnline) reconciliationPending = false;
  if (state.status !== "waiting") {
    readyScheduledForGame = null;
    clearReadinessRetry();
  }
  if (state.status === "finished" || state.status === "cancelled") {
    // Only a terminal game transition discards an unexecuted premove.
    resetInFlight();
    selectedSquare = null;
    queuedPremoves = [];
    pendingPromotion = null;
  } else if (state.status === "waiting") {
    // A real new waiting session cannot inherit a stale input.
    resetInFlight();
    selectedSquare = null;
    queuedPremoves = [];
    pendingPromotion = null;
  } else if (movePending && (changedGame || state.revision > pendingBaseRevision ||
      (old?.gameId === state.gameId && (old.fen !== state.fen || old.turn !== state.turn)))) {
    resetInFlight();
    selectedSquare = null;
  }
  if (old?.status === "waiting" && state.status === "active") playCue("game-start");
  if (state.status === "finished" && old?.status !== "finished") playCue("game-end");
  void pushState("authoritative-state").then(() => {
    // An app/server restart while preparing can erase the in-memory ready
    // sets. Re-send the idempotent board-ready intent after verified recovery.
    if (transportOnline && state.status === "waiting" && state.preparationPhase === "board" &&
        boardAssetsReadyForGame === state.gameId && boardReadyRequestedForGame !== state.gameId) {
      boardReadyRequestedForGame = state.gameId;
      void markBoardReady();
    }
    if (bufferedMove && !reconciliationPending && transportOnline) void flushBufferedMove();
    else void drainPremoveQueue();
  });
}

export function syncNativeChessAuthoritativeMove(delta: ChessMoveDelta): boolean {
  if (!currentState || currentState.gameId !== delta.gameId || delta.version <= currentState.revision) return false;
  // A dropped/reordered packet must never advance a partially reconciled
  // position. A full resync also restores clocks, result and captures.
  if (delta.version !== currentState.revision + 1) {
    void resyncCurrent(delta.gameId, "move-revision-gap");
    return false;
  }
  if (!verifiedSide(currentState) || !isLegalServerDelta(currentState, delta)) {
    // An inconsistent/out-of-order packet is not evidence that a locally
    // queued premove is invalid. Preserve it until the verified resync decides.
    selectedSquare = null;
    reconciliationPending = true;
    emitBoardGamePresentationDiagnostic("chess", "CHESS_DELTA_TURN_INVALID", "Rejected inconsistent move/FEN metadata", {gameId: delta.gameId, version: delta.version});
    void resyncCurrent(delta.gameId, "turn-fen-mismatch");
    return false;
  }
  const ownPending = movePending && pendingBaseRevision === currentState.revision && (
    pendingClientMoveId === delta.clientMoveId ||
    (!!optimisticFen && optimisticFen === delta.fen &&
      optimisticMove?.from === delta.move.from && optimisticMove?.to === delta.move.to &&
      (optimisticMove?.promotion ?? null) === (delta.move.promotion ?? null))
  );
  emitBoardGamePresentationDiagnostic("chess", "CHESS_AUTHORITATIVE_MOVE", `rev=${delta.version} ply=${delta.ply} color=${delta.move.color} turn=${delta.turn}`, {
    gameId: delta.gameId, from: delta.move.from, to: delta.move.to,
    localPremove: ownPending && !!queuedPremoves.length,
  });
  const next = applyChessMoveDelta(currentState, delta);
  currentState = next;
  recoveryMotion = null;
  if (!ownPending) playCue(cueForMove(delta.move, delta.move.color !== myColor(next)));
  if (movePending && delta.version > pendingBaseRevision) resetInFlight();
  selectedSquare = null;
  pendingPromotion = null;
  if (delta.status === "finished" || delta.status === "cancelled") {
    queuedPremoves = [];
    if (delta.status === "finished") playCue("game-end");
  }
  // Commit opponent/previous visual revision before constructing a new
  // optimistic premove; otherwise two plies coalesce into a native snap.
  void pushState("move-applied").then(() => drainPremoveQueue());
  return true;
}

// Called only AFTER a verified fresh server position is installed.
// Same clientMoveId makes retries idempotent if the first ACK was lost.
async function flushBufferedMove() {
  const intent = bufferedMove;
  const state = currentState;
  if (!intent || !state || bufferedSendInProgress || !transportOnline || reconciliationPending) return;
  if (intent.gameId !== state.gameId) { resetInFlight(); return; }
  if (state.fen === intent.predictedFen && state.revision > intent.baseRevision) {
    resetInFlight(); void pushState("offline-already-committed"); return;
  }
  if (state.fen !== intent.baseFen || state.revision !== intent.baseRevision ||
      state.status !== "active" || state.turn !== myColor(state)) {
    resetInFlight(); offlineNotice = "Thế cờ đã thay đổi, xin chọn lại nước đi.";
    void pushState("offline-invalidated"); return;
  }
  try {
    const board = new Chess(state.fen);
    if (!safeMove(board, intent.move) || board.fen() !== intent.predictedFen) {
      resetInFlight(); offlineNotice = "Nước đi không còn hợp lệ, hãy chọn lại.";
      void pushState("offline-revalidate-failed"); return;
    }
  } catch { resetInFlight(); return; }
  bufferedSendInProgress = true;
  const response = await chessSocketService.emitAck<ChessMoveCommandAck>(CHESS_EVENTS.gameMove, {
    gameId: intent.gameId, clientMoveId: intent.clientMoveId,
    expectedVersion: intent.baseRevision, ...intent.move,
  });
  bufferedSendInProgress = false;
  if (pendingClientMoveId !== intent.clientMoveId || currentState?.gameId !== intent.gameId) return;
  if (!response.ok) {
    if (response.errorCode === "CHESS_SERVER_RECOVERING") {
      // No uncertain retry loop: await another confirmed socket transition.
      reconciliationPending = true;
      void pushState("offline-retry-await-network");
    } else {
      resetInFlight(); offlineNotice = "Máy chủ chưa nhận nước này. Hãy chọn lại.";
      void pushState("offline-server-rejected");
      void resyncCurrent(intent.gameId, "buffered-move-rejected");
    }
    return;
  }
  // ACK is not proof that the board delta reached this client. Request the
  // authoritative snapshot if it still hasn't arrived after the normal wait.
  if (staleMoveTimer) clearTimeout(staleMoveTimer);
  staleMoveTimer = setTimeout(() => {
    if (pendingClientMoveId === intent.clientMoveId) void resyncCurrent(intent.gameId, "buffered-delta-missing");
  }, 4000);
}

type ChessCatchup =
  | { mode: "unchanged"; gameId: string; revision: number; whiteRemainingMs: number|null; blackRemainingMs: number|null; serverNowMs: number }
  | { mode: "moves"; gameId: string; revision: number; fen: string; moves: ChessMoveDelta[]; whiteRemainingMs: number|null; blackRemainingMs: number|null; serverNowMs: number }
  | { mode: "snapshot"; state: ChessGameState };

/** Return true only if the native board contains the verified server revision.
 * The legacy full snapshot remains the fallback for old Render deployments. */
async function tryChessMoveCatchup(gameId: string): Promise<boolean> {
  const before = currentState;
  if (!before || before.gameId !== gameId || before.status !== "active" || bufferedMove || movePending) return false;
  const reply = await chessSocketService.emitAck<ChessCatchup>(CHESS_EVENTS.gameCatchup,
    {gameId, revision:before.revision, fen:before.fen, status:before.status}, 3_500);
  if (!reply.ok || currentState?.gameId !== gameId) return false;
  const data=reply.data;
  if (data.mode === "snapshot") { syncNativeChessAuthoritativeState(data.state); return !reconciliationPending; }
  if (data.gameId !== gameId) return false;
  if (data.mode === "moves") {
    for (const delta of data.moves) {
      if (!currentState || currentState.gameId !== gameId) return false;
      if (delta.version <= currentState.revision) continue; // live socket packet won the race
      if (!syncNativeChessAuthoritativeMove(delta)) return false; // illegal/gapped; full fallback
    }
    if (currentState!.revision < data.revision ||
      (currentState!.revision === data.revision && currentState!.fen !== data.fen)) return false;
  } else if (currentState!.revision < data.revision) return false;
  // Clock baseline is independent of board pixels. Never clobber a newer live move.
  if (currentState?.gameId===gameId && currentState.revision===data.revision) {
    currentState={...currentState, whiteRemainingMs:data.whiteRemainingMs,
      blackRemainingMs:data.blackRemainingMs, serverNowMs:data.serverNowMs};
  }
  reconciliationPending = false;
  void pushState(data.mode === "moves" ? "delta-catchup" : "clock-only-catchup");
  return true;
}

async function resyncCurrent(gameId: string, reason: string) {
  if (resyncInFlight) { resyncRequestedAgain = true; return resyncInFlight; }
  const generation = ++reconciliationSerial;
  reconciliationPending = true;
  void pushState("resync-pending");
  const run = async () => {
    try {
      // A reconnect loses the old Socket.IO room. Rejoin before resuming,
      // otherwise the server may accept a move while the client sees no delta.
      const familyId = currentState?.familyId;
      // A live room can catch up using only the missed moves; after a dropped
      // transport we must first rejoin its Socket.IO room to receive future moves.
      if (reason !== "transport-reconnected" && await tryChessMoveCatchup(gameId)) {
        if (generation===reconciliationSerial && currentState?.gameId===gameId) {
          reconciliationPending=false;
          if (bufferedMove) void flushBufferedMove();
        }
        return;
      }
      const response = reason === "transport-reconnected" && familyId
        ? await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { gameId, familyId }, 20_000)
        : await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameResync, { gameId }, 12_000);
      if (generation !== reconciliationSerial || currentState?.gameId !== gameId) return;
      if (response.ok && isConsistentPosition(response.data) &&
          (verifiedSide(response.data) || (response.data.status === "waiting" && response.data.preparationPhase === "board")) &&
          response.data.revision >= currentState.revision &&
          (response.data.revision !== currentState.revision || response.data.fen === currentState.fen)) {
        // This response, not the socket's connected event, unlocks local input.
        transportOnline = true;
        reconciliationPending = false;
        syncNativeChessAuthoritativeState(response.data);
        if (bufferedMove) void flushBufferedMove();
        emitBoardGamePresentationDiagnostic("chess", "NATIVE_CHESS_RESYNC", reason, {
          gameId, revision: response.data.revision, ply: response.data.ply,
          animatedLastMove: !!recoveryMotion,
        });
      } else {
        reconciliationPending = true;
        emitBoardGamePresentationDiagnostic("chess", "NATIVE_CHESS_RESYNC_INVALID", reason, {gameId});
        void pushState("resync-invalid");
      }
    } finally {
      if (generation === reconciliationSerial) resyncInFlight = null;
      if (generation === reconciliationSerial && resyncRequestedAgain && transportOnline) {
        resyncRequestedAgain = false;
        // Queue one consolidation only, avoiding an unbounded resync storm.
        void resyncCurrent(gameId, "queued-resync");
      }
    }
  };
  resyncInFlight = run();
  return resyncInFlight;
}

async function drainPremoveQueue() {
  const state = currentState;
  if (!state || movePending || state.status !== "active" || !queuedPremoves.length) return;
  const mine = myColor(state);
  if (!mine || state.turn !== mine) return;
  const next = queuedPremoves.shift()!;
  try {
    const game = new Chess(state.fen);
    if (!safeMove(game, next)) {
      // The authoritative reply actually made this proposal illegal; explain
      // the invalidation instead of silently dropping a legitimate-looking move.
      offlineNotice = "Nước đi chờ không còn hợp lệ sau lượt đối thủ.";
      selectedSquare = null;
      playCue("illegal");
      void pushState("premove-invalidated");
      return;
    }
  } catch {
    // Do not erase a premove due to a transient FEN parse/recovery error.
    queuedPremoves.unshift(next);
    void resyncCurrent(state.gameId, "premove-fen-invalid");
    return;
  }
  void submitMove(next, true);
}

async function selectSquare(square: string) {
  const state = currentState;
  if (!state || !isSquare(square) || state.status !== "active") return;
  if ((!transportOnline || reconciliationPending) && (state.turn !== myColor(state) || movePending || !!bufferedMove)) return;
  const mine = myColor(state);
  if (!mine) return;
  const isPremove = transportOnline && !reconciliationPending && (state.turn !== mine || movePending);
  if (isPremove && queuedPremoves.length >= MAX_PREMOVES && !selectedSquare) {
    // Tapping the last premove destination cancels the speculative queue.
    if (queuedPremoves.at(-1)?.to === square) {
      queuedPremoves = []; playCue("premove"); void pushState("premove-cleared");
    }
    return;
  }
  let chess: Chess;
  try {
    const available = isPremove ? planner(state, mine) : new Chess(state.fen);
    if (!available) { selectedSquare = null; void pushState("premove-unavailable"); return; }
    chess = available;
  } catch { return; }
  const tapped = chess.get(square);
  const ownPiece = tapped?.color === mine;
  if (!selectedSquare) {
    selectedSquare = ownPiece ? square : null;
    void pushState(ownPiece ? "piece-selected" : "empty-tap");
    return;
  }
  const moves = chess.moves({ square: selectedSquare, verbose: true });
  const matching = moves.filter(move => move.to === square);
  if (!matching.length) {
    selectedSquare = ownPiece ? square : null;
    void pushState(ownPiece ? "selection-switched" : "selection-cleared");
    return;
  }
  const from = selectedSquare;
  const hasPromotion = matching.some(move => !!move.promotion);
  if (hasPromotion) {
    pendingPromotion = { from, to: square, isPremove };
    selectedSquare = null;
    void pushState("promotion-choice");
    return;
  }
  selectedSquare = null;
  if (isPremove) {
    queuedPremoves.push({ from, to: square });
    playCue("premove");
    void pushState("premove-queued");
  } else {
    void submitMove({ from, to: square });
  }
}

async function submitMove(move: PlannedMove, fromPremove = false) {
  const state = currentState;
  if (!state || state.status !== "active" || movePending || state.turn !== myColor(state)) return;
  if (reconciliationPending && transportOnline) return;
  let predicted;
  try {
    const chess = new Chess(state.fen);
    const result = safeMove(chess, move);
    if (!result) { playCue("illegal"); void pushState("move-illegal"); return; }
    // The client may never move a piece of the opposite color, including on
    // a flipped black-side board or an inconsistent post-reconnect snapshot.
    if (result.color !== myColor(state) || result.color !== state.turn) {
      playCue("illegal"); void pushState("wrong-move-color"); return;
    }
    predicted = { fen: chess.fen(), sound: cueForMove(result, false) };
  } catch { playCue("illegal"); void pushState("move-invalid-fen"); return; }
  movePending = true;
  // Local chess.js has just validated the move. Render NOW on the native UI
  // thread; the server will still validate UID, membership, legal move and
  // expectedVersion. No authoritative timer/turn/result is changed here.
  optimisticFen = predicted.fen;
  optimisticMove = { ...move };
  pendingBaseRevision = state.revision;
  const clientMoveId = requestId("native-chess-move");
  pendingClientMoveId = clientMoveId;
  offlineNotice = "";
  if (!transportOnline) {
    bufferedMove = { gameId: state.gameId, familyId: state.familyId,
      baseFen: state.fen, baseRevision: state.revision,
      move: { ...move }, clientMoveId, predictedFen: predicted.fen };
    playCue(predicted.sound);
    void pushState("offline-local-move-buffered");
    return;
  }
  // The queued-move chirp already played when it was selected. An executed
  // premove is a REAL move and must use capture/check/promotion sounds.
  playCue(predicted.sound);
  void pushState("optimistic-move");
  const response = await chessSocketService.emitAck<ChessMoveCommandAck>(CHESS_EVENTS.gameMove, {
    gameId: state.gameId, clientMoveId, expectedVersion: state.revision,
    from: move.from, to: move.to, ...(move.promotion ? { promotion: move.promotion } : {}),
  });
  // Delta may arrive before ACK. Only the matching inflight attempt owns cleanup.
  if (pendingClientMoveId !== clientMoveId || currentState?.gameId !== state.gameId) return;
  if (!response.ok) {
    if (response.errorCode === "CHESS_SERVER_RECOVERING" || !transportOnline) {
      if (!bufferedMove && optimisticFen && optimisticMove) {
        bufferedMove = { gameId: state.gameId, familyId: state.familyId,
          baseFen: state.fen, baseRevision: pendingBaseRevision,
          move: { ...optimisticMove }, clientMoveId, predictedFen: optimisticFen };
      }
      reconciliationPending = true;
      void pushState("move-ack-unknown");
      if (transportOnline) void resyncCurrent(state.gameId, "move-ack-unknown");
      return;
    }
    resetInFlight();
    selectedSquare = null;
    // Server may reject an optimistic move while a premove awaits a fresh
    // position. Keep the proposal until authoritative resync can revalidate.
    playCue("illegal");
    emitBoardGamePresentationDiagnostic("chess", "NATIVE_CHESS_MOVE_REJECTED", CHESS_ERROR_COPY[response.errorCode] ?? response.errorCode, {
      gameId: state.gameId, ...move, errorCode: response.errorCode,
    });
    void pushState("move-rejected");
    if (response.errorCode === "CHESS_STATE_CONFLICT" || response.errorCode === "CHESS_NOT_YOUR_TURN") {
      void resyncCurrent(state.gameId, "state-conflict");
    }
    return;
  }
  if (staleMoveTimer) clearTimeout(staleMoveTimer);
  staleMoveTimer = setTimeout(() => {
    if (!movePending || pendingClientMoveId !== clientMoveId) return;
    resetInFlight();
    // Timeout is uncertain delivery, not an invalid premove. Keep it locally.
    void pushState("move-delta-timeout");
    void resyncCurrent(state.gameId, "move-delta-timeout");
  }, 4_000);
}

async function markBoardReady() {
  const state = currentState;
  if (!state || state.status !== "waiting" || state.preparationPhase !== "board") return;
  const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameBoardReady, {
    gameId: state.gameId, requestId: requestId("native-chess-board-ready"),
  });
  if (currentState?.gameId !== state.gameId) return;
  if (!response.ok) {
    boardReadyRequestedForGame = null;
    emitBoardGamePresentationDiagnostic("chess", "BOARD_READY_REJECTED", response.errorCode, { gameId: state.gameId });
    retryReadiness(state.gameId, "board-ready-ack-rejected");
    return;
  }
  syncNativeChessAuthoritativeState(response.data);
}

async function markReady() {
  const state = currentState;
  if (!state || state.status !== "waiting" || state.preparationPhase !== "colors" || readyPending) return;
  readyPending = true;
  void pushState("ready-intent");
  const response = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameReady, {
    gameId: state.gameId, requestId: requestId("native-chess-ready"),
  });
  if (currentState?.gameId !== state.gameId) return;
  readyPending = false;
  if (!response.ok) {
    readyRequestedForGame = null;
    emitBoardGamePresentationDiagnostic("chess", "AUTO_READY_REJECTED", response.errorCode, { gameId: state.gameId });
    void pushState("ready-rejected");
    retryReadiness(state.gameId, "play-ready-ack-rejected");
    return;
  }
  syncNativeChessAuthoritativeState(response.data);
}

export async function handleNativeChessAction(event: NativeChessAction) {
  const state = currentState;
  if (!state || event.gameId !== state.gameId) return;
  if (event.action === "assetsReady") {
    boardAssetsReadyForGame = event.gameId;
    if (currentState?.status === "waiting" && currentState.preparationPhase === "colors") {
      void pushState("h25-assets-ready");
    }
    if (currentState?.status === "waiting" && currentState.preparationPhase === "board" &&
        boardReadyRequestedForGame !== currentState.gameId) {
      boardAssetsReadyForGame = currentState.gameId;
      boardReadyRequestedForGame = currentState.gameId;
      await markBoardReady();
    }
    return;
  }
  if (event.action === "ready") return; // no manually forced Ready
  if (event.action === "promotion" && pendingPromotion) {
    const choice = pendingPromotion;
    pendingPromotion = null;
    const promotion = event.promotion;
    if (promotion && ["q", "r", "b", "n"].includes(promotion) && (!choice.isPremove || queuedPremoves.length < MAX_PREMOVES)) {
      const move: PlannedMove = { from: choice.from, to: choice.to, promotion };
      if (choice.isPremove) { queuedPremoves.push(move); playCue("premove"); void pushState("premove-promotion"); }
      else void submitMove(move);
    } else void pushState("promotion-cancelled");
    return;
  }
  if (event.action === "square" && event.square) await selectSquare(event.square);
  if (["resign", "drawOffer", "drawAccept", "drawReject", "resultAck"].includes(event.action)) {
    const active = currentState;
    if (!active || active.gameId !== event.gameId) return;
    const eventName = event.action === "resign" ? CHESS_EVENTS.gameResign
      : event.action === "drawOffer" ? CHESS_EVENTS.drawOffer
      : event.action === "drawAccept" ? CHESS_EVENTS.drawAccept
      : event.action === "drawReject" ? CHESS_EVENTS.drawReject : CHESS_EVENTS.gameResultAck;
    if (event.action !== "resultAck" && active.status !== "active") return;
    if (event.action === "resultAck" && active.status !== "finished") return;
    // Terminal state is already authoritative. ACK is only server bookkeeping:
    // close the UI *before* any network work. A late ACK must never reset a
    // newer game; a failed ACK remains recoverable as an unseen result.
    if (event.action === "resultAck") {
      const finishedGameId = active.gameId;
      const finishedFamilyId = active.familyId;
      const ackRequestId = requestId("native-chess-resultAck");
      markChessResultDismissed(finishedGameId);
      closeFinishedChessBoard(finishedGameId);
      void chessSocketService.emitAck<{ acknowledged: boolean }>(
        CHESS_EVENTS.gameResultAck,
        { gameId: finishedGameId, familyId: finishedFamilyId, requestId: ackRequestId },
        15_000,
      ).then(response => {
        if (!response.ok) emitBoardGamePresentationDiagnostic(
          "chess", "NATIVE_CHESS_RESULT_ACK_BACKGROUND_FAILED",
          response.errorCode, { gameId: finishedGameId },
        );
      }).catch(error => emitBoardGamePresentationDiagnostic(
        "chess", "NATIVE_CHESS_RESULT_ACK_BACKGROUND_FAILED",
        String(error), { gameId: finishedGameId },
      ));
      return;
    }
    // One immediate latch for repeated taps, even if native dispatch races.
    if (chessDecisionBusy) return;
    const action = event.action as ChessDecision;
    const previous = chessDecision;
    chessDecision = previous?.gameId === active.gameId && previous.action === action
      ? previous : {gameId:active.gameId,action,requestId:requestId(`native-chess-${action}`)};
    const decision = chessDecision;
    chessDecisionBusy = true; chessDecisionError = ''; chessDecisionCompleted = '';
    void pushState("decision-pending");
    try {
      const response = await chessSocketService.emitAck<ChessGameState>(
        eventName,{gameId:active.gameId,requestId:decision.requestId},15_000);
      if (currentState?.gameId !== active.gameId || chessDecision !== decision) return;
      if (!response.ok) {
        chessDecisionError = "Máy chủ chưa xác nhận. Chạm để thử lại.";
        emitBoardGamePresentationDiagnostic("chess","NATIVE_CHESS_ACTION_FAILED",`${action}: ${response.errorCode}`,{gameId:active.gameId});
        // A timeout can mean the request applied but its ACK was lost. Read
        // authoritative state before offering another attempt with SAME ID.
        void resyncCurrent(active.gameId,"decision-ack-uncertain");
      } else {
        chessDecisionCompleted = `${action}:${decision.requestId}`;
        chessDecision = null;
        if (response.data) syncNativeChessAuthoritativeState(response.data);
      }
    } catch (error) {
      if (currentState?.gameId === active.gameId && chessDecision === decision) {
        chessDecisionError = "Kết nối bị gián đoạn. Chạm để thử lại.";
        void resyncCurrent(active.gameId,"decision-network-uncertain");
      }
    } finally {
      if (currentState?.gameId === active.gameId && (chessDecision === decision || chessDecisionCompleted.endsWith(decision.requestId))) {
        chessDecisionBusy = false;
        void pushState("decision-settled");
      }
    }
  }
}

function closeFinishedChessBoard(gameId: string) {
  if (currentState?.gameId !== gameId || currentState.status !== "finished") return;
  closeBoardGamePresentationForGame("chess", gameId);
  clearNativeChessSession(gameId);
}

/** Keep retained Full/Mini on background; revalidate only on foreground.
 * Same active socket -> delta replay, disconnected socket -> room rejoin.
 */
export function attachNativeChessAppLifecycle() {
  let last=AppState.currentState;
  const sub=AppState.addEventListener("change",next=>{
    if (next===last) return;
    last=next;
    const game=currentState;
    if (!game || (game.status!=="active" && game.status!=="waiting")) return;
    if (next!=="active") {
      chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence,{gameId:game.gameId,visible:false});
      return;
    }
    // Never infer presence from the mere Socket.IO connection.
    chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence,{gameId:game.gameId,visible:true});
    void chessSocketService.connect().then(()=>{
      if (currentState?.gameId===game.gameId && AppState.currentState==='active')
        return resyncCurrent(game.gameId, "app-foreground");
    }).catch(()=>undefined);
  });
  return ()=>sub.remove();
}

export function clearNativeChessSession(gameId?: string) {
  if (gameId && currentState?.gameId !== gameId) return;
  currentState = null;
  ++reconciliationSerial;
  transportOnline = true;
  resyncInFlight = null;
  resetForNewGame();
  ++renderSerial;
}
