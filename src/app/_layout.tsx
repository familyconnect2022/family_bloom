import { familyBloomSessionDiagnostics as diagnostic, sessionDiagnosticsEnabled } from "../diagnostics/sessionDiagnostics";
import { metroTestLogsEnabled } from "../diagnostics/metroLogging";
import { BloomThemeProvider , useBloomColorsRevision, useBloomTypographyRevision} from '../theme/BloomThemeProvider';
import { BloomThemedPlane } from '../components/layout/BloomThemedPlane';
import { BloomAppearanceAccountBridge } from '../theme/BloomAppearanceAccountBridge';
import { createBloomStyles } from '../theme/createBloomStyles';
import { COLORS } from '../constants/theme';
import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../components/ui/BloomText';
import * as SplashScreen from "expo-splash-screen";
import { BloomAppBootstrap } from "../components/system/BloomAppBootstrap";
import { BloomInternetBanner } from "../components/system/BloomInternetBanner";
import { DeferredFamilyPrewarm } from "../components/system/DeferredFamilyPrewarm";
import { BoardGamePresentationRoot } from "../components/games/BoardGamePresentationRoot";
import { FirebaseBoardInvitationGate } from "../components/games/FirebaseBoardInvitationGate";



import { closeBoardGamePresentation } from "../services/games/boardGamePresentationStore";
import { BloomPushBridge } from "../components/system/BloomPushBridge";
import { MediaViewerProvider } from "../components/media/MediaViewerProvider";
import { BloomToastProvider } from "../components/ui/BloomToast";
import { BloomDialogProvider } from "../components/ui/BloomDialogProvider";
import { BLOOM_MOTION, getBloomScreenAnimation } from "../constants/motion";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { FamilyRealtimeProvider } from "../context/FamilyRealtimeContext";
import { MomentPublishProvider } from "../context/MomentPublishContext";
import { MomentUploadToast } from "../components/moments/MomentUploadToast";
import { TabStartupProvider, useTabStartup } from "../context/TabStartupContext";
import { HomeMusicPlayerProvider } from "../context/HomeMusicPlayerContext";
import { runtimeDiagnosticsService } from "../services/error/runtimeDiagnosticsService";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { bootstrapCoordinator } from "../services/bootstrap/bootstrapCoordinator";
import { bloomTaskScheduler } from "../services/performance/bloomTaskScheduler";
import { useAvatarPickerActive } from "../services/media/avatarPickerActivity";
import { resolveRootRoute } from "../services/navigation/rootRoutePolicy";
import { canEnterFamilyHome } from "../services/navigation/familySessionAccess";
import { useA3LegacyStyles } from '../appearance3/compatReactiveStyles';


