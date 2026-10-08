import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";
import { authService } from "@/services/auth/authService";
import { familyService } from "@/services/family/familyService";
import { profileService } from "@/services/profile/profileService";
import { localNotificationService } from "../services/push/localNotificationService";
import { pushTokenService } from "../services/push/pushTokenService";
import { ConfirmationResult, User } from "@react-native-firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { AuthStatus, ProfileStatus, UserFamilyMembership, UserProfile } from "../types";

export type FamilyTransition = {
  targetFamilyId: string;
  targetFamilyName: string;
  startedAt: number;
};

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
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const welcomeRequestedRef = useRef(false);
  const autoSwitchRef = useRef<string | null>(null);
  const { showToast } = useBloomToast();

  const applyMemberships = useCallback(async (
    currentUser: User,
    profile: UserProfile,
    membershipsInput: UserFamilyMembership[],
  ) => {
    const memberships = sortMemberships(membershipsInput);
    setFamilies(memberships);

    const activeStillValid = !!profile.activeFamilyId && memberships.some((item) => item.familyId === profile.activeFamilyId);
    if (activeStillValid || memberships.length !== 1) return profile;

    // Nếu chỉ còn đúng một nhà hợp lệ, tự phục hồi active family. Với >1 nhà,
    // không tự đoán thay người dùng: Root Navigator sẽ đưa tới màn Chọn nhà.
    const only = memberships[0];
    if (autoSwitchRef.current === only.familyId) return { ...profile, activeFamilyId: only.familyId };

    autoSwitchRef.current = only.familyId;
    setFamilyTransition({ targetFamilyId: only.familyId, targetFamilyName: only.familyName, startedAt: Date.now() });
    try {
      await familyService.switchActiveFamily(currentUser.uid, only.familyId);
      const next = { ...profile, activeFamilyId: only.familyId };
      setUserProfile(next);
      return next;
    } catch {
      setFamilyTransition(null);
      return profile;
    } finally {
      autoSwitchRef.current = null;
    }
  }, []);

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserProfile(null);
      setFamilies([]);
      setFamilyTransition(null);
      setProfileStatus("idle");
      return null;
    }
    setProfileStatus("loading");
    try {
      let profile = await profileService.get(currentUser.uid);
      if (profile) {
        try {
          const memberships = await familyService.listForUser(currentUser.uid);
          profile = await applyMemberships(currentUser, profile, memberships);
        } catch {
          setFamilies([]);
        }
      } else {
        setFamilies([]);
      }
      setUserProfile(profile);
      setProfileStatus(profile ? "ready" : "missing");

      if (welcomeRequestedRef.current) {
        if (profile?.activeFamilyId) setShowWelcome(true);
        welcomeRequestedRef.current = false;
      }
      return profile;
    } catch (error) {
      setProfileStatus("error");
      showToast({ ...parseAppError(error), duration: 3500 });
      return null;
    }
  }, [applyMemberships, showToast]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => setAppActive(next === "active"));
    return () => subscription.remove();
  }, []);

  useEffect(() => authService.subscribe(async (currentUser) => {
    setUser(currentUser);
    setAuthStatus(currentUser ? "signed-in" : "signed-out");
    await loadProfile(currentUser);
  }), [loadProfile]);

  // Một listener duy nhất cho reverse-index memberships của chính user. Không mở
  // listener cho từng family inactive; vì vậy số realtime nặng không tăng theo số nhà.
  useEffect(() => {
    if (!user || profileStatus !== "ready" || !userProfile || !appActive) return;
    let live = true;
    const stop = familyService.watchForUser(
      user.uid,
      (memberships) => {
        if (!live) return;
        void applyMemberships(user, userProfile, memberships);
      },
      () => {
        // Giữ snapshot hiện tại nếu listener tạm lỗi; service/action cụ thể vẫn kiểm tra quyền.
      },
    );
    return stop;
  }, [appActive, applyMemberships, profileStatus, user, userProfile]);

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user]);

  const switchFamily = useCallback(async (familyId: string) => {
    if (!user || !familyId) return false;
    const localTarget = families.find((item) => item.familyId === familyId);
    if (userProfile?.activeFamilyId === familyId && localTarget) return true;

    setFamilyTransition({ targetFamilyId: familyId, targetFamilyName: localTarget?.familyName || "gia đình mới", startedAt: Date.now() });
    try {
      // Give React two frames to commit/paint BloomAppBootstrap BEFORE Firestore verification.
      // This keeps perceived response immediate even when the network takes 1–3 seconds.
      await yieldToPaint();
      // Không tin local UI cache: service xác nhận reverse index + authoritative member doc.
      // Điều này cũng xử lý race khi admin vừa approve nhưng membership listener chưa render kịp.
      const verified = await familyService.switchActiveFamily(user.uid, familyId);
      setFamilies((current) => current.some((item) => item.familyId === familyId)
        ? current
        : sortMemberships([verified, ...current]));
      setFamilyTransition({ targetFamilyId: familyId, targetFamilyName: verified.familyName || localTarget?.familyName || "gia đình mới", startedAt: Date.now() });
      setUserProfile((current) => current ? { ...current, activeFamilyId: familyId } : current);
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
        console.log(`[Phase7][perf] family switch ${current.targetFamilyId} ready in ${Date.now() - current.startedAt}ms`);
      }
      return null;
    });
  }, []);
  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  const logout = useCallback(async () => {
    if (user) {
      await Promise.allSettled([
        localNotificationService.clearForUser(user.uid),
        pushTokenService.disableCurrentDevice(user.uid),
      ]);
    }
    await authService.signOut();
    welcomeRequestedRef.current = false;
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
  const familySelectionRequired = profileStatus === "ready" && families.length > 1 && !activeMembership;

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
    showWelcome,
    isInitializing: authStatus === "initializing" || profileStatus === "loading",
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
    switchFamily, completeFamilyTransition, authStatus, profileStatus, showWelcome, isLoadingPhone,
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
