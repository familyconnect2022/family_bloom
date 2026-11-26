import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { useTabStartupTask } from "../../context/TabStartupContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { ActivityIndicator, FlatList, Modal, Pressable, SectionList, StyleSheet, useWindowDimensions, View,  } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { BloomKeyboardScreen } from "../../components/layout/BloomKeyboardScreen";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { EventCard } from "../../components/events/EventCard";
import { EventParticipantsPicker } from "../../components/events/EventParticipantsPicker";
import { FamilyPersonMultiPicker } from "../../components/familyGraph/FamilyPersonMultiPicker";
import { BloomButton } from "../../components/ui/BloomButtonComponents";
import { BloomDatePicker, BloomTextInput } from "../../components/ui/BloomInputComponents";
import { BloomTimePicker } from "../../components/ui/BloomTimePicker";
import { BloomFullScreenFlow } from "../../components/ui/BloomFullScreenFlow";
import { BloomCard, BloomEmptyState, BloomSectionHeader } from "../../components/ui/BloomPageComponents";
import { BloomHeroHeader } from "../../components/ui/BloomHeroHeader";
import { BloomRouteEntrance } from "../../motion/BloomMotion";
import { BloomActionCard } from "../../components/ui/BloomActionCard";
import { BLOOM_CARD_TITLE_SIZE, BLOOM_CARD_TITLE_LINE_HEIGHT } from "../../components/ui/BloomCardTypography";
import { StatusBar } from "expo-status-bar";
import { useBloomToast } from "../../components/ui/BloomToast";
import { useBloomDialog } from "../../components/ui/BloomDialogProvider";
import { useBloomTaskToast } from "../../hooks/ui/useBloomTaskToast";
import { parseAppError } from "../../constants/errorConstants";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useTabLiveEffect } from "../../context/TabRuntimeContext";
import { useFamilyEvents } from "../../hooks/family/useFamilyEvents";
import { useFamilyMembers } from "../../hooks/family/useFamilyMembers";
import { useFamilyPersonDirectory } from "../../hooks/family/useFamilyPersonDirectory";
import { calendarService } from "../../services/calendar/calendarService";
import { buildCalendarMonthProjection, getDaySummary, monthKey, type CalendarMonthProjection, type DaySummary } from "../../services/calendar/calendarIndex";
import { activityService } from "../../services/activity/activityService";
import { smartReminderService } from "../../services/activity/smartReminderService";
import { eventService } from "../../services/event/eventService";
import { localNotificationService } from "../../services/push/localNotificationService";
import { subscribeSharedRealtime } from "../../services/realtime/sharedRealtimeRegistry";
import type { CreateEventInput, EventNotificationLevel, EventParticipantsMode, EventType, FamilyEvent, FamilyMember } from "../../types";
import { eventDateParts, isDateBeforeToday } from "../../utils/event";
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


const WEEK_DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const MONTHS = [
  "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
  "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
];
const EVENT_TYPES: Array<{ key: EventType; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "family", label: "Gia đình", icon: "people-outline" },
  { key: "birthday", label: "Sinh nhật", icon: "gift-outline" },
  { key: "memorial", label: "Giỗ", icon: "flower-outline" },
  { key: "anniversary", label: "Kỷ niệm", icon: "heart-outline" },
  { key: "gathering", label: "Họp mặt", icon: "home-outline" },
  { key: "wedding", label: "Cưới hỏi", icon: "heart-circle-outline" },
  { key: "travel", label: "Chuyến đi", icon: "airplane-outline" },
  { key: "personal", label: "Cá nhân", icon: "person-outline" },
  { key: "other", label: "Khác", icon: "sparkles-outline" },
];

const NOTIFICATION_LEVELS: Array<{ key: EventNotificationLevel; label: string; hint: string }> = [
  { key: "normal", label: "Bình thường", hint: "Xuất hiện nhẹ nhàng trong Chuyện trong nhà." },
  { key: "notable", label: "Khá quan trọng", hint: "Bloom sẽ làm nổi bật để cả nhà dễ chú ý." },
  { key: "important", label: "Quan trọng", hint: "Ưu tiên hiển thị và dùng cho nhắc việc sau này." },
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

const sameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const addLocalDays = (date: Date, days: number) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
  next.setDate(next.getDate() + days);
  return next;
};

const roundUpFiveMinutes = (base: Date) => {
  const next = new Date(base);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % 5;
  next.setMinutes(next.getMinutes() + (remainder === 0 ? 5 : 5 - remainder));
  return next;
};

const defaultEventTimeForDate = (date: Date) => {
  const now = new Date();
  const preferred = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 18, 0, 0, 0);
  const clock = sameLocalDay(date, now) && preferred.getTime() <= now.getTime() ? roundUpFiveMinutes(now) : preferred;
  return new Date(2026, 0, 1, clock.getHours(), clock.getMinutes(), 0, 0);
};



type CalendarDayCellProps = {
  day: number;
  selected: boolean;
  summary: DaySummary;
  isToday: boolean;
  onSelectDay: (day: number) => void;
};

const CalendarDayCell = memo(function CalendarDayCell({
  day,
  selected,
  summary,
  isToday,
  onSelectDay,
}: CalendarDayCellProps) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <Pressable onPress={() => onSelectDay(day)} style={__a3_styles.daySlot}>
      <View style={[__a3_styles.dayCircle, selected && __a3_styles.daySelected, isToday && !selected && __a3_styles.dayToday, selected && { backgroundColor: __a3Colors.primary, borderColor: __a3Colors.border }]}>
        <Text style={[__a3_styles.dayText, selected && __a3_styles.daySelectedText]}>{day}</Text>
      </View>
      {summary.eventCount > 0 ? <View style={[__a3_styles.eventDot, selected && __a3_styles.eventDotSelected]} /> : null}
    </Pressable>
  );
});

type CalendarMonthGridProps = {
  monthIndex: number;
  year: number;
  leadingSlots: number;
  daysInMonth: number;
  selectedDay: number;
  monthProjection: CalendarMonthProjection;
  todayYear: number;
  todayMonth: number;
  todayDay: number;
  onSelectDay: (day: number) => void;
  onMoveMonth: (offset: number) => void;
};

const CalendarMonthGrid = memo(function CalendarMonthGrid({
  monthIndex,
  year,
  leadingSlots,
  daysInMonth,
  selectedDay,
  monthProjection,
  todayYear,
  todayMonth,
  todayDay,
  onSelectDay,
  onMoveMonth,
}: CalendarMonthGridProps) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  return (
    <BloomCard style={__a3_styles.calendarCard}>
      <View style={__a3_styles.calendarHeader}>
        <Pressable onPress={() => onMoveMonth(-1)} hitSlop={10} style={__a3_styles.monthButton}><Ionicons name="chevron-back" size={20} color={__a3Colors.primaryText} /></Pressable>
        <View style={__a3_styles.monthCopy}><Text style={__a3_styles.monthTitle}>{MONTHS[monthIndex]}</Text><Text style={__a3_styles.yearText}>{year}</Text></View>
        <Pressable onPress={() => onMoveMonth(1)} hitSlop={10} style={__a3_styles.monthButton}><Ionicons name="chevron-forward" size={20} color={__a3Colors.primaryText} /></Pressable>
      </View>
      <View style={__a3_styles.weekRow}>{WEEK_DAYS.map((day) => <Text key={day} style={__a3_styles.weekLabel}>{day}</Text>)}</View>
      <View style={__a3_styles.daysGrid}>
        {Array.from({ length: leadingSlots }).map((_, index) => <View key={`blank-${index}`} style={__a3_styles.daySlot} />)}
        {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => (
          <CalendarDayCell
            key={day}
            day={day}
            selected={selectedDay === day}
            summary={getDaySummary(monthProjection, day)}
            isToday={year === todayYear && monthIndex === todayMonth && day === todayDay}
            onSelectDay={onSelectDay}
          />
        ))}
      </View>
    </BloomCard>
  );
});

