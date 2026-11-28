#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const bat=fs.readFileSync(path.join(root,'scripts/android/dev/Family_Bloom_Android_Debug_Build_And_Run.bat'),'utf8');
const before=bat.split('echo [4/7]')[0];
assert.notEqual(before,bat,'Debug build phase marker missing');
const excluded=new Set(['doctor:native-check','typecheck']); // doctor requires local native config; typecheck is a separate CI gate
const gates=[...new Set([...before.matchAll(/^call npm run ([a-zA-Z0-9_:-]+)\s*$/gm)].map(m=>m[1]))].filter(n=>!excluded.has(n));
assert(gates.includes('phaseP2_12_4:check')&&gates.includes('phaseP2_37R2C_H9A:check')&&gates.includes('release:check'),'Debug gates missing');
const scripts=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).scripts;
for(const n of gates){
 const cmd=scripts[n];assert(typeof cmd==='string'&&/^node \.\/scripts\/[a-zA-Z0-9_./-]+$/.test(cmd),'Review non-source gate '+n+': '+cmd);
 const r=cp.spawnSync(process.execPath,[cmd.slice(5)],{cwd:root,stdio:'inherit'});if(r.error||r.status!==0)throw Error('Debug gate failed: '+n);
}
for(const [file,...args] of [['scripts/tests/release/test-a3-render-backend-urls.cjs'],['scripts/tests/release/test-h25r2r2-release-preflight.cjs'],['scripts/tests/release/test-h25r2r5-internet-connectivity.cjs','--source-only']]){
 const r=cp.spawnSync(process.execPath,[file,...args],{cwd:root,stdio:'inherit'});if(r.error||r.status!==0)throw Error('Debug source gate failed: '+file);
}
console.log('[PASS] '+gates.length+' Debug npm source gates + 3 standalone regressions');
