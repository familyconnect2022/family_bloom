#!/usr/bin/env node
'use strict';
// Android-only R7 Web separation. Uses only Node.js built-in modules.
// No firebase/network calls. Never traverses symlinks, writes secrets, or deletes unknown files.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const releaseRoot=path.resolve(__dirname,'../../..');
const bundleRoot=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(bundleRoot,'manifest.json'),'utf8'));
const {execFileSync}=require('node:child_process');
const mode=process.argv[2];
const targetInput=(process.argv[3]||'').trim().replace(/^"|"$/g,'');
const target=targetInput?path.resolve(targetInput):'';
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const exists=p=>{try{return fs.existsSync(p)}catch{return false}};
const isFile=p=>{try{return fs.statSync(p).isFile()}catch{return false}};
const stop=s=>{throw Error(s)};
function safeRel(rel){
 if(typeof rel!=='string'||!rel||rel.startsWith('/')||rel.includes('\\')||rel.split('/').some(x=>!x||x==='.'||x==='..'||x===':')||/^[A-Za-z]:/.test(rel))stop('Unsafe relative path: '+rel);
 return rel;
}
function safeResolve(root,rel){
 safeRel(rel);const abs=path.resolve(root,...rel.split('/'));
 if(!abs.startsWith(path.resolve(root)+path.sep))stop('Path outside project: '+rel);
 let at=root;
 for(const part of rel.split('/')){
  at=path.join(at,part);
  if(exists(at) && fs.lstatSync(at).isSymbolicLink())stop('Symlink/junction path refused: '+at);
 }
 return abs;
}
const normal=p=>process.platform==='win32'?fs.realpathSync.native(p).toLowerCase():fs.realpathSync.native(p);
function assertProject(){
 if(!targetInput)stop('Provide existing Android Family Bloom PROJECT FOLDER as the second argument.');
 if(!isFile(path.join(target,'package.json'))||!isFile(path.join(target,'app.json')))stop('Selected folder is not a Family Bloom source project: '+target);
 if(!isFile(path.join(target,'src/app/_layout.tsx')))stop('Missing Android route; do not select ZIP extraction or arbitrary directory.');
 if(!isFile(path.join(releaseRoot,'package.json'))){/* patch ZIP has no package.json; expected */}
 const a=normal(target),b=normal(releaseRoot);
 if(a===b||a.startsWith(b+path.sep)||b.startsWith(a+path.sep))stop('Extract update ZIP OUTSIDE the existing project folder.');
 const pkg=JSON.parse(fs.readFileSync(path.join(target,'package.json'),'utf8'));
 const app=JSON.parse(fs.readFileSync(path.join(target,'app.json'),'utf8'));
 if(pkg.name!=='family-bloom'||app.expo?.android?.package!=='com.familybloom.android')stop('Unexpected Android app identity.');
 if(Number(app.expo?.android?.versionCode)!==manifest.androidVersionCode)stop('Unsupported versionCode; expected R7 '+manifest.androidVersionCode+'.');
}
function audit(){
 assertProject();
 let pending=0,already=0,optional=0;const ops=[],notes=[];
 for(const e of manifest.operations){
  const output=safeResolve(target,e.path);
  const actual=isFile(output)?hash(output):null;
  const before=e.before||null,after=e.after||null;
  if(actual===after){already++;continue}
  if(actual!==before){
   if(e.optionalPreserveExisting && actual!==null){
    optional++;notes.push('PRESERVE custom BAT: '+e.path+' (not overwritten)');continue;
   }
   stop('Unexpected local file/change: '+e.path+' (expected R7 baseline; nothing modified). Actual SHA-256: '+(actual||'absent'));
  }
  if(after){
   const src=safeResolve(path.join(bundleRoot,'payload'),e.path);
   if(!isFile(src)||hash(src)!==after)stop('Corrupted update payload: '+e.path);
  }
  ops.push(e);pending++;
 }
 return {pending,already,optional,notes,ops};
}
function copyFile(src,dest){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest)}
function stamp(){return new Date().toISOString().replace(/[-:]/g,'').replace('T','-').replace(/\..+/, '');}
function pruneEmptyWebDirs(){
 const roots=['src/web','public','document/web','document/releases/phase-17/web','scripts/windows/web'];
 function prune(dir){
  if(!exists(dir))return;
  if(!fs.statSync(dir).isDirectory())stop('Expected Web directory: '+dir);
  if(fs.lstatSync(dir).isSymbolicLink())stop('Unsafe Web symlink: '+dir);
  for(const name of fs.readdirSync(dir)){
   const full=path.join(dir,name);
   if(fs.lstatSync(full).isDirectory())prune(full);
  }
  if(fs.readdirSync(dir).length===0)fs.rmdirSync(dir);
 }
 for(const d of roots)prune(safeResolve(target,d));
}
function install(){
 const checked=audit();
 if(!checked.pending){console.log('[PASS] Already up to date; no writes needed.');for(const n of checked.notes)console.log('[INFO]',n);return}
 // Backups live OUTSIDE target, separate from project and its generated source.
 const backupHome=path.join(path.dirname(target),'_FamilyBloom_Backups','Web_Split_Android');
 let backup=path.join(backupHome,stamp());
 for(let n=1;exists(backup);n++)backup=path.join(backupHome,stamp()+'-'+n);
 fs.mkdirSync(backup,{recursive:true});
 const oldDir=path.join(backup,'original-files');
 const record=[];
 try{
  for(const e of checked.ops){
   const src=safeResolve(target,e.path);
   const present=isFile(src);
   if(present)copyFile(src,safeResolve(oldDir,e.path));
   record.push({path:e.path,wasPresent:present,before:e.before||null,after:e.after||null});
  }
  fs.writeFileSync(path.join(backup,'backup-info.json'),JSON.stringify({createdAt:new Date().toISOString(),target,source:releaseRoot,items:record,info:'Only files changed/removed by this update; .env, Firebase/Cloudinary configuration untouched'},null,2));
  for(const rec of record){
   if(rec.wasPresent){if(!isFile(safeResolve(oldDir,rec.path))||hash(safeResolve(oldDir,rec.path))!==rec.before)stop('Backup verification failed for '+rec.path)}
  }
  console.log('[BACKUP PASS]',backup,record.length,'files affected; copied originals verified');
 }catch(e){stop('Backup incomplete. No project files changed: '+e.message)}
 const touched=[];
 try{
  for(const e of checked.ops){
   const dst=safeResolve(target,e.path);
   if(e.after)copyFile(safeResolve(path.join(bundleRoot,'payload'),e.path),dst);
   else if(isFile(dst))fs.unlinkSync(dst);
   touched.push(e);
  }
  pruneEmptyWebDirs();
  const post=audit();
  if(post.pending!==0)stop('Post-install audit mismatch: '+post.pending+' pending');
  try{
    execFileSync(process.execPath,[path.join(target,'scripts/tests/release/test-android-only-no-legacy-web.cjs')],
      {cwd:target,stdio:'pipe',timeout:15000});
  }catch(error){stop('Android-only source gate failed: '+String(error.stderr||error.message).slice(-1100));}
  console.log('[INSTALL PASS] Android-only source is updated. Changed:',touched.length,'Optional preserved:',post.optional);
  console.log('[BACKUP LOCATION]',backup);
  console.log('No Android APK/native build, production Firebase deploy, or Vercel deploy was executed.');
 }catch(e){
  console.error('[ROLLBACK] Restoring changed files from verified backup...');
  for(const item of touched.reverse()){
   const recordItem=record.find(x=>x.path===item.path),dst=safeResolve(target,item.path);
   if(recordItem.wasPresent)copyFile(safeResolve(oldDir,item.path),dst);
   else if(isFile(dst))fs.unlinkSync(dst);
  }
  stop('Update rolled back due to: '+e.message+' . Original files in '+backup);
 }
}
try{
 if(!['check','install'].includes(mode))stop('Usage: node apply.cjs check|install "D:\\Family Bloom App + Server\\Family_Bloom"');
 const result=audit();
 console.log('[BASELINE CHECK PASS] Pending:',result.pending,'Already:',result.already,'Preserved custom:',result.optional,'Total:',manifest.operations.length);
 for(const n of result.notes)console.log('[INFO]',n);
 if(mode==='install')install();
}catch(e){console.error('[SAFE UPDATE STOP] '+(e instanceof Error?e.message:String(e)));process.exitCode=1}
