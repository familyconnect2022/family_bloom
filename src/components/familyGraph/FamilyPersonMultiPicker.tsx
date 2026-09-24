import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import type { FamilyPerson } from "../../types/familyGraph";
import { getGivenNameInitial } from "../../utils/personName";

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
      <View style={styles.block}>
        <View style={styles.labelRow}>
          <View style={styles.labelCopy}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.hint}>{hint}</Text>
          </View>
          <View style={styles.countBadge}><Text style={styles.countText}>{selectedIds.length}</Text></View>
        </View>

        {!!selectedPeople.length && (
          <View style={styles.chips}>
            {selectedPeople.slice(0, 5).map((person) => (
              <View key={person.id} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>{person.nickname || person.displayName}</Text>
                <Pressable onPress={() => toggle(person.id)} hitSlop={6}><Ionicons name="close" size={13} color={COLORS.primaryText} /></Pressable>
              </View>
            ))}
            {selectedPeople.length > 5 && <Text style={styles.more}>+{selectedPeople.length - 5}</Text>}
          </View>
        )}

        <Pressable
          disabled={disabled}
          onPress={() => setVisible(true)}
          style={({ pressed }) => [styles.openButton, pressed && styles.pressed, disabled && styles.disabled]}
        >
          <View style={styles.openIcon}><Ionicons name="people-outline" size={19} color={COLORS.primary} /></View>
          <View style={styles.openCopy}>
            <Text style={styles.openTitle}>{selectedIds.length ? "Chỉnh người liên quan" : "Chọn người liên quan"}</Text>
            <Text style={styles.openHint}>{persons.length ? `${persons.length} Person trong phả hệ` : "Phả hệ chưa có Person"}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.secondaryText} />
        </Pressable>
      </View>

      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={() => setVisible(false)}>
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.header}>
            <Pressable onPress={() => setVisible(false)} style={styles.closeButton}><Ionicons name="close" size={25} color={COLORS.primaryText} /></Pressable>
            <View style={styles.headerCopy}>
              <Text style={styles.headerTitle}>Người liên quan</Text>
              <Text style={styles.headerMeta}>Chọn nhiều người · {selectedIds.length} đã chọn</Text>
            </View>
            <Pressable onPress={() => setVisible(false)} style={styles.doneButton}><Text style={styles.doneText}>Xong</Text></Pressable>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={COLORS.secondaryText} />
            <TextInput
              value={queryText}
              onChangeText={setQueryText}
              placeholder="Tìm theo tên Person"
              placeholderTextColor={COLORS.secondaryText}
              style={styles.searchInput}
              autoCorrect={false}
            />
            {!!queryText && <Pressable onPress={() => setQueryText("")}><Ionicons name="close-circle" size={18} color={COLORS.secondaryText} /></Pressable>}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews
            initialNumToRender={14}
            maxToRenderPerBatch={12}
            windowSize={7}
            renderItem={({ item }) => {
              const selected = selectedSet.has(item.id);
              return (
                <Pressable onPress={() => toggle(item.id)} style={({ pressed }) => [styles.personRow, selected && styles.personRowSelected, pressed && styles.pressed]}>
                  <View style={[styles.avatar, item.gender === "female" ? styles.avatarFemale : styles.avatarMale]}>
                    <Text style={styles.avatarText}>{getGivenNameInitial(item.displayName)}</Text>
                  </View>
                  <View style={styles.personCopy}>
                    <Text style={styles.personName}>{item.displayName}</Text>
                    <Text style={styles.personMeta}>{item.birthYear ? String(item.birthYear) : "Chưa rõ năm sinh"}{item.linkedUid ? " · đã liên kết" : ""}</Text>
                  </View>
                  <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                    {selected && <Ionicons name="checkmark" size={17} color={COLORS.white} />}
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={<View style={styles.empty}><Ionicons name="people-outline" size={28} color={COLORS.primary} /><Text style={styles.emptyTitle}>Không tìm thấy Person</Text></View>}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  block: { gap: 10 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  labelCopy: { flex: 1 },
  label: { color: COLORS.primaryText, fontSize: 14, fontWeight: "900" },
  hint: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  countBadge: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: COLORS.border },
  countText: { color: COLORS.primary, fontSize: 11.5, fontWeight: "900" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { maxWidth: "46%", minHeight: 31, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, backgroundColor: "#FFF2F6", borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 10 },
  chipText: { flexShrink: 1, color: COLORS.primaryText, fontSize: 10.5, fontWeight: "800" },
  more: { alignSelf: "center", color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  openButton: { minHeight: 62, borderRadius: 19, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 9 },
  openIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  openCopy: { flex: 1 },
  openTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  openHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.5 },
  modalRoot: { flex: 1, backgroundColor: COLORS.white },
  header: { minHeight: 64, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  closeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  headerCopy: { flex: 1 },
  headerTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  headerMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5 },
  doneButton: { minHeight: 38, borderRadius: 14, paddingHorizontal: 14, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center" },
  doneText: { color: COLORS.white, fontSize: 12, fontWeight: "900" },
  searchWrap: { margin: 16, marginBottom: 8, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.softSurface, borderWidth: 1, borderColor: COLORS.border, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13 },
  searchInput: { flex: 1, color: COLORS.primaryText, fontSize: 13 },
  listContent: { paddingHorizontal: 16, paddingBottom: 30, gap: 8 },
  personRow: { minHeight: 70, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 11, paddingVertical: 9 },
  personRowSelected: { backgroundColor: "#FFF5F8", borderColor: COLORS.primary },
  avatar: { width: 45, height: 45, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  avatarMale: { backgroundColor: "#EDF7FF" },
  avatarFemale: { backgroundColor: "#FFF0F5" },
  avatarText: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  personCopy: { flex: 1 },
  personName: { color: COLORS.primaryText, fontSize: 13.5, fontWeight: "900" },
  personMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 10.5 },
  checkbox: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  empty: { paddingVertical: 70, alignItems: "center", gap: 9 },
  emptyTitle: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "800" },
});
