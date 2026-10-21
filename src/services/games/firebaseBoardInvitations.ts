/** H25: Firebase-only human invitations. No Render connection before acceptance. */
import {
  collection, doc, getFirestore, onSnapshot, query, runTransaction,
  serverTimestamp, where,
} from '@react-native-firebase/firestore';
import type { ChessTimeControl } from '../../types/chess';

export type InvitationKind = 'chess' | 'xiangqi';
export type InvitationStatus = 'PENDING' | 'ACCEPT_REQUESTED' | 'ACCEPTED' |
  'CANCELLED' | 'DECLINED' | 'EXPIRED' | 'FAILED' | 'COMPLETED';
export type BoardInvitation = {
  inviteId: string; familyId: string; gameKind: InvitationKind;
  fromUid: string; toUid: string; fromDisplayName: string; toDisplayName: string;
  timeControl: ChessTimeControl; createdAtMs: number; expiresAtMs: number;
  status: InvitationStatus; revision: number; gameId?: string;
  acceptedAt?: unknown; updatedAt?: unknown; reason?: string;
};
const INVITE_MS = 60_000;
const CONNECT_MS = 180_000;
const folder = (familyId: string) => `families/${familyId}`;
const slotRef = (familyId: string, uid: string) => doc(getFirestore(), `${folder(familyId)}/boardInviteSlots/${uid}`);
const inviteRef = (familyId: string, inviteId: string) => doc(getFirestore(), `${folder(familyId)}/boardInvitations/${inviteId}`);
const terminal = (s: string) => ['CANCELLED', 'DECLINED', 'EXPIRED', 'FAILED', 'COMPLETED'].includes(s);
export const inviteIsOccupied = (s: {status?: string; holdUntilMs?: number} | undefined, now: number) =>
  !!s && s.status !== 'RELEASED' && typeof s.holdUntilMs === 'number' && s.holdUntilMs > now;
const newId = () => `fb-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,11)}`;

