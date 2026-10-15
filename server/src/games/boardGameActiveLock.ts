import type { DocumentReference, Firestore, Transaction } from "firebase-admin/firestore";

export type BoardGameActiveLock = {
  uid: string;
  familyId: string;
  gameId: string;
  gameKind?: "chess" | "xiangqi";
  createdAt?: string;
};

export type ActiveLockInspection = {
  lock: BoardGameActiveLock | null;
  live: boolean;
  stale: boolean;
};

function gameRefForLock(db: Firestore, lock: BoardGameActiveLock) {
  const kind = lock.gameKind === "xiangqi" ? "xiangqi" : "chess";
  const collection = kind === "xiangqi" ? "xiangqiGames" : "chessGames";
  return db.doc(`families/${lock.familyId}/${collection}/${lock.gameId}`);
}

function looksValid(lock: BoardGameActiveLock | null): lock is BoardGameActiveLock {
  return !!lock?.uid && !!lock.familyId && !!lock.gameId;
}

/**
 * Inspect one cross-game active lock without writing.
 *
 * A lock is live only when its referenced authoritative game still exists and
 * is non-terminal. Old builds could leave a lock document behind after a crash
 * or incomplete teardown; such a lock must never block a future match forever.
 */
export async function inspectBoardGameActiveLock(
  tx: Transaction,
  db: Firestore,
  lockRef: DocumentReference,
): Promise<ActiveLockInspection> {
  const lockSnap = await tx.get(lockRef);
  if (!lockSnap.exists) return { lock: null, live: false, stale: false };

  const lock = lockSnap.data() as BoardGameActiveLock;
  if (!looksValid(lock)) return { lock, live: false, stale: true };

  const gameSnap = await tx.get(gameRefForLock(db, lock));
  if (!gameSnap.exists) return { lock, live: false, stale: true };

  const game = gameSnap.data() as { status?: string };
  const terminal = game.status === "finished" || game.status === "cancelled";
  return { lock, live: !terminal, stale: terminal };
}

/** Resolve a UID's shared Chess/Xiangqi lock and delete it atomically if stale. */
export async function resolveLiveBoardGameActiveLock(db: Firestore, uid: string) {
  const ref = db.doc(`chessActiveUsers/${uid}`);
  return db.runTransaction(async (tx) => {
    const inspected = await inspectBoardGameActiveLock(tx, db, ref);
    if (inspected.stale) tx.delete(ref);
    return inspected.live ? inspected.lock : null;
  });
}
