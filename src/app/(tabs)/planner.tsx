import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { EventCard } from "../../components/events/EventCard";
import { EventParticipantsPicker } from "../../components/events/EventParticipantsPicker";
import { FamilyPersonMultiPicker } from "../../components/familyGraph/FamilyPersonMultiPicker";
import { BloomButton } from "../../components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomTextInput } from "../../components/ui/BloomInputComponents";
import { BloomCard, BloomEmptyState, BloomPageHeader, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { useBloomToast } from "../../components/ui/BloomToast";
import { useBloomTaskToast } from "../../hooks/useBloomTaskToast";
import { parseAppError } from "../../constants/errorConstants";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useFamilyEvents } from "../../hooks/useFamilyEvents";
import { useFamilyMembers } from "../../hooks/useFamilyMembers";
import { useFamilyPersonDirectory } from "../../hooks/useFamilyPersonDirectory";
import { calendarService } from "../../services/calendar/calendarService";
import { eventService } from "../../services/event/eventService";
import type { CreateEventInput, EventParticipantsMode, EventType, FamilyEvent } from "../../types";
import { eventDateParts, isDateBeforeToday } from "../../utils/event";

const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const EVENT_TYPES: Array<{ key: EventType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "family", label: "Gia đình", icon: "people-outline" },
  { key: "birthday", label: "Sinh nhật", icon: "gift-outline" },
  { key: "anniversary", label: "Kỷ niệm", icon: "heart-outline" },
  { key: "personal", label: "Cá nhân", icon: "person-outline" },
  { key: "other", label: "Khác", icon: "sparkles-outline" },
];

type PlannerMode = "calendar" | "list";

const mergeDateAndTime = (date: Date, time: Date, allDay: boolean) => new Date(
  date.getFullYear(),
  date.getMonth(),
  date.getDate(),
  allDay ? 12 : time.getHours(),
  allDay ? 0 : time.getMinutes(),
  0,
  0,
);

