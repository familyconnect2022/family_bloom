import { useBloomThemeRevision, useBloomMotionRevision } from '../../theme/BloomThemeProvider';
import { getLivingAppearance } from '../../theme/livingAppearance';
import { getBloomActiveColors } from '../../theme/runtime';
import { useFonts, Lora_400Regular, Lora_700Bold, Lora_400Regular_Italic } from '@expo-google-fonts/lora';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Alert, Animated, BackHandler, Image, Pressable, ScrollView, AccessibilityInfo,
  Platform, StyleSheet, Text, useWindowDimensions, View,
} from 'react-native';
import { familyBloomSessionDiagnostics as diagnostic } from '../../diagnostics/sessionDiagnostics';
import { Ionicons } from '@expo/vector-icons';
import { computeWelcomePaperGeometry } from '../../services/navigation/welcomePaperGeometry';

/** One static bundled image, no envelope open/close state, no video or fake Modal.
 * Native text is rendered INSIDE a source-image-coordinate safe box so it always
 * tracks the printed parchment despite Android aspect ratio or rotation.
 * The existing Session Gate retains the sole authority to show/finish Welcome.
 */
const WELCOME_PAGE = require('../../../assets/images/onboarding/time-letter/welcome-single-paper.webp');
type Props = { visible: boolean; name?: string; onContinue: () => void | Promise<void>; preview?: boolean };
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

