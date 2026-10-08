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

export const MAIN_TAB_IDS = ["home", "moments", "planner", "family", "play"] as const;
export type MainTabId = typeof MAIN_TAB_IDS[number];
export type TabRuntimeState = "active" | "warm" | "suspended" | "restoring";

export const TAB_WARM_GRACE_MS = 420;
export const TAB_RESTORE_DELAY_MS = 210;

type RuntimeSnapshot = {
  tabId: MainTabId;
  state: TabRuntimeState;
  epoch: number;
  appActive: boolean;
  focused: boolean;
  live: boolean;
  transitionCount: number;
  lastTransitionAt: number;
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
});

class TabRuntimeStore {
  private appActive = AppState.currentState === "active";
  private focusedTab: MainTabId | null = null;
  private warmTab: MainTabId | null = null;
  private snapshots = new Map<MainTabId, RuntimeSnapshot>(MAIN_TAB_IDS.map((tabId) => [tabId, initialSnapshot(tabId)]));
  private subscribers = new Map<MainTabId, Set<Subscriber>>(MAIN_TAB_IDS.map((tabId) => [tabId, new Set()]));
  private warmTimers = new Map<MainTabId, ReturnType<typeof setTimeout>>();
  private restoreTimers = new Map<MainTabId, ReturnType<typeof setTimeout>>();


  getSnapshot = (tabId: MainTabId) => this.snapshots.get(tabId) ?? initialSnapshot(tabId);

  subscribe = (tabId: MainTabId, subscriber: Subscriber) => {
    const bucket = this.subscribers.get(tabId) ?? new Set<Subscriber>();
    bucket.add(subscriber);
    this.subscribers.set(tabId, bucket);
    return () => bucket.delete(subscriber);
  };

  focus = (tabId: MainTabId) => {
    const currentAtFocus = this.getSnapshot(tabId);
    if (this.focusedTab === tabId && this.appActive && currentAtFocus.focused && currentAtFocus.state === "active") return;
    if (this.focusedTab !== tabId) {
      const previous = this.focusedTab;
      this.focusedTab = tabId;
      if (previous && previous !== tabId) this.moveToWarm(previous);
    }

    this.clearWarmTimer(tabId);
    if (this.warmTab === tabId) this.warmTab = null;

    if (!this.appActive) {
      this.transition(tabId, "suspended", { focused: true, incrementEpoch: false });
      return;
    }

    this.transition(tabId, "restoring", { focused: true, incrementEpoch: false });
    this.clearRestoreTimer(tabId);
    this.restoreTimers.set(tabId, setTimeout(() => {
      this.restoreTimers.delete(tabId);
      if (!this.appActive || this.focusedTab !== tabId) return;
      this.transition(tabId, "active", { focused: true, incrementEpoch: false });
    }, TAB_RESTORE_DELAY_MS));
  };

  blur = (tabId: MainTabId) => {
    if (this.focusedTab === tabId) this.focusedTab = null;
    this.clearRestoreTimer(tabId);
    if (!this.appActive) {
      const current = this.getSnapshot(tabId);
      this.transition(tabId, "suspended", { focused: false, incrementEpoch: current.focused });
      return;
    }
    this.moveToWarm(tabId);
  };

  setAppActive = (active: boolean) => {
    if (this.appActive === active) return;
    this.appActive = active;

    if (!active) {
      this.clearAllTimers();
      this.warmTab = null;
      MAIN_TAB_IDS.forEach((tabId) => {
        const current = this.getSnapshot(tabId);
        this.transition(tabId, "suspended", {
          focused: this.focusedTab === tabId,
          incrementEpoch: current.state !== "suspended",
        });
      });
      return;
    }

    MAIN_TAB_IDS.forEach((tabId) => {
      const current = this.getSnapshot(tabId);
      if (tabId !== this.focusedTab) {
        this.replaceSnapshot(tabId, { ...current, appActive: true, live: false });
      }
    });
    if (this.focusedTab) this.focus(this.focusedTab);
  };

  destroy = () => {
    this.clearAllTimers();
    MAIN_TAB_IDS.forEach((tabId) => this.subscribers.get(tabId)?.clear());
  };

