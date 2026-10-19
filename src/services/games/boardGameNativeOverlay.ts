import { Platform } from "react-native";
import {
  familyBloomOverlayNativeModulePresent,
  getFamilyBloomOverlayHostStatus,
  getFamilyBloomOverlayNativeIdentity,
  proveFamilyBloomOverlayNativeHost,
  probeFamilyBloomOverlayHost,
  setFamilyBloomOverlayPresentation,
  setFamilyBloomOverlayChessBoardState,
  setFamilyBloomOverlayXiangqiBoardState,
  subscribeFamilyBloomOverlayXiangqiActions,
  type NativeXiangqiAction,
  type NativeXiangqiBoardState,
  subscribeFamilyBloomOverlayActions,
  subscribeFamilyBloomOverlayChessActions,
  subscribeFamilyBloomOverlayDiagnostics,
  type NativeOverlayAction,
  type NativeChessAction,
  type NativeChessBoardState,
  type NativeOverlayDiagnostic,
  type NativeOverlayKind,
  type NativeOverlayMode,
} from "../../../modules/family-bloom-overlay";
import { emitBoardGamePresentationDiagnostic } from "./boardGamePresentationDiagnostics";


export type { NativeChessAction, NativeChessBoardState, NativeXiangqiAction, NativeXiangqiBoardState };

export function subscribeBoardGameNativeXiangqiActions(listener: (event: NativeXiangqiAction) => void) {
  if (Platform.OS !== "android" || !familyBloomOverlayNativeModulePresent) return () => undefined;
  return subscribeFamilyBloomOverlayXiangqiActions(listener);
}

export async function setBoardGameNativeXiangqiState(state: NativeXiangqiBoardState) {
  if (Platform.OS !== "android" || !familyBloomOverlayNativeModulePresent) return {accepted:false as const};
  return setFamilyBloomOverlayXiangqiBoardState(state);
}

export function subscribeBoardGameNativeChessActions(listener: (event: NativeChessAction) => void) {
  if (Platform.OS !== "android" || !familyBloomOverlayNativeModulePresent) return () => undefined;
  return subscribeFamilyBloomOverlayChessActions(listener);
}

export async function setBoardGameNativeChessState(state: NativeChessBoardState) {
  if (Platform.OS !== "android") return { accepted: false as const, reason: "NOT_ANDROID" as const };
  if (!familyBloomOverlayNativeModulePresent) return { accepted: false as const, reason: "NATIVE_MODULE_MISSING" as const };
  return setFamilyBloomOverlayChessBoardState(state);
}

export type NativeOverlayGeometry = {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
};

export function hasBoardGameNativeHostModule() {
  return Platform.OS === "android" && familyBloomOverlayNativeModulePresent;
}

export function subscribeBoardGameNativeDiagnostics(listener: (event: NativeOverlayDiagnostic) => void) {
  if (Platform.OS !== "android") return () => undefined;
  if (!familyBloomOverlayNativeModulePresent) {
    emitBoardGamePresentationDiagnostic("native", "NATIVE_MODULE_MISSING", "H9A native decor-rail module is not installed in this Android binary");
    return () => undefined;
  }
  return subscribeFamilyBloomOverlayDiagnostics((event) => {
    emitBoardGamePresentationDiagnostic("native", event.stage, event.detail, {
      ...event,
      mode: event.mode ?? null,
      kind: event.kind ?? null,
      gameId: event.gameId ?? null,
    });
    listener(event);
  });
}

export function subscribeBoardGameNativeActions(listener: (event: NativeOverlayAction) => void) {
  if (Platform.OS !== "android" || !familyBloomOverlayNativeModulePresent) return () => undefined;
  return subscribeFamilyBloomOverlayActions(listener);
}

