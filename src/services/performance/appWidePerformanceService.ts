import { performanceTestService, type ReactCommitStat } from "./performanceTestService";

export type AppSweepStatus = "PASS" | "WARNING" | "FAIL" | "SKIP";
export type AppSweepStressKind = "moments" | "timeline" | "events" | "memorybook";

export type AppSweepStep =
  | {
      type: "route";
      label: string;
      category: "tabs" | "core" | "family" | "home" | "realtime";
      pathname: string;
      expectedPathname: string;
      params?: Record<string, string>;
      navigationMode?: "navigate" | "replace";
      dwellMs?: number;
      timeoutMs?: number;
    }
  | { type: "graph"; count: 50 | 100 | 200 | 300 | 500; label: string }
  | { type: "stress"; kind: AppSweepStressKind; count: 100 | 200; label: string };

export type AppSweepStepResult = {
  index: number;
  label: string;
  type: AppSweepStep["type"];
  status: AppSweepStatus;
  durationMs: number;
  detail: string;
  listeners: number | null;
  duplicateListeners: string[];
  reactCommits: number | null;
  reactTotalMs: number | null;
  reactMaxMs: number | null;
  memoryMb: number | null;
  completedAt: string;
};

export type AppSweepSummary = {
  overall: Exclude<AppSweepStatus, "SKIP">;
  routePass: number;
  routeWarning: number;
  routeFail: number;
  syntheticPass: number;
  syntheticFail: number;
  startupMs: number | null;
  routeP95Ms: number | null;
  eventLoopP95Ms: number | null;
  eventLoopMaxMs: number | null;
  listenerPeak: number;
  mountPeak: number;
  slowestRoutes: Array<{ label: string; durationMs: number }>;
};

export type AppWidePerformanceState = {
  runId: string | null;
  status: "idle" | "running" | "complete" | "aborted";
  startedAt: number | null;
  completedAt: number | null;
  currentStep: number;
  totalSteps: number;
  stepResults: AppSweepStepResult[];
  summary: AppSweepSummary | null;
  abortReason: string | null;
  noWriteMode: boolean;
  runnerReady: boolean;
  runnerPathname: string | null;
};

type ActiveRouteMeasurement = {
  runId: string;
  stepIndex: number;
  startedAt: number;
  routeArrivedAt: number | null;
  settledAt: number | null;
  expectedPathname: string;
  listenerBaseline: number;
  reactBaseline: ReactCommitStat | null;
  memoryBaselineBytes: number;
};

/**
 * Phase 15B app-wide route matrix.
 *
 * The production-route section intentionally opens screens but never presses a
 * mutation button. While this service is running `noWriteMode` is true; the few
 * screens that normally perform best-effort maintenance writes on mount skip
 * those writes. The synthetic section is RAM-only and reuses the existing Graph
 * and long-list stress screens.
 */
