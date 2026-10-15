import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { BloomAppBootstrap } from "../components/system/BloomAppBootstrap";
import { DeferredFamilyPrewarm } from "../components/system/DeferredFamilyPrewarm";
import { BloomSurfaceStack } from "../components/system/BloomSurfaceStack";
import { BoardGameAudioProvider } from "../components/games/useBoardGameSoundscape";
import { BloomPushBridge } from "../components/system/BloomPushBridge";
import { MediaViewerProvider } from "../components/media/MediaViewerProvider";
import { WelcomeModal } from "../components/onboarding/WelcomeModal";
import { BloomToastProvider } from "../components/ui/BloomToast";
import { BloomDialogProvider } from "../components/ui/BloomDialogProvider";
import { BLOOM_MOTION } from "../constants/motion";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { FamilyRealtimeProvider } from "../context/FamilyRealtimeContext";
import { ChessRealtimeProvider } from "../context/ChessRealtimeContext";
import { XiangqiRealtimeProvider } from "../context/XiangqiRealtimeContext";
import { setChessSurfacePresentationReady } from "../services/chess/chessSurfaceStore";
import { setXiangqiSurfacePresentationReady } from "../services/xiangqi/xiangqiSurfaceStore";
import { MomentPublishProvider } from "../context/MomentPublishContext";
import { TabStartupProvider, useTabStartup } from "../context/TabStartupContext";
import { HomeMusicPlayerProvider } from "../context/HomeMusicPlayerContext";
import { runtimeDiagnosticsService } from "../services/error/runtimeDiagnosticsService";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { bootstrapCoordinator } from "../services/bootstrap/bootstrapCoordinator";
import { bloomTaskScheduler } from "../services/performance/bloomTaskScheduler";

void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const RootRouteGate = ({
  navigationStable,
  setNavigationStable,
}: {
  navigationStable: boolean;
  setNavigationStable: (value: boolean) => void;
}) => {
  const {
    user,
    families,
    activeFamilyId,
    familySelectionRequired,
    familyTransition,
    completeFamilyTransition,
    authStatus,
    profileStatus,
    membershipStatus,
  } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { ready: tabsReady, release: releaseTabStartup } = useTabStartup();
  const rootSegment = segments[0];

  // P2.4: route-segment churn is isolated in this tiny gate. Switching between
  // the five tab routes no longer re-renders the Root Stack or global hosts.
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
        target = "/(tabs)";
      } else if (familyTransition && !inTabs) {
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
    // A direct deep link/detail route is itself the active visual surface; it
    // must not wait for a tab that is intentionally not mounted.
    if (rootSegment && rootSegment !== "(tabs)") releaseTabStartup();
  }, [
    activeFamilyId,
    authStatus,
    families,
    familySelectionRequired,
    familyTransition,
    membershipStatus,
    profileStatus,
    rootSegment,
    releaseTabStartup,
    router,
    setNavigationStable,
    user,
  ]);

  useEffect(() => {
    if (!familyTransition || !activeFamilyId || familyTransition.targetFamilyId !== activeFamilyId) return;
    if (rootSegment === "(tabs)" && tabsReady && navigationStable) completeFamilyTransition();
  }, [activeFamilyId, completeFamilyTransition, familyTransition, navigationStable, rootSegment, tabsReady]);

  return null;
};

const RootNavigator = ({ runtimeReady, criticalVisualAssetsReady }: { runtimeReady: boolean; criticalVisualAssetsReady: boolean }) => {
  useEffect(() => runtimeDiagnosticsService.installGlobalHandler(), []);
  const {
    user,
    userProfile,
    activeFamilyId,
    familyTransition,
    authStatus,
    profileStatus,
    membershipStatus,
    showWelcome,
    dismissWelcome,
  } = useAuth();
  const [navigationStable, setNavigationStable] = useState(false);
  const { ready: activeSurfaceReady, chromeReady: tabBarVisualReady } = useTabStartup();

  const nativeBootReady = authStatus !== "initializing"
    && profileStatus !== "loading"
    && membershipStatus !== "loading"
    && navigationStable;

  // P2.12: do not release the native splash until the persistent bottom chrome
  // has actually laid out and painted. Font readiness alone does not prove the
  // tabbar has pixels on screen and previously exposed a white strip at boot.
  const firstVisualReady = nativeBootReady
    && criticalVisualAssetsReady
    && activeSurfaceReady
    && tabBarVisualReady;

  useEffect(() => {
    if (!firstVisualReady) return;
    void SplashScreen.hideAsync().catch(() => undefined);
  }, [firstVisualReady]);

  // P2.15.5: presentation readiness is a one-way boot latch, not a route/tab
  // visibility signal. `firstVisualReady` includes tabbar readiness and may
  // legitimately fall back to false when a full-screen game/detail route owns
  // the screen. Tying persistent board visibility to that volatile value was
  // the root cause of the Xiangqi white-shell regression: the route remained
  // focused while the retained board was translated off-screen. Once the app
  // has produced its first stable visual frame, persistent root surfaces stay
  // presentation-capable for the lifetime of this RootNavigator. Feature stores
  // still own hidden/full/mini and cross-game arbitration explicitly.
  const persistentSurfacePresentationLatchedRef = useRef(false);
  const persistentSurfaceBootReady = nativeBootReady && criticalVisualAssetsReady;
  useEffect(() => {
    if (!persistentSurfaceBootReady || familyTransition || persistentSurfacePresentationLatchedRef.current) return;
    persistentSurfacePresentationLatchedRef.current = true;
    setChessSurfacePresentationReady(true);
    setXiangqiSurfacePresentationReady(true);
  }, [familyTransition, persistentSurfaceBootReady]);

  useEffect(() => () => {
    persistentSurfacePresentationLatchedRef.current = false;
    setChessSurfacePresentationReady(false);
    setXiangqiSurfacePresentationReady(false);
  }, []);

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
      <Stack.Screen name="(tabs)" options={{ freezeOnBlur: true }} />
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
      <Stack.Screen name="(chess)/chess-challenge/[inviteId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(chess)/chess-game/[gameId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(xiangqi)/xiangqi-lobby" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(xiangqi)/xiangqi-challenge/[inviteId]" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(xiangqi)/xiangqi-preview" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(memories)/memory-book" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(internal)/performance-graph-test" options={{ animation: BLOOM_MOTION.screen.animation }} />
      <Stack.Screen name="(internal)/performance-data-test" options={{ animation: BLOOM_MOTION.screen.animation }} />
    </Stack>
  );

  return (
    <>
      <RootRouteGate navigationStable={navigationStable} setNavigationStable={setNavigationStable} />
      {navigationStack}
      {familyTransition ? (
        <BloomAppBootstrap ready={false} message={`Đang vào ${familyTransition.targetFamilyName}…`} />
      ) : null}
      {runtimeReady ? <BloomPushBridge /> : null}
      <WelcomeModal
        visible={showWelcome && firstVisualReady && !!user && !!activeFamilyId}
        name={userProfile?.displayName}
        onContinue={dismissWelcome}
      />
    </>
  );
};

