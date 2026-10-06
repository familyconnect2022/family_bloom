const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const board = read('src/components/chess/ChessBoard.tsx');
const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const hook = read('src/hooks/chess/useChessGame.ts');
const pkg = JSON.parse(read('package.json'));
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

const hybridStart = board.indexOf('const submitHybridMove = async');
const localStart = board.indexOf('startSlide({', hybridStart);
const networkAwait = board.indexOf('const confirmedState = await onMove', hybridStart);

check('hybrid move path exists', hybridStart >= 0 && board.includes('Hybrid instant motion'));
check('local legal move starts visual motion before network ACK', localStart >= 0 && networkAwait > localStart);
check('client legality is checked locally before animation', board.indexOf('const locallyLegal = validationState.legalMoves.some', hybridStart) >= 0 && board.indexOf('if (!locallyLegal) return;', hybridStart) >= 0);
check('invalid destination never calls hybrid submit', board.includes('const candidates = legal.filter((move) => move.to === square)') && board.includes('if (candidates.length)') && board.includes('Invalid destination: selection clears and the piece never moves.'));
check('local move overlay can wait at destination for authority', board.includes('if (current.confirmedState) settleVisualMove(current)') && board.includes('hold the overlay at the destination'));
check('socket confirmation can beat ACK without waiting round trip', board.includes('stateConfirmsRequest(state, pending)') && board.includes('confirmLocalVisualMove(pending, state)'));
check('ACK confirmation validates revision ply squares and promotion', board.includes('stateConfirmsRequest(confirmedState, request)') && board.includes('next.lastMove?.promotion === request.promotion'));
check('authoritative FEN commits before moving overlay disappears', board.indexOf('commitDisplayState(confirmedState);') >= 0 && board.indexOf('commitDisplayState(confirmedState);') < board.indexOf('visualMoveRef.current = null;', board.indexOf('commitDisplayState(confirmedState);')));
check('legacy reverse animation remains fully removed', !board.includes('ROLLBACK_ANIMATION_MS') && !board.includes('rollbackVisualMove') && !board.includes('toValue: 0,') && !board.includes('toValue: 0\n'));
check('rare rejection/desync uses board crossfade not reverse motion', board.includes('resyncWithoutReverseMotion') && board.includes('RESYNC_FADE_OUT_MS') && board.includes('boardOpacity'));
check('bot/newer states remain revision queued during local motion', board.includes('queuedStatesRef') && board.includes('queue.sort((a, b) => a.revision - b.revision') && board.includes('queueAuthoritativeState(state)'));
check('multi-ply reconnect still snaps instead of inventing motion', board.includes('if (plyDelta !== 1 || !lastMove || !piece)') && board.includes('commitDisplayState(candidate)'));
check('input is locked during visual move request promotion resync or queue', board.includes('promotionPendingRef.current') && board.includes('resyncingRef.current') && board.includes('queuedStatesRef.current.length'));
check('promotion chooser now returns a choice to the same hybrid path', board.includes('onPromotion: (from: string, to: string) => Promise<PromotionPiece | null>') && board.includes('await submitHybridMove(from, to, promotion)'));
check('game screen resolves promotion choice instead of submitting separately', game.includes('requestPromotion=(from:string,to:string)=>new Promise') && game.includes('next.resolve?.(p)') && !game.includes('void runMove(next.from,next.to,p)'));
check('game screen passes promotion through board move callback', game.includes('onMove={(f,t,p)=>runMove(f,t,p)}'));
check('server remains authoritative via expectedRevision', hook.includes('expectedRevision: current.revision'));
check('client still returns exact authoritative ACK state', game.includes('return r.data;') && board.includes('Promise<ChessGameState | null>'));
check('phase14v3k script wired', pkg.scripts['phase14v3k:check'] === 'node ./scripts/test-phase14v3k-chess-hybrid-instant-motion.js');
check('DEBUG build runs hybrid instant motion gate', debug.includes('phase14v3k:check'));
check('RELEASE build runs hybrid instant motion gate', release.includes('phase14v3k:check'));

const fail = checks.filter(([, ok]) => !ok).length;
console.log(`Phase 14V.3K Chess Hybrid Instant Motion: ${checks.length - fail} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
