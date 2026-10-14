import { xiangqiSocketService } from "./xiangqiSocketService";
import { XIANGQI_EVENTS, type XiangqiRealtimeState, type XiangqiTimeControl } from "../../types/xiangqiRealtime";
import {
  beginLocalBoardGameReservation,
  clearPendingBoardGameReservation,
  finishLocalBoardGameReservation,
  getPendingBoardGameReservation,
  isLocalBoardGameCancellationRequested,
  promoteLocalBoardGameReservation,
  setPendingBoardGameReservation,
  updateLocalBoardGameReservationPhase,
} from "../games/pendingBoardGameReservationStore";

const DEFAULT_TIME_CONTROL: XiangqiTimeControl = { kind: "clocked", initialMs: 600_000, incrementMs: 0 };
const requestId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export type XiangqiSessionBootstrapResult =
  | { kind: "xiangqi"; state: XiangqiRealtimeState }
  | { kind: "busy_chess"; gameId: string; familyId: string }
  | { kind: "pending"; gameKind: "chess" | "xiangqi"; familyId: string; inviteId: string; expiresAt: number }
  | { kind: "error"; message: string };

let inFlight: { familyId: string; promise: Promise<XiangqiSessionBootstrapResult> } | null = null;

/**
 * Lightweight Xiangqi session resolver. It creates/recovers a server game before
 * the heavy Xiangqi surface is allowed to mount or enter the screen.
 */
