/**
 * Family Bloom R11 Motion Lab, developer account only.
 * Demonstration is 100% local. No writes, route actions, upload or server calls.
 */
import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated, {
  cancelAnimation, Easing, interpolate, type SharedValue, useAnimatedStyle,
  useSharedValue, withDelay, withSpring, withTiming,
} from 'react-native-reanimated';
import { BloomText as Text } from '../../components/ui/BloomText';
import { useA3Theme } from '../../appearance3/useAppearance3';
import { useAuth } from '../../context/AuthContext';
import { isPerformanceTestAccount, isVerifiedDeveloperAccount } from '../../constants/performanceTest';
import { BLOOM_MOTION_R11, useBloomMotionSetting } from '../../motion/BloomMotion';
import { WelcomeModal } from '../../components/onboarding/WelcomeModal';

const EASE = Easing.out(Easing.cubic);
const PETAL_ANGLES = [0, 60, 120, 180, 240, 300] as const;

function MagicPetal({ progress, angle, color }: { progress: SharedValue<number>; angle: number; color: string }) {
  const radians = angle * Math.PI / 180;
  const dx = Math.cos(radians) * 33;
  const dy = Math.sin(radians) * 33;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.55, 1], [0, 1, 0.9, 0]),
    transform: [
      { translateX: progress.value * dx },
      { translateY: progress.value * dy },
      { scale: 0.55 + progress.value * 0.6 },
      { rotate: `${angle}deg` },
    ],
  }));
  return <Animated.View pointerEvents="none" style={[styles.petal, { backgroundColor: color }, animatedStyle]} />;
}

