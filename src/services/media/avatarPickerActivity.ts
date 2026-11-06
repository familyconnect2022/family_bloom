import { useSyncExternalStore } from "react";

/** Distinguish an Android system image picker from a true app background.
 * Avoid disrupting Firestore, profile drafts and the navigator on picker resume.
 * The process-local flag intentionally starts cleared after an OS process kill.
 */
let tickets = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
const snapshot = () => tickets > 0;
export const useAvatarPickerActive = () => useSyncExternalStore(subscribe, snapshot, () => false);
export const avatarPickerActivity = {
  isPicking: snapshot,
  begin(): () => void {
    tickets += 1;
    emit();
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      tickets = Math.max(0, tickets - 1);
      emit();
    };
  },
};
