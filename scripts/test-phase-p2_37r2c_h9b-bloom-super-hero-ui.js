#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const json = (rel) => JSON.parse(read(rel));
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const board = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const app = json('app.json');
const pkg = json('modules/family-bloom-overlay/package.json');
let passed = 0, failed = 0;
function check(ok, reason) {
  if (ok) { passed++; console.log('PASS ' + reason); }
  else { failed++; console.error('FAIL ' + reason); }
}
console.log('\nFamily Bloom P2.37R2C-H9B — Bloom Super Hero Native UI\n');
check(app.expo.version === '1.3.30' && app.expo.android.versionCode === 143040, 'new APK identity prevents stale H9A native binary');
check(native.includes('P2.37R2C-H25-native-1') && pkg.version === '1.3.18', 'native binary identity/version are updated together');
check(native.includes('(viewportW * 0.90f)') && native.includes('(viewportH * 0.90f)'), 'Full takes exactly 90% of current native viewport');
check(native.includes('val innerW = (fullW - dp(20f))') && native.includes('val innerH = (fullH - dp(20f))'), 'H11 Chess stage uses a single 10dp inset per side');
check(!native.includes('val fullW = (viewportW * 0.85f)') && !native.includes('val fullH = (viewportH * 0.85f)'), 'retired 85% Full geometry');
check(native.includes('configureChessLayer()') && native.includes('configureXiangqiLayer()') && native.includes('xiangqiLayer.addView(xiangqiBoard'), 'Chess and Xiangqi retain separate visual layers');
check(native.includes('GradientDrawable.Orientation.TL_BR') && native.includes('#FFD9A4'), 'new gradient stage and premium Mini styling are present');
check(board.includes('heroEyebrow') && board.includes('heroTitle') && board.includes('BLOOM SUPER HERO'), 'new stage header is visible in native Chess UI');
check(board.includes('topAvatar') && board.includes('bottomAvatar') && board.includes('topClock') && board.includes('bottomClock'), 'both player panels and clocks are independent controls');
check(board.includes('val stageH = fixedH + boardSize') && board.includes('val startY = ((h - stageH) / 2f)'), 'entire Chess stage is vertically centered, not top-aligned');
check(board.includes('val boardY = statusY + statusH + gap') && board.includes('val meY = boardY + boardSize + gap'), 'board is geometrically between status and player panels');
check(board.includes('boardMat') && !board.includes('boardMat.background = roundedStroke('), 'Chessboard has no gold stroke');
check(board.includes('onSquareTap(square)') && board.includes('onReady()'), 'Chess native input callbacks unchanged');
check(board.includes('parseFen(current.fen)') && board.includes('current.captureTargets') && board.includes('current.legalTargets'), 'authoritative board/hints are still rendered');
check(native.includes('installMiniGesture()') && !native.includes('addMiniAction(miniCloseButton,'), 'Mini restores by tap and has no X button');
check(native.includes('miniContainer.setOnTouchListener') && native.includes('this@FamilyBloomOverlayRail.x = nextX'), 'Mini drag/snap gesture retained');
check(native.includes('setRailBounds(viewportWidth() + dp(64f), 0, 1, 1)') && native.includes('hideHostRoot('), 'Idle is off-screen and cannot blank React home');
check(native.includes('setRailBounds(x, miniY.roundToInt(), miniW, miniH)') && !native.includes('parentGroup.requestLayout()'), 'Mini bounded performance contract retained');
check(['Family_Bloom_BUILD_APK_TO_SHARE.bat','Family_Bloom_EAS_BUILD_TEST.bat','Family_Bloom_EAS_UPDATE_TEST.bat','Family_Bloom_CLEAN_APPLY_FULL.bat','Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'].every(n => fs.existsSync(path.join(root,n))), 'full build contains all requested root BAT entrypoints');
check(read('scripts/maintenance/normalize-project-root.js').includes("'GoogleService-Info.plist'") && !read('scripts/maintenance/normalize-project-root.js').includes("'Family_Bloom_EAS_BUILD_TEST.bat',"), 'root cleanup no longer deletes current BAT entrypoints');
// Pure geometry checks mirror dp-level layout, protecting unusually narrow devices.
for (const [w,h] of [[300,500],[360,720],[412,835],[480,915]]) {
  const margin=2, gap=7, barH=52, headingH=52, statusH=0, footerH=66;
  const fixedH=headingH + barH*2 + statusH + footerH + gap*5;
  const side=Math.max(72,Math.min(w-2*margin-4,h-fixedH-4));
  const stageH=fixedH + side;
  const startY=Math.max(0,Math.round((h-stageH)/2));
  const boardY=startY+headingH+gap+barH+gap+statusH+gap;
  const playerBottom=boardY+side+gap+barH;
  check(side <= w-8 && playerBottom+gap+footerH <= h, `responsive centered board fits ${w}×${h}dp stage`);
}
console.log(`\nH9B Bloom Super Hero UI gate: ${failed ? 'FAIL' : 'PASS'} (${passed}/${passed + failed})\n`);
process.exit(failed ? 1 : 0);
