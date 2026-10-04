export type ChessColor = "w" | "b";
export type ChessPresenceStatus = "offline" | "online_app" | "in_lobby" | "in_game" | "busy" | "reconnecting";
export type ChessGameStatus = "waiting" | "active" | "paused" | "finished" | "cancelled";
export type ChessResult = "white" | "black" | "draw" | null;
export type ChessFinishReason =
  | "checkmate" | "resignation" | "timeout" | "stalemate" | "draw"
  | "insufficient_material" | "threefold_repetition" | "fifty_move_rule" | "abandoned" | null;

export type ChessTimeControl =
  | { kind: "clocked"; initialMs: number; incrementMs: number }
  | { kind: "unlimited"; initialMs: null; incrementMs: 0 };

export type ChessPromotionPiece = "q" | "r" | "b" | "n";
export type ChessMoveHint = { from: string; to: string; promotion?: ChessPromotionPiece };
export type ChessLastMove = ChessMoveHint & { san: string };
export type ChessCapturedPiece = "p" | "n" | "b" | "r" | "q";
export type ChessCaptureCounts = Record<ChessCapturedPiece, number>;
export type ChessCaptureSummary = { byWhite: ChessCaptureCounts; byBlack: ChessCaptureCounts };

export const EMPTY_CHESS_CAPTURE_COUNTS: ChessCaptureCounts = { p: 0, n: 0, b: 0, r: 0, q: 0 };
export const emptyChessCaptureSummary = (): ChessCaptureSummary => ({
  byWhite: { ...EMPTY_CHESS_CAPTURE_COUNTS },
  byBlack: { ...EMPTY_CHESS_CAPTURE_COUNTS },
});

/**
 * Full authoritative snapshot used only for join / reconnect / resync / rare
 * non-move mutations. Hot-path move packets intentionally do not carry PGN or
 * the full legal-move list; the client derives UI legality with local chess.js.
 */
export type ChessGameState = {
  gameId: string;
  familyId: string;
  whiteUid: string;
  blackUid: string;
  status: ChessGameStatus;
  fen: string;
  turn: ChessColor;
  revision: number;
  ply: number;
  whiteRemainingMs: number | null;
  blackRemainingMs: number | null;
  timeControl: ChessTimeControl;
  result: ChessResult;
  finishReason: ChessFinishReason;
  lastMove: ChessLastMove | null;
  checkSquare: string | null;
  captureSummary: ChessCaptureSummary;
  drawOfferByUid: string | null;
  serverNowMs: number;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  testBotUid?: string | null;
  isTestGame?: boolean;
};

export type ChessAppliedMove = {
  from: string;
  to: string;
  san: string;
  color: ChessColor;
  piece: "p" | "n" | "b" | "r" | "q" | "k";
  flags: string;
  captured?: ChessCapturedPiece;
  promotion?: ChessPromotionPiece;
};

/** Tiny authoritative delta broadcast once per accepted move. */
export type ChessMoveDelta = {
  gameId: string;
  clientMoveId: string;
  version: number;
  ply: number;
  move: ChessAppliedMove;
  fen: string;
  turn: ChessColor;
  whiteRemainingMs: number | null;
  blackRemainingMs: number | null;
  checkSquare: string | null;
  status: ChessGameStatus;
  result: ChessResult;
  finishReason: ChessFinishReason;
  drawOfferByUid: string | null;
  serverNowMs: number;
  endedAt: string | null;
};

/** Small ACK for a move command. Board truth arrives through gameMoveApplied. */
export type ChessMoveCommandAck = {
  clientMoveId: string;
  version: number;
  duplicate?: boolean;
};

export function applyChessMoveDelta(current: ChessGameState, delta: ChessMoveDelta): ChessGameState {
  if (current.gameId !== delta.gameId || delta.version < current.revision) return current;
  const captureSummary = current.captureSummary ?? emptyChessCaptureSummary();
  return {
    ...current,
    status: delta.status,
    fen: delta.fen,
    turn: delta.turn,
    revision: delta.version,
    ply: delta.ply,
    whiteRemainingMs: delta.whiteRemainingMs,
    blackRemainingMs: delta.blackRemainingMs,
    result: delta.result,
    finishReason: delta.finishReason,
    lastMove: {
      from: delta.move.from,
      to: delta.move.to,
      san: delta.move.san,
      ...(delta.move.promotion ? { promotion: delta.move.promotion } : {}),
    },
    checkSquare: delta.checkSquare,
    captureSummary: delta.move.captured
      ? {
          byWhite: delta.move.color === "w"
            ? { ...captureSummary.byWhite, [delta.move.captured]: captureSummary.byWhite[delta.move.captured] + 1 }
            : captureSummary.byWhite,
          byBlack: delta.move.color === "b"
            ? { ...captureSummary.byBlack, [delta.move.captured]: captureSummary.byBlack[delta.move.captured] + 1 }
            : captureSummary.byBlack,
        }
      : captureSummary,
    drawOfferByUid: delta.drawOfferByUid,
    serverNowMs: delta.serverNowMs,
    endedAt: delta.endedAt,
  };
}

export type ChessPresence = { uid: string; status: ChessPresenceStatus };
export type ChessInviteRejected = { inviteId: string; byUid: string };
export type ChessInvite = {
  inviteId: string;
  familyId: string;
  fromUid: string;
  toUid: string;
  timeControl: ChessTimeControl;
  expiresAt: number;
  isTestBot?: boolean;
  fromDisplayName?: string;
};

