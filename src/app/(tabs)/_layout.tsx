import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import React, { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  Easing as ReanimatedEasing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLOOM_MOTION } from "../../constants/motion";
import { COLORS } from "../../constants/theme";
import {
  TAB_RESTORE_DELAY_MS,
  TabRuntimeProvider,
  useTabRuntimeController,
  type MainTabId,
} from "../../context/TabRuntimeContext";
import { getChessSurfaceState, subscribeChessSurface } from "../../services/chess/chessSurfaceStore";
import { getXiangqiSurfaceState, subscribeXiangqiSurface } from "../../services/xiangqi/xiangqiSurfaceStore";
import { bloomTaskScheduler } from "../../services/performance/bloomTaskScheduler";
import { beginUiCriticalWindow, TAB_UI_CRITICAL_WINDOW_MS } from "../../services/performance/uiFrameBudget";
import { useTabStartup } from "../../context/TabStartupContext";

type TabIconName = keyof typeof Ionicons.glyphMap;
type TabRoute = { key: string; name: string };
type TabNavigation = {
  emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
  navigate: (name: string) => void;
  preload?: (name: string) => void;
};
type TabNavigationState = { index: number; routes: TabRoute[] };
type TabBridgeProps = {
  state: TabNavigationState;
  navigation: TabNavigation;
};

const MAIN_TAB_ROUTES = ["index", "moments", "planner", "family", "play"] as const;
const MAIN_TAB_LABELS = ["Trang nhà", "Kỷ niệm", "Lịch", "Cây nhà", "Nhà Mình"] as const;

const iconFor = (route: string): TabIconName => {
  switch (route) {
    case "index": return "home";
    case "moments": return "images";
    case "planner": return "calendar";
    case "family": return "people";
    case "play": return "heart";
    default: return "ellipse";
  }
};

const runtimeTabIdForRoute = (routeName: string | undefined): MainTabId | null => {
  switch (routeName) {
    case "index": return "home";
    case "moments": return "moments";
    case "planner": return "planner";
    case "family": return "family";
    case "play": return "play";
    default: return null;
  }
};

const TAB_INDICATOR_WIDTH = 50;
const TAB_INDICATOR_HEIGHT = 36;
const TAB_ICON_SIZE = 26;
const TAB_VISUAL_HEIGHT = 58;
const TAB_MOTION_MIN_MS = 164;
const TAB_MOTION_EXTRA_STEP_MS = 38;
const TAB_MOTION_MAX_MS = 278;
const TAB_LIFECYCLE_SETTLE_MS = TAB_MOTION_MAX_MS + 18;

const tabMotionDurationForDistance = (fromIndex: number, toIndex: number) => {
  const distance = Math.max(1, Math.abs(toIndex - fromIndex));
  return Math.min(TAB_MOTION_MAX_MS, TAB_MOTION_MIN_MS + (distance - 1) * TAB_MOTION_EXTRA_STEP_MS);
};

type CommitListener = (index: number) => void;

/**
 * P2.7 hard isolation boundary.
 *
 * The navigator is allowed to re-render this controller bridge, but the visual
 * tab bar never consumes React Navigation state/descriptor props. The bridge
 * only refreshes imperative refs and sends a tiny commit signal to the already
 * mounted visual host. No React state is changed in the host when a route commits.
 */
class PersistentTabBarController {
  private state: TabNavigationState | null = null;
  private navigation: TabNavigation | null = null;
  private commitListener: CommitListener | null = null;

  updateNavigator(state: TabNavigationState, navigation: TabNavigation) {
    this.state = state;
    this.navigation = navigation;
    this.commitListener?.(state.index);
  }

  registerCommitListener(listener: CommitListener) {
    this.commitListener = listener;
    if (this.state) listener(this.state.index);
    return () => {
      if (this.commitListener === listener) this.commitListener = null;
    };
  }

  getCommittedIndex() {
    return this.state?.index ?? 0;
  }