export const APP_WIDE_PERFORMANCE_STEPS: readonly AppSweepStep[] = [
  { type: "route", category: "tabs", label: "Tab · Trang nhà", pathname: "/", expectedPathname: "/", navigationMode: "navigate", dwellMs: 900 },
  { type: "route", category: "tabs", label: "Tab · Kỷ niệm", pathname: "/moments", expectedPathname: "/moments", navigationMode: "navigate", dwellMs: 900 },
  { type: "route", category: "tabs", label: "Tab · Lịch", pathname: "/planner", expectedPathname: "/planner", navigationMode: "navigate", dwellMs: 900 },
  { type: "route", category: "tabs", label: "Tab · Cây nhà", pathname: "/family", expectedPathname: "/family", navigationMode: "navigate", dwellMs: 900 },
  { type: "route", category: "tabs", label: "Tab · Nhà Mình", pathname: "/play", expectedPathname: "/play", navigationMode: "navigate", dwellMs: 900 },

  { type: "route", category: "core", label: "Chuyện trong nhà", pathname: "/notifications", expectedPathname: "/notifications", dwellMs: 1000 },
  { type: "route", category: "core", label: "Cài đặt nhắc chuyện", pathname: "/notification-preferences", expectedPathname: "/notification-preferences", dwellMs: 850 },
  { type: "route", category: "core", label: "Hồ sơ", pathname: "/profile", expectedPathname: "/profile", dwellMs: 900 },
  { type: "route", category: "family", label: "Dòng thời gian gia đình", pathname: "/family-timeline", expectedPathname: "/family-timeline", dwellMs: 1000 },
  { type: "route", category: "family", label: "Chọn mái nhà", pathname: "/family-select", expectedPathname: "/family-select", dwellMs: 850 },
  { type: "route", category: "family", label: "Các mái nhà của tôi", pathname: "/family-memberships", expectedPathname: "/family-memberships", dwellMs: 900 },
  { type: "route", category: "family", label: "Cổng gia đình", pathname: "/family-gateway", expectedPathname: "/family-gateway", dwellMs: 850 },
  { type: "route", category: "family", label: "Lời mời vào nhà", pathname: "/family-join-requests", expectedPathname: "/family-join-requests", dwellMs: 900 },
  { type: "route", category: "family", label: "Cây gia đình thật", pathname: "/family-graph", expectedPathname: "/family-graph", dwellMs: 1400, timeoutMs: 12_000 },
  { type: "route", category: "family", label: "Đề xuất Cây nhà", pathname: "/family-graph-proposals", expectedPathname: "/family-graph-proposals", dwellMs: 900 },
  { type: "route", category: "family", label: "Chăm sóc Cây nhà", pathname: "/family-graph-admin", expectedPathname: "/family-graph-admin", dwellMs: 900 },
  { type: "route", category: "family", label: "Kỷ yếu gia đình", pathname: "/memory-book", expectedPathname: "/memory-book", params: { scope: "family" }, dwellMs: 1000 },

  { type: "route", category: "home", label: "Lời thì thầm", pathname: "/home-whispers", expectedPathname: "/home-whispers", dwellMs: 1000 },
  { type: "route", category: "home", label: "Cùng quyết định", pathname: "/home-polls", expectedPathname: "/home-polls", dwellMs: 1000 },
  { type: "route", category: "home", label: "Bếp Nhà Mình", pathname: "/home-kitchen", expectedPathname: "/home-kitchen", dwellMs: 900 },
  { type: "route", category: "home", label: "Hộp thời gian", pathname: "/home-time-capsules", expectedPathname: "/home-time-capsules", dwellMs: 1000 },
  { type: "route", category: "home", label: "Soạn Hộp thời gian", pathname: "/home-time-capsule-compose", expectedPathname: "/home-time-capsule-compose", dwellMs: 850 },
  { type: "route", category: "home", label: "Trò chơi Nhà Mình", pathname: "/home-games", expectedPathname: "/home-games", dwellMs: 1000 },
  { type: "route", category: "home", label: "Tạo trò chơi", pathname: "/home-game-create", expectedPathname: "/home-game-create", dwellMs: 850 },
  { type: "route", category: "home", label: "Quỹ gia đình", pathname: "/home-fund", expectedPathname: "/home-fund", dwellMs: 1200 },
  { type: "route", category: "home", label: "Bảng tin Nhà Mình", pathname: "/home-board", expectedPathname: "/home-board", dwellMs: 900 },
  { type: "route", category: "realtime", label: "Sảnh Cờ vua", pathname: "/chess-lobby", expectedPathname: "/chess-lobby", dwellMs: 1200, timeoutMs: 12_000 },
  { type: "route", category: "realtime", label: "Lịch sử Cờ vua", pathname: "/chess-history", expectedPathname: "/chess-history", dwellMs: 900 },
  { type: "route", category: "core", label: "Trò chuyện", pathname: "/chat", expectedPathname: "/chat", dwellMs: 800 },

  { type: "graph", count: 50, label: "RAM Graph · 50 Person" },
  { type: "graph", count: 100, label: "RAM Graph · 100 Person" },
  { type: "graph", count: 200, label: "RAM Graph · 200 Person" },
  { type: "graph", count: 300, label: "RAM Graph · 300 Person" },
  { type: "graph", count: 500, label: "RAM Graph · 500 Person" },
  { type: "stress", kind: "moments", count: 100, label: "RAM Kỷ niệm · 100" },
  { type: "stress", kind: "moments", count: 200, label: "RAM Kỷ niệm · 200" },
  { type: "stress", kind: "timeline", count: 100, label: "RAM Timeline · 100" },
  { type: "stress", kind: "timeline", count: 200, label: "RAM Timeline · 200" },
  { type: "stress", kind: "events", count: 100, label: "RAM Sự kiện · 100" },
  { type: "stress", kind: "events", count: 200, label: "RAM Sự kiện · 200" },
  { type: "stress", kind: "memorybook", count: 100, label: "RAM Kỷ yếu · 100" },
  { type: "stress", kind: "memorybook", count: 200, label: "RAM Kỷ yếu · 200" },
] as const;

