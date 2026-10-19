/** Dedicated Family Bloom developer authorization: verified Firebase ID token only.
 * Firebase Auth email uniqueness binds the email to one verified UID. To pin a
 * specific UID even if an account address is later changed/re-used, set
 * FAMILY_BLOOM_DEVELOPER_UID in Render. NEVER use the general family admin role.
 */
export function isVerifiedDeveloperIdentity(identity: {
  uid?: string | null; email?: string | null; email_verified?: boolean;
}): boolean {
  if (!identity.uid || identity.email_verified !== true) return false;
  if (identity.email?.trim().toLowerCase() !== "huynh235@gmail.com") return false;
  const pinned = process.env.FAMILY_BLOOM_DEVELOPER_UID?.trim();
  return !pinned || identity.uid === pinned;
}
