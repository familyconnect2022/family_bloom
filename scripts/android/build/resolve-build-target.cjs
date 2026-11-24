#!/usr/bin/env node
'use strict';
// Validate redirection from a newly extracted FULL ZIP into the already updated project.
// This tool never reads, copies, rewrites, or prints the private Firebase config contents.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function normalizedReal(p) { const real=fs.realpathSync.native(p); return process.platform === 'win32' ? real.toLowerCase() : real; }
function sha(p) { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex'); }
function fail(message) { console.error('[BUILD PROJECT] '+message); process.exit(1); }
function checkGoogleFile(root) {
  const config=path.join(root,'google-services.json');
  if(!isFile(config)) fail('Khong thay google-services.json tai: '+config+' (thu muc dang kiem tra: '+root+'). Kiem tra lai duong dan Auto Update da luu hoac chon lai project.');
  let data;
  try { data=JSON.parse(fs.readFileSync(config,'utf8')); } catch { fail('google-services.json is not valid JSON. Restore the original file, not a placeholder.'); }
  if(!Array.isArray(data.client) || !data.client.some(c=>c.client_info?.android_client_info?.package_name==='com.familybloom.android')) {
    fail('google-services.json does not contain Android client com.familybloom.android. Download the correct file from Firebase Console.');
  }
}
const mode=process.argv[2];
if(mode==='firebase') {
  const root=path.resolve(process.argv[3]||'.');
  console.log('[BUILD PROJECT] Thu muc duoc kiem tra: '+root);
  checkGoogleFile(root);
  console.log('[BUILD PROJECT] Firebase Android config found and package name matches.');
  process.exit(0);
}
if(mode!=='redirect' && mode!=='redirect-source') fail('Usage: resolve-build-target.cjs redirect <FULL source path> <installed project path>');
const source=path.resolve(process.argv[3]||'.');
const target=path.resolve(process.argv[4]||'.');
if(!fs.existsSync(target)) fail('Saved project folder does not exist. Run scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat from the extracted FULL ZIP to select your current project folder.');
if(normalizedReal(source)===normalizedReal(target)) fail('Source and installed project are the same folder but google-services.json is missing. Restore the Firebase Android client config.');
for(const rel of ['package.json','app.config.js','scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat']) {
  if(!isFile(path.join(target,rel))) fail('Saved target is not a complete Family Bloom project: '+rel);
}
try {
 const packageName=JSON.parse(fs.readFileSync(path.join(target,'package.json'),'utf8')).name;
 if(packageName!=='family-bloom') fail('Saved folder is not the Family Bloom project.');
} catch(err) { if (err.code === 1) throw err; fail('Cannot read target package.json.'); }
// The FULL ZIP and installed source must match, not merely have the same
// Android versionCode (multiple JS-only releases can share that version).
for(const rel of [
  'app.json',
  'src/features/study/StudyFormulaTemplates.ts',
  'src/features/study/StudyFormulaEditor.tsx',
  'src/features/study/StudyFormulaExpression.ts',
  'src/features/study/StudyChemistry.ts',
  'scripts/tests/release/test-super-bloom-chemistry-safe-r3r8.cjs',
  'scripts/tests/release/test-super-bloom-inline-chemical-follow-r3r9.cjs',
  'scripts/tests/release/test-super-bloom-solution-blocks-r3r10.cjs',
  'scripts/tests/release/test-super-bloom-math-typesetting-r3r11.cjs',
  'scripts/tests/release/test-r3r12-family-intro-letter-radical.cjs',
  'src/features/study/StudyComposer.tsx',
  'src/features/study/StudyFormula.tsx',
  'src/features/study/StudySolutionModel.ts',
  'src/features/study/studyRepository.ts',
  'scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs',
  'scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs',
]) {
  const a=path.join(source,rel), b=path.join(target,rel);
  if(!isFile(a)||!isFile(b)||sha(a)!==sha(b)) {
    fail('Installed project does not match this FULL release ('+rel+'). Run scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat first; refusing to build an older or different version.');
  }
}
if(mode==='redirect'){ console.log('[BUILD PROJECT] Se BUILD tai: '+target); checkGoogleFile(target); }
console.log(mode==='redirect-source'?'[BUILD PROJECT] PASS: installed FULL source matches the ZIP; Firebase file will be checked separately.':'[BUILD PROJECT] PASS: installed FULL source matches the ZIP; using the existing Firebase Android config.');
