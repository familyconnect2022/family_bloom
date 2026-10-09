import type { BoardMoveSoundKind } from "../../components/games/useBoardGameSoundscape";

export type RealtimeBoardGameKind = "chess" | "xiangqi";
export type RealtimeBoardRoundPhase = "preparing" | "ready" | "playing";

export type BoardGameMoveSemantic = {
  isSelf: boolean;
  captured?: boolean;
  check?: boolean;
  castle?: boolean;
  promotion?: boolean;
};

/** One move => one sound. Special semantics replace, never stack on, normal move. */
export function resolveBoardMoveSound(move: BoardGameMoveSemantic): BoardMoveSoundKind {
  if (move.promotion) return "promote";
  if (move.castle) return "castle";
  if (move.check) return "check";
  if (move.captured) return "capture";
  return move.isSelf ? "self" : "opponent";
}

/** Human-like Bloom Bot pacing used by both board games in test mode. */
export function humanBotThinkDelayMs(givesCheck: boolean) {
  return givesCheck ? 5_000 : 3_000;
}

export type BoardGamePremove<TFrom, TTo, TPromotion = never> = {
  from: TFrom;
  to: TTo;
  promotion?: TPromotion;
  queuedAtRevision: number;
};

export const BOARD_GAME_LANDING_GRACE_MS = 24;
