import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { BloomButton } from '@/components/ui/BloomButtonComponents';

type Props = { visible: boolean; name?: string; onContinue: () => void };
type LetterPhase = 'sealed' | 'opening' | 'reading';

// Exactly the same three visual moments approved by the project owner.
// The letter itself is native text (not baked into an image) so the approved
// full-length Vietnamese message is legible, scrollable and accessible.
const SCENE_SEALED = require('../../../assets/images/onboarding/time-letter/sealed.jpg');
const SCENE_OPENING = require('../../../assets/images/onboarding/time-letter/opening.jpg');
const SCENE_REVEALED = require('../../../assets/images/onboarding/time-letter/revealed.jpg');
const SCENES = [SCENE_SEALED, SCENE_OPENING, SCENE_REVEALED];
const ANIMATION_MS = { unseal: 550, emerge: 680, settle: 630 };

/** Entire approved Family Bloom Thư Ngỏ text. Do not replace with image text. */
const LETTER: Array<{ text: string; emphasis?: boolean; italic?: boolean }> = [
  { text: 'Gửi những thành viên thân yêu của đại gia đình Family Bloom!', italic: true },
  { text: 'Có những khoảnh khắc rồi sẽ đi qua, những câu chuyện có thể dần nhạt màu theo năm tháng, nhưng tình yêu gia đình và sợi dây gắn kết với cội nguồn luôn là những điều xứng đáng được nâng niu, gìn giữ mãi mãi.' },
  { text: 'Family Bloom ra đời từ mong ước tạo nên một mái nhà chung — nơi ông bà, cha mẹ, con cháu và những người thân yêu, dù đang ở gần hay cách xa, vẫn có thể tìm thấy nhau, sẻ chia cùng nhau và cảm nhận được sự hiện diện ấm áp của nhau trong từng khoảnh khắc.' },
  { text: 'Đây là một dự án phi lợi nhuận, hoàn toàn không thu phí thành viên. Family Bloom không hướng đến mục đích thương mại, mà mong muốn xây dựng một không gian thân tình để các gia đình trò chuyện, vui chơi, gửi trao yêu thương và cùng lưu giữ những điều quý giá trong cuộc sống.' },
  { text: 'Mỗi bức ảnh, mỗi câu chuyện, mỗi sự kiện được lưu lại hôm nay đều có thể trở thành một mảnh ghép ký ức quý báu, giúp các thế hệ mai sau hiểu hơn về ông bà, tổ tiên, nguồn cội và hành trình mà gia đình mình đã cùng nhau đi qua.' },
  { text: 'Family Bloom là một Hộp Thời Gian của tình thân — nơi quá khứ được trân trọng, hiện tại được sẻ chia và yêu thương được gửi đến tương lai.', emphasis: true },
  { text: 'Ý tưởng ấy đã được ấp ủ suốt 10 năm, cùng 3 năm dành tâm huyết xây dựng và hoàn thiện. Đây không chỉ là hành trình tạo nên một ứng dụng, mà còn là hành trình biến ước mơ gắn kết gia đình thành một điều hiện hữu, để yêu thương có thêm một nơi được lưu giữ và lan tỏa.' },
  { text: 'Với tinh thần cởi mở và sẻ chia, mã nguồn dự án cùng những dữ liệu phù hợp có thể được cung cấp cho thành viên khi có yêu cầu, trên nguyên tắc tôn trọng quyền riêng tư, bảo mật thông tin và quyền lợi của mỗi gia đình.' },
  { text: 'Family Bloom không thuộc về riêng một người. Mỗi thành viên đều là một phần quan trọng của mái nhà chung này. Vì vậy, chúng ta hãy cùng nhau xây dựng một cộng đồng văn minh, chân thành và biết trân trọng nhau; cùng chung tay bảo vệ, duy trì và phát triển Family Bloom, để nơi đây luôn là một chốn trở về bình yên của tình thân.' },
  { text: 'Mong rằng một ngày nào đó, khi con cháu mở lại những ký ức được lưu giữ nơi đây, các thế hệ mai sau sẽ không chỉ nhìn thấy những bức ảnh hay đọc lại những câu chuyện cũ, mà còn cảm nhận được tình yêu thương, sự gắn bó và những điều tốt đẹp mà chúng ta đã dành cho nhau.' },
  { text: 'Bởi điều quý giá nhất để lại cho mai sau không chỉ là những gì mình có, mà còn là những yêu thương mình đã cùng nhau gìn giữ.', italic: true },
  { text: 'Chào mừng bạn trở về mái nhà Family Bloom!', emphasis: true },
  { text: 'Thân thương,\nFamily Bloom', italic: true },
  { text: 'Gìn giữ hôm nay — Kết nối mai sau.', italic: true },
];


