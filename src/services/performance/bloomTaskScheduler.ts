import { InteractionManager } from "react-native";
import { beginUiCriticalWindow, getUiFrameBudgetSnapshot } from "./uiFrameBudget";

export type BloomTaskPriority = "INTERACTION" | "VISIBLE" | "SYNC" | "PREFETCH" | "IDLE";

type TaskResult = void | Promise<void>;
type TaskSpec = {
  key: string;
  priority: BloomTaskPriority;
  run: () => TaskResult;
  canCancel?: boolean;
  generation?: number;
  delayMs?: number;
  onError?: (error: unknown) => void;
};

type PendingTask = TaskSpec & {
  sequence: number;
  cancelled: boolean;
  claimed: boolean;
  readyAt: number;
};

const WEIGHT: Record<BloomTaskPriority, number> = {
  INTERACTION: 0,
  VISIBLE: 1,
  SYNC: 2,
  PREFETCH: 3,
  IDLE: 4,
};

const LOW_PRIORITIES = new Set<BloomTaskPriority>(["SYNC", "PREFETCH", "IDLE"]);
const pending = new Map<string, PendingTask>();
let sequence = 0;
let draining = false;
let interactionUntil = 0;
let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let wakeAt = 0;

const now = () => Date.now();
const host = globalThis as typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number;
};

const clearWake = () => {
  if (wakeTimer) clearTimeout(wakeTimer);
  wakeTimer = null;
  wakeAt = 0;
};

const compare = (a: PendingTask, b: PendingTask) =>
  WEIGHT[a.priority] - WEIGHT[b.priority] || a.sequence - b.sequence;

const readyTasks = (at: number) => [...pending.values()]
  .filter((task) => !task.cancelled && !task.claimed && task.readyAt <= at)
  .sort(compare);

const earliestReadyAt = () => {
  let earliest = Number.POSITIVE_INFINITY;
  for (const task of pending.values()) {
    if (task.cancelled || task.claimed) continue;
    earliest = Math.min(earliest, task.readyAt);
  }
  return earliest;
};

function scheduleDrain(delayMs = 0) {
  if (draining) return;
  const target = now() + Math.max(0, delayMs);
  // Never let a later task move an already-scheduled earlier wake farther out.
  if (wakeTimer && wakeAt > 0 && wakeAt <= target) return;
  clearWake();
  wakeAt = target;
  wakeTimer = setTimeout(() => {
    wakeTimer = null;
    wakeAt = 0;
    void drain();
  }, Math.max(0, target - now()));
}

const waitForIdle = (callback: () => void) => {
  if (typeof host.requestIdleCallback === "function") {
    host.requestIdleCallback(callback, { timeout: 700 });
    return;
  }
  InteractionManager.runAfterInteractions(callback);
};

const deleteIfCurrent = (task: PendingTask) => {
  if (pending.get(task.key) === task) pending.delete(task.key);
};

async function drain() {
  if (draining) return;
  const at = now();
  const task = readyTasks(at)[0];
  if (!task) {
    const nextAt = earliestReadyAt();
    if (Number.isFinite(nextAt)) scheduleDrain(Math.max(0, nextAt - at));
    return;
  }

  const uiBudget = getUiFrameBudgetSnapshot();
  const userInteracting = at < interactionUntil;
  if ((userInteracting || uiBudget.critical) && LOW_PRIORITIES.has(task.priority)) {
    const interactionDelay = Math.max(16, Math.min(80, interactionUntil - at + 8));
    scheduleDrain(interactionDelay);
    return;
  }

  // Keep the claimed task in the map while it waits for idle so cancel()/replacement
  // can still invalidate it before execution begins.
  task.claimed = true;

  const execute = async () => {
    if (task.cancelled || pending.get(task.key) !== task) {
      deleteIfCurrent(task);
      if (pending.size) scheduleDrain();
      return;
    }
    draining = true;
    try {
      await task.run();
    } catch (error) {
      task.onError?.(error);
    } finally {
      deleteIfCurrent(task);
      draining = false;
      if (pending.size) scheduleDrain();
    }
  };

  if (task.priority === "PREFETCH" || task.priority === "IDLE") {
    waitForIdle(() => { void execute(); });
    // A claimed idle task must not block unrelated ready work in the meantime.
    if (readyTasks(now()).length) scheduleDrain();
    return;
  }
  await execute();
}

export const bloomTaskScheduler = {
  schedule(spec: TaskSpec) {
    const previous = pending.get(spec.key);
    if (previous?.canCancel === false) {
      // A non-cancellable task owns its key until it completes. Replacing it in
      // the Map would silently invalidate it through the stale-key guard.
      return () => undefined;
    }
    if (previous) {
      previous.cancelled = true;
      pending.delete(spec.key);
    }
    const task: PendingTask = {
      ...spec,
      canCancel: spec.canCancel ?? true,
      sequence: ++sequence,
      cancelled: false,
      claimed: false,
      readyAt: now() + Math.max(0, spec.delayMs ?? 0),
    };
    pending.set(spec.key, task);
    scheduleDrain(Math.max(0, task.readyAt - now()));
    return () => {
      const current = pending.get(spec.key);
      if (current === task && task.canCancel !== false) {
        task.cancelled = true;
        pending.delete(spec.key);
        if (pending.size) scheduleDrain();
      }
    };
  },

  cancel(key: string) {
    const task = pending.get(key);
    if (!task || task.canCancel === false) return false;
    task.cancelled = true;
    pending.delete(key);
    if (pending.size) scheduleDrain();
    return true;
  },

  cancelPrefix(prefix: string) {
    let changed = false;
    for (const [key, task] of pending) {
      if (!key.startsWith(prefix) || task.canCancel === false) continue;
      task.cancelled = true;
      pending.delete(key);
      changed = true;
    }
    if (changed && pending.size) scheduleDrain();
  },

  /** Interaction always wins. Low-priority work yields until the critical window closes. */
  beginInteraction(durationMs = 240) {
    interactionUntil = Math.max(interactionUntil, now() + Math.max(0, durationMs));
    beginUiCriticalWindow(durationMs);
    // Drain immediately so INTERACTION/VISIBLE work can still run. The drain
    // itself defers only low-priority SYNC/PREFETCH/IDLE tasks.
    if (pending.size) scheduleDrain(0);
  },

  snapshot() {
    return {
      interactionUntil,
      pending: [...pending.values()].sort(compare).map(({ key, priority, generation, sequence, claimed, readyAt }) => ({
        key, priority, generation, sequence, claimed, readyAt,
      })),
    };
  },

  resetForTests() {
    pending.forEach((task) => { task.cancelled = true; });
    pending.clear();
    clearWake();
    draining = false;
    interactionUntil = 0;
    sequence = 0;
  },
};