type PlannerEventSection = {
  key: "upcoming" | "past";
  title: string;
  subtitle: string;
  data: FamilyEvent[];
};

type PlannerShellProps = {
  mode: PlannerMode;
  modeProgress: SharedValue<number>;
  canModerate: boolean;
  hiddenCount: number;
  onModerate: () => void;
  onPreviewMode: (mode: PlannerMode) => void;
  onChangeMode: (mode: PlannerMode) => void;
};

const PlannerShell = memo(function PlannerShell({
  mode,
  modeProgress,
  canModerate,
  hiddenCount,
  onModerate,
  onPreviewMode,
  onChangeMode,
}: PlannerShellProps) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const segmentWidth = useSharedValue(0);
  const segmentIndicatorStyle = useAnimatedStyle(() => {
    const innerWidth = Math.max(0, segmentWidth.value - 10);
    const gap = 8;
    const itemWidth = Math.max(0, (innerWidth - gap) / 2);
    return {
      width: itemWidth,
      transform: [{ translateX: 5 + modeProgress.value * (itemWidth + gap) }],
    };
  });

  return (
    <>
      <BloomRouteEntrance>
      <BloomHeroHeader
        eyebrow="LỊCH NHÀ"
        title="Những ngày mình mong chờ"
        subtitle="Giữ ngày quan trọng, hẹn nhau một dịp và để Bloom nhắc cả nhà đúng lúc."
        variant="event"
        compact
        roundedBottom

      />
      </BloomRouteEntrance>

      <View style={__a3_styles.topInset}>
        <View
          style={__a3_styles.segment}
          onLayout={(event) => { segmentWidth.value = event.nativeEvent.layout.width; }}
        >
          <Animated.View pointerEvents="none" style={[__a3_styles.segmentIndicator, { backgroundColor: __a3Colors.primary }, segmentIndicatorStyle]} />
          <Pressable
            onPressIn={() => onPreviewMode("calendar")}
            onPress={() => onChangeMode("calendar")}
            style={__a3_styles.segmentItem}
          >
            <Ionicons name="calendar-outline" size={16} color={mode === "calendar" ? __a3Colors.onPrimary : __a3Colors.primaryText} />
            <Text style={[__a3_styles.segmentText, mode === "calendar" && __a3_styles.segmentTextActive]}>Lịch</Text>
          </Pressable>
          <Pressable
            onPressIn={() => onPreviewMode("list")}
            onPress={() => onChangeMode("list")}
            style={__a3_styles.segmentItem}
          >
            <Ionicons name="list-outline" size={16} color={mode === "list" ? __a3Colors.onPrimary : __a3Colors.primaryText} />
            <Text style={[__a3_styles.segmentText, mode === "list" && __a3_styles.segmentTextActive]}>Sự kiện</Text>
          </Pressable>
        </View>
        {canModerate && (
          <Pressable onPress={onModerate} style={({ pressed }) => [__a3_styles.moderationButton, pressed && __a3_styles.pressed]}>
            <View style={__a3_styles.moderationIcon}><Ionicons name="shield-checkmark-outline" size={18} color={__a3Colors.primary} /></View>
            <View style={__a3_styles.moderationCopy}>
              <Text style={__a3_styles.moderationTitle}>Kiểm duyệt sự kiện</Text>
              <Text style={__a3_styles.moderationHint}>Người giữ nhà chỉ giúp ẩn hoặc đưa ngày này trở lại · nội dung vẫn thuộc người tạo</Text>
            </View>
            <View style={__a3_styles.hiddenCount}><Text style={__a3_styles.hiddenCountText}>{hiddenCount}</Text></View>
          </Pressable>
        )}
      </View>
    </>
  );
});

type PlannerEventRowProps = {
  event: FamilyEvent;
  memberByUid: Map<string, FamilyMember>;
  pending?: boolean;
  onOpenEvent: (event: FamilyEvent) => void;
};

const PlannerEventRow = memo(function PlannerEventRow({ event, memberByUid, pending = false, onOpenEvent }: PlannerEventRowProps) {
  const __a3_styles = useA3LegacyStyles(styles);

  
  const handlePress = useCallback(() => onOpenEvent(event), [event, onOpenEvent]);
  return (
    <View style={__a3_styles.eventItemInset}>
      <EventCard event={event} memberByUid={memberByUid} pending={pending} onPress={handlePress} />
    </View>
  );
});

const PlannerItemGap = () => {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (<View style={__a3_styles.itemGap} />);
};
const PlannerSectionGap = () => {
  const __a3_styles = useA3LegacyStyles(styles);

  
  
  return (<View style={__a3_styles.sectionGap} />);
};

type CalendarPanelProps = {
  shellProps: PlannerShellProps;
  active: boolean;
  monthIndex: number;
  year: number;
  month: number;
  leadingSlots: number;
  daysInMonth: number;
  selectedDay: number;
  monthProjection: CalendarMonthProjection;
  todayYear: number;
  todayMonth: number;
  todayDay: number;
  selectedEvents: FamilyEvent[];
  loadingMonth: boolean;
  memberByUid: Map<string, FamilyMember>;
  onSelectDay: (day: number) => void;
  onMoveMonth: (offset: number) => void;
  onOpenEvent: (event: FamilyEvent) => void;
};

