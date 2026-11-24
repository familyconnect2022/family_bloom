import { useBloomThemeRevision, useBloomColorsRevision, useBloomMotionRevision , useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import React, { memo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLOOM_MOTION } from "../../constants/motion";
import { useBloomMotionSetting } from "../../motion/BloomMotion";
import { COLORS, getBloomMotionLevel } from "../../constants/theme";
import { getBloomResolvedMode, getBloomSelection } from "../../theme/runtime";
import { getBloomDockColors } from "../../theme/palette";
import {
  TAB_RESTORE_DELAY_MS,
  TabRuntimeProvider,
  useTabRuntimeController,
  type MainTabId,
} from "../../context/TabRuntimeContext";
import { bloomTaskScheduler } from "../../services/performance/bloomTaskScheduler";
import { beginUiCriticalWindow, TAB_UI_CRITICAL_WINDOW_MS } from "../../services/performance/uiFrameBudget";
import { useTabStartup } from "../../context/TabStartupContext";
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';
import { useA3Theme } from '../../appearance3/useAppearance3';



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

// The Storybook dock is a floating, independently mounted UI-thread interaction.
// Unlike the former sliding pill, scene navigation is NEVER blocked on an animation.
const TAB_VISUAL_HEIGHT = 68;
const TAB_TOUCH_HEIGHT = 82;
const TAB_OUTER_MARGIN = 8;
const TAB_FLOAT_GAP = 4.5;
const TAB_BUBBLE_SIZE = 54;
const TAB_ICON_SIZE = 23;
const TAB_LIFECYCLE_SETTLE_MS = 155;
const TAB_SPRING = { damping: 17, stiffness: 215, mass: 0.72 } as const;
function clampIndex(x: number, width: number): number {
  'worklet';
  return Math.max(0, Math.min(4, Math.round(x / (width / 5) - 0.5)));
}
function bubbleAt(index: number, itemWidth: number): number {
  'worklet';
  return (index + 0.5) * itemWidth - TAB_BUBBLE_SIZE / 2;
}

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

/** Inactive icons and labels subscribe only to the small shared preview index. */
const BloomDockSlot = memo(function BloomDockSlot({ routeName, index, label, itemWidth, previewIndex }: {
  routeName: string; index: number; label: string; itemWidth: number;
  previewIndex: SharedValue<number>;
}) {
  const __a3Theme = useA3Theme();

  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const dockColors = getBloomDockColors(__a3Theme.selection.palette, __a3Theme.resolvedMode);
  const inactiveColor = dockColors.inactiveIcon;
  const activeColor = dockColors.activeIcon;
  const iconStyle = useAnimatedStyle(() => ({
    opacity: previewIndex.value === index ? 0.02 : 1,
    color: previewIndex.value === index ? activeColor : inactiveColor,
  }), [activeColor, inactiveColor]);
  const labelStyle = useAnimatedStyle(() => ({
    color: previewIndex.value === index ? activeColor : inactiveColor,
    opacity: previewIndex.value === index ? 1 : 0.85,
  }), [activeColor, inactiveColor]);
  return (
    <View pointerEvents="none" style={[__a3_styles.tabItem, { width: itemWidth }]}>
      <AnimatedIonicons name={iconFor(routeName)} size={TAB_ICON_SIZE} style={[__a3_styles.tabIconGlyph, iconStyle]} />
      <Animated.Text numberOfLines={1} style={[__a3_styles.tabLabel, labelStyle]}>{label}</Animated.Text>
    </View>
  );
});

/**
 * Floating iOS-inspired drag-to-snap tab dock.
 * - Pan recognizer activates after a hold: bubble follows the finger on UI thread.
 * - Release selects nearest of five anchors and commits exactly one navigation.
 * - A normal tap commits immediately while the bubble springs independently.
 * - This component never consumes navigation descriptors / data or writes theme state.
 */
function PersistentBloomTabBarHost() {
  const __a3Theme = useA3Theme();

  const __a3_styles = useA3LegacyStyles(styles);

  
  
  useBloomMotionRevision();
  const insets = useSafeAreaInsets();
  const dockColors = getBloomDockColors(__a3Theme.selection.palette, __a3Theme.resolvedMode);
  const { reportChromeReady } = useTabStartup();
  const tabRuntime = useTabRuntimeController();
  const { width } = useWindowDimensions();
  const dockWidth = Math.max(1, width - TAB_OUTER_MARGIN * 2);
  const itemWidth = dockWidth / MAIN_TAB_ROUTES.length;
  const initialIndex = persistentTabBarController.getCommittedIndex();
  const previewIndex = useSharedValue(initialIndex);
  const bubbleX = useSharedValue(bubbleAt(initialIndex, itemWidth));
  const dragging = useSharedValue(false);
  const bounce = useSharedValue(1);
  const stillMotion = getBloomMotionLevel() === "still";
  const committedIndexRef = useRef(initialIndex);
  const requestedIndexRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  const chromeReadyReportedRef = useRef(false);
  const frameOneRef = useRef<number | null>(null);
  const frameTwoRef = useRef<number | null>(null);

  const chooseTab = useCallback((index: number) => {
    if (!mountedRef.current) return;
    const safeIndex = Math.max(0, Math.min(4, index));
    beginUiCriticalWindow(TAB_UI_CRITICAL_WINDOW_MS);
    void Haptics.selectionAsync().catch(() => undefined);
    tabRuntime.beginInteraction(Math.max(TAB_UI_CRITICAL_WINDOW_MS, TAB_LIFECYCLE_SETTLE_MS + TAB_RESTORE_DELAY_MS));
    requestedIndexRef.current = safeIndex;
    // Navigation commits right away: no timing / timeout before scene change.
    const outcome = persistentTabBarController.press(safeIndex);
    if (outcome.prevented || !outcome.navigated) {
      requestedIndexRef.current = null;
      const resolvedIndex = outcome.committedIndex;
      previewIndex.value = resolvedIndex;
      bubbleX.value = getBloomMotionLevel() === "still"
        ? bubbleAt(resolvedIndex, itemWidth)
        : withSpring(bubbleAt(resolvedIndex, itemWidth), TAB_SPRING);
    }
  }, [tabRuntime, previewIndex, bubbleX, itemWidth]);

  const notifyHold = useCallback((index: number) => persistentTabBarController.longPress(index), []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (frameOneRef.current !== null) cancelAnimationFrame(frameOneRef.current);
      if (frameTwoRef.current !== null) cancelAnimationFrame(frameTwoRef.current);
    };
  }, []);

  useEffect(() => persistentTabBarController.registerCommitListener(index => {
    if (!mountedRef.current) return;
    committedIndexRef.current = index;
    if (requestedIndexRef.current !== null && requestedIndexRef.current !== index) return;
    requestedIndexRef.current = null;
    if (!dragging.value) {
      previewIndex.value = index;
      bubbleX.value = getBloomMotionLevel() === "still"
        ? bubbleAt(index, itemWidth)
        : withSpring(bubbleAt(index, itemWidth), TAB_SPRING);
    }
  }), [previewIndex, bubbleX, dragging, itemWidth]);

  const gesture = Gesture.Exclusive(
    Gesture.Pan()
      .activateAfterLongPress(190)
      .minDistance(2)
      .onStart(e => {
        dragging.value = true;
        const index = clampIndex(e.x, dockWidth);
        previewIndex.value = index;
        runOnJS(notifyHold)(index);
      })
      .onUpdate(e => {
        const x = Math.max(0, Math.min(dockWidth - TAB_BUBBLE_SIZE, e.x - TAB_BUBBLE_SIZE / 2));
        bubbleX.value = x;
        previewIndex.value = clampIndex(e.x, dockWidth);
      })
      .onEnd(e => {
        const index = clampIndex(e.x, dockWidth);
        dragging.value = false;
        previewIndex.value = index;
        bubbleX.value = stillMotion ? bubbleAt(index, itemWidth)
          : withSpring(bubbleAt(index, itemWidth), { ...TAB_SPRING, velocity: e.velocityX });
        bounce.value = stillMotion ? 1 : 0.9;
        if (!stillMotion) bounce.value = withSpring(1, TAB_SPRING);
        runOnJS(chooseTab)(index);
      })
      .onFinalize((_e, success) => {
        if (!success) {
          dragging.value = false;
          const index = previewIndex.value;
          bubbleX.value = stillMotion ? bubbleAt(index, itemWidth)
            : withSpring(bubbleAt(index, itemWidth), TAB_SPRING);
        }
      }),
    Gesture.Tap().maxDuration(260).onEnd((e, success) => {
      if (!success) return;
      const index = clampIndex(e.x, dockWidth);
      previewIndex.value = index;
      // Tap jumps to its own anchor; icon pops, there is no sliding pill.
      bubbleX.value = bubbleAt(index, itemWidth);
      bounce.value = stillMotion ? 1 : 0.78;
      if (!stillMotion) bounce.value = withSpring(1, TAB_SPRING);
      runOnJS(chooseTab)(index);
    }),
  );

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: bubbleX.value },
      { translateY: dragging.value ? -3 : 0 },
      { scale: dragging.value ? 1.08 : bounce.value },
    ],
  }));
  const handleTabBarLayout = useCallback(() => {
    if (chromeReadyReportedRef.current) return;
    frameOneRef.current = requestAnimationFrame(() => {
      frameOneRef.current = null;
      frameTwoRef.current = requestAnimationFrame(() => {
        frameTwoRef.current = null;
        if (!mountedRef.current || chromeReadyReportedRef.current) return;
        chromeReadyReportedRef.current = true;
        reportChromeReady(true);
      });
    });
  }, [reportChromeReady]);

  return (
    <View
      collapsable={false}
      testID="family-bloom-floating-dock"
      onLayout={handleTabBarLayout}
      style={[__a3_styles.tabBar, { bottom: Math.max(8, insets.bottom) + TAB_FLOAT_GAP }]}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={__a3_styles.dockTouchArea}>
          <View pointerEvents="none" style={[__a3_styles.visualTrack, { backgroundColor: dockColors.surface, borderColor: dockColors.border, shadowColor: dockColors.shadow }]}>
            {MAIN_TAB_ROUTES.map((routeName, index) => (
              <BloomDockSlot key={routeName} routeName={routeName} index={index}
                label={MAIN_TAB_LABELS[index]} itemWidth={itemWidth} previewIndex={previewIndex} />
            ))}
          </View>
          <Animated.View pointerEvents="none" style={[__a3_styles.activeBubble, { backgroundColor: dockColors.selected, borderColor: dockColors.surface, shadowColor: dockColors.shadow }, bubbleStyle]}>
            <BloomSelectedIcon previewIndex={previewIndex} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

function BloomSelectedIcon({ previewIndex }: { previewIndex: SharedValue<number> }) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (
    <View style={__a3_styles.activeBubbleInner}>
      {MAIN_TAB_ROUTES.map((routeName, index) => (
        <BloomSelectedIconItem key={routeName} routeName={routeName} index={index} previewIndex={previewIndex} />
      ))}
    </View>
  );
}
function BloomSelectedIconItem({ routeName, index, previewIndex }: {
  routeName: string; index: number; previewIndex: SharedValue<number>;
}) {
  const __a3Theme = useA3Theme();

  const __a3_styles = useA3LegacyStyles(styles);

  
  
  const bubbleText = getBloomDockColors(__a3Theme.selection.palette, __a3Theme.resolvedMode).bubbleText;
  const iconStyle = useAnimatedStyle(() => ({ opacity: previewIndex.value === index ? 1 : 0 }));
  return <AnimatedIonicons name={iconFor(routeName)} size={27} style={[__a3_styles.activeBubbleGlyph, { color: bubbleText }, iconStyle]} />;
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
  const tabMotion = useBloomMotionSetting();
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  // Trailing content insets belong to tab scrollers; no opaque navigator footer.

  return (
    <View style={__a3_styles.workspaceRoot}>
      <TabNavigatorFocusBridge />
      <View style={__a3_styles.navigatorRoot} collapsable={false}>
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
            animation: tabMotion.enabled ? "fade" : BLOOM_MOTION.tabs.animation,
            sceneStyle: __a3_styles.tabScene,
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
  useBloomThemeRevision();
  return (
    <TabRuntimeProvider>
      <TabWorkspace />
    </TabRuntimeProvider>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  workspaceRoot: { flex: 1, backgroundColor: COLORS.background, overflow: "hidden" },
  navigatorRoot: { flex: 1, backgroundColor: COLORS.background, overflow: "hidden" },
  tabScene: { flex: 1, backgroundColor: "transparent" },
  tabBar: {
    position: "absolute",
    left: TAB_OUTER_MARGIN,
    right: TAB_OUTER_MARGIN,
    height: TAB_TOUCH_HEIGHT,
    zIndex: 100,
    overflow: "visible",
    backgroundColor: "transparent",
    borderWidth: 0,
  },
  dockTouchArea: { height: TAB_TOUCH_HEIGHT, overflow: "visible" },
  visualTrack: {
    position: "absolute", top: 14, left: 0, right: 0,
    height: TAB_VISUAL_HEIGHT, flexDirection: "row", alignItems: "center",
    borderRadius: 34, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.shadow, shadowOpacity: 0.16, shadowRadius: 17,
    shadowOffset: { width: 0, height: 7 }, elevation: 9,
  },
  tabItem: {
    height: TAB_VISUAL_HEIGHT, alignItems: "center", justifyContent: "flex-end",
    paddingBottom: 7, gap: 4,
  },
  tabIconGlyph: { width: 26, height: 26, lineHeight: 26, textAlign: "center", textAlignVertical: "center", includeFontPadding: false },
  tabLabel: { fontSize: 9.3, lineHeight: 12, fontWeight: "700", textAlign: "center", includeFontPadding: false },
  activeBubble: {
    position: "absolute", top: 0, left: 0,
    width: TAB_BUBBLE_SIZE, height: TAB_BUBBLE_SIZE, borderRadius: TAB_BUBBLE_SIZE / 2,
    backgroundColor: COLORS.primary,
    borderWidth: 5, borderColor: COLORS.surface,
    shadowColor: COLORS.shadow, shadowOpacity: 0.28, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 12,
  },
  activeBubbleInner: { flex: 1, alignItems: "center", justifyContent: "center" },
  activeBubbleGlyph: { position: "absolute", top: 8, left: 8, width: 28, height: 28, lineHeight: 28, textAlign: "center", includeFontPadding: false, color: COLORS.onPrimary },
}));
