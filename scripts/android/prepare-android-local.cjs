#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {satisfiesRange}=require('../setup/semver-contract');
const root=path.resolve(__dirname,'../..');
const exists=p=>fs.existsSync(path.join(root,p));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
function run(cmd,args,opts={}){
 const r=cp.spawnSync(cmd,args,{cwd:root,stdio:'inherit',...opts});
 if(r.error||r.status!==0)throw Error('Failed: '+cmd+' '+args.join(' '));
}
function node(script,...args){run(process.execPath,[script,...args]);}
function installedProblems(){
 const pkg=read('package.json'),all={...pkg.dependencies,...pkg.devDependencies},fail=[];
 for(const [name,spec] of Object.entries(all)){
  try{
   const v=read('node_modules/'+name+'/package.json');
   if(spec.startsWith('file:')){
    const expected=read(path.posix.join(spec.slice(5),'package.json'));
    if(v.version!==expected.version||v.name!==expected.name)fail.push(name+' local version mismatch');
   }else if(!satisfiesRange(v.version,spec))fail.push(name+' installed '+v.version+' requires '+spec);
  }catch{fail.push(name+' missing or unreadable');}
 }
 return fail;
}
try{
 node('scripts/setup/verify-release-source.cjs','--repair-eol');
 node('scripts/setup/verify-release-source.cjs');
 if(exists('assets/editor/bundle-provenance.json'))node('scripts/tests/release/test-family-editor-offline.cjs');
 node('scripts/tests/release/test-family-publish-manager.cjs');
 node('scripts/tests/release/test-family-field-document.cjs');
 node('scripts/tests/release/test-family-media-review.cjs');
 node('scripts/android/configure-main-env.cjs','ensure');
 if(!exists('node_modules')){
  console.log('[DEPS] node_modules absent; installing once, including dev dependencies.');
  run(process.platform==='win32'?'npm.cmd':'npm',[exists('package-lock.json')?'ci':'install','--include=dev','--no-audit','--no-fund'],{shell:process.platform==='win32'});
 }else console.log('[DEPS] Keeping existing node_modules; no automatic npm install.');
 const fail=installedProblems();
 if(fail.length)throw Error('Dependencies need attention:\n'+fail.join('\n')+'\nRun npm ci --include=dev --no-audit --no-fund explicitly if needed (pinned lockfile). No automatic reinstall was attempted.');
 if(exists('package-lock.json'))node('scripts/setup/check-package-lock.js');
 else console.log('[DEPS] No local lockfile; installed direct package versions checked. Generate lockfile only when intentionally installing dependencies.');
 node('scripts/setup/check-p2_37r2-local-install.js');
 node('scripts/setup/check-expo-route-uniqueness.cjs');
 console.log('[PASS] Android local preflight: source, gateway, dependencies, routes.');
}catch(e){console.error('[BLOCK] '+e.message);process.exitCode=1;}
