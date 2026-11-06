import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { StyleSheet, View } from 'react-native';
import { BloomText as Text } from './BloomText';
import { COLORS } from "../../constants/theme";
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type BloomNoteCalloutProps = {
  title: string;
  children: ReactNode;
  icon?: ComponentProps<typeof Ionicons>["name"];
  tone?: "pink" | "violet" | "green" | "amber";
};

const getTones = () => ({
  pink: { bg: COLORS.surface, border: COLORS.border, iconBg: COLORS.iconBackground, icon: COLORS.primary },
  violet: { bg: COLORS.surface, border: COLORS.border, iconBg: COLORS.iconBackground, icon: COLORS.primary },
  green: { bg: COLORS.surface, border: COLORS.border, iconBg: COLORS.iconBackground, icon: COLORS.positive },
  amber: { bg: COLORS.surface, border: COLORS.border, iconBg: COLORS.iconBackground, icon: COLORS.attention },
});

export function BloomNoteCallout({ title, children, icon = "sparkles-outline", tone = "pink" }: BloomNoteCalloutProps) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const palette = getTones()[tone];
  return (
    <View style={[__a3_styles.root, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
      <View style={[__a3_styles.icon, { backgroundColor: palette.iconBg }]}>
        <Ionicons name={icon} size={18} color={palette.icon} />
      </View>
      <View style={__a3_styles.copy}>
        <Text style={__a3_styles.title}>{title}</Text>
        <Text style={__a3_styles.body}>{children}</Text>
      </View>
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  root: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 18, borderWidth: 1, padding: 12 },
  icon: { width: 36, height: 36, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1 },
  title: { color: COLORS.primaryText, fontSize: 12.5, lineHeight: 17, fontWeight: "900" },
  body: { marginTop: 3, color: COLORS.secondaryText, fontSize: 11.3, lineHeight: 16.5, fontWeight: "600" },
}));
