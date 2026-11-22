#!/usr/bin/env node
'use strict';
// Family Bloom R11R2 -> R11R4R1 ONE STEP. check: readonly. install: backup + SHA-bound copy.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const SOURCE=path.resolve(__dirname);
const manifest=JSON.parse(fs.readFileSync(path.join(SOURCE,'patch-manifest.json'),'utf8'));
const command=(process.argv[2]||'check').toLowerCase();
const pathArg=(process.argv[3]||'').trim().replace(/^['"]|['"]$/g,'');
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const stat=p=>{try{return fs.lstatSync(p);}catch{return null;}};
const file=p=>{const s=stat(p);return !!s&&s.isFile()&&!s.isSymbolicLink();};
const fail=m=>{throw Error(m);};
function safe(root,rel){
 if(!rel||path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').some(s=>!s||s==='.'||s==='..'))fail('Unsafe file path: '+rel);
 const loc=path.resolve(root,rel);
 if(!loc.startsWith(root+path.sep))fail('Path escaped root: '+rel);
 let p=root;
 if(stat(p)?.isSymbolicLink())fail('Project root symlink is forbidden');
 for(const part of rel.split('/')){p=path.join(p,part);if(stat(p)?.isSymbolicLink())fail('Symlink forbidden: '+rel);}
 return loc;
}
function identify(){
 if(!pathArg)fail('Use: node R11R2_TO_R11R4R1.cjs check "D:\\Family Bloom App + Server\\Family_Bloom"');
 let dir=path.resolve(pathArg);
 if(file(dir)&&['package.json','app.json'].includes(path.basename(dir).toLowerCase()))dir=path.dirname(dir);
 if(!stat(dir)?.isDirectory())fail('Project directory does not exist: '+dir);
 if(fs.realpathSync(dir)===fs.realpathSync(SOURCE))fail('Do not select the extracted patch folder as the installed project.');
 for(const f of ['package.json','app.json','src/app/_layout.tsx','src/motion/BloomMotion.tsx','src/app/(internal)/motion-lab.tsx','scripts/setup/family-bloom-source-release.json'])
  if(!file(safe(dir,f)))fail('Not an installed R11 Motion project. Missing: '+f);
 const pkg=JSON.parse(fs.readFileSync(safe(dir,'package.json'),'utf8'));
 const app=JSON.parse(fs.readFileSync(safe(dir,'app.json'),'utf8'));
 const release=JSON.parse(fs.readFileSync(safe(dir,'scripts/setup/family-bloom-source-release.json'),'utf8'));
 if(pkg.name!=='family-bloom'||app.expo?.android?.package!=='com.familybloom.android'||app.expo?.android?.versionCode!==143045)fail('Wrong app identity/versionCode. No files changed.');
 if(release.sourceReleaseId!=='R11'||!['R11R3','R11R4','R11R4R1',undefined,null].includes(release.patchReleaseId))
   fail('Expected R11R2/R3/R4 source. Found '+String(release.patchReleaseId)+'. No files changed.');
 return dir;
}
function inspect(){
 const dir=identify(),pending=[],done=[],wrong=[];
 for(const f of manifest.files){
  if(manifest.preserved.some(p=>f.path===p||f.path.startsWith(p+'/')))fail('Patch tries to overwrite protected path '+f.path);
  const source=safe(SOURCE,f.path),target=safe(dir,f.path);
  if(!file(source)||hash(source)!==f.after)fail('The downloaded patch is incomplete/corrupt: '+f.path+'; re-extract PATCH ZIP.');
  const cur=file(target)?hash(target):null;
  if(cur===f.after)done.push(f.path);
  else if(f.allowedBefore.includes(cur))pending.push(f.path);
  else wrong.push({file:f.path,actual:cur??'MISSING',allowed:f.allowedBefore});
 }
 if(wrong.length){
   for(const e of wrong){
    console.error('[SHA MISMATCH] '+e.file);
    console.error('  CURRENT: '+e.actual);
    console.error('  ALLOWED: '+e.allowed.map(v=>v??'MISSING').join(' | '));
   }
   fail('STOP: '+wrong.length+' source file(s) differ from known R11R2/R3/R4 releases. No project files changed. Send screenshot; do not force overwrite.');
 }
 console.log('[CHECK PASS] R11R2 -> R11R4R1 ONE STEP');
 console.log('[PROJECT] '+dir);
 console.log('[FILES] pending='+pending.length+'; already_current='+done.length+'; total='+manifest.files.length);
 console.log('[PRESERVED] Local BAT, .env, Firebase/Rules, Android native, R10 backup and user data.');
 for(const b of ['Family_Bloom_AUTO_UPDATE_FULL.bat','Family_Bloom_BUILD_APK_TO_SHARE.bat']){
  const p=safe(dir,b);if(file(p)){
   const buf=fs.readFileSync(p);
   if(/(^|[^\r])\n/.test(buf.toString('latin1')))console.warn('[WARNING] Existing '+b+' has LF-only line endings. Not modified by this patch.');
  }
 }
 return {dir,pending,done};
}
function install(){
 const c=inspect();if(!c.pending.length){console.log('[INSTALL PASS] Already up to date.');return;}
 const local=process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share');
 const backup=path.join(local,'FamilyBloom','R11R2_TO_R11R4R1_BACKUPS',new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid);
 fs.mkdirSync(backup,{recursive:true});
 const previous=[];
 for(const rel of c.pending){
  const origin=safe(c.dir,rel),destination=safe(backup,rel),has=file(origin);
  if(has){fs.mkdirSync(path.dirname(destination),{recursive:true});fs.copyFileSync(origin,destination);if(hash(destination)!==hash(origin))fail('Backup verification failed: '+rel);}
  previous.push({rel,has,sha:has?hash(origin):null});
 }
 fs.writeFileSync(path.join(backup,'backup-manifest.json'),JSON.stringify({project:c.dir,release:manifest.release,previous},null,2));
 console.log('[BACKUP PASS] '+backup);
 const written=[];
 try{
  for(const rel of c.pending){
   const from=safe(SOURCE,rel),to=safe(c.dir,rel);
   const prior=previous.find(v=>v.rel===rel);
   if(prior.has&&hash(to)!==prior.sha)fail('File changed during install, stop: '+rel);
   if(!prior.has&&stat(to))fail('Unexpected file appeared during install: '+rel);
   fs.mkdirSync(path.dirname(to),{recursive:true});
   fs.copyFileSync(from,to);written.push(rel);
   if(hash(to)!==hash(from))fail('Post-copy SHA mismatch: '+rel);
  }
  const post=inspect();if(post.pending.length)fail('Post-install check incomplete.');
  console.log('[INSTALL PASS] Direct R11R2 -> R11R4R1, verified '+written.length+' writes.');
  console.log('[BACKUP] '+backup);
  console.log('Build a NEW Android Release APK from the UPDATED installed project; do not reuse LATEST from failed runs.');
 }catch(error){
  console.error('[ROLLBACK] '+error.message);
  for(const rel of written.reverse()){
   const old=previous.find(v=>v.rel===rel),to=safe(c.dir,rel),original=safe(backup,rel);
   try{if(old.has)fs.copyFileSync(original,to);else if(file(to))fs.unlinkSync(to);}catch(rollbackError){console.error('[ROLLBACK ERROR] '+rel+': '+rollbackError.message);}
  }
  throw error;
 }
}
try{
 if(command==='check')inspect();else if(command==='install')install();
 else fail('Invalid command. Use check or install.');
}catch(error){console.error('[STOP] '+error.message);process.exitCode=1;}
