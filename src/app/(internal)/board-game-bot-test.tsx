import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import * as Application from "expo-application";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BotInviteCountdown } from "../../components/games/BotInviteCountdown";
import { BloomCard, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { useBloomToast } from "../../components/ui/BloomToast";
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from "../../constants/performanceTest";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { chessSocketService } from "../../services/chess/chessSocketService";
import { xiangqiSocketService } from "../../services/xiangqi/xiangqiSocketService";
import {
  syncChessPresentationFromState,
  syncXiangqiPresentationFromState,
} from "../../services/games/boardGamePresentationBridge";
import { subscribeBoardGamePresentationDiagnostics } from "../../services/games/boardGamePresentationDiagnostics";
import { showNativeChessConnectingPreview } from "../../services/games/nativeChessGameplayController";
import { CHESS_PENDING_PREFIX, XIANGQI_PENDING_PREFIX, dismissPendingChessBoard, dismissPendingXiangqiBoard, getBoardGamePresentationSnapshot, presentPendingChessBoard, presentPendingXiangqiBoard } from "../../services/games/boardGamePresentationStore";
import {
  getBoardGameNativeBinaryIdentity,
  hasBoardGameNativeHostModule,
  runBoardGameNativeBinaryProof,
  runBoardGameNativePlaneProbe,
} from "../../services/games/boardGameNativeOverlay";
import {
  CHESS_EVENTS,
  CHESS_TIME_CONTROLS,
  type ChessGameState,
  type ChessInvite,
  type ChessSessionRecovery,
} from "../../types/chess";
import {
  XIANGQI_EVENTS,
  XIANGQI_TIME_CONTROLS,
  type XiangqiInvite,
  type XiangqiRealtimeState,
} from "../../types/xiangqiRealtime";

/** Clear only the provisional Chess surface. A confirmed game must survive late invite events. */
function dismissUnconfirmedChessPreview(): boolean {
  const current = getBoardGamePresentationSnapshot();
  if (current.activeKind !== "chess" || !current.activeGameId?.startsWith(CHESS_PENDING_PREFIX)) return false;
  dismissPendingChessBoard(current.activeGameId);
  return true;
}
function dismissUnconfirmedXiangqiPreview(): boolean {
  const current = getBoardGamePresentationSnapshot();
  if (current.activeKind !== "xiangqi" || !current.activeGameId?.startsWith(XIANGQI_PENDING_PREFIX)) return false;
  dismissPendingXiangqiBoard(current.activeGameId);
  return true;
}

type LogRow = { id: string; at: string; scope: "Chess" | "Xiangqi" | "Surface"; text: string };
type XiangqiRecovery =
  | { kind: "active"; gameId: string }
  | { kind: "finished_unseen"; gameId: string }
  | { kind: "busy_other_game"; gameKind: "chess"; gameId: string; familyId: string }
  | { kind: "pending"; gameKind: "chess" | "xiangqi"; familyId: string; inviteId: string; role?: string; phase?: string; expiresAt: number }
  | { kind: "none" };

type RecoveryResolution = "active" | "pending_same" | "busy_other" | "finished_unseen" | "none";

const EXPECTED_ANDROID_VERSION_CODE = "143039";
const EXPECTED_NATIVE_IDENTITY = "P2.37R2C-H25-native-1";

const BOT_ACCEPT_RECONCILE_MS = 1_650;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const chessTc = CHESS_TIME_CONTROLS.find((item) => item.id === "10+0")!.value;
const xiangqiTc = XIANGQI_TIME_CONTROLS.find((item) => item.id === "10+0")!.value;
const requestId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

function ActionButton({ label, icon, onPress, disabled = false }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.action, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Ionicons name={icon} size={17} color={COLORS.primary} />
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

export default function BoardGameBotTestScreen() {
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const allowed = isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user);
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [chessInvite, setChessInvite] = useState<ChessInvite | null>(null);
  const [chessInviteEnded, setChessInviteEnded] = useState<"rejected" | "expired" | null>(null);
  const [xiangqiInvite, setXiangqiInvite] = useState<XiangqiInvite | null>(null);
  const [xiangqiInviteEnded, setXiangqiInviteEnded] = useState<"rejected" | "expired" | null>(null);
  // Event listeners are attached while this route is focused; keep the latest IDs
  // so a late server event can never close a different invite.
  const chessInviteRef = useRef(chessInvite);
  const xiangqiInviteRef = useRef(xiangqiInvite);
  chessInviteRef.current = chessInvite;
  xiangqiInviteRef.current = xiangqiInvite;
  const [chessState, setChessState] = useState<ChessGameState | null>(null);
  const [xiangqiState, setXiangqiState] = useState<XiangqiRealtimeState | null>(null);
  const [chessConnected, setChessConnected] = useState(chessSocketService.isConnected());
  const [xiangqiConnected, setXiangqiConnected] = useState(xiangqiSocketService.isConnected());
  const [nativeIdentity, setNativeIdentity] = useState("đang kiểm tra…");
  const actualVersionCode = Application.nativeBuildVersion ?? "?";
  const binaryVersionMatches = Platform.OS !== "android" || actualVersionCode === EXPECTED_ANDROID_VERSION_CODE;
  const nativeIdentityMatches = Platform.OS !== "android" || nativeIdentity === EXPECTED_NATIVE_IDENTITY;
  const nativeModulePresent = hasBoardGameNativeHostModule();
  const nativeBinaryReady = Platform.OS === "android" && binaryVersionMatches && nativeModulePresent && nativeIdentityMatches;

  useEffect(() => {
    if (!allowed) router.replace("/settings" as never);
  }, [allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    let alive = true;
    void getBoardGameNativeBinaryIdentity().then((identity) => {
      if (!alive) return;
      setNativeIdentity(identity.present ? identity.identity : String(identity.reason));
    });
    return () => { alive = false; };
  }, [allowed]);

  const addLog = useCallback((scope: "Chess" | "Xiangqi" | "Surface", text: string) => {
    setLogs((rows) => [{ id: requestId("log"), at: new Date().toLocaleTimeString("vi-VN"), scope, text }, ...rows].slice(0, 80));
  }, []);

  // Diagnostic logging belongs to this *focused* developer screen only.
  // When Mini floats over Home/Moments/Phả hệ, never keep 80 log rows or
  // React state updates alive in the hidden test route.
  useFocusEffect(useCallback(() => {
    if (!allowed) return undefined;
    return subscribeBoardGamePresentationDiagnostics((event) => {
      const suffix = event.data && (event.data.width || event.data.height || event.data.showing !== undefined)
        ? ` · ${JSON.stringify(event.data)}`
        : "";
      addLog("Surface", `#${event.id} ${event.source.toUpperCase()}/${event.stage} · ${event.detail}${suffix}`);
    });
  }, [addLog, allowed]));

  useFocusEffect(useCallback(() => {
    if (!allowed) return undefined;
    const off = [
      chessSocketService.on("connected", () => { setChessConnected(true); addLog("Chess", "socket connected"); }),
      chessSocketService.on("disconnected", () => { setChessConnected(false); addLog("Chess", "socket disconnected"); }),
      chessSocketService.on("state", (state) => { setChessState(state); addLog("Chess", `state · ${state.gameId} · ${state.status} · rev ${state.revision}`); }),
      chessSocketService.on("invite", (invite) => { setChessInvite(invite); addLog("Chess", `incoming invite · ${invite.inviteId}`); }),
      chessSocketService.on("inviteRejected", (payload) => {
        addLog("Chess", `invite rejected · ${payload.inviteId} · cycle ${payload.testCycleStep ?? "-"}`);
        setChessInvite(previous => previous?.inviteId === payload.inviteId ? null : previous);
        if (dismissUnconfirmedChessPreview()) setChessInviteEnded("rejected");
      }),
      chessSocketService.on("inviteExpired", (payload) => {
        addLog("Chess", `invite expired · ${payload.inviteId}`);
        if (chessInviteRef.current?.inviteId === payload.inviteId) {
          setChessInvite(null);
          setChessInviteEnded("expired");
        }
        if (dismissUnconfirmedChessPreview()) setChessInviteEnded("expired");
      }),
      xiangqiSocketService.on("connected", () => { setXiangqiConnected(true); addLog("Xiangqi", "socket connected"); }),
      xiangqiSocketService.on("disconnected", () => { setXiangqiConnected(false); addLog("Xiangqi", "socket disconnected"); }),
      xiangqiSocketService.on("state", (state) => { setXiangqiState(state); addLog("Xiangqi", `state · ${state.gameId} · ${state.status} · rev ${state.revision}`); }),
      xiangqiSocketService.on("invite", (invite) => { setXiangqiInvite(invite); addLog("Xiangqi", `incoming invite · ${invite.inviteId}`); }),
      xiangqiSocketService.on("inviteRejected", (payload) => {
        addLog("Xiangqi", `invite rejected · ${payload.inviteId} · cycle ${payload.testCycleStep ?? "-"}`);
        setXiangqiInvite(previous => previous?.inviteId === payload.inviteId ? null : previous);
        if (dismissUnconfirmedXiangqiPreview()) setXiangqiInviteEnded("rejected");
      }),
      xiangqiSocketService.on("inviteExpired", (payload) => {
        addLog("Xiangqi", `invite expired · ${payload.inviteId}`);
        if (xiangqiInviteRef.current?.inviteId === payload.inviteId) {
          setXiangqiInvite(null);
          setXiangqiInviteEnded("expired");
        }
        if (dismissUnconfirmedXiangqiPreview()) setXiangqiInviteEnded("expired");
      }),
    ];
    return () => off.forEach((fn) => fn());
  }, [addLog, allowed, showToast]));

  const requireFamily = () => {
    if (activeFamilyId) return activeFamilyId;
    showToast({ title: "Chưa có nhà đang mở", message: "Chọn một Nhà Mình trước khi chạy Bloom Bot test.", type: "warning", duration: 3200 });
    return null;
  };

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try { await task(); }
    catch (error) {
      showToast({ title: "Test chưa chạy được", message: error instanceof Error ? error.message : String(error), type: "warning", duration: 4200 });
    } finally { setBusy(false); }
  };

  const readyChess = async (familyId: string) => {
    await chessSocketService.prewake().catch(() => undefined);
    const app = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.appJoin, { familyId }, 30_000);
    if (!app.ok) throw new Error(`${app.errorCode}${app.message ? ` · ${app.message}` : ""}`);
    const lobby = await chessSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(CHESS_EVENTS.lobbyJoin, { familyId }, 30_000);
    if (!lobby.ok) throw new Error(`${lobby.errorCode}${lobby.message ? ` · ${lobby.message}` : ""}`);
    addLog("Chess", `ready · bot=${String(lobby.data.testBotEnabled ?? app.data.testBotEnabled ?? "unknown")}`);
  };

  const readyXiangqi = async (familyId: string) => {
    await xiangqiSocketService.prewake().catch(() => undefined);
    const app = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(XIANGQI_EVENTS.appJoin, { familyId }, 30_000);
    if (!app.ok) throw new Error(`${app.errorCode}${app.message ? ` · ${app.message}` : ""}`);
    const lobby = await xiangqiSocketService.emitAck<{ ready: boolean; testBotEnabled?: boolean }>(XIANGQI_EVENTS.lobbyJoin, { familyId }, 30_000);
    if (!lobby.ok) throw new Error(`${lobby.errorCode}${lobby.message ? ` · ${lobby.message}` : ""}`);
    addLog("Xiangqi", `ready · bot=${String(lobby.data.testBotEnabled ?? app.data.testBotEnabled ?? "unknown")}`);
  };

  const recoverChessPresentation = async (familyId: string, source: string): Promise<RecoveryResolution> => {
    const response = await chessSocketService.emitAck<ChessSessionRecovery>(CHESS_EVENTS.sessionRecover, { familyId }, 20_000);
    if (!response.ok) throw new Error(response.errorCode);
    addLog("Chess", `recover[${source}] · ${response.data.kind}`);

    if (response.data.kind === "active") {
      const game = await chessSocketService.emitAck<ChessGameState>(CHESS_EVENTS.gameJoin, { familyId, gameId: response.data.gameId }, 20_000);
      if (!game.ok) throw new Error(game.errorCode);
      setChessState(game.data);
      setChessInvite(null);
      syncChessPresentationFromState(game.data);
      addLog("Chess", `recover[${source}] · game ${game.data.gameId} · Surface FULL`);
      return "active";
    }

    if (response.data.kind === "pending") {
      if (response.data.gameKind === "chess") {
        addLog("Chess", `recover[${source}] · pending Chess ${response.data.inviteId} · chờ authoritative state`);
        return "pending_same";
      }
      addLog("Chess", `recover[${source}] · đang có pending Xiangqi`);
      return "busy_other";
    }

    if (response.data.kind === "busy_other_game") {
      addLog("Chess", `recover[${source}] · đang có Xiangqi ${response.data.gameId}`);
      return "busy_other";
    }

    if (response.data.kind === "finished_unseen") {
      addLog("Chess", `recover[${source}] · finished unseen ${response.data.gameId}`);
      return "finished_unseen";
    }

    return "none";
  };

  const recoverXiangqiPresentation = async (familyId: string, source: string): Promise<RecoveryResolution> => {
    const response = await xiangqiSocketService.emitAck<XiangqiRecovery>(XIANGQI_EVENTS.sessionRecover, { familyId }, 20_000);
    if (!response.ok) throw new Error(response.errorCode);
    addLog("Xiangqi", `recover[${source}] · ${response.data.kind}`);

    if (response.data.kind === "active") {
      const game = await xiangqiSocketService.emitAck<XiangqiRealtimeState>(XIANGQI_EVENTS.gameJoin, { familyId, gameId: response.data.gameId }, 20_000);
      if (!game.ok) throw new Error(game.errorCode);
      setXiangqiState(game.data);
      setXiangqiInvite(null);
      syncXiangqiPresentationFromState(game.data);
      addLog("Xiangqi", `recover[${source}] · game ${game.data.gameId} · Surface FULL`);
      return "active";
    }

    if (response.data.kind === "pending") {
      if (response.data.gameKind === "xiangqi") {
        addLog("Xiangqi", `recover[${source}] · pending Xiangqi ${response.data.inviteId} · chờ authoritative state`);
        return "pending_same";
      }
      addLog("Xiangqi", `recover[${source}] · đang có pending Chess`);
      return "busy_other";
    }

    if (response.data.kind === "busy_other_game") {
      addLog("Xiangqi", `recover[${source}] · đang có Chess ${response.data.gameId}`);
      return "busy_other";
    }

    if (response.data.kind === "finished_unseen") {
      addLog("Xiangqi", `recover[${source}] · finished unseen ${response.data.gameId}`);
      return "finished_unseen";
    }

    return "none";
  };

  const assertChessMayCreate = (resolution: RecoveryResolution) => {
    if (resolution === "busy_other") throw new Error("Bạn đang có một phiên Cờ tướng. Hãy kết thúc hoặc hủy phiên đó trước khi mở Cờ vua.");
    return resolution === "none" || resolution === "finished_unseen";
  };

  const assertXiangqiMayCreate = (resolution: RecoveryResolution) => {
    if (resolution === "busy_other") throw new Error("Bạn đang có một phiên Cờ vua. Hãy kết thúc hoặc hủy phiên đó trước khi mở Cờ tướng.");
    return resolution === "none" || resolution === "finished_unseen";
  };

  // Lightweight entry reconciliation only reuses an already-connected transport.
  // It never wakes Render just because this internal screen was opened. Normal
  // actions still run readyChess/readyXiangqi and perform their own preflight.
  useFocusEffect(useCallback(() => {
    if (!allowed || !activeFamilyId) return undefined;
    let cancelled = false;
    void (async () => {
      try {
        if (chessSocketService.isConnected()) {
          const result = await recoverChessPresentation(activeFamilyId, "screen-enter");
          if (cancelled || result === "active" || result === "pending_same") return;
        }
        if (!cancelled && xiangqiSocketService.isConnected()) {
          await recoverXiangqiPresentation(activeFamilyId, "screen-enter");
        }
      } catch (error) {
        if (!cancelled) addLog("Chess", `screen-enter recovery skipped · ${error instanceof Error ? error.message : String(error)}`);
      }
    })();
    return () => { cancelled = true; };
    // recover helpers intentionally stay local to the internal test screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFamilyId, allowed, addLog]));

  const chessBotChallenges = () => {
    if (busy) return;
    const familyId = requireFamily();
    if (!familyId) return;
    const pendingId = `${CHESS_PENDING_PREFIX}${requestId("bloom-bot")}`;
    // Synchronous UI response; never wait for Render, Socket or a room ACK.
    if (!presentPendingChessBoard(pendingId)) {
      showToast({ title: "Đã có bàn cờ đang mở", message: "Hãy quay lại ván đang chơi hoặc chờ lời mời hiện tại kết thúc.", type: "warning" });
      return;
    }
    void showNativeChessConnectingPreview(pendingId);
    void run(async () => {
      try {
        await readyChess(familyId);
        const before = await recoverChessPresentation(familyId, "preflight");
        if (!assertChessMayCreate(before)) {
          // Recovered ACTIVE will replace the provisional gameId automatically.
          // A different still-pending invitation must not leave a ghost board.
          if (before === "pending_same") {
            dismissPendingChessBoard(pendingId);
            showToast({ title: "Đang có lời mời khác", message: "Hãy xử lý lời mời đang chờ trước khi mời Bloom Bot lần nữa.", type: "warning" });
          }
          return;
        }

        const response = await chessSocketService.emitAck<ChessInvite>(CHESS_EVENTS.testBotChallenge, {
          requestId: requestId("chess-bot-out"), familyId, timeControl: chessTc,
        });
        if (!response.ok) {
          if (response.errorCode === "CHESS_ALREADY_IN_GAME") {
            const recovered = await recoverChessPresentation(familyId, "already-in-game");
            if (!assertChessMayCreate(recovered)) {
              if (recovered === "pending_same") dismissPendingChessBoard(pendingId);
              return;
            }
          }
          throw new Error(response.errorCode);
        }
        setChessInvite(response.data);
        addLog("Chess", `challenge bot sent · ${response.data.inviteId}`);

        // The gameState event is the fast path; this fallback reconciles the
        // case where the server made a room but the client missed that event.
        await wait(BOT_ACCEPT_RECONCILE_MS);
        await recoverChessPresentation(familyId, "post-bot-accept");
      } catch (error) {
        dismissPendingChessBoard(pendingId); // cannot close a confirmed game
        throw error;
      }
    });
  };

  const chessBotInvites = () => void run(async () => {
    const familyId = requireFamily(); if (!familyId) return;
    await readyChess(familyId);
    const response = await chessSocketService.emitAck<ChessInvite>(CHESS_EVENTS.testBotInvite, { requestId: requestId("chess-bot-in"), familyId, timeControl: chessTc, delayMs: 0 });
    if (!response.ok) {
      if (response.errorCode === "CHESS_ALREADY_IN_GAME") {
        const recovered = await recoverChessPresentation(familyId, "already-in-game");
        if (!assertChessMayCreate(recovered)) return;
      }
      throw new Error(response.errorCode);
    }
    setChessInvite(response.data);
    addLog("Chess", `bot invite created · ${response.data.inviteId}`);
  });

  const expireChessBotInvite = (inviteId: string) => {
    if (chessInviteRef.current?.inviteId !== inviteId) return;
    chessInviteRef.current = null;
    setChessInvite(null);
    setChessInviteEnded("expired");
    addLog("Chess", `bot invite deadline reached · ${inviteId}`);
  };

  const expireXiangqiBotInvite = (inviteId: string) => {
    if (xiangqiInviteRef.current?.inviteId !== inviteId) return;
    xiangqiInviteRef.current = null;
    setXiangqiInvite(null);
    setXiangqiInviteEnded("expired");
    addLog("Xiangqi", `bot invite deadline reached · ${inviteId}`);
  };

  const chessAccept = () => void run(async () => {
    if (!chessInvite) return;
    if (chessInvite.expiresAt <= Date.now()) { expireChessBotInvite(chessInvite.inviteId); return; }
    const response = await chessSocketService.emitAck<{ gameId: string; state: ChessGameState }>(CHESS_EVENTS.inviteAccept, { requestId: requestId("chess-accept"), inviteId: chessInvite.inviteId });
    if (!response.ok) throw new Error(response.errorCode);
    setChessState(response.data.state); setChessInvite(null);
    syncChessPresentationFromState(response.data.state);
    addLog("Chess", `accepted · game ${response.data.gameId} · surface synced`);
  });

  const chessReject = () => void run(async () => {
    const invitation = chessInvite;
    if (!invitation) return;
    if (invitation.expiresAt <= Date.now()) { expireChessBotInvite(invitation.inviteId); return; }
    const response = await chessSocketService.emitAck(CHESS_EVENTS.inviteReject, {
      requestId: requestId("chess-invite-reject"), inviteId: invitation.inviteId,
    });
    if (!response.ok) throw new Error(response.errorCode);
    setChessInvite(null);
    addLog("Chess", `sent invite:reject ${invitation.inviteId} to server`);
  });

  const chessRecover = () => void run(async () => {
    const familyId = requireFamily(); if (!familyId) return;
    await readyChess(familyId);
    await recoverChessPresentation(familyId, "manual");
  });

  const chessResign = () => void run(async () => {
    if (!chessState?.gameId) return;
    const response = await chessSocketService.emitAck(CHESS_EVENTS.gameResign, { requestId: requestId("chess-resign"), gameId: chessState.gameId });
    if (!response.ok) throw new Error(response.errorCode);
    addLog("Chess", `resign sent · ${chessState.gameId}`);
  });

  const xiangqiBotChallenges = () => {
    // H22: Full comes up at the tap, not after Render prewake, Socket or bot ACK.
    if (busy) return;
    const familyId = requireFamily(); if (!familyId) return;
    const pendingId = `${XIANGQI_PENDING_PREFIX}${requestId("invite-bot")}`;
    if (!presentPendingXiangqiBoard(pendingId)) return;
    void run(async () => {
      try {
        await readyXiangqi(familyId);
        const before = await recoverXiangqiPresentation(familyId, "preflight");
        if (!assertXiangqiMayCreate(before)) { dismissPendingXiangqiBoard(pendingId); return; }
        const response = await xiangqiSocketService.emitAck<XiangqiInvite>(XIANGQI_EVENTS.testBotChallenge,
          {requestId:requestId("xq-bot-out"),familyId,timeControl:xiangqiTc});
        if (!response.ok) {
          if (response.errorCode === "XIANGQI_ALREADY_IN_GAME") {
            const recovered = await recoverXiangqiPresentation(familyId, "already-in-game");
            if (!assertXiangqiMayCreate(recovered)) { dismissPendingXiangqiBoard(pendingId); return; }
          }
          throw new Error(response.errorCode);
        }
        setXiangqiInvite(response.data);
        addLog("Xiangqi", `challenge bot sent · ${response.data.inviteId}`);
        await wait(BOT_ACCEPT_RECONCILE_MS);
        await recoverXiangqiPresentation(familyId, "post-bot-accept");
      } catch (error) { dismissPendingXiangqiBoard(pendingId); throw error; }
    });
  };

  const xiangqiBotInvites = () => void run(async () => {
    const familyId = requireFamily(); if (!familyId) return;
    await readyXiangqi(familyId);
    const response = await xiangqiSocketService.emitAck<XiangqiInvite>(XIANGQI_EVENTS.testBotInvite, { requestId: requestId("xq-bot-in"), familyId, timeControl: xiangqiTc });
    if (!response.ok) {
      if (response.errorCode === "XIANGQI_ALREADY_IN_GAME") {
        const recovered = await recoverXiangqiPresentation(familyId, "already-in-game");
        if (!assertXiangqiMayCreate(recovered)) return;
      }
      throw new Error(response.errorCode);
    }
    setXiangqiInvite(response.data);
    addLog("Xiangqi", `bot invite created · ${response.data.inviteId}`);
  });

  const xiangqiAccept = () => void run(async () => {
    if (!xiangqiInvite) return;
    if (xiangqiInvite.expiresAt <= Date.now()) { expireXiangqiBotInvite(xiangqiInvite.inviteId); return; }
    const response = await xiangqiSocketService.emitAck<{ gameId: string; state: XiangqiRealtimeState }>(XIANGQI_EVENTS.inviteAccept, { requestId: requestId("xq-accept"), inviteId: xiangqiInvite.inviteId });
    if (!response.ok) throw new Error(response.errorCode);
    setXiangqiState(response.data.state); setXiangqiInvite(null);
    syncXiangqiPresentationFromState(response.data.state);
    addLog("Xiangqi", `accepted · game ${response.data.gameId} · surface synced`);
  });

  const xiangqiReject = () => void run(async () => {
    const invitation = xiangqiInvite;
    if (!invitation) return;
    if (invitation.expiresAt <= Date.now()) { expireXiangqiBotInvite(invitation.inviteId); return; }
    const response = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.inviteReject, {
      requestId: requestId("xq-invite-reject"), inviteId: invitation.inviteId,
    });
    if (!response.ok) throw new Error(response.errorCode);
    setXiangqiInvite(null);
    addLog("Xiangqi", `sent invite:reject ${invitation.inviteId} to server`);
  });

  const xiangqiRecover = () => void run(async () => {
    const familyId = requireFamily(); if (!familyId) return;
    await readyXiangqi(familyId);
    await recoverXiangqiPresentation(familyId, "manual");
  });

  const xiangqiResign = () => void run(async () => {
    if (!xiangqiState?.gameId) return;
    const response = await xiangqiSocketService.emitAck(XIANGQI_EVENTS.gameResign, { requestId: requestId("xq-resign"), gameId: xiangqiState.gameId });
    if (!response.ok) throw new Error(response.errorCode);
    addLog("Xiangqi", `resign sent · ${xiangqiState.gameId}`);
  });

  const summary = useMemo(() => ({
    chess: chessState ? `${chessState.status} · rev ${chessState.revision} · ${chessState.turn}` : "chưa có state",
    xiangqi: xiangqiState ? `${xiangqiState.status} · rev ${xiangqiState.revision} · ${xiangqiState.board.turn}` : "chưa có state",
  }), [chessState, xiangqiState]);

  if (!allowed) return null;

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={COLORS.background}>
      <StatusBar translucent backgroundColor="transparent" style="dark" />
      <BloomHeroHeader eyebrow="INTERNAL · GAME FOUNDATION" title="Bloom Bot · protocol test" subtitle="Chỉ kiểm tra server, realtime, lời mời và recovery. Không dùng lại board/route/lifecycle cũ." variant="game" onBack={() => router.back()} compact roundedBottom />
      <Modal transparent visible={!!chessInvite && chessInvite.testBotDirection === "bot_to_user"} animationType="fade" onRequestClose={() => undefined}>
        <View style={styles.bloomShade}>
          <View style={[styles.bloomInviteCard, styles.royalInviteCard]}>
            <View pointerEvents="none" style={styles.royalKingSlot}>
              <Image source={require("../../../assets/images/chess/pieces-png-default/wk.png")} resizeMode="contain" style={styles.royalKingHero} />
            </View>
            <Text style={styles.bloomEyebrow}>✦ BLOOM SUPER HERO · CỜ VUA ✦</Text>
            <Text style={styles.bloomInviteTitle}>Bloom Bot mời bạn!</Text>
            <Text style={styles.bloomInviteBody}>Một ván cờ thú vị đang đợi bạn. Mình cùng thử sức và tạo nên những khoảnh khắc thật vui nhé! 🌸</Text>
            {chessInvite?.testBotDirection === "bot_to_user" ? (
              <BotInviteCountdown key={chessInvite.inviteId} inviteId={chessInvite.inviteId} expiresAt={chessInvite.expiresAt} game="chess" onExpired={expireChessBotInvite} />
            ) : null}
            <Pressable disabled={busy || !chessInvite || chessInvite.expiresAt <= Date.now()} style={[styles.bloomInvitePrimary, busy && styles.disabled]} onPress={chessAccept}>
              <Text style={styles.bloomInvitePrimaryText}>✨ Đồng ý tham gia</Text>
            </Pressable>
            <Pressable disabled={busy} style={styles.bloomInviteSecondary} onPress={chessReject}>
              <Text style={styles.bloomInviteSecondaryText}>Để dịp khác nhé</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={!!xiangqiInvite && xiangqiInvite.testBotDirection === "bot_to_user"} animationType="fade" onRequestClose={() => undefined}>
        <View style={styles.bloomShade}>
          <View style={[styles.bloomInviteCard, styles.xiangqiInviteCard, styles.royalInviteCard]}>
            <View pointerEvents="none" style={styles.royalKingSlot}>
              <Image source={require("../../../assets/xiangqi/red_general_modal.png")} resizeMode="contain" style={styles.royalKingHero} />
            </View>
            <Text style={[styles.bloomEyebrow, styles.xiangqiEyebrow]}>✦ BLOOM SUPER HERO · CỜ TƯỚNG ✦</Text>
            <Text style={styles.bloomInviteTitle}>Bloom Bot mời bạn!</Text>
            <Text style={styles.bloomInviteBody}>Bàn cờ tướng đã sẵn sàng chờ bạn. Cùng Bloom Bot trải nghiệm một ván thật vui nhé! 🌸</Text>
            {xiangqiInvite?.testBotDirection === "bot_to_user" ? (
              <BotInviteCountdown key={xiangqiInvite.inviteId} inviteId={xiangqiInvite.inviteId} expiresAt={xiangqiInvite.expiresAt} game="xiangqi" onExpired={expireXiangqiBotInvite} />
            ) : null}
            <Pressable disabled={busy || !xiangqiInvite || xiangqiInvite.expiresAt <= Date.now()} style={[styles.bloomInvitePrimary, styles.xiangqiInvitePrimary, busy && styles.disabled]} onPress={xiangqiAccept}>
              <Text style={styles.bloomInvitePrimaryText}>✨ Đồng ý tham gia</Text>
            </Pressable>
            <Pressable disabled={busy} style={styles.bloomInviteSecondary} onPress={xiangqiReject}>
              <Text style={styles.bloomInviteSecondaryText}>Để dịp khác nhé</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={!!xiangqiInviteEnded} animationType="fade" onRequestClose={() => setXiangqiInviteEnded(null)}>
        <View style={styles.bloomShade}>
          <View style={[styles.bloomInviteCard, styles.xiangqiInviteCard, styles.royalInviteCard]}>
            <View pointerEvents="none" style={styles.royalKingSlot}>
              <Image source={require("../../../assets/xiangqi/red_general_modal.png")} resizeMode="contain" style={styles.royalKingHero} />
            </View>
            <Text style={[styles.bloomEyebrow, styles.xiangqiEyebrow]}>✦ BLOOM ARENA · CỜ TƯỚNG ✦</Text>
            <Text style={styles.bloomInviteTitle}>{xiangqiInviteEnded === "rejected" ? "Hẹn một ván khác nhé!" : "Mình hẹn nhau lần sau"}</Text>
            <Text style={styles.bloomInviteBody}>{xiangqiInviteEnded === "rejected"
              ? "Đối thủ chưa thể tham gia lúc này. Mình sẽ cùng chơi khi có dịp khác nhé!"
              : "Lời mời Cờ tướng đã hết 60 giây. Bạn có thể tạo lời mời mới từ sảnh game."}</Text>
            <Pressable style={[styles.bloomInvitePrimary, styles.xiangqiInvitePrimary]} onPress={() => setXiangqiInviteEnded(null)}>
              <Text style={styles.bloomInvitePrimaryText}>Đồng ý · Về sảnh game</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <Modal transparent visible={!!chessInviteEnded} animationType="fade" onRequestClose={() => setChessInviteEnded(null)}>
        <View style={styles.bloomShade}>
          <View style={[styles.bloomInviteCard, styles.royalInviteCard]}>
            <View pointerEvents="none" style={styles.royalKingSlot}>
              <Image source={require("../../../assets/images/chess/pieces-png-default/wk.png")} resizeMode="contain" style={styles.royalKingHero} />
            </View>
            <Text style={styles.bloomEyebrow}>✦ BLOOM ARENA · CỜ VUA ✦</Text>
            <Text style={styles.bloomInviteTitle}>{chessInviteEnded === "rejected" ? "Hẹn một ván khác nhé!" : "Mình hẹn nhau lần sau"}</Text>
            <Text style={styles.bloomInviteBody}>{chessInviteEnded === "rejected"
              ? "Lúc này đối thủ chưa thể tham gia. Không sao cả, một ván cờ thật vui vẫn đang chờ ở phía trước."
              : "Lời mời đã hết thời gian chờ. Khi mọi người sẵn sàng, chúng mình lại cùng chơi nhé."}</Text>
            <Pressable style={styles.bloomInvitePrimary} onPress={() => setChessInviteEnded(null)}>
              <Text style={styles.bloomInvitePrimaryText}>Đồng ý · Về sảnh game</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <BloomSectionHeader title="Cờ vua" subtitle={`Socket ${chessConnected ? "đã nối" : "chưa nối"} · 10+0`} />
          <BloomCard style={styles.card}>
            <Text style={styles.state}>{summary.chess}</Text>
            <View style={styles.actions}>
              <ActionButton disabled={busy} icon="arrow-forward-circle-outline" label="Bạn mời Bloom Bot" onPress={chessBotChallenges} />
              <ActionButton disabled={busy} icon="mail-unread-outline" label="Bloom Bot mời bạn" onPress={chessBotInvites} />
              {chessInvite?.testBotDirection === "bot_to_user" ? <ActionButton disabled={busy} icon="checkmark-circle-outline" label="Nhận lời mời bot" onPress={chessAccept} /> : null}
              <ActionButton disabled={busy} icon="refresh-outline" label="Recover ván Chess" onPress={chessRecover} />
              <ActionButton disabled={busy || !chessState?.gameId} icon="flag-outline" label="Kết thúc ván test Chess" onPress={chessResign} />
            </View>
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Cờ tướng" subtitle={`Socket ${xiangqiConnected ? "đã nối" : "chưa nối"} · 10+0`} />
          <BloomCard style={styles.card}>
            <Text style={styles.state}>{summary.xiangqi}</Text>
            <View style={styles.actions}>
              <ActionButton disabled={busy} icon="arrow-forward-circle-outline" label="Bạn mời Bloom Bot" onPress={xiangqiBotChallenges} />
              <ActionButton disabled={busy} icon="mail-unread-outline" label="Bloom Bot mời bạn" onPress={xiangqiBotInvites} />
              {xiangqiInvite?.testBotDirection === "bot_to_user" ? <ActionButton disabled={busy} icon="checkmark-circle-outline" label="Nhận lời mời bot" onPress={xiangqiAccept} /> : null}
              <ActionButton disabled={busy} icon="refresh-outline" label="Recover ván Cờ tướng" onPress={xiangqiRecover} />
              <ActionButton disabled={busy || !xiangqiState?.gameId} icon="flag-outline" label="Kết thúc ván test Cờ tướng" onPress={xiangqiResign} />
            </View>
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Native Surface P2.37R2C-H3" subtitle="Chứng minh binary native trước, rồi mới test Surface; hoàn toàn không qua server/session" />
          <BloomCard style={styles.card}>
            <Text style={styles.state}>JS phase: P2.37R2C-H22R9 · Chess PNG replacement / Xiangqi violet circular last move / centered King · EXPECTED binary: 1.3.29 / 143039 / P2.37R2C-H25-native-1</Text>
            <Text style={styles.state}>ACTUAL versionCode: {actualVersionCode} · FamilyBloomOverlay: {nativeModulePresent ? "YES" : "NO"} · native identity: {nativeIdentity}</Text>
            <Text style={styles.state}>Binary gate: {nativeBinaryReady ? "PASS" : "FAIL — KHÔNG test Surface trước khi cài đúng APK H6"}</Text>
            <Text style={styles.state}>Bước 1 phải hiện ô NATIVE HOST OK và log NATIVE_BINARY_PROOF_VISIBLE. Chỉ khi bước 1 PASS mới test Surface Chess/Cờ tướng. Sau đó log Surface phải có NATIVE_HOST_ATTACHED, NATIVE_HOST_PROMOTED và NATIVE_HOST_FULL_VISIBLE.</Text>
            <View style={styles.actions}>
              <ActionButton
                disabled={busy}
                icon="shield-checkmark-outline"
                label="1. Kiểm tra Native Host R2C-H2"
                onPress={() => void run(async () => {
                  if (!binaryVersionMatches) throw new Error(`Sai Android binary: đang chạy versionCode ${actualVersionCode}, cần ${EXPECTED_ANDROID_VERSION_CODE}. Hãy cài APK P2.37R2C-H10 mới.`);
                  const proof = await runBoardGameNativeBinaryProof();
                  if (!proof.accepted) throw new Error(`Native Host R2C-H2 chưa PASS: ${proof.reason ?? "unknown"}. Xem Event log.`);
                  setNativeIdentity(proof.identity ?? nativeIdentity);
                })}
              />
              <ActionButton disabled={busy || !nativeBinaryReady} icon="layers-outline" label="2. Test Surface Chess (1,8 giây)" onPress={() => void runBoardGameNativePlaneProbe("chess")} />
              <ActionButton disabled={busy || !nativeBinaryReady} icon="layers-outline" label="3. Test Surface Cờ tướng (1,8 giây)" onPress={() => void runBoardGameNativePlaneProbe("xiangqi")} />
            </View>
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Event log" subtitle="80 dòng gần nhất: protocol + store + root + native plane" />
          <BloomCard style={styles.logCard}>
            {logs.length ? logs.map((row) => (
              <View key={row.id} style={styles.logRow}>
                <Text style={styles.logTime}>{row.at}</Text>
                <Text style={styles.logScope}>{row.scope}</Text>
                <Text style={styles.logText}>{row.text}</Text>
              </View>
            )) : <Text style={styles.empty}>Chưa chạy test nào.</Text>}
          </BloomCard>
        </View>

        <Text style={styles.note}>Trang này cố ý không render quân cờ. Asset quân và toàn bộ sound pack vẫn được giữ nguyên để dùng cho client mới.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  bloomShade: { flex: 1, backgroundColor: "rgba(255,241,249,0.87)", justifyContent: "center", paddingHorizontal: 22 },
  bloomInviteCard: { backgroundColor: "#FFFCFE", borderRadius: 30, borderWidth: 1.5, borderColor: "#F0BDD7", paddingHorizontal: 22, paddingVertical: 30, alignItems: "center", shadowColor: "#AF4779", shadowOpacity: 0.13, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  bloomEyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.2, color: "#AF6190", textAlign: "center" },
  bloomCrown: { marginTop: 17, fontSize: 43, color: "#BC3376", backgroundColor: "#FFEDF6", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 28, overflow: "hidden" },
  bloomInviteTitle: { marginTop: 11, fontSize: 24, fontWeight: "900", color: "#823459", textAlign: "center" },
  bloomInviteBody: { marginTop: 12, marginBottom: 12, fontSize: 14, lineHeight: 22, textAlign: "center", color: "#815368" },
  bloomInvitePrimary: { backgroundColor: "#A92F72", borderRadius: 18, paddingVertical: 16, alignSelf: "stretch", alignItems: "center", elevation: 2 },
  bloomInvitePrimaryText: { color: "white", fontSize: 15, fontWeight: "900" },
  bloomInviteSecondary: { backgroundColor: "#FCE7F1", marginTop: 9, borderRadius: 16, paddingVertical: 13, alignSelf: "stretch", alignItems: "center" },
  bloomInviteSecondaryText: { color: "#8C4167", fontSize: 14, fontWeight: "800" },
  xiangqiInviteCard: { borderColor: "#EED39B" },
  xiangqiEyebrow: { color: "#A56811" },
  xiangqiCrown: { color: "#986515", backgroundColor: "#FFF5DC" },
  royalInviteCard: { paddingTop: 80, overflow: "visible" },
  royalKingSlot: { position: "absolute", top: -55, left: 0, right: 0, height: 110, alignItems: "center", justifyContent: "center", overflow: "visible", zIndex: 20 },
  royalKingHero: { width: 110, height: 110 },
  xiangqiInvitePrimary: { backgroundColor: "#B37C24" },
  content: { padding: 16, paddingBottom: 42, gap: 20 },
  section: { gap: 9 },
  card: { padding: 14, gap: 12 },
  state: { fontSize: 11.5, lineHeight: 17, fontWeight: "800", color: COLORS.secondaryText },
  actions: { gap: 8 },
  action: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", gap: 9 },
  actionText: { flex: 1, fontSize: 11.5, fontWeight: "900", color: COLORS.primaryText },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.68 },
  logCard: { paddingHorizontal: 14, paddingVertical: 4 },
  logRow: { minHeight: 46, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", alignItems: "flex-start", gap: 7 },
  logTime: { width: 62, fontSize: 9.5, color: COLORS.secondaryText },
  logScope: { width: 54, fontSize: 9.5, fontWeight: "900", color: COLORS.primary },
  logText: { flex: 1, fontSize: 10, lineHeight: 14, color: COLORS.primaryText },
  empty: { paddingVertical: 16, fontSize: 10.5, color: COLORS.secondaryText },
  note: { paddingHorizontal: 14, textAlign: "center", color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 16 },
});
