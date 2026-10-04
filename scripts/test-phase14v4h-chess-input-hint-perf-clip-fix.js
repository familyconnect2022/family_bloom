const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const board = read('src/components/chess/ChessBoard.tsx');
const piece = read('src/components/chess/v2/ChessPiece.tsx');
const hints = read('src/components/chess/v2/HintLayer.tsx');
const screen = read('src/app/chess-game/[gameId].tsx');
const visual = read('src/components/chess/v2/useChessVisualState.ts');
let pass = 0, fail = 0;
const check = (name, ok) => { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } };

check('server authoritative move path preserved', board.includes('onMove(from, to, chosenPromotion, clientMoveId, current.revision)') && board.includes('applyChessMoveDelta'));
check('visual/network catchup gate preserved', board.includes('VISUAL_CATCHUP_LOCK') && board.includes('interactionStateRef'));
check('piece identity persistent layer preserved', board.includes('runtimeRef') && board.includes('controllersRef'));
check('premove still revalidates after authoritative opponent move', board.includes('premove_revalidate_ok') && board.includes('premove_fire'));

check('opponent pieces cannot win tap-vs-pan race with impossible drag', piece.includes('.enabled(owned)'));
check('pan threshold is less hair-trigger than V4G', piece.includes('.minDistance(8)'));
check('drag still lifts to 1.3 after pan activation', piece.includes('.onStart(() =>') && piece.includes('scale.value = withTiming(1.3, { duration: 90 })'));
check('same-square accidental drag recovers selection', board.includes('stage: "drag_tap_recovered"') && board.includes('resolved.target === runtime.square'));

check('normal lift duration exposes both 50 percent phases', board.includes('const MOVE_MS = 170') && piece.includes('Math.round(duration / 2)'));
check('normal move still scales 1 -> 1.3 -> 1', piece.includes('withSequence(') && piece.includes('withTiming(1.3') && piece.includes('withTiming(1,'));
check('drag settle remains 1.3 -> 1', piece.includes('profile === "settle"') && piece.includes('scale.value = withTiming(1, { duration })'));
check('moving/dragging piece retains elevated z index', piece.includes('dragAllowed.value ? 100 : moving.value ? 80 : 10'));

check('rounded clip split from shadow shell', board.includes('styles.boardShell') && board.includes('styles.boardClip') && board.includes('styles.boardBorder'));
check('dedicated inner clip uses rounded overflow hidden', board.includes('boardClip:{...StyleSheet.absoluteFillObject,borderRadius:18,overflow:"hidden"'));
check('outer shell no longer combines elevation with overflow hidden', !board.includes('boardShell:{alignSelf:"center",borderRadius:18,overflow:"hidden"'));

check('hint switch state exists and defaults on', screen.includes('const [hintsEnabled, setHintsEnabled] = useState(true)'));
check('hint switch unmounts HintLayer when off', board.includes('{hintsEnabled ? (') && board.includes('<HintLayer'));
check('hint switch skips reveal animation when off', board.includes('if (hintsEnabled) visual.revealHints') && board.includes('visual.hintRevealProgress.value = 0'));
check('screen exposes independent Hint and FX switches', screen.includes('Hint: {hintsEnabled ? "BẬT" : "TẮT"}') && screen.includes('FX: {fxEnabled ? "BẬT" : "TẮT"}'));

check('hint layer remains 64 static slots', hints.includes('Array.from({ length: 64 }'));
check('hint slot uses one animated style instead of dot+capture worklets', hints.includes('const hintStyle = useAnimatedStyle') && !hints.includes('const moveStyle = useAnimatedStyle') && !hints.includes('const captureStyle = useAnimatedStyle'));
check('hint slot uses one Animated.View', (hints.match(/<Animated\.View/g) || []).length === 1);
check('near-to-far cascade is preserved', hints.includes('(distance - 1) * 0.14') && visual.includes('withTiming(1, { duration: 110 })'));
check('quiet and capture hint visuals remain distinct', hints.includes('borderWidth: capture ? ringWidth : 0') && hints.includes('backgroundColor: capture'));

console.log(`\nPhase 14V4H Chess Input + Hint Perf + Clip Fix: ${pass}/${pass + fail} PASS`);
if (fail) process.exit(1);
