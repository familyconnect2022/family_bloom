import { useEffect, useRef, useState } from "react";
import { AppState, StyleSheet, Text, View } from "react-native";

/** A display-only clock. The server's immutable expiresAt is authoritative.
 * Reopening this dialog, reconnecting or resuming the app never creates another 60s window.
 * Kept inside the invitation dialog so the ticking never rerenders the game board or tab shell.
 */
export function botInviteSecondsLeft(expiresAt: number, now: number = Date.now()): number {
  if (!Number.isFinite(expiresAt)) return 0;
  return Math.max(0, Math.ceil((expiresAt - now) / 1000));
}

export function BotInviteCountdown({ inviteId, expiresAt, game, onExpired }: {
  inviteId: string;
  expiresAt: number;
  game: "chess" | "xiangqi";
  onExpired: (inviteId: string) => void;
}) {
  const [seconds, setSeconds] = useState(() => botInviteSecondsLeft(expiresAt));
  const onExpiredRef = useRef(onExpired);
  onExpiredRef.current = onExpired;

  useEffect(() => {
    let notified = false;
    const tick = () => {
      const left = botInviteSecondsLeft(expiresAt);
      setSeconds(old => old === left ? old : left);
      if (left === 0 && !notified) {
        notified = true;
        onExpiredRef.current(inviteId);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    // Background timers can be suspended by Android. Always recalculate from the
    // original absolute deadline when the app returns to the foreground.
    const subscription = AppState.addEventListener("change", state => {
      if (state === "active") tick();
    });
    return () => { clearInterval(interval); subscription.remove(); };
  }, [inviteId, expiresAt]);

  const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return (
    <View style={[styles.wrapper, game === "xiangqi" && styles.xiangqiWrapper]}>
      <Text style={[styles.timer, game === "xiangqi" && styles.xiangqiTimer]} accessibilityLabel={`Còn ${seconds} giây để nhận lời mời`}>{label}</Text>
      <Text style={styles.caption}>Thời gian còn lại để nhận lời mời</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: "center", alignSelf: "center", backgroundColor: "#FFF0F7", borderColor: "#F1C3D8", borderWidth: 1, borderRadius: 18, minWidth: 196, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 21 },
  xiangqiWrapper: { backgroundColor: "#FFF5DC", borderColor: "#F2D18F" },
  timer: { fontSize: 32, fontWeight: "900", color: "#A92F72", fontVariant: ["tabular-nums"], letterSpacing: 1.3 },
  xiangqiTimer: { color: "#A56811" },
  caption: { fontSize: 10.5, fontWeight: "700", color: "#8B6479", textAlign: "center", marginTop: 2 },
});
