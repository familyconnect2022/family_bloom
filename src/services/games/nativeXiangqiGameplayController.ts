/**
 * Xiangqi Full/Mini gameplay controller. No Chess imports, no Chess host state.
 * Native owns pixels/taps; this controller sends intents, never owns board truth.
 */
import { AppState } from "react-native";
import { getAuth } from "@react-native-firebase/auth";
import { xiangqiSocketService } from "../xiangqi/xiangqiSocketService";
import { legalForColor } from "../xiangqi/xiangqiLocalRules";
import { XIANGQI_EVENTS, type XiangqiMoveDelta, type XiangqiRealtimeState } from "../../types/xiangqiRealtime";
import { setBoardGameNativeXiangqiState, type NativeXiangqiAction, type NativeXiangqiBoardState } from "./boardGameNativeOverlay";
import { closeBoardGamePresentationForGame, markXiangqiResultDismissed } from "./boardGamePresentationStore";
import { emitBoardGamePresentationDiagnostic } from "./boardGamePresentationDiagnostics";

let state: XiangqiRealtimeState | null = null;
let selectedPieceId: string | null = null;
let queuedPremove: {pieceId:string;to:{col:number;row:number}} | null = null;
let soundCue = "", soundToken = 0;
const cue = (value:string) => {soundCue=value; soundToken++;};
let movePending = false;
let boardReadyRequested: string | null = null;
let playReadyRequested: string | null = null;
let nativeAssetsReady: string | null = null;
let playReadyScheduled: string | null = null;
let renderSerial = 0;
let transportOnline = xiangqiSocketService.isConnected();
let reconciliationPending = false;
let requestSerial = 0;
let currentMoveRequestId: string | null = null;
let readyRetryTimer: ReturnType<typeof setTimeout> | null = null;
let preparedWatchdog: ReturnType<typeof setTimeout> | null = null;
const req = (label: string) => `native-xiangqi-${label}-${Date.now()}-${++requestSerial}`;
const myColor = (g: XiangqiRealtimeState | null): "red" | "black" | null => {
  const uid = getAuth().currentUser?.uid;
  if (!uid || !g) return null;
  return uid === g.redUid ? "red" : uid === g.blackUid ? "black" : null;
};
const participant = (g: XiangqiRealtimeState) => {
  if (g.testBotUid && (g.redUid === g.testBotUid || g.blackUid === g.testBotUid)) return "Bloom Bot";
  return "Người thân";
};
const isTerminal = (g: XiangqiRealtimeState) => g.status === "finished" || g.status === "cancelled";
const waitNativeFrames = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function queueRetry(gameId: string) {
  if (readyRetryTimer) return;
  readyRetryTimer = setTimeout(() => {
    readyRetryTimer = null;
    if (state?.gameId !== gameId || state.status !== "waiting" || !transportOnline) return;
    if (state.preparationPhase === "board" && nativeAssetsReady === gameId) void markBoardReady();
    if (state.preparationPhase === "colors") void sendPlayReady();
  }, 1_500);
}
function scheduleWaitRecovery(g: XiangqiRealtimeState) {
  if (preparedWatchdog) { clearTimeout(preparedWatchdog); preparedWatchdog = null; }
  if (g.status !== "waiting") return;
  const remain = Math.max(0, Date.parse(g.createdAt) + 120_000 - g.serverNowMs);
  const gameId = g.gameId;
  preparedWatchdog = setTimeout(() => {
    preparedWatchdog = null;
    if (state?.gameId === gameId && state.status === "waiting" && transportOnline) {
      void resyncXiangqi(gameId, "preparation-deadline");
    }
  }, remain + 900);
}
async function push(reason: string) {
  const g = state;
  if (!g) return;
  const serial = ++renderSerial;
  const me = myColor(g);
  const selected = g.board.pieces.find(p => p.id === selectedPieceId);
  if (!selected || selected.color !== me) selectedPieceId = null;
  const selectedOwn = g.board.pieces.find(p => p.id === selectedPieceId);
  const canPremove = g.status === "active" && !!me && me !== g.board.turn && transportOnline && !movePending && !reconciliationPending;
  const canMove = g.status === "active" && !!me && me === g.board.turn && transportOnline && !movePending && !reconciliationPending;
  const hints = (canMove || canPremove) && selectedOwn && me ? legalForColor(g.board, selectedOwn.id, me) : [];
  const captures = hints.filter(h => g.board.pieces.some(p => p.col === h.col && p.row === h.row && p.color !== me));
  const deadline = Date.parse(g.createdAt) + 120_000;
  const waitingRemainingMs = g.status === "waiting" && Number.isFinite(deadline) ? Math.max(0, deadline - g.serverNowMs) : null;
  const props: NativeXiangqiBoardState = {
    gameId: g.gameId, revision: g.revision, renderSequence: serial, status: g.status,
    preparationPhase: g.preparationPhase ?? "board", turn: g.board.turn,
    orientation: me ?? "red", meColor: me, pieces: g.board.pieces,
    lastFrom: g.board.lastMove?.from ?? null, lastTo: g.board.lastMove?.to ?? null,
    selectedPieceId, legalTargets: hints, captureTargets: captures,
    redRemainingMs: g.redRemainingMs, blackRemainingMs: g.blackRemainingMs, serverNowMs: g.serverNowMs,
    canMove, canPremove, premoveTarget:queuedPremove?.to ?? null, movePending, opponentLabel: participant(g),
    soundCue,soundToken,
    waitingRemainingMs,
    waitingMessage: g.status === "waiting"
      ? waitingRemainingMs === 0 ? "Đã hết thời gian chuẩn bị · Đang đối soát…"
      : g.preparationPhase === "board" ? "Đang chuẩn bị bàn cờ cho cả hai người…"
      : `Đã chốt màu quân · Đợi ${participant(g)} sẵn sàng`
      : !transportOnline ? "Mất kết nối · Đang khôi phục…" : "",
    result: g.result, finishReason: g.finishReason,
  };
  const reply = await setBoardGameNativeXiangqiState(props);
  if (!reply.accepted || serial !== renderSerial || state?.gameId !== g.gameId) return;
  // The native board confirms the physical PNG board before boardReady.
  if (g.status === "waiting" && g.preparationPhase === "board" && nativeAssetsReady === g.gameId && transportOnline)
    void markBoardReady();
  if (g.status === "waiting" && g.preparationPhase === "colors" && me && transportOnline && !playReadyScheduled && playReadyRequested !== g.gameId) {
    playReadyScheduled = g.gameId;
    const colorRevision = g.revision;
    await waitNativeFrames();
    if (playReadyScheduled === g.gameId) playReadyScheduled = null;
    if (state?.gameId === g.gameId && state.preparationPhase === "colors" && state.revision === colorRevision && transportOnline)
      void sendPlayReady();
    else queueRetry(g.gameId);
  }
  emitBoardGamePresentationDiagnostic("xiangqi", "XIANGQI_NATIVE_SYNC", `${reason} · ${g.gameId} rev ${g.revision}`, {gameId:g.gameId, status:g.status});
}