const CalendarPanel = memo(function CalendarPanel({
  shellProps,
  active,
  monthIndex,
  year,
  month,
  leadingSlots,
  daysInMonth,
  selectedDay,
  monthProjection,
  todayYear,
  todayMonth,
  todayDay,
  selectedEvents,
  loadingMonth,
  memberByUid,
  onSelectDay,
  onMoveMonth,
  onOpenEvent,
}: CalendarPanelProps) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  const themeRevision = useBloomThemeRevision();
  const header = useMemo(() => (
    <>
      <PlannerShell {...shellProps} />
    <View style={__a3_styles.calendarInset}>
      <CalendarMonthGrid
        monthIndex={monthIndex}
        year={year}
        leadingSlots={leadingSlots}
        daysInMonth={daysInMonth}
        selectedDay={selectedDay}
        monthProjection={monthProjection}
        todayYear={todayYear}
        todayMonth={todayMonth}
        todayDay={todayDay}
        onSelectDay={onSelectDay}
        onMoveMonth={onMoveMonth}
      />
      <View style={__a3_styles.sectionHeaderWrap}>
        <BloomSectionHeader
          title={`Ngày ${selectedDay}/${month}`}
          subtitle={selectedEvents.length ? `${selectedEvents.length} sự kiện trong ngày` : "Một ngày đang thật nhẹ nhàng"}
        />
      </View>
    </View>
    </>
  ), [themeRevision, shellProps, daysInMonth, leadingSlots, month, monthIndex, monthProjection, onMoveMonth, onSelectDay, selectedDay, selectedEvents.length, todayDay, todayMonth, todayYear, year, __a3_styles]);

  const empty = loadingMonth ? (
    <View style={__a3_styles.loading}><ActivityIndicator color={__a3Colors.primary} /><Text style={__a3_styles.loadingText}>Bloom đang xem lịch nhà…</Text></View>
  ) : (
    <BloomEmptyState icon="sunny-outline" title="Chưa có lịch cho ngày này" description="Chọn một ngày khác hoặc gieo một sự kiện mới cho cả nhà." />
  );

  const renderEvent = useCallback(({ item }: { item: FamilyEvent }) => (
    <PlannerEventRow
      event={item}
      memberByUid={memberByUid}
      pending={item.id.startsWith("pending-")}
      onOpenEvent={onOpenEvent}
    />
  ), [memberByUid, onOpenEvent]);

  return (
    <FlatList
      style={__a3_styles.panelList}
      data={selectedEvents}
      keyExtractor={(item) => item.id}
      renderItem={renderEvent}
      ListHeaderComponent={header}
      ListEmptyComponent={<View style={__a3_styles.emptyInset}>{empty}</View>}
      ItemSeparatorComponent={PlannerItemGap}
      contentContainerStyle={__a3_styles.panelContent}
      showsVerticalScrollIndicator={false}
      scrollEnabled={active}
      removeClippedSubviews={false}
      initialNumToRender={4}
      maxToRenderPerBatch={4}
      updateCellsBatchingPeriod={48}
      windowSize={5}
    />
  );
});

/** Hai empty state riêng; không thêm listener, request hay animation khi danh sách rỗng. */
const PlannerEventEmptyCard = memo(function PlannerEventEmptyCard({
  kind,
  onCreate,
}: {
  kind: "upcoming" | "past";
  onCreate: () => void;
}) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const upcoming = kind === "upcoming";
  return (
    <View
      testID={upcoming ? "planner-upcoming-empty" : "planner-past-empty"}
      style={[__a3_styles.eventEmptyCard, upcoming ? __a3_styles.eventEmptyUpcoming : __a3_styles.eventEmptyPast]}
    >
      <View pointerEvents="none" style={[__a3_styles.eventEmptyGlow, !upcoming && __a3_styles.eventEmptyGlowPast]} />
      <View style={__a3_styles.eventEmptyTop}>
        <View style={[__a3_styles.eventEmptyIconRing, !upcoming && __a3_styles.eventEmptyIconRingPast]}>
          <Ionicons name={upcoming ? "calendar-outline" : "heart-outline"} size={25} color={upcoming ? __a3Colors.primary : __a3Colors.primary} />
          <View style={__a3_styles.eventEmptySparkle}>
            <Ionicons name={upcoming ? "sparkles" : "time-outline"} size={12} color={__a3Colors.primary} />
          </View>
        </View>
        <View style={__a3_styles.eventEmptyCopy}>
          <Text style={__a3_styles.eventEmptyEyebrow}>{upcoming ? "MỘT NGÀY VUI ĐANG ĐỢI" : "GÓC KÝ ỨC CỦA NHÀ"}</Text>
          <Text style={__a3_styles.eventEmptyTitle}>{upcoming ? "Chưa có sự kiện sắp tới" : "Chưa có kỷ niệm nào được lưu lại"}</Text>
        </View>
      </View>
      <Text style={__a3_styles.eventEmptyDescription}>
        {upcoming
          ? "Một buổi sum họp, sinh nhật hay lời hẹn nhỏ cũng có thể trở thành ngày cả nhà mong chờ."
          : "Khi một sự kiện trôi qua, những ngày đáng nhớ sẽ được gìn giữ ở đây để cả nhà cùng nhìn lại."}
      </Text>
      {upcoming ? (
        <Pressable
          testID="planner-upcoming-empty-create"
          accessibilityRole="button"
          accessibilityLabel="Thêm sự kiện đầu tiên"
          onPress={onCreate}
          style={({ pressed }) => [__a3_styles.eventEmptyCreate, pressed && __a3_styles.pressed]}
        >
          <Ionicons name="add-circle-outline" size={17} color={__a3Colors.primary} />
          <Text style={__a3_styles.eventEmptyCreateText}>Thêm sự kiện đầu tiên</Text>
          <Ionicons name="arrow-forward" size={15} color={__a3Colors.primary} />
        </Pressable>
      ) : (
        <View style={__a3_styles.eventEmptyPastNote}>
          <Ionicons name="heart" size={12} color={__a3Colors.primary} />
          <Text style={__a3_styles.eventEmptyPastNoteText}>Mỗi ngày bên nhau đều đáng được nhớ</Text>
        </View>
      )}
    </View>
  );
});

type EventsPanelProps = {
  shellProps: PlannerShellProps;
  active: boolean;
  sections: PlannerEventSection[];
  loadingList: boolean;
  loadingMoreUpcoming: boolean;
  loadingMorePast: boolean;
  hasMoreUpcoming: boolean;
  hasMorePast: boolean;
  memberByUid: Map<string, FamilyMember>;
  onCreate: () => void;
  onLoadMoreUpcoming: () => void;
  onLoadMorePast: () => void;
  onOpenEvent: (event: FamilyEvent) => void;
};

