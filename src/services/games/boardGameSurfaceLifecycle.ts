export type BoardGameSurfaceKind = "chess" | "xiangqi";

let boardSurfaceOwnerSequence = 0;

/**
 * One shared route-owner token generator for every persistent board surface.
 * A blur cleanup may arrive after a new route instance has already claimed the
 * same root host; token comparison prevents that stale cleanup from hiding it.
 */
export function createBoardGameSurfaceOwnerId(kind: BoardGameSurfaceKind) {
  boardSurfaceOwnerSequence += 1;
  return `${kind}-route-${boardSurfaceOwnerSequence}`;
}

export function canReleaseBoardGameSurface(currentOwnerId: string | null, requestedOwnerId?: string) {
  return !(requestedOwnerId && currentOwnerId && requestedOwnerId !== currentOwnerId);
}

/**
 * A prepared persistent board is presented by ownership/mode, not by volatile
 * startup chrome readiness. BloomSurfaceStack itself is mounted after the app's
 * deferred warm boundary, so once a route owns `full` no tabbar/splash signal is
 * allowed to translate that board off-screen. The first parameter remains for
 * source compatibility with older callers and can be removed in a later cleanup.
 */
export function isBoardGameSurfacePresented(_presentationReady: boolean, mode: string) {
  return mode === "full";
}
