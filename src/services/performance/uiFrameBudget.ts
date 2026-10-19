/**
 * Small coordinator that keeps non-visual React/data commits out of a short
 * UI-critical window (for example a main-tab handoff).
 *
 * The latest commit wins per key, so realtime snapshots are coalesced instead
 * of queued. Once the critical window closes, commits are released one per
 * frame to avoid one large catch-up render.
 */

export const TAB_UI_CRITICAL_WINDOW_MS = 240;

type DeferredCommit = () => void;

type FrameHost = typeof globalThis & {
  requestAnimationFrame?: (callback: (time: number) => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
};

const host = globalThis as FrameHost;
const pending = new Map<string, DeferredCommit>();
let criticalUntil = 0;
let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let frameHandle: number | null = null;
let generation = 0;

const now = () => Date.now();
const isCritical = () => now() < criticalUntil;

function cancelWakeTimer() {
  if (!wakeTimer) return;
  clearTimeout(wakeTimer);
  wakeTimer = null;
}

function cancelFrame() {
  if (frameHandle == null || typeof host.cancelAnimationFrame !== "function") return;
  host.cancelAnimationFrame(frameHandle);
  frameHandle = null;
}

function onNextFrame(callback: () => void) {
  if (typeof host.requestAnimationFrame === "function") {
    frameHandle = host.requestAnimationFrame(() => {
      frameHandle = null;
      callback();
    });
    return;
  }
  wakeTimer = setTimeout(() => {
    wakeTimer = null;
    callback();
  }, 16);
}

function scheduleDrain() {
  cancelWakeTimer();
  if (!pending.size) return;

  const remaining = criticalUntil - now();
  if (remaining > 0) {
    const scheduledGeneration = generation;
    wakeTimer = setTimeout(() => {
      wakeTimer = null;
      if (scheduledGeneration !== generation || isCritical()) {
        scheduleDrain();
        return;
      }
      drainOnePerFrame();
    }, Math.max(1, remaining + 4));
    return;
  }

  drainOnePerFrame();
}

function drainOnePerFrame() {
  if (isCritical()) {
    scheduleDrain();
    return;
  }
  if (!pending.size || frameHandle != null) return;

  onNextFrame(() => {
    if (isCritical()) {
      scheduleDrain();
      return;
    }

    const next = pending.entries().next();
    if (next.done) return;
    const [key, commit] = next.value;
    pending.delete(key);
    commit();

    if (pending.size) drainOnePerFrame();
  });
}

/** Extend the UI-critical window. Repeated fast tab presses naturally coalesce. */
export function beginUiCriticalWindow(durationMs = TAB_UI_CRITICAL_WINDOW_MS) {
  generation += 1;
  criticalUntil = Math.max(criticalUntil, now() + Math.max(0, durationMs));
  cancelFrame();
  if (pending.size) scheduleDrain();
}

/**
 * Run immediately when the UI is free; otherwise keep only the newest commit
 * for this key until the critical window ends.
 */
export function commitAfterUiCriticalWindow(key: string, commit: DeferredCommit) {
  if (!isCritical()) {
    commit();
    return;
  }
  pending.set(key, commit);
  scheduleDrain();
}

/** Cancel a deferred commit when the owning listener/family/session is disposed. */
export function cancelDeferredUiCommit(key: string) {
  pending.delete(key);
}

/** Test/diagnostic helpers; no UI is exposed in production. */
export function getUiFrameBudgetSnapshot() {
  return {
    critical: isCritical(),
    criticalUntil,
    pendingKeys: [...pending.keys()],
  };
}

export function resetUiFrameBudgetForTests() {
  pending.clear();
  criticalUntil = 0;
  generation += 1;
  cancelWakeTimer();
  cancelFrame();
}
