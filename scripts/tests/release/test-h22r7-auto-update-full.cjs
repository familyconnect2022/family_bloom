#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs=require('node:fs'), path=require('node:path'), os=require('node:os');
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__legacyScriptsDir,'..');
const helper=path.join(root,'scripts/maintenance/auto-update-full.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'family-bloom-auto-update-'));
const target=path.join(tmp,'old project with spaces');
const state=path.join(tmp,'state');
let n=0;
function check(desc,ok){assert(ok,desc);n++;console.log('PASS '+desc);}
function run(cmd, env={}){
  const r=spawnSync(process.execPath,[helper,cmd],{cwd:root,encoding:'utf8',env:{...process.env,FB_SOURCE:root,FB_TARGET:target,FB_STATE_DIR:state,...env},timeout:45000});
  if(r.error)throw r.error;
  return {status:r.status,log:r.stdout+'\n'+r.stderr};
}
const put=(rel,content)=>{const f=path.join(target,rel);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,content);};
try {
 fs.mkdirSync(target,{recursive:true});
 for(const f of ['package.json','app.config.js','app.json'])fs.copyFileSync(path.join(root,f),path.join(target,f));
 const app=JSON.parse(fs.readFileSync(path.join(target,'app.json'),'utf8'));
 app.expo.android.versionCode--;
 put('app.json',JSON.stringify(app));
 put('.env','SECRET=keep-me');
 put('google-services.json','{"old-firebase":"keep"}');
 put('src/my-local-file.ts','export const stable = 1;');
 put('node_modules/demo/unwanted.js','not-needed');
 put('android/app/build/apk/old.apk','old-cache');
 put('scripts/android/maintenance/old-only.bat','old-script');
 check('Preflight accepts FULL only after executing real structure gate',run('check').status===0);
 check('Identical SOURCE and TARGET are blocked',run('check',{FB_TARGET:root}).status!==0);
 check('Nested target inside FULL source is blocked',run('check',{FB_TARGET:path.join(root,'src')}).status!==0);
 let downgrade=JSON.parse(fs.readFileSync(path.join(target,'app.json'),'utf8'));
 downgrade.expo.android.versionCode+=2;put('app.json',JSON.stringify(downgrade));
 check('Downgrade is blocked',run('check').status!==0);
 downgrade.expo.android.versionCode-=2;put('app.json',JSON.stringify(downgrade));
 const b=run('backup');
 check('Complete source backup succeeds before cleanup',b.status===0&&b.log.includes('BACKUP PASS'));
 const backupDir=fs.readFileSync(path.join(state,'last-backup.txt'),'utf8').trim();
 check('Backup includes original project file and local secret',fs.readFileSync(path.join(backupDir,'project-source/src/my-local-file.ts'),'utf8').includes('stable = 1')&&fs.readFileSync(path.join(backupDir,'project-source/.env'),'utf8')==='SECRET=keep-me');
 check('Backup excludes generated node_modules and root Android',!fs.existsSync(path.join(backupDir,'project-source/node_modules'))&&!fs.existsSync(path.join(backupDir,'project-source/android')));
 const c=run('overlay');
 check('FULL overlay succeeds',c.status===0);
 check('Overlay copied nested native Android module (not wrongly excluded)',fs.existsSync(path.join(target,'modules/family-bloom-overlay/android')));
 check('Overlay copied scripts/android for Build and Share',fs.existsSync(path.join(target,'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat')));
 check('Overlay preserved target .env and Firebase file',fs.readFileSync(path.join(target,'.env'),'utf8')==='SECRET=keep-me'&&fs.readFileSync(path.join(target,'google-services.json'),'utf8').includes('old-firebase'));
 check('Overlay never mirrors/deletes unknown local source',fs.existsSync(path.join(target,'src/my-local-file.ts')));
 check('Overlay never copied generated root native files',fs.readFileSync(path.join(target,'android/app/build/apk/old.apk'),'utf8')==='old-cache');
 check('Hash verification passes',run('verify').status===0);
 const structureCheck=(project)=>spawnSync(process.execPath,[path.join(project,'scripts/maintenance/check-project-structure.js')],{cwd:project,encoding:'utf8',timeout:45000});
 const structure=structureCheck(target);
 check('Real project structure gate passes on a copied FULL overlay (no root launchers)',structure.status===0);
 put('Family_Bloom_UNMANAGED.bat','@echo off\r\n');
 check('Real structure gate still rejects an unmanaged extra root BAT',structureCheck(target).status!==0);
 fs.unlinkSync(path.join(target,'Family_Bloom_UNMANAGED.bat'));
 check('Structure gate recovers when unmanaged BAT is removed',structureCheck(target).status===0);
 const overwritten=path.join(target,'src/services/does-not-exist');
 const good=path.join(target,'app.config.js');const original=fs.readFileSync(good);fs.writeFileSync(good,'CORRUPTED');
 check('Verification fails after a corrupted copied file',run('verify').status!==0);fs.writeFileSync(good,original);
 check('Target location saved for the next update',run('remember').status===0&&fs.readFileSync(path.join(state,'last-target.txt'),'utf8').includes('old project with spaces'));
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/setup/bat-entrypoints-manifest.json'),'utf8'));
 const names=['scripts/android/Family_Bloom_MENU.bat','scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat'];
 check('Canonical menu and automatic updater are registered',names.every(x=>manifest.batFiles.includes(x)));
 check('PRE-COPY cleanup supports noninteractive success and failure without pause',fs.readFileSync(path.join(root,'scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat'),'utf8').match(/if \/I not "%~2"=="--no-pause" pause/g)?.length===2);
 console.log(`H22R7 one-click updater tests: ${n}/${n} PASS`);
}catch(e){console.error('FAIL',e.stack||e.message);process.exitCode=1;}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
