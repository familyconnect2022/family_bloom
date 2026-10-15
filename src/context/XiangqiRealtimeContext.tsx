import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";

import { xiangqiSocketService, type XiangqiPresence } from "../services/xiangqi/xiangqiSocketService";
import { cacheXiangqiBootstrapState, finishXiangqiSurfaceGame } from "../services/xiangqi/xiangqiSurfaceStore";
import { publishXiangqiTerminalResult } from "../services/games/boardGameTerminalResultStore";
import {
  XIANGQI_EVENTS,
  type XiangqiAck,
  type XiangqiInvite,
  type XiangqiOutgoingChallengeTerminal,
  type XiangqiRealtimeState,
  type XiangqiTimeControl,
} from "../types/xiangqiRealtime";
import { useAuth } from "./AuthContext";
import { useFamilyMembersRealtime } from "./FamilyRealtimeContext";

export type XiangqiConnectionState = "idle" | "connecting" | "ready" | "error";

type XiangqiRealtimeValue = {
  connection: XiangqiConnectionState;
  incomingInvite: XiangqiInvite | null;
  outgoingInvite: XiangqiInvite | null;
  outgoingChallengeTerminal: XiangqiOutgoingChallengeTerminal | null;
  activeGameId: string | null;
  presence: XiangqiPresence[];
  testBotEnabled: boolean;
  enterLobby: () => Promise<XiangqiAck<{ ready: boolean; testBotEnabled?: boolean }>>;
  leaveLobby: () => void;
  challenge: (toUid: string, timeControl: XiangqiTimeControl) => Promise<XiangqiAck<XiangqiInvite>>;
  challengeTestBot: (timeControl: XiangqiTimeControl) => Promise<XiangqiAck<XiangqiInvite>>;
  requestTestBotInvite: (timeControl: XiangqiTimeControl) => Promise<XiangqiAck<XiangqiInvite>>;
  cancelInvite: (inviteId: string) => Promise<XiangqiAck>;
  acceptInvite: (inviteId: string) => Promise<XiangqiAck<{ gameId: string; state: XiangqiRealtimeState }>>;
  rejectInvite: (inviteId: string) => Promise<XiangqiAck>;
  acknowledgeOutgoingChallengeTerminal: () => void;
};

const XiangqiRealtimeContext = createContext<XiangqiRealtimeValue | null>(null);
const requestId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export function useXiangqiRealtime() {
  const value = useContext(XiangqiRealtimeContext);
  if (!value) throw new Error("useXiangqiRealtime phải nằm trong XiangqiRealtimeProvider");
  return value;
}

