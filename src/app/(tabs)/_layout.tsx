import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BLOOM_MOTION } from "../../constants/motion";
import { COLORS } from "../../constants/theme";

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
      return focused ? "happy" : "happy-outline";
    default:
      return "ellipse-outline";
  }
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.secondaryText,
        headerShown: false,
        animation: BLOOM_MOTION.tabs.animation,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={iconFor(route.name, focused)} size={Math.min(size, 23)} color={color} />
        ),
        tabBarLabelStyle: {
          fontSize: 10.5,
          fontWeight: "700",
          marginTop: 1,
        },
        tabBarItemStyle: {
          paddingTop: 7,
        },
        tabBarStyle: {
          height: 59 + bottomInset,
          paddingBottom: bottomInset,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          backgroundColor: COLORS.white,
          shadowColor: "#7E5260",
          shadowOffset: { width: 0, height: -5 },
          shadowOpacity: 0.045,
          shadowRadius: 12,
          elevation: 8,
        },
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Trang nhà" }} />
      <Tabs.Screen name="moments" options={{ title: "Kỷ niệm" }} />
      <Tabs.Screen name="planner" options={{ title: "Lịch" }} />
      <Tabs.Screen name="family" options={{ title: "Cây nhà" }} />
      <Tabs.Screen name="play" options={{ title: "Góc chơi" }} />
    </Tabs>
  );
}
