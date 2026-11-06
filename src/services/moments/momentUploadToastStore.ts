/** Tiny external signal: no Moment feed / tab / root Context render for upload percent. */
import { useSyncExternalStore } from "react";

export type MomentToastState = {
  localId: string;
  status: "queued" | "uploading" | "publishing" | "cancelling";
  progress: number;
  thumbnailUri?: string;
  video?: boolean;
};
let value: MomentToastState | null = null;
const listeners = new Set<() => void>();
export const momentUploadToastStore = {
  getSnapshot: () => value,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  set(next: MomentToastState | null) {
    if (next && value && next.localId === value.localId && next.progress === value.progress &&
      next.status === value.status && next.thumbnailUri === value.thumbnailUri && next.video === value.video) return;
    if (!next && !value) return;
    value = next;
    listeners.forEach((listener) => listener());
  },
  clear(localId: string) { if (value?.localId === localId) this.set(null); },
};
export const useMomentUploadToastState = () => useSyncExternalStore(
  momentUploadToastStore.subscribe,
  momentUploadToastStore.getSnapshot,
  momentUploadToastStore.getSnapshot,
);
