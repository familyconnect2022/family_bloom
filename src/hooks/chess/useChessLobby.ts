import { useCallback, useEffect } from "react";
import { useChessRealtime } from "../../context/ChessRealtimeContext";
import type { ChessAck, ChessGameState, ChessInvite, ChessTimeControl } from "../../types/chess";

export function useChessLobby(familyId: string | null) {
  const realtime = useChessRealtime();

  useEffect(() => {
    if (!familyId) return;
    void realtime.enterLobby();
    return () => realtime.leaveLobby();
  }, [familyId, realtime.enterLobby, realtime.leaveLobby]);

  const challenge = useCallback((toUid: string, timeControl: ChessTimeControl) => realtime.challenge(toUid, timeControl), [realtime.challenge]);
  const cancel = useCallback((inviteId: string) => realtime.cancelInvite(inviteId), [realtime.cancelInvite]);
  const accept = useCallback((inviteId: string): Promise<ChessAck<{ gameId: string; state: ChessGameState }>> => realtime.acceptInvite(inviteId), [realtime.acceptInvite]);
  const reject = useCallback((inviteId: string): Promise<ChessAck> => realtime.rejectInvite(inviteId), [realtime.rejectInvite]);
  const requestTestBotChallenge = useCallback((timeControl: ChessTimeControl, delayMs = 0) => realtime.requestTestBotChallenge(timeControl, delayMs), [realtime.requestTestBotChallenge]);

  return {
    connection: realtime.connection,
    presence: realtime.presence,
    invite: realtime.incomingInvite,
    outgoingInvite: realtime.outgoingInvite as ChessInvite | null,
    activeGameId: realtime.activeGameId,
    challenge,
    cancel,
    accept,
    reject,
    testBotEnabled: realtime.testBotEnabled,
    requestTestBotChallenge,
  };
}