const now = () => Date.now();
const statusRank: Record<Exclude<AppSweepStatus, "SKIP">, number> = { PASS: 0, WARNING: 1, FAIL: 2 };
const worst = (items: Array<Exclude<AppSweepStatus, "SKIP">>): Exclude<AppSweepStatus, "SKIP"> =>
  items.reduce<Exclude<AppSweepStatus, "SKIP">>((current, item) => statusRank[item] > statusRank[current] ? item : current, "PASS");

const routeStatus = (durationMs: number, reactMaxMs: number, duplicateCount: number): Exclude<AppSweepStatus, "SKIP"> => {
  if (durationMs > 3000 || reactMaxMs > 220 || duplicateCount >= 3) return "FAIL";
  if (durationMs > 1600 || reactMaxMs > 120 || duplicateCount > 0) return "WARNING";
  return "PASS";
};

const normalizePathname = (value: string) => {
  if (!value) return "/";
  const trimmed = value.split("?")[0].replace(/\/+$/, "");
  return trimmed || "/";
};

const idleState = (): AppWidePerformanceState => ({
  runId: null,
  status: "idle",
  startedAt: null,
  completedAt: null,
  currentStep: 0,
  totalSteps: APP_WIDE_PERFORMANCE_STEPS.length,
  stepResults: [],
  summary: null,
  abortReason: null,
  noWriteMode: false,
  runnerReady: false,
  runnerPathname: null,
});

type Subscriber = () => void;

class AppWidePerformanceService {
  private state: AppWidePerformanceState = idleState();
  private subscribers = new Set<Subscriber>();
  private revision = 0;
  private hardWatchdog: ReturnType<typeof setTimeout> | null = null;
  private activeRoute: ActiveRouteMeasurement | null = null;
  private activeSynthetic: { runId: string; stepIndex: number; startedAt: number } | null = null;

  subscribe = (subscriber: Subscriber) => {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  };

  getRevision = () => this.revision;

  private emit = () => {
    this.revision += 1;
    this.subscribers.forEach((subscriber) => subscriber());
  };

  private clearHardWatchdog = () => {
    if (this.hardWatchdog) clearTimeout(this.hardWatchdog);
    this.hardWatchdog = null;
  };

  private armHardWatchdog = () => {
    this.clearHardWatchdog();
    if (this.state.status !== "running" || !this.state.runId) return;
    const runId = this.state.runId;
    const stepIndex = this.state.currentStep;
    const step = APP_WIDE_PERFORMANCE_STEPS[stepIndex];
    if (!step) return;
    const timeoutMs = step.type === "route"
      ? (step.timeoutMs ?? 9000) + 4000
      : step.type === "graph"
        ? 32_000
        : 22_000;
    this.hardWatchdog = setTimeout(() => {
      if (!this.isActiveRun(runId) || this.state.currentStep !== stepIndex) return;
      const reason = `driver watchdog > ${timeoutMs}ms ở bước ${stepIndex + 1}/${this.state.totalSteps} · ${step.label}`;
      if (step.type === "route") this.failCurrentRoute(runId, stepIndex, reason);
      else this.markSyntheticStep(runId, stepIndex, "FAIL", reason);
    }, timeoutMs);
  };

  snapshot = (): AppWidePerformanceState => ({
    ...this.state,
    stepResults: this.state.stepResults.map((item) => ({ ...item, duplicateListeners: [...item.duplicateListeners] })),
    summary: this.state.summary ? {
      ...this.state.summary,
      slowestRoutes: this.state.summary.slowestRoutes.map((item) => ({ ...item })),
    } : null,
  });

  getStep = (index = this.state.currentStep) => APP_WIDE_PERFORMANCE_STEPS[index] ?? null;
  isRunning = () => this.state.status === "running";
  isNoWriteMode = () => this.state.status === "running" && this.state.noWriteMode;

  isActiveRun = (runId?: string | null) => !!runId && this.state.status === "running" && this.state.runId === runId;

