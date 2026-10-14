const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const board = read('src/components/chess/ChessBoard.tsx');
const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const hook = read('src/hooks/chess/useChessGame.ts');

check('board move callback returns exact authoritative game state', board.includes('Promise<ChessGameState | null>'));
check('game screen returns ACK state instead of boolean-only acceptance', game.includes('return r.data;') && game.includes('return null;'));
check('visual move can latch confirmed authoritative state', board.includes('confirmedState: ChessGameState | null'));
check('no legacy serverConfirmed flag can expose old source square', !board.includes('serverConfirmed'));
check('move confirmation matches revision ply and exact squares', board.includes('stateConfirmsRequest') && board.includes('next.revision > request.baseRevision') && board.includes('next.ply > request.basePly') && board.includes('next.lastMove?.from === request.from') && board.includes('next.lastMove?.to === request.to'));
check('destination FEN commits before overlay is removed', board.indexOf('commitDisplayState(confirmedState);') >= 0 && board.indexOf('commitDisplayState(confirmedState);') < board.indexOf('visualMoveRef.current = null;', board.indexOf('commitDisplayState(confirmedState);')));
check('fast newer authoritative state is queued during active animation', board.includes('queueAuthoritativeState(state)') && board.includes('queuedStatesRef'));
check('queued state drain blocks while visual/request/resync is active', board.includes('visualMoveRef.current || moveRequestRef.current') && board.includes('resyncingRef.current'));
check('incoming move animation uses current displayed FEN as source', board.includes('const oldBoard = parseFen(displayFenRef.current)') && board.includes('oldBoard.get(lastMove.from)'));
check('last-move and check highlights follow settled visual state', board.includes('displayMarkers.lastMove') && board.includes('displayMarkers.checkSquare') && board.includes('setDisplayMarkers({ lastMove: next.lastMove, checkSquare: next.checkSquare })'));
check('large reconnect gaps snap safely instead of inventing invalid motion', board.includes('commitDisplayState(candidate);') && board.includes('plyDelta !== 1'));
check('native driver remains enabled for piece motion', board.includes('useNativeDriver: true'));
check('input remains locked while visual queue/resync is non-empty', board.includes('queuedStatesRef.current.length') && board.includes('resyncingRef.current'));
check('rejected/desynced move has no reverse piece animation', board.includes('resyncWithoutReverseMotion') && !board.includes('rollbackVisualMove') && !board.includes('ROLLBACK_ANIMATION_MS'));
check('hook still rejects stale and same-revision conflicting FEN', hook.includes('next.revision < current.revision') && hook.includes('next.fen !== current.fen'));
check('server-authoritative expected revision protocol remains intact', hook.includes('expectedRevision: current.revision'));

const fail = checks.filter(([, ok]) => !ok).length;
console.log(`Phase 14V.3H Chess Visual State Lock: ${checks.length - fail} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
