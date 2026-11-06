/**
 * FAMILY BLOOM R3R14R3R5 — Android untrusted-data boundary.
 * Firestore SDK type assertions do NOT validate runtime data. Never silently
 * manufacture identities, roles, membership or join-request status.
 * This module has no Firebase/React imports and works in Hermes .
 */
import type { FamilyJoinRequest } from "../types/familyJoin";
import type { FamilyMember, UserFamilyMembership } from "../types/user";

export function objectData(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)
    ? value as Record<string, unknown> : null;
}
export function boundedText(value: unknown, max = 300): string | null {
  return typeof value === "string" && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value) ? value : null;
}
export function requiredText(value: unknown, max = 300): string | null {
  const result = boundedText(value, max);
  return result?.trim() ? result : null;
}
/** ISO 8601 UTC with milliseconds. Reject invalid calendar dates and string coercion. */
export function canonicalIso(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value ? value : null;
}
/** Read-only legacy compatibility for Firestore Timestamp / Date. Never call toString() on data. */
export function readIso(value: unknown): string | null {
  const iso = canonicalIso(value);
  if (iso) return iso;
  try {
    const d = value instanceof Date ? value : objectData(value) && typeof objectData(value)?.toDate === "function"
      ? (objectData(value)?.toDate as () => unknown).call(value) : null;
    return d instanceof Date && Number.isFinite(d.getTime()) ? d.toISOString() : null;
  } catch { return null; }
}
export function dateOnly(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().startsWith(`${value}T`) ? value : null;
}
export function textArray(value: unknown, maxItems = 32, maxLength = 160): string[] {
  return Array.isArray(value) ? value.slice(0, maxItems).filter((x): x is string => requiredText(x, maxLength) !== null) : [];
}
export const allowedRole = (v: unknown): v is UserFamilyMembership["role"] =>
  v === "owner" || v === "admin" || v === "member" || v === "child";

/** Fail closed: a corrupt membership never grants access to any family. */
export function readMembership(raw: unknown, familyId: string): UserFamilyMembership | null {
  const r = objectData(raw);
  const actualId = requiredText(r?.familyId, 180);
  const name = requiredText(r?.familyName, 200);
  const joinedAt = readIso(r?.joinedAt);
  if (!r || !familyId || actualId !== familyId || !name || !allowedRole(r.role) || !joinedAt) return null;
  return { familyId, familyName: name, role: r.role, joinedAt };
}
export function readFamilyMember(raw: unknown, uid: string): FamilyMember | null {
  const r = objectData(raw);
  const joinedAt = readIso(r?.joinedAt);
  if (!r || !uid || r.uid !== uid || !allowedRole(r.role) || !joinedAt) return null;
  const name = requiredText(r.displayName, 200);
  return {
    uid, role: r.role, displayName: name || "Thành viên", joinedAt,
    updatedAt: readIso(r.updatedAt) || joinedAt,
    shortName: boundedText(r.shortName, 100), color: boundedText(r.color, 30),
    phoneNumber: boundedText(r.phoneNumber, 80), birthDate: dateOnly(r.birthDate),
    avatarUrl: boundedText(r.avatarUrl, 2048),
    gender: r.gender === "male" || r.gender === "female" ? r.gender : "other",
    bio: boundedText(r.bio, 2000), bloodType: (["A+","A-","B+","B-","AB+","AB-","O+","O-","other"] as unknown[]).includes(r.bloodType) ? r.bloodType as FamilyMember["bloodType"] : null,
    interests: textArray(r.interests),
  };
}
/** Mandatory identity + timestamp; malformed applicants are quarantined, never approved. */
export function readJoinRequest(raw: unknown, familyId: string, uid: string): FamilyJoinRequest | null {
  const r = objectData(raw);
  const applicant = objectData(r?.applicant);
  if (!r || !applicant || !uid || !familyId || r.uid !== uid || r.familyId !== familyId || applicant.uid !== uid
    || !(r.status === "pending" || r.status === "approved" || r.status === "rejected") || !readIso(r.requestedAt)) return null;
  const name = requiredText(applicant.displayName, 200);
  const familyName = requiredText(r.familyName, 200);
  if (!name || !familyName || (applicant.interests != null && (!Array.isArray(applicant.interests) || applicant.interests.some((v: unknown) => requiredText(v, 160) === null)))) return null;
  return {
    uid, familyId, familyName, status: r.status as FamilyJoinRequest["status"], requestedAt: readIso(r.requestedAt)!,
    applicant: {
      uid, displayName: name,
      ...(requiredText(applicant.shortName, 100) ? { shortName: requiredText(applicant.shortName, 100)! } : {}),
      ...(requiredText(applicant.avatarUrl, 2048) ? { avatarUrl: requiredText(applicant.avatarUrl, 2048)! } : {}),
      ...(requiredText(applicant.phoneNumber, 80) ? { phoneNumber: requiredText(applicant.phoneNumber, 80)! } : {}),
      ...(dateOnly(applicant.birthDate) ? { birthDate: dateOnly(applicant.birthDate)! } : {}),
      ...(boundedText(applicant.bio, 2000) ? { bio: boundedText(applicant.bio, 2000)! } : {}),
      interests: textArray(applicant.interests),
    },
    ...(boundedText(r.message, 2000) ? { message: boundedText(r.message, 2000)! } : {}),
    ...(readIso(r.reviewedAt) ? { reviewedAt: readIso(r.reviewedAt)! } : {}),
    ...(requiredText(r.reviewedByUid, 180) ? { reviewedByUid: requiredText(r.reviewedByUid, 180)! } : {}),
    ...(boundedText(r.rejectionReason, 2000) ? { rejectionReason: boundedText(r.rejectionReason, 2000)! } : {}),
  };
}
