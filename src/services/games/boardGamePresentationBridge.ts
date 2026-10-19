import type { ChessGameState, ChessMoveDelta } from "../../types/chess";
import type { XiangqiMoveDelta, XiangqiRealtimeState } from "../../types/xiangqiRealtime";
import { chessSocketService } from "../chess/chessSocketService";
import { xiangqiSocketService } from "../xiangqi/xiangqiSocketService";
import { setFamilyBloomOverlayXiangqiMiniState, type NativeXiangqiMiniState } from "../../../modules/family-bloom-overlay";
import { emitBoardGamePresentationDiagnostic } from "./boardGamePresentationDiagnostics";
import { clearNativeXiangqiSession, syncNativeXiangqiAuthoritativeMove, syncNativeXiangqiAuthoritativeState, setNativeXiangqiTransportConnected } from "./nativeXiangqiGameplayController";
import { clearNativeChessSession, syncNativeChessAuthoritativeMove, syncNativeChessAuthoritativeState, setNativeChessTransportConnected } from "./nativeChessGameplayController";
import {
  closeBoardGamePresentationForGame,
  getBoardGamePresentationSnapshot,
  CHESS_PENDING_PREFIX,
  XIANGQI_PENDING_PREFIX,
  dismissPendingXiangqiBoard,
  wasXiangqiResultDismissed,
  dismissPendingChessBoard,
  presentConfirmedBoardGame,
  restoreBoardGamePresentation,
  wasChessResultDismissed,
} from "./boardGamePresentationStore";

type Unsubscribe = () => void;

function chessIsLive(state: Pick<ChessGameState, "status">) {
  return state.status === "waiting" || state.status === "active" || state.status === "paused";
}

function xiangqiIsLive(state: Pick<XiangqiRealtimeState, "status">) {
  return state.status === "waiting" || state.status === "active" || state.status === "paused";
}

export function syncChessPresentationFromState(state: ChessGameState) {
  if (wasChessResultDismissed(state.gameId)) return; // late server state after local result dismissal
  syncNativeChessAuthoritativeState(state);
  emitBoardGamePresentationDiagnostic("bridge", "CHESS_STATE_RECEIVED", `${state.gameId} · ${state.status} · rev ${state.revision}`, { kind: "chess", gameId: state.gameId, status: state.status });
  if (chessIsLive(state) || state.status === "finished") {
    // Retain the authoritative position and restore Full to show the result
    // even if the game ends while a tiny Mini is floating over another tab.
    presentConfirmedBoardGame("chess", state.gameId);
    if (state.status === "finished") restoreBoardGamePresentation();
    return;
  }
  closeBoardGamePresentationForGame("chess", state.gameId);
  clearNativeChessSession(state.gameId);
}

// Independent Xiangqi visual glyphs (red/black use their own piece ideograms).
function xiangqiMiniGlyph(type: string, color: "red" | "black") {
  const red: Record<string, string> = { general: "帥", advisor: "仕", elephant: "相", chariot: "俥", horse: "傌", cannon: "炮", soldier: "兵" };
  const black: Record<string, string> = { general: "將", advisor: "士", elephant: "象", chariot: "車", horse: "馬", cannon: "砲", soldier: "卒" };
  return (color === "red" ? red : black)[type] ?? "棋";
}

// Xiangqi builds its own tiny Native Mini snapshot, independently of Chess.
// Called only on server packets. Native owns its one-second text-only ticker.
function xiangqiMiniSnapshot(state: XiangqiRealtimeState): NativeXiangqiMiniState {
  const last = state.board.lastMove;
  const piece = last ? state.board.pieces.find(p => p.id === last.pieceId) : null;
  return {
    gameId: state.gameId, revision: state.revision, status: state.status, turn: state.board.turn,
    lastPieceGlyph: piece ? xiangqiMiniGlyph(piece.type, piece.color) : "棋",
    redRemainingMs: state.redRemainingMs, blackRemainingMs: state.blackRemainingMs, serverNowMs: state.serverNowMs,
  };
}

export function syncXiangqiPresentationFromState(state: XiangqiRealtimeState) {
  if (wasXiangqiResultDismissed(state.gameId)) return;
  syncNativeXiangqiAuthoritativeState(state);
  void setFamilyBloomOverlayXiangqiMiniState(xiangqiMiniSnapshot(state));
  emitBoardGamePresentationDiagnostic("bridge", "XIANGQI_STATE_RECEIVED", `${state.gameId} · ${state.status} · rev ${state.revision}`, { kind: "xiangqi", gameId: state.gameId, status: state.status });
  if (xiangqiIsLive(state) || state.status === "finished" || state.status === "cancelled") {
    presentConfirmedBoardGame("xiangqi", state.gameId);
    if (state.status === "finished" || state.status === "cancelled") restoreBoardGamePresentation();
    return;
  }
  closeBoardGamePresentationForGame("xiangqi", state.gameId);
  clearNativeXiangqiSession(state.gameId);
}

