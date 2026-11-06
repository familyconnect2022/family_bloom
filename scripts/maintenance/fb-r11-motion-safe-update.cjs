#!/usr/bin/env node
'use strict';
// R11R3 forwarder: keep original R11R2 maintenance code as fallback for legacy packages.
if (require('node:fs').existsSync(require('node:path').join(__dirname, 'fb-r11r3-recovery.cjs'))) {
  require('./fb-r11r3-recovery.cjs');
} else {
/**
 * Family Bloom R11 Motion safe source updater (folder-selection repair).
 * Accepts a project root or one/two outer wrapper folders; never guesses between
 * multiple projects, never ignores APP SOURCE SHA mismatches, and preserves
 * the installed R10 auto-update BAT (an unrelated local maintenance entrypoint).
 */
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const manifestPath = path.join(root, 'document/releases/fb-r11-motion-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const mode = process.argv[2];
const rawTarget = (process.argv[3] || '').trim();
const targetArg = rawTarget.replace(/^\s*["']|["']\s*$/g, '');
const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
const stateDir = path.join(local, 'FamilyBloom', 'updater');
const exists = p => { try { fs.lstatSync(p); return true; } catch { return false; } };
const regular = p => { try { return fs.statSync(p).isFile() && !fs.lstatSync(p).isSymbolicLink(); } catch { return false; } };
const isDirectory = p => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const fail = message => { throw new Error(message); };
const preservedLocalTools = new Set(['Family_Bloom_AUTO_UPDATE_FULL.bat']);
const ignored = new Set(['node_modules','.git','.expo','.gradle','.next','.turbo','android','ios','dist','build','backups']);

const guarded = (base, rel) => {
  if (!rel || rel.includes('\\') || path.isAbsolute(rel) || rel.split('/').some(x => !x || x === '.' || x === '..')) fail('Unsafe payload path ' + rel);
  const full = path.resolve(base, rel);
  if (!full.startsWith(base + path.sep)) fail('Path escapes project ' + rel);
  let segment = base;
  for (const part of rel.split('/')) {
    segment = path.join(segment, part);
    if (exists(segment) && fs.lstatSync(segment).isSymbolicLink()) fail('Refusing symlink ' + rel);
  }
  return full;
};

const allEntries = () => [
  ...manifest.replace,
  ...(manifest.extra || []).map(p => ({
    path: p,
    before: [null, ...((manifest.extraBefore && manifest.extraBefore[p]) || [])],
    after: hash(guarded(root, p)),
  })),
];

function looksLikeProject(p) {
  return regular(path.join(p, 'package.json')) && regular(path.join(p, 'app.json'));
}

function locateProject() {
  if (!targetArg) fail('Chua co duong dan. Hay chon THU MUC DU AN R10, noi co package.json.');
  let selected = path.resolve(targetArg);
  if (regular(selected) && ['package.json','app.json'].includes(path.basename(selected).toLowerCase())) selected = path.dirname(selected);
  if (!isDirectory(selected)) fail('Thu muc khong ton tai: ' + selected);
  if (selected === path.parse(selected).root) fail('Khong chon o dia C:/, D:/ truc tiep. Hay chon thu muc du an Family Bloom.');
  // If the chosen folder is itself a project, DO NOT silently switch to another.
  if (looksLikeProject(selected)) return selected;
  const matches = [];
  const queue = [{p:selected, depth:0}];
  let inspected = 0;
  while (queue.length) {
    const item = queue.shift();
    if (item.depth >= 2) continue;
    let entries;
    try { entries = fs.readdirSync(item.p, {withFileTypes:true}); } catch { continue; }
    for (const ent of entries) {
      if (++inspected > 4000) fail('Thu muc qua rong. Hay chon thu muc gan hon voi project (co package.json).');
      if (!ent.isDirectory() || ent.isSymbolicLink() || ignored.has(ent.name) || ent.name.startsWith('.')) continue;
      const candidate = path.join(item.p, ent.name);
      if (looksLikeProject(candidate)) matches.push(candidate);
      else queue.push({p:candidate,depth:item.depth+1});
    }
  }
  if (matches.length > 1) fail('Tim thay NHIEU project trong thu muc da chon:\n  - ' + matches.join('\n  - ') + '\nChon dung thu muc project R10 (co package.json) de tranh cap nhat nham.');
  if (matches.length === 1) {
    console.log('[AUTO-DETECT] Project nam ben trong thu muc ban chon:');
    console.log('  ' + matches[0]);
    return matches[0];
  }
  fail('Khong tim thay project Family Bloom trong thu muc da chon (toi da 2 cap): ' + selected + '\nThu muc dung phai co package.json, app.json va src\\app\\_layout.tsx.');
}

function check() {
  if (manifest.replace.some(item => preservedLocalTools.has(item.path)) || (manifest.extra || []).some(p => preservedLocalTools.has(p))) {
    fail('Unsafe manifest: local R10 auto-update BAT must not be replaced by R11 Motion.');
  }
  const target = locateProject();
  const original = fs.realpathSync(root), destination = fs.realpathSync(target);
  if (original === destination || original.startsWith(destination + path.sep) || destination.startsWith(original + path.sep)) {
    fail('Ban dang chon thu muc R11 FULL CODE (hoac thu muc chong lap). Hay chon du an R10 DANG DUNG, khac thu muc giai nen R11.');
  }
  if (destination === path.parse(destination).root) fail('Project cannot be a drive root.');
  for (const p of ['package.json', 'app.json', 'app.config.js', 'src/app/_layout.tsx']) {
    if (!regular(path.join(target, p))) fail('Chua phai ma nguon Family Bloom day du. Thieu: ' + p + '\nDuong dan: ' + target);
  }
  let pkg, app;
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'),'utf8'));
    app = JSON.parse(fs.readFileSync(path.join(target, 'app.json'),'utf8'));
  } catch(err) { fail('Khong doc duoc package.json/app.json: ' + err.message); }
  if (pkg.name !== 'family-bloom' || app.expo?.android?.package !== 'com.familybloom.android') {
    fail('Thu muc co package.json nhung KHONG PHAI Family Bloom Android (com.familybloom.android): ' + target);
  }
  if (app.expo?.android?.versionCode !== manifest.baseVersionCode) {
    fail('Sai versionCode. Can R10 / ' + manifest.baseVersionCode + ', tim thay ' + app.expo?.android?.versionCode + '.\nKHONG nen ep cap nhat neu version dang khac.');
  }
  let pending = 0, applied = 0;
  const mismatches = [];
  for (const item of allEntries()) {
    const src = guarded(root,item.path), dest = guarded(target,item.path);
    if (!regular(src) || hash(src) !== item.after) fail('FILE R11 tai ve bi loi/bi sua: ' + item.path + '. Hay giai nen lai FULL CODE R11R2.');
    const current = regular(dest) ? hash(dest) : null;
    if (current === item.after) { applied++; continue; }
    const before = Array.isArray(item.before) ? item.before : [item.before ?? null];
    if (!before.includes(current)) {
      mismatches.push('  FILE: ' + item.path +
        '\n  SHA hien tai: ' + (current || '(khong ton tai)') +
        '\n  SHA cho phep: ' + before.map(s=>s || '(chua co tren R10)').join(' | '));
      continue;
    }
    pending++;
  }
  if (mismatches.length) fail('Co ' + mismatches.length + ' tep MA NGUON khong khop SHA R10/R11. Dung truoc khi ghi de!\n' +
    mismatches.join('\n---\n') +
    '\n[SAFE] Chua sua bat ky file nao. Gui anh/log nay de doi chieu ma nguon thuc te.');
  console.log('[PRESERVED] Family_Bloom_AUTO_UPDATE_FULL.bat: GIU NGUYEN tep tren may, khong kiem SHA, khong ghi de.');
  return { target, pending, applied, total: allEntries().length };
}

function backupSource(src, dest) {
  let n=0;
  const walk=(dir,relative)=>{
    fs.mkdirSync(path.join(dest,relative),{recursive:true});
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      if (ignored.has(entry.name)) continue;
      const rel=path.join(relative,entry.name), from=path.join(dir,entry.name),to=path.join(dest,rel);
      const stat=fs.lstatSync(from);
      if(stat.isSymbolicLink()) fail('Symlink in backup source: '+rel);
      if(stat.isDirectory()) walk(from,rel);
      else if(stat.isFile()){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(from,to);n++;}
    }
  };
  walk(src,'');
  if(!regular(path.join(dest,'package.json'))) fail('Backup incomplete');
  return n;
}

function install() {
  const state=check();
  const target=state.target;
  console.log('[R11 PREFLIGHT PASS] ' + state.pending + ' updates pending; ' + state.applied + ' already applied.');
  console.log('[PROJECT] ' + target);
  if(!state.pending) return console.log('PASS: R11 Motion Lab is already installed.');
  fs.mkdirSync(stateDir,{recursive:true});
  const date=new Date().toISOString().replace(/[-:]/g,'').replace(/[.].*$/,'').replace('T','_');
  let dest=path.join(stateDir,'backups','R11_MOTION_'+date);
  for(let i=1;exists(dest);i++)dest=path.join(stateDir,'backups','R11_MOTION_'+date+'_'+i);
  const backup=path.join(dest,'project-source');
  console.log('[1/3] Backing up project source; excludes native build outputs and caches...');
  const count=backupSource(target,backup);
  fs.writeFileSync(path.join(dest,'backup-info.json'),JSON.stringify({version:'R11 Motion Updater Fix',date:new Date().toISOString(),target,files:count},null,2));
  fs.writeFileSync(path.join(stateDir,'last-backup.txt'),dest+'\r\n');
  console.log('[BACKUP PASS] '+count+' source files: '+backup);
  const operations=allEntries().filter(item => (regular(guarded(target,item.path)) ? hash(guarded(target,item.path)) : null)!==item.after);
  const touched=[];
  try {
    console.log('[2/3] Installing approved R11 files...');
    for(const item of operations){
      const from=guarded(root,item.path),to=guarded(target,item.path);
      fs.mkdirSync(path.dirname(to),{recursive:true});
      fs.copyFileSync(from,to);
      touched.push(item);
    }
    console.log('[3/3] Checking every updated SHA-256...');
    const result=check();
    if(result.pending !== 0) fail('Post-install verification mismatch');
  } catch(error) {
    console.error('[ROLLBACK] Restoring all touched files...');
    for(const item of touched.reverse()){
      const prev=path.join(backup,item.path),to=guarded(target,item.path);
      if(regular(prev)){fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(prev,to);}
      else if(regular(to))fs.unlinkSync(to);
    }
    throw error;
  }
  fs.writeFileSync(path.join(stateDir,'last-target.txt'),target+'\r\n');
  console.log('PASS: R11 Motion 4.0 trial source installed. BACKUP: '+dest);
  console.log('Build APK Release separately; Android runtime is not verified by source tests.');
}
try {
  if(mode === 'check') {
    const result=check();
    console.log('[CHECK PASS] R10/R11 project: ' + result.target);
    console.log('[CHECK PASS] Maintenance BAT differences are ignored because R11 never writes that BAT.');
    console.log('[CHECK PASS] '+ result.pending + ' pending / ' + result.applied + ' applied / ' + result.total + ' tracked files.');
  } else if(mode === 'install') install();
  else fail('Usage: node fb-r11-motion-safe-update.cjs check|install <R10-project-dir>');
} catch(err) { console.error('[STOP] ' + err.message); process.exitCode=1; }

}