  private moveToWarm(tabId: MainTabId) {
    this.clearRestoreTimer(tabId);
    const current = this.getSnapshot(tabId);
    if (current.state === "suspended" && !current.focused) return;
    if (current.state === "warm" && !current.focused && this.warmTab === tabId) return;

    if (this.warmTab && this.warmTab !== tabId) {
      const previousWarm = this.warmTab;
      this.clearWarmTimer(previousWarm);
      this.transition(previousWarm, "suspended", { focused: false, incrementEpoch: false });
    }
    this.warmTab = tabId;
    this.transition(tabId, "warm", { focused: false, incrementEpoch: true });
    this.clearWarmTimer(tabId);
    this.warmTimers.set(tabId, setTimeout(() => {
      this.warmTimers.delete(tabId);
      if (this.focusedTab === tabId || this.warmTab !== tabId) return;
      this.warmTab = null;
      this.transition(tabId, "suspended", { focused: false, incrementEpoch: false });
    }, TAB_WARM_GRACE_MS));
  }

  private transition(
    tabId: MainTabId,
    state: TabRuntimeState,
    options: { focused: boolean; incrementEpoch: boolean },
  ) {
    const previous = this.getSnapshot(tabId);
    const epoch = options.incrementEpoch ? previous.epoch + 1 : previous.epoch;
    const next: RuntimeSnapshot = {
      ...previous,
      state,
      epoch,
      appActive: this.appActive,
      focused: options.focused,
      live: this.appActive && options.focused && state === "active",
      transitionCount: previous.transitionCount + (previous.state !== state || previous.focused !== options.focused ? 1 : 0),
      lastTransitionAt: previous.state !== state || previous.focused !== options.focused ? Date.now() : previous.lastTransitionAt,
    };
    this.replaceSnapshot(tabId, next);
  }

  private replaceSnapshot(tabId: MainTabId, next: RuntimeSnapshot) {
    const previous = this.getSnapshot(tabId);
    if (
      previous.state === next.state
      && previous.epoch === next.epoch
      && previous.appActive === next.appActive
      && previous.focused === next.focused
      && previous.live === next.live
      && previous.transitionCount === next.transitionCount
      && previous.lastTransitionAt === next.lastTransitionAt
    ) return;
    this.snapshots.set(tabId, next);
    this.subscribers.get(tabId)?.forEach((subscriber) => subscriber());
  }

  private clearWarmTimer(tabId: MainTabId) {
    const timer = this.warmTimers.get(tabId);
    if (timer) clearTimeout(timer);
    this.warmTimers.delete(tabId);
  }

  private clearRestoreTimer(tabId: MainTabId) {
    const timer = this.restoreTimers.get(tabId);
    if (timer) clearTimeout(timer);
    this.restoreTimers.delete(tabId);
  }

  private clearAllTimers() {
    this.warmTimers.forEach((timer) => clearTimeout(timer));
    this.restoreTimers.forEach((timer) => clearTimeout(timer));
    this.warmTimers.clear();
    this.restoreTimers.clear();
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

/**
 * Registers focus/blur ownership for a main tab without subscribing the entire
 * screen to runtime transitions. Phase 17 originally used useSyncExternalStore
 * here even though all five tab screens discarded the returned snapshot; that
 * caused heavy screens to render again for restoring -> active transitions.
 */
export function useTabRuntime(tabId: MainTabId) {
  const store = useStore();

  useFocusEffect(useCallback(() => {
    store.focus(tabId);
    return () => store.blur(tabId);
  }, [store, tabId]));
}

/** Reactive runtime state is intentionally opt-in for diagnostics/lightweight UI only. */
export function useTabRuntimeSnapshot(tabId: MainTabId) {
  const store = useStore();
  const subscribe = useCallback((listener: Subscriber) => store.subscribe(tabId, listener), [store, tabId]);
  const getSnapshot = useCallback(() => store.getSnapshot(tabId), [store, tabId]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * Starts work only while a tab is fully ACTIVE. Cleanup is invoked directly by
 * the runtime store, so it still runs when React Navigation freezes an inactive
 * tab and no render is allowed to commit there.
 */
export function useTabLiveEffect(tabId: MainTabId, effect: (scope: TabLiveScope) => Cleanup, deps: DependencyList = []) {
  const store = useStore();
  const effectRef = useRef(effect);
  effectRef.current = effect;

  useEffect(() => {
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
    // deps intentionally let callers restart an ACTIVE resource when its key changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, tabId, ...deps]);
}
