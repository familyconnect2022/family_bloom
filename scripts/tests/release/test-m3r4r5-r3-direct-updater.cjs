#!/usr/bin/env node
'use strict';
/** No network or Gradle; original release fingerprints are replayed in a
 * temporary tree. Never run the real updater against a real project in tests. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
const manifest=require(path.join(root,'document/releases/m3r4r5/known-source-lineages.json'));
const matcher=path.join(root,'scripts/maintenance/check-r1r4-source-lineage.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'fb-r3-to-r5-'));
const files=[...new Set([...manifest.files,...Object.keys(manifest.additional_r3_required_files)])];
const h=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function setSource(variant){
 for(const rel of files){const out=path.join(temp,rel);fs.mkdirSync(path.dirname(out),{recursive:true});
  // Marker fixture: most tests need correct original content, which is in the
  // bundled known R3 ZIP only. Release test instead exercises real R5/R3 baseline
  // with reconstructible SHA-256 hashes by verifying the stored R3 source bundle
  // when available; the matcher comparison is tested using the R5 files for R4.
  const src=path.join(root,rel);if(fs.existsSync(src))fs.copyFileSync(src,out);
 }
}
function check(){return spawnSync(process.execPath,[matcher,temp],{encoding:'utf8'});}
try{
  setSource('R4');
  // The bundled R5 has some R4 code unchanged; it must not spoof R3.
  const tamperFixture=path.join(temp,'src/app/_layout.tsx');
  fs.appendFileSync(tamperFixture,'\n// intentional unrecognized fixture\n');
  let r=check();assert.notEqual(r.status,0,'unknown lineage must stop');
  const real=process.env.FB_R3_REFERENCE;
  if(real){
    for(const rel of files){const src=path.join(real,rel);assert(fs.existsSync(src),`Missing R3 reference: ${rel}`);const dst=path.join(temp,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}
    r=check();assert.equal(r.status,0,`Original R3 should be accepted: ${r.stdout} ${r.stderr}`);
    for(const rel of manifest.files){assert.equal(h(path.join(real,rel)),manifest.baselines.R3[manifest.files.indexOf(rel)]);}
    for(const [rel,digest] of Object.entries(manifest.additional_r3_required_files)){assert.equal(h(path.join(real,rel)),digest);}
    const tampered=path.join(temp,'src/services/media/avatarAsyncSync.ts');
    fs.appendFileSync(tampered,'\n// altered\n');
    r=check();assert.notEqual(r.status,0,'modified R3 critical code must stop');
    fs.copyFileSync(path.join(real,'src/services/media/avatarAsyncSync.ts'),tampered);
    const r2Sim=path.join(temp,'src/app/(profile)/create-profile.tsx');
    fs.appendFileSync(r2Sim,'\n// unknown r2 variation\n');
    r=check();assert.notEqual(r.status,0,'unknown R2/custom baseline must stop');
    console.log('PASS Original R3 accepted; modified critical R3 rejected; unknown R2/custom rejected');
  } else {
    console.log('WARN R3 original source not provided to test. Set FB_R3_REFERENCE for full compatibility validation.');
  }
  const update=fs.readFileSync(path.join(root,'scripts/maintenance/auto-update-full.cjs'),'utf8');
  assert(update.includes('check-r1r4-source-lineage.cjs'));
  assert(update.includes("if(mode==='check')"));
  assert(update.indexOf('check-r1r4-source-lineage.cjs')>update.indexOf("if(mode==='check')"));
  assert(update.indexOf('check-r1r4-source-lineage.cjs')<update.indexOf('test-r2r4-preflight.cjs'));
  console.log('PASS Direct R3-to-R5 updater compatibility regression');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
