import * as Haptics from "expo-haptics";
import { Chess } from "chess.js";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import type { ChessColor, ChessGameState } from "../../types/chess";

export type ChessFxMode = "full" | "light" | "off";
type FxIntensity = "subtle" | "active" | "dramatic" | "finale";

export type ChessBattleEvent = {
  key: string;
  revision: number;
  mine: boolean;
  kind: "capture" | "major_capture" | "check" | "promotion" | "checkmate" | "timeout" | "resignation" | "draw";
  intensity: FxIntensity;
  title: string;
  subtitle: string;
};

const PIECE_NAMES: Record<string, string> = { p: "Tốt", n: "Mã", b: "Tượng", r: "Xe", q: "Hậu", k: "Vua" };
const PIECE_VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const CAPTURE_PIECES = ["p", "n", "b", "r", "q"] as const;

function captureSummaryDelta(previous: ChessGameState, current: ChessGameState, mover: ChessColor) {
  const before = mover === "w" ? previous.captureSummary?.byWhite : previous.captureSummary?.byBlack;
  const after = mover === "w" ? current.captureSummary?.byWhite : current.captureSummary?.byBlack;
  if (!before || !after) return null;
  return CAPTURE_PIECES.find((piece) => (after[piece] || 0) > (before[piece] || 0)) || null;
}

function canImmediatelyRecapture(fen: string, square: string) {
  try {
    const chess = new Chess(fen);
    return chess.moves({ verbose: true }).some((move) => move.to === square && !!move.captured);
  } catch {
    return false;
  }
}

/**
 * Capture FX is intentionally conservative. A capture should feel special only when it creates a
 * real material swing, not merely because a piece disappeared. We estimate the immediate exchange:
 * captured value minus the capturing piece if the opponent can legally recapture on that square.
 * This is deliberately cheaper than engine evaluation and stays off the move/input hot path.
 */
function materialSwingForCapture(previous: ChessGameState, current: ChessGameState) {
  if (!current.lastMove) return null;
  const mover: ChessColor = current.turn === "w" ? "b" : "w";
  const capturedPiece = captureSummaryDelta(previous, current, mover)
    || fenPieces(previous.fen).get(current.lastMove.to)
    || null;
  if (!capturedPiece || capturedPiece === "k") return null;

  // Pawn captures are common board texture, not battle moments. Check/promotion are handled earlier.
  if (capturedPiece === "p") return { capturedPiece, moverPiece: null, recapturable: false, netGain: 1, show: false };

  const moverPiece = fenPieces(current.fen).get(current.lastMove.to) || fenPieces(previous.fen).get(current.lastMove.from) || null;
  const recapturable = canImmediatelyRecapture(current.fen, current.lastMove.to);
  const capturedValue = PIECE_VALUES[capturedPiece] || 0;
  const moverValue = moverPiece ? (PIECE_VALUES[moverPiece] || 0) : 0;
  const netGain = capturedValue - (recapturable ? moverValue : 0);

  // <= +1 is normal exchange/noise. +2 or more is a meaningful tactical material gain.
  return { capturedPiece, moverPiece, recapturable, netGain, show: netGain >= 2 };
}

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
  const moveAdvanced = current.ply === previous.ply + 1;
  const seed = current.revision + current.ply;

  if (current.status === "finished") {
    if (current.finishReason === "checkmate") {
      return {
        key: `${current.gameId}:${current.revision}:mate`, revision: current.revision, mine, kind: "checkmate", intensity: "finale", title: "CHIẾU HẾT.",
        subtitle: mine ? pick(["Một đòn quyết định — bạn khép lại ván đấu.", "Vua đã hết đường lui. Ván cờ thuộc về bạn."], seed) : pick(["Một đòn quyết định vừa khép lại ván đấu.", "Vua không còn đường lui. Hẹn một ván phục thù nhé."], seed),
      };
    }
    if (current.finishReason === "timeout" || current.finishReason === "away_timeout") {
      const won = (current.result === "white" && myColor === "w") || (current.result === "black" && myColor === "b");
      const away = current.finishReason === "away_timeout";
      return {
        key: `${current.gameId}:${current.revision}:${away ? "away-timeout" : "timeout"}`,
        revision: current.revision,
        mine,
        kind: "timeout",
        intensity: "finale",
        title: "HẾT GIỜ.",
        subtitle: away
          ? (won ? "Đối thủ đã rời bàn quá lâu — chiến thắng thuộc về bạn." : "Bạn đã rời bàn quá nửa quỹ thời gian cho phép.")
          : (won ? "Thời gian đã nghiêng ván đấu về phía bạn." : "Đồng hồ đã quyết định ván đấu."),
      };
    }
    if (current.finishReason === "resignation") {
      const won = (current.result === "white" && myColor === "w") || (current.result === "black" && myColor === "b");
      return { key: `${current.gameId}:${current.revision}:resign`, revision: current.revision, mine, kind: "resignation", intensity: "dramatic", title: "VÁN ĐẤU KHÉP LẠI.", subtitle: won ? "Đối thủ đã dừng cuộc chiến tại đây." : "Bạn đã dừng ván cờ. Một ván khác vẫn đang chờ." };
    }
    return { key: `${current.gameId}:${current.revision}:draw`, revision: current.revision, mine, kind: "draw", intensity: "dramatic", title: "BẤT PHÂN THẮNG BẠI.", subtitle: pick(["Không ai chịu lùi bước.", "Một ván cờ cân bằng đến phút cuối."], seed) };
  }

  if (!moveAdvanced || !current.lastMove) return null;
  const san = current.lastMove.san;
  const promoted = !!current.lastMove.promotion || san.includes("=");
  const checking = !!current.checkSquare || /[+#]$/.test(san);
  const captured = san.includes("x");

  if (promoted) {
    const promotedPiece = current.lastMove.promotion ? PIECE_NAMES[current.lastMove.promotion] : "Hậu";
    return {
      key: `${current.gameId}:${current.revision}:promotion`, revision: current.revision, mine, kind: "promotion", intensity: checking ? "finale" : "dramatic",
      title: `PHONG ${promotedPiece.toUpperCase()}!`,
      subtitle: checking ? "Một quân Tốt vừa lột xác — và Vua đang chịu áp lực." : pick(["Một quân Tốt đã đi đến tận cùng.", "Thế cờ vừa đổi khác hoàn toàn."], seed),
    };
  }

  if (checking) {
    return {
      key: `${current.gameId}:${current.revision}:check`, revision: current.revision, mine, kind: "check", intensity: "dramatic", title: captured ? "ĂN QUÂN · CHIẾU!" : "CHIẾU!",
      subtitle: captured
        ? (mine ? "Một quân đã rời bàn — và Vua đối thủ đang chịu áp lực." : "Một quân của bạn vừa rời bàn — Vua cũng đang bị uy hiếp.")
        : mine ? pick(["Bạn vừa đặt Vua đối thủ dưới áp lực.", "Không còn chỗ cho một nước đi hời hợt."], seed) : pick(["Vua của bạn đang bị uy hiếp.", "Áp lực đang dồn về phía Vua."], seed),
    };
  }

  if (captured) {
    const swing = materialSwingForCapture(previous, current);
    if (!swing?.show) return null;

    const pieceName = PIECE_NAMES[swing.capturedPiece] || "quân";
    const gainCopy = swing.netGain >= 4 ? "Lợi thế vật chất tăng mạnh." : "Pha đổi quân nghiêng về một phía.";
    return {
      key: `${current.gameId}:${current.revision}:material-swing`, revision: current.revision, mine, kind: "major_capture", intensity: swing.netGain >= 4 ? "dramatic" : "active",
      title: "ĐỘT BIẾN!",
      subtitle: swing.recapturable
        ? `${pieceName} rời bàn — đổi quân có lợi khoảng +${swing.netGain}.`
        : `${pieceName} rời bàn mà chưa có đòn bắt lại ngay. ${gainCopy}`,
    };
  }

  return null;
}

