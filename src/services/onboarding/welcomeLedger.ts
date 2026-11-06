import AsyncStorage from "@react-native-async-storage/async-storage";
import type { UserFamilyMembership } from "../../types";

/** Only memberships CREATED after this release need automatic migration-safe
 * welcome. Old members must never be sent through the letter during an update.
 * Every future approval/created house has a new server-written joinedAt.
 */
export const WELCOME_GATE_CUTOFF = "2026-10-30T17:00:00.000Z";
const seenKey = (uid: string, membership: Pick<UserFamilyMembership, "familyId" | "joinedAt">) =>
  `family-bloom:welcome:seen:v1:${uid}:${membership.familyId}:${membership.joinedAt}`;

export const welcomeLedger = {
  fingerprint(uid: string, membership: Pick<UserFamilyMembership, "familyId" | "joinedAt">): string {
    return seenKey(uid, membership);
  },
  async needsWelcome(uid: string, membership: Pick<UserFamilyMembership, "familyId" | "joinedAt">): Promise<boolean> {
    // Historical memberships are not treated as newly approved on upgrade.
    if (!uid || !membership.familyId || !membership.joinedAt || membership.joinedAt < WELCOME_GATE_CUTOFF) return false;
    return (await AsyncStorage.getItem(seenKey(uid, membership))) !== "seen";
  },
  async markSeen(uid: string, membership: Pick<UserFamilyMembership, "familyId" | "joinedAt">): Promise<void> {
    await AsyncStorage.setItem(seenKey(uid, membership), "seen");
  },
};