// Visual D3: never swallow the native splash lifecycle without leaving a trace.
// This call is still outside React's render as expo-splash-screen recommends.
void SplashScreen.preventAutoHideAsync()
  .then(() => diagnostic.note("NAVIGATION", "probe", { source: "native", result: "splash-prevent-resolved" }))
  .catch(() => diagnostic.note("NAVIGATION", "probe", { source: "native", result: "splash-prevent-rejected" }));

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
    showWelcome,
    welcomeReady,
    singleSessionStatus,
    userProfile,
  } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const pickingAvatar = useAvatarPickerActive();
  const router = useRouter();
  const { ready: tabsReady, release: releaseTabStartup } = useTabStartup();
  const rootSegment = segments[0];

  useEffect(() => {
    diagnostic.note("NAVIGATION", "route", { source: "router", route: pathname, result: "pathname-updated" });
  }, [pathname]);

  // P2.4: route-segment churn is isolated in this tiny gate. Switching between
  // the five tab routes no longer re-renders the Root Stack or global hosts.
  useEffect(() => {
    // Opening Android Photos is not a navigation request. Do not redirect or
    // remount a draft while the external picker Activity owns the screen.
    if (pickingAvatar) return;
    // Protected routes may all be unavailable while identity/profile is loading.
    // Always park on the public, data-free anchor before mounting private UI.
    const identityPending = (authStatus === "initializing" || authStatus === "error" || singleSessionStatus === 'unavailable')
      || (!!user && (profileStatus === "loading" || profileStatus === "idle"))
      || (profileStatus === "ready" && (membershipStatus === "loading" || membershipStatus === "error" || !welcomeReady));
    // Welcome must be shown over the safe anchor, NOT over an already-mounted Home.
    const welcomePending = authStatus === "signed-in" && showWelcome && welcomeReady && membershipStatus === "ready" && !!user && userProfile?.uid === user.uid
      && !!activeFamilyId && families.some(item => item.familyId === activeFamilyId);
    if (identityPending || profileStatus === "error") {
      if (pathname !== "/session-gate") {
        setNavigationStable(false);
        diagnostic.note("NAVIGATION", "redirect", { source: "router", route: "/session-gate", result: "gate-pending" });
        router.replace("/session-gate" as never);
      } else {
        setNavigationStable(true);
      }
      return;
    }
    // A verified Welcome is presented as a ROOT SIBLING above the Stack.
    // Never navigate to a second native screen after the Google Activity:
    // /welcome previously reported onLayout=true while Android stayed white.
    // The always-available safe session-gate remains behind the letter.
    if (welcomePending) {
      if (pathname !== "/session-gate") {
        setNavigationStable(false);
        router.replace("/session-gate" as never);
      } else {
        setNavigationStable(true);
      }
      return;
    }

    const hasValidActiveFamily = !!activeFamilyId && families.some((item) => item.familyId === activeFamilyId);
    const decision = resolveRootRoute({
      pathname, rootSegment, isSignedIn: !!user, profileStatus,
      familySelectionRequired, hasValidActiveFamily, familyTransition: !!familyTransition,
    });
    const target = decision?.target ?? null;
    const targetMode = decision?.mode ?? "replace";

    if (target && target !== pathname && !(rootSegment === "(tabs)" && target === "/(tabs)")) {
      diagnostic.note("NAVIGATION", "redirect", { source: "router", route: target, result: "policy-redirect" });
      setNavigationStable(false);
      if (targetMode === "navigate") router.navigate(target as never);
      else router.replace(target as never);
      // Do not lie about navigation becoming stable after an arbitrary delay.
      // The pathname effect will mark it ready once the destination is mounted.
      return;
    }

    setNavigationStable(true);
    // A direct deep link/detail route is itself the active visual surface; it
    // must not wait for a tab that is intentionally not mounted.
    if (rootSegment && rootSegment !== "(tabs)") releaseTabStartup();
  }, [
    activeFamilyId,
    authStatus,
    singleSessionStatus,
    families,
    familySelectionRequired,
    familyTransition,
    membershipStatus,
    profileStatus,
    rootSegment,
    pathname,
    pickingAvatar,
    releaseTabStartup,
    router,
    setNavigationStable,
    user,
    userProfile?.uid,
    showWelcome,
    welcomeReady,
  ]);

  useEffect(() => {
    if (!familyTransition || !activeFamilyId || familyTransition.targetFamilyId !== activeFamilyId) return;
    if (rootSegment === "(tabs)" && tabsReady && navigationStable) completeFamilyTransition();
  }, [activeFamilyId, completeFamilyTransition, familyTransition, navigationStable, rootSegment, tabsReady]);

  return null;
};

