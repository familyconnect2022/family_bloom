import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BLOOM_MOTION } from "../../constants/motion";
import { COLORS } from "../../constants/theme";
import { PERFORMANCE_TEST_BUILD } from "../../constants/performanceTest";
import { performanceTestService } from "../../services/performance/performanceTestService";

type TabIconName = keyof typeof Ionicons.glyphMap;

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

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  useEffect(() => {
    if (!PERFORMANCE_TEST_BUILD) return;
    return performanceTestService.trackMount("tabs.navigator");
  }, []);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        // Mount the five bounded tab screens behind the startup overlay.
        lazy: false,
        tabBarActiveTintColor: COLORS.tabActive,
        tabBarInactiveTintColor: COLORS.tabInactive,
        headerShown: false,
        animation: BLOOM_MOTION.tabs.animation,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <TouchableOpacity {...props} activeOpacity={0.72} onPress={(event) => { if (PERFORMANCE_TEST_BUILD) performanceTestService.start("tab_switch", route.name); props.onPress?.(event); }} />,
        tabBarIcon: ({ color, focused, size }) => (
          <View style={[styles.iconPill, focused && styles.iconPillSelected]}>
            <Ionicons name={iconFor(route.name, focused)} size={Math.min(size, 22)} color={color} />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "700",
          marginTop: 4,
        },
        tabBarItemStyle: {
          paddingTop: 8,
        },
        tabBarStyle: {
          height: 65 + bottomInset,
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.tabSurface,
          shadowOpacity: 0,
          elevation: 0,
        },
      })}
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
  iconPill: { width: 48, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconPillSelected: { backgroundColor: COLORS.surfaceFocus, borderWidth: 1, borderColor: COLORS.focusBorder },
});
