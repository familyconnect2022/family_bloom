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
  const roots = ['src','server','vercel-media','scripts','modules','assets','document','plugins','functions','public'];
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
function detachBackends() {
  // Run ONLY after the updater has completed a full source backup.
  if (!isFile(backupFile)) die('Cannot detach: no full-source backup record.');
  const savedBackup=fs.readFileSync(backupFile,'utf8').trim();
  if (!isFile(path.join(savedBackup,'project-source','package.json'))) die('Cannot detach: backup source not found.');
  const parent=path.dirname(target);
  const moved=[];
  for (const [oldName,safeName] of [['server','Render_chess_xiangqi_LEGACY'],['vercel-media','Vercel_media_LEGACY']]) {
    const current=path.join(target,oldName);
    if(!exists(current))continue;
    const info=fs.lstatSync(current);
    if(!info.isDirectory() || info.isSymbolicLink())die('Unsafe old backend path: '+current);
    let destination=path.join(parent,safeName);
    for(let n=1;exists(destination);n++)destination=path.join(parent,safeName+'_'+n);
    // If a cross-volume move is somehow required, stop; NEVER delete old source.
    fs.renameSync(current,destination);
    moved.push({from:current,to:destination});
  }
  return {moved, note:'Legacy folders preserved in adjacent directories; new standalone repositories use separate ZIPs.'};
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
  if(!['target','check','backup','detach-backends','overlay','verify','remember'].includes(mode))die('Unknown command.');
  const versions=assertSafe();
  if(mode==='target')console.log('TARGET PASS',JSON.stringify({source,target,...versions}));
  if(mode==='detach-backends') console.log('BACKENDS DETACHED', JSON.stringify(detachBackends()));
  if(mode==='check') {
    // Pre-overlay tests may run directly as well as through the deep sweep.
    // All source-only gates must resolve the release-vendored TypeScript,
    // never depend on npm install or global packages on the developer's PC.
    process.env.NODE_PATH = path.join(source, 'scripts/vendor');
    // R5 supports verified original R1/R3/R4 sources; stop on unknown R2/custom source.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/maintenance/check-r1r4-source-lineage.cjs'),target],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Unverified source lineage: refusing FULL overlay BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // P0 R3R3D7R2R3R3R1: a Hook called from a lazy style factory crashes
    // the login hero after its first render. Fail before backup or overlay.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d7r2r3r3r1-hook-safety.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('P0 Android login Hook-order safety gate failed BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2200));
    }
    // M3R4R5-R3: regression for direct R3 -> R5 source compatibility and safe rejection.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-m3r4r5-r3-direct-updater.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3 direct-upgrade regression failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // P0 Session recovery: verify Firebase retry, Welcome and third-party probes
    // BEFORE any backup, cleanup or source overlay.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r4r3-auth-connectivity-p0.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('P0 Auth/Connectivity regression failed BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2200));
    }
    // R3R2: independent server-watch/read proof ordering and bounded recovery.
    // Run BEFORE backup/cleanup/overlay; never install a broken session gate.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r4r3r2-cold-start-proof.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('P0 Firebase cold-start proof gate failed BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R3R3: server metadata transition and independent membership watchdog.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r4r3r3-membership-metadata.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('P0 Membership metadata/watchdog gate failed BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R3R3D1: diagnostic-only instrumentation MUST NOT weaken Auth/Welcome/Home
    // gates or leak Firebase/user fields in copied support reports.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d1-auth-diagnostics.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D1 Auth diagnostic security regression failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R3R3D2: Welcome must render INSIDE the real native session-gate screen;
    // the old root sibling could report onLayout while Android displayed the gate.
    // Also lock stage classification and never permit a Home authorization bypass.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d2-welcome-native-gate.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D2 Welcome/native-screen P0 preflight failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // D3: debug-only native-window probe and fully reported splash lifecycle.
    // Do not copy into a working app if its diagnostics or Auth guard fails.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d3-native-visual-probe.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D3 native visual probe preflight failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // D4: Android letter must be a static Image nested inside the Pressable;
    // disallow the previous elevated transparent hit cover and opacity-gated reader.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d4-welcome-android-render.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D4 native welcome rendering regression failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // D5: the actual Native Stack viewport must bound the centered sheet and
    // the Continue CTA must be in a non-scrolling footer. This gate is offline.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d5-welcome-centered-modal.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D5 centered Welcome modal regression failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // D6: predecoded scene frames stay mounted and the letter card is absolutely
    // centered with explicit margins; never regress to the D5 white flash.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d6-welcome-no-white-centered.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D6 Welcome continuous-scene/centered-card check failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // D7: one single letter artwork and its native text share the same fitted
    // pixel coordinate system. Fail before writing on missing image or drift.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d7-welcome-single-paper.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R3R3D7 one-image Welcome safe-paper check failed BEFORE overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // D7R1: require full-bleed background AND source-border safe text intersection.
    try { execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d7r1-cover-safe-font.cjs')],
      {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000}); }
    catch(error) { die('D7R1 safe cover and font gate failed: '+String(error.stderr||error.message||'').slice(-1500)); }
    // Current user journey gate must pass before touching existing source.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r2r4-preflight.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Family CV / Welcome / Toast integration failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // M3R4R8 P0: prove bootstrap anchor and both account journeys before
    // touching the old project. No React/Firebase dependency required.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-m3r4r8-bootstrap-navigation-p0.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('P0 Auth/Profile/Welcome navigation regression BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R8R1: timeout and retry must be safe before touching installed source.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-m3r4r8r1-firebase-retry-timeout.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('P0 Firebase retry/timeout security gate failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R8R2: profile/remote-avatar save barrier and newly approved membership
    // welcome acknowledgment must pass before any existing file is touched.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r2-profile-welcome-save-flow.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R2 Profile / Welcome onboarding regression BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    // R3R3D7R2R1: reject old 143044/H13 assumptions before touching installed source.
    // Current APK identity must remain 1.3.35 / 143045, while H13 gameplay passes.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r3d7r2r1-preflight-binary.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:45000});
    } catch(error) {
      die('R3R3D7R2R1 current APK/H13 regression failed BEFORE any project mutation. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-3000));
    }
    // R8R3R3: compiler provenance and true dependency-free H13 runtime gate.
    // This is discovered by the full-sweep as well; run before mutation to
    // fail closed if the release compiler is accidentally missing.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r3r3-offline-typescript.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:45000});
    } catch(error) {
      die('R8R3R3 offline TypeScript/H13 gate failed BEFORE any project mutation. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-3000));
    }
    // R8R3R2: audit the source-only gates used by CLEAN APPLY, Android Build &
    // Share and EAS BEFORE backup/overlay. H6/H10R2/H22R6 were previously
    // left to run after copying, causing half-updated installs.
    // Dynamic discovery from the actual BAT/package scripts protects future
    // new gate additions without bypassing these historical safety checks.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r3r2-offline-updater-gates.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:240000,maxBuffer:4*1024*1024});
    } catch(error) {
      die('R8R3R2 Windows CLEAN APPLY / Build & Share source gate sweep BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-3500));
    }
    // R8R4R1: private UID-scoped appearance + approved pawn/general identity.
    // Fail before backup/overlay when a new UI preference rule or asset drifts.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r1-living-storybook.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Living Storybook 2.0 integration gate failed BEFORE project changes. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    // R8R3 Theme Engine: colors, dark-mode contrast, storage and live updates
    // must pass before backup or ANY target-project mutation.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r3-theme-system.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R3 Theme Engine regression BEFORE source overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    // M3R4R6: root-auth identity and avatar display regressions must fail
    // before this updater is allowed to back up, clean or overlay the project.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-m3r4r6-root-avatar-lifecycle.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Root/Auth/Avatar lifecycle gate failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R7: validate photo-picker choices and P0 Firebase UID/home gating before
    // backup or a single destructive file operation. Works without node_modules.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-family-cv-r7-contract.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R7 Family CV / Auth P0 gate failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
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
    // R3R14R3R2: verify the new platform BATs and menu BEFORE touching old source.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14r3r2-dev-platform-menu.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Android/iOS/Web menu regression failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14r3r3-menu-gates.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
      execFileSync(process.execPath,[path.join(source,'scripts/tests/history/test-phase13-release-readiness.js')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Menu/Firebase Spark-safe release gate failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
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
    // R3R14R3R4: confirm Planner CTA and both empty states before touching old source.
    // Prevent a fresh FULL ZIP from passing when old Calendar UI gates are stale.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14r3r4-planner-event-layout.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch (error) {
      die('Planner event layout preflight failed BEFORE backup/cleanup/overlay. ' +
        (String(error.stdout || '')+'\n'+String(error.stderr || error.message || '')).trim().slice(-2500));
    }
    // R3R14R3R6: developer-only malformed Firestore data test + scrollable Planner.
    // Run before touching the installed project to catch unsafe API/test packaging.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14r3r6-data-fault-dev.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Developer diagnostic / scrollable planner preflight failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // R3R14R3R8: exercise Admin API with mock Firestore before any copy.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r3r14r3r8-firestore-fault-runtime.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Firestore diagnostic runtime regression failed BEFORE backup/cleanup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
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
    // R8R4R4: every major app area and theme must use a real matching hero,
    // including the settings picker; check before backing up or overwriting.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4-theme-coverage.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4 section/theme asset registry gate failed BEFORE backup/overlay. ' +
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2800));
    }
    // R8R4R4R3R1: exact user-approved 20 hero PNGs, the matching thumbnails
    // and registry must be present and untouched BEFORE backup or copying.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r1-approved-20-heroes.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4R3R1 approved 20 hero preflight failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2700));
    }
    // R8R4R4R3R2: prove fog theme/mode assets and safe auth handoff exist before touching old source.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r2-atmospheric-auth-theme.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Atmospheric hero / auth recovery / calendar/tree theme preflight failed BEFORE backup/overlay. ' +
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2700));
    }
    // R8R4R4R3: the real native welcome window and distinct per-section art
    // must not silently fall back to the previously shipped home+icon scenes.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3-welcome-unique-heroes.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4R3 welcome Native Modal / unique hero gate failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2500));
    }
    // R8R4R4R2: fail closed if semantic color subscribers or optimized hero assets disappear.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r2-theme-immediacy.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4R2 live theme / fast hero preflight failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }

    // R8R4R3: floating spring dock + long-hold drag snap and themed image hero.
    // The gesture/navigator separation is a shipping requirement, not just a mockup.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r3-floating-dock-hero.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R3 real-image hero / floating dock gate failed BEFORE backup/overlay. ' +
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2800));
    }
    // R8R4R2: unified button/input/header borders, theme-scoped render,
    // full-envelope transparent CTA, and bounded motion-aware tab handoff.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r2-theme-perf-welcome.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R2 semantic component + performance gate failed BEFORE backup/overlay. ' +
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2400));
    }
    // R8R4R4R3R3: verified in-Stack Welcome + full-bleed hero + theme memo safety.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r3-stack-hero-theme.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4R3R3 Welcome/hero/theme preflight failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    // R8R4R4R3R4: protected native Welcome frame, UID appearance defaults,
    // semantic colors. Must be read-only and finish before any backup/overlay.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r4-welcome-theme-firestore.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4R3R4 auth/theme Firestore preflight failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    // P0 post-login white screen recurrence: verify *root-sibling* Welcome,
    // not a Native Stack layout flag that can be true while the device is blank.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r4r1-root-welcome.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('Root Welcome P0 gate failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    // R8R4R4R3R4R2: packaged offline WebP/alpha + 35% hero, memo updates and
    // a real retry after network restoration. Never back up/overlay on failure.
    try {
      execFileSync(process.execPath,[path.join(source,'scripts/tests/release/test-r8r4r4r3r4r2-webp-live-theme-retry.cjs')],
        {cwd:source,encoding:'utf8',stdio:'pipe',timeout:30000});
    } catch(error) {
      die('R8R4R4R3R4R2 WebP/live-theme/retry gate failed BEFORE backup/overlay. '+
        (String(error.stdout||'')+'\n'+String(error.stderr||error.message||'')).trim().slice(-2600));
    }
    console.log('PREFLIGHT PASS', JSON.stringify({source,target,...versions,sourceStructure:'PASS',releasePreflight:'PASS'}));
    // Check is read-only. Some imported preflight fixtures leave asynchronous
    // handles active; never strand the Windows BAT after all checks have PASSed.
    process.exit(0);
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
