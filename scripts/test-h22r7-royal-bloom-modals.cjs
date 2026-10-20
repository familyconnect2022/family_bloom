#!/usr/bin/env node
'use strict';
// H22R7 source-level contract. Native compile and screenshot verification still required.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const chess=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const xiangqi=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
const chessGate=read('src/components/games/ChessChallengeGate.tsx');
const xiangqiGate=read('src/components/games/XiangqiChallengeGate.tsx');
const nativeModule=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
const app=JSON.parse(read('app.json'));
let count=0;
function check(message,value){assert(value,message);console.log('PASS',message);count++;}
const chessImg='assets/images/chess/pieces-png-default/wk.png';
const xqImg='assets/xiangqi/red_general_modal.png';
check('native king assets available',fs.existsSync(path.join(root,chessImg))&&fs.existsSync(path.join(root,xqImg))&&fs.existsSync(path.join(root,'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/wk.png')));
check('Chess invite uses real white king asset not queen glyph',chessGate.includes('require("../../../'+chessImg+'")') && !chessGate.includes('>♛</Text>'));
check('Xiangqi invite uses red General image',xiangqiGate.includes('require("../../../'+xqImg+'")') && !xiangqiGate.includes('<Text style={styles.symbol}>帥</Text>'));
for(const [name,source] of [['chess',chessGate],['xiangqi',xiangqiGate]]){
 check(`${name}: badge straddles panel rim 50/50 and will not clip`,source.includes('top: -55, left: 0, right: 0') && source.includes('alignItems: "center"') && source.includes('width: 110, height: 110') && source.includes('overflow: "visible"'));
 check(`${name}: invitation maintains both sides and server countdown`,source.includes('act("accept")') && source.includes('act("reject")') && source.includes('act("cancel")') && source.includes('remaining / 60 * 100'));
 check(`${name}: badge is decorative, no touch interference`,source.includes('pointerEvents="none"') && source.includes('kingBadge'));
}
check('Challenge surfaces still isolated by game socket',chessGate.includes('chessSocketService') && !chessGate.includes('xiangqiSocketService') && xiangqiGate.includes('xiangqiSocketService') && !xiangqiGate.includes('chessSocketService'));
check('Native Chess always renders King PNG via imageView',chess.includes('private val bloomEmblem = ImageView(context)') && chess.includes('bloomEmblem.setImageResource(R.drawable.wk)') && !chess.includes('bloomEmblem.text ='));
check('Native Chess King centers over panel top based on actual layout',chess.includes('bloomPanel.addOnLayoutChangeListener') && chess.includes('bloomEmblem.translationY = top.toFloat() - bloomBackdrop.height / 2f') && chess.includes('bloomBackdrop.clipChildren = false'));
check('Native Chess has king in result, waiting, draw/resign confirmation',chess.includes('"finished:${current.gameId}:${current.revision}"') && chess.includes('"waiting:${current.gameId}"') && chess.includes('"drawIncoming:${current.gameId}"') && chess.includes('"confirmResign"'));
check('Native Xiangqi king uses preloaded red_general PNG, half-overlapping canvas card',xiangqi.includes('pieceBitmaps["red_general"]') && (xiangqi.match(/drawBloomKing\(c,/g)||[]).length>=3 && xiangqi.includes('c.drawCircle(x,cardTop,r,paint)'));
check('Native Xiangqi all connecting, waiting, ready, result stages have King',xiangqi.includes('drawBloomKing(c,w/2f,top') && xiangqi.includes('drawBloomKing(c,center,top') && xiangqi.includes('drawBloomKing(c,x,top') && xiangqi.includes('SẴN SÀNG VÀO TRẬN'));
check('Xiangqi distinct victory/draw/loss colors and CTA retained',xiangqi.includes('#FFF9DF') && xiangqi.includes('#E8FAFF') && xiangqi.includes('#F1F8EC') && xiangqi.includes('onAction("resultAck",s.gameId)'));
check('Live game move logic unaffected by presentation badge',xiangqi.includes('moveDurationMs = 205L') && xiangqi.includes('val radius=cell*.47025f') && xiangqi.includes('next.soundToken!=lastSoundToken'));
check('Native APK identity is fresh and in sync',app.expo.version==='1.3.28' && app.expo.android.versionCode===143038 && nativeModule.includes('P2.37R2C-H23-native-1'));
for (const bat of ['scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat']) {
 const source=read(bat);
 check(`${path.basename(bat)} runs H22R7 gate before building`,source.includes('node scripts\\test-h22r7-royal-bloom-modals.cjs\r\nif errorlevel 1 goto :fail'));
}
console.log(`H22R7 royal Bloom modal checks: ${count}/${count} PASS`);
