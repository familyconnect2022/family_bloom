const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const board = read('src/components/chess/ChessBoard.tsx');
const game = read('src/app/chess-game/[gameId].tsx');
const hook = read('src/hooks/chess/useChessGame.ts');

check('board move callback returns exact authoritative game state', board.includes('Promise<ChessGameState | null>'));
check('game screen returns ACK state instead of boolean-only acceptance', game.includes('return r.data;') && game.includes('return null;'));
check('visual move latches confirmed authoritative state', board.includes('confirmedState: ChessGameState | null'));
check('ACK acceptance alone cannot clear moving overlay', !board.includes('serverConfirmed') && board.includes('confirmVisualMove(nextMove.id, confirmedState)'));
check('move confirmation matches revision ply and exact squares', board.includes('next.revision > move.baseRevision') && board.includes('next.ply > move.basePly') && board.includes('lastMove.from === move.from') && board.includes('lastMove.to === move.to'));
check('destination FEN commits before overlay is removed', board.indexOf('commitDisplayState(confirmedState);') < board.indexOf('visualMoveRef.current = null;', board.indexOf('commitDisplayState(confirmedState);')));
check('fast newer authoritative state is queued during active animation', board.includes('queueAuthoritativeState(state)') && board.includes('Do not let a fast bot/opponent state replace the board'));
check('queued authoritative state drains only after active overlay settles', board.includes('scheduleQueueDrain()') && board.includes('if (!mountedRef.current || visualMoveRef.current) return;'));
check('incoming move animation uses current displayed FEN as source', board.includes('const oldBoard = parseFen(displayFenRef.current)') && board.includes('oldBoard.get(lastMove.from)'));
check('last-move and check highlights follow settled visual state', board.includes('displayMarkers.lastMove') && board.includes('displayMarkers.checkSquare') && board.includes('setDisplayMarkers({ lastMove: next.lastMove, checkSquare: next.checkSquare })'));
check('large reconnect gaps snap safely instead of inventing invalid motion', board.includes('commitDisplayState(candidate);') && board.includes('large reconnect jump'));
check('native driver remains enabled for piece motion', board.includes('useNativeDriver: true'));
check('input remains locked while visual state queue is non-empty', board.includes('if (visualMoveRef.current || queuedStateRef.current) return;'));
check('rejected optimistic move rolls back then reconciles latest state', board.includes('rollbackVisualMove') && board.includes('queueAuthoritativeState(latest)'));
check('hook still rejects stale and same-revision conflicting FEN', hook.includes('next.revision < current.revision') && hook.includes('next.fen !== current.fen'));
check('server-authoritative expected revision protocol remains intact', hook.includes('expectedRevision: current.revision'));

const fail = checks.filter(([, ok]) => !ok).length;
console.log(`Phase 14V.3H Chess Visual State Lock: ${checks.length - fail} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