async function markBoardReady() {
  const g = state;
  if (!g || g.status !== "waiting" || g.preparationPhase !== "board" || nativeAssetsReady !== g.gameId || !transportOnline) return;
  if (boardReadyRequested === g.gameId) return;
  boardReadyRequested = g.gameId;
  const response = await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameBoardReady,
    { gameId: g.gameId, requestId: req("board-ready") });
  if (!response.ok) { boardReadyRequested = null; queueRetry(g.gameId); return; }
  syncNativeXiangqiAuthoritativeState(response.data);
}
async function sendPlayReady() {
  const g = state;
  if (!g || g.status !== "waiting" || g.preparationPhase !== "colors" || !myColor(g) || !transportOnline) return;
  if (playReadyRequested === g.gameId) return;
  playReadyRequested = g.gameId;
  const response = await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameReady,
    { gameId: g.gameId, requestId: req("play-ready") });
  if (!response.ok) { playReadyRequested = null; queueRetry(g.gameId); return; }
  syncNativeXiangqiAuthoritativeState(response.data);
}

export function syncNativeXiangqiAuthoritativeState(next: XiangqiRealtimeState) {
  if (state?.gameId === next.gameId && next.revision < state.revision) return;
  const fresh = state?.gameId !== next.gameId;
  if (fresh) {
    selectedPieceId = null; boardReadyRequested = null; playReadyRequested = null;
    nativeAssetsReady = null; playReadyScheduled = null; movePending = false; currentMoveRequestId = null;
    queuedPremove = null; soundCue=""; soundToken=0;
  }
  const previous = state;
  state = next;
  if (previous?.gameId === next.gameId && previous.status === "waiting" && next.status === "active") cue("game-start");
  if (previous?.gameId === next.gameId && !isTerminal(previous) && isTerminal(next)) {queuedPremove=null;cue("game-end");}
  if (isTerminal(next)) { selectedPieceId = null; movePending = false; currentMoveRequestId = null; }
  else if (next.status === "active") { boardReadyRequested = null; playReadyRequested = null; }
  scheduleWaitRecovery(next);
  void push("state");
}

