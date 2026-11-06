import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { ChessGameState, ChessSessionRecovery } from "../../types/chess";
import { CHESS_EVENTS } from "../../types/chess";
import { chessSocketService } from "../../services/chess/chessSocketService";
import { syncChessPresentationFromState } from "../../services/games/boardGamePresentationBridge";
import { getBoardGamePresentationSnapshot } from "../../services/games/boardGamePresentationStore";
import { useBloomDialog } from "../ui/BloomDialogProvider";

/**
 * H19: one app-owned recovery prompt per active Chess game per app lifetime.
 * Checking an existing match must NOT join it or bring up a board until the
 * user explicitly agrees. A refusal leaves the server match untouched.
 * Scoped by authenticated user/family from FamilySession (no admin bypass).
 */
export function ChessSessionRecoveryGate({ uid, familyId, ready }: {
  uid: string; familyId: string; ready: boolean;
}) {
  const { confirm } = useBloomDialog();
  const prompted = useRef(new Set<string>());
  const generation = useRef(0);
  const inFlight = useRef(false);
  const lastProbe = useRef(0);

  useEffect(() => {
    let alive = true;
    const token = ++generation.current;
    prompted.current.clear();
    lastProbe.current = 0;
    const probe = async () => {
      if (!alive || !ready || inFlight.current) return;
      // A background-to-foreground transition can happen repeatedly while
      // the user uses another feature. Avoid waking Render on each event.
      if (Date.now() - lastProbe.current < 45_000) return;
      lastProbe.current = Date.now();
      const visible = getBoardGamePresentationSnapshot();
      if (visible.activeKind === "chess" && visible.activeGameId) return;
      inFlight.current = true;
      try {
        if (!chessSocketService.isConnected()) {
          await chessSocketService.prewake();
          await chessSocketService.connect();
        }
        if (!alive || generation.current !== token) return;
        const response = await chessSocketService.emitAck<ChessSessionRecovery>(
          CHESS_EVENTS.sessionRecover, { familyId }, 20_000,
        );
        if (!response.ok || (response.data.kind !== "active" && response.data.kind !== "finished_unseen")) return;
        const isEnded = response.data.kind === "finished_unseen";
        const gameId = response.data.gameId;
        if (!gameId || prompted.current.has(gameId)) return;
        prompted.current.add(gameId);
        if (!alive || generation.current !== token) return;
        const shouldResume = isEnded ? true : await confirm({
          eyebrow: "CỜ VUA · VÁN ĐẤU ĐANG DIỄN RA",
          title: "Bạn có muốn tiếp tục ván cờ?",
          message: "Bạn vẫn còn một ván cờ trên máy chủ. Bloom đã giữ ván đấu của bạn. Tiếp tục để mở lại bàn cờ và đồng bộ nước đi mới nhất.",
          confirmLabel: "Tiếp tục ván",
          cancelLabel: "Để sau",
          icon: "game-controller-outline",
        });
        if (!shouldResume || !alive || generation.current !== token) return;
        const joined = await chessSocketService.emitAck<ChessGameState>(
          CHESS_EVENTS.gameJoin, { familyId, gameId }, 20_000,
        );
        if (!joined.ok || joined.data.gameId !== gameId ||
            joined.data.familyId !== familyId) return;
        if (!alive || generation.current !== token) return;
        syncChessPresentationFromState(joined.data);
        // A room join is not proof the OS app is visible. Explicitly clear
        // the absence budget only after the player chose to resume in foreground.
        if (AppState.currentState === "active" && (joined.data.status === "active" || joined.data.status === "waiting")) {
          chessSocketService.emitBestEffort(CHESS_EVENTS.gameBoardPresence, { gameId, visible: true });
        }
      } catch {
        // Keep Home responsive if Render is sleeping, unreachable or recovering.
        // A later foreground probe retries discovery without dismissing a match.
      } finally {
        inFlight.current = false;
      }
    };
    if (ready) void probe();
    const subscription = AppState.addEventListener("change", status => {
      if (status === "active") void probe();
    });
    return () => { alive = false; ++generation.current; subscription.remove(); };
  }, [uid, familyId, ready, confirm]);
  return null;
}