const RootNavigator = ({ runtimeReady, criticalVisualAssetsReady }: { runtimeReady: boolean; criticalVisualAssetsReady: boolean }) => {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  // Restrict appearance-driven reconciliation to the navigation surface;
  // AuthProvider / game presentation / persistent upload hosts stay mounted.
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
    welcomeReady,
    singleSessionStatus,
  } = useAuth();
  const [navigationStable, setNavigationStable] = useState(false);
  const [nativeStackHostLaidOut, setNativeStackHostLaidOut] = useState(false);
  const splashHideStarted = useRef(false);
  const segments = useSegments();
  const pathname = usePathname();
  const { families, familySelectionRequired } = useAuth();
  const verifiedProfile = !!user && !!userProfile && userProfile.uid === user.uid
    && authStatus === "signed-in" && profileStatus === "ready" &&
    (singleSessionStatus === 'off' || singleSessionStatus === 'active');
  const verifiedFamily = authStatus === "signed-in" &&
    (singleSessionStatus === 'off' || singleSessionStatus === 'active') && canEnterFamilyHome({
    uid: user?.uid, profileUid: userProfile?.uid, profileStatus, membershipStatus,
    activeFamilyId, verifiedMembershipFamilyIds: families.map(item => item.familyId),
    familySelectionRequired,
  });
  const welcomeBlocking = verifiedFamily && welcomeReady && showWelcome;
  const allowFamilyRoutes = verifiedFamily && welcomeReady && !welcomeBlocking;
  const { ready: activeSurfaceReady, chromeReady: tabBarVisualReady } = useTabStartup();

  // The unprotected session-gate is a visible, data-free surface during every
  // unresolved state. Never hide native splash over an empty protected Stack.
  // Do NOT re-lock the splash when returning from Welcome: the gate remains
  // mounted until Tabs reports a real first frame.
  // Icon font loading must never create a permanent post-login blank native
  // surface. Identity/profile/membership gates still own route authorization.
  // Do not hide the native splash just because Welcome has been requested.
  // The requested screen may still be absent while Stack.Protected changes.
  const firstVisualReady = authStatus !== "initializing" && navigationStable;
  const familyUiReady = allowFamilyRoutes && activeSurfaceReady && tabBarVisualReady;
  const showTransitionShield = allowFamilyRoutes && !familyUiReady;
  const authHandoffShield = !!user && !welcomeBlocking && (segments[0] === "(auth)" || !navigationStable);
  const familySwitchShield = !!familyTransition && !welcomeBlocking;
  const devVisualProbe = sessionDiagnosticsEnabled && typeof __DEV__ !== "undefined" && __DEV__ && welcomeBlocking;
  // The verified Welcome is rendered IN the native /session-gate screen itself,
  // not in a React sibling of the Android Native Stack. The old root sibling
  // received onLayout while Android still displayed the gate underneath.

  // Diagnostic-only visual watchdog. Does not dismiss shields, enter Home,
  // alter session permission state, or call the router. Layout != native paint.
  useEffect(() => {
    if (!allowFamilyRoutes || !showTransitionShield) {
      if (allowFamilyRoutes) diagnostic.note("NAVIGATION", "layout", { result: "shield-released" });
      return;
    }
    const ticket = diagnostic.start("NAVIGATION", "foreground", 7500, { source: "native", route: pathname });
    return () => { diagnostic.success(ticket, { result: "shield-state-changed" }); };
  }, [allowFamilyRoutes, showTransitionShield]);

  useEffect(() => {
    if (!welcomeBlocking) return;
    diagnostic.note("WELCOME", "foreground", { result: "verified-in-session-gate" });
  }, [welcomeBlocking]);

  useEffect(() => {
    if (metroTestLogsEnabled) {
      console.info("[BloomGate]", {
        route: pathname, authStatus, profileStatus, membershipStatus,
        welcomeReady, welcomeBlocking, navigationStable,
        tabsAllowed: allowFamilyRoutes,
      });
    }
  }, [pathname, authStatus, profileStatus, membershipStatus, welcomeReady, welcomeBlocking, navigationStable, allowFamilyRoutes]);

  // Splash is only a native startup cover. Its dismissal must not depend
  // indefinitely on React Router's navigationStable flag after a verified
  // Welcome was already selected. The /session-gate native stack must exist.
  const splashSafeToHide = nativeStackHostLaidOut && (firstVisualReady || welcomeBlocking);
  useEffect(() => {
    if (!splashSafeToHide || splashHideStarted.current) return;
    splashHideStarted.current = true;
    let cancelled = false;
    const run = async () => {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        diagnostic.note("NAVIGATION", "probe", { source: "native", result: "splash-hide-request", attempt });
        if (metroTestLogsEnabled) console.info("[BloomVisualD3] splash-hide-request", attempt);
        try {
          await SplashScreen.hideAsync();
          if (!cancelled) {
            diagnostic.note("NAVIGATION", "probe", { source: "native", result: "splash-hide-resolved", attempt });
            if (metroTestLogsEnabled) console.info("[BloomVisualD3] splash-hide-resolved", attempt);
          }
          return;
        } catch {
          if (cancelled) return;
          diagnostic.note("NAVIGATION", "probe", { source: "native", result: "splash-hide-rejected", attempt });
          if (metroTestLogsEnabled) console.warn("[BloomVisualD3] splash-hide-rejected", attempt);
          if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 750));
        }
      }
    };
    void run();
    return () => { cancelled = true; };
  }, [splashSafeToHide]);

  useEffect(() => {
    if (!welcomeBlocking) return;
    // Event states whether the root React plane exists; it does NOT prove paint.
    diagnostic.note("NAVIGATION", "probe", { source: "root", result:
      familySwitchShield ? "family-shield-active" : authHandoffShield ? "auth-shield-active" :
      showTransitionShield ? "tab-shield-active" : "root-shields-clear" });
    if (metroTestLogsEnabled) console.info("[BloomVisualD3] root-planes", {
      route: pathname, nativeStackHostLaidOut, navigationStable,
      welcomeBlocking, familySwitchShield, authHandoffShield, showTransitionShield,
    });
  }, [welcomeBlocking, familySwitchShield, authHandoffShield, showTransitionShield, pathname, nativeStackHostLaidOut, navigationStable]);

  // Game boards are route-owned; app boot no longer manages a persistent game presentation latch.

  const navigationStack = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: getBloomScreenAnimation(),
        animationDuration: BLOOM_MOTION.screen.duration,
        statusBarAnimation: "fade",
      }}
    >
      {/* Always-available first screen is the fallback for *all* protected routes. */}
      <Stack.Screen name="session-gate" options={{ animation: "none" }} />
      {/* Auth is the only public feature group. Private routes also require Firebase Rules. */}
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" options={{ animation: "none", freezeOnBlur: true }} />
      </Stack.Protected>
      <Stack.Protected guard={!!user && profileStatus === "missing"}>
        <Stack.Screen name="(profile)/create-profile" options={{ animation: getBloomScreenAnimation() }} />
      </Stack.Protected>
      <Stack.Protected guard={verifiedProfile}>
      <Stack.Screen name="(family)/(membership)/family-gateway" options={{ headerShown: false }} />
      <Stack.Screen name="(family)/(membership)/family-select" options={{ headerShown: false }} />
      <Stack.Screen name="(family)/(membership)/family-memberships" options={{ animation: getBloomScreenAnimation() }} />
      </Stack.Protected>
      {/* Welcome is presented inside the existing /session-gate Native Stack
          screen only after verification. Never create a separate /welcome
          screen or place a sibling above an Android native stack. */}
      <Stack.Protected guard={false}>
        <Stack.Screen name="welcome" options={{ animation: "none" }} />
      </Stack.Protected>
      <Stack.Protected guard={allowFamilyRoutes}>
      <Stack.Screen name="(tabs)" options={{ freezeOnBlur: true, animation: "none" }} />
      <Stack.Screen name="(profile)/profile" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(profile)/settings" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/developer-tools" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/server-status" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/firestore-data-fault-test" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/board-game-bot-test" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(activity)/(notifications)/notifications" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(activity)/(notifications)/notification-preferences" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/(membership)/family-join-requests" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/family-timeline" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(activity)/event/[eventId]" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/member/[uid]" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/(graph)/family-graph" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/(graph)/family-graph-proposals" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/(graph)/family-graph-admin" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/(graph)/family-graph-person-editor" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(family)/(graph)/family-graph-relationship-editor" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(chat)/chat/index" />
      <Stack.Screen name="(home)/(whispers)/home-whispers" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(polls)/home-polls" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(kitchen)/home-kitchen/index" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(kitchen)/home-kitchen/[recipeId]" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(time-capsule)/home-time-capsules" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(time-capsule)/home-time-capsule-compose" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(time-capsule)/home-time-capsule/[capsuleId]" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(learning)/learning-library" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(learning)/learning-articles" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(learning)/learning-editor" options={{ animation: getBloomScreenAnimation(), gestureEnabled:false }} />
      <Stack.Screen name="(home)/(learning)/learning-lesson" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(learning)/study-questions" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(learning)/study-question-compose" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(learning)/study-question-detail" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(profile)/cloud-manager" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(games)/home-games" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(games)/home-chess" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(games)/home-xiangqi" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(fund)/home-fund" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(home)/(board)/home-board" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(memories)/memory-book" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/appearance-integrity-test" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/motion-lab" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/family-graph-integrity-test" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/performance-graph-test" options={{ animation: getBloomScreenAnimation() }} />
      <Stack.Screen name="(internal)/performance-data-test" options={{ animation: getBloomScreenAnimation() }} />
      </Stack.Protected>
    </Stack>
  );

  return (
    <BloomThemedPlane tone="surface" style={__a3_styles.rootNavigatorHost} collapsable={false}>
      <RootRouteGate navigationStable={navigationStable} setNavigationStable={setNavigationStable} />
      <BloomThemedPlane tone="background" style={__a3_styles.navigationPlane} collapsable={false}
        onLayout={() => {
          setNativeStackHostLaidOut(true);
          diagnostic.note("NAVIGATION", "layout", { result: "native-stack-host-layout" });
        }}>
        {navigationStack}
      </BloomThemedPlane>
      {familyTransition && !welcomeBlocking ? (
        <BloomAppBootstrap ready={false} message={`Đang vào ${familyTransition.targetFamilyName}…`} />
      ) : null}
      {runtimeReady ? <BloomPushBridge /> : null}
      {/* Home remains unmounted until the verified Welcome in session-gate
          has been acknowledged and its ledger write has succeeded. */}
      {/* During the auth -> protected stack handoff, always paint a real loading
          surface instead of the platform's empty native stack. This is visual
          only: all uid/profile/family gates remain enforced above. */}
      {!!user && !welcomeBlocking && (segments[0] === "(auth)" || !navigationStable) ? (
        <BloomAppBootstrap ready={false} message="Đang xác minh và mở mái nhà…" />
      ) : null}
      {/* Keep the screen painted between the Welcome dismissal and the first
          actual Tabs frame. A previous hideAsync cannot re-show native splash. */}
      {showTransitionShield ? (
        <BloomAppBootstrap ready={false} message="Đang mở mái nhà của bạn…" />
      ) : null}
      {/* TEMPORARY DEBUG PROBE: this is a React ROOT sibling, independent from
          /session-gate's Welcome child. If this ribbon appears but the green
          ribbon does not, inspect the native Stack/window focus. */}
      {devVisualProbe ? (
        <View style={__a3_styles.rootVisualProbe} pointerEvents="none" testID="d3-root-visual-probe"
          onLayout={() => diagnostic.note("NAVIGATION", "probe", { source: "root", result: "root-probe-layout" })}>
          <Text style={__a3_styles.rootVisualProbeText}>D3 ROOT · {nativeStackHostLaidOut ? "STACK LAYOUT" : "STACK PENDING"}</Text>
        </View>
      ) : null}
    </BloomThemedPlane>
  );
};

