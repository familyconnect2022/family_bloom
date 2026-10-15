import { Image } from "expo-image";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import type { RealtimeBoardRoundPhase } from "../../games/shared/boardGameFramework";
import { BloomCard } from "../ui/BloomPageComponents";
import { XiangqiPiece } from "./XiangqiPiece";

function formatClock(ms: number) {
  const safe = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function XiangqiClockValue({
  baseMs,
  active,
  startedAtMs,
  runtimeActive,
  onTenSeconds,
}: {
  baseMs: number | null;
  active: boolean;
  startedAtMs: number;
  runtimeActive: boolean;
  onTenSeconds?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const finiteBaseMs = baseMs ?? 0;
  const warnedTurnRef = useRef<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!runtimeActive || !active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [active, baseMs, runtimeActive, startedAtMs]);

  const shownMs = active && runtimeActive
    ? Math.max(0, finiteBaseMs - Math.max(0, now - startedAtMs))
    : finiteBaseMs;
  useEffect(() => {
    if (baseMs == null || !onTenSeconds || !active || !runtimeActive || shownMs <= 0 || shownMs > 10_000) return;
    if (warnedTurnRef.current === startedAtMs) return;
    warnedTurnRef.current = startedAtMs;
    onTenSeconds();
  }, [active, baseMs, onTenSeconds, runtimeActive, shownMs, startedAtMs]);
  return <Text style={[styles.clockText, active && styles.clockTextActive]}>{baseMs == null ? "∞" : formatClock(shownMs)}</Text>;
}

export const XiangqiPlayerRail = React.memo(function XiangqiPlayerRail({
  side,
  name,
  avatarUrl,
  active,
  thinking,
  clockMs,
  clockStartedAtMs,
  runtimeActive,
  phase,
  waitingStatus,
  onTenSeconds,
}: {
  side: "red" | "black";
  name: string;
  avatarUrl?: string | null;
  active: boolean;
  thinking?: boolean;
  clockMs: number | null;
  clockStartedAtMs: number;
  runtimeActive: boolean;
  phase: RealtimeBoardRoundPhase;
  waitingStatus?: string | null;
  onTenSeconds?: () => void;
}) {
  const meta = waitingStatus
    || (phase === "preparing"
      ? "Đang chuẩn bị bàn cờ…"
      : phase === "ready"
        ? side === "red" ? "Sẵn sàng đi trước" : "Sẵn sàng"
        : thinking
          ? "Bloom đang nghĩ một nước…"
          : active
            ? "Đang tới lượt"
            : "Đang chờ lượt");

  return (
    <BloomCard style={[styles.playerRail, active && styles.playerRailActive]}>
      <View style={styles.avatar}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <XiangqiPiece color={side} type="general" size={50} />}
      </View>
      <View style={styles.playerCopy}>
        <View style={styles.nameLine}>
          <Text style={styles.playerName} numberOfLines={1}>{name}</Text>
          <Text style={[styles.waitingInline, !waitingStatus && styles.waitingInlineHidden]} numberOfLines={1}>{waitingStatus || " "}</Text>
        </View>
        <Text style={styles.playerMeta} numberOfLines={1}>{waitingStatus ? " " : meta}</Text>
      </View>
      <View style={[styles.clock, active && styles.clockActive]}>
        <XiangqiClockValue baseMs={clockMs} active={active} startedAtMs={clockStartedAtMs} runtimeActive={runtimeActive} onTenSeconds={onTenSeconds} />
      </View>
    </BloomCard>
  );
});

const styles = StyleSheet.create({
  playerRail: { minHeight: 78, padding: 9, flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: "#FFF9FC" },
  playerRailActive: { borderColor: "rgba(218,74,132,0.45)", shadowOpacity: 0.14, elevation: 4 },
  avatar: { width: 48, height: 48, borderRadius: 17, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: "#FBE8EF" },
  playerCopy: { flex: 1, minWidth: 0 },
  nameLine: { minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6 },
  playerName: { flexShrink: 1, color: COLORS.primaryText, fontSize: 14, lineHeight: 18, fontWeight: "900" },
  waitingInline: { flexShrink: 1, color: COLORS.secondaryText, opacity: 0.56, fontSize: 9.5, lineHeight: 13, fontWeight: "800" },
  waitingInlineHidden: { opacity: 0 },
  playerMeta: { marginTop: 2, color: COLORS.secondaryText, fontSize: 9.5, lineHeight: 13, fontWeight: "700", opacity: 0.8 },
  clock: { minWidth: 86, height: 50, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.white },
  clockActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  clockText: { color: COLORS.primaryText, fontSize: 20, lineHeight: 25, fontWeight: "900", fontVariant: ["tabular-nums"] },
  clockTextActive: { color: COLORS.white },
});
