import { chessSocketService } from "../chess/chessSocketService";
import { xiangqiSocketService } from "../xiangqi/xiangqiSocketService";
import { CHESS_EVENTS } from "../../types/chess";
import { XIANGQI_EVENTS } from "../../types/xiangqiRealtime";
import {
  clearPendingBoardGameReservation,
  getPendingBoardGameReservation,
  type PendingBoardGameKind,
  requestLocalBoardGameCancellation,
} from "./pendingBoardGameReservationStore";

type CancelResult =
  | { ok: true; cleared: true }
  | { ok: false; errorCode: string; message?: string };

export async function cancelPendingBoardGameReservation(expectedKind?: PendingBoardGameKind): Promise<CancelResult> {
  const pending = getPendingBoardGameReservation();
  if (!pending) return { ok: true, cleared: true };
  if (expectedKind && pending.gameKind !== expectedKind) {
    return { ok: false, errorCode: "PENDING_KIND_CHANGED" };
  }

  if (pending.source === "local") {
    if (pending.phase === "connecting") {
      clearPendingBoardGameReservation({ gameKind: pending.gameKind, inviteId: pending.inviteId });
      return { ok: true, cleared: true };
    }
    const cancelled = await requestLocalBoardGameCancellation(pending.inviteId);
    return cancelled
      ? { ok: true, cleared: true }
      : { ok: false, errorCode: "SERVER_RECOVERING", message: "Bloom chưa xác nhận hủy được yêu cầu đang gửi." };
  }

  try {
    const response = pending.gameKind === "chess"
      ? await (async () => {
          await chessSocketService.connect();
          return chessSocketService.emitAck(CHESS_EVENTS.inviteCancel, { inviteId: pending.inviteId }, 12_000);
        })()
      : await (async () => {
          await xiangqiSocketService.connect();
          return xiangqiSocketService.emitAck(XIANGQI_EVENTS.inviteCancel, { inviteId: pending.inviteId }, 12_000);
        })();

    // Expiry and a concurrent reject are both authoritative releases. Clear the
    // local gate when the server says the invite is already gone too.
    if (response.ok || response.errorCode?.endsWith("INVITE_EXPIRED")) {
      clearPendingBoardGameReservation({ gameKind: pending.gameKind, inviteId: pending.inviteId });
      return { ok: true, cleared: true };
    }
    return { ok: false, errorCode: response.errorCode, message: response.message };
  } catch (error) {
    return {
      ok: false,
      errorCode: "SERVER_RECOVERING",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