export function syncNativeXiangqiAuthoritativeMove(delta: XiangqiMoveDelta) {
  if (!state || state.gameId !== delta.gameId) return;
  if (delta.version <= state.revision) return;
  if (delta.version !== state.revision + 1) { void resyncXiangqi(delta.gameId, "revision-gap"); return; }
  const before = state;
  currentMoveRequestId = null; movePending = false; selectedPieceId = null;
  // Server packets own the move sound; no speculative replay on ACK.
  if (delta.status === "finished") {queuedPremove=null;cue("game-end");}
  else if (delta.board.inCheck) cue("move-check");
  else if (delta.move.capturedId) cue("capture");
  else cue(before.board.turn === myColor(before) ? "move-self" : "move-opponent");
  state = {
    ...state, board: delta.board, revision: delta.version, status: delta.status,
    redRemainingMs: delta.redRemainingMs, blackRemainingMs: delta.blackRemainingMs,
    result: delta.result, finishReason: delta.finishReason, serverNowMs: delta.serverNowMs,
    endedAt: delta.endedAt, preparationPhase: "play",
  };
  void push("move");
  if (state.status === "active" && state.board.turn === myColor(state) && queuedPremove) {
    const planned=queuedPremove;queuedPremove=null;
    const mySide=myColor(state);
    const piece=state.board.pieces.find(p=>p.id===planned.pieceId);
    if (mySide && piece?.color===mySide && legalForColor(state.board,planned.pieceId,mySide).some(s=>s.col===planned.to.col&&s.row===planned.to.row)) {
      const ready=state;
      setTimeout(()=>{if(state?.gameId===ready.gameId && state.revision===ready.revision && !movePending) void sendMove(ready,planned.pieceId,planned.to);},0);
    } else {cue("illegal");void push("premove-invalidated");}
  }
}

export async function resyncXiangqi(gameId: string, reason: string) {
  if (!state || state.gameId !== gameId || reconciliationPending || !transportOnline) return;
  reconciliationPending = true;
  try {
    const response = await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameResync, {gameId});
    if (response.ok && response.data.gameId === gameId) syncNativeXiangqiAuthoritativeState(response.data);
  } finally {
    reconciliationPending = false;
    if (state?.gameId === gameId) void push(`resync-${reason}`);
  }
}

