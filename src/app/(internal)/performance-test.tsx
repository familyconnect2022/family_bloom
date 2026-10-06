import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ScreenContainer } from "../../components/layout/ScreenContainer";
import { BloomButton } from "../../components/ui/BloomButtonComponents";
import { BloomCard, BloomSectionHeader, BloomPill, BloomStickyHeader } from "../../components/ui/BloomPageComponents";
import { COLORS } from "../../constants/theme";
import { performanceTestService } from "../../services/performance/performanceTestService";
import { automatedRegressionService } from "../../services/performance/automatedRegressionService";
import { finalPerformanceGateService } from "../../services/performance/finalPerformanceGateService";
import { appWidePerformanceService } from "../../services/performance/appWidePerformanceService";
import { e2eTestHarnessService, type E2EFirebaseReport } from "../../services/performance/e2eTestHarnessService";
import { isPerformanceTestAccount } from "../../constants/performanceTest";
import { useAuth } from "../../context/AuthContext";
import { useBloomDialog } from "../../components/ui/BloomDialogProvider";

const GRAPH_SIZES = [50, 100, 200, 300, 500] as const;
const APP_STRESS_SIZES = [100, 200] as const;
const APP_STRESS_KINDS = [
  { key: "moments", label: "Khoảnh khắc", icon: "images-outline" as const },
  { key: "timeline", label: "Timeline", icon: "time-outline" as const },
  { key: "events", label: "Sự kiện", icon: "calendar-outline" as const },
  { key: "memorybook", label: "Kỷ yếu", icon: "book-outline" as const },
] as const;

