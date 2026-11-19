import { familyBloomSessionDiagnostics as diagnostic } from "../diagnostics/sessionDiagnostics";
import { metroTestLogsEnabled } from "../diagnostics/metroLogging";
import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";
import { authService } from "@/services/auth/authService";
import { nativeSingleSessionPreview, NativeSessionGateError, type NativeLease } from "@/services/auth/nativeSingleSessionPreview";
import { nativeSecureSessionPreview, type SecureSession } from "@/services/auth/nativeSecureSessionPreview";
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
import { ConfirmationResult, User, getAuth } from "@react-native-firebase/auth";
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
  loginWithGoogle: () => Promise<void>;
  sendPhoneCode: (phoneNumber: string) => Promise<boolean>;
  confirmPhoneCode: (code: string) => Promise<boolean>;
  resendPhoneCode: () => Promise<boolean>;
  pendingPhoneNumber: string | null;
  refreshProfile: () => Promise<UserProfile | null>;
  /** Recheck Firebase for this same UID without signing out or trusting cache. */
  retryFirebaseVerification: () => void;
  logout: () => Promise<void>;
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
  const nativeLeaseRef = useRef<NativeLease | null>(null);
  const secureSessionRef = useRef<SecureSession | null>(null);
  const cacheHydratedUidRef = useRef<string | null>(null);
  const { showToast } = useBloomToast();
  const sessionToastRef=useRef(showToast);
  sessionToastRef.current=showToast;

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
    setUser(null);
    setAuthStatus(currentUser ? "initializing" : "signed-out");
    setFamilyTransition(null);
    resetSharedRealtimeRegistry();
    homeTimeCapsuleService.clearRealtimeCache();
    nativeLeaseRef.current = null;
    secureSessionRef.current = null;

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

    const startAuthoritativeVerification = (verifiedUser: User = currentUser) => {
      if(epoch !== authEpochRef.current || authUidRef.current !== currentUser.uid)return;
      // Secure V2 exchanges a fresh Google/OTP identity for a custom-token
      // Firebase identity with a Rules-readable SID. Never expose the old
      // User object to the profile/membership listeners after that exchange.
      if(verifiedUser.uid!==currentUser.uid)return;
      setUser(verifiedUser);
      setAuthStatus("signed-in");
      setProfileStatus("loading");
      setMembershipStatus("loading");
      // P0: profile/membership reads are server-verified; cache cannot unlock Home.
      void loadAuthoritativeProfile(verifiedUser);
      void bootSessionCache.read(verifiedUser.uid)
        .then(cached=>{if(epoch === authEpochRef.current && cached)cacheHydratedUidRef.current=currentUser.uid;})
        .catch(()=>undefined);
    };
    if(nativeSecureSessionPreview.requiresSession(currentUser.uid)){
      // V2 takes priority over the cooperative V1 gate, and no Firestore
      // listener can start until both the Firebase SID and Gateway agree.
      setProfileStatus("idle");setMembershipStatus("idle");
      void nativeSecureSessionPreview.activate(currentUser).then(session=>{
        if(epoch!==authEpochRef.current||authUidRef.current!==currentUser.uid||!session)return;
        const verifiedUser=getAuth().currentUser;
        if(!verifiedUser||verifiedUser.uid!==currentUser.uid)
          throw new NativeSessionGateError('reauth','Firebase đã thay đổi tài khoản trong lúc kiểm tra phiên.');
        secureSessionRef.current=session;
        startAuthoritativeVerification(verifiedUser);
      }).catch(error=>{
        if(epoch!==authEpochRef.current||authUidRef.current!==currentUser.uid)return;
        setAuthStatus("error");
        if(error instanceof NativeSessionGateError && (error.reason==='replaced'||error.reason==='reauth')){
          sessionToastRef.current({type:'warning',title:'Phiên đăng nhập đã kết thúc',message:error.message,duration:5000});
          void authService.signOut().catch(()=>undefined);
        }else{
          sessionToastRef.current({type:'warning',title:'Chưa xác minh được phiên bảo mật',message:'Màn hình gia đình tạm khóa. Kiểm tra mạng rồi chọn Thử lại.',duration:5000});
        }
      });
      return;
    }
    if(!nativeSingleSessionPreview.requiresSession(currentUser.uid)){
      startAuthoritativeVerification();return;
    }
    // Preview testers must acquire or validate the SAME Gateway lease as Web
    // before any Family data listener is created or Home can be unlocked.
    setProfileStatus("idle");setMembershipStatus("idle");
    void nativeSingleSessionPreview.activate(currentUser).then(lease=>{
      if(epoch!==authEpochRef.current||authUidRef.current!==currentUser.uid)return;
      nativeLeaseRef.current=lease;
      startAuthoritativeVerification();
    }).catch(error=>{
      if(epoch!==authEpochRef.current||authUidRef.current!==currentUser.uid)return;
      setAuthStatus("error");
      // A missing/replaced lease requires explicit fresh Google/OTP login.
      // Network/config failures retain Firebase identity but block all routes
      // and allow the existing Retry button to recheck the server.
      if(error instanceof NativeSessionGateError && (error.reason==='replaced'||error.reason==='reauth')){
        sessionToastRef.current({type:'warning',title:'Phiên đăng nhập đã kết thúc',message:error.message,duration:5000});
        void authService.signOut().catch(()=>undefined);
      }else{
        sessionToastRef.current({type:'warning',title:'Chưa xác minh được phiên',message:'Màn hình gia đình tạm khóa. Vui lòng kiểm tra mạng rồi chọn Thử lại.',duration:5000});
      }
    });

  }), [loadAuthoritativeProfile, authSubscriptionAttempt]);

  // Android counterpart of the Web preview heartbeat. AppState foreground
  // triggers an immediate check; no background timer is relied on by itself.
  useEffect(()=>{
    if(!appActive||authStatus!=="signed-in"||!user||(!nativeLeaseRef.current&&!secureSessionRef.current))return;
    const currentUser=user,lease=nativeLeaseRef.current,secure=secureSessionRef.current,epoch=authEpochRef.current;
    let cancelled=false,busy=false;
    const poll=async()=>{
      if(cancelled||busy||authUidRef.current!==currentUser.uid)return;
      busy=true;
      try{
        const result=secure
          ? await nativeSecureSessionPreview.check(currentUser,secure)
          : await nativeSingleSessionPreview.check(currentUser,lease!);
        if(cancelled||epoch!==authEpochRef.current||nativeLeaseRef.current!==lease||secureSessionRef.current!==secure)return;
        if(result==='replaced'){
          // Block navigation synchronously, then invalidate the old identity.
          setAuthStatus("initializing");setUser(null);
          sessionToastRef.current({type:'warning',title:'Phiên đăng nhập đã thay đổi',message:'Tài khoản vừa đăng nhập tại nơi khác.',duration:5000});
          if(lease)await nativeSingleSessionPreview.forget(lease);
          nativeLeaseRef.current=null;
          secureSessionRef.current=null;
          if(epoch===authEpochRef.current&&authUidRef.current===currentUser.uid)
            await authService.signOut();
        }
      }catch{
        if(cancelled||epoch!==authEpochRef.current||nativeLeaseRef.current!==lease||secureSessionRef.current!==secure)return;
        // Fail closed on an unknown network state; do not use the saved lease
        // to authorize Home. Retry re-subscribes and checks the active lease.
        setAuthStatus("error");
        sessionToastRef.current({type:'warning',title:'Không xác minh được phiên',message:'Hãy kết nối lại Internet rồi chọn Thử lại.',duration:4000});
      }finally{busy=false;}
    };
    void poll();
    const timer=setInterval(()=>void poll(),15000);
    return()=>{cancelled=true;clearInterval(timer);};
  },[appActive,authStatus,user?.uid]);

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
  useEffect(() => {
    if (!user || !appActive || profileStatus !== "ready") return;
    // Do not install a global toast observer: it overwrote the save-screen
    // observer and delivered success on the *next* unrelated route.
    avatarAsyncSync.resume(user.uid);
  }, [appActive, profileStatus, user?.uid]);

  const refreshProfile = useCallback(() => loadAuthoritativeProfile(user), [loadAuthoritativeProfile, user]);

  const retryFirebaseVerification = useCallback(() => {
    diagnostic.note("SYSTEM", "retry", { result: "user-retry-request" });
    if(authStatus==="error" && user && (nativeSingleSessionPreview.requiresSession(user.uid)||nativeSecureSessionPreview.requiresSession(user.uid))){
      // Re-run the lease gate first; never retry data verification while the
      // Gateway is offline or the old session may have been replaced.
      authUidRef.current=undefined;
      setUser(null);setAuthStatus("initializing");
      setAuthSubscriptionAttempt(current=>current+1);
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
  }, [authStatus, loadAuthoritativeProfile, membershipStatus, profileStatus, user]);

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
    const signingOutUid = user?.uid ?? null;
    const lease=nativeLeaseRef.current;
    const secureSession=secureSessionRef.current;
    nativeLeaseRef.current=null;
    secureSessionRef.current=null;
    if (signingOutUid) {
      await Promise.allSettled([
        localNotificationService.clearForUser(signingOutUid),
        pushTokenService.disableCurrentDevice(signingOutUid),
        bootSessionCache.clear(signingOutUid),
        familyHomeWarmCache.clearUser(signingOutUid),
        clearFamilyGraphWarmCache(),
      ]);
    }
    // Server-side cleanup must precede releasing the SID. Rules deny writes
    // as soon as the SID document is deleted.
    if(user&&lease)await nativeSingleSessionPreview.release(user,lease);
    if(user&&secureSession)await nativeSecureSessionPreview.release(user,secureSession);
    resetSharedRealtimeRegistry();
    homeTimeCapsuleService.clearRealtimeCache();
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
    try {
      if (!(await ensureInternetForAuth())) return;
      await authService.signInWithGoogle();
    } catch (error) {
      // A backend/auth failure is not itself proof that the phone is offline.
      // Refresh the independent Internet probe to give accurate guidance.
      if (await internetReachabilityService.checkNow({ force: true }) === "offline") {
        showToast({ type: "warning", title: "Kết nối Internet bị gián đoạn", message: "Không thể hoàn tất đăng nhập lúc này. Hãy kiểm tra Wi-Fi hoặc dữ liệu di động.", duration: 4000 });
      } else {
        showToast({ ...parseAppError(error), duration: 3500 });
      }
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
      await authService.confirmPhoneCode(confirmation, code);
      setConfirmation(null);
      return true;
    } catch (error) {
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
  }), [
    user, userProfile, families, activeMembership, familySelectionRequired, familyTransition, welcomeReady,
    switchFamily, completeFamilyTransition, authStatus, profileStatus, membershipStatus, verificationIssue, welcomeTarget, isLoadingPhone,
    loginWithGoogle, sendPhoneCode, confirmPhoneCode, resendPhoneCode, pendingPhoneNumber,
    refreshProfile, retryFirebaseVerification, dismissWelcome, requestWelcomeForFamily, logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider");
  return context;
};
