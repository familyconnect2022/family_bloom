import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";

import { useBloomToast } from "../ui/BloomToast";
import { ChessChallengeOverlay } from "./ChessChallengeOverlay";
import { useChessRealtime } from "../../context/ChessRealtimeContext";
import { useFamilyMembersRealtime } from "../../context/FamilyRealtimeContext";
import { activateChessSurface, getChessSurfaceState, prepareChessSurface, showChessSurfaceFull } from "../../services/chess/chessSurfaceStore";
import { subscribeChessUiEvents } from "../../services/chess/chessUiEventStore";
import { publishChessSoundUiEvent, subscribeChessSoundUiEvents } from "../../services/chess/chessSoundEventBus";
import { CHESS_ERROR_COPY } from "../../types/chess";
import { useChessSoundscape } from "./useChessSoundscape";

/**
 * Root-only Chess presentation.
 * Network/lifecycle/store work stays in ChessRealtimeProvider. This host owns
 * challenge UI and user-facing Chess notifications so the engine does not
 * render presentation nodes or depend on BloomToast.
 */
export const ChessGlobalUiHost = React.memo(function ChessGlobalUiHost({
  suspendedByHigherSurface = false,
}: {
  suspendedByHigherSurface?: boolean;
}) {
  const router = useRouter();
  const realtime = useChessRealtime();
  const routedGameRef = useRef<string | null>(null);
  const members = useFamilyMembersRealtime();
  const { showToast } = useBloomToast();
  const { playChallengeSent, playChallengeAccepted } = useChessSoundscape(true);
  const [busy, setBusy] = useState(false);

  const invite = realtime.incomingInvite;
  const presentedInvite = suspendedByHigherSurface ? null : invite;

  useEffect(() => {
    const gameId = realtime.activeGameId;
    if (!gameId) {
      routedGameRef.current = null;
      return;
    }
    if (routedGameRef.current === gameId) return;

    activateChessSurface(gameId, "full");
    routedGameRef.current = gameId;
    router.navigate({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId } } as never);
  }, [realtime.activeGameId, router]);


  // One process-root listener owns invitation UI sounds. It stays alive before a
  // board session exists, so challenge cues are never lost and can never be
  // duplicated by remounting ChessSurfaceHost.
  useEffect(() => subscribeChessSoundUiEvents((event) => {
    if (event === "challenge_sent") playChallengeSent();
    else if (event === "challenge_accepted") playChallengeAccepted();
  }), [playChallengeAccepted, playChallengeSent]);

  const challenger = useMemo(
    () => presentedInvite && !presentedInvite.isTestBot ? members?.memberByUid.get(presentedInvite.fromUid) : null,
    [presentedInvite, members?.memberByUid],
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
      onPress: event.gameId && !suspendedByHigherSurface ? () => {
        showChessSurfaceFull(event.gameId!);
        router.navigate({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId: event.gameId! } } as never);
      } : undefined,
    });
  }), [router, showToast, suspendedByHigherSurface]);

  return (
    <ChessChallengeOverlay
      invite={presentedInvite}
      challenger={challenger}
      busy={busy}
      onAccept={() => {
        if (!presentedInvite || busy) return;
        prepareChessSurface("accept_invite");
        setBusy(true);
        void realtime.acceptInvite(presentedInvite.inviteId)
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
            const gameId = response.data.gameId;
            activateChessSurface(gameId, "full");
            routedGameRef.current = gameId;
            router.navigate({ pathname: "/(chess)/chess-game/[gameId]", params: { gameId } } as never);
          })
          .finally(() => setBusy(false));
      }}
      onReject={() => {
        if (!presentedInvite || busy) return;
        setBusy(true);
        void realtime.rejectInvite(presentedInvite.inviteId)
          .then((response) => {
            if (!response.ok) showToast({ type: "warning", message: CHESS_ERROR_COPY[response.errorCode] });
          })
          .finally(() => setBusy(false));
      }}
    />
  );
});
