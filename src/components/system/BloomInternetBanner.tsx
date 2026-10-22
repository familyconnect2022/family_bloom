/** Persistent, nonblocking Internet advisory. Never alters authenticated state. */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, View } from 'react-native';
import { internetReachabilityService } from '../../services/network/internetReachabilityService';

export function BloomInternetBanner() {
  const [status, setStatus] = useState(internetReachabilityService.getStatus());
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let active = AppState.currentState === 'active';
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = internetReachabilityService.subscribe(setStatus);
    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (!active || stopped) return;
      const delay = internetReachabilityService.getStatus() === 'offline' ? 16000 : 85000;
      timer = setTimeout(() => { void run(); }, delay);
    };
    const run = async () => {
      try { await internetReachabilityService.checkNow({ force: true }); }
      finally { schedule(); }
    };
    const subscription = AppState.addEventListener('change', (state) => {
      const wasActive = active;
      active = state === 'active';
      if (!active && timer) { clearTimeout(timer); timer = null; }
      if (active && !wasActive) void run();
    });
    if (active) void run();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      subscription.remove();
      off();
    };
  }, []);

  if (Platform.OS !== 'android' || status !== 'offline') return null;
  return (
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={styles.wrapper}>
      <View style={styles.banner}>
        <Ionicons name="cloud-offline-outline" size={19} color="#9B355E" />
        <View style={styles.copy}>
          <Text style={styles.title}>Chưa truy cập được Internet</Text>
          <Text style={styles.message}>Có thể 4G/5G đã hết dung lượng hoặc Wi-Fi chưa có mạng. Bloom sẽ tự kiểm tra lại.</Text>
        </View>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  wrapper: { position: 'absolute', top: 58, left: 12, right: 12, alignItems: 'center', zIndex: 20000, elevation: 40 },
  banner: { maxWidth: 480, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11,
    paddingHorizontal: 14, backgroundColor: '#FFF5F8', borderRadius: 17, borderWidth: 1, borderColor: '#EEC7D5',
    shadowColor: '#482333', shadowRadius: 10, shadowOpacity: 0.11, elevation: 8 },
  copy: { flex: 1 },
  title: { color: '#8D2D52', fontSize: 13, fontWeight: '800' },
  message: { color: '#725965', fontSize: 11.5, lineHeight: 17, marginTop: 2 },
});
