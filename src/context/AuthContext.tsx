import { familyBloomSessionDiagnostics as diagnostic } from "../diagnostics/sessionDiagnostics";
import { metroTestLogsEnabled } from "../diagnostics/metroLogging";
import { sha256 } from "../features/learning/familyDocument/nativePublishJournal.cjs";
import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";
import { toAppError } from "@/services/error/errorService";
import { authService, GoogleLoginTimeoutError, type GoogleLoginPhase } from "@/services/auth/authService";
import {
  activateAndroidSession, checkAndroidSession, clearAndroidLoginIntent, forgetAndroidLease,
  markAndroidLoginIntent, releaseAndroidSession, singleSessionEnabled,
  type AndroidLease, type AndroidSessionError,
} from "@/services/auth/androidSingleSession";
import { internetReachabilityService } from "@/services/network/internetReachabilityService";
import { classifyVerificationIssue, isTransientVerificationIssue, type VerificationIssue } from "@/services/navigation/sessionVerificationIssue";
import { acceptMembershipServerProof, deferMembershipError, type MembershipServerProof } from "@/services/navigation/authoritativeMembershipProof";
import { familyService } from "@/services/family/familyService";
import { homeTimeCapsuleService } from "@/services/home/homeTimeCapsuleService";
import { profileService } from "@/services/profile/profileService";
import { avatarAsyncSync } from "@/services/media/avatarAsyncSync";
import { avatarPickerActivity } from "@/services/media/avatarPickerActivity";
import { isWelcomeForActiveFamily, type WelcomeTarget } from "@/services/onboarding/welcomeGate";
import { welcomeLedger } from "@/services/onboarding/welcomeLedger";
import { clearFamilyGraphWarmCache } from "../components/familyGraph/familyGraphWarmCache";
import { bootSessionCache } from "../services/bootstrap/bootSessionCache";
import { familyHomeWarmCache } from "../services/bootstrap/familyHomeWarmCache";
import { localNotificationService } from "../services/push/localNotificationService";
import { pushTokenService } from "../services/push/pushTokenService";
import { resetSharedRealtimeRegistry } from "../services/realtime/sharedRealtimeRegistry";
import { ConfirmationResult, User } from "@react-native-firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { AuthStatus, ProfileStatus, UserFamilyMembership, UserProfile } from "../types";
import { readMembership } from "../utils/dataBoundary";
import {
  SESSION_AUTH_TIMEOUT_MS, SESSION_MEMBERSHIP_TIMEOUT_MS,
  SESSION_PROFILE_TIMEOUT_MS, SessionVerificationTimeoutError, withSessionVerificationTimeout,
} from "../services/navigation/sessionVerificationTimeout";

export type FamilyTransition = {
  targetFamilyId: string;
  targetFamilyName: string;
  startedAt: number;
};

type MembershipStatus = "idle" | "loading" | "ready" | "error";

export type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  families: UserFamilyMembership[];
  activeFamilyId: string | null;
  activeMembership: UserFamilyMembership | null;
  familySelectionRequired: boolean;
  familyTransition: FamilyTransition | null;
  switchFamily: (familyId: string) => Promise<boolean>;
  completeFamilyTransition: () => void;
  showWelcome: boolean;
  dismissWelcome: () => Promise<void>;
  welcomeReady: boolean;
  /** Mở Thư Ngõ cho đúng ngôi nhà vừa vào, kể cả khi không đăng nhập lại. */
  requestWelcomeForFamily: (familyId: string) => void;
  authStatus: AuthStatus;
  profileStatus: ProfileStatus;
  membershipStatus: MembershipStatus;
  verificationIssue: VerificationIssue | null;
  isInitializing: boolean;
  isLoadingPhone: boolean;
  googleLoginPhase: GoogleLoginPhase | null;
  googleLoginNotice: string | null;
  loginWithGoogle: () => Promise<void>;
  sendPhoneCode: (phoneNumber: string) => Promise<boolean>;
  confirmPhoneCode: (code: string) => Promise<boolean>;
  resendPhoneCode: () => Promise<boolean>;
  pendingPhoneNumber: string | null;
  refreshProfile: () => Promise<UserProfile | null>;
  /** Recheck Firebase for this same UID without signing out or trusting cache. */
  retryFirebaseVerification: () => void;
  logout: () => Promise<void>;
  learningSessionEpoch: string | null;
  authorizeLearningPublication: (uid: string, familyId: string) => Promise<void>;
  singleSessionStatus: "off" | "checking" | "active" | "unavailable";
  singleSessionNotice: string | null;
  retrySingleSession: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const sortMemberships = (items: UserFamilyMembership[]) => items
  .map((item) => readMembership(item, item?.familyId))
  .filter((item): item is UserFamilyMembership => item !== null)
  .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt) || a.familyName.localeCompare(b.familyName, "vi"));

