/** Short-lived, server-authenticated presence for the single developer's cloned-app tests.
 * No Firestore heartbeat; never changes game timers, board-away deadlines or normal presence.
 * The caller MUST enforce verified Firebase developer identity and family membership.
 */
const TTL_MS = 180_000;
const leases = new Map<string, { expiresAt: number; timer: ReturnType<typeof setTimeout> }>();
const refreshers = new Set<(familyId: string) => void>();
const key = (uid: string, familyId: string) => `${uid}\u0000${familyId}`;
export function onDualAppPresenceChange(refresh: (familyId: string) => void) {
  refreshers.add(refresh);
  return () => refreshers.delete(refresh);
}
function publish(familyId: string) { for (const refresh of refreshers) refresh(familyId); }
export function hasDualAppLease(uid: string, familyId: string, at = Date.now()) {
  return (leases.get(key(uid, familyId))?.expiresAt ?? 0) > at;
}
export function listDualAppLeaseUids(familyId: string, at = Date.now()) {
  const suffix = `\u0000${familyId}`;
  return [...leases.entries()].filter(([k, v]) => k.endsWith(suffix) && v.expiresAt > at)
    .map(([k]) => k.slice(0, -suffix.length));
}
export function setDualAppLease(uid: string, familyId: string, enabled: boolean, at = Date.now()) {
  const k = key(uid, familyId);
  const prior = leases.get(k);
  if (prior) clearTimeout(prior.timer);
  leases.delete(k);
  if (!enabled) { publish(familyId); return { enabled: false, expiresAt: null }; }
  const expiresAt = at + TTL_MS;
  const timer = setTimeout(() => {
    if (leases.get(k)?.expiresAt !== expiresAt) return;
    leases.delete(k);
    publish(familyId);
  }, TTL_MS + 5);
  timer.unref?.();
  leases.set(k, { expiresAt, timer });
  publish(familyId);
  return { enabled: true, expiresAt };
}
