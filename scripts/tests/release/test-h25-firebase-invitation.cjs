/** H25 release gate: must pass before an Android APK may be published. */
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs=require('node:fs');const assert=require('node:assert/strict');
const path=require('node:path');
const root=path.join(__legacyScriptsDir,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
let total=0;
function test(name, fn){fn();total++;console.log(`[H25 PASS ${String(total).padStart(2,'0')}] ${name}`)}
const invite=read('src/services/games/firebaseBoardInvitations.ts');
const render=read('server/src/games/firebaseInvitationMatch.ts');
const gate=read('src/components/games/FirebaseBoardInvitationGate.tsx');
const rootUi=read('src/app/_layout.tsx');
const serverChess=read('server/src/socket/socketServer.ts');
const serverXiangqi=read('server/src/xiangqi/xiangqiSocket.ts');
const rules=read('firestore.rules'), cloudRules=read('firestore.cloud.rules');
const chess=read('server/src/chess/chessGameManager.ts');
const xiangqi=read('server/src/xiangqi/xiangqiGameManager.ts');
const chessHub=read('src/app/(home)/(games)/home-chess.tsx');
const xiangqiHub=read('src/app/(home)/(games)/home-xiangqi.tsx');
const releaseBat=read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const directBat=read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const easBat=read('scripts/android/eas/Family_Bloom_EAS_BUILD_TEST.bat');
const expo=JSON.parse(read('app.json')).expo;
// Firebase transports human invitations, not Socket.IO; keep Bot flow unchanged.
test('one shared typed invitation contract and 60 second window',()=>{assert(invite.includes('InvitationStatus'));assert(invite.includes('INVITE_MS = 60_000'));});
test('client atomically writes invitation and both UID slots',()=>{assert(invite.includes('runTransaction('));assert(invite.includes('tx.set(ref, { ...invite'));assert(invite.includes("role, current"));});
test('one active invitation per person, both inviter and recipient',()=>{assert(invite.includes('inviteIsOccupied(a.exists()'));assert(invite.includes('inviteIsOccupied(b.exists()'));});
test('no Firestore write every second for countdown',()=>{assert(gate.includes('setInterval(tick,1000)'));assert(!invite.includes('setInterval('));});
test('all terminal invitation statuses are explicit',()=>{for(const s of ['CANCELLED','DECLINED','EXPIRED','FAILED'])assert(invite.includes(`'${s}'`));});
test('A can only accept, B can only cancel, A can decline',()=>{for(const s of ['uid !== invite.toUid','uid !== invite.fromUid'])assert(invite.includes(s));});
test('accept request does not pretend to be server approved',()=>{assert(invite.includes("action === 'accept' ? 'ACCEPT_REQUESTED'"));assert(render.includes("tx.update(ref,{status:'ACCEPTED'"));});
test('expiry and connection failure use distinct deadlines',()=>{assert(invite.includes('now >= invite.expiresAtMs'));assert(invite.includes('acceptedMs + CONNECT_MS'));});
test('both users listen to the same document per UID query',()=>{assert(invite.includes("['fromUid', 'toUid']"));assert(invite.includes('onSnapshot('));});
test('avoid displaying optimistic pending writes as authority',()=>assert(invite.includes('!d.metadata.hasPendingWrites')));
test('source gate is only mounted when authenticated',()=>{assert(rootUi.includes('<FirebaseBoardInvitationGate'));assert(!rootUi.includes('<ChessChallengeGate'));assert(!rootUi.includes('<XiangqiChallengeGate'));});
test('global gate does not open a game socket before accept',()=>{assert(gate.includes("'ACCEPT_REQUESTED','ACCEPTED'"));assert(gate.includes('await service.connect()'));});
test('both hubs create Firestore invitation without socket bootstrap',()=>{for(const h of [chessHub,xiangqiHub]){assert(h.includes('createFirebaseInvitation'));assert(h.includes('watchInvitationSlots'));assert(!h.includes('.prewake('));assert(!h.includes('.connect('));}});
test('server has idempotent Firebase claim for Chess and Xiangqi',()=>{assert(serverChess.includes('chess:firebase:claim'));assert(serverXiangqi.includes('xiangqi:firebase:claim'));assert(render.includes('const inFlight = new Map'));});
test('restarted Render reconciles existing game locks before re-creating',()=>{assert(render.includes('args.getCurrent(state.fromUid)'));assert(render.includes('args.getCurrent(state.toUid)'));assert(render.includes('args.sameMatch('));});
test('backend verifies acceptedAt within 60 second invitation and 180 second connect',()=>{assert(render.includes('acceptedMs! > i.expiresAtMs'));assert(render.includes('acceptedMs! + CONNECT_MS'));});
test('backend publishes frozen server color assignments but reveals colors only after two board-ready signals',()=>{assert(render.includes("status:'ACCEPTED',gameId"));for(const manager of [chess,xiangqi]){assert(manager.includes('preparationPhase: "board"'));assert(!manager.includes('preparationPhase: options?.testBotUid ? "board" : "colors"'));assert(manager.includes('r.boardReadyUids.add(uid)'));assert(manager.includes('r.game.preparationPhase = "colors"')||manager.includes('r.game.preparationPhase = "colors";'));}});
test('Bot pre-game legacy path remains independent',()=>{assert(serverChess.includes('socket.on(E.inviteCreate'));assert(serverXiangqi.includes('socket.on(XIANGQI_EVENTS.inviteAccept'));});
test('one final READY per human + durable stage checkpoint Chess',()=>{assert(chess.includes('r.game.readyUids = [...r.readyUids]'));assert(chess.includes('await this.persistence.save(r.game)'));});
test('one final READY per human + durable stage checkpoint Xiangqi',()=>{assert(xiangqi.includes('r.game.readyUids = [...r.readyUids]'));assert(xiangqi.includes('await this.persistence.save(r.game)'));});
test('native gameplay waits for its board assets before Ready',()=>{assert(read('src/services/games/nativeChessGameplayController.ts').includes('boardAssetsReadyForGame'));const x=read('src/services/games/nativeXiangqiGameplayController.ts');assert(x.includes('nativeAssetsReady'));assert(x.includes('colorNativeFrameReady'));});
test('180 second preparation timeout Chess + Xiangqi',()=>{assert(chess.includes('WAITING_PREPARATION_TIMEOUT_MS = 180_000'));assert(xiangqi.includes('WAITING_TIMEOUT_MS = 180_000'));});
test('inviter and invitee see distinct messages/buttons on one stable form',()=>{assert(gate.includes('isInviter'));assert(gate.includes('Hủy lời mời'));assert(gate.includes('Từ chối'));assert(gate.includes('Đồng ý'));assert.equal((gate.match(/<Modal /g)||[]).length,1);});
test('PNG crest assets use no colored behind-icon frame',()=>{assert(gate.includes('chess-king-superbloom.png'));assert(gate.includes('xiangqi-general-superbloom.png'));assert(gate.includes('top:-73'));assert(gate.includes('height:146'));assert(gate.includes("overflow:'visible'"));});
test('icons are RGBA PNGs with actual transparent pixels',()=>{for(const f of ['assets/game-state/chess-king-superbloom.png','assets/game-state/xiangqi-general-superbloom.png']){const b=fs.readFileSync(path.join(root,f));assert.equal(b.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(b.readUInt8(25),6);}});
test('H25 Firebase invitation blocks match across both rules copies',()=>{const section=x=>x.slice(x.indexOf('      // H25: Direct Firestore'),x.indexOf('      allow create: if signedIn() && request.resource.data.ownerId',x.indexOf('      // H25: Direct Firestore')));assert.equal(section(rules),section(cloudRules));});
test('Firestore rules prohibit unverified client game acceptance',()=>{assert(rules.includes("request.resource.data.status == 'ACCEPT_REQUESTED'"));assert(!rules.includes("request.resource.data.status == 'ACCEPTED'"));assert(rules.includes('bothSlots(inviteId'))});
test('Firestore rules enforce one valid invitation per UID atomically',()=>{assert(rules.includes('getAfter(slotPath('));assert(rules.includes('request.resource.data.holdUntilMs'));assert(rules.includes('request.time.toMillis()'));});
test('Firestore rules enforce expiry using server timestamp',()=>{assert(rules.includes('request.resource.data.updatedAt == request.time'));assert(rules.includes('request.time.toMillis() >= resource.data.expiresAtMs'));});
test('cleanup deferred until Render wakes, previous-day only',()=>{assert(render.includes('cleanupPreviousInvitesWhenAwake'));assert(render.includes("today.setUTCHours(0,0,0,0)"));assert(render.includes(".orderBy('createdAtMs')"));});
test('APK version identity is unique for H25',()=>{assert.equal(expo.version,'1.3.32');assert.equal(expo.android.versionCode,143042);assert(read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt').includes('P2.37R2C-H25-native-3'));});
test('Build & Share BAT gates new H25 before assembling Android',()=>{assert(releaseBat.includes('test-h25-firebase-invitation.cjs'));assert(releaseBat.indexOf('test-h25-firebase-invitation.cjs')<releaseBat.indexOf('Family_Bloom_Android_Test_App_RELEASE.bat'));});
test('direct release APK and EAS BAT gate new H25',()=>{for(const s of [directBat,easBat])assert(s.includes('test-h25-firebase-invitation.cjs'));});
test('Build & Share refuses to publish stale APK and validates SHA256',()=>{assert(directBat.includes('if exist "%APK_SOURCE%" del /f /q'));assert(releaseBat.includes('verify-apk-copy-sha256.cjs'));assert(releaseBat.includes('Family_Bloom_LATEST.apk.pending'));});
test('matched invitation stays busy throughout a long game',()=>{assert(render.includes("status:'MATCHED',holdUntilMs:2524608000000"));});
test('Chess and Xiangqi release matched invitation slots on authoritative finish',()=>{for(const f of ['server/src/chess/chessPersistenceService.ts','server/src/xiangqi/xiangqiPersistenceService.ts'])assert(read(f).includes('finalizeInvitationWithGame(tx'));});
test('game end is reflected to both invitation listeners as COMPLETED',()=>{assert(render.includes("tx.update(inviteRef!, {status:'COMPLETED'"));assert(invite.includes("'COMPLETED'"));assert(gate.includes("i.status!=='COMPLETED'"));});
test('one-APK identity remains com.familybloom.android',()=>assert.equal(expo.android.package,'com.familybloom.android'));
console.log(`H25 FIREBASE INVITATION / DUAL GAME / APK RELEASE: ${total}/${total} PASS`);

// H25R2R6R2: enforce the restored two-stage READY protocol in every release path.
require("./test-h25r2r6r2-two-stage-ready.cjs");
// IMPORTANT: This script is a no-dependency/source-only release gate.
// The dynamic ChessGameManager VM below needs TypeScript and is run ONLY after
// Family_Bloom_ENSURE_GATE_DEPENDENCIES.bat in CLEAN APPLY / Release / EAS.
// Do not add a direct require() of that VM to this script.
console.log('[H25 SOURCE-ONLY] Chess READY VM runs after the TypeScript dependency bootstrap.');
// H25R2R6R3: Native retained-square orientation must survive Mini/IDLE,
// two Firebase accounts and reversed colors across sequential matches.
require('./test-h25r2r6r3-chess-native-orientation.cjs');

// H25R2R7 one-batch Super Bloom UI & Mini edge-peek regression (no npm dependencies).
require('./test-h25r2r7-super-bloom-unified-ui.cjs');
