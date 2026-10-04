import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS } from "../../constants/theme";
import { chessDiagnostics, type ChessDiagnosticEntry, type ChessDiagnosticStage } from "../../services/chess/chessDiagnosticsService";

const LABEL: Record<ChessDiagnosticStage, string> = {
  PIECE_HIT: "Chạm quân",
  SQUARE_HIT: "Chạm ô",
  DRAG_START: "Bắt đầu kéo",
  DROP: "Thả quân",
  SELECT: "Chọn quân",
  ATTEMPT: "attemptMove",
  LOCAL_VALIDATE_OK: "chess.js hợp lệ",
  LOCAL_VALIDATE_FAIL: "chess.js từ chối",
  PREMOVE_QUEUED: "Premove đã xếp",
  OPTIMISTIC_START: "Animation bắt đầu",
  OPTIMISTIC_SETTLE: "Animation đã tới đích",
  MOVE_HOOK: "Hook gửi move",
  SOCKET_EMIT: "Socket emit",
  SOCKET_ACK_OK: "Server ACK OK",
  SOCKET_ACK_REJECT: "Server ACK reject",
  MOVE_APPLIED_RX: "Nhận moveApplied",
  DELTA_COMMIT_APPLIED: "Delta commit",
  DELTA_COMMIT_STALE: "Delta bị stale",
  DELTA_COMMIT_GAP: "Delta lệch version",
  BOARD_DELTA_DEQUEUE: "Board nhận delta",
  AUTHORITATIVE_CONFIRM: "Board xác nhận server",
  OPPONENT_ANIM_START: "Đối thủ animation",
  OPPONENT_ANIM_SETTLE: "Đối thủ settle",
  RESYNC_START: "Bắt đầu resync",
  RESYNC_OK: "Resync OK",
  RESYNC_FAIL: "Resync lỗi",
  SNAPSHOT_COMMIT: "Snapshot commit",
  SNAPSHOT_REBUILD_START: "Rebuild snapshot",
  SNAPSHOT_REBUILD_SETTLE: "Snapshot settle",
  SOCKET_CONNECTED: "Socket connected",
  SOCKET_DISCONNECTED: "Socket disconnected",
};

function latestAttempt(entries: ChessDiagnosticEntry[]) {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    if (entries[i].stage === "ATTEMPT") return entries.slice(Math.max(0, i - 4));
  }
  return entries.slice(-12);
}

function diagnosticVerdict(trace: ChessDiagnosticEntry[]) {
  if (!trace.length) return { tone: "idle" as const, text: "Chưa có thao tác. Hãy thử một nước e2 → e4." };
  const has = (stage: ChessDiagnosticStage) => trace.some((item) => item.stage === stage);
  const last = trace[trace.length - 1];
  const age = Date.now() - last.atMs;

  if (has("LOCAL_VALIDATE_FAIL")) return { tone: "warn" as const, text: "Dừng ở local chess.js: target bị đánh giá không hợp lệ." };
  if (last.stage === "SELECT" && age > 900) return { tone: "warn" as const, text: "Trace đang dừng ở Chọn quân. Nếu bạn đã chạm ô đích mà không có Chạm ô/attemptMove, lỗi nằm ở hit-layer/touch routing." };
  if (has("SQUARE_HIT") && !has("ATTEMPT") && age > 250) return { tone: "bad" as const, text: "FAIL: hit-layer nhận tap nhưng interaction controller chưa gọi attemptMove." };
  const reject = trace.find((item) => item.stage === "SOCKET_ACK_REJECT");
  if (reject) return { tone: "bad" as const, text: `Server reject: ${reject.errorCode ?? "không rõ mã lỗi"}.` };
  if (has("AUTHORITATIVE_CONFIRM")) return { tone: "good" as const, text: "PASS: nước đi đã đi hết pipeline tới authoritative confirm." };
  if (has("DELTA_COMMIT_GAP")) return { tone: "bad" as const, text: "FAIL: moveApplied tới nhưng version bị gap → lỗi ordering/resync." };
  if (has("DELTA_COMMIT_STALE")) return { tone: "bad" as const, text: "FAIL: moveApplied tới nhưng client coi là stale." };
  if (has("DELTA_COMMIT_APPLIED") && !has("BOARD_DELTA_DEQUEUE") && age > 300) return { tone: "bad" as const, text: "FAIL: hook đã commit delta nhưng ChessBoard chưa nhận buffer delta." };
  if (has("MOVE_APPLIED_RX") && !has("DELTA_COMMIT_APPLIED") && age > 300) return { tone: "bad" as const, text: "FAIL: socket nhận moveApplied nhưng state reducer chưa commit." };
  if (has("SOCKET_ACK_OK") && !has("MOVE_APPLIED_RX") && age > 700) return { tone: "bad" as const, text: "FAIL: server ACK OK nhưng client chưa nhận broadcast moveApplied." };
  if (has("SOCKET_EMIT") && !has("SOCKET_ACK_OK") && !has("MOVE_APPLIED_RX") && age > 1500) return { tone: "bad" as const, text: "FAIL: packet đã emit nhưng chưa có ACK/moveApplied → kiểm tra server/network." };
  if (has("LOCAL_VALIDATE_OK") && !has("OPTIMISTIC_START") && age > 250) return { tone: "bad" as const, text: "FAIL: local hợp lệ nhưng optimistic animation không bắt đầu." };
  if (has("ATTEMPT") && !has("LOCAL_VALIDATE_OK") && age > 250) return { tone: "bad" as const, text: "FAIL: attemptMove chạy nhưng local validation không hoàn tất." };
  return { tone: "idle" as const, text: `Đang chờ bước tiếp theo sau: ${LABEL[last.stage]}.` };
}

