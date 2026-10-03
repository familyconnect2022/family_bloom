import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { ChessColor, ChessGameState } from "../../types/chess";

export type ChessFxMode = "full" | "light" | "off";
type FxIntensity = "subtle" | "active" | "dramatic" | "finale";

export type ChessBattleEvent = {
  key: string;
  kind: "capture" | "major_capture" | "check" | "promotion" | "checkmate" | "timeout" | "resignation" | "draw";
  intensity: FxIntensity;
  title: string;
  subtitle: string;
};

const PIECE_NAMES: Record<string, string> = { p: "Tốt", n: "Mã", b: "Tượng", r: "Xe", q: "Hậu", k: "Vua" };

function fenPieces(fen: string) {
  const out = new Map<string, string>();
  const rows = fen.split(" ")[0].split("/");
  rows.forEach((row, rankIndex) => {
    let file = 0;
    for (const char of row) {
      if (/\d/.test(char)) { file += Number(char); continue; }
      out.set(`${"abcdefgh"[file]}${8 - rankIndex}`, char.toLowerCase());
      file += 1;
    }
  });
  return out;
}

function pick<T>(items: T[], seed: number) { return items[Math.abs(seed) % items.length]; }

function moveActorIsMe(state: ChessGameState, myColor: ChessColor) {
  const mover: ChessColor = state.turn === "w" ? "b" : "w";
  return mover === myColor;
}

