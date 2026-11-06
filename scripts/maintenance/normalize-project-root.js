const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..', '..');
const documentRoot = path.join(root, 'document');
const legacyImport = path.join(documentRoot, 'legacy-import');
const baselineManifestPath = path.join(__dirname, 'legacy-p2_8-managed-hashes.json');
const baselineManifest = fs.existsSync(baselineManifestPath)
  ? JSON.parse(fs.readFileSync(baselineManifestPath, 'utf8')).sha256 || {}
  : {};

function ensure(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function sameBytes(a, b) {
  try {
    const sa = fs.statSync(a);
    const sb = fs.statSync(b);
    if (sa.size !== sb.size) return false;
    return fs.readFileSync(a).equals(fs.readFileSync(b));
  } catch {
    return false;
  }
}

function isManagedP28File(source) {
  const rel = path.relative(root, source).replace(/\\/g, '/');
  const expected = baselineManifest[rel];
  return Boolean(expected && expected === sha256(source));
}

function preserveLegacy(source, destination) {
  ensure(path.dirname(destination));
  if (!fs.existsSync(destination)) {
    fs.copyFileSync(source, destination);
    return 1;
  }
  if (sameBytes(source, destination)) return 0;
  const parsed = path.parse(destination);
  let index = 2;
  let candidate;
  do {
    candidate = path.join(parsed.dir, `${parsed.name}.legacy-${index}${parsed.ext}`);
    index += 1;
  } while (fs.existsSync(candidate));
  fs.copyFileSync(source, candidate);
  return 1;
}

function wasBackedUpPreCopy(source, ...relativeParts) {
  const backup = path.join(legacyImport, 'pre-copy', ...relativeParts);
  return fs.existsSync(backup) && sameBytes(source, backup);
}

function migrateTree(sourceDir, canonicalBase, importLabel) {
  if (!fs.existsSync(sourceDir)) return 0;
  let preserved = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const source = path.join(current, entry.name);
      const rel = path.relative(sourceDir, source).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        walk(source);
        continue;
      }
      if (!entry.isFile()) continue;
      const canonical = path.join(canonicalBase, rel);
      if (isManagedP28File(source)) continue;
      if (fs.existsSync(canonical) && sameBytes(source, canonical)) continue;
      if (wasBackedUpPreCopy(source, importLabel, rel)) continue;
      preserved += preserveLegacy(source, path.join(legacyImport, importLabel, rel));
    }
  };
  walk(sourceDir);
  fs.rmSync(sourceDir, { recursive: true, force: true });
  return preserved;
}

function retireMovedManagedFile(sourceRel, canonicalRel) {
  const source = path.join(root, sourceRel);
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return 0;
  const canonical = path.join(root, canonicalRel);
  let preserved = 0;
  const documentRelative = sourceRel.replace(/^document\//, '');
  if (
    !isManagedP28File(source) &&
    !(fs.existsSync(canonical) && sameBytes(source, canonical)) &&
    !wasBackedUpPreCopy(source, 'document', documentRelative)
  ) {
    preserved += preserveLegacy(source, path.join(legacyImport, 'moved-document-files', documentRelative));
  }
  fs.rmSync(source, { force: true });
  return preserved;
}

ensure(documentRoot);
let preserved = 0;

// If a prior experimental package created documents/, merge only non-canonical differences safely.
preserved += migrateTree(path.join(root, 'documents'), documentRoot, 'documents');

// P2.8 kept reports/ at root; P2.9 canonicalizes it under document/reports/.
preserved += migrateTree(path.join(root, 'reports'), path.join(documentRoot, 'reports'), 'reports');

// These P2.8-managed files changed location inside/outside document/.
for (const [sourceRel, canonicalRel] of [
  ['document/WEB_W1_README.md', 'document/web/WEB_W1_README.md'],
  ['document/Family_Bloom_10_Van_De_Hieu_Nang_Architecture_Spec_2026-10-10.pdf', 'document/architecture/performance/Family_Bloom_10_Van_De_Hieu_Nang_Architecture_Spec_2026-10-10.pdf'],
  ['document/music-catalog/source-state.json', 'scripts/music/state/source-state.json'],
  ['document/music-catalog/refresh-latest.json', 'scripts/music/reports/refresh-latest.json'],
  ['document/music-catalog/audius-audit-latest.json', 'scripts/music/reports/audius-audit-latest.json'],
]) {
  preserved += retireMovedManagedFile(sourceRel, canonicalRel);
}
const oldMusicDir = path.join(root, 'document', 'music-catalog');
if (fs.existsSync(oldMusicDir)) {
  try { fs.rmdirSync(oldMusicDir); } catch {}
}

// Root .md/.txt files are no longer allowed. Standard P2.8 files are superseded;
// unknown or manually modified files are preserved before removal.
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(md|txt)$/i.test(entry.name)) continue;
  const source = path.join(root, entry.name);
  if (!isManagedP28File(source) && !wasBackedUpPreCopy(source, 'root-notes', entry.name)) {
    preserved += preserveLegacy(source, path.join(legacyImport, 'root-notes', entry.name));
  }
  fs.rmSync(source, { force: true });
}

for (const stale of [
  'Family_Bloom_WEB_PREVIEW.bat',
  'Family_Bloom_WEB_EXPORT.bat',
  'GoogleService-Info.plist',
  'scripts/maintenance/Family_Bloom_Deploy_Firestore_Indexes.bat',
  'scripts/maintenance/Family_Bloom_Deploy_Firestore_Rules.bat',
  'scripts/maintenance/Family_Bloom_Deploy_Functions.bat',
]) {
  fs.rmSync(path.join(root, stale), { force: true });
}

console.log(`Project root normalized. Preserved ${preserved} unknown/manual legacy file(s) under document/legacy-import/.`);
