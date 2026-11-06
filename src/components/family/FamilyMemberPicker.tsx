import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { COLORS } from "../../constants/theme";
import type { FamilyMember } from "../../types";
import { BloomFullScreenFlow, type BloomFullScreenFlowProps } from "../ui/BloomFullScreenFlow";
import { BloomTextInput } from "../ui/BloomInputComponents";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type PickerMode = "single" | "multiple";

type Props = {
  label: string;
  hint: string;
  members: FamilyMember[];
  selectedUids: string[];
  onChange: (uids: string[]) => void;
  mode?: PickerMode;
  currentUid?: string | null;
  lockedUids?: string[];
  excludeUids?: string[];
  variant?: BloomFullScreenFlowProps["variant"];
  emptyText?: string;
};

const memberName = (member: FamilyMember) => member.shortName || member.displayName || "Thành viên";

const initialFor = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1]?.[0] || "?").toLocaleUpperCase("vi");
};

export function FamilyMemberPicker({
  label,
  hint,
  members,
  selectedUids,
  onChange,
  mode = "multiple",
  currentUid,
  lockedUids = [],
  excludeUids = [],
  variant = "family",
  emptyText = "Chưa có thành viên phù hợp trong Nhà Mình.",
}: Props) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const [visible, setVisible] = useState(false);
  const [queryText, setQueryText] = useState("");
  const excluded = useMemo(() => new Set(excludeUids), [excludeUids]);
  const locked = useMemo(() => new Set(lockedUids), [lockedUids]);
  const selected = useMemo(() => new Set(selectedUids), [selectedUids]);

  const available = useMemo(
    () => members.filter(member => !excluded.has(member.uid)),
    [members, excluded],
  );
  const memberByUid = useMemo(() => new Map(available.map(member => [member.uid, member])), [available]);
  const selectedMembers = useMemo(
    () => selectedUids.map(uid => memberByUid.get(uid)).filter((member): member is FamilyMember => !!member),
    [memberByUid, selectedUids],
  );
  const filtered = useMemo(() => {
    const needle = queryText.trim().toLocaleLowerCase("vi");
    const base = needle
      ? available.filter(member => `${member.displayName} ${member.shortName ?? ""}`.toLocaleLowerCase("vi").includes(needle))
      : available;
    return [...base].sort((a, b) => memberName(a).localeCompare(memberName(b), "vi"));
  }, [available, queryText]);

  const choose = (uid: string) => {
    if (locked.has(uid)) return;
    if (mode === "single") {
      onChange([uid]);
      setVisible(false);
      setQueryText("");
      return;
    }
    onChange(selected.has(uid) ? selectedUids.filter(value => value !== uid) : [...selectedUids, uid]);
  };

  const selectedLabel = mode === "single"
    ? (selectedMembers[0] ? memberName(selectedMembers[0]) : "Chưa chọn người nhận")
    : `${selectedMembers.length} người đã chọn`;

  return (
    <>
      <View style={__a3_styles.block}>
        <View style={__a3_styles.labelRow}>
          <View style={__a3_styles.labelCopy}>
            <Text style={__a3_styles.label}>{label}</Text>
            <Text style={__a3_styles.hint}>{hint}</Text>
          </View>
          {mode === "multiple" && (
            <View style={__a3_styles.countBadge}><Text style={__a3_styles.countText}>{selectedMembers.length}</Text></View>
          )}
        </View>

        {!!selectedMembers.length && mode === "multiple" && (
          <View style={__a3_styles.chips}>
            {selectedMembers.slice(0, 4).map(member => (
              <View key={member.uid} style={__a3_styles.chip}>
                <Text style={__a3_styles.chipText} numberOfLines={1}>{memberName(member)}{member.uid === currentUid ? " · Bạn" : ""}</Text>
                {!locked.has(member.uid) && (
                  <Pressable onPress={() => choose(member.uid)} hitSlop={6}>
                    <Ionicons name="close" size={13} color={__a3Colors.primaryText} />
                  </Pressable>
                )}
              </View>
            ))}
            {selectedMembers.length > 4 && <Text style={__a3_styles.more}>+{selectedMembers.length - 4}</Text>}
          </View>
        )}

        <Pressable onPress={() => setVisible(true)} style={({ pressed }) => [__a3_styles.openButton, pressed && __a3_styles.pressed]}>
          <View style={__a3_styles.openIcon}>
            <Ionicons name={mode === "single" ? "person-outline" : "people-outline"} size={20} color={__a3Colors.primary} />
          </View>
          <View style={__a3_styles.openCopy}>
            <Text style={__a3_styles.openTitle}>{selectedLabel}</Text>
            <Text style={__a3_styles.openHint}>
              {available.length ? `${available.length} người thân trong Nhà Mình · chạm để ${selectedMembers.length ? "thay đổi" : "chọn"}` : emptyText}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={__a3Colors.secondaryText} />
        </Pressable>
      </View>

      <BloomFullScreenFlow
        visible={visible}
        eyebrow={mode === "single" ? "CHỌN NGƯỜI NHẬN" : "CHỌN NHÓM THAM GIA"}
        title={mode === "single" ? "Gửi đúng người" : "Ai sẽ cùng quyết định?"}
        subtitle={mode === "single"
          ? "Chỉ những người đang cùng ở trong Nhà Mình mới xuất hiện ở đây, để lời nhắn luôn đến đúng người."
          : `${selectedMembers.length} người đã chọn · Gõ vài chữ để tìm người thân thật nhanh.`}
        variant={variant}
        compactHeader
        onBack={() => { setVisible(false); setQueryText(""); }}
        right={mode === "multiple" ? (
          <Pressable onPress={() => { setVisible(false); setQueryText(""); }} style={__a3_styles.doneButton}>
            <Text style={__a3_styles.doneText}>Xong</Text>
          </Pressable>
        ) : undefined}
      >
        <BloomTextInput
          value={queryText}
          onChangeText={setQueryText}
          placeholder="Tìm người thân theo tên"
          isSearch
          autoCorrect={false}
          autoCapitalize="none"
          containerStyle={__a3_styles.searchBloomField}
        />

        <FlatList
          data={filtered}
          keyExtractor={item => item.uid}
          contentContainerStyle={__a3_styles.listContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          updateCellsBatchingPeriod={40}
          windowSize={7}
          renderItem={({ item }) => {
            const isSelected = selected.has(item.uid);
            const isLocked = locked.has(item.uid);
            const name = memberName(item);
            return (
              <Pressable
                onPress={() => choose(item.uid)}
                disabled={isLocked}
                style={({ pressed }) => [__a3_styles.memberRow, isSelected && __a3_styles.memberRowSelected, pressed && !isLocked && __a3_styles.pressed]}
              >
                <View style={[__a3_styles.avatar, item.gender === "female" ? __a3_styles.avatarFemale : __a3_styles.avatarNeutral]}>
                  <Text style={__a3_styles.avatarText}>{initialFor(name)}</Text>
                </View>
                <View style={__a3_styles.memberCopy}>
                  <Text style={__a3_styles.memberName}>{name}{item.uid === currentUid ? " · Bạn" : ""}</Text>
                  <Text style={__a3_styles.memberMeta}>{isLocked ? "Luôn thuộc nhóm" : "Thành viên Nhà Mình"}</Text>
                </View>
                <View style={[__a3_styles.selectMark, isSelected && __a3_styles.selectMarkSelected, mode === "single" && __a3_styles.radioMark]}>
                  {isSelected && <Ionicons name="checkmark" size={17} color={__a3Colors.white} />}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={(
            <View style={__a3_styles.empty}>
              <View style={__a3_styles.emptyIcon}><Ionicons name="people-outline" size={26} color={__a3Colors.primary} /></View>
              <Text style={__a3_styles.emptyTitle}>{queryText ? "Không tìm thấy thành viên" : emptyText}</Text>
            </View>
          )}
        />
      </BloomFullScreenFlow>
    </>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  block: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  labelCopy: { flex: 1 },
  label: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  hint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  countBadge: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  countText: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { maxWidth: "46%", minHeight: 31, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10 },
  chipText: { flexShrink: 1, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  more: { alignSelf: "center", color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  openButton: { minHeight: 68, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10 },
  openIcon: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  openCopy: { flex: 1, minWidth: 0 },
  openTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  openHint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  pressed: { opacity: 0.68 },
  doneButton: { minHeight: 38, borderRadius: 14, paddingHorizontal: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  doneText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  searchBloomField: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  searchWrap: { marginHorizontal: 16, marginTop: 16, marginBottom: 8, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.inputBorder, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: COLORS.primaryText, fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 32, gap: 8 },
  memberRow: { minHeight: 70, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 11, paddingVertical: 9 },
  memberRowSelected: { backgroundColor: COLORS.surfaceFocus, borderColor: COLORS.focusBorder },
  avatar: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarFemale: { backgroundColor: COLORS.surface },
  avatarNeutral: { backgroundColor: COLORS.surface },
  avatarText: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  memberCopy: { flex: 1, minWidth: 0 },
  memberName: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  memberMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  selectMark: { width: 28, height: 28, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  radioMark: { borderRadius: 14 },
  selectMarkSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  empty: { paddingHorizontal: 24, paddingVertical: 50, alignItems: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  emptyTitle: { marginTop: 12, textAlign: "center", color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18 },
}));
