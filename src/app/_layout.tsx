import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { BloomAppBootstrap } from "../components/system/BloomAppBootstrap";
import { DeferredFamilyPrewarm } from "../components/system/DeferredFamilyPrewarm";
import { BloomPushBridge } from "../components/system/BloomPushBridge";
import { MediaViewerProvider } from "../components/media/MediaViewerProvider";
import { WelcomeModal } from "../components/onboarding/WelcomeModal";
import { BloomToastProvider } from "../components/ui/BloomToast";
import { BloomDialogProvider } from "../components/ui/BloomDialogProvider";
import { BLOOM_MOTION } from "../constants/motion";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { FamilyRealtimeProvider } from "../context/FamilyRealtimeContext";
import { ChessRealtimeProvider } from "../context/ChessRealtimeContext";
import { ChessSurfaceHost } from "../components/chess/ChessSurfaceHost";
import { ChessMiniHost } from "../components/chess/ChessMiniHost";
import { setChessSurfacePresentationReady } from "../services/chess/chessSurfaceStore";
import { ChessGlobalUiHost } from "../components/chess/ChessGlobalUiHost";
import { MomentPublishProvider } from "../context/MomentPublishContext";
import { TabStartupProvider, useTabStartup } from "../context/TabStartupContext";
import { HomeMusicPlayerProvider } from "../context/HomeMusicPlayerContext";
import { runtimeDiagnosticsService } from "../services/error/runtimeDiagnosticsService";
import { GestureHandlerRootView } from "react-native-gesture-handler";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const RootNavigator = ({ runtimeReady }: { runtimeReady: boolean }) => {
  useEffect(() => runtimeDiagnosticsService.installGlobalHandler(), []);
  const {
    user,
    userProfile,
    families,
    activeFamilyId,
    familySelectionRequired,
    familyTransition,
    completeFamilyTransition,
    authStatus,
    profileStatus,
    membershipStatus,
    showWelcome,
    dismissWelcome,
  } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [navigationStable, setNavigationStable] = useState(false);
  const { ready: tabsReady } = useTabStartup();
  const rootSegment = segments[0];


  useEffect(() => {
    if (authStatus === "initializing" || profileStatus === "loading" || membershipStatus === "loading") {
      setNavigationStable(false);
      return;
    }

    const hasValidActiveFamily = !!activeFamilyId && families.some((item) => item.familyId === activeFamilyId);
    const inAuthGroup = rootSegment === "(auth)";
    const inTabs = rootSegment === "(tabs)";
    const onCreateProfile = rootSegment === "create-profile";
    const onFamilyGateway = rootSegment === "family-gateway";
    const onFamilySelect = rootSegment === "family-select";
    const onFamilyMemberships = rootSegment === "family-memberships";
    let target: string | null = null;
    let targetMode: "replace" | "navigate" = "replace";

    if (!user) {
      if (!inAuthGroup) target = "/(auth)/login";
    } else if (profileStatus === "missing" || profileStatus === "error") {
      if (!onCreateProfile) target = "/create-profile";
    } else if (profileStatus === "ready" && familySelectionRequired) {
      if (!onFamilySelect && !onFamilyMemberships) target = "/family-select";
    } else if (profileStatus === "ready" && !hasValidActiveFamily) {
      if (!onFamilyGateway) target = "/family-gateway";
    } else if (profileStatus === "ready" && hasValidActiveFamily) {
      if (inAuthGroup || onCreateProfile || onFamilyGateway || onFamilySelect || (!inTabs && !rootSegment)) {
        // Gate/auth routes must be replaced so Back cannot return to an invalid gate.
        target = "/(tabs)";
      } else if (familyTransition && !inTabs) {
        // A family switch can start while a detail/membership route sits above the
        // existing Tabs navigator. `replace("/(tabs)")` here would create another
        // Tabs tree and leave the previous one lower in the stack. Navigate/unwind
        // to the existing workspace instead; if none exists Expo Router can still
        // navigate to it as the target route.
        target = "/(tabs)";
        targetMode = "navigate";
      }
    }

    if (target) {
      setNavigationStable(false);
      if (targetMode === "navigate") router.navigate(target as never);
      else router.replace(target as never);
      const timer = setTimeout(() => setNavigationStable(true), 80);
      return () => clearTimeout(timer);
    }

    setNavigationStable(true);
  }, [
    activeFamilyId,
    authStatus,
    families,
    familySelectionRequired,
    familyTransition,
    profileStatus,
    membershipStatus,
    rootSegment,
    router,
    user,
  ]);

  useEffect(() => {
    if (!familyTransition || !activeFamilyId || familyTransition.targetFamilyId !== activeFamilyId) return;
    if (rootSegment === "(tabs)" && tabsReady && navigationStable) completeFamilyTransition();
  }, [activeFamilyId, completeFamilyTransition, familyTransition, navigationStable, rootSegment, tabsReady]);

  const nativeBootReady = authStatus !== "initializing"
    && profileStatus !== "loading"
    && membershipStatus !== "loading"
    && navigationStable;

  useEffect(() => {
    if (!nativeBootReady) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [nativeBootReady]);

  useEffect(() => {
    setChessSurfacePresentationReady(nativeBootReady && !familyTransition);
    return () => setChessSurfacePresentationReady(false);
  }, [familyTransition, nativeBootReady]);


  const navigationStack = (
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
      <Stack.Screen name="(profile)/create-profile" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(membership)/family-gateway" options={{ headerShown: false }} />
      <Stack.Screen name="(family)/(membership)/family-select" options={{ headerShown: false }} />
      <Stack.Screen name="(family)/(membership)/family-memberships" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(profile)/profile" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(profile)/settings" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(internal)/developer-tools" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(activity)/(notifications)/notifications" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(activity)/(notifications)/notification-preferences" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(membership)/family-join-requests" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/family-timeline" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(activity)/event/[eventId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/member/[uid]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(graph)/family-graph" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(graph)/family-graph-proposals" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(graph)/family-graph-admin" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(graph)/family-graph-person-editor" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(family)/(graph)/family-graph-relationship-editor" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(chat)/chat/index" />
      <Stack.Screen name="(home)/(whispers)/home-whispers" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(polls)/home-polls" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(kitchen)/home-kitchen/index" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(kitchen)/home-kitchen/[recipeId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(time-capsule)/home-time-capsules" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(time-capsule)/home-time-capsule-compose" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(time-capsule)/home-time-capsule/[capsuleId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(games)/home-games" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(games)/home-game-create" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(fund)/home-fund" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(home)/(board)/home-board" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(chess)/chess-lobby" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(chess)/chess-history" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(chess)/chess-game/[gameId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(xiangqi)/xiangqi-preview" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(memories)/memory-book" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(internal)/performance-graph-test" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(internal)/performance-data-test" options={{ animation: BLOOM_MOTION.screen.animation }} />
    </Stack>
  );

  return (
    <>
      {navigationStack}
      {familyTransition ? (
        <BloomAppBootstrap ready={false} message={`Đang vào ${familyTransition.targetFamilyName}…`} />
      ) : null}
      {runtimeReady ? <BloomPushBridge /> : null}
      <WelcomeModal
        visible={showWelcome && nativeBootReady && !!user && !!activeFamilyId}
        name={userProfile?.displayName}
        onContinue={dismissWelcome}
      />
    </>
  );
};

function FamilySession() {
  const { user, activeFamilyId } = useAuth();
  const sessionKey = useMemo(() => `${user?.uid ?? "guest"}:${activeFamilyId ?? "no-family"}`, [activeFamilyId, user?.uid]);
  const [backgroundWarmReady, setBackgroundWarmReady] = useState(false);

  // Home gets the first painted frames alone. Firestore family feeds, Graph
  // prewarm and Chess socket wake-up are released only afterwards.
  useEffect(() => {
    setBackgroundWarmReady(false);
    let cancelled = false;
    let frameTwo = 0;
    const frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(() => {
        if (cancelled) return;
        const host = globalThis as typeof globalThis & { requestIdleCallback?: (cb: () => void, options?: { timeout?: number }) => number };
        if (typeof host.requestIdleCallback === "function") {
          host.requestIdleCallback(() => { if (!cancelled) setBackgroundWarmReady(true); }, { timeout: 240 });
        } else {
          setTimeout(() => { if (!cancelled) setBackgroundWarmReady(true); }, 80);
        }
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameOne);
      if (frameTwo) cancelAnimationFrame(frameTwo);
    };
  }, [sessionKey]);

  return (
    <FamilyRealtimeProvider key={sessionKey} liveReady={backgroundWarmReady}>
      <ChessRealtimeProvider bootReady={backgroundWarmReady}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <TabStartupProvider><RootNavigator runtimeReady={backgroundWarmReady} /></TabStartupProvider>
          <DeferredFamilyPrewarm ready={backgroundWarmReady} />
          <ChessGlobalUiHost />
          {backgroundWarmReady ? <ChessSurfaceHost /> : null}
          {backgroundWarmReady ? <ChessMiniHost /> : null}
        </GestureHandlerRootView>
      </ChessRealtimeProvider>
    </FamilyRealtimeProvider>
  );
}

export default function RootLayout() {
  return (
    <BloomToastProvider>
      <BloomDialogProvider>
      <MediaViewerProvider>
        <AuthProvider>
          <MomentPublishProvider>
            <HomeMusicPlayerProvider>
              <FamilySession />
            </HomeMusicPlayerProvider>
          </MomentPublishProvider>
        </AuthProvider>
      </MediaViewerProvider>
      </BloomDialogProvider>
    </BloomToastProvider>
  );
}
