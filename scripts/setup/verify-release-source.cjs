#!/usr/bin/env node
'use strict';
// Strict raw-byte release verification; optional repair ONLY for EOL-only checkout changes.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../..');
const manifestFile='ANDROID_SOURCE_MANIFEST.json';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const repair=process.argv.includes('--repair-eol');
const fail=[];let repaired=0;
const normalize=b=>Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));
function isText(b){return !b.includes(0)&&Buffer.from(b.toString('utf8')).equals(b);}
function gitBlob(rel){const r=cp.spawnSync('git',['-C',root,'show',':'+rel],{encoding:null,maxBuffer:20*1024*1024});return r.status===0?r.stdout:null;}
const m=JSON.parse(fs.readFileSync(path.join(root,manifestFile),'utf8'));
const app=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo;
if(m.release!=='R16R11R111'||m.version!==app.version||m.versionCode!==app.android.versionCode||m.fileCount!==m.files.length)throw Error('Release manifest/version mismatch');
const seen=new Set();
for(const e of m.files){
 if(typeof e.path!=='string'||path.isAbsolute(e.path)||e.path.split('/').some(x=>!x||x==='..'||x==='.')||seen.has(e.path)||e.path===manifestFile)throw Error('Unsafe manifest path');
 seen.add(e.path);const p=path.join(root,e.path);
 try{
  if(!fs.lstatSync(p).isFile())throw Error('not a regular file');
  const real=fs.realpathSync(p);if(!real.startsWith(root+path.sep))throw Error('outside source root');
  let actual=fs.readFileSync(p);
  if(actual.length===e.bytes&&sha(actual)===e.sha256)continue;
  if(repair&&isText(actual)){
   const lf=normalize(actual);
   const crlf=Buffer.from(lf.toString('utf8').replace(/\n/g,'\r\n'));
   // Use only candidate bytes with exact manifest SHA-256 and equal normalized content.
   // Pure LF/CRLF candidates also work for an extracted ZIP; Git index handles mixed EOL.
   const matches=b=>b&&b.length===e.bytes&&sha(b)===e.sha256&&isText(b)&&normalize(b).equals(lf);
   const canonical=[lf,crlf].find(matches)||[gitBlob(e.path)].find(matches);
   if(canonical){
    fs.writeFileSync(p,canonical);actual=fs.readFileSync(p);
    if(actual.length===e.bytes&&sha(actual)===e.sha256){repaired++;continue;}
   }
  }
  fail.push(e.path+' (SHA-256 mismatch)');
 }catch(e2){fail.push(e.path+' ('+e2.message+')');}
}
if(fail.length){console.error('[FAIL] Android source integrity: '+fail.length+' files');for(const e of fail.slice(0,30))console.error(e);console.error('Do not build. The root BATs attempt only verified EOL repair automatically. Restore any genuinely changed source before building. Never reset local credentials or edit expected SHA values.');process.exit(1);}
console.log('[PASS] Android '+m.release+' SHA-256: '+seen.size+' files; EOL-only repaired: '+repaired);