const yieldToPaint = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [families, setFamilies] = useState<UserFamilyMembership[]>([]);
  const [familyTransition, setFamilyTransition] = useState<FamilyTransition | null>(null);
  const [welcomeTarget, setWelcomeTarget] = useState<WelcomeTarget>(null);
  const [welcomeCheckedKey, setWelcomeCheckedKey] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>("idle");
  const [verificationIssue, setVerificationIssue] = useState<VerificationIssue | null>(null);
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [googleLoginPhase, setGoogleLoginPhase] = useState<GoogleLoginPhase | null>(null);
  const [googleLoginNotice, setGoogleLoginNotice] = useState<string | null>(null);
  const [singleSessionStatus, setSingleSessionStatus] = useState<"off" | "checking" | "active" | "unavailable">("off");
  const [singleSessionNotice, setSingleSessionNotice] = useState<string | null>(null);
  const [sessionRetryAttempt, setSessionRetryAttempt] = useState(0);
  const sessionLeaseRef = useRef<AndroidLease | null>(null);
  const sessionCheckBusyRef = useRef(false);
  const sessionRetryUserRef = useRef<User | null>(null);
  const lastSessionCheckAtRef = useRef(0);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [membershipAttempt, setMembershipAttempt] = useState(0);
  const [recoverySignal, setRecoverySignal] = useState(0);
  const [authSubscriptionAttempt, setAuthSubscriptionAttempt] = useState(0);
  const profileRequestRef = useRef(0);
  const autoSwitchRef = useRef<string | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const familiesRef = useRef<UserFamilyMembership[]>([]);
  const authEpochRef = useRef(0);
  const verifiedMembershipUidRef = useRef<string | null>(null);
  const membershipRecoveryNeededRef = useRef(false);
  const autoRecoveryRef = useRef({ epoch: -1, attempts: 0, at: 0 });
  // Undefined = initial observer not delivered; null = confirmed signed-out.
  const authUidRef = useRef<string | null | undefined>(undefined);
  const interactiveLoginUid = useRef<string | null>(null);
  const cacheHydratedUidRef = useRef<string | null>(null);
  const { showToast } = useBloomToast();

  profileRef.current = userProfile;
  familiesRef.current = families;

  const applyMemberships = useCallback(async (
    currentUser: User,
    profile: UserProfile,
    membershipsInput: UserFamilyMembership[],
  ) => {
    // An old membership snapshot or delayed family switch can finish after
    // logout/sign-in. It must not mutate the new UID's FamilySession.
    const epoch = authEpochRef.current;
    if (authUidRef.current !== currentUser.uid) return profile;
    const memberships = sortMemberships(membershipsInput);
    setFamilies(memberships);

    const activeStillValid = !!profile.activeFamilyId && memberships.some((item) => item.familyId === profile.activeFamilyId);
    if (activeStillValid || memberships.length !== 1) return profile;

    // Only one valid home remains: recover deterministically. More than one
    // home must always be chosen by the user; never guess during instant boot.
    const only = memberships[0];
    if (autoSwitchRef.current === only.familyId) return { ...profile, activeFamilyId: only.familyId };

    autoSwitchRef.current = only.familyId;
    const autoFamilyTicket = diagnostic.start("FAMILY", "active-family", SESSION_MEMBERSHIP_TIMEOUT_MS + 1000, { source: "server", result: "auto-select-only-family" });
    setFamilyTransition({ targetFamilyId: only.familyId, targetFamilyName: only.familyName, startedAt: Date.now() });
    try {
      const verified = await withSessionVerificationTimeout(
        familyService.switchActiveFamily(currentUser.uid, only.familyId),
        SESSION_MEMBERSHIP_TIMEOUT_MS, "membership",
      );
      if (epoch !== authEpochRef.current || authUidRef.current !== currentUser.uid) return profile;
      diagnostic.success(autoFamilyTicket, { activeFamilyMatched: verified.familyId === only.familyId });
      const next = { ...profile, activeFamilyId: verified.familyId };
      profileRef.current = next;
      setUserProfile(next);
      return next;
    } catch (error) {
      diagnostic.failure(autoFamilyTicket, error);
      if (epoch === authEpochRef.current) setFamilyTransition(null);
      return profile;
    } finally {
      if (epoch === authEpochRef.current) autoSwitchRef.current = null;
    }
  }, []);

  const loadAuthoritativeProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      profileRef.current = null;
      setUserProfile(null);
      setFamilies([]);
      setFamilyTransition(null);
      setProfileStatus("idle");
      setMembershipStatus("idle");
      setVerificationIssue(null);
      return null;
    }

    const epoch = authEpochRef.current;
    const request = ++profileRequestRef.current;
    const profileTicket = diagnostic.start("PROFILE", "profile-server-read", SESSION_PROFILE_TIMEOUT_MS + 1000, { source: "server", attempt: request });
    try {
      const profile = await withSessionVerificationTimeout(
        profileService.getAuthoritative(currentUser.uid), SESSION_PROFILE_TIMEOUT_MS, "profile",
      );
      if (epoch !== authEpochRef.current || request !== profileRequestRef.current || authUidRef.current !== currentUser.uid) {
        diagnostic.note("SYSTEM", "compare", { result: "stale-profile-response" });
        return null;
      }
      diagnostic.success(profileTicket, { source: "server", profileExists: !!profile });
      if (!profile) diagnostic.note("PROFILE", "server-read", { result: "profile-absent" });
      profileRef.current = profile;
      setUserProfile(profile);
      setProfileStatus(profile ? "ready" : "missing");
      setVerificationIssue((current) => current?.stage === "profile" ? null : current);
      if (profile && familiesRef.current.length) {
        void applyMemberships(currentUser, profile, familiesRef.current);
      }

      // Profile refresh is NOT a welcome intent. In particular, saving a CV
      // must never replay Thư Ngõ; only new membership joinedAt is considered.
      return profile;
    } catch (error) {
      if (epoch !== authEpochRef.current || request !== profileRequestRef.current || authUidRef.current !== currentUser.uid) {
        diagnostic.note("SYSTEM", "compare", { result: "stale-profile-error" });
        return null;
      }
      diagnostic.failure(profileTicket, error);
      const issue = classifyVerificationIssue("profile", error);
      // Preserve an already server-verified profile for this SAME UID when a
      // foreground refresh times out; initial boot remains fail-closed.
      if (profileRef.current?.uid === currentUser.uid && isTransientVerificationIssue(issue)) {
        if (metroTestLogsEnabled) console.info("[BloomSession] profile refresh postponed", issue.kind);
        return profileRef.current;
      }
      setProfileStatus("error");
      setVerificationIssue(issue);
      // Session Gate owns the persistent retry UI; no short-lived toast for this P0.
      if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[SessionGate] Profile verification failed", error);
      return null;
    }
  }, [applyMemberships]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      // The system photo picker can background our Activity, but MUST NOT
      // tear down membership listeners or restart avatar uploads.
      if (next !== "active" && avatarPickerActivity.isPicking()) return;
      setAppActive((previous) => previous === (next === "active") ? previous : next === "active");
    });
    return () => subscription.remove();
  }, []);

  // Auth resolves identity first. A cache MAY accelerate non-authorizing
  // work, but cannot unlock Home until profile + membership have been verified.
  useEffect(() => authService.subscribe((currentUser) => {
    const nextUid = currentUser?.uid ?? null;
    // A repeated callback for the same verified UID is NOT a new session.
    // Resetting profileStatus here unmounts the avatar draft during Android
    // image-picker resume and needlessly restarts the Firebase subscriptions.
    if (authUidRef.current !== undefined && authUidRef.current === nextUid) return;
    // An explicit sign-in after the initial Firebase observer (signed out)
    // should greet the member again; background/foreground refresh must not.
    interactiveLoginUid.current = currentUser && authUidRef.current !== undefined ? currentUser.uid : null;
    diagnostic.identityChanged(nextUid);
    diagnostic.note("AUTH", "auth-state", { source: "auth", result: nextUid ? "signed-in" : "signed-out" });
    authUidRef.current = nextUid;
    authEpochRef.current += 1;
    verifiedMembershipUidRef.current = null;
    membershipRecoveryNeededRef.current = false;
    autoRecoveryRef.current = { epoch: authEpochRef.current, attempts: 0, at: 0 };
    setVerificationIssue(null);
    const epoch = authEpochRef.current;
    // A new Firebase identity must never render any previous UID's data,
    // including while the first Firestore snapshot is still unresolved.
    profileRef.current = null;
    familiesRef.current = [];
    autoSwitchRef.current = null;
    cacheHydratedUidRef.current = null;
    setWelcomeTarget(null);
    setWelcomeCheckedKey(null);
    setUserProfile(null);
    setFamilies([]);
    // Do not unlock any protected UI until the Preview Gateway validates the
    // native lease. The normal Android path remains byte-for-byte equivalent
    // when the feature is disabled for this UID.
    const needsLease = !!currentUser && singleSessionEnabled(currentUser.uid);
    sessionLeaseRef.current = null;
    sessionRetryUserRef.current = needsLease ? currentUser : null;
    setSingleSessionStatus(needsLease ? "checking" : "off");
    setUser(needsLease ? null : currentUser);
    setAuthStatus(needsLease ? "initializing" : currentUser ? "signed-in" : "signed-out");
    setFamilyTransition(null);
    resetSharedRealtimeRegistry();
    homeTimeCapsuleService.clearRealtimeCache();

    if (!currentUser) {
      setWelcomeTarget(null);
      cacheHydratedUidRef.current = null;
      profileRef.current = null;
      setUserProfile(null);
      setFamilies([]);
      setProfileStatus("idle");
      setMembershipStatus("idle");
      return;
    }

    setProfileStatus("loading");
    setMembershipStatus("loading");
    // Both Firebase profile and family authorization must wait for the native
    // lease when enabled; Firestore cache cannot bypass this first check.
    const authorize = () => {
      if (authUidRef.current !== currentUser.uid || epoch !== authEpochRef.current) return;
      setUser(currentUser);
      setAuthStatus("signed-in");
      void loadAuthoritativeProfile(currentUser);
      void bootSessionCache.read(currentUser.uid)
        .then((cached) => {
          if (epoch === authEpochRef.current && cached) cacheHydratedUidRef.current = currentUser.uid;
        }).catch(() => undefined);
    };
    if (!needsLease) { authorize(); return; }
    void activateAndroidSession(currentUser).then((lease) => {
      if (epoch !== authEpochRef.current || authUidRef.current !== currentUser.uid) return;
      if (!lease) return; // the UID was never eligible for this Preview mode
      sessionLeaseRef.current = lease;
      sessionRetryUserRef.current = null;
      lastSessionCheckAtRef.current = Date.now();
      setSingleSessionStatus("active");
      setSingleSessionNotice(null);
      authorize();
    }).catch((error: AndroidSessionError) => {
      if (epoch !== authEpochRef.current || authUidRef.current !== currentUser.uid) return;
      if (error.reason === "replaced" || error.reason === "reauth") {
        setSingleSessionNotice(error.message);
        setUser(null);
        setAuthStatus("initializing");
        // A forced eviction must NOT invalidate Google SSO shared between
        // Android dual-app clones. Only this app's Firebase credential is cleared.
        void authService.signOutFirebaseOnly().catch(() => {
          setSingleSessionStatus('unavailable');
          setAuthStatus('error');
          setSingleSessionNotice('Không thể kết thúc phiên cũ. Hãy thử đăng xuất rồi đăng nhập lại.');
        });
        return;
      }
      // Backend failure is NOT evidence of session replacement. Keep Firebase
      // credential but block access until the user retries verification.
      setSingleSessionStatus("unavailable");
      setSingleSessionNotice(error.message);
      setAuthStatus("error");
    });

  }), [loadAuthoritativeProfile, authSubscriptionAttempt]);

  useEffect(() => {
    if (authStatus !== "initializing") return;
    const timer = setTimeout(() => {
      if (authUidRef.current === undefined) {
        diagnostic.issue("AUTH", "AUTH-001", "auth-listener", { result: "auth-observer-timeout" });
        setAuthStatus("error");
      }
    }, SESSION_AUTH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [authStatus, authSubscriptionAttempt]);

  // A native Firestore server listener and a getDocsFromServer() call are
  // INDEPENDENT authoritative channels. The original boot required the latter
  // even after a server-origin listener confirmed membership. On a cold-start
  // or VPN-affected transport, getDocsFromServer could hang until its timeout
  // while an already-valid server snapshot was silently discarded. Accept the
  // first server-confirmed result; NEVER trust cache or pending local writes.
  useEffect(() => {
    if (!user) return;
    const currentUid = user.uid;
    const epoch = authEpochRef.current;
    let live = true;
    const serverProof: MembershipServerProof = { watchConfirmed: false, permissionDenied: false };
    let listenerFailed = false;
    let authoritativeReadPending = true;
    const membershipTicket = diagnostic.start("MEMBERSHIP", "main", SESSION_MEMBERSHIP_TIMEOUT_MS + 1000, { source: "firestore" });
    const listenerTicket = diagnostic.start("MEMBERSHIP", "listener-first-result", 0, { source: "listener" });
    const serverReadTicket = diagnostic.start("MEMBERSHIP", "server-read", 0, { source: "server" });
    let listenerFirstRecorded = false;
    let listenerCount: number | null = null;
    let serverCount: number | null = null;
    const noteEvidence = () => {
      if (listenerCount !== null && serverCount !== null) {
        // Different document counts are a clue, NOT proof of a data breach:
        // the listener and server read can legitimately observe different revisions.
        diagnostic.note("MEMBERSHIP", "listener-vs-server", { result: listenerCount === serverCount ? "counts-match" : "counts-differ" });
      }
    };
    const isCurrent = () => live && epoch === authEpochRef.current && authUidRef.current === currentUid;
    const applyVerified = (memberships: UserFamilyMembership[], via: "watch" | "read") => {
      if (!isCurrent() || serverProof.permissionDenied) return;
      const sorted = sortMemberships(memberships);
      // Metadata-only events must not repeatedly re-render the root or trigger
      // duplicate active-family switch writes for identical server records.
      const old = familiesRef.current;
      const unchanged = verifiedMembershipUidRef.current === currentUid && old.length === sorted.length &&
        old.every((item, index) => item.familyId === sorted[index].familyId &&
          item.familyName === sorted[index].familyName && item.role === sorted[index].role &&
          item.joinedAt === sorted[index].joinedAt);
      verifiedMembershipUidRef.current = currentUid;
      diagnostic.success(membershipTicket, { source: via === "watch" ? "listener" : "server", membershipExists: sorted.length > 0, serverReady: true });
      if (via === "watch") {
        listenerCount = sorted.length;
        if (!listenerFirstRecorded) {
          listenerFirstRecorded = true;
          diagnostic.success(listenerTicket, { source: "listener", serverReady: true, membershipExists: sorted.length > 0 });
        }
      } else {
        serverCount = sorted.length;
        diagnostic.success(serverReadTicket, { source: "server", serverReady: true, membershipExists: sorted.length > 0 });
      }
      noteEvidence();
      clearTimeout(membershipDeadline);
      if (!unchanged) { familiesRef.current = sorted; setFamilies(sorted); }
      setMembershipStatus("ready");
      setVerificationIssue((current) => current?.stage === "membership" ? null : current);
      const profile = profileRef.current;
      if (!unchanged && profile?.uid === currentUid) void applyMemberships(user, profile, sorted);
      if (metroTestLogsEnabled) console.info("[BloomSession] membership verified via", via);
    };
    const failVerification = (error: unknown, listenerError: boolean) => {
      if (!isCurrent()) return;
      const issue = classifyVerificationIssue("membership", error);
      if (listenerError) {
        listenerFailed = true;
        if (!listenerFirstRecorded) {
          listenerFirstRecorded = true;
          diagnostic.failure(listenerTicket, error);
        } else diagnostic.note("MEMBERSHIP", "listener-first-result", { result: "later-watch-error" });
      } else diagnostic.failure(serverReadTicket, error);
      if (issue.kind === "permission") serverProof.permissionDenied = true;
      // Watch may fail transiently while its parallel server read still runs.
      // Wait for that read rather than immediately rejecting a valid session.
      if (deferMembershipError(serverProof, listenerError, authoritativeReadPending,
        verifiedMembershipUidRef.current === currentUid, issue.kind === "permission")) return;
      if (!serverProof.permissionDenied && verifiedMembershipUidRef.current === currentUid && isTransientVerificationIssue(issue)) {
        if (listenerError) {
          membershipRecoveryNeededRef.current = true;
          setRecoverySignal((current) => current + 1);
        }
        if (metroTestLogsEnabled) console.info("[BloomSession] membership temporary failure; verified session retained", issue.kind);
        return;
      }
      // Permission failures must always revoke, even after verification.
      verifiedMembershipUidRef.current = null;
      diagnostic.failure(membershipTicket, error);
      membershipRecoveryNeededRef.current = false;
      setMembershipStatus("error");
      setVerificationIssue(issue);
      familiesRef.current = [];
      setFamilies([]);
      if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[BloomSession] membership verification failed", issue.kind);
    };
    // The independent Firestore read is bounded, but on some native transports
    // neither listener nor read settles promptly. A separate deadline makes
    // the gate actionable rather than leaving MEMBERSHIP · dang cho forever.
    // Late server-confirmed events may still recover this same UID/epoch.
    const membershipDeadline = setTimeout(() => {
      if (!isCurrent() || serverProof.watchConfirmed || verifiedMembershipUidRef.current === currentUid) return;
      if (typeof __DEV__ !== "undefined" && __DEV__) console.warn("[BloomSession] membership server-proof deadline exceeded");
      // This is the R3R3 watchdog: diagnostic timing is independent of access control.
      diagnostic.note("MEMBERSHIP", "compare", { listenerReady: serverProof.watchConfirmed, serverReady: !authoritativeReadPending, result: "deadline-reached" });
      failVerification(new SessionVerificationTimeoutError("membership"), false);
    }, SESSION_MEMBERSHIP_TIMEOUT_MS + 1000);
    let stopListener: () => void = () => {};
    const stop = () => { clearTimeout(membershipDeadline); stopListener(); };
    try {
      stopListener = familyService.watchForUser(currentUid, (memberships) => {
        // familyService rejects fromCache / hasPendingWrites snapshots.
        // A server-origin onSnapshot IS authoritative even if an independent
        // getDocsFromServer call has not completed. Use later watch updates too.
        if (!isCurrent() || serverProof.permissionDenied) return;
        if (acceptMembershipServerProof(serverProof, "watch", true)) applyVerified(memberships, "watch");
      }, (error) => failVerification(error, true));
    } catch (error) {
      // A synchronous native listener setup failure must not crash the root.
      failVerification(error, true);
    }
    void withSessionVerificationTimeout(
      Promise.resolve().then(() => familyService.listForUserAuthoritative(currentUid)), SESSION_MEMBERSHIP_TIMEOUT_MS, "membership",
    ).then((memberships) => {
      if (!isCurrent()) return;
      authoritativeReadPending = false;
      serverCount = sortMemberships(memberships).length;
      diagnostic.success(serverReadTicket, { source: "server", membershipExists: serverCount > 0, serverReady: true });
      noteEvidence();
      if (serverProof.permissionDenied) return;
      // The watch may already have newer server data: never overwrite it with
      // a read that started earlier and only completed now.
      if (acceptMembershipServerProof(serverProof, "read", true)) applyVerified(memberships, "read");
      if (listenerFailed) {
        membershipRecoveryNeededRef.current = true;
        setRecoverySignal((current) => current + 1);
      } else membershipRecoveryNeededRef.current = false;
    }).catch((error) => {
      if (!isCurrent()) return;
      authoritativeReadPending = false;
      failVerification(error, false);
    });
    return () => { live = false; stop(); };
  }, [applyMemberships, membershipAttempt, user?.uid]);

  // Persist only after Firebase Auth has confirmed the uid. This cache speeds up
  // future cold starts but never grants access or bypasses Firestore Rules.
  useEffect(() => {
    if (!user || !userProfile || profileStatus !== "ready" || membershipStatus !== "ready") return;
    void bootSessionCache.write(user.uid, userProfile, families).catch(() => undefined);
  }, [families, membershipStatus, profileStatus, user, userProfile]);

  // Reconcile an interrupted background avatar upload on foreground/resume.
  // Never start a job for another Firebase Auth identity.

  const retrySingleSession = useCallback(() => {
    if (sessionRetryUserRef.current && singleSessionStatus === "unavailable") {
      // Retry pending claim/check without silently taking over a restored UID.
      authUidRef.current = undefined;
      setAuthStatus("initializing");
      setAuthSubscriptionAttempt(v => v + 1);
      setSessionRetryAttempt(v => v + 1);
      return;
    }
    setSessionRetryAttempt(v => v + 1);
  }, [singleSessionStatus]);

  // Cooperative foreground check: no re-render on a healthy heartbeat. A
  // replaced lease immediately unmounts protected UI before local sign-out.
  // This does NOT revoke direct Firebase SDK access at Rules level; see README.
  useEffect(() => {
    const lease = sessionLeaseRef.current;
    if (!user || !lease || user.uid !== lease.uid || !singleSessionEnabled(user.uid)) return;
    let alive = true;
    const uid = user.uid;
    const verify = async () => {
      if (!alive || sessionCheckBusyRef.current || !appActive || avatarPickerActivity.isPicking()) return;
      sessionCheckBusyRef.current = true;
      try {
        const result = await checkAndroidSession(user, lease);
        if (!alive || authUidRef.current !== uid || sessionLeaseRef.current !== lease) return;
        if (result === 'replaced') {
          // Do not release: the new device's current lease belongs to B.
          sessionLeaseRef.current = null;
          setSingleSessionNotice('Tài khoản đã đăng nhập trên thiết bị khác. Phiên trên máy này đã kết thúc.');
          setSingleSessionStatus('checking');
          setUser(null);
          setAuthStatus('initializing');
          await forgetAndroidLease(lease);
          await authService.signOutFirebaseOnly();
          await Promise.allSettled([
            bootSessionCache.clear(uid), familyHomeWarmCache.clearUser(uid),
            clearFamilyGraphWarmCache(), localNotificationService.clearForUser(uid),
            pushTokenService.disableCurrentDevice(uid),
          ]);
        } else {
          lastSessionCheckAtRef.current = Date.now();
          setSingleSessionStatus(s => s === 'active' ? s : 'active');
          setSingleSessionNotice(null);
        }
      } catch {
        if (!alive || authUidRef.current !== uid || sessionLeaseRef.current !== lease) return;
        // Never declare the old lease valid on a transport error.
        setSingleSessionStatus('unavailable');
        setSingleSessionNotice('Không thể xác minh phiên. Kiểm tra Internet rồi thử lại.');
      } finally { sessionCheckBusyRef.current = false; }
    };
    // On app resume check immediately; on healthy foreground check every 20s.
    if (appActive) void verify();
    const timer = setInterval(() => { if (appActive) void verify(); }, 20000);
    return () => { alive = false; clearInterval(timer); };
  }, [user?.uid, appActive, sessionRetryAttempt]);

  useEffect(() => {
    if (!user || !appActive || profileStatus !== "ready") return;
    // Do not install a global toast observer: it overwrote the save-screen
    // observer and delivered success on the *next* unrelated route.
    avatarAsyncSync.resume(user.uid);
  }, [appActive, profileStatus, user?.uid]);

  const refreshProfile = useCallback(() => loadAuthoritativeProfile(user), [loadAuthoritativeProfile, user]);

  const retryFirebaseVerification = useCallback(() => {
    diagnostic.note("SYSTEM", "retry", { result: "user-retry-request" });
    if (singleSessionStatus === 'unavailable') {
      retrySingleSession();
      return;
    }
    if (!user) {
      // The Firebase Auth observer has its own bounded timeout. Never fake
      // signed-out merely because one observer callback is delayed.
      authUidRef.current = undefined;
      setAuthStatus("initializing");
      setAuthSubscriptionAttempt((current) => current + 1);
      return;
    }
    if (authUidRef.current !== user.uid) return;
    // A retry is NOT an identity switch. Do not reset an already-authorized
    // profile, membership or Welcome: doing so unmounted the letter whenever
    // connectivity returned or the user tapped Retry.
    const retryProfile = profileStatus !== "ready" && profileStatus !== "missing";
    const retryMembership = membershipStatus !== "ready" || membershipRecoveryNeededRef.current;
    if (retryProfile) {
      setProfileStatus("loading");
      void loadAuthoritativeProfile(user); // requestRef rejects obsolete responses
    }
    if (retryMembership) {
      if (membershipStatus !== "ready") setMembershipStatus("loading");
      setMembershipAttempt((current) => current + 1); // cleanup old watcher
    }
    // No signed-in data is accepted as verified merely by calling Retry.
  }, [authStatus, loadAuthoritativeProfile, membershipStatus, profileStatus, user, singleSessionStatus, retrySingleSession]);

  // A bounded automatic repair when Internet becomes reachable or the app
  // resumes. Does not retry permission-denied and cannot loop indefinitely.
  useEffect(() => {
    if (!user || authUidRef.current !== user.uid) return;
    const needsRetry = profileStatus === "error" || membershipStatus === "error" || membershipRecoveryNeededRef.current;
    if (!needsRetry) return;
    const recover = () => {
      // External gstatic/Cloudflare probes can be blocked by VPN while Firebase
      // remains reachable. Only a *confirmed* offline state should block a
      // bounded Firebase retry; unknown must not strand this session.
      if (!appActive || internetReachabilityService.getStatus() === "offline") return;
      if (verificationIssue && !isTransientVerificationIssue(verificationIssue)) return;
      const entry = autoRecoveryRef.current;
      if (entry.epoch !== authEpochRef.current) { entry.epoch = authEpochRef.current; entry.attempts = 0; entry.at = 0; }
      if (entry.attempts >= 2 || Date.now() - entry.at < 10000) return;
      entry.attempts += 1;
      entry.at = Date.now();
      retryFirebaseVerification();
    };
    const off = internetReachabilityService.subscribe((status) => { if (status !== "offline") recover(); });
    if (appActive) void internetReachabilityService.checkNow({ force: true })
      .then(() => recover())
      .catch(() => recover());
    return off;
  }, [appActive, membershipStatus, profileStatus, recoverySignal, retryFirebaseVerification, user?.uid, verificationIssue]);

  const switchFamily = useCallback(async (familyId: string) => {
    if (!user || !familyId) return false;
    const epoch = authEpochRef.current;
    const localTarget = families.find((item) => item.familyId === familyId);
    if (userProfile?.activeFamilyId === familyId && localTarget) return true;

    const familyTicket = diagnostic.start("FAMILY", "server-verify", SESSION_MEMBERSHIP_TIMEOUT_MS + 1000, { source: "server" });
    setFamilyTransition({ targetFamilyId: familyId, targetFamilyName: localTarget?.familyName || "gia đình mới", startedAt: Date.now() });
    try {
      await yieldToPaint();
      if (epoch !== authEpochRef.current || authUidRef.current !== user.uid) return false;
      // Authoritative membership doc + reverse index are verified by the service.
      const verified = await withSessionVerificationTimeout(
        familyService.switchActiveFamily(user.uid, familyId),
        SESSION_MEMBERSHIP_TIMEOUT_MS, "membership",
      );
      if (epoch !== authEpochRef.current || authUidRef.current !== user.uid) return false;
      diagnostic.success(familyTicket, { source: "server", activeFamilyMatched: verified.familyId === familyId });
      setFamilies((current) => current.some((item) => item.familyId === familyId)
        ? current
        : sortMemberships([verified, ...current]));
      setFamilyTransition({ targetFamilyId: familyId, targetFamilyName: verified.familyName || localTarget?.familyName || "gia đình mới", startedAt: Date.now() });
      setUserProfile((current) => {
        if (!current) return current;
        const next = { ...current, activeFamilyId: familyId };
        profileRef.current = next;
        return next;
      });
      resetSharedRealtimeRegistry();
      homeTimeCapsuleService.clearRealtimeCache();
      return true;
    } catch (error) {
      diagnostic.failure(familyTicket, error);
      if (epoch === authEpochRef.current) {
        setFamilyTransition(null);
        showToast({ ...parseAppError(error), duration: 3500 });
      }
      return false;
    }
  }, [families, showToast, user, userProfile?.activeFamilyId]);

  const completeFamilyTransition = useCallback(() => {
    setFamilyTransition((current) => {
      if (current && metroTestLogsEnabled) {
        // Never include the family ID in Metro output.
        console.info(`[A14][perf] family switch ready in ${Date.now() - current.startedAt}ms`);
      }
      return null;
    });
  }, []);
  const requestWelcomeForFamily = useCallback((familyId: string) => {
    if (!familyId || !user?.uid) return;
    setWelcomeTarget({ uid: user.uid, familyId });
  }, [user?.uid]);
  const dismissWelcome = useCallback(async () => {
    const target = welcomeTarget;
    if (!target || target.uid !== authUidRef.current) return;
    const membership = familiesRef.current.find(item => item.familyId === target.familyId);
    if (!membership) return;
    const ackTicket = diagnostic.start("WELCOME", "ack-write", 12000, { source: "local" });
    try {
      // Persist acknowledgement BEFORE the protected Home can be mounted.
      await welcomeLedger.markSeen(target.uid, membership);
      diagnostic.success(ackTicket, { result: "ack-persisted" });
      if (interactiveLoginUid.current === target.uid) interactiveLoginUid.current = null;
      setWelcomeTarget(current => current?.uid === target.uid && current?.familyId === target.familyId ? null : current);
    } catch {
      diagnostic.failure(ackTicket, { code: "failed-precondition" }, "WEL-403");
      // Keep Welcome visible if acknowledgement cannot be persisted.
      // Never open Home on an acknowledgement that could not be recorded.
      showToast({ type: "warning", title: "Chưa ghi nhớ được Thư Ngõ", message: "Bạn hãy thử mở thư lại sau khi bộ nhớ hoạt động bình thường." });
    }
  }, [showToast, welcomeTarget]);

  const logout = useCallback(async () => {
    clearAndroidLoginIntent();
    setSingleSessionNotice(null);
    const lease = sessionLeaseRef.current;
    // Remote replacement never reaches this explicit user-action logout.
    // The separate forced-eviction handler keeps other clone brokers untouched.
    sessionLeaseRef.current = null;
    if (lease && user?.uid === lease.uid) await releaseAndroidSession(user, lease);
    const signingOutUid = user?.uid ?? null;
    if (signingOutUid) {
      await Promise.allSettled([
        localNotificationService.clearForUser(signingOutUid),
        pushTokenService.disableCurrentDevice(signingOutUid),
        bootSessionCache.clear(signingOutUid),
        familyHomeWarmCache.clearUser(signingOutUid),
        clearFamilyGraphWarmCache(),
      ]);
    }
    resetSharedRealtimeRegistry();
    homeTimeCapsuleService.clearRealtimeCache();
    // This is an explicit local logout. Clear the Google choice as well so
    // the next user may pick another account. Remote-session eviction still
    // calls signOutFirebaseOnly() directly and never touches the Google broker.
    await authService.signOut();
    cacheHydratedUidRef.current = null;
    setConfirmation(null);
    setPendingPhoneNumber(null);
    setFamilyTransition(null);
    setWelcomeTarget(null);
    setWelcomeCheckedKey(null);
  }, [user]);

  const ensureInternetForAuth = useCallback(async () => {
    // The 5G/Wi-Fi icon can remain visible when mobile data is exhausted.
    // Check reachability before opening Google/phone flows; never sign out or
    // change an existing Firebase identity based on connectivity alone.
    if (await internetReachabilityService.checkNow({ force: true }) !== "offline") return true;
    showToast({ type: "warning", title: "Chưa có Internet", message: "Hãy kiểm tra dung lượng 4G/5G hoặc Wi-Fi. Bloom sẽ tự kiểm tra kết nối.", duration: 4000 });
    return false;
  }, [showToast]);

  const loginWithGoogle = useCallback(async () => {
    setGoogleLoginNotice(null);
    try {
      if (!(await ensureInternetForAuth())) return;
      markAndroidLoginIntent();
      await authService.signInWithGoogle((phase) => setGoogleLoginPhase(phase));
    } catch (error) {
      clearAndroidLoginIntent();
      if (toAppError(error).code === 'AUTH_GOOGLE_CANCELLED') return;
      if (error instanceof GoogleLoginTimeoutError) {
        // Persistent visible error, because a short Toast may expire while
        // Android's cloned Google account picker is still on screen.
        setGoogleLoginNotice(error.message);
        showToast({ type: 'warning', title: 'Đăng nhập chưa hoàn tất', message: error.message, duration: 5000 });
      } else if (await internetReachabilityService.checkNow({ force: true }) === "offline") {
        setGoogleLoginNotice('Không có Internet để đăng nhập. Vui lòng thử lại khi có mạng.');
        showToast({ type: "warning", title: "Kết nối Internet bị gián đoạn", message: "Không thể hoàn tất đăng nhập lúc này. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động.", duration: 4000 });
      } else {
        showToast({ ...parseAppError(error), duration: 3500 });
      }
    } finally {
      // Always stop the login spinner on timeout/cancel/error.
      setGoogleLoginPhase(null);
    }
  }, [ensureInternetForAuth, showToast]);

  const sendPhoneCode = useCallback(async (phoneNumber: string) => {
    const normalized = authService.normalizePhoneNumber(phoneNumber);
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      showToast({ ...parseAppError({ code: "auth/invalid-phone-number" }), duration: 3000 });
      return false;
    }
    setIsLoadingPhone(true);
    try {
      if (!(await ensureInternetForAuth())) return false;
      const result = await authService.sendPhoneCode(normalized);
      setConfirmation(result);
      setPendingPhoneNumber(normalized);
      return true;
    } catch (error) {
      if (await internetReachabilityService.checkNow({ force: true }) === "offline") {
        showToast({ type: "warning", title: "Mất kết nối khi gửi mã", message: "Vui lòng kiểm tra Internet rồi thử lại.", duration: 4000 });
      } else {
        showToast({ ...parseAppError(error), duration: 3500 });
      }
      return false;
    } finally {
      setIsLoadingPhone(false);
    }
  }, [ensureInternetForAuth, showToast]);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (!confirmation) {
      showToast({ ...parseAppError({ code: "auth/code-expired" }), duration: 3000 });
      return false;
    }
    setIsLoadingPhone(true);
    try {
      if (!(await ensureInternetForAuth())) return false;
      markAndroidLoginIntent();
      await authService.confirmPhoneCode(confirmation, code);
      setConfirmation(null);
      return true;
    } catch (error) {
      clearAndroidLoginIntent();
      if (await internetReachabilityService.checkNow({ force: true }) === "offline") {
        showToast({ type: "warning", title: "Mất kết nối khi xác nhận", message: "Mã vẫn còn trên màn hình. Hãy kiểm tra Internet rồi thử lại.", duration: 4000 });
      } else {
        showToast({ ...parseAppError(error), duration: 3500 });
      }
      return false;
    } finally {
      setIsLoadingPhone(false);
    }
  }, [confirmation, ensureInternetForAuth, showToast]);

  const resendPhoneCode = useCallback(async () => {
    if (!pendingPhoneNumber) return false;
    return sendPhoneCode(pendingPhoneNumber);
  }, [pendingPhoneNumber, sendPhoneCode]);

  const activeMembership = useMemo(
    () => families.find((item) => item.familyId === userProfile?.activeFamilyId) ?? null,
    [families, userProfile?.activeFamilyId],
  );
  // Resolve only the active verified membership. Checking the exact UID,
  // family and joinedAt prevents stale reads from a previous session and also
  // preserves the gate when a member switches to another newly joined house.
  const activeWelcomeKey = user && activeMembership
    ? welcomeLedger.fingerprint(user.uid, activeMembership) : null;
  const welcomeReady = !activeWelcomeKey || welcomeCheckedKey === activeWelcomeKey;
  useEffect(() => {
    if (!user || !activeMembership || !activeWelcomeKey || profileStatus !== "ready" || membershipStatus !== "ready") return;
    const uid = user.uid;
    const familyId = activeMembership.familyId;
    let alive = true;
    const welcomeTicket = diagnostic.start("WELCOME", "server-verify", 12000, { source: "local" });
    void welcomeLedger.needsWelcome(uid, activeMembership).then((needed) => {
      if (!alive || authUidRef.current !== uid) return;
      diagnostic.success(welcomeTicket, { result: needed ? "welcome-required" : "welcome-checked" });
      if (needed) setWelcomeTarget({ uid, familyId });
      else if (interactiveLoginUid.current === uid) setWelcomeTarget({ uid, familyId });
      setWelcomeCheckedKey(activeWelcomeKey);
    }).catch(() => {
      // When private local storage fails, prefer showing the letter instead
      // of silently skipping onboarding for this verified membership.
      if (!alive || authUidRef.current !== uid) return;
      diagnostic.note("WELCOME", "server-verify", { result: "ledger-read-fallback" });
      diagnostic.failure(welcomeTicket, { code: "failed-precondition" }, "WEL-401");
      setWelcomeTarget({ uid, familyId });
      setWelcomeCheckedKey(activeWelcomeKey);
    });
    return () => { alive = false; };
  }, [activeWelcomeKey, membershipStatus, profileStatus, user?.uid]);
  useEffect(() => {
    if (!user || profileStatus !== "ready" || membershipStatus !== "ready") return;
    diagnostic.note("FAMILY", "active-family", {
      activeFamilyMatched: !!activeMembership,
      membershipExists: families.length > 0,
      result: activeMembership ? "selected-family-in-list" : families.length ? "selection-needed" : "no-family",
    });
  }, [user?.uid, activeMembership?.familyId, families.length, profileStatus, membershipStatus]);
  const familySelectionRequired = profileStatus === "ready"
    && membershipStatus === "ready"
    && families.length > 1
    && !activeMembership;

  // Hash the lease locally; the WebView never sees the credential or ID token.
  const learningSessionEpoch = user ? sha256(JSON.stringify(['learning-native-v1',user.uid,sessionLeaseRef.current?.token ?? user.metadata?.lastSignInTime ?? String(authEpochRef.current)])).slice(0,32) : null;
  const learningScopeRef = useRef({uid:user?.uid,familyId:activeMembership?.familyId});
  learningScopeRef.current={uid:user?.uid,familyId:activeMembership?.familyId};
  const authorizeLearningPublication = useCallback(async (uid:string,familyId:string) => {
    const fail=(code:string)=>Object.assign(Error(code),{code});
    const scopeOK=()=>authUidRef.current===uid&&learningScopeRef.current.uid===uid&&learningScopeRef.current.familyId===familyId;
    if(!user||user.uid!==uid||!scopeOK())throw fail('AUTH_CHANGED');
    if(singleSessionEnabled(uid)){
      const lease=sessionLeaseRef.current;
      if(!lease||lease.uid!==uid)throw fail('SESSION_UNAVAILABLE');
      let result;try{result=await checkAndroidSession(user,lease);}catch{throw fail('SESSION_UNAVAILABLE');}
      if(result!=='active'||sessionLeaseRef.current!==lease||!scopeOK())throw fail('SESSION_REPLACED');
    }
    if(!scopeOK())throw fail('AUTH_CHANGED');
  },[user]);
  const value = useMemo<AuthContextType>(() => ({
    user,
    userProfile,
    families,
    activeFamilyId: activeMembership?.familyId ?? null,
    activeMembership,
    familySelectionRequired,
    familyTransition,
    switchFamily,
    completeFamilyTransition,
    authStatus,
    profileStatus,
    membershipStatus,
    verificationIssue,
    showWelcome: isWelcomeForActiveFamily(welcomeTarget, user?.uid, activeMembership?.familyId),
    welcomeReady,
    isInitializing: authStatus === "initializing" || profileStatus === "loading" || membershipStatus === "loading",
    isLoadingPhone,
    googleLoginPhase,
    googleLoginNotice,
    loginWithGoogle,
    sendPhoneCode,
    confirmPhoneCode,
    resendPhoneCode,
    pendingPhoneNumber,
    refreshProfile,
    retryFirebaseVerification,
    dismissWelcome,
    requestWelcomeForFamily,
    logout,
    learningSessionEpoch,
    authorizeLearningPublication,
    singleSessionStatus,
    singleSessionNotice,
    retrySingleSession,
  }), [
    user, userProfile, families, activeMembership, familySelectionRequired, familyTransition, welcomeReady,
    switchFamily, completeFamilyTransition, authStatus, profileStatus, membershipStatus, verificationIssue, welcomeTarget, isLoadingPhone,
    googleLoginPhase, googleLoginNotice, loginWithGoogle, sendPhoneCode, confirmPhoneCode, resendPhoneCode, pendingPhoneNumber,
    refreshProfile, retryFirebaseVerification, dismissWelcome, requestWelcomeForFamily, logout, learningSessionEpoch, authorizeLearningPublication,
    singleSessionStatus, singleSessionNotice, retrySingleSession,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider");
  return context;
};
