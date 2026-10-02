import { useCallback, useEffect, useRef, useState } from "react";
import { chessSocketService } from "../../services/chess/chessSocketService";
import {
  CHESS_EVENTS,
  type ChessAck,
  type ChessGameState,
  type ChessInvite,
  type ChessPresence,
  type ChessTimeControl,
} from "../../types/chess";

const requestId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

export function useChessLobby(familyId: string | null) {
  const [connection, setConnection] = useState<"idle" | "waking" | "connecting" | "ready" | "error">("idle");
  const [presence, setPresence] = useState<ChessPresence[]>([]);
  const [invite, setInvite] = useState<ChessInvite | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<ChessInvite | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const activeRef = useRef<string | null>(null);
  const joinedOnceRef = useRef(false);
  activeRef.current = activeGameId;

  useEffect(() => {
    if (!familyId) return;
    let live = true;
    setPresence([]);
    setInvite(null);
    setOutgoingInvite(null);
    setActiveGameId(null);

    const stopPresence = chessSocketService.on("presence", (items) => { if (live) setPresence(items); });
    const stopInvite = chessSocketService.on("invite", (next) => { if (live && next.familyId === familyId) setInvite(next); });
    const stopExpired = chessSocketService.on("inviteExpired", ({ inviteId }) => {
      if (!live) return;
      setInvite((current) => current?.inviteId === inviteId ? null : current);
      setOutgoingInvite((current) => current?.inviteId === inviteId ? null : current);
    });
    const stopState = chessSocketService.on("state", (state) => {
      if (live && state.familyId === familyId && state.status !== "finished") {
        setOutgoingInvite(null);
        setActiveGameId(state.gameId);
      }
    });
    const rejoin = async () => {
      if (!joinedOnceRef.current || !live) return;
      await chessSocketService.emitAck(CHESS_EVENTS.lobbyJoin, { familyId });
    };
    const stopConnected = chessSocketService.on("connected", () => { void rejoin(); });

    void (async () => {
      try {
        setConnection("waking");
        const wake = chessSocketService.prewake();
        setConnection("connecting");
        const [, connected] = await Promise.allSettled([wake, chessSocketService.connect()]);
        if (connected.status === "rejected") throw connected.reason;
        if (!live) return;
        const joined = await chessSocketService.emitAck(CHESS_EVENTS.lobbyJoin, { familyId });
        if (!joined.ok) throw new Error(joined.errorCode);
        joinedOnceRef.current = true;
        const active = await chessSocketService.emitAck<{ gameId: string } | null>(CHESS_EVENTS.sessionGetActive, { familyId });
        if (active.ok && active.data?.gameId) setActiveGameId(active.data.gameId);
        setConnection("ready");
      } catch {
        if (live) setConnection("error");
      }
    })();

    return () => {
      live = false;
      joinedOnceRef.current = false;
      stopPresence();
      stopInvite();
      stopExpired();
      stopState();
      stopConnected();
      chessSocketService.emitBestEffort(CHESS_EVENTS.lobbyLeave, { familyId });
      chessSocketService.disconnectIfIdle(activeRef.current);
    };
  }, [familyId]);

  const challenge = useCallback(async (toUid: string, timeControl: ChessTimeControl) => {
    if (!familyId) return { ok: false, errorCode: "CHESS_INVALID_REQUEST" } as ChessAck<ChessInvite>;
    const response = await chessSocketService.emitAck<ChessInvite>(CHESS_EVENTS.inviteCreate, {
      requestId: requestId(), familyId, toUid, timeControl,
    });
    if (response.ok) setOutgoingInvite(response.data);
    return response;
  }, [familyId]);

  const cancel = useCallback(async (inviteId: string) => {
    const response = await chessSocketService.emitAck(CHESS_EVENTS.inviteCancel, { inviteId });
    if (response.ok) setOutgoingInvite(null);
    return response;
  }, []);

  const accept = useCallback(async (inviteId: string) => {
    const response = await chessSocketService.emitAck<{ gameId: string; state: ChessGameState }>(CHESS_EVENTS.inviteAccept, {
      requestId: requestId(), inviteId,
    });
    if (response.ok) {
      setInvite(null);
      setOutgoingInvite(null);
      setActiveGameId(response.data.gameId);
    }
    return response;
  }, []);

  const reject = useCallback(async (inviteId: string) => {
    const response = await chessSocketService.emitAck(CHESS_EVENTS.inviteReject, { inviteId });
    if (response.ok) setInvite(null);
    return response;
  }, []);

  return { connection, presence, invite, outgoingInvite, activeGameId, challenge, cancel, accept, reject };
}
