/** Route GROUPS belong to the file tree, while `pathname` is the actual URL.
 * This policy is intentionally pure: Firebase/AppState may update frequently,
 * but redirects happen only if the URL truly differs.
 */
export type RootRouteInput = {
  pathname: string;
  rootSegment?: string;
  isSignedIn: boolean;
  profileStatus: "idle" | "loading" | "missing" | "ready" | "error";
  familySelectionRequired: boolean;
  hasValidActiveFamily: boolean;
  familyTransition: boolean;
};
export type RootRouteDecision = { target: string; mode: "replace" | "navigate" } | null;

export const resolveRootRoute = (input: RootRouteInput): RootRouteDecision => {
  const { pathname, rootSegment, isSignedIn, profileStatus,
    familySelectionRequired, hasValidActiveFamily, familyTransition } = input;
  const inAuth = rootSegment === "(auth)";
  const inTabs = rootSegment === "(tabs)";
  const onProfileCreation = pathname === "/create-profile";
  const onFamilyGateway = pathname === "/family-gateway";
  const onFamilySelect = pathname === "/family-select";
  const onMemberships = pathname === "/family-memberships";
  // The public, data-free anchor remains available even when every protected
  // route is forbidden during Firebase Auth/Profile/Membership bootstrap.
  const onSessionGate = pathname === "/session-gate";
  const onWelcome = pathname === "/welcome";
  let target: string | null = null;
  let mode: "replace" | "navigate" = "replace";
  if (!isSignedIn) {
    if (!inAuth) target = "/(auth)/login";
  } else if (profileStatus === "missing") {
    if (!onProfileCreation) target = "/create-profile";
  } else if (profileStatus === "ready" && familySelectionRequired) {
    if (!onFamilySelect && !onMemberships) target = "/family-select";
  } else if (profileStatus === "ready" && !hasValidActiveFamily) {
    if (!onFamilyGateway) target = "/family-gateway";
  } else if (profileStatus === "ready" && hasValidActiveFamily) {
    if (onSessionGate || onWelcome || inAuth || onProfileCreation || onFamilyGateway || onFamilySelect || (!inTabs && !rootSegment)) {
      target = "/(tabs)";
    } else if (familyTransition && !inTabs) {
      target = "/(tabs)";
      mode = "navigate";
    }
  }
  // A temporary Firestore error is not evidence that a profile is missing.
  // Never redirect an offline signed-in user to the profile-creation form.
  if (!target || target === pathname || (target === "/(tabs)" && inTabs)) return null;
  return { target, mode };
};
