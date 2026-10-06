const { spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const gates = [
  ["Phase 14U core authoritative chess", "test-phase14u-chess.js"],
  ["Phase 14V family game policy", "test-phase14v-family-game-policy.js"],
  ["Phase 14V.2 Bloom Bot", "test-phase14v2-chess-test-bot.js"],
  ["Phase 14V.2A auth diagnostics", "test-phase14v2a-chess-auth-diagnostics.js"],
  ["Phase 14V.2B cold-start presence", "test-phase14v2b-chess-coldstart-presence-hotfix.js"],
  ["Phase 14V.4A capture type safety", "test-phase14v4a-chess-server-capture-type-hotfix.js"],
  ["Phase 14V.4K material swing FX", "test-phase14v4k-chess-material-swing-fx.js"],
  ["Phase 16B.10 DEV bot server authority", "test-phase16b10-chess-dev-bot-server-authority.js"],
  ["Phase 16B.11 result + centering UX", "test-phase16b11-game-ux-xiangqi-fx.js"],
  ["Phase 16B.12 bottom modal + victory hero", "test-phase16b12-chess-bottom-modal-victory-hero.js"],
  ["Phase 16B.13 SharedValue reconnect + motion", "test-phase16b13-sharedvalue-reconnect-motion.js"],
  ["Phase 16B.14 runtime lifecycle / zero-leak", "test-phase16b14-game-runtime-lifecycle-zero-leak.js"],
  ["Phase 16B.15 Chess/Xiangqi smoothness", "test-phase16b15-chess-xiangqi-smoothness.js"],
  ["Phase 16B.16 game entry + lifecycle recovery", "test-phase16b16-game-entry-lifecycle-recovery.js"],
  ["Phase 16B.17 away timeout + tab SharedValue", "test-phase16b17-away-timeout-tab-sharedvalue.js"],
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
