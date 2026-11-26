/**
 * Native single-session Production client (R16R10).
 * Enabled only in explicitly configured Production APKs, for every Firebase UID.
 * This is a cooperative session gate; Firebase Rules/SDK access is NOT
 * automatically revoked by a Gateway lease. Do not claim full enforcement.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@react-native-firebase/auth';

export type AndroidLease = { uid: string; token: string };
export type AndroidSessionCheck = 'active' | 'replaced';
export type AndroidSessionReason = 'replaced' | 'reauth' | 'unreachable' | 'config';
export class AndroidSessionError extends Error {
  constructor(public readonly reason: AndroidSessionReason, message: string) {
    super(message); this.name = 'AndroidSessionError';
  }
}

const enabled = process.env.EXPO_PUBLIC_SINGLE_SESSION_ENABLED === '1';
const rawEndpoint = (process.env.EXPO_PUBLIC_SINGLE_SESSION_API_URL || '').trim();
const prefix = 'fb:native:sas-production:v1:';
let explicitLoginIntent = false;

export function singleSessionEnabled(uid: string): boolean { return enabled && typeof uid === 'string' && uid.length > 0; }
export function markAndroidLoginIntent(): void { explicitLoginIntent = true; }
export function clearAndroidLoginIntent(): void { explicitLoginIntent = false; }

function endpoint(): string {
  if (!rawEndpoint) throw new AndroidSessionError('config', 'Đăng nhập hiện chưa sẵn sàng. Bạn thử lại sau nhé.');
  // Hermes has global URL; do not put any UID/credential in the URL.
  let url: URL;
  try { url = new URL(rawEndpoint); } catch { throw new AndroidSessionError('config', 'Chưa thể đăng nhập. Bạn thử lại sau nhé.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !url.pathname.endsWith('/api/session')) {
    throw new AndroidSessionError('config', 'Chưa thể đăng nhập. Bạn thử lại sau nhé.');
  }
  return url.toString();
}
/** AbortController only cancels fetch, not the preceding Firebase getIdToken(). */
function withSessionDeadline<T>(job: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new AndroidSessionError('unreachable', 'Xác minh phiên quá thời gian chờ. Hãy thử lại.')), ms);
  });
  return Promise.race([job, timedOut]).finally(() => { if (timer) clearTimeout(timer); });
}
async function request(user: User, action: 'claim'|'check'|'release', token?: string): Promise<{state: AndroidSessionCheck; token?: string}> {
  const url = endpoint();
  const controller = new AbortController();
  let response: Response;
  try {
    const idToken = await withSessionDeadline(user.getIdToken(), 12000);
    response = await withSessionDeadline(fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}`,
        'X-FamilyBloom-Client': 'android' },
      body: JSON.stringify({ action, ...(token ? { token } : {}) }),
      signal: controller.signal,
    }), 12000);
  } catch {
    controller.abort();
    throw new AndroidSessionError('unreachable', 'Không kết nối được dịch vụ phiên. Kiểm tra mạng và thử lại.');
  }
  let body: any;
  try { body = await withSessionDeadline(response.json(), 6000); } catch { body = null; }
  if (response.status === 409 && body?.state === 'replaced') return { state: 'replaced' };
  if (!response.ok || !body || typeof body !== 'object') {
    if (response.status === 401) {
      throw new AndroidSessionError('reauth', 'Vui lòng đăng nhập lại để tiếp tục.');
    }
    if (response.status === 403 || response.status === 404 || response.status === 503) {
      throw new AndroidSessionError('config', 'Đăng nhập hiện chưa sẵn sàng. Bạn thử lại sau nhé.');
    }
    throw new AndroidSessionError('unreachable', 'Chưa thể xác nhận tài khoản. Bạn thử lại nhé.');
  }
  if (body.state === 'active' && (action !== 'claim' ||
    (typeof body.token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(body.token)))) {
    return { state: 'active', token: body.token };
  }
  throw new AndroidSessionError('unreachable', 'Chưa thể xác nhận tài khoản. Bạn thử lại nhé.');
}

/** Old installs must reauthenticate; never silently claim using persisted Firebase user. */
export async function activateAndroidSession(user: User): Promise<AndroidLease | null> {
  if (!singleSessionEnabled(user.uid)) return null;
  const key = prefix + user.uid;
  if (explicitLoginIntent) {
    const result = await request(user, 'claim');
    if (!result.token) throw new AndroidSessionError('unreachable', 'Chưa thể tạo phiên.');
    // Persist the opaque lease BEFORE unlocking protected screens.
    await withSessionDeadline(AsyncStorage.setItem(key, result.token), 6000);
    explicitLoginIntent = false;
    return { uid: user.uid, token: result.token };
  }
  let stored: string | null;
  try { stored = await withSessionDeadline(AsyncStorage.getItem(key), 6000); }
  catch { throw new AndroidSessionError('config', 'Chưa thể xác nhận tài khoản trên thiết bị này.'); }
  if (!stored) throw new AndroidSessionError('reauth', 'Vui lòng đăng nhập lại để bảo vệ tài khoản.');
  const lease = { uid: user.uid, token: stored };
  const result = await checkAndroidSession(user, lease);
  if (result === 'replaced') {
    await forgetAndroidLease(lease);
    throw new AndroidSessionError('replaced', 'Tài khoản đã được đăng nhập trên thiết bị khác.');
  }
  return lease;
}
export async function checkAndroidSession(user: User, lease: AndroidLease): Promise<AndroidSessionCheck> {
  if (user.uid !== lease.uid) return 'replaced';
  const result = await request(user, 'check', lease.token);
  return result.state;
}
export async function forgetAndroidLease(lease: AndroidLease): Promise<void> {
  try { if (await AsyncStorage.getItem(prefix + lease.uid) === lease.token)
    await AsyncStorage.removeItem(prefix + lease.uid); } catch { /* best effort on logout */ }
}
export async function releaseAndroidSession(user: User, lease: AndroidLease | null): Promise<void> {
  if (!lease) return;
  // B's active lease must not be released by A's stale token.
  try { await request(user, 'release', lease.token); } catch { /* logout must still work offline */ }
  await forgetAndroidLease(lease);
}