export function WelcomeModal({ visible, onContinue }: Props) {
  const { width, height } = useWindowDimensions();
  const [phase, setPhase] = useState<LetterPhase>('sealed');
  const reduceMotion = useRef(false);
  const animationRun = useRef(0);
  const openingLock = useRef(false);
  const continueLock = useRef(false);
  const sealedOpacity = useRef(new Animated.Value(1)).current;
  const openingOpacity = useRef(new Animated.Value(0)).current;
  const revealedOpacity = useRef(new Animated.Value(0)).current;
  const emergingShift = useRef(new Animated.Value(0)).current;
  const readingProgress = useRef(new Animated.Value(0)).current;
  const activeAnimation = useRef<Animated.CompositeAnimation | null>(null);
  // Android can pause a native-driven sequence when the app backgrounds. Never
  // leave the member on a noninteractive envelope if the completion is missed.
  const openingWatchdog = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);

  // Load the three small, bundled assets up front. No network is required.
  // If decoding fails we still allow opening the full native-text reader.
  useEffect(() => {
    let alive = true;
    // These are local require() assets, not remote downloads. Their preload
    // must not become a gate which silently skips the animation on a fast tap.
    void Asset.loadAsync(SCENES).catch(() => undefined);
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (alive) reduceMotion.current = value;
    }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  const reset = useCallback(() => {
    animationRun.current += 1;
    if (openingWatchdog.current) clearTimeout(openingWatchdog.current);
    openingWatchdog.current = null;
    activeAnimation.current?.stop();
    activeAnimation.current = null;
    openingLock.current = false;
    continueLock.current = false;
    sealedOpacity.setValue(1);
    openingOpacity.setValue(0);
    revealedOpacity.setValue(0);
    emergingShift.setValue(0);
    readingProgress.setValue(0);
    setPhase('sealed');
  }, [sealedOpacity, openingOpacity, revealedOpacity, emergingShift, readingProgress]);

  useEffect(() => {
    if (!visible) reset();
  }, [visible, reset]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      animationRun.current += 1;
      if (openingWatchdog.current) clearTimeout(openingWatchdog.current);
      openingWatchdog.current = null;
      activeAnimation.current?.stop();
    };
  }, []);

  // This is a welcome gate; the Android back button must not skip the letter
  // while the user is interacting with it or while it is animating.
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, [visible]);

  const finishOpening = useCallback((run: number) => {
    if (!mounted.current || run !== animationRun.current) return;
    if (openingWatchdog.current) clearTimeout(openingWatchdog.current);
    openingWatchdog.current = null;
    activeAnimation.current = null;
    sealedOpacity.setValue(0);
    openingOpacity.setValue(0);
    revealedOpacity.setValue(1);
    emergingShift.setValue(1);
    readingProgress.setValue(1);
    setPhase('reading');
  }, [sealedOpacity, openingOpacity, revealedOpacity, emergingShift, readingProgress]);

  const openLetter = useCallback(() => {
    if (openingLock.current || phase !== 'sealed') return;
    openingLock.current = true; // onPressIn and onPress cannot start twice
    const run = ++animationRun.current;
    setPhase('opening'); // native visible acknowledgement immediately on touch down

    // An interrupted animated sequence must never trap a user on an
    // unresponsive opening state, including after foreground/background.
    openingWatchdog.current = setTimeout(() => {
      activeAnimation.current?.stop();
      finishOpening(run);
    }, 2600);
    if (reduceMotion.current) {
      finishOpening(run);
      return;
    }
    const motion = Animated.sequence([
      Animated.parallel([
        Animated.timing(sealedOpacity, { toValue: 0, duration: ANIMATION_MS.unseal, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(openingOpacity, { toValue: 1, duration: ANIMATION_MS.unseal, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(openingOpacity, { toValue: 0, duration: ANIMATION_MS.emerge, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(revealedOpacity, { toValue: 1, duration: ANIMATION_MS.emerge, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(emergingShift, { toValue: 1, duration: ANIMATION_MS.emerge, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.timing(readingProgress, { toValue: 1, duration: ANIMATION_MS.settle, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]);
    activeAnimation.current = motion;
    motion.start(({ finished }) => {
      // Stopping an animation during sign-out/reset is not a success.
      if (!finished || run !== animationRun.current) return;
      finishOpening(run);
    });
  }, [phase, sealedOpacity, openingOpacity, revealedOpacity, emergingShift, readingProgress, finishOpening]);

  const continueIntoFamily = useCallback(() => {
    if (continueLock.current || phase !== 'reading') return;
    continueLock.current = true;
    onContinue();
  }, [onContinue, phase]);

  if (!visible) return null;

  // Bounded to the visible screen. The header and button never scroll away;
  // the FULL, user-approved letter alone owns a ScrollView.
  const compact = height < 650;
  const readerHeight = Math.min(790, Math.max(260, height - (compact ? 18 : 48)));
  const readerWidth = Math.min(width - 26, 510);
  const sceneSize = { width, height };
  const darken = readingProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 0.9] });
  const paperOpacity = readingProgress.interpolate({ inputRange: [0, .18, .8, 1], outputRange: [0, .08, .92, 1] });
  const paperLift = readingProgress.interpolate({ inputRange: [0, 1], outputRange: [Math.min(260, height * .29), 0] });
  const paperScale = readingProgress.interpolate({ inputRange: [0, 1], outputRange: [.72, 1] });
  const paperRotate = readingProgress.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '0deg'] });

  return (
    <View accessibilityViewIsModal pointerEvents="auto" style={[styles.overlay, sceneSize]}>
      <View style={styles.stage}>
        <Animated.Image pointerEvents="none" source={SCENE_SEALED} resizeMode="cover" style={[styles.scene, sceneSize, { opacity: sealedOpacity }]} />
        <Animated.Image pointerEvents="none" source={SCENE_OPENING} resizeMode="cover" style={[styles.scene, sceneSize, { opacity: openingOpacity }]} />
        <Animated.Image pointerEvents="none" source={SCENE_REVEALED} resizeMode="cover" style={[styles.scene, sceneSize, {
          opacity: revealedOpacity,
          transform: [{ translateY: emergingShift.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) }, { scale: emergingShift.interpolate({ inputRange: [0, 1], outputRange: [.965, 1] }) }],
        }]} />
        {phase === 'opening' && <View pointerEvents="none" style={styles.openingFeedback}>
          <Text style={styles.openingFeedbackText}>Đang mở lá thư yêu thương…</Text>
        </View>}
        {phase !== 'sealed' && <Animated.View pointerEvents="none" style={[styles.readerShade, { opacity: darken }]} />}
        {phase !== 'sealed' && <Animated.View
          pointerEvents={phase === 'reading' ? 'auto' : 'none'}
          style={[styles.sheet, {
            width: readerWidth,
            height: readerHeight,
            opacity: paperOpacity,
            transform: [{ translateY: paperLift }, { scale: paperScale }, { rotate: paperRotate }],
          }]}
        >
          <View style={[styles.header, compact && styles.headerCompact]}>
            <View style={styles.ornament}><Ionicons name="leaf-outline" size={15} color="#BF7B84" /><Text style={styles.ornamentHeart}>♥</Text><Ionicons name="leaf-outline" size={15} color="#BF7B84" style={{ transform: [{ scaleX: -1 }] }} /></View>
            <Text style={styles.kicker}>FAMILY BLOOM  ·  HỘP THỜI GIAN</Text>
            <Text style={[styles.title, compact && styles.titleCompact]}>THƯ NGỎ</Text>
            <Text style={styles.subtitle}>Một lá thư gửi những người thân yêu</Text>
            <View style={styles.headerDivider}><View style={styles.rule} /><Ionicons name="heart" size={12} color="#C77A86" /><View style={styles.rule} /></View>
          </View>
          <View style={styles.paper}>
            <ScrollView
              nestedScrollEnabled
              accessibilityLabel="Nội dung Thư Ngỏ, vuốt để đọc toàn bộ"
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="handled"
              style={styles.scroll}
              contentContainerStyle={styles.letterContent}
              testID="welcome-letter-scroll"
            >
              {LETTER.map((paragraph, i) => (
                <Text key={i} selectable style={[styles.paragraph, paragraph.emphasis && styles.emphasis, paragraph.italic && styles.italic]}>{paragraph.text}</Text>
              ))}
              <View style={styles.lastOrnament}><Ionicons name="flower-outline" size={22} color="#CD9BA2" /><Text style={styles.lastOrnamentText}>♡</Text><Ionicons name="flower-outline" size={22} color="#CD9BA2" /></View>
            </ScrollView>
          </View>
          <View style={[styles.footer, compact && styles.footerCompact]}>
            <Text style={styles.scrollHint}>Vuốt nhẹ để đọc trọn lá thư ♡</Text>
            <BloomButton title="Bước vào mái nhà Family Bloom" onPress={continueIntoFamily} customStyle={styles.button} />
          </View>
        </Animated.View>}
        {/* Put the REAL touch target last and above every decorative layer.
            The R3R14 invisible Pressable was mounted below an elevated sheet;
            on Android it could appear but never receive a tap. */}
        {phase === 'sealed' && (
          <Pressable
            collapsable={false}
            accessibilityRole="button"
            accessibilityHint="Phong bì mở ra, lá thư bay lên rồi có thể cuộn để đọc"
            accessibilityLabel="Mở Thư Ngỏ của Family Bloom"
            onPressIn={openLetter}
            onPress={openLetter}
            style={({ pressed }) => [styles.touchCover, pressed && styles.touchPressed]}
            testID="welcome-envelope-open"
          >
            <View pointerEvents="none" style={styles.realOpenButton}>
              <Ionicons name="mail-open-outline" color="#FFF4EB" size={17} />
              <Text style={styles.realOpenLabel}>Mở Thư Ngỏ</Text>
            </View>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 20000, elevation: 20000, backgroundColor: '#643F53' },
  stage: { flex: 1, backgroundColor: '#643F53', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  scene: { position: 'absolute', top: 0, left: 0 },
  // A concrete, top-most Pressable (not an empty invisible hit surface under
  // an elevated reading card), with clear visible feedback that is not baked
  // into the background JPEG.
  touchCover: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100,
    justifyContent: 'flex-end', alignItems: 'center', paddingBottom: '15%' },
  touchPressed: { opacity: .96 },
  realOpenButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    borderRadius: 28, borderWidth: 1, borderColor: '#F7D3C5', backgroundColor: 'rgba(102,47,70,.94)',
    paddingHorizontal: 28, paddingVertical: 13, minHeight: 49, minWidth: 172 },
  realOpenLabel: { fontSize: 15, fontWeight: '700', color: '#FFF4EB' },
  openingFeedback: { position: 'absolute', bottom: '15%', alignSelf: 'center',
    backgroundColor: 'rgba(102,47,70,.85)', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 23 },
  openingFeedbackText: { fontSize: 13, color: '#FFF4EB', fontWeight: '700' },
  readerShade: { ...StyleSheet.absoluteFillObject, backgroundColor: '#45293A' },
  sheet: {
    zIndex: 2, alignSelf: 'center', overflow: 'hidden', borderRadius: 20,
    backgroundColor: '#FFF4E9', borderColor: '#F0D1BC', borderWidth: 1.5,
    shadowColor: '#25131E', shadowOpacity: .5, shadowOffset: { width: 0, height: 17 }, shadowRadius: 25, elevation: 20,
  },
  header: { alignItems: 'center', paddingTop: 15, paddingHorizontal: 17, paddingBottom: 9, backgroundColor: '#FFF4E8' },
  headerCompact: { paddingTop: 5, paddingBottom: 5 },
  ornament: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4 },
  ornamentHeart: { fontSize: 13, color: '#C47A8B' },
  kicker: { color: '#AD7C84', fontSize: 9, letterSpacing: 1.2, fontWeight: '700' },
  title: { fontFamily: 'serif', color: '#9B5166', fontSize: 29, fontWeight: '700', letterSpacing: 2.3, marginTop: 5 },
  titleCompact: { fontSize: 23, marginTop: 1 },
  subtitle: { fontFamily: 'serif', color: '#98707A', fontSize: 11.5, marginTop: 3, textAlign: 'center' },
  headerDivider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  rule: { height: 1, width: 70, backgroundColor: '#E2B2B1' },
  paper: { flex: 1, minHeight: 0, marginHorizontal: 11, borderWidth: 1, borderColor: '#F1E2D6', borderRadius: 10, backgroundColor: '#FFFAF3' },
  scroll: { flex: 1 },
  letterContent: { paddingHorizontal: 18, paddingTop: 17, paddingBottom: 22 },
  paragraph: { fontFamily: 'serif', fontSize: 15.1, lineHeight: 25.3, color: '#674D52', marginBottom: 16, textAlign: 'left' },
  emphasis: { color: '#9B5166', fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  lastOrnament: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginVertical: 7 },
  lastOrnamentText: { color: '#BA8191', fontSize: 20 },
  footer: { paddingHorizontal: 13, paddingTop: 9, paddingBottom: 12, gap: 8, backgroundColor: '#FFF4E9' },
  footerCompact: { paddingTop: 4, paddingBottom: 6, gap: 3 },
  scrollHint: { color: '#A98588', fontSize: 10, textAlign: 'center' },
  button: { width: '100%' },
});
