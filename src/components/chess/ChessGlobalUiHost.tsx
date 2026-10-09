import React, { useEffect, useMemo, useState } from "react";

import { useBloomToast } from "../ui/BloomToast";
import { ChessChallengeOverlay } from "./ChessChallengeOverlay";
import { useChessRealtime } from "../../context/ChessRealtimeContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { activateChessSurface, getChessSurfaceState, prepareChessSurface, showChessSurfaceFull } from "../../services/chess/chessSurfaceStore";
import { subscribeChessUiEvents } from "../../services/chess/chessUiEventStore";
import { publishChessSoundUiEvent } from "../../services/chess/chessSoundEventBus";
import { CHESS_ERROR_COPY } from "../../types/chess";

/**
 * Root-only Chess presentation.
 * Network/lifecycle/store work stays in ChessRealtimeProvider. This host owns
 * challenge UI and user-facing Chess notifications so the engine does not
 * render presentation nodes or depend on BloomToast.
 */
export function ChessGlobalUiHost() {
  const realtime = useChessRealtime();
  const members = useFamilyMembersRealtime();
  const { showToast } = useBloomToast();
  const [busy, setBusy] = useState(false);

  const invite = realtime.incomingInvite;

  useEffect(() => {
    const gameId = realtime.activeGameId ?? realtime.pendingResultGameId;
    if (!gameId) return;
    prepareChessSurface(realtime.activeGameId ? "active_game" : "recovered_result");
    const surface = getChessSurfaceState();
    // A newly-owned active game or a finished-unseen recovery claims the full
    // surface only when another surface is not already showing that same game.
    // Normal move/result packets therefore never pop a minimized game open.
    if (surface.gameId !== gameId) activateChessSurface(gameId, "full");
  }, [realtime.activeGameId, realtime.pendingResultGameId]);

  const challenger = useMemo(
    () => invite && !invite.isTestBot ? members?.memberByUid.get(invite.fromUid) : null,
    [invite, members?.memberByUid],
  );

  useEffect(() => subscribeChessUiEvents((event) => {
    if (event.suppressWhenGameVisible && event.gameId) {
      const surface = getChessSurfaceState();
      if (surface.gameId === event.gameId && surface.mode !== "hidden") return;
    }
    showToast({
      type: event.type,
      title: event.title,
      message: event.message,
      duration: event.duration,
      onPress: event.gameId ? () => showChessSurfaceFull(event.gameId!) : undefined,
    });
  }), [showToast]);

  return (
    <ChessChallengeOverlay
      invite={invite}
      challenger={challenger}
      busy={busy}
      onAccept={() => {
        if (!invite || busy) return;
        prepareChessSurface("accept_invite");
        setBusy(true);
        void realtime.acceptInvite(invite.inviteId)
          .then((response) => {
            if (!response.ok) {
              showToast({
                type: "warning",
                title: "Chưa vào được ván",
                message: CHESS_ERROR_COPY[response.errorCode],
              });
              return;
            }
            publishChessSoundUiEvent("challenge_accepted");
          })
          .finally(() => setBusy(false));
      }}
      onReject={() => {
        if (!invite || busy) return;
        setBusy(true);
        void realtime.rejectInvite(invite.inviteId)
          .then((response) => {
            if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
          })
          .finally(() => setBusy(false));
      }}
    />
  );
}
