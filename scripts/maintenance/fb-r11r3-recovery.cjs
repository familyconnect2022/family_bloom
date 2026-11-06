#!/usr/bin/env node
'use strict';
/* Family Bloom R11R3: standalone SHA-bound patch, no GUI selector, no Firebase writes.
 * Runs from either the FULL CODE R11R3 folder or the small R11R3 patch folder. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../..');
const MANIFEST=JSON.parse(fs.readFileSync(path.join(ROOT,'document/releases/fb-r11r3-motion-manifest.json'),'utf8'));
const OP=(process.argv[2]||'check').toLowerCase();
const targetArgument=(process.argv[3]||'').trim().replace(/^['"]|['"]$/g,'');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const file=p=>{try{return fs.lstatSync(p).isFile()&&!fs.lstatSync(p).isSymbolicLink();}catch{return false;}};
const exists=p=>{try{return fs.lstatSync(p),true;}catch{return false;}};
const stop=s=>{throw new Error(s);};
const safe=(root,rel)=>{
  if(!rel||path.isAbsolute(rel)||rel.includes('\\')||rel.split('/').some(s=>!s||s==='.'||s==='..')) stop('Bad relative path '+rel);
  const resolved=path.resolve(root,rel);if(!resolved.startsWith(root+path.sep))stop('Path escaped root '+rel);
  let current=root;for(const part of rel.split('/')) {current=path.join(current,part);if(exists(current)&&fs.lstatSync(current).isSymbolicLink())stop('Symlink blocked '+rel);}
  return resolved;
};
function locate(){
  if(!targetArgument)stop('Missing project path. Usage: node scripts/maintenance/fb-r11r3-recovery.cjs check "D:\\...\\Family_Bloom"');
  let target=path.resolve(targetArgument);
  if(file(target)&&/^(package|app)\.json$/i.test(path.basename(target)))target=path.dirname(target);
  if(!exists(target)||!fs.statSync(target).isDirectory())stop('Project folder not found: '+target);
  if(!file(path.join(target,'package.json'))||!file(path.join(target,'app.json'))||!file(path.join(target,'src/app/_layout.tsx')))
    stop('Select the actual Family_Bloom project folder containing package.json, app.json and src/app/_layout.tsx: '+target);
  if(fs.realpathSync(target)===fs.realpathSync(ROOT))stop('You selected the R11R3 source folder instead of your installed Family_Bloom project.');
  const pkg=JSON.parse(fs.readFileSync(path.join(target,'package.json')));
  const app=JSON.parse(fs.readFileSync(path.join(target,'app.json')));
  if(pkg.name!=='family-bloom'||app.expo?.android?.package!=='com.familybloom.android')stop('Not a Family Bloom Android project: '+target);
  if(app.expo?.android?.versionCode!==143045)stop('Unexpected Android versionCode; STOP. Found '+app.expo?.android?.versionCode);
  // This is a recovery patch FOR R11 trial only, not a generic R10->R11 installer.
  if(!file(path.join(target,'src/app/(internal)/motion-lab.tsx'))||!file(path.join(target,'src/motion/BloomMotion.tsx')))
    stop('This folder does not have R11 Motion Lab. Use R11/R11R2 trial source, NOT plain R10. No files changed.');
  return target;
}
function preflight(){
  const target=locate();const pending=[],done=[],errors=[];
  for(const e of MANIFEST.files){
    const src=safe(ROOT,e.path),dst=safe(target,e.path);
    if(!file(src)||sha(src)!==e.after)stop('Recovery ZIP is incomplete or damaged: '+e.path+' (re-extract full ZIP/patch).');
    const current=file(dst)?sha(dst):null;
    if(current===e.after){done.push(e.path);continue;}
    if(!e.before.includes(current))errors.push({file:e.path,current:current||'MISSING',allowed:e.before.join(' | ')});
    else pending.push(e.path);
  }
  if(errors.length){
    for(const e of errors) console.error('[SHA MISMATCH] '+e.file+'\n  current: '+e.current+'\n  expected: '+e.allowed);
    stop('Source differs from approved R11/R11R2. '+errors.length+' mismatch(es). NO FILES CHANGED. Send this log; do not force overwrite.');
  }
  console.log('[CHECK PASS] R11R3 recovery target: '+target);
  console.log('[CHECK PASS] '+pending.length+' file(s) to update, '+done.length+' already updated.');
  console.log('[PRESERVE] .env, Firebase data/Rules, native Android, build BAT, R10 backup unchanged.');
  return {target,pending,done};
}
function install(){
  const c=preflight();if(!c.pending.length)return console.log('PASS: R11R3 already installed.');
  const local=process.env.LOCALAPPDATA||path.join(os.homedir(),'.local','share');
  const base=path.join(local,'FamilyBloom','R11R3_recovery','backups');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const backup=path.join(base,stamp+'-'+process.pid);
  fs.mkdirSync(backup,{recursive:true});
  const prior=[];
  console.log('[BACKUP] '+backup);
  for(const rel of c.pending){
    const src=safe(c.target,rel), b=safe(backup,rel), present=file(src);
    if(present){fs.mkdirSync(path.dirname(b),{recursive:true});fs.copyFileSync(src,b);if(sha(src)!==sha(b))stop('Backup verification failed: '+rel);}
    prior.push({path:rel,present});
  }
  fs.writeFileSync(path.join(backup,'manifest.json'),JSON.stringify({target:c.target,date:new Date().toISOString(),files:prior},null,2));
  const written=[];
  try{
    for(const rel of c.pending){
      const dest=safe(c.target,rel),src=safe(ROOT,rel);
      fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);written.push(rel);
      if(sha(dest)!==sha(src))stop('Post-write SHA mismatch: '+rel);
    }
    const post=preflight();if(post.pending.length)stop('Post-install incomplete.');
    console.log('[INSTALL PASS] R11R3 repaired '+written.length+' files.');
    console.log('[BACKUP] '+backup);
    console.log('Build a new Release APK from your installed project, then test on Android.');
  }catch(err){
    console.error('[ROLLBACK] '+err.message);
    for(const rel of written.reverse()){
      const info=prior.find(x=>x.path===rel),dest=safe(c.target,rel),src=safe(backup,rel);
      if(info?.present){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest);}
      else if(file(dest))fs.unlinkSync(dest);
    }
    throw err;
  }
}
try{
  if(OP==='check')preflight();
  else if(OP==='install'||OP==='apply')install();
  else stop('Unknown mode '+OP+'. Use check or install.');
}catch(err){console.error('[STOP] '+err.message);process.exitCode=1;}
