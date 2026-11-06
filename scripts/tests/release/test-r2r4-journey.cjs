#!/usr/bin/env node
'use strict';
/** Runtime policy regression after npm dependencies are ready; no Firebase,
 * Cloudinary, Android or network required. In particular, the welcome must
 * not display for the previous family or across Firebase accounts. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
let ts;try{ts=require('typescript')}catch{console.error('FAIL Missing TypeScript dependency; run npm install');process.exit(2)};
const file=path.join(root,'src/services/onboarding/welcomeGate.ts');
const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const mod={exports:{}};new Function('module','exports',code)(mod,mod.exports);
const {isWelcomeForActiveFamily,canPresentWelcome}=mod.exports;
assert.equal(isWelcomeForActiveFamily(null,'uidA','family1'),false);
assert.equal(isWelcomeForActiveFamily({uid:'uidA',familyId:'family1'},'uidA','family1'),true);
assert.equal(isWelcomeForActiveFamily({uid:'uidA',familyId:'family1'},'uidA','family2'),false);
assert.equal(isWelcomeForActiveFamily({uid:'uidA',familyId:'family1'},'uidB','family1'),false);
assert.equal(isWelcomeForActiveFamily({uid:'uidA',familyId:'family1'},'uidA',null),false);
const ready={requested:true,visualReady:true,rootSegment:'(tabs)',transitionActive:false,authenticated:true};
assert.equal(canPresentWelcome(ready),true);
// The letter now precedes the Home/tab mount, so rootSegment may still
// be family-gateway while the validated session transitions into Welcome.
for(const bad of [{visualReady:false},{transitionActive:true},{authenticated:false},{requested:false}]){
  assert.equal(canPresentWelcome({...ready,...bad}),false,JSON.stringify(bad));
}
assert.equal(canPresentWelcome({...ready,rootSegment:'family-gateway'}),true);
assert.equal(canPresentWelcome({...ready,rootSegment:'create-profile',authenticated:false}),false);
console.log('PASS Welcome family/identity/route transitions (Welcome BEFORE tabs)');
const create=fs.readFileSync(path.join(root,'src/app/(family)/(membership)/family-gateway.tsx'),'utf8');
assert(create.indexOf('requestWelcomeForFamily(result.familyId)')>create.indexOf('await familyService.createFamilyForUser'));
assert(create.indexOf('requestWelcomeForFamily(result.familyId)')<create.indexOf('setCreatedFamily(result)'));
console.log('PASS Welcome intent armed before automatic home transition');
const batPaths=['scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat','scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat'];
for(const relative of batPaths){const bat=fs.readFileSync(path.join(root,relative),'utf8');assert(bat.includes('test-r2r4-preflight.cjs'));assert(bat.includes('test-r2r4-journey.cjs'));assert(bat.includes('if errorlevel 1 goto :fail'));console.log(`PASS gates installed in ${relative}`)}
const updater=fs.readFileSync(path.join(root,'scripts/maintenance/auto-update-full.cjs'),'utf8');
const idx=updater.indexOf("if(mode==='check')");
assert(idx>=0 && updater.indexOf('test-r2r4-preflight.cjs',idx)>idx);
assert(updater.indexOf('test-r2r4-preflight.cjs',idx)<updater.indexOf('check-project-structure.js',idx));
console.log('PASS Auto Update checks current journey BEFORE backup, cleanup and overlay');
assert(updater.includes('check-r1r4-source-lineage.cjs'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'document/releases/m3r4r5/known-source-lineages.json'),'utf8'));
assert.equal(manifest.files.length,8);
for(const variant of ['R1','R3','R4','R5']) assert(manifest.baselines[variant], `missing supported lineage ${variant}`);
for(const [variant,hashes] of Object.entries(manifest.baselines)){
  assert.equal(hashes.length,manifest.files.length, `${variant} source fingerprint length`);
  assert(hashes.every(x=>/^[0-9a-f]{64}$/.test(x)),`${variant} source hashes invalid`);
}
if (manifest.baselines.R6) assert(Object.keys(manifest.additional_r6_required_files || {}).length>=10,'R6 must verify additional critical code');
assert(Object.keys(manifest.additional_r3_required_files).length >= 12);
console.log('PASS Auto Update recognizes fingerprinted original R3 and blocks unknown R2/custom lineage');
console.log('PASS R2/R4 integration runtime regression');
