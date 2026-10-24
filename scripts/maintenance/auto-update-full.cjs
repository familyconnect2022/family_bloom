#!/usr/bin/env node
'use strict';
// Family Bloom: safe FULL source overlay used by the Windows one-click BAT.
// Intentional safeguards: distinct folders, whole-source backup, no /MIR,
// preserve local secrets, never overlay generated Android/Gradle/Node caches.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const mode = process.argv[2];
const source = path.resolve(process.env.FB_SOURCE || path.join(__dirname, '..', '..'));
const target = path.resolve((process.env.FB_TARGET || '').trim().replace(/^"|"$/g, ''));
const stateDir = process.env.FB_STATE_DIR || path.join(process.env.LOCALAPPDATA || os.homedir(), 'FamilyBloom', 'updater');
const stateFile = path.join(stateDir, 'last-target.txt');
const backupFile = path.join(stateDir, 'last-backup.txt');

function die(message) { throw new Error(message); }
function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function isFile(p) { try { return fs.statSync(p).isFile(); } catch { return false; } }
function readJson(p) { return JSON.parse(fs.readFileSync(p, 'utf8')); }
function normalize(p) { const v = fs.realpathSync.native(p); return process.platform === 'win32' ? v.toLowerCase() : v; }
function nested(parent, child) { return child.startsWith(parent + path.sep); }
function assertSafe() {
  if (!process.env.FB_TARGET?.trim()) die('Missing target project path.');
  const required = ['package.json','app.json','app.config.js', 'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
    'scripts/android/maintenance/Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat',
    'scripts/android/maintenance/Family_Bloom_CLEAN_APPLY_FULL.bat',
    'scripts/maintenance/backup-legacy-project-notes.js'];
  for (const rel of required) if (!isFile(path.join(source, rel))) die('FULL release is incomplete: ' + rel);
  for (const rel of ['package.json','app.config.js','app.json']) if (!isFile(path.join(target, rel))) die('Existing Family Bloom project is missing: ' + rel);
  const s = normalize(source), t = normalize(target);
  if (s === t || nested(s,t) || nested(t,s)) die('SOURCE and TARGET must be separate, non-nested folders. Extract FULL ZIP OUTSIDE your existing project.');
  if (path.parse(t).root === t) die('The project target may not be a drive root.');
  const sp = readJson(path.join(source,'package.json'));
  const tp = readJson(path.join(target,'package.json'));
  if (sp.name !== 'family-bloom' || tp.name !== 'family-bloom') die('Incorrect project identity: expected package name family-bloom in BOTH folders.');
  const sn = Number(readJson(path.join(source,'app.json')).expo?.android?.versionCode);
  const tn = Number(readJson(path.join(target,'app.json')).expo?.android?.versionCode);
  if (!Number.isSafeInteger(sn) || !Number.isSafeInteger(tn)) die('Invalid Android versionCode in source or target.');
  if (sn < tn) die(`Refusing downgrade: FULL source versionCode ${sn} is older than installed source ${tn}.`);
  // Prevent writes through an existing destination junction/symlink.
  const roots = ['src','server','scripts','modules','assets','document','plugins','functions','public'];
  for (const rel of roots) {
    const p=path.join(target,rel);
    if (exists(p) && fs.lstatSync(p).isSymbolicLink()) die('Target contains unsafe symlink/junction directory: ' + rel);
  }
  return {sourceVersion:sn,targetVersion:tn};
}
const rootsNotCopied = new Set(['.git','.expo','android','ios','node_modules','.gradle','.next','.turbo']);
const namesNotCopied = new Set(['node_modules','.git','.expo','.gradle','.next','.turbo']);
function skip(rel, stats) {
  const segments=rel.replace(/\\/g,'/').split('/');
  if (segments.some(x=>namesNotCopied.has(x))) return true;
  if (segments.length===1 && rootsNotCopied.has(segments[0])) return true;
  if (segments[0]==='android' || segments[0]==='ios') return true;
  if (rel.replace(/\\/g,'/')==='server/dist') return true;
  if (stats?.isSymbolicLink()) return true;
  if (segments.some(x=>['.DS_Store','Thumbs.db'].includes(x))) return true;
  return false;
}
function localSecret(rel) {
  const name=path.basename(rel);
  return (/^\.env(\..+)?$/i.test(name) && name !== '.env.example') ||
    /^(google-services\.json|GoogleService-Info\.plist|.*\.(?:jks|keystore|p12|pem|key))$/i.test(name);
}
function copyTree(from, to, operation) {
  let files=0, dirs=0, preserved=0;
  function visit(dir, rel) {
    const destination=path.join(to,rel);
    if (exists(destination) && fs.lstatSync(destination).isSymbolicLink()) die('Refusing to traverse target symlink: '+destination);
    fs.mkdirSync(destination,{recursive:true}); dirs++;
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const childRel=path.join(rel,entry.name);
      const input=path.join(dir,entry.name);
      const output=path.join(to,childRel);
      const st=fs.lstatSync(input);
      if(skip(childRel,st)) continue;
      if(st.isDirectory()) {
        visit(input,childRel);
      } else if(st.isFile()) {
        if(exists(output) && fs.lstatSync(output).isSymbolicLink()) die('Refusing to overwrite target symlink: '+output);
        if(operation === 'overlay' && localSecret(childRel) && exists(output)) { preserved++; continue; }
        fs.mkdirSync(path.dirname(output),{recursive:true});
        fs.copyFileSync(input,output); files++;
      }
    }
  }
  visit(from,'');
  return {files,dirs,preserved};
}
function hash(p) {return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');}
function verify() {
  let files=0, exempt=0;
  function visit(dir,rel) {
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      const r=path.join(rel,entry.name), f=path.join(dir,entry.name), dst=path.join(target,r), stat=fs.lstatSync(f);
      if(skip(r,stat))continue;
      if(stat.isDirectory())visit(f,r);
      else if(stat.isFile()) {
        if(localSecret(r) && exists(dst)) {exempt++;continue;}
        if(!isFile(dst) || hash(f)!==hash(dst))die('Copied source differs from release: '+r);
        files++;
      }
    }
  }
  visit(source,'');
  return {verifiedFiles:files,protectedSecrets:exempt};
}
function backup() {
  fs.mkdirSync(stateDir,{recursive:true});
  const label = new Date().toISOString().replace(/[-:]/g,'').replace('T','-').replace(/\..*$/,'');
  let dest=path.join(stateDir,'backups',label);
  for(let n=1;exists(dest);n++) dest=path.join(stateDir,'backups',`${label}-${n}`);
  fs.mkdirSync(dest,{recursive:true});
  // Write this only on complete backup success. Never proceed to cleanup on error.
  const copy=copyTree(target,path.join(dest,'project-source'),'backup');
  if(!isFile(path.join(dest,'project-source','package.json'))) die('Backup integrity failed: missing package.json');
  fs.writeFileSync(path.join(dest,'backup-info.json'),JSON.stringify({createdAt:new Date().toISOString(),source,target,omits:'generated files: root android/ios; node_modules, .git, .expo, Gradle build caches',...copy},null,2));
  fs.writeFileSync(backupFile,dest+'\r\n');
  return {backupFolder:dest,...copy};
}
try {
  if(!['target','check','backup','overlay','verify','remember'].includes(mode))die('Unknown command.');
  const versions=assertSafe();
  if(mode==='target')console.log('TARGET PASS',JSON.stringify({source,target,...versions}));
  if(mode==='check') {
    // H25R2R7R2R3R2: a clean FULL ZIP has no client Firebase config. Verify
    // build redirection safely before any mutation of the user's project.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r3r2-build-config-routing.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Clean ZIP Build & Share routing regression failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2600));
    }
    // H25R2R7R2R3R4: config da CO trong Family_bloom_V2 nhung BAT root nham project.
    // Kiem tra duong dan Auto Update da luu va project duoc chon truoc khi sao luu.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r3r4-build-existing-json.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Existing Firebase JSON build routing regression failed BEFORE backup/overlay. ' +
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // H25R2R7R2R3R4: kiem thu khoi phuc Firebase Android truoc khi dong cham project cu.
    // Hoan toan offline: dung cac JSON gia lap trong TEMP; khong ghi secret.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r3r4-firebase-recovery.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Firebase Android recovery regression failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // R3R5: check new BAT/test directory layout before touching the old project.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r3r5-script-layout.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Script/BAT layout regression failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // Run the SAME structure gate that CLEAN APPLY FULL will run after copying.
    // A broken release must be rejected before backup, deletion or overlay.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/maintenance/check-project-structure.js')],
        {cwd:source,encoding:'utf8',stdio:'pipe'});
    } catch(error) {
      die('Release source fails structure:check before update. ' + String(error.stdout || error.stderr || error.message).trim().slice(-1200));
    }
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25-source-package.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe'});
    } catch(error) {
      die('Release source fails H25 required-file gate before update. ' + String(error.stdout || error.stderr || error.message).trim().slice(-1200));
    }
    // Validate moved/renamed-target recovery without ever modifying a real project.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r6r1-target-reselection.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Updater moved-target regression failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2200));
    }
    // H25R2R2: P2.34 was previously checked only AFTER backing up and
    // overlaying the user's project, leaving the update half-applied.
    // Validate the entire source-only release contract before any mutation.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r2-release-preflight.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:240000});
    } catch(error) {
      die('Release preflight failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-3000));
    }
    // H25R2R7R1: verify disabled bulletin + retained learning without node_modules.
    // Run BEFORE any backup/cleanup, the same way as the other source-only gates.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r1-bulletin-deferred.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Deferred bulletin release gate failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // H25R2R7R2R1: prevents the former release:check failure and protects
    // runtime Family Graph services before any existing project is changed.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r1-flags-regression.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Feature-flag regression failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // H25R2R7R2: module-isolated Study Q&A and Firestore Rules preflight (no TypeScript).
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2-study-qa.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Study Q&A source/rules preflight failed BEFORE backup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // H25R2R7R2R2: prevent Android native dialogs and keyboard-covered Study inputs.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r2-study-ux.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Study UX regression failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // H25R2R7R2R3: protect low-memory, opt-in native formula editor and slot persistence.
    // Works before node_modules, backup and overlay. Full dynamic checks run after npm install.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r3-visual-formulas.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Visual formula regression failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '') + '\n' + String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-h25r2r7r2r3r3-compound-formulas.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Compound formula preflight failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // R3R6: lightweight mathematical typesetting + published lesson regression.
    // Dependency-free so a fresh FULL ZIP is valid before node_modules exists.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-super-bloom-native-math-lessons.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Super Bloom math/lesson gate failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // R3R7: regression for math spacing/root alignment and study emoji rights.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-super-bloom-math-reactions-r3r7.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Study math/reaction preflight failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2400));
    }
    // R3R8 chemistry is pure and its source-only test works before installing dependencies.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-super-bloom-chemistry-safe-r3r8.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Chemistry safety gate failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // R3R9: check simple inline chemistry and resilient preview before any backup or overlay.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-super-bloom-inline-chemical-follow-r3r9.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Study inline formula gate failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // R3R14: validate bundled welcome artwork, approved text and safe animation
    // BEFORE making a backup or changing the existing project. No npm install needed.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14-welcome-envelope-motion.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R14 welcome-letter package preflight failed BEFORE backup/overlay. ' +
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2500));
    }
    // R3R14R1: prevent another welcome touch regression BEFORE copying source.
    // This static gate is dependency-free (Windows may have no node_modules yet).
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14r1-welcome-touch-static.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R14R1 welcome touch preflight failed BEFORE backup/overlay. ' +
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2500));
    }
    // R3R11: source-only mathematical layout gate BEFORE user backup or overlay.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-super-bloom-math-typesetting-r3r11.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Math limit/matrix/radical gate failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // R3R10: ordered prose/formula blocks and ⇒/⇔ semantics, no dependencies.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-super-bloom-solution-blocks-r3r10.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Structured solution preflight failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    console.log('PREFLIGHT PASS', JSON.stringify({source,target,...versions,sourceStructure:'PASS',releasePreflight:'PASS'}));
  }
  if(mode==='backup')console.log('BACKUP PASS',JSON.stringify(backup()));
  if(mode==='overlay')console.log('OVERLAY PASS',JSON.stringify(copyTree(source,target,'overlay')));
  if(mode==='verify')console.log('VERIFY PASS',JSON.stringify(verify()));
  if(mode==='remember') {
    fs.mkdirSync(stateDir,{recursive:true});
    fs.writeFileSync(stateFile,target+'\r\n');
    console.log('SAVED target for future one-click updates:',target);
  }
} catch (error) {
  console.error('[AUTO UPDATE ERROR]',error.message);
  process.exitCode=1;
}
