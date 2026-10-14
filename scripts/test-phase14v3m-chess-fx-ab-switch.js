const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, ok) => { checks.push([name, !!ok]); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); };

const screen = read('src/app/(chess)/chess-game/[gameId].tsx');
const board = read('src/components/chess/ChessBoard.tsx');
const fx = read('src/components/chess/ChessBattleEffects.tsx');
const pkg = JSON.parse(read('package.json'));
const debug = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const release = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('FX A/B switch defaults OFF', screen.includes('const[fxEnabled,setFxEnabled]=useState(false)'));
check('FX switch is binary and accessible', screen.includes('accessibilityRole="switch"') && screen.includes('accessibilityState={{checked:fxEnabled}}') && screen.includes('setFxEnabled(current=>!current)'));
check('test chip clearly exposes ON/OFF state', screen.includes('FX: {fxEnabled?"BẬT":"TẮT"} · chạm để test'));
check('FX component is not mounted while OFF', screen.includes('{fxEnabled?<ChessBattleEffects event={visibleBattleEvent} mode="full"/>:null}'));
check('battle event derivation is bypassed while OFF', screen.includes('if(!fxEnabled){setBattleEvent(null);return;}const nextEvent=deriveChessBattleEvent'));
check('previous realtime state still advances while FX is OFF', screen.includes('const previous=previousStateRef.current;previousStateRef.current=state;if(!fxEnabled)'));
check('toggling switch clears pending FX immediately', screen.includes('onPress={()=>{setBattleEvent(null);setFxEnabled(current=>!current);}}'));
check('visual event gate also requires FX enabled', screen.includes('const visibleBattleEvent=fxEnabled&&!boardMoving'));
check('board motion implementation remains hybrid instant', board.includes('const submitHybridMove = async') && board.includes('startSlide({'));
check('legacy rollback remains absent', !board.includes('ROLLBACK_ANIMATION_MS') && !board.includes('rollbackVisualMove'));
check('frame-paced FX implementation remains available when ON', fx.includes('renderToHardwareTextureAndroid') && fx.includes('if (!event || mode === "off")'));
check('phase14v3m package script wired', pkg.scripts['phase14v3m:check'] === 'node ./scripts/test-phase14v3m-chess-fx-ab-switch.js');
check('DEBUG build runs FX A/B gate', debug.includes('phase14v3m:check'));
check('RELEASE build runs FX A/B gate', release.includes('phase14v3m:check'));

const fail = checks.filter(([, ok]) => !ok).length;
console.log(`Phase 14V.3M Chess FX A/B Switch: ${checks.length - fail} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
