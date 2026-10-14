import type { XiangqiGameState, XiangqiMove } from "../games/xiangqi/xiangqiEngine";
export type XiangqiTimeControl =
  | { kind:"clocked"; initialMs:number; incrementMs:number }
  | { kind:"unlimited"; initialMs:null; incrementMs:0 };
export type XiangqiRealtimeStatus="waiting"|"active"|"paused"|"finished"|"cancelled";
export type XiangqiRealtimeResult="red"|"black"|"draw"|null;
export type XiangqiRealtimeFinishReason="general_captured"|"checkmate"|"stalemate"|"resignation"|"timeout"|"away_timeout"|"draw"|null;
export type XiangqiRealtimeState={
  gameId:string;familyId:string;redUid:string;blackUid:string;status:XiangqiRealtimeStatus;board:XiangqiGameState;revision:number;
  redRemainingMs:number|null;blackRemainingMs:number|null;timeControl:XiangqiTimeControl;result:XiangqiRealtimeResult;finishReason:XiangqiRealtimeFinishReason;
  testBotUid?:string|null;isTestGame?:boolean;createdAt:string;startedAt:string|null;endedAt:string|null;serverNowMs:number;
};
export type XiangqiMoveDelta={gameId:string;clientMoveId:string;version:number;move:XiangqiMove;board:XiangqiGameState;redRemainingMs:number|null;blackRemainingMs:number|null;status:XiangqiRealtimeStatus;result:XiangqiRealtimeResult;finishReason:XiangqiRealtimeFinishReason;serverNowMs:number;endedAt:string|null};
export type XiangqiAck<T=undefined>=T extends undefined?{ok:true}|{ok:false;errorCode:string;message?:string}:{ok:true;data:T}|{ok:false;errorCode:string;message?:string};
export const XIANGQI_EVENTS={
 appJoin:"xiangqi:app:join",appLeave:"xiangqi:app:leave",lobbyJoin:"xiangqi:lobby:join",lobbyLeave:"xiangqi:lobby:leave",presenceUpdate:"xiangqi:presence:update",
 inviteCreate:"xiangqi:invite:create",inviteReceived:"xiangqi:invite:received",inviteAccept:"xiangqi:invite:accept",inviteReject:"xiangqi:invite:reject",inviteCancel:"xiangqi:invite:cancel",inviteExpired:"xiangqi:invite:expired",inviteRejected:"xiangqi:invite:rejected",
 testBotInvite:"xiangqi:test:bot:invite",gameJoin:"xiangqi:game:join",gameState:"xiangqi:game:state",gameMove:"xiangqi:game:move",gameMoveApplied:"xiangqi:game:moveApplied",gameReady:"xiangqi:game:ready",gameResign:"xiangqi:game:resign",gameBoardPresence:"xiangqi:game:boardPresence",gameResync:"xiangqi:game:resync",gameRematch:"xiangqi:game:rematch",sessionRecover:"xiangqi:session:recover",gameResultAck:"xiangqi:game:resultAck",
} as const;
export const XIANGQI_TIME_CONTROLS=[
 {id:"3+2",label:"Siêu nhanh · 3+2",value:{kind:"clocked",initialMs:180000,incrementMs:2000} as XiangqiTimeControl},
 {id:"5+0",label:"Nhanh · 5+0",value:{kind:"clocked",initialMs:300000,incrementMs:0} as XiangqiTimeControl},
 {id:"10+0",label:"Nhanh · 10+0",value:{kind:"clocked",initialMs:600000,incrementMs:0} as XiangqiTimeControl},
 {id:"10+5",label:"Nhanh +5 · 10+5",value:{kind:"clocked",initialMs:600000,incrementMs:5000} as XiangqiTimeControl},
 {id:"unlimited",label:"Không giờ",value:{kind:"unlimited",initialMs:null,incrementMs:0} as XiangqiTimeControl},
];
