import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { attachBoardGamePresentationBridge } from "../../services/games/boardGamePresentationBridge";
import {
  getBoardGamePresentationSnapshot,
  minimizeBoardGamePresentation,
  restoreBoardGamePresentation,
  useBoardGamePresentationSnapshot,
} from "../../services/games/boardGamePresentationStore";
import {
  hasBoardGameNativeHostModule,
  setBoardGameNativePresentation,
  subscribeBoardGameNativeActions,
  subscribeBoardGameNativeChessActions,
  subscribeBoardGameNativeXiangqiActions,
  subscribeBoardGameNativeDiagnostics,
} from "../../services/games/boardGameNativeOverlay";
import { emitBoardGamePresentationDiagnostic } from "../../services/games/boardGamePresentationDiagnostics";
import { attachNativeXiangqiAppLifecycle, handleNativeXiangqiAction } from "../../services/games/nativeXiangqiGameplayController";
import { attachNativeChessAppLifecycle, handleNativeChessAction } from "../../services/games/nativeChessGameplayController";

/**
 * H6 Android presentation controller.
 *
 * IMPORTANT: this component intentionally renders no React View. Full/Mini are
 * created and retained by the native module on Activity.window.decorView, which
 * places them outside React/Yoga and outside react-native-screens measurement.
 * This restores the stable P2.36 boundary while keeping the newer persistent
 * Full/Mini state machine and binary proof tooling.
 */
export function BoardGamePresentationRoot() {
  const presentation = useBoardGamePresentationSnapshot();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    emitBoardGamePresentationDiagnostic(
      "root",
      "DECOR_RAIL_CONTROLLER_MOUNTED",
      "Android game presentation controller mounted; no native overlay view exists in the React/Yoga tree",
      { nativeModulePresent: hasBoardGameNativeHostModule() },
    );
    const detachBridge = attachBoardGamePresentationBridge();
    const detachXiangqiLifecycle = attachNativeXiangqiAppLifecycle();
    const detachChessLifecycle = attachNativeChessAppLifecycle();
    return () => { detachBridge(); detachXiangqiLifecycle(); detachChessLifecycle(); };
  }, []);

  useEffect(() => {
    // H9A: native action subscriptions live for the controller lifetime instead
    // of being torn down/re-added on every Full/Mini/state transition. This
    // keeps tab transitions quiet while Mini is floating above React.
    const offDiagnostics = subscribeBoardGameNativeDiagnostics(() => undefined);
    const offChessActions = subscribeBoardGameNativeChessActions((event) => {
      void handleNativeChessAction(event);
    });
    const offXiangqiActions = subscribeBoardGameNativeXiangqiActions((event) => {
      void handleNativeXiangqiAction(event);
    });
    const offActions = subscribeBoardGameNativeActions((event) => {
      const current = getBoardGamePresentationSnapshot();
      emitBoardGamePresentationDiagnostic("root", "NATIVE_ACTION_RECEIVED", `${event.action} from ${event.source}`, {
        mode: current.mode,
        kind: current.activeKind,
        gameId: current.activeGameId,
      });
      if (event.action === "minimize") minimizeBoardGamePresentation();
      else if (event.action === "restore") restoreBoardGamePresentation();
      // Close is never a valid live-match action; only terminal server state
      // through boardGamePresentationBridge can clean up the session.
    });
    return () => {
      offDiagnostics();
      offChessActions();
      offXiangqiActions();
      offActions();
    };
  }, []);

  useEffect(() => {
    const detail = `${presentation.mode.toUpperCase()} · ${presentation.activeKind ?? "none"} · ${presentation.activeGameId ?? "no-game"}`;
    emitBoardGamePresentationDiagnostic("root", "ROOT_RECEIVED_STORE", detail, {
      mode: presentation.mode,
      kind: presentation.activeKind,
      gameId: presentation.activeGameId,
      width,
      height,
      insetTop: insets.top,
      insetBottom: insets.bottom,
      nativeModulePresent: hasBoardGameNativeHostModule(),
    });

    let cancelled = false;
    void setBoardGameNativePresentation(
      presentation.mode,
      presentation.activeKind,
      presentation.activeGameId,
      { width, height, insetTop: insets.top, insetBottom: insets.bottom },
    ).then((result) => {
      if (cancelled) return;
      emitBoardGamePresentationDiagnostic(
        "root",
        result.accepted ? "DECOR_RAIL_COMMAND_ACCEPTED" : "DECOR_RAIL_COMMAND_REJECTED",
        result.accepted ? `Native decor rail accepted ${result.mode}` : String((result as { reason?: string }).reason ?? "unknown"),
        { ...result, gameId: presentation.activeGameId },
      );
    }).catch((error) => {
      if (cancelled) return;
      emitBoardGamePresentationDiagnostic("root", "DECOR_RAIL_COMMAND_FAILED", error instanceof Error ? error.message : String(error), {
        mode: presentation.mode,
        kind: presentation.activeKind,
        gameId: presentation.activeGameId,
      });
    });

    return () => { cancelled = true; };
  }, [height, insets.bottom, insets.top, presentation.activeGameId, presentation.activeKind, presentation.mode, width]);

  return null;
}
