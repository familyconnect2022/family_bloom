import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { COLORS } from "../../constants/theme";
import type { UserFamilyMembership } from "../../types";
import { MAX_ADDITIONAL_MOMENT_FAMILIES } from "../../utils/momentPublishPolicy";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export const MomentFamilyMultiPicker = memo(function MomentFamilyMultiPicker({
  memberships,
  currentFamilyId,
  selectedIds,
  onChange,
}: {
  memberships: UserFamilyMembership[];
  currentFamilyId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const choices = useMemo(
    () => memberships
      .filter((item) => item.familyId !== currentFamilyId)
      .sort((a, b) => a.familyName.localeCompare(b.familyName, "vi")),
    [currentFamilyId, memberships],
  );

  if (!choices.length) return null;

  const selectedSet = new Set(selectedIds);
  const toggle = (familyId: string) => {
    if (selectedSet.has(familyId)) {
      onChange(selectedIds.filter((id) => id !== familyId));
      return;
    }
    if (selectedIds.length >= MAX_ADDITIONAL_MOMENT_FAMILIES) return;
    onChange([...selectedIds, familyId]);
  };

  return (
    <View style={__a3_styles.wrap}>
      <View style={__a3_styles.headerRow}>
        <View style={__a3_styles.headerCopy}>
          <Text style={__a3_styles.label}>Chia sẻ thêm tới nhà khác</Text>
          <Text style={__a3_styles.hint}>Mặc định tắt · chỉ chia sẻ khi bạn chủ động chọn thêm nhà.</Text>
        </View>
        <View style={[__a3_styles.countPill, selectedIds.length > 0 && __a3_styles.countPillActive]}>
          <Text style={[__a3_styles.countText, selectedIds.length > 0 && __a3_styles.countTextActive]}>{selectedIds.length}</Text>
        </View>
      </View>

      <View style={__a3_styles.options}>
        {choices.map((item) => {
          const selected = selectedSet.has(item.familyId);
          const disabled = !selected && selectedIds.length >= MAX_ADDITIONAL_MOMENT_FAMILIES;
          return (
            <Pressable
              key={item.familyId}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => toggle(item.familyId)}
              style={({ pressed }) => [
                __a3_styles.option,
                selected && __a3_styles.optionSelected,
                disabled && __a3_styles.optionDisabled,
                pressed && !disabled && __a3_styles.pressed,
              ]}
            >
              <View style={[__a3_styles.check, selected && __a3_styles.checkSelected]}>
                {selected && <Ionicons name="checkmark" size={15} color={__a3Colors.white} />}
              </View>
              <View style={__a3_styles.optionCopy}>
                <Text style={__a3_styles.familyName} numberOfLines={1}>{item.familyName}</Text>
                <Text style={__a3_styles.familyRole}>{item.role === "admin" || item.role === "owner" ? "Bạn đang giữ nhà này" : "Bạn là thành viên"}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={__a3_styles.footnote}>
        Person đang gắn chỉ thuộc nhà hiện tại nên không tự sao chép sang nhà khác. Ảnh/video được quản lý độc lập để xóa một bài không ảnh hưởng bài ở nhà kia.
      </Text>
    </View>
  );
});

const styles = createBloomStyles(() => StyleSheet.create({
  wrap: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    padding: 13,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerCopy: { flex: 1, minWidth: 0 },
  label: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  hint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  countPill: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  countPillActive: { backgroundColor: COLORS.primary },
  countText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "900" },
  countTextActive: { color: COLORS.white },
  options: { marginTop: 11, gap: 9 },
  option: { minHeight: 52, borderRadius: 16, backgroundColor: COLORS.softSurface, paddingHorizontal: 11, paddingVertical: 9, flexDirection: "row", alignItems: "center", gap: 10 },
  optionSelected: { backgroundColor: COLORS.accentBg, borderWidth: 1, borderColor: COLORS.border },
  optionDisabled: { opacity: 0.45 },
  check: { width: 24, height: 24, borderRadius: 9, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  checkSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  optionCopy: { flex: 1, minWidth: 0 },
  familyName: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  familyRole: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "600" },
  footnote: { marginTop: 10, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 14 },
  pressed: { opacity: 0.75 },
}));
