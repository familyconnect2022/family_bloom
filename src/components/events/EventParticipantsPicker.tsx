import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import type { EventParticipantsMode, FamilyMember } from "../../types";

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
  const toggle = (uid: string) => {
    onSelectedIdsChange(selectedIds.includes(uid) ? selectedIds.filter((id) => id !== uid) : [...selectedIds, uid]);
  };

  return (
    <View style={styles.block}>
      <Text style={styles.label}>Người tham gia</Text>
      <View style={styles.modeRow}>
        <Pressable onPress={() => onModeChange("all")} style={[styles.modeChip, mode === "all" && styles.modeChipActive]}>
          <Ionicons name="home-outline" size={16} color={mode === "all" ? COLORS.white : COLORS.primaryText} />
          <Text style={[styles.modeText, mode === "all" && styles.modeTextActive]}>Cả gia đình</Text>
        </Pressable>
        <Pressable onPress={() => onModeChange("selected")} style={[styles.modeChip, mode === "selected" && styles.modeChipActive]}>
          <Ionicons name="people-outline" size={16} color={mode === "selected" ? COLORS.white : COLORS.primaryText} />
          <Text style={[styles.modeText, mode === "selected" && styles.modeTextActive]}>Chọn người</Text>
        </Pressable>
      </View>

      {mode === "selected" && (
        <View style={styles.membersWrap}>
          {members.map((member) => {
            const active = selectedIds.includes(member.uid);
            return (
              <Pressable key={member.uid} onPress={() => toggle(member.uid)} style={[styles.memberChip, active && styles.memberChipActive]}>
                <View style={styles.avatar}>
                  {member.avatarUrl ? (
                    <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={styles.initial}>{member.displayName.slice(0, 1).toUpperCase()}</Text>
                  )}
                </View>
                <Text style={[styles.memberText, active && styles.memberTextActive]} numberOfLines={1}>
                  {member.shortName || member.displayName}
                </Text>
                {active && <Ionicons name="checkmark-circle" size={17} color={COLORS.primary} />}
              </Pressable>
            );
          })}
          {!members.length && <Text style={styles.empty}>Chưa tải được danh sách thành viên.</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  label: { color: COLORS.primaryText, fontSize: 14, fontWeight: "800" },
  modeRow: { flexDirection: "row", gap: 9 },
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
    backgroundColor: COLORS.white,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  memberChipActive: { borderColor: "#F2BED0", backgroundColor: "#FFF7FA" },
  avatar: { width: 32, height: 32, borderRadius: 12, overflow: "hidden", backgroundColor: COLORS.accentBg, alignItems: "center", justifyContent: "center" },
  initial: { color: COLORS.primaryText, fontSize: 11, fontWeight: "900" },
  memberText: { flex: 1, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "700" },
  memberTextActive: { fontWeight: "900" },
  empty: { color: COLORS.secondaryText, fontSize: 12 },
});
