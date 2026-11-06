import { useSyncExternalStore } from "react";
import { emitBoardGamePresentationDiagnostic } from "./boardGamePresentationDiagnostics";

export type BoardGamePresentationKind = "chess" | "xiangqi";
export type BoardGamePresentationMode = "idle" | "full" | "mini";

export type BoardGamePresentationSnapshot = {
  activeKind: BoardGamePresentationKind | null;
  activeGameId: string | null;
  mode: BoardGamePresentationMode;
  fullContent: BoardGamePresentationKind | null;
  miniContent: BoardGamePresentationKind | null;
};

const IDLE_SNAPSHOT: BoardGamePresentationSnapshot = {
  activeKind: null,
  activeGameId: null,
  mode: "idle",
  fullContent: null,
  miniContent: null,
};

// A provisional id identifies *presentation only*, never a server game/room.
export const CHESS_PENDING_PREFIX = "pending-chess:";
export const XIANGQI_PENDING_PREFIX = "pending-xiangqi:";
let pendingChessDeadline: ReturnType<typeof setTimeout> | null = null;
function cancelPendingDeadline() {
  if (pendingChessDeadline) clearTimeout(pendingChessDeadline);
  pendingChessDeadline = null;
}
// Dismissed Chess results are local UI tombstones, never server game mutations.
// Stale socket state/delta and reconnect recovery must not reopen a result the
// user has already dismissed. Bounded to avoid retaining old ids indefinitely.
const dismissedChessResults = new Map<string, number>();
const DISMISSED_RESULT_TTL_MS = 30 * 60_000;
export function markChessResultDismissed(gameId: string) {
  dismissedChessResults.set(gameId, Date.now() + DISMISSED_RESULT_TTL_MS);
  for (const [id, expires] of dismissedChessResults) {
    if (expires < Date.now() || dismissedChessResults.size > 40) dismissedChessResults.delete(id);
  }
}
const dismissedXiangqiResults = new Map<string, number>();
export function markXiangqiResultDismissed(gameId: string) {
  dismissedXiangqiResults.set(gameId,Date.now()+DISMISSED_RESULT_TTL_MS);
  for (const [id, expiry] of dismissedXiangqiResults)
    if (expiry < Date.now() || dismissedXiangqiResults.size > 40) dismissedXiangqiResults.delete(id);
}
export function wasXiangqiResultDismissed(gameId: string) {
  const expiry = dismissedXiangqiResults.get(gameId);
  if (!expiry) return false;
  if (expiry < Date.now()) {dismissedXiangqiResults.delete(gameId);return false;}
  return true;
}
export function wasChessResultDismissed(gameId: string) {
  const expires = dismissedChessResults.get(gameId);
  if (!expires) return false;
  if (expires < Date.now()) { dismissedChessResults.delete(gameId); return false; }
  return true;
}
let snapshot: BoardGamePresentationSnapshot = IDLE_SNAPSHOT;
const listeners = new Set<() => void>();

function publish(next: BoardGamePresentationSnapshot) {
  const previous = snapshot;
  snapshot = next;
  emitBoardGamePresentationDiagnostic(
    "store",
    "STORE_PUBLISH",
    `${previous.mode}/${previous.activeKind ?? "none"}/${previous.activeGameId ?? "no-game"} -> ${next.mode}/${next.activeKind ?? "none"}/${next.activeGameId ?? "no-game"}`,
    {
      mode: next.mode,
      kind: next.activeKind,
      gameId: next.activeGameId,
      previousMode: previous.mode,
      previousKind: previous.activeKind,
      previousGameId: previous.activeGameId,
    },
  );
  for (const listener of listeners) listener();
}

export function getBoardGamePresentationSnapshot() {
  return snapshot;
}