function FamilySession({ criticalVisualAssetsReady }: { criticalVisualAssetsReady: boolean }) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const { user, userProfile, activeFamilyId, families, familySelectionRequired, authStatus, profileStatus, membershipStatus, singleSessionStatus } = useAuth();
  const sessionKey = useMemo(() => `${user?.uid ?? "guest"}:${activeFamilyId ?? "no-family"}`, [activeFamilyId, user?.uid]);
  const authenticatedGameShellReady = authStatus === "signed-in" &&
    (singleSessionStatus === 'off' || singleSessionStatus === 'active') && canEnterFamilyHome({
    uid: user?.uid, profileUid: userProfile?.uid, profileStatus, membershipStatus,
    activeFamilyId, verifiedMembershipFamilyIds: families.map(item => item.familyId),
    familySelectionRequired,
  });
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

  // P2.37: the game presentation plane belongs to the authenticated app shell,
  // never to Login/Auth. Losing user/family identity deterministically clears
  // the presentation before the native sibling is unmounted.
  useEffect(() => {
    if (authenticatedGameShellReady) return;
    closeBoardGamePresentation();
  }, [authenticatedGameShellReady]);

  return (
    <FamilyRealtimeProvider key={sessionKey} liveReady={backgroundWarmReady && authenticatedGameShellReady}>
      <GestureHandlerRootView style={__a3_styles.gestureRoot}>
        <View style={__a3_styles.familySessionPlane} collapsable={false}>
          <TabStartupProvider key={sessionKey} enabled={authenticatedGameShellReady}>
            <RootNavigator runtimeReady={backgroundWarmReady} criticalVisualAssetsReady={criticalVisualAssetsReady} />
          </TabStartupProvider>
          <DeferredFamilyPrewarm ready={backgroundWarmReady} />
          {authenticatedGameShellReady && user && activeFamilyId ? (
            <>
              <FirebaseBoardInvitationGate uid={user.uid} familyId={activeFamilyId} ready={backgroundWarmReady} />
            </>
          ) : null}
        </View>
        {authenticatedGameShellReady ? <BoardGamePresentationRoot key={`game-host:${sessionKey}`} /> : null}
        <BloomInternetBanner />
        <MomentUploadToast />
      </GestureHandlerRootView>
    </FamilyRealtimeProvider>
  );
}

