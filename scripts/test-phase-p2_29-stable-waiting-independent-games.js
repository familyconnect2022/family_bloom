const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { pass += 1; console.log(`PASS  ${name}`); }
  else { fail += 1; console.error(`FAIL  ${name}`); }
}
function has(rel, ...needles) {
  const src = read(rel);
  return needles.every((needle) => src.includes(needle));
}
function lacks(rel, ...needles) {
  const src = read(rel);
  return needles.every((needle) => !src.includes(needle));
}

const chessChallenge = 'src/app/(chess)/chess-challenge/[inviteId].tsx';
const xiangqiChallenge = 'src/app/(xiangqi)/xiangqi-challenge/[inviteId].tsx';
const chessHost = 'src/components/chess/ChessSurfaceHost.tsx';
const xiangqiHost = 'src/components/xiangqi/XiangqiSurfaceHost.tsx';
const xiangqiRoute = 'src/app/(xiangqi)/xiangqi-preview.tsx';
const reservation = 'server/src/games/boardGamePendingReservation.ts';
const chessSocket = 'server/src/socket/socketServer.ts';
const xiangqiSocket = 'server/src/xiangqi/xiangqiSocket.ts';

check('Chess waiting shell is Chess-only', has(chessChallenge, 'ChessGameHeader', 'ChessPlayerRail', 'ChessBoard') && lacks(chessChallenge, 'Xiangqi'));
check('Xiangqi waiting shell is Xiangqi-only', has(xiangqiChallenge, 'XiangqiGameHeader', 'XiangqiPlayerRail', 'XiangqiGameBoard') && lacks(xiangqiChallenge, 'Chess'));
check('Chess waiting status sits beside name and clock remains rail-owned', has(chessChallenge, 'statusText="chưa sẵn sàng"', 'runtimeActive={false}') && has('src/components/chess/ChessPlayerRail.tsx', 'nameLine', '<ChessClock'));
check('Xiangqi waiting status sits beside name and clock remains rail-owned', has(xiangqiChallenge, 'waitingStatus="chưa sẵn sàng"', 'clockMs={initialMs}') && has('src/components/xiangqi/XiangqiPlayerRail.tsx', 'nameLine', '<XiangqiClockValue'));
check('Challenge rooms no longer swap in separate status/wait cards', lacks(chessChallenge, 'BloomHeroHeader', 'statusPill', 'waitCard') && lacks(xiangqiChallenge, 'BloomHeroHeader', 'statusPill', 'waitCard'));
check('Chess active surface uses the exact Chess header/rail family', has(chessHost, 'ChessGameHeader', 'ChessPlayerRail', 'statusText={state.status === "waiting"'));
check('Xiangqi active surface uses the exact Xiangqi header/rail family', has(xiangqiHost, 'XiangqiGameHeader', 'XiangqiPlayerRail', 'waitingStatus={serverState?.status === "waiting" ? "chưa sẵn sàng" : null}'));
check('Chess actual waiting game is never hidden by Ready full-screen ceremony', has(chessHost, 'const showPreparing = fullVisible && !actualGame && !warmReady;'));
check('Xiangqi route ignores transient null activeGameId', has(xiangqiRoute, 'retainedGameIdRef', 'if (!gameId) return;', 'realtime.activeGameId ?? retainedGameIdRef.current') && lacks(xiangqiRoute, 'router.replace("/(xiangqi)/xiangqi-lobby"'));
check('Chess surface release ownership is local to Chess', lacks('src/services/chess/chessSurfaceStore.ts', 'boardGameSurfaceLifecycle') && has('src/services/chess/chessSurfaceStore.ts', 'canReleaseChessSurface'));
check('Xiangqi surface release ownership is local to Xiangqi', lacks('src/services/xiangqi/xiangqiSurfaceStore.ts', 'boardGameSurfaceLifecycle') && has('src/services/xiangqi/xiangqiSurfaceStore.ts', 'canReleaseXiangqiSurface'));
check('Xiangqi host has no shared board-surface lifecycle predicate', lacks(xiangqiHost, 'boardGameSurfaceLifecycle', 'isBoardGameSurfacePresented'));
check('Server pending reservation records inviter/invitee role and pending phase', has(reservation, '"inviter" | "invitee" | "participant"', '"waiting_acceptance"', 'inviterUid?: string', 'inviteeUid?: string'));
check('Chess human challenge reserves both roles atomically', has(chessSocket, 'inviterUid: uid', 'inviteeUid: toUid', 'ownerPending.role !== "inviter"', 'inviteePending.role !== "invitee"'));
check('Xiangqi human challenge reserves both roles atomically', has(xiangqiSocket, 'inviterUid:uid', 'inviteeUid:toUid', 'ownerPending.role!=="inviter"', 'inviteePending.role!=="invitee"'));
check('Chess invite preassigns colors before Accept', has(chessSocket, 'const whiteUid = Math.random() < 0.5 ? uid : toUid;', 'whiteUid, blackUid', '{ whiteUid: invite.whiteUid, blackUid: invite.blackUid }') && has('src/types/chess.ts', 'whiteUid?: string;', 'blackUid?: string;'));
check('Xiangqi invite preassigns colors before Accept', has(xiangqiSocket, 'const redUid=Math.random()<.5?uid:toUid', 'redUid,blackUid', '{redUid:invite.redUid,blackUid:invite.blackUid}') && has('src/types/xiangqiRealtime.ts', 'redUid?:string;blackUid?:string'));
check('Game handoff routes disable navigation animation', has('src/app/_layout.tsx', '<Stack.Screen name="(chess)/chess-challenge/[inviteId]" options={{ animation: "none" }} />', '<Stack.Screen name="(chess)/chess-game/[gameId]" options={{ animation: "none" }} />', '<Stack.Screen name="(xiangqi)/xiangqi-challenge/[inviteId]" options={{ animation: "none" }} />', '<Stack.Screen name="(xiangqi)/xiangqi-preview" options={{ animation: "none" }} />'));
check('Family Graph code is outside P2.29 change contract', !read(chessChallenge).includes('familyGraph') && !read(xiangqiChallenge).includes('familyGraph'));

console.log(`\nP2.29 invariant gate: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
