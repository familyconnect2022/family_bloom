#!/usr/bin/env node
'use strict';
// H22R6 source/wire-ownership release guard; APK runtime requires Android device.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const native = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
const gate = read('src/components/games/XiangqiChallengeGate.tsx');
const controller = read('src/services/games/nativeXiangqiGameplayController.ts');
const nativeModule = read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
let passed=0;
function test(label, condition) {
  assert(condition, label); ++passed; console.log('PASS',label);
}
test('H22R8 piece radius = H22R7 radius × 110%', native.includes('val radius=cell*.47025f') && Math.abs(.4275*1.1-.47025)<.000001);
test('PNG crop retained; board geometry and touch coordinates stay unchanged', native.includes('val src=Rect(') && native.includes('toScreen(col:Int,row:Int') && native.includes('onSquareTap(if(flip)8-colOnBoard'));
test('Xiangqi native hub owns top/bottom avatars and clocks', native.includes('drawBloomHub(c,s,contentW,boardTop,boardBottom,me,enemy)') && native.includes('"Đang tới lượt"') && native.includes('"Bạn"') && native.includes('clock(timeLeft(s,side))'));
test('active clock gets legible contrasting foreground, waiting clocks stationary', native.includes('if(active)Color.WHITE') && native.includes('s.status=="active" && s.turn==side') && native.includes('if(s.status=="active"&&s.turn==side)'));
test('server-only single ply animates with verified stable piece id', native.includes('next.revision != old.revision + 1') && native.includes('old.pieces.singleOrNull') && native.includes('after.color != moved.color') && native.includes('moveSpriteId = moved.id'));
test('resync, selection and stale frames cannot replay movement', native.includes('next.revision != state?.revision') && native.includes('next.renderSequence<lastRenderSeq') && native.includes('next.pieces == old.pieces'));
test('native easing runs only for verified 205ms movement', native.includes('moveDurationMs = 205L') && native.includes('val smooth=t*t*(3f-2f*t)') && native.includes('postInvalidateOnAnimation()'));
test('sound is linked to the same authoritative token as board bind', native.includes('next.soundToken!=lastSoundToken') && native.includes('playCue(next.soundCue)') && controller.includes('state = {') && controller.includes('cue("move-check")'));
test('SoundPool preloads all primary cues and does not require JS audio on every frame', native.includes('pool.setOnLoadCompleteListener') && native.includes('"capture" to R.raw.fb_board_capture') && native.includes('"move-opponent" to R.raw.fb_board_move_opponent') && !native.includes('onSquareTap("sound"'));
test('preparation uses pale veil, centered Bloom panel and countdown', native.includes('drawBloomPreparation(c,s,contentW,contentH)') && native.includes('CHUẨN BỊ VÁN CỜ') && native.includes('waitingRemainingMs') && native.includes('#E8FFF8FC'));
test('pending bot setup has a warm preparation panel, not blank screen', native.includes('drawConnectingBloom(c,contentW,contentH)') && native.includes('CỜ TƯỚNG SUPER BLOOM'));
test('result overlay uses a pale Bloom veil rather than black scrim', native.includes('drawBloomResult(c,s,contentW,contentH)') && native.includes('#DFFCF1F8') && !native.includes('#BB331D14'));
test('victory, draw and defeat have three distinct palettes', native.includes('#FFF9DF') && native.includes('#E8FAFF') && native.includes('#F1F8EC') && native.includes('NHÀ VÔ ĐỊCH BLOOM!') && native.includes('MỘT VÁN CỜ ĐẸP!') && native.includes('MỘT BƯỚC TIẾN MỚI'));
test('result acknowledgment only happens after touching the actual CTA', native.includes('y in buttonTop..(buttonTop+dp(49f))') && native.includes('onAction("resultAck",s.gameId)'));
test('inviter still has 60 second cancellation and invitee has accept/reject', gate.includes('Hủy lời mời') && gate.includes('act("cancel")') && gate.includes('act("reject")') && gate.includes('act("accept")') && gate.includes('remaining / 60 * 100'));
test('invite modal uses rose Super Bloom aesthetic instead of dark brown veil', gate.includes('rgba(255,240,249,.83)') && gate.includes('#FFFAFC') && gate.includes('BLOOM ARENA · CỜ TƯỚNG'));
test('Xiangqi retains its own renderer, state, and event path without importing Chess', !native.includes('ChessNativeBoardView') && !controller.includes('chessSocketService') && nativeModule.includes('onXiangqiAction'));
test('H22R6 Android build identity unique and guarded', JSON.parse(read('app.json')).expo.android.versionCode === 143039 && nativeModule.includes('P2.37R2C-H25-native-1') && read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat').includes('test-h22r6-xiangqi-bloom-motion.cjs'));
console.log(`H22R6 Xiangqi visual/motion/sound release gate: ${passed}/${passed} PASS`);
