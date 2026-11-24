#!/usr/bin/env node
'use strict';
/**
 * Bao ve cau hinh Firebase Android tren may nguoi dung.
 * KHONG tao JSON gia, KHONG sua config hop le, KHONG dong goi vao FULL ZIP.
 * Lenh:
 *   check <project>              Kiem tra file da co.
 *   candidate <project>          In duong dan ban sao LON, neu tim thay.
 *   restore <project> <json>     Phuc hoi SAU KHI nguoi dung da dong y.
 *   diagnose <project>           Giai thich trang thai khong lo noi dung file.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const EXPECTED_PACKAGE = 'com.familybloom.android';
const EXPECTED_PROJECT = 'family-connect-4184f';
const [,, command, rootArg, sourceArg] = process.argv;
function fail(msg,code=1){console.error('[FIREBASE ANDROID] '+msg);process.exit(code);}
function file(p){try { const s=fs.lstatSync(p);return s.isFile()&&!s.isSymbolicLink();}catch{return false;}}
function canonical(p){try{let v=fs.realpathSync.native(p);return process.platform==='win32'?v.toLowerCase():v;}catch{return path.resolve(p);}}
function validateRoot(root){
  let p;try{p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));}catch{fail('Khong tim thay package.json hop le trong project.');}
  if(p.name!=='family-bloom'||!file(path.join(root,'app.config.js')))fail('Thu muc duoc chon khong phai nguon Family Bloom.');
}
function validateJson(config){
  if(!file(config))return {ok:false,message:'Khong tim thay file cau hinh JSON.'};
  let data;try{data=JSON.parse(fs.readFileSync(config,'utf8'));}catch{return {ok:false,message:'Tep khong phai JSON hop le.'};}
  if(!Array.isArray(data.client)||!data.client.some(c=>c?.client_info?.android_client_info?.package_name===EXPECTED_PACKAGE))
    return {ok:false,message:'JSON khong co goi Android '+EXPECTED_PACKAGE+'.'};
  const id=data?.project_info?.project_id;
  if(id&&id!==EXPECTED_PROJECT)return {ok:false,message:'Firebase project_id khac '+EXPECTED_PROJECT+'. Can xac minh lai tai Firebase Console.'};
  return {ok:true};
}
function backupCandidate(root){
  const local=process.env.FB_STATE_DIR||path.join(process.env.LOCALAPPDATA||path.join(os.homedir(), 'AppData','Local'),'FamilyBloom','updater');
  const marker=path.join(local,'last-backup.txt');
  if(!file(marker))return null;
  const folder=fs.readFileSync(marker,'utf8').trim();
  const info=path.join(folder,'backup-info.json');
  try {
    const data=JSON.parse(fs.readFileSync(info,'utf8'));
    if(canonical(data.target)!==canonical(root))return null;
    return path.join(folder,'project-source','google-services.json');
  } catch {return null;}
}
const root=path.resolve(rootArg||'.');
if(!['check','candidate','restore','diagnose'].includes(command))fail('Lenh: check|candidate|restore|diagnose <project> [file]',2);
validateRoot(root);
const destination=path.join(root,'google-services.json');
if(command==='check'){
  const r=validateJson(destination);if(!r.ok)fail(r.message,2);
  console.log('[FIREBASE ANDROID] PASS: config dung Android package va Firebase project.');process.exit(0);
}
if(command==='diagnose'){
  const r=validateJson(destination);
  console.log('[DUONG DAN] Thu muc project dang kiem tra: '+root);
  console.log('[DUONG DAN] File Firebase can o root: '+destination);
  console.log(r.ok?'[PASS] Cau hinh Firebase Android da hop le.':'[CHUA SAN SANG] '+r.message);
  const other=path.join(root,'android','app','google-services.json');
  if(!r.ok && validateJson(other).ok)console.log('[GOI Y] Tim thay JSON hop le trong android/app, nhung Expo can file tai root. BAT co the phuc hoi sau khi ban dong y.');
  try {
    const names=fs.readdirSync(root).filter(n=>/^google-services\.json(\.json)?$/i.test(n));
    if(!file(destination)&&names.length)console.log('[GOI Y] Ten file tren o dia: '+names.join(', ')+'; kiem tra phan duoi .json co bi lap khong.');
  }catch{}
  console.log('Can file google-services.json cua Firebase Android com.familybloom.android trong thu muc project, KHONG phai Admin SDK private key.');
  console.log('Project config can dung '+EXPECTED_PROJECT+'.');
  process.exit(r.ok?0:2);
}
if(command==='candidate'){
  const options=[path.join(root,'android','app','google-services.json'),backupCandidate(root)].filter(Boolean);
  for(const p of options)if(validateJson(p).ok){console.log(p);process.exit(0);}
  process.exit(2);
}
if(!sourceArg)fail('Chua chon duong dan JSON can khoi phuc.',2);
if(file(destination)){
  const current=validateJson(destination);
  fail(current.ok?'Config da ton tai va hop le; khong ghi de.':'Config hien co bi sai. KHONG tu ghi de; hay sao luu va sua thu cong.',2);
}
const chosen=path.resolve(sourceArg);
const verified=validateJson(chosen);
if(!verified.ok)fail('File duoc chon khong hop le: '+verified.message,2);
if(canonical(destination)===canonical(chosen))fail('File nguon trung file dich.',2);
try {
  fs.copyFileSync(chosen,destination,fs.constants.COPYFILE_EXCL);
  const again=validateJson(destination);
  if(!again.ok){fs.rmSync(destination,{force:true});fail('Xac minh sau sao chep khong dat.');}
  console.log('[FIREBASE ANDROID] PASS: da khoi phuc config dung project. File chi o thu muc project dang build.');
}catch(error){fail('Khong the sao chep an toan: '+error.message);}
