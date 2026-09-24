import type { Gender, UserProfile, BloodType } from "../types/user";

const stringOrNull = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
const genderOrOther = (value: unknown): Gender => value === "male" || value === "female" || value === "other" ? value : "other";
const bloodOrNull = (value: unknown): BloodType | null => ["A+","A-","B+","B-","AB+","AB-","O+","O-","other"].includes(String(value)) ? value as BloodType : null;

export const normalizeUserProfile = (raw: Record<string, unknown>, uidFallback?: string): UserProfile => ({
  uid: String(raw.uid ?? uidFallback ?? ""),
  displayName: String(raw.displayName ?? ""),
  phoneNumber: stringOrNull(raw.phoneNumber),
  shortName: stringOrNull(raw.shortName),
  color: String(raw.color ?? ""),
  birthDate: stringOrNull(raw.birthDate),
  avatarUrl: stringOrNull(raw.avatarUrl),
  avatarPublicId: stringOrNull(raw.avatarPublicId),
  gender: genderOrOther(raw.gender),
  currentLocation: stringOrNull(raw.currentLocation),
  bio: stringOrNull(raw.bio),
  bloodType: bloodOrNull(raw.bloodType),
  interests: Array.isArray(raw.interests) ? raw.interests.filter((v): v is string => typeof v === "string") : (Array.isArray(raw.hobbies) ? raw.hobbies.filter((v): v is string => typeof v === "string") : []),
  hobbies: Array.isArray(raw.hobbies) ? raw.hobbies.filter((v): v is string => typeof v === "string") : null,
  fcmTokens: Array.isArray(raw.fcmTokens) ? raw.fcmTokens.filter((v): v is string => typeof v === "string") : [],
  activeFamilyId: stringOrNull(raw.activeFamilyId),
  createdAt: String(raw.createdAt ?? ""),
  updatedAt: String(raw.updatedAt ?? ""),
});
