#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Regression: a clean FULL ZIP must build via an updated installed project, not itself.
const fs=require('node:fs'), path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.join(__legacyScriptsDir,'..');
const validator=path.join(root,'scripts/android/build/resolve-build-target.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'Family Bloom build target with spaces '));
const source=path.join(temp,'clean FULL source');
const target=path.join(temp,'existing project');
const marker=[
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
 'scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs'
];
let n=0;function check(name,condition){assert(condition,name);n++;console.log('PASS '+n+' '+name)}
function run(...args){return spawnSync(process.execPath,[validator,...args],{encoding:'utf8'});}
function copy(from,to,rel){const dst=path.join(to,rel);fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(path.join(from,rel),dst);}
try {
 for(const dir of [source,target]){
  fs.mkdirSync(dir,{recursive:true});
  for(const rel of [...marker,'package.json','app.config.js','scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat'])copy(root,dir,rel);
 }
 const good={project_info:{project_id:'family-connect-4184f'},client:[{client_info:{android_client_info:{package_name:'com.familybloom.android'}}}]};
 fs.writeFileSync(path.join(target,'google-services.json'),JSON.stringify(good));
 check('clean extracted FULL source intentionally has no Firebase config',!fs.existsSync(path.join(source,'google-services.json')));
 check('correct updated target is safe to redirect',run('redirect',source,target).status===0);
 check('Firebase config passes Android client package validation',run('firebase',target).status===0);
 check('missing Firebase client config is rejected',run('firebase',source).status!==0);
 fs.writeFileSync(path.join(target,'google-services.json'),JSON.stringify({client:[{client_info:{android_client_info:{package_name:'com.other'}}}]}));
 check('incorrect Android client is rejected',run('redirect',source,target).status!==0);
 fs.writeFileSync(path.join(target,'google-services.json'),JSON.stringify(good));
 fs.appendFileSync(path.join(target,'src/features/study/StudyFormulaEditor.tsx'),'\n// outdated');
 check('outdated study source refuses redirect',run('redirect',source,target).status!==0);
 copy(root,target,'src/features/study/StudyFormulaEditor.tsx');
 check('redirect resumes when project source is identical',run('redirect',source,target).status===0);
 fs.writeFileSync(path.join(target,'google-services.json'),'{}');
 check('incomplete placeholder Firebase JSON is rejected',run('redirect',source,target).status!==0);
 fs.writeFileSync(path.join(target,'google-services.json'),JSON.stringify(good));
 check('missing saved project folder is rejected',run('redirect',source,path.join(temp,'no longer exists')).status!==0);
 check('existing project cannot be the clean source',run('redirect',source,source).status!==0);
 const rootBat=fs.readFileSync(path.join(root,'scripts/android/build/Family_Bloom_BUILD_APK_TO_SHARE.bat'),'utf8');
 check('Build launcher reads updater remembered target',rootBat.includes('last-target.txt')&&rootBat.includes('resolve-build-target.cjs')&&rootBat.includes('SAVED_TARGET'));
 check('Build launcher calls installed project instead of copied credentials',rootBat.includes('call "%SAVED_TARGET%\\scripts\\android\\build\\Family_Bloom_BUILD_APK_TO_SHARE.bat"')&&!/copy\s+[^\r\n]*google-services/i.test(rootBat));
 for(const rel of ['scripts/android/build/Family_Bloom_Android_Release_Build_APK_And_Share.bat','scripts/android/build/Family_Bloom_Android_Test_App_RELEASE.bat']){
  const bat=fs.readFileSync(path.join(root,rel),'utf8');
  check(rel+' validates Firebase BEFORE time-consuming regressions',bat.indexOf('resolve-build-target.cjs')>0&&bat.indexOf('resolve-build-target.cjs')<bat.indexOf('test-h25-firebase-invitation.cjs'));
 }
 check('test does not modify the original FULL source',fs.existsSync(path.join(root,'package.json')));
 console.log('BUILD CONFIG ROUTING REGRESSION '+n+'/'+n+' PASS');
} catch(err) {console.error('[FAIL]',err.stack||err);process.exitCode=1;}
finally{fs.rmSync(temp,{recursive:true,force:true});}
