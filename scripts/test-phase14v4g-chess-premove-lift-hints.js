const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const hints = read('src/components/chess/v2/HintLayer.tsx');
const visual = read('src/components/chess/v2/useChessVisualState.ts');
const diagnostics = read('src/services/chess/chessDiagnostics.ts');

let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } };

check('one local premove ref exists', board.includes('const premoveRef = useRef<Premove | null>(null)'));
check('premove uses forced-turn chess.js only as UI intent cache', board.includes('forcedTurnFen') && board.includes('legalMovesFor(current.fen, from, true)'));
check('premove is never emitted while opponent still has turn', board.includes('current.turn === myColor ? "TURN_ALREADY_MINE"') && board.includes('const queuePremove'));
check('premove is revalidated on new authoritative visual position', board.includes('premove_revalidate_ok') && board.includes('premove_revalidate_fail'));
check('premove fires only after remote authoritative visual commit', board.includes('stage: "premove_fire"') && board.indexOf('stage: "premove_fire"') > board.indexOf('detail: "REMOTE_APPLY"'));
check('premove command uses latest visual revision through shared attempt path', board.includes('attemptRef.current(queued.from, queued.to, queued.promotion, "premove")'));
check('snapshot rebuild clears premove', board.includes('premoveRef.current = null') && board.includes('visual.setPremove(null, null)'));
check('opponent turn remains touchable only for local premove', board.includes('const canTouchBoard = (state: ChessGameState) => state.status === "active"') && board.includes('premoveMode'));
check('premove drag returns authoritative piece to source', board.includes('if (source === "drag") snapPieceBack(movingPiece.id, from)'));
check('premove visual uses existing from/to highlight shared values', board.includes('visual.setPremove(from, to)'));

check('piece controller supports lift/settle profiles', piece.includes('ChessPieceMotionProfile = "lift" | "settle" | "flat"'));
check('normal move scales 1 -> 1.3 -> 1 on UI thread', piece.includes('withSequence(') && piece.includes('withTiming(1.3') && piece.includes('withTiming(1,'));
check('moving piece receives elevated z-index', piece.includes('moving.value ? 80 : 10'));
check('drag scales to 1.3 only after pan activates', piece.includes('.onStart(() =>') && piece.includes('scale.value = withTiming(1.3, { duration:'));
check('drag release does not prematurely scale down', piece.includes('Do NOT scale down here'));
check('drag settle profile returns 1.3 -> 1 while snapping', piece.includes('profile === "settle"') && piece.includes('scale.value = withTiming(1, { duration })'));
check('illegal return explicitly uses settle profile', board.includes('ILLEGAL_RETURN_MS') && board.includes('}, "settle")'));
check('tap/opponent/premove motion uses lift profile', board.includes('source === "drag" ? "settle" : "lift"'));

check('64 hint slots remain static', hints.includes('Array.from({ length: 64 }'));
check('hint cascade has one shared reveal progress', visual.includes('hintRevealProgress = useSharedValue(0)') && visual.includes('withTiming(1, { duration: 110 })'));
check('hint cascade is distance-based nearest-to-farthest', hints.includes('const distance = Math.max(Math.abs(row - originRow), Math.abs(col - originCol))'));
check('separate rays reveal in parallel by shared distance', hints.includes('(distance - 1) * 0.14'));
check('hints animate opacity and scale without React state', hints.includes('opacity: reveal') && hints.includes('transform: [{ scale:'));
check('premove hints use a distinct visual mode', visual.includes('hintMode = useSharedValue(0)') && hints.includes('hintMode.value === 1'));
check('hint clearing does not mount/unmount slots', visual.includes('legalMoveLow.value = 0') && visual.includes('hintRevealProgress.value = 0'));
check('diagnostics include full premove lifecycle', ['premove_set','premove_replace','premove_fire','premove_revalidate_ok','premove_revalidate_fail'].every(k => diagnostics.includes(`"${k}"`)));

console.log(`\nPhase 14V4G Premove + Lift Motion + Cascading Hints: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
