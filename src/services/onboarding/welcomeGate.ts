/** One family-scoped welcome intent. A membership for another family never
 * consumes or displays it; this matters during first-house creation and fast
 * Firestore membership/profile snapshot transitions. */
export type WelcomeTarget = { uid: string; familyId: string } | null;
export function isWelcomeForActiveFamily(
  target: WelcomeTarget, currentUid?: string | null, activeFamilyId?: string | null,
): boolean {
  return !!target && !!currentUid && !!activeFamilyId
    && target.uid === currentUid && target.familyId === activeFamilyId;
}

export function canPresentWelcome(input: {
  requested: boolean;
  visualReady: boolean;
  rootSegment?: string | null;
  transitionActive: boolean;
  authenticated: boolean;
}): boolean {
  // Welcome is a gate BEFORE the tabs; requiring rootSegment === '(tabs)'
  // caused Home to mount first and then pop the letter over it.
  return input.requested && input.visualReady && !input.transitionActive && input.authenticated;
}
