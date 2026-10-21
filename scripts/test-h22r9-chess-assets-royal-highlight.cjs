#!/usr/bin/env node
'use strict';
// H23 legacy Chess PNG restore (PNG header/hash) and H22R9 Xiangqi violet visual-source contract. APK pixel preview still needs a device.
const fs=require('node:fs'); const path=require('node:path'); const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'), read=p=>fs.readFileSync(path.join(root,p),'utf8');
const check=(message, truth)=>{ assert(truth,message); console.log('PASS',message); };
const names=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];
const manifest=JSON.parse(read('document/releases/H23_RESTORED_CHESS_PIECES_MANIFEST.json'));
const rn='assets/images/chess/pieces-png-default/', native='modules/family-bloom-overlay/android/src/main/res/drawable-nodpi/';
check('exactly 12 unique mapped Chess sprites', Object.keys(manifest.pieces).length===12 && names.every(n=>manifest.pieces[n]));
for(const name of names){
 const file=fs.readFileSync(path.join(root,rn+name+'.png'));
 const onAndroid=fs.readFileSync(path.join(root,native+name+'.png'));
 check(`${name}: valid 192x192 RGBA PNG, same bytes for RN + native`, file.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex')) && file.readUInt32BE(16)===192 && file.readUInt32BE(20)===192 && file[25]===6 && file.equals(onAndroid) && crypto.createHash('sha256').update(file).digest('hex')===manifest.pieces[name].sha256);
}
const chessGate=read('src/components/games/ChessChallengeGate.tsx'),xqGate=read('src/components/games/XiangqiChallengeGate.tsx'), bot=read('src/app/(internal)/board-game-bot-test.tsx');
for (const [kind,source] of [['Chess',chessGate],['Xiangqi',xqGate]]) {
 check(`${kind}: center-slot badge not percent-left shifted`,source.includes('kingSlot: { position: "absolute", top: -55, left: 0, right: 0') && source.includes('alignItems: "center"') && !source.includes('translateX: -55') && source.includes('pointerEvents="none"'));
}
check('All 4 bot/test modals use center slot, with a float-over-card image', (bot.match(/style=\{styles.royalKingSlot\}/g)||[]).length===4 && bot.includes('royalKingSlot: { position: "absolute", top: -55, left: 0, right: 0') && !bot.includes('marginLeft: -55'));
const xq=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
const start=xq.indexOf('// H22R9: same gentle violet');const stop=xq.indexOf('val selected=',start);
check('Xiangqi last move draws circles only, not squares or lines',start>0 && stop>start && xq.slice(start,stop).includes('drawCircle') && !xq.slice(start,stop).includes('drawLine') && !xq.slice(start,stop).includes('drawRoundRect'));
check('Both ends outlined after pieces',xq.includes('for (point in lastMovePoints)') && xq.includes('c.drawCircle(x,y,cell*.515f,paint)'));
check('Single purple palette regardless of moving side',xq.includes('#366F4EB1') && xq.includes('#9B7954BC') && !xq.includes('Xem viền xanh') && !xq.includes('moveAccent'));
check('No changes to Xiangqi board-square/touch topology',xq.includes('onSquareTap(if(flip)8-colOnBoard') && xq.includes('cell=min((contentW-dp(58f))/8f'));
const app=JSON.parse(read('app.json')), mod=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
check('native binary version increments on PNG+Kotlin change',app.expo.version==='1.3.29' && app.expo.android.versionCode===143039 && mod.includes('P2.37R2C-H25-native-1'));
console.log('H23 reverted Chess assets / Xiangqi highlight gate PASS');