export function deriveChessBattleEvent(previous: ChessGameState | null, current: ChessGameState, myColor: ChessColor): ChessBattleEvent | null {
  if (!previous || previous.gameId !== current.gameId || current.revision <= previous.revision) return null;
  const mine = moveActorIsMe(current, myColor);
  const moveAdvanced = current.ply > previous.ply;
  const seed = current.revision + current.ply;

  if (current.status === "finished") {
    if (current.finishReason === "checkmate") {
      return {
        key: `${current.gameId}:${current.revision}:mate`, kind: "checkmate", intensity: "finale", title: "CHIẾU HẾT.",
        subtitle: mine ? pick(["Một đòn quyết định — bạn khép lại ván đấu.", "Vua đã hết đường lui. Ván cờ thuộc về bạn."], seed) : pick(["Một đòn quyết định vừa khép lại ván đấu.", "Vua không còn đường lui. Hẹn một ván phục thù nhé."], seed),
      };
    }
    if (current.finishReason === "timeout") {
      const won = (current.result === "white" && myColor === "w") || (current.result === "black" && myColor === "b");
      return { key: `${current.gameId}:${current.revision}:timeout`, kind: "timeout", intensity: "finale", title: "HẾT GIỜ.", subtitle: won ? "Thời gian đã nghiêng ván đấu về phía bạn." : "Đồng hồ đã quyết định ván đấu." };
    }
    if (current.finishReason === "resignation") {
      const won = (current.result === "white" && myColor === "w") || (current.result === "black" && myColor === "b");
      return { key: `${current.gameId}:${current.revision}:resign`, kind: "resignation", intensity: "dramatic", title: "VÁN ĐẤU KHÉP LẠI.", subtitle: won ? "Đối thủ đã dừng cuộc chiến tại đây." : "Bạn đã dừng ván cờ. Một ván khác vẫn đang chờ." };
    }
    return { key: `${current.gameId}:${current.revision}:draw`, kind: "draw", intensity: "dramatic", title: "BẤT PHÂN THẮNG BẠI.", subtitle: pick(["Không ai chịu lùi bước.", "Một ván cờ cân bằng đến phút cuối."], seed) };
  }

  if (!moveAdvanced || !current.lastMove) return null;
  const san = current.lastMove.san;
  const promoted = !!current.lastMove.promotion || san.includes("=");
  const checking = !!current.checkSquare || /[+#]$/.test(san);
  const captured = san.includes("x");

  if (promoted) {
    const promotedPiece = current.lastMove.promotion ? PIECE_NAMES[current.lastMove.promotion] : "Hậu";
    return {
      key: `${current.gameId}:${current.revision}:promotion`, kind: "promotion", intensity: checking ? "finale" : "dramatic",
      title: `PHONG ${promotedPiece.toUpperCase()}!`,
      subtitle: checking ? "Một quân Tốt vừa lột xác — và Vua đang chịu áp lực." : pick(["Một quân Tốt đã đi đến tận cùng.", "Thế cờ vừa đổi khác hoàn toàn."], seed),
    };
  }

  if (checking) {
    return {
      key: `${current.gameId}:${current.revision}:check`, kind: "check", intensity: "dramatic", title: captured ? "ĂN QUÂN · CHIẾU!" : "CHIẾU!",
      subtitle: captured
        ? (mine ? "Một quân đã rời bàn — và Vua đối thủ đang chịu áp lực." : "Một quân của bạn vừa rời bàn — Vua cũng đang bị uy hiếp.")
        : mine ? pick(["Bạn vừa đặt Vua đối thủ dưới áp lực.", "Không còn chỗ cho một nước đi hời hợt."], seed) : pick(["Vua của bạn đang bị uy hiếp.", "Áp lực đang dồn về phía Vua."], seed),
    };
  }

  if (captured) {
    const target = fenPieces(previous.fen).get(current.lastMove.to) || "p";
    const major = target === "q" || target === "r";
    const pieceName = PIECE_NAMES[target] || "quân";
    return {
      key: `${current.gameId}:${current.revision}:capture`, kind: major ? "major_capture" : "capture", intensity: major ? "active" : "subtle",
      title: major ? "MỘT ĐÒN NẶNG!" : "ĂN QUÂN!",
      subtitle: major ? `${pieceName} đã rời bàn. Thế cân bằng vừa rung chuyển.` : mine ? pick(["Bạn vừa giành thêm không gian trên bàn cờ.", "Thế trận bắt đầu nóng lên."], seed) : pick(["Một quân của bạn vừa rời bàn.", "Thế trận bắt đầu nóng lên."], seed),
    };
  }

  return null;
}

export function ChessBattleEffects({ event, mode = "full" }: { event: ChessBattleEvent | null; mode?: ChessFxMode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [visibleEvent, setVisibleEvent] = useState<ChessBattleEvent | null>(null);

  const palette = useMemo(() => {
    if (!visibleEvent) return { bg: "#FFF7FA", border: "#E9C8D5", accent: "#A64E6E" };
    if (visibleEvent.kind === "checkmate" || visibleEvent.kind === "check") return { bg: "#FFF0F1", border: "#E8A2A8", accent: "#B94D59" };
    if (visibleEvent.kind === "promotion") return { bg: "#FFF9E9", border: "#E7C876", accent: "#9A741E" };
    if (visibleEvent.kind === "major_capture") return { bg: "#FFF3E9", border: "#E2B88D", accent: "#9A623A" };
    return { bg: "#FFF7FA", border: "#E9C8D5", accent: "#A64E6E" };
  }, [visibleEvent]);

  useEffect(() => {
    if (!event || mode === "off") { setVisibleEvent(null); return; }
    setVisibleEvent(event);
    opacity.stopAnimation(); scale.stopAnimation(); translateY.stopAnimation(); glow.stopAnimation();
    opacity.setValue(0); scale.setValue(mode === "light" ? 0.96 : 0.78); translateY.setValue(mode === "light" ? 3 : 13); glow.setValue(0);

    if (mode === "full") {
      const feedback = event.intensity === "finale" ? Haptics.NotificationFeedbackType.Success : null;
      if (feedback) void Haptics.notificationAsync(feedback).catch(() => undefined);
      else void Haptics.impactAsync(event.intensity === "dramatic" ? Haptics.ImpactFeedbackStyle.Heavy : event.intensity === "active" ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, speed: 15, bounciness: mode === "light" ? 3 : 11, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 18, bounciness: 5, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: event.intensity === "finale" ? 900 : 520, useNativeDriver: true }),
      ]),
    ]).start();

    const hold = event.intensity === "finale" ? 1750 : event.intensity === "dramatic" ? 1100 : event.intensity === "active" ? 780 : 620;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration: 180, useNativeDriver: true }),
      ]).start(() => setVisibleEvent(null));
    }, hold);
    return () => clearTimeout(timer);
  }, [event?.key, glow, mode, opacity, scale, translateY]);

  if (!visibleEvent || mode === "off") return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.glow, { opacity: glow, backgroundColor: palette.accent }]} />
      <Animated.View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border, opacity, transform: [{ translateY }, { scale }] }]}>
        <Text style={[styles.title, { color: palette.accent }]}>{visibleEvent.title}</Text>
        <Text style={styles.subtitle}>{visibleEvent.subtitle}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", left: "18%", right: "18%", top: "30%", height: 120, borderRadius: 60, opacity: 0.12 },
  banner: { position: "absolute", left: 18, right: 18, top: "36%", borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center", shadowColor: "#331B25", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  title: { fontSize: 20, lineHeight: 24, fontWeight: "900", letterSpacing: 0.7, textAlign: "center" },
  subtitle: { marginTop: 4, color: "#6F5962", fontSize: 11.5, lineHeight: 17, fontWeight: "700", textAlign: "center" },
});
