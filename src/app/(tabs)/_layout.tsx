import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLOOM_MOTION } from "../../constants/motion";
import { COLORS } from "../../constants/theme";
import { TabRuntimeProvider } from "../../context/TabRuntimeContext";
import { useChessSurfaceState } from "../../services/chess/chessSurfaceStore";

type TabIconName = keyof typeof Ionicons.glyphMap;
type TabRoute = { key: string; name: string };
type BloomTabBarProps = {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options: Record<string, unknown> }>;
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault?: boolean }) => { defaultPrevented?: boolean };
    navigate: (name: string) => void;
  };
};

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

const fallbackTitle: Record<string, string> = {
  index: "Trang nhà",
  moments: "Kỷ niệm",
  planner: "Lịch",
  family: "Cây nhà",
  play: "Nhà Mình",
};

const TAB_INDICATOR_WIDTH = 50;
const TAB_INDICATOR_HEIGHT = 36;
const TAB_ICON_SIZE = 26;
const TAB_MOTION_MS = 232;

type BloomTabButtonProps = {
  route: TabRoute;
  index: number;
  itemWidth: number;
  label: string;
  focused: boolean;
  onPressIn: () => void;
  onPress: () => void;
  onLongPress: () => void;
};

function BloomTabButton({
  route,
  index,
  itemWidth,
  label,
  focused,
  onPressIn,
  onPress,
  onLongPress,
}: BloomTabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPressIn={onPressIn}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.tabItem, { width: itemWidth }]}
    >
      <View pointerEvents="none" style={styles.tabIconStack}>
        <Ionicons
          name={iconFor(route.name)}
          size={TAB_ICON_SIZE}
          color={focused ? COLORS.white : COLORS.tabInactive}
          style={styles.tabIconGlyph}
        />
      </View>
    </Pressable>
  );
}

function BloomSlidingTabBar({ state, descriptors, navigation }: BloomTabBarProps) {
  const insets = useSafeAreaInsets();
  const chessSurface = useChessSurfaceState();
  const { width } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabCount = Math.max(1, state.routes.length);
  const itemWidth = width / tabCount;
  const indicatorIndex = useSharedValue(state.index);
  const optimisticIndexRef = useRef(state.index);

  const animateIndicatorTo = useCallback((index: number, duration = TAB_MOTION_MS) => {
    optimisticIndexRef.current = index;
    indicatorIndex.value = withTiming(index, {
      duration,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    });
  }, [indicatorIndex]);

  useEffect(() => {
    // Press-in already starts the UI-thread motion. React Navigation only
    // reconciles the final selected route and must not restart the animation.
    if (optimisticIndexRef.current === state.index) return;
    animateIndicatorTo(state.index);
  }, [animateIndicatorTo, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{
      translateX:
        indicatorIndex.value * itemWidth +
        Math.max(0, (itemWidth - TAB_INDICATOR_WIDTH) / 2),
    }],
  }));

  return (
    <View pointerEvents={chessSurface.mode === "full" ? "none" : "auto"} style={[styles.tabBar, { height: 58 + bottomInset, opacity: chessSurface.mode === "full" ? 0 : 1 }]}>
      <View style={styles.visualTrack}>
        <Animated.View pointerEvents="none" style={[styles.slidingIndicatorGlow, indicatorStyle]} />
        <Animated.View pointerEvents="none" style={[styles.slidingIndicator, indicatorStyle]} />
        {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options ?? {};
        const rawLabel = options.tabBarLabel ?? options.title;
        const label = typeof rawLabel === "string" ? rawLabel : (fallbackTitle[route.name] ?? route.name);

        const onPressIn = () => {
          if (!focused) animateIndicatorTo(index);
        };
        const onPress = () => {
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (event.defaultPrevented) {
            animateIndicatorTo(state.index, 135);
            return;
          }
          if (!focused) navigation.navigate(route.name);
        };
        const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <BloomTabButton
            key={route.key}
            route={route}
            index={index}
            itemWidth={itemWidth}
            label={label}
            focused={focused}
            onPressIn={onPressIn}
            onPress={onPress}
            onLongPress={onLongPress}
          />
          );
        })}
      </View>
      <View pointerEvents="none" style={{ height: bottomInset }} />
    </View>
  );
}

export default function TabLayout() {

  return (
    <TabRuntimeProvider>
      <View style={styles.navigatorRoot}>
      <Tabs
      tabBar={(props) => <BloomSlidingTabBar {...(props as unknown as BloomTabBarProps)} />}
      screenOptions={{
        // Keep screen content switching instant. Only the single tab indicator
        // moves on the UI thread so navigation feels continuous without adding
        // a second expensive screen transition.
        // Phase 17.1: keep all five tab surfaces warm like the proven pre-Phase-17 navigator.
        // TabRuntime now suspends work (listeners/timers) without freezing/detaching the screen tree.
        lazy: false,
        headerShown: false,
        animation: BLOOM_MOTION.tabs.animation,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Trang nhà" }} />
      <Tabs.Screen name="moments" options={{ title: "Kỷ niệm" }} />
      <Tabs.Screen name="planner" options={{ title: "Lịch" }} />
      <Tabs.Screen name="family" options={{ title: "Cây nhà" }} />
      <Tabs.Screen name="play" options={{ title: "Nhà Mình" }} />
      </Tabs>
      </View>
    </TabRuntimeProvider>
  );
}

const styles = StyleSheet.create({
  navigatorRoot: { flex: 1 },
  tabBar: {
    position: "relative",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.tabSurface,
    shadowOpacity: 0,
    elevation: 0,
    overflow: "visible",
  },
  visualTrack: {
    position: "relative",
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    overflow: "visible",
  },
  slidingIndicator: {
    position: "absolute",
    top: 11,
    left: 0,
    width: TAB_INDICATOR_WIDTH,
    height: TAB_INDICATOR_HEIGHT,
    borderRadius: 999,
    backgroundColor: "#ECA0B9",
  },
  slidingIndicatorGlow: {
    position: "absolute",
    top: 7,
    left: -4,
    width: TAB_INDICATOR_WIDTH + 8,
    height: TAB_INDICATOR_HEIGHT + 8,
    borderRadius: 999,
    backgroundColor: "rgba(236,160,185,0.38)",
  },
  tabItem: {
    position: "relative",
    height: 58,
    overflow: "visible",
  },
  tabIconStack: {
    position: "absolute",
    top: (58 - TAB_ICON_SIZE) / 2,
    left: "50%",
    marginLeft: -TAB_ICON_SIZE / 2,
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
