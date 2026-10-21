import { requireOptionalNativeModule } from "expo-modules-core";

export type NativeOverlayKind = "chess" | "xiangqi";
export type NativeOverlayMode = "idle" | "full" | "mini";

export type NativeOverlayDiagnostic = {
  seq?: number;
  stage: string;
  detail: string;
  mode?: NativeOverlayMode;
  kind?: NativeOverlayKind | null;
  gameId?: string | null;
  parentClass?: string;
  childIndex?: number;
  childCount?: number;
  siblings?: string[];
  attached?: boolean;
  shown?: boolean;
  widthDp?: number;
  heightDp?: number;
  railLocation?: string;
  [key: string]: unknown;
};

export type NativeOverlayAction = {
  action: "minimize" | "restore" | "close";
  source: string;
};

export type NativeChessAction = {
  action: "square" | "ready" | "assetsReady" | "promotion" | "resign" | "drawOffer" | "drawAccept" | "drawReject" | "resultAck";
  gameId: string;
  square?: string;
  promotion?: "q" | "r" | "b" | "n";
  source: string;
};

export type NativeXiangqiAction = { action:"square"|"assetsReady"|"resign"|"drawOffer"|"drawAccept"|"drawDecline"|"resultAck"|"inputBlocked"; gameId:string; col?:number; row?:number; source:string };
export type NativeXiangqiBoardState = {
  gameId:string; revision:number; renderSequence:number; status:string; preparationPhase:"board"|"colors"|"play";
  turn:"red"|"black"; orientation:"red"|"black"; meColor:"red"|"black"|null;
  pieces:Array<{id:string;color:"red"|"black";type:string;col:number;row:number}>;
  lastFrom:{col:number;row:number}|null; lastTo:{col:number;row:number}|null;
  selectedPieceId:string|null; legalTargets:Array<{col:number;row:number}>;
  captureTargets:Array<{col:number;row:number}>; redRemainingMs:number|null;blackRemainingMs:number|null;
  serverNowMs:number;canMove:boolean;movePending:boolean;opponentLabel:string;meLabel:string;opponentAvatarUrl:string|null;meAvatarUrl:string|null;myUid:string|null;drawOfferByUid:string|null;waitingMessage:string;
  waitingRemainingMs:number|null;result:"red"|"black"|"draw"|null;finishReason:string|null;
  canPremove:boolean;premoveTarget:{col:number;row:number}|null;soundCue:string;soundToken:number;
};

export type NativeChessBoardState = {
  gameId: string;
  fen: string;
  // Client-only speculative paint; never used as server FEN/revision.
  optimisticMoveId?: string | null;
  /** Validated last-move predecessor supplied for a resync animation. */
  motionFromFen?: string | null;
  renderSequence?: number;
  orientation: "w" | "b";
  status: "waiting" | "active" | "paused" | "finished" | "cancelled" | "syncing";
  turn: "w" | "b";
  selectedSquare: string | null;
  legalTargets: string[];
  captureTargets: string[];
  promotionTargets: string[];
  lastFrom: string | null;
  lastTo: string | null;
  checkSquare: string | null;
  canMove: boolean;
  canPremove: boolean;
  queuedPremoveSquares: string[];
  premoveCount: number;
  promotionPending: boolean;
  soundCue: string;
  soundToken: number;
  serverNowMs: number;
  movePending: boolean;
  readyPending: boolean;
  waitingForMe: boolean;
  whiteRemainingMs: number | null;
  blackRemainingMs: number | null;
  result?: "white" | "black" | "draw" | null;
  finishReason?: string | null;
  drawOfferByUid?: string | null;
  meColor: "w" | "b" | null;
  myUid?: string | null;
  meLabel: string;
  opponentLabel: string;
  waitingMessage?: string;
  waitingRemainingMs?: number | null;
  revision: number;
  ply: number;
};

type NativeEventSubscription = { remove(): void };

type FamilyBloomOverlayNativeModule = {
  setPresentation(
    mode: NativeOverlayMode,
    kind: NativeOverlayKind | null,
    gameId: string | null,
    widthDp: number,
    heightDp: number,
    insetTopDp: number,
    insetBottomDp: number,
  ): Promise<{ accepted: boolean; mode: NativeOverlayMode; kind: NativeOverlayKind | null; railAttached?: boolean }>;
  getNativeIdentity(): Promise<{ identity: string; module: string; hostMounted: boolean; railLocation?: string }>;
  proveHost(): Promise<{ accepted: boolean; reason?: string; identity?: string; attached?: boolean; shown?: boolean; railLocation?: string }>;
  getHostStatus(): Promise<Record<string, unknown>>;
  probe(kind: NativeOverlayKind): Promise<{ accepted: boolean; reason?: string; mode?: NativeOverlayMode; kind?: NativeOverlayKind | null }>;
  setChessBoardState(payloadJson: string): Promise<{ accepted: boolean; gameId?: string; cached?: boolean }>;
  setXiangqiMiniState(payloadJson: string): Promise<{ accepted: boolean }>;
  setXiangqiBoardState(payloadJson: string): Promise<{accepted:boolean;gameId?:string;cached?:boolean}>;
  addListener(eventName: "onDiagnostic", listener: (event: NativeOverlayDiagnostic) => void): NativeEventSubscription;
  addListener(eventName: "onAction", listener: (event: NativeOverlayAction) => void): NativeEventSubscription;
  addListener(eventName: "onChessAction", listener: (event: NativeChessAction) => void): NativeEventSubscription;
  addListener(eventName: "onXiangqiAction", listener: (event: NativeXiangqiAction) => void): NativeEventSubscription;
};

