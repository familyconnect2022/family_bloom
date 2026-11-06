import { useFocusEffect } from "expo-router";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type DependencyList,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { bloomTaskScheduler } from "../services/performance/bloomTaskScheduler";

export const MAIN_TAB_IDS = ["home", "moments", "planner", "family", "play"] as const;
export type MainTabId = typeof MAIN_TAB_IDS[number];
export type TabRuntimeState = "active" | "warm" | "suspended" | "restoring";
export type SurfaceMemoryPressure = "normal" | "moderate" | "high";

// Compatibility constants retained for existing gates/callers. P2 no longer
// applies one fixed warm grace to every surface; cost profiles decide it.
export const TAB_WARM_GRACE_MS = 420;
export const TAB_RESTORE_DELAY_MS = 210;
export const TAB_HANDOFF_FREEZE_MS = 176;

type SurfaceProfile = { cost: number; warmMs: number };
const SURFACE_PROFILES: Record<MainTabId, SurfaceProfile> = {
  home: { cost: 1, warmMs: 1200 },
  moments: { cost: 2, warmMs: 900 },
  planner: { cost: 2, warmMs: 820 },
  family: { cost: 3, warmMs: 520 },
  play: { cost: 2, warmMs: 720 },
};

export type RuntimeSnapshot = {
  tabId: MainTabId;
  state: TabRuntimeState;
  epoch: number;
  appActive: boolean;
  focused: boolean;
  live: boolean;
  transitionCount: number;
  lastTransitionAt: number;
  dirtyVersion: number;
  appliedDirtyVersion: number;
};

type Subscriber = () => void;
type Cleanup = void | (() => void);
export type TabLiveScope = { epoch: number; isCurrent: () => boolean };

const initialSnapshot = (tabId: MainTabId): RuntimeSnapshot => ({
  tabId,
  state: "suspended",
  epoch: 0,
  appActive: AppState.currentState === "active",
  focused: false,
  live: false,
  transitionCount: 0,
  lastTransitionAt: Date.now(),
  dirtyVersion: 0,
  appliedDirtyVersion: 0,
});

class TabRuntimeStore {
  private appActive = AppState.currentState === "active";
  private navigatorFocused = false;
  private focusedTab: MainTabId | null = null;
  private snapshots = new Map<MainTabId, RuntimeSnapshot>(MAIN_TAB_IDS.map((tabId) => [tabId, initialSnapshot(tabId)]));
  private subscribers = new Map<MainTabId, Set<Subscriber>>(MAIN_TAB_IDS.map((tabId) => [tabId, new Set()]));
  private warmTimers = new Map<MainTabId, ReturnType<typeof setTimeout>>();
  private restoreTimers = new Map<MainTabId, ReturnType<typeof setTimeout>>();
  private handoffTimers = new Map<MainTabId, ReturnType<typeof setTimeout>>();
  private warmRecency = new Map<MainTabId, number>();
  private memoryPressure: SurfaceMemoryPressure = "normal";

  getSnapshot = (tabId: MainTabId) => this.snapshots.get(tabId) ?? initialSnapshot(tabId);

  subscribe = (tabId: MainTabId, subscriber: Subscriber) => {
    const bucket = this.subscribers.get(tabId) ?? new Set<Subscriber>();
    bucket.add(subscriber);
    this.subscribers.set(tabId, bucket);
    return () => bucket.delete(subscriber);
  };

  /**
   * Compatibility handoff API retained for older callers. P2.3 tab presses no
   * longer invoke this before navigation because that caused synchronous React
   * notifications in the touch/route-commit path.
   */
  prepareFocus = (tabId: MainTabId) => {
    bloomTaskScheduler.beginInteraction();
    if (this.focusedTab === tabId) return;
    const previous = this.focusedTab;
    this.focusedTab = tabId;
    if (previous && previous !== tabId) this.scheduleMoveToWarm(previous);
    this.activateCandidate(tabId);
  };

  /** Reserve the handoff window without mutating surface ownership. */
  beginInteraction = (durationMs = TAB_RESTORE_DELAY_MS + 48) => {
    bloomTaskScheduler.beginInteraction(durationMs);
  };

  /**
   * P2.4 navigator-level focus bridge. The heavy tab screens no longer call
   * useFocusEffect themselves; one tiny layout bridge owns parent Stack focus.
   * This prevents navigation focus context updates from entering five feature
   * trees just to tell them whether the Tabs workspace is visible.
   */
  setNavigatorFocused = (focused: boolean) => {
    if (this.navigatorFocused === focused) return;
    this.navigatorFocused = focused;

    if (!focused) {
      this.clearAllTimers();
      this.warmRecency.clear();
      MAIN_TAB_IDS.forEach((tabId) => {
        const current = this.getSnapshot(tabId);
        if (current.state === "suspended" && !current.focused && !current.live) return;
        this.transition(tabId, "suspended", {
          focused: false,
          incrementEpoch: current.state !== "suspended" || current.focused || current.live,
        });
      });
      return;
    }

    if (this.focusedTab) this.focus(this.focusedTab);
  };

