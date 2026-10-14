const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const context = fs.readFileSync(path.join(root, 'src/context/ChessRealtimeContext.tsx'), 'utf8');
const socket = fs.readFileSync(path.join(root, 'src/services/chess/chessSocketService.ts'), 'utf8');
const checks = [
  ['Android focus fallback exists', context.includes('AppState.addEventListener("focus"')],
  ['Foreground watchdog exists', context.includes('foreground:watchdog repair') && context.includes('2_500')],
  ['Watchdog reads real AppState', context.includes('AppState.currentState === "active"')],
  ['Watchdog reads live socket flag', context.includes('chessSocketService.isConnected()')],
  ['Stale ready is repaired', context.includes('connectionRef.current === "idle"') && context.includes('connectionRef.current === "error"')],
  ['Resume path calls joinForeground', context.includes('void joinForeground();')],
  ['Background still leaves app presence', context.includes('CHESS_EVENTS.appLeave')],
  ['Background still disconnects socket', context.includes('chessSocketService.disconnect();')],
  ['Socket exposes live snapshot', socket.includes('connectionSnapshot()') && socket.includes('connected: !!this.socket?.connected')],
  ['No background keepalive interval', !context.includes('setInterval(() => {\n      if (AppState.currentState !== "active"')],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} - ${name}`);
  if (ok) passed++;
}
console.log(`Phase 14V.2C checks: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exit(1);
