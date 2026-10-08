import { useCallback, useEffect } from "react";
import { useChessRealtime } from "../../context/ChessRealtimeContext";
import { prepareChessSurface } from "../../services/chess/chessSurfaceStore";
import type { ChessAck, ChessGameState, ChessInvite, ChessTimeControl } from "../../types/chess";

export function useChessLobby(familyId: string | null) {
  const realtime = useChessRealtime();

  useEffect(() => {
    if (!familyId) return;
    // lobby:join is itself an authenticated readiness probe. Waiting for the
    // provider to become `ready` first creates a circular cold-start state
    // where the lobby can stay on “Bloom đang mở bàn cờ…” forever even though
    // Socket.IO is already healthy. Let the lobby join prove readiness.
    void realtime.enterLobby();
    return () => realtime.leaveLobby();
  }, [familyId, realtime.enterLobby, realtime.leaveLobby]);

  const challenge = useCallback((toUid: string, timeControl: ChessTimeControl) => {
    prepareChessSurface("outgoing_challenge");
    return realtime.challenge(toUid, timeControl);
  }, [realtime.challenge]);
  const cancel = useCallback((inviteId: string) => realtime.cancelInvite(inviteId), [realtime.cancelInvite]);
  const accept = useCallback((inviteId: string): Promise<ChessAck<{ gameId: string; state: ChessGameState }>> => realtime.acceptInvite(inviteId), [realtime.acceptInvite]);
  const reject = useCallback((inviteId: string): Promise<ChessAck> => realtime.rejectInvite(inviteId), [realtime.rejectInvite]);
  const requestTestBotChallenge = useCallback((timeControl: ChessTimeControl, delayMs = 0) => {
    prepareChessSurface("outgoing_challenge");
    return realtime.requestTestBotChallenge(timeControl, delayMs);
  }, [realtime.requestTestBotChallenge]);

  return {
    connection: realtime.connection,
    presence: realtime.presence,
    invite: realtime.incomingInvite,
    outgoingInvite: realtime.outgoingInvite as ChessInvite | null,
    activeGameId: realtime.activeGameId,
    pendingResultGameId: realtime.pendingResultGameId,
    challenge,
    cancel,
    accept,
    reject,
    testBotEnabled: realtime.testBotEnabled,
    requestTestBotChallenge,
  };
}
