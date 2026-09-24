import type { BloodType, Gender, UserProfile } from "./user";

export type CreateProfileInput = {
  displayName: string;
  shortName?: string | null;
  color: string;
  phoneNumber?: string | null;
  birthDate?: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
  gender?: Gender;
  currentLocation?: string | null;
  bio?: string | null;
  bloodType?: BloodType | null;
  interests?: string[];
  hobbies?: string[] | null;
  fcmTokens?: string[];
};

export type UpdateProfileInput = Partial<
  Omit<UserProfile, "uid" | "createdAt" | "updatedAt" | "activeFamilyId">
>;
