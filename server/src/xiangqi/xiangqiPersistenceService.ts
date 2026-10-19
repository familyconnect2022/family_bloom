import type { Firestore } from "firebase-admin/firestore";
import { XiangqiDomainError, type PersistedXiangqiGame } from "./xiangqiTypes.js";
import { inspectBoardGameActiveLock, resolveLiveBoardGameActiveLock } from "../games/boardGameActiveLock.js";
export class XiangqiPersistenceService {
  constructor(private db:Firestore){}
  gameRef(familyId:string,gameId:string){return this.db.doc(`families/${familyId}/xiangqiGames/${gameId}`);}
  lockRef(uid:string){return this.db.doc(`chessActiveUsers/${uid}`);}
  recoveryRef(uid:string,familyId:string){return this.db.doc(`xiangqiRecovery/${uid}/families/${familyId}`);}
  async createWithLocks(game:PersistedXiangqiGame){await this.db.runTransaction(async tx=>{const r=this.lockRef(game.redUid),b=this.lockRef(game.blackUid);const red=await inspectBoardGameActiveLock(tx,this.db,r),black=await inspectBoardGameActiveLock(tx,this.db,b);if(red.live||black.live)throw new XiangqiDomainError("XIANGQI_ALREADY_IN_GAME");tx.create(this.gameRef(game.familyId,game.id),game);const lock=(uid:string)=>({uid,familyId:game.familyId,gameId:game.id,gameKind:"xiangqi" as const,createdAt:game.createdAt});tx.set(r,lock(game.redUid),{merge:false});tx.set(b,lock(game.blackUid),{merge:false});});}
  async save(game:PersistedXiangqiGame){await this.gameRef(game.familyId,game.id).set(game,{merge:false});}
  async finish(game:PersistedXiangqiGame){const batch=this.db.batch();batch.set(this.gameRef(game.familyId,game.id),game,{merge:false});batch.delete(this.lockRef(game.redUid));batch.delete(this.lockRef(game.blackUid));const base={familyId:game.familyId,gameId:game.id,endedAt:game.endedAt,updatedAt:game.updatedAt};batch.set(this.recoveryRef(game.redUid,game.familyId),{...base,uid:game.redUid},{merge:false});batch.set(this.recoveryRef(game.blackUid,game.familyId),{...base,uid:game.blackUid},{merge:false});await batch.commit();}
  async load(familyId:string,gameId:string){const s=await this.gameRef(familyId,gameId).get();return s.exists?s.data() as PersistedXiangqiGame:null;}
  async getActiveForUid(uid:string){const d=await resolveLiveBoardGameActiveLock(this.db,uid) as {familyId:string;gameId:string;gameKind?:string}|null;return d?.gameKind==="xiangqi"?d:null;}
  async getAnyActiveForUid(uid:string){return resolveLiveBoardGameActiveLock(this.db,uid) as Promise<{familyId:string;gameId:string;gameKind?:string}|null>;}
  async getUnseenResult(uid:string,familyId:string){const s=await this.recoveryRef(uid,familyId).get();return s.exists?s.data() as {uid:string;familyId:string;gameId:string;endedAt:string|null;updatedAt:string}:null;}
  async acknowledgeResult(uid:string,familyId:string,gameId:string){const ref=this.recoveryRef(uid,familyId);await this.db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.exists&&(s.data() as {gameId?:string}).gameId===gameId)tx.delete(ref);});}
}
