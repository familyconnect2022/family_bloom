#!/usr/bin/env node
'use strict';
// H15: behavioral tests + source assertions. They are not a Gradle/APK test.
const fs=require('fs'),path=require('path'),vm=require('vm'),ts=require('typescript');
const root=path.resolve(__dirname,'..');
const rd=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let pass=0,fail=0;
function check(ok,label){console.log(`${ok?'PASS':'FAIL'} ${label}`);if(ok)pass++;else fail++;}
function moduleFromTS(source,stub={}){
 const mod={exports:{}};
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const env={module:mod,exports:mod.exports,require:(key)=>{
  if(key in stub)return stub[key];throw new Error('Missing mocked module: '+key);
 },process,console,Math,Date,setTimeout,clearTimeout};
 vm.runInNewContext(code,env,{timeout:4000});return mod.exports;
}
const controller=rd('src/services/games/nativeChessGameplayController.ts');
const manager=rd('server/src/chess/chessGameManager.ts');
const socket=rd('server/src/socket/socketServer.ts');
const xiangqi=rd('server/src/xiangqi/xiangqiSocket.ts');
const kotlin=rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const priv=rd('src/constants/performanceTest.ts');
const app=JSON.parse(rd('app.json'));
check(manager.includes('sourcePiece.color !== color') && manager.indexOf('sourcePiece.color !== color')<manager.indexOf('this.consumeClock(r, color)'), 'Server verifies actual moving piece color before consuming any clock');
check(controller.includes('isLegalServerDelta(currentState, delta)') && controller.includes('board.fen() === delta.fen'), 'Client validates complete legal move transition and target FEN');
check(controller.includes('derivedPly === state.ply'), 'Client rejects inconsistent FEN side/ply even when orientation is Black');
check(controller.includes('fen: showOptimistic ? optimisticFen! : state.fen,') && controller.includes('pendingBaseRevision === state.revision') && controller.includes('isLegalServerDelta(currentState, delta)'), 'H17 speculative visual board is revision-guarded while authoritative server FEN stays separate');
check(socket.includes('socket.data.developerAuthorized = isVerifiedDeveloperIdentity(decoded)'), 'Socket privileges derive from verified Firebase token');
check(socket.includes('if (!socket.data.developerAuthorized) throw new ChessDomainError("CHESS_UNAUTHORIZED")'), 'Chess bot endpoints fail closed for other family admins');
check(xiangqi.includes('if(!socket.data.developerAuthorized)throw new XiangqiDomainError("XIANGQI_UNAUTHORIZED")'), 'Xiangqi bot endpoints independently fail closed');
check(priv.includes('isVerifiedDeveloperAccount') && !priv.includes('INTERNAL_TOOLS_ENABLED'), 'Release app developer gate depends on verified identity, not __DEV__');
for(const route of ['settings','developer-tools','board-game-bot-test','performance-graph-test','performance-data-test']){
 const rel=route==='settings'?'src/app/(profile)/settings.tsx':`src/app/(internal)/${route}.tsx`;
 check(rd(rel).includes('isVerifiedDeveloperAccount(user)'),`${route} direct UI entry requires verified Firebase user`);
}
const identity=moduleFromTS(rd('server/src/security/developerIdentity.ts'));
check(identity.isVerifiedDeveloperIdentity({uid:'u1',email:'huynh235@gmail.com',email_verified:true}), 'Trusted UID with verified exact email is authorized');
check(!identity.isVerifiedDeveloperIdentity({uid:'u2',email:'other@example.com',email_verified:true}) && !identity.isVerifiedDeveloperIdentity({uid:'u2',email:'huynh235@gmail.com',email_verified:false}), 'Other admins and unverified email are not authorized');
const beforePin=process.env.FAMILY_BLOOM_DEVELOPER_UID;
process.env.FAMILY_BLOOM_DEVELOPER_UID='u1';
check(!identity.isVerifiedDeveloperIdentity({uid:'u2',email:'huynh235@gmail.com',email_verified:true}) && identity.isVerifiedDeveloperIdentity({uid:'u1',email:'huynh235@gmail.com',email_verified:true}), 'Optional Render UID lock rejects any other verified UID');
if(beforePin===undefined)delete process.env.FAMILY_BLOOM_DEVELOPER_UID;else process.env.FAMILY_BLOOM_DEVELOPER_UID=beforePin;
const gate=moduleFromTS(priv);
check(gate.isVerifiedDeveloperAccount({uid:'u1',email:'Huynh235@Gmail.Com',emailVerified:true}) && !gate.isVerifiedDeveloperAccount({uid:'u2',email:'friend@gmail.com',emailVerified:true}) && !gate.isVerifiedDeveloperAccount({uid:'u1',email:'huynh235@gmail.com',emailVerified:false}), 'Release UI shows tests for exact verified Firebase account only');
check(kotlin.includes('"victory" -> {') && kotlin.includes('"draw" -> {') && kotlin.includes('"loss" -> {') && kotlin.includes('"#FFE1A3"') && kotlin.includes('"#C9E6FA"') && kotlin.includes('"#DAEBD7"'), 'Win/draw/loss have visibly distinct Kotlin background palettes');
check(app.expo.android.versionCode===143039 && rd('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/FamilyBloomOverlayModule.kt').includes('P2.37R2C-H25-native-1'), 'H15 Android and native identities synchronized');

