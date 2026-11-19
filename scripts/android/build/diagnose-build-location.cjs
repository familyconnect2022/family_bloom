#!/usr/bin/env node
'use strict';
/** Chan doan phan biet file JSON co ton tai, dung project, va co dung ROOT hay khong.
 *  KHONG in noi dung JSON, thong tin OAuth hay key rieng.
 *  Tool chi doc, khong ghi file, khong can node_modules. */
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(process.argv[2]||'.');
const file=(p)=>{try{return fs.statSync(p).isFile();}catch{return false;}};
const expectedPackage='com.familybloom.android', expectedProject='family-connect-4184f';
function report(relative){
  const target=path.join(root,relative);
  if(!file(target)){console.log('  [KHONG TIM THAY] '+target);return false;}
  try{
    const parsed=JSON.parse(fs.readFileSync(target,'utf8'));
    const pack=parsed.client?.some(x=>x?.client_info?.android_client_info?.package_name===expectedPackage);
    const proj=parsed.project_info?.project_id;
    const okay=pack&&proj===expectedProject;
    console.log('  ['+(okay?'HOP LE':'SAI CAU HINH')+'] '+target);
    if(!pack)console.log('    - Thieu Android package: '+expectedPackage);
    if(proj!==expectedProject)console.log('    - Firebase project_id khong dung du an mong doi.');
    return !!okay;
  }catch{console.log('  [JSON KHONG HOP LE] '+target);return false;}
}
console.log('[CHAN DOAN] Folder duoc dua vao: '+root);
console.log('[CAN KIEM TRA] app.config.js doi hoi file google-services.json tai ROOT.');
const rootValid=report('google-services.json');
report(path.join('android','app','google-services.json'));
if(!file(path.join(root,'package.json')))console.log('[LOI] Khong co package.json o duong dan tren; co the da chon nham folder cha/con.');
const state=path.join(process.env.LOCALAPPDATA||path.join(os.homedir(),'AppData','Local'),'FamilyBloom','updater','last-target.txt');
if(file(state))console.log('[DUONG DAN AUTO UPDATE LUU] '+fs.readFileSync(state,'utf8').trim());
if(rootValid)console.log('[PASS] Da tim thay Firebase config hop le tai ROOT; khong can chep them.');
else console.log('[GOI Y] Xac nhan duong dan project dang build, vi tri file JSON va duoi .json (khong phai .json.txt).');