const EventsPanel = memo(function EventsPanel({
  shellProps,
  active,
  sections,
  loadingList,
  loadingMoreUpcoming,
  loadingMorePast,
  hasMoreUpcoming,
  hasMorePast,
  memberByUid,
  onCreate,
  onLoadMoreUpcoming,
  onLoadMorePast,
  onOpenEvent,
}: EventsPanelProps) {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const renderEvent = useCallback(({ item }: { item: FamilyEvent }) => (
    <PlannerEventRow event={item} memberByUid={memberByUid} onOpenEvent={onOpenEvent} />
  ), [memberByUid, onOpenEvent]);

  const renderSectionHeader = useCallback(({ section }: { section: PlannerEventSection }) => (
    <View style={__a3_styles.sectionHeaderList}>
      <BloomSectionHeader title={section.title} subtitle={section.subtitle} />
    </View>
  ), [__a3_styles]);

  const renderSectionFooter = useCallback(({ section }: { section: PlannerEventSection }) => {
    const upcoming = section.key === "upcoming";
    const hasMore = upcoming ? hasMoreUpcoming : hasMorePast;
    const busy = upcoming ? loadingMoreUpcoming : loadingMorePast;
    // SectionList vẫn render footer cho section data=[], vì vậy hai phần
    // "Sắp tới"/"Đã qua" có empty state độc lập (không dùng ListEmptyComponent).
    if (section.data.length === 0) {
      return loadingList ? null : <View style={__a3_styles.eventEmptyInset}><PlannerEventEmptyCard kind={section.key} onCreate={onCreate} /></View>;
    }
    if (!hasMore) return null;
    return (
      <BloomButton
        title={busy ? "Đang mở thêm…" : upcoming ? "Xem thêm sự kiện sắp tới" : "Xem thêm kỷ niệm đã qua"}
        variant="transparent"
        isLoading={busy}
        onPress={upcoming ? onLoadMoreUpcoming : onLoadMorePast}
        customStyle={__a3_styles.moreButton}
      />
    );
  }, [hasMorePast, hasMoreUpcoming, loadingList, loadingMorePast, loadingMoreUpcoming, onCreate, onLoadMorePast, onLoadMoreUpcoming, __a3_styles]);

  return (
    <SectionList
      style={__a3_styles.panelList}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={renderEvent}
      ItemSeparatorComponent={PlannerItemGap}
      SectionSeparatorComponent={PlannerSectionGap}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      ListHeaderComponent={(
        <>
        <PlannerShell {...shellProps} />
        <View style={__a3_styles.eventListHeader}>
          <BloomActionCard testID="planner-create-event" icon="calendar-outline" title="Thêm sự kiện" subtitle="Hẹn một ngày vui để cả nhà cùng mong chờ" onPress={onCreate} />
          {loadingList && sections.every((section) => section.data.length === 0) ? (
            <View style={__a3_styles.loading}><ActivityIndicator color={__a3Colors.primary} /><Text style={__a3_styles.loadingText}>Bloom đang xếp lịch…</Text></View>
          ) : null}
        </View>
        </>
      )}
      contentContainerStyle={__a3_styles.panelContent}
      showsVerticalScrollIndicator={false}
      stickySectionHeadersEnabled={false}
      scrollEnabled={active}
      removeClippedSubviews={false}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={52}
      windowSize={5}
    />
  );
});

