#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H21R4: native two-phase READY recovery, visible server-anchored countdown,
// and guarded Build & Share. Does not require Windows, Android SDK, or npm install.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
let passes = 0;
function check(name, test) { test(); console.log('PASS '+name); passes++; }
const js=read('src/services/games/nativeChessGameplayController.ts');
const board=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/ChessNativeBoardView.kt');
const state=read('modules/family-bloom-overlay/android/src/main/java/expo/modules/familybloomoverlay/NativeChessBoardState.kt');
const wire=read('modules/family-bloom-overlay/index.ts');
const bat=read('scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat');
const release=read('scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat');
const server=read('server/src/chess/chessGameManager.ts');
const script=path.join(root, 'scripts/setup/verify-apk-copy-sha256.cjs');
let temp;
try {
check('player READY intent is consumed only after verified native orientation frames',()=>{
  const start=js.indexOf('readyScheduledForGame = state.gameId;');
  const validated=js.indexOf('currentState.revision === orientationRevision',start);
  const intent=js.indexOf('readyRequestedForGame = state.gameId;',start);
  const send=js.indexOf('void markReady();',intent);
  assert(start>=0 && validated>start && intent>validated && send>intent);
  assert(js.includes('retryReadiness(state.gameId, "orientation-frame-invalidated")'));
});
check('a missing board-ready ACK retries without demanding a second assetsReady event',()=>{
  assert(js.includes('boardReadyRequestedForGame = null;\n    emitBoardGamePresentationDiagnostic("chess", "BOARD_READY_REJECTED"'));
  assert(js.includes('retryReadiness(state.gameId, "board-ready-ack-rejected")'));
  assert(js.includes('boardAssetsReadyForGame !== gameId || boardReadyRequestedForGame === gameId'));
});
check('a missing play-ready ACK retries after a bounded delay',()=>{
  assert(js.includes('retryReadiness(state.gameId, "play-ready-ack-rejected")'));
  assert(js.includes('}, 1_500);'));
});
check('reconnect and game cleanup reset scheduled/inflight readiness',()=>{
  assert(js.includes('readyScheduledForGame = null;\n    readyPending = false;\n    clearReadinessRetry();'));
  assert(js.includes('boardAssetsReadyForGame = null;\n  readyScheduledForGame = null;\n  clearReadinessRetry();'));
});
check('waiting countdown originates from immutable server createdAt, never local reset',()=>{
  assert(js.includes('180_000 - (state.serverNowMs - Date.parse(state.createdAt))'));
  assert(server.includes('Date.parse(r.game.createdAt) + WAITING_PREPARATION_TIMEOUT_MS'));
  assert(server.includes('const WAITING_PREPARATION_TIMEOUT_MS = 180_000'));
});
check('Native countdown is a dedicated display-only row and monotonic tick',()=>{
  assert(wire.includes('waitingRemainingMs?: number | null;'));
  assert(state.includes('waitingRemainingMs = json.optNullableLong("waitingRemainingMs")'));
  assert(board.includes('private val bloomCountdown = TextView(context)'));
  assert(board.includes('SystemClock.elapsedRealtime() - clockAnchorElapsed'));
  assert(board.includes('state?.status == "waiting") state?.let {'));
  assert(board.includes('updateWaitingStatus(it)'));
  assert(board.includes('Thời gian chuẩn bị'));
  assert(board.includes('lastAssetsReadySignalElapsed < 5_000L'));
  assert(board.includes('notifyAssetsReadyIfLoaded()'));
});
check('Build & Share does not publish until compiled APK proof and SHA256 pass',()=>{
  assert(release.indexOf('check-p2_37r2c-apk-native-proof.js') < release.lastIndexOf('copy /Y'));
  assert(release.includes('if exist "%APK_SOURCE%" del /f /q "%APK_SOURCE%"'));
  assert(release.includes('if not exist "package-lock.json" goto :need_install'));
  assert(release.includes('check-package-lock.js >nul 2>nul'));
  assert(release.includes('check-p2_37r2-local-install.js >nul 2>nul'));
  assert(release.includes('npm ci could not use the existing lock'));
  const copyIndex=bat.indexOf('PENDING_APK');
  const verifyIndex=bat.indexOf('verify-apk-copy-sha256.cjs');
  const moveIndex=bat.indexOf('move /Y "!PENDING_APK!"');
  assert(copyIndex>0 && verifyIndex>copyIndex && moveIndex>verifyIndex);
  assert(bat.includes('Old LATEST, if present, is NOT from this attempt'));
});
check('Build & Share release BAT runs the H21R4 gate and postprebuild AAPT2 checks',()=>{
  assert(bat.includes('test-phase-p2_37r2c_h21r4-ready-build-share.cjs'));
  assert(release.includes('test-phase-p2_37r2c_h21r3-android-aapt-audio.cjs'));
  assert(release.includes('check-android-resource-names.js'));
});
// Behavior test: corrupted file is rejected, matching copy is accepted.
temp=fs.mkdtempSync(path.join(os.tmpdir(),'bloom-share-gate-'));
const source=path.join(temp,'a.apk'), target=path.join(temp,'b.apk');
fs.writeFileSync(source,Buffer.alloc(1024*1024+1,0x51));
fs.copyFileSync(source,target);
const verify=()=>spawnSync(process.execPath,[script,source,target],{encoding:'utf8'});
check('SHA256 copy gate accepts identical APK copies',()=>{
  const r=verify();assert.equal(r.status,0,r.stderr);
});
check('SHA256 copy gate rejects corrupted APK copies',()=>{
  const fd=fs.openSync(target,'r+');fs.writeSync(fd,Buffer.from([0x50]),0,1,2);fs.closeSync(fd);
  const r=verify();assert.equal(r.status,1,r.stdout);assert.match(r.stderr,/SHA256 mismatch/);
});
check('SHA256 gate rejects source equals destination',()=>{
  const r=spawnSync(process.execPath,[script,source,source],{encoding:'utf8'});
  assert.equal(r.status,1,r.stdout);
});
const compilerPath='/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript';
if(fs.existsSync(compilerPath)) {
check('changed TypeScript bridge/controller transpile without syntax error',()=>{
  const ts=require(compilerPath);
  for(const file of ['src/services/games/nativeChessGameplayController.ts','modules/family-bloom-overlay/index.ts']) {
    const s=read(file);const r=ts.transpileModule(s,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
    assert.equal((r.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error).length,0, file+' TS transpile errors');
  }
});
}
console.log(`\nH21R4 Ready + Build & Share Gate: ${passes}/${passes} PASS`);
} finally { if(temp) fs.rmSync(temp,{recursive:true,force:true}); }
