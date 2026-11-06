/** Render-only, not an authorization bypass. Keeps handoff paint visible until
 * the real Welcome root has completed native layout on Android. */
import { useSyncExternalStore } from 'react';
let shown = false;
const listeners = new Set<() => void>();
function set(value: boolean) {
  if (shown === value) return;
  shown = value;
  for (const listener of listeners) listener();
}
export function markWelcomeFrameReady() { set(true); }
export function resetWelcomeFrameReady() { set(false); }
export function useWelcomeFrameReady() {
  return useSyncExternalStore(
    listener => { listeners.add(listener); return () => {listeners.delete(listener);}; },
    () => shown,
    () => false,
  );
}