const nativeModule = requireOptionalNativeModule<FamilyBloomOverlayNativeModule>("FamilyBloomOverlay");

/**
 * H6: presence means the binary contains the native module. There is no longer
 * a React Native ViewManager in the render tree. The persistent Full/Mini rail
 * is owned by Android and attached directly to Activity.window.decorView.
 */
export const familyBloomOverlayNativeModulePresent = !!nativeModule;

export function subscribeFamilyBloomOverlayDiagnostics(listener: (event: NativeOverlayDiagnostic) => void) {
  if (!nativeModule) return () => undefined;
  const subscription = nativeModule.addListener("onDiagnostic", listener);
  return () => subscription.remove();
}

export function subscribeFamilyBloomOverlayActions(listener: (event: NativeOverlayAction) => void) {
  if (!nativeModule) return () => undefined;
  const subscription = nativeModule.addListener("onAction", listener);
  return () => subscription.remove();
}

export function subscribeFamilyBloomOverlayChessActions(listener: (event: NativeChessAction) => void) {
  if (!nativeModule) return () => undefined;
  const subscription = nativeModule.addListener("onChessAction", listener);
  return () => subscription.remove();
}

export function subscribeFamilyBloomOverlayXiangqiActions(listener: (event: NativeXiangqiAction) => void) {
  if (!nativeModule) return () => undefined;
  const sub = nativeModule.addListener("onXiangqiAction", listener);
  return () => sub.remove();
}

export async function setFamilyBloomOverlayXiangqiBoardState(state: NativeXiangqiBoardState) {
  if (!nativeModule) return {accepted:false as const, reason:"NATIVE_MODULE_MISSING" as const};
  return nativeModule.setXiangqiBoardState(JSON.stringify(state));
}

export type NativeXiangqiMiniState = {
  gameId: string; revision: number; status: string; turn: "red" | "black";
  lastPieceGlyph: string; redRemainingMs: number | null; blackRemainingMs: number | null; serverNowMs: number;
};

export async function setFamilyBloomOverlayXiangqiMiniState(state: NativeXiangqiMiniState) {
  if (!nativeModule) return { accepted: false as const };
  return nativeModule.setXiangqiMiniState(JSON.stringify(state));
}

export async function setFamilyBloomOverlayChessBoardState(state: NativeChessBoardState) {
  if (!nativeModule) return { accepted: false as const, reason: "NATIVE_MODULE_MISSING" as const };
  return nativeModule.setChessBoardState(JSON.stringify(state));
}

export async function setFamilyBloomOverlayPresentation(
  mode: NativeOverlayMode,
  kind: NativeOverlayKind | null,
  gameId: string | null,
  geometry: { width: number; height: number; insetTop: number; insetBottom: number },
) {
  if (!nativeModule) return { accepted: false, mode, kind, reason: "NATIVE_MODULE_MISSING" as const };
  return nativeModule.setPresentation(
    mode,
    kind,
    gameId,
    geometry.width,
    geometry.height,
    geometry.insetTop,
    geometry.insetBottom,
  );
}

export async function getFamilyBloomOverlayHostStatus() {
  if (!nativeModule) return { mounted: false, attached: false, reason: "NATIVE_MODULE_MISSING" };
  return nativeModule.getHostStatus();
}

export async function probeFamilyBloomOverlayHost(kind: NativeOverlayKind) {
  if (!nativeModule) return { accepted: false, reason: "NATIVE_MODULE_MISSING" };
  return nativeModule.probe(kind);
}

export async function getFamilyBloomOverlayNativeIdentity() {
  if (!nativeModule) return { present: false as const, reason: "NATIVE_MODULE_MISSING" as const };
  const identity = await nativeModule.getNativeIdentity();
  return { present: true as const, ...identity };
}

export async function proveFamilyBloomOverlayNativeHost() {
  if (!nativeModule) return { accepted: false as const, reason: "NATIVE_MODULE_MISSING" as const };
  return nativeModule.proveHost();
}
