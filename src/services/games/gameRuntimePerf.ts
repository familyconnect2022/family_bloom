export type BloomBoardKind = "chess" | "xiangqi";

type BoardPerfState = {
  renders: number;
  mounts: number;
  unmounts: number;
  runtimeActive: boolean;
  surfaceMounted: boolean;
  activeListeners: number;
  activeTimers: number;
  hintBatches: number;
  lastHintCount: number;
  lastHintMaxDelayMs: number;
  dragStarts: number;
  dragDrops: number;
  dragCancels: number;
  updatedAt: number;
};

type PerfSnapshot = Record<BloomBoardKind, BoardPerfState>;

const createState = (): BoardPerfState => ({
  renders: 0,
  mounts: 0,
  unmounts: 0,
  runtimeActive: false,
  surfaceMounted: false,
  activeListeners: 0,
  activeTimers: 0,
  hintBatches: 0,
  lastHintCount: 0,
  lastHintMaxDelayMs: 0,
  dragStarts: 0,
  dragDrops: 0,
  dragCancels: 0,
  updatedAt: Date.now(),
});

const perf: PerfSnapshot = {
  chess: createState(),
  xiangqi: createState(),
};

function publish() {
  // Intentionally tiny and allocation-free on animation frames. This global
  // hook is only for Family Bloom's internal adb/dev inspection. No console
  // logging is emitted from the move/gesture hot path.
  (globalThis as typeof globalThis & { __FAMILY_BLOOM_GAME_PERF__?: PerfSnapshot }).__FAMILY_BLOOM_GAME_PERF__ = perf;
}

function touch(kind: BloomBoardKind) {
  perf[kind].updatedAt = Date.now();
  publish();
}

export const gameRuntimePerf = {
  markRender(kind: BloomBoardKind) {
    perf[kind].renders += 1;
    touch(kind);
  },
  markMount(kind: BloomBoardKind) {
    perf[kind].mounts += 1;
    touch(kind);
  },
  markUnmount(kind: BloomBoardKind) {
    perf[kind].unmounts += 1;
    perf[kind].runtimeActive = false;
    perf[kind].surfaceMounted = false;
    perf[kind].activeListeners = 0;
    perf[kind].activeTimers = 0;
    touch(kind);
  },
  markSurface(kind: BloomBoardKind, mounted: boolean) {
    perf[kind].surfaceMounted = mounted;
    touch(kind);
  },
  markRuntime(kind: BloomBoardKind, active: boolean) {
    perf[kind].runtimeActive = active;
    if (!active) {
      perf[kind].activeListeners = 0;
      perf[kind].activeTimers = 0;
    }
    touch(kind);
  },
  setActiveListeners(kind: BloomBoardKind, count: number) {
    perf[kind].activeListeners = Math.max(0, Math.round(count));
    touch(kind);
  },
  adjustTimers(kind: BloomBoardKind, delta: number) {
    perf[kind].activeTimers = Math.max(0, perf[kind].activeTimers + delta);
    touch(kind);
  },
  markHintBatch(kind: BloomBoardKind, count: number, maxDelayMs: number) {
    perf[kind].hintBatches += 1;
    perf[kind].lastHintCount = count;
    perf[kind].lastHintMaxDelayMs = Math.max(0, Math.round(maxDelayMs));
    touch(kind);
  },
  markDrag(kind: BloomBoardKind, stage: "start" | "drop" | "cancel") {
    if (stage === "start") perf[kind].dragStarts += 1;
    else if (stage === "drop") perf[kind].dragDrops += 1;
    else perf[kind].dragCancels += 1;
    touch(kind);
  },
  snapshot(): PerfSnapshot {
    return perf;
  },
};

publish();
