export type BoardGameKind = "chess" | "xiangqi";

export type BoardGamePendingReservation = {
  uid: string;
  gameKind: BoardGameKind;
  familyId: string;
  inviteId: string;
  createdAt: number;
  expiresAt: number;
};

const reservations = new Map<string, BoardGamePendingReservation>();

function isExpired(value: BoardGamePendingReservation, now = Date.now()) {
  return value.expiresAt <= now;
}

function sweepUid(uid: string, now = Date.now()) {
  const current = reservations.get(uid);
  if (current && isExpired(current, now)) reservations.delete(uid);
}

export function getPendingBoardGameReservation(uid: string) {
  sweepUid(uid);
  return reservations.get(uid) ?? null;
}

export function reservePendingBoardGame(input: BoardGamePendingReservation) {
  sweepUid(input.uid);
  const current = reservations.get(input.uid);
  if (current) {
    if (
      current.gameKind === input.gameKind
      && current.familyId === input.familyId
      && current.inviteId === input.inviteId
    ) return current;
    return null;
  }
  reservations.set(input.uid, input);
  return input;
}

/**
 * Atomically reserve every real participant in one pending challenge.
 * Existing reservations for the same challenge are treated as idempotent,
 * while any conflicting Chess/Xiangqi reservation aborts the whole claim.
 */
export function reservePendingBoardGameParticipants(input: {
  uids: string[];
  gameKind: BoardGameKind;
  familyId: string;
  inviteId: string;
  createdAt: number;
  expiresAt: number;
}) {
  const uids = [...new Set(input.uids.filter(Boolean))];
  const now = Date.now();
  for (const uid of uids) sweepUid(uid, now);

  for (const uid of uids) {
    const current = reservations.get(uid);
    if (!current) continue;
    const sameChallenge = current.gameKind === input.gameKind
      && current.familyId === input.familyId
      && current.inviteId === input.inviteId;
    if (!sameChallenge) return null;
  }

  for (const uid of uids) {
    if (reservations.has(uid)) continue;
    reservations.set(uid, {
      uid,
      gameKind: input.gameKind,
      familyId: input.familyId,
      inviteId: input.inviteId,
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    });
  }

  return uids.map((uid) => reservations.get(uid)!).filter(Boolean);
}

export function updatePendingBoardGameInviteId(
  uid: string,
  expectedInviteId: string,
  nextInviteId: string,
  expiresAt: number,
) {
  sweepUid(uid);
  const current = reservations.get(uid);
  if (!current || current.inviteId !== expectedInviteId) return false;
  reservations.set(uid, { ...current, inviteId: nextInviteId, expiresAt });
  return true;
}

export function releasePendingBoardGameReservation(
  uid: string,
  match?: { gameKind?: BoardGameKind; inviteId?: string },
) {
  sweepUid(uid);
  const current = reservations.get(uid);
  if (!current) return false;
  if (match?.gameKind && current.gameKind !== match.gameKind) return false;
  if (match?.inviteId && current.inviteId !== match.inviteId) return false;
  reservations.delete(uid);
  return true;
}

/** Release every participant reserved by one terminal challenge. */
export function releasePendingBoardGameInvite(
  inviteId: string,
  gameKind?: BoardGameKind,
) {
  let released = 0;
  for (const [uid, current] of reservations) {
    if (current.inviteId !== inviteId) continue;
    if (gameKind && current.gameKind !== gameKind) continue;
    reservations.delete(uid);
    released += 1;
  }
  return released;
}

export function pendingReservationPublicShape(uid: string) {
  const current = getPendingBoardGameReservation(uid);
  if (!current) return null;
  return {
    kind: "pending" as const,
    gameKind: current.gameKind,
    familyId: current.familyId,
    inviteId: current.inviteId,
    expiresAt: current.expiresAt,
  };
}
