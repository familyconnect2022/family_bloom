import React, { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { BloomIconButton } from "../ui/BloomButtonComponents";
import { COLORS } from "../../constants/theme";
import { useAuth } from "../../context/AuthContext";
import { useTabLiveEffect } from "../../context/TabRuntimeContext";
import { activityBadgeSignalStore } from "../../services/activity/activityBadgeSignalStore";

/** Signal-isolated Home bell. Badge updates never re-render the Home dashboard. */
export const HomeActivityBell = React.memo(function HomeActivityBell({ invalidationKey }: { invalidationKey: string }) {
  const router = useRouter();
  const { user, families, userProfile } = useAuth();
  const uid = user?.uid ?? "";
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);

  const subscribe = useCallback((listener: () => void) => uid ? activityBadgeSignalStore.subscribe(uid, listener) : () => undefined, [uid]);
  const getSnapshot = useCallback(() => uid ? activityBadgeSignalStore.get(uid) : 0, [uid]);
  const count = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const refresh = useCallback((force = false) => {
    if (!uid || families.length === 0) {
      if (uid) activityBadgeSignalStore.set(uid, 0, true);
      return;
    }
    void activityBadgeSignalStore.refresh(uid, families, userProfile?.smartReminderPreferences, { force });
  }, [families, uid, userProfile?.smartReminderPreferences]);

  useTabLiveEffect("home", () => {
    activeRef.current = true;
    refresh(false);
    return () => {
      activeRef.current = false;
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, [refresh]);

  // Home data heads are only invalidation hints. Coalesce them into one badge
  // refresh rather than forcing the whole Home screen to own badge state.
  useEffect(() => {
    if (!invalidationKey || !activeRef.current) return;
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      if (activeRef.current) refresh(true);
    }, 1200);
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    };
  }, [invalidationKey, refresh]);

  return (
    <View style={styles.wrap}>
      <BloomIconButton
        icon={count > 0 ? "notifications" : "notifications-outline"}
        onPress={() => router.push("/notifications")}
        customStyle={styles.button}
      />
      {count > 0 ? (
        <View pointerEvents="none" style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? "9+" : count}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  button: { width: 44, height: 44, backgroundColor: COLORS.white },
  badge: { position: "absolute", right: -3, top: -4, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  badgeText: { color: COLORS.white, fontSize: 8.5, fontWeight: "900" },
});