  isActiveSyntheticStep = (
    runId: string | null | undefined,
    index: number,
    expected: { type: "graph" | "stress"; count: number; kind?: string },
  ) => {
    if (!this.isActiveRun(runId) || index !== this.state.currentStep) return false;
    const step = APP_WIDE_PERFORMANCE_STEPS[index];
    if (!step || step.type !== expected.type || step.count !== expected.count) return false;
    return step.type !== "stress" || step.kind === expected.kind;
  };

  start = () => {
    // A new tap always owns a fresh run. Clear any stale watchdog/measurement
    // from a previous completed or interrupted sweep before resetting step 0.
    this.clearHardWatchdog();
    this.activeRoute = null;
    this.activeSynthetic = null;
    const runId = `phase15b-${Date.now().toString(36)}`;
    performanceTestService.reset();
    performanceTestService.startInteractionProbe(600_000, "app_sweep");
    performanceTestService.start("phase15b_app_wide_sweep", `${APP_WIDE_PERFORMANCE_STEPS.length} bước · no-write + RAM-only`);
    performanceTestService.recordMetric("App sweep expected steps", APP_WIDE_PERFORMANCE_STEPS.length, "bước", "production route sweep + RAM-only stress matrix");
    const memory = performanceTestService.sampleMemory("app-sweep:start");
    if (!memory.available) performanceTestService.recordMetric("JS heap API available", 0, "bool", "Hermes/React Native build này không expose performance.memory; dùng ADB PSS watcher nếu cần native RAM");
    this.state = {
      runId,
      status: "running",
      startedAt: now(),
      completedAt: null,
      currentStep: 0,
      totalSteps: APP_WIDE_PERFORMANCE_STEPS.length,
      stepResults: [],
      summary: null,
      abortReason: null,
      noWriteMode: true,
      runnerReady: false,
      runnerPathname: null,
    };
    console.info(`[FB_PERF_SWEEP] START ${runId} steps=${APP_WIDE_PERFORMANCE_STEPS.length}`);
    this.emit();
    return { runId, firstRoute: this.routeForStep(0, runId) };
  };

  routeForStep = (index: number, runId: string) => {
    const step = APP_WIDE_PERFORMANCE_STEPS[index];
    if (!step) {
      return { pathname: "/performance-test", params: { appSweep: "complete", sweepRunId: runId } };
    }
    if (step.type === "route") {
      return step.params && Object.keys(step.params).length
        ? { pathname: step.pathname, params: { ...step.params } }
        : { pathname: step.pathname };
    }
    const common = { appSweep: "1", sweepRunId: runId, sweepStep: String(index) };
    if (step.type === "graph") {
      return { pathname: "/performance-graph-test", params: { ...common, count: String(step.count) } };
    }
    return { pathname: "/performance-data-test", params: { ...common, kind: step.kind, count: String(step.count) } };
  };

  markRunnerReady = (pathname: string) => {
    if (this.state.status !== "running" || !this.state.runId) return false;
    const normalized = normalizePathname(pathname);
    if (normalized === "/performance-test") return false;
    if (this.state.runnerReady && this.state.runnerPathname === normalized) return true;
    this.state = { ...this.state, runnerReady: true, runnerPathname: normalized };
    console.info(`[FB_PERF_SWEEP] DRIVER_READY ${this.state.runId} path=${normalized}`);
    this.armHardWatchdog();
    this.emit();
    return true;
  };

  pathMatchesCurrentRoute = (pathname: string) => {
    const step = this.getStep();
    if (!step || step.type !== "route") return false;
    return normalizePathname(pathname) === normalizePathname(step.expectedPathname);
  };

  beginRouteNavigation = (runId: string, stepIndex: number) => {
    if (!this.isActiveRun(runId) || this.state.currentStep !== stepIndex) return false;
    const step = APP_WIDE_PERFORMANCE_STEPS[stepIndex];
    if (!step || step.type !== "route") return false;
    if (this.activeRoute?.runId === runId && this.activeRoute.stepIndex === stepIndex) return true;
    const snapshot = performanceTestService.snapshot();
    performanceTestService.resetReactCommitStat(step.expectedPathname);
    const memory = performanceTestService.sampleMemory(`${step.label}:before`);
    this.activeRoute = {
      runId,
      stepIndex,
      startedAt: now(),
      routeArrivedAt: null,
      settledAt: null,
      expectedPathname: step.expectedPathname,
      listenerBaseline: snapshot.activeListenerTotal,
      reactBaseline: null,
      memoryBaselineBytes: memory.usedBytes,
    };
    performanceTestService.start("app_sweep_route", step.label);
    performanceTestService.mark("app_sweep_route", "navigation_requested");
    console.info(`[FB_PERF_SWEEP] STEP ${stepIndex + 1}/${this.state.totalSteps} ROUTE ${step.label}`);
    return true;
  };

