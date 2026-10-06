import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BLOOM_MOTION } from "../../constants/motion";
import { PERFORMANCE_TEST_BUILD } from "../../constants/performanceTest";
import { COLORS } from "../../constants/theme";
import { performanceTestService } from "../../services/performance/performanceTestService";

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

const iconFor = (route: string, focused: boolean): TabIconName => {
  switch (route) {
    case "index":
      return focused ? "home" : "home-outline";
    case "moments":
      return focused ? "images" : "images-outline";
    case "planner":
      return focused ? "calendar" : "calendar-outline";
    case "family":
      return focused ? "people" : "people-outline";
    case "play":
      return focused ? "heart-circle" : "heart-circle-outline";
    default:
      return "ellipse-outline";
  }
};

const fallbackTitle: Record<string, string> = {
  index: "Trang nhà",
  moments: "Kỷ niệm",
  planner: "Lịch",
  family: "Cây nhà",
  play: "Nhà Mình",
};

function BloomSlidingTabBar({ state, descriptors, navigation }: BloomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomInset = Math.max(insets.bottom, 8);
  const tabCount = Math.max(1, state.routes.length);
  const itemWidth = width / tabCount;
  const indicatorX = useSharedValue(state.index * itemWidth + 6);
  const indicatorWidth = useSharedValue(Math.max(48, itemWidth - 12));

  useEffect(() => {
    indicatorWidth.value = Math.max(48, itemWidth - 12);
    indicatorX.value = withTiming(state.index * itemWidth + 6, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
    });
  }, [indicatorWidth, indicatorX, itemWidth, state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: indicatorWidth.value,
    transform: [{ translateX: indicatorX.value }],
  }));

  return (
    <View style={[styles.tabBar, { height: 65 + bottomInset, paddingBottom: bottomInset }]}>
      <Animated.View pointerEvents="none" style={[styles.slidingIndicator, indicatorStyle]} />
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key]?.options ?? {};
        const rawLabel = options.tabBarLabel ?? options.title;
        const label = typeof rawLabel === "string" ? rawLabel : (fallbackTitle[route.name] ?? route.name);
        const color = focused ? COLORS.tabActive : COLORS.tabInactive;

        const onPress = () => {
          if (PERFORMANCE_TEST_BUILD) performanceTestService.start("tab_switch", route.name);
          const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={onPress}
            onLongPress={onLongPress}
            style={[styles.tabItem, { width: itemWidth }]}
          >
            <Ionicons name={iconFor(route.name, focused)} size={22} color={color} />
            <Text numberOfLines={1} style={[styles.tabLabel, { color }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  useEffect(() => {
    if (!PERFORMANCE_TEST_BUILD) return;
    return performanceTestService.trackMount("tabs.navigator");
  }, []);

  return (
    <Tabs
      tabBar={(props) => <BloomSlidingTabBar {...(props as unknown as BloomTabBarProps)} />}
      screenOptions={{
        // Keep screen content switching instant. Only the single tab indicator
        // moves on the UI thread so navigation feels continuous without adding
        // a second expensive screen transition.
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
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.tabSurface,
    shadowOpacity: 0,
    elevation: 0,
    overflow: "hidden",
  },
  slidingIndicator: {
    position: "absolute",
    top: 6,
    left: 0,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.surfaceFocus,
    borderWidth: 1,
    borderColor: COLORS.focusBorder,
  },
  tabItem: {
    height: 58,
    paddingTop: 10,
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  tabLabel: {
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: "700",
  },
});
