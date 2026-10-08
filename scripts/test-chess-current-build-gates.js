const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
// Current-build regression set. Historical Phase 17.9A/A1/A2/A3/A4 gates describe
// older transition mechanics (full-window alpha motion, fixed mini, server unchanged)
// and are intentionally not run against A9. A9 replaces those stale assertions with
// runtime behavior tests plus current geometry/root/mini/tab/premove invariants.
const gates = [
  ["Phase 14U core authoritative chess", "test-phase14u-chess.js"],
  ["Phase 14V family game policy", "test-phase14v-family-game-policy.js"],
  ["Phase 14V.2 Bloom Bot", "test-phase14v2-chess-test-bot.js"],
  ["Phase 14V.2A auth diagnostics", "test-phase14v2a-chess-auth-diagnostics.js"],
  ["Phase 14V.2B cold-start presence", "test-phase14v2b-chess-coldstart-presence-hotfix.js"],
  ["Phase 14V.4A capture type safety", "test-phase14v4a-chess-server-capture-type-hotfix.js"],
  ["Phase 16B.10 DEV bot server authority", "test-phase16b10-chess-dev-bot-server-authority.js"],
  ["Phase 16B.13 SharedValue reconnect + motion", "test-phase16b13-sharedvalue-reconnect-motion.js"],
  ["Phase 16B.14 runtime lifecycle / zero-leak", "test-phase16b14-game-runtime-lifecycle-zero-leak.js"],
  ["Phase 16B.15 Chess/Xiangqi smoothness", "test-phase16b15-chess-xiangqi-smoothness.js"],
  ["Phase 16B.17 away timeout + tab SharedValue", "test-phase16b17-away-timeout-tab-sharedvalue.js"],
  ["Phase 16B.18 game occlusion + gesture/flicker", "test-phase16b18-game-occlusion-gesture-flicker.js"],
  ["Phase 17.9A9 lifecycle + root mini + premove", "test-phase17_9a9-chess-lifecycle-mini-premove.js"],
  ["Phase 17.9A10 tap-only + external material + smaller mini", "test-phase17_9a10-tap-only-material-rail-mini.js"],
  ["Phase 17.9A11 family recovery + sync + time controls", "test-phase17_9a11-family-recovery-sync-time-controls.js"],
];

for (const [label, file] of gates) {
  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, [path.join(root, "scripts", file)], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\nCURRENT CHESS BUILD GATE FAILED: ${label}`);
    process.exit(result.status || 1);
  }
}

console.log(`\nCurrent Chess build gates: ${gates.length}/${gates.length} PASS`);
