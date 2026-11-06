import { getBloomStatusBarStyle } from "../../constants/theme";
import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
/**
 * Developer-only destructive Firestore schema testing.
 * Writes are performed by a strictly allowlisted Vercel Admin API so that
 * production Firestore Rules remain strict. Never ships any Admin credentials.
 * Test ONE document at a time and delete it manually in Firebase Console.
 */
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getAuth } from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../../components/ui/BloomText';
import { ScreenContainer } from '../../components/layout/ScreenContainer';
import { BloomCard, BloomSectionHeader } from '../../components/ui/BloomPageComponents';
import { BloomHeroHeader } from '../../components/ui/BloomHeroHeader';
import { useBloomToast } from '../../components/ui/BloomToast';
import { COLORS } from '../../constants/theme';
import { ENV } from '../../config/env';
import { isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { useAuth } from '../../context/AuthContext';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


type TestCase = { id: string; label: string; where: string; what: string };
const CASES: TestCase[] = [
  { id: 'MEMBERSHIP_BAD_DATE', label: 'Membership · joinedAt là object', where: 'Khởi động lại app / Danh sách nhà', what: 'Thử dữ liệu ngày thành viên không phải ISO. Tạo một membership giả riêng, không sửa nhà thật.' },
  { id: 'MEMBERSHIP_BAD_ROLE', label: 'Membership · role là object', where: 'Khởi động lại app / Danh sách nhà', what: 'Kiểm tra phòng thủ quyền truy cập: role sai không được cấp quyền hoặc gây crash.' },
  { id: 'MEMBER_BAD_DATE', label: 'Thành viên · joinedAt sai kiểu', where: 'Màn thành viên / Gia đình', what: 'Tạo thành viên giả trong gia đình test với ngày gia nhập không hợp lệ.' },
  { id: 'JOIN_BAD_APPLICANT', label: 'Xin vào nhà · applicant = null', where: 'Kiểm duyệt yêu cầu gia nhập', what: 'Một hồ sơ pending thiếu object applicant; không được crash hoặc có thể duyệt.' },
  { id: 'JOIN_BAD_INTERESTS', label: 'Xin vào nhà · interests là object', where: 'Kiểm duyệt yêu cầu gia nhập', what: 'Thử giá trị không phải danh sách trong dữ liệu lồng nhau.' },
  { id: 'EVENT_BAD_DATE', label: 'Sự kiện · dateISO là object', where: 'Lịch / Sự kiện (truy vấn hằng năm)', what: 'Ngày sai kiểu phải bị bỏ qua; lưu ý truy vấn ngày theo khoảng có thể không tải bản ghi này.' },
  { id: 'EVENT_BAD_TITLE', label: 'Sự kiện · title là array', where: 'Sự kiện / Sắp tới', what: 'Tiêu đề sai kiểu; thử nghiệm UI dự phòng mà không crash.' },
  { id: 'EVENT_BAD_PARTICIPANTS', label: 'Sự kiện · participantIds là object', where: 'Sự kiện / Sắp tới', what: 'Danh sách người tham gia sai kiểu.' },
  { id: 'MOMENT_BAD_DATE', label: 'Moment · createdAt là object', where: 'Khoảnh khắc / Dòng thời gian', what: 'Ngày tạo sai kiểu; kiểm tra phân trang và sắp xếp.' },
  { id: 'MOMENT_BAD_MEDIA', label: 'Moment · media chứa object lỗi', where: 'Khoảnh khắc / Dòng thời gian', what: 'Mảng ảnh chứa null, số và URL sai kiểu.' },
  { id: 'MOMENT_BAD_COUNTS', label: 'Moment · bộ đếm sai kiểu', where: 'Khoảnh khắc / Dòng thời gian', what: 'Reaction counts và commentCount sai cấu trúc.' },
];

type ActiveFixture = { path: string; caseId: string; screen: string };
// Public URL only, NEVER place Firebase/Cloudinary Admin secrets in the APK.
// Diagnostic fallback keeps this private test tool usable in local APK builds
// where the EXPO_PUBLIC_ variable was not injected; Vercel still denies writes
// unless the verified developer and dedicated family are allowlisted server-side.
const API_URL = ENV.momentMediaApiUrl.trim().replace(/\/+$/, '');
type ApiReply = { ok?: boolean; ready?: boolean; verified?: boolean; active?: ActiveFixture | null;
  firebaseProjectId?: string | null; testFamilyId?: string | null; error?: string };
type ApiResult = { active: ActiveFixture | null; ready: boolean; verified: boolean;
  firebaseProjectId: string | null; testFamilyId: string | null };
function friendlyApiError(status: number, raw: string): string {
  if (status === 404) return 'HTTP 404: Chưa deploy /api/dev/data-fault lên Vercel (Root Directory phải là vercel-media).';
  if (status === 405) return 'HTTP 405: API không nhận POST; kiểm tra địa chỉ Vercel và cấu hình route.';
  if (status === 401) return 'HTTP 401: Firebase ID token không hợp lệ hoặc đã hết hạn.';
  if (raw === 'Diagnostic API disabled') return 'HTTP 403: API đang TẮT. Đặt FAMILY_BLOOM_DEV_DATA_TEST_ENABLED=true trên Vercel Production và Redeploy.';
  if (raw === 'Diagnostic allowlist not configured') return 'HTTP 503: Chưa cấu hình UID/familyId thử nghiệm trên Vercel.';
  if (raw === 'Wrong sandbox family') return 'HTTP 403: Gia đình đang chọn trong Android khác FAMILY_BLOOM_DEV_TEST_FAMILY_ID trên Vercel.';
  if (raw === 'Developer must own/admin the dedicated test family') return 'HTTP 403: Thiếu membership owner/admin trong gia đình thử nghiệm.';
  if (raw === 'Use a dedicated one-person test family only') return 'HTTP 403: Gia đình test phải tồn tại và chỉ có thành viên developer.';
  if (raw === 'Forbidden') return 'HTTP 403: UID/emailVerified/email của developer không khớp allowlist.';
  if (status === 409) return `HTTP 409: ${raw || 'Có dữ liệu test cũ; hãy xóa document FB_DIAG_ trước.'}`;
  if (status >= 500) return `HTTP ${status}: ${raw || 'Lỗi máy chủ.'} Kiểm tra Vercel Runtime Logs, FIREBASE_SERVICE_ACCOUNT_JSON và quyền Firebase Admin.`;
  return `HTTP ${status}: ${raw || 'Không xác định được lỗi từ API.'}`;
}
const expectedPath = (caseName: string, uid: string, familyId: string): string => {
  const id = `FB_DIAG_${caseName}_${uid.slice(0, 8)}`;
  if (caseName.startsWith('MEMBERSHIP_')) return `users/${uid}/memberships/${id}`;
  const collection = caseName.startsWith('MEMBER_') ? 'members'
    : caseName.startsWith('JOIN_') ? 'joinRequests'
    : caseName.startsWith('EVENT_') ? 'events' : 'moments';
  return `families/${familyId}/${collection}/${id}`;
};

export default function FirestoreDataFaultTestScreen() {
  const __a3Theme = useA3Theme();

  const __a3Colors = __a3Theme.colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
  const router = useRouter();
  const { user, activeFamilyId } = useAuth();
  const { showToast } = useBloomToast();
  const allowed = isVerifiedDeveloperAccount(user);
  const [caseId, setCaseId] = useState(CASES[0].id);
  const [active, setActive] = useState<ActiveFixture | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState<ApiResult | null>(null);
  const [successPath, setSuccessPath] = useState('');
  const selected = CASES.find((item) => item.id === caseId) || CASES[0];
  const predicted = user?.uid && activeFamilyId ? expectedPath(caseId, user.uid, activeFamilyId) : '';

  useEffect(() => { if (!allowed) router.replace('/settings' as never); }, [allowed, router]);

  const invoke = useCallback(async (action: 'create' | 'status', chosenId?: string): Promise<ApiResult> => {
    if (!allowed || !API_URL || !activeFamilyId) throw new Error('Cần tài khoản developer, gia đình test và địa chỉ Vercel Media.');
    const authUser = getAuth().currentUser;
    if (!authUser || authUser.uid !== user?.uid) throw new Error('Firebase Auth chưa sẵn sàng hoặc UID đã thay đổi.');
    const token = await authUser.getIdToken();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/dev/data-fault`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, caseId: chosenId, familyId: activeFamilyId }),
        signal: controller.signal,
      });
    } catch (e) {
      throw new Error(`Không kết nối được Vercel ${API_URL} (mạng/DNS/timeout): ${e instanceof Error ? e.message : 'lỗi kết nối'}`);
    } finally { clearTimeout(timer); }
    // Vercel may reply with an HTML 404/503 page; don't hide its HTTP status
    // behind a generic 'Unexpected token <' JSON parse error.
    let result: ApiReply = {};
    try {
      const body = await res.text();
      if (body) {
        const parsed: unknown = JSON.parse(body);
        if (parsed && typeof parsed === 'object') result = parsed as ApiReply;
      }
    } catch { /* HTTP code still explains an invalid/HTML response. */ }
    if (!res.ok || !result.ok) throw new Error(friendlyApiError(res.status, result.error || ''));
    return { active: result.active || null, ready: !!result.ready || action === 'create',
      verified: !!result.verified, firebaseProjectId: result.firebaseProjectId || null,
      testFamilyId: result.testFamilyId || null };
  }, [activeFamilyId, allowed, user?.uid]);

  const checkStatus = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const status = await invoke('status');
      setConnection(status);
      setActive(status.active);
      showToast({ type: status.active ? 'warning' : 'success', title: status.active ? 'Còn dữ liệu lỗi trên Firestore' : 'Vercel & Firestore đã sẵn sàng', duration: 3300 });
    } catch (e) { setConnection(null); setError(e instanceof Error ? e.message : 'Không kiểm tra được'); }
    finally { setLoading(false); }
  }, [invoke, showToast]);

  const create = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await invoke('create', caseId);
      if (!result.verified || !result.active?.path) throw new Error('Máy chủ chưa xác nhận đọc lại document sau khi ghi; hãy kiểm tra Firestore trước khi thử tiếp.');
      setConnection(result);
      setActive(result.active);
      setSuccessPath(result.active.path);
      await Clipboard.setStringAsync(result.active.path);
      showToast({ type: 'success', title: 'Đã ghi và đọc lại dữ liệu trên Firestore', message: 'Đường dẫn xóa đã sao chép. Kiểm tra đúng Firebase project hiển thị.', duration: 5000 });
    } catch (e) { setError(e instanceof Error ? e.message : 'Không ghi được dữ liệu'); }
    finally { setLoading(false); }
  }, [caseId, invoke, showToast]);

  // Sao chép đường dẫn TRƯỚC khi ghi vì một listener lỗi có thể crash APK tức thì.
  const confirmCreate = () => {
    if (predicted) void Clipboard.setStringAsync(predicted);
    Alert.alert(
      'GHI DỮ LIỆU SAI THẬT LÊN FIRESTORE',
      `Ca: ${selected.id}\nGia đình: ${activeFamilyId || '(chưa chọn)'}\n\nĐây là dữ liệu CỐ TÌNH SAI, có thể làm ứng dụng crash. Chỉ thử trong gia đình riêng để kiểm thử. Bạn phải xóa tài liệu FB_DIAG_ trực tiếp trên Firestore sau mỗi ca.`,
      [
        { text: 'Không ghi', style: 'cancel' },
        { text: 'Ghi dữ liệu lỗi', style: 'destructive', onPress: () => { void create(); } },
      ],
    );
  };
  useEffect(() => {
    if (!allowed || !activeFamilyId || !API_URL) return;
    let current = true;
    void invoke('status').then((status) => {
      if (current) { setActive(status.active); setConnection(status); setError(''); }
    }).catch((e) => {
      if (current) { setConnection(null); setError(e instanceof Error ? e.message : 'Không kiểm tra được Vercel'); }
    });
    return () => { current = false; };
  }, [activeFamilyId, allowed, invoke]);
  if (!allowed) return null;
  return (
    <ScreenContainer edgeToEdgeTop edgeToEdgeHorizontal backgroundColor={__a3Colors.background}>
      <StatusBar translucent backgroundColor="transparent" style={(__a3Theme.resolvedMode === 'dark' ? 'light' : 'dark')} />
      <BloomHeroHeader eyebrow="PRIVATE · DEVELOPER" title="Thử dữ liệu Firestore lỗi" subtitle="Ghi dữ liệu sai thật, mỗi lần một tình huống. Xóa thủ công qua Firebase Console." variant="profile" compact roundedBottom onBack={() => router.back()} />
      <ScrollView contentContainerStyle={__a3_styles.body} showsVerticalScrollIndicator={false}>
        <BloomCard style={__a3_styles.warningCard}>
          <Text style={__a3_styles.warningTitle}>Chỉ thử trong gia đình thử nghiệm</Text>
          <Text style={__a3_styles.copy}>API đặc quyền phải bật thủ công trên Vercel, khóa theo Firebase UID và familyId. Không sửa bản ghi thật, không nới Firestore Rules và không tự xóa bản ghi test.</Text>
          <Text style={__a3_styles.family}>Đang chọn: {activeFamilyId || 'Chưa có gia đình'}</Text>
          <Text selectable style={__a3_styles.copy}>API: {API_URL}/api/dev/data-fault</Text>
          {connection?.ready ? <>
            <Text style={__a3_styles.ready}>✓ API đã xác thực developer + kiểm tra gia đình thử nghiệm.</Text>
            <Text selectable style={__a3_styles.family}>Firebase project nhận ghi: {connection.firebaseProjectId || '(Firebase Admin chưa báo project_id)'}</Text>
            <Text selectable style={__a3_styles.family}>Family ID được phép: {connection.testFamilyId || '(chưa trả về)'}</Text>
          </> : <Text style={__a3_styles.error}>Chưa xác nhận kết nối ghi Firestore. Xem thông báo lỗi bên dưới hoặc bấm kiểm tra.</Text>}
          <Pressable disabled={loading} style={__a3_styles.secondaryButton} onPress={() => void checkStatus()}>
            {loading ? <ActivityIndicator color={__a3Colors.primary} /> : <Ionicons name="cloud-done-outline" size={19} color={__a3Colors.primary} />}
            <Text style={__a3_styles.secondaryText}>Kiểm tra Vercel + quyền ghi Firebase</Text>
          </Pressable>
          {!!error && <Text selectable style={__a3_styles.error}>Không ghi được: {error}</Text>}
        </BloomCard>
        <View style={__a3_styles.section}>
          <BloomSectionHeader title="Chọn một ca lỗi" subtitle="Chọn ca, bấm ghi, rồi mở trang cần kiểm tra" />
          {CASES.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: caseId === item.id }}
              disabled={loading || !!active}
              onPress={() => setCaseId(item.id)}
              style={({ pressed }) => [__a3_styles.caseItem, caseId === item.id && __a3_styles.caseSelected, pressed && __a3_styles.pressed, !!active && __a3_styles.faded]}
            >
              <Ionicons name={caseId === item.id ? 'radio-button-on' : 'radio-button-off'} size={21} color={__a3Colors.primary} />
              <View style={__a3_styles.caseCopy}><Text style={__a3_styles.caseLabel}>{item.label}</Text><Text style={__a3_styles.caseWhere}>{item.where}</Text></View>
            </Pressable>
          ))}
        </View>
        <BloomCard style={__a3_styles.detailCard}>
          <Text style={__a3_styles.caseCode}>{selected.id}</Text>
          <Text style={__a3_styles.copy}>{selected.what}</Text>
          {!!predicted && !active && <>
            <Text style={__a3_styles.copy}>ĐƯỜNG DẪN DỰ KIẾN ĐỂ XÓA NẾU APP CRASH:</Text>
            <Text selectable style={__a3_styles.path}>{predicted}</Text>
            <Pressable style={__a3_styles.secondaryButton} onPress={() => void Clipboard.setStringAsync(predicted)}><Ionicons name="copy-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.secondaryText}>Sao chép đường dẫn trước khi thử</Text></Pressable>
          </>}
          <Text style={__a3_styles.copy}>Mỗi lần chỉ có một tài liệu lỗi. Nếu bản ghi vẫn tồn tại, server sẽ từ chối tạo ca tiếp theo.</Text>
        </BloomCard>
        {active ? (
          <BloomCard style={__a3_styles.activeCard}>
            {!!successPath && active.path === successPath && <Text style={__a3_styles.ready}>✓ ĐÃ GHI + ĐỌC LẠI TRÊN FIRESTORE (HTTP 201)</Text>}
            <Text style={__a3_styles.warningTitle}>ĐANG CÓ DỮ LIỆU LỖI</Text>
            <Text style={__a3_styles.copy}>Ca: {active.caseId}</Text>
            <Text style={__a3_styles.copy}>Mở: {active.screen}</Text>
            <Text selectable style={__a3_styles.path}>{active.path}</Text>
            <Pressable style={__a3_styles.secondaryButton} onPress={() => void Clipboard.setStringAsync(active.path)}><Ionicons name="copy-outline" size={17} color={__a3Colors.primary} /><Text style={__a3_styles.secondaryText}>Sao chép đường dẫn xóa</Text></Pressable>
            <Text style={__a3_styles.copy}>Vào Firebase Console → Firestore Database → Data, tìm đúng đường dẫn trên và xóa document (không xóa collection hay gia đình). Sau đó quay lại đây để kiểm tra.</Text>
          </BloomCard>
        ) : (
          <Pressable disabled={loading || !activeFamilyId || !API_URL} onPress={confirmCreate} style={({ pressed }) => [__a3_styles.primaryButton, pressed && __a3_styles.pressed, (loading || !activeFamilyId || !API_URL) && __a3_styles.faded]}>
            <Ionicons name="warning-outline" size={20} color="white" />
            <Text style={__a3_styles.primaryText}>Ghi dữ liệu lỗi vào Firebase</Text>
          </Pressable>
        )}
        <Pressable disabled={loading} style={__a3_styles.secondaryButton} onPress={() => void checkStatus()}>
          {loading ? <ActivityIndicator color={__a3Colors.primary} /> : <Ionicons name="refresh-outline" size={19} color={__a3Colors.primary} />}
          <Text style={__a3_styles.secondaryText}>Kiểm tra lại sau khi xóa thủ công</Text>
        </Pressable>
        {!!error && <Text selectable style={__a3_styles.error}>Lỗi API: {error}</Text>}
        <Text style={__a3_styles.copy}>Nếu APK dùng URL mặc định, hãy kiểm tra Vercel Media https://vercelfamilybloommedia.vercel.app. Có thể thay bằng EXPO_PUBLIC_MOMENT_MEDIA_API_URL khi build APK.</Text>
        <Text style={__a3_styles.footer}>Lưu ý: Ghi sai kiểu trực tiếp từ Android thường bị Firestore Rules chặn. Endpoint Vercel dùng Admin SDK, phải được bật tạm thời chỉ cho phép tài khoản developer trên gia đình test. Không đưa Service Account vào APK.</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = createBloomStyles(() => StyleSheet.create({
  body: { padding: 16, gap: 14, paddingBottom: 45 },
  section: { gap: 8 },
  warningCard: { padding: 16, backgroundColor: COLORS.surface },
  warningTitle: { fontWeight: '900', fontSize: 14, color: COLORS.primary },
  copy: { fontSize: 12, lineHeight: 19, color: COLORS.secondaryText, marginTop: 5 },
  family: { fontSize: 11, marginTop: 9, fontWeight: '700', color: COLORS.primaryText },
  caseItem: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, minHeight: 62, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  caseSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.surface },
  caseCopy: { flex: 1, gap: 4 },
  caseLabel: { color: COLORS.primaryText, fontSize: 12.5, fontWeight: '800' },
  caseWhere: { color: COLORS.secondaryText, fontSize: 10.5 },
  detailCard: { padding: 16 },
  caseCode: { fontWeight: '900', color: COLORS.primary, fontSize: 12 },
  activeCard: { padding: 16, borderWidth: 1, borderColor: COLORS.border },
  path: { fontFamily: 'monospace', fontSize: 12, lineHeight: 19, marginTop: 8, color: COLORS.primaryText },
  primaryButton: { backgroundColor: COLORS.primary, padding: 17, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryText: { color: COLORS.white, fontWeight: '900', fontSize: 13 },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 13, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  secondaryText: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },
  error: { color: COLORS.primary, fontSize: 12, lineHeight: 18 },
  ready: { color: COLORS.positive, fontWeight: '800', fontSize: 12, lineHeight: 19, marginTop: 8 },
  footer: { fontSize: 11, lineHeight: 17, color: COLORS.secondaryText, textAlign: 'center' },
  faded: { opacity: 0.5 },
  pressed: { opacity: 0.75 },
}));