export default function PlannerScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const params = useLocalSearchParams<{ personId?: string }>();
  const { activeFamilyId, user, userProfile, families } = useAuth();
  const { showToast } = useBloomToast();
  const { confirm } = useBloomDialog();
  const { startTask, finishTask, failTask } = useBloomTaskToast();
  const today = useMemo(() => new Date(), []);
  const { width: windowWidth } = useWindowDimensions();
  const [mode, setMode] = useState<PlannerMode>("calendar");
  // The Events panel is mounted from the first paint but its heavier realtime
  // list is primed only after the user opens it once. From then on both inner
  // Planner panels stay warm, so Calendar <-> Events switches never tear down
  // and recreate their virtualized lists or scroll state.
  const [listPrimed, setListPrimed] = useState(false);
  const [panelWidth, setPanelWidth] = useState(() => Math.max(1, Math.round(windowWidth)));
  // Navigation chrome is deliberately UI-thread owned. React controls which
  // panel is interactive; Reanimated owns the visual transition so a heavy
  // render cannot stall the segment pill or persistent panel track.
  const plannerModeProgress = useSharedValue(0);
  const plannerOptimisticModeRef = useRef<PlannerMode>("calendar");
  const panelWidthValue = useSharedValue(Math.max(1, Math.round(windowWidth)));
  const panelTrackStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -plannerModeProgress.value * panelWidthValue.value }],
  }));
  const [viewDate, setViewDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [pendingEvents, setPendingEvents] = useState<FamilyEvent[]>([]);
  const [composerVisible, setComposerVisible] = useState(false);
  const createLock = useRef(false);
  const createAttempt = useRef<{ familyId: string; uid: string; id: string } | null>(null);
  const createScope = useRef("");
  createScope.current = `${activeFamilyId ?? ""}:${user?.uid ?? ""}`;
  const [composerDirty, setComposerDirty] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date>(today);
  const [eventTime, setEventTime] = useState<Date>(() => new Date(2026, 0, 1, 18, 0));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [eventType, setEventType] = useState<EventType>("family");
  const [notificationLevel, setNotificationLevel] = useState<EventNotificationLevel>("normal");
  const [eventDescription, setEventDescription] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "yearly">("none");
  const [participantsMode, setParticipantsMode] = useState<EventParticipantsMode>("all");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [personIds, setPersonIds] = useState<string[]>([]);
  const [hiddenEvents, setHiddenEvents] = useState<FamilyEvent[]>([]);
  const [moderationVisible, setModerationVisible] = useState(false);
  const [moderationBusyId, setModerationBusyId] = useState<string | null>(null);
  const membership = families.find((item) => item.familyId === activeFamilyId);
  const canModerate = membership?.role === "owner" || membership?.role === "admin";

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
    // Calendar stays warm for the lifetime of the Planner tab. The Events data
    // starts on first visit and remains warm afterwards. Inner mode changes no
    // longer own listener lifecycle, which prevents a burst of unsubscribe /
    // subscribe / snapshot state work on every Calendar <-> Events tap.
    calendarEnabled: true,
    listEnabled: listPrimed,
    runtimeTabId: "planner",
  });
  const { members, memberByUid } = useFamilyMembers(activeFamilyId, { runtimeTabId: "planner" });
  // Only the visible inner panel participates in startup readiness. The other
  // panel can stay mounted/warm without delaying the visible paint.
  const plannerReady = mode === "calendar" ? !loadingMonth : !loadingList;
  useTabStartupTask("planner", plannerReady);
  const { persons: familyPersons } = useFamilyPersonDirectory(activeFamilyId, composerVisible || !!params.personId);

  useEffect(() => {
    setHiddenEvents([]);
    setModerationVisible(false);
  }, [activeFamilyId, canModerate]);

  useTabLiveEffect("planner", (scope) => {
    if (!activeFamilyId || !canModerate || !moderationVisible) return;
    return subscribeSharedRealtime<FamilyEvent[]>({
      key: `planner.moderation_hidden:${activeFamilyId}`,
      listenerName: "planner.moderation_hidden",
      start: (onData, onError) => eventService.subscribeHiddenForModeration(activeFamilyId, onData, onError),
      onData: (items) => {
        if (!scope.isCurrent()) return;
        setHiddenEvents((current) => {
          const unchanged = current.length === items.length
            && current.every((event, index) => event.id === items[index]?.id && event.updatedAt === items[index]?.updatedAt);
          return unchanged ? current : items;
        });
      },
      onError: () => { if (scope.isCurrent()) setHiddenEvents((current) => current.length ? [] : current); },
    });
  }, [activeFamilyId, canModerate, moderationVisible]);

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

  const monthProjectionCacheRef = useRef(new Map<string, CalendarMonthProjection>());
  const monthProjection = useMemo(() => {
    const key = monthKey(year, month);
    const cache = monthProjectionCacheRef.current;
    const next = buildCalendarMonthProjection(visibleMonthEvents, year, month, cache.get(key));
    cache.set(key, next);
    while (cache.size > 5) cache.delete(cache.keys().next().value as string);
    return next;
  }, [month, visibleMonthEvents, year]);
  const visibleEventById = useMemo(
    () => new Map(visibleMonthEvents.map((event) => [event.id, event] as const)),
    [visibleMonthEvents],
  );
  const selectedEvents = useMemo(
    () => (monthProjection.byDay.get(selectedDay) ?? []).map((id) => visibleEventById.get(id)).filter((event): event is FamilyEvent => !!event),
    [monthProjection, selectedDay, visibleEventById],
  );

  const moveMonth = useCallback((offset: number) => {
    const next = new Date(year, monthIndex + offset, 1);
    setViewDate(next);
    const currentMonth = next.getFullYear() === today.getFullYear() && next.getMonth() === today.getMonth();
    setSelectedDay(currentMonth ? today.getDate() : 1);
  }, [monthIndex, today, year]);
  const selectDay = useCallback((day: number) => setSelectedDay(day), []);
  const previewMode = useCallback((nextMode: PlannerMode) => {
    plannerOptimisticModeRef.current = nextMode;
    plannerModeProgress.value = withTiming(nextMode === "list" ? 1 : 0, {
      duration: 170,
      easing: Easing.out(Easing.cubic),
    });
  }, [plannerModeProgress]);
  const changeMode = useCallback((nextMode: PlannerMode) => {
    // Press-in normally already launched the UI-thread motion. Do not restart
    // the timing on the later JS press commit; only start it here for a
    // programmatic/direct commit that had no optimistic preview.
    if (plannerOptimisticModeRef.current !== nextMode) previewMode(nextMode);
    if (nextMode === "list") setListPrimed(true);
    setMode((current) => current === nextMode ? current : nextMode);
  }, [previewMode]);
  const capturePanelWidth = useCallback((nextWidth: number) => {
    const rounded = Math.max(1, Math.round(nextWidth));
    panelWidthValue.value = rounded;
    setPanelWidth((current) => current === rounded ? current : rounded);
  }, [panelWidthValue]);

  const openComposer = useCallback(() => {
    if (createLock.current) return;
    createAttempt.current = null;
    // Nút tạo mới thuộc tab Sự kiện: bắt đầu từ hôm nay, không kế thừa
    // một ngày đã chọn trong tab Lịch từ lần xem trước.
    const initialDate = new Date();
    setEventDate(new Date(initialDate));
    setEventTime(defaultEventTimeForDate(initialDate));
    setAllDay(true);
    setEventTitle("");
    setEventType("family");
    setNotificationLevel("normal");
    setEventDescription("");
    setEventLocation("");
    setRecurrence("none");
    setParticipantsMode("all");
    setParticipantIds([]);
    setPersonIds([]);
    setShowTimePicker(false);
    setComposerDirty(false);
    setComposerVisible(true);
  }, []);

  const closeComposerNow = useCallback(() => {
    if (createLock.current) return;
    createAttempt.current = null;
    setShowTimePicker(false);
    setComposerVisible(false);
    setComposerDirty(false);
  }, []);

  const requestCloseComposer = useCallback(() => {
    if (!composerDirty) {
      closeComposerNow();
      return;
    }
    void confirm({
      eyebrow: "SỰ KIỆN ĐANG VIẾT",
      title: "Hủy sự kiện này?",
      message: "Những điều bạn vừa nhập chưa được lưu. Bloom có thể giữ trang này nếu bạn muốn viết tiếp.",
      icon: "calendar-outline",
      cancelLabel: "Viết tiếp",
      confirmLabel: "Hủy thay đổi",
      destructive: true,
    }).then((discard) => { if (discard) closeComposerNow(); });
  }, [closeComposerNow, composerDirty, confirm]);

  useEffect(() => {
    const requestedPersonId = typeof params.personId === "string" ? params.personId.trim() : "";
    if (!requestedPersonId || !activeFamilyId || createLock.current) return;
    createAttempt.current = null;
    const selected = new Date(year, monthIndex, selectedDay, 12, 0, 0, 0);
    const initialDate = isDateBeforeToday(selected, today) ? today : selected;
    setEventDate(new Date(initialDate));
    setEventTime(defaultEventTimeForDate(initialDate));
    setAllDay(true);
    setEventTitle("");
    setEventType("family");
    setNotificationLevel("normal");
    setEventDescription("");
    setEventLocation("");
    setRecurrence("none");
    setParticipantsMode("all");
    setParticipantIds([]);
    setPersonIds([requestedPersonId]);
    setShowTimePicker(false);
    setComposerDirty(false);
    setComposerVisible(true);
    router.setParams({ personId: undefined } as never);
  }, [activeFamilyId, monthIndex, params.personId, router, selectedDay, today, year]);

  const openEvent = useCallback((event: FamilyEvent) => {
    if (event.id.startsWith("pending-")) return;
    router.push(`/event/${event.id}` as never);
  }, [router]);

  const publishEvent = () => {
    if (!activeFamilyId || !user || createLock.current) return;
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
    if (!allDay && recurrence !== "yearly" && date.getTime() <= Date.now()) {
      showToast({ title: "Giờ này đã qua rồi 🌿", message: "Nếu chọn hôm nay, hãy chọn một giờ sau thời điểm hiện tại.", type: "warning", duration: 3000 });
      return;
    }
    const parts = eventDateParts(date.toISOString());
    if (!parts) return;

    const input: CreateEventInput = {
      title,
      dateISO: date.toISOString(),
      allDay,
      eventType,
      notificationLevel,
      participantsMode,
      participantIds: participantsMode === "selected" ? participantIds : [],
      personIds,
      recurrence,
      description: eventDescription.trim() || null,
      location: eventLocation.trim() || null,
      createdByUid: user.uid,
    };

    const timestamp = new Date().toISOString();
    if (!createAttempt.current || createAttempt.current.familyId !== activeFamilyId || createAttempt.current.uid !== user.uid) createAttempt.current = {familyId:activeFamilyId,uid:user.uid,id:calendarService.newEventId(activeFamilyId)};
    const attempt = createAttempt.current;
    const scope = createScope.current;
    createLock.current = true;
    const tempId = `pending-${attempt.id}`;
    const optimisticEvent: FamilyEvent = {
      id: tempId,
      familyId: activeFamilyId,
      title,
      dateISO: input.dateISO,
      ...parts,
      allDay,
      eventType,
      notificationLevel,
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
    setComposerDirty(false);
    // Sau khi đăng từ tab Sự kiện, giữ nguyên tab để người dùng thấy danh sách.
    startTask({ title: "Bloom đang gieo sự kiện…", message: title });

    void calendarService.createEvent(activeFamilyId, input, attempt.id)
      .then((createdEvent) => {
        if (createAttempt.current === attempt) createAttempt.current = null;
        setPendingEvents((current) => current.filter((item) => item.id !== tempId));
        smartReminderService.invalidate(activeFamilyId);
        void activityService.createForEvent(createdEvent, userProfile?.displayName || "Một thành viên").catch(() => undefined);
        if (userProfile?.pushNotificationsEnabled) {
          // Android 13+ requires a runtime notification permission. Ask only after
          // the user has created an event that can actually use local reminders.
          void localNotificationService.setEnabled(true).then((permission) => {
            if (!permission.permissionGranted) {
              showToast({
                title: "Android chưa cho phép thông báo",
                message: "Sự kiện đã được lưu. Hãy bật quyền Thông báo cho Family Bloom để nhận lời nhắc trên máy này.",
                type: "warning",
                duration: 3600,
              });
              return;
            }
            return localNotificationService.syncSmartReminders({
              uid: user.uid,
              families,
              preferences: userProfile.smartReminderPreferences,
              enabled: true,
              force: true,
            });
          }).catch(() => undefined);
        }
        finishTask({ title: "Sự kiện đã nở trong lịch 🌸", message: title });
      })
      .catch((error) => {
        setPendingEvents((current) => current.filter((item) => item.id !== tempId));
        if (createScope.current === scope && createAttempt.current === attempt) {setComposerVisible(true);setComposerDirty(true);}
        failTask(error, { title: "Sự kiện chưa lên lịch được", message: title });
      }).finally(() => {createLock.current = false;});
  };

  const listSections = useMemo<PlannerEventSection[]>(() => [
    { key: "upcoming", title: "Sắp tới", subtitle: "Những điều cả nhà đang mong chờ", data: upcomingEvents },
    { key: "past", title: "Đã qua", subtitle: "Những ngày đã trở thành kỷ niệm", data: pastEvents },
  ], [pastEvents, upcomingEvents]);

  const openModeration = useCallback(() => setModerationVisible(true), []);

  // Header Lịch/Sự kiện nằm trong danh sách cuộn của từng panel, không còn fixed ở root.
  // Điều này giữ virtualization riêng cho Calendar (FlatList) và Events (SectionList).
  const plannerShellProps = useMemo<PlannerShellProps>(() => ({
    mode, modeProgress: plannerModeProgress, canModerate, hiddenCount: hiddenEvents.length,
    onModerate: openModeration, onPreviewMode: previewMode, onChangeMode: changeMode,
  }), [mode, plannerModeProgress, canModerate, hiddenEvents.length, openModeration, previewMode, changeMode]);

  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <View style={__a3_styles.stablePlannerRoot}>
        <View
          style={__a3_styles.panelViewport}
          onLayout={(event) => capturePanelWidth(event.nativeEvent.layout.width)}
        >
          <Animated.View
              style={[
                __a3_styles.panelTrack,
                { width: panelWidth * 2 },
                panelTrackStyle,
              ]}
            >
              <View
                style={[__a3_styles.panelPage, { width: panelWidth }]}
                pointerEvents={mode === "calendar" ? "auto" : "none"}
                accessibilityElementsHidden={mode !== "calendar"}
                importantForAccessibility={mode === "calendar" ? "auto" : "no-hide-descendants"}
              >
                <CalendarPanel
                  shellProps={plannerShellProps}
                  active={mode === "calendar"}
                  monthIndex={monthIndex}
                  year={year}
                  month={month}
                  leadingSlots={leadingSlots}
                  daysInMonth={daysInMonth}
                  selectedDay={selectedDay}
                  monthProjection={monthProjection}
                  todayYear={today.getFullYear()}
                  todayMonth={today.getMonth()}
                  todayDay={today.getDate()}
                  selectedEvents={selectedEvents}
                  loadingMonth={loadingMonth}
                  memberByUid={memberByUid}
                  onSelectDay={selectDay}
                  onMoveMonth={moveMonth}
                  onOpenEvent={openEvent}
                />
              </View>

              <View
                style={[__a3_styles.panelPage, { width: panelWidth }]}
                pointerEvents={mode === "list" ? "auto" : "none"}
                accessibilityElementsHidden={mode !== "list"}
                importantForAccessibility={mode === "list" ? "auto" : "no-hide-descendants"}
              >
                <EventsPanel
                  shellProps={plannerShellProps}
                  active={mode === "list"}
                  sections={listSections}
                  loadingList={loadingList}
                  loadingMoreUpcoming={loadingMoreUpcoming}
                  loadingMorePast={loadingMorePast}
                  hasMoreUpcoming={hasMoreUpcoming}
                  hasMorePast={hasMorePast}
                  memberByUid={memberByUid}
                  onCreate={openComposer}
                  onLoadMoreUpcoming={loadMoreUpcoming}
                  onLoadMorePast={loadMorePast}
                  onOpenEvent={openEvent}
                />
              </View>
            </Animated.View>
        </View>
      </View>

      {moderationVisible && <BloomFullScreenFlow
        visible
        eyebrow="KIỂM DUYỆT SỰ KIỆN"
        title="Những sự kiện đang tạm ẩn"
        subtitle="Bloom giữ nguyên lời của người tạo; người giữ nhà chỉ giúp chăm sóc điều gì đang hiện với cả nhà."
        variant="moderation"
        compactHeader
        onBack={() => setModerationVisible(false)}
      >
        <View style={__a3_styles.moderationFullBody}>
          {hiddenEvents.length === 0 ? (
            <View style={__a3_styles.moderationEmpty}>
              <BloomEmptyState icon="eye-outline" title="Không có sự kiện đang ẩn" description="Mọi sự kiện hợp lệ đang được hiển thị bình thường cho gia đình." compact />
            </View>
          ) : (
            <FlatList
              data={hiddenEvents}
              keyExtractor={(item) => item.id}
              contentContainerStyle={__a3_styles.moderationList}
              renderItem={({ item }) => (
                <View style={__a3_styles.hiddenEventRow}>
                  <View style={__a3_styles.hiddenEventCopy}>
                    <Text style={__a3_styles.hiddenEventTitle} numberOfLines={2}>{item.title}</Text>
                    <Text style={__a3_styles.hiddenEventMeta}>Nội dung vẫn thuộc người tạo · chỉ đang bị ẩn khỏi lịch</Text>
                  </View>
                  <Pressable disabled={!!moderationBusyId} onPress={() => void restoreHiddenEvent(item.id)} style={({ pressed }) => [__a3_styles.restoreButton, pressed && __a3_styles.pressed]}>
                    <Ionicons name="eye-outline" size={16} color={__a3Colors.primary} />
                    <Text style={__a3_styles.restoreButtonText}>{moderationBusyId === item.id ? "Đang mở…" : "Cho hiện"}</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </BloomFullScreenFlow>}

      {composerVisible && <BloomFullScreenFlow
        visible
        eyebrow="SỰ KIỆN MỚI"
        title="Gieo một ngày đáng nhớ"
        subtitle="Chọn ngày, người thân và lời nhắc để cả nhà cùng mong chờ."
        variant="event"
        onBack={requestCloseComposer}
      >
        <BloomKeyboardScreen rootStyle={__a3_styles.formKeyboard} contentContainerStyle={__a3_styles.formContent}>
              <BloomTextInput label="Tên sự kiện" value={eventTitle} onChangeText={(value) => { setEventTitle(value); setComposerDirty(true); }} placeholder="Một ngày đáng nhớ…" leftIcon="sparkles-outline" returnKeyType="next" />
              <BloomDatePicker
                label={recurrence === "yearly" ? "Ngày gốc / ngày kỷ niệm" : "Ngày diễn ra"}
                selectedDate={eventDate}
                onDateChange={(nextDate) => {
                  setEventDate(nextDate);
                  setComposerDirty(true);
                  if (!allDay && mergeDateAndTime(nextDate, eventTime, false).getTime() <= Date.now() && sameLocalDay(nextDate, new Date())) {
                    setEventTime(defaultEventTimeForDate(nextDate));
                  }
                }}
                minimumDate={recurrence === "yearly" ? undefined : today}
                leftIcon="calendar-outline"
              />
              {recurrence !== "yearly" && (
                <View style={__a3_styles.quickDateRow}>
                  {[
                    { label: "Hôm nay", days: 0 },
                    { label: "Ngày mai", days: 1 },
                  ].map((item) => {
                    const candidate = addLocalDays(today, item.days);
                    const active = sameLocalDay(eventDate, candidate);
                    return (
                      <Pressable
                        key={item.label}
                        onPress={() => {
                          setEventDate(candidate);
                          setComposerDirty(true);
                          if (!allDay && mergeDateAndTime(candidate, eventTime, false).getTime() <= Date.now() && sameLocalDay(candidate, new Date())) {
                            setEventTime(defaultEventTimeForDate(candidate));
                          }
                        }}
                        style={[__a3_styles.quickDateChip, active && __a3_styles.quickDateChipActive]}
                      >
                        <Ionicons name={item.days === 0 ? "today-outline" : "arrow-forward-circle-outline"} size={15} color={active ? __a3Colors.onPrimary : __a3Colors.primary} />
                        <Text style={[__a3_styles.quickDateText, active && __a3_styles.quickDateTextActive]}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={__a3_styles.fieldBlock}>
                <Text style={__a3_styles.fieldLabel}>Thời gian</Text>
                <View style={__a3_styles.timeModeRow}>
                  <Pressable onPress={() => { setAllDay(true); setShowTimePicker(false); setComposerDirty(true); }} style={[__a3_styles.timeMode, allDay && __a3_styles.timeModeActive]}><Text style={[__a3_styles.timeModeText, allDay && __a3_styles.timeModeTextActive]}>Cả ngày</Text></Pressable>
                  <Pressable onPress={() => {
                    setAllDay(false);
                    setComposerDirty(true);
                    if (sameLocalDay(eventDate, new Date()) && mergeDateAndTime(eventDate, eventTime, false).getTime() <= Date.now()) {
                      setEventTime(defaultEventTimeForDate(eventDate));
                    }
                  }} style={[__a3_styles.timeMode, !allDay && __a3_styles.timeModeActive]}><Text style={[__a3_styles.timeModeText, !allDay && __a3_styles.timeModeTextActive]}>Có giờ</Text></Pressable>
                </View>
                {!allDay && (
                  <>
                    <Pressable onPress={() => setShowTimePicker(true)} style={__a3_styles.timeButton}>
                      <Ionicons name="time-outline" size={19} color={__a3Colors.primary} />
                      <Text style={__a3_styles.timeButtonText}>{String(eventTime.getHours()).padStart(2, "0")}:{String(eventTime.getMinutes()).padStart(2, "0")}</Text>
                      <Ionicons name="chevron-down" size={17} color={__a3Colors.secondaryText} />
                    </Pressable>
                    <BloomTimePicker
                      visible={showTimePicker}
                      value={eventTime}
                      selectedDate={eventDate}
                      onClose={() => setShowTimePicker(false)}
                      onConfirm={(value) => { setEventTime(value); setComposerDirty(true); }}
                    />
                  </>
                )}
              </View>

              <View style={__a3_styles.fieldBlock}>
                <Text style={__a3_styles.fieldLabel}>Loại sự kiện</Text>
                <View style={__a3_styles.typeWrap}>{EVENT_TYPES.map((item) => {
                  const active = eventType === item.key;
                  return <Pressable key={item.key} onPress={() => {
                    setEventType(item.key);
                    setComposerDirty(true);
                    if ((item.key === "birthday" || item.key === "memorial" || item.key === "anniversary") && recurrence === "none") setRecurrence("yearly");
                  }} style={[__a3_styles.typeChip, active && __a3_styles.typeChipActive]}><Ionicons name={item.icon} size={15} color={active ? __a3Colors.onPrimary : __a3Colors.primaryText} /><Text style={[__a3_styles.typeChipText, active && __a3_styles.typeChipTextActive]}>{item.label}</Text></Pressable>;
                })}</View>
              </View>

              <View style={__a3_styles.fieldBlock}>
                <Text style={__a3_styles.fieldLabel}>Mức thông báo</Text>
                <Text style={__a3_styles.fieldHint}>Mặc định là Bình thường. Mức này chỉ quyết định cách Bloom làm nổi bật sự kiện.</Text>
                <View style={__a3_styles.notificationLevelList}>
                  {NOTIFICATION_LEVELS.map((item) => {
                    const active = notificationLevel === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        onPress={() => { setNotificationLevel(item.key); setComposerDirty(true); }}
                        style={({ pressed }) => [__a3_styles.notificationLevelRow, active && __a3_styles.notificationLevelRowActive, pressed && __a3_styles.pressed]}
                      >
                        <View style={[__a3_styles.notificationLevelDot, active && __a3_styles.notificationLevelDotActive]}>
                          {active && <Ionicons name="checkmark" size={13} color={__a3Colors.onPrimary} />}
                        </View>
                        <View style={__a3_styles.notificationLevelCopy}>
                          <Text style={__a3_styles.notificationLevelTitle}>{item.label}</Text>
                          <Text style={__a3_styles.notificationLevelHint}>{item.hint}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <FamilyPersonMultiPicker
                label="Người liên quan"
                hint="Gắn người trong phả hệ để sự kiện xuất hiện trong Dòng thời gian của họ."
                persons={familyPersons}
                selectedIds={personIds}
                onChange={(ids) => { setPersonIds(ids); setComposerDirty(true); }}
              />

              <EventParticipantsPicker mode={participantsMode} selectedIds={participantIds} members={members} onModeChange={(next) => { setParticipantsMode(next); if (next === "all") setParticipantIds([]); setComposerDirty(true); }} onSelectedIdsChange={(ids) => { setParticipantIds(ids); setComposerDirty(true); }} />

              <BloomTextInput label="Mô tả (không bắt buộc)" value={eventDescription} onChangeText={(value) => { setEventDescription(value); setComposerDirty(true); }} placeholder="Một chút ghi chú cho cả nhà…" leftIcon="create-outline" multiline />
              <BloomTextInput label="Địa điểm (không bắt buộc)" value={eventLocation} onChangeText={(value) => { setEventLocation(value); setComposerDirty(true); }} placeholder="Mình gặp nhau ở đâu?" leftIcon="location-outline" />

              <View style={__a3_styles.fieldBlock}>
                <Text style={__a3_styles.fieldLabel}>Lặp lại</Text>
                <View style={__a3_styles.timeModeRow}>
                  <Pressable onPress={() => { setRecurrence("none"); setComposerDirty(true); }} style={[__a3_styles.timeMode, recurrence === "none" && __a3_styles.timeModeActive]}><Text style={[__a3_styles.timeModeText, recurrence === "none" && __a3_styles.timeModeTextActive]}>Một lần</Text></Pressable>
                  <Pressable onPress={() => { setRecurrence("yearly"); setComposerDirty(true); }} style={[__a3_styles.timeMode, recurrence === "yearly" && __a3_styles.timeModeActive]}><Text style={[__a3_styles.timeModeText, recurrence === "yearly" && __a3_styles.timeModeTextActive]}>Mỗi năm</Text></Pressable>
                </View>
              </View>

          <BloomButton title="Đăng sự kiện & tiếp tục" icon="sparkles-outline" onPress={publishEvent} customStyle={__a3_styles.publishButton} />
        </BloomKeyboardScreen>
      </BloomFullScreenFlow>}
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  stablePlannerRoot: { flex: 1, minHeight: 0 },
  panelViewport: { flex: 1, minHeight: 0, overflow: "hidden", backgroundColor: COLORS.background },
  panelTrack: { flex: 1, minHeight: 0, flexDirection: "row" },
  panelPage: { height: "100%", minHeight: 0, backgroundColor: COLORS.background },
  panelList: { flex: 1 },
  panelContent: { paddingBottom: 158 },
  content: { paddingBottom: 28 },
  topInset: { paddingHorizontal: 16, paddingTop: 16 },
  calendarInset: { paddingHorizontal: 16 },
  eventItemInset: { paddingHorizontal: 16 },
  eventListHeader: { paddingHorizontal: 16, paddingTop: 2 },
  eventEmptyInset: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
  eventEmptyCard: {
    position: "relative", overflow: "hidden", borderRadius: 24, borderWidth: 1,
    paddingHorizontal: 18, paddingTop: 19, paddingBottom: 17,
  },
  eventEmptyUpcoming: {
    backgroundColor: COLORS.surface, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOpacity: 0.07, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 1,
  },
  eventEmptyPast: { backgroundColor: COLORS.surface, borderColor: COLORS.border },
  eventEmptyGlow: { position: "absolute", right: -26, top: -38, width: 138, height: 138, borderRadius: 69, backgroundColor: COLORS.surface },
  eventEmptyGlowPast: { backgroundColor: COLORS.surface },
  eventEmptyTop: { flexDirection: "row", alignItems: "center", gap: 13 },
  eventEmptyIconRing: { width: 60, height: 60, borderRadius: 22, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  eventEmptyIconRingPast: { backgroundColor: COLORS.surface },
  eventEmptySparkle: { position: "absolute", right: -5, top: -4, width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  eventEmptyCopy: { flex: 1, minWidth: 0 },
  eventEmptyEyebrow: { color: COLORS.primary, fontWeight: "900", fontSize: 9, letterSpacing: 0.7 },
  eventEmptyTitle: { color: COLORS.primaryText, fontSize: BLOOM_CARD_TITLE_SIZE, fontWeight: "900", lineHeight: BLOOM_CARD_TITLE_LINE_HEIGHT, marginTop: 5 },
  eventEmptyDescription: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 19, marginTop: 12 },
  eventEmptyCreate: {
    marginTop: 15, alignSelf: "flex-start", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 13, backgroundColor: COLORS.surface, borderRadius: 16, borderColor: COLORS.border, borderWidth: 1,
  },
  eventEmptyCreateText: { fontSize: 11.5, fontWeight: "900", color: COLORS.primary },
  eventEmptyPastNote: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 15 },
  eventEmptyPastNoteText: { fontSize: 10.5, fontWeight: "700", color: COLORS.primary },
  emptyInset: { paddingHorizontal: 16 },
  heroAddButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 2,
  },
  addButton: { width: 52, height: 52, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: "center", justifyContent: "center", shadowColor: COLORS.primary, shadowOpacity: 0.22, shadowRadius: 10, elevation: 4 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  segment: { position: "relative", flexDirection: "row", gap: 8, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 5, marginBottom: 16, overflow: "hidden" },
  segmentIndicator: { position: "absolute", top: 5, left: 0, height: 42, borderRadius: 16, backgroundColor: COLORS.primary },
  segmentItem: { zIndex: 1, flex: 1, minHeight: 42, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  segmentText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  segmentTextActive: { color: COLORS.onPrimary },
  moderationButton: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 16 },
  moderationIcon: { width: 38, height: 38, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  moderationCopy: { flex: 1, minWidth: 0 },
  moderationTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  moderationHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14 },
  hiddenCount: { minWidth: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  hiddenCountText: { color: COLORS.primary, fontSize: 11, fontWeight: "900" },
  calendarCard: { padding: 13, marginBottom: 12 },
  calendarHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  monthButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  monthCopy: { alignItems: "center" },
  monthTitle: { color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  yearText: { marginTop: 2, color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "700" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekLabel: { width: "14.2857%", textAlign: "center", color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "800" },
  daysGrid: { flexDirection: "row", flexWrap: "wrap" },
  daySlot: { width: "14.2857%", height: 48, alignItems: "center", justifyContent: "center" },
  dayCircle: { width: 38, height: 38, borderRadius: 999, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: COLORS.primary, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  dayToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  dayText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "700" },
  daySelectedText: { color: COLORS.onPrimary, fontWeight: "900" },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.primary, position: "absolute", bottom: 3 },
  eventDotSelected: { backgroundColor: COLORS.onPrimary },
  sectionHeaderWrap: { marginTop: 22 },
  sectionHeaderList: { backgroundColor: COLORS.background, paddingTop: 10, paddingHorizontal: 16 },
  itemGap: { height: 10 },
  sectionGap: { height: 10 },
  moreButton: { marginTop: 8, minHeight: 44, marginHorizontal: 16 },
  loading: { minHeight: 110, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: COLORS.secondaryText, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: "flex-end" },
  sheet: { maxHeight: "92%", minHeight: "68%", backgroundColor: COLORS.surface, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: "hidden" },
  moderationSheet: { minHeight: "42%", maxHeight: "78%" },
  moderationFullBody: { flex: 1, paddingTop: 14 },
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
  fieldHint: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15, fontWeight: "600" },
  typeWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeChip: { minHeight: 42, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12 },
  typeChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  typeChipText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "800" },
  typeChipTextActive: { color: COLORS.onPrimary },
  quickDateRow: { flexDirection: "row", gap: 9, marginTop: -7 },
  quickDateChip: { flex: 1, minHeight: 42, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  quickDateChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  quickDateText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "800" },
  quickDateTextActive: { color: COLORS.onPrimary },
  timeModeRow: { flexDirection: "row", gap: 9 },
  timeMode: { flex: 1, minHeight: 44, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, alignItems: "center", justifyContent: "center" },
  timeModeActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  timeModeText: { color: COLORS.secondaryText, fontSize: 12.5, fontWeight: "800" },
  timeModeTextActive: { color: COLORS.primaryText },
  timeButton: { minHeight: 52, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.softSurface, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  timeButtonText: { flex: 1, color: COLORS.primaryText, fontSize: 15, fontWeight: "900" },
  notificationLevelList: { gap: 8 },
  notificationLevelRow: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 },
  notificationLevelRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.surfaceFocus },
  notificationLevelDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  notificationLevelDotActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  notificationLevelCopy: { flex: 1, minWidth: 0 },
  notificationLevelTitle: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  notificationLevelHint: { marginTop: 2, color: COLORS.secondaryText, fontSize: 10, lineHeight: 14 },
  publishButton: { marginTop: 2 },
}));