  focus = (tabId: MainTabId) => {
    const currentAtFocus = this.getSnapshot(tabId);
    const wasFrozenOutgoing = this.handoffTimers.has(tabId);
    this.clearHandoffTimer(tabId);

    if (this.focusedTab === tabId && this.appActive && this.navigatorFocused && currentAtFocus.focused) {
      if (currentAtFocus.state === "active" || this.restoreTimers.has(tabId)) return;
    }

    if (this.focusedTab !== tabId) {
      const previous = this.focusedTab;
      this.focusedTab = tabId;
      if (previous && previous !== tabId && this.navigatorFocused) this.scheduleMoveToWarm(previous);
    }

    // The active tab index can be committed while the whole Tabs navigator is
    // underneath a transient route. Remember the target, but do not wake it.
    if (!this.navigatorFocused) return;

    // Rapid tap-back: if this surface was deliberately kept ACTIVE through the
    // outgoing visual handoff, reclaim it without forcing ACTIVE -> RESTORING -> ACTIVE.
    if (wasFrozenOutgoing && this.appActive && currentAtFocus.state === "active") return;
    this.activateCandidate(tabId);
  };

  blur = (tabId: MainTabId) => {
    if (this.focusedTab === tabId) this.focusedTab = null;
    this.clearRestoreTimer(tabId);
    if (!this.appActive) {
      this.clearHandoffTimer(tabId);
      const current = this.getSnapshot(tabId);
      this.transition(tabId, "suspended", { focused: false, incrementEpoch: current.focused });
      return;
    }
    // Freeze the outgoing surface through the native scene transition. This
    // prevents Moment rows/listener teardown from rendering in the same frames
    // as the tab slide. The state flips to WARM immediately after handoff.
    this.scheduleMoveToWarm(tabId);
  };

  setAppActive = (active: boolean) => {
    if (this.appActive === active) return;
    this.appActive = active;
    if (!active) {
      this.clearAllTimers();
      this.warmRecency.clear();
      MAIN_TAB_IDS.forEach((tabId) => {
        const current = this.getSnapshot(tabId);
        this.transition(tabId, "suspended", {
          focused: this.navigatorFocused && this.focusedTab === tabId,
          incrementEpoch: current.state !== "suspended",
        });
      });
      return;
    }

    MAIN_TAB_IDS.forEach((tabId) => {
      const current = this.getSnapshot(tabId);
      if (tabId !== this.focusedTab) this.replaceSnapshot(tabId, { ...current, appActive: true, live: false }, true);
    });
    if (this.navigatorFocused && this.focusedTab) this.focus(this.focusedTab);
  };

  /** Adaptive memory pressure hook for diagnostics/native memory callbacks. */
  reportMemoryPressure = (pressure: SurfaceMemoryPressure) => {
    this.memoryPressure = pressure;
    this.enforceWarmBudget();
  };

  /** Freeze barrier: hidden surfaces become dirty without receiving React notifications. */
  markDirty = (tabId: MainTabId) => {
    const current = this.getSnapshot(tabId);
    const next = { ...current, dirtyVersion: current.dirtyVersion + 1 };
    const notify = current.state === "active" || current.state === "restoring";
    this.replaceSnapshot(tabId, next, notify);
    return next.dirtyVersion;
  };

  /** Called by a surface after applying the latest store/cache snapshot once. */
  acknowledgeDirty = (tabId: MainTabId) => {
    const current = this.getSnapshot(tabId);
    if (current.appliedDirtyVersion === current.dirtyVersion) return current.dirtyVersion;
    this.replaceSnapshot(tabId, { ...current, appliedDirtyVersion: current.dirtyVersion }, current.state === "active");
    return current.dirtyVersion;
  };

  hasDirty = (tabId: MainTabId) => {
    const current = this.getSnapshot(tabId);
    return current.dirtyVersion > current.appliedDirtyVersion;
  };

  destroy = () => {
    this.clearAllTimers();
    this.warmRecency.clear();
    MAIN_TAB_IDS.forEach((tabId) => this.subscribers.get(tabId)?.clear());
  };

  private activateCandidate(tabId: MainTabId) {
    this.clearHandoffTimer(tabId);
    this.clearWarmTimer(tabId);
    this.warmRecency.delete(tabId);
    if (!this.appActive || !this.navigatorFocused) {
      this.transition(tabId, "suspended", { focused: false, incrementEpoch: false });
      return;
    }
    this.transition(tabId, "restoring", { focused: true, incrementEpoch: false });
    this.scheduleRestore(tabId);
  }

