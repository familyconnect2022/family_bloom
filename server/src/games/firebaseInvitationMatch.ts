import { adminDb } from '../firebase/firebaseAdmin.js';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

/** Shared PRE-GAME Firestore handshake, no shared Chess/Xiangqi game lifecycle. */
export type FirebaseMatchInvite = {
  inviteId: string; familyId: string; gameKind: 'chess'|'xiangqi';
  fromUid: string; toUid: string; status: string; expiresAtMs: number;
  acceptedAt?: {toMillis():number}; timeControl: {kind:string;initialMs:number|null;incrementMs:number};
  gameId?: string; revision: number;
};
const inFlight = new Map<string, Promise<string>>();
const CONNECT_MS = 180_000;
const safeId = (x: string) => /^[^/]{1,128}$/.test(x);
export async function resolveFirebaseMatch(args: {
  familyId: string; inviteId: string; uid: string; kind: 'chess'|'xiangqi';
  getCurrent: (uid: string) => Promise<{familyId:string;gameId:string;gameKind:string}|null>;
  sameMatch: (gameId: string, fromUid: string, toUid: string, inviteId: string) => Promise<boolean>;
  create: (i: FirebaseMatchInvite) => Promise<string>;
}) {
  const {familyId,inviteId,uid,kind} = args;
  if (![familyId, inviteId, uid].every(safeId)) throw new Error('INVITE_INVALID_ID');
  const ref = adminDb.doc(`families/${familyId}/boardInvitations/${inviteId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('INVITE_NOT_FOUND');
  const i = snap.data() as FirebaseMatchInvite;
  if (i.familyId !== familyId || i.inviteId !== inviteId || i.gameKind !== kind || ![i.fromUid,i.toUid].includes(uid)) throw new Error('INVITE_NOT_AUTHORIZED');
  if (i.status === 'ACCEPTED' && i.gameId) return i.gameId;
  if (i.status !== 'ACCEPT_REQUESTED') throw new Error('INVITE_NOT_ACCEPTED');
  const acceptedMs = i.acceptedAt?.toMillis?.();
  if (!Number.isFinite(acceptedMs) || acceptedMs! > i.expiresAtMs || Date.now() > acceptedMs! + CONNECT_MS)
    throw new Error('INVITE_CONNECT_TIMEOUT');
  const key = `${familyId}:${inviteId}`;
  let promise = inFlight.get(key);
  if (!promise) {
    promise = (async () => {
      // Re-read within the critical section (both clients may connect together).
      const current = await ref.get();
      const state = current.data() as FirebaseMatchInvite;
      if (state.status === 'ACCEPTED' && state.gameId) return state.gameId;
      if (state.status !== 'ACCEPT_REQUESTED') throw new Error('INVITE_NOT_ACCEPTED');
      const activeA = await args.getCurrent(state.fromUid);
      const activeB = await args.getCurrent(state.toUid);
      let gameId: string;
      if (activeA || activeB) {
        if (!activeA || !activeB || activeA.gameId !== activeB.gameId || activeA.gameKind !== kind ||
            !(await args.sameMatch(activeA.gameId, state.fromUid, state.toUid, inviteId)))
          throw new Error('INVITE_PLAYER_BUSY');
        gameId = activeA.gameId;
      } else gameId = await args.create(state);
      // The game has a durable uid lock before we promote the Firebase invite.
      await adminDb.runTransaction(async tx => {
        const latest = await tx.get(ref);
        const d = latest.data() as FirebaseMatchInvite;
        if (d.status === 'ACCEPTED' && d.gameId === gameId) return;
        if (d.status !== 'ACCEPT_REQUESTED') throw new Error('INVITE_CHANGED_DURING_MATCH');
        tx.update(ref,{status:'ACCEPTED',gameId,revision:d.revision+1,updatedAt:new Date()});
        for (const participant of [d.fromUid,d.toUid]) {
          tx.set(adminDb.doc(`families/${familyId}/boardInviteSlots/${participant}`),
            {uid:participant,familyId,inviteId,gameId,gameKind:kind,status:'MATCHED',holdUntilMs:2524608000000,updatedAt:new Date()}, {merge:true});
        }
      });
      return gameId;
    })();
    inFlight.set(key,promise);
    void promise.finally(()=>{if(inFlight.get(key)===promise)inFlight.delete(key);}).catch(()=>undefined);
  }
  return promise;
}

/** Finish a Firebase invitation with its authoritative game in one Firestore transaction.
 * Call from the *independent* Chess and Xiangqi persistence.finish methods.
 * Conditions on gameId prevent a delayed finish from releasing a newer slot.
 */
export async function finalizeInvitationWithGame(tx: Transaction, db: Firestore,
  familyId: string, gameId: string, uids: readonly string[]) {
  const slots = uids.map(uid => db.doc(`families/${familyId}/boardInviteSlots/${uid}`));
  const snapshots = await Promise.all(slots.map(ref => tx.get(ref)));
  const matching = snapshots.filter(s => s.exists && s.data()?.status === 'MATCHED' && s.data()?.gameId === gameId);
  const inviteId = matching.length ? matching[0].data()?.inviteId as string : undefined;
  const inviteRef = inviteId && safeId(inviteId) ? db.doc(`families/${familyId}/boardInvitations/${inviteId}`) : null;
  const invitation = inviteRef ? await tx.get(inviteRef) : null;
  const now = Date.now();
  // After all reads, apply writes so Firestore transactions remain legal.
  for (const [index, snapshot] of snapshots.entries()) {
    if (snapshot.exists && snapshot.data()?.status === 'MATCHED' && snapshot.data()?.gameId === gameId)
      tx.update(slots[index], {status:'RELEASED',holdUntilMs:now,updatedAt:new Date()});
  }
  if (invitation?.exists && invitation.data()?.gameId === gameId && invitation.data()?.status === 'ACCEPTED')
    tx.update(inviteRef!, {status:'COMPLETED',revision:(invitation.data()?.revision ?? 0)+1,updatedAt:new Date()});
}

/** Deferred next-day cleanup, never wakes a sleeping Render instance. */
let cleanupRunning = false;
export async function cleanupPreviousInvitesWhenAwake() {
  if (cleanupRunning) return;
  cleanupRunning = true;
  try {
    const today = new Date(); today.setUTCHours(0,0,0,0);
    const marker = adminDb.doc('systemTasks/boardInvitationCleanup');
    const markerSnap = await marker.get();
    const date = today.toISOString().slice(0,10);
    if (markerSnap.data()?.lastDay === date) return;
    // A page may be full of still-pending requests; never let them starve
    // eligible terminal records later in the index. Cursor across pages,
    // bounded to prevent cleanup from delaying a live match.
    const terminal = new Set(['CANCELLED','DECLINED','EXPIRED','FAILED','COMPLETED']);
    const query = adminDb.collectionGroup('boardInvitations')
      .where('createdAtMs','<',today.getTime()).orderBy('createdAtMs');
    let cursor: import('firebase-admin/firestore').QueryDocumentSnapshot | undefined;
    let exhausted = false;
    for (let page = 0; page < 5; page++) {
      const pageQuery = cursor ? query.startAfter(cursor) : query;
      const batch = await pageQuery.limit(100).get();
      const deletable = batch.docs.filter(d => terminal.has(d.data().status));
      if (deletable.length) {
        const writer = adminDb.batch();
        deletable.forEach(d => writer.delete(d.ref));
        await writer.commit();
      }
      if (batch.size < 100) { exhausted = true; break; }
      cursor = batch.docs[batch.docs.length - 1];
    }
    // Do not claim the whole day completed if the work was partial.
    if (exhausted) await marker.set({lastDay:date,updatedAt:new Date()},{merge:true});
  } catch (error) { console.warn('[invitation] deferred cleanup skipped',error); }
  finally { cleanupRunning=false; }
}
