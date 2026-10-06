import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { XiangqiColor, XiangqiPieceType } from "./XiangqiPiece";
import type { XiangqiGameState } from "../../games/xiangqi/xiangqiEngine";

export type XiangqiBattleEvent = {
  key: string;
  mine: boolean;
  kind: "capture" | "check" | "checkmate" | "finish";
  title: string;
  subtitle: string;
};

const PIECE_COPY: Record<XiangqiPieceType, string> = {
  general: "Tướng",
  advisor: "Sĩ",
  elephant: "Tượng",
  chariot: "Xe",
  horse: "Mã",
  cannon: "Pháo",
  soldier: "Tốt",
};

function moverColor(state: XiangqiGameState): XiangqiColor {
  return state.turn === "red" ? "black" : "red";
}

export function deriveXiangqiBattleEvent(previous: XiangqiGameState | null, current: XiangqiGameState, myColor: XiangqiColor = "red"): XiangqiBattleEvent | null {
  if (!previous) return null;
  const mover = current.moveNumber > previous.moveNumber ? moverColor(current) : (current.winner === "red" ? "red" : "black");
  const mine = mover === myColor;

  if (current.gameOver && !previous.gameOver) {
    const won = current.winner === myColor;
    const title = current.finishReason === "checkmate"
      ? "CHIẾU BÍ!"
      : current.finishReason === "general_captured"
        ? "BẮT TƯỚNG!"
        : current.finishReason === "timeout"
          ? "HẾT GIỜ!"
          : "VÁN ĐẤU KHÉP LẠI";
    return {
      key: `${current.moveNumber}:${current.finishReason || "finish"}:${current.winner || "none"}`,
      mine,
      kind: current.finishReason === "checkmate" ? "checkmate" : "finish",
      title,
      subtitle: won ? "Một nước quyết định đã mang chiến thắng về phía bạn." : "Bloom Bot vừa khép lại ván đấu. Một ván phục thù vẫn đang chờ.",
    };
  }

  if (current.moveNumber <= previous.moveNumber || !current.lastMove) return null;
  const captured = current.lastMove.capturedId
    ? previous.pieces.find((piece) => piece.id === current.lastMove?.capturedId)
    : null;

  if (current.inCheck) {
    return {
      key: `${current.moveNumber}:check:${current.inCheck}`,
      mine,
      kind: "check",
      title: captured ? "ĂN QUÂN · CHIẾU!" : "CHIẾU TƯỚNG!",
      subtitle: mine ? "Bạn vừa dồn áp lực thẳng vào Tướng đối phương." : "Tướng của bạn đang bị uy hiếp — cần hóa giải ngay.",
    };
  }

  if (captured) {
    return {
      key: `${current.moveNumber}:capture:${captured.id}`,
      mine,
      kind: "capture",
      title: `ĂN ${PIECE_COPY[captured.type].toUpperCase()}!`,
      subtitle: mine ? "Một quân đối phương vừa rời bàn cờ." : "Bloom Bot vừa đổi thế bằng một nước bắt quân.",
    };
  }

  return null;
}

export function XiangqiBattleEffects({ event }: { event: XiangqiBattleEvent | null }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(7)).current;
  const pulse = useRef(new Animated.Value(0.82)).current;
  const [visibleEvent, setVisibleEvent] = useState<XiangqiBattleEvent | null>(null);

  const palette = useMemo(() => {
    if (!visibleEvent) return { bg: "#FFF7F2", border: "#E6C1A4", accent: "#9A623A" };
    if (visibleEvent.kind === "checkmate" || visibleEvent.kind === "check") return { bg: "#FFF0F1", border: "#E7A1A8", accent: "#B74655" };
    if (visibleEvent.kind === "capture") return { bg: "#FFF7E7", border: "#E3C06F", accent: "#966E18" };
    return { bg: "#F8EFF3", border: "#D9BEC9", accent: "#795668" };
  }, [visibleEvent]);

  useEffect(() => {
    opacity.stopAnimation();
    translateY.stopAnimation();
    pulse.stopAnimation();
    if (!event) {
      opacity.setValue(0);
      translateY.setValue(7);
      pulse.setValue(1);
      // Keep the last native banner nodes pooled at opacity 0.
      return;
    }
    setVisibleEvent(event);
    opacity.setValue(0);
    translateY.setValue(7);
    pulse.setValue(0.82);

    if (event.mine || event.kind === "checkmate") {
      const run = event.kind === "checkmate"
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.impactAsync(event.kind === "check" ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Medium);
      void run.catch(() => undefined);
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 125, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 95, useNativeDriver: true }),
      ]),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -3, duration: 130, useNativeDriver: true }),
      ]).start();
    }, event.kind === "checkmate" ? 760 : event.kind === "check" ? 640 : 520);

    return () => {
      clearTimeout(timer);
      opacity.stopAnimation();
      translateY.stopAnimation();
      pulse.stopAnimation();
    };
  }, [event?.key, opacity, pulse, translateY]);

  const displayEvent = visibleEvent;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} collapsable={false}>
      <Animated.View style={[styles.flash, { opacity, backgroundColor: palette.accent, transform: [{ scale: pulse }] }]} />
      <Animated.View style={[styles.banner, { opacity, transform: [{ translateY }, { scale: pulse }], backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Text style={[styles.title, { color: palette.accent }]}>{displayEvent?.title ?? ""}</Text>
        <Text style={styles.subtitle}>{displayEvent?.subtitle ?? ""}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  flash: { position: "absolute", left: "24%", right: "24%", top: "31%", height: 94, borderRadius: 47, opacity: 0.12 },
  banner: { position: "absolute", left: 22, right: 22, top: "37%", borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 15, paddingVertical: 11, alignItems: "center", shadowColor: "#4E2D25", shadowOpacity: 0.14, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  title: { fontSize: 19, lineHeight: 23, fontWeight: "900", letterSpacing: 0.6, textAlign: "center" },
  subtitle: { marginTop: 3, color: "#6E5A54", fontSize: 11.2, lineHeight: 16, fontWeight: "700", textAlign: "center" },
});