  press(index: number) {
    const state = this.state;
    const navigation = this.navigation;
    const route = state?.routes[index];
    if (!state || !navigation || !route) {
      return { prevented: true, committedIndex: state?.index ?? 0, navigated: false };
    }

    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) {
      return { prevented: true, committedIndex: state.index, navigated: false };
    }

    if (state.index === index) {
      return { prevented: false, committedIndex: state.index, navigated: false };
    }

    navigation.navigate(route.name);
    return { prevented: false, committedIndex: state.index, navigated: true };
  }

  longPress(index: number) {
    const state = this.state;
    const navigation = this.navigation;
    const route = state?.routes[index];
    if (!navigation || !route) return;
    navigation.emit({ type: "tabLongPress", target: route.key });
  }
}

const persistentTabBarController = new PersistentTabBarController();

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

type BloomTabButtonProps = {
  routeName: string;
  index: number;
  itemWidth: number;
  label: string;
  visualTargetIndex: SharedValue<number>;
  onPressInIndex: (index: number) => void;
  onPressIndex: (index: number) => void;
  onLongPressIndex: (index: number) => void;
};

const BloomTabButton = memo(function BloomTabButton({
  routeName,
  index,
  itemWidth,
  label,
  visualTargetIndex,
  onPressInIndex,
  onPressIndex,
  onLongPressIndex,
}: BloomTabButtonProps) {
  const iconStyle = useAnimatedStyle(() => ({
    color: visualTargetIndex.value === index ? COLORS.white : COLORS.tabInactive,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => onPressInIndex(index)}
      onPress={() => onPressIndex(index)}
      onLongPress={() => onLongPressIndex(index)}
      style={[styles.tabItem, { width: itemWidth }]}
    >
      <View pointerEvents="none" style={styles.tabIconSlot}>
        <AnimatedIonicons
          name={iconFor(routeName)}
          size={TAB_ICON_SIZE}
          style={[styles.tabIconGlyph, iconStyle]}
        />
      </View>
    </Pressable>
  );
});

/**
 * Visual tab bar. This component is a sibling of <Tabs>, not Tabs.tabBar.
 * It therefore stays mounted and does not receive route-state renders while a
 * heavy scene is committing. Route commits only mutate SharedValues/refs here.
 */
function PersistentBloomTabBarHost() {
  const insets = useSafeAreaInsets();
  const { reportChromeReady } = useTabStartup();
  const tabRuntime = useTabRuntimeController();
  const { width } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 8);
  const itemWidth = width / MAIN_TAB_ROUTES.length;
  const initialIndex = persistentTabBarController.getCommittedIndex();
  const indicatorIndex = useSharedValue(initialIndex);
  const visualTargetIndex = useSharedValue(initialIndex);
  const chromeVisibility = useSharedValue(
    getChessSurfaceState().mode === "full" || getXiangqiSurfaceState().mode === "full" ? 0 : 1,
  );
  const optimisticIndexRef = useRef(initialIndex);
  const latestRequestedIndexRef = useRef<number | null>(null);
  const commitGenerationRef = useRef(0);
  const pendingCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCommitDelayRef = useRef(TAB_MOTION_MIN_MS);
  const mountedRef = useRef(true);
  const chromeReadyReportedRef = useRef(false);
  const chromeReadyFrameOneRef = useRef<number | null>(null);
  const chromeReadyFrameTwoRef = useRef<number | null>(null);

  const animateIndicatorTo = useCallback((index: number, durationOverride?: number) => {
    const fromIndex = optimisticIndexRef.current;
    const duration = durationOverride ?? tabMotionDurationForDistance(fromIndex, index);
    optimisticIndexRef.current = index;
    indicatorIndex.value = withTiming(index, {
      duration,
      easing: ReanimatedEasing.bezier(0.16, 0.72, 0.22, 1),
    });
    return duration;
  }, [indicatorIndex]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      commitGenerationRef.current += 1;
      if (pendingCommitTimerRef.current) clearTimeout(pendingCommitTimerRef.current);
      if (chromeReadyFrameOneRef.current != null) cancelAnimationFrame(chromeReadyFrameOneRef.current);
      if (chromeReadyFrameTwoRef.current != null) cancelAnimationFrame(chromeReadyFrameTwoRef.current);
    };
  }, []);

  useEffect(() => persistentTabBarController.registerCommitListener((index) => {
    if (!mountedRef.current) return;
    const latestRequested = latestRequestedIndexRef.current;

    if (latestRequested != null) {
      if (latestRequested === index) {
        latestRequestedIndexRef.current = null;
        visualTargetIndex.value = index;
      }
      return;
    }

    // External/programmatic route commits synchronize instantly. User-driven
    // tab commits arrive only after the pill has already finished, so no scene
    // commit ever starts a second tabbar animation.
    visualTargetIndex.value = index;
    optimisticIndexRef.current = index;
    indicatorIndex.value = index;
  }), [indicatorIndex, visualTargetIndex]);

  useEffect(() => {
    const syncChromeVisibility = () => {
      // The tab chrome observes the two game-owned surface stores independently.
      // It does not own, synchronize or arbitrate either game's lifecycle.
      const hasFullGameSurface = getChessSurfaceState().mode === "full" || getXiangqiSurfaceState().mode === "full";
      if (!hasFullGameSurface) {
        chromeVisibility.value = 1;
        return;
      }
      chromeVisibility.value = withTiming(0, {
        duration: 45,
        easing: ReanimatedEasing.out(ReanimatedEasing.quad),
      });
    };
    const stopChess = subscribeChessSurface(syncChromeVisibility);
    const stopXiangqi = subscribeXiangqiSurface(syncChromeVisibility);
    syncChromeVisibility();
    return () => {
      stopChess();
      stopXiangqi();
    };
  }, [chromeVisibility]);

  const hostVisibilityStyle = useAnimatedStyle(() => ({
    opacity: chromeVisibility.value,
    transform: [{ translateY: (1 - chromeVisibility.value) * 2 }],
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX:
        indicatorIndex.value * itemWidth
        + Math.max(0, (itemWidth - TAB_INDICATOR_WIDTH) / 2),
    }],
  }));

  const onPressInIndex = useCallback((index: number) => {
    const optimisticIndex = optimisticIndexRef.current;
    const committedIndex = persistentTabBarController.getCommittedIndex();
    const alreadyLatestTarget = optimisticIndex === index
      && (latestRequestedIndexRef.current === index
        || (latestRequestedIndexRef.current == null && committedIndex === index));
    if (alreadyLatestTarget) return;

    beginUiCriticalWindow(Math.max(TAB_UI_CRITICAL_WINDOW_MS, TAB_MOTION_MAX_MS + 64));
    latestRequestedIndexRef.current = index;
    visualTargetIndex.value = index;
    pendingCommitDelayRef.current = animateIndicatorTo(index);
  }, [animateIndicatorTo, visualTargetIndex]);

  const onPressIndex = useCallback((index: number) => {
    const generation = ++commitGenerationRef.current;
    if (pendingCommitTimerRef.current) {
      clearTimeout(pendingCommitTimerRef.current);
      pendingCommitTimerRef.current = null;
    }

    const committedIndex = persistentTabBarController.getCommittedIndex();
    const isNewVisualTarget = latestRequestedIndexRef.current === index && committedIndex !== index;
    const commitDelayMs = isNewVisualTarget ? pendingCommitDelayRef.current + 8 : 0;

    // Hard visual handoff: for a different tab, do not let the native scene
    // commit compete with the indicator at all. The pill/icon response completes
    // first on its own hardware-composited layer; only then do we swap the scene.
    tabRuntime.beginInteraction(Math.max(
      TAB_UI_CRITICAL_WINDOW_MS,
      commitDelayMs + TAB_LIFECYCLE_SETTLE_MS + TAB_RESTORE_DELAY_MS,
    ));

    pendingCommitTimerRef.current = setTimeout(() => {
      pendingCommitTimerRef.current = null;
      if (!mountedRef.current || commitGenerationRef.current !== generation) return;

      const result = persistentTabBarController.press(index);
      if (!result.prevented) {
        if (!result.navigated) {
          latestRequestedIndexRef.current = null;
          visualTargetIndex.value = result.committedIndex;
        }
        return;
      }

      latestRequestedIndexRef.current = null;
      visualTargetIndex.value = result.committedIndex;
      animateIndicatorTo(result.committedIndex, 110);
    }, commitDelayMs);
  }, [animateIndicatorTo, tabRuntime, visualTargetIndex]);

  const onLongPressIndex = useCallback((index: number) => {
    persistentTabBarController.longPress(index);
  }, []);

  const handleTabBarLayout = useCallback(() => {
    if (chromeReadyReportedRef.current) return;
    chromeReadyFrameOneRef.current = requestAnimationFrame(() => {
      chromeReadyFrameOneRef.current = null;
      chromeReadyFrameTwoRef.current = requestAnimationFrame(() => {
        chromeReadyFrameTwoRef.current = null;
        if (!mountedRef.current || chromeReadyReportedRef.current) return;
        chromeReadyReportedRef.current = true;
        reportChromeReady(true);
      });
    });
  }, [reportChromeReady]);

  return (
    <Animated.View
      renderToHardwareTextureAndroid
      onLayout={handleTabBarLayout}
      style={[
        styles.tabBar,
        { height: TAB_VISUAL_HEIGHT + bottomInset },
        hostVisibilityStyle,
      ]}
    >
      <View style={styles.visualTrack}>
        <Animated.View pointerEvents="none" style={[styles.slidingIndicator, indicatorStyle]} />
        {MAIN_TAB_ROUTES.map((routeName, index) => (
          <BloomTabButton
            key={routeName}
            routeName={routeName}
            index={index}
            itemWidth={itemWidth}
            label={MAIN_TAB_LABELS[index]}
            visualTargetIndex={visualTargetIndex}
            onPressInIndex={onPressInIndex}
            onPressIndex={onPressIndex}
            onLongPressIndex={onLongPressIndex}
          />
        ))}
      </View>
      <View pointerEvents="none" style={{ height: bottomInset }} />
    </Animated.View>
  );
}

