import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import { BLOOM_SUPPER } from "../../constants/bloomSupper";

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5);
const QUICK_TIMES = [
  { label: "Sáng", hour: 7, minute: 0 },
  { label: "Trưa", hour: 12, minute: 0 },
  { label: "Chiều", hour: 18, minute: 0 },
  { label: "Tối", hour: 20, minute: 0 },
];

const pad = (value: number) => String(value).padStart(2, "0");
const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const combineDateTime = (date: Date, hour: number, minute: number) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute, 0, 0);

const roundUpFiveMinutes = (base: Date) => {
  const next = new Date(base);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 5;
  next.setMinutes(next.getMinutes() + (remainder === 0 ? 5 : 5 - remainder));
  return next;
};

const snapToFiveMinutes = (base: Date) => {
  const next = new Date(base);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 5;
  if (remainder !== 0) next.setMinutes(next.getMinutes() + (5 - remainder));
  return next;
};

type NumberGridProps = {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  label: string;
  isDisabled?: (value: number) => boolean;
};

function BloomNumberGrid({ values, selected, onSelect, label, isDisabled }: NumberGridProps) {
  return (
    <View style={styles.gridBlock}>
      <Text style={styles.gridLabel}>{label}</Text>
      <View style={styles.grid}>
        {values.map((item) => {
          const active = item === selected;
          const disabled = isDisabled?.(item) ?? false;
          return (
            <Pressable
              key={`${label}-${item}`}
              disabled={disabled}
              onPress={() => onSelect(item)}
              style={[styles.gridChip, active && styles.gridChipActive, disabled && styles.gridChipDisabled]}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${pad(item)}`}
            >
              <Text style={[styles.gridChipText, active && styles.gridChipTextActive, disabled && styles.gridChipTextDisabled]}>
                {pad(item)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function BloomTimePicker({
  visible,
  value,
  selectedDate,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  value: Date;
  selectedDate: Date;
  onClose: () => void;
  onConfirm: (value: Date) => void;
}) {
  const snappedValue = useMemo(() => snapToFiveMinutes(value), [value]);
  const [hour, setHour] = useState(snappedValue.getHours());
  const [minute, setMinute] = useState(snappedValue.getMinutes());
  const [openedAt, setOpenedAt] = useState(() => new Date());

  const minimumToday = useMemo(() => roundUpFiveMinutes(openedAt), [openedAt]);
  const isToday = useMemo(() => sameLocalDay(selectedDate, openedAt), [openedAt, selectedDate]);

  const normalizeTime = (nextHour: number, nextMinute: number) => {
    if (!isToday) return { hour: nextHour, minute: nextMinute };
    const candidate = combineDateTime(selectedDate, nextHour, nextMinute);
    if (candidate.getTime() >= minimumToday.getTime()) return { hour: nextHour, minute: nextMinute };
    return { hour: minimumToday.getHours(), minute: minimumToday.getMinutes() };
  };

  useEffect(() => {
    if (!visible) return;
    const now = new Date();
    setOpenedAt(now);
    const minimum = roundUpFiveMinutes(now);
    const snapped = snapToFiveMinutes(value);
    const candidate = combineDateTime(selectedDate, snapped.getHours(), snapped.getMinutes());
    if (sameLocalDay(selectedDate, now) && candidate.getTime() < minimum.getTime()) {
      setHour(minimum.getHours());
      setMinute(minimum.getMinutes());
    } else {
      setHour(snapped.getHours());
      setMinute(snapped.getMinutes());
    }
  }, [selectedDate, value, visible]);

  const selectHour = (nextHour: number) => {
    const normalized = normalizeTime(nextHour, minute);
    setHour(normalized.hour);
    setMinute(normalized.minute);
  };

  const selectMinute = (nextMinute: number) => {
    const normalized = normalizeTime(hour, nextMinute);
    setHour(normalized.hour);
    setMinute(normalized.minute);
  };

  const display = useMemo(() => `${pad(hour)}:${pad(minute)}`, [hour, minute]);
  const currentCandidate = useMemo(() => combineDateTime(selectedDate, hour, minute), [hour, minute, selectedDate]);
  const invalidPast = isToday && currentCandidate.getTime() < minimumToday.getTime();

  const hourDisabled = (candidateHour: number) =>
    isToday && candidateHour < minimumToday.getHours();

  const minuteDisabled = (candidateMinute: number) =>
    isToday && hour === minimumToday.getHours() && candidateMinute < minimumToday.getMinutes();

  const confirm = () => {
    if (invalidPast) return;
    const next = new Date(selectedDate);
    next.setHours(hour, minute, 0, 0);
    onConfirm(next);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng chọn giờ" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <View style={styles.headerIcon}><Ionicons name="time-outline" size={20} color={COLORS.primary} /></View>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>THỜI GIAN BLOOM</Text>
              <Text style={styles.title}>Chọn giờ nhẹ nhàng</Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}><Ionicons name="close" size={20} color={COLORS.primaryText} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <View style={styles.timeHero}>
              <Text style={styles.timeHeroText}>{display}</Text>
              <Text style={styles.timeHeroHint}>
                {isToday ? `Hôm nay · từ ${pad(minimumToday.getHours())}:${pad(minimumToday.getMinutes())} trở đi` : "Giờ · phút"}
              </Text>
            </View>

            <View style={styles.quickRow}>
              {QUICK_TIMES.map((item) => {
                const active = item.hour === hour && item.minute === minute;
                const disabled = isToday && combineDateTime(selectedDate, item.hour, item.minute).getTime() < minimumToday.getTime();
                return (
                  <Pressable
                    key={item.label}
                    disabled={disabled}
                    onPress={() => { setHour(item.hour); setMinute(item.minute); }}
                    style={[styles.quickChip, active && styles.quickChipActive, disabled && styles.quickChipDisabled]}
                  >
                    <Text style={[styles.quickLabel, active && styles.quickLabelActive, disabled && styles.quickTextDisabled]}>{item.label}</Text>
                    <Text style={[styles.quickTime, active && styles.quickLabelActive, disabled && styles.quickTextDisabled]}>{pad(item.hour)}:{pad(item.minute)}</Text>
                  </Pressable>
                );
              })}
            </View>

            <BloomNumberGrid values={HOURS} selected={hour} onSelect={selectHour} label="Giờ" isDisabled={hourDisabled} />
            <BloomNumberGrid values={MINUTES} selected={minute} onSelect={selectMinute} label="Phút" isDisabled={minuteDisabled} />

            {invalidPast && <Text style={styles.validationText}>Khoảnh khắc này đã trôi qua rồi. Mình chọn một giờ phía trước nhé.</Text>}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryButton}><Text style={styles.secondaryText}>Hủy</Text></Pressable>
            <Pressable disabled={invalidPast} onPress={confirm} style={[styles.primaryButton, invalidPast && styles.primaryButtonDisabled]}>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.primaryText}>Chọn {display}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: BLOOM_SUPPER.modal.backdrop, justifyContent: "flex-end" },
  sheet: { backgroundColor: BLOOM_SUPPER.surface.card, borderTopLeftRadius: BLOOM_SUPPER.radius.modal, borderTopRightRadius: BLOOM_SUPPER.radius.modal, paddingHorizontal: 18, paddingBottom: 20, maxHeight: "92%", borderWidth: 1, borderBottomWidth: 0, borderColor: BLOOM_SUPPER.border.card },
  handle: { alignSelf: "center", width: 72, height: 6, borderRadius: 3, backgroundColor: COLORS.border, marginTop: 10, marginBottom: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.softSurface },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: COLORS.primary, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  title: { marginTop: 2, color: COLORS.primaryText, fontSize: 18, fontWeight: "900" },
  closeButton: { width: 42, height: 42, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  scrollContent: { paddingBottom: 8 },
  timeHero: { marginTop: 14, borderRadius: 24, borderWidth: 1, borderColor: COLORS.focusBorder, backgroundColor: COLORS.surfaceFocus, alignItems: "center", paddingVertical: 14 },
  timeHeroText: { color: COLORS.primaryText, fontSize: 40, fontWeight: "900", letterSpacing: 2 },
  timeHeroHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  quickRow: { marginTop: 12, flexDirection: "row", gap: 7 },
  quickChip: { flex: 1, minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center" },
  quickChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickChipDisabled: { opacity: 0.38 },
  quickLabel: { color: COLORS.secondaryText, fontSize: 9.5, fontWeight: "800" },
  quickTime: { marginTop: 2, color: COLORS.primaryText, fontSize: 11.5, fontWeight: "900" },
  quickLabelActive: { color: COLORS.white },
  quickTextDisabled: { color: COLORS.secondaryText },
  gridBlock: { marginTop: 14 },
  gridLabel: { marginBottom: 8, color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  gridChip: { width: "14.8%", minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceSoft, alignItems: "center", justifyContent: "center" },
  gridChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  gridChipDisabled: { opacity: 0.32 },
  gridChipText: { color: COLORS.secondaryText, fontSize: 12, fontWeight: "800" },
  gridChipTextActive: { color: COLORS.white, fontWeight: "900" },
  gridChipTextDisabled: { color: COLORS.secondaryText },
  validationText: { marginTop: 10, textAlign: "center", color: COLORS.primaryText, fontSize: 10.5, fontWeight: "700" },
  actions: { marginTop: 12, flexDirection: "row", gap: 10 },
  secondaryButton: { flex: 0.8, minHeight: 50, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, alignItems: "center", justifyContent: "center" },
  secondaryText: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  primaryButton: { flex: 1.4, minHeight: 50, borderRadius: 18, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  primaryButtonDisabled: { opacity: 0.42 },
  primaryText: { color: COLORS.white, fontSize: 13, fontWeight: "900" },
});
