/** A pure, audited gate. A Firebase Auth UID alone is not a family session.
 * This gate belongs to navigation; Firestore Rules / server checks still own
 * authorization for each protected document or mutation.
 */
export type FamilySessionAccess = {
  uid: string | null | undefined;
  profileUid: string | null | undefined;
  profileStatus: string;
  membershipStatus: string;
  activeFamilyId: string | null | undefined;
  verifiedMembershipFamilyIds: readonly string[];
  familySelectionRequired: boolean;
};
export function canEnterFamilyHome(input: FamilySessionAccess): boolean {
  return !!input.uid && input.profileUid === input.uid
    && input.profileStatus === "ready"
    && input.membershipStatus === "ready"
    && !!input.activeFamilyId
    && input.verifiedMembershipFamilyIds.includes(input.activeFamilyId)
    && !input.familySelectionRequired;
}
