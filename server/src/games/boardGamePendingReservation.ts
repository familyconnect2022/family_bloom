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
