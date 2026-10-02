import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Pressable, SectionList, StyleSheet, Text, View, type ViewToken } from "react-native";
import { ScreenContainer } from "../components/layout/ScreenContainer";
import { EventCard } from "../components/events/EventCard";
import { MomentCard } from "../components/moments/MomentCard";
import { BloomPill, BloomStickyHeader } from "../components/ui/BloomPageComponents";
import { COLORS } from "../constants/theme";
import { isPerformanceTestAccount } from "../constants/performanceTest";
import { useAuth } from "../context/AuthContext";
import { performanceTestService } from "../services/performance/performanceTestService";
import { finalPerformanceGateService } from "../services/performance/finalPerformanceGateService";
import {
  generateSyntheticEvents,
  generateSyntheticMembers,
  generateSyntheticMemoryBook,
  generateSyntheticMoments,
  generateSyntheticTimeline,
  type SyntheticMemoryBookItem,
} from "../services/performance/syntheticAppData";
import { buildMomentTimelineSections, type MomentTimelineRow } from "../utils/timelineSections";

type StressKind = "moments" | "timeline" | "events" | "memorybook";
const safeKind = (value?: string): StressKind => value === "timeline" || value === "events" || value === "memorybook" ? value : "moments";
const safeCount = (value?: string) => Math.max(10, Math.min(500, Number(value) || 100));

const kindTitle: Record<StressKind, string> = {
  moments: "Khoảnh khắc",
  timeline: "Dòng thời gian",
  events: "Lịch & sự kiện",
  memorybook: "Kỷ yếu Bloom",
};

// Use bundled static assets for visual stress rows. Keeping these sources local to
// the screen avoids a runtime dependency on a named helper export while still
// exercising real image decode/render work without network or Cloudinary.
const STRESS_MEDIA_SOURCES = [
  require("../../assets/images/login-family-icon.png"),
  require("../../assets/images/icon.png"),
  require("../../assets/images/tutorial-web.png"),
  require("../../assets/images/logo-glow.png"),
] as const;

const stressMediaSourceAt = (index: number) =>
  STRESS_MEDIA_SOURCES[Math.abs(index) % STRESS_MEDIA_SOURCES.length];

function TimelineStressRow({ item }: { item: MomentTimelineRow }) {
  const moment = item.moment;
  const visible = Math.min(5, moment.media.length);
  return (
    <View style={styles.timelineRow}>
      <View style={styles.railColumn}><View style={styles.railDot} /><View style={styles.rail} /></View>
      <View style={styles.timelineCopy}>
        <Text style={styles.dateText}>{new Date(moment.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "long" })}</Text>
        <Text style={styles.timelineTitle}>{moment.caption}</Text>
        {!!visible && (
          <View style={styles.mediaStack}>
            {Array.from({ length: visible }, (_, index) => (
              <View key={index} style={[styles.mediaCircle, index > 0 && styles.mediaOverlap]}>
                <Image source={stressMediaSourceAt(index)} style={StyleSheet.absoluteFill} contentFit="cover" />
                {moment.media[index]?.type === "video" && <View style={styles.playBadge}><Ionicons name="play" size={8} color={COLORS.white} /></View>}
              </View>
            ))}
            {moment.media.length > visible && <View style={[styles.mediaMore, styles.mediaOverlap]}><Text style={styles.mediaMoreText}>+{moment.media.length - visible}</Text></View>}
          </View>
        )}
      </View>
    </View>
  );
}

function BookStressRow({ item }: { item: SyntheticMemoryBookItem }) {
  return (
    <View style={styles.bookPage}>
      <Image source={stressMediaSourceAt(Number(item.id.split("-").pop()) || 0)} style={styles.bookImage} contentFit="cover" />
      <Text style={styles.bookDate}>{new Date(item.createdAt).toLocaleDateString("vi-VN", { day: "2-digit", month: "long", year: "numeric" })}</Text>
      <Text style={styles.bookTitle}>{item.title}</Text>
      <Text style={styles.bookMeta}>{item.authorName} · {item.mediaCount} ảnh/video</Text>
    </View>
  );
}

