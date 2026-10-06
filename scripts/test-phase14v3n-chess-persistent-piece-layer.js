const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const board = read('src/components/chess/ChessBoard.tsx');
const screen = read('src/app/(chess)/chess-game/[gameId].tsx');
const pkg = JSON.parse(read('package.json'));
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

const settleStart = board.indexOf('const settleVisualMove =');
const settleEnd = board.indexOf('function startSlide', settleStart);
const settleBlock = settleStart >= 0 && settleEnd > settleStart ? board.slice(settleStart, settleEnd) : '';

check('64 board squares are memoized render nodes', board.includes('const BoardSquare = React.memo'));
check('piece sprites are separated into a memoized absolute layer', board.includes('const PieceSprite = React.memo') && board.includes('styles.pieceLayer'));
check('square pressables no longer own piece images', board.includes('<BoardSquare') && board.includes('<PieceSprite') && !board.slice(board.indexOf('const BoardSquare ='), board.indexOf('const PieceSprite =')).includes('<Image'));
check('moving piece layer remains mounted persistently', board.includes('PIECE_IMAGE_ENTRIES.map') && board.includes('styles.persistentMovingImage') && !board.includes('{visualMove ? ('));
check('all moving piece textures are already mounted before motion', board.includes('const PIECE_IMAGE_ENTRIES = Object.entries(PIECE_IMAGES)') && board.includes('PIECE_IMAGE_ENTRIES.map'));
check('motion begins one frame after persistent overlay state is committed', board.includes('setMovingVisible(true);') && board.includes('requestAnimationFrame(() =>') && board.indexOf('setMovingVisible(true);') < board.indexOf('Animated.timing(progress'));
check('piece motion remains native driver', board.includes('Animated.timing(progress') && board.includes('useNativeDriver: true'));
check('settle does not reset progress and flash overlay back to source', settleBlock.length > 0 && !settleBlock.includes('progress.setValue(0)'));
check('progress resets only while moving slot is hidden before a new move', board.includes('progress.setValue(0);') && board.indexOf('progress.setValue(0);') < board.indexOf('setMovingVisible(true);'));
check('destination FEN is staged before overlay release', board.includes('commitDisplayState(confirmedState);') && board.includes('finishSettledMove(move.id, confirmedState)') && board.indexOf('commitDisplayState(confirmedState);') < board.indexOf('finishSettledMove(move.id, confirmedState)'));
check('settle gives static layer two animation frames under overlay', settleBlock.match(/requestAnimationFrame\(\(\) =>/g)?.length >= 2);
check('persistent moving slot hides without clearing visual geometry', board.includes('setMovingVisible(false);') && !settleBlock.includes('setVisualMove(null)'));
check('FX-off observer callbacks cannot schedule parent state updates', screen.includes('if(fxEnabled)setBoardMovingState(moving)') && screen.includes('if(fxEnabled)setVisualRevisionState(revision)'));
check('FX observer prop names remain compatible', screen.includes('onMotionChange={setBoardMoving}') && screen.includes('onVisualRevisionChange={setVisualRevision}'));
check('hybrid instant motion remains active', board.includes('const submitHybridMove = async') && board.indexOf('startSlide({', board.indexOf('const submitHybridMove = async')) < board.indexOf('const confirmedState = await onMove', board.indexOf('const submitHybridMove = async')));
check('legacy reverse animation stays absent', !board.includes('ROLLBACK_ANIMATION_MS') && !board.includes('rollbackVisualMove'));
check('bot/realtime state queue remains revision ordered', board.includes('queue.sort((a, b) => a.revision - b.revision'));
check('phase14v3n package script wired', pkg.scripts['phase14v3n:check'] === 'node ./scripts/test-phase14v3n-chess-persistent-piece-layer.js');
check('DEBUG build runs persistent piece layer gate', debug.includes('phase14v3n:check'));
check('RELEASE build runs persistent piece layer gate', release.includes('phase14v3n:check'));

const fail = checks.filter(([, ok]) => !ok).length;
console.log(`Phase 14V.3N Chess Persistent Piece Layer: ${checks.length - fail} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
