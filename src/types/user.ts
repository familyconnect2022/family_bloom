export type Gender = "male" | "female" | "other";
export type BloodType = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "other";
export type FamilyRole = "owner" | "admin" | "member" | "child";

/** Canonical domain model. Optional Firestore fields are normalized to null at the service boundary. */
export interface UserProfile {
  uid: string;
  displayName: string;
  phoneNumber: string | null;
  shortName: string | null;
  color: string;
  birthDate: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
  gender: Gender;
  currentLocation: string | null;
  bio: string | null;
  bloodType: BloodType | null;
  interests: string[];
  hobbies: string[] | null;
  fcmTokens: string[];
  activeFamilyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Family {
  id: string;
  name: string;
  /** Mã dễ nhớ, duy nhất để thành viên dùng khi gia nhập. */
  familyCode: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  uid: string;
  displayName: string;
  shortName: string | null;
  color: string | null;
  phoneNumber: string | null;
  birthDate: string | null;
  avatarUrl: string | null;
  gender: Gender;
  bio: string | null;
  bloodType: BloodType | null;
  interests: string[];
  role: FamilyRole;
  joinedAt: string;
  updatedAt: string;
}

export interface UserFamilyMembership {
  familyId: string;
  familyName: string;
  role: FamilyRole;
  joinedAt: string;
}