export default function PlannerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string }>();
  const { activeFamilyId, user, families } = useAuth();
  const { showToast } = useBloomToast();
  const { startTask, finishTask, failTask } = useBloomTaskToast();
  const today = useMemo(() => new Date(), []);
  const [mode, setMode] = useState<PlannerMode>("calendar");
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [pendingEvents, setPendingEvents] = useState<FamilyEvent[]>([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date>(today);
  const [eventTime, setEventTime] = useState<Date>(() => new Date(2026, 0, 1, 18, 0));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [eventType, setEventType] = useState<EventType>("family");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "yearly">("none");
  const [participantsMode, setParticipantsMode] = useState<EventParticipantsMode>("all");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  const [hiddenEvents, setHiddenEvents] = useState<FamilyEvent[]>([]);
  const [moderationVisible, setModerationVisible] = useState(false);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const membership = families.find((item) => item.familyId === activeFamilyId);
  const canModerate = membership?.role === "owner" || membership?.role === "admin";

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => setAppActive(state === "active"));
    return () => subscription.remove();
  }, []);

  const year = viewDate.getFullYear();
  const monthIndex = viewDate.getMonth();
  const month = monthIndex + 1;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingSlots = (new Date(year, monthIndex, 1).getDay() + 6) % 7;

  const {
    monthEvents,
    upcomingEvents,
    pastEvents,
    loadingMonth,
    loadingList,
    loadingMoreUpcoming,
    loadingMorePast,
    hasMoreUpcoming,
    hasMorePast,
    loadMoreUpcoming,
    loadMorePast,
  } = useFamilyEvents({
    familyId: activeFamilyId,
    viewDate,
    // Keep the current bounded query warm across bottom-tab switches. Focus
    // previously cleared the calendar/list and recreated its Firestore listener.
    // Release it when the app backgrounds, the family changes or this unmounts.
    calendarEnabled: appActive && mode === "calendar",
    listEnabled: appActive && mode === "list",
  });
  const { members, memberByUid } = useFamilyMembers(activeFamilyId);
  useTabStartupTask("planner", !loadingMonth && !loadingList);
  const { persons: familyPersons } = useFamilyPersonDirectory(activeFamilyId, composerVisible || !!params.personId);

  useEffect(() => {
    setHiddenEvents([]);
    setModerationVisible(false);
    if (!activeFamilyId || !canModerate) return;
    return eventService.subscribeHiddenForModeration(
      activeFamilyId,
      setHiddenEvents,
      () => setHiddenEvents([]),
    );
  }, [activeFamilyId, canModerate]);

  const restoreHiddenEvent = useCallback(async (eventId: string) => {
    if (!activeFamilyId || !canModerate || moderationBusyId) return;
    setModerationBusyId(eventId);
    try {
      await eventService.setModerationStatus(activeFamilyId, eventId, "visible");
    } catch (error) {
      showToast({ ...parseAppError(error), duration: 3200 });
    } finally {
      setModerationBusyId(null);
    }
  }, [activeFamilyId, canModerate, moderationBusyId, showToast]);

  const visibleMonthEvents = useMemo(() => {
    const pending = pendingEvents.filter((event) => event.month === month && (event.year === year || event.recurrence === "yearly"));
    const map = new Map<string, FamilyEvent>();
    [...monthEvents, ...pending].forEach((event) => map.set(event.id, event));
    return Array.from(map.values());
  }, [monthEvents, pendingEvents, month, year]);

  const selectedEvents = useMemo(
    () => visibleMonthEvents.filter((event) => event.day === selectedDay),
    [selectedDay, visibleMonthEvents],
  );

  const moveMonth = (offset: number) => {
    const next = new Date(year, monthIndex + offset, 1);
    setViewDate(next);
    const currentMonth = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
    setSelectedDay(currentMonth ? today.getDate() : 1);
  };

  const openComposer = () => {
    const selected = new Date(year, monthIndex, selectedDay, 12, 0, 0, 0);
    const initialDate = isDateBeforeToday(selected, today) ? today : selected;
    setEventDate(new Date(initialDate));
    setEventTime(new Date(2026, 0, 1, 18, 0));
    setAllDay(true);
    setEventTitle("");
    setEventType("family");
    setEventDescription("");
    setEventLocation("");
    setRecurrence("none");
    setParticipantsMode("all");
    setParticipantIds([]);
    setPersonIds([]);
    setShowTimePicker(false);
    setComposerVisible(true);
  };

  useEffect(() => {
    const requestedPersonId = typeof params.personId === "string" ? params.personId.trim() : "";
    if (!requestedPersonId || !activeFamilyId) return;
    const selected = new Date(year, monthIndex, selectedDay, 12, 0, 0, 0);
    const initialDate = isDateBeforeToday(selected, today) ? today : selected;
    setEventDate(new Date(initialDate));
    setEventTime(new Date(2026, 0, 1, 18, 0));
    setAllDay(true);
    setEventTitle("");
    setEventType("family");
    setEventDescription("");
    setEventLocation("");
    setRecurrence("none");
    setParticipantsMode("all");
    setParticipantIds([]);
    setPersonIds([requestedPersonId]);
    setShowTimePicker(false);
    setComposerVisible(true);
    router.setParams({ personId: undefined } as never);
  }, [activeFamilyId, monthIndex, params.personId, router, selectedDay, today, year]);

  const openEvent = (event: FamilyEvent) => {
    if (event.id.startsWith("pending-")) return;
    router.push(`/event/${event.id}` as never);
  };

  const publishEvent = () => {
    if (!activeFamilyId || !user) return;
    const title = eventTitle.trim();
    if (!title) {
      showToast({ ...parseAppError({ code: "EVENT_TITLE_REQUIRED" }), duration: 2800 });
      return;
    }
    if (participantsMode === "selected" && participantIds.length === 0) {
      showToast({ ...parseAppError({ code: "EVENT_PARTICIPANTS_REQUIRED" }), duration: 3000 });
      return;
    }

    const date = mergeDateAndTime(eventDate, eventTime, allDay);
    if (isDateBeforeToday(date) && recurrence !== "yearly") {
      showToast({ ...parseAppError({ code: "EVENT_DATE_IN_PAST" }), duration: 3000 });
      return;
    }
    const parts = eventDateParts(date.toISOString());
    if (!parts) return;

    const input: CreateEventInput = {
      title,
      dateISO: date.toISOString(),
      allDay,
      eventType,
      participantsMode,
      participantIds: participantsMode === "selected" ? participantIds : [],
      personIds,
      recurrence,
      description: eventDescription.trim() || null,
      location: eventLocation.trim() || null,
      createdByUid: user.uid,
    };

    const timestamp = new Date().toISOString();
    const tempId = `pending-${Date.now()}`;
    const optimisticEvent: FamilyEvent = {
      id: tempId,
      familyId: activeFamilyId,
      title,
      dateISO: input.dateISO,
      ...parts,
      allDay,
      eventType,
      participantsMode,
      participantIds: participantsMode === "selected" ? participantIds : [],
      personIds: [...personIds],
      recurrence,
      description: input.description ?? null,
      location: input.location ?? null,
      attachments: [],
      attachmentPublicIds: [],
      coverAttachmentId: null,
      createdByUid: user.uid,
      moderationStatus: "visible",
      moderatedByUid: null,
      moderatedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    setViewDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDay(date.getDate());
    setPendingEvents((current) => [optimisticEvent, ...current]);
    setComposerVisible(false);
    setMode("calendar");
    startTask({ title: "Bloom đang gieo sự kiện…", message: title });

    void calendarService.createEvent(activeFamilyId, input)
      .then(() => {
        setPendingEvents((current) => current.filter((item) => item.id !== tempId));
        finishTask({ title: "Sự kiện đã nở trong lịch 🌸", message: title });
      })
      .catch((error) => {
        setPendingEvents((current) => current.filter((item) => item.id !== tempId));
        failTask(error, { title: "Sự kiện chưa lên lịch được", message: title });
      });
  };

  const renderTop = () => (
    <>
      <BloomPageHeader
        eyebrow="Kế hoạch"
        title="Lịch nhà 📅"
        subtitle="Sự kiện chung, ngày quan trọng và những điều cả nhà đang mong chờ."
        right={(
          <Pressable onPress={openComposer} accessibilityRole="button" accessibilityLabel="Tạo sự kiện mới" style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}>
            <Ionicons name="add" size={25} color={COLORS.white} />
          </Pressable>
        )}
      />

      <View style={styles.segment}>
        <Pressable onPress={() => setMode("calendar")} style={[styles.segmentItem, mode === "calendar" && styles.segmentActive]}>
          <Ionicons name="calendar-outline" size={16} color={mode === "calendar" ? COLORS.white : COLORS.primaryText} />
          <Text style={[styles.segmentText, mode === "calendar" && styles.segmentTextActive]}>Lịch</Text>
        </Pressable>
        <Pressable onPress={() => setMode("list")} style={[styles.segmentItem, mode === "list" && styles.segmentActive]}>
          <Ionicons name="list-outline" size={16} color={mode === "list" ? COLORS.white : COLORS.primaryText} />
          <Text style={[styles.segmentText, mode === "list" && styles.segmentTextActive]}>Sự kiện</Text>
        </Pressable>
      </View>

    </>
  );

  const calendarHeader = () => (
    <>
      {renderTop()}
      <BloomCard style={styles.calendarCard}>
        <View style={styles.calendarHeader}>
          <Pressable onPress={() => moveMonth(-1)} hitSlop={10} style={styles.monthButton}><Ionicons name="chevron-back" size={20} color={COLORS.primaryText} /></Pressable>
          <View style={styles.monthCopy}><Text style={styles.monthTitle}>{MONTHS[monthIndex]}</Text><Text style={styles.yearText}>{year}</Text></View>
          <Pressable onPress={() => moveMonth(1)} hitSlop={10} style={styles.monthButton}><Ionicons name="chevron-forward" size={20} color={COLORS.primaryText} /></Pressable>
        </View>
        <View style={styles.weekRow}>{WEEK_DAYS.map((day) => <Text key={day} style={styles.weekLabel}>{day}</Text>)}</View>
        <View style={styles.daysGrid}>
          {Array.from({ length: leadingSlots }).map((_, index) => <View key={`blank-${index}`} style={styles.daySlot} />)}
          {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => {
            const selected = selectedDay === day;
            const hasEvent = visibleMonthEvents.some((event) => event.day === day);
            const isToday = year === today.getFullYear() && monthIndex === today.getMonth() && day === today.getDate();
            return (
              <Pressable key={day} onPress={() => setSelectedDay(day)} style={styles.daySlot}>
                <View style={[styles.dayCircle, selected && styles.daySelected, isToday && !selected && styles.dayToday]}><Text style={[styles.dayText, selected && styles.daySelectedText]}>{day}</Text></View>
                {hasEvent && <View style={[styles.eventDot, selected && styles.eventDotSelected]} />}
              </Pressable>
            );
          })}
        </View>
      </BloomCard>
      <View style={styles.sectionHeaderWrap}>
        <BloomSectionHeader title={`Ngày ${selectedDay}/${month}`} subtitle={selectedEvents.length ? `${selectedEvents.length} sự kiện trong ngày` : "Một ngày đang thật nhẹ nhàng"} actionLabel="Thêm sự kiện" onAction={openComposer} />
      </View>
    </>
  );

  const calendarEmpty = loadingMonth ? (
    <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang xem lịch nhà…</Text></View>
  ) : (
    <BloomEmptyState icon="sunny-outline" title="Chưa có lịch cho ngày này" description="Chọn một ngày khác hoặc gieo một sự kiện mới cho cả nhà." />
  );

  const listSections = [
    { key: "upcoming", title: "Sắp tới", subtitle: "Những điều cả nhà đang mong chờ", data: upcomingEvents },
    { key: "past", title: "Đã qua", subtitle: "Những ngày đã trở thành kỷ niệm", data: pastEvents },
  ];

  return (
    <ScreenContainer>
      {canModerate && (
        <Pressable onPress={() => setModerationVisible(true)} style={({ pressed }) => [styles.moderationButton, pressed && styles.pressed]}>
          <View style={styles.moderationIcon}><Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primary} /></View>
          <View style={styles.moderationCopy}>
            <Text style={styles.moderationTitle}>Kiểm duyệt sự kiện</Text>
            <Text style={styles.moderationHint}>Admin chỉ ẩn/cho hiện · không sửa hoặc xóa sự kiện của người khác</Text>
          </View>
          <View style={styles.hiddenCount}><Text style={styles.hiddenCountText}>{hiddenEvents.length}</Text></View>
        </Pressable>
      )}

      {mode === "calendar" ? (
        <FlatList
          data={selectedEvents}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} memberByUid={memberByUid} pending={item.id.startsWith("pending-")} onPress={() => openEvent(item)} />}
          ListHeaderComponent={calendarHeader}
          ListEmptyComponent={calendarEmpty}
          ItemSeparatorComponent={() => <View style={styles.itemGap} />}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={6}
          windowSize={7}
        />
      ) : (
        <SectionList
          sections={listSections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <EventCard event={item} memberByUid={memberByUid} onPress={() => openEvent(item)} />}
          ItemSeparatorComponent={() => <View style={styles.itemGap} />}
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeaderList}><BloomSectionHeader title={section.title} subtitle={section.subtitle} /></View>
          )}
          renderSectionFooter={({ section }) => {
            const upcoming = section.key === "upcoming";
            const hasMore = upcoming ? hasMoreUpcoming : hasMorePast;
            const busy = upcoming ? loadingMoreUpcoming : loadingMorePast;
            if (!hasMore) return null;
            return <BloomButton title={busy ? "Đang mở thêm…" : upcoming ? "Xem thêm sự kiện sắp tới" : "Xem thêm kỷ niệm đã qua"} variant="transparent" isLoading={busy} onPress={upcoming ? loadMoreUpcoming : loadMorePast} customStyle={styles.moreButton} />;
          }}
          ListHeaderComponent={renderTop}
          ListEmptyComponent={loadingList ? <View style={styles.loading}><ActivityIndicator color={COLORS.primary} /><Text style={styles.loadingText}>Bloom đang xếp lịch…</Text></View> : <BloomEmptyState icon="calendar-clear-outline" title="Chưa có sự kiện nào" description="Khi cả nhà tạo sự kiện, danh sách sẽ tự cập nhật ở đây." />}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          removeClippedSubviews
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={7}
        />
      )}

      <Modal visible={moderationVisible} transparent animationType="fade" onRequestClose={() => setModerationVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, styles.moderationSheet]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}>
                <Text style={styles.sheetEyebrow}>KIỂM DUYỆT</Text>
                <Text style={styles.sheetTitle}>Sự kiện đang ẩn</Text>
              </View>
              <Pressable onPress={() => setModerationVisible(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={COLORS.primaryText} /></Pressable>
            </View>
            {hiddenEvents.length === 0 ? (
              <View style={styles.moderationEmpty}>
                <BloomEmptyState icon="eye-outline" title="Không có sự kiện đang ẩn" description="Khi Admin ẩn một sự kiện, sự kiện sẽ xuất hiện ở đây để có thể cho hiện lại." compact />
              </View>
            ) : (
              <FlatList
                data={hiddenEvents}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.moderationList}
                renderItem={({ item }) => (
                  <View style={styles.hiddenEventRow}>
                    <View style={styles.hiddenEventCopy}>
                      <Text style={styles.hiddenEventTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.hiddenEventMeta}>Nội dung vẫn thuộc người tạo · chỉ đang bị ẩn khỏi lịch</Text>
                    </View>
                    <Pressable disabled={!!moderationBusyId} onPress={() => void restoreHiddenEvent(item.id)} style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}>
                      <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                      <Text style={styles.restoreButtonText}>{moderationBusyId === item.id ? "Đang mở…" : "Cho hiện"}</Text>
                    </Pressable>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={composerVisible} transparent animationType="fade" onRequestClose={() => setComposerVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View style={styles.sheetHeaderCopy}><Text style={styles.sheetEyebrow}>SỰ KIỆN MỚI</Text><Text style={styles.sheetTitle}>Gieo một ngày đáng nhớ 🌷</Text></View>
              <Pressable onPress={() => setComposerVisible(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={COLORS.primaryText} /></Pressable>
            </View>
            <BloomKeyboardScreen rootStyle={styles.formKeyboard} contentContainerStyle={styles.formContent}>
              <BloomTextInput label="Tên sự kiện" value={eventTitle} onChangeText={setEventTitle} placeholder="Một ngày đáng nhớ…" leftIcon="sparkles-outline" returnKeyType="next" />
              <BloomDatePicker
                label={recurrence === "yearly" ? "Ngày gốc / ngày kỷ niệm" : "Ngày diễn ra"}
                selectedDate={eventDate}
                onDateChange={setEventDate}
                minimumDate={recurrence === "yearly" ? undefined : today}
                leftIcon="calendar-outline"
              />

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Thời gian</Text>
                <View style={styles.timeModeRow}>
                  <Pressable onPress={() => { setAllDay(true); setShowTimePicker(false); }} style={[styles.timeMode, allDay && styles.timeModeActive]}><Text style={[styles.timeModeText, allDay && styles.timeModeTextActive]}>Cả ngày</Text></Pressable>
                  <Pressable onPress={() => setAllDay(false)} style={[styles.timeMode, !allDay && styles.timeModeActive]}><Text style={[styles.timeModeText, !allDay && styles.timeModeTextActive]}>Có giờ</Text></Pressable>
                </View>
                {!allDay && (
                  <>
                    <Pressable onPress={() => setShowTimePicker(true)} style={styles.timeButton}>
                      <Ionicons name="time-outline" size={19} color={COLORS.primary} />
                      <Text style={styles.timeButtonText}>{String(eventTime.getHours()).padStart(2, "0")}:{String(eventTime.getMinutes()).padStart(2, "0")}</Text>
                      <Ionicons name="chevron-down" size={17} color={COLORS.secondaryText} />
                    </Pressable>
                    {showTimePicker && (
                      <DateTimePicker
                        value={eventTime}
                        mode="time"
                        is24Hour
                        onChange={(_, value) => {
                          if (Platform.OS === "android") setShowTimePicker(false);
                          if (value) setEventTime(value);
                        }}
                      />
                    )}
                  </>
                )}
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Loại sự kiện</Text>
                <View style={styles.typeWrap}>{EVENT_TYPES.map((item) => {
                  const active = eventType === item.key;
                  return <Pressable key={item.key} onPress={() => {
                    setEventType(item.key);
                    if ((item.key === "birthday" || item.key === "anniversary") && recurrence === "none") setRecurrence("yearly");
                  }} style={[styles.typeChip, active && styles.typeChipActive]}><Ionicons name={item.icon} size={15} color={active ? COLORS.white : COLORS.primaryText} /><Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{item.label}</Text></Pressable>;
                })}</View>
              </View>

              <FamilyPersonMultiPicker
                label="Person liên quan"
                hint="Gắn người trong phả hệ để sự kiện xuất hiện trong Dòng thời gian của họ."
                persons={familyPersons}
                selectedIds={personIds}
                onChange={setPersonIds}
              />

              <EventParticipantsPicker mode={participantsMode} selectedIds={participantIds} members={members} onModeChange={(next) => { setParticipantsMode(next); if (next === "all") setParticipantIds([]); }} onSelectedIdsChange={setParticipantIds} />

              <BloomTextInput label="Mô tả (không bắt buộc)" value={eventDescription} onChangeText={setEventDescription} placeholder="Một chút ghi chú cho cả nhà…" leftIcon="create-outline" multiline />
              <BloomTextInput label="Địa điểm (không bắt buộc)" value={eventLocation} onChangeText={setEventLocation} placeholder="Mình gặp nhau ở đâu?" leftIcon="location-outline" />

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Lặp lại</Text>
                <View style={styles.timeModeRow}>
                  <Pressable onPress={() => setRecurrence("none")} style={[styles.timeMode, recurrence === "none" && styles.timeModeActive]}><Text style={[styles.timeModeText, recurrence === "none" && styles.timeModeTextActive]}>Một lần</Text></Pressable>
                  <Pressable onPress={() => setRecurrence("yearly")} style={[styles.timeMode, recurrence === "yearly" && styles.timeModeActive]}><Text style={[styles.timeModeText, recurrence === "yearly" && styles.timeModeTextActive]}>Mỗi năm</Text></Pressable>
                </View>
              </View>

              <BloomButton title="Đăng sự kiện & tiếp tục" icon="sparkles-outline" onPress={publishEvent} customStyle={styles.publishButton} />
            </BloomKeyboardScreen>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 28 },
  addButton: { width: 52, height: 52, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.22, shadowRadius: 10, elevation: 4 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  segment: { flexDirection: "row", gap: 8, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 5, marginBottom: 16 },
  segmentItem: { flex: 1, minHeight: 42, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  segmentActive: { backgroundColor: COLORS.primary },
  segmentText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  segmentTextActive: { color: COLORS.white },
  moderationButton: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  moderationIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  moderationCopy: { flex: 1, minWidth: 0 },
  moderationTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  moderationHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14 },
  hiddenCount: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  hiddenCountText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  calendarCard: { padding: 13, marginBottom: 20 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  monthCopy: { alignItems: "center" },
  monthTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  yearText: { marginTop: 2, color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekLabel: { width: "14.2857%", textAlign: "center", color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  daySlot: { width: "14.2857%", height: 48, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: COLORS.primary },
  dayToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  dayText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "700" },
  daySelectedText: { color: COLORS.white, fontWeight: "900" },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, position: "absolute", bottom: 3 },
  eventDotSelected: { backgroundColor: COLORS.primaryText },
  sectionHeaderWrap: { marginTop: 2 },
  sectionHeaderList: { backgroundColor: COLORS.softSurface, paddingTop: 10 },
  itemGap: { height: 10 },
  sectionGap: { height: 10 },
  moreButton: { marginTop: 8, minHeight: 44 },
  loading: { minHeight: 110, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(74,45,55,0.34)", justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", minHeight: "68%", backgroundColor: COLORS.white, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden" },
  moderationSheet: { minHeight: "42%", maxHeight: "78%" },
  moderationEmpty: { paddingHorizontal: 18, paddingVertical: 18 },
  moderationList: { paddingHorizontal: 18, paddingBottom: 28, gap: 10 },
  hiddenEventRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.softSurface, padding: 12 },
  hiddenEventCopy: { flex: 1, minWidth: 0 },
  hiddenEventTitle: { color: COLORS.primaryText, fontSize: 13, fontWeight: "900" },
  hiddenEventMeta: { marginTop: 3, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13 },
  restoreButton: { minHeight: 38, flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 14, borderWidth: 1, borderColor: COLORS.primary, paddingHorizontal: 10 },
  restoreButtonText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900" },
  sheetHandle: { width: 78, height: 6, borderRadius: 3, backgroundColor: COLORS.border, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 18, paddingBottom: 12 },
  sheetHeaderCopy: { flex: 1 },
  sheetEyebrow: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8 },
  sheetTitle: { marginTop: 4, color: COLORS.primaryText, fontSize: 24, fontWeight: "900" },
  closeButton: { width: 48, height: 48, borderRadius: 18, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  formKeyboard: { flex: 1 },
  formContent: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 38, gap: 17 },
  fieldBlock: { gap: 10 },
  fieldLabel: { color: COLORS.primaryText, fontSize: 14, fontWeight: "800" },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { minHeight: 42, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "800" },
  typeChipTextActive: { color: COLORS.white },
  timeModeRow: { flexDirection: "row", gap: 9 },
  timeMode: { flex: 1, minHeight: 44, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  timeModeActive: { borderColor: COLORS.primary, backgroundColor: "#FFF7FA" },
  timeModeText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "800" },
  timeModeTextActive: { color: COLORS.primaryText },
  timeButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  timeButtonText: { flex: 1, color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  publishButton: { marginTop: 2 },
});
