import {
  claimActiveBoardGameSession,
  clearActiveBoardGameSession,
  getActiveBoardGameSession,
  markActiveBoardGameSessionTerminal,
  type ActiveBoardGameKind,
  type ActiveBoardGameSource,
} from "../games/activeBoardGameSessionStore";
import { clearPendingBoardGameReservation } from "../games/pendingBoardGameReservationStore";
import {
  activateChessSurface,
  finishChessSurfaceGame,
  minimizeChessSurface,
  prepareChessSurface,
} from "../chess/chessSurfaceStore";
import {
  activateXiangqiSurface,
  finishXiangqiSurfaceGame,
  hideXiangqiSurface,
  minimizeXiangqiSurface,
} from "../xiangqi/xiangqiSurfaceStore";
import {
  getBloomSurfaceRailState,
  minimizeBloomGameSurface,
  parkBloomGameSurface,
  requestBloomGameSurface,
  syncBloomRailGameSession,
  type BloomGamePresentation,
} from "./bloomSurfaceRailStore";


type RouteBoardGamePresentationOwner = {
  kind: ActiveBoardGameKind;
  gameId: string;
  ownerToken: string;
};

// P2.19: route focus/blur is an ownership problem, not only an identity problem.
// Two route instances can briefly reference the SAME gameId during push/replace.
// A stale route must not mini/park the board after a newer route has raised it.
let routePresentationOwner: RouteBoardGamePresentationOwner | null = null;

export function acquireRouteBoardGamePresentation(
  kind: ActiveBoardGameKind,
  gameId: string,
  ownerToken: string,
) {
  const current = getActiveBoardGameSession();
  if (!current || current.kind !== kind || current.gameId !== gameId || !ownerToken) return false;
  routePresentationOwner = { kind, gameId, ownerToken };
  return presentClaimedBoardGame(kind, gameId, "full", "route");
}

export function releaseRouteBoardGamePresentation(
  kind: ActiveBoardGameKind,
  gameId: string,
  ownerToken: string,
  presentation: "mini" | "hidden",
) {
  const owner = routePresentationOwner;
  if (!owner || owner.kind !== kind || owner.gameId !== gameId || owner.ownerToken !== ownerToken) return false;
  routePresentationOwner = null;
  return presentation === "mini"
    ? minimizeClaimedBoardGame(kind, gameId)
    : parkClaimedBoardGame(kind, gameId);
}

export type BoardGamePresentationRequest = {
  kind: ActiveBoardGameKind;
  gameId: string;
  familyId?: string | null;
  source?: ActiveBoardGameSource;
  presentation?: BloomGamePresentation;
  reason?: "active_game" | "rematch" | "route";
};

/**
 * P2.17 — the only writer allowed to coordinate board-game presentation.
 *
 * ActiveBoardGameSession owns identity/exclusivity.
 * BloomSurfaceRail owns hidden/mini/full.
 * Chess/Xiangqi stores retain only their already-created runtime/scene state;
 * their legacy mode is mirrored here for compatibility and is not an owner.
 */
export function claimAndPresentBoardGame(request: BoardGamePresentationRequest) {
  const gameId = request.gameId.trim();
  if (!gameId) return false;

  const claimed = claimActiveBoardGameSession({
    kind: request.kind,
    gameId,
    familyId: request.familyId ?? null,
    source: request.source ?? "session",
  });
  if (!claimed) return false;

  syncBloomRailGameSession(request.kind, gameId);
  return presentClaimedBoardGame(
    request.kind,
    gameId,
    request.presentation ?? "full",
    request.reason ?? "active_game",
  );
}

export function presentClaimedBoardGame(
  kind: ActiveBoardGameKind,
  gameId: string,
  presentation: BloomGamePresentation = "full",
  reason: "active_game" | "rematch" | "route" = "active_game",
) {
  const current = getActiveBoardGameSession();
  if (!current || current.kind !== kind || current.gameId !== gameId) return false;

  syncBloomRailGameSession(kind, gameId);

  if (kind === "chess") {
    prepareChessSurface(reason === "rematch" ? "rematch" : reason === "route" ? "route" : "active_game");
    activateChessSurface(gameId, presentation === "mini" ? "mini" : presentation === "hidden" ? "hidden" : "full");
  } else {
    activateXiangqiSurface(
      gameId,
      presentation === "mini" ? "mini" : presentation === "hidden" ? "hidden" : "full",
      reason === "rematch" ? "rematch" : reason === "route" ? "route" : "active_game",
    );
  }

  if (presentation === "hidden") return parkBloomGameSurface(kind, gameId);
  return requestBloomGameSurface(kind, gameId, presentation);
}

export function minimizeClaimedBoardGame(kind: ActiveBoardGameKind, gameId: string) {
  const current = getActiveBoardGameSession();
  if (!current || current.kind !== kind || current.gameId !== gameId) return false;
  if (kind === "chess") minimizeChessSurface();
  else minimizeXiangqiSurface();
  return minimizeBloomGameSurface(kind, gameId);
}

export function parkClaimedBoardGame(kind: ActiveBoardGameKind, gameId: string) {
  const current = getActiveBoardGameSession();
  if (!current || current.kind !== kind || current.gameId !== gameId) return false;
  if (kind === "chess") {
    // Chess intentionally keeps its retained runtime alive while parked. The
    // rail removes all pixels/input; a later full/mini request reuses the scene.
    activateChessSurface(gameId, "hidden");
  } else {
    hideXiangqiSurface();
  }
  return parkBloomGameSurface(kind, gameId);
}

export function finishClaimedBoardGame(kind: ActiveBoardGameKind, gameIdInput: string) {
  const gameId = gameIdInput.trim();
  if (!gameId) return;

  // P2.21 terminal invariant: terminal identity is poisoned BEFORE any local
  // presentation cleanup. Late route/recovery callbacks can therefore never
  // reclaim the just-finished game while teardown is in progress.
  markActiveBoardGameSessionTerminal(kind, gameId);
  if (routePresentationOwner?.kind === kind && routePresentationOwner.gameId === gameId) routePresentationOwner = null;

  // A pending reservation belongs to pre-game creation only. Once an
  // authoritative game reaches terminal state it must not keep either board
  // kind locked on the Hub.
  clearPendingBoardGameReservation({ gameKind: kind });

  // The rail is presentation-only, but a duplicate/late terminal packet from an
  // OLD game must never erase a newly-created game that already owns the rail.
  const rail = getBloomSurfaceRailState();
  if (rail.gameKind === kind && rail.gameId === gameId) {
    parkBloomGameSurface(kind, gameId);
    syncBloomRailGameSession(null, null);
  }
  clearActiveBoardGameSession({ kind, gameId });

  if (kind === "chess") finishChessSurfaceGame(gameId);
  else finishXiangqiSurfaceGame(gameId);
}
