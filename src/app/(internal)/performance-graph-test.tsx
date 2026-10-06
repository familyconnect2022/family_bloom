import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { FamilyGraphPrototype } from "../../components/familyGraph/FamilyGraphPrototype";
import { adaptFamilyGraphSnapshot, type FamilyGraphVisualData } from "../../components/familyGraph/familyGraphLiveAdapter";
import { BloomBackButton } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { createSyntheticFamilyGraph } from "../../services/performance/syntheticFamilyGraph";
import { performanceTestService } from "../../services/performance/performanceTestService";
import { finalPerformanceGateService } from "../../services/performance/finalPerformanceGateService";
import { appWidePerformanceService } from "../../services/performance/appWidePerformanceService";
import { isPerformanceTestAccount } from "../../constants/performanceTest";
import { useAuth } from "../../context/AuthContext";

const ALLOWED = new Set([50, 100, 200, 300, 500]);

type PreparedGraph = {
  count: number;
  visual: FamilyGraphVisualData;
  startedAt: number;
  dataReadyElapsed: number;
};

export default function PerformanceGraphTestScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const allowed = isPerformanceTestAccount(user?.email);
  const params = useLocalSearchParams<{ count?: string; finalGate?: string; gateRunId?: string; gateStep?: string; appSweep?: string; sweepRunId?: string; sweepStep?: string }>();
  const countParam = Array.isArray(params.count) ? params.count[0] : params.count;
  const parsed = Number(countParam ?? 100);
  const count = ALLOWED.has(parsed) ? parsed : 100;
  const gateRunId = Array.isArray(params.gateRunId) ? params.gateRunId[0] : params.gateRunId ?? null;
  const gateStepParam = Array.isArray(params.gateStep) ? params.gateStep[0] : params.gateStep;
  const gateStep = Number(gateStepParam ?? -1);
  const gateRequested = (Array.isArray(params.finalGate) ? params.finalGate[0] : params.finalGate) === "1";
  const gateActive = gateRequested && finalPerformanceGateService.isActiveStep(gateRunId, gateStep, { type: "graph", count });
  const sweepRunId = Array.isArray(params.sweepRunId) ? params.sweepRunId[0] : params.sweepRunId ?? null;
  const sweepStepParam = Array.isArray(params.sweepStep) ? params.sweepStep[0] : params.sweepStep;
  const sweepStep = Number(sweepStepParam ?? -1);
  const sweepRequested = (Array.isArray(params.appSweep) ? params.appSweep[0] : params.appSweep) === "1";
  const sweepActive = sweepRequested && appWidePerformanceService.isActiveSyntheticStep(sweepRunId, sweepStep, { type: "graph", count });
  const autoActive = gateActive || sweepActive;
  const [prepared, setPrepared] = useState<PreparedGraph | null>(null);
  const [rendered, setRendered] = useState({ current: 0, total: count });
  const [summary, setSummary] = useState("Đang chuẩn bị dữ liệu giả…");
  const completedRef = useRef(false);
  const firstPaintElapsedRef = useRef<number | null>(null);
  const pendingFullMountRef = useRef<{ current: number; total: number; elapsed: number } | null>(null);
  const pendingProgressRef = useRef({ current: 0, total: count });
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressUiAtRef = useRef(0);
  const gateAdvancedRef = useRef(false);

  const advanceAutomation = useCallback((status: "PASS" | "FAIL", detail: string) => {
    if (gateAdvancedRef.current) return;
    if (gateActive && gateRunId) {
      const nextRoute = finalPerformanceGateService.markStep(gateRunId, gateStep, status, detail);
      gateAdvancedRef.current = true;
      if (nextRoute) setTimeout(() => router.replace(nextRoute as never), 180);
      return;
    }
    if (sweepActive && sweepRunId) {
      // The global Phase 15B driver owns navigation between sweep steps. Keeping
      // route changes in one place avoids two replace() calls racing each other.
      appWidePerformanceService.markSyntheticStep(sweepRunId, sweepStep, status, detail);
      gateAdvancedRef.current = true;
    }
  }, [gateActive, gateRunId, gateStep, router, sweepActive, sweepRunId, sweepStep]);

  const handleBack = useCallback(() => {
    if (gateActive && gateRunId) {
      finalPerformanceGateService.abort(gateRunId, `Người dùng dừng tại Graph ${count}`);
      router.replace({ pathname: "/performance-test", params: { finalGate: "aborted", gateRunId } } as never);
      return;
    }
    if (sweepActive && sweepRunId) {
      appWidePerformanceService.abort(sweepRunId, `Người dùng dừng tại Graph ${count}`);
      router.replace({ pathname: "/performance-test", params: { appSweep: "aborted", sweepRunId } } as never);
      return;
    }
    router.back();
  }, [count, gateActive, gateRunId, router, sweepActive, sweepRunId]);

  useEffect(() => {
    if (!allowed) {
      router.replace("/(tabs)/play" as never);
      return;
    }
    let active = true;
    completedRef.current = false;
    gateAdvancedRef.current = false;
    firstPaintElapsedRef.current = null;
    pendingFullMountRef.current = null;
    pendingProgressRef.current = { current: 0, total: count };
    lastProgressUiAtRef.current = 0;
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setPrepared(null);
    setRendered({ current: 0, total: count });
    setSummary("Đang chuẩn bị dữ liệu giả…");
    const timer = setTimeout(() => {
      const startedAt = Date.now();
      performanceTestService.start("graph_test", `${count} Person`);
      const generatedAt = Date.now();
      const snapshot = createSyntheticFamilyGraph(count);
      const afterGenerate = Date.now();
      const visual = adaptFamilyGraphSnapshot(snapshot, snapshot.persons[Math.floor(snapshot.persons.length / 2)]?.id ?? null);
      const afterAdapt = Date.now();
      performanceTestService.recordMetric("Graph synthetic generate", afterGenerate - generatedAt, "ms", `${count} Person / RAM only`);
      performanceTestService.recordMetric("Graph layout adapter", afterAdapt - afterGenerate, "ms", `${visual.people.length} Person · ${visual.connections.length} edges`);
      const dataReadyElapsed = afterAdapt - startedAt;
      performanceTestService.mark("graph_test", "data_ready");
      if (active) setPrepared({ count, visual, startedAt, dataReadyElapsed });
    }, 40);
    return () => {
      active = false;
      clearTimeout(timer);
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [allowed, count, router]);

  useEffect(() => {
    if (!autoActive) return undefined;
    const timer = setTimeout(() => {
      performanceTestService.finish("graph_test", "error");
      advanceAutomation("FAIL", `timeout > 25s ở Graph ${count}`);
    }, 25_000);
    return () => clearTimeout(timer);
  }, [advanceAutomation, autoActive, count]);

  const finishFullMount = useCallback((current: number, total: number, elapsed: number) => {
    if (!prepared || completedRef.current) return;
    completedRef.current = true;
    performanceTestService.recordMetric("Graph full progressive mount", elapsed, "ms", `${prepared.count} Person`);
    if (firstPaintElapsedRef.current !== null) {
      performanceTestService.recordMetric(
        "Graph first paint → full mount",
        Math.max(0, elapsed - firstPaintElapsedRef.current),
        "ms",
        `${prepared.count} Person · progressive tail`,
      );
    }
    performanceTestService.mark("graph_test", "all_people_mounted");
    performanceTestService.finish("graph_test");
    setSummary(`Đã mount ${current}/${total} Person trong ${elapsed} ms.${autoActive ? " Bloom sẽ tự chuyển bài tiếp theo…" : " Giờ hãy pan/pinch khoảng 10 giây để cảm nhận."}`);
    advanceAutomation("PASS", `full mount ${elapsed}ms · ${current}/${total} Person`);
  }, [advanceAutomation, autoActive, prepared]);

  useEffect(() => {
    if (!prepared) return;
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        const elapsed = Date.now() - prepared.startedAt;
        firstPaintElapsedRef.current = elapsed;
        performanceTestService.recordMetric("Graph first painted frame", elapsed, "ms", `${prepared.count} Person`);
        performanceTestService.recordMetric(
          "Graph data-ready → first paint",
          Math.max(0, elapsed - prepared.dataReadyElapsed),
          "ms",
          `${prepared.count} Person · React/render portion`,
        );
        performanceTestService.mark("graph_test", "first_painted_frame");
        const pending = pendingFullMountRef.current;
        if (pending) {
          pendingFullMountRef.current = null;
          finishFullMount(pending.current, pending.total, Math.max(pending.elapsed, elapsed));
        } else {
          setSummary(`Frame đầu: ${elapsed} ms · đang mở dần toàn cây…`);
        }
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
    };
  }, [finishFullMount, prepared]);

  const handleRenderedCount = useCallback((current: number, total: number) => {
    // Updating the visible counter on every progressive batch re-rendered the
    // hidden benchmark shell and distorted the thing we were trying to measure.
    // Keep completion exact, but throttle cosmetic progress UI to ~4 Hz.
    pendingProgressRef.current = { current, total };
    const now = Date.now();
    const forceUi = current >= total;
    const commitProgress = () => {
      progressTimerRef.current = null;
      lastProgressUiAtRef.current = Date.now();
      setRendered(pendingProgressRef.current);
    };
    if (forceUi || now - lastProgressUiAtRef.current >= 250) {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      commitProgress();
    } else if (!progressTimerRef.current) {
      progressTimerRef.current = setTimeout(commitProgress, Math.max(16, 250 - (now - lastProgressUiAtRef.current)));
    }

    if (!prepared || completedRef.current || current < total) return;
    const elapsed = Date.now() - prepared.startedAt;
    // On small datasets the progressive limit can already equal total during
    // React's first commit. Do not report "full mount" before the first painted
    // frame; queue completion so the benchmark timeline stays physically valid.
    if (firstPaintElapsedRef.current === null) {
      pendingFullMountRef.current = { current, total, elapsed };
      return;
    }
    finishFullMount(current, total, Math.max(elapsed, firstPaintElapsedRef.current));
  }, [finishFullMount, prepared]);

  const title = useMemo(() => `Cây giả ${count} Person`, [count]);

  if (!allowed) return null;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <BloomBackButton onPress={handleBack} />
        <View style={styles.topCopy}>
          <Text style={styles.kicker}>RAM ONLY · KHÔNG FIREBASE</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{summary}</Text>
        </View>
        <View style={styles.counter}><Text style={styles.counterText}>{rendered.current}/{rendered.total}</Text></View>
      </View>

      <View style={styles.graphArea}>
        {prepared ? (
          <FamilyGraphPrototype
            key={`perf-${count}`}
            familyName={`Performance Test ${count}`}
            familyId="__perf_test_family__"
            people={prepared.visual.people}
            connections={prepared.visual.connections}
            defaultFocusId={null}
            initialViewMode="all"
            canvasWidth={prepared.visual.canvasWidth}
            canvasHeight={prepared.visual.canvasHeight}
            onRenderedCountChange={handleRenderedCount}
          />
        ) : (
          <View style={styles.loading}><Text style={styles.loadingText}>Bloom đang tạo {count} Person giả trong bộ nhớ…</Text></View>
        )}
      </View>

      <Pressable onPress={handleBack} style={({ pressed }) => [styles.resultButton, pressed && styles.pressed]}>
        <Text style={styles.resultText}>{autoActive ? "Dừng test tự động" : "Xem báo cáo đo"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  topBar: { paddingTop: 18, paddingHorizontal: 16, paddingBottom: 10, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  topCopy: { flex: 1 },
  kicker: { color: COLORS.primary, fontSize: 9.5, fontWeight: "900", letterSpacing: 0.7 },
  title: { marginTop: 2, color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  subtitle: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 14 },
  counter: { borderRadius: 999, backgroundColor: COLORS.accentBg, paddingHorizontal: 9, paddingVertical: 6 },
  counterText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  graphArea: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  loadingText: { color: COLORS.secondaryText, fontSize: 13, textAlign: "center" },
  resultButton: { position: "absolute", right: 14, bottom: 18, borderRadius: 999, backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 11 },
  resultText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  pressed: { opacity: 0.75 },
});