export async function setBoardGameNativePresentation(
  mode: NativeOverlayMode,
  kind: NativeOverlayKind | null,
  gameId: string | null,
  geometry: NativeOverlayGeometry,
) {
  if (Platform.OS !== "android") return { accepted: false, mode, kind, reason: "NOT_ANDROID" as const };
  if (!familyBloomOverlayNativeModulePresent) {
    emitBoardGamePresentationDiagnostic("native", "NATIVE_MODULE_MISSING", "Cannot present Surface: rebuild/install the H6 Android binary first", { mode, kind, gameId });
    return { accepted: false, mode, kind, reason: "NATIVE_MODULE_MISSING" as const };
  }
  return setFamilyBloomOverlayPresentation(mode, kind, gameId, geometry);
}

export async function getBoardGameNativeHostStatus() {
  if (Platform.OS !== "android") return { mounted: false, attached: false, reason: "NOT_ANDROID" };
  if (!familyBloomOverlayNativeModulePresent) {
    emitBoardGamePresentationDiagnostic("native", "NATIVE_MODULE_MISSING", "H9A native decor rail is absent from this Android binary");
    return { mounted: false, attached: false, reason: "NATIVE_MODULE_MISSING" };
  }
  const status = await getFamilyBloomOverlayHostStatus();
  emitBoardGamePresentationDiagnostic("native", "NATIVE_HOST_STATUS", JSON.stringify(status), status as Record<string, unknown>);
  return status;
}

export async function runBoardGameNativePlaneProbe(kind: NativeOverlayKind) {
  if (Platform.OS !== "android") return { accepted: false, reason: "NOT_ANDROID" };
  if (!familyBloomOverlayNativeModulePresent) {
    emitBoardGamePresentationDiagnostic("native", "NATIVE_MODULE_MISSING", "H6 native decor-rail probe requires a rebuilt Android binary", { kind, mode: "full" });
    return { accepted: false, reason: "NATIVE_MODULE_MISSING" };
  }
  emitBoardGamePresentationDiagnostic("root", "DECOR_RAIL_PROBE_SENT", `Sending independent ${kind} probe to Android decor rail`, { kind, mode: "full" });
  const result = await probeFamilyBloomOverlayHost(kind);
  emitBoardGamePresentationDiagnostic(
    "native",
    result.accepted ? "DECOR_RAIL_PROBE_ACCEPTED" : "DECOR_RAIL_PROBE_REJECTED",
    result.accepted ? `${kind} probe accepted by persistent decor rail` : String(result.reason ?? "unknown"),
    { ...result, kind, mode: "full" },
  );
  return result;
}

export async function getBoardGameNativeBinaryIdentity() {
  if (Platform.OS !== "android") return { present: false as const, reason: "NOT_ANDROID" as const };
  const identity = await getFamilyBloomOverlayNativeIdentity();
  emitBoardGamePresentationDiagnostic(
    "native",
    identity.present ? "NATIVE_BINARY_IDENTITY" : "NATIVE_MODULE_MISSING",
    identity.present ? `${identity.identity} · railMounted=${String(identity.hostMounted)}` : String(identity.reason),
    identity as Record<string, unknown>,
  );
  return identity;
}

export async function runBoardGameNativeBinaryProof() {
  if (Platform.OS !== "android") return { accepted: false, identity: null as string | null, reason: "NOT_ANDROID" };
  if (!familyBloomOverlayNativeModulePresent) {
    emitBoardGamePresentationDiagnostic("native", "NATIVE_MODULE_MISSING", "H9A binary proof cannot run because FamilyBloomOverlay is not registered in this APK");
    return { accepted: false, identity: null as string | null, reason: "NATIVE_MODULE_MISSING" };
  }
  const nativeIdentity = await getFamilyBloomOverlayNativeIdentity();
  const result = await proveFamilyBloomOverlayNativeHost();
  const identity = nativeIdentity.present ? nativeIdentity.identity : null;
  emitBoardGamePresentationDiagnostic(
    "native",
    result.accepted ? "NATIVE_BINARY_PROOF_ACCEPTED" : "NATIVE_BINARY_PROOF_REJECTED",
    result.accepted ? `NATIVE DECOR RAIL OK · ${String(result.identity ?? identity ?? "unknown")}` : String(result.reason ?? "unknown"),
    { ...nativeIdentity, ...result },
  );
  return { accepted: result.accepted, identity: result.identity ?? identity, reason: result.reason };
}
