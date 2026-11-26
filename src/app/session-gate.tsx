import * as Clipboard from "expo-clipboard";
import { SessionDiagnosticCard } from "../diagnostics/SessionDiagnosticCard";
import { familyBloomSessionDiagnostics as diagnostic, sessionDiagnosticsEnabled } from "../diagnostics/sessionDiagnostics";
import { metroTestLogsEnabled } from "../diagnostics/metroLogging";
import { useBloomThemeRevision } from '../theme/BloomThemeProvider';
import { createBloomStyles } from '../theme/createBloomStyles';
import { COLORS } from '../constants/theme';
import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../components/ui/BloomText';
import { useAuth } from "../context/AuthContext";
import { canEnterFamilyHome } from "../services/navigation/familySessionAccess";
import { WelcomeModal } from "../components/onboarding/WelcomeModal";
import { useFocusEffect } from "expo-router";
import { canViewDetailedDiagnostics } from "../diagnostics/SessionDiagnosticCard";
import { resolveSessionGateDisplayStage, pendingCodeForSessionGate } from "../services/navigation/sessionGateDisplayState";
import { useA3Theme } from '../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../appearance3/compatReactiveStyles';


/** Public route anchor, never reads protected family records or renders Home.
 * Only a verified UID + authoritative Profile and Membership can leave here.
 */