function FamilySession({ criticalVisualAssetsReady }: { criticalVisualAssetsReady: boolean }) {
  const { user, activeFamilyId } = useAuth();
  const sessionKey = useMemo(() => `${user?.uid ?? "guest"}:${activeFamilyId ?? "no-family"}`, [activeFamilyId, user?.uid]);
  const [backgroundWarmReady, setBackgroundWarmReady] = useState(false);

  // P2 staged bootstrap: first paint is isolated from realtime/socket/prewarm.
  // The coordinator owns generation, so a family/session switch cancels stale
  // deferred work instead of letting it wake the new workspace.
  useEffect(() => {
    setBackgroundWarmReady(false);
    const generation = bootstrapCoordinator.beginSession(sessionKey);
    bootstrapCoordinator.markIdentityReady(generation);
    let cancelled = false;
    let frameTwo = 0;
    const frameOne = requestAnimationFrame(() => {
      frameTwo = requestAnimationFrame(() => {
        if (cancelled || !bootstrapCoordinator.isCurrent(generation)) return;
        bootstrapCoordinator.markFirstPaint(generation);
        const cancelTask = bloomTaskScheduler.schedule({
          key: `bootstrap:interactive:${sessionKey}`,
          priority: "VISIBLE",
          generation,
          run: () => {
            if (cancelled || !bootstrapCoordinator.isCurrent(generation)) return;
            bootstrapCoordinator.markInteractive(generation);
            setBackgroundWarmReady(true);
          },
        });
        if (cancelled) cancelTask();
      });
    });
    return () => {
      cancelled = true;
      bloomTaskScheduler.cancel(`bootstrap:interactive:${sessionKey}`);
      cancelAnimationFrame(frameOne);
      if (frameTwo) cancelAnimationFrame(frameTwo);
    };
  }, [sessionKey]);

  return (
    <FamilyRealtimeProvider key={sessionKey} liveReady={backgroundWarmReady}>
      <ChessRealtimeProvider bootReady={backgroundWarmReady}>
        <XiangqiRealtimeProvider bootReady={backgroundWarmReady}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <BoardGameAudioProvider enabled={backgroundWarmReady}>
            <TabStartupProvider key={sessionKey} enabled={!!user && !!activeFamilyId}>
              <RootNavigator runtimeReady={backgroundWarmReady} criticalVisualAssetsReady={criticalVisualAssetsReady} />
            </TabStartupProvider>
            <DeferredFamilyPrewarm ready={backgroundWarmReady} />
            <BloomSurfaceStack backgroundWarmReady={backgroundWarmReady} />
          </BoardGameAudioProvider>
        </GestureHandlerRootView>
        </XiangqiRealtimeProvider>
      </ChessRealtimeProvider>
    </FamilyRealtimeProvider>
  );
}

export default function RootLayout() {
  const [iconFontReady, iconFontError] = useFonts(Ionicons.font);
  const criticalVisualAssetsReady = iconFontReady || !!iconFontError;

  return (
    <BloomToastProvider>
      <BloomDialogProvider>
      <MediaViewerProvider>
        <AuthProvider>
          <MomentPublishProvider>
            <HomeMusicPlayerProvider>
              <FamilySession criticalVisualAssetsReady={criticalVisualAssetsReady} />
            </HomeMusicPlayerProvider>
          </MomentPublishProvider>
        </AuthProvider>
      </MediaViewerProvider>
      </BloomDialogProvider>
    </BloomToastProvider>
  );
}
