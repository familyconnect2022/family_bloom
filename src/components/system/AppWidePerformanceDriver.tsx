import { usePathname, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { PERFORMANCE_TEST_BUILD } from "../../constants/performanceTest";
import { APP_WIDE_PERFORMANCE_STEPS, appWidePerformanceService } from "../../services/performance/appWidePerformanceService";

const routeForSyntheticStep = (type: "graph" | "stress") => type === "graph" ? "/performance-graph-test" : "/performance-data-test";

/**
 * Phase 15B is development-only. Keep the release component hook-free so the
 * diagnostic harness itself cannot add routing subscriptions to production.
 */
export function AppWidePerformanceDriver() {
  if (!PERFORMANCE_TEST_BUILD) return null;
  return <EnabledAppWidePerformanceDriver />;
}

/**
 * Global Phase 15B navigator.
 *
 * This component intentionally renders nothing. It lives above every routed
 * screen so an automated performance sweep can continue even after the
 * Performance Lab screen is replaced by a production route.
 */
function EnabledAppWidePerformanceDriver() {
  const router = useRouter();
  const pathname = usePathname();
  const navigationIssuedRef = useRef<string | null>(null);
  const settleKeyRef = useRef<string | null>(null);

  const goTo = useCallback((route: ReturnType<typeof appWidePerformanceService.routeForStep>) => {
    // Phase 15B owns one visible route at a time. replace() is intentional: it
    // prevents the old Performance Lab/detail screen from remaining above a
    // tab route while the hidden navigator advances underneath it.
    router.replace(route as never);
  }, [router]);

  useSyncExternalStore(
    appWidePerformanceService.subscribe,
    appWidePerformanceService.getRevision,
    appWidePerformanceService.getRevision,
  );

  const state = appWidePerformanceService.snapshot();
  const step = state.status === "running" ? APP_WIDE_PERFORMANCE_STEPS[state.currentStep] : undefined;

  useEffect(() => {
    if (state.status !== "running" || !state.runId) return undefined;
    if (!step) {
      const completed = appWidePerformanceService.complete(state.runId);
      router.replace({ pathname: "/performance-test", params: { appSweep: "complete", sweepRunId: state.runId, overall: completed.summary?.overall ?? "N/A" } } as never);
      return undefined;
    }

    // Phase 16B.7: the GLOBAL driver is the only route owner. When a run
    // starts from Performance Lab, navigate DIRECTLY to the current step public
    // URL. The earlier dismissAll -> /(tabs)/play bootstrap added an unrelated
    // intermediate route and could be lost during Android native-stack commits.
    if (!state.runnerReady) {
      if (pathname !== "/performance-test") {
        appWidePerformanceService.markRunnerReady(pathname);
        return undefined;
      }

      const runId = state.runId;
      const target = appWidePerformanceService.routeForStep(state.currentStep, runId);
      let attempts = 0;
      const bootstrap = () => {
        if (!appWidePerformanceService.isActiveRun(runId) || appWidePerformanceService.snapshot().runnerReady) return;
        attempts += 1;
        console.info(`[FB_PERF_DRIVER] BOOTSTRAP attempt=${attempts} run=${runId} target=${String((target as { pathname?: string }).pathname ?? "?")}`);
        router.replace(target as never);
      };

      const firstFrame = requestAnimationFrame(bootstrap);
      const retry1 = setTimeout(bootstrap, 500);
      const retry2 = setTimeout(bootstrap, 1200);
      const retry3 = setTimeout(bootstrap, 2400);
      const failSafe = setTimeout(() => {
        if (!appWidePerformanceService.isActiveRun(runId) || appWidePerformanceService.snapshot().runnerReady) return;
        appWidePerformanceService.abort(runId, "Không thể mở bước đầu tiên của bài kiểm tra hiệu năng sau nhiều lần thử");
        router.replace("/performance-test" as never);
      }, 6000);
      return () => {
        cancelAnimationFrame(firstFrame);
        clearTimeout(retry1);
        clearTimeout(retry2);
        clearTimeout(retry3);
        clearTimeout(failSafe);
      };
    }

    const stepKey = `${state.runId}:${state.currentStep}:${step.type}`;
    console.info(`[FB_PERF_DRIVER] ACTIVE ${state.currentStep + 1}/${state.totalSteps} path=${pathname} target=${step.label}`);

    if (step.type !== "route") {
      settleKeyRef.current = null;
      appWidePerformanceService.beginSyntheticStep(state.runId, state.currentStep);
      const expected = routeForSyntheticStep(step.type);
      if (pathname !== expected && navigationIssuedRef.current !== stepKey) {
        navigationIssuedRef.current = stepKey;
        goTo(appWidePerformanceService.routeForStep(state.currentStep, state.runId));
      }
      return undefined;
    }

    appWidePerformanceService.beginRouteNavigation(state.runId, state.currentStep);
    const matches = appWidePerformanceService.pathMatchesCurrentRoute(pathname);
    if (!matches) {
      settleKeyRef.current = null;
      if (navigationIssuedRef.current !== stepKey) {
        navigationIssuedRef.current = stepKey;
        goTo(appWidePerformanceService.routeForStep(state.currentStep, state.runId));
      }
      const timeoutMs = step.timeoutMs ?? 9000;
      const timeout = setTimeout(() => {
        appWidePerformanceService.failCurrentRoute(state.runId!, state.currentStep, `route timeout > ${timeoutMs}ms · đang ở ${pathname}`);
      }, timeoutMs);
      return () => clearTimeout(timeout);
    }

    navigationIssuedRef.current = stepKey;
    appWidePerformanceService.markRouteArrived(state.runId, state.currentStep);
    if (settleKeyRef.current === stepKey) return undefined;
    settleKeyRef.current = stepKey;

    let secondFrame = 0;
    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        appWidePerformanceService.markRouteSettled(state.runId!, state.currentStep);
        // Keep the route alive a little longer after first usable frame. This
        // captures async data/listener commits without inflating navigation latency.
        dwellTimer = setTimeout(() => {
          appWidePerformanceService.finishRouteStep(state.runId!, state.currentStep);
        }, step.dwellMs ?? 850);
      });
    });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      if (dwellTimer) clearTimeout(dwellTimer);
    };
  }, [goTo, pathname, router, state.currentStep, state.runId, state.runnerReady, state.status, step]);

  if (state.status !== "running" || !step) return null;

  return (
    <View pointerEvents="none" style={styles.hud}>
      <Text style={styles.hudEyebrow}>BLOOM PERFORMANCE · PHASE 15B</Text>
      <Text numberOfLines={1} style={styles.hudTitle}>
        Bước {Math.min(state.currentStep + 1, state.totalSteps)}/{state.totalSteps} · {step.label}
      </Text>
      <Text style={styles.hudMeta}>{state.runnerReady ? `Đã xong ${state.currentStep}/${state.totalSteps} · hãy để máy yên` : "Đang mở bài kiểm tra đầu tiên…"}</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, (state.currentStep / Math.max(1, state.totalSteps)) * 100))}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    position: "absolute",
    left: 14,
    right: 14,
    top: 54,
    zIndex: 100000,
    elevation: 100000,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "rgba(255,248,251,0.96)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(204,84,132,0.32)",
    shadowColor: "#7A3655",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  hudEyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    color: "#C45382",
  },
  hudTitle: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: "800",
    color: "#6F3652",
  },
  hudMeta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "600",
    color: "#8E6A7B",
  },
  track: {
    height: 3,
    marginTop: 7,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: "rgba(196,83,130,0.14)",
  },
  fill: {
    height: 3,
    borderRadius: 99,
    backgroundColor: "#DC5E95",
  },
});
