/**
 * H25R2R5: Android Internet reachability, distinct from the radio/Wi-Fi icon.
 * No native dependency, no Firebase reads, no sockets and no user identifiers.
 * A positive reply from either independent endpoint is enough; errors from
 * Google/Firebase alone are NEVER interpreted as absence of Internet.
 */
export type InternetStatus = 'unknown' | 'online' | 'offline';
type Listener = (status: InternetStatus) => void;
let status: InternetStatus = 'unknown';
let lastChecked = 0;
let pending: Promise<InternetStatus> | null = null;
const listeners = new Set<Listener>();
const TIMEOUT_MS = 3400;
const REUSE_MS = 12000;
async function checkEndpoint(url: string, expects204: boolean): Promise<boolean> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const response = await Promise.race([
      fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => { controller.abort(); reject(new Error('INTERNET_PROBE_TIMEOUT')); }, TIMEOUT_MS);
      }),
    ]);
    if (expects204) return response.status === 204;
    if (response.status !== 200) return false;
    const body = await response.text();
    return body.includes('ip=') && body.includes('colo=');
  } catch {
    return false;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
function publish(next: InternetStatus) {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener(status);
}
export const internetReachabilityService = {
  getStatus(): InternetStatus { return status; },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  /** Force ignores cache, but concurrent requests share one physical probe. */
  checkNow(options: { force?: boolean } = {}): Promise<InternetStatus> {
    if (pending) return pending;
    if (!options.force && status !== 'unknown' && Date.now() - lastChecked < REUSE_MS) {
      return Promise.resolve(status);
    }
    pending = new Promise<InternetStatus>((resolve) => {
      let remaining = 2;
      let settled = false;
      const finish = (online: boolean) => {
        if (settled) return;
        if (online) {
          settled = true;
          lastChecked = Date.now();
          publish('online');
          resolve('online');
        } else if (--remaining === 0) {
          settled = true;
          lastChecked = Date.now();
          publish('offline');
          resolve('offline');
        }
      };
      void checkEndpoint('https://www.gstatic.com/generate_204', true).then(finish);
      void checkEndpoint('https://www.cloudflare.com/cdn-cgi/trace', false).then(finish);
    }).finally(() => { pending = null; });
    return pending;
  },
};