export function WelcomeModal({ visible, onContinue, preview = false }: Props) {
  useBloomThemeRevision();
  useBloomMotionRevision();
  const [fontsLoaded] = useFonts({ Lora_400Regular, Lora_700Bold, Lora_400Regular_Italic });
  const artworkOpacity = useRef(new Animated.Value(1)).current;
  const headingOpacity = useRef(new Animated.Value(1)).current;
  const headingY = useRef(new Animated.Value(0)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const sparkleY = useRef(new Animated.Value(10)).current;
  const sparkleScale = useRef(new Animated.Value(0.8)).current;
  // Respect Android's reduced-motion preference without delaying the Welcome gate.
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (live) setReduceMotion(value); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { live = false; sub.remove(); };
  }, []);
  const animateLetter = getLivingAppearance().motion !== 'still' && !reduceMotion;
  const themeColor = getBloomActiveColors().primary;
  const window = useWindowDimensions();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [scrollAreaHeight, setScrollAreaHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewport, setViewport] = useState({ width: window.width, height: window.height });
  const [imageReady, setImageReady] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [clearFont, setClearFont] = useState(false);
  const inFlight = useRef(false);
  const geometry = computeWelcomePaperGeometry(viewport.width, viewport.height);

  useEffect(() => {
    // Animate AFTER bundled artwork is ready. The text safe-area and the CTA
    // remain in their exact R10 positions and fully accessible throughout.
    if (!visible || !imageReady || !animateLetter) {
      artworkOpacity.setValue(1);
      headingOpacity.setValue(1);
      headingY.setValue(0);
      sparkleOpacity.setValue(0);
      sparkleY.setValue(10);
      sparkleScale.setValue(0.8);
      return;
    }
    // The paper is bundled/offline: begin only after its first successful paint.
    // The native safe text box and fixed CTA must never move or be obscured.
    artworkOpacity.setValue(0.68);
    headingOpacity.setValue(0.18);
    headingY.setValue(12);
    sparkleOpacity.setValue(0);
    sparkleY.setValue(10);
    sparkleScale.setValue(0.8);
    const animations = Animated.parallel([
      Animated.timing(artworkOpacity, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(170),
        Animated.parallel([
          Animated.timing(headingOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(headingY, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
      Animated.sequence([
        Animated.delay(280),
        Animated.parallel([
          Animated.timing(sparkleOpacity, { toValue: 0.86, duration: 310, useNativeDriver: true }),
          Animated.timing(sparkleY, { toValue: 0, duration: 480, useNativeDriver: true }),
          Animated.timing(sparkleScale, { toValue: 1, duration: 480, useNativeDriver: true }),
        ]),
        Animated.timing(sparkleOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
    ]);
    animations.start();
    return () => animations.stop();
  }, [visible, imageReady, animateLetter, artworkOpacity, headingOpacity, headingY, sparkleOpacity, sparkleY, sparkleScale]);
  useEffect(() => {
    if (!visible || preview) return;
    diagnostic.note('WELCOME', 'render', {source: 'native', result: 'single-paper-session-gate-mounted'});
    return () => diagnostic.note('WELCOME', 'render', {source: 'native', result: 'single-paper-session-gate-unmounted'});
  }, [visible, preview]);
  useEffect(() => {
    if (!visible) return;
    // Image decoder failure cannot block the only mandatory Welcome/ack journey.
    if (imageReady || imageFailed) return;
    const timeout = setTimeout(() => {
      setImageFailed(true);
      diagnostic.note('WELCOME', 'paint', {source: 'native', result: 'single-paper-image-timeout-fallback'});
    }, 5500);
    return () => clearTimeout(timeout);
  }, [visible, imageReady, imageFailed]);
  useEffect(() => {
    if (!visible || preview) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible, preview]);
  const continueIntoFamily = useCallback(() => {
    if (inFlight.current) return;
    inFlight.current = true;
    setContinuing(true);
    if (!preview) diagnostic.note('WELCOME', 'ack-write', {source: 'native', result: 'single-paper-continue-pressed'});
    try {
      void Promise.resolve(onContinue()).catch(() => {
        diagnostic.note('WELCOME', 'ack-write', {source: 'native', result: 'single-paper-ack-failed'});
        Alert.alert('Chưa thể vào mái nhà', 'Chưa lưu được xác nhận Thư Ngõ. Hãy thử lại.');
      }).finally(() => {
        inFlight.current = false;
        setContinuing(false);
      });
    } catch (_) {
      inFlight.current = false;
      setContinuing(false);
      diagnostic.note('WELCOME', 'ack-write', {source: 'native', result: 'single-paper-ack-error'});
      Alert.alert('Chưa thể vào mái nhà', 'Bạn hãy thử lại thao tác xác nhận Thư Ngõ.');
    }
  }, [onContinue, preview]);
  if (!visible) return null;

  const showFallback = imageFailed || geometry.compactFallback || (window.fontScale ?? 1) > 1.6;
  // The FULL BLEED cover artwork and text use the SAME scale and offsets.
  // Text intersects the inset printed border with the visible screen safely.
  const readerStyle = showFallback
    ? styles.fallbackPaper
    : { position: 'absolute' as const, left: geometry.paperLeft, top: geometry.paperTop,
        width: geometry.paperWidth, height: geometry.paperHeight };
  const small = geometry.paperWidth < 290;
  const onLayoutStage = (event: {nativeEvent: {layout: {width: number; height: number}}}) => {
    const {width, height} = event.nativeEvent.layout;
    if (width < 1 || height < 1) return;
    setViewport(prev => Math.abs(prev.width - width) < 1 && Math.abs(prev.height - height) < 1
      ? prev : {width, height});
  };
  return (
    <View style={styles.stage} onLayout={onLayoutStage} testID="welcome-one-image-screen"
      accessibilityViewIsModal>
      {!imageFailed && (
        <Animated.Image source={WELCOME_PAGE} resizeMode="cover" testID="welcome-one-artwork"
          style={{position:'absolute', left:geometry.imageLeft, top:geometry.imageTop,
            width:geometry.imageWidth, height:geometry.imageHeight, opacity: artworkOpacity}}
          onLoad={() => {
            setImageReady(true);
            diagnostic.note('WELCOME', 'paint', {source:'native',result:'single-paper-image-ready'});
          }}
          onError={() => {
            setImageFailed(true);
            diagnostic.note('WELCOME', 'paint', {source:'native',result:'single-paper-image-error-fallback'});
          }}/>
      )}
      {imageReady && !imageFailed && animateLetter && (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="r11r4-welcome-magic-sparkle"
          style={{ position: 'absolute', right: Math.max(22, viewport.width * 0.105),
            top: Math.max(42, viewport.height * 0.13),
            opacity: sparkleOpacity,
            transform: [{ translateY: sparkleY }, { scale: sparkleScale }] }}>
          <Ionicons name="sparkles-outline" size={24} color="#F4C579" />
        </Animated.View>
      )}
      {!imageReady && !imageFailed ? (
        <View pointerEvents="none" style={styles.loading}>
          <ActivityIndicator color="#FFE4B0"/>
          <Text style={styles.loadingText}>Đang chuẩn bị Thư Ngõ…</Text>
        </View>
      ) : (
        <View style={[styles.paperOverlay, readerStyle]} testID="welcome-paper-safe-text-region"
          onLayout={e => diagnostic.note('WELCOME','layout',{
            source:'native', result:'single-paper-safe-text-region-measured',
            width:Math.round(e.nativeEvent.layout.width),height:Math.round(e.nativeEvent.layout.height),
          })}>
          <View style={styles.readerViewport} onLayout={e => setScrollAreaHeight(Math.round(e.nativeEvent.layout.height))}>
            <Animated.ScrollView style={styles.scroll} contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false} nestedScrollEnabled
              onContentSizeChange={(_, height) => setContentHeight(Math.round(height))}
              onScroll={Animated.event([{nativeEvent:{contentOffset:{y:scrollY}}}],{useNativeDriver:true})}
              scrollEventThrottle={16}
              accessibilityLabel="Tiêu đề và nội dung 14 đoạn Thư Ngõ; vuốt để đọc toàn bộ"
              testID="welcome-letter-scroll">
              <Animated.View style={[styles.header, {opacity:headingOpacity, transform:[{translateY:headingY}]}]}>
                <Text style={[styles.kicker, small && styles.smallKicker]}>FAMILY BLOOM · HỘP THỜI GIAN</Text>
                <Text style={[styles.title, small && styles.smallTitle, fontsLoaded && {fontFamily:'Lora_700Bold'}]}>THƯ NGỎ</Text>
                <Pressable onPress={() => setClearFont(v => !v)} accessibilityRole="button"
                  accessibilityLabel={clearFont ? 'Dùng chữ Lora' : 'Chuyển sang chữ dễ đọc'}
                  testID="welcome-font-mode-toggle" style={styles.fontSwitch}>
                  <Text style={styles.fontSwitchText}>{clearFont ? 'Chữ Lora' : 'Chữ rõ hơn'}</Text>
                </Pressable>
              </Animated.View>
              {LETTER.map((p, i) => <Text key={i} selectable
                style={[styles.paragraph, small && styles.smallParagraph,
                  fontsLoaded && !clearFont && {fontFamily:p.emphasis?'Lora_700Bold':p.italic?'Lora_400Regular_Italic':'Lora_400Regular'},
                  clearFont && styles.clearParagraph,
                  p.emphasis && !fontsLoaded && styles.emphasis,
                  p.italic && !fontsLoaded && styles.italic]}>{p.text}</Text>)}
            </Animated.ScrollView>
            {scrollAreaHeight > 0 && contentHeight > scrollAreaHeight + 8 && (
              <View pointerEvents="none" style={styles.scrollIndicatorTrack} testID="welcome-pink-scrollbar">
                <Animated.View style={[styles.scrollIndicatorThumb, {backgroundColor:themeColor,
                  height:Math.max(28, (scrollAreaHeight / contentHeight) * (scrollAreaHeight - 8)),
                  transform:[{translateY:scrollY.interpolate({
                    inputRange:[0, Math.max(1,contentHeight-scrollAreaHeight)],
                    outputRange:[0, Math.max(0,scrollAreaHeight-8-Math.max(28,(scrollAreaHeight/contentHeight)*(scrollAreaHeight-8)))],
                    extrapolate:'clamp',
                  })}],
                }]} />
              </View>
            )}
          </View>
          <View style={styles.footer} testID="welcome-fixed-cta-footer">
            <Pressable accessibilityRole="button" accessibilityLabel="Bước vào mái nhà Family Bloom"
              accessibilityState={{disabled:continuing, busy:continuing}}
              disabled={continuing} onPress={continueIntoFamily}
              style={({pressed}) => [styles.cta, {backgroundColor:'#864625',borderColor:'#AD743B',borderWidth:1}, pressed && styles.ctaPressed]}>
              <Text style={[styles.ctaText, {color:'#FFF5DE'}, small && styles.smallCtaText]}>
                {preview ? 'Đóng bản xem thử · Không lưu dữ liệu' : continuing ? 'Đang xác nhận…' : 'Bước vào mái nhà Family Bloom'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {flex:1, backgroundColor:'#4C240F', overflow:'hidden'},
  loading: {position:'absolute',top: '50%',left:0,right:0,alignItems:'center',gap:10},
  loadingText: {color:'#FFE6C5',fontSize:13,fontWeight:'600'},
  paperOverlay: {minWidth:0,minHeight:0, overflow:'hidden'},
  fallbackPaper: {position:'absolute',left:16,right:16,top:30,bottom:30,
    backgroundColor:'#FAE0B4',borderWidth:2,borderColor:'#B47B3B',borderRadius:16,
    paddingHorizontal:12,paddingTop:12,paddingBottom:8},
  header: {alignItems:'center',justifyContent:'center',paddingTop:2,paddingBottom:7},
  kicker: {fontSize:9,letterSpacing:.5,fontWeight:'700',color:'#85502D',textAlign:'center'},
  smallKicker: {fontSize:8},
  title: {fontFamily:'serif',fontSize:29,fontWeight:'700',color:'#6B3923',letterSpacing:1.1},
  smallTitle: {fontSize:25},
  readerViewport: {flex:1,minHeight:0,position:'relative'},
  scroll: {flex:1,minHeight:0},
  scrollIndicatorTrack: {position:'absolute',top:4,bottom:4,right:0,width:4,borderRadius:4,backgroundColor:'rgba(185,73,116,0.12)'},
  scrollIndicatorThumb: {width:4,borderRadius:4},
  body: {paddingTop:5,paddingBottom:12,paddingRight:9},
  // Lora supports Vietnamese and is loaded from the Expo font package; serif fallback is safe.
  paragraph: {fontFamily:'serif',fontSize:17.2,lineHeight:27.5,color:'#4E2C1D',marginBottom:15},
  clearParagraph: {fontFamily:'sans-serif',fontSize:16.4,lineHeight:26.5},
  fontSwitch: {alignSelf:'flex-end',paddingHorizontal:6,paddingVertical:3,minHeight:22},
  fontSwitchText: {fontSize:11,fontWeight:'600',color:'#80502B',textDecorationLine:'underline'},
  smallParagraph: {fontSize:15.4,lineHeight:24,marginBottom:11},
  emphasis: {fontWeight:'700'},
  italic: {fontStyle:'italic'},
  footer: {paddingTop:5,paddingBottom:5,minHeight:47,justifyContent:'center'},
  cta: {minHeight:43,backgroundColor:'#945133',borderRadius:13,
    paddingHorizontal:6,alignItems:'center',justifyContent:'center'},
  ctaPressed: {opacity:.85},
  ctaText: {fontWeight:'700',fontSize:12.5,color:'#FFF5E9',textAlign:'center'},
  smallCtaText: {fontSize:11.5},
});
