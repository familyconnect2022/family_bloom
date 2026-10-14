import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { type ComponentProps, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TimeCapsuleRevealThemeKey = "warm" | "formal" | "festive";
type ThemeKey = TimeCapsuleRevealThemeKey;
type ParticleKind = "petal" | "spark" | "confetti";
type IoniconName = ComponentProps<typeof Ionicons>["name"];
type ParticleItem = {
  kind: ParticleKind;
  x: number;
  y: number;
  size: number;
  rotate: number;
  delay: number;
};

type RevealTheme = {
  key: ThemeKey;
  label: string;
  selectorIcon: IoniconName;
  sealIcon: IoniconName;
  headerTitle: string;
  introTitle: string;
  introSubtitle: string;
  badgeText: string;
  letterKicker: string;
  letterTitle: string;
  letterBody: string;
  sender: string;
  runningHint: string;
  readyHint: string;
  openedHint: string;
  colors: {
    night: string;
    ambientOne: string;
    ambientTwo: string;
    eyebrow: string;
    topTitle: string;
    textSoft: string;
    accent: string;
    accentDeep: string;
    accentInk: string;
    accentSoft: string;
    accentPale: string;
    boxTop: string;
    boxFront: string;
    boxBack: string;
    boxShade: string;
    ribbon: string;
    ribbonEdge: string;
    ribbonHighlight: string;
    seal: string;
    sealInk: string;
    paper: string;
    paperEdge: string;
    paperInk: string;
    paperMuted: string;
    paperSoft: string;
    paperRule: string;
    haloOuter: string;
    haloMiddle: string;
    haloInner: string;
    coreGlow: string;
    seam: string;
    particlePrimary: string;
    particleSecondary: string;
    button: string;
    buttonInk: string;
  };
  shape: {
    lidRadius: number;
    bodyRadius: number;
    letterRadius: number;
    ribbonWidth: number;
    sealSize: number;
  };
  motion: {
    duration: number;
    hapticDelay: number;
    lidLift: number;
    lidRotate: number;
    boxYield: number;
    boxEndScale: number;
    letterStart: number;
    letterFull: number;
    letterOvershoot: number;
    particleDrift: number;
    haloPeak: number;
  };
  particles: readonly ParticleItem[];
};

const WARM_PARTICLES: readonly ParticleItem[] = [
  { kind: "petal", x: -118, y: -176, size: 13, rotate: -28, delay: 0.0 },
  { kind: "spark", x: -72, y: -214, size: 5, rotate: 0, delay: 0.03 },
  { kind: "petal", x: -25, y: -232, size: 11, rotate: 18, delay: 0.06 },
  { kind: "spark", x: 36, y: -222, size: 4, rotate: 0, delay: 0.01 },
  { kind: "petal", x: 94, y: -188, size: 12, rotate: 43, delay: 0.09 },
  { kind: "spark", x: 133, y: -137, size: 5, rotate: 0, delay: 0.04 },
  { kind: "petal", x: 145, y: -80, size: 9, rotate: -38, delay: 0.12 },
  { kind: "spark", x: -145, y: -96, size: 4, rotate: 0, delay: 0.1 },
  { kind: "petal", x: -105, y: -54, size: 8, rotate: 65, delay: 0.15 },
  { kind: "spark", x: 105, y: -46, size: 4, rotate: 0, delay: 0.13 },
  { kind: "petal", x: -54, y: -142, size: 7, rotate: -50, delay: 0.07 },
  { kind: "spark", x: 62, y: -128, size: 4, rotate: 0, delay: 0.17 },
];

const FORMAL_PARTICLES: readonly ParticleItem[] = [
  { kind: "spark", x: -126, y: -188, size: 4, rotate: 0, delay: 0.01 },
  { kind: "spark", x: -78, y: -226, size: 5, rotate: 0, delay: 0.06 },
  { kind: "spark", x: -18, y: -248, size: 3, rotate: 0, delay: 0.1 },
  { kind: "spark", x: 48, y: -230, size: 4, rotate: 0, delay: 0.02 },
  { kind: "spark", x: 112, y: -194, size: 5, rotate: 0, delay: 0.08 },
  { kind: "spark", x: 145, y: -118, size: 3, rotate: 0, delay: 0.13 },
  { kind: "spark", x: -148, y: -106, size: 3, rotate: 0, delay: 0.15 },
  { kind: "spark", x: 82, y: -104, size: 4, rotate: 0, delay: 0.18 },
];

const FESTIVE_PARTICLES: readonly ParticleItem[] = [
  { kind: "confetti", x: -144, y: -168, size: 9, rotate: -28, delay: 0.0 },
  { kind: "spark", x: -104, y: -222, size: 6, rotate: 0, delay: 0.02 },
  { kind: "petal", x: -64, y: -244, size: 9, rotate: 22, delay: 0.04 },
  { kind: "confetti", x: -18, y: -260, size: 8, rotate: 38, delay: 0.07 },
  { kind: "spark", x: 31, y: -252, size: 5, rotate: 0, delay: 0.0 },
  { kind: "confetti", x: 78, y: -224, size: 10, rotate: -18, delay: 0.05 },
  { kind: "petal", x: 128, y: -188, size: 10, rotate: 44, delay: 0.08 },
  { kind: "spark", x: 158, y: -132, size: 5, rotate: 0, delay: 0.03 },
  { kind: "confetti", x: 151, y: -70, size: 8, rotate: 62, delay: 0.11 },
  { kind: "spark", x: -158, y: -88, size: 4, rotate: 0, delay: 0.09 },
  { kind: "confetti", x: -122, y: -52, size: 9, rotate: -52, delay: 0.14 },
  { kind: "petal", x: 108, y: -47, size: 8, rotate: 58, delay: 0.13 },
  { kind: "spark", x: -56, y: -146, size: 5, rotate: 0, delay: 0.06 },
  { kind: "confetti", x: 60, y: -132, size: 7, rotate: 24, delay: 0.17 },
];

export const TIME_CAPSULE_REVEAL_THEMES: Record<ThemeKey, RevealTheme> = {
  warm: {
    key: "warm",
    label: "Ấm áp",
    selectorIcon: "heart-outline",
    sealIcon: "flower",
    headerTitle: "Một điều đã chờ đến hôm nay",
    introTitle: "Có một Hộp thời gian dành cho bạn",
    introSubtitle: "Một lời đặc biệt đã được giữ kín cho đúng khoảnh khắc này.",
    badgeText: "ĐÃ ĐẾN LÚC MỞ",
    letterKicker: "GỬI EM",
    letterTitle: "Vào ngày sinh nhật…",
    letterBody:
      "Cảm ơn em vì đã luôn ở bên anh, luôn là người đồng hành tuyệt vời trong mọi chặng đường.\n\nChúc em tuổi mới thật nhiều niềm vui, bình yên và luôn rạng rỡ như thế này nhé.",
    sender: "Anh",
    runningHint: "Ánh sáng đang mở một lời đã được giữ kín đến đúng hôm nay…",
    readyHint: "Ấm áp · dịu, gần gũi và nhiều cảm xúc.",
    openedHint: "Ấm áp đã mở. Bạn có thể xem lại hoặc chọn một phong cách khác để so sánh.",
    colors: {
      night: "#160D13",
      ambientOne: "rgba(204,91,98,0.08)",
      ambientTwo: "rgba(255,170,113,0.055)",
      eyebrow: "#E9A3B4",
      topTitle: "#FFF4F7",
      textSoft: "rgba(255,240,244,0.68)",
      accent: "#F7CA8F",
      accentDeep: "#DB6F8D",
      accentInk: "#6E3D4D",
      accentSoft: "#F5B1BD",
      accentPale: "#FFE4E2",
      boxTop: "#F4C2C2",
      boxFront: "#D9949F",
      boxBack: "#BD7784",
      boxShade: "rgba(107,42,61,0.13)",
      ribbon: "#F7D5C9",
      ribbonEdge: "#E7B5AA",
      ribbonHighlight: "rgba(255,255,255,0.20)",
      seal: "#DB6F8D",
      sealInk: "#FFF9F6",
      paper: "#FFF9F3",
      paperEdge: "#F6D9CC",
      paperInk: "#6E3D4D",
      paperMuted: "#946E7A",
      paperSoft: "#FFF0ED",
      paperRule: "#F0B6BC",
      haloOuter: "rgba(232,111,125,0.07)",
      haloMiddle: "rgba(255,176,112,0.10)",
      haloInner: "rgba(255,226,157,0.16)",
      coreGlow: "rgba(255,247,205,0.86)",
      seam: "#FFF6CD",
      particlePrimary: "#F6A7AF",
      particleSecondary: "#FFF4C8",
      button: "#F4B2BD",
      buttonInk: "#6B3448",
    },
    shape: { lidRadius: 22, bodyRadius: 25, letterRadius: 28, ribbonWidth: 32, sealSize: 40 },
    motion: {
      duration: 2550,
      hapticDelay: 620,
      lidLift: -63,
      lidRotate: -4.5,
      boxYield: 96,
      boxEndScale: 0.83,
      letterStart: 0.36,
      letterFull: 0.53,
      letterOvershoot: 1.035,
      particleDrift: 12,
      haloPeak: 1.3,
    },
    particles: WARM_PARTICLES,
  },
  formal: {
    key: "formal",
    label: "Trang trọng",
    selectorIcon: "shield-checkmark-outline",
    sealIcon: "diamond-outline",
    headerTitle: "Một lời quan trọng dành cho bạn",
    introTitle: "Có một thông điệp cần được mở hôm nay",
    introSubtitle: "Được giữ lại cẩn thận để bạn đọc vào đúng thời điểm.",
    badgeText: "THÔNG ĐIỆP QUAN TRỌNG",
    letterKicker: "DÀNH RIÊNG CHO BẠN",
    letterTitle: "Một điều quan trọng…",
    letterBody:
      "Có những lời cần được nói vào đúng thời điểm. Hôm nay là ngày để bạn mở thông điệp này và giữ lại điều thực sự quan trọng với gia đình.\n\nMong bạn đọc nó thật chậm, và nhớ rằng luôn có những người đang ở bên bạn.",
    sender: "Gia đình",
    runningHint: "Niêm phong đang mở · ánh sáng dẫn bạn đến thông điệp bên trong…",
    readyHint: "Trang trọng · xanh dương, điềm tĩnh và có trọng lượng.",
    openedHint: "Thông điệp đã mở. Chuyển theme để cảm nhận sự khác biệt về nhịp và không khí.",
    colors: {
      night: "#071423",
      ambientOne: "rgba(70,137,218,0.12)",
      ambientTwo: "rgba(119,178,255,0.07)",
      eyebrow: "#8FC4FF",
      topTitle: "#F2F8FF",
      textSoft: "rgba(224,239,255,0.72)",
      accent: "#BFD9F7",
      accentDeep: "#3978C5",
      accentInk: "#183A63",
      accentSoft: "#7DB0EA",
      accentPale: "#E6F1FF",
      boxTop: "#6FA4DE",
      boxFront: "#3F79B8",
      boxBack: "#295A91",
      boxShade: "rgba(5,35,70,0.24)",
      ribbon: "#D6E5F5",
      ribbonEdge: "#AFC9E4",
      ribbonHighlight: "rgba(255,255,255,0.32)",
      seal: "#1D5C9F",
      sealInk: "#F4FAFF",
      paper: "#F8FBFF",
      paperEdge: "#CEDFF0",
      paperInk: "#173A60",
      paperMuted: "#6A8198",
      paperSoft: "#EAF3FC",
      paperRule: "#8EB6DD",
      haloOuter: "rgba(59,126,205,0.08)",
      haloMiddle: "rgba(106,171,239,0.12)",
      haloInner: "rgba(211,235,255,0.22)",
      coreGlow: "rgba(238,249,255,0.94)",
      seam: "#F4FBFF",
      particlePrimary: "#B9DBFF",
      particleSecondary: "#F2FAFF",
      button: "#9CC8F2",
      buttonInk: "#12365D",
    },
    shape: { lidRadius: 13, bodyRadius: 16, letterRadius: 20, ribbonWidth: 28, sealSize: 38 },
    motion: {
      duration: 2850,
      hapticDelay: 760,
      lidLift: -56,
      lidRotate: -1.4,
      boxYield: 82,
      boxEndScale: 0.87,
      letterStart: 0.39,
      letterFull: 0.58,
      letterOvershoot: 1.0,
      particleDrift: 5,
      haloPeak: 1.18,
    },
    particles: FORMAL_PARTICLES,
  },
  festive: {
    key: "festive",
    label: "Rộn ràng",
    selectorIcon: "sparkles-outline",
    sealIcon: "star",
    headerTitle: "Một bất ngờ đang chờ bật tung",
    introTitle: "Hôm nay có một niềm vui dành cho bạn",
    introSubtitle: "Mở hộp và để điều vui vẻ này bừng sáng đúng khoảnh khắc.",
    badgeText: "TIN VUI ĐÃ ĐẾN",
    letterKicker: "TIN VUI",
    letterTitle: "Hôm nay phải thật rộn ràng!",
    letterBody:
      "Có một lý do rất đáng để cười thật tươi hôm nay. Chúc bạn nhận được thật nhiều niềm vui, những cái ôm và những khoảnh khắc khiến cả nhà muốn nhớ thật lâu.\n\nMở rồi thì nhớ ăn mừng nhé!",
    sender: "Cả nhà",
    runningHint: "Niềm vui đang bật sáng · chuẩn bị đón một bất ngờ nhé…",
    readyHint: "Rộn ràng · vàng bơ pha hồng, sáng và vui hơn rõ rệt.",
    openedHint: "Rộn ràng đã bung sáng. Xem lại để cảm nhận nhịp pop và confetti rõ hơn.",
    colors: {
      night: "#21150B",
      ambientOne: "rgba(255,207,102,0.13)",
      ambientTwo: "rgba(255,152,170,0.09)",
      eyebrow: "#FFD98D",
      topTitle: "#FFF9E9",
      textSoft: "rgba(255,246,221,0.76)",
      accent: "#F7D174",
      accentDeep: "#E67F91",
      accentInk: "#745023",
      accentSoft: "#F5A6B5",
      accentPale: "#FFF1BD",
      boxTop: "#F5D987",
      boxFront: "#E9BB61",
      boxBack: "#C89242",
      boxShade: "rgba(107,66,19,0.17)",
      ribbon: "#F5A9B5",
      ribbonEdge: "#DF8798",
      ribbonHighlight: "rgba(255,255,255,0.28)",
      seal: "#E4778C",
      sealInk: "#FFF9F0",
      paper: "#FFFBEF",
      paperEdge: "#F1DCA4",
      paperInk: "#73502A",
      paperMuted: "#9A7952",
      paperSoft: "#FFF2CF",
      paperRule: "#E8B96B",
      haloOuter: "rgba(255,211,104,0.10)",
      haloMiddle: "rgba(255,163,177,0.13)",
      haloInner: "rgba(255,236,159,0.24)",
      coreGlow: "rgba(255,251,215,0.98)",
      seam: "#FFF9CC",
      particlePrimary: "#F59AAF",
      particleSecondary: "#FFE283",
      button: "#F5D47D",
      buttonInk: "#70471C",
    },
    shape: { lidRadius: 25, bodyRadius: 29, letterRadius: 30, ribbonWidth: 36, sealSize: 42 },
    motion: {
      duration: 2350,
      hapticDelay: 500,
      lidLift: -72,
      lidRotate: -7,
      boxYield: 110,
      boxEndScale: 0.8,
      letterStart: 0.33,
      letterFull: 0.49,
      letterOvershoot: 1.085,
      particleDrift: 16,
      haloPeak: 1.42,
    },
    particles: FESTIVE_PARTICLES,
  },
};

function Particle({ progress, item, theme }: { progress: SharedValue<number>; item: ParticleItem; theme: RevealTheme }) {
  const style = useAnimatedStyle(() => {
    const start = 0.2 + item.delay;
    const end = 0.63 + item.delay * 0.25;
    const local = Math.max(0, Math.min(1, (progress.value - start) / Math.max(0.001, end - start)));
    const opacity = interpolate(local, [0, 0.12, 0.72, 1], [0, 1, 0.86, 0], Extrapolation.CLAMP);
    const drift = Math.sin(local * Math.PI) * (item.kind === "petal" ? theme.motion.particleDrift : item.kind === "confetti" ? theme.motion.particleDrift * 0.75 : 4);
    const scale = item.kind === "spark"
      ? interpolate(local, [0, 0.18, 1], [0.2, 1.15, 0.25], Extrapolation.CLAMP)
      : interpolate(local, [0, 0.16, 1], [0.3, 1, 0.72], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [
        { translateX: item.x * local + drift },
        { translateY: 20 + item.y * local },
        { rotate: `${item.rotate + local * (item.kind === "petal" ? 130 : item.kind === "confetti" ? 220 : 20)}deg` },
        { scale },
      ],
    };
  });

  const shapeStyle = item.kind === "petal"
    ? [styles.petal, { width: item.size, height: item.size * 1.46, backgroundColor: theme.colors.particlePrimary }]
    : item.kind === "confetti"
      ? [styles.confetti, { width: item.size * 0.72, height: item.size * 1.45, backgroundColor: theme.colors.particlePrimary }]
      : [styles.spark, { width: item.size, height: item.size, backgroundColor: theme.colors.particleSecondary }];

  return <Animated.View style={[shapeStyle, style]} />;
}

function RibbonBow({ theme }: { theme: RevealTheme }) {
  const ribbon = theme.colors.ribbon;
  const edge = theme.colors.ribbonEdge;
  return (
    <View style={styles.bow} pointerEvents="none">
      <View style={[styles.bowLoop, styles.bowLoopLeft, { borderColor: ribbon }]} />
      <View style={[styles.bowLoop, styles.bowLoopRight, { borderColor: ribbon }]} />
      <View style={[styles.bowTail, styles.bowTailLeft, { backgroundColor: ribbon, borderColor: edge }]} />
      <View style={[styles.bowTail, styles.bowTailRight, { backgroundColor: ribbon, borderColor: edge }]} />
      <View style={[styles.bowKnot, { backgroundColor: ribbon, borderColor: edge }]} />
    </View>
  );
}

export type TimeCapsuleRevealContent = {
  kicker?: string;
  title: string;
  message: string;
  sender: string;
};

export function TimeCapsuleRevealPrototype({
  onBack,
  initialThemeKey = "warm",
  allowThemeSwitch = true,
  content,
  waitedDays = 87,
  onOpened,
}: {
  onBack: () => void;
  initialThemeKey?: ThemeKey;
  allowThemeSwitch?: boolean;
  content?: TimeCapsuleRevealContent;
  waitedDays?: number;
  onOpened?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [themeKey, setThemeKey] = useState<ThemeKey>(initialThemeKey);
  const [opened, setOpened] = useState(false);
  const [running, setRunning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const progress = useSharedValue(0);
  const hapticTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const theme = TIME_CAPSULE_REVEAL_THEMES[themeKey];
  const compact = height < 760;

  const clearHapticTimer = useCallback(() => {
    if (hapticTimer.current) {
      clearTimeout(hapticTimer.current);
      hapticTimer.current = null;
    }
  }, []);

  useEffect(() => () => {
    clearHapticTimer();
  }, [clearHapticTimer]);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => { if (alive) setReduceMotion(enabled); })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  const reset = useCallback(() => {
    clearHapticTimer();
    progress.value = 0;
    setOpened(false);
    setRunning(false);
  }, [clearHapticTimer, progress]);

  const selectTheme = useCallback((next: ThemeKey) => {
    if (running || next === themeKey) return;
    clearHapticTimer();
    progress.value = 0;
    setOpened(false);
    setThemeKey(next);
  }, [clearHapticTimer, progress, running, themeKey]);

  const finish = useCallback(() => {
    setOpened(true);
    setRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onOpened?.();
  }, [onOpened]);

  const openCapsule = useCallback(() => {
    if (running) return;
    clearHapticTimer();
    setRunning(true);
    setOpened(false);
    progress.value = 0;

    const openingFeedback = reduceMotion || themeKey === "formal"
      ? Haptics.ImpactFeedbackStyle.Light
      : Haptics.ImpactFeedbackStyle.Medium;
    Haptics.impactAsync(openingFeedback).catch(() => undefined);
    if (!reduceMotion) {
      hapticTimer.current = setTimeout(() => {
        const secondFeedback = themeKey === "festive"
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Light;
        Haptics.impactAsync(secondFeedback).catch(() => undefined);
        hapticTimer.current = null;
      }, theme.motion.hapticDelay);
    }

    // One UI-thread timeline, but each theme owns its own pacing and motion character.
    // Accessibility Reduce Motion keeps the reveal semantics while compressing motion
    // and removing decorative particles so the content never depends on animation.
    progress.value = withTiming(1, {
      duration: reduceMotion ? 700 : theme.motion.duration,
      easing: Easing.linear,
    }, (done) => {
      if (done) runOnJS(finish)();
    });
  }, [clearHapticTimer, finish, progress, reduceMotion, running, theme.motion.duration, theme.motion.hapticDelay, themeKey]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.18, 0.62, 1], [0.82, 0.96, 1, 0.94], Extrapolation.CLAMP),
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.14, 0.26, 0.5, 0.78, 1], [0.05, 0.08, 0.34, 0.95, 0.44, 0.18], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 0.18, 0.5, 1], [0.72, 0.82, theme.motion.haloPeak, theme.motion.haloPeak + 0.28], Extrapolation.CLAMP) },
    ],
  }));

  const coreGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.13, 0.23, 0.48, 0.72, 1], [0.08, 0.12, 0.86, 1, 0.48, 0.18], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0, 0.18, 0.46, 1], [0.58, 0.75, themeKey === "festive" ? 1.46 : themeKey === "formal" ? 1.18 : 1.32, 1.12], Extrapolation.CLAMP) },
      { scaleY: interpolate(progress.value, [0, 0.18, 0.46, 1], [0.42, 0.65, themeKey === "festive" ? 1.3 : themeKey === "formal" ? 1.08 : 1.2, 1.05], Extrapolation.CLAMP) },
    ],
  }));

  const boxInnerGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.14, 0.25, 0.54, 1], [0.06, 0.1, 0.94, 0.72, 0.2], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0, 0.22, 0.52, 1], [0.58, 0.82, themeKey === "festive" ? 1.36 : themeKey === "formal" ? 1.12 : 1.24, 1.05], Extrapolation.CLAMP) },
      { scaleY: interpolate(progress.value, [0, 0.22, 0.52, 1], [0.55, 0.78, themeKey === "festive" ? 1.25 : themeKey === "formal" ? 1.06 : 1.15, 1.02], Extrapolation.CLAMP) },
    ],
  }));

  const seamLightStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.18, 0.42, 0.72], [0, 0.12, 1, 0.96, 0.25], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0.08, 0.27, 0.58], [0.08, 1, themeKey === "festive" ? 1.34 : themeKey === "formal" ? 1.08 : 1.22], Extrapolation.CLAMP) },
    ],
  }));

  const boxSceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.72, 1], [1, 1, 0.72], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 0.12, 0.36, 0.48, 0.72, 1], [0, themeKey === "festive" ? -7 : -4, 0, 0, theme.motion.boxYield * 0.36, theme.motion.boxYield], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 0.055, 0.11, 0.48, 0.72, 1], [1, themeKey === "festive" ? 1.022 : 1.012, 1, 1, 0.95, theme.motion.boxEndScale], Extrapolation.CLAMP) },
    ],
  }));

  const lidStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 0.15, 0.34, 0.58, 1], [0, 0, theme.motion.lidLift * 0.73, theme.motion.lidLift, theme.motion.lidLift - 7], Extrapolation.CLAMP) },
      { translateX: interpolate(progress.value, [0, 0.18, 0.42, 1], [0, 0, themeKey === "formal" ? 3 : themeKey === "festive" ? 10 : 7, themeKey === "formal" ? 4 : 10], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(progress.value, [0, 0.16, 0.38, 0.72, 1], [0, 0, theme.motion.lidRotate, theme.motion.lidRotate * 0.56, theme.motion.lidRotate * 0.44], Extrapolation.CLAMP)}deg` },
      { scale: interpolate(progress.value, [0, 0.36, 1], [1, 0.985, themeKey === "formal" ? 0.97 : 0.94], Extrapolation.CLAMP) },
    ],
  }));

  const bowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.24, 0.34], [1, 1, 0.65, 0], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 0.18, 0.34], [0, themeKey === "formal" ? -2 : -4, themeKey === "formal" ? -12 : -18], Extrapolation.CLAMP) },
      { scale: interpolate(progress.value, [0, 0.18, 0.34], [1, themeKey === "festive" ? 1.08 : 1.03, 0.86], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(progress.value, [0, 0.34], [0, themeKey === "formal" ? 2 : themeKey === "festive" ? 10 : 6], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const ribbonStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.16, 0.31, 0.42], [1, 1, 0.58, 0], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(progress.value, [0, 0.18, 0.42], [1, themeKey === "festive" ? 1.08 : 1.03, 0.88], Extrapolation.CLAMP) },
    ],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.23, 0.34], [1, 1, 0.72, 0], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(progress.value, [0, 0.11, 0.23, 0.34], [1, themeKey === "festive" ? 1.14 : 1.08, 0.94, 0.54], Extrapolation.CLAMP) },
      { rotateZ: `${interpolate(progress.value, [0, 0.34], [0, themeKey === "formal" ? 6 : themeKey === "festive" ? 28 : 18], Extrapolation.CLAMP)}deg` },
    ],
  }));

  const letterStyle = useAnimatedStyle(() => {
    const start = theme.motion.letterStart;
    const full = theme.motion.letterFull;
    const firstVisible = start + 0.04;
    const overshootPoint = Math.min(0.82, full + 0.22);
    return {
      opacity: interpolate(progress.value, [0, start, firstVisible, full, 1], [0, 0, 0.22, 1, 1], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(progress.value, [0, start, firstVisible, full + 0.05, 0.78, 0.92, 1], [92, 92, 92, 24, -52, -70, -70], Extrapolation.CLAMP) },
        { scale: interpolate(progress.value, [0, start, firstVisible, full - 0.05, full + 0.12, overshootPoint, 0.91, 1], [0, 0, 0.05, 0.4, 0.92, theme.motion.letterOvershoot, 1, 1], Extrapolation.CLAMP) },
        { rotateZ: `${interpolate(progress.value, [0, start, full, 0.78, 1], [0, 0, themeKey === "formal" ? -0.6 : themeKey === "festive" ? -4 : -2.5, themeKey === "formal" ? 0.15 : themeKey === "festive" ? 1.2 : 0.6, 0], Extrapolation.CLAMP)}deg` },
      ],
    };
  });

  const letterContentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.66, 0.82, 1], [0, 0, 0.82, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0.66, 0.92], [12, 0], Extrapolation.CLAMP) }],
  }));

  const introStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.1, 0.21, 0.28], [1, 1, 0.26, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0, 0.28], [0, -12], Extrapolation.CLAMP) }],
  }));

  const completedActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.89, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(progress.value, [0.89, 1], [10, 0], Extrapolation.CLAMP) }],
  }));

  const hint = useMemo(() => {
    if (running) return theme.runningHint;
    if (opened) return theme.openedHint;
    return theme.readyHint;
  }, [opened, running, theme]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.night }]}>
      <Animated.View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.colors.night }, backdropStyle]} />
      <View pointerEvents="none" style={styles.ambientField}>
        <View style={[styles.ambientSpotOne, { backgroundColor: theme.colors.ambientOne }]} />
        <View style={[styles.ambientSpotTwo, { backgroundColor: theme.colors.ambientTwo }]} />
      </View>

      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={theme.colors.topTitle} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={[styles.eyebrow, { color: theme.colors.eyebrow }]}>{allowThemeSwitch ? "HỘP THỜI GIAN · 3 PHONG CÁCH" : "HỘP THỜI GIAN"}</Text>
          <Text style={[styles.topTitle, { color: theme.colors.topTitle }]}>{theme.headerTitle}</Text>
        </View>
        <View style={styles.topSpacer} />
      </View>

      {allowThemeSwitch && (
        <View style={styles.themePicker}>
          {(Object.keys(TIME_CAPSULE_REVEAL_THEMES) as ThemeKey[]).map((key) => {
            const option = TIME_CAPSULE_REVEAL_THEMES[key];
            const selected = key === themeKey;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected, disabled: running }}
                disabled={running}
                onPress={() => selectTheme(key)}
                style={({ pressed }) => [
                  styles.themeChip,
                  selected && { backgroundColor: theme.colors.accentPale, borderColor: theme.colors.accent },
                  pressed && !running && styles.themeChipPressed,
                  running && styles.themeChipDisabled,
                ]}
              >
                <Ionicons name={option.selectorIcon} size={15} color={selected ? theme.colors.accentInk : "rgba(240,246,255,0.68)"} />
                <Text style={[styles.themeChipText, selected && { color: theme.colors.accentInk }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={[styles.stage, compact && styles.stageCompact]}>
        <View pointerEvents="none" style={styles.haloCenter}>
          <Animated.View style={[styles.haloGroup, haloStyle]}>
            <View style={[styles.haloOuter, { backgroundColor: theme.colors.haloOuter }]} />
            <View style={[styles.haloMiddle, { backgroundColor: theme.colors.haloMiddle }]} />
            <View style={[styles.haloInner, { backgroundColor: theme.colors.haloInner }]} />
          </Animated.View>
          <Animated.View style={[styles.coreGlow, { backgroundColor: theme.colors.coreGlow }, coreGlowStyle]} />
          {!reduceMotion && theme.particles.map((item, index) => (
            <Particle key={`${themeKey}-particle-${index}`} item={item} progress={progress} theme={theme} />
          ))}
        </View>

        <Animated.View style={[styles.intro, introStyle]} pointerEvents="none">
          <View style={[styles.timeBadge, { borderColor: `${theme.colors.accent}55`, backgroundColor: `${theme.colors.accent}14` }]}>
            <Ionicons name={theme.selectorIcon} size={14} color={theme.colors.accent} />
            <Text style={[styles.timeBadgeText, { color: theme.colors.accent }]}>{theme.badgeText}</Text>
          </View>
          <Text style={[styles.introTitle, { color: theme.colors.topTitle }]}>{theme.introTitle}</Text>
          <Text style={[styles.introSubtitle, { color: theme.colors.textSoft }]}>{theme.introSubtitle}</Text>
        </Animated.View>

        <Animated.View style={[styles.letterWrap, compact && styles.letterWrapCompact, letterStyle]} pointerEvents={opened ? "auto" : "none"}>
          <View style={[styles.letterBackplate, { backgroundColor: themeKey === "formal" ? "rgba(4,28,55,0.42)" : themeKey === "festive" ? "rgba(92,57,18,0.32)" : "rgba(88,34,48,0.36)", borderRadius: theme.shape.letterRadius + 2 }]} />
          <View style={[styles.letter, compact && styles.letterCompact, { backgroundColor: theme.colors.paper, borderColor: theme.colors.paperEdge, borderRadius: theme.shape.letterRadius }]}>
            <View style={[styles.paperCornerGlow, { backgroundColor: themeKey === "formal" ? "rgba(170,215,255,0.22)" : themeKey === "festive" ? "rgba(255,220,123,0.30)" : "rgba(255,211,179,0.25)" }]} />
            <View style={[styles.paperFloralTop, { backgroundColor: theme.colors.accentPale, borderColor: theme.colors.paperEdge }]}>
              <Ionicons name={theme.sealIcon} size={21} color={theme.colors.accentDeep} />
            </View>
            <View style={styles.paperFloralBottom}>
              <Ionicons name={themeKey === "formal" ? "shield-checkmark-outline" : themeKey === "festive" ? "sparkles-outline" : "leaf-outline"} size={18} color={theme.colors.accentDeep} />
            </View>
            <Animated.View style={letterContentStyle}>
              <Text style={[styles.letterKicker, { color: theme.colors.accentDeep }]}>{content?.kicker || theme.letterKicker}</Text>
              <Text style={[styles.letterTitle, { color: theme.colors.paperInk }]}>{content?.title || theme.letterTitle}</Text>
              <View style={[styles.letterRule, { backgroundColor: theme.colors.paperRule }]} />
              <Text style={[styles.letterBody, { color: theme.colors.paperMuted }]}>{content?.message || theme.letterBody}</Text>
              <View style={[styles.letterRuleSmall, { backgroundColor: theme.colors.paperRule }]} />
              <Text style={[styles.senderLabel, { color: theme.colors.paperMuted }]}>Được gửi bởi</Text>
              <Text style={[styles.sender, { color: theme.colors.paperInk }]}>{content?.sender || theme.sender}</Text>
              <View style={[styles.waitedRow, { backgroundColor: theme.colors.paperSoft }]}>
                <Ionicons name="hourglass-outline" size={14} color={theme.colors.accentDeep} />
                <Text style={[styles.waited, { color: theme.colors.paperMuted }]}>Lời này đã chờ {waitedDays} ngày để đến với bạn</Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View style={[styles.boxScene, compact && styles.boxSceneCompact, boxSceneStyle]} pointerEvents="none">
          <View style={styles.boxGroundShadow} />
          <Animated.View style={[styles.boxBackGlow, { backgroundColor: theme.colors.coreGlow }, boxInnerGlowStyle]} />

          <Animated.View style={[styles.lidAssembly, lidStyle]}>
            <View style={[styles.lidUnderside, { backgroundColor: theme.colors.boxBack, borderRadius: Math.max(8, theme.shape.lidRadius - 7) }]} />
            <View style={[styles.lidTop, { backgroundColor: theme.colors.boxTop, borderRadius: theme.shape.lidRadius }]}>
              <View style={[styles.lidTopHighlight, themeKey === "formal" && styles.formalHighlight]} />
              <View style={[styles.lidTopEdge, { backgroundColor: theme.colors.boxShade }]} />
              <Animated.View style={[styles.lidRibbon, { width: theme.shape.ribbonWidth, left: (232 - theme.shape.ribbonWidth) / 2, backgroundColor: theme.colors.ribbon, borderColor: theme.colors.ribbonEdge }, ribbonStyle]} />
              <Animated.View style={bowStyle}>
                <RibbonBow theme={theme} />
              </Animated.View>
              <Animated.View style={[styles.seal, { width: theme.shape.sealSize, height: theme.shape.sealSize, backgroundColor: theme.colors.seal }, sealStyle]}>
                <Ionicons name={theme.sealIcon} size={themeKey === "festive" ? 21 : 20} color={theme.colors.sealInk} />
              </Animated.View>
            </View>
          </Animated.View>

          <View style={[styles.boxBodyBackLip, { backgroundColor: theme.colors.boxBack, borderRadius: Math.max(10, theme.shape.bodyRadius - 9) }]} />
          <Animated.View style={[styles.seamLight, { backgroundColor: theme.colors.seam }, seamLightStyle]} />
          <View style={[styles.boxBody, { backgroundColor: theme.colors.boxFront, borderRadius: theme.shape.bodyRadius }]}>
            <View style={[styles.boxFaceHighlight, themeKey === "formal" && styles.formalHighlight]} />
            <View style={styles.boxFaceSoftLight} />
            {themeKey === "festive" && <View style={styles.festiveDotRow} />}
            <View style={[styles.boxSideShade, { backgroundColor: theme.colors.boxShade }]} />
            <View style={[styles.boxBottomShade, { backgroundColor: theme.colors.boxShade }]} />
            <Animated.View style={[styles.verticalRibbon, { left: (210 - theme.shape.ribbonWidth) / 2, width: theme.shape.ribbonWidth, backgroundColor: theme.colors.ribbon, borderColor: theme.colors.ribbonEdge }, ribbonStyle]}>
              <View style={[styles.ribbonCenterHighlight, { backgroundColor: theme.colors.ribbonHighlight }]} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom + 14, 22) }]}>
        <Text style={[styles.hint, { color: theme.colors.textSoft }]}>{hint}</Text>
        {!opened ? (
          <Pressable
            onPress={openCapsule}
            disabled={running}
            style={({ pressed }) => [
              styles.openButton,
              { backgroundColor: theme.colors.button, borderColor: `${theme.colors.topTitle}99` },
              pressed && !running && styles.openButtonPressed,
              running && styles.openButtonDisabled,
            ]}
          >
            <Ionicons name={running ? "sparkles" : "gift-outline"} size={20} color={theme.colors.buttonInk} />
            <Text style={[styles.openButtonText, { color: theme.colors.buttonInk }]}>{running ? "Đang mở…" : `Mở · ${theme.label}`}</Text>
          </Pressable>
        ) : (
          <Animated.View style={[styles.actions, completedActionsStyle]}>
            <Pressable onPress={reset} style={({ pressed }) => [styles.replayButton, { backgroundColor: theme.colors.button, borderColor: `${theme.colors.topTitle}88` }, pressed && styles.openButtonPressed]}>
              <Ionicons name="refresh-outline" size={19} color={theme.colors.buttonInk} />
              <Text style={[styles.replayText, { color: theme.colors.buttonInk }]}>Xem lại hiệu ứng</Text>
            </Pressable>
            <View style={styles.memoryBadge}>
              <Ionicons name={theme.selectorIcon} size={16} color={theme.colors.accentDeep} />
              <Text style={[styles.memoryText, { color: theme.colors.textSoft }]}>Phong cách {theme.label} · cùng một Hộp thời gian</Text>
            </View>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  ambientField: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  ambientSpotOne: { position: "absolute", width: 280, height: 280, borderRadius: 999, top: -90, right: -120 },
  ambientSpotTwo: { position: "absolute", width: 320, height: 320, borderRadius: 999, bottom: -170, left: -170 },

  topBar: { zIndex: 40, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8 },
  backButton: { width: 46, height: 46, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.13)", backgroundColor: "rgba(255,255,255,0.045)" },
  topCopy: { flex: 1, paddingHorizontal: 12 },
  topSpacer: { width: 46 },
  eyebrow: { fontSize: 9.3, fontWeight: "900", letterSpacing: 1.15 },
  topTitle: { marginTop: 3, fontSize: 17, fontWeight: "800" },

  themePicker: { zIndex: 41, flexDirection: "row", alignSelf: "center", gap: 7, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.035)" },
  themeChip: { minHeight: 34, paddingHorizontal: 11, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)", backgroundColor: "rgba(255,255,255,0.035)" },
  themeChipText: { color: "rgba(240,246,255,0.72)", fontSize: 10.5, fontWeight: "800" },
  themeChipPressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  themeChipDisabled: { opacity: 0.58 },

  stage: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 4 },
  stageCompact: { paddingTop: 0 },
  haloCenter: { position: "absolute", left: "50%", top: "54%", width: 1, height: 1, alignItems: "center", justifyContent: "center" },
  haloGroup: { position: "absolute", width: 340, height: 340, alignItems: "center", justifyContent: "center" },
  haloOuter: { position: "absolute", width: 340, height: 340, borderRadius: 999 },
  haloMiddle: { position: "absolute", width: 245, height: 245, borderRadius: 999 },
  haloInner: { position: "absolute", width: 155, height: 155, borderRadius: 999 },
  coreGlow: { position: "absolute", width: 118, height: 72, borderRadius: 999 },
  petal: { position: "absolute", borderTopLeftRadius: 999, borderBottomRightRadius: 999, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.48)" },
  confetti: { position: "absolute", borderRadius: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.40)" },
  spark: { position: "absolute", borderRadius: 999 },

  intro: { position: "absolute", top: 22, width: "87%", alignItems: "center", zIndex: 5 },
  timeBadge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6, borderWidth: 1 },
  timeBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  introTitle: { marginTop: 12, fontSize: 23, lineHeight: 29, fontWeight: "900", textAlign: "center" },
  introSubtitle: { marginTop: 7, fontSize: 12.5, lineHeight: 19, textAlign: "center", maxWidth: 310 },

  letterWrap: { position: "absolute", top: "24%", width: "86%", maxWidth: 370, zIndex: 32 },
  letterWrapCompact: { top: "21%" },
  letterBackplate: { position: "absolute", left: 11, right: 11, top: 14, bottom: -8 },
  letter: { minHeight: 392, paddingHorizontal: 25, paddingTop: 45, paddingBottom: 22, borderWidth: 1, overflow: "hidden" },
  letterCompact: { minHeight: 338, paddingTop: 38, paddingBottom: 16, paddingHorizontal: 22 },
  paperCornerGlow: { position: "absolute", width: 130, height: 130, borderRadius: 999, right: -58, top: -60 },
  paperFloralTop: { position: "absolute", top: 12, alignSelf: "center", width: 34, height: 34, borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  paperFloralBottom: { position: "absolute", right: 14, bottom: 12, opacity: 0.45, transform: [{ rotate: "-18deg" }] },
  letterKicker: { fontSize: 10, fontWeight: "900", letterSpacing: 1.8, textAlign: "center" },
  letterTitle: { marginTop: 6, fontSize: 22, lineHeight: 29, fontWeight: "900", textAlign: "center" },
  letterRule: { alignSelf: "center", width: 44, height: 2, marginVertical: 14, borderRadius: 99 },
  letterBody: { fontSize: 13, lineHeight: 20.5, textAlign: "center" },
  letterRuleSmall: { alignSelf: "center", width: 26, height: 1, marginTop: 15, marginBottom: 9 },
  senderLabel: { fontSize: 9.5, textAlign: "center" },
  sender: { marginTop: 2, fontSize: 14, fontWeight: "900", textAlign: "center" },
  waitedRow: { marginTop: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 15, paddingHorizontal: 10, paddingVertical: 8 },
  waited: { fontSize: 10.5, fontWeight: "700", textAlign: "center", flexShrink: 1 },

  boxScene: { width: 270, height: 238, alignItems: "center", justifyContent: "flex-end", marginTop: 76, zIndex: 21 },
  boxSceneCompact: { marginTop: 62 },
  boxGroundShadow: { position: "absolute", bottom: 4, width: 202, height: 30, borderRadius: 999, backgroundColor: "rgba(0,0,0,0.23)", transform: [{ scaleX: 1.08 }] },
  boxBackGlow: { position: "absolute", bottom: 99, width: 126, height: 62, borderRadius: 999 },
  boxBodyBackLip: { position: "absolute", bottom: 126, width: 202, height: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.16)", zIndex: 17 },
  seamLight: { position: "absolute", bottom: 137, width: 180, height: 5, borderRadius: 999, zIndex: 19 },
  boxBody: { width: 210, height: 134, borderWidth: 1, borderColor: "rgba(255,255,255,0.32)", overflow: "hidden", zIndex: 20 },
  boxFaceHighlight: { position: "absolute", left: 11, top: 10, bottom: 13, width: 24, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.14)" },
  formalHighlight: { backgroundColor: "rgba(240,249,255,0.22)" },
  boxFaceSoftLight: { position: "absolute", left: 38, top: 10, width: 86, height: 18, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  festiveDotRow: { position: "absolute", left: 18, right: 18, top: 31, height: 2, borderRadius: 999, backgroundColor: "rgba(255,244,196,0.25)" },
  boxSideShade: { position: "absolute", right: 0, top: 0, bottom: 0, width: 38 },
  boxBottomShade: { position: "absolute", left: 0, right: 0, bottom: 0, height: 25 },
  verticalRibbon: { position: "absolute", top: 0, bottom: 0, borderLeftWidth: 1, borderRightWidth: 1 },
  ribbonCenterHighlight: { position: "absolute", left: 7, top: 0, bottom: 0, width: 4 },

  lidAssembly: { position: "absolute", top: 37, width: 232, height: 82, alignItems: "center", zIndex: 24 },
  lidUnderside: { position: "absolute", top: 38, width: 218, height: 25, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  lidTop: { width: 232, height: 58, borderWidth: 1, borderColor: "rgba(255,255,255,0.42)", alignItems: "center", justifyContent: "center", overflow: "visible" },
  lidTopHighlight: { position: "absolute", left: 14, right: 14, top: 8, height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.20)" },
  lidTopEdge: { position: "absolute", left: 10, right: 10, bottom: 5, height: 5, borderRadius: 999 },
  lidRibbon: { position: "absolute", top: 0, bottom: 0, borderLeftWidth: 1, borderRightWidth: 1 },
  bow: { position: "absolute", top: -39, width: 126, height: 72, alignItems: "center", justifyContent: "center" },
  bowLoop: { position: "absolute", width: 58, height: 34, borderRadius: 999, borderWidth: 10, backgroundColor: "rgba(255,255,255,0.04)" },
  bowLoopLeft: { left: 4, top: 9, transform: [{ rotate: "-24deg" }] },
  bowLoopRight: { right: 4, top: 9, transform: [{ rotate: "24deg" }] },
  bowTail: { position: "absolute", width: 18, height: 40, borderRadius: 9, borderWidth: 1, top: 31 },
  bowTailLeft: { left: 42, transform: [{ rotate: "18deg" }] },
  bowTailRight: { right: 42, transform: [{ rotate: "-18deg" }] },
  bowKnot: { width: 30, height: 28, borderRadius: 12, borderWidth: 1 },
  seal: { position: "absolute", borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.82)" },

  bottom: { zIndex: 40, paddingHorizontal: 20, paddingTop: 7, alignItems: "center" },
  hint: { minHeight: 34, fontSize: 11.5, lineHeight: 17, textAlign: "center", maxWidth: 350, marginBottom: 9 },
  openButton: { minWidth: 200, height: 54, paddingHorizontal: 26, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, borderWidth: 1 },
  openButtonPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  openButtonDisabled: { opacity: 0.72 },
  openButtonText: { fontSize: 14, fontWeight: "900" },
  actions: { width: "100%", alignItems: "center", gap: 8 },
  replayButton: { minWidth: 196, height: 50, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1 },
  replayText: { fontSize: 13.5, fontWeight: "900" },
  memoryBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 4 },
  memoryText: { fontSize: 10.5, fontWeight: "700" },
});
