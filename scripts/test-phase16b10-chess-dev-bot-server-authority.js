const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const ctx = read('src/context/ChessRealtimeContext.tsx');
const socket = read('src/services/chess/chessSocketService.ts');
const lobby = read('src/app/(chess)/chess-lobby.tsx');
const hook = read('src/hooks/chess/useChessLobby.ts');
const env = read('src/config/env.ts');
const rootEnv = read('.env.example');
const server = read('server/src/socket/socketServer.ts');
const health = read('server/src/routes/health.ts');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('client has no Bloom Bot public env flag', !env.includes('EXPO_PUBLIC_CHESS_TEST_BOT_ENABLED') && !rootEnv.includes('EXPO_PUBLIC_CHESS_TEST_BOT_ENABLED'));
check('Render remains the single Bloom Bot switch', server.includes('process.env.CHESS_TEST_BOT_ENABLED') && health.includes('process.env.CHESS_TEST_BOT_ENABLED'));
check('health endpoint exposes authoritative bot capability', health.includes('chessTestBotEnabled: testBotEnabled'));
check('prewake parses health bot capability', socket.includes('health?.chessTestBotEnabled') && socket.includes('return health ?? { ok: true }'));
check('foreground join consumes health capability off the socket critical path', ctx.includes('const healthPromise = chessSocketService.prewake().catch') && ctx.includes('health?.chessTestBotEnabled'));
check('app join ACK still overrides/finalizes capability when present', ctx.includes('appJoinBotReported') && ctx.includes('source: "appJoin"'));
check('lobby join ACK refreshes server capability', ctx.includes('lobbyBotReported') && ctx.includes('source: "lobbyJoin"'));
check('lobby falls back to health when old/missing ACK capability occurs', ctx.includes('void chessSocketService.prewake().then((health) =>') && ctx.includes('source: "health"'));
check('client never blocks Bot request from stale local capability', !ctx.includes('if (!testBotEnabled) return') && ctx.includes('CHESS_EVENTS.testBotInvite'));
check('server disabled response remains authoritative and updates local cache', ctx.includes('response.errorCode === "CHESS_TEST_BOT_DISABLED"') && ctx.includes('setTestBotEnabled(false)'));
check('successful server bot request repairs local capability cache', ctx.includes('if (response.ok) setTestBotEnabled(true)'));
check('lobby join can repair readiness without circular ready dependency', hook.includes('if (!familyId) return') && hook.includes('realtime.enterLobby()') && !hook.includes('realtime.connection !== "ready"'));
check('DEV keeps Bot surface visible while capability resolves', lobby.includes('const showBotCard = lobby.testBotEnabled || __DEV__') && lobby.includes('{showBotCard ? ('));
check('DEV Bot button still asks server instead of bypassing authority', lobby.includes('requestTestBotChallenge(timeControl, 5_000)') && !lobby.includes('EXPO_PUBLIC_CHESS_TEST_BOT_ENABLED'));
check('Bloom Bot remains exempt from 06:00-22:00 quiet hours', (() => { const a=server.indexOf('socket.on(E.testBotInvite'); const b=server.indexOf('socket.on(E.inviteCreate', a); return a>=0 && b>a && !server.slice(a,b).includes('assertFamilyGameCreationOpen()'); })());
check('human challenge remains quiet-hour gated', lobby.includes('const latest = getHomeGamePlayWindow()') && lobby.includes('if (!latest.canCreate)'));
check('copy-over PRE BAT is bundled and pure-batch', preCopy.includes('PRE-COPY CLEAN') && preCopy.includes(':CleanJsShadows') && !preCopy.includes('powershell -NoProfile'));
check('post-copy BAT runs Phase 16B.10 gate', (postCopy.includes('phase16b10:check') || postCopy.includes('chess:current-check')));
check('Debug build runs Phase 16B.10 gate', (debugBat.includes('phase16b10:check') || debugBat.includes('chess:current-check')));
check('Release build runs Phase 16B.10 gate', (releaseBat.includes('phase16b10:check') || releaseBat.includes('chess:current-check')));

console.log(`\nPhase 16B.10 Chess DEV Bot Server Authority: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
