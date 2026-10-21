#!/usr/bin/env node
'use strict';
// H22: actual Xiangqi state machine + native/Socket/Build&Share wiring regression.
// Runs without Firebase credentials or Android SDK; release gate must separately compile.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let ts;
try { ts=require('typescript'); }
catch { ts=require(path.resolve(__dirname,'../server/node_modules/typescript')); }
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const trans=(src,f)=>{
 const out=ts.transpileModule(src,{fileName:f,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 assert.equal(out.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,f);
 return out.outputText;
};
class DomainError extends Error { constructor(code,message){super(message||code);this.code=code;} }
const engineExports={};
vm.runInNewContext(trans(read('server/src/xiangqi/xiangqiEngine.ts'),'engine.ts'),{
 exports:engineExports,require:()=>({}),console,Math,Array,Map,Set,structuredClone,
});
let wall=Date.now(),mono=100000;
class FakeDate extends Date {
 constructor(...a){super(...(a.length?a:[wall]));}
 static now(){return wall;}
}
const managerExports={};
const fakeInterval=()=>({unref(){}});
vm.runInNewContext(trans(read('server/src/xiangqi/xiangqiGameManager.ts'),'manager.ts'),{
 exports:managerExports,
 require:name=>name==='node:crypto'?require('node:crypto'):
   name==='node:perf_hooks'?{performance:{now:()=>mono}}:
   name.endsWith('xiangqiEngine.js')?engineExports:
   name.endsWith('xiangqiTypes.js')?{XiangqiDomainError:DomainError}:{},
 performance:{now:()=>mono},Date:FakeDate,Math,Array,Map,Set,Promise,structuredClone,console,
 setInterval:fakeInterval,setTimeout,clearTimeout,
});
const {XiangqiGameManager,xiangqiAwayAllowanceMs}=managerExports;
const store=new Map(),locks=new Map(),events=[];
const persistence={
 async createWithLocks(g){assert(!locks.has(g.redUid)&&!locks.has(g.blackUid));store.set(g.id,structuredClone(g));g.playerUids.forEach(uid=>locks.set(uid,g.id));},
 async save(g){store.set(g.id,structuredClone(g));},
 async finish(g){store.set(g.id,structuredClone(g));g.playerUids.forEach(uid=>{if(locks.get(uid)===g.id)locks.delete(uid);});},
 async load(f,id){return structuredClone(store.get(id)??null);},
};
const newManager=()=>new XiangqiGameManager(persistence,e=>events.push(e));
const tc={kind:'clocked',initialMs:600000,incrementMs:0};
let passed=0;
async function test(label,action){await action();console.log('PASS',label);passed++;}
(async()=>{
 const manager=newManager();
 const initial=await manager.create('family','p1','p2',tc);
 const gameId=initial.gameId;
 await test('new human Xiangqi game publishes locked colors immediately',()=>{
   assert.equal(initial.status,'waiting');assert.equal(initial.preparationPhase,'colors');
   assert(initial.redUid&&initial.blackUid&&initial.redUid!==initial.blackUid);assert.equal(initial.startedAt,null);
 });
 await manager.markBoardReady(gameId,'p1','board-1');
 await test('legacy boardReady event cannot start a game',async()=>{
   const g=await manager.state(gameId,'p1');assert.equal(g.preparationPhase,'colors');assert.equal(g.status,'waiting');
 });
 const colors=await manager.markBoardReady(gameId,'p2','board-2');
 await test('colors remain immutable after redundant boardReady events',()=>{
   assert.equal(colors.preparationPhase,'colors');assert(colors.redUid&&colors.blackUid&&colors.redUid!==colors.blackUid);assert.equal(colors.status,'waiting');
 });
 await manager.markReady(gameId,'p1','play-1');
 await test('one playReady does not start server clock',async()=>{
   const g=await manager.state(gameId,'p1');assert.equal(g.status,'waiting');assert.equal(g.startedAt,null);
 });
 const active=await manager.markReady(gameId,'p2','play-2');
 await test('both playReady activate turn clock once',()=>{
   assert.equal(active.status,'active');assert.equal(active.preparationPhase,'play');assert(active.startedAt);assert.equal(active.board.turn,'red');
 });
 // H22R8: end-to-end authoritative draw protocol, completely Xiangqi-owned.
 const drawStart=await manager.create('family','drawA','drawB',tc);
 await manager.markBoardReady(drawStart.gameId,'drawA','draw-board-a');
 await manager.markBoardReady(drawStart.gameId,'drawB','draw-board-b');
 await manager.markReady(drawStart.gameId,'drawA','draw-ready-a');
 const drawActive=await manager.markReady(drawStart.gameId,'drawB','draw-ready-b');
 await test('draw proposal is persisted, broadcast and clocks remain active',async()=>{
   const got=await manager.offerDraw(drawActive.gameId,'drawA','draw-offer-1');
   assert.equal(got.drawOfferByUid,'drawA');assert.equal(got.status,'active');
   assert.equal(store.get(drawActive.gameId).drawOfferByUid,'drawA');
 });
 await test('proposal owner cannot accept their own draw',async()=>{
   await assert.rejects(()=>manager.acceptDraw(drawActive.gameId,'drawA','invalid-accept'),e=>e.code==='XIANGQI_INVALID_REQUEST');
 });
 await test('draw receiver can decline and proposer can offer again',async()=>{
   const declined=await manager.declineDraw(drawActive.gameId,'drawB','draw-decline');
   assert.equal(declined.drawOfferByUid,null);assert.equal(declined.status,'active');
   const again=await manager.offerDraw(drawActive.gameId,'drawA','draw-offer-2');
   assert.equal(again.drawOfferByUid,'drawA');
 });
 await test('only opponent acceptance finishes as draw, releasing active locks',async()=>{
   const decided=await manager.acceptDraw(drawActive.gameId,'drawB','draw-accept');
   assert.equal(decided.status,'finished');assert.equal(decided.result,'draw');
   assert.equal(decided.finishReason,'draw');assert.equal(decided.board.gameOver,true);
   assert.equal(decided.drawOfferByUid,null);assert(!locks.has('drawA')&&!locks.has('drawB'));
 });
 const moveDraw=await manager.create('family','drawC','drawD',tc);
 await manager.markBoardReady(moveDraw.gameId,'drawC','c-board');
 await manager.markBoardReady(moveDraw.gameId,'drawD','d-board');
 await manager.markReady(moveDraw.gameId,'drawC','c-ready');
 const activeDraw=await manager.markReady(moveDraw.gameId,'drawD','d-ready');
 const moveRed=activeDraw.redUid;
 const moveBlack=activeDraw.blackUid;
 await test('authoritative move clears pending draw without consuming extra move',async()=>{
   const offered=await manager.offerDraw(activeDraw.gameId,moveBlack,'draw-before-move');
   assert.equal(offered.drawOfferByUid,moveBlack);
   const delta=await manager.move(moveDraw.gameId,moveRed,'clear-draw-move',offered.revision,'r-soldier-0',{col:0,row:5});
   const settled=await manager.state(moveDraw.gameId,moveRed);
   assert.equal(settled.drawOfferByUid,null);assert.equal(settled.status,'active');
   assert.equal(delta.version,offered.revision+1);
 });
 const botDraw=await manager.create('family','drawHuman','drawTestBot',tc,'draw-bot-create',{testBotUid:'drawTestBot',redUid:'drawHuman',blackUid:'drawTestBot'});
 await manager.markBoardReady(botDraw.gameId,'drawHuman','draw-bot-board');
 await manager.markReady(botDraw.gameId,'drawHuman','draw-bot-ready');
 await test('developer Bloom Bot draw request is server-authoritative test finish',async()=>{
   const complete=await manager.offerDraw(botDraw.gameId,'drawHuman','draw-bot-offer');
   assert.equal(complete.status,'finished');assert.equal(complete.result,'draw');
 });
 // H22R5: bot readiness is server-authoritative: virtual bot has both ready
 // flags from creation, but the human must still cross BOTH native stages.
 const botGame=await manager.create('family','human-bot-fixture','bloom-bot-fixture',tc,'bot-test-fixture',
   {testBotUid:'bloom-bot-fixture',redUid:'human-bot-fixture',blackUid:'bloom-bot-fixture'});
 await test('H22R5 bot cannot move until human boardReady and playReady',async()=>{
   assert.equal(botGame.status,'waiting');
   const locked=await manager.state(botGame.gameId,'human-bot-fixture');
   assert.equal(locked.preparationPhase,'board');
   const colors=await manager.markBoardReady(botGame.gameId,'human-bot-fixture','bot-board-ready');
   assert.equal(colors.preparationPhase,'colors');
   assert.equal(colors.status,'waiting');
   const started=await manager.markReady(botGame.gameId,'human-bot-fixture','bot-play-ready');
   assert.equal(started.status,'active');assert.equal(started.preparationPhase,'play');
   assert.equal(started.board.turn,'red');
 });
 const red=active.redUid;const black=active.blackUid;
 await test('red can move first; illegal turn cannot move',async()=>{
   await assert.rejects(()=>manager.move(gameId,black,'other-first-move',active.revision,'b-soldier-0',{col:0,row:4}),e=>e.code==='XIANGQI_NOT_YOUR_TURN');
   const reply=await manager.move(gameId,red,'red-first-move',active.revision,'r-soldier-0',{col:0,row:5});
   assert.equal(reply.version,active.revision+1);
   const newer=await manager.state(gameId,red);assert.equal(newer.board.turn,'black');assert.equal(newer.board.lastMove.pieceId,'r-soldier-0');
 });
 await test('repeat move requests idempotent',async()=>{
   const reply=await manager.move(gameId,red,'red-first-move',active.revision,'r-soldier-0',{col:0,row:5});assert.equal(reply.duplicate,true);
 });
 await test('50% rule follows 10m/5m thresholds exactly',()=>{
   assert.equal(xiangqiAwayAllowanceMs(600000,200000),100000);assert.equal(xiangqiAwayAllowanceMs(600000,120000),120000);
   assert.equal(xiangqiAwayAllowanceMs(300000,90000),45000);assert.equal(xiangqiAwayAllowanceMs(300000,60000),60000);
 });
 const first=await manager.setBoardVisible(gameId,red,false);
 mono+=5000;wall+=5000;
 const duplicate=await manager.setBoardVisible(gameId,red,false);
 await test('two background events cannot extend immutable deadline',()=>assert(Math.abs(first.awayDeadlineAt-duplicate.awayDeadlineAt)<1));
 await manager.setBoardVisible(gameId,red,true);
 const second=await manager.setBoardVisible(gameId,red,false);
 await test('reopening then leaving deducts budget without moving the absolute deadline later',()=>{
   assert(second.awayDeadlineAt<=first.awayDeadlineAt);assert(store.get(gameId).awayBudgetByUid[red].remainingMs<300000);
 });
 const saved=store.get(gameId);
 await test('away deadline and remaining budget persisted in Firestore document shape',()=>{
   assert(saved.awayBudgetByUid[red].deadlineEpochMs>0);assert(saved.awayBudgetByUid[red].remainingMs>=0);
 });
 mono+=310000;wall+=310000;
 const restarted=newManager();const expired=await restarted.recover('family',gameId,red);
 await test('cold server restart settles offline player loss before recovery',()=>{
   assert.equal(expired.status,'finished');assert.equal(expired.finishReason,'away_timeout');assert.equal(expired.result,'black');
 });
 await test('terminal loss frees both authoritative player locks',()=>{
   assert(!locks.has(red)&&!locks.has(black));
 });
 const waiting=await restarted.create('family','p3','p4',tc);
 const old=store.get(waiting.gameId);old.createdAt=new Date(wall-300000).toISOString();store.set(waiting.gameId,old);
 const freshServer=newManager();const ended=await freshServer.recover('family',waiting.gameId,'p3');
 await test('waiting room expires after 120s and cannot be resumed',()=>{
   assert.equal(ended.status,'cancelled');assert.equal(ended.finishReason,'abandoned');assert(!locks.has('p3')&&!locks.has('p4'));
 });
 const expected=[
   'server/src/xiangqi/xiangqiSocket.ts','src/types/xiangqiRealtime.ts',
   'src/services/xiangqi/xiangqiSocketService.ts','src/services/xiangqi/xiangqiLocalRules.ts',
   'src/services/games/nativeXiangqiGameplayController.ts','src/components/games/XiangqiChallengeGate.tsx',
   'src/components/games/XiangqiSessionRecoveryGate.tsx','src/services/games/boardGamePresentationBridge.ts',
   'src/components/games/BoardGamePresentationRoot.android.tsx','src/app/_layout.tsx',
   'src/app/(internal)/board-game-bot-test.tsx', 'modules/family-bloom-overlay/index.ts',
 ];
 await test('all Xiangqi client/server TS & TSX files transpile successfully',()=>{
   for(const f of expected)trans(read(f),f);
 });
 await test('post-overlay cleaner explicitly retains Xiangqi native local rules',()=>{
   const cleaner=read('scripts/setup/cleanup-overlay-routes.js');
   assert(cleaner.includes('retiredGameServiceFiles')&&!cleaner.includes('pruneDirectoryExcept'));
   assert(cleaner.includes('xiangqiSessionBootstrap.ts'));
 });
 await test('full app-shell Xiangqi invite, recover and native action handlers are wired',()=>{
   const root=read('src/app/_layout.tsx');
   assert(root.includes('<FirebaseBoardInvitationGate'));assert(!root.includes('<XiangqiChallengeGate'));assert(!root.includes('<XiangqiSessionRecoveryGate'));
   assert(read('server/src/xiangqi/xiangqiSocket.ts').includes('inviteSent:"xiangqi:invite:sent"'));
   assert(read('src/services/games/nativeXiangqiGameplayController.ts').includes('handleNativeXiangqiAction'));
   assert(read('src/components/games/BoardGamePresentationRoot.android.tsx').includes('subscribeBoardGameNativeXiangqiActions'));
 });
 await test('Xiangqi and Chess remain different socket, game and lifecycle instances',()=>{
   const x=read('src/services/xiangqi/xiangqiSocketService.ts');
   assert(x.includes('class XiangqiSocketService')&&!x.includes('chessSocketService'));
   const manager=read('server/src/xiangqi/xiangqiGameManager.ts');
   assert(!manager.includes('ChessGameManager')&&!manager.includes('chess.js'));
 });
 await test('native Xiangqi renderer has all 14 bundled PNG pieces and action bridge',()=>{
   const dir=path.join(root,'modules/family-bloom-overlay/android/src/main/res/drawable-nodpi');
   for(const side of ['red','black'])for(const piece of ['general','advisor','elephant','horse','chariot','cannon','soldier'])
     assert(fs.existsSync(path.join(dir,`fb_xiangqi_${side}_${piece}.png`)));
   const board=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
   assert(board.includes('onSquareTap'));assert(board.includes('onAssetsReady'));assert(board.includes('onAction("resultAck"'));
 });
 await test('native SFX preload, authoritative sound cues and single premove are independent',()=>{
   const board=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
   const controller=read('src/services/games/nativeXiangqiGameplayController.ts');
   assert(board.includes('SoundPool.Builder()')&&board.includes('loaded.size==audioMap.size'));
   assert(board.includes('canPremove')&&board.includes('premoveTarget'));
   assert(controller.includes('queuedPremove={pieceId:selected,to:coord}')&&controller.includes('premove-invalidated'));
   assert(controller.includes('cue("capture")')&&controller.includes('cue("game-end")'));
 });
 await test('H22R5 outgoing inviter sees server-authorized cancel from ACK or event',()=>{
   const socket=read('src/services/xiangqi/xiangqiSocketService.ts');
   const gate=read('src/components/games/XiangqiChallengeGate.tsx');
   const server=read('server/src/xiangqi/xiangqiSocket.ts');
   assert(socket.includes('this.publishOutgoingInvite(invite)'));
   assert(socket.includes('this.lastOutgoingInvite = invite'));
   assert(gate.includes('onOutgoingInvite(')&&gate.includes('Hủy lời mời'));
   assert(gate.includes('XIANGQI_EVENTS.inviteCancel'));
   assert(server.includes('XIANGQI_EVENTS.inviteCancel'));
   assert(server.includes('releasePendingBoardGameInvite(i.inviteId,"xiangqi")'));
 });
 await test('H22R5 Xiangqi ready retry survives native frame and revision races',()=>{
   const controller=read('src/services/games/nativeXiangqiGameplayController.ts');
   assert(controller.includes('playReadyRequested = null;\n    queueRetry(g.gameId)'));
   assert(controller.includes('if (next.status === "waiting" && next.preparationPhase === "colors" && transportOnline) queueRetry(next.gameId)'));
   assert(!controller.includes('state.revision === colorRevision'));
   assert(controller.includes('colorNativeFrameReady !== g.gameId'));
   assert(controller.includes('g.preparationPhase === "colors" && reply.cached'));
   assert(!controller.includes('serial !== renderSerial || state?.gameId !== g.gameId'));
 });
 await test('H22R6 native Super Bloom preparation and H22R8 Xiangqi pieces +10%',()=>{
   const board=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/XiangqiNativeBoardView.kt');
   assert(board.includes('drawBloomPreparation(c,s,contentW,contentH)'));
   assert(board.includes('CHUẨN BỊ VÁN CỜ')&&board.includes('BLOOM ARENA'));
   assert(board.includes('val radius=cell*.47025f')&&board.includes('val src=Rect('));
   assert(board.includes('onSquareTap(')&&board.includes('if((!s.canMove&&!s.canPremove)||s.movePending) {')&&board.includes('onAction("inputBlocked",s.gameId)')); 
 });
 await test('new H22 native identity cannot be mistaken for H21 APK',()=>{
   const app=JSON.parse(read('app.json'));
   assert.equal(app.expo.android.versionCode,143039);
   const kotlin=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt');
   assert(kotlin.includes('P2.37R2C-H25-native-1'));
   assert(read('src/app/(internal)/board-game-bot-test.tsx').includes('P2.37R2C-H25-native-1'));
 });
 const share=read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
 const eas=read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
 await test('Build & Share and EAS both block distribution on H22 regression failures',()=>{
   assert(share.includes('test-h22-xiangqi-parity.cjs'));assert(eas.includes('test-h22-xiangqi-parity.cjs'));
 });
 console.log(`H22 Xiangqi server/native/build parity: ${passed}/${passed} PASS`);
})().catch(error=>{console.error('H22 XIANGQI REGRESSION FAIL',error);process.exitCode=1;});
