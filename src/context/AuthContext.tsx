import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";
import { authService } from "@/services/auth/authService";
import { familyService } from "@/services/family/familyService";
import { homeTimeCapsuleService } from "@/services/home/homeTimeCapsuleService";
import { profileService } from "@/services/profile/profileService";
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

export type FamilyTransition = {
  targetFamilyId: string;
  targetFamilyName: string;
  startedAt: number;
};

type MembershipStatus = "idle" | "loading" | "ready";

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
  dismissWelcome: () => void;
  authStatus: AuthStatus;
  profileStatus: ProfileStatus;
  membershipStatus: MembershipStatus;
  isInitializing: boolean;
  isLoadingPhone: boolean;
  loginWithGoogle: () => Promise<void>;
  sendPhoneCode: (phoneNumber: string) => Promise<boolean>;
  confirmPhoneCode: (code: string) => Promise<boolean>;
  resendPhoneCode: () => Promise<boolean>;
  pendingPhoneNumber: string | null;
  refreshProfile: () => Promise<UserProfile | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

const sortMemberships = (items: UserFamilyMembership[]) => [...items].sort((a, b) => {
  const byJoined = b.joinedAt.localeCompare(a.joinedAt);
  return byJoined || a.familyName.localeCompare(b.familyName, "vi");
});

