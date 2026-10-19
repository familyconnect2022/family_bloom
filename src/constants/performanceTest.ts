/** H15: Private test tools are available in both Debug and signed Release APKs.
 * This gate is UX-only; sensitive Socket actions are also checked server-side.
 * Family-admin role, display name and user profile are never authorization.
 */
export const PERFORMANCE_TEST_BUILD = true;
export const FAMILY_BLOOM_DEV_EMAIL = "huynh235@gmail.com";

export const isPerformanceTestAccount = (email?: string | null) =>
  (email ?? "").trim().toLowerCase() === FAMILY_BLOOM_DEV_EMAIL;
export const isVerifiedDeveloperAccount = (user?: {uid?: string | null; email?: string | null; emailVerified?: boolean} | null) =>
  !!user?.uid && user.emailVerified === true && isPerformanceTestAccount(user.email);

