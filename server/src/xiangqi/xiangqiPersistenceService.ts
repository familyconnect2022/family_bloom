import type { Firestore } from "firebase-admin/firestore";
import { XiangqiDomainError, type PersistedXiangqiGame } from "./xiangqiTypes.js";
export class XiangqiPersistenceService {
  constructor(private db:Firestore){}
  gameRef(familyId:string,gameId:string){return this.db.doc(`families/${familyId}/xiangqiGames/${gameId}`);}
  lockRef(uid:string){return this.db.doc(`chessActiveUsers/${uid}`);}
  recoveryRef(uid:string,familyId:string){return this.db.doc(`xiangqiRecovery/${uid}/families/${familyId}`);}
  async createWithLocks(game:PersistedXiangqiGame){await this.db.runTransaction(async tx=>{const r=this.lockRef(game.redUid),b=this.lockRef(game.blackUid);const [rs,bs]=await Promise.all([tx.get(r),tx.get(b)]);if(rs.exists||bs.exists)throw new XiangqiDomainError("XIANGQI_ALREADY_IN_GAME");tx.create(this.gameRef(game.familyId,game.id),game);const lock=(uid:string)=>({uid,familyId:game.familyId,gameId:game.id,gameKind:"xiangqi",createdAt:game.createdAt});tx.create(r,lock(game.redUid));tx.create(b,lock(game.blackUid));});}
  async save(game:PersistedXiangqiGame){await this.gameRef(game.familyId,game.id).set(game,{merge:false});}
  async finish(game:PersistedXiangqiGame){const batch=this.db.batch();batch.set(this.gameRef(game.familyId,game.id),game,{merge:false});batch.delete(this.lockRef(game.redUid));batch.delete(this.lockRef(game.blackUid));const base={familyId:game.familyId,gameId:game.id,endedAt:game.endedAt,updatedAt:game.updatedAt};batch.set(this.recoveryRef(game.redUid,game.familyId),{...base,uid:game.redUid},{merge:false});batch.set(this.recoveryRef(game.blackUid,game.familyId),{...base,uid:game.blackUid},{merge:false});await batch.commit();}
  async load(familyId:string,gameId:string){const s=await this.gameRef(familyId,gameId).get();return s.exists?s.data() as PersistedXiangqiGame:null;}
  async getActiveForUid(uid:string){const s=await this.lockRef(uid).get();if(!s.exists)return null;const d=s.data() as {familyId:string;gameId:string;gameKind?:string};return d.gameKind==="xiangqi"?d:null;}
  async getAnyActiveForUid(uid:string){const s=await this.lockRef(uid).get();return s.exists?s.data() as {familyId:string;gameId:string;gameKind?:string}:null;}
  async getUnseenResult(uid:string,familyId:string){const s=await this.recoveryRef(uid,familyId).get();return s.exists?s.data() as {uid:string;familyId:string;gameId:string;endedAt:string|null;updatedAt:string}:null;}
  async acknowledgeResult(uid:string,familyId:string,gameId:string){const ref=this.recoveryRef(uid,familyId);await this.db.runTransaction(async tx=>{const s=await tx.get(ref);if(s.exists&&(s.data() as {gameId?:string}).gameId===gameId)tx.delete(ref);});}
}
