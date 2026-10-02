export type PerformanceTraceMark = {
  label: string;
  elapsedMs: number;
};

export type PerformanceTraceResult = {
  id: number;
  name: string;
  target?: string;
  startedAt: number;
  durationMs: number;
  marks: PerformanceTraceMark[];
  status: "ok" | "cancelled" | "error";
};

export type PerformanceMetric = {
  id: number;
  name: string;
  value: number;
  unit: string;
  detail?: string;
  recordedAt: number;
};

export type PerformanceSnapshot = {
  traces: PerformanceTraceResult[];
  metrics: PerformanceMetric[];
  activeListeners: Record<string, number>;
  activeListenerTotal: number;
  activeMounts: Record<string, number>;
  activeMountTotal: number;
  interactionProbeRunning: boolean;
  interactionProbeEndsAt: number | null;
};

type ActiveTrace = {
  id: number;
  name: string;
  target?: string;
  startedAt: number;
  marks: PerformanceTraceMark[];
};

type Subscriber = () => void;
type InteractionProbeMode = "interaction" | "final_gate";

const MAX_TRACES = 80;
const MAX_METRICS = 120;
const now = () => Date.now();

class PerformanceTestService {
  readonly sessionStartedAt = now();
  private appReadyRecorded = false;
  private sequence = 1;
  private traces: PerformanceTraceResult[] = [];
  private metrics: PerformanceMetric[] = [];
  private active = new Map<string, ActiveTrace>();
  private listeners = new Map<string, number>();
  private mounts = new Map<string, number>();
  private subscribers = new Set<Subscriber>();
  private probeTimer: ReturnType<typeof setTimeout> | null = null;
  private probeFinishTimer: ReturnType<typeof setTimeout> | null = null;
  private probeEndsAt: number | null = null;
  private probeStartedAt: number | null = null;
  private probeMode: InteractionProbeMode = "interaction";
  private probeSampleMs = 250;
  private probeDrifts: number[] = [];

  subscribe = (subscriber: Subscriber) => {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  };

  private emit = () => {
    this.subscribers.forEach((subscriber) => subscriber());
  };

  recordAppReadyOnce = () => {
    if (this.appReadyRecorded) return;
    this.appReadyRecorded = true;
    this.recordMetric("JS session → app ready", now() - this.sessionStartedAt, "ms", "Từ lúc module test được nạp; không phải native cold-start tuyệt đối");
  };

  start = (name: string, target?: string) => {
    const existing = this.active.get(name);
    if (existing) this.finish(name, "cancelled");
    this.active.set(name, {
      id: this.sequence++,
      name,
      target,
      startedAt: now(),
      marks: [],
    });
    this.emit();
  };

  mark = (name: string, label: string) => {
    const trace = this.active.get(name);
    if (!trace) return;
    trace.marks.push({ label, elapsedMs: now() - trace.startedAt });
    this.emit();
  };

  markTabPhase = (target: string, label: string) => {
    const trace = this.active.get("tab_switch");
    if (!trace || trace.target !== target) return;
    trace.marks.push({ label, elapsedMs: now() - trace.startedAt });
    this.emit();
  };

  finish = (name: string, status: PerformanceTraceResult["status"] = "ok") => {
    const trace = this.active.get(name);
    if (!trace) return null;
    this.active.delete(name);
    const result: PerformanceTraceResult = {
      ...trace,
      durationMs: now() - trace.startedAt,
      status,
    };
    this.traces.unshift(result);
    if (this.traces.length > MAX_TRACES) this.traces.length = MAX_TRACES;
    this.emit();
    return result;
  };

