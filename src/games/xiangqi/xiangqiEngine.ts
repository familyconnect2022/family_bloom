import type { XiangqiColor, XiangqiPieceType } from "../../components/xiangqi/XiangqiPiece";

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

export type XiangqiFinishReason = "general_captured" | "checkmate" | "stalemate" | "resign" | "timeout";

export type XiangqiGameState = {
  pieces: XiangqiPieceModel[];
  turn: XiangqiColor;
  moveNumber: number;
  lastMove: XiangqiMove | null;
  inCheck: XiangqiColor | null;
  winner: XiangqiColor | null;
  finishReason: XiangqiFinishReason | null;
  gameOver: boolean;
};

const BACK_RANK: XiangqiPieceType[] = ["chariot", "horse", "elephant", "advisor", "general", "advisor", "elephant", "horse", "chariot"];
const PIECE_VALUE: Record<XiangqiPieceType, number> = {
  general: 1000,
  chariot: 9,
  cannon: 5,
  horse: 4,
  elephant: 2,
  advisor: 2,
  soldier: 1,
};

const otherColor = (color: XiangqiColor): XiangqiColor => color === "red" ? "black" : "red";
const inside = (col: number, row: number) => col >= 0 && col <= 8 && row >= 0 && row <= 9;

export const createInitialXiangqiPieces = (): XiangqiPieceModel[] => [
  ...BACK_RANK.map((type, col) => ({ id: `b-back-${col}`, color: "black" as const, type, col, row: 0 })),
  { id: "b-cannon-1", color: "black", type: "cannon", col: 1, row: 2 },
  { id: "b-cannon-7", color: "black", type: "cannon", col: 7, row: 2 },
  ...[0, 2, 4, 6, 8].map((col, index) => ({ id: `b-soldier-${index}`, color: "black" as const, type: "soldier" as const, col, row: 3 })),
  ...[0, 2, 4, 6, 8].map((col, index) => ({ id: `r-soldier-${index}`, color: "red" as const, type: "soldier" as const, col, row: 6 })),
  { id: "r-cannon-1", color: "red", type: "cannon", col: 1, row: 7 },
  { id: "r-cannon-7", color: "red", type: "cannon", col: 7, row: 7 },
  ...BACK_RANK.map((type, col) => ({ id: `r-back-${col}`, color: "red" as const, type, col, row: 9 })),
];

export const createInitialXiangqiState = (): XiangqiGameState => ({
  pieces: createInitialXiangqiPieces(),
  turn: "red",
  moveNumber: 1,
  lastMove: null,
  inCheck: null,
  winner: null,
  finishReason: null,
  gameOver: false,
});

const pieceAt = (pieces: readonly XiangqiPieceModel[], col: number, row: number) => pieces.find((piece) => piece.col === col && piece.row === row);

const inPalace = (color: XiangqiColor, col: number, row: number) => {
  if (col < 3 || col > 5) return false;
  return color === "black" ? row >= 0 && row <= 2 : row >= 7 && row <= 9;
};

const elephantSideOk = (color: XiangqiColor, row: number) => color === "black" ? row <= 4 : row >= 5;
const crossedRiver = (color: XiangqiColor, row: number) => color === "black" ? row >= 5 : row <= 4;

type Square = { col: number; row: number };

function pushIfAvailable(out: Square[], pieces: readonly XiangqiPieceModel[], piece: XiangqiPieceModel, col: number, row: number) {
  if (!inside(col, row)) return;
  const target = pieceAt(pieces, col, row);
  if (!target || target.color !== piece.color) out.push({ col, row });
}

