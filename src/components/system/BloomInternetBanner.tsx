import { useBloomThemeRevision } from '../../theme/BloomThemeProvider';
import { createBloomStyles } from '../../theme/createBloomStyles';
import { COLORS } from '../../constants/theme';
/** Persistent, nonblocking Internet advisory. Never alters authenticated state. */
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { BloomText as Text } from '../ui/BloomText';
import { internetReachabilityService } from '../../services/network/internetReachabilityService';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useA3LegacyStyles } from '../../appearance3/compatReactiveStyles';


export function BloomInternetBanner() {
  const __a3Colors = useA3Theme().colors;
  const __a3_styles = useA3LegacyStyles(styles);

  
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
    <View pointerEvents="none" accessibilityLiveRegion="polite" style={__a3_styles.wrapper}>
      <View style={__a3_styles.banner}>
        <Ionicons name="cloud-offline-outline" size={19} color={__a3Colors.primary} />
        <View style={__a3_styles.copy}>
          <Text style={__a3_styles.title}>Chưa truy cập được Internet</Text>
          <Text style={__a3_styles.message}>Có thể 4G/5G đã hết dung lượng hoặc Wi-Fi chưa có mạng. Bloom sẽ tự kiểm tra lại.</Text>
        </View>
      </View>
    </View>
  );
}
const styles = createBloomStyles(() => StyleSheet.create({
  wrapper: { position: 'absolute', top: 58, left: 12, right: 12, alignItems: 'center', zIndex: 20000, elevation: 40 },
  banner: { maxWidth: 480, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11,
    paddingHorizontal: 14, backgroundColor: COLORS.surface, borderRadius: 17, borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowRadius: 10, shadowOpacity: 0.11, elevation: 8 },
  copy: { flex: 1 },
  title: { color: COLORS.primary, fontSize: 13, fontWeight: '800' },
  message: { color: COLORS.secondaryText, fontSize: 11.5, lineHeight: 17, marginTop: 2 },
}));