/**
 * Zero-view navigator bridge. React Navigation may re-render this on state
 * commits, but it owns no native UI. This preserves prewarm/focus semantics
 * without putting those commits into the visual tabbar subtree.
 */
function TabNavigatorControllerBridge({ state, navigation }: TabBridgeProps) {
  const tabRuntime = useTabRuntimeController();
  const restoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const navigationRef = useRef(navigation);
  const stateRef = useRef(state);

  navigationRef.current = navigation;
  stateRef.current = state;

  useLayoutEffect(() => {
    persistentTabBarController.updateNavigator(state, navigation);
  }, [navigation, state]);

  useEffect(() => {
    if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    const routeName = state.routes[state.index]?.name;
    const tabId = runtimeTabIdForRoute(routeName);
    if (!tabId) return;

    // P2.7: scene commit may be heavy, but it cannot trigger tabbar React work.
    // Defer feature lifecycle wake-up until the UI-thread pill has completed.
    restoreTimerRef.current = setTimeout(() => {
      restoreTimerRef.current = null;
      if (!mountedRef.current) return;
      tabRuntime.restoreFocus(tabId);
    }, TAB_LIFECYCLE_SETTLE_MS);

    return () => {
      if (restoreTimerRef.current) {
        clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = null;
      }
    };
  }, [state.index, state.routes, tabRuntime]);

  // P2.5 behavior retained: only active tab mounts on cold start; hidden tabs
  // prewarm one-by-one later. This bridge is intentionally the only place that
  // holds navigation.preload so the visual tabbar never sees navigator props.
  useEffect(() => {
    const preload = navigationRef.current.preload;
    if (typeof preload !== "function") return;
    const initialState = stateRef.current;
    const inactiveRoutes = initialState.routes.filter((_, index) => index !== initialState.index);
    const cancels = inactiveRoutes.map((route, order) => bloomTaskScheduler.schedule({
      key: `tabs:idle-prewarm:${route.name}`,
      priority: "IDLE",
      canCancel: true,
      delayMs: 650 + order * 320,
      run: () => {
        if (!mountedRef.current) return;
        navigationRef.current.preload?.(route.name);
      },
    }));
    return () => {
      cancels.forEach((cancel) => cancel());
      bloomTaskScheduler.cancelPrefix("tabs:idle-prewarm:");
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (restoreTimerRef.current) clearTimeout(restoreTimerRef.current);
    };
  }, []);

  return null;
}