function pseudoMovesForPiece(pieces: readonly XiangqiPieceModel[], piece: XiangqiPieceModel): Square[] {
  const out: Square[] = [];
  const { col, row, color, type } = piece;

  if (type === "general") {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const c = col + dc;
      const r = row + dr;
      if (inPalace(color, c, r)) pushIfAvailable(out, pieces, piece, c, r);
    }
    const enemyGeneral = pieces.find((item) => item.color !== color && item.type === "general");
    if (enemyGeneral && enemyGeneral.col === col) {
      const minRow = Math.min(row, enemyGeneral.row) + 1;
      const maxRow = Math.max(row, enemyGeneral.row);
      let blocked = false;
      for (let r = minRow; r < maxRow; r += 1) {
        if (pieceAt(pieces, col, r)) { blocked = true; break; }
      }
      if (!blocked) out.push({ col: enemyGeneral.col, row: enemyGeneral.row });
    }
    return out;
  }

  if (type === "advisor") {
    for (const [dc, dr] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
      const c = col + dc;
      const r = row + dr;
      if (inPalace(color, c, r)) pushIfAvailable(out, pieces, piece, c, r);
    }
    return out;
  }

  if (type === "elephant") {
    for (const [dc, dr] of [[2, 2], [2, -2], [-2, 2], [-2, -2]] as const) {
      const c = col + dc;
      const r = row + dr;
      if (!inside(c, r) || !elephantSideOk(color, r)) continue;
      if (pieceAt(pieces, col + dc / 2, row + dr / 2)) continue;
      pushIfAvailable(out, pieces, piece, c, r);
    }
    return out;
  }

  if (type === "horse") {
    const candidates = [
      { dc: 2, dr: 1, lc: 1, lr: 0 }, { dc: 2, dr: -1, lc: 1, lr: 0 },
      { dc: -2, dr: 1, lc: -1, lr: 0 }, { dc: -2, dr: -1, lc: -1, lr: 0 },
      { dc: 1, dr: 2, lc: 0, lr: 1 }, { dc: -1, dr: 2, lc: 0, lr: 1 },
      { dc: 1, dr: -2, lc: 0, lr: -1 }, { dc: -1, dr: -2, lc: 0, lr: -1 },
    ];
    for (const item of candidates) {
      if (pieceAt(pieces, col + item.lc, row + item.lr)) continue;
      pushIfAvailable(out, pieces, piece, col + item.dc, row + item.dr);
    }
    return out;
  }

  if (type === "chariot" || type === "cannon") {
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      let c = col + dc;
      let r = row + dr;
      let screenSeen = false;
      while (inside(c, r)) {
        const target = pieceAt(pieces, c, r);
        if (type === "chariot") {
          if (!target) out.push({ col: c, row: r });
          else {
            if (target.color !== color) out.push({ col: c, row: r });
            break;
          }
        } else if (!screenSeen) {
          if (!target) out.push({ col: c, row: r });
          else screenSeen = true;
        } else if (target) {
          if (target.color !== color) out.push({ col: c, row: r });
          break;
        }
        c += dc;
        r += dr;
      }
    }
    return out;
  }

  if (type === "soldier") {
    const forward = color === "red" ? -1 : 1;
    pushIfAvailable(out, pieces, piece, col, row + forward);
    if (crossedRiver(color, row)) {
      pushIfAvailable(out, pieces, piece, col - 1, row);
      pushIfAvailable(out, pieces, piece, col + 1, row);
    }
    return out;
  }

  return out;
}

function applyUnchecked(pieces: readonly XiangqiPieceModel[], pieceId: string, to: Square) {
  const mover = pieces.find((piece) => piece.id === pieceId);
  if (!mover) return { pieces: [...pieces], captured: undefined as XiangqiPieceModel | undefined };
  const captured = pieceAt(pieces, to.col, to.row);
  return {
    captured,
    pieces: pieces
      .filter((piece) => piece.id !== captured?.id)
      .map((piece) => piece.id === pieceId ? { ...piece, col: to.col, row: to.row } : piece),
  };
}

export function isXiangqiInCheck(pieces: readonly XiangqiPieceModel[], color: XiangqiColor): boolean {
  const general = pieces.find((piece) => piece.color === color && piece.type === "general");
  if (!general) return true;
  const enemy = otherColor(color);
  return pieces
    .filter((piece) => piece.color === enemy)
    .some((piece) => pseudoMovesForPiece(pieces, piece).some((target) => target.col === general.col && target.row === general.row));
}

export function getXiangqiLegalMoves(state: Pick<XiangqiGameState, "pieces" | "turn" | "gameOver">, pieceId: string): Square[] {
  if (state.gameOver) return [];
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || piece.color !== state.turn) return [];
  return pseudoMovesForPiece(state.pieces, piece).filter((to) => {
    const next = applyUnchecked(state.pieces, piece.id, to).pieces;
    return !isXiangqiInCheck(next, piece.color);
  });
}