export function ChessDiagnosticsPanel() {
  const [expanded, setExpanded] = useState(true);
  const [enabled, setEnabled] = useState(chessDiagnostics.isEnabled());
  const [entries, setEntries] = useState(() => chessDiagnostics.snapshot());
  const [, setTick] = useState(0);

  useEffect(() => chessDiagnostics.subscribe(() => {
    setEnabled(chessDiagnostics.isEnabled());
    setEntries(chessDiagnostics.snapshot());
  }), []);
  useEffect(() => {
    if (!expanded) return;
    const timer = setInterval(() => setTick((value) => value + 1), 400);
    return () => clearInterval(timer);
  }, [expanded]);

  const trace = useMemo(() => latestAttempt(entries), [entries]);
  const verdict = diagnosticVerdict(trace);
  const base = trace[0]?.atMs ?? Date.now();

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable style={styles.headerMain} onPress={() => setExpanded((value) => !value)}>
          <Ionicons name="pulse-outline" size={17} color={COLORS.primary} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Chess Diagnostic · RAM only</Text>
            <Text style={styles.subtitle}>{verdict.text}</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          style={[styles.toggle, enabled && styles.toggleOn]}
          onPress={() => chessDiagnostics.setEnabled(!enabled)}
        >
          <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>{enabled ? "ON" : "OFF"}</Text>
        </Pressable>
      </View>

      {expanded ? (
        <>
          <View style={[styles.verdict, verdict.tone === "good" && styles.good, verdict.tone === "bad" && styles.bad, verdict.tone === "warn" && styles.warn]}>
            <Text style={styles.verdictText}>{verdict.text}</Text>
          </View>
          <View style={styles.rows}>
            {trace.slice(-16).map((entry) => (
              <View key={entry.seq} style={styles.row}>
                <Text style={styles.time}>+{Math.max(0, entry.atMs - base)}ms</Text>
                <Text style={styles.stage}>{LABEL[entry.stage]}</Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {entry.from && entry.to ? `${entry.from}→${entry.to}` : ""}
                  {entry.version != null ? ` v${entry.version}` : ""}
                  {entry.expectedVersion != null ? ` exp${entry.expectedVersion}` : ""}
                  {entry.errorCode ? ` ${entry.errorCode}` : ""}
                  {entry.detail ? ` ${entry.detail}` : ""}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={styles.footerText}>Không Firestore · không console · tối đa 160 sự kiện trong RAM.</Text>
            <Pressable style={styles.clear} onPress={() => chessDiagnostics.clear()}><Text style={styles.clearText}>Xóa trace</Text></Pressable>
          </View>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 12, borderWidth: 1, borderColor: "#E8C7D4", borderRadius: 18, backgroundColor: "#FFFDFE", overflow: "hidden" },
  header: { minHeight: 58, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  headerMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 9 },
  headerText: { flex: 1 },
  title: { fontSize: 12, fontWeight: "900", color: COLORS.primaryText },
  subtitle: { marginTop: 2, fontSize: 9.5, lineHeight: 13, color: COLORS.secondaryText },
  toggle: { minWidth: 42, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: "#F2E8ED" },
  toggleOn: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 9, fontWeight: "900", color: COLORS.primaryText },
  toggleTextOn: { color: COLORS.white },
  verdict: { marginHorizontal: 10, marginBottom: 8, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "#F5F2F4" },
  good: { backgroundColor: "#EAF7EF" }, bad: { backgroundColor: "#FCEBEC" }, warn: { backgroundColor: "#FFF5DE" },
  verdictText: { fontSize: 10.5, fontWeight: "800", color: COLORS.primaryText, lineHeight: 15 },
  rows: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#EEDDE4", paddingVertical: 5 },
  row: { minHeight: 24, paddingHorizontal: 10, flexDirection: "row", alignItems: "center", gap: 7 },
  time: { width: 54, fontSize: 9, fontVariant: ["tabular-nums"], color: COLORS.secondaryText },
  stage: { width: 118, fontSize: 9.5, fontWeight: "900", color: COLORS.primaryText },
  meta: { flex: 1, fontSize: 9, color: COLORS.secondaryText },
  footer: { minHeight: 38, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#EEDDE4", flexDirection: "row", alignItems: "center", gap: 8 },
  footerText: { flex: 1, fontSize: 8.5, color: COLORS.secondaryText },
  clear: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, backgroundColor: "#F7EAF0" },
  clearText: { fontSize: 9, fontWeight: "900", color: COLORS.primary },
});
