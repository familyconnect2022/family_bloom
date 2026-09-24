import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { BloomToastProvider } from "../components/ui/BloomToast";
import { BloomAppBootstrap } from "../components/system/BloomAppBootstrap";
import { MediaViewerProvider } from "../components/media/MediaViewerProvider";
import { WelcomeModal } from "../components/onboarding/WelcomeModal";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { MomentPublishProvider } from "../context/MomentPublishContext";
import { FamilyRealtimeProvider } from "../context/FamilyRealtimeContext";
import { BLOOM_MOTION } from "../constants/motion";
import { TabStartupProvider, useTabStartup } from "../context/TabStartupContext";

const RootNavigator = () => {
  const { user, userProfile, families, authStatus, profileStatus, showWelcome, dismissWelcome } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [navigationStable, setNavigationStable] = useState(false);
  const { ready: tabsReady } = useTabStartup();
  const rootSegment = segments[0];

  useEffect(() => {
    if (authStatus === "initializing" || profileStatus === "loading") {
      setNavigationStable(false);
      return;
    }

    const activeFamilyId = userProfile?.activeFamilyId ?? null;
    const hasValidActiveFamily = !!activeFamilyId && families.some((item) => item.familyId === activeFamilyId);
    const inAuthGroup = rootSegment === "(auth)";
    const inTabs = rootSegment === "(tabs)";
    const onCreateProfile = rootSegment === "create-profile";
    const onFamilyGateway = rootSegment === "family-gateway";
    let target: string | null = null;

    if (!user) {
      if (!inAuthGroup) target = "/(auth)/login";
    } else if (profileStatus === "missing" || profileStatus === "error") {
      if (!onCreateProfile) target = "/create-profile";
    } else if (profileStatus === "ready" && !hasValidActiveFamily) {
      // Chỉ activeFamilyId là chưa đủ. Root gate còn xác nhận membership đã resolve
      // và active family thật sự nằm trong danh sách family mà user có quyền truy cập.
      if (!onFamilyGateway) target = "/family-gateway";
    } else if (profileStatus === "ready" && hasValidActiveFamily && (inAuthGroup || onCreateProfile || onFamilyGateway || (!inTabs && !rootSegment))) {
      target = "/(tabs)";
    }

    if (target) {
      setNavigationStable(false);
      router.replace(target as never);
      const timer = setTimeout(() => setNavigationStable(true), 80);
      return () => clearTimeout(timer);
    }

    setNavigationStable(true);
  }, [authStatus, profileStatus, user, userProfile?.activeFamilyId, families, rootSegment, router]);

  const bootstrapReady = authStatus !== "initializing" && profileStatus !== "loading" && navigationStable
    && (rootSegment !== "(tabs)" || tabsReady);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: BLOOM_MOTION.screen.animation,
          animationDuration: BLOOM_MOTION.screen.duration,
          statusBarAnimation: "fade",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="create-profile" options={{ presentation: "modal", animation: BLOOM_MOTION.modal.animation }} />
        <Stack.Screen name="family-gateway" options={{ headerShown: false }} />
        <Stack.Screen name="profile" options={{ presentation: "modal", animation: BLOOM_MOTION.modal.animation }} />
        <Stack.Screen name="notifications" options={{ presentation: "modal", animation: BLOOM_MOTION.modal.animation }} />
        <Stack.Screen name="family-join-requests" options={{ presentation: "modal", animation: BLOOM_MOTION.modal.animation }} />
        <Stack.Screen name="event/[eventId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
        <Stack.Screen name="member/[uid]" options={{ animation: BLOOM_MOTION.screen.animation }} />
        <Stack.Screen name="family-graph" options={{ animation: BLOOM_MOTION.screen.animation }} />
        <Stack.Screen name="family-graph-admin" options={{ animation: BLOOM_MOTION.screen.animation }} />
        <Stack.Screen name="family-graph-person-editor" options={{ animation: BLOOM_MOTION.screen.animation }} />
        <Stack.Screen name="family-graph-relationship-editor" options={{ animation: BLOOM_MOTION.screen.animation }} />
        <Stack.Screen name="chat/index" />
      </Stack>
      <BloomAppBootstrap ready={bootstrapReady} />
      <WelcomeModal
        visible={showWelcome && bootstrapReady && !!user && !!userProfile?.activeFamilyId && families.some((item) => item.familyId === userProfile.activeFamilyId)}
        name={userProfile?.displayName}
        onContinue={dismissWelcome}
      />
    </>
  );
};

function FamilySession() {
  const { user, userProfile } = useAuth();
  // Recreate read caches and screens on account/family change. Upload tasks live
  // outside this boundary so changing family does not abandon an ongoing upload.
  const sessionKey = JSON.stringify([user?.uid ?? null, userProfile?.activeFamilyId ?? null]);
  return (
    <FamilyRealtimeProvider key={sessionKey}>
      <TabStartupProvider><RootNavigator /></TabStartupProvider>
    </FamilyRealtimeProvider>
  );
}

export default function RootLayout() {
  return (
    <BloomToastProvider>
      <MediaViewerProvider>
        <AuthProvider>
          <MomentPublishProvider>
            <FamilySession />
          </MomentPublishProvider>
        </AuthProvider>
      </MediaViewerProvider>
    </BloomToastProvider>
  );
}
