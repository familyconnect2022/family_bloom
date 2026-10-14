import { activityService } from "./activityService";
import { smartReminderService } from "./smartReminderService";
import { createKeyedSignalStore } from "../realtime/uiSignalStore";
import type { UserFamilyMembership, UserProfile } from "../../types";

const signal = createKeyedSignalStore(0, 60);
const inFlight = new Map<string, Promise<number>>();
const refreshGeneration = new Map<string, number>();

const keyFor = (uid: string) => `activity-badge:${uid}`;

export const activityBadgeSignalStore = {
  keyFor,
  get(uid: string) { return signal.get(keyFor(uid)); },
  subscribe(uid: string, subscriber: () => void) { return signal.subscribe(keyFor(uid), subscriber); },
  set(uid: string, count: number, immediate = false) { signal.set(keyFor(uid), Math.max(0, count), { immediate }); },

  refresh(
    uid: string,
    families: UserFamilyMembership[],
    preferences: UserProfile["smartReminderPreferences"] | undefined,
    options?: { force?: boolean },
  ) {
    const key = keyFor(uid);
    const existing = inFlight.get(key);
    if (existing && !options?.force) return existing;
    const generation = (refreshGeneration.get(key) ?? 0) + 1;
    refreshGeneration.set(key, generation);

    const request = Promise.all(
      families.map(async (membership) => {
        const [activityCount, reminderCount] = await Promise.all([
          activityService.unreadBadgeCount(membership.familyId, uid, { force: options?.force }).catch(() => 0),
          smartReminderService.unreadBadgeCount(membership.familyId, uid, preferences).catch(() => 0),
        ]);
        return activityCount + reminderCount;
      }),
    ).then((counts) => {
      const count = counts.reduce((total, value) => total + value, 0);
      if (refreshGeneration.get(key) === generation) signal.set(key, count);
      return count;
    }).finally(() => {
      if (inFlight.get(key) === request) inFlight.delete(key);
    });

    inFlight.set(key, request);
    return request;
  },

  invalidate(uid?: string) {
    if (!uid) {
      signal.clear(); inFlight.clear(); refreshGeneration.clear(); return;
    }
    const key = keyFor(uid);
    refreshGeneration.set(key, (refreshGeneration.get(key) ?? 0) + 1);
    inFlight.delete(key);
  },
};
