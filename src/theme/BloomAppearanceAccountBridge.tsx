import { useCallback, useEffect, useSyncExternalStore, type ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { getBloomColors } from './palette';
import { useAuth } from '../context/AuthContext';
import { appearanceLocalReady } from './BloomThemeProvider';
import { bindAppearanceToUid, getAppearanceHydrationStatus,
  isAppearanceReadyForUid, subscribeAppearanceHydration } from './appearanceCloudSync';

const STATIC_LOGIN_PALETTE = getBloomColors('rose', 'light');

/**
 * UID-scoped visual gate, separate from the security/session route gates.
 * During cold start, old account/placeholder styles cannot mount in private UI.
 * Public login remains independent of the signed-in member's appearance.
 * The gate neither remounts on theme changes nor starts a Firestore listener.
 */
export function BloomAppearanceAccountBridge({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const status = useSyncExternalStore(
    subscribeAppearanceHydration, getAppearanceHydrationStatus, getAppearanceHydrationStatus,
  );
  useEffect(() => { void bindAppearanceToUid(uid, appearanceLocalReady()); }, [uid]);
  const revealFallback = useCallback(() => {
    // The native splash must not cover an offline-first-use fallback for 7 s.
    // A neutral, laid-out screen is safe; no private route is mounted yet.
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);
  const ready = uid ? (status.bound &&
    ['ready-local','ready-cloud','ready-default','offline-default'].includes(status.phase) &&
    isAppearanceReadyForUid(uid)) : !status.bound;
  // On sign-out, wait for the bridge to reset the previous member's appearance
  // before the public login page mounts. This prevents a transient old palette.

  if (!ready) {
    return <View style={styles.loading} onLayout={revealFallback}>
      <ActivityIndicator color={STATIC_LOGIN_PALETTE.primary} size="small" />
      <Text style={styles.label}>Đang khôi phục giao diện của bạn…</Text>
    </View>;
  }
  // The status snapshot is an explicit reactive dependency. No revision hook
  // is discarded and no global Proxy is used to decide whether to mount UI.
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: STATIC_LOGIN_PALETTE.background, paddingHorizontal: 24 },
  label: { marginTop: 14, fontSize: 15, color: STATIC_LOGIN_PALETTE.primaryText, textAlign: 'center' },
});