  markRouteArrived = (runId: string, stepIndex: number) => {
    const active = this.activeRoute;
    if (!active || active.runId !== runId || active.stepIndex !== stepIndex || active.routeArrivedAt) return;
    active.routeArrivedAt = now();
    performanceTestService.mark("app_sweep_route", "route_arrived");
  };

  markRouteSettled = (runId: string, stepIndex: number) => {
    const active = this.activeRoute;
    if (!active || active.runId !== runId || active.stepIndex !== stepIndex || active.settledAt) return;
    active.settledAt = now();
    performanceTestService.mark("app_sweep_route", "settled_double_frame");
    performanceTestService.finish("app_sweep_route");
    performanceTestService.recordMetric(
      "App route first usable frame",
      active.settledAt - active.startedAt,
      "ms",
      APP_WIDE_PERFORMANCE_STEPS[stepIndex]?.label ?? `step ${stepIndex + 1}`,
    );
  };

  finishRouteStep = (runId: string, stepIndex: number) => {
    const active = this.activeRoute;
    const step = APP_WIDE_PERFORMANCE_STEPS[stepIndex];
    if (!active || !step || step.type !== "route" || active.runId !== runId || active.stepIndex !== stepIndex) return null;
    if (!this.isActiveRun(runId) || this.state.currentStep !== stepIndex) return null;

    const snapshot = performanceTestService.snapshot();
    const currentReact = performanceTestService.getReactCommitStat(step.expectedPathname);
    const baseline = active.reactBaseline;
    const reactCommits = Math.max(0, (currentReact?.commitCount ?? 0) - (baseline?.commitCount ?? 0));
    const reactTotal = Math.max(0, (currentReact?.totalActualDurationMs ?? 0) - (baseline?.totalActualDurationMs ?? 0));
    const reactMax = currentReact?.maxActualDurationMs ?? 0;
    const duplicates = Object.entries(snapshot.activeListeners)
      .filter(([, count]) => count > 1)
      .map(([name, count]) => `${name}×${count}`);
    const memory = performanceTestService.sampleMemory(`${step.label}:after`);
    const memoryMb = memory.available ? memory.usedBytes / (1024 * 1024) : null;
    const durationMs = Math.max(0, (active.settledAt ?? now()) - active.startedAt);
    const status = routeStatus(durationMs, reactMax, duplicates.length);
    const result: AppSweepStepResult = {
      index: stepIndex,
      label: step.label,
      type: "route",
      status,
      durationMs,
      detail: `route ${step.expectedPathname} · listeners ${snapshot.activeListenerTotal} (baseline ${active.listenerBaseline}) · React ${reactCommits} commits / ${Math.round(reactTotal)}ms`,
      listeners: snapshot.activeListenerTotal,
      duplicateListeners: duplicates,
      reactCommits,
      reactTotalMs: Math.round(reactTotal * 10) / 10,
      reactMaxMs: Math.round(reactMax * 10) / 10,
      memoryMb: memoryMb === null ? null : Math.round(memoryMb * 10) / 10,
      completedAt: new Date().toISOString(),
    };
    this.activeRoute = null;
    return this.commitStepResult(result);
  };

  failCurrentRoute = (runId: string, stepIndex: number, reason: string) => {
    const step = APP_WIDE_PERFORMANCE_STEPS[stepIndex];
    if (!step || step.type !== "route" || !this.isActiveRun(runId) || this.state.currentStep !== stepIndex) return null;
    performanceTestService.finish("app_sweep_route", "error");
    const snapshot = performanceTestService.snapshot();
    const result: AppSweepStepResult = {
      index: stepIndex,
      label: step.label,
      type: "route",
      status: "FAIL",
      durationMs: this.activeRoute ? now() - this.activeRoute.startedAt : 0,
      detail: reason,
      listeners: snapshot.activeListenerTotal,
      duplicateListeners: Object.entries(snapshot.activeListeners).filter(([, count]) => count > 1).map(([name, count]) => `${name}×${count}`),
      reactCommits: null,
      reactTotalMs: null,
      reactMaxMs: null,
      memoryMb: null,
      completedAt: new Date().toISOString(),
    };
    this.activeRoute = null;
    return this.commitStepResult(result);
  };

