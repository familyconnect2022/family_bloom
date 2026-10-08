import type { ChessGameStatus } from "../../types/chess";

type RematchClaimInput = {
  sourceGameId: string | null;
  targetGameId: string | null;
  surfaceGameId: string | null;
  stateGameId: string | null;
  status: ChessGameStatus;
};

/**
 * Rematch UI must follow server ownership, not local entry animation timing.
 * Socket state can arrive before the rematch ACK, so targetGameId may still be
 * null when the newly-created authoritative game already owns the surface.
 */
export function shouldReleaseRematchPreparing({
  sourceGameId,
  targetGameId,
  surfaceGameId,
  stateGameId,
  status,
}: RematchClaimInput) {
  if (status !== "active" && status !== "paused") return false;
  if (!surfaceGameId || stateGameId !== surfaceGameId) return false;
  if (targetGameId) return surfaceGameId === targetGameId;
  return !!sourceGameId && surfaceGameId !== sourceGameId;
}