export default function MotionLabScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const allowed = isPerformanceTestAccount(user?.email) && isVerifiedDeveloperAccount(user);
  const { colors, selection } = useA3Theme();
  const motion = useBloomMotionSetting();
  const [welcomePreview, setWelcomePreview] = useState(false);
  const entranceOpacity = useSharedValue(1);
  const entranceY = useSharedValue(0);
  const branchGrowth = useSharedValue(1);
  const budGrowth = useSharedValue(1);
  const magic = useSharedValue(0);

  const playEntrance = useCallback(() => {
    if (!motion.enabled) { entranceOpacity.value = 1; entranceY.value = 0; return; }
    cancelAnimation(entranceOpacity); cancelAnimation(entranceY);
    entranceOpacity.value = 0; entranceY.value = 13;
    entranceOpacity.value = withTiming(1, { duration: BLOOM_MOTION_R11.hero, easing: EASE });
    entranceY.value = withTiming(0, { duration: BLOOM_MOTION_R11.hero, easing: EASE });
  }, [motion.enabled, entranceOpacity, entranceY]);

  const playTree = useCallback(() => {
    if (!motion.enabled) { branchGrowth.value = 1; budGrowth.value = 1; return; }
    cancelAnimation(branchGrowth); cancelAnimation(budGrowth);
    branchGrowth.value = 0; budGrowth.value = 0;
    branchGrowth.value = withTiming(1, { duration: 670, easing: EASE });
    budGrowth.value = withDelay(430, withSpring(1, { damping: 17, stiffness: 190, mass: 0.8 }));
  }, [motion.enabled, branchGrowth, budGrowth]);

  const playMagic = useCallback(() => {
    if (!motion.enabled) { magic.value = 0; return; }
    cancelAnimation(magic);
    magic.value = 0;
    magic.value = withTiming(1, { duration: BLOOM_MOTION_R11.magic, easing: EASE });
  }, [motion.enabled, magic]);

  useEffect(() => {
    if (motion.enabled) return;
    cancelAnimation(entranceOpacity); cancelAnimation(entranceY);
    cancelAnimation(branchGrowth); cancelAnimation(budGrowth); cancelAnimation(magic);
    entranceOpacity.value = 1; entranceY.value = 0;
    branchGrowth.value = 1; budGrowth.value = 1; magic.value = 0;
  }, [motion.enabled, entranceOpacity, entranceY, branchGrowth, budGrowth, magic]);
  useEffect(() => () => {
    cancelAnimation(entranceOpacity); cancelAnimation(entranceY);
    cancelAnimation(branchGrowth); cancelAnimation(budGrowth); cancelAnimation(magic);
  }, [entranceOpacity, entranceY, branchGrowth, budGrowth, magic]);

  const heroStyle = useAnimatedStyle(() => ({ opacity: entranceOpacity.value, transform: [{ translateY: entranceY.value }] }));
  const lineStyle = useAnimatedStyle(() => ({ opacity: branchGrowth.value, transform: [{ scaleY: branchGrowth.value }] }));
  const budStyle = useAnimatedStyle(() => ({ opacity: budGrowth.value, transform: [{ scale: budGrowth.value }] }));

  if (!allowed) {
    return <View style={[styles.screen, { backgroundColor: colors.background, padding: 24 }]}><Text>Không có quyền truy cập Motion Lab.</Text></View>;
  }
  return (
    <ScrollView style={[styles.screen, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.back}>
        <Ionicons name="arrow-back" size={19} color={colors.primaryText}/>
        <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Quay lại Developer Tools</Text>
      </Pressable>
      <Text style={[styles.heading, { color: colors.primaryText }]}>Motion 4.0 · R11 Lab</Text>
      <Text style={[styles.description, { color: colors.secondaryText }]}>Ba hiệu ứng xem thử, không đụng đến dữ liệu thật. Hãy thử cả bốn theme và ba mức chuyển động trong Cài đặt.</Text>
      <View style={[styles.status, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={{ color: colors.primaryText }}>Theme: {selection.palette}</Text>
        <Text style={{ color: colors.primaryText }}>Chuyển động: {motion.level}</Text>
        <Text style={{ color: colors.secondaryText, fontSize: 12 }}>
          {motion.systemReduceMotion ? 'Android đang bật Giảm chuyển động — các hiệu ứng trang trí bị tắt.' : 'Android không yêu cầu giảm chuyển động.'}
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primaryText }]}>01 · Ngôi nhà thức giấc</Text>
        <Animated.View style={[styles.heroDemo, { backgroundColor: colors.heroSurface, borderColor: colors.border }, heroStyle]}>
          <Ionicons name="home" size={40} color={colors.primary}/>
          <Text style={[styles.demoTitle, { color: colors.primaryText }]}>Chào mừng về Nhà Mình</Text>
          <Text style={{ color: colors.secondaryText, fontSize: 12 }}>Một ngày vui đang chờ cả nhà 🌸</Text>
        </Animated.View>
        <Pressable accessibilityRole="button" onPress={playEntrance} style={[styles.button, { backgroundColor: colors.selectedBackground }]}>
          <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Phát thử Home Entrance</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primaryText }]}>02 · Cây gia phả nảy mầm</Text>
        <View style={styles.treeDemo}>
          <View style={[styles.treeNode, { borderColor: colors.border, backgroundColor: colors.heroSurface }]}><Text style={{ color: colors.primaryText }}>Ông bà</Text></View>
          <Animated.View style={[styles.branch, { backgroundColor: colors.primary }, lineStyle]} />
          <Animated.View style={[styles.treeNode, { borderColor: colors.primary, backgroundColor: colors.selectedBackground }, budStyle]}>
            <Ionicons name="leaf" color={colors.primary} size={16}/>
            <Text style={{ color: colors.primaryText }}>Con cháu</Text>
          </Animated.View>
        </View>
        <Pressable accessibilityRole="button" onPress={playTree} style={[styles.button, { backgroundColor: colors.selectedBackground }]}>
          <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Phát thử cây nảy mầm</Text>
        </Pressable>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primaryText }]}>03 · Bloom Magic Moment</Text>
        <View style={styles.magicDemo}>
          <View style={[styles.magicCenter, { backgroundColor: colors.selectedBackground }]}>
            <Ionicons name="flower" size={41} color={colors.primary}/>
            {PETAL_ANGLES.map(angle => <MagicPetal key={angle} progress={magic} angle={angle} color={colors.primary} />)}
          </View>
        </View>
        <Pressable accessibilityRole="button" onPress={playMagic} style={[styles.button, { backgroundColor: colors.selectedBackground }]}>
          <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Phát thử Bloom Magic</Text>
        </Pressable>
        <Text style={[styles.description, { color: colors.secondaryText }]}>Đây là hiệu ứng mô phỏng, không xác nhận thao tác lưu Firebase.</Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.primaryText }]}>04 · Thư Ngõ thật (chế độ xem thử)</Text>
        <Text style={[styles.description, { color: colors.secondaryText }]}>Xem đúng hình giấy, vùng đọc, nút và animation Thư Ngõ, kể cả khi bạn đã xác nhận thư trước đây. Đây là bản xem thử, không gọi Firebase và không cập nhật Welcome Gate.</Text>
        <Pressable accessibilityRole="button" testID="r11r4-preview-welcome-button" onPress={() => setWelcomePreview(true)} style={[styles.button, { backgroundColor: colors.selectedBackground }]}>
          <Text style={{ color: colors.primaryText, fontWeight: '800' }}>Mở xem thử Thư Ngõ</Text>
        </Pressable>
      </View>
      <Modal visible={welcomePreview} animationType="none" onRequestClose={() => setWelcomePreview(false)}>
        <WelcomeModal visible={welcomePreview} preview onContinue={() => setWelcomePreview(false)} />
      </Modal>
      <Text style={[styles.description, { color: colors.secondaryText }]}>Bản thử nghiệm R11 giữ nguyên toàn bộ dữ liệu/gate của R10. Bộ Motion Lab chỉ chạy khi bạn chủ động nhấn thử.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingBottom: 70, gap: 17 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 40 },
  heading: { fontSize: 24, fontWeight: '900' },
  description: { fontSize: 12, lineHeight: 19 },
  status: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 5 },
  card: { borderWidth: 1, borderRadius: 22, padding: 17, gap: 13 },
  cardTitle: { fontWeight: '800', fontSize: 15 },
  heroDemo: { minHeight: 156, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 14 },
  demoTitle: { fontWeight: '900', fontSize: 17, textAlign: 'center' },
  button: { minHeight: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  treeDemo: { height: 172, alignItems: 'center', justifyContent: 'center' },
  treeNode: { minWidth: 100, minHeight: 48, borderRadius: 16, borderWidth: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, flexDirection: 'row', gap: 7 },
  branch: { width: 3, height: 45, borderRadius: 6 },
  magicDemo: { height: 135, alignItems: 'center', justifyContent: 'center' },
  magicCenter: { width: 84, height: 84, borderRadius: 42, justifyContent: 'center', alignItems: 'center' },
  petal: { position: 'absolute', left: 37, top: 33, width: 10, height: 17, borderRadius: 9 },
});
