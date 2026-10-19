#!/usr/bin/env node
'use strict';
// H21R1: Verify both the named resources and aapt2's authoritative compiled
// resource table. Android may optimize/rename APK entry paths; jar tf alone
// cannot decide if R.raw.fb_board_* is usable at runtime.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const names = [
  'game_start','move_self','move_opponent','capture','move_check','castle',
  'promote','premove','illegal','tenseconds','game_end',
];
const project = path.resolve(__dirname,'../..');
const source = path.join(project, 'modules/family-bloom-overlay/android/src/main/res/raw');
let failed = false;
for (const name of names) {
  const src = path.join(source, `fb_board_${name}.mp3`);
  if (!fs.existsSync(src) || fs.statSync(src).size < 256) {
    console.error(`FAIL missing/empty native audio source: ${src}`);
    failed = true;
  }
}
const keepRules = path.join(source, 'keep.xml');
if (!fs.existsSync(keepRules) ||
    !names.every(n => fs.readFileSync(keepRules,'utf8').includes(`@raw/fb_board_${n}`))) {
  console.error('FAIL SoundPool Android resource shrinker keep rules missing/incomplete');
  failed = true;
}
if (failed) process.exit(1);
const apkArg = process.argv[2];
if (!apkArg) {
  console.log(`PASS ${names.length}/11 native SoundPool MP3 sources + Android shrinker keep rules`);
  process.exit(0);
}
const apk = path.resolve(apkArg);
if (!fs.existsSync(apk)) {
  console.error(`FAIL APK does not exist: ${apk}`);
  process.exit(1);
}
function run(command,args,limit=32*1024*1024) {
  const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:limit,windowsHide:true});
  return r.status===0 ? r.stdout : null;
}
const entries=run('jar',['tf',apk]);
if (entries===null) {
  console.error('FAIL cannot inspect APK zip entries using Java jar (JDK required)');
  process.exit(1);
}
const zipEntries=new Set(entries.split(/\r?\n/).map(x=>x.trim()).filter(Boolean));
const foundByPath=names.filter(n=>zipEntries.has(`res/raw/fb_board_${n}.mp3`));
if (foundByPath.length===names.length) {
  console.log('PASS 11/11 named native SoundPool MP3 entries are inside APK');
  process.exit(0);
}
// Find installed Android SDK build-tools aapt2, including the default Windows
// SDK path. AAPT2 reports R.raw *resource names* independently of optimized
// APK zip filenames, so it can prove the resources survived packaging.
const sdkCandidates=[
  process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA,'Android','Sdk'),
  process.env.USERPROFILE && path.join(process.env.USERPROFILE,'AppData','Local','Android','Sdk'),
];
const localProperties=path.join(project,'android','local.properties');
if (fs.existsSync(localProperties)) {
  const match=fs.readFileSync(localProperties,'utf8').match(/^sdk\.dir\s*=\s*(.+)$/m);
  if (match) sdkCandidates.unshift(match[1].trim().replace(/\\\\/g,'\\').replace(/\\:/g,':'));
}
const executables=[];
if (process.env.FAMILY_BLOOM_AAPT2) executables.push(process.env.FAMILY_BLOOM_AAPT2);
for (const sdk of sdkCandidates.filter(Boolean)) {
  const buildTools=path.join(sdk,'build-tools');
  if (!fs.existsSync(buildTools)) continue;
  const versions=fs.readdirSync(buildTools).sort((a,b)=>b.localeCompare(a,undefined,{numeric:true}));
  for (const ver of versions) {
    const candidate=path.join(buildTools,ver,process.platform==='win32'?'aapt2.exe':'aapt2');
    if (fs.existsSync(candidate)) executables.push(candidate);
  }
}
executables.push(process.platform==='win32'?'aapt2.exe':'aapt2');
let compiledNames=null;
for (const tool of executables) {
  const output=run(tool,['dump','resources',apk]);
  if (output!==null) { compiledNames=output; break; }
}
if (compiledNames===null) {
  console.error(`FAIL only ${foundByPath.length}/11 named MP3 APK paths found and aapt2 is unavailable.`);
  console.error('INFO The APK may have renamed resources; install Android SDK build-tools/aapt2 to verify its resource table.');
  process.exit(1);
}
const foundByTable=names.filter(n=>new RegExp(`(?:^|[\\s:/])raw/fb_board_${n}(?:\\b|$)`).test(compiledNames));
for (const n of names) {
  if (!foundByTable.includes(n)) {
    console.error(`FAIL compiled Android R.raw.fb_board_${n} is missing from the APK resource table`);
    failed=true;
  }
}
if (failed) process.exit(1);
console.log(`PASS 11/11 SoundPool R.raw assets verified in compiled APK resource table (APK zip has ${foundByPath.length}/11 original filenames; optimized names are acceptable)`);