export function ChessBattleEffects({ event, mode = "full", onComplete }: { event: ChessBattleEvent | null; mode?: ChessFxMode; onComplete?: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;
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
    opacity.stopAnimation();
    translateY.stopAnimation();
    glow.stopAnimation();

    if (!event || mode === "off") {
      opacity.setValue(0);
      translateY.setValue(6);
      glow.setValue(0);
      // Keep the last banner content in the native tree at opacity 0. Reusing
      // the same nodes avoids a mount burst on the next tactical FX.
      return;
    }

    setVisibleEvent(event);
    opacity.setValue(0);
    translateY.setValue(mode === "light" ? 2 : 6);
    glow.setValue(0);

    // Haptics are intentionally reserved for the local player's own decisive events. Opponent/bot
    // state bursts no longer trigger repeated native feedback while the next piece is already moving.
    if (mode === "full" && (event.mine || event.intensity === "finale")) {
      const feedback = event.intensity === "finale" ? Haptics.NotificationFeedbackType.Success : null;
      if (feedback) void Haptics.notificationAsync(feedback).catch(() => undefined);
      else void Haptics.impactAsync(
        event.intensity === "dramatic" ? Haptics.ImpactFeedbackStyle.Heavy
          : event.intensity === "active" ? Haptics.ImpactFeedbackStyle.Medium
            : Haptics.ImpactFeedbackStyle.Light,
      ).catch(() => undefined);
    }

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 105, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 125, useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(glow, { toValue: mode === "light" ? 0.22 : 0.42, duration: 120, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: event.intensity === "finale" ? 560 : event.intensity === "dramatic" ? 430 : 320, useNativeDriver: true }),
      ]),
    ]).start();

    // Keep FX short enough to finish before a normal reply. If a new move begins sooner, the parent
    // passes event=null and this effect is cancelled immediately instead of overlapping board motion.
    const hold = event.intensity === "finale" ? 900 : event.intensity === "dramatic" ? 700 : event.intensity === "active" ? 590 : 480;
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 115, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -2, duration: 115, useNativeDriver: true }),
      ]).start(() => {
        onComplete?.();
      });
    }, hold);

    return () => {
      clearTimeout(timer);
      opacity.stopAnimation();
      translateY.stopAnimation();
      glow.stopAnimation();
    };
  }, [event?.key, glow, mode, onComplete, opacity, translateY]);

  if (mode === "off") return null;
  const displayEvent = visibleEvent;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} collapsable={false}>
      <Animated.View style={[styles.glow, { opacity: glow, backgroundColor: palette.accent }]} />
      <Animated.View style={[styles.banner, { backgroundColor: palette.bg, borderColor: palette.border, opacity, transform: [{ translateY }] }]}> 
        <Text style={[styles.title, { color: palette.accent }]}>{displayEvent?.title ?? ""}</Text>
        <Text style={styles.subtitle}>{displayEvent?.subtitle ?? ""}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  glow: { position: "absolute", left: "22%", right: "22%", top: "31%", height: 96, borderRadius: 48, opacity: 0.1 },
  banner: { position: "absolute", left: 18, right: 18, top: "36%", borderRadius: 20, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 12, alignItems: "center", shadowColor: "#331B25", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 9, elevation: 5 },
  title: { fontSize: 20, lineHeight: 24, fontWeight: "900", letterSpacing: 0.7, textAlign: "center" },
  subtitle: { marginTop: 4, color: "#6F5962", fontSize: 11.5, lineHeight: 17, fontWeight: "700", textAlign: "center" },
});
