#!/usr/bin/env node
'use strict';
const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
// Windows target-reselection regression. No real project is modified.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__legacyScriptsDir,'..');
const bat=fs.readFileSync(path.join(root,'scripts/android/maintenance/Family_Bloom_AUTO_UPDATE_FULL.bat'),'utf8');
const picker=fs.readFileSync(path.join(root,'scripts/android/maintenance/Select-FamilyBloomProjectFolder.ps1'),'utf8');
const engine=fs.readFileSync(path.join(root,'scripts/maintenance/auto-update-full.cjs'),'utf8');
const workspace=fs.mkdtempSync(path.join(os.tmpdir(),'family-bloom-updater-target-'));
let count=0;
function pass(message){console.log('PASS '+message);count++;}
function invoke(target,dir=workspace){return spawnSync(process.execPath,[path.join(root,'scripts/maintenance/auto-update-full.cjs'),'target'],{
  cwd:root,encoding:'utf8',env:{...process.env,FB_SOURCE:root,FB_TARGET:target,FB_STATE_DIR:path.join(dir,'state')}});
}
function makeProject(p,{name='family-bloom',version=100}={}){
  fs.mkdirSync(p,{recursive:true});
  fs.writeFileSync(path.join(p,'package.json'),JSON.stringify({name}));
  fs.writeFileSync(path.join(p,'app.json'),JSON.stringify({expo:{android:{versionCode:version}}}));
  fs.writeFileSync(path.join(p,'app.config.js'),'module.exports = {};\n');
}
try {
  assert(bat.includes('last-target.txt') && bat.includes(':validate_or_reselect') && bat.includes('goto :choose_target'));
  pass('saved target is validated and invalid path triggers reselection');
  assert(bat.includes('Select-FamilyBloomProjectFolder.ps1') && bat.includes(':manual_target') && bat.includes('set /p "FB_TARGET='));
  pass('native Windows folder picker with manual path fallback');
  assert(picker.includes('FolderBrowserDialog') && picker.includes('SelectedPath') && picker.includes('WriteAllText'));
  pass('picker writes selected path without changing project files');
  assert(bat.indexOf(':validate_or_reselect')<bat.indexOf('auto-update-full.cjs" check') && bat.indexOf('auto-update-full.cjs" check')<bat.indexOf('auto-update-full.cjs" backup'));
  pass('invalid target cannot reach backup or pre-copy cleanup');
  assert(bat.indexOf('auto-update-full.cjs" remember')>bat.indexOf('Family_Bloom_CLEAN_APPLY_FULL.bat" --no-pause'));
  pass('new path remembered only after successful CLEAN APPLY');
  assert(engine.includes("mode==='target'") && engine.includes("const versions=assertSafe()"));
  pass('Node preflight supplies dry-run target validation');
  const invalid=invoke(path.join(workspace,'renamed-away'));
  assert.notEqual(invalid.status,0);
  assert.match(invalid.stderr,/missing: package.json/i);
  pass('moved/nonexistent stored folder rejected without touching files');
  const renamed=path.join(workspace,'Moved Family Bloom Folder');
  makeProject(renamed);
  const valid=invoke(renamed);
  assert.equal(valid.status,0,valid.stdout+' '+valid.stderr);
  assert.match(valid.stdout,/TARGET PASS/);
  pass('valid relocated project with spaces in path accepted');
  assert.equal(fs.existsSync(path.join(workspace,'state','last-target.txt')),false);
  pass('validation alone never persists target before successful update');
  const wrong=path.join(workspace,'Unrelated App');
  makeProject(wrong,{name:'other-app'});
  const identity=invoke(wrong);
  assert.notEqual(identity.status,0);
  assert.match(identity.stderr,/Incorrect project identity/);
  pass('wrong project identity rejected');
  const incomplete=path.join(workspace,'Incomplete Project');
  makeProject(incomplete);
  fs.unlinkSync(path.join(incomplete,'app.config.js'));
  const broken=invoke(incomplete);
  assert.notEqual(broken.status,0);
  assert.match(broken.stderr,/missing: app.config.js/);
  pass('incomplete project rejected');
  const newer=path.join(workspace,'Newer Family Bloom');
  makeProject(newer,{version:999999});
  const downgrade=invoke(newer);
  assert.notEqual(downgrade.status,0);
  assert.match(downgrade.stderr,/Refusing downgrade/);
  pass('newer project cannot be overwritten by older FULL package');
  const same=invoke(root);
  assert.notEqual(same.status,0);
  assert.match(same.stderr,/separate, non-nested/);
  pass('user cannot select FULL source itself as target');
  assert(!bat.includes('del /f /q "%FB_STATE_DIR%\\last-target.txt"'));
  pass('stale saved target is not prematurely deleted');
  assert.equal(fs.readFileSync(path.join(renamed,'package.json'),'utf8'),JSON.stringify({name:'family-bloom'}));
  pass('existing project remains unchanged by all target probes');
  console.log(`H25R2R6R1 TARGET RESELECTION ${count}/${count} PASS`);
} finally {
 fs.rmSync(workspace,{recursive:true,force:true});
}
