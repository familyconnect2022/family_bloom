const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const sound = read('src/components/games/useBoardGameSoundscape.ts');
const framework = read('src/games/shared/boardGameFramework.ts');
const chessBoard = read('src/components/chess/ChessBoard.tsx');
const chessHost = read('src/components/chess/ChessSurfaceHost.tsx');
const chessClock = read('src/components/chess/ChessClock.tsx');
const xiangqi = read('src/components/xiangqi/XiangqiSurfaceHost.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const xiangqiEngine = read('src/games/xiangqi/xiangqiEngine.ts');
const server = read('server/src/socket/socketServer.ts');
const bat = read('Family_Bloom_CLEAN_APPLY_FULL.bat');

for (const base of ['game-start','move-self','move-opponent','capture','move-check','castle','promote','premove','illegal','tenseconds','game-end']) {
  check(`selected board-game sound asset exists: ${base}`, exists(`assets/audio/board-game/${base}.m4a`) || exists(`assets/audio/board-game/${base}.ogg`) || exists(`assets/audio/board-game/${base}.mp3`));
}
check('shared soundscape uses user-selected physical board set', ['move-self','move-opponent','game-start','game-end'].every((base) => sound.includes(`${base}.m4a`) || sound.includes(`${base}.ogg`) || sound.includes(`${base}.mp3`)));
check('one-move-one-sound priority is shared', framework.includes('if (move.promotion)') && framework.includes('if (move.castle)') && framework.includes('if (move.check)') && framework.includes('if (move.captured)'));
check('shared bot pacing is 3s normal / 5s checking', framework.includes('return givesCheck ? 5_000 : 3_000'));
check('Chess server uses 3s normal / 5s checking move pacing', server.includes('TEST_BOT_MOVE_DELAY_MS = 3_000') && server.includes('TEST_BOT_CHECK_DELAY_MS = 5_000') && server.includes('planned?.givesCheck'));
check('Chess sound is tied to physical renderer callbacks, not move-delta React effect', ((chessBoard.includes('onMoveStarted?.(') && chessHost.includes('onMoveStarted={actualGame ? handleMoveStarted : undefined}')) || (chessBoard.includes('onMoveLanded?.(delta)') && chessHost.includes('onMoveLanded={actualGame ? handleMoveLanded : undefined}'))) && !chessHost.includes('latest.version <= lastSoundRevisionRef.current'));
check('Chess local + opponent move sound semantics are preserved', (chessHost.includes('isSelf: delta.move.color === myColor') || chessHost.includes('isSelf: move.color === myColor')) && (chessHost.includes('delta.move.flags.includes("k")') || chessHost.includes('move.flags.includes("k")')) && (chessHost.includes('promotion: !!delta.move.promotion') || chessHost.includes('promotion: !!move.promotion')));
check('Chess premove taps are not blocked during opponent visual motion', chessBoard.includes('const premoveWindow = visible.status === "active" && visible.turn !== myColor') && chessBoard.includes('!premoveWindow && motionRef.current'));
check('Chess keeps selection through opponent landing when only source was tapped', chessBoard.includes('selectedDuringOpponentMotion') && chessBoard.includes('selectSquare(selectedDuringOpponentMotion)'));
check('Chess illegal + ten-seconds sounds are wired', chessHost.includes('onIllegalMove={actualGame ? playIllegal : undefined}') && chessHost.includes('onTenSeconds={playTenSeconds}') && chessClock.includes('ms > 10_000'));
check('Xiangqi uses shared round/pacing/sound framework', xiangqi.includes('RealtimeBoardRoundPhase') && xiangqi.includes('useBoardGameSoundscape') && (xiangqi.includes('humanBotThinkDelayMs(plan.givesCheck)') || read('server/src/xiangqi/xiangqiSocket.ts').includes('plan.givesCheck?CHECK_DELAY:MOVE_DELAY')));
check('Xiangqi bot plan knows whether its move gives check', xiangqiEngine.includes('chooseXiangqiBotMovePlan') && xiangqiEngine.includes('const givesCheck = after.inCheck === "red"'));
check('Xiangqi supports red premove while bot thinks', xiangqi.includes('const premoveMode = game.turn === "black"') && xiangqi.includes('setPremove({') && xiangqi.includes('playPremove()'));
check('Xiangqi premove revalidates after bot landing', xiangqi.includes('getXiangqiLegalMoves(game, queued.pieceId)') && xiangqi.includes('stillLegal') && (xiangqi.includes('playXiangqiMove(current, queued.pieceId, queued.to)') || xiangqi.includes('sendMove(queued.pieceId, queued.to)')));
check('Xiangqi renderer emits exact piece landing callback', xiangqiBoard.includes('runOnJS(onLanded)(piece.id)') && xiangqiBoard.includes('onMoveLanded?.(lastMove)'));
check('Xiangqi exposes premove markers', xiangqiBoard.includes('premoveMarker') && xiangqiBoard.includes('key={`premove-${index}`}'));
check('copy-over BAT runs A15 gate', bat.includes('test-phase17_9a15-shared-board-game-sound-premove.js'));

console.log(`Phase 17.9A15 Shared Board Game: ${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
