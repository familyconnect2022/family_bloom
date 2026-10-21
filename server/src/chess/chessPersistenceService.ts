import type { Firestore } from "firebase-admin/firestore";
import { ChessDomainError, type PersistedGame } from "./chessTypes.js";
import { inspectBoardGameActiveLock, resolveLiveBoardGameActiveLock } from "../games/boardGameActiveLock.js";
import { finalizeInvitationWithGame } from "../games/firebaseInvitationMatch.js";

export class ChessPersistenceService {
  constructor(private db: Firestore) {}
  gameRef(familyId: string, gameId: string) { return this.db.doc(`families/${familyId}/chessGames/${gameId}`); }
  lockRef(uid: string) { return this.db.doc(`chessActiveUsers/${uid}`); }
  recoveryRef(uid: string, familyId: string) { return this.db.doc(`chessRecovery/${uid}/families/${familyId}`); }

  async createWithLocks(game: PersistedGame) {
    await this.db.runTransaction(async (tx) => {
      const whiteLock = this.lockRef(game.whiteUid); const blackLock = this.lockRef(game.blackUid);
      // Read and validate the referenced authoritative games, not just the lock
      // documents. A stale lock from an already-finished/deleted game is healed
      // in this same transaction instead of blocking the next match forever.
      const white = await inspectBoardGameActiveLock(tx, this.db, whiteLock);
      const black = await inspectBoardGameActiveLock(tx, this.db, blackLock);
      if (white.live || black.live) throw new ChessDomainError("CHESS_ALREADY_IN_GAME");
      tx.create(this.gameRef(game.familyId, game.id), game);
      tx.set(whiteLock, { uid: game.whiteUid, familyId: game.familyId, gameId: game.id, gameKind: "chess", createdAt: game.createdAt }, { merge: false });
      tx.set(blackLock, { uid: game.blackUid, familyId: game.familyId, gameId: game.id, gameKind: "chess", createdAt: game.createdAt }, { merge: false });
    });
  }

  async save(game: PersistedGame) { await this.gameRef(game.familyId, game.id).set(game, { merge: false }); }
  async finish(game: PersistedGame) {
    await this.db.runTransaction(async tx => {
      await finalizeInvitationWithGame(tx,this.db,game.familyId,game.id,[game.whiteUid,game.blackUid]);
      tx.set(this.gameRef(game.familyId,game.id),game,{merge:false});
      tx.delete(this.lockRef(game.whiteUid));tx.delete(this.lockRef(game.blackUid));
      const recovery={familyId:game.familyId,gameId:game.id,endedAt:game.endedAt,updatedAt:game.updatedAt};
      tx.set(this.recoveryRef(game.whiteUid,game.familyId),{...recovery,uid:game.whiteUid},{merge:false});
      tx.set(this.recoveryRef(game.blackUid,game.familyId),{...recovery,uid:game.blackUid},{merge:false});
    });
  }
  async load(familyId: string, gameId: string): Promise<PersistedGame | null> {
    const snap = await this.gameRef(familyId, gameId).get();
    return snap.exists ? snap.data() as PersistedGame : null;
  }
  async getActiveForUid(uid: string) {
    return resolveLiveBoardGameActiveLock(this.db, uid) as Promise<{ familyId: string; gameId: string; gameKind?: "chess" | "xiangqi" } | null>;
  }
  async getUnseenResult(uid: string, familyId: string) {
    const snap = await this.recoveryRef(uid, familyId).get();
    return snap.exists ? snap.data() as { uid: string; familyId: string; gameId: string; endedAt: string | null; updatedAt: string } : null;
  }
  async acknowledgeResult(uid: string, familyId: string, gameId: string) {
    const ref = this.recoveryRef(uid, familyId);
    await this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return;
      const current = snap.data() as { gameId?: string };
      if (current.gameId === gameId) tx.delete(ref);
    });
  }
}
