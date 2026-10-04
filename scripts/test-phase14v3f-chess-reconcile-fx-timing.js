const fs = require('fs');
const path = require('path');
const read = p => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
let pass = 0, fail = 0;
const check = (name, cond) => { if (cond) { console.log('PASS', name); pass++; } else { console.log('FAIL', name); fail++; } };

const hook = read('src/hooks/chess/useChessGame.ts');
const game = read('src/app/chess-game/[gameId].tsx');
const fx = read('src/components/chess/ChessBattleEffects.tsx');
const board = read('src/components/chess/ChessBoard.tsx');

check('game state has one monotonic commit gate', hook.includes('const commitState = useCallback'));
check('stale revisions are ignored', hook.includes('next.revision < current.revision') && hook.includes('state:ignored-stale'));
check('same revision conflicting FEN is ignored', hook.includes('next.revision === current.revision') && hook.includes('next.fen !== current.fen'));
check('socket state goes through commit gate', hook.includes('commitState(next, "socket")'));
check('ACK state goes through commit gate', hook.includes('commitState(response.data, "ack")'));
check('rejoin and resync go through commit gate', hook.includes('commitState(response.data, "rejoin")') && hook.includes('commitState(response.data, "resync")'));
check('board animation remains native-driven under current motion contract', board.includes('useNativeDriver: true') && (board.includes('optimistic: true') || board.includes('moveRequestRef')));
check('battle events are queued instead of immediately replaced', game.includes('battleQueue') && game.includes('setBattleQueue'));
check('move-based FX waits until after piece animation', game.includes('const delayMs=moveAdvanced?280:140'));
check('battle FX exposes completion callback for queue progression', fx.includes('onComplete?: () => void') && fx.includes('onComplete?.()'));
check('capture FX stays visible long enough to read', fx.includes('event.intensity === "active" ? 1450 : 1100'));
check('dramatic and finale FX are intentionally longer', fx.includes('"dramatic" ? 1850') && fx.includes('"finale" ? 2600'));

console.log(`Phase 14V.3F Chess Reconcile + FX Timing: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