export default function PerformanceTestScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ finalGate?: string; gateRunId?: string; appSweep?: string; sweepRunId?: string; autoStart?: string }>();
  const { user } = useAuth();
  const { inform } = useBloomDialog();
  const allowed = isPerformanceTestAccount(user?.email);
  const [, forceRender] = useState(0);
  const [e2eRunning, setE2eRunning] = useState(false);
  const [e2eReport, setE2eReport] = useState<E2EFirebaseReport | null>(null);
  const [e2eError, setE2eError] = useState<string | null>(null);
  const [deliveryProbe, setDeliveryProbe] = useState<string | null>(null);
  const autoStartHandledRef = useRef(false);
  // The report screen stays mounted underneath graph tests. Subscribe only while
  // it is focused so every trace/metric does not re-render a hidden ScrollView.
  useFocusEffect(useCallback(() => {
    if (!allowed) return undefined;
    const stopMetrics = performanceTestService.subscribe(() => forceRender((value) => value + 1));
    const stopSweep = appWidePerformanceService.subscribe(() => forceRender((value) => value + 1));
    return () => { stopMetrics(); stopSweep(); };
  }, [allowed]));
  const snapshot = performanceTestService.snapshot();
  const recentTraces = snapshot.traces.slice(0, 8);
  const recentMetrics = snapshot.metrics.slice(0, 10);
  const regression = automatedRegressionService.evaluate(snapshot);
  const finalGateState = finalPerformanceGateService.snapshot();
  const appSweepState = appWidePerformanceService.snapshot();
  useEffect(() => {
    if (!allowed) router.replace("/(tabs)/play" as never);
  }, [allowed, router]);

  useEffect(() => {
    const finalGateParam = Array.isArray(params.finalGate) ? params.finalGate[0] : params.finalGate;
    const runId = Array.isArray(params.gateRunId) ? params.gateRunId[0] : params.gateRunId;
    if (finalGateParam !== "complete" || !runId) return;
    finalPerformanceGateService.complete(runId);
    forceRender((value) => value + 1);
  }, [params.finalGate, params.gateRunId]);

  useEffect(() => {
    const sweepParam = Array.isArray(params.appSweep) ? params.appSweep[0] : params.appSweep;
    const runId = Array.isArray(params.sweepRunId) ? params.sweepRunId[0] : params.sweepRunId;
    if (sweepParam !== "complete" || !runId) return;
    appWidePerformanceService.complete(runId);
    forceRender((value) => value + 1);
  }, [params.appSweep, params.sweepRunId]);

  useEffect(() => {
    const autoStart = Array.isArray(params.autoStart) ? params.autoStart[0] : params.autoStart;
    if (!allowed || autoStart !== "1" || autoStartHandledRef.current) return;
    autoStartHandledRef.current = true;
    if (!appWidePerformanceService.isRunning()) {
      // State only. The global driver owns ALL sweep navigation so Android has
      // exactly one route owner and the Phase 15B.3 state-machine invariant holds.
      appWidePerformanceService.start();
    }
  }, [allowed, params.autoStart]);

  const probeLabel = useMemo(() => {
    if (!snapshot.interactionProbeRunning || !snapshot.interactionProbeEndsAt) return "Đo thao tác thật 60 giây";
    return "Đang đo · cứ dùng app bình thường";
  }, [snapshot.interactionProbeEndsAt, snapshot.interactionProbeRunning]);

  const startInteractionTest = () => {
    performanceTestService.startInteractionProbe(60_000);
    // Performance Lab is pushed from the existing Tabs navigator. Dismiss the
    // stack back to that original navigator instead of replacing this screen
    // with a NEW /(tabs) route (which previously left old tab trees mounted).
    if (router.canDismiss()) router.dismissAll();
    else router.navigate("/(tabs)/play" as never);
  };

  const copyReport = async () => {
    await Clipboard.setStringAsync(`${automatedRegressionService.exportText(regression)}\n\n${performanceTestService.exportText()}`);
  };

  const startFinalPerformanceGate = () => {
    const run = finalPerformanceGateService.start();
    router.replace(run.firstRoute as never);
  };

  const copyFinalGateReport = async () => {
    await Clipboard.setStringAsync(finalPerformanceGateService.exportText(finalPerformanceGateService.snapshot()));
  };

  const startAppWideSweep = () => {
    // Start state only. AppWidePerformanceDriver is mounted at root and owns
    // the first transition plus every later transition. This avoids two route
    // owners racing during the same Android press/commit frame.
    appWidePerformanceService.start();
  };

  const copyAppWideSweepReport = async () => {
    await Clipboard.setStringAsync(appWidePerformanceService.exportText(appWidePerformanceService.snapshot()));
  };

  const runFirebaseE2E = async () => {
    if (e2eRunning) return;
    setE2eRunning(true);
    setE2eError(null);
    try {
      setE2eReport(await e2eTestHarnessService.runFirebaseSmoke());
    } catch (error) {
      setE2eError(error instanceof Error ? error.message : String(error));
    } finally {
      setE2eRunning(false);
    }
  };

  const createDeliveryProbe = async () => {
    if (e2eRunning) return;
    setE2eRunning(true);
    setE2eError(null);
    setDeliveryProbe(null);
    try {
      const probe = await e2eTestHarnessService.createDeliveryProbe();
      const deliverAt = new Date(probe.deliverAtISO);
      const timeLabel = Number.isNaN(deliverAt.getTime())
        ? `sau khoảng ${probe.seconds} giây`
        : deliverAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const message = `PASS · Event ${probe.eventId} đã được tạo và Android đã xác nhận lịch notification. Dự kiến nhận lúc ${timeLabel}. BÂY GIỜ bạn mới đưa app xuống background hoặc khóa màn hình.`;
      setDeliveryProbe(message);
      void inform({
        eyebrow: "E2E TEST",
        title: "Đã hẹn với Android ✓",
        message: `Event test đã tạo thành công. Notification dự kiến lúc ${timeLabel}. Bây giờ hãy đưa app xuống background hoặc khóa màn hình.`,
        icon: "notifications-outline",
        dismissLabel: "Đã hiểu",
      });
    } catch (error) {
      setE2eError(error instanceof Error ? error.message : String(error));
    } finally {
      setE2eRunning(false);
    }
  };

  const copyE2EReport = async () => {
    if (e2eReport) await Clipboard.setStringAsync(e2eTestHarnessService.exportText(e2eReport));
  };

  if (!allowed) return null;

  return (
    <ScreenContainer>
      <BloomStickyHeader title="Phòng đo hiệu năng 🌸" subtitle="Phase 15B · App-wide Regression Lab" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BloomCard tone="accent" style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}><Ionicons name="speedometer-outline" size={24} color={COLORS.primary} /></View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Không cần nhập dữ liệu test</Text>
              <Text style={styles.heroText}>Phase 15B có thể tự đi qua 29 màn thật, đo listener/React commit/JS stall, rồi chạy Graph 50 → 500 và stress list RAM-only. Bạn chỉ cần bấm một lần và để máy yên.</Text>
            </View>
          </View>
          <View style={styles.pills}>
            <BloomPill icon="pulse-outline" label={`${snapshot.activeListenerTotal} listener đang theo dõi`} />
            <BloomPill icon="analytics-outline" label={`${snapshot.traces.length} trace`} />
            <BloomPill icon="timer-outline" label={`${snapshot.metrics.length} metric`} />
          </View>
        </BloomCard>

        <View style={styles.section}>
          <BloomSectionHeader
            title="0. Phase 15B · Kiểm tra toàn app"
            subtitle="Một lần bấm: Bloom tự đi qua 29 màn production thật ở chế độ chỉ đọc, rồi chạy 13 bài stress RAM-only. Không cần bạn tạo dữ liệu hay chạm từng tab."
          />
          <BloomButton
            title={appSweepState.status === "running" ? (appSweepState.runnerReady ? `Đang chạy bước ${Math.min(appSweepState.currentStep + 1, appSweepState.totalSteps)}/${appSweepState.totalSteps}…` : "Đang mở bài kiểm tra đầu tiên…") : "Kiểm tra toàn app tự động"}
            icon="speedometer-outline"
            onPress={startAppWideSweep}
            disabled={appSweepState.status === "running" || finalGateState.status === "running"}
          />
          <Text style={styles.helper}>Trong lúc chạy, Bloom bật no-write mode: không dọn Whisper/Poll, không khởi tạo Quỹ, không đánh dấu thông báo đã xem. Graph và danh sách lớn dùng RAM-only. Hãy để máy yên cho tới khi Bloom tự quay lại đây.</Text>
          {(appSweepState.status === "complete" || appSweepState.status === "aborted") && (
            <BloomCard tone={appSweepState.summary?.overall === "FAIL" ? "soft" : "accent"} style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportName}>Phase 15B · App-wide Sweep</Text>
                <Text style={styles.reportValue}>{appSweepState.summary?.overall ?? (appSweepState.status === "aborted" ? "ABORTED" : "N/A")}</Text>
              </View>
              <Text style={styles.metricDetail}>Đã chạy {appSweepState.stepResults.length}/{appSweepState.totalSteps} bước · no-write + RAM-only stress</Text>
              {!!appSweepState.abortReason && <Text style={styles.e2eError}>{appSweepState.abortReason}</Text>}
              {!!appSweepState.summary && (
                <>
                  <View style={styles.separator} />
                  <Text style={styles.metricDetail}>Màn thật · {appSweepState.summary.routePass} PASS · {appSweepState.summary.routeWarning} WARNING · {appSweepState.summary.routeFail} FAIL</Text>
                  <Text style={styles.metricDetail}>Stress RAM · {appSweepState.summary.syntheticPass} PASS · {appSweepState.summary.syntheticFail} FAIL</Text>
                  <Text style={styles.metricDetail}>Startup · {appSweepState.summary.startupMs ?? "N/A"} ms từ JS session tới app ready</Text>
                  <Text style={styles.metricDetail}>Route p95 · {appSweepState.summary.routeP95Ms ?? "N/A"} ms</Text>
                  <Text style={styles.metricDetail}>JS stall · p95 {appSweepState.summary.eventLoopP95Ms ?? "N/A"} ms · max {appSweepState.summary.eventLoopMaxMs ?? "N/A"} ms</Text>
                  <Text style={styles.metricDetail}>Listener peak · {appSweepState.summary.listenerPeak} · runtime mount peak {appSweepState.summary.mountPeak}</Text>
                  <View style={styles.separator} />
                  {appSweepState.summary.slowestRoutes.map((item, index) => (
                    <View key={`${item.label}-${index}`} style={styles.reportRow}>
                      <Text style={styles.reportName}>{index + 1}. {item.label}</Text>
                      <Text style={styles.reportValue}>{item.durationMs} ms</Text>
                    </View>
                  ))}
                </>
              )}
              <BloomButton title="Sao chép báo cáo Phase 15B" variant="outline" icon="copy-outline" onPress={() => void copyAppWideSweepReport()} />
            </BloomCard>
          )}
        </View>

        <View style={styles.section}>
          <BloomSectionHeader
            title="1. Final Performance Gate · synthetic"
            subtitle="Một lần bấm: Bloom tự render Family Graph 50→500 và 8 màn stress 100/200 mục, đo event-loop delay chuẩn hóa + long-list response rồi quay lại đây với PASS/WARNING/FAIL."
          />
          <BloomButton
            title={finalGateState.status === "running" ? `Đang chạy ${finalGateState.currentStep}/${finalGateState.totalSteps}…` : "Chạy Final Performance Gate"}
            icon="rocket-outline"
            onPress={startFinalPerformanceGate}
            disabled={finalGateState.status === "running"}
          />
          <Text style={styles.helper}>Sau khi bấm, bạn không cần thao tác gì cho tới khi Bloom tự quay lại màn này. Toàn bộ Graph/Stress dùng dữ liệu RAM-only, không ghi Firebase và không đổi Family đang dùng.</Text>
          {(finalGateState.status === "complete" || finalGateState.status === "aborted") && (
            <BloomCard style={styles.reportCard}>
              <View style={styles.reportRow}>
                <Text style={styles.reportName}>Phase 11 Final Gate</Text>
                <Text style={styles.reportValue}>{finalGateState.overall ?? "N/A"}</Text>
              </View>
              <Text style={styles.metricDetail}>Đã chạy {finalGateState.stepResults.length}/{finalGateState.totalSteps} bước · {finalGateState.status === "complete" ? "hoàn tất" : "đã dừng"}</Text>
              {!!finalGateState.abortReason && <Text style={styles.e2eError}>{finalGateState.abortReason}</Text>}
              {!!finalGateState.regression && (
                <>
                  <View style={styles.separator} />
                  {finalGateState.regression.checks.map((check) => (
                    <View key={`final-${check.name}`} style={styles.metricBlock}>
                      <View style={styles.reportRow}>
                        <Text style={styles.reportName}>{check.status} · {check.name}</Text>
                        <Text style={styles.reportValue}>{check.value}</Text>
                      </View>
                      <Text style={styles.metricDetail}>{check.detail}</Text>
                    </View>
                  ))}
                </>
              )}
              <BloomButton title="Sao chép Final Gate report" variant="outline" icon="copy-outline" onPress={() => void copyFinalGateReport()} />
            </BloomCard>
          )}
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="2. Test thao tác thật · 60 giây" subtitle="Bấm một lần rồi dùng app thật: chuyển tab, đổi nhà, mở/đóng màn hình, cuộn danh sách. Bloom tự ghi event-loop delay và độ trễ thao tác thật." />
          <BloomButton title={probeLabel} icon="play-outline" onPress={startInteractionTest} disabled={snapshot.interactionProbeRunning} />
          {snapshot.interactionProbeRunning && (
            <Text style={styles.helper}>Sau 60 giây phép đo tự dừng. Quay lại Nhà Mình → Phòng đo hiệu năng để xem kết quả.</Text>
          )}
        </View>


        <View style={styles.section}>
          <BloomSectionHeader title="3. Stress test riêng lẻ" subtitle="100/200 dữ liệu giả trong RAM. Không tạo Moment, Event, Timeline hoặc Kỷ yếu thật trên Firebase/Cloudinary." />
          {APP_STRESS_KINDS.map((kind) => (
            <View key={kind.key} style={styles.stressRow}>
              <View style={styles.stressLabel}>
                <Ionicons name={kind.icon} size={18} color={COLORS.primary} />
                <Text style={styles.stressLabelText}>{kind.label}</Text>
              </View>
              <View style={styles.stressButtons}>
                {APP_STRESS_SIZES.map((count) => (
                  <Pressable
                    key={count}
                    onPress={() => router.push({ pathname: "/performance-data-test", params: { kind: kind.key, count: String(count) } } as never)}
                    style={({ pressed }) => [styles.stressButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.stressButtonText}>{count}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <Text style={styles.helper}>Các test này đo thời gian sinh dữ liệu, group/transform, first paint, batch đầu tiên và phản hồi khi nhảy xuống cuối danh sách.</Text>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="4. Test cây lớn riêng lẻ" subtitle="Chọn quy mô cây. App tự sinh người và quan hệ trong RAM, rồi render bằng chính Family Graph hiện tại." />
          <View style={styles.sizeGrid}>
            {GRAPH_SIZES.map((count) => (
              <Pressable
                key={count}
                onPress={() => router.push({ pathname: "/performance-graph-test", params: { count: String(count) } } as never)}
                style={({ pressed }) => [styles.sizeCard, pressed && styles.pressed]}
              >
                <Ionicons name="git-network-outline" size={21} color={COLORS.primary} />
                <Text style={styles.sizeValue}>{count}</Text>
                <Text style={styles.sizeLabel}>người</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.helper}>Dữ liệu này chỉ sống trong RAM và mất hoàn toàn khi đóng màn test.</Text>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="5. Firebase E2E tự động" subtitle="DEV-only. Bloom tự tìm hoặc tạo một Bloom E2E Test Family, ghi Event + Moment thật qua Auth/Security Rules, đọc lại rồi cleanup. Không chạm Family thật." />
          <BloomButton title={e2eRunning ? "Đang chạy Firebase E2E…" : "Chạy Firebase E2E"} icon="flask-outline" onPress={() => void runFirebaseE2E()} disabled={e2eRunning} />
          <BloomButton title={e2eRunning ? "Đang tạo Event + đăng ký với Android…" : "Tạo Event + gửi notification sau 60 giây"} variant="outline" icon="notifications-outline" onPress={() => void createDeliveryProbe()} disabled={e2eRunning} />
          {!!deliveryProbe && <Text style={styles.helper}>{deliveryProbe}</Text>}
          {!!e2eError && <Text style={styles.e2eError}>FAIL · {e2eError}</Text>}
          {!!e2eReport && (
            <BloomCard style={styles.reportCard}>
              <View style={styles.reportRow}><Text style={styles.reportName}>Kết quả E2E</Text><Text style={styles.reportValue}>{e2eReport.overall}</Text></View>
              <Text style={styles.metricDetail}>{e2eReport.familyName} · {e2eReport.testRunId}</Text>
              <View style={styles.separator} />
              {e2eReport.steps.map((step) => (
                <View key={step.name} style={styles.metricBlock}>
                  <View style={styles.reportRow}><Text style={styles.reportName}>{step.status} · {step.name}</Text><Text style={styles.reportValue}>{step.durationMs} ms</Text></View>
                  <Text style={styles.metricDetail}>{step.detail}</Text>
                </View>
              ))}
              <BloomButton title="Sao chép E2E report" variant="outline" icon="copy-outline" onPress={() => void copyE2EReport()} />
            </BloomCard>
          )}
          <Text style={styles.helper}>Quan trọng: sau khi bấm, hãy GIỮ app mở cho tới khi thấy hộp thoại “Đã hẹn với Android ✓”. Chỉ sau đó mới đưa app xuống background/khóa màn hình. Probe dùng cùng DATE trigger với reminder Event thật và chỉ báo PASS sau khi Android xác nhận request đã nằm trong hàng đợi.</Text>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Đánh giá regression tự động" subtitle="Bloom tự chấm các guard quan trọng. PASS/WARNING/FAIL chỉ là ngưỡng kỹ thuật nội bộ để bắt regression giữa các build." />
          <BloomCard style={styles.reportCard}>
            <View style={styles.reportRow}>
              <Text style={styles.reportName}>Tổng thể</Text>
              <Text style={styles.reportValue}>{regression.overall}</Text>
            </View>
            <Text style={styles.metricDetail}>Coverage · Graph {regression.coverage.graphSizes.length ? regression.coverage.graphSizes.join("/") : "chưa chạy"} · Stress {regression.coverage.stressTargets.length} · Interaction {regression.coverage.hasInteractionProbe ? "có" : "chưa chạy"}</Text>
            <View style={styles.separator} />
            {regression.checks.map((check) => (
              <View key={check.name} style={styles.metricBlock}>
                <View style={styles.reportRow}>
                  <Text style={styles.reportName}>{check.status} · {check.name}</Text>
                  <Text style={styles.reportValue}>{check.value}</Text>
                </View>
                <Text style={styles.metricDetail}>{check.detail}</Text>
              </View>
            ))}
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Listener đang hoạt động" subtitle="Dùng để phát hiện listener không được tháo khi đổi tab/nhà." />
          <BloomCard style={styles.reportCard}>
            {Object.keys(snapshot.activeListeners).length ? Object.entries(snapshot.activeListeners).map(([name, count]) => (
              <View key={name} style={styles.reportRow}>
                <Text style={styles.reportName}>{name}</Text>
                <Text style={styles.reportValue}>{count}</Text>
              </View>
            )) : <Text style={styles.emptyText}>Chưa có listener được instrument.</Text>}
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Runtime mount" subtitle="Tabs navigator phải luôn là 1. Nếu lớn hơn 1, navigation stack đang giữ màn cũ." />
          <BloomCard style={styles.reportCard}>
            {Object.keys(snapshot.activeMounts).length ? Object.entries(snapshot.activeMounts).map(([name, count]) => (
              <View key={name} style={styles.reportRow}>
                <Text style={styles.reportName}>{name}</Text>
                <Text style={styles.reportValue}>{count}</Text>
              </View>
            )) : <Text style={styles.emptyText}>Chưa có runtime mount được instrument.</Text>}
          </BloomCard>
        </View>

        <View style={styles.section}>
          <BloomSectionHeader title="Kết quả gần nhất" subtitle="Chụp màn hình phần này gửi cho tôi là đủ." />
          <BloomCard style={styles.reportCard}>
            {recentMetrics.length ? recentMetrics.map((metric) => (
              <View key={metric.id} style={styles.metricBlock}>
                <View style={styles.reportRow}>
                  <Text style={styles.reportName}>{metric.name}</Text>
                  <Text style={styles.reportValue}>{metric.value} {metric.unit}</Text>
                </View>
                {!!metric.detail && <Text style={styles.metricDetail}>{metric.detail}</Text>}
              </View>
            )) : <Text style={styles.emptyText}>Chưa có metric. Hãy chạy test 60 giây hoặc mở một bài stress test.</Text>}
            {!!recentTraces.length && <View style={styles.separator} />}
            {recentTraces.map((trace) => (
              <View key={trace.id} style={styles.traceBlock}>
                <View style={styles.reportRow}>
                  <Text style={styles.reportName}>{trace.name}{trace.target ? ` · ${trace.target}` : ""}</Text>
                  <Text style={styles.reportValue}>{trace.durationMs} ms</Text>
                </View>
                {!!trace.marks.length && <Text style={styles.metricDetail}>{trace.marks.map((mark) => `${mark.label} ${mark.elapsedMs}ms`).join(" · ")}</Text>}
              </View>
            ))}
          </BloomCard>
          <View style={styles.actionGap}>
            <BloomButton title="Sao chép báo cáo" variant="outline" icon="copy-outline" onPress={() => void copyReport()} />
            <BloomButton title="Xóa số liệu test" variant="transparent" icon="trash-outline" onPress={() => performanceTestService.reset()} />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 34 },
  hero: { padding: 17, marginBottom: 22 },
  heroRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  heroIcon: { width: 46, height: 46, borderRadius: 17, backgroundColor: "rgba(255,255,255,0.8)", alignItems: "center", justifyContent: "center" },
  heroCopy: { flex: 1 },
  heroTitle: { color: COLORS.primaryText, fontSize: 16, fontWeight: "900" },
  heroText: { marginTop: 5, color: COLORS.secondaryText, fontSize: 12.5, lineHeight: 18 },
  pills: { marginTop: 14, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  section: { marginBottom: 24, gap: 10 },
  helper: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17 },
  sizeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  sizeCard: { width: "31%", minWidth: 94, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, backgroundColor: COLORS.white, paddingVertical: 14, alignItems: "center" },
  sizeValue: { marginTop: 5, color: COLORS.primaryText, fontSize: 19, fontWeight: "900" },
  sizeLabel: { marginTop: 1, color: COLORS.secondaryText, fontSize: 10.5, fontWeight: "700" },
  reportCard: { padding: 14, gap: 8 },
  reportRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  reportName: { flex: 1, color: COLORS.primaryText, fontSize: 12.5, fontWeight: "800" },
  reportValue: { color: COLORS.primary, fontSize: 12.5, fontWeight: "900" },
  metricBlock: { gap: 3 },
  traceBlock: { gap: 3 },
  metricDetail: { color: COLORS.secondaryText, fontSize: 10.5, lineHeight: 15 },
  emptyText: { color: COLORS.secondaryText, fontSize: 12, lineHeight: 17 },
  separator: { height: 1, backgroundColor: COLORS.border, marginVertical: 3 },
  actionGap: { gap: 12 },
  stressRow: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.white, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, paddingHorizontal: 13, paddingVertical: 8 },
  stressLabel: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 },
  stressLabelText: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: "900" },
  stressButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  stressButton: { minWidth: 52, minHeight: 40, borderRadius: 14, backgroundColor: COLORS.surfaceFocus, borderWidth: 1, borderColor: COLORS.focusBorder, alignItems: "center", justifyContent: "center", paddingHorizontal: 10 },
  stressButtonText: { color: COLORS.primaryText, fontSize: 12, fontWeight: "900" },
  e2eError: { color: "#B42318", fontSize: 11.5, lineHeight: 17, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
