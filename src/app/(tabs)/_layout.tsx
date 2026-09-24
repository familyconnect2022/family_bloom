import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StyleSheet, TouchableOpacity, View } from "react-native";
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
        // Mount the five bounded tab screens behind the startup overlay.
        lazy: false,
        tabBarActiveTintColor: "#B94E75",
        tabBarInactiveTintColor: "#A87588",
        headerShown: false,
        animation: BLOOM_MOTION.tabs.animation,
        tabBarHideOnKeyboard: true,
        tabBarButton: (props) => <TouchableOpacity {...props} activeOpacity={0.72} />,
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
          backgroundColor: "#FFFBFD",
          shadowOpacity: 0,
          elevation: 0,
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

const styles = StyleSheet.create({
  iconPill: { width: 48, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  iconPillSelected: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: "#F5CAD9" },
});
