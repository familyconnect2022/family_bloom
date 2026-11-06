import React, { useSyncExternalStore } from 'react';
import { useBloomThemeRevision , useBloomColorsRevision, useBloomTypographyRevision} from '../theme/BloomThemeProvider';
import { COLORS } from '../constants/theme';
import { createBloomStyles } from '../theme/createBloomStyles';
import { Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../components/ui/BloomText';
import {
  familyBloomSessionDiagnostics,
  sessionDiagnosticsEnabled,
  type DiagnosticSnapshot,
  type DiagnosticErrorCode,
} from './sessionDiagnostics';

/** Diagnostic detail access is UI-only. Firebase/Firestore security relies on Rules, not this predicate. */
export function canViewDetailedDiagnostics(authUser: {
  email?: string | null;
  emailVerified?: boolean;
} | null | undefined): boolean {
  return !!authUser && authUser.emailVerified === true &&
    (authUser.email || '').trim().toLowerCase() === 'huynh235@gmail.com';
}

const TITLES: Record<string, string> = {
  'AUTH-001': 'Đang chờ Firebase xác minh phiên',
  'AUTH-002': 'Phiên đăng nhập đã thay đổi',
  'AUTH-003': 'Không xác minh được phiên đăng nhập',
  'PRO-101': 'Đọc hồ sơ quá thời gian',
  'PRO-102': 'Server xác nhận chưa có hồ sơ',
  'PRO-103': 'Không có quyền đọc hồ sơ',
  'PRO-104': 'Dữ liệu hồ sơ không hợp lệ',
  'MEM-201': 'Đang chờ xác minh tư cách thành viên',
  'MEM-202': 'Không có quyền đọc tư cách thành viên',
  'MEM-203': 'Không tìm thấy tư cách thành viên hợp lệ',
  'MEM-204': 'Nguồn dữ liệu thành viên không đồng bộ',
  'FAM-301': 'Gia đình không khớp thông tin thành viên',
  'FAM-302': 'Không xác minh được gia đình',
  'FAM-303': 'Không có quyền đọc dữ liệu gia đình',
  'WEL-401': 'Thư Ngõ chưa hiển thị',
  'WEL-402': 'Thư Ngõ chưa xuất hiện phía trước',
  'WEL-403': 'Chưa lưu được xác nhận Thư Ngõ',
  'NAV-501': 'Điều hướng không hoàn thành',
  'NAV-502': 'Chặn mở Home khi chưa xác minh',
  'SYS-601': 'Luồng xác minh chưa kết thúc',
  'SYS-602': 'Đã nhận kết quả từ lượt xác minh cũ',
};

function StatusLine({ step }: { step: DiagnosticSnapshot['steps'][number] }) {
  useBloomColorsRevision();
  useBloomTypographyRevision();
  const status = step.status === 'success' ? 'Đã xác minh' :
    step.status === 'running' ? 'Đang kiểm tra' :
    step.status === 'timeout' ? 'Quá thời gian' :
    step.status === 'failed' ? 'Thất bại' :
    step.status === 'skipped' ? 'Bỏ qua' : 'Chưa bắt đầu';
  return (
    <View style={styles.line}>
      <Text style={styles.step}>{step.stage} · {step.operation}</Text>
      <Text style={styles.status}>{status}{step.code ? ` · ${step.code}` : ''}</Text>
    </View>
  );
}

export function SessionDiagnosticCard({
  authUser,
  onRetry,
  showWhenHealthy = false,
  onCopyReport,
}: {
  authUser?: { email?: string | null; emailVerified?: boolean } | null;
  onRetry?: () => void;
  showWhenHealthy?: boolean;
  /** Optional installed clipboard service. Otherwise uses standard Android share sheet. */
  onCopyReport?: (report: string) => Promise<void> | void;
}) {
  useBloomThemeRevision();
  const snapshot = useSyncExternalStore(
    familyBloomSessionDiagnostics.subscribe,
    familyBloomSessionDiagnostics.getSnapshot,
    familyBloomSessionDiagnostics.getSnapshot,
  );
  const fullDetails = canViewDetailedDiagnostics(authUser);
  const code = snapshot.latestCode as DiagnosticErrorCode | null;
  if (!sessionDiagnosticsEnabled || (!code && !showWhenHealthy)) return null;

  async function shareReport() {
    // Full timeline is restricted to the developer; everyone may share an
    // anonymized incident code for support without exposing their account.
    const report = fullDetails ? familyBloomSessionDiagnostics.exportReport() :
      `FAMILY BLOOM · SUPPORT CODE\n${snapshot.session}\n${code || 'PENDING'}\nBước xác minh: ${snapshot.steps.filter(s => s.status === 'running' || s.status === 'timeout' || s.status === 'failed').map(s => s.stage).join(', ')}`;
    if (onCopyReport) await onCopyReport(report);
    else await Share.share({ message: report, title: 'Family Bloom · Báo cáo xác minh' });
  }

  return (
    <View style={styles.card} accessible accessibilityLabel="Chẩn đoán đăng nhập Family Bloom">
      <Text style={styles.title}>Family Bloom · Xác minh phiên đăng nhập</Text>
      <Text style={styles.description}>
        {code ? `${code} · ${TITLES[code] || 'Không thể xác minh'}` : 'Đang thu thập chẩn đoán phiên đăng nhập'}
      </Text>
      <Text style={styles.hint}>Ứng dụng chưa thể mở Home khi chưa xác minh đủ quyền.</Text>
      {fullDetails ? (
        <ScrollView style={styles.timeline} nestedScrollEnabled>
          <Text style={styles.mono}>Phiên: {snapshot.session} · Lượt: {snapshot.authEpoch}</Text>
          {snapshot.steps.map(s => <StatusLine key={`${s.stage}:${s.operation}`} step={s} />)}
          {snapshot.records.slice(-12).map((r, i) => (
            <Text style={styles.record} key={`${r.time}-${i}`}>
              {r.stage}/{r.operation} · {r.event}{r.code ? ` · ${r.code}` : ''} ({r.elapsedMs}ms)
            </Text>
          ))}
        </ScrollView>
      ) : null}
      <View style={styles.actions}>
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
            <Text style={styles.buttonText}>Thử lại an toàn</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={() => { void shareReport().catch(() => {}); }} style={styles.secondary}>
          <Text style={styles.secondaryText}>{fullDetails ? (onCopyReport ? 'Sao chép báo cáo chi tiết' : 'Chia sẻ báo cáo') : 'Sao chép mã hỗ trợ'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, padding: 16, marginVertical: 12 },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.primaryText, marginBottom: 6 },
  description: { fontSize: 14, fontWeight: '600', color: COLORS.primary, marginBottom: 6 },
  hint: { fontSize: 12, color: COLORS.secondaryText, marginBottom: 10 },
  timeline: { maxHeight: 260, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', marginVertical: 4 },
  step: { color: COLORS.primaryText, fontSize: 12, fontWeight: '600' },
  status: { color: COLORS.secondaryText, fontSize: 12 },
  mono: { color: COLORS.secondaryText, fontSize: 11, marginBottom: 8 },
  record: { color: COLORS.secondaryText, fontSize: 10, marginVertical: 2 },
  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 10 },
  button: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: COLORS.primary },
  buttonText: { fontSize: 13, color: COLORS.onPrimary, fontWeight: '700' },
  secondary: { borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },
}));
