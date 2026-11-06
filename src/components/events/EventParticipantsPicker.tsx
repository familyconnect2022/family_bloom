import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { COLORS } from "../../constants/theme";
import type { EventParticipantsMode, FamilyMember } from "../../types";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export function EventParticipantsPicker({
  mode,
  selectedIds,
  members,
  onModeChange,
  onSelectedIdsChange,
}: {
  mode: EventParticipantsMode;
  selectedIds: string[];
  members: FamilyMember[];
  onModeChange: (mode: EventParticipantsMode) => void;
  onSelectedIdsChange: (ids: string[]) => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const toggle = (uid: string) => {
    onSelectedIdsChange(selectedIds.includes(uid) ? selectedIds.filter((id) => id !== uid) : [...selectedIds, uid]);
  };

  return (
    <View style={__a3_styles.block}>
      <Text style={__a3_styles.label}>Người tham gia</Text>
      <View style={__a3_styles.modeRow}>
        <Pressable onPress={() => onModeChange("all")} style={[__a3_styles.modeChip, mode === "all" && __a3_styles.modeChipActive]}>
          <Ionicons name="home-outline" size={16} color={mode === "all" ? __a3Colors.white : __a3Colors.primaryText} />
          <Text style={[__a3_styles.modeText, mode === "all" && __a3_styles.modeTextActive]}>Cả gia đình</Text>
        </Pressable>
        <Pressable onPress={() => onModeChange("selected")} style={[__a3_styles.modeChip, mode === "selected" && __a3_styles.modeChipActive]}>
          <Ionicons name="people-outline" size={16} color={mode === "selected" ? __a3Colors.white : __a3Colors.primaryText} />
          <Text style={[__a3_styles.modeText, mode === "selected" && __a3_styles.modeTextActive]}>Chọn người</Text>
        </Pressable>
      </View>

      {mode === "selected" && (
        <View style={__a3_styles.membersWrap}>
          {members.map((member) => {
            const active = selectedIds.includes(member.uid);
            return (
              <Pressable key={member.uid} onPress={() => toggle(member.uid)} style={[__a3_styles.memberChip, active && __a3_styles.memberChipActive]}>
                <View style={__a3_styles.avatar}>
                  {member.avatarUrl ? (
                    <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={__a3_styles.initial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={[__a3_styles.memberText, active && __a3_styles.memberTextActive]} numberOfLines={1}>
                  {member.shortName || member.displayName}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={17} color={__a3Colors.primary} />}
              </Pressable>
            );
          })}
          {!members.length && <Text style={__a3_styles.empty}>Chưa tải được danh sách thành viên.</Text>}
        </View>
      )}
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  block: { gap: 10 },
  label: { color: COLORS.primaryText, fontSize: 14, fontWeight: "800" },
  modeRow: { flexDirection: "row", gap: 12 },
  modeChip: {
    flex: 1,
    minHeight: 46,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.softSurface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  modeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modeText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  modeTextActive: { color: COLORS.white },
  membersWrap: { gap: 8 },
  memberChip: {
    minHeight: 50,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  memberChipActive: { borderColor: COLORS.border, backgroundColor: COLORS.surface },
  avatar: { width: 32, height: 32, borderRadius: 12, overflow: "hidden", backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  initial: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  memberText: { flex: 1, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "700" },
  memberTextActive: { fontWeight: "900" },
  empty: { color: COLORS.secondaryText, fontSize: 12 },
}));
