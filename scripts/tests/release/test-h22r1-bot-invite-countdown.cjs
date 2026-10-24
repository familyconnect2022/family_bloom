#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H22R1: Bot-invitation countdown regression guard (no Firebase/Android credentials required).
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let ts;
try { ts=require('typescript'); }
catch { ts=require(path.resolve(__legacyScriptsDir,'../server/node_modules/typescript')); }
const root=path.resolve(__legacyScriptsDir,'..');
const read=(f)=>fs.readFileSync(path.join(root,f),'utf8');
let passed=0;
const test=(label,fn)=>{ fn();console.log(`PASS ${label}`);passed++; };
const countdownFile='src/components/games/BotInviteCountdown.tsx';
const screenFile='src/app/(internal)/board-game-bot-test.tsx';
const src=read(countdownFile),screen=read(screenFile),chess=read('server/src/socket/socketServer.ts'),xiangqi=read('server/src/xiangqi/xiangqiSocket.ts');
const jsx=ts.transpileModule(src,{fileName:countdownFile,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
const view=ts.transpileModule(screen,{fileName:screenFile,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
test('Countdown TSX and internal test screen TSX transpile without syntax errors',()=>{
 assert.equal((jsx.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 assert.equal((view.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
});
const moduleExports={};
vm.runInNewContext(jsx.outputText,{exports:moduleExports,require:(id)=>id==='react-native'?{StyleSheet:{create:v=>v},Text:()=>null,View:()=>null,AppState:{}}:id==='react'?{}:{},Math,Number,Date,console});
const seconds=moduleExports.botInviteSecondsLeft;
test('Invitation remaining time is derived from server deadline, not modal open time',()=>{
 const expiresAt=1_000_000+60_000;
 assert.equal(seconds(expiresAt,1_000_000),60);
 assert.equal(seconds(expiresAt,1_000_000+500),60);
 assert.equal(seconds(expiresAt,1_000_000+1_001),59);
 assert.equal(seconds(expiresAt,1_000_000+38_400),22);
 assert.equal(seconds(expiresAt,expiresAt-1),1);
 assert.equal(seconds(expiresAt,expiresAt),0);
 assert.equal(seconds(expiresAt,expiresAt+120_000),0);
 assert.equal(seconds(Number.NaN,1_000_000),0);
});
test('Background/resume recalculates from immutable expiresAt and stops local interval',()=>{
 assert(src.includes('AppState.addEventListener("change"'));
 assert(src.includes('state === "active"')&&src.includes('clearInterval(interval)')&&src.includes('subscription.remove()'));
 assert(src.includes('onExpiredRef.current(inviteId)')&&src.includes('if (left === 0 && !notified)'));
});
test('Chess server reserves one immutable 60-second invitation and sends expiresAt',()=>{
 assert(chess.includes('const INVITE_TTL_MS = 60_000'));
 assert(chess.includes('expiresAt: Date.now() + delayMs + INVITE_TTL_MS'));
 assert(chess.includes('return existing;'));
});
test('Xiangqi server reserves one immutable 60-second invitation and sends expiresAt',()=>{
 assert(xiangqi.includes('INVITE_TTL_MS')&&xiangqi.includes('expiresAt:Date.now()+INVITE_TTL_MS'));
 assert(xiangqi.includes('return existing;'));
});
test('Both Bot modal flows render the countdown from their own server expiresAt',()=>{
 assert(screen.includes('game="chess" onExpired={expireChessBotInvite}'));
 assert(screen.includes('game="xiangqi" onExpired={expireXiangqiBotInvite}'));
 assert(screen.includes('expiresAt={chessInvite.expiresAt}'));
 assert(screen.includes('expiresAt={xiangqiInvite.expiresAt}'));
});
test('Both Accept flows reject local expiry before sending accept to server',()=>{
 assert(screen.includes('if (chessInvite.expiresAt <= Date.now()) { expireChessBotInvite(chessInvite.inviteId); return; }'));
 assert(screen.includes('if (xiangqiInvite.expiresAt <= Date.now()) { expireXiangqiBotInvite(xiangqiInvite.inviteId); return; }'));
});
test('Expired modal cannot stick and late previous event cannot close next invite',()=>{
 assert(screen.includes('if (chessInviteRef.current?.inviteId === payload.inviteId)'));
 assert(screen.includes('if (xiangqiInviteRef.current?.inviteId === payload.inviteId)'));
 assert(screen.includes('if (chessInviteRef.current?.inviteId !== inviteId) return'));
 assert(screen.includes('if (xiangqiInviteRef.current?.inviteId !== inviteId) return'));
});
test('Xiangqi Bot has a real server-side rejection action rather than a nonfunctional button',()=>{
 assert(screen.includes('const xiangqiReject = () => void run(async () =>'));
 assert(screen.includes('XIANGQI_EVENTS.inviteReject'));
 assert(screen.includes('onPress={xiangqiReject}'));
});
test('Android native identity remains H22 (JS-only change, no binary rebuild required for already installed H22)',()=>{
 assert(screen.includes('P2.37R2C-H25-native-3'));
 assert(screen.includes('143042'));
});
console.log(`H22R1 Bloom Bot invite deadline/UI: ${passed}/${passed} PASS`);
