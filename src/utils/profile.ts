import { boundedText, dateOnly, readIso, requiredText } from "./dataBoundary";
import { DEFAULT_SMART_REMINDER_PREFERENCES, type Gender, type UserProfile, type BloodType, type SmartReminderPreferences } from "../types/user";

const stringOrNull = (value: unknown): string | null => typeof value === "string" && value.trim() ? value : null;
const genderOrOther = (value: unknown): Gender => value === "male" || value === "female" || value === "other" ? value : "other";
const bloodOrNull = (value: unknown): BloodType | null => typeof value === "string" && ["A+","A-","B+","B-","AB+","AB-","O+","O-","other"].includes(value) ? value as BloodType : null;

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
  uid: requiredText(uidFallback, 180) || requiredText(raw.uid, 180) || "",
  displayName: boundedText(raw.displayName, 200) || "",
  phoneNumber: stringOrNull(raw.phoneNumber),
  shortName: stringOrNull(raw.shortName),
  color: boundedText(raw.color, 30) || "",
  birthDate: dateOnly(raw.birthDate),
  avatarUrl: stringOrNull(raw.avatarUrl),
  avatarPublicId: stringOrNull(raw.avatarPublicId),
  avatarAssetId: stringOrNull(raw.avatarAssetId),
  gender: genderOrOther(raw.gender),
  currentLocation: stringOrNull(raw.currentLocation),
  hometown: boundedText(raw.hometown, 160) || null,
  occupation: boundedText(raw.occupation, 160) || null,
  bio: stringOrNull(raw.bio),
  bloodType: bloodOrNull(raw.bloodType),
  interests: Array.isArray(raw.interests) ? raw.interests.filter((v): v is string => typeof v === "string") : (Array.isArray(raw.hobbies) ? raw.hobbies.filter((v): v is string => typeof v === "string") : []),
  hobbies: Array.isArray(raw.hobbies) ? raw.hobbies.filter((v): v is string => typeof v === "string") : null,
  fcmTokens: Array.isArray(raw.fcmTokens) ? raw.fcmTokens.filter((v): v is string => typeof v === "string") : [],
  pushNotificationsEnabled: typeof raw.pushNotificationsEnabled === "boolean" ? raw.pushNotificationsEnabled : true,
  smartReminderPreferences: smartReminderPreferences(raw.smartReminderPreferences),
  activeFamilyId: stringOrNull(raw.activeFamilyId),
  createdAt: readIso(raw.createdAt) || "",
  updatedAt: readIso(raw.updatedAt) || "",
});
