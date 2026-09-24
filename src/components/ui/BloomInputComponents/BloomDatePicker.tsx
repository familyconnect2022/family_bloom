import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useState } from "react";
import { Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { BloomIconProp, COLORS, renderIcon, sharedInputStyles } from "./shared";

export interface BloomDatePickerProps {
  label?: string;
  selectedDate?: Date;
  onDateChange: (date: Date) => void;
  placeholder?: string;
  leftIcon?: BloomIconProp;
  rightIcon?: BloomIconProp;
  containerStyle?: StyleProp<ViewStyle>;
  /** Optional UX guard. Domain/service validation must still enforce the rule. */
  minimumDate?: Date;
  /** Optional upper-bound UX guard. Domain/service validation must still enforce the rule. */
  maximumDate?: Date;
  /** Optional custom trigger, useful for compact icon-only date buttons. */
  trigger?: (open: () => void) => React.ReactNode;
}

const DAYS_OF_WEEK = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

type PickerMode = "date" | "month" | "year";

export const BloomDatePicker: React.FC<BloomDatePickerProps> = ({
  label,
  selectedDate,
  onDateChange,
  placeholder = "Chọn ngày...",
  leftIcon = "calendar-outline",
  rightIcon = "chevron-down",
  containerStyle,
  minimumDate,
  maximumDate,
  trigger,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(selectedDate || new Date());
  const [tempSelected, setTempSelected] = useState<Date>(selectedDate || new Date());

  // State quản lý chế độ xem hiện tại
  const [mode, setMode] = useState<PickerMode>("date");
  // Quản lý trang của năm (mỗi trang hiển thị 12 năm)
  const [yearPage, setYearPage] = useState(0);

  useEffect(() => {
    if (mode === "year") {
      setYearPage(Math.floor(viewDate.getFullYear() / 12));
    }
  }, [mode, viewDate]);


  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const minimumStart = minimumDate ? startOfDay(minimumDate) : null;
  const maximumStart = maximumDate ? startOfDay(maximumDate) : null;
  const isBeforeMinimum = (date: Date) =>
    !!minimumStart && startOfDay(date).getTime() < minimumStart.getTime();
  const isAfterMaximum = (date: Date) =>
    !!maximumStart && startOfDay(date).getTime() > maximumStart.getTime();
  const isOutsideRange = (date: Date) => isBeforeMinimum(date) || isAfterMaximum(date);

  const canNavigatePrevious = () => {
    if (!minimumStart) return true;
    if (mode === "date") {
      const previousMonthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0);
      return startOfDay(previousMonthEnd).getTime() >= minimumStart.getTime();
    }
    if (mode === "month") {
      return viewDate.getFullYear() - 1 >= minimumStart.getFullYear();
    }
    const previousPageEndYear = (yearPage - 1) * 12 + 11;
    return previousPageEndYear >= minimumStart.getFullYear();
  };

  const isMonthBeforeMinimum = (year: number, monthIndex: number) =>
    !!minimumStart && (
      year < minimumStart.getFullYear() ||
      (year === minimumStart.getFullYear() && monthIndex < minimumStart.getMonth())
    );

  const isMonthAfterMaximum = (year: number, monthIndex: number) =>
    !!maximumStart && (
      year > maximumStart.getFullYear() ||
      (year === maximumStart.getFullYear() && monthIndex > maximumStart.getMonth())
    );

  const canNavigateNext = () => {
    if (!maximumStart) return true;
    if (mode === "date") {
      const nextMonthStart = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
      return startOfDay(nextMonthStart).getTime() <= maximumStart.getTime();
    }
    if (mode === "month") return viewDate.getFullYear() + 1 <= maximumStart.getFullYear();
    const nextPageStartYear = (yearPage + 1) * 12;
    return nextPageStartYear <= maximumStart.getFullYear();
  };

  const formatDate = (date?: Date) => {
    if (!date) return "";
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const candidate = selectedDate || new Date();
    let initial = candidate;
    if (isBeforeMinimum(initial) && minimumDate) initial = new Date(minimumDate);
    if (isAfterMaximum(initial) && maximumDate) initial = new Date(maximumDate);
    setViewDate(initial);
    setTempSelected(initial);
    setMode("date"); // Luôn mở ở chế độ xem ngày
    setModalVisible(true);
  };

  const handlePrev = () => {
    if (!canNavigatePrevious()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (mode === "date") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    } else if (mode === "month") {
      setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
    } else {
      setYearPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (!canNavigateNext()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (mode === "date") {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    } else if (mode === "month") {
      setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
    } else {
      setYearPage((prev) => prev + 1);
    }
  };

  const handleCenterNavPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (mode === "date") setMode("month");
    else if (mode === "month") setMode("year");
    else setMode("date");
  };

  const getNavTitle = () => {
    if (mode === "date") return `Tháng ${viewDate.getMonth() + 1} năm ${viewDate.getFullYear()}`;
    if (mode === "month") return `Năm ${viewDate.getFullYear()}`;
    if (mode === "year") {
      const startYear = yearPage * 12;
      return `${startYear} - ${startYear + 11}`;
    }
  };

  const getDaysGrid = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let firstDayIndex = new Date(year, month, 1).getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6;

    const grid: (Date | null)[] = [];
    for (let i = 0; i < firstDayIndex; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(new Date(year, month, d));
    return grid;
  };

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const handleConfirm = () => {
    if (isOutsideRange(tempSelected)) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onDateChange(tempSelected);
    setModalVisible(false);
  };

  return (
    <View style={[sharedInputStyles.inputWrapper, containerStyle]}>
      {label && <Text style={sharedInputStyles.inputLabel}>{label}</Text>}
      {trigger ? trigger(handleOpen) : (
        <Pressable onPress={handleOpen} style={[styles.inputContainer, styles.pickerContainer]}>
          <View style={styles.iconLeft}>{renderIcon(leftIcon, 20, COLORS.primary)}</View>
          <Text style={[styles.pickerText, !selectedDate && { color: COLORS.secondaryText }]}>
            {selectedDate ? formatDate(selectedDate) : placeholder}
          </Text>
          <View style={styles.iconRight}>{renderIcon(rightIcon, 18, COLORS.secondaryText)}</View>
        </Pressable>
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Heder Banner - Có thể bấm để chuyển mode */}
            <View style={styles.calendarHeaderBanner}>
              <Pressable onPress={() => setMode("year")}>
                <Text style={[styles.calendarHeaderYear, mode === "year" && styles.textOpaque]}>
                  {tempSelected.getFullYear()}
                </Text>
              </Pressable>
              <Pressable onPress={() => setMode("date")}>
                <Text style={[styles.calendarHeaderTitle, mode !== "year" && styles.textOpaque]}>
                  {`Tháng ${tempSelected.getMonth() + 1}, ngày ${tempSelected.getDate()}`}
                </Text>
              </Pressable>
            </View>

            {/* Điều hướng */}
            <View style={styles.monthNavRow}>
              <Pressable
                disabled={!canNavigatePrevious()}
                onPress={handlePrev}
                style={[styles.navBtn, !canNavigatePrevious() && styles.navBtnDisabled]}
              >
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={canNavigatePrevious() ? COLORS.primaryText : COLORS.secondaryText}
                />
              </Pressable>
              <Pressable onPress={handleCenterNavPress} style={styles.centerNavBtn}>
                <Text style={styles.monthNavTitle}>{getNavTitle()}</Text>
                {mode !== "year" && (
                  <Ionicons
                    name="caret-down"
                    size={14}
                    color={COLORS.primaryText}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </Pressable>
              <Pressable
                disabled={!canNavigateNext()}
                onPress={handleNext}
                style={[styles.navBtn, !canNavigateNext() && styles.navBtnDisabled]}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={canNavigateNext() ? COLORS.primaryText : COLORS.secondaryText}
                />
              </Pressable>
            </View>

            {/* Chế độ xem Ngày */}
            {mode === "date" && (
              <>
                <View style={styles.weekHeader}>
                  {DAYS_OF_WEEK.map((day, i) => (
                    <Text key={i} style={styles.weekDayText}>
                      {day}
                    </Text>
                  ))}
                </View>
                <View style={styles.daysGrid}>
                  {getDaysGrid().map((item, index) => {
                    if (!item) return <View key={index} style={styles.dayCell} />;
                    const selected = isSameDay(item, tempSelected);
                    const disabled = isOutsideRange(item);
                    return (
                      <Pressable
                        key={index}
                        disabled={disabled}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                          setTempSelected(item);
                          setViewDate(item); // Đồng bộ viewDate
                        }}
                        style={[styles.dayCell, selected && styles.dayCellSelected, disabled && styles.dayCellDisabled]}
                      >
                        <Text style={[styles.dayText, selected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>
                          {item.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {/* Chế độ xem Tháng */}
            {mode === "month" && (
              <View style={styles.gridContainer}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const isSelected = viewDate.getMonth() === i;
                  const disabled = isMonthBeforeMinimum(viewDate.getFullYear(), i) || isMonthAfterMaximum(viewDate.getFullYear(), i);
                  return (
                    <Pressable
                      key={i}
                      disabled={disabled}
                      style={[
                        styles.gridCell,
                        isSelected && styles.gridCellSelected,
                        disabled && styles.gridCellDisabled,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        const next = new Date(viewDate.getFullYear(), i, 1);
                        setViewDate(next);
                        setMode("date");
                      }}
                    >
                      <Text style={[
                        styles.gridText,
                        isSelected && styles.gridTextSelected,
                        disabled && styles.gridTextDisabled,
                      ]}>
                        Tháng {i + 1}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Chế độ xem Năm */}
            {mode === "year" && (
              <View style={styles.gridContainer}>
                {Array.from({ length: 12 }).map((_, i) => {
                  const year = yearPage * 12 + i;
                  const isSelected = viewDate.getFullYear() === year;
                  const disabled = (!!minimumStart && year < minimumStart.getFullYear()) || (!!maximumStart && year > maximumStart.getFullYear());
                  return (
                    <Pressable
                      key={i}
                      disabled={disabled}
                      style={[
                        styles.gridCell,
                        isSelected && styles.gridCellSelected,
                        disabled && styles.gridCellDisabled,
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        let nextMonth = minimumStart && year === minimumStart.getFullYear()
                          ? Math.max(viewDate.getMonth(), minimumStart.getMonth())
                          : viewDate.getMonth();
                        if (maximumStart && year === maximumStart.getFullYear()) {
                          nextMonth = Math.min(nextMonth, maximumStart.getMonth());
                        }
                        setViewDate(new Date(year, nextMonth, 1));
                        setMode("month");
                      }}
                    >
                      <Text style={[
                        styles.gridText,
                        isSelected && styles.gridTextSelected,
                        disabled && styles.gridTextDisabled,
                      ]}>
                        {year}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.actionBtnCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.actionBtnCancelText}>HỦY</Text>
              </Pressable>
              <Pressable style={styles.actionBtnConfirm} onPress={handleConfirm}>
                <Text style={styles.actionBtnConfirmText}>XÁC NHẬN</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    height: 52,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  pickerContainer: {
    backgroundColor: COLORS.softSurface,
    borderColor: COLORS.border,
    justifyContent: "space-between",
  },
  pickerText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.primaryText,
    flex: 1,
  },
  iconLeft: { marginRight: 10, justifyContent: "center" },
  iconRight: { marginLeft: 8, padding: 4, justifyContent: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(142, 83, 104, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: 28,
    overflow: "hidden",
    elevation: 10,
    shadowColor: COLORS.primaryText,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  calendarHeaderBanner: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  textOpaque: {
    opacity: 1,
  },
  calendarHeaderYear: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "700",
    opacity: 0.7,
    marginBottom: 4,
  },
  calendarHeaderTitle: {
    fontSize: 22,
    color: COLORS.white,
    fontWeight: "800",
    opacity: 0.7,
  },
  monthNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navBtn: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: COLORS.softSurface,
  },
  navBtnDisabled: { opacity: 0.34 },
  centerNavBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.transparent,
  },
  monthNavTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primaryText,
  },
  weekHeader: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.secondaryText,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    minHeight: 250, // Cố định độ cao tránh giật UI khi đổi mode
  },
  dayCell: {
    width: "14.28%",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
  },
  dayText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primaryText,
  },
  dayTextSelected: {
    color: COLORS.white,
    fontWeight: "800",
  },
  dayCellDisabled: { opacity: 0.32 },
  dayTextDisabled: { color: COLORS.secondaryText },

  // Styles mới cho lưới Tháng / Năm
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    minHeight: 250,
  },
  gridCell: {
    width: "31%", // 3 cột
    height: 48,
    backgroundColor: COLORS.softSurface,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  gridCellSelected: {
    backgroundColor: COLORS.primary,
  },
  gridCellDisabled: { opacity: 0.3 },
  gridText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.primaryText,
  },
  gridTextSelected: {
    color: COLORS.white,
  },
  gridTextDisabled: { color: COLORS.secondaryText },

  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: 8,
    gap: 12,
  },
  actionBtnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.secondaryText,
  },
  actionBtnConfirm: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  actionBtnConfirmText: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.white,
  },
});