function TabNavigatorFocusBridge() {
  const tabRuntime = useTabRuntimeController();
  useFocusEffect(useCallback(() => {
    tabRuntime.setNavigatorFocused(true);
    return () => tabRuntime.setNavigatorFocused(false);
  }, [tabRuntime]));
  return null;
}

function TabWorkspace() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);
  const reservedTabBarHeight = TAB_VISUAL_HEIGHT + bottomInset;

  return (
    <View style={styles.workspaceRoot}>
      <TabNavigatorFocusBridge />
      <View style={styles.navigatorRoot}>
        <Tabs
          detachInactiveScreens={false}
          tabBar={(props) => (
            <TabNavigatorControllerBridge
              state={(props as unknown as TabBridgeProps).state}
              navigation={(props as unknown as TabBridgeProps).navigation}
            />
          )}
          screenOptions={{
            lazy: true,
            freezeOnBlur: true,
            headerShown: false,
            animation: BLOOM_MOTION.tabs.animation,
            sceneStyle: [styles.tabScene, { paddingBottom: reservedTabBarHeight }],
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Trang nhà" }} />
          <Tabs.Screen name="moments" options={{ title: "Kỷ niệm" }} />
          <Tabs.Screen name="planner" options={{ title: "Lịch" }} />
          <Tabs.Screen name="family" options={{ title: "Cây nhà" }} />
          <Tabs.Screen name="play" options={{ title: "Nhà Mình" }} />
        </Tabs>
      </View>
      <PersistentBloomTabBarHost />
    </View>
  );
}

export default function TabLayout() {
  return (
    <TabRuntimeProvider>
      <TabWorkspace />
    </TabRuntimeProvider>
  );
}

const styles = StyleSheet.create({
  workspaceRoot: { flex: 1, backgroundColor: COLORS.background },
  navigatorRoot: { flex: 1, backgroundColor: COLORS.background },
  tabScene: { flex: 1, backgroundColor: COLORS.background },
  tabBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.tabSurface,
    shadowOpacity: 0,
    elevation: 12,
    overflow: "hidden",
  },
  visualTrack: {
    position: "relative",
    height: TAB_VISUAL_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  slidingIndicator: {
    position: "absolute",
    top: 11,
    left: 0,
    width: TAB_INDICATOR_WIDTH,
    height: TAB_INDICATOR_HEIGHT,
    borderRadius: TAB_INDICATOR_HEIGHT / 2,
    backgroundColor: "#ECA0B9",
  },
  tabItem: {
    position: "relative",
    height: TAB_VISUAL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconSlot: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconGlyph: {
    width: TAB_ICON_SIZE,
    height: TAB_ICON_SIZE,
    lineHeight: TAB_ICON_SIZE,
    padding: 0,
    margin: 0,
    textAlign: "center",
    textAlignVertical: "center",
    includeFontPadding: false,
  },
});
