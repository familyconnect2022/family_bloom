import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../constants/theme";
import { chessDiagnostics, type ChessDiagnosticEvent } from "../../services/chess/chessDiagnostics";

const ORDER = [
  "attempt_start",
  "local_validate_ok",
  "optimistic_start",
  "socket_emit",
  "socket_ack_ok",
  "move_applied_received",
  "delta_commit_applied",
  "board_delta_start",
  "authoritative_commit",
  "visual_settle",
] as const;

function compact(event: ChessDiagnosticEvent) {
  const move = event.from && event.to ? ` ${event.from}→${event.to}` : "";
  const version = event.version != null ? ` v${event.version}` : "";
  const detail = event.detail ? ` · ${event.detail}` : "";
  return `${event.stage}${move}${version}${detail}`;
}

export const ChessDiagnosticPanel = React.memo(function ChessDiagnosticPanel({ gameId }: { gameId: string }) {
  const [version, setVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => chessDiagnostics.subscribe(() => setVersion((value) => value + 1)), []);

  const events = useMemo(() => chessDiagnostics.snapshot(gameId), [gameId, version]);
  const latestMoveId = [...events].reverse().find((event) => event.clientMoveId)?.clientMoveId;
  const latest = latestMoveId ? events.filter((event) => event.clientMoveId === latestMoveId) : events.slice(-12);
  const firstAt = latest[0]?.atMs ?? 0;
  const seen = new Set(latest.map((event) => event.stage));
  const missing = ORDER.find((stage) => !seen.has(stage));
  const ackFail = [...latest].reverse().find((event) => event.stage === "socket_ack_fail");
  const gap = [...latest].reverse().find((event) => event.stage === "delta_commit_gap");
  const illegal = [...latest].reverse().find((event) => event.stage === "local_validate_illegal");
  const blocked = [...latest].reverse().find((event) => event.stage === "input_blocked");
  const adjusted = [...latest].reverse().find((event) => event.stage === "drop_target_adjusted");
  const status = ackFail
    ? `FAIL · ACK ${ackFail.detail ?? ""}`
    : gap
      ? "FAIL · VERSION GAP"
      : blocked && !latestMoveId
        ? `INPUT BUSY · ${blocked.detail ?? "đang đồng bộ"}`
        : illegal
        ? "LOCAL ILLEGAL · không gửi server"
        : latestMoveId && seen.has("visual_settle")
          ? "PASS · hoàn tất"
          : latestMoveId
            ? `WAIT · ${missing ?? "đang xử lý"}`
            : "Chưa có move trace";

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>CHESS DIAGNOSTICS · RAM ONLY</Text>
          <Text style={styles.status}>{status}</Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.smallButton} onPress={() => setExpanded((value) => !value)}>
            <Text style={styles.smallButtonText}>{expanded ? "Thu gọn" : "Mở trace"}</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={() => chessDiagnostics.clear(gameId)}>
            <Text style={styles.smallButtonText}>Xóa</Text>
          </Pressable>
        </View>
      </View>
      {expanded ? (
        <View style={styles.trace}>
          {latest.slice(-16).map((event) => (
            <View key={event.seq} style={styles.row}>
              <Text style={styles.ms}>+{firstAt ? event.atMs - firstAt : 0}ms</Text>
              <Text style={styles.line} numberOfLines={2}>{compact(event)}</Text>
            </View>
          ))}
          {!latest.length ? <Text style={styles.empty}>Hãy thử một nước e2→e4. Trace sẽ xuất hiện tại đây.</Text> : null}
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 12,
    backgroundColor: "#FFFDFE",
    gap: 10,
  },
  header: { flexDirection: "row", justifyContent: "space-between", gap: 10, alignItems: "center" },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: { fontSize: 9, fontWeight: "900", color: COLORS.secondaryText, letterSpacing: 0.6 },
  status: { fontSize: 12, fontWeight: "900", color: COLORS.primaryText },
  actions: { flexDirection: "row", gap: 6 },
  smallButton: { minHeight: 30, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  smallButtonText: { fontSize: 9.5, fontWeight: "900", color: COLORS.primary },
  trace: { gap: 5 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  ms: { width: 54, fontSize: 9.5, fontWeight: "800", color: COLORS.secondaryText },
  line: { flex: 1, fontSize: 9.5, lineHeight: 13, fontWeight: "700", color: COLORS.primaryText },
  empty: { fontSize: 10, lineHeight: 14, color: COLORS.secondaryText },
});