const initial='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const afterWhite='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
const emitted=[],paints=[],diagnostics=[];
class ChessMock{
 constructor(fen=initial){this.position=fen;}
 turn(){return this.position.split(' ')[1];}
 fen(){return this.position;}
 get(square){return square==='e2'&&this.turn()==='w'?{color:'w',type:'p'}:square==='e7'?{color:'b',type:'p'}:undefined;}
 moves(options){return options?.square==='e7'?[{from:'e7',to:'e5',flags:'b'}]:[];}
 move(m){if(this.position===initial&&m.from==='e2'&&m.to==='e4'){this.position=afterWhite;return {from:'e2',to:'e4',san:'e4',color:'w',piece:'p',flags:'b'};}return null;}
}
const base={gameId:'H15-test',familyId:'f',whiteUid:'bot',blackUid:'me',testBotUid:'bot',status:'active',fen:initial,turn:'w',revision:1,ply:0,whiteRemainingMs:600000,blackRemainingMs:600000,serverNowMs:100};
const game=moduleFromTS(controller,{
 'chess.js':{Chess:ChessMock},'@react-native-firebase/auth':{getAuth:()=>({currentUser:{uid:'me'}})},
 '../../types/chess':{CHESS_ERROR_COPY:{},CHESS_EVENTS:{gameMove:'move',gameResync:'resync'},applyChessMoveDelta:(s,d)=>({...s,fen:d.fen,turn:d.turn,revision:d.version,ply:d.ply,lastMove:d.move})},
 '../chess/chessSocketService':{chessSocketService:{emitAck:async(e,p)=>{emitted.push({e,p});return {ok:false,errorCode:'CHESS_NOT_YOUR_TURN'};}}},
 './boardGamePresentationDiagnostics':{emitBoardGamePresentationDiagnostic:(...args)=>diagnostics.push(args)},
 './boardGameNativeOverlay':{setBoardGameNativeChessState:async(s)=>{paints.push(s);return {accepted:true}}},
 './boardGamePresentationStore':{markChessResultDismissed:()=>{},closeBoardGamePresentationForGame:()=>{}},
});
(async()=>{
 try{
  game.syncNativeChessAuthoritativeState(base);await Promise.resolve();
  check(paints.at(-1)?.meColor==='b' && paints.at(-1)?.turn==='w' && !paints.at(-1)?.canMove, 'Black player sees own color and White turn without move permission');
  await game.handleNativeChessAction({gameId:base.gameId,action:'square',square:'e2'});await Promise.resolve();
  check(!paints.at(-1)?.selectedSquare && emitted.length===0,'Black player cannot select or move White e2 pawn');
  await game.handleNativeChessAction({gameId:base.gameId,action:'square',square:'e7'});await Promise.resolve();
  check(paints.at(-1)?.selectedSquare==='e7' && paints.at(-1)?.canPremove===true,'Black player can plan own pawn as premove while White thinks');
  const good={gameId:base.gameId,clientMoveId:'server-white-1',version:2,ply:1,
   move:{from:'e2',to:'e4',san:'e4',color:'w',piece:'p',flags:'b'},fen:afterWhite,turn:'b',status:'active'};
  const bad={...good,fen:initial};
  check(game.syncNativeChessAuthoritativeMove(bad)===false,'Forged delta with wrong resulting FEN is rejected');
  check(game.syncNativeChessAuthoritativeMove({...good,move:{...good.move,color:'b'}})===false,'Wrong-color delta is rejected');
  check(game.syncNativeChessAuthoritativeMove(good)===true,'Valid authoritative White move is accepted for Black-side client');
  await Promise.resolve();
  check(paints.at(-1)?.fen===afterWhite && paints.at(-1)?.meColor==='b','Black player board updates only from validated server FEN');
  check(emitted.every(x=>x.e!=='move'),'Black player never sends an illegal move while it is White turn');
 }catch(error){fail++;console.error('FAIL gameplay test',error?.stack||error)}
 console.log(`H15 authority + Release developer access: ${fail?'FAIL':'PASS'} (${pass}/${pass+fail})`);
 process.exitCode=fail?1:0;
})();