export default function PerformanceDataTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; count?: string; finalGate?: string; gateRunId?: string; gateStep?: string }>();
  const kind = safeKind(Array.isArray(params.kind) ? params.kind[0] : params.kind);
  const count = safeCount(Array.isArray(params.count) ? params.count[0] : params.count);
  const gateRunId = Array.isArray(params.gateRunId) ? params.gateRunId[0] : params.gateRunId ?? null;
  const gateStepRaw = Array.isArray(params.gateStep) ? params.gateStep[0] : params.gateStep;
  const gateStep = Number(gateStepRaw ?? -1);
  const gateRequested = (Array.isArray(params.finalGate) ? params.finalGate[0] : params.finalGate) === "1";
  const gateActive = gateRequested && finalPerformanceGateService.isActiveStep(gateRunId, gateStep, { type: "stress", kind, count });
  const { user } = useAuth();
  const allowed = isPerformanceTestAccount(user?.email);
  const listRef = useRef<FlatList<any> | SectionList<any>>(null);
  const screenStartedAt = useRef(Date.now());
  const firstViewableRecorded = useRef(false);
  const firstPaintRecorded = useRef(false);
  const initialTraceFinished = useRef(false);
  const gateAdvancedRef = useRef(false);
  const jumpSequenceRef = useRef(0);
  const jumpAttemptRef = useRef<{
    id: number;
    startedAt: number;
    onMeasured?: () => void;
    completed: boolean;
    completionTimer: ReturnType<typeof setTimeout> | null;
  } | null>(null);
  const [gateReady, setGateReady] = useState(false);
  const kindRef = useRef(kind);
  kindRef.current = kind;

  const advanceFinalGate = useCallback((status: "PASS" | "FAIL", detail: string) => {
    if (!gateActive || !gateRunId || gateAdvancedRef.current) return;
    gateAdvancedRef.current = true;
    const nextRoute = finalPerformanceGateService.markStep(gateRunId, gateStep, status, detail);
    if (!nextRoute) return;
    setTimeout(() => router.replace(nextRoute as never), 160);
  }, [gateActive, gateRunId, gateStep, router]);

  const handleBack = useCallback(() => {
    if (gateActive && gateRunId) {
      finalPerformanceGateService.abort(gateRunId, `Người dùng dừng tại ${kindTitle[kind]} ${count}`);
      router.replace({ pathname: "/performance-test", params: { finalGate: "aborted", gateRunId } } as never);
      return;
    }
    router.back();
  }, [count, gateActive, gateRunId, kind, router]);

  // IMPORTANT: generating data during render is fine, but publishing metrics is not.
  // The previous harness emitted to PerformanceTestScreen from inside useMemo(),
  // which caused React's "setState while rendering a different component" warning.
  const datasetBuild = useMemo(() => {
    const startedAt = Date.now();
    if (!allowed) return { data: [] as any[], durationMs: 0, startedAt };
    const data = kind === "moments" ? generateSyntheticMoments(count)
      : kind === "events" ? generateSyntheticEvents(count)
      : kind === "timeline" ? generateSyntheticTimeline(count)
      : generateSyntheticMemoryBook(count);
    return { data, durationMs: Date.now() - startedAt, startedAt };
  }, [allowed, count, kind]);
  const dataset = datasetBuild.data;

  const members = useMemo(() => generateSyntheticMembers(24), []);
  const memberByUid = useMemo(() => new Map(members.map((item) => [item.uid, item])), [members]);
  const timelineBuild = useMemo(() => {
    if (kind !== "timeline") return { sections: [], durationMs: 0 };
    const started = Date.now();
    const sections = buildMomentTimelineSections(dataset as import("../types/moments").MomentPost[]);
    return { sections, durationMs: Date.now() - started };
  }, [dataset, kind]);
  const timelineSections = timelineBuild.sections;

  useEffect(() => {
    if (!allowed) return;
    performanceTestService.recordMetric(
      "Stress synthetic generate",
      datasetBuild.durationMs,
      "ms",
      `${kindTitle[kind]} · ${count} mục · RAM only`,
    );
    if (kind === "timeline") {
      performanceTestService.recordMetric(
        "Timeline section/group",
        timelineBuild.durationMs,
        "ms",
        `${count} kỷ niệm · production projection`,
      );
    }
  }, [allowed, count, datasetBuild.durationMs, kind, timelineBuild.durationMs]);

  const finishInitialTraceIfReady = useCallback(() => {
    if (initialTraceFinished.current || !firstPaintRecorded.current || !firstViewableRecorded.current) return;
    initialTraceFinished.current = true;
    performanceTestService.mark("app_stress_test", "initial_render_ready");
    performanceTestService.finish("app_stress_test");
    setGateReady(true);
  }, []);

  const finishTraceRef = useRef(finishInitialTraceIfReady);
  finishTraceRef.current = finishInitialTraceIfReady;
  const generatedAtRef = useRef(datasetBuild.startedAt);
  generatedAtRef.current = datasetBuild.startedAt;

  useEffect(() => {
    if (!allowed) {
      router.replace("/(tabs)/play" as never);
      return;
    }
    screenStartedAt.current = Date.now();
    firstViewableRecorded.current = false;
    firstPaintRecorded.current = false;
    initialTraceFinished.current = false;
    gateAdvancedRef.current = false;
    setGateReady(false);
    const target = `${kindTitle[kind]} · ${count}`;
    performanceTestService.start("app_stress_test", target);
    performanceTestService.mark("app_stress_test", "data_ready");
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        if (firstPaintRecorded.current) return;
        firstPaintRecorded.current = true;
        const elapsed = Date.now() - screenStartedAt.current;
        performanceTestService.mark("app_stress_test", "first_painted_frame");
        performanceTestService.recordMetric("Stress first painted frame", elapsed, "ms", target);
        finishTraceRef.current();
      });
    });
    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      if (!initialTraceFinished.current) performanceTestService.finish("app_stress_test", "cancelled");
    };
  }, [allowed, count, kind, router]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (firstViewableRecorded.current || !viewableItems.length) return;
    const visibleRows = viewableItems.filter((token) => {
      const value = token.item as any;
      return kindRef.current === "timeline" ? !!value?.moment?.id : !!value?.id;
    });
    if (!visibleRows.length) return;
    firstViewableRecorded.current = true;
    performanceTestService.recordMetric(
      "Stress first viewable callback",
      visibleRows.length,
      "mục",
      `${Date.now() - generatedAtRef.current}ms từ lúc tạo dataset · callback đầu tiên, không phải toàn bộ visible window`,
    );
    performanceTestService.mark("app_stress_test", "initial_batch_visible");
    finishTraceRef.current();
  }).current;

  const completeJumpMeasurement = useCallback((jumpId: number, mode: "direct" | "fallback") => {
    const pending = jumpAttemptRef.current;
    if (!pending || pending.id !== jumpId || pending.completed) return;
    pending.completed = true;
    if (pending.completionTimer) clearTimeout(pending.completionTimer);
    pending.completionTimer = null;

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const current = jumpAttemptRef.current;
      if (!current || current.id !== jumpId) return;
      const elapsed = Date.now() - current.startedAt;
      performanceTestService.recordMetric(
        "Stress jump to end → frame",
        elapsed,
        "ms",
        `${kindTitle[kind]} · ${count}`,
      );
      if (mode === "fallback") {
        performanceTestService.recordMetric(
          "Stress timeline scroll fallback",
          1,
          "lần",
          `${kindTitle[kind]} · ${count} · VirtualizedList chưa đo đủ item`,
        );
      }
      const callback = current.onMeasured;
      jumpAttemptRef.current = null;
      callback?.();
    }));
  }, [count, kind]);

  const handleTimelineScrollToIndexFailed = useCallback((info: { averageItemLength: number; highestMeasuredFrameIndex: number; index: number }) => {
    const pending = jumpAttemptRef.current;
    if (!pending || pending.completed) return;
    if (pending.completionTimer) clearTimeout(pending.completionTimer);
    pending.completionTimer = null;

    // SectionList.scrollToLocation delegates to VirtualizedList.scrollToIndex.
    // For a synthetic long list the target row is often still offscreen and
    // unmeasured. React Native requires this failure handler in that case.
    // Fall back to a large pixel offset on the underlying virtualized list;
    // native scrolling clamps it to the content end without needing row layout.
    const ref = listRef.current as any;
    let fallbackIssued = false;
    try {
      if (typeof ref?.scrollToOffset === "function") {
        ref.scrollToOffset({ offset: 10_000_000, animated: false });
        fallbackIssued = true;
      }
    } catch {
      fallbackIssued = false;
    }

    if (!fallbackIssued) {
      try {
        const responder = ref?.getScrollResponder?.();
        if (typeof responder?.scrollTo === "function") {
          const measuredFloor = Math.max(info.index, info.highestMeasuredFrameIndex + 1);
          const estimatedOffset = Math.max(10_000, info.averageItemLength * measuredFloor * 2);
          responder.scrollTo({ y: estimatedOffset, animated: false });
          fallbackIssued = true;
        }
      } catch {
        fallbackIssued = false;
      }
    }

    // Never let an unmeasured synthetic row crash the whole gate. The fallback
    // itself is recorded so the report still tells us this path was needed.
    completeJumpMeasurement(pending.id, "fallback");
  }, [completeJumpMeasurement]);

  const jumpToEnd = useCallback((onMeasured?: () => void) => {
    performanceTestService.recordUiPress(`Stress scroll end: ${kind}`);
    const startedAt = Date.now();
    const jumpId = ++jumpSequenceRef.current;
    jumpAttemptRef.current = {
      id: jumpId,
      startedAt,
      onMeasured,
      completed: false,
      completionTimer: null,
    };

    const ref = listRef.current as any;
    try {
      if (kind === "timeline") {
        const sectionIndex = Math.max(0, timelineSections.length - 1);
        const itemIndex = Math.max(0, (timelineSections[sectionIndex]?.data.length ?? 1) - 1);
        ref?.scrollToLocation?.({ sectionIndex, itemIndex, animated: false, viewPosition: 1 });
        const pending = jumpAttemptRef.current;
        if (pending?.id === jumpId && !pending.completed) {
          // onScrollToIndexFailed fires synchronously for an unmeasured target.
          // If it did not fire, allow layout/scroll to settle before measuring.
          pending.completionTimer = setTimeout(() => completeJumpMeasurement(jumpId, "direct"), 80);
        }
      } else {
        ref?.scrollToEnd?.({ animated: false });
        completeJumpMeasurement(jumpId, "direct");
      }
    } catch {
      if (kind === "timeline") {
        handleTimelineScrollToIndexFailed({ averageItemLength: 120, highestMeasuredFrameIndex: 0, index: count });
      } else {
        completeJumpMeasurement(jumpId, "fallback");
      }
    }
  }, [completeJumpMeasurement, count, handleTimelineScrollToIndexFailed, kind, timelineSections]);

  useEffect(() => {
    if (!gateActive || !gateReady) return undefined;
    const timer = setTimeout(() => {
      jumpToEnd(() => advanceFinalGate("PASS", `initial render + jump-end hoàn tất · ${kindTitle[kind]} ${count}`));
    }, 120);
    return () => clearTimeout(timer);
  }, [advanceFinalGate, count, gateActive, gateReady, jumpToEnd, kind]);

  useEffect(() => {
    if (!gateActive) return undefined;
    const timer = setTimeout(() => {
      performanceTestService.finish("app_stress_test", "error");
      advanceFinalGate("FAIL", `timeout > 15s ở ${kindTitle[kind]} ${count}`);
    }, 15_000);
    return () => clearTimeout(timer);
  }, [advanceFinalGate, count, gateActive, kind]);

  useEffect(() => () => {
    const pending = jumpAttemptRef.current;
    if (pending?.completionTimer) clearTimeout(pending.completionTimer);
    jumpAttemptRef.current = null;
  }, []);

  if (!allowed) return null;

  const header = (
    <View style={styles.headerBlock}>
      <Text style={styles.testIntro}>Dữ liệu giả chỉ dùng để đo render và cuộn; không tạo bài, sự kiện hay tệp trên tài khoản thật.</Text>
      <View style={styles.pills}>
        <BloomPill icon="hardware-chip-outline" label={`${count} mục`} />
        <BloomPill icon="cloud-offline-outline" label="Không ghi Firebase" />
      </View>
      <Pressable onPress={() => jumpToEnd()} style={({ pressed }) => [styles.jumpButton, pressed && { opacity: 0.7 }]}>
        <Ionicons name="arrow-down-circle-outline" size={18} color={COLORS.primaryText} />
        <Text style={styles.jumpText}>Nhảy xuống cuối để đo cuộn dài</Text>
      </Pressable>
    </View>
  );

  if (kind === "timeline") {
    return <ScreenContainer>
      <BloomStickyHeader title={`${kindTitle[kind]} · ${count}`} subtitle="Phase 10 · RAM only" onBack={handleBack} />
      <SectionList
        ref={listRef as any}
        sections={timelineSections}
        keyExtractor={(item, index) => item?.moment?.id ?? `timeline-row-${index}`}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.showYear ? `${section.year} · ` : ""}Tháng {section.month}</Text>}
        renderItem={({ item }) => item?.moment ? <TimelineStressRow item={item} /> : null}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        updateCellsBatchingPeriod={80}
        windowSize={7}
        removeClippedSubviews
        onViewableItemsChanged={onViewableItemsChanged}
        onScrollToIndexFailed={handleTimelineScrollToIndexFailed}
        contentContainerStyle={styles.content}
      />
    </ScreenContainer>;
  }

  return <ScreenContainer>
    <BloomStickyHeader title={`${kindTitle[kind]} · ${count}`} subtitle="Phase 10 · RAM only" onBack={handleBack} />
    <FlatList
      ref={listRef as any}
      data={dataset as any[]}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => kind === "moments" ? (
        <View style={styles.itemGap}>
          <MomentCard
            post={item}
            familyId="stress-family"
            currentUid="stress-viewer"
            currentName="Người kiểm thử"
            memberByUid={memberByUid}
            realtimeEnabled={false}
            canModerate={false}
            linkedPersons={[]}
          />
        </View>
      ) : kind === "events" ? (
        <View style={styles.itemGap}><EventCard event={item} memberByUid={memberByUid} /></View>
      ) : (
        <BookStressRow item={item} />
      )}
      initialNumToRender={kind === "moments" ? 3 : 7}
      maxToRenderPerBatch={kind === "moments" ? 3 : 7}
      updateCellsBatchingPeriod={80}
      windowSize={5}
      removeClippedSubviews
      onViewableItemsChanged={onViewableItemsChanged}
      contentContainerStyle={styles.content}
    />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  headerBlock: { paddingBottom: 18 },
  testIntro: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 18, fontWeight: "600", marginBottom: 12 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  jumpButton: { minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  jumpText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  itemGap: { marginBottom: 12 },
  sectionHeader: { backgroundColor: COLORS.background, paddingVertical: 8, color: COLORS.primaryText, fontSize: 17, fontWeight: "900" },
  timelineRow: { flexDirection: "row", minHeight: 116, paddingBottom: 10 },
  railColumn: { width: 30, alignItems: "center" },
  railDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary, marginTop: 8, zIndex: 2 },
  rail: { width: 2, flex: 1, backgroundColor: COLORS.timelineRail, marginTop: -1 },
  timelineCopy: { flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 14, marginBottom: 7 },
  dateText: { color: COLORS.primary, fontSize: 10.5, fontWeight: "900", textTransform: "uppercase" },
  timelineTitle: { marginTop: 5, color: COLORS.primaryText, fontSize: 15, lineHeight: 21, fontWeight: "900" },
  mediaStack: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  mediaCircle: { width: 40, height: 40, borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: COLORS.white, backgroundColor: COLORS.surfaceSoft },
  mediaOverlap: { marginLeft: -20 },
  mediaMore: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: COLORS.white, backgroundColor: COLORS.surfaceFocus, alignItems: "center", justifyContent: "center" },
  mediaMoreText: { color: COLORS.primaryText, fontSize: 10, fontWeight: "900" },
  playBadge: { position: "absolute", right: 1, bottom: 1, width: 14, height: 14, borderRadius: 7, backgroundColor: "rgba(80,44,58,.75)", alignItems: "center", justifyContent: "center" },
  bookPage: { backgroundColor: COLORS.white, borderRadius: 28, borderWidth: 1, borderColor: COLORS.border, padding: 14, marginBottom: 16 },
  bookImage: { width: "100%", aspectRatio: 1.55, borderRadius: 20, backgroundColor: COLORS.surfaceSoft },
  bookDate: { marginTop: 13, color: COLORS.primary, fontSize: 10, fontWeight: "900", textTransform: "uppercase" },
  bookTitle: { marginTop: 6, color: COLORS.primaryText, fontSize: 20, lineHeight: 27, fontWeight: "900" },
  bookMeta: { marginTop: 7, color: COLORS.secondaryText, fontSize: 11.5, fontWeight: "600" },
});
