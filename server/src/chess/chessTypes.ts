export type ChessColor = "w" | "b";
export type ChessTimeControl =
  | { kind: "clocked"; initialMs: number; incrementMs: number }
  | { kind: "unlimited"; initialMs: null; incrementMs: 0 };
export type GameStatus = "waiting" | "active" | "paused" | "finished" | "cancelled";
export type GameResult = "white" | "black" | "draw" | null;
export type FinishReason = "checkmate" | "resignation" | "timeout" | "stalemate" | "draw" |
  "insufficient_material" | "threefold_repetition" | "fifty_move_rule" | "abandoned" | null;
export type MoveHint = { from: string; to: string; promotion?: "q" | "r" | "b" | "n" };
export type LastMove = MoveHint & { san: string };
export type PersistedGame = {
  id: string; familyId: string; whiteUid: string; blackUid: string; playerUids: string[];
  status: GameStatus; fen: string; pgn: string; turn: ChessColor; revision: number;
  whiteRemainingMs: number | null; blackRemainingMs: number | null; timeControl: ChessTimeControl;
  result: GameResult; finishReason: FinishReason; lastMove: LastMove | null; drawOfferByUid: string | null;
  recentRequestIds: string[]; createdAt: string; startedAt: string | null; endedAt: string | null; updatedAt: string;
};
export type PublicGameState = Omit<PersistedGame, "id" | "playerUids" | "recentRequestIds" | "updatedAt"> & {
  gameId: string; legalMoves: MoveHint[]; checkSquare: string | null; serverNowMs: number;
};
export type ChessErrorCode = "CHESS_UNAUTHORIZED" | "CHESS_NOT_FAMILY_MEMBER" | "CHESS_GAME_NOT_FOUND" |
  "CHESS_NOT_PLAYER" | "CHESS_NOT_YOUR_TURN" | "CHESS_ILLEGAL_MOVE" | "CHESS_GAME_FINISHED" |
  "CHESS_ALREADY_IN_GAME" | "CHESS_INVITE_EXPIRED" | "CHESS_PLAYER_OFFLINE" | "CHESS_INVALID_PROMOTION" |
  "CHESS_STATE_CONFLICT" | "CHESS_SERVER_RECOVERING" | "CHESS_RATE_LIMITED" | "CHESS_INVALID_REQUEST";
export class ChessDomainError extends Error {
  constructor(public code: ChessErrorCode, message?: string) { super(message ?? code); }
}