  beginSyntheticStep = (runId: string, stepIndex: number) => {
    if (!this.isActiveRun(runId) || this.state.currentStep !== stepIndex) return false;
    const step = APP_WIDE_PERFORMANCE_STEPS[stepIndex];
    if (!step || step.type === "route") return false;
    if (this.activeSynthetic?.runId === runId && this.activeSynthetic.stepIndex === stepIndex) return true;
    this.activeSynthetic = { runId, stepIndex, startedAt: now() };
    console.info(`[FB_PERF_SWEEP] STEP ${stepIndex + 1}/${this.state.totalSteps} ${step.type.toUpperCase()} ${step.label}`);
    return true;
  };

  markSyntheticStep = (runId: string, stepIndex: number, status: "PASS" | "FAIL", detail: string) => {
    if (!this.isActiveRun(runId) || this.state.currentStep !== stepIndex) return null;
    const step = APP_WIDE_PERFORMANCE_STEPS[stepIndex];
    if (!step || step.type === "route") return null;
    const result: AppSweepStepResult = {
      index: stepIndex,
      label: step.label,
      type: step.type,
      status,
      durationMs: this.activeSynthetic?.runId === runId && this.activeSynthetic.stepIndex === stepIndex
        ? Math.max(0, now() - this.activeSynthetic.startedAt)
        : 0,
      detail,
      listeners: performanceTestService.snapshot().activeListenerTotal,
      duplicateListeners: [],
      reactCommits: null,
      reactTotalMs: null,
      reactMaxMs: null,
      memoryMb: null,
      completedAt: new Date().toISOString(),
    };
    this.activeSynthetic = null;
    return this.commitStepResult(result);
  };

  private commitStepResult = (result: AppSweepStepResult) => {
    if (result.index !== this.state.currentStep || this.state.status !== "running" || !this.state.runId) return null;
    const runId = this.state.runId;
    this.state = {
      ...this.state,
      currentStep: result.index + 1,
      stepResults: [...this.state.stepResults, result],
    };
    this.armHardWatchdog();
    performanceTestService.recordMetric(
      `App sweep step ${result.status}`,
      result.index + 1,
      "bước",
      `${result.label} · ${result.detail}`,
    );
    console.info(`[FB_PERF_SWEEP] RESULT ${result.status} ${result.index + 1}/${this.state.totalSteps} ${result.label}`);
    this.emit();
    return this.routeForStep(result.index + 1, runId);
  };

