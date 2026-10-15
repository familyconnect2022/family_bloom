import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

import { ChessBoard } from "../../../components/chess/ChessBoard";
import { ChessGameHeader } from "../../../components/chess/ChessGameHeader";
import { ChessPlayerRail } from "../../../components/chess/ChessPlayerRail";
import { useChessSoundscape } from "../../../components/chess/useChessSoundscape";
import { ScreenContainer } from "../../../components/layout/ScreenContainer";
import { COLORS } from "../../../constants/theme";
import { useAuth } from "../../../context/AuthContext";
import { useChessRealtime } from "../../../context/ChessRealtimeContext";
import { useFamilyMembersRealtime } from "../../../context/FamilyRealtimeContext";
import { prepareChessSurface } from "../../../services/chess/chessSurfaceStore";
import { finishChessChallengeMini, setChessChallengeMiniVisible, startChessChallengeMini } from "../../../services/chess/chessChallengeMiniStore";
import {
  emptyChessCaptureSummary,
  isChessTestBotUid,
  type ChessAck,
  type ChessColor,
  type ChessGameState,
  type ChessInvite,
  type ChessMoveCommandAck,
} from "../../../types/chess";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const CHESS_SCREEN_GUTTER = 5;
const CHESS_CONTENT_GAP = 5;
const CHESS_MATERIAL_HEIGHT = 18;

function pendingBoardState(inviteId: string, familyId: string | null, invite: ChessInvite | null, me: string): ChessGameState {
  const now = new Date().toISOString();
  const initialMs = invite?.timeControl.kind === "clocked" ? invite.timeControl.initialMs : null;
  const whiteUid = invite?.whiteUid || me || "pending-white";
  const blackUid = invite?.blackUid || (whiteUid === me ? "pending-opponent" : me || "pending-black");
  return {
    gameId: `pending-${inviteId}`,
    familyId: familyId || "pending",
    whiteUid,
    blackUid,
    status: "waiting",
    fen: START_FEN,
    turn: "w",
    revision: 0,
    ply: 0,
    whiteRemainingMs: initialMs,
    blackRemainingMs: initialMs,
    timeControl: invite?.timeControl ?? { kind: "unlimited", initialMs: null, incrementMs: 0 },
    result: null,
    finishReason: null,
    lastMove: null,
    checkSquare: null,
    captureSummary: emptyChessCaptureSummary(),
    drawOfferByUid: null,
    serverNowMs: Date.now(),
    createdAt: now,
    startedAt: null,
    endedAt: null,
  };
}

const blockedMove = async (): Promise<ChessAck<ChessMoveCommandAck>> => ({ ok: false, errorCode: "CHESS_INVALID_REQUEST" });
const blockedResync = async () => null;
const blockedPromotion = async () => null;

