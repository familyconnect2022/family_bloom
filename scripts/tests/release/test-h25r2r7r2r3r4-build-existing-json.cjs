#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H25R2R7R2R3R4: user reports project update succeeded with google-services.json
// already present, but Build & Share says 'missing'. Diagnose PROJECT selection,
// not just Firebase file existence. Fully offline and read-only test.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.join(__legacyScriptsDir,'..');
const diag=path.join(root,'scripts/android/build/diagnose-build-location.cjs');
const probe=path.join(root,'scripts/android/build/firebase-android-config.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'Bloom Build Existing Json '));
const installed=path.join(temp,'Family_bloom_V2');
const config={project_info:{project_id:'family-connect-4184f'},client:[{client_info:{android_client_info:{package_name:'com.familybloom.android'}}}]};
fs.mkdirSync(installed,{recursive:true});
fs.writeFileSync(path.join(installed,'package.json'),JSON.stringify({name:'family-bloom'}));
fs.writeFileSync(path.join(installed,'app.config.js'),'module.exports={}');
const real=path.join(installed,'google-services.json');
let n=0;
function check(cond,msg){assert(cond,msg);console.log('PASS '+(++n)+' '+msg)}
function run(tool,dir){return spawnSync(process.execPath,[tool,dir],{encoding:'utf8',env:{...process.env,LOCALAPPDATA:path.join(temp,'AppData')}})}
try{
  fs.writeFileSync(real,JSON.stringify(config));
  let r=run(diag,installed);
  check(r.status===0 && r.stdout.includes('[HOP LE]') && r.stdout.includes(real),'Project Family_bloom_V2 co san JSON root: chan doan PASS');
  check(spawnSync(process.execPath,[probe,'check',installed],{encoding:'utf8'}).status===0,'JSON root duoc su dung ngay, khong copy lai');
  const before=fs.readFileSync(real);
  run(diag,installed);
  check(fs.readFileSync(real).equals(before),'Chan doan khong thay doi JSON da ton tai');
  const elsewhere=path.join(temp,'FULL ZIP clean');fs.mkdirSync(elsewhere);r=run(diag,elsewhere);
  check(r.stdout.includes('[KHONG TIM THAY]')&&r.stdout.includes(elsewhere),'FULL ZIP sach bao DUNG thu muc dang kiem tra');
  const markerDir=path.join(temp,'AppData','FamilyBloom','updater');fs.mkdirSync(markerDir,{recursive:true});
  fs.writeFileSync(path.join(markerDir,'last-target.txt'),installed+'\r\n');r=run(diag,elsewhere);
  check(r.stdout.includes('[DUONG DAN AUTO UPDATE LUU] '+installed),'Chan doan hien duong dan target da luu tu Auto Update');
  const nested=path.join(temp,'with nested');fs.mkdirSync(path.join(nested,'android','app'),{recursive:true});
  fs.copyFileSync(real,path.join(nested,'android','app','google-services.json'));
  r=run(diag,nested);
  check(r.stdout.includes('[HOP LE] '+path.join(nested,'android','app','google-services.json'))&&!r.stdout.includes('[PASS] Da tim thay'),'Phat hien JSON trong android/app nhung KHONG nham la root');
  const fake=path.join(temp,'wrong package');fs.mkdirSync(fake);fs.writeFileSync(path.join(fake,'google-services.json'),JSON.stringify({project_info:config.project_info,client:[{client_info:{android_client_info:{package_name:'another.app'}}}]}));
  check(run(diag,fake).stdout.includes('[SAI CAU HINH]'),'Cau hinh Android sai duoc nhan dien');
  const bat=fs.readFileSync(path.join(root,'scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat'),'utf8');
  check(bat.indexOf('firebase-android-config.cjs')<bat.indexOf('last-target.txt'),'BAT kiem root JSON truoc khi dung target da luu (khong nham thu muc)');
  check(bat.includes(':choose_target')&&bat.includes('Select-FamilyBloomProjectFolder.ps1'),'BAT cho chon lai du an khi target cu khong dung');
  check(bat.includes('Project SE BUILD')&&bat.includes('Dung project nay de Build'),'BAT hien duong dan va hoi xac nhan');
  check(bat.includes('%FB_ROUTER_TOOL%" redirect-source') || bat.includes('resolve-build-target.cjs" redirect-source'),'BAT xac minh project da cap nhat truoc khi chuyen build');
  check(fs.existsSync(path.join(root,'package.json')),'Khong dong goi Firebase JSON ca nhan vao FULL source');
  console.log('BUILD EXISTING JSON '+n+'/'+n+' PASS');
}catch(e){console.error(e.stack||e);process.exitCode=1;}
finally{fs.rmSync(temp,{recursive:true,force:true});}