/** Both slot locks and invite are created in one transaction. Clock is bounded by Firestore Rules. */
export async function createFirebaseInvitation(args: {
  familyId: string; gameKind: InvitationKind; fromUid: string; toUid: string;
  fromDisplayName: string; toDisplayName: string; timeControl: ChessTimeControl;
}) {
  if (args.fromUid === args.toUid) throw new Error('Không thể tự mời chính mình.');
  const inviteId = newId();
  const sender = slotRef(args.familyId, args.fromUid);
  const recipient = slotRef(args.familyId, args.toUid);
  const ref = inviteRef(args.familyId, inviteId);
  await runTransaction(getFirestore(), async tx => {
    const [a, b] = await Promise.all([tx.get(sender), tx.get(recipient)]);
    const now = Date.now();
    if (inviteIsOccupied(a.exists() ? a.data() : undefined, now)) throw new Error('Bạn đang có một lời mời hoặc phiên chơi khác.');
    if (inviteIsOccupied(b.exists() ? b.data() : undefined, now)) throw new Error(`${args.toDisplayName} đang có lời mời khác. Vui lòng thử lại sau.`);
    const invite: BoardInvitation = {
      inviteId, familyId: args.familyId, gameKind: args.gameKind,
      fromUid: args.fromUid, toUid: args.toUid,
      fromDisplayName: args.fromDisplayName.slice(0, 56), toDisplayName: args.toDisplayName.slice(0, 56),
      timeControl: args.timeControl, status: 'PENDING', revision: 1,
      createdAtMs: now, expiresAtMs: now + INVITE_MS,
    };
    tx.set(ref, { ...invite, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    for (const [uid, role, current] of [[args.fromUid, 'inviter', sender], [args.toUid, 'invitee', recipient]] as const) {
      tx.set(current, { uid, familyId: args.familyId, inviteId, gameKind: args.gameKind, role,
        status: 'PENDING', holdUntilMs: invite.expiresAtMs, updatedAt: serverTimestamp() });
    }
  });
  return inviteId;
}

export async function transitionFirebaseInvitation(familyId: string, inviteId: string, uid: string,
  action: 'accept' | 'cancel' | 'decline' | 'expire' | 'fail') {
  const ref = inviteRef(familyId, inviteId);
  return runTransaction(getFirestore(), async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error('Lời mời không tồn tại.');
    const invite = snap.data() as BoardInvitation;
    if (invite.familyId !== familyId || ![invite.fromUid, invite.toUid].includes(uid)) throw new Error('Không có quyền xử lý lời mời.');
    if (terminal(invite.status)) return invite.status;
    if (invite.status !== 'PENDING' && !(invite.status === 'ACCEPT_REQUESTED' && action === 'fail')) return invite.status;
    if (action === 'accept' && uid !== invite.toUid) throw new Error('Chỉ người nhận mới được đồng ý.');
    if (action === 'cancel' && uid !== invite.fromUid) throw new Error('Chỉ người mời được hủy.');
    if (action === 'decline' && uid !== invite.toUid) throw new Error('Chỉ người nhận được từ chối.');
    const now = Date.now();
    if (action === 'accept' && now >= invite.expiresAtMs) throw new Error('Lời mời đã hết thời gian.');
    if (action === 'expire' && now < invite.expiresAtMs) return invite.status;
    if (action === 'fail') {
      const acceptedMs = (invite.acceptedAt as {toMillis?:()=>number}|undefined)?.toMillis?.();
      if (invite.status !== 'ACCEPT_REQUESTED' || !acceptedMs || now < acceptedMs + CONNECT_MS) return invite.status;
    }
    const next: InvitationStatus = action === 'accept' ? 'ACCEPT_REQUESTED'
      : action === 'cancel' ? 'CANCELLED' : action === 'decline' ? 'DECLINED' : action === 'fail' ? 'FAILED' : 'EXPIRED';
    // Read both slots before any writes, preserving transaction retry safety.
    const aRef = slotRef(familyId, invite.fromUid), bRef = slotRef(familyId, invite.toUid);
    const [a, b] = await Promise.all([tx.get(aRef), tx.get(bRef)]);
    const slots = [[aRef, a], [bRef, b]] as const;
    if (slots.some(([, entry]) => entry.data()?.inviteId !== inviteId)) throw new Error('Lời mời không còn là phiên hiện tại.');
    tx.update(ref, { status: next, revision: invite.revision + 1, updatedAt: serverTimestamp(),
      ...(action === 'accept' ? {acceptedAt: serverTimestamp()} : {}) });
    for (const [slot] of slots) tx.update(slot, { status: next === 'ACCEPT_REQUESTED' ? next : 'RELEASED',
      holdUntilMs: next === 'ACCEPT_REQUESTED' ? now + CONNECT_MS : now,
      updatedAt: serverTimestamp() });
    return next;
  });
}

/** Two tiny listeners scoped to uid, independent of game Socket or active tab. */
export function watchMyFirebaseInvitations(familyId: string, uid: string,
  onChange: (invites: BoardInvitation[]) => void, onError?: (error: Error) => void) {
  const db = getFirestore();
  const records = new Map<string, BoardInvitation>();
  let active = true;
  const update = () => { if (active) onChange([...records.values()].sort((a,b) => b.createdAtMs-a.createdAtMs)); };
  const unsubscribers = (['fromUid', 'toUid'] as const).map(field => onSnapshot(
    query(collection(db, `${folder(familyId)}/boardInvitations`), where(field, '==', uid)),
    snap => {
      // Avoid optimistically displaying a locally-pending uncommitted mutation as server truth.
      const ids = new Set<string>();
      snap.docs.forEach(d => {
        ids.add(d.id);
        if (!d.metadata.hasPendingWrites) records.set(d.id, d.data() as BoardInvitation);
      });
      // Only remove docs previously matched by this side of the query.
      for (const [id, inv] of records) if (inv[field] === uid && !ids.has(id)) records.delete(id);
      update();
    }, error => onError?.(error),
  ));
  return () => { active = false; unsubscribers.forEach(fn => fn()); };
}

export type InvitationSlot = {uid:string; inviteId:string; status:string; holdUntilMs:number; gameKind:InvitationKind};
/** Read one small family-wide availability projection; no game Socket opened. */
export function watchInvitationSlots(familyId:string,onChange:(slots:Record<string,InvitationSlot>)=>void,
  onError?:(error:Error)=>void) {
  return onSnapshot(collection(getFirestore(),`${folder(familyId)}/boardInviteSlots`),snap=>{
    const now=Date.now();const mapped:Record<string,InvitationSlot>={};
    snap.docs.forEach(s=>{
      const item=s.data() as InvitationSlot;
      if(item.status!=='RELEASED' && item.holdUntilMs>now) mapped[s.id]=item;
    });
    onChange(mapped);
  },error=>onError?.(error));
}
