export type XiangqiColor = "red" | "black";
export type XiangqiPieceType = "general" | "advisor" | "elephant" | "horse" | "chariot" | "cannon" | "soldier";
export type XiangqiPiece = { id:string; color:XiangqiColor; type:XiangqiPieceType; col:number; row:number };
export type XiangqiMove = { pieceId:string; from:{col:number;row:number}; to:{col:number;row:number}; capturedId?:string };
export type XiangqiTimeControl =
  | { kind:"clocked"; initialMs:number; incrementMs:number }
  | { kind:"unlimited"; initialMs:null; incrementMs:0 };
export type XiangqiGameStatus = "waiting"|"active"|"paused"|"finished"|"cancelled";
export type XiangqiResult = "red"|"black"|"draw"|null;
export type XiangqiFinishReason = "general_captured"|"checkmate"|"stalemate"|"resignation"|"timeout"|"away_timeout"|"draw"|null;
export type XiangqiBoardState = {
  pieces:XiangqiPiece[]; turn:XiangqiColor; moveNumber:number; lastMove:XiangqiMove|null;
  inCheck:XiangqiColor|null; winner:XiangqiColor|null; finishReason:Exclude<XiangqiFinishReason,"resignation"|"away_timeout"|"draw">; gameOver:boolean;
};
export type PersistedXiangqiGame = {
  id:string; familyId:string; redUid:string; blackUid:string; playerUids:string[];
  status:XiangqiGameStatus; board:XiangqiBoardState; revision:number;
  redRemainingMs:number|null; blackRemainingMs:number|null; timeControl:XiangqiTimeControl;
  result:XiangqiResult; finishReason:XiangqiFinishReason; recentRequestIds:string[];
  testBotUid?:string|null; isTestGame?:boolean;
  createdAt:string; startedAt:string|null; endedAt:string|null; updatedAt:string;
};
export type PublicXiangqiGameState = Omit<PersistedXiangqiGame,"id"|"playerUids"|"recentRequestIds"|"updatedAt"> & {
  gameId:string; serverNowMs:number;
};
export type XiangqiMoveDelta = {
  gameId:string; clientMoveId:string; version:number; move:XiangqiMove; board:XiangqiBoardState;
  redRemainingMs:number|null; blackRemainingMs:number|null; status:XiangqiGameStatus; result:XiangqiResult;
  finishReason:XiangqiFinishReason; serverNowMs:number; endedAt:string|null;
};
export type XiangqiMoveAck = { clientMoveId:string; version:number; duplicate?:boolean };
export type XiangqiErrorCode =
  | "XIANGQI_UNAUTHORIZED" | "XIANGQI_NOT_FAMILY_MEMBER" | "XIANGQI_GAME_NOT_FOUND" | "XIANGQI_NOT_PLAYER"
  | "XIANGQI_NOT_YOUR_TURN" | "XIANGQI_ILLEGAL_MOVE" | "XIANGQI_GAME_FINISHED" | "XIANGQI_ALREADY_IN_GAME"
  | "XIANGQI_INVITE_EXPIRED" | "XIANGQI_PLAYER_OFFLINE" | "XIANGQI_STATE_CONFLICT" | "XIANGQI_SERVER_RECOVERING"
  | "XIANGQI_RATE_LIMITED" | "XIANGQI_QUIET_HOURS" | "XIANGQI_TEST_BOT_DISABLED" | "XIANGQI_INVALID_REQUEST";
export class XiangqiDomainError extends Error { constructor(public code:XiangqiErrorCode, message?:string){ super(message ?? code); } }
