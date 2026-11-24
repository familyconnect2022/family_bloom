#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),readline=require('node:readline/promises');
const project=path.resolve(__dirname,'../..'),file=path.join(project,'.env');
const action=process.argv[2]||'check';
const media='https://vercelfamilybloommedia.vercel.app';
const chess='https://render-chess-xiangqi.onrender.com';
const gatewayKey='EXPO_PUBLIC_SINGLE_SESSION_API_URL';
const defaults={EXPO_PUBLIC_MOMENT_MEDIA_API_URL:media,EXPO_PUBLIC_CHESS_SOCKET_URL:chess,EXPO_PUBLIC_SINGLE_SESSION_ENABLED:'1',EXPO_PUBLIC_SINGLE_SESSION_ANDROID_PREVIEW:'0',EXPO_PUBLIC_FB_SESSION_DIAGNOSTICS:'0'};
function validHttps(value,suffix){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.hash&&!u.search&&!/replace_|example|your-service/i.test(u.hostname)&&(!suffix||u.pathname===suffix);}catch{return false;}
}
function props(source){return Object.fromEntries(source.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(line=>{const i=line.indexOf('=');return i>0?[line.slice(0,i).trim(),line.slice(i+1).trim().replace(/^(['"])(.*)\1$/,'$2')]:[line,''];}));}
function gateway(input){
 const supplied=String(input||'').trim().replace(/\/+$/,'');
 try{const u=new URL(supplied);const result=u.pathname==='/'?u.origin+'/api/session':supplied;return validHttps(result,'/api/session')&&!u.username&&!u.password&&!u.hash&&!u.search?result:'';}catch{return '';}
}
function invalid(env){
 const checks=[[gatewayKey,validHttps(env[gatewayKey],'/api/session')],['EXPO_PUBLIC_SINGLE_SESSION_ENABLED',env.EXPO_PUBLIC_SINGLE_SESSION_ENABLED==='1'],['EXPO_PUBLIC_MOMENT_MEDIA_API_URL',validHttps(env.EXPO_PUBLIC_MOMENT_MEDIA_API_URL)],['EXPO_PUBLIC_CHESS_SOCKET_URL',validHttps(env.EXPO_PUBLIC_CHESS_SOCKET_URL)],['EXPO_PUBLIC_SINGLE_SESSION_ANDROID_PREVIEW',!env.EXPO_PUBLIC_SINGLE_SESSION_ANDROID_PREVIEW||env.EXPO_PUBLIC_SINGLE_SESSION_ANDROID_PREVIEW==='0']];
 return checks.filter(([,ok])=>!ok).map(([key])=>key);
}
function init(value){
 if(fs.existsSync(file))throw Error('.env already exists. Refusing overwrite.');
 const url=gateway(value);if(!url)throw Error('Gateway must be an HTTPS URL ending /api/session.');
 const template=fs.readFileSync(path.join(project,'.env.main.example'),'utf8');
 fs.writeFileSync(file,template.replace('https://REPLACE_WITH_YOUR_GATEWAY_DOMAIN/api/session',url),{mode:0o600,flag:'wx'});
 console.log('[ENV] .env created once. Public addresses only.');
}
function read(){return fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';}
function check(){
 if(!fs.existsSync(file))throw Error('.env missing. Run either root BAT to configure it once.');
 const env=props(read()),fail=invalid(env);
 if(fail.length)throw Error('Missing or invalid: '+fail.join(', '));
 // Expo dotenv files can override .env. Stop before bundling conflicting public values.
 for(const name of ['.env.local','.env.development','.env.development.local','.env.production','.env.production.local']){
  const f=path.join(project,name);if(!fs.existsSync(f))continue;
  const overlay=props(fs.readFileSync(f,'utf8'));
  for(const key of [gatewayKey,...Object.keys(defaults)])if(overlay[key]!==undefined&&overlay[key]!==env[key])throw Error(name+' overrides '+key+'. Align the local configuration; no file was overwritten.');
 }
 for(const key of [gatewayKey,...Object.keys(defaults)])if(process.env[key]!==undefined&&process.env[key]!==env[key])throw Error('Shell environment overrides '+key+'. Remove conflicting value before build.');
 console.log('[ENV PASS] Android Media / Chess / Session Gateway settings validated.');
}
async function ensure(){
 const existed=fs.existsSync(file),source=read(),env=props(source),fail=invalid(env);
 if(existed&&!fail.length){check();return;}
 if(!process.stdin.isTTY)throw Error('Interactive setup required. Run either root BAT in a terminal.');
 const rl=readline.createInterface({input:process.stdin,output:process.stdout});
 try{
  let url=env[gatewayKey];
  if(fail.includes(gatewayKey)){
   url=gateway(await rl.question('Enter Production Session Gateway HTTPS URL: '));
   if(!url)throw Error('Gateway must be a valid HTTPS URL ending /api/session.');
  }
  if(!existed){init(url);}
  else{
   const answer=(await rl.question('Repair only invalid public Family Bloom settings in existing .env? [y/N]: ')).trim().toLowerCase();
   if(answer!=='y'&&answer!=='yes')throw Error('Configuration unchanged.');
   const patch=Object.fromEntries(fail.map(k=>[k,k===gatewayKey?url:defaults[k]]));
   const nl=source.includes('\r\n')?'\r\n':'\n';
   const lines=source.split(/\r?\n/),seen=new Set(),next=[];
   for(const line of lines){
    const match=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    const key=match?.[1];
    if(key&&Object.hasOwn(patch,key)){if(!seen.has(key)){next.push(key+'='+patch[key]);seen.add(key);}}
    else next.push(line);
   }
   for(const [k,v] of Object.entries(patch))if(!seen.has(k))next.push(k+'='+v);
   if(read()!==source)throw Error('.env changed during setup; retry.');
   fs.writeFileSync(file,next.join(nl).replace(/(?:\r?\n)?$/,nl));
   console.log('[ENV] Updated invalid public settings only; other entries preserved.');
  }
 }finally{rl.close();}
 check();
}
(async()=>{if(action==='init'){init(process.argv[3]);check();}else if(action==='check')check();else if(action==='ensure')await ensure();else throw Error('Usage: init GATEWAY_HTTPS_URL | check | ensure');})().catch(e=>{console.error('[ENV BLOCK] '+e.message);process.exitCode=1;});
