#!/usr/bin/env node
'use strict';
/** Official lineage replay. No Firebase, no backup, no overlay; fixture-only. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..');
const manifest=require(path.join(root,'document/releases/m3r4r5/known-source-lineages.json'));
const matcher=path.join(root,'scripts/maintenance/check-r1r4-source-lineage.cjs');
const zipRefs={R2R1:process.env.FB_OFFICIAL_R2R1_DIR,R2R2:process.env.FB_OFFICIAL_R2R2_DIR,R2R3:process.env.FB_OFFICIAL_R2R3_DIR};
const dig=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const safe=(label)=>{
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),`fb-lineage-${label}-`));
  const reference=zipRefs[label];
  const extras=manifest[`additional_${label.toLowerCase()}_required_files`];
  const paths=[...new Set([...manifest.files,...Object.keys(extras)])];
  const current=path.resolve(reference||root);
  try {
    for (const rel of paths){
      const actual=path.join(current,rel);assert(fs.existsSync(actual),`Missing official ${label} ${rel}`);
      const expected=extras[rel] || manifest.baselines[label][manifest.files.indexOf(rel)];
      if(reference)assert.equal(dig(actual),expected,`Unexpected official file: ${rel}`);
      const dst=path.join(tmp,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(actual,dst);
    }
    let r=spawnSync(process.execPath,[matcher,tmp],{encoding:'utf8'});
    if(reference){assert.equal(r.status,0,`Official ${label} refused: ${r.stdout} ${r.stderr}`);
      assert(r.stdout.includes(`original ${label}`));
    }
    else console.log(`SKIP ${label} acceptance fixture: provide FB_OFFICIAL_${label}_DIR`);
    const sensitive=path.join(tmp,'src/app/(tabs)/_layout.tsx');
    fs.appendFileSync(sensitive,'\n// deliberately modified protected tabbar\n');
    r=spawnSync(process.execPath,[matcher,tmp],{encoding:'utf8'});
    assert.notEqual(r.status,0,`${label} tampering must be refused`);
    fs.appendFileSync(path.join(tmp,'src/context/AuthContext.tsx'),'\n// altered auth gate\n');
    r=spawnSync(process.execPath,[matcher,tmp],{encoding:'utf8'});
    assert.notEqual(r.status,0,`${label} Auth tampering must be refused`);
  }finally{fs.rmSync(tmp,{recursive:true,force:true});}
};
for(const label of Object.keys(zipRefs)){
 assert.equal(manifest.baselines[label]?.length,manifest.files.length);
 assert(Object.keys(manifest[`additional_${label.toLowerCase()}_required_files`]||{}).length>=10);
 safe(label);
}
console.log('PASS R2R1/R2R2/R2R3 official fingerprints and safe rejection');
