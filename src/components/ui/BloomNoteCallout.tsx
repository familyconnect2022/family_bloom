import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";

type BloomNoteCalloutProps = {
  title: string;
  children: ReactNode;
  icon?: ComponentProps<typeof Ionicons>["name"];
  tone?: "pink" | "violet" | "green" | "amber";
};

const TONES = {
  pink: { bg: "#FFF0F5", border: "#F6C8D9", iconBg: "#FFE0EB", icon: COLORS.primary },
  violet: { bg: "#F7F2FF", border: "#DED1F1", iconBg: "#EEE5FA", icon: "#8F70B6" },
  green: { bg: "#F1FAF5", border: "#CDE8D7", iconBg: "#E0F2E7", icon: "#5A8D71" },
  amber: { bg: "#FFF8ED", border: "#F1DDC1", iconBg: "#F8E9D3", icon: "#A97947" },
} as const;

export function BloomNoteCallout({ title, children, icon = "sparkles-outline", tone = "pink" }: BloomNoteCalloutProps) {
  const palette = TONES[tone];
  return (
    <View style={[styles.root, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
      <View style={[styles.icon, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={icon} size={18} color={palette.icon} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 18, borderWidth: 1, padding: 12 },
  icon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 17, fontWeight: "900" },
  body: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11.3, lineHeight: 16.5, fontWeight: "600" },
});