export type ChessErrorCode =
  | "CHESS_UNAUTHORIZED" | "CHESS_NOT_FAMILY_MEMBER" | "CHESS_GAME_NOT_FOUND"
  | "CHESS_NOT_PLAYER" | "CHESS_NOT_YOUR_TURN" | "CHESS_ILLEGAL_MOVE"
  | "CHESS_GAME_FINISHED" | "CHESS_ALREADY_IN_GAME" | "CHESS_INVITE_EXPIRED"
  | "CHESS_PLAYER_OFFLINE" | "CHESS_INVALID_PROMOTION" | "CHESS_STATE_CONFLICT"
  | "CHESS_SERVER_RECOVERING" | "CHESS_RATE_LIMITED" | "CHESS_QUIET_HOURS" | "CHESS_TEST_BOT_DISABLED" | "CHESS_INVALID_REQUEST";

export type ChessAck<T = undefined> = T extends undefined
  ? { ok: true } | { ok: false; errorCode: ChessErrorCode; message?: string }
  : { ok: true; data: T } | { ok: false; errorCode: ChessErrorCode; message?: string };

export const CHESS_TIME_CONTROLS: { id: string; label: string; value: ChessTimeControl }[] = [
  { id: "3+2", label: "3 + 2", value: { kind: "clocked", initialMs: 180_000, incrementMs: 2_000 } },
  { id: "5+0", label: "5 + 0", value: { kind: "clocked", initialMs: 300_000, incrementMs: 0 } },
  { id: "10+0", label: "10 + 0", value: { kind: "clocked", initialMs: 600_000, incrementMs: 0 } },
  { id: "10+5", label: "10 + 5", value: { kind: "clocked", initialMs: 600_000, incrementMs: 5_000 } },
  { id: "unlimited", label: "Không giờ", value: { kind: "unlimited", initialMs: null, incrementMs: 0 } },
];

export const CHESS_ERROR_COPY: Record<ChessErrorCode, string> = {
  CHESS_UNAUTHORIZED: "Phiên đăng nhập đã hết hạn.",
  CHESS_NOT_FAMILY_MEMBER: "Bạn không còn là thành viên của nhà này.",
  CHESS_GAME_NOT_FOUND: "Không tìm thấy ván cờ.",
  CHESS_NOT_PLAYER: "Bạn không thuộc ván cờ này.",
  CHESS_NOT_YOUR_TURN: "Chưa đến lượt bạn.",
  CHESS_ILLEGAL_MOVE: "Nước đi này không hợp lệ.",
  CHESS_GAME_FINISHED: "Ván cờ đã kết thúc.",
  CHESS_ALREADY_IN_GAME: "Bạn đang có một ván cờ realtime khác.",
  CHESS_INVITE_EXPIRED: "Lời thách đấu đã hết hạn.",
  CHESS_PLAYER_OFFLINE: "Người thân hiện không online trong Family Bloom.",
  CHESS_INVALID_PROMOTION: "Quân phong cấp không hợp lệ.",
  CHESS_STATE_CONFLICT: "Trạng thái ván đã thay đổi. Bloom sẽ đồng bộ lại.",
  CHESS_SERVER_RECOVERING: "Máy chủ đang khôi phục ván cờ.",
  CHESS_RATE_LIMITED: "Bạn thao tác hơi nhanh. Thử lại sau một chút nhé.",
  CHESS_QUIET_HOURS: "Nhà mình nghỉ ngơi nhé 🌙 Mình hẹn nhau chơi tiếp từ 6:00 sáng.",
  CHESS_TEST_BOT_DISABLED: "Đối thủ thử nghiệm đang được tắt trên máy chủ.",
  CHESS_INVALID_REQUEST: "Yêu cầu cờ vua không hợp lệ.",
};

export const CHESS_EVENTS = {
  appJoin: "chess:app:join",
  appLeave: "chess:app:leave",
  lobbyJoin: "chess:lobby:join",
  lobbyLeave: "chess:lobby:leave",
  presenceUpdate: "chess:presence:update",
  inviteCreate: "chess:invite:create",
  inviteReceived: "chess:invite:received",
  inviteAccept: "chess:invite:accept",
  inviteReject: "chess:invite:reject",
  inviteCancel: "chess:invite:cancel",
  inviteExpired: "chess:invite:expired",
  inviteRejected: "chess:invite:rejected",
  gameJoin: "chess:game:join",
  gameState: "chess:game:state",
  gameMove: "chess:game:move",
  gameMoveApplied: "chess:game:moveApplied",
  gameResign: "chess:game:resign",
  drawOffer: "chess:draw:offer",
  drawAccept: "chess:draw:accept",
  drawReject: "chess:draw:reject",
  gameRematch: "chess:game:rematch",
  gameOver: "chess:game:gameOver",
  gameResync: "chess:game:resync",
  sessionGetActive: "chess:session:getActive",
  testBotInvite: "chess:test:bot:invite",
  serverError: "server:error",
} as const;

export const CHESS_TEST_BOT_UID_PREFIX = "__bloom_test_bot__";
export const isChessTestBotUid = (uid: string | null | undefined) => !!uid && uid.startsWith(CHESS_TEST_BOT_UID_PREFIX);
