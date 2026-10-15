import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useXiangqiRealtime } from "../../context/XiangqiRealtimeContext";
import {
  finishXiangqiChallengeMini,
  getXiangqiChallengeMiniPosition,
  setXiangqiChallengeMiniPosition,
  useXiangqiChallengeMiniState,
} from "../../services/xiangqi/xiangqiChallengeMiniStore";

const WIDTH = 122;
const HEIGHT = 46;
const EDGE = 7;
const BOTTOM_TRACK = 58;

export const XiangqiChallengeMiniHost = React.memo(function XiangqiChallengeMiniHost({ occluded = false }: { occluded?: boolean }) {
  const router = useRouter();
  const realtime = useXiangqiRealtime();
  const mini = useXiangqiChallengeMiniState();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [, tick] = useState(0);

  useEffect(() => {
    if (!mini) return;
    if (realtime.activeGameId || realtime.outgoingChallengeTerminal?.inviteId === mini.inviteId) {
      finishXiangqiChallengeMini(mini.inviteId);
      return;
    }
    if (realtime.outgoingInvite?.inviteId !== mini.inviteId) finishXiangqiChallengeMini(mini.inviteId);
  }, [mini, realtime.activeGameId, realtime.outgoingChallengeTerminal?.inviteId, realtime.outgoingInvite?.inviteId]);

  const actuallyVisible = !!mini && mini.visible && !occluded;
  useEffect(() => {
    if (!actuallyVisible) return undefined;
    const timer = setInterval(() => tick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [actuallyVisible]);

  const saved = getXiangqiChallengeMiniPosition();
  const maxX = Math.max(EDGE, width - WIDTH - EDGE);
  const minY = Math.max(EDGE, insets.top + 6);
  const maxY = Math.max(minY, height - insets.bottom - BOTTOM_TRACK - HEIGHT - 8);
  const x = useSharedValue(Math.max(EDGE, Math.min(maxX, saved?.x ?? maxX)));
  const y = useSharedValue(Math.max(minY, Math.min(maxY, saved?.y ?? Math.round(height * 0.5))));
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const progress = useSharedValue(actuallyVisible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(actuallyVisible ? 1 : 0, { duration: actuallyVisible ? 90 : 55 });
  }, [actuallyVisible, progress]);

  const openRoom = useCallback(() => {
    if (!mini) return;
    router.navigate({ pathname: "/(xiangqi)/xiangqi-challenge/[inviteId]", params: { inviteId: mini.inviteId } } as never);
  }, [mini, router]);

  const gesture = useMemo(() => Gesture.Race(
    Gesture.Pan()
      .minDistance(6)
      .onStart(() => { startX.value = x.value; startY.value = y.value; })
      .onUpdate((event) => {
        x.value = Math.max(EDGE, Math.min(maxX, startX.value + event.translationX));
        y.value = Math.max(minY, Math.min(maxY, startY.value + event.translationY));
      })
      .onEnd(() => {
        const targetX = x.value + WIDTH / 2 < width / 2 ? EDGE : maxX;
        const targetY = Math.max(minY, Math.min(maxY, y.value));
        x.value = withTiming(targetX, { duration: 105 });
        y.value = withTiming(targetY, { duration: 80 });
        runOnJS(setXiangqiChallengeMiniPosition)({ x: targetX, y: targetY });
      }),
    Gesture.Tap().maxDistance(6).onEnd((_event, success) => { if (success) runOnJS(openRoom)(); }),
  ), [maxX, maxY, minY, openRoom, startX, startY, width, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: Math.max(0.001, progress.value) }],
  }));

  if (!mini) return null;
  const remaining = Math.max(0, mini.expiresAt - Date.now());
  const seconds = Math.ceil(remaining / 1000);
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View pointerEvents={actuallyVisible ? "auto" : "none"} style={[styles.shell, style]}>
        <View style={styles.card} accessibilityRole="button" accessibilityLabel="Mở lại phòng chờ Cờ tướng">
          <View style={styles.icon}><Ionicons name="hourglass-outline" size={18} color="#FFF" /></View>
          <View style={styles.copy}>
            <Text numberOfLines={1} style={styles.name}>{mini.opponentName}</Text>
            <Text style={styles.clock}>Chờ · {clock}</Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
});

const styles = StyleSheet.create({
  shell: { position: "absolute", left: 0, top: 0, width: WIDTH, height: HEIGHT, zIndex: 11110, elevation: 19 },
  card: { width: WIDTH, height: HEIGHT, borderRadius: 15, backgroundColor: "#8C4A2F", flexDirection: "row", alignItems: "center", paddingHorizontal: 7, gap: 7, shadowColor: "#5A2E20", shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 4 } },
  icon: { width: 28, height: 28, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.16)" },
  copy: { flex: 1, minWidth: 0 },
  name: { color: "#FFF", fontSize: 10.5, fontWeight: "900" },
  clock: { marginTop: 2, color: "rgba(255,255,255,0.82)", fontSize: 9.5, fontWeight: "800", fontVariant: ["tabular-nums"] },
});
