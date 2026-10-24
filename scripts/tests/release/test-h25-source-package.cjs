#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H25: detect incomplete FULL releases BEFORE backup/clean/update or publishing APK.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__legacyScriptsDir, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const manifest = JSON.parse(read('scripts/setup/bat-entrypoints-manifest.json'));
const required = [
  'package.json','app.json','app.config.js',
  'scripts/maintenance/auto-update-full.cjs',
  'scripts/tests/release/test-h25-firebase-invitation.cjs',
  'scripts/tests/release/test-h25r2r6r2-chess-ready-vm.cjs',
  'scripts/tests/release/test-h25r2r6r3r1-auto-update-ts-preflight.cjs',
  'scripts/android/build/resolve-build-target.cjs',
  'scripts/tests/release/test-h25r2r7r2r3r2-build-config-routing.cjs',
  'scripts/tests/release/test-h25r2r7-super-bloom-unified-ui.cjs',
  'src/components/ui/BloomActionCard.tsx',
  'scripts/tests/release/test-h25-runtime-claims.cjs',
  'scripts/tests/release/test-h25r2-xiangqi-black-turn-reconnect.cjs',
  'scripts/tests/release/test-h25r2r3-windows-npm-preflight.cjs',
  'scripts/tests/release/test-h25r2r1-build-share-regression.cjs',
  'server/src/games/firebaseInvitationMatch.ts',
  'src/services/games/firebaseBoardInvitations.ts',
  'src/components/games/FirebaseBoardInvitationGate.tsx',
  'modules/family-bloom-overlay/android/build.gradle',
  'modules/family-bloom-overlay/android/src/main/AndroidManifest.xml',
  'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt',
  'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt',
  'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessBoardOrientationPolicy.kt',
  'modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt',
  'modules/family-bloom-overlay/android/src/main/res/raw/fb_board_capture.mp3',
  'modules/family-bloom-overlay/android/src/main/res/raw/fb_board_game_start.mp3',
  'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wk.png',
  'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_general.png'
]
  .concat(manifest.batFiles)
  .concat(["modules/family-bloom-overlay/android/build.gradle", "modules/family-bloom-overlay/android/src/main/AndroidManifest.xml", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessPieceMotionPlanner.kt", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiBoardState.kt", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeXiangqiMiniState.kt", "modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bb.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bk.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bn.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bp.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/bq.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/br.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_advisor.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_cannon.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_chariot.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_elephant.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_general.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_horse.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_black_soldier.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_advisor.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_cannon.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_chariot.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_elephant.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_general.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_horse.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/fb_xiangqi_red_soldier.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wb.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wk.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wn.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wp.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wq.png", "modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wr.png", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_capture.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_castle.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_game_end.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_game_start.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_illegal.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_move_check.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_move_opponent.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_move_self.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_premove.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_promote.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/fb_board_tenseconds.mp3", "modules/family-bloom-overlay/android/src/main/res/raw/keep.xml"]);
const missing = required.filter(f => !fs.statSync(path.join(root,f), {throwIfNoEntry:false})?.isFile());
if(missing.length){console.error('[H25 RELEASE INCOMPLETE] '+missing.length+' file(s) missing:\n'+missing.join('\n'));process.exit(1);}
const k = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const eas = read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
const share = read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const app = JSON.parse(read('app.json')).expo;
if(app.version !== '1.3.32' || app.android.versionCode !== 143042 ||
   !k.includes('P2.37R2C-H25-native-3') ||
   !eas.includes('P2.37R2C-H25-native-3') || !eas.includes('143042') ||
   !share.includes('test-h25-firebase-invitation.cjs') || !share.includes('143042')){
  console.error('[H25 RELEASE INCOMPLETE] Artifact identity or H25 build gate mismatch');process.exit(1);
}
console.log('[H25 SOURCE PACKAGE PASS]',required.length,'required files, app 1.3.32 / 143042 / H25 native identity');
