/**
 * Pure Xiangqi protocol shapes shared by the client transport/test harness.
 * This file intentionally contains no move engine, renderer, React code, or UI lifecycle.
 * Server remains authoritative for Xiangqi rules and persistence.
 */
export type XiangqiColor = "red" | "black";
export type XiangqiPieceType = "general" | "advisor" | "elephant" | "chariot" | "horse" | "cannon" | "soldier";

export type XiangqiPieceModel = {
  id: string;
  color: XiangqiColor;
  type: XiangqiPieceType;
  col: number;
  row: number;
};

export type XiangqiMove = {
  pieceId: string;
  from: { col: number; row: number };
  to: { col: number; row: number };
  capturedId?: string;
};

export type XiangqiBoardFinishReason = "general_captured" | "checkmate" | "stalemate" | "timeout" | null;

export type XiangqiGameState = {
  pieces: XiangqiPieceModel[];
  turn: XiangqiColor;
  moveNumber: number;
  lastMove: XiangqiMove | null;
  inCheck: XiangqiColor | null;
  winner: XiangqiColor | null;
  finishReason: XiangqiBoardFinishReason;
  gameOver: boolean;
};