  private scheduleRestore(tabId: MainTabId) {
    this.clearRestoreTimer(tabId);
    this.restoreTimers.set(tabId, setTimeout(() => {
      this.restoreTimers.delete(tabId);
      if (!this.appActive || this.focusedTab !== tabId) return;
      this.transition(tabId, "active", { focused: true, incrementEpoch: false });
    }, TAB_RESTORE_DELAY_MS));
  }

  private scheduleMoveToWarm(tabId: MainTabId) {
    this.clearHandoffTimer(tabId);
    this.handoffTimers.set(tabId, setTimeout(() => {
      this.handoffTimers.delete(tabId);
      // The surface may have been reclaimed by a rapid tap-back.
      if (this.focusedTab === tabId) return;
      this.moveToWarm(tabId);
    }, TAB_HANDOFF_FREEZE_MS));
  }

  private moveToWarm(tabId: MainTabId) {
    this.clearRestoreTimer(tabId);
    const current = this.getSnapshot(tabId);
    if (current.state === "suspended" && !current.focused) return;

    this.warmRecency.set(tabId, Date.now());
    this.transition(tabId, "warm", { focused: false, incrementEpoch: true });
    this.clearWarmTimer(tabId);

    const adaptiveWarmMs = Math.max(TAB_WARM_GRACE_MS, SURFACE_PROFILES[tabId].warmMs);
    this.warmTimers.set(tabId, setTimeout(() => {
      this.warmTimers.delete(tabId);
      if (this.focusedTab === tabId || !this.warmRecency.has(tabId)) return;
      this.warmRecency.delete(tabId);
      this.transition(tabId, "suspended", { focused: false, incrementEpoch: false });
    }, adaptiveWarmMs));

    this.enforceWarmBudget();
  }

  private warmBudget() {
    if (this.memoryPressure === "high") return 0;
    if (this.memoryPressure === "moderate") return 2;
    return 3;
  }

  private enforceWarmBudget() {
    let total = [...this.warmRecency.keys()].reduce((sum, tabId) => sum + SURFACE_PROFILES[tabId].cost, 0);
    const budget = this.warmBudget();
    if (total <= budget) return;

    const candidates = [...this.warmRecency.entries()]
      .filter(([tabId]) => tabId !== this.focusedTab)
      .sort((a, b) => a[1] - b[1] || SURFACE_PROFILES[b[0]].cost - SURFACE_PROFILES[a[0]].cost);

    for (const [tabId] of candidates) {
      if (total <= budget) break;
      this.warmRecency.delete(tabId);
      this.clearWarmTimer(tabId);
      total -= SURFACE_PROFILES[tabId].cost;
      this.transition(tabId, "suspended", { focused: false, incrementEpoch: false });
    }
  }

  private transition(tabId: MainTabId, state: TabRuntimeState, options: { focused: boolean; incrementEpoch: boolean }) {
    const previous = this.getSnapshot(tabId);
    const epoch = options.incrementEpoch ? previous.epoch + 1 : previous.epoch;
    const changed = previous.state !== state || previous.focused !== options.focused;
    const next: RuntimeSnapshot = {
      ...previous,
      state,
      epoch,
      appActive: this.appActive,
      focused: options.focused,
      live: this.appActive && options.focused && state === "active",
      transitionCount: previous.transitionCount + (changed ? 1 : 0),
      lastTransitionAt: changed ? Date.now() : previous.lastTransitionAt,
    };
    this.replaceSnapshot(tabId, next, true);
  }

  private replaceSnapshot(tabId: MainTabId, next: RuntimeSnapshot, notify: boolean) {
    const previous = this.getSnapshot(tabId);
    if (
      previous.state === next.state
      && previous.epoch === next.epoch
      && previous.appActive === next.appActive
      && previous.focused === next.focused
      && previous.live === next.live
      && previous.transitionCount === next.transitionCount
      && previous.lastTransitionAt === next.lastTransitionAt
      && previous.dirtyVersion === next.dirtyVersion
      && previous.appliedDirtyVersion === next.appliedDirtyVersion
    ) return;
    this.snapshots.set(tabId, next);
    if (notify) this.subscribers.get(tabId)?.forEach((subscriber) => subscriber());
  }

  private clearWarmTimer(tabId: MainTabId) {
    const timer = this.warmTimers.get(tabId);
    if (timer) clearTimeout(timer);
    this.warmTimers.delete(tabId);
  }

  private clearHandoffTimer(tabId: MainTabId) {
    const timer = this.handoffTimers.get(tabId);
    if (timer) clearTimeout(timer);
    this.handoffTimers.delete(tabId);
  }

