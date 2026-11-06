#!/usr/bin/env node
'use strict';
/** R11R4 forward-only safe updater from R11R3. No UI, Firebase, native, or root BAT changes. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'document/releases/fb-r11r4-motion-manifest.json'),'utf8'));
const op=(process.argv[2]||'check').toLowerCase();
const targetPath=(process.argv[3]||'').trim().replace(/^['"]|['"]$/g,'');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const lstat=p=>{try{return fs.lstatSync(p)}catch{return null}};
const file=p=>{const s=lstat(p);return !!s&&s.isFile()&&!s.isSymbolicLink()};
const stop=message=>{throw new Error(message)};
function safe(dir,relative){
  if(!relative || path.isAbsolute(relative) || relative.includes('\\') || relative.split('/').some(p=>!p||p==='..'||p==='.'||p===':'))stop('Unsafe patch path: '+relative);
  const p=path.resolve(dir,relative);
  if(!p.startsWith(dir+path.sep))stop('Patch path escaped project: '+relative);
  let cursor=dir;
  if(lstat(cursor)?.isSymbolicLink())stop('Project root cannot be symlink');
  for(const part of relative.split('/')){
    cursor=path.join(cursor,part);
    if(lstat(cursor)?.isSymbolicLink())stop('Symlink blocked: '+relative);
  }
  return p;
}
function locate(){
  if(!targetPath)stop('Missing project path. Usage: node scripts\\maintenance\\fb-r11r4-entry-motion.cjs check "D:\\...\\Family_Bloom"');
  let dir=path.resolve(targetPath);
  if(file(dir)&&['package.json','app.json'].includes(path.basename(dir)))dir=path.dirname(dir);
  if(!lstat(dir)?.isDirectory())stop('Folder does not exist: '+dir);
  for(const f of ['package.json','app.json','src/app/_layout.tsx','src/app/(internal)/motion-lab.tsx']){
    if(!file(safe(dir,f)))stop('Not an installed R11R3 Family Bloom Android project: missing '+f);
  }
  if(fs.realpathSync(dir)===fs.realpathSync(root))stop('You selected the SOURCE/PATCH folder instead of installed app project.');
  const pkg=JSON.parse(fs.readFileSync(safe(dir,'package.json')));
  const app=JSON.parse(fs.readFileSync(safe(dir,'app.json')));
  if(pkg.name!=='family-bloom'||app.expo?.android?.package!=='com.familybloom.android'||app.expo?.android?.versionCode!==143045)
    stop('Family Bloom Android identity/versionCode mismatch. No files changed.');
  const release=JSON.parse(fs.readFileSync(safe(dir,'scripts/setup/family-bloom-source-release.json')));
  if(release.sourceReleaseId!=='R11'||!['R11R3','R11R4'].includes(release.patchReleaseId))
    stop('Expected installed R11R3 source, found '+release.patchReleaseId+'. Never patch R10 backup.');
  return dir;
}
function preflight(){
  const dir=locate(),pending=[],done=[],invalid=[];
  for(const e of manifest.files){
    if(manifest.preserve.some(p=>e.path===p||e.path.startsWith(p+'/')))stop('Preserved file in patch: '+e.path);
    const source=safe(root,e.path),target=safe(dir,e.path);
    if(!file(source)||sha(source)!==e.after)stop('Patch package corrupt or missing '+e.path);
    const current=file(target)?sha(target):null;
    if(current===e.after)done.push(e.path);
    else if(e.before.includes(current))pending.push(e.path);
    else invalid.push({path:e.path,found:current||'MISSING',expected:e.before.join(' | ')});
  }
  if(invalid.length){
    invalid.forEach(e=>console.error('[SHA MISMATCH] '+e.path+'\n  found: '+e.found+'\n  expected: '+e.expected));
    stop('R11R3 source differs in '+invalid.length+' file(s). NO FILES CHANGED. Do not force-update.');
  }
  console.log('[CHECK PASS] Family Bloom R11R4 Motion Entry from R11R3');
  console.log('[PROJECT] '+dir);
  console.log('[CHECK PASS] pending='+pending.length+', already_updated='+done.length);
  console.log('[PRESERVE] R10 backup, .env, root BATs, Firebase/Rules, Android native, servers.');
  return {dir,pending};
}
function install(){
  const {dir,pending}=preflight();
  if(!pending.length){console.log('[INSTALL PASS] Already installed R11R4.');return;}
  const base=process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share');
  const backup=path.join(base,'FamilyBloom','R11R4_motion','backups',new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid);
  fs.mkdirSync(backup,{recursive:true});
  const original=[];
  for(const rel of pending){
    const target=safe(dir,rel),dst=safe(backup,rel),exists=file(target);
    if(exists){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(target,dst);if(sha(dst)!==sha(target))stop('Backup SHA mismatch: '+rel);}
    original.push({rel,exists});
  }
  fs.writeFileSync(path.join(backup,'backup-manifest.json'),JSON.stringify({date:new Date().toISOString(),dir,original},null,2));
  console.log('[BACKUP] '+backup);
  const written=[];
  try{
    for(const rel of pending){
      const src=safe(root,rel),dst=safe(dir,rel);
      fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);written.push(rel);
      if(sha(dst)!==sha(src))stop('Post-copy verification failed: '+rel);
    }
    const p=preflight();if(p.pending.length)stop('Incomplete patch after copy');
    console.log('[INSTALL PASS] R11R4 installed '+written.length+' files; backup retained at '+backup);
  }catch(err){
    console.error('[ROLLBACK] '+err.message);
    for(const rel of written.reverse()){
      const prev=original.find(x=>x.rel===rel),dst=safe(dir,rel),src=safe(backup,rel);
      if(prev?.exists){fs.copyFileSync(src,dst);}
      else if(file(dst))fs.unlinkSync(dst);
    }
    throw err;
  }
}
try{if(op==='check')preflight();else if(op==='install')install();else stop('Usage: check or install');}
catch(err){console.error('[STOP] '+err.message);process.exitCode=1;}