export default function ChessChallengeRoom() {
  const { inviteId: rawInviteId } = useLocalSearchParams<{ inviteId: string }>();
  const inviteId = typeof rawInviteId === "string" ? rawInviteId.trim() : "";
  const router = useRouter();
  const { activeFamilyId, user, userProfile } = useAuth();
  const members = useFamilyMembersRealtime();
  const realtime = useChessRealtime();
  const { width } = useWindowDimensions();
  const audio = useChessSoundscape(true);
  const whiteTurn = useSharedValue(0);
  const blackTurn = useSharedValue(0);
  const [boardReady, setBoardReady] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [yielding, setYielding] = useState(false);

  const invite = realtime.outgoingInvite?.inviteId === inviteId ? realtime.outgoingInvite : null;
  const terminal = realtime.outgoingChallengeTerminal?.inviteId === inviteId ? realtime.outgoingChallengeTerminal : null;
  const opponentName = useMemo(() => {
    if (terminal) return terminal.opponentName;
    if (!invite) return "người thân";
    if (isChessTestBotUid(invite.toUid)) return "Bloom Bot";
    const member = members?.memberByUid.get(invite.toUid);
    return member?.shortName || member?.displayName || "người thân";
  }, [invite, members?.memberByUid, terminal]);
  const opponentMember = invite && !isChessTestBotUid(invite.toUid) ? members?.memberByUid.get(invite.toUid) : null;
  const me = user?.uid || "";
  const myColor: ChessColor = invite?.blackUid === me ? "b" : "w";
  const opponentColor: ChessColor = myColor === "w" ? "b" : "w";
  const boardState = useMemo(() => pendingBoardState(inviteId || "warming", activeFamilyId, invite, me), [activeFamilyId, invite, inviteId, me]);
  const boardSize = Math.max(8, Math.floor(Math.max(8, width - CHESS_SCREEN_GUTTER * 2) / 8) * 8);
  const remainingMs = Math.max(0, (invite?.expiresAt ?? now) - now);
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const remainingCopy = `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, "0")}`;
  const myName = userProfile?.shortName?.trim() || userProfile?.displayName?.trim() || user?.displayName?.trim() || "Bạn";
  const waitingSubtitle = boardReady && audio.criticalAudioReady ? `chờ phản hồi · ${remainingCopy}` : "đang chuẩn bị ván";

  useEffect(() => { prepareChessSurface("outgoing_challenge"); }, []);

  useEffect(() => {
    if (!invite) return;
    startChessChallengeMini({
      inviteId: invite.inviteId,
      familyId: invite.familyId,
      opponentUid: invite.toUid,
      opponentName,
      expiresAt: invite.expiresAt,
      ...(invite.testCycleStep ? { testCycleStep: invite.testCycleStep } : {}),
    });
  }, [invite, opponentName]);

  useEffect(() => { if (terminal) finishChessChallengeMini(inviteId); }, [inviteId, terminal]);
  useEffect(() => {
    if (!invite) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [invite]);

  const yieldToLobby = useCallback((cancelInvite: boolean) => {
    if (yielding) return;
    setYielding(true);
    const id = invite?.inviteId;
    if (id) finishChessChallengeMini(id);
    router.replace("/chess-lobby" as never);
    if (cancelInvite && id) requestAnimationFrame(() => { void realtime.cancelInvite(id); });
  }, [invite?.inviteId, realtime, router, yielding]);

  useFocusEffect(useCallback(() => {
    if (inviteId) setChessChallengeMiniVisible(inviteId, false);
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { yieldToLobby(!!invite); return true; });
    return () => {
      sub.remove();
      if (inviteId && invite && !terminal && !yielding) setChessChallengeMiniVisible(inviteId, true);
    };
  }, [invite, inviteId, terminal, yieldToLobby, yielding]));

  useEffect(() => {
    if (invite || terminal || realtime.activeGameId) return;
    router.replace("/chess-lobby" as never);
  }, [invite, realtime.activeGameId, router, terminal]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor="#FFF8FB">
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <ChessGameHeader opponentName={opponentName} subtitle={waitingSubtitle} onBack={() => yieldToLobby(!!invite)} />

      <View style={styles.content}>
        <View style={{ width: boardSize }}>
          <ChessPlayerRail
            state={boardState}
            color={opponentColor}
            displayName={opponentName}
            avatarUrl={opponentMember?.avatarUrl}
            avatarFallback={opponentName.slice(0, 1)}
            isBot={!!invite && isChessTestBotUid(invite.toUid)}
            activeSignal={opponentColor === "w" ? whiteTurn : blackTurn}
            runtimeActive={false}
            statusText="chưa sẵn sàng"
          />
        </View>

        <View style={[styles.materialSpacer, { width: boardSize }]} />
        <View style={[styles.boardShell, { width: boardSize, height: boardSize }]}> 
          <ChessBoard
            state={boardState}
            myColor={myColor}
            moveDeltas={[]}
            snapshotEpoch={0}
            onMove={blockedMove}
            onResync={blockedResync}
            onPromotion={blockedPromotion}
            onBoardReady={() => setBoardReady(true)}
            interactionBlocked
            runtimeActive
            hintsEnabled={false}
            motionFxEnabled={false}
            boardSize={boardSize}
          />
        </View>
        <View style={[styles.materialSpacer, { width: boardSize }]} />

        <View style={{ width: boardSize }}>
          <ChessPlayerRail
            state={boardState}
            color={myColor}
            displayName={myName}
            avatarUrl={userProfile?.avatarUrl}
            avatarFallback={myName.slice(0, 1)}
            activeSignal={myColor === "w" ? whiteTurn : blackTurn}
            runtimeActive={false}
          />
        </View>
      </View>

      {terminal ? (
        <View style={styles.overlay} pointerEvents="auto">
          <View style={styles.terminalCard}>
            <View style={styles.terminalIcon}><Ionicons name="leaf-outline" size={24} color={COLORS.primary} /></View>
            <Text style={styles.terminalTitle}>{terminal.opponentName} chưa sẵn sàng chơi lúc này</Text>
            <Text style={styles.terminalText}>{terminal.reason === "expired" ? "Lời mời đã khép lại sau 2 phút." : "Có lẽ mình sẽ gặp nhau ở một ván khác nhé."}</Text>
            <Pressable
              style={styles.primaryButton}
              onPress={() => {
                finishChessChallengeMini(inviteId);
                realtime.acknowledgeOutgoingChallengeTerminal();
                router.replace("/chess-lobby" as never);
              }}
            >
              <Text style={styles.primaryButtonText}>Đồng ý</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", gap: CHESS_CONTENT_GAP, paddingBottom: 8 },
  materialSpacer: { height: CHESS_MATERIAL_HEIGHT },
  boardShell: { overflow: "hidden", backgroundColor: "#FFF" },
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, backgroundColor: "rgba(73,42,54,0.16)", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  terminalCard: { width: "100%", maxWidth: 420, borderRadius: 22, padding: 18, alignItems: "center", backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: COLORS.border },
  terminalIcon: { width: 48, height: 48, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#FFF0F6", marginBottom: 10 },
  terminalTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900", textAlign: "center" },
  terminalText: { marginTop: 6, color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, fontWeight: "700", textAlign: "center" },
  primaryButton: { marginTop: 16, minWidth: 150, minHeight: 44, borderRadius: 15, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", paddingHorizontal: 22 },
  primaryButtonText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
});
