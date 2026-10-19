export type BoardGameKind = "chess" | "xiangqi";
export type BoardGamePendingRole = "inviter" | "invitee" | "participant";
export type BoardGamePendingPhase = "waiting_acceptance";

/**
 * Cross-game busy reservation only.
 *
 * This record deliberately knows nothing about Chess/Xiangqi gameplay or
 * presentation lifecycle. It only answers whether one uid is already occupied
 * by a pending board-game invitation, and which side of that invitation the uid
 * owns. Chess and Xiangqi keep their own invite/session state independently.
 */
export type BoardGamePendingReservation = {
  uid: string;
  gameKind: BoardGameKind;
  familyId: string;
  inviteId: string;
  role: BoardGamePendingRole;
  phase: BoardGamePendingPhase;
  createdAt: number;
  expiresAt: number;
};

type ReservationInput = Omit<BoardGamePendingReservation, "role" | "phase"> & {
  role?: BoardGamePendingRole;
  phase?: BoardGamePendingPhase;
};

const reservations = new Map<string, BoardGamePendingReservation>();

function normalized(input: ReservationInput): BoardGamePendingReservation {
  return {
    ...input,
    role: input.role ?? "participant",
    phase: input.phase ?? "waiting_acceptance",
  };
}

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

export function reservePendingBoardGame(input: ReservationInput) {
  const next = normalized(input);
  sweepUid(next.uid);
  const current = reservations.get(next.uid);
  if (current) {
    if (
      current.gameKind === next.gameKind
      && current.familyId === next.familyId
      && current.inviteId === next.inviteId
    ) return current;
    return null;
  }
  reservations.set(next.uid, next);
  return next;
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
  inviterUid?: string;
  inviteeUid?: string;
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
    const role: BoardGamePendingRole = uid === input.inviterUid
      ? "inviter"
      : uid === input.inviteeUid
        ? "invitee"
        : "participant";
    reservations.set(uid, {
      uid,
      gameKind: input.gameKind,
      familyId: input.familyId,
      inviteId: input.inviteId,
      role,
      phase: "waiting_acceptance",
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
    role: current.role,
    phase: current.phase,
    expiresAt: current.expiresAt,
  };
}
