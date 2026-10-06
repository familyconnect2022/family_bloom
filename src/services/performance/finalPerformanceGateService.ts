import { automatedRegressionService, type RegressionReport, type RegressionStatus } from "./automatedRegressionService";
import { performanceTestService } from "./performanceTestService";

export type FinalGateStressKind = "moments" | "timeline" | "events" | "memorybook";
export type FinalGateStep =
  | { type: "graph"; count: 50 | 100 | 200 | 300 | 500; label: string }
  | { type: "stress"; kind: FinalGateStressKind; count: 100 | 200; label: string };

export type FinalGateStepResult = {
  index: number;
  label: string;
  status: "PASS" | "FAIL";
  detail: string;
  completedAt: string;
};

export type FinalPerformanceGateState = {
  runId: string | null;
  status: "idle" | "running" | "complete" | "aborted";
  startedAt: number | null;
  completedAt: number | null;
  currentStep: number;
  totalSteps: number;
  stepResults: FinalGateStepResult[];
  regression: RegressionReport | null;
  overall: RegressionStatus | null;
  abortReason: string | null;
};

export const FINAL_PERFORMANCE_GATE_STEPS: readonly FinalGateStep[] = [
  { type: "graph", count: 50, label: "Family Graph · 50 Person" },
  { type: "graph", count: 100, label: "Family Graph · 100 Person" },
  { type: "graph", count: 200, label: "Family Graph · 200 Person" },
  { type: "graph", count: 300, label: "Family Graph · 300 Person" },
  { type: "graph", count: 500, label: "Family Graph · 500 Person" },
  { type: "stress", kind: "moments", count: 100, label: "Khoảnh khắc · 100" },
  { type: "stress", kind: "moments", count: 200, label: "Khoảnh khắc · 200" },
  { type: "stress", kind: "timeline", count: 100, label: "Timeline · 100" },
  { type: "stress", kind: "timeline", count: 200, label: "Timeline · 200" },
  { type: "stress", kind: "events", count: 100, label: "Lịch & sự kiện · 100" },
  { type: "stress", kind: "events", count: 200, label: "Lịch & sự kiện · 200" },
  { type: "stress", kind: "memorybook", count: 100, label: "Kỷ yếu · 100" },
  { type: "stress", kind: "memorybook", count: 200, label: "Kỷ yếu · 200" },
] as const;

const idleState = (): FinalPerformanceGateState => ({
  runId: null,
  status: "idle",
  startedAt: null,
  completedAt: null,
  currentStep: 0,
  totalSteps: FINAL_PERFORMANCE_GATE_STEPS.length,
  stepResults: [],
  regression: null,
  overall: null,
  abortReason: null,
});

const statusRank: Record<RegressionStatus, number> = { PASS: 0, WARNING: 1, FAIL: 2 };
const worstStatus = (a: RegressionStatus, b: RegressionStatus): RegressionStatus => statusRank[a] >= statusRank[b] ? a : b;

class FinalPerformanceGateService {
  private state: FinalPerformanceGateState = idleState();

  snapshot = (): FinalPerformanceGateState => ({
    ...this.state,
    stepResults: [...this.state.stepResults],
    regression: this.state.regression ? {
      ...this.state.regression,
      checks: [...this.state.regression.checks],
      coverage: {
        ...this.state.regression.coverage,
        graphSizes: [...this.state.regression.coverage.graphSizes],
        stressTargets: [...this.state.regression.coverage.stressTargets],
        stressCases: [...this.state.regression.coverage.stressCases],
      },
    } : null,
  });

  start = () => {
    const runId = `phase11-final-${Date.now().toString(36)}`;
    performanceTestService.reset();
    // The probe runs across every automatically rendered screen. We stop it as
    // soon as the matrix completes; 120s is only a safety ceiling.
    performanceTestService.startInteractionProbe(120_000, "final_gate");
    performanceTestService.start("phase11_final_performance_gate", `${FINAL_PERFORMANCE_GATE_STEPS.length} bước tự động`);
    performanceTestService.recordMetric(
      "Final gate expected steps",
      FINAL_PERFORMANCE_GATE_STEPS.length,
      "bước",
      "5 Family Graph + 8 stress render; RAM only",
    );
    this.state = {
      runId,
      status: "running",
      startedAt: Date.now(),
      completedAt: null,
      currentStep: 0,
      totalSteps: FINAL_PERFORMANCE_GATE_STEPS.length,
      stepResults: [],
      regression: null,
      overall: null,
      abortReason: null,
    };
    return { runId, firstRoute: this.routeForStep(0, runId) };
  };

  isActiveRun = (runId?: string | null) => !!runId && this.state.status === "running" && this.state.runId === runId;