export function getAllXiangqiLegalMoves(state: Pick<XiangqiGameState, "pieces" | "turn" | "gameOver">): XiangqiMove[] {
  if (state.gameOver) return [];
  const moves: XiangqiMove[] = [];
  for (const piece of state.pieces.filter((item) => item.color === state.turn)) {
    for (const to of getXiangqiLegalMoves(state, piece.id)) {
      const target = pieceAt(state.pieces, to.col, to.row);
      moves.push({ pieceId: piece.id, from: { col: piece.col, row: piece.row }, to, capturedId: target?.id });
    }
  }
  return moves;
}

export function playXiangqiMove(state: XiangqiGameState, pieceId: string, to: Square): XiangqiGameState {
  if (state.gameOver) return state;
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece || piece.color !== state.turn) return state;
  const legal = getXiangqiLegalMoves(state, pieceId);
  if (!legal.some((square) => square.col === to.col && square.row === to.row)) return state;

  const from = { col: piece.col, row: piece.row };
  const applied = applyUnchecked(state.pieces, pieceId, to);
  const nextTurn = otherColor(state.turn);
  const move: XiangqiMove = { pieceId, from, to, capturedId: applied.captured?.id };

  if (applied.captured?.type === "general") {
    return {
      ...state,
      pieces: applied.pieces,
      lastMove: move,
      moveNumber: state.moveNumber + 1,
      inCheck: null,
      winner: state.turn,
      finishReason: "general_captured",
      gameOver: true,
    };
  }

  const probe: XiangqiGameState = {
    ...state,
    pieces: applied.pieces,
    turn: nextTurn,
    moveNumber: state.moveNumber + 1,
    lastMove: move,
    inCheck: isXiangqiInCheck(applied.pieces, nextTurn) ? nextTurn : null,
    winner: null,
    finishReason: null,
    gameOver: false,
  };

  const replies = getAllXiangqiLegalMoves(probe);
  if (replies.length === 0) {
    return {
      ...probe,
      winner: state.turn,
      finishReason: probe.inCheck ? "checkmate" : "stalemate",
      gameOver: true,
    };
  }
  return probe;
}

export function resignXiangqi(state: XiangqiGameState, color: XiangqiColor): XiangqiGameState {
  if (state.gameOver) return state;
  return { ...state, winner: otherColor(color), finishReason: "resign", gameOver: true };
}

export function timeoutXiangqi(state: XiangqiGameState, color: XiangqiColor): XiangqiGameState {
  if (state.gameOver) return state;
  return { ...state, winner: otherColor(color), finishReason: "timeout", gameOver: true };
}

export function chooseXiangqiBotMove(state: XiangqiGameState): XiangqiMove | null {
  if (state.gameOver || state.turn !== "black") return null;
  const moves = getAllXiangqiLegalMoves(state);
  if (!moves.length) return null;
  const scored = moves.map((move) => {
    const captured = move.capturedId ? state.pieces.find((piece) => piece.id === move.capturedId) : null;
    const after = playXiangqiMove(state, move.pieceId, move.to);
    let score = captured ? PIECE_VALUE[captured.type] * 100 : 0;
    if (after.gameOver && after.winner === "black") score += 100_000;
    else if (after.inCheck === "red") score += 35;
    score += 4 - Math.abs(4 - move.to.col) * 0.15;
    score -= move.to.row * 0.001;
    return { move, score };
  });
  scored.sort((a, b) => b.score - a.score || a.move.pieceId.localeCompare(b.move.pieceId) || a.move.to.row - b.move.to.row || a.move.to.col - b.move.to.col);
  return scored[0]?.move ?? null;
}

export function xiangqiFinishCopy(state: XiangqiGameState) {
  if (!state.gameOver) return null;
  const reason = state.finishReason === "checkmate"
    ? "Chiếu bí"
    : state.finishReason === "stalemate"
      ? "Không còn nước hợp lệ"
      : state.finishReason === "resign"
        ? "Đã đầu hàng"
        : state.finishReason === "timeout"
          ? "Hết giờ"
          : "Tướng đã bị bắt";
  return { winner: state.winner, reason };
}

export const XIANGQI_ENGINE_VERSION = "16B-local-rules-v1";
