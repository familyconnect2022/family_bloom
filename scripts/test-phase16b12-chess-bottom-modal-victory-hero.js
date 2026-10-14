const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let pass = 0, fail = 0;
function check(name, ok) { if (ok) { pass++; console.log('PASS', name); } else { fail++; console.error('FAIL', name); } }

const game = read('src/app/(chess)/chess-game/[gameId].tsx');
const modal = read('src/components/chess/BloomGameBottomModal.tsx');
const confetti = read('src/components/chess/ChessVictoryConfetti.tsx');
const xiangqi = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const debugBat = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBat = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('Chess win hero returns to deep Bloom pink', (game.includes('hero: "#C43C72"') || game.includes('hero: "#D56591"')) && (game.includes('primary: "#B93467"') || game.includes('primary: "#C94F7D"')));
check('Chess win result keeps trophy and explicit victory badge', game.includes('didWin ? "trophy"') && game.includes('"CHIẾN THẮNG"'));
check('Chess win hero mounts upward confetti burst', (game.includes('<ChessVictoryConfetti active={didWin &&') || game.includes('<ChessVictoryConfetti active={screenFocused && didWin &&')) && confetti.includes('translateY') && (confetti.includes('outputRange: [96, -150]') || confetti.includes('96 - 246 * value')));
check('Win loss draw remain visually distinct', (game.includes('hero: "#C43C72"') || game.includes('hero: "#D56591"')) && game.includes('hero: "#6D5361"') && game.includes('hero: "#8B667A"'));

check('Promotion is no longer rendered inside board stage overlay', !game.includes('styles.boardLocalOverlay') && (game.includes('visible={!!promotion}') || game.includes('visible={screenFocused && !!promotion}')));
check('Promotion uses root Bloom bottom modal', game.includes('<BloomGameBottomModal') && game.includes('eyebrow="PHONG QUÂN"') && game.includes('title="Chọn quân mới"'));
check('Promotion chooser still uses real piece assets and resolves authoritative choice', game.includes('PROMOTION_IMAGES[myColor][piece]') && game.includes('next?.resolve?.(piece)'));

check('New-game lifecycle exposes preparing ready playing phases', game.includes('type ChessEntryPhase = "preparing" | "ready" | "playing"') && game.includes('setEntryPhase("ready")') && game.includes('setEntryPhase("playing")'));
check('Ready copy identifies White first and player color', game.includes('Sẵn sàng • Trắng đi trước') && game.includes('Bạn cầm quân'));
check('Lifecycle uses same root bottom modal and blocks board interactions', (game.includes('visible={gameFlowVisible && !promotion}') || game.includes('visible={screenFocused && gameFlowVisible && !promotion}')) && modal.includes('pointerEvents={visible ? "auto" : "none"}') && modal.includes('StyleSheet.absoluteFillObject'));

check('Bottom modal slides from screen bottom', /translateY\.value\s*=\s*\d+/.test(modal) && /translateY\.value\s*=\s*with(?:Spring|Timing)\(0/.test(modal) && modal.includes('justifyContent: "flex-end"'));
check('Bottom modal combines scale and slide motion', modal.includes('transform: [{ translateY: translateY.value }, { scale: scale.value }]') && /scale\.value\s*=\s*with(?:Spring|Timing)\(1/.test(modal));
check('Bottom modal has full-screen dim backdrop', modal.includes('StyleSheet.absoluteFillObject') && modal.includes('rgba(50,22,35,0.56)'));
check('Bottom modal uses Bloom Supper hero treatment', modal.includes('backgroundColor: "#C43C72"') && modal.includes('heroBubbleLarge') && modal.includes('heroPetalOne') && modal.includes('borderTopLeftRadius: 34'));
check('Bottom modal respects navigation safe area', modal.includes('useSafeAreaInsets') && modal.includes('Math.max(insets.bottom, 12)'));

check('Xiangqi preparation no longer renders a card over the board', !xiangqi.includes('styles.phaseOverlay') && !xiangqi.includes('styles.phaseCard'));
check('Xiangqi preparing and ready lifecycle uses the shared Bloom bottom modal', xiangqi.includes('<BloomGameBottomModal') && (xiangqi.includes('visible={!playing && !game.gameOver}') || xiangqi.includes('visible={screenFocused && !playing && !game.gameOver}')) && xiangqi.includes('BLOOM ĐANG CHUẨN BỊ') && xiangqi.includes('BLOOM READY'));
check('Xiangqi ready modal clearly preserves Red-first rule', xiangqi.includes('Sẵn sàng • Đỏ đi trước') && xiangqi.includes('Bàn cờ sẵn sàng • Đỏ đi trước'));
check('Xiangqi modal blocks board until playing phase', (xiangqi.includes('if (roundPhase !== "playing" || game.gameOver') || xiangqi.includes('if (!screenFocused || roundPhase !== "playing" || game.gameOver')) && (xiangqi.includes('visible={!playing && !game.gameOver}') || xiangqi.includes('visible={screenFocused && !playing && !game.gameOver}')));
check('Xiangqi bottom modal exposes loading then ready affordance', xiangqi.includes('<ActivityIndicator size="small"') && xiangqi.includes('checkmark-circle'));

check('Copy-over cleanup BAT remains bundled', preCopy.includes('PRE-COPY CLEAN') && postCopy.includes('CLEAN APPLY FULL'));
check('Post-copy updater runs Phase 16B12 gate', (postCopy.includes('phase16b12:check') || postCopy.includes('phase16b13:check') || postCopy.includes('chess:current-check')));
check('Android Debug build runs Phase 16B12 gate', (debugBat.includes('phase16b12:check') || debugBat.includes('phase16b13:check') || debugBat.includes('chess:current-check')));
check('Android Release build runs Phase 16B12 gate', (releaseBat.includes('phase16b12:check') || releaseBat.includes('phase16b13:check') || releaseBat.includes('chess:current-check')));

for (const [file, source] of [
  ['chess game', game],
  ['bottom modal', modal],
  ['victory confetti', confetti],
  ['xiangqi preview', xiangqi],
]) {
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
    reportDiagnostics: true,
    fileName: `${file}.tsx`,
  });
  check(`${file} transpiles without syntax diagnostics`, !(out.diagnostics || []).length);
}

console.log(`\nPhase 16B.12 Game Bottom Modal + Victory Hero: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
