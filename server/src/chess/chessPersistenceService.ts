import type { Firestore } from "firebase-admin/firestore";
import { ChessDomainError, type PersistedGame } from "./chessTypes.js";

export class ChessPersistenceService {
  constructor(private db: Firestore) {}
  gameRef(familyId: string, gameId: string) { return this.db.doc(`families/${familyId}/chessGames/${gameId}`); }
  lockRef(uid: string) { return this.db.doc(`chessActiveUsers/${uid}`); }

  async createWithLocks(game: PersistedGame) {
    await this.db.runTransaction(async (tx) => {
      const whiteLock = this.lockRef(game.whiteUid); const blackLock = this.lockRef(game.blackUid);
      const [w, b] = await Promise.all([tx.get(whiteLock), tx.get(blackLock)]);
      if (w.exists || b.exists) throw new ChessDomainError("CHESS_ALREADY_IN_GAME");
      tx.create(this.gameRef(game.familyId, game.id), game);
      tx.create(whiteLock, { uid: game.whiteUid, familyId: game.familyId, gameId: game.id, createdAt: game.createdAt });
      tx.create(blackLock, { uid: game.blackUid, familyId: game.familyId, gameId: game.id, createdAt: game.createdAt });
    });
  }

  async save(game: PersistedGame) { await this.gameRef(game.familyId, game.id).set(game, { merge: false }); }
  async finish(game: PersistedGame) {
    const batch = this.db.batch();
    batch.set(this.gameRef(game.familyId, game.id), game, { merge: false });
    batch.delete(this.lockRef(game.whiteUid)); batch.delete(this.lockRef(game.blackUid));
    await batch.commit();
  }
  async load(familyId: string, gameId: string): Promise<PersistedGame | null> {
    const snap = await this.gameRef(familyId, gameId).get();
    return snap.exists ? snap.data() as PersistedGame : null;
  }
  async getActiveForUid(uid: string) {
    const snap = await this.lockRef(uid).get();
    return snap.exists ? snap.data() as { familyId: string; gameId: string } : null;
  }
}
