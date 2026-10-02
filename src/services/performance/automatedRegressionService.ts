import { performanceTestService, type PerformanceMetric, type PerformanceSnapshot } from "./performanceTestService";

export type RegressionStatus = "PASS" | "WARNING" | "FAIL";
export type RegressionCheck = { name: string; status: RegressionStatus; value: string; detail: string };
export type RegressionReport = {
  generatedAt: string;
  overall: RegressionStatus;
  checks: RegressionCheck[];
  coverage: {
    graphSizes: number[];
    stressTargets: string[];
    stressCases: string[];
    hasInteractionProbe: boolean;
  };
};

type RegressionMode = "interaction" | "final_gate";

const REQUIRED_GRAPH_SIZES = [50, 100, 200, 300, 500] as const;
const REQUIRED_STRESS_CASES = [
  "Khoảnh khắc · 100",
  "Khoảnh khắc · 200",
  "Dòng thời gian · 100",
  "Dòng thời gian · 200",
  "Lịch & sự kiện · 100",
  "Lịch & sự kiện · 200",
  "Kỷ yếu Bloom · 100",
  "Kỷ yếu Bloom · 200",
] as const;

const rank: Record<RegressionStatus, number> = { PASS: 0, WARNING: 1, FAIL: 2 };
const worst = (items: RegressionCheck[]): RegressionStatus => items.reduce<RegressionStatus>((out, item) => rank[item.status] > rank[out] ? item.status : out, "PASS");
const latest = (snapshot: PerformanceSnapshot, name: string) => snapshot.metrics.find((m) => m.name === name);
const parsePersonCount = (detail?: string) => Number(detail?.match(/(\d+)\s+Person/i)?.[1] ?? 0);
const graphMetric = (snapshot: PerformanceSnapshot, name: string, count: number) => snapshot.metrics.find((m) => m.name === name && parsePersonCount(m.detail) === count);
const statusFor = (value: number, pass: number, warning: number): RegressionStatus => value <= pass ? "PASS" : value <= warning ? "WARNING" : "FAIL";
const statusForMinimum = (value: number, pass: number, warning: number): RegressionStatus => value >= pass ? "PASS" : value >= warning ? "WARNING" : "FAIL";

const probePrefix = (mode: RegressionMode) => mode === "final_gate" ? "Final gate event-loop delay" : "Interaction event-loop delay";
const probeMetric = (snapshot: PerformanceSnapshot, mode: RegressionMode, suffix: string) => latest(snapshot, `${probePrefix(mode)} ${suffix}`);

const addEventLoopChecks = (checks: RegressionCheck[], snapshot: PerformanceSnapshot, mode: RegressionMode) => {
  const p95 = probeMetric(snapshot, mode, "p95");
  const maxDelay = probeMetric(snapshot, mode, "max");
  const over500 = probeMetric(snapshot, mode, "≥500ms");
  const coverage = probeMetric(snapshot, mode, "sample coverage");
  if (!p95 && !maxDelay && !over500 && !coverage) return false;

  if (mode === "final_gate") {
    // The Final Gate deliberately mounts 500-node graphs and long synthetic lists.
    // It therefore uses stress-specific event-loop guardrails. These thresholds are
    // not the same as the stricter 60-second real-interaction probe below.
    if (p95) checks.push({
      name: "Final gate event-loop delay p95",
      status: statusFor(p95.value, 500, 900),
      value: `${p95.value} ms`,
      detail: "Normalized callback delay under the automated synthetic matrix; PASS <=500ms, WARNING <=900ms.",
    });
    if (maxDelay) checks.push({
      name: "Final gate event-loop delay max",
      status: statusFor(maxDelay.value, 1000, 2000),
      value: `${maxDelay.value} ms`,
      detail: "Catastrophic long-block guard; interval time itself is excluded from this value.",
    });
    if (over500) checks.push({
      name: "Final gate long delay ≥500ms",
      status: over500.value <= 3 ? "PASS" : over500.value <= 8 ? "WARNING" : "FAIL",
      value: `${over500.value} lần`,
      detail: "Stress-only diagnostic; repeated >500ms delays are more meaningful than a single p95 sample.",
    });
    if (coverage) checks.push({
      name: "Final gate event-loop sample coverage",
      status: statusForMinimum(coverage.value, 55, 35),
      value: `${coverage.value}%`,
      detail: "Self-scheduling probe coverage; low coverage can reveal long periods where JS could not service timers.",
    });
  } else {
    if (p95) checks.push({
      name: "Interaction event-loop delay p95",
      status: statusFor(p95.value, 100, 250),
      value: `${p95.value} ms`,
      detail: "60-second real-use probe; PASS <=100ms, WARNING <=250ms.",
    });
    if (maxDelay) checks.push({
      name: "Interaction event-loop delay max",
      status: statusFor(maxDelay.value, 300, 800),
      value: `${maxDelay.value} ms`,
      detail: "Real-use long-block guard; expected 250ms sampling interval is not counted.",
    });
    if (coverage) checks.push({
      name: "Interaction event-loop sample coverage",
      status: statusForMinimum(coverage.value, 75, 55),
      value: `${coverage.value}%`,
      detail: "Coverage of the low-overhead one-shot probe during real interaction.",
    });
  }
  return !!p95 && !!maxDelay;
};

