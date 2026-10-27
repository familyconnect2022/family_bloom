#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H10R2 native contract + current R3R14 Thư Ngỏ UI contract. Do NOT lock to retired button text.
// This is a source-level guard; R3R14R1 runtime tests independently simulate touch/continue. On-device rendering still requires a native APK.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const board = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const welcome = read('src/components/onboarding/WelcomeModal.tsx');
const auth = read('src/context/AuthContext.tsx');
const layout = read('src/app/_layout.tsx');
let passed = 0, failed = 0;
function check(ok, label) {
  if (ok) { passed++; console.log('PASS '+label); }
  else { failed++; console.error('FAIL '+label); }
}
console.log('Family Bloom H10R2 | Native board Z-order + post-auth welcome guards');
check(board.includes('boardMat.elevation = 0f') && !/boardMat\.elevation\s*=\s*dp\(/.test(board), 'background mat does not cover 64 cells via positive native Z');
check(board.indexOf('addView(boardMat)') < board.indexOf('addView(board)') && board.indexOf('addView(boardMat)') >= 0, 'board draws after background mat');
check(board.includes('board.addView(cell)') && board.includes('pieces[square] = piece') && board.includes('image?.setImageResource(pieceDrawable(piece))'), 'all 64 cells retain native PNG drawable mapping');
check(board.includes('paintedCells[square] != paintKey') && board.includes('paintedCells.clear()'), 'dirty-square cache is invalidated on layout/orientation');
check(board.includes('promotionBackdrop.bringToFront()') && board.includes('buildPromotionPicker()'), 'promotion controls retain the front drawing plane');
for (const piece of ['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp']) {
  const file = path.join(root, 'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi', piece+'.png');
  check(fs.existsSync(file) && fs.readFileSync(file).subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'native piece drawable '+piece+' is valid PNG');
}
check(welcome.includes('useWindowDimensions()') && welcome.includes('const sceneSize = { width, height }') && welcome.includes('styles.overlay, sceneSize') && welcome.includes('StyleSheet.absoluteFillObject'), 'Thư Ngỏ overlay is bounded to the current device window during auth transition');
check(welcome.includes('StyleSheet.absoluteFillObject') && welcome.includes('accessibilityViewIsModal') && !welcome.includes('<Modal'), 'in-tree welcome retained to protect H4 zero-height navigation regression');
check(welcome.includes('onPress={openLetter}') && welcome.includes('onPress={continueIntoFamily}') && welcome.includes('title="Bước vào mái nhà Family Bloom"') && welcome.includes('testID="welcome-envelope-open"'), 'Thư Ngỏ opens on tap and retains a working, explicitly dismissible reading state');
check(auth.includes('if (profile?.activeFamilyId) setShowWelcome(true)') && auth.includes('setShowWelcome(false)'), 'welcome remains intentional per sign-in, not every app restore');
check(layout.includes('visible={showWelcome && firstVisualReady && !!user && !!activeFamilyId}'), 'greeting deferred until first auth navigation paint');
console.log(`H10R2 guard: ${failed ? 'FAIL' : 'PASS'} (${passed}/${passed+failed})`);
process.exit(failed ? 1 : 0);