  recordUiPress = (label: string) => {
    const startedAt = now();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      this.recordMetric("UI press → next frame", now() - startedAt, "ms", label);
    }));
  };

  recordMetric = (name: string, value: number, unit = "ms", detail?: string) => {
    this.metrics.unshift({
      id: this.sequence++,
      name,
      value: Number.isFinite(value) ? Math.round(value * 10) / 10 : 0,
      unit,
      detail,
      recordedAt: now(),
    });
    if (this.metrics.length > MAX_METRICS) this.metrics.length = MAX_METRICS;
    this.emit();
  };

  listenerOpened = (name: string) => {
    this.listeners.set(name, (this.listeners.get(name) ?? 0) + 1);
    const tabTrace = this.active.get("tab_switch");
    if (tabTrace) tabTrace.marks.push({ label: `listener_open:${name}`, elapsedMs: now() - tabTrace.startedAt });
    this.emit();
  };

  listenerClosed = (name: string) => {
    const next = Math.max(0, (this.listeners.get(name) ?? 0) - 1);
    if (next) this.listeners.set(name, next);
    else this.listeners.delete(name);
    this.emit();
  };

  trackListener = (name: string, unsubscribe: (() => void) | undefined | null) => {
    if (!unsubscribe) return undefined;
    this.listenerOpened(name);
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      this.listenerClosed(name);
      unsubscribe();
    };
  };

  mountOpened = (name: string) => {
    this.mounts.set(name, (this.mounts.get(name) ?? 0) + 1);
    this.emit();
  };

  mountClosed = (name: string) => {
    const next = Math.max(0, (this.mounts.get(name) ?? 0) - 1);
    if (next) this.mounts.set(name, next);
    else this.mounts.delete(name);
    this.emit();
  };

  trackMount = (name: string) => {
    this.mountOpened(name);
    let closed = false;
    return () => {
      if (closed) return;
      closed = true;
      this.mountClosed(name);
    };
  };

  startInteractionProbe = (durationMs = 60_000, mode: InteractionProbeMode = "interaction") => {
    this.stopInteractionProbe(false);
    // Keep the probe intentionally light. Each sample measures normalized event-loop
    // delay: actual callback time minus the time the callback was scheduled for.
    // The expected 250ms interval itself is NOT counted as a stall.
    const sampleMs = 250;
    this.probeDrifts = [];
    this.probeMode = mode;
    this.probeSampleMs = sampleMs;
    this.probeStartedAt = now();
    this.probeEndsAt = this.probeStartedAt + durationMs;
    let scheduledFor = this.probeStartedAt + sampleMs;
    const sample = () => {
      if (this.probeEndsAt === null) return;
      const current = now();
      this.probeDrifts.push(Math.max(0, current - scheduledFor));
      // Self-schedule from "now" so a long busy period never creates a burst of
      // catch-up callbacks that would add load to the JS thread being measured.
      scheduledFor = current + sampleMs;
      const remaining = this.probeEndsAt - current;
      if (remaining > 0) this.probeTimer = setTimeout(sample, Math.min(sampleMs, remaining));
    };
    this.probeTimer = setTimeout(sample, sampleMs);
    this.probeFinishTimer = setTimeout(() => this.stopInteractionProbe(true), durationMs);
    this.emit();
  };

  stopInteractionProbe = (save = true) => {
    if (this.probeTimer) clearTimeout(this.probeTimer);
    if (this.probeFinishTimer) clearTimeout(this.probeFinishTimer);
    const wasRunning = !!this.probeTimer || !!this.probeFinishTimer || this.probeEndsAt !== null;
    const probeStartedAt = this.probeStartedAt;
    const probeMode = this.probeMode;
    const sampleMs = this.probeSampleMs;
    const stoppedAt = now();
    this.probeTimer = null;
    this.probeFinishTimer = null;
    this.probeEndsAt = null;
    this.probeStartedAt = null;

    if (save && wasRunning && this.probeDrifts.length) {
      const sorted = [...this.probeDrifts].sort((a, b) => a - b);
      const percentile = (ratio: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * ratio))] ?? 0;
      const p50 = percentile(0.50);
      const p95 = percentile(0.95);
      const max = sorted[sorted.length - 1] ?? 0;
      const over100 = sorted.filter((value) => value >= 100).length;
      const over500 = sorted.filter((value) => value >= 500).length;
      const elapsed = Math.max(sampleMs, stoppedAt - (probeStartedAt ?? stoppedAt));
      const expectedSamples = Math.max(1, Math.floor(elapsed / sampleMs));
      const sampleCoverage = Math.min(100, (sorted.length / expectedSamples) * 100);
      const top3 = [...sorted].sort((a, b) => b - a).slice(0, 3).map((value) => `${Math.round(value)}ms`).join(" / ");
      const prefix = probeMode === "final_gate" ? "Final gate event-loop delay" : "Interaction event-loop delay";
      const scope = probeMode === "final_gate" ? "automated synthetic matrix" : "real interaction probe";

      this.recordMetric(`${prefix} p50`, p50, "ms", `${sorted.length} mẫu · interval ${sampleMs}ms · ${scope}`);
      this.recordMetric(`${prefix} p95`, p95, "ms", `normalized delay; interval ${sampleMs}ms không tính vào stall`);
      this.recordMetric(`${prefix} max`, max, "ms", `Top 3 delay: ${top3 || "0ms"}`);
      this.recordMetric(`${prefix} ≥100ms`, over100, "lần", `${scope}`);
      this.recordMetric(`${prefix} ≥500ms`, over500, "lần", `${scope}`);
      this.recordMetric(`${prefix} sample coverage`, sampleCoverage, "%", `${sorted.length}/${expectedSamples} callback quan sát được`);

      // Navigation scoring is meaningful only for the explicit 60-second real-use
      // probe. The Final Gate intentionally creates synthetic render pressure and
      // must not turn stress-screen button timings into an app-wide navigation score.
      if (probeMode === "interaction") {
        const probeTabSwitches = this.traces.filter((trace) =>
          trace.name === "tab_switch" &&
          trace.status === "ok" &&
          (probeStartedAt === null || trace.startedAt >= probeStartedAt)
        );
        if (probeTabSwitches.length) {
          const durations = probeTabSwitches.map((trace) => trace.durationMs).sort((a, b) => a - b);
          const tabP95 = durations[Math.min(durations.length - 1, Math.floor((durations.length - 1) * 0.95))] ?? 0;
          this.recordMetric("Tab switch p95", tabP95, "ms", `${durations.length} tab switch hoàn tất trong probe`);
        }
        const cancelledTabs = this.traces.filter((trace) =>
          trace.name === "tab_switch" &&
          trace.status === "cancelled" &&
          (probeStartedAt === null || trace.startedAt >= probeStartedAt)
        );
        this.recordMetric("Tab switch cancelled", cancelledTabs.length, "lần", "Tách riêng thao tác bị thay thế bởi lần bấm tab kế tiếp");
      }
    }
    this.probeDrifts = [];
    this.probeMode = "interaction";
    this.emit();
  };

  reset = () => {
    this.stopInteractionProbe(false);
    this.active.clear();
    this.traces = [];
    this.metrics = [];
    // Keep listener counters: active subscriptions continue running after clearing reports.
    this.emit();
  };

  snapshot = (): PerformanceSnapshot => {
    const activeListeners = Object.fromEntries([...this.listeners.entries()].sort(([a], [b]) => a.localeCompare(b)));
    const activeListenerTotal = Object.values(activeListeners).reduce((sum, value) => sum + value, 0);
    const activeMounts = Object.fromEntries([...this.mounts.entries()].sort(([a], [b]) => a.localeCompare(b)));
    const activeMountTotal = Object.values(activeMounts).reduce((sum, value) => sum + value, 0);
    return {
      traces: [...this.traces],
      metrics: [...this.metrics],
      activeListeners,
      activeListenerTotal,
      activeMounts,
      activeMountTotal,
      interactionProbeRunning: this.probeEndsAt !== null,
      interactionProbeEndsAt: this.probeEndsAt,
    };
  };

  exportText = () => {
    const snapshot = this.snapshot();
    const lines = [
      "FAMILY BLOOM PERFORMANCE TEST REPORT",
      `Generated: ${new Date().toISOString()}`,
      "",
      `Tracked listeners active: ${snapshot.activeListenerTotal}`,
      ...Object.entries(snapshot.activeListeners).map(([name, count]) => `- ${name}: ${count}`),
      "",
      `Tracked runtime mounts active: ${snapshot.activeMountTotal}`,
      ...Object.entries(snapshot.activeMounts).map(([name, count]) => `- ${name}: ${count}`),
      "",
      "METRICS",
      ...snapshot.metrics.map((metric) => `- ${metric.name}: ${metric.value} ${metric.unit}${metric.detail ? ` | ${metric.detail}` : ""}`),
      "",
      "TRACES",
      ...snapshot.traces.map((trace) => {
        const marks = trace.marks.map((mark) => `${mark.label}=${mark.elapsedMs}ms`).join(", ");
        return `- ${trace.name}${trace.target ? ` [${trace.target}]` : ""}: ${trace.durationMs}ms (${trace.status})${marks ? ` | ${marks}` : ""}`;
      }),
    ];
    return lines.join("\n");
  };
}

export const performanceTestService = new PerformanceTestService();