const addGraphCheck = (checks: RegressionCheck[], snapshot: PerformanceSnapshot, count: number) => {
  const first = graphMetric(snapshot, "Graph first painted frame", count);
  const full = graphMetric(snapshot, "Graph full progressive mount", count);
  const layout = graphMetric(snapshot, "Graph layout adapter", count);
  if (!first && !full && !layout) return;

  // Thresholds intentionally scale with dataset size. They are regression guards,
  // not promises about every Android device class.
  const scale = Math.max(1, count / 100);
  if (first) checks.push({
    name: `Graph ${count} · first paint`,
    status: statusFor(first.value, 1800 * scale, 3000 * scale),
    value: `${first.value} ms`,
    detail: "Synthetic RAM graph; catches large first-render regressions.",
  });
  if (full) checks.push({
    name: `Graph ${count} · full mount`,
    status: statusFor(full.value, 2200 * scale, 3500 * scale),
    value: `${full.value} ms`,
    detail: "Progressive mount regression guard.",
  });
  if (layout) checks.push({
    name: `Graph ${count} · layout`,
    status: statusFor(layout.value, 450 * scale, 900 * scale),
    value: `${layout.value} ms`,
    detail: "Family Graph layout adapter only.",
  });
};

const stressTarget = (metric: PerformanceMetric) => metric.detail?.trim() || "unknown";
const stressCases = (snapshot: PerformanceSnapshot) => Array.from(new Set(
  snapshot.metrics
    .filter((metric) => metric.name === "Stress first painted frame")
    .map((metric) => metric.detail?.trim())
    .filter((detail): detail is string => !!detail),
));
const stressMetric = (snapshot: PerformanceSnapshot, name: string, target: string) =>
  snapshot.metrics.find((metric) => metric.name === name && metric.detail?.trim() === target);

const buildBaseReport = (snapshot: PerformanceSnapshot, mode: RegressionMode = "interaction"): RegressionReport => {
  const checks: RegressionCheck[] = [];
  const tabMounts = snapshot.activeMounts["tabs.navigator"] ?? 0;
  checks.push({
    name: "Tabs navigator singleton",
    status: tabMounts <= 1 ? "PASS" : "FAIL",
    value: String(tabMounts),
    detail: "Phải <= 1 để tránh giữ navigator cũ trong stack.",
  });

  const listenerDuplicates = Object.entries(snapshot.activeListeners).filter(([, count]) => count > 1);
  checks.push({
    name: "Realtime listener duplicates",
    status: listenerDuplicates.length === 0 ? "PASS" : "WARNING",
    value: listenerDuplicates.length ? listenerDuplicates.map(([name, count]) => `${name}×${count}`).join(", ") : "0",
    detail: "Cảnh báo listener cùng tên có nhiều subscription đang sống.",
  });

  const hasInteractionProbe = addEventLoopChecks(checks, snapshot, mode);

  // Only the explicit 60-second user interaction probe scores navigation. The
  // Final Gate's stress-screen buttons are synthetic workload controls, not a
  // representative app-wide UI responsiveness sample.
  if (mode === "interaction") {
    const tabP95 = latest(snapshot, "Tab switch p95");
    if (tabP95) {
      checks.push({ name: "Tab switch p95", status: statusFor(tabP95.value, 180, 280), value: `${tabP95.value} ms`, detail: "p95 của tab switch hoàn tất trong interaction probe; không dùng nút Performance Lab làm verdict toàn app." });
    } else {
      const press = latest(snapshot, "UI press → next frame");
      if (press) checks.push({ name: "UI press → next frame", status: statusFor(press.value, 120, 250), value: `${press.value} ms`, detail: "Fallback khi chưa có tab-switch probe." });
    }
    const cancelledTabs = latest(snapshot, "Tab switch cancelled");
    if (cancelledTabs) checks.push({ name: "Tab switch cancelled", status: cancelledTabs.value <= 2 ? "PASS" : cancelledTabs.value <= 5 ? "WARNING" : "FAIL", value: `${cancelledTabs.value} lần`, detail: "Bị thay thế bởi lần bấm tab kế tiếp; theo dõi riêng, không trộn vào latency p95." });
  }

  const graphSizes = REQUIRED_GRAPH_SIZES.filter((count) => snapshot.metrics.some((m) => parsePersonCount(m.detail) === count));
  graphSizes.forEach((count) => addGraphCheck(checks, snapshot, count));

  const targets = Array.from(new Set(snapshot.metrics.filter((m) => m.name.startsWith("Stress ")).map(stressTarget).filter((x) => x !== "unknown")));
  const cases = stressCases(snapshot);
  return {
    generatedAt: new Date().toISOString(),
    overall: worst(checks),
    checks,
    coverage: { graphSizes: [...graphSizes], stressTargets: targets, stressCases: cases, hasInteractionProbe },
  };
};

