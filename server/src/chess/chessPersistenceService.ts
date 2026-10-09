import type { Firestore } from "firebase-admin/firestore";
import { ChessDomainError, type PersistedGame } from "./chessTypes.js";

export class ChessPersistenceService {
  constructor(private db: Firestore) {}
  gameRef(familyId: string, gameId: string) { return this.db.doc(`families/${familyId}/chessGames/${gameId}`); }
  lockRef(uid: string) { return this.db.doc(`chessActiveUsers/${uid}`); }
  recoveryRef(uid: string, familyId: string) { return this.db.doc(`chessRecovery/${uid}/families/${familyId}`); }

  async createWithLocks(game: PersistedGame) {
    await this.db.runTransaction(async (tx) => {
      const whiteLock = this.lockRef(game.whiteUid); const blackLock = this.lockRef(game.blackUid);
      const [w, b] = await Promise.all([tx.get(whiteLock), tx.get(blackLock)]);
      if (w.exists || b.exists) throw new ChessDomainError("CHESS_ALREADY_IN_GAME");
      tx.create(this.gameRef(game.familyId, game.id), game);
      tx.create(whiteLock, { uid: game.whiteUid, familyId: game.familyId, gameId: game.id, gameKind: "chess", createdAt: game.createdAt });
      tx.create(blackLock, { uid: game.blackUid, familyId: game.familyId, gameId: game.id, gameKind: "chess", createdAt: game.createdAt });
    });
  }

  async save(game: PersistedGame) { await this.gameRef(game.familyId, game.id).set(game, { merge: false }); }
  async finish(game: PersistedGame) {
    const batch = this.db.batch();
    batch.set(this.gameRef(game.familyId, game.id), game, { merge: false });
    batch.delete(this.lockRef(game.whiteUid)); batch.delete(this.lockRef(game.blackUid));
    const recovery = { familyId: game.familyId, gameId: game.id, endedAt: game.endedAt, updatedAt: game.updatedAt };
    batch.set(this.recoveryRef(game.whiteUid, game.familyId), { ...recovery, uid: game.whiteUid }, { merge: false });
    batch.set(this.recoveryRef(game.blackUid, game.familyId), { ...recovery, uid: game.blackUid }, { merge: false });
    await batch.commit();
  }
  async load(familyId: string, gameId: string): Promise<PersistedGame | null> {
    const snap = await this.gameRef(familyId, gameId).get();
    return snap.exists ? snap.data() as PersistedGame : null;
  }
  async getActiveForUid(uid: string) {
    const snap = await this.lockRef(uid).get();
    return snap.exists ? snap.data() as { familyId: string; gameId: string; gameKind?: "chess" | "xiangqi" } : null;
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
