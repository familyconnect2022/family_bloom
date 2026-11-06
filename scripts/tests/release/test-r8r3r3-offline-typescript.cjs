#!/usr/bin/env node
'use strict';
/** Regression: the H13 gate must execute in a fresh release with no project TS. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const vendor=path.join(root,'scripts/vendor');
const checkFile=path.join(root,'scripts/tests/history/test-phase-p2_37r2c_h13-bloom-results-return.js');
const compiler=path.join(vendor,'typescript/lib/typescript.js');
assert(fs.existsSync(compiler),'Bundled TypeScript missing');
const env={...process.env, CI:'1',NODE_OPTIONS:'',NODE_PATH:vendor};
const run=(args,env)=>cp.spawnSync(process.execPath,args,{cwd:root,encoding:'utf8',env,timeout:30000,maxBuffer:4*1024*1024});
let r=run(['-p',"require.resolve('typescript')"],env);
assert.equal(r.status,0,'Bundled compiler must resolve');
assert.equal(path.resolve(r.stdout.trim()),compiler,'Compiler must resolve to bundled copy');
console.log('PASS TypeScript resolves exclusively to bundled release compiler');
const isolated={...env,NODE_PATH:''};
r=run(['--no-global-search-paths',checkFile],isolated);
assert.notEqual(r.status,0,'H13 unexpectedly passed without dependencies');
assert.match((r.stderr||'')+(r.stdout||''),/Cannot find module 'typescript'|MODULE_NOT_FOUND/);
console.log('PASS pristine runtime reproduces real H13 missing-compiler failure');
r=run([checkFile],env);
assert.equal(r.status,0,`Bundled compiler must run REAL H13 gate: ${r.stderr}\n${r.stdout}`);
assert.match(r.stdout,/H13 Bloom UI \+ immediate-return gate: PASS/);
console.log('PASS actual H13 source+runtime gate under bundled compiler');
const runner=fs.readFileSync(path.join(root,'scripts/tests/release/test-r8r3r2-offline-updater-gates.cjs'),'utf8');
assert.match(runner,/assert\.equal\(path\.resolve\(compilerProbe\.stdout\.trim\(\)\),vendorCompiler/);
assert.match(runner,/env: cleanEnv/);
console.log('PASS preflight guards compiler provenance for EVERY child gate');
console.log('R8R3R3 OFFLINE TYPESCRIPT GATE 4/4 PASS');
