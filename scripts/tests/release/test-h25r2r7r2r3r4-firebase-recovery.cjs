#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// H25R2R7R2R3R4: test tinh an toan cua quy trinh khoi phuc cau hinh Firebase.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.join(__legacyScriptsDir,'..');
const tool=path.join(root,'scripts/android/build/firebase-android-config.cjs');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'Family Bloom Firebase spaces '));
const project=path.join(folder,'project V2');
const state=path.join(folder,'state');
fs.mkdirSync(project,{recursive:true});fs.mkdirSync(state,{recursive:true});
const good={project_info:{project_id:'family-connect-4184f'},client:[{client_info:{android_client_info:{package_name:'com.familybloom.android'}}}]};
const source=path.join(folder,'google-services.json');fs.writeFileSync(source,JSON.stringify(good));
fs.writeFileSync(path.join(project,'package.json'),JSON.stringify({name:'family-bloom'}));fs.writeFileSync(path.join(project,'app.config.js'),'module.exports={}');
let count=0;
function check(name,cond){assert(cond,name);console.log('PASS '+(++count)+' '+name);}
function run(cmd,...args){return spawnSync(process.execPath,[tool,cmd,project,...args],{env:{...process.env,FB_STATE_DIR:state},encoding:'utf8'});}
try{
 check('Project chua co google-services.json thi khong duoc build',run('check').status!==0);
 check('Lenh diagnose khong tao config',run('diagnose').status!==0&&!fs.existsSync(path.join(project,'google-services.json')));
 check('Khong lay mac dinh config tu thu muc FULL ZIP',run('candidate').status!==0);
 check('Khoi phuc file hop le trong project co duong dan chua dau cach',run('restore',source).status===0);
 check('File sau khoi phuc co bytes trung khop',fs.readFileSync(path.join(project,'google-services.json')).equals(fs.readFileSync(source)));
 check('Config chinh xac duoc kiem tra',run('check').status===0);
 check('Khong ghi de neu file da ton tai',run('restore',source).status!==0);
 fs.rmSync(path.join(project,'google-services.json'));
 const other=path.join(folder,'other.json');fs.writeFileSync(other,JSON.stringify({project_info:{project_id:'family-connect-4184f'},client:[{client_info:{android_client_info:{package_name:'com.wrong.app'}}}]}));
 check('Chong JSON sai Android applicationId',run('restore',other).status!==0&&!fs.existsSync(path.join(project,'google-services.json')));
 const foreign=path.join(folder,'foreign.json');fs.writeFileSync(foreign,JSON.stringify({...good,project_info:{project_id:'other-project'}}));
 check('Chong JSON sai Firebase project_id',run('restore',foreign).status!==0&&!fs.existsSync(path.join(project,'google-services.json')));
 const malformed=path.join(folder,'malformed.json');fs.writeFileSync(malformed,'not json');
 check('Chong JSON bi hong',run('restore',malformed).status!==0&&!fs.existsSync(path.join(project,'google-services.json')));
 const backup=path.join(folder,'backup 20261023');fs.mkdirSync(path.join(backup,'project-source'),{recursive:true});fs.writeFileSync(path.join(backup,'backup-info.json'),JSON.stringify({target:project}));fs.copyFileSync(source,path.join(backup,'project-source','google-services.json'));fs.writeFileSync(path.join(state,'last-backup.txt'),backup+'\r\n');
 check('Tim duoc config tu ban sao luu dung project',run('candidate').stdout.trim()===path.join(backup,'project-source','google-services.json'));
 fs.writeFileSync(path.join(backup,'backup-info.json'),JSON.stringify({target:path.join(folder,'different')}));
 check('Khong lay config tu backup cua project khac',run('candidate').status!==0);
 fs.rmSync(path.join(state,'last-backup.txt'));fs.mkdirSync(path.join(project,'android','app'),{recursive:true});fs.copyFileSync(source,path.join(project,'android','app','google-services.json'));
 check('Nhan ra config con lai trong android/app',run('candidate').stdout.trim()===path.join(project,'android','app','google-services.json'));
 check('Chon source trong project khong lam sua file goi FULL',fs.existsSync(path.join(root,'package.json')));
 const bat=fs.readFileSync(path.join(root,'scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat'),'utf8');
 check('Root BAT chuyen build ve project cai dat va phuc hoi truoc build',bat.includes('redirect-source')&&bat.includes('Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat')&&bat.includes('last-target.txt'));
 const native=fs.readFileSync(path.join(root,'scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat'),'utf8');
 check('Build release kiem tra config truoc bo test nang',native.indexOf('Family_Bloom_ENSURE_FIREBASE_ANDROID_CONFIG.bat')<native.indexOf('test-h25-firebase-invitation.cjs'));
 const redir=path.join(root,'scripts/android/build/resolve-build-target.cjs');
 const newZip=path.join(folder,'FULL release');const installed=path.join(folder,'project installed');
 const markers=['app.json','package.json','app.config.js','scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat',
 'src/features/study/StudyFormulaTemplates.ts','src/features/study/StudyFormulaEditor.tsx',
 'src/features/study/StudyFormulaExpression.ts',
 'src/features/study/StudyChemistry.ts',
 'scripts/tests/release/test-super-bloom-chemistry-safe-r3r8.cjs','scripts/tests/release/test-super-bloom-inline-chemical-follow-r3r9.cjs',
 'scripts/tests/release/test-super-bloom-solution-blocks-r3r10.cjs',
 'scripts/tests/release/test-super-bloom-math-typesetting-r3r11.cjs',
 'scripts/tests/release/test-r3r12-family-intro-letter-radical.cjs',
 'src/features/study/StudyComposer.tsx',
 'src/features/study/StudyFormula.tsx',
 'src/features/study/StudySolutionModel.ts',
 'src/features/study/studyRepository.ts','scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs',
 'scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs'];
 for(const dir of [newZip,installed])for(const rel of markers){const dst=path.join(dir,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,rel),dst)}
 function redirect(mode){return spawnSync(process.execPath,[redir,mode,newZip,installed],{encoding:'utf8'});}
 check('Redirect-source cho phep kiem source da cap nhat truoc khi phuc hoi Firebase',redirect('redirect-source').status===0);
 check('Redirect build van TU CHOI project thieu config',redirect('redirect').status!==0);
 // Sau phan hoi nguoi dung: file JSON co that, BAT co the kiem NHAM thu muc.
 const actual=path.join(folder,'Family_bloom_V2 - actual');
 for(const rel of markers){const dst=path.join(actual,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(root,rel),dst)}
 fs.copyFileSync(source,path.join(actual,'google-services.json'));
 const active=spawnSync(process.execPath,[tool,'diagnose',actual],{encoding:'utf8'});
 check('Thong bao dung thu muc project khi file JSON DA CO',active.status===0&&active.stdout.includes(actual)&&active.stdout.includes('[PASS]'));
 const old=redirect('redirect');
 check('Thong bao missing phai chi ro DUONG DAN dang kiem tra',old.status!==0&&old.stderr.includes(path.join(installed,'google-services.json')));
 const right=spawnSync(process.execPath,[redir,'redirect',newZip,actual],{encoding:'utf8'});
 check('Chon DUNG Family_bloom_V2 co JSON thi redirect thanh cong',right.status===0&&right.stdout.includes(actual));
 const current=fs.readFileSync(path.join(root,'scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat'),'utf8');
 check('BAT in duong dan current/saved va cho phep chon lai target',current.includes('Thu muc chay BAT')&&current.includes('Duong dan Auto Update nho')&&current.includes(':choose_target')&&current.includes('Select-FamilyBloomProjectFolder.ps1'));
 check('BAT uu tien JSON project hien tai truoc saved target',current.indexOf('check "%BUILD_SOURCE%"')<current.indexOf('last-target.txt'));


 console.log('FIREBASE RECOVERY '+count+'/'+count+' PASS');
}catch(e){console.error('[FAIL]',e.stack||e);process.exitCode=1;}
finally{fs.rmSync(folder,{recursive:true,force:true});}
