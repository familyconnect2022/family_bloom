#!/usr/bin/env node
'use strict';
/** NODE 3D R4: SHA-bound, backup-first Android hotfix installer.
 * Does not run old release-generation gates or touch Firebase data/config.
 * Every changed target file must match either the either supplied 2026-11-04
 * NODE R2 or NODE R3 FULL CODE or this release. An unknown modification STOPS.
 */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'document/releases/fb-node-3d-r4-20261104/patch-manifest.json'), 'utf8'));
const mode = process.argv[2];
const targetArg = process.argv[3] || '';
const target = targetArg ? path.resolve(targetArg.replace(/^"|"$/g, '')) : '';
const stateDir = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'FamilyBloom', 'updater');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const file = p => { try { return fs.statSync(p).isFile(); } catch { return false; } };
const exists = p => { try { fs.lstatSync(p); return true; } catch { return false; } };
const fail = s => { throw Error(s); };
function safeWithin(base, rel) {
  if (!rel || path.isAbsolute(rel) || rel.includes('\\') || rel.split('/').some(part => !part || part === '..' || part === '.')) fail('Unsafe manifest path: ' + rel);
  const dst = path.resolve(base, rel);
  if (!dst.startsWith(base + path.sep)) fail('Path escapes root: ' + rel);
  let parent = base;
  for (const piece of rel.split('/')) {
    parent = path.join(parent, piece);
    if (exists(parent) && fs.lstatSync(parent).isSymbolicLink()) fail('Refusing symlink in destination: ' + rel);
  }
  return dst;
}
function check() {
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isDirectory()) fail('Project folder does not exist.');
  const a = fs.realpathSync(root), b = fs.realpathSync(target);
  if (a === b || a.startsWith(b + path.sep) || b.startsWith(a + path.sep)) fail('Extract FULL ZIP to a separate folder outside your existing app.');
  if (b === path.parse(b).root) fail('Target cannot be a drive root.');
  for (const name of ['package.json','app.json','app.config.js']) if (!file(path.join(b,name))) fail('Missing project identity file: ' + name);
  const pkg = JSON.parse(fs.readFileSync(path.join(b, 'package.json'), 'utf8'));
  if (pkg.name !== 'family-bloom') fail('This is not the Family Bloom app.');
  const app = JSON.parse(fs.readFileSync(path.join(b, 'app.json'), 'utf8'));
  const version = Number(app.expo?.android?.versionCode);
  if (version !== manifest.baseVersionCode) fail('Unexpected Android versionCode '+version+'; this patch only supports exact NODE R2 / NODE R3 baseline '+manifest.baseVersionCode+'.');
  const extra = (manifest.extra || []).map(rel => ({path:rel,before:null,after:hash(safeWithin(a,rel))}));
  const all = [...manifest.replace, ...manifest.remove, ...extra];
  let pending = 0, applied = 0;
  for (const item of all) {
    const dest = safeWithin(b, item.path);
    const original = file(dest) ? hash(dest) : null;
    const expected = item.after || null;
    if (original === expected) { applied++; continue; }
    const knownBefore = Array.isArray(item.before) ? item.before : [item.before ?? null];
    if (knownBefore.includes(original)) { pending++; continue; }
    fail('STOP: existing project has an unexpected change in '+item.path+' (expected clean NODE R2 / NODE R3). No files modified.');
  }
  for (const item of [...manifest.replace, ...extra]) {
    const full = safeWithin(a, item.path);
    if (!file(full) || hash(full) !== item.after) fail('FULL ZIP failed integrity check: ' + item.path);
  }
  return {source:a,target:b,pending,alreadyApplied:applied,total:all.length};
}
// Complete source backup, deliberately excluding generated files only.
const ignored = new Set(['node_modules','.git','.expo','.gradle','.next','.turbo']);
function backupProject(src, dest) {
  let copied = 0;
  const walk = (dir, rel) => {
    const dstDir = path.join(dest, rel);
    fs.mkdirSync(dstDir, {recursive:true});
    for (const entry of fs.readdirSync(dir,{withFileTypes:true})) {
      if (ignored.has(entry.name) || (!rel && ['android','ios'].includes(entry.name)) || ['Thumbs.db','.DS_Store'].includes(entry.name)) continue;
      const childRel = path.join(rel,entry.name), from = path.join(dir,entry.name), to = path.join(dest,childRel);
      const stat = fs.lstatSync(from);
      if (stat.isSymbolicLink()) fail('Backup source contains a symlink: '+childRel);
      if (stat.isDirectory()) walk(from,childRel);
      else if (stat.isFile()) {fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);copied++;}
    }
  };
  walk(src,'');
  if (!file(path.join(dest,'package.json'))) fail('Backup missing package.json');
  return copied;
}
function install() {
  const result=check();
  console.log('[CHECK PASS] '+result.total+' patch paths validated; '+result.pending+' pending.');
  if (!result.pending) {console.log('PASS: These NODE 3D R4 changes are already installed.');return;}
  fs.mkdirSync(stateDir,{recursive:true});
  const stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/[.].*$/,'').replace('T','_');
  let backupRoot=path.join(stateDir,'backups','node3DR4_'+stamp);
  for(let i=1;exists(backupRoot);i++)backupRoot=path.join(stateDir,'backups','node3DR4_'+stamp+'_'+i);
  const backupDir=path.join(backupRoot,'project-source');
  console.log('[1/3] Backing up original source (including local configs; omitting generated build caches)...');
  const n=backupProject(target,backupDir);
  const backupRecord={when:new Date().toISOString(),target:result.target,files:n,backupRoot};
  fs.writeFileSync(path.join(backupRoot,'backup-info.json'),JSON.stringify(backupRecord,null,2));
  fs.writeFileSync(path.join(stateDir,'last-backup.txt'),backupRoot+'\r\n');
  console.log('[BACKUP PASS] '+n+' files saved to '+backupDir);
  const extras = (manifest.extra || []).map(rel => ({path:rel,before:null,after:hash(safeWithin(root,rel))}));
  const operations=[...manifest.replace,...manifest.remove,...extras].filter(item => {
    const dest=path.join(target,item.path);return (file(dest)?hash(dest):null)!==(item.after||null);
  });
  const done=[];
  try {
    console.log('[2/3] Applying selected source corrections...');
    for (const item of operations) {
      const dest=safeWithin(target,item.path);
      if (item.after) {
        const src=safeWithin(root,item.path);
        fs.mkdirSync(path.dirname(dest),{recursive:true});
        fs.copyFileSync(src,dest);
      } else if (file(dest)) fs.unlinkSync(dest);
      done.push(item);
    }
    console.log('[3/3] Comparing final SHA-256...');
    const post=check();
    if(post.pending)fail('Post-install hash mismatch: '+post.pending+' outstanding file(s).');
  } catch(err) {
    console.error('[ROLLBACK] Restoring every modified file from backed-up source...');
    for (const item of done.reverse()) {
      const prev=path.join(backupDir,item.path), dest=path.join(target,item.path);
      if(file(prev)){fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(prev,dest);}
      else if(file(dest))fs.unlinkSync(dest);
    }
    throw err;
  }
  fs.writeFileSync(path.join(stateDir,'last-target.txt'),target+'\r\n');
  console.log('PASS: NODE 3D R4 source update applied.');
  console.log('BACKUP: '+backupRoot);
  console.log('NOTE: No npm/Android APK build or live Firebase test has been run.');
}
try {
  if(!['check','install'].includes(mode)) fail('Usage: node fb-node-3d-r4-safe-update.cjs check|install "C:\\FamilyBloom"');
  if(mode==='check') console.log('[SAFE CHECK PASS]',JSON.stringify(check()));
  else install();
} catch(e) {console.error('[SAFE UPDATE STOP] '+(e instanceof Error ? e.message : String(e))); process.exitCode=1;}