export async function resolveOrCreateXiangqiSession(familyId: string): Promise<XiangqiSessionBootstrapResult> {
  if (!familyId) return { kind: "error", message: "Chưa có Nhà đang hoạt động." };
  if (inFlight?.familyId === familyId) return inFlight.promise;

  const promise = (async (): Promise<XiangqiSessionBootstrapResult> => {
    const existingPending = getPendingBoardGameReservation();
    if (existingPending?.gameKind === "chess") {
      return {
        kind: "pending",
        gameKind: "chess",
        familyId: existingPending.familyId ?? familyId,
        inviteId: existingPending.inviteId,
        expiresAt: existingPending.expiresAt ?? Date.now() + 45_000,
      };
    }
    if (existingPending?.gameKind === "xiangqi" && existingPending.source === "server") {
      return {
        kind: "pending",
        gameKind: "xiangqi",
        familyId: existingPending.familyId ?? familyId,
        inviteId: existingPending.inviteId,
        expiresAt: existingPending.expiresAt ?? Date.now() + 45_000,
      };
    }
    const localToken = existingPending?.gameKind === "xiangqi" && existingPending.source === "local"
      ? existingPending.inviteId
      : beginLocalBoardGameReservation("xiangqi", familyId, "connecting");
    if (!localToken) return { kind: "error", message: "Bloom đang giữ một phiên đấu khác. Hãy hủy phiên đó trước nhé." };

    try {
      void xiangqiSocketService.prewake().catch(() => undefined);
      await xiangqiSocketService.connect();
      const afterConnect = getPendingBoardGameReservation();
      if (afterConnect?.inviteId !== localToken) {
        finishLocalBoardGameReservation(localToken, true);
        return { kind: "error", message: "Phiên Cờ tướng đã được hủy." };
      }

      const joined = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled: boolean }>(
        XIANGQI_EVENTS.appJoin,
        { familyId },
      );
      if (!joined.ok) {
        finishLocalBoardGameReservation(localToken, true);
        return { kind: "error", message: joined.message ?? joined.errorCode ?? "Không thể kết nối Cờ tướng." };
      }

      const recovered = await xiangqiSocketService.emitAck<{
        kind: "active" | "finished_unseen" | "busy_other_game" | "pending" | "none";
        gameId?: string;
        gameKind?: "chess" | "xiangqi";
        familyId?: string;
        inviteId?: string;
        expiresAt?: number;
      }>(XIANGQI_EVENTS.sessionRecover, { familyId });

      if (!recovered.ok) {
        finishLocalBoardGameReservation(localToken, true);
        return { kind: "error", message: recovered.message ?? recovered.errorCode ?? "Chưa khôi phục được phiên Cờ tướng." };
      }

      if (recovered.data.kind === "busy_other_game" && recovered.data.gameKind === "chess" && recovered.data.gameId) {
        finishLocalBoardGameReservation(localToken, true);
        return {
          kind: "busy_chess",
          gameId: recovered.data.gameId,
          familyId: recovered.data.familyId ?? familyId,
        };
      }

      if (recovered.data.kind === "pending" && recovered.data.gameKind && recovered.data.inviteId) {
        const pending = {
          kind: "pending" as const,
          gameKind: recovered.data.gameKind,
          familyId: recovered.data.familyId ?? familyId,
          inviteId: recovered.data.inviteId,
          expiresAt: recovered.data.expiresAt ?? Date.now() + 45_000,
        };
        setPendingBoardGameReservation({ ...pending, source: "server", phase: "waiting_confirmation" });
        finishLocalBoardGameReservation(localToken, true);
        return pending;
      }

      if (recovered.data.kind === "active" && recovered.data.gameId) {
        const resume = await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin, {
          familyId,
          gameId: recovered.data.gameId,
        });
        if (resume.ok) {
          finishLocalBoardGameReservation(localToken, true);
          clearPendingBoardGameReservation();
          return { kind: "xiangqi", state: resume.data };
        }
      }

      if (recovered.data.kind === "finished_unseen" && recovered.data.gameId) {
        // P2.20: never rejoin a finished Xiangqi room. Clear the recovery receipt
        // and continue straight through to a fresh session request. The old build
        // joined this state, flashed the previous loss modal, then checked again.
        await xiangqiSocketService.emitAck(
          XIANGQI_EVENTS.gameResultAck,
          { familyId, gameId: recovered.data.gameId },
        );
      }

      if (getPendingBoardGameReservation()?.inviteId !== localToken) {
        finishLocalBoardGameReservation(localToken, true);
        return { kind: "error", message: "Phiên Cờ tướng đã được hủy." };
      }
      updateLocalBoardGameReservationPhase(localToken, "requesting");
      const invite = await xiangqiSocketService.emitAck<{ inviteId: string }>(XIANGQI_EVENTS.testBotInvite, {
        requestId: requestId("xq-bot-invite"),
        familyId,
        timeControl: DEFAULT_TIME_CONTROL,
      });
      if (!invite.ok) {
        finishLocalBoardGameReservation(localToken, true);
        return { kind: "error", message: invite.message ?? invite.errorCode ?? "Chưa tạo được lời mời Cờ tướng." };
      }
      if (isLocalBoardGameCancellationRequested(localToken)) {
        const cancelled = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.inviteCancel, { inviteId: invite.data.inviteId });
        finishLocalBoardGameReservation(localToken, cancelled.ok || cancelled.errorCode === "XIANGQI_INVITE_EXPIRED");
        return { kind: "error", message: "Phiên Cờ tướng đã được hủy." };
      }
      const promoted = promoteLocalBoardGameReservation({
        token: localToken,
        inviteId: invite.data.inviteId,
        expiresAt: Date.now() + 45_000,
        familyId,
      });
      if (!promoted) {
        await xiangqiSocketService.emitAck(XIANGQI_EVENTS.inviteCancel, { inviteId: invite.data.inviteId });
        finishLocalBoardGameReservation(localToken, true);
        return { kind: "error", message: "Bloom đã dừng yêu cầu Cờ tướng vì một phiên khác đang được giữ." };
      }
      finishLocalBoardGameReservation(localToken, true);

      const accepted = await xiangqiSocketService.emitAck<{ gameId: string; state: XiangqiRealtimeState }>(XIANGQI_EVENTS.inviteAccept, {
        requestId: requestId("xq-bot-accept"),
        inviteId: invite.data.inviteId,
      });
      if (!accepted.ok) return { kind: "error", message: accepted.message ?? accepted.errorCode ?? "Chưa bắt đầu được ván Cờ tướng." };
      clearPendingBoardGameReservation({ gameKind: "xiangqi", inviteId: invite.data.inviteId });
      return { kind: "xiangqi", state: accepted.data.state };
    } catch (error) {
      finishLocalBoardGameReservation(localToken, true);
      return { kind: "error", message: error instanceof Error ? error.message : String(error) };
    }
  })();

  inFlight = { familyId, promise };
  try {
    return await promise;
  } finally {
    if (inFlight?.promise === promise) inFlight = null;
  }
}
