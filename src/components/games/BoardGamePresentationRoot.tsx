import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../constants/theme";
import { attachBoardGamePresentationBridge } from "../../services/games/boardGamePresentationBridge";
import {
  closeBoardGamePresentation,
  minimizeBoardGamePresentation,
  restoreBoardGamePresentation,
  useBoardGamePresentationSnapshot,
  type BoardGamePresentationKind,
} from "../../services/games/boardGamePresentationStore";

const MINI_WIDTH = 118;
const MINI_HEIGHT = 72;
const EDGE_GAP = 10;
const MOTION_MS = 260;
const MOTION = Easing.out(Easing.cubic);
const CHESS_DEEP_PINK = "#D94F87";
const XIANGQI_DEEP_GOLD = "#D3A11F";

function kindTitle(kind: BoardGamePresentationKind | null) {
  if (kind === "chess") return "Cờ vua";
  if (kind === "xiangqi") return "Cờ tướng";
  return "";
}

export function BoardGamePresentationRoot() {
  const presentation = useBoardGamePresentationSnapshot();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // One process/root-level bridge. It is mounted for the same lifetime as the
  // persistent Full + Mini shells, so a server-confirmed game can always bring
  // the correct surface on-screen regardless of the current route.
  useEffect(() => attachBoardGamePresentationBridge(), []);

  const fullWidth = Math.round(width * 0.85);
  const fullHeight = Math.round(height * 0.85);
  const fullLeft = Math.round((width - fullWidth) / 2);
  const fullTop = Math.round((height - fullHeight) / 2);
  const hiddenFullX = width + fullWidth + 48;
  const hiddenMiniX = width + MINI_WIDTH + 36;

  const minMiniY = Math.max(insets.top + EDGE_GAP, EDGE_GAP);
  const maxMiniY = Math.max(minMiniY, height - insets.bottom - MINI_HEIGHT - EDGE_GAP);
  const leftDockX = EDGE_GAP;
  const rightDockX = Math.max(leftDockX, width - MINI_WIDTH - EDGE_GAP);

  const fullX = useSharedValue(hiddenFullX);
  const fullScale = useSharedValue(0.94);
  const fullOpacity = useSharedValue(0);

  const initialY = Math.min(maxMiniY, Math.max(minMiniY, Math.round(height * 0.64)));
  const miniX = useSharedValue(hiddenMiniX);
  const miniY = useSharedValue(initialY);
  const miniScale = useSharedValue(0.9);
  const miniOpacity = useSharedValue(0);
  const miniDockX = useSharedValue(rightDockX);
  const miniDockY = useSharedValue(initialY);
  const panStartX = useSharedValue(rightDockX);
  const panStartY = useSharedValue(initialY);

  useEffect(() => {
    const clampedY = Math.min(maxMiniY, Math.max(minMiniY, miniDockY.value));
    miniDockY.value = clampedY;
    miniDockX.value = miniDockX.value <= width / 2 ? leftDockX : rightDockX;

    if (presentation.mode === "full") {
      fullX.value = withTiming(0, { duration: MOTION_MS, easing: MOTION });
      fullScale.value = withTiming(1, { duration: MOTION_MS, easing: MOTION });
      fullOpacity.value = withTiming(1, { duration: 180, easing: MOTION });

      miniX.value = withTiming(hiddenMiniX, { duration: MOTION_MS, easing: MOTION });
      miniY.value = withTiming(clampedY, { duration: MOTION_MS, easing: MOTION });
      miniScale.value = withTiming(0.9, { duration: MOTION_MS, easing: MOTION });
      miniOpacity.value = withTiming(0, { duration: 140, easing: MOTION });
      return;
    }

    if (presentation.mode === "mini") {
      fullX.value = withTiming(hiddenFullX, { duration: MOTION_MS, easing: MOTION });
      fullScale.value = withTiming(0.84, { duration: MOTION_MS, easing: MOTION });
      fullOpacity.value = withTiming(0, { duration: 150, easing: MOTION });

      miniX.value = withTiming(miniDockX.value, { duration: MOTION_MS, easing: MOTION });
      miniY.value = withTiming(clampedY, { duration: MOTION_MS, easing: MOTION });
      miniScale.value = withTiming(1, { duration: MOTION_MS, easing: MOTION });
      miniOpacity.value = withTiming(1, { duration: 180, easing: MOTION });
      return;
    }

    fullX.value = withTiming(hiddenFullX, { duration: MOTION_MS, easing: MOTION });
    fullScale.value = withTiming(0.94, { duration: MOTION_MS, easing: MOTION });
    fullOpacity.value = withTiming(0, { duration: 130, easing: MOTION });
    miniX.value = withTiming(hiddenMiniX, { duration: MOTION_MS, easing: MOTION });
    miniY.value = withTiming(clampedY, { duration: MOTION_MS, easing: MOTION });
    miniScale.value = withTiming(0.9, { duration: MOTION_MS, easing: MOTION });
    miniOpacity.value = withTiming(0, { duration: 130, easing: MOTION });
  }, [
    fullOpacity,
    fullScale,
    fullX,
    hiddenFullX,
    hiddenMiniX,
    leftDockX,
    maxMiniY,
    minMiniY,
    miniDockX,
    miniDockY,
    miniOpacity,
    miniScale,
    miniX,
    miniY,
    presentation.mode,
    rightDockX,
    width,
  ]);

  const fullAnimatedStyle = useAnimatedStyle(() => ({
    opacity: fullOpacity.value,
    transform: [{ translateX: fullX.value }, { scale: fullScale.value }],
  }));

  const miniAnimatedStyle = useAnimatedStyle(() => ({
    opacity: miniOpacity.value,
    transform: [
      { translateX: miniX.value },
      { translateY: miniY.value },
      { scale: miniScale.value },
    ],
  }));

  const miniGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .enabled(presentation.mode === "mini")
      .onBegin(() => {
        panStartX.value = miniX.value;
        panStartY.value = miniY.value;
      })
      .onUpdate((event) => {
        const nextX = panStartX.value + event.translationX;
        const nextY = panStartY.value + event.translationY;
        miniX.value = Math.min(rightDockX, Math.max(leftDockX, nextX));
        miniY.value = Math.min(maxMiniY, Math.max(minMiniY, nextY));
      })
      .onEnd(() => {
        const snapX = miniX.value + MINI_WIDTH / 2 < width / 2 ? leftDockX : rightDockX;
        const snapY = Math.min(maxMiniY, Math.max(minMiniY, miniY.value));
        miniDockX.value = snapX;
        miniDockY.value = snapY;
        miniX.value = withTiming(snapX, { duration: 180, easing: MOTION });
        miniY.value = withTiming(snapY, { duration: 160, easing: MOTION });
      });

    const tap = Gesture.Tap()
      .enabled(presentation.mode === "mini")
      .maxDistance(10)
      .onEnd((_event, success) => {
        if (success) runOnJS(restoreBoardGamePresentation)();
      });

    return Gesture.Exclusive(pan, tap);
  }, [
    leftDockX,
    maxMiniY,
    minMiniY,
    miniDockX,
    miniDockY,
    miniX,
    miniY,
    panStartX,
    panStartY,
    presentation.mode,
    rightDockX,
    width,
  ]);

  const fullInteractive = presentation.mode === "full" && presentation.fullContent !== null;
  const miniInteractive = presentation.mode === "mini" && presentation.miniContent !== null;
  const chessActive = presentation.fullContent === "chess";
  const xiangqiActive = presentation.fullContent === "xiangqi";

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View
        pointerEvents={fullInteractive ? "auto" : "none"}
        style={[
          styles.fullSurface,
          { left: fullLeft, top: fullTop, width: fullWidth, height: fullHeight },
          fullAnimatedStyle,
        ]}
      >
        {/* Both views are permanent, absolute, centered, and exactly 90% of
            the Full Surface. Selecting a game only changes stacking/visibility. */}
        <View
          pointerEvents={chessActive ? "auto" : "none"}
          style={[styles.gameLayer, styles.chessLayer, chessActive ? styles.gameLayerActive : styles.gameLayerInactive]}
        >
          <View style={styles.layerBadge}>
            <Ionicons name="grid-outline" size={19} color="#FFFFFF" />
            <Text style={styles.layerBadgeText}>CHESS</Text>
          </View>
          <View style={styles.layerCenter}>
            <Text style={styles.chessTitle}>Cờ vua</Text>
            <Text style={styles.chessSubtitle}>Chess view · 90% Surface</Text>
          </View>
        </View>

        <View
          pointerEvents={xiangqiActive ? "auto" : "none"}
          style={[styles.gameLayer, styles.xiangqiLayer, xiangqiActive ? styles.gameLayerActive : styles.gameLayerInactive]}
        >
          <View style={styles.layerBadgeDark}>
            <Ionicons name="apps-outline" size={19} color="#4C3610" />
            <Text style={styles.layerBadgeTextDark}>XIANGQI</Text>
          </View>
          <View style={styles.layerCenter}>
            <Text style={styles.xiangqiTitle}>Cờ tướng</Text>
            <Text style={styles.xiangqiSubtitle}>Xiangqi view · 90% Surface</Text>
          </View>
        </View>

        {presentation.fullContent ? (
          <View pointerEvents="box-none" style={styles.fullChrome}>
            <View style={styles.fullGameLabel} pointerEvents="none">
              <Text style={styles.fullGameLabelText}>{kindTitle(presentation.fullContent)}</Text>
              {presentation.activeGameId ? (
                <Text numberOfLines={1} style={styles.fullGameId}>game · {presentation.activeGameId}</Text>
              ) : null}
            </View>
            <View style={styles.fullActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Thu nhỏ"
                onPress={minimizeBoardGamePresentation}
                style={({ pressed }) => [styles.roundAction, pressed && styles.pressed]}
              >
                <Ionicons name="contract-outline" size={20} color={COLORS.primaryText} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                onPress={closeBoardGamePresentation}
                style={({ pressed }) => [styles.roundAction, pressed && styles.pressed]}
              >
                <Ionicons name="close" size={21} color={COLORS.primaryText} />
              </Pressable>
            </View>
          </View>
        ) : null}
      </Animated.View>

      <GestureDetector gesture={miniGesture}>
        <Animated.View
          pointerEvents={miniInteractive ? "auto" : "none"}
          style={[
            styles.mini,
            presentation.miniContent === "xiangqi" ? styles.miniXiangqi : styles.miniChess,
            miniAnimatedStyle,
          ]}
        >
          {presentation.miniContent ? (
            <>
              <View style={styles.miniIcon}>
                <Ionicons name="move-outline" size={17} color={COLORS.primaryText} />
              </View>
              <View style={styles.miniCopy}>
                <Text style={styles.miniTitle}>{kindTitle(presentation.miniContent)}</Text>
                <Text style={styles.miniHint}>Chạm để mở</Text>
              </View>
            </>
          ) : null}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  fullSurface: {
    position: "absolute",
    borderRadius: 30,
    backgroundColor: "#F8EDF1",
    borderWidth: 1,
    borderColor: "#E6D4DB",
    shadowColor: "#4D303B",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 18,
    overflow: "hidden",
  },
  gameLayer: {
    position: "absolute",
    left: "5%",
    top: "5%",
    width: "90%",
    height: "90%",
    borderRadius: 26,
    padding: 18,
    overflow: "hidden",
  },
  chessLayer: {
    backgroundColor: CHESS_DEEP_PINK,
  },
  xiangqiLayer: {
    backgroundColor: XIANGQI_DEEP_GOLD,
  },
  gameLayerActive: {
    opacity: 1,
    zIndex: 2,
    elevation: 2,
  },
  gameLayerInactive: {
    opacity: 0,
    zIndex: 1,
    elevation: 1,
  },
  layerBadge: {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  layerBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "900",
  },
  layerBadgeDark: {
    alignSelf: "flex-start",
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  layerBadgeTextDark: {
    color: "#4C3610",
    fontSize: 11,
    letterSpacing: 0.9,
    fontWeight: "900",
  },
  layerCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chessTitle: {
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "900",
  },
  chessSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.78)",
    fontSize: 12.5,
    fontWeight: "800",
  },
  xiangqiTitle: {
    color: "#3F2D0C",
    fontSize: 36,
    fontWeight: "900",
  },
  xiangqiSubtitle: {
    marginTop: 8,
    color: "rgba(63,45,12,0.72)",
    fontSize: 12.5,
    fontWeight: "800",
  },
  fullChrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    elevation: 20,
  },
  fullGameLabel: {
    position: "absolute",
    left: 8,
    bottom: 8,
    maxWidth: "60%",
    minHeight: 42,
    borderRadius: 17,
    paddingHorizontal: 12,
    paddingVertical: 7,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.90)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  fullGameLabelText: {
    color: COLORS.primaryText,
    fontSize: 11.5,
    fontWeight: "900",
  },
  fullGameId: {
    marginTop: 1,
    color: COLORS.secondaryText,
    fontSize: 8.5,
    fontWeight: "700",
  },
  fullActions: {
    position: "absolute",
    right: 8,
    top: 8,
    flexDirection: "row",
    gap: 8,
  },
  roundAction: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.91)",
    borderWidth: 1,
    borderColor: "rgba(80,55,65,0.10)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  pressed: {
    opacity: 0.7,
  },
  mini: {
    position: "absolute",
    left: 0,
    top: 0,
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    borderRadius: 23,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.34)",
    shadowColor: "#49323A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 14,
  },
  miniChess: {
    backgroundColor: CHESS_DEEP_PINK,
  },
  miniXiangqi: {
    backgroundColor: XIANGQI_DEEP_GOLD,
  },
  miniIcon: {
    width: 31,
    height: 31,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  miniCopy: {
    flex: 1,
    minWidth: 0,
  },
  miniTitle: {
    color: COLORS.primaryText,
    fontSize: 12,
    fontWeight: "900",
  },
  miniHint: {
    marginTop: 2,
    color: COLORS.primaryText,
    opacity: 0.72,
    fontSize: 8.5,
    fontWeight: "700",
  },
});