export function subscribeBoardGamePresentation(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useBoardGamePresentationSnapshot() {
  return useSyncExternalStore(
    subscribeBoardGamePresentation,
    getBoardGamePresentationSnapshot,
    getBoardGamePresentationSnapshot,
  );
}

/**
 * Prototype/manual activation used by Home Games. It deliberately has no
 * authoritative game id. Production/session activation should use
 * presentConfirmedBoardGame().
 */
export function activateBoardGamePresentation(kind: BoardGamePresentationKind) {
  if (snapshot.activeGameId && snapshot.activeKind && snapshot.activeKind !== kind) return;
  publish({
    activeKind: kind,
    activeGameId: snapshot.activeKind === kind ? snapshot.activeGameId : null,
    mode: "full",
    fullContent: kind,
    miniContent: kind,
  });
}

/**
 * The only entry point for an authoritative Chess/Xiangqi session. A valid
 * server game state binds its gameId to the persistent presentation and brings
 * Full on-screen without mounting a new surface.
 */
/** Open Chess Full synchronously on tap, before Socket prewake/room creation. */
export function presentPendingChessBoard(pendingId: string) {
  if (!pendingId.startsWith(CHESS_PENDING_PREFIX)) return false;
  if (snapshot.activeKind && !(snapshot.activeKind === "chess" && snapshot.activeGameId === pendingId)) return false;
  cancelPendingDeadline();
  publish({ activeKind: "chess", activeGameId: pendingId, mode: "full", fullContent: "chess", miniContent: "chess" });
  // The server invitation's 60-second expiration remains authoritative. This
  // watchdog only removes an orphaned local preview if no state ever arrives.
  pendingChessDeadline = setTimeout(() => {
    if (snapshot.activeKind === "chess" && snapshot.activeGameId === pendingId) closeBoardGamePresentation();
  }, 150_000);
  return true;
}

/** A late failed ACK must never close a newly confirmed live game. */
export function dismissPendingChessBoard(pendingId: string) {
  if (snapshot.activeKind !== "chess" || snapshot.activeGameId !== pendingId) return;
  closeBoardGamePresentation();
}

export function presentPendingXiangqiBoard(pendingId: string) {
  if (!pendingId.startsWith(XIANGQI_PENDING_PREFIX)) return false;
  if (snapshot.activeKind && !(snapshot.activeKind === "xiangqi" && snapshot.activeGameId === pendingId)) return false;
  cancelPendingDeadline();
  publish({activeKind:"xiangqi",activeGameId:pendingId,mode:"full",fullContent:"xiangqi",miniContent:"xiangqi"});
  pendingChessDeadline = setTimeout(() => {
    if (snapshot.activeKind === "xiangqi" && snapshot.activeGameId === pendingId) closeBoardGamePresentation();
  },150_000);
  return true;
}
export function dismissPendingXiangqiBoard(pendingId: string) {
  if (snapshot.activeKind === "xiangqi" && snapshot.activeGameId === pendingId) closeBoardGamePresentation();
}

export function presentConfirmedBoardGame(kind: BoardGamePresentationKind, gameId: string) {
  if (!gameId) return;

  // H9A presentation ownership: authoritative server state owns whether a game
  // exists, but it must never overwrite the user's local Full/Mini choice for
  // the *same* game. Reconnect/state refresh may update FEN/clocks/revision;
  // presentation stays MINI until the user explicitly restores it.
  if (snapshot.activeKind === kind && snapshot.activeGameId === gameId) {
    const next: BoardGamePresentationSnapshot = {
      ...snapshot,
      fullContent: kind,
      miniContent: kind,
    };
    if (
      next.mode !== snapshot.mode ||
      next.fullContent !== snapshot.fullContent ||
      next.miniContent !== snapshot.miniContent
    ) {
      publish(next);
    } else {
      emitBoardGamePresentationDiagnostic(
        "store",
        "STORE_PRESERVE_LOCAL_MODE",
        `${kind}/${gameId} authoritative refresh preserved local ${snapshot.mode.toUpperCase()}`,
        { mode: snapshot.mode, kind, gameId },
      );
    }
    return;
  }

  // A genuinely new confirmed game starts Full exactly once. Cross-game
  // exclusivity remains server-owned; stale packets cannot steal presentation
  // from an already-bound different live game.
  if (snapshot.activeGameId && snapshot.activeGameId !== gameId &&
      !((kind === "chess" && snapshot.activeKind === "chess" && snapshot.activeGameId.startsWith(CHESS_PENDING_PREFIX)) ||
        (kind === "xiangqi" && snapshot.activeKind === "xiangqi" && snapshot.activeGameId.startsWith(XIANGQI_PENDING_PREFIX)))) {
    emitBoardGamePresentationDiagnostic(
      "store",
      "STORE_REJECT_DIFFERENT_GAME_REFRESH",
      `Ignored ${kind}/${gameId}; presentation is bound to ${snapshot.activeKind ?? "none"}/${snapshot.activeGameId}`,
      { mode: snapshot.mode, kind, gameId, activeKind: snapshot.activeKind, activeGameId: snapshot.activeGameId },
    );
    return;
  }

  cancelPendingDeadline();
  publish({
    activeKind: kind,
    activeGameId: gameId,
    // A user may minimize while the pending preview connects. Respect that.
    mode: snapshot.activeKind === kind && snapshot.activeGameId?.startsWith(kind === "chess" ? CHESS_PENDING_PREFIX : XIANGQI_PENDING_PREFIX) && snapshot.mode === "mini" ? "mini" : "full",
    fullContent: kind,
    miniContent: kind,
  });
}

export function minimizeBoardGamePresentation() {
  if (!snapshot.activeKind || snapshot.mode !== "full") return;
  publish({ ...snapshot, mode: "mini" });
}

export function restoreBoardGamePresentation() {
  if (!snapshot.activeKind || snapshot.mode !== "mini") return;
  publish({ ...snapshot, mode: "full" });
}

export function closeBoardGamePresentation() {
  cancelPendingDeadline();
  if (snapshot.mode === "idle" && !snapshot.activeKind && !snapshot.activeGameId) return;
  // Deterministic reset: clear game binding and both content selectors in one
  // publication, then the two persistent root shells park off-screen.
  publish(IDLE_SNAPSHOT);
}

/** Ignore stale terminal packets from a previous game. */
export function closeBoardGamePresentationForGame(kind: BoardGamePresentationKind, gameId: string) {
  if (snapshot.activeKind !== kind || snapshot.activeGameId !== gameId) return;
  closeBoardGamePresentation();
}