export default function RootLayout() {
  // No theme subscription at the app's highest provider boundary.
  const [iconFontReady, iconFontError] = useFonts(Ionicons.font);
  const criticalVisualAssetsReady = iconFontReady || !!iconFontError;

  return (
    <BloomThemeProvider>
    <BloomToastProvider>
      <BloomDialogProvider>
      <MediaViewerProvider>
        <AuthProvider>
          <BloomAppearanceAccountBridge>
          <MomentPublishProvider>
            <HomeMusicPlayerProvider>
              <FamilySession criticalVisualAssetsReady={criticalVisualAssetsReady} />
            </HomeMusicPlayerProvider>
          </MomentPublishProvider>
          </BloomAppearanceAccountBridge>
        </AuthProvider>
      </MediaViewerProvider>
      </BloomDialogProvider>
    </BloomToastProvider>
    </BloomThemeProvider>
  );
}


const styles = createBloomStyles(() => StyleSheet.create({
  gestureRoot: { flex: 1 },
  familySessionPlane: { flex: 1, alignSelf: "stretch", position: "relative" },
  rootNavigatorHost: { flex: 1, alignSelf: "stretch", position: "relative", overflow: "hidden", backgroundColor: COLORS.surface },
  navigationPlane: { flex: 1, alignSelf: "stretch", position: "relative", overflow: "hidden", backgroundColor: COLORS.background },
  rootVisualProbe: { position: "absolute", bottom: 7, left: 8, right: 8, minHeight: 27, zIndex: 20000, elevation: 200, borderRadius: 6, backgroundColor: "#B01688", alignItems: "center", justifyContent: "center" },
  rootVisualProbeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.2 },
  }));