export function XiangqiRealtimeProvider({ children, bootReady = true }: { children: React.ReactNode; bootReady?: boolean }) {
  const { user, activeFamilyId, profileStatus } = useAuth();
  const members = useFamilyMembersRealtime();
  const [connection, setConnection] = useState<XiangqiConnectionState>("idle");
  const [incomingInvite, setIncomingInvite] = useState<XiangqiInvite | null>(null);
  const [outgoingInvite, setOutgoingInvite] = useState<XiangqiInvite | null>(null);
  const [outgoingChallengeTerminal, setOutgoingChallengeTerminal] = useState<XiangqiOutgoingChallengeTerminal | null>(null);
  const [activeGameId, setActiveGameId] = useState<string | null>(null);
  const [presence, setPresence] = useState<XiangqiPresence[]>([]);
  const [testBotEnabled, setTestBotEnabled] = useState(false);
  const familyIdRef = useRef<string | null>(activeFamilyId);
  const foregroundRef = useRef(AppState.currentState === "active");
  const lobbyWantedRef = useRef(false);
  familyIdRef.current = activeFamilyId;

  const memberName = useCallback((uid: string) => {
    if (uid.startsWith("__bloom_xiangqi_bot__")) return "Bloom Bot";
    const member = members?.memberByUid.get(uid);
    return member?.shortName || member?.displayName || "Người thân";
  }, [members?.memberByUid]);

  const applyState = useCallback((state: XiangqiRealtimeState) => {
    if (state.familyId !== familyIdRef.current) return;
    if (state.status === "finished" || state.status === "cancelled") {
      // Terminal-first: snapshot the immutable result, poison/detach the local
      // Xiangqi surface, then ACK immediately. The result modal is history UI
      // only and can never keep the finished game alive or block a new game.
      publishXiangqiTerminalResult(state);
      finishXiangqiSurfaceGame(state.gameId);
      setActiveGameId(null);
      setOutgoingInvite(null);
      void xiangqiSocketService.emitAck(
        XIANGQI_EVENTS.gameResultAck,
        { familyId: state.familyId, gameId: state.gameId },
      );
      return;
    }
    cacheXiangqiBootstrapState(state);
    setActiveGameId(state.gameId);
    if (state.status === "active") setOutgoingInvite(null);
  }, []);

  const joinForeground = useCallback(async () => {
    const familyId = familyIdRef.current;
    if (!bootReady || !foregroundRef.current || !user || profileStatus !== "ready" || !familyId) return;
    setConnection("connecting");
    try {
      void xiangqiSocketService.prewake().catch(() => undefined);
      await xiangqiSocketService.connect();
      const joined = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(XIANGQI_EVENTS.appJoin, { familyId }, 30_000);
      if (!joined.ok) throw new Error(joined.message ?? joined.errorCode);
      if (typeof joined.data.testBotEnabled === "boolean") setTestBotEnabled(joined.data.testBotEnabled);
      const recovered = await xiangqiSocketService.emitAck<{
        kind: "active" | "finished_unseen" | "busy_other_game" | "pending" | "none";
        gameId?: string;
        gameKind?: "chess" | "xiangqi";
        familyId?: string;
      }>(XIANGQI_EVENTS.sessionRecover, { familyId });
      if (recovered.ok && recovered.data.kind === "active" && recovered.data.gameId) {
        setActiveGameId(recovered.data.gameId);
      } else if (recovered.ok && recovered.data.kind === "finished_unseen" && recovered.data.gameId) {
        await xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameResultAck, { familyId, gameId: recovered.data.gameId });
        setActiveGameId(null);
      } else if (recovered.ok && recovered.data.kind !== "pending") {
        setActiveGameId(null);
      }
      if (lobbyWantedRef.current) {
        const lobby = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(XIANGQI_EVENTS.lobbyJoin, { familyId }, 20_000);
        if (lobby.ok && typeof lobby.data.testBotEnabled === "boolean") setTestBotEnabled(lobby.data.testBotEnabled);
      }
      setConnection("ready");
    } catch {
      setConnection("error");
    }
  }, [bootReady, profileStatus, user]);

  useEffect(() => {
    const offState = xiangqiSocketService.onState(applyState);
    const offInvite = xiangqiSocketService.onInvite((invite) => {
      if (!foregroundRef.current || invite.familyId !== familyIdRef.current) return;
      setIncomingInvite(invite);
    });
    const offPresence = xiangqiSocketService.onPresence(setPresence);
    const offExpired = xiangqiSocketService.onInviteExpired(({ inviteId }) => {
      setIncomingInvite((current) => current?.inviteId === inviteId ? null : current);
      setOutgoingInvite((current) => {
        if (current?.inviteId !== inviteId) return current;
        setOutgoingChallengeTerminal({
          inviteId,
          reason: "expired",
          opponentUid: current.toUid,
          opponentName: memberName(current.toUid),
          at: Date.now(),
        });
        return null;
      });
    });
    const offRejected = xiangqiSocketService.onInviteRejected(({ inviteId, byUid }) => {
      setOutgoingInvite((current) => {
        if (current?.inviteId !== inviteId) return current;
        setOutgoingChallengeTerminal({
          inviteId,
          reason: "rejected",
          opponentUid: byUid || current.toUid,
          opponentName: memberName(byUid || current.toUid),
          at: Date.now(),
        });
        return null;
      });
    });
    const offConnected = xiangqiSocketService.onConnected(() => { if (foregroundRef.current) void joinForeground(); });
    const offDisconnected = xiangqiSocketService.onDisconnected(() => { if (foregroundRef.current) setConnection("connecting"); });
    return () => { offState(); offInvite(); offPresence(); offExpired(); offRejected(); offConnected(); offDisconnected(); };
  }, [applyState, joinForeground, memberName]);

  useEffect(() => {
    setIncomingInvite(null);
    setOutgoingInvite(null);
    setOutgoingChallengeTerminal(null);
    setPresence([]);
    setActiveGameId(null);
    if (!bootReady || !user || profileStatus !== "ready" || !activeFamilyId) {
      setConnection("idle");
      xiangqiSocketService.disconnect();
      return;
    }
    if (foregroundRef.current) void joinForeground();
    return () => { xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.appLeave, { familyId: activeFamilyId }); };
  }, [activeFamilyId, bootReady, joinForeground, profileStatus, user]);

  useEffect(() => {
    const change = AppState.addEventListener("change", (next) => {
      const active = next === "active";
      foregroundRef.current = active;
      const familyId = familyIdRef.current;
      if (active) void joinForeground();
      else {
        setIncomingInvite(null);
        setPresence([]);
        setConnection("idle");
        if (familyId) xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.appLeave, { familyId });
        xiangqiSocketService.disconnect();
      }
    });
    return () => change.remove();
  }, [joinForeground]);

  const enterLobby = useCallback(async () => {
    lobbyWantedRef.current = true;
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "XIANGQI_INVALID_REQUEST" } as XiangqiAck<{ ready: boolean; testBotEnabled?: boolean }>;
    if (!xiangqiSocketService.isConnected()) await joinForeground();
    const response = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(XIANGQI_EVENTS.lobbyJoin, { familyId }, 30_000);
    if (response.ok) {
      setConnection("ready");
      if (typeof response.data.testBotEnabled === "boolean") setTestBotEnabled(response.data.testBotEnabled);
    }
    return response;
  }, [joinForeground]);

  const leaveLobby = useCallback(() => {
    lobbyWantedRef.current = false;
    const familyId = familyIdRef.current;
    if (familyId) xiangqiSocketService.emitBestEffort(XIANGQI_EVENTS.lobbyLeave, { familyId });
  }, []);

  const challenge = useCallback(async (toUid: string, timeControl: XiangqiTimeControl) => {
    const familyId = familyIdRef.current;
    setOutgoingChallengeTerminal(null);
    if (!familyId) return { ok: false, errorCode: "XIANGQI_INVALID_REQUEST" } as XiangqiAck<XiangqiInvite>;
    const response = await xiangqiSocketService.emitAck<XiangqiInvite>(XIANGQI_EVENTS.inviteCreate, { requestId: requestId("xq-invite"), familyId, toUid, timeControl });
    if (response.ok) setOutgoingInvite(response.data);
    return response;
  }, []);

  const challengeTestBot = useCallback(async (timeControl: XiangqiTimeControl) => {
    const familyId = familyIdRef.current;
    setOutgoingChallengeTerminal(null);
    if (!familyId) return { ok: false, errorCode: "XIANGQI_INVALID_REQUEST" } as XiangqiAck<XiangqiInvite>;
    const response = await xiangqiSocketService.emitAck<XiangqiInvite>(XIANGQI_EVENTS.testBotChallenge, { requestId: requestId("xq-test-out"), familyId, timeControl });
    if (response.ok) setOutgoingInvite(response.data);
    return response;
  }, []);

  const requestTestBotInvite = useCallback(async (timeControl: XiangqiTimeControl) => {
    const familyId = familyIdRef.current;
    if (!familyId) return { ok: false, errorCode: "XIANGQI_INVALID_REQUEST" } as XiangqiAck<XiangqiInvite>;
    return xiangqiSocketService.emitAck<XiangqiInvite>(XIANGQI_EVENTS.testBotInvite, { requestId: requestId("xq-test-in"), familyId, timeControl });
  }, []);

  const cancelInvite = useCallback(async (inviteId: string) => {
    const response = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.inviteCancel, { inviteId });
    if (response.ok) setOutgoingInvite((current) => current?.inviteId === inviteId ? null : current);
    return response;
  }, []);

  const acceptInvite = useCallback(async (inviteId: string) => {
    const response = await xiangqiSocketService.emitAck<{ gameId: string; state: XiangqiRealtimeState }>(XIANGQI_EVENTS.inviteAccept, { requestId: requestId("xq-accept"), inviteId });
    if (response.ok) {
      setIncomingInvite(null);
      setOutgoingInvite(null);
      applyState(response.data.state);
    }
    return response;
  }, [applyState]);

  const rejectInvite = useCallback(async (inviteId: string) => {
    const response = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.inviteReject, { inviteId });
    if (response.ok) setIncomingInvite((current) => current?.inviteId === inviteId ? null : current);
    return response;
  }, []);

  const acknowledgeOutgoingChallengeTerminal = useCallback(() => setOutgoingChallengeTerminal(null), []);

  const value = useMemo<XiangqiRealtimeValue>(() => ({
    connection,
    incomingInvite,
    outgoingInvite,
    outgoingChallengeTerminal,
    activeGameId,
    presence,
    testBotEnabled,
    enterLobby,
    leaveLobby,
    challenge,
    challengeTestBot,
    requestTestBotInvite,
    cancelInvite,
    acceptInvite,
    rejectInvite,
    acknowledgeOutgoingChallengeTerminal,
  }), [
    acceptInvite, activeGameId, cancelInvite, challenge, challengeTestBot, connection, enterLobby,
    incomingInvite, leaveLobby, outgoingChallengeTerminal, outgoingInvite, presence, rejectInvite,
    requestTestBotInvite, testBotEnabled,
  ]);

  return <XiangqiRealtimeContext.Provider value={value}>{children}</XiangqiRealtimeContext.Provider>;
}