export const automatedRegressionService = {
  evaluate(snapshot = performanceTestService.snapshot()): RegressionReport {
    return buildBaseReport(snapshot, "interaction");
  },

  evaluateFinalGate(snapshot = performanceTestService.snapshot()): RegressionReport {
    const base = buildBaseReport(snapshot, "final_gate");
    const checks = [...base.checks];

    const missingGraphs = REQUIRED_GRAPH_SIZES.filter((count) => {
      const first = graphMetric(snapshot, "Graph first painted frame", count);
      const full = graphMetric(snapshot, "Graph full progressive mount", count);
      return !first || !full;
    });
    checks.push({
      name: "Final gate · Graph coverage",
      status: missingGraphs.length ? "FAIL" : "PASS",
      value: missingGraphs.length ? `thiếu ${missingGraphs.join("/")}` : "50/100/200/300/500",
      detail: "Mỗi cây phải có cả first paint và full progressive mount.",
    });

    const missingStress = REQUIRED_STRESS_CASES.filter((target) => !base.coverage.stressCases.includes(target));
    checks.push({
      name: "Final gate · Stress coverage",
      status: missingStress.length ? "FAIL" : "PASS",
      value: `${REQUIRED_STRESS_CASES.length - missingStress.length}/${REQUIRED_STRESS_CASES.length}`,
      detail: missingStress.length ? `Thiếu: ${missingStress.join(", ")}` : "Đủ Moments / Timeline / Planner-Event / Memory Book ở 100 và 200 mục.",
    });

    checks.push({
      name: "Final gate · Event-loop probe coverage",
      status: base.coverage.hasInteractionProbe ? "PASS" : "FAIL",
      value: base.coverage.hasInteractionProbe ? "có" : "thiếu",
      detail: "Probe đo normalized event-loop delay xuyên suốt matrix; interval 250ms không bị cộng vào stall.",
    });

    for (const target of REQUIRED_STRESS_CASES) {
      const first = stressMetric(snapshot, "Stress first painted frame", target);
      const jump = stressMetric(snapshot, "Stress jump to end → frame", target);
      if (!first) continue;
      const count = Number(target.match(/(100|200)$/)?.[1] ?? 100);
      checks.push({
        name: `Stress · ${target} · first paint`,
        status: statusFor(first.value, count === 100 ? 1800 : 2800, count === 100 ? 3000 : 4500),
        value: `${first.value} ms`,
        detail: "Render thật của màn stress với dữ liệu RAM-only.",
      });
      checks.push({
        name: `Stress · ${target} · jump end`,
        status: jump ? statusFor(jump.value, 350, 900) : "FAIL",
        value: jump ? `${jump.value} ms` : "thiếu",
        detail: "Tự nhảy xuống cuối list sau initial render để bắt long-list responsiveness.",
      });
    }

    const failedSteps = snapshot.metrics.filter((metric) => metric.name === "Final gate step FAIL");
    checks.push({
      name: "Final gate · Step execution",
      status: failedSteps.length ? "FAIL" : "PASS",
      value: failedSteps.length ? `${failedSteps.length} bước lỗi` : "không có timeout/lỗi bước",
      detail: "Bắt route/test không hoàn tất thay vì để report thiếu dữ liệu nhưng vẫn PASS.",
    });

    return {
      ...base,
      generatedAt: new Date().toISOString(),
      overall: worst(checks),
      checks,
    };
  },

  exportText(report = this.evaluate()) {
    const coverage = [
      `Graph: ${report.coverage.graphSizes.length ? report.coverage.graphSizes.join("/") : "chưa chạy"}`,
      `Stress: ${report.coverage.stressCases.length || 0} case`,
      `Interaction probe: ${report.coverage.hasInteractionProbe ? "có" : "chưa chạy"}`,
    ].join(" · ");
    return [
      "FAMILY BLOOM PHASE 11 · INTERACTION REGRESSION",
      `Generated: ${report.generatedAt}`,
      `Overall: ${report.overall}`,
      `Coverage: ${coverage}`,
      "",
      ...report.checks.map((c) => `- ${c.status} | ${c.name}: ${c.value} | ${c.detail}`),
    ].join("\n");
  },

  exportFinalText(report = this.evaluateFinalGate()) {
    const coverage = [
      `Graph: ${report.coverage.graphSizes.length ? report.coverage.graphSizes.join("/") : "chưa chạy"}`,
      `Stress cases: ${report.coverage.stressCases.length}/${REQUIRED_STRESS_CASES.length}`,
      `Event-loop probe: ${report.coverage.hasInteractionProbe ? "có" : "thiếu"}`,
    ].join(" · ");
    return [
      "FAMILY BLOOM PHASE 11 · FINAL PERFORMANCE REGRESSION",
      `Generated: ${report.generatedAt}`,
      `Overall: ${report.overall}`,
      `Coverage: ${coverage}`,
      "",
      ...report.checks.map((c) => `- ${c.status} | ${c.name}: ${c.value} | ${c.detail}`),
    ].join("\n");
  },
};
