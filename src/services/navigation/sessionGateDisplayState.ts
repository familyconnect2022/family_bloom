/** Display-only categorization; never authorizes protected content.
 * Keeping this pure prevents a completed Membership from being mislabeled
 * MEM-201 while a native screen handoff is still in progress.
 */
export type SessionGateDisplayStage = 'AUTH' | 'PROFILE' | 'MEMBERSHIP' | 'WELCOME' | 'NAVIGATION';
export function resolveSessionGateDisplayStage(input: {
  authStatus: string;
  profileStatus: string;
  membershipStatus: string;
  welcomeReady: boolean;
  userPresent: boolean;
}): SessionGateDisplayStage {
  if (input.authStatus === 'initializing' || input.authStatus === 'error') return 'AUTH';
  if (!input.userPresent) return 'NAVIGATION';
  if (input.profileStatus !== 'ready' && input.profileStatus !== 'missing') return 'PROFILE';
  if (input.profileStatus !== 'ready') return 'NAVIGATION';
  if (input.membershipStatus !== 'ready') return 'MEMBERSHIP';
  if (!input.welcomeReady) return 'WELCOME';
  return 'NAVIGATION';
}
export function pendingCodeForSessionGate(stage: SessionGateDisplayStage):
  'AUTH-001' | 'PRO-101' | 'MEM-201' | 'WEL-401' | 'NAV-501' {
  switch (stage) {
    case 'AUTH': return 'AUTH-001';
    case 'PROFILE': return 'PRO-101';
    case 'MEMBERSHIP': return 'MEM-201';
    case 'WELCOME': return 'WEL-401';
    default: return 'NAV-501';
  }
}
