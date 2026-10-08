const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let passed = 0, failed = 0;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const has = (text, regex) => regex.test(text);
function ok(name, condition, detail = '') {
  if (condition) { passed += 1; console.log(`PASS ${String(passed).padStart(2, '0')} - ${name}`); }
  else { failed += 1; console.error(`FAIL -- ${name}${detail ? `: ${detail}` : ''}`); }
}
function syntax(rel) {
  const source = read(rel);
  const out = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
    reportDiagnostics: true,
    fileName: path.basename(rel),
  });
  return (out.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error);
}

const modal = read('src/components/chess/BloomGameBottomModal.tsx');
const chessScreen = read('src/app/(chess)/chess-game/[gameId].tsx');
const xiangqiScreen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const xiangqiBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const interaction = read('src/components/chess/v2/InteractionLayer.tsx');
const chessPiece = read('src/components/chess/v2/ChessPiece.tsx');
const familyGraph = read('src/components/familyGraph/FamilyGraphPrototype.tsx');
const pkg = read('package.json');
const currentGate = read('scripts/test-chess-current-build-gates.js');
const preCopy = read('Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat');
const postCopy = read('Family_Bloom_CLEAN_APPLY_FULL.bat');
const gitignore = read('.gitignore');

ok('Blurred Bloom game modal owns no native surface', has(modal, /if \(suspended \|\| !mounted/));
ok('Non-kept hidden Bloom game modal returns null immediately', has(modal, /\(!visible && !keepMounted\)/));
ok('Chess no longer keeps ready/promotion overlays mounted after hide', !has(chessScreen, /\bkeepMounted\b/));
ok('Xiangqi no longer keeps ready overlay mounted after hide', !has(xiangqiScreen, /\bkeepMounted\b/));

ok('Xiangqi staged paint is explicitly initial-only', has(xiangqiBoard, /initialPaintCompleteRef/) && has(xiangqiBoard, /Stage ONLY the first native image paint/));
ok('Xiangqi capture count no longer restarts 8-18-26 staging', !has(xiangqiBoard, /useEffect\(\(\) => \{[\s\S]{0,900}\}, \[pieces\.length\]\);[\s\S]{0,120}requestAnimationFrame/));
ok('Xiangqi live captures update render count directly after initial paint', has(xiangqiBoard, /if \(initialPaintCompleteRef\.current\) setPieceRenderCount\(pieces\.length\)/));
ok('Xiangqi tap recognizer explicitly runs on JS', has(xiangqiBoard, /Gesture\.Tap\(\)[\s\S]{0,180}\.runOnJS\(true\)/));
ok('Chess board tap recognizer explicitly runs on JS', has(interaction, /Gesture\.Tap\(\)[\s\S]{0,320}\.runOnJS\(true\)/));
ok('Chess tap path no longer wraps JS callback with runOnJS', !has(interaction, /runOnJS\(onTapAt\)/));
ok('Xiangqi tap path no longer wraps JS callback with runOnJS', !has(xiangqiBoard, /runOnJS\(handleBoardTap\)/));

ok('Chess piece nodes are visual-only and own no gesture callbacks', !has(chessPiece, /Gesture\.(Pan|Tap)\(/) && !has(chessPiece, /onDragStart|onDragCancel|onDrop/));
ok('Chess tap policy keeps one board-level JS tap recognizer', has(interaction, /Gesture\.Tap\(\)[\s\S]{0,320}\.runOnJS\(true\)/) && !has(interaction, /ChessBoardTapGestureContext/));

const graphWorklets = (familyGraph.match(/[\"']worklet[\"'];/g) || []).length;
ok('Family Graph pan/pinch callbacks are explicit UI worklets', graphWorklets >= 6, `worklets=${graphWorklets}`);
ok('Family Graph gestures remain UI-thread driven', !has(familyGraph, /Gesture\.(Pan|Pinch)\(\)[\s\S]{0,260}\.runOnJS\(true\)/));

ok('Family Bloom root gitignore is bundled', gitignore.length > 500 && has(gitignore, /\.env/) && has(gitignore, /android\//) && has(gitignore, /ios\//));
ok('Phase 16B18 package script exists', has(pkg, /"phase16b18:check"\s*:\s*"node \.\/scripts\/test-phase16b18-game-occlusion-gesture-flicker\.js"/));
ok('Current Chess aggregate includes Phase 16B18', has(currentGate, /test-phase16b18-game-occlusion-gesture-flicker\.js/));
ok('Copy-over scripts identify Phase 16B18', has(preCopy, /Phase 16B\.18/) && has(postCopy, /Phase 16B\.18/));
ok('Post-copy updater uses current aggregate without duplicate direct Phase 16B18 call', has(postCopy, /chess:current-check/) && !has(postCopy, /npm run phase16b18:check/));

const syntaxFiles = [
  'src/components/chess/BloomGameBottomModal.tsx',
  'src/app/(chess)/chess-game/[gameId].tsx',
  'src/app/(xiangqi)/xiangqi-preview.tsx',
  'src/components/xiangqi/XiangqiGameBoard.tsx',
  'src/components/chess/v2/InteractionLayer.tsx',
  'src/components/chess/v2/ChessPiece.tsx',
  'src/components/familyGraph/FamilyGraphPrototype.tsx',
];
const syntaxErrors = syntaxFiles.flatMap(rel => syntax(rel).map(diag => `${rel}: ${ts.flattenDiagnosticMessageText(diag.messageText, ' ')}`));
ok(`Phase 16B18 changed TypeScript/TSX syntax (${syntaxFiles.length} files)`, syntaxErrors.length === 0, syntaxErrors.slice(0, 5).join(' | '));

console.log(`\nPhase 16B18 game occlusion + gesture/flicker gate: ${passed}/${passed + failed} PASS`);
if (failed) process.exit(1);