  complete = (runId: string) => {
    if (this.state.runId !== runId || this.state.status !== "running") return this.snapshot();
    this.clearHardWatchdog();
    performanceTestService.stopInteractionProbe(true);
    performanceTestService.sampleMemory("app-sweep:complete");
    const snapshot = performanceTestService.snapshot();
    const routeResults = this.state.stepResults.filter((item) => item.type === "route");
    const syntheticResults = this.state.stepResults.filter((item) => item.type !== "route");
    const startupMs = snapshot.metrics.find((metric) => metric.name === "JS session → app ready")?.value ?? null;
    const routeDurations = routeResults.map((item) => item.durationMs).sort((a, b) => a - b);
    const routeP95Ms = routeDurations.length
      ? routeDurations[Math.min(routeDurations.length - 1, Math.floor((routeDurations.length - 1) * 0.95))]
      : null;
    const p95 = snapshot.metrics.find((metric) => metric.name === "App sweep event-loop delay p95")?.value ?? null;
    const max = snapshot.metrics.find((metric) => metric.name === "App sweep event-loop delay max")?.value ?? null;
    const eventLoopStatus: Exclude<AppSweepStatus, "SKIP"> = p95 === null || max === null
      ? "WARNING"
      : p95 <= 500 && max <= 1800
        ? "PASS"
        : p95 <= 900 && max <= 3000
          ? "WARNING"
          : "FAIL";
    const stepStatuses = this.state.stepResults.filter((item) => item.status !== "SKIP").map((item) => item.status as Exclude<AppSweepStatus, "SKIP">);
    const overall = worst([...stepStatuses, eventLoopStatus]);
    const summary: AppSweepSummary = {
      overall,
      routePass: routeResults.filter((item) => item.status === "PASS").length,
      routeWarning: routeResults.filter((item) => item.status === "WARNING").length,
      routeFail: routeResults.filter((item) => item.status === "FAIL").length,
      syntheticPass: syntheticResults.filter((item) => item.status === "PASS").length,
      syntheticFail: syntheticResults.filter((item) => item.status === "FAIL").length,
      startupMs,
      routeP95Ms,
      eventLoopP95Ms: p95,
      eventLoopMaxMs: max,
      listenerPeak: snapshot.peakListenerTotal,
      mountPeak: snapshot.peakMountTotal,
      slowestRoutes: routeResults
        .slice()
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 5)
        .map((item) => ({ label: item.label, durationMs: item.durationMs })),
    };
    const duration = Math.max(0, now() - (this.state.startedAt ?? now()));
    performanceTestService.recordMetric("App sweep total duration", duration, "ms", `${this.state.stepResults.length}/${this.state.totalSteps} bước`);
    performanceTestService.finish("phase15b_app_wide_sweep", overall === "FAIL" ? "error" : "ok");
    this.state = {
      ...this.state,
      status: "complete",
      completedAt: now(),
      summary,
      noWriteMode: false,
      runnerReady: false,
    };
    console.info(`[FB_PERF_SWEEP] COMPLETE ${runId} overall=${overall} duration=${duration}ms`);
    this.emit();
    return this.snapshot();
  };

  abort = (runId: string, reason: string) => {
    this.clearHardWatchdog();
    if (!this.isActiveRun(runId)) return this.snapshot();
    performanceTestService.stopInteractionProbe(true);
    performanceTestService.finish("app_sweep_route", "cancelled");
    performanceTestService.finish("phase15b_app_wide_sweep", "cancelled");
    this.activeRoute = null;
    this.activeSynthetic = null;
    this.state = {
      ...this.state,
      status: "aborted",
      completedAt: now(),
      abortReason: reason,
      noWriteMode: false,
      runnerReady: false,
      summary: null,
    };
    console.info(`[FB_PERF_SWEEP] ABORT ${runId} ${reason}`);
    this.emit();
    return this.snapshot();
  };

  exportText = (state = this.state) => {
    const duration = state.startedAt && state.completedAt ? state.completedAt - state.startedAt : null;
    const lines = [
      "FAMILY BLOOM · PHASE 15B APP-WIDE PERFORMANCE SWEEP",
      `Generated: ${new Date().toISOString()}`,
      `Run: ${state.runId ?? "none"}`,
      `Status: ${state.status}`,
      `Overall: ${state.summary?.overall ?? "N/A"}`,
      `Steps: ${state.stepResults.length}/${state.totalSteps}`,
      `Duration: ${duration === null ? "N/A" : `${duration} ms`}`,
      `No-write mode: ${state.noWriteMode ? "ON" : "OFF"}`,
      state.abortReason ? `Abort: ${state.abortReason}` : "",
      "",
      "SUMMARY",
      state.summary ? `- Route: ${state.summary.routePass} PASS · ${state.summary.routeWarning} WARNING · ${state.summary.routeFail} FAIL` : "- Route: N/A",
      state.summary ? `- Synthetic: ${state.summary.syntheticPass} PASS · ${state.summary.syntheticFail} FAIL` : "- Synthetic: N/A",
      state.summary ? `- Startup context: ${state.summary.startupMs ?? "N/A"}ms (JS session → app ready)` : "- Startup context: N/A",
      state.summary ? `- Route p95: ${state.summary.routeP95Ms ?? "N/A"}ms` : "- Route p95: N/A",
      state.summary ? `- Event-loop: p95 ${state.summary.eventLoopP95Ms ?? "N/A"}ms · max ${state.summary.eventLoopMaxMs ?? "N/A"}ms` : "- Event-loop: N/A",
      state.summary ? `- Listener peak: ${state.summary.listenerPeak}` : "- Listener peak: N/A",
      state.summary ? `- Slowest: ${state.summary.slowestRoutes.map((item) => `${item.label} ${item.durationMs}ms`).join(" | ") || "N/A"}` : "- Slowest: N/A",
      "",
      "STEPS",
      ...state.stepResults.map((item) => `- ${item.status} | ${item.index + 1}/${state.totalSteps} | ${item.label} | ${item.durationMs}ms | ${item.detail}`),
      "",
      performanceTestService.exportText(),
    ];
    return lines.filter((line, index) => line || index > 0).join("\n");
  };
}

export const appWidePerformanceService = new AppWidePerformanceService();
