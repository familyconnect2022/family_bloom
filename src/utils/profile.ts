import { DEFAULT_SMART_REMINDER_PREFERENCES, type Gender, type UserProfile, type BloodType, type SmartReminderPreferences } from "../types/user";

const stringOrNull = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
const genderOrOther = (value: unknown): Gender => value === "male" || value === "female" || value === "other" ? value : "other";
const bloodOrNull = (value: unknown): BloodType | null => ["A+","A-","B+","B-","AB+","AB-","O+","O-","other"].includes(String(value)) ? value as BloodType : null;

const smartReminderPreferences = (value: unknown): SmartReminderPreferences => {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    birthdays: typeof raw.birthdays === "boolean" ? raw.birthdays : DEFAULT_SMART_REMINDER_PREFERENCES.birthdays,
    memorials: typeof raw.memorials === "boolean" ? raw.memorials : DEFAULT_SMART_REMINDER_PREFERENCES.memorials,
    events: typeof raw.events === "boolean" ? raw.events : DEFAULT_SMART_REMINDER_PREFERENCES.events,
    onThisDay: typeof raw.onThisDay === "boolean" ? raw.onThisDay : DEFAULT_SMART_REMINDER_PREFERENCES.onThisDay,
  };
};

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
  pushNotificationsEnabled: typeof raw.pushNotificationsEnabled === "boolean" ? raw.pushNotificationsEnabled : true,
  smartReminderPreferences: smartReminderPreferences(raw.smartReminderPreferences),
  activeFamilyId: stringOrNull(raw.activeFamilyId),
  createdAt: String(raw.createdAt ?? ""),
  updatedAt: String(raw.updatedAt ?? ""),
});
