import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { COLORS } from "../../constants/theme";
import type { FamilyPerson } from "../../types/familyGraph";
import { getGivenNameInitial } from "../../utils/personName";
import { BloomFullScreenFlow } from "../ui/BloomFullScreenFlow";
import { BloomTextInput } from "../ui/BloomInputComponents";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export function FamilyPersonMultiPicker({
  label = "Gắn người trong phả hệ",
  hint = "Có thể chọn nhiều người liên quan.",
  persons,
  selectedIds,
  onChange,
  disabled = false,
}: {
  label?: string;
  hint?: string;
  persons: FamilyPerson[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const [visible, setVisible] = useState(false);
  const [queryText, setQueryText] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const personById = useMemo(() => new Map(persons.map((person) => [person.id, person])), [persons]);
  const selectedPeople = useMemo(
    () => selectedIds.map((id) => personById.get(id)).filter((person): person is FamilyPerson => !!person),
    [personById, selectedIds],
  );
  const filtered = useMemo(() => {
    const needle = queryText.trim().toLocaleLowerCase("vi");
    const base = needle
      ? persons.filter((person) => `${person.displayName} ${person.nickname ?? ""}`.toLocaleLowerCase("vi").includes(needle))
      : persons;
    return [...base].sort((a, b) => a.displayName.localeCompare(b.displayName, "vi"));
  }, [persons, queryText]);

  const toggle = (personId: string) => {
    if (selectedSet.has(personId)) onChange(selectedIds.filter((id) => id !== personId));
    else onChange([...selectedIds, personId]);
  };

  return (
    <>
      <View style={__a3_styles.block}>
        <View style={__a3_styles.labelRow}>
          <View style={__a3_styles.labelCopy}>
            <Text style={__a3_styles.label}>{label}</Text>
            <Text style={__a3_styles.hint}>{hint}</Text>
          </View>
          <View style={__a3_styles.countBadge}><Text style={__a3_styles.countText}>{selectedIds.length}</Text></View>
        </View>

        {!!selectedPeople.length && (
          <View style={__a3_styles.chips}>
            {selectedPeople.slice(0, 5).map((person) => (
              <View key={person.id} style={__a3_styles.chip}>
                <Text style={__a3_styles.chipText} numberOfLines={1}>{person.nickname || person.displayName}</Text>
                <Pressable onPress={() => toggle(person.id)} hitSlop={6}><Ionicons name="close" size={13} color={__a3Colors.primaryText} /></Pressable>
              </View>
            ))}
            {selectedPeople.length > 5 && <Text style={__a3_styles.more}>+{selectedPeople.length - 5}</Text>}
          </View>
        )}

        <Pressable
          disabled={disabled}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [__a3_styles.openButton, pressed && __a3_styles.pressed, disabled && __a3_styles.disabled]}
        >
          <View style={__a3_styles.openIcon}><Ionicons name="people-outline" size={19} color={__a3Colors.primary} /></View>
          <View style={__a3_styles.openCopy}>
            <Text style={__a3_styles.openTitle}>{selectedIds.length ? "Chỉnh người liên quan" : "Chọn người liên quan"}</Text>
            <Text style={__a3_styles.openHint}>{persons.length ? `${persons.length} người trong phả hệ` : "Phả hệ chưa có người nào"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={__a3Colors.secondaryText} />
        </Pressable>
      </View>

      <BloomFullScreenFlow
        visible={visible}
        eyebrow="NGƯỜI LIÊN QUAN"
        title="Chọn những người cùng câu chuyện"
        subtitle={`${selectedIds.length} người đã chọn · Tìm và chọn những người cùng xuất hiện trong câu chuyện này.`}
        variant="relationship"
        compactHeader
        onBack={() => setVisible(false)}
        right={<Pressable onPress={() => setVisible(false)} style={__a3_styles.doneButton}><Text style={__a3_styles.doneText}>Xong</Text></Pressable>}
      >
          <BloomTextInput
            value={queryText}
            onChangeText={setQueryText}
            placeholder="Tìm người thân theo tên"
            isSearch
            autoCorrect={false}
            containerStyle={__a3_styles.searchBloomField}
          />

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={__a3_styles.listContent}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={14}
            maxToRenderPerBatch={12}
            windowSize={7}
            renderItem={({ item }) => {
              const selected = selectedSet.has(item.id);
              return (
                <Pressable onPress={() => toggle(item.id)} style={({ pressed }) => [__a3_styles.personRow, selected && __a3_styles.personRowSelected, pressed && __a3_styles.pressed]}>
                  <View style={[__a3_styles.avatar, item.gender === "female" ? __a3_styles.avatarFemale : __a3_styles.avatarMale]}>
                    <Text style={__a3_styles.avatarText}>{getGivenNameInitial(item.displayName)}</Text>
                  </View>
                  <View style={__a3_styles.personCopy}>
                    <Text style={__a3_styles.personName}>{item.displayName}</Text>
                    <Text style={__a3_styles.personMeta}>{item.birthYear ? String(item.birthYear) : "Chưa rõ năm sinh"}{item.linkedUid ? " · đã liên kết" : ""}</Text>
                  </View>
                  <View style={[__a3_styles.checkbox, selected && __a3_styles.checkboxSelected]}>
                    {selected && <Ionicons name="checkmark" size={17} color={__a3Colors.white} />}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={<View style={__a3_styles.empty}><Ionicons name="people-outline" size={28} color={__a3Colors.primary} /><Text style={__a3_styles.emptyTitle}>Không tìm thấy người phù hợp</Text></View>}
          />
      </BloomFullScreenFlow>
    </>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  block: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  labelCopy: { flex: 1 },
  label: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  hint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  countBadge: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  countText: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { maxWidth: "46%", minHeight: 31, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10 },
  chipText: { flexShrink: 1, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  more: { alignSelf: "center", color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  openButton: { minHeight: 62, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  openIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  openCopy: { flex: 1 },
  openTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  openHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  modalRoot: { flex: 1, backgroundColor: COLORS.surface },
  header: { minHeight: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  closeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  headerMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  doneButton: { minHeight: 38, borderRadius: 14, paddingHorizontal: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  doneText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  searchBloomField: { marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  searchWrap: { margin: 16, marginBottom: 8, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.inputBorder, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, shadowColor: COLORS.shadow, shadowOpacity: 0.05, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  searchInput: { flex: 1, color: COLORS.primaryText, fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 8 },
  personRow: { minHeight: 70, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 11, paddingVertical: 9 },
  personRowSelected: { backgroundColor: COLORS.surfaceFocus, borderColor: COLORS.focusBorder },
  avatar: { width: 45, height: 45, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarMale: { backgroundColor: COLORS.surface },
  avatarFemale: { backgroundColor: COLORS.surface },
  avatarText: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  personCopy: { flex: 1 },
  personName: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  personMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  checkbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  empty: { paddingVertical: 70, alignItems: "center", gap: 9 },
  emptyTitle: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "800" },
}));