  private clearRestoreTimer(tabId: MainTabId) {
    const timer = this.restoreTimers.get(tabId);
    if (timer) clearTimeout(timer);
    this.restoreTimers.delete(tabId);
  }

  private clearAllTimers() {
    this.warmTimers.forEach((timer) => clearTimeout(timer));
    this.restoreTimers.forEach((timer) => clearTimeout(timer));
    this.handoffTimers.forEach((timer) => clearTimeout(timer));
    this.warmTimers.clear();
    this.restoreTimers.clear();
    this.handoffTimers.clear();
  }
}

const TabRuntimeContext = createContext<TabRuntimeStore | null>(null);

export function TabRuntimeProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => new TabRuntimeStore(), []);
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => store.setAppActive(state === "active"));
    return () => {
      subscription.remove();
      store.destroy();
    };
  }, [store]);
  return <TabRuntimeContext.Provider value={store}>{children}</TabRuntimeContext.Provider>;
}

const useStore = () => {
  const store = useContext(TabRuntimeContext);
  if (!store) throw new Error("TabRuntimeProvider is missing");
  return store;
};

export function useTabRuntimeController() {
  const store = useStore();
  return useMemo(() => ({
    prepareFocus: store.prepareFocus,
    beginInteraction: store.beginInteraction,
    restoreFocus: store.focus,
    markDirty: store.markDirty,
    acknowledgeDirty: store.acknowledgeDirty,
    reportMemoryPressure: store.reportMemoryPressure,
    setNavigatorFocused: store.setNavigatorFocused,
  }), [store]);
}

export function useTabLiveState(tabId: MainTabId) {
  const store = useStore();
  const subscribe = useCallback((listener: Subscriber) => store.subscribe(tabId, listener), [store, tabId]);
  const getSnapshot = useCallback(() => store.getSnapshot(tabId).live, [store, tabId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useTabRuntime(tabId: MainTabId) {
  const store = useStore();
  useFocusEffect(useCallback(() => {
    store.focus(tabId);
    return () => store.blur(tabId);
  }, [store, tabId]));
}

export function useTabRuntimeSnapshot(tabId: MainTabId) {
  const store = useStore();
  const subscribe = useCallback((listener: Subscriber) => store.subscribe(tabId, listener), [store, tabId]);
  const getSnapshot = useCallback(() => store.getSnapshot(tabId), [store, tabId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useTabDirtyVersion(tabId: MainTabId) {
  const store = useStore();
  const subscribe = useCallback((listener: Subscriber) => store.subscribe(tabId, listener), [store, tabId]);
  const getSnapshot = useCallback(() => store.getSnapshot(tabId).dirtyVersion, [store, tabId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

function useTabLiveEffectInternal(
  store: TabRuntimeStore | null,
  tabId: MainTabId | null | undefined,
  effect: (scope: TabLiveScope) => Cleanup,
  deps: DependencyList = [],
) {
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
    if (!store || !tabId) return;
    let cleanup: Cleanup;
    let running = false;
    const stopCurrent = () => {
      if (!running) return;
      if (typeof cleanup === "function") cleanup();
      cleanup = undefined;
      running = false;
    };
    const sync = () => {
      const live = store.getSnapshot(tabId).live;
      if (!live) {
        stopCurrent();
        return;
      }
      if (!running) {
        running = true;
        const epoch = store.getSnapshot(tabId).epoch;
        cleanup = effectRef.current({
          epoch,
          isCurrent: () => {
            const current = store.getSnapshot(tabId);
            return current.live && current.epoch === epoch;
          },
        });
      }
    };
    const unsubscribe = store.subscribe(tabId, sync);
    sync();
    return () => {
      unsubscribe();
      stopCurrent();
    };
    // deps intentionally restart an ACTIVE resource when its key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tabId, ...deps]);
}

export function useTabLiveEffect(tabId: MainTabId, effect: (scope: TabLiveScope) => Cleanup, deps: DependencyList = []) {
  const store = useStore();
  useTabLiveEffectInternal(store, tabId, effect, deps);
}

/**
 * Optional tab-lifecycle resource for hooks/components that are shared by both
 * main tabs and transient routes. Outside `(tabs)` there is intentionally no
 * TabRuntimeProvider; in that case this hook is a no-op and the transient route
 * keeps ownership of its normal mount-scoped resource.
 */
export function useOptionalTabLiveEffect(
  tabId: MainTabId | null | undefined,
  effect: (scope: TabLiveScope) => Cleanup,
  deps: DependencyList = [],
) {
  const store = useContext(TabRuntimeContext);
  useTabLiveEffectInternal(store, tabId, effect, deps);
}