  isActiveStep = (runId: string | null | undefined, index: number, expected: Pick<FinalGateStep, "type"> & { count: number; kind?: string }) => {
    if (!this.isActiveRun(runId) || index !== this.state.currentStep) return false;
    const step = FINAL_PERFORMANCE_GATE_STEPS[index];
    if (!step || step.type !== expected.type || step.count !== expected.count) return false;
    return step.type !== "stress" || step.kind === expected.kind;
  };

  routeForStep = (index: number, runId: string) => {
    const step = FINAL_PERFORMANCE_GATE_STEPS[index];
    if (!step) {
      return {
        pathname: "/performance-test",
        params: { finalGate: "complete", gateRunId: runId },
      };
    }
    if (step.type === "graph") {
      return {
        pathname: "/performance-graph-test",
        params: {
          count: String(step.count),
          finalGate: "1",
          gateRunId: runId,
          gateStep: String(index),
        },
      };
    }
    return {
      pathname: "/performance-data-test",
      params: {
        kind: step.kind,
        count: String(step.count),
        finalGate: "1",
        gateRunId: runId,
        gateStep: String(index),
      },
    };
  };

  markStep = (runId: string, index: number, status: FinalGateStepResult["status"], detail: string) => {
    if (!this.isActiveRun(runId)) return null;
    const step = FINAL_PERFORMANCE_GATE_STEPS[index];
    if (!step || index !== this.state.currentStep) return null;
    const result: FinalGateStepResult = {
      index,
      label: step.label,
      status,
      detail,
      completedAt: new Date().toISOString(),
    };
    this.state = {
      ...this.state,
      currentStep: index + 1,
      stepResults: [...this.state.stepResults, result],
    };
    performanceTestService.recordMetric(
      status === "PASS" ? "Final gate step PASS" : "Final gate step FAIL",
      index + 1,
      "bước",
      `${step.label} · ${detail}`,
    );
    return this.routeForStep(index + 1, runId);
  };

  complete = (runId: string) => {
    if (this.state.runId !== runId) return this.snapshot();
    if (this.state.status === "complete") return this.snapshot();
    if (this.state.status !== "running") return this.snapshot();

    performanceTestService.stopInteractionProbe(true);
    const duration = Math.max(0, Date.now() - (this.state.startedAt ?? Date.now()));
    performanceTestService.recordMetric("Final gate total duration", duration, "ms", `${this.state.stepResults.length}/${this.state.totalSteps} bước hoàn tất`);
    performanceTestService.finish("phase11_final_performance_gate", this.state.stepResults.some((step) => step.status === "FAIL") ? "error" : "ok");

    const regression = automatedRegressionService.evaluateFinalGate(performanceTestService.snapshot());
    const stepStatus: RegressionStatus = this.state.stepResults.some((step) => step.status === "FAIL") || this.state.stepResults.length !== this.state.totalSteps
      ? "FAIL"
      : "PASS";
    const overall = worstStatus(regression.overall, stepStatus);
    this.state = {
      ...this.state,
      status: "complete",
      completedAt: Date.now(),
      regression,
      overall,
    };
    return this.snapshot();
  };

  abort = (runId: string, reason: string) => {
    if (!this.isActiveRun(runId)) return this.snapshot();
    performanceTestService.stopInteractionProbe(true);
    performanceTestService.finish("phase11_final_performance_gate", "cancelled");
    this.state = {
      ...this.state,
      status: "aborted",
      completedAt: Date.now(),
      overall: "FAIL",
      abortReason: reason,
    };
    return this.snapshot();
  };

  exportText = (state = this.state) => {
    const duration = state.startedAt && state.completedAt ? state.completedAt - state.startedAt : null;
    const lines = [
      "FAMILY BLOOM · PHASE 11 FINAL PERFORMANCE GATE",
      `Run: ${state.runId ?? "none"}`,
      `Status: ${state.status}`,
      `Overall: ${state.overall ?? "N/A"}`,
      `Steps: ${state.stepResults.length}/${state.totalSteps}`,
      `Duration: ${duration === null ? "N/A" : `${duration} ms`}`,
      state.abortReason ? `Abort: ${state.abortReason}` : "",
      "",
      "AUTOMATED STEPS",
      ...state.stepResults.map((step) => `- ${step.status} | ${step.index + 1}/${state.totalSteps} | ${step.label} | ${step.detail}`),
      "",
      state.regression ? automatedRegressionService.exportFinalText(state.regression) : "REGRESSION: chưa hoàn tất",
      "",
      performanceTestService.exportText(),
    ];
    return lines.filter((line, index) => line || index > 0).join("\n");
  };
}

export const finalPerformanceGateService = new FinalPerformanceGateService();