export default function SessionGate() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const {
    authStatus, profileStatus, membershipStatus, welcomeReady,
    verificationIssue, user, userProfile, families, activeFamilyId,
    familySelectionRequired, showWelcome, dismissWelcome, retryFirebaseVerification,
    singleSessionStatus, singleSessionNotice, logout,
  } = useAuth();
  // The SAME authoritative UID/Profile/Membership/Family/Welcome gate that
  // protects (tabs) decides whether /session-gate may display the letter.
  // Never infer access from diagnostic reports or Firestore cache.
  const verifiedFamily = canEnterFamilyHome({
    uid: user?.uid, profileUid: userProfile?.uid,
    profileStatus, membershipStatus, activeFamilyId,
    verifiedMembershipFamilyIds: families.map(item => item.familyId),
    familySelectionRequired,
  });
  const welcomeOnGate = authStatus === "signed-in" && verifiedFamily && welcomeReady && showWelcome;
  const authFailed = authStatus === "error";
  const profileFailed = !!user && profileStatus === "error";
  const memberFailed = !!user && profileStatus === "ready" && membershipStatus === "error";
  const failed = authFailed || profileFailed || memberFailed || singleSessionStatus === 'unavailable';
  // Cloud/Auth observer callbacks occasionally remain pending on Android after
  // Google Activity hand-off. Keep the user on the safe route, but offer retry.
  const [stalled, setStalled] = useState(false);
  const nativeProbeShown = useRef(false);
  const [nativeRouteFocused, setNativeRouteFocused] = useState(false);
  useFocusEffect(useCallback(() => {
    setNativeRouteFocused(true);
    diagnostic.note("NAVIGATION", "foreground", { source: "native", result: "session-gate-focused" });
    if (metroTestLogsEnabled) console.info("[BloomVisualD3] session-gate-focused");
    return () => {
      setNativeRouteFocused(false);
      diagnostic.note("NAVIGATION", "foreground", { source: "native", result: "session-gate-blurred" });
      if (metroTestLogsEnabled) console.info("[BloomVisualD3] session-gate-blurred");
    };
  }, []));
  // Probe a DIFFERENT Android window via a native Alert, once per process.
  // It cannot open Home, change auth or dismiss Welcome. This is dev-only and
  // restricted to the verified developer account to avoid interrupting members.
  useEffect(() => {
    if (!sessionDiagnosticsEnabled || !welcomeOnGate || !nativeRouteFocused || nativeProbeShown.current ||
        !(typeof __DEV__ !== "undefined" && __DEV__) || Platform.OS !== "android" ||
        !canViewDetailedDiagnostics(user)) return;
    const timer = setTimeout(() => {
      nativeProbeShown.current = true;
      diagnostic.note("WELCOME", "probe", { source: "native", result: "native-alert-request" });
      if (metroTestLogsEnabled) console.info("[BloomVisualD3] native-alert-request");
      Alert.alert("Family Bloom D3 · Kiểm tra lớp", "Đây là hộp thoại Android độc lập với Native Stack. Nếu thấy hộp thoại này nhưng nền phía sau vẫn trắng, hãy sao chép nhật ký và gửi lại.", [
        { text: "Đóng kiểm tra", style: "cancel" },
        { text: "Sao chép nhật ký", onPress: () => { void Clipboard.setStringAsync(diagnostic.exportReport()); } },
      ], { cancelable: true });
    }, 3500);
    return () => clearTimeout(timer);
  }, [welcomeOnGate, nativeRouteFocused, user]);
  const [retrySequence, setRetrySequence] = useState(0);
  const retryNow = () => {
    setStalled(false);
    setRetrySequence(v => v + 1);
    retryFirebaseVerification();
  };
  useEffect(() => {
    setStalled(false);
    // The native /session-gate screen is now the REAL Welcome surface.
    // Never show a fake Membership timeout behind a verified letter.
    if (failed || welcomeOnGate) return;
    const timer = setTimeout(() => setStalled(true), 12000);
    return () => clearTimeout(timer);
  }, [failed, authStatus, profileStatus, membershipStatus, welcomeReady, welcomeOnGate, user?.uid, retrySequence]);
  // Give support a stage identifier without exposing UID, names or Firestore paths.
  const stageCode = resolveSessionGateDisplayStage({
    authStatus, profileStatus, membershipStatus, welcomeReady, userPresent: !!user,
  });
  const diagnosisCode = authFailed ? "AUTH-001"
    : profileFailed ? (verificationIssue?.kind === "permission" ? "PRO-103" : "PRO-101")
    : memberFailed ? (verificationIssue?.kind === "permission" ? "MEM-202" : "MEM-201")
    : pendingCodeForSessionGate(stageCode);
  const detail = singleSessionStatus === 'unavailable'
    ? (singleSessionNotice || 'Chưa thể xác nhận tài khoản.')
    : authFailed
    ? "Chưa xác nhận được tài khoản. Bạn vẫn được giữ đăng nhập để thử lại."
    : profileFailed
      ? "Chưa tải được hồ sơ của bạn. Dữ liệu vẫn được giữ nguyên, hãy thử lại nhé."
      : memberFailed
        ? "Chưa xác nhận được ngôi nhà bạn thuộc về. Bạn có thể thử kết nối lại."
        : authStatus === "initializing"
          ? "Đang xác nhận tài khoản đăng nhập…"
          : profileStatus === "loading" || profileStatus === "idle"
            ? "Đang xác minh hồ sơ của bạn…"
            : membershipStatus === "ready" && !welcomeReady ? "Đang kiểm tra Thư Ngõ của gia đình…"
            : membershipStatus !== "ready" && !!user ? "Đang kiểm tra mái nhà và quyền thành viên…"
            : "Đang chuyển đến màn hình phù hợp…";
  const verificationHint = verificationIssue?.kind === "permission"
    ? "Bạn chưa thể truy cập thông tin này. Hãy thử lại hoặc liên hệ người quản lý gia đình."
    : verificationIssue?.kind === "timeout"
      ? "Đang chờ lâu hơn dự kiến. Bạn thử lại nhé."
      : verificationIssue?.kind === "unavailable"
        ? "Bloom tạm thời chưa thể kết nối. Ứng dụng sẽ thử lại khi kết nối phục hồi."
        : null;
  useEffect(() => {
    if (!stalled || failed || welcomeOnGate) return;
    const stage = stageCode;
    diagnostic.note(stage, "session-gate", { result: "still-waiting-after-12s" });
  }, [failed, stalled, stageCode, welcomeOnGate]);
  useEffect(() => {
    if (!welcomeOnGate) return;
    diagnostic.note("WELCOME", "foreground", { source: "native", result: "session-gate-letter-mounted" });
    return () => diagnostic.note("WELCOME", "foreground", { source: "native", result: "session-gate-letter-unmounted" });
  }, [welcomeOnGate]);
  if (welcomeOnGate) {
    return (
      <View style={__a3_styles.verifiedWelcomeScreen} collapsable={false} testID="verified-welcome-native-screen"
        onLayout={() => diagnostic.note("WELCOME", "layout", { source: "native", result: "session-gate-letter-layout" })}>
        <WelcomeModal visible name={userProfile?.displayName} onContinue={dismissWelcome} />
        {/* TEMPORARY GREEN MARKER: native /session-gate React child. If this is
            absent while the Android alert appears, the child screen is obscured
            or the native route is not foreground. The marker is non-interactive. */}
        {sessionDiagnosticsEnabled && typeof __DEV__ !== "undefined" && __DEV__ ? (
          <View style={__a3_styles.gateVisualProbe} pointerEvents="none" testID="d3-gate-visual-probe"
            onLayout={() => diagnostic.note("WELCOME", "probe", { source: "native", result: "gate-probe-layout" })}>
            <Text style={__a3_styles.gateVisualProbeText}>D3 GATE · {nativeRouteFocused ? "FOCUSED" : "NOT FOCUSED"}</Text>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={__a3_styles.container} style={__a3_styles.screen} accessibilityLabel="Family Bloom xác minh phiên đăng nhập">
      <View style={__a3_styles.topGlow} pointerEvents="none" />
      <View style={__a3_styles.flower}><Ionicons name="flower-outline" size={49} color={__a3Colors.primary} /></View>
      <Text style={__a3_styles.title}>Family Bloom</Text>
      <Text style={__a3_styles.tagline}>Nơi yêu thương luôn nở hoa</Text>
      <View style={__a3_styles.space} />
      {failed || stalled ? (
        <View style={__a3_styles.messageCard} accessibilityLiveRegion="polite">
          <Ionicons name="shield-checkmark-outline" size={32} color={__a3Colors.primary} />
          <Text style={__a3_styles.failureTitle}>{failed ? "Chưa xác minh được dữ liệu gia đình" : "Đang xác minh lâu hơn dự kiến"}</Text>
          <Text style={__a3_styles.description}>{verificationHint ?? detail}</Text>
          {typeof __DEV__ !== "undefined" && __DEV__ && canViewDetailedDiagnostics(user) && <>
            <Text style={__a3_styles.stageCode}>Bước xác minh: {stageCode}{verificationIssue ? ` · ${verificationIssue.kind}` : " · đang chờ"}</Text>
            <Text style={__a3_styles.stageCode}>Mã chẩn đoán: {diagnosisCode}</Text>
          </>}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Thử kết nối lại"
            onPress={retryNow}
            style={__a3_styles.retryButton}
          >
            <Ionicons name="refresh" size={18} color={__a3Colors.onPrimary} />
            <Text style={__a3_styles.retryText}>Thử lại</Text>
          </Pressable>
          {singleSessionStatus === 'unavailable' && (
            <Pressable accessibilityRole="button" accessibilityLabel="Đăng xuất để đăng nhập lại"
              onPress={() => { void logout(); }} style={__a3_styles.logoutRetryButton}>
              <Text style={__a3_styles.logoutRetryText}>Đăng xuất và đăng nhập lại</Text>
            </Pressable>
          )}
          <Text style={__a3_styles.footnote}>Dữ liệu hiện có được giữ nguyên. Bloom sẽ không mở nhà khi chưa xác nhận đúng tài khoản.</Text>
          {typeof __DEV__ !== "undefined" && __DEV__ && canViewDetailedDiagnostics(user) && <SessionDiagnosticCard
            authUser={user}
            showWhenHealthy={true}
            onCopyReport={async (report) => { await Clipboard.setStringAsync(report); }}
          />}
        </View>
      ) : (
        <View style={__a3_styles.loading} accessibilityLiveRegion="polite">
          <ActivityIndicator color={__a3Colors.primary} size="small" />
          <Text style={__a3_styles.loadingText}>Đang chuẩn bị mái nhà của bạn...</Text>
          <Text style={__a3_styles.description}>{detail}</Text>
        </View>
      )}
      <View style={__a3_styles.footer}><Ionicons name="heart-outline" color={__a3Colors.primary} size={14} /><Text style={__a3_styles.footerText}>Gắn kết gia đình · Lưu giữ yêu thương</Text></View>
    </ScrollView>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  verifiedWelcomeScreen: { flex: 1, backgroundColor: COLORS.surface },
  gateVisualProbe: { position: "absolute", top: 8, left: 9, right: 9, minHeight: 28, borderRadius: 6, zIndex: 30000, elevation: 300, backgroundColor: "#086D45", justifyContent: "center", alignItems: "center" },
  gateVisualProbeText: { fontSize: 11, fontWeight: "900", color: "#FFFFFF" },
  container: { flexGrow: 1, minHeight: 680, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 25, overflow: "hidden" },
  topGlow: { position: "absolute", top: -160, right: -160, width: 390, height: 390, borderRadius: 195, backgroundColor: COLORS.softSurface },
  flower: { width: 112, height: 112, borderRadius: 56, borderWidth: 12, borderColor: COLORS.border, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", marginBottom: 22 },
  title: { fontSize: 29, fontWeight: "900", color: COLORS.primary, textAlign: "center" },
  tagline: { marginTop: 7, fontSize: 13, color: COLORS.primary, textAlign: "center" },
  space: { height: 70 },
  loading: { alignItems: "center", gap: 13, minHeight: 180 },
  loadingText: { fontSize: 16, fontWeight: "800", color: COLORS.primary, textAlign: "center" },
  description: { fontSize: 13, color: COLORS.secondaryText, textAlign: "center", lineHeight: 21, marginTop: 4 },
  messageCard: { width: "100%", borderRadius: 24, padding: 22, backgroundColor: COLORS.surface, alignItems: "center", gap: 12, borderWidth: 1, borderColor: COLORS.border },
  failureTitle: { fontSize: 18, fontWeight: "900", color: COLORS.primary, textAlign: "center" },
  retryButton: { minHeight: 48, paddingHorizontal: 27, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: COLORS.primary, borderRadius: 15, marginTop: 5 },
  retryText: { fontSize: 15, fontWeight: "800", color: COLORS.onPrimary },
  logoutRetryButton: { minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  logoutRetryText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryText },
  stageCode: { fontSize: 10, color: COLORS.secondaryText, textAlign: "center" },
  footnote: { fontSize: 11, lineHeight: 17, textAlign: "center", color: COLORS.secondaryText },
  footer: { marginTop: 24, marginBottom: 26, flexDirection: "row", gap: 7, alignItems: "center" },
  footerText: { fontSize: 11, color: COLORS.secondaryText },
}));