async function sendMove(g: XiangqiRealtimeState, pieceId: string, to:{col:number;row:number}) {
  const clientMoveId = req("move"); currentMoveRequestId = clientMoveId; movePending = true;
  selectedPieceId = null; void push("move-intent");
  const response = await xiangqiSocketService.emitAck<{clientMoveId:string;version:number;duplicate?:boolean}>(XIANGQI_EVENTS.gameMove, {
    gameId:g.gameId, clientMoveId, expectedVersion:g.revision, pieceId, to,
  });
  if (currentMoveRequestId !== clientMoveId) return;
  currentMoveRequestId = null; movePending = false;
  if (!response.ok) {
    cue("illegal");
    emitBoardGamePresentationDiagnostic("xiangqi", "XIANGQI_MOVE_REJECTED", response.errorCode, {gameId:g.gameId});
    await resyncXiangqi(g.gameId, response.errorCode);
  } else {
    // An ACK is not the move; wait for server delta, then resync if lost.
    setTimeout(() => { if (state?.gameId === g.gameId && state.revision < response.data.version)
      void resyncXiangqi(g.gameId, "missing-delta"); }, 1_000);
  }
  void push("move-ack");
}
export async function handleNativeXiangqiAction(event: NativeXiangqiAction) {
  const g = state;
  if (!g || event.gameId !== g.gameId) return;
  if (event.action === "assetsReady") {
    nativeAssetsReady = g.gameId;
    void push("native-assets-ready");
    return;
  }
  if (event.action === "resultAck" && isTerminal(g)) {
    const response = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameResultAck,
      {familyId:g.familyId,gameId:g.gameId});
    if (!response.ok) return; // keep visible until server acknowledges
    markXiangqiResultDismissed(g.gameId);
    closeBoardGamePresentationForGame("xiangqi",g.gameId);
    clearNativeXiangqiSession(g.gameId);
    return;
  }
  if (event.action === "resign" && g.status === "active") {
    await xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameResign, {gameId:g.gameId, requestId:req("resign")});
    return;
  }
  if (event.action !== "square" || !Number.isInteger(event.col) || !Number.isInteger(event.row)) return;
  if (g.status !== "active" || !transportOnline || reconciliationPending || movePending) return;
  const mine = myColor(g); if (!mine) return;
  const premoving = g.board.turn !== mine;
  const coord = {col:event.col!,row:event.row!};
  const tapped = g.board.pieces.find(p => p.col === coord.col && p.row === coord.row);
  if (tapped?.color === mine) { selectedPieceId = tapped.id; void push("select"); return; }
  const selected = selectedPieceId;
  if (!selected) return;
  const legal = legalForColor(g.board, selected, mine);
  if (!legal.some(p => p.col === coord.col && p.row === coord.row)) { selectedPieceId = null; void push("invalid-target"); return; }
  if (premoving) {queuedPremove={pieceId:selected,to:coord};selectedPieceId=null;cue("premove");void push("premove-queued");return;}
  await sendMove(g, selected, coord);
}

export function setNativeXiangqiTransportConnected(connected: boolean) {
  transportOnline = connected;
  if (connected && state && AppState.currentState === "active") {
    // Lost READY ACKs must not permanently suppress readiness after a server restart.
    boardReadyRequested = null; playReadyRequested = null;
    const g = state;
    void xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin,
      {familyId:g.familyId,gameId:g.gameId}).then(reply => {
        if (!reply.ok || state?.gameId !== g.gameId) return;
        syncNativeXiangqiAuthoritativeState(reply.data);
        void xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameBoardPresence,{gameId:g.gameId,visible:true});
      });
  }
  if (state) void push("transport");
}

export function attachNativeXiangqiAppLifecycle() {
  let last = AppState.currentState;
  const sub = AppState.addEventListener("change", next => {
    if (next === last) return;
    last = next;
    const g = state;
    if (!g || isTerminal(g)) return;
    if (next !== "active") {
      // No client-calculated deadlines. The same authoritative budget survives
      // background / app kill / server restart / repeated transitions.
      void xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameBoardPresence,{gameId:g.gameId,visible:false},5_000);
    } else {
      void xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameBoardPresence,{gameId:g.gameId,visible:true});
      void resyncXiangqi(g.gameId,"app-foreground");
    }
  });
  return () => sub.remove();
}
export function clearNativeXiangqiSession(gameId: string) {
  if (state?.gameId !== gameId) return;
  state = null; selectedPieceId = null; movePending = false;
  nativeAssetsReady = null; boardReadyRequested = null; playReadyRequested = null;
  queuedPremove = null; soundCue=""; soundToken=0;
  currentMoveRequestId = null; ++renderSerial;
  if (preparedWatchdog) { clearTimeout(preparedWatchdog); preparedWatchdog=null; }
  if (readyRetryTimer) { clearTimeout(readyRetryTimer); readyRetryTimer=null; }
}
