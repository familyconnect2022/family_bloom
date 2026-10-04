const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const board = read("src/components/chess/ChessBoard.tsx");
const hook = read("src/hooks/chess/useChessGame.ts");
const panel = read("src/components/chess/ChessDiagnosticPanel.tsx");
const diag = read("src/services/chess/chessDiagnostics.ts");
const screen = read("src/app/chess-game/[gameId].tsx");

const checks = [
  ["RAM diagnostics singleton exists", diag.includes("const MAX_EVENTS = 240")],
  ["diagnostics are explicitly enabled in test build", diag.includes("CHESS_DIAGNOSTICS_ENABLED = true")],
  ["diagnostics expose mark()", diag.includes("mark(event:")],
  ["diagnostics expose snapshot()", diag.includes("snapshot(gameId?: string)")],
  ["diagnostics expose clear()", diag.includes("clear(gameId?: string)")],
  ["diagnostics expose subscribe()", diag.includes("subscribe(listener: Listener)")],
  ["diagnostics stay bounded in RAM", diag.includes("events.length > MAX_EVENTS")],
  ["panel labels RAM-only behavior", panel.includes("CHESS DIAGNOSTICS · RAM ONLY")],
  ["panel reports PASS after visual settle", panel.includes("PASS · hoàn tất")],
  ["panel can expose missing pipeline stage", panel.includes("WAIT · ${missing")],
  ["screen mounts diagnostic panel", screen.includes("<ChessDiagnosticPanel gameId={state.gameId}")],
  ["piece hit checkpoint instrumented", board.includes('stage: "piece_hit"')],
  ["square hit checkpoint instrumented", board.includes('stage: "square_hit"')],
  ["attempt start checkpoint instrumented", board.includes('stage: "attempt_start"')],
  ["blocked attempt checkpoint instrumented", board.includes('stage: "attempt_blocked"')],
  ["local legal checkpoint instrumented", board.includes('local_validate_ok')],
  ["local illegal checkpoint instrumented", board.includes('local_validate_illegal')],
  ["optimistic start checkpoint instrumented", board.includes('stage: "optimistic_start"')],
  ["optimistic settle checkpoint instrumented", board.includes('stage: "optimistic_settle"')],
  ["socket emit checkpoint instrumented", hook.includes('stage: "socket_emit"')],
  ["socket moveApplied receipt checkpoint instrumented", hook.includes('stage: "move_applied_received"')],
  ["delta commit result checkpoint instrumented", hook.includes('stage: "delta_commit_applied"')],
  ["resync checkpoints instrumented", hook.includes('stage: "resync_start"') && hook.includes('stage: "resync_ok"')],
  ["no diagnostic console spam", !diag.includes("console.") && !panel.includes("console.")],
];

let pass = 0;
for (const [name, ok] of checks) {
  if (ok) {
    pass += 1;
    console.log(`PASS ${pass}/${checks.length} - ${name}`);
  } else {
    console.error(`FAIL - ${name}`);
  }
}
if (pass !== checks.length) process.exit(1);
console.log(`Phase 14V4C Chess Diagnostics: ${pass}/${checks.length} PASS`);
