import { useBloomToast } from "@/components/ui/BloomToast";
import { parseAppError } from "@/constants/errorConstants";
import { authService } from "@/services/auth/authService";
import { profileService } from "@/services/profile/profileService";
import { familyService } from "@/services/family/familyService";
import { ConfirmationResult, User } from "@react-native-firebase/auth";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AuthStatus, ProfileStatus, UserProfile } from "../types";

export type AuthContextType = {
  user: User | null;
  userProfile: UserProfile | null;
  families: import("../types").UserFamilyMembership[];
  activeFamilyId: string | null;
  switchFamily: (familyId: string) => Promise<boolean>;
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

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [families, setFamilies] = useState<import("../types").UserFamilyMembership[]>([]);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("initializing");
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>("idle");
  const [isLoadingPhone, setIsLoadingPhone] = useState(false);
  const [pendingPhoneNumber, setPendingPhoneNumber] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const welcomeRequestedRef = useRef(false);
  const { showToast } = useBloomToast();

  const loadProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setUserProfile(null);
      setFamilies([]);
      setProfileStatus("idle");
      return null;
    }
    setProfileStatus("loading");
    try {
      const profile = await profileService.get(currentUser.uid);
      if (profile) {
        try {
          const memberships = await familyService.listForUser(currentUser.uid);
          setFamilies(memberships);
          // activeFamilyId là family cuối cùng user sử dụng. Nếu family đó không còn hợp lệ,
          // chọn membership mới nhất để app luôn mở được một “nhà” hợp lệ.
          if (memberships.length > 0) {
            const hasActive = !!profile.activeFamilyId && memberships.some(item => item.familyId === profile.activeFamilyId);
            if (!hasActive) {
              const latest = [...memberships].sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))[0];
              try { await familyService.switchActiveFamily(currentUser.uid, latest.familyId); profile.activeFamilyId = latest.familyId; }
              catch { /* Rules sẽ bảo vệ; UI vẫn có thể dùng membership mới nhất để hiển thị. */ }
            }
          }
        } catch {
          setFamilies([]);
        }
      } else {
        setFamilies([]);
      }
      setUserProfile(profile);
      setProfileStatus(profile ? "ready" : "missing");

      // Welcome chỉ xuất hiện đúng một lần sau đăng nhập nếu user đã có nhà.
      // User mới chưa có family sẽ đi qua Family Gateway, không cần thêm modal chồng lên flow đó.
      if (welcomeRequestedRef.current) {
        if (profile?.activeFamilyId) {
          setShowWelcome(true);
        }
        welcomeRequestedRef.current = false;
      }
      return profile;
    } catch (error) {
      setProfileStatus("error");
      showToast({ ...parseAppError(error), duration: 3500 });
      return null;
    }
  }, [showToast]);

  useEffect(() => {
    return authService.subscribe(async (currentUser) => {
      setUser(currentUser);
      setAuthStatus(currentUser ? "signed-in" : "signed-out");
      await loadProfile(currentUser);
    });
  }, [loadProfile]);

  const refreshProfile = useCallback(() => loadProfile(user), [loadProfile, user]);

  const switchFamily = useCallback(async (familyId: string) => {
    if (!user) return false;
    try {
      await familyService.switchActiveFamily(user.uid, familyId);
      setUserProfile((current) => current ? { ...current, activeFamilyId: familyId } : current);
      return true;
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3500 });
      return false;
    }
  }, [user, showToast]);

  const dismissWelcome = useCallback(() => setShowWelcome(false), []);

  const logout = useCallback(async () => {
    await authService.signOut();
    welcomeRequestedRef.current = false;
    setConfirmation(null);
    setPendingPhoneNumber(null);
    setShowWelcome(false);
  }, []);

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

  const value = useMemo<AuthContextType>(() => ({
    user, userProfile, families, activeFamilyId: userProfile?.activeFamilyId ?? null, authStatus, profileStatus, showWelcome,
    isInitializing: authStatus === "initializing" || profileStatus === "loading",
    isLoadingPhone, loginWithGoogle, sendPhoneCode, confirmPhoneCode,
    resendPhoneCode, pendingPhoneNumber, refreshProfile, switchFamily, dismissWelcome, logout,
  }), [user, userProfile, families, authStatus, profileStatus, showWelcome, isLoadingPhone, loginWithGoogle, sendPhoneCode, confirmPhoneCode, resendPhoneCode, pendingPhoneNumber, refreshProfile, switchFamily, dismissWelcome, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth phải nằm trong AuthProvider");
  return context;
};