/** Move packets are hot-path deltas. They never reopen a Surface, but a move
 * can itself end a game (checkmate/general capture/etc.), so terminal deltas
 * must participate in deterministic presentation cleanup. */
export function syncChessPresentationFromMove(delta: ChessMoveDelta) {
  if (wasChessResultDismissed(delta.gameId)) return; // do not resurrect dismissed results
  if (!syncNativeChessAuthoritativeMove(delta)) return;
  const showing = getBoardGamePresentationSnapshot();
  if (showing.activeKind !== "chess" || showing.activeGameId !== delta.gameId) return;
  if (delta.status === "finished") {
    // The native board is responsible for closing AFTER result acknowledgment.
    restoreBoardGamePresentation();
    emitBoardGamePresentationDiagnostic("bridge", "CHESS_TERMINAL_RESULT_VISIBLE", `${delta.gameId} · ${delta.finishReason}`, { kind: "chess", gameId: delta.gameId });
  } else if (delta.status === "cancelled") {
    closeBoardGamePresentationForGame("chess", delta.gameId);
    clearNativeChessSession(delta.gameId);
  }
}

export function syncXiangqiPresentationFromMove(delta: XiangqiMoveDelta) {
  if (wasXiangqiResultDismissed(delta.gameId)) return;
  syncNativeXiangqiAuthoritativeMove(delta);
  // Native Mini update; no React rerender.
  const movedPiece = delta.board.pieces.find(p => p.id === delta.move.pieceId);
  void setFamilyBloomOverlayXiangqiMiniState({
    gameId: delta.gameId, revision: delta.version, status: delta.status, turn: delta.board.turn,
    lastPieceGlyph: movedPiece ? xiangqiMiniGlyph(movedPiece.type, movedPiece.color) : "棋",
    redRemainingMs: delta.redRemainingMs, blackRemainingMs: delta.blackRemainingMs, serverNowMs: delta.serverNowMs,
  });
  if (delta.status === "finished" || delta.status === "cancelled") {
    emitBoardGamePresentationDiagnostic("bridge", "XIANGQI_TERMINAL_DELTA", `${delta.gameId} · ${delta.status}`, { kind: "xiangqi", gameId: delta.gameId, status: delta.status });
    if (delta.status === "finished") restoreBoardGamePresentation();
    else { closeBoardGamePresentationForGame("xiangqi", delta.gameId); clearNativeXiangqiSession(delta.gameId); }
  }
}

/**
 * Root-owned session -> presentation bridge.
 *
 * The two games stay independent: each transport emits its own authoritative
 * state/delta and calls its own mapper. This bridge coordinates only the final
 * presentation command; it does not merge Chess/Xiangqi gameplay state.
 */
export function attachBoardGamePresentationBridge(): Unsubscribe {
  const offChessState = chessSocketService.on("state", syncChessPresentationFromState);
  const offChessMove = chessSocketService.on("move", syncChessPresentationFromMove);
  const offChessDisconnected = chessSocketService.on("disconnected", () => setNativeChessTransportConnected(false));
  const offChessConnected = chessSocketService.on("connected", () => setNativeChessTransportConnected(true));
  const clearUnconfirmedInvite = () => {
    const pending = getBoardGamePresentationSnapshot();
    if (pending.activeKind === "chess" && pending.activeGameId?.startsWith(CHESS_PENDING_PREFIX))
      dismissPendingChessBoard(pending.activeGameId);
  };
  const offChessInviteExpired = chessSocketService.on("inviteExpired", clearUnconfirmedInvite);
  const offChessInviteRejected = chessSocketService.on("inviteRejected", clearUnconfirmedInvite);
  const offXiangqiState = xiangqiSocketService.on("state", syncXiangqiPresentationFromState);
  const offXiangqiMove = xiangqiSocketService.on("move", syncXiangqiPresentationFromMove);
  const offXiangqiDisconnected = xiangqiSocketService.on("disconnected", () => setNativeXiangqiTransportConnected(false));
  const offXiangqiConnected = xiangqiSocketService.on("connected", () => setNativeXiangqiTransportConnected(true));
  const clearUnconfirmedXiangqiInvite = () => {
    const pending = getBoardGamePresentationSnapshot();
    if (pending.activeKind === "xiangqi" && pending.activeGameId?.startsWith(XIANGQI_PENDING_PREFIX))
      dismissPendingXiangqiBoard(pending.activeGameId);
  };
  const offXiangqiInviteExpired = xiangqiSocketService.on("inviteExpired", clearUnconfirmedXiangqiInvite);
  const offXiangqiInviteRejected = xiangqiSocketService.on("inviteRejected", clearUnconfirmedXiangqiInvite);
  return () => {
    offChessState();
    offChessMove();
    offChessDisconnected();
    offChessConnected();
    offChessInviteExpired();
    offChessInviteRejected();
    offXiangqiState();
    offXiangqiMove();
    offXiangqiDisconnected();offXiangqiConnected();offXiangqiInviteExpired();offXiangqiInviteRejected();
  };
}
