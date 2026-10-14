import React, { memo, useEffect, useRef } from "react";

import { useAuth } from "../../context/AuthContext";
import { useChessRealtime } from "../../context/ChessRealtimeContext";
import {
  claimActiveBoardGameSession,
  clearActiveBoardGameSession,
  getActiveBoardGameSession,
  resetActiveBoardGameSession,
} from "../../services/games/activeBoardGameSessionStore";
import { resetPendingBoardGameReservation } from "../../services/games/pendingBoardGameReservationStore";
import { resetBoardGameTerminalResult } from "../../services/games/boardGameTerminalResultStore";
import { resetBloomSurfaceRail, syncBloomRailGameSession } from "../../services/presentation/bloomSurfaceRailStore";
import { finishChessSurfaceGame, resetChessSurfaceSession } from "../../services/chess/chessSurfaceStore";
import { resetXiangqiSurfaceSession } from "../../services/xiangqi/xiangqiSurfaceStore";

/**
 * One bridge translates server session recovery into one client-side board-game
 * lease. Presentation hosts never compete with each other directly.
 */
export const BoardGameSessionBridge = memo(function BoardGameSessionBridge() {
  const { user, activeFamilyId } = useAuth();
  const chess = useChessRealtime();
  const identity = `${user?.uid ?? "guest"}:${activeFamilyId ?? "no-family"}`;
  const previousIdentityRef = useRef(identity);

  useEffect(() => {
    if (previousIdentityRef.current === identity) return;
    previousIdentityRef.current = identity;
    resetActiveBoardGameSession();
    resetPendingBoardGameReservation();
    resetBoardGameTerminalResult();
    resetBloomSurfaceRail();
    resetChessSurfaceSession();
    resetXiangqiSurfaceSession();
  }, [identity]);

  useEffect(() => {
    const chessGameId = chess.activeGameId;
    if (chessGameId) {
      claimActiveBoardGameSession({
        kind: "chess",
        gameId: chessGameId,
        familyId: activeFamilyId,
        source: "server",
      });
      syncBloomRailGameSession("chess", chessGameId);
      return;
    }


    if (chess.busyOtherGame?.gameKind === "xiangqi" && chess.busyOtherGame.gameId) {
      claimActiveBoardGameSession({
        kind: "xiangqi",
        gameId: chess.busyOtherGame.gameId,
        familyId: chess.busyOtherGame.familyId,
        source: "server",
      });
      syncBloomRailGameSession("xiangqi", chess.busyOtherGame.gameId);
      return;
    }

    // Empty active ids are authoritative only after recovery resolves. Finished
    // unseen results are normalized to `none` by ChessRealtimeProvider and may
    // never keep a stale board attached to the root surface rail.
    if (chess.recoveryKind !== "none") return;

    const current = getActiveBoardGameSession();
    // Xiangqi may have been created through its own socket and keeps its lease
    // until Xiangqi explicitly finishes/acks it. Chess stale leases are removed.
    if (current?.kind === "chess") {
      finishChessSurfaceGame(current.gameId);
      clearActiveBoardGameSession({ kind: "chess", gameId: current.gameId });
      syncBloomRailGameSession(null, null);
    }
  }, [activeFamilyId, chess.activeGameId, chess.busyOtherGame, chess.recoveryKind]);

  return null;
});