const yieldToPaint = () => new Promise<void>((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [families, setFamilies] = useState<UserFamilyMembership[]>([]);
  const [familyTransition, setFamilyTransition] = useState<FamilyTransition | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>("idle");
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const welcomeRequestedRef = useRef(false);
  const autoSwitchRef = useRef<string | null>(null);
  const profileRef = useRef<UserProfile | null>(null);
  const familiesRef = useRef<UserFamilyMembership[]>([]);
  const authEpochRef = useRef(0);
  const cacheHydratedUidRef = useRef<string | null>(null);
  const { showToast } = useBloomToast();

  profileRef.current = userProfile;
  familiesRef.current = families;

  const applyMemberships = useCallback(async (
    currentUser: User,
    profile: UserProfile,
    membershipsInput: UserFamilyMembership[],
  ) => {
    const memberships = sortMemberships(membershipsInput);
    setFamilies(memberships);

    const activeStillValid = !!profile.activeFamilyId && memberships.some((item) => item.familyId === profile.activeFamilyId);
    if (activeStillValid || memberships.length !== 1) return profile;

    // Only one valid home remains: recover deterministically. More than one
    // home must always be chosen by the user; never guess during instant boot.
    const only = memberships[0];
    if (autoSwitchRef.current === only.familyId) return { ...profile, activeFamilyId: only.familyId };

    autoSwitchRef.current = only.familyId;
    setFamilyTransition({ targetFamilyId: only.familyId, targetFamilyName: only.familyName, startedAt: Date.now() });
    try {
      const verified = await familyService.switchActiveFamily(currentUser.uid, only.familyId);
      const next = { ...profile, activeFamilyId: verified.familyId };
      profileRef.current = next;
      setUserProfile(next);
      return next;
    } catch {
      setFamilyTransition(null);
      return profile;
    } finally {
      autoSwitchRef.current = null;
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
      return null;
    }

    const epoch = authEpochRef.current;
    try {
      const profile = await profileService.get(currentUser.uid);
      if (epoch !== authEpochRef.current) return null;
      profileRef.current = profile;
      setUserProfile(profile);
      setProfileStatus(profile ? "ready" : "missing");
      if (profile && familiesRef.current.length) {
        void applyMemberships(currentUser, profile, familiesRef.current);
      }

      if (welcomeRequestedRef.current) {
        if (profile?.activeFamilyId) setShowWelcome(true);
        welcomeRequestedRef.current = false;
      }
      return profile;
    } catch (error) {
      if (epoch !== authEpochRef.current) return null;
      // A valid uid-scoped boot cache is allowed to keep the shell usable while
      // offline; otherwise this remains an explicit profile error.
      if (!profileRef.current) {
        setProfileStatus("error");
        showToast({ ...parseAppError(error), duration: 3500 });
      }
      return profileRef.current;
    }
  }, [applyMemberships, showToast]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setAppActive(next === "active"));
    return () => subscription.remove();
  }, []);

  // Auth resolves privacy first. For an already-signed-in uid, hydrate only
  // that uid's local boot snapshot, then refresh authoritative profile in the
  // background. No Firestore family read is required before the Home shell.
  useEffect(() => authService.subscribe((currentUser) => {
    authEpochRef.current += 1;
    const epoch = authEpochRef.current;
    setUser(currentUser);
    setAuthStatus(currentUser ? "signed-in" : "signed-out");
    setFamilyTransition(null);
    resetSharedRealtimeRegistry();
    homeTimeCapsuleService.clearRealtimeCache();

    if (!currentUser) {
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
    void bootSessionCache.read(currentUser.uid).then((cached) => {
      if (epoch !== authEpochRef.current) return;
      if (cached) {
        cacheHydratedUidRef.current = currentUser.uid;
        profileRef.current = cached.profile;
        setUserProfile(cached.profile);
        setFamilies(sortMemberships(cached.memberships));
        setProfileStatus("ready");
        setMembershipStatus("ready");
      }
      void loadAuthoritativeProfile(currentUser);
    });
  }), [loadAuthoritativeProfile]);

  // SINGLE membership source. Its first onSnapshot delivery is the bootstrap
  // membership read; later deliveries are realtime updates. A14 intentionally
  // removes listForUser() from auth boot so the same collection is not fetched
  // and then immediately listened to again.
  useEffect(() => {
    if (!user || !appActive) return;
    const epoch = authEpochRef.current;
    let live = true;
    const stop = familyService.watchForUser(
      user.uid,
      (memberships) => {
        if (!live || epoch !== authEpochRef.current) return;
        const sorted = sortMemberships(memberships);
        setFamilies(sorted);
        setMembershipStatus("ready");
        const profile = profileRef.current;
        if (profile) void applyMemberships(user, profile, sorted);
      },
      () => {
        if (!live || epoch !== authEpochRef.current) return;
        // Keep a valid uid-scoped cache available offline. Without cache, mark
        // the membership bootstrap settled so the UI can show a retryable state.
        setMembershipStatus((current) => current === "ready" ? current : "ready");
      },
    );
    return () => {
      live = false;
      stop();
    };
  }, [appActive, applyMemberships, user]);

  // Persist only after Firebase Auth has confirmed the uid. This cache speeds up
  // future cold starts but never grants access or bypasses Firestore Rules.
  useEffect(() => {
    if (!user || !userProfile || profileStatus !== "ready" || membershipStatus !== "ready") return;
    void bootSessionCache.write(user.uid, userProfile, families).catch(() => undefined);
  }, [families, membershipStatus, profileStatus, user, userProfile]);

  const refreshProfile = useCallback(() => loadAuthoritativeProfile(user), [loadAuthoritativeProfile, user]);

  const switchFamily = useCallback(async (familyId: string) => {
    if (!user || !familyId) return false;
    const localTarget = families.find((item) => item.familyId === familyId);
    if (userProfile?.activeFamilyId === familyId && localTarget) return true;

    setFamilyTransition({ targetFamilyId: familyId, targetFamilyName: localTarget?.familyName || "gia đình mới", startedAt: Date.now() });
    try {
      await yieldToPaint();
      // Authoritative membership doc + reverse index are verified by the service.
      const verified = await familyService.switchActiveFamily(user.uid, familyId);
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
      setFamilyTransition(null);
      showToast({ ...parseAppError(error), duration: 3500 });
      return false;
    }
  }, [families, showToast, user, userProfile?.activeFamilyId]);

  const completeFamilyTransition = useCallback(() => {
    setFamilyTransition((current) => {
      if (current && typeof __DEV__ !== "undefined" && __DEV__) {
        console.log(`[A14][perf] family switch ${current.targetFamilyId} ready in ${Date.now() - current.startedAt}ms`);
      }
      return null;
    });
  }, []);
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  const logout = useCallback(async () => {
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
    await authService.signOut();
    welcomeRequestedRef.current = false;
    cacheHydratedUidRef.current = null;
    setConfirmation(null);
    setPendingPhoneNumber(null);
    setFamilyTransition(null);
    setShowWelcome(false);
  }, [user]);

  const loginWithGoogle = useCallback(async () => {
    try {
      welcomeRequestedRef.current = true;
      await authService.signInWithGoogle();
    } catch (error) {
      welcomeRequestedRef.current = false;
      showToast({ ...parseAppError(error), duration: 3500 });
    }
  }, [showToast]);

  const sendPhoneCode = useCallback(async (phoneNumber: string) => {
    const normalized = authService.normalizePhoneNumber(phoneNumber);
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      showToast({ ...parseAppError({ code: "auth/invalid-phone-number" }), duration: 3000 });
      return false;
    }
    setIsLoadingPhone(true);
    try {
      const result = await authService.sendPhoneCode(normalized);
      setConfirmation(result);
      setPendingPhoneNumber(normalized);
      return true;
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
      return false;
    } finally {
      setIsLoadingPhone(false);
    }
  }, [showToast]);

  const confirmPhoneCode = useCallback(async (code: string) => {
    if (!confirmation) {
      showToast({ ...parseAppError({ code: "auth/code-expired" }), duration: 3000 });
      return false;
    }
    setIsLoadingPhone(true);
    try {
      welcomeRequestedRef.current = true;
      await authService.confirmPhoneCode(confirmation, code);
      setConfirmation(null);
      return true;
    } catch (error) {
      welcomeRequestedRef.current = false;
      showToast({ ...parseAppError(error), duration: 3500 });
      return false;
    } finally {
      setIsLoadingPhone(false);
    }
  }, [confirmation, showToast]);

  const resendPhoneCode = useCallback(async () => {
    if (!pendingPhoneNumber) return false;
    return sendPhoneCode(pendingPhoneNumber);
  }, [pendingPhoneNumber, sendPhoneCode]);

  const activeMembership = useMemo(
    () => families.find((item) => item.familyId === userProfile?.activeFamilyId) ?? null,
    [families, userProfile?.activeFamilyId],
  );
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
    showWelcome,
    isInitializing: authStatus === "initializing" || profileStatus === "loading" || membershipStatus === "loading",
    isLoadingPhone,
    loginWithGoogle,
    sendPhoneCode,
    confirmPhoneCode,
    resendPhoneCode,
    pendingPhoneNumber,
    refreshProfile,
    dismissWelcome,
    logout,
  }), [
    user, userProfile, families, activeMembership, familySelectionRequired, familyTransition,
    switchFamily, completeFamilyTransition, authStatus, profileStatus, membershipStatus, showWelcome, isLoadingPhone,
    loginWithGoogle, sendPhoneCode, confirmPhoneCode, resendPhoneCode, pendingPhoneNumber,
    refreshProfile, dismissWelcome, logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider");
  return context;
};
