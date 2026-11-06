const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const sourceRoot = path.resolve(__dirname, '..', '..');
const targetRoot = process.argv[2] ? path.resolve(process.argv[2]) : null;
if (!targetRoot || !fs.existsSync(path.join(targetRoot, 'package.json'))) {
  console.error('[ERROR] Existing Family Bloom target project was not supplied or is invalid.');
  process.exit(1);
}

const manifestPath = path.join(__dirname, 'legacy-p2_8-managed-hashes.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')).sha256 || {};
const backupRoot = path.join(targetRoot, 'document', 'legacy-import', 'pre-copy');
let preserved = 0;

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function ensure(dir) { fs.mkdirSync(dir, { recursive: true }); }
function preserve(source, rel) {
  const destination = path.join(backupRoot, rel);
  ensure(path.dirname(destination));
  if (fs.existsSync(destination) && fs.readFileSync(destination).equals(fs.readFileSync(source))) return;
  if (!fs.existsSync(destination)) {
    fs.copyFileSync(source, destination);
    preserved += 1;
    return;
  }
  const parsed = path.parse(destination);
  let index = 2;
  let candidate;
  do {
    candidate = path.join(parsed.dir, `${parsed.name}.legacy-${index}${parsed.ext}`);
    index += 1;
  } while (fs.existsSync(candidate));
  fs.copyFileSync(source, candidate);
  preserved += 1;
}
function isBaselineManaged(projectRel, file) {
  const expected = manifest[projectRel.replace(/\\/g, '/')];
  return Boolean(expected && expected === sha256(file));
}
function walk(dir, onFile) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (absolute.startsWith(path.join(targetRoot, 'document', 'legacy-import'))) continue;
      walk(absolute, onFile);
    } else if (entry.isFile()) {
      onFile(absolute);
    }
  }
}

// Preserve unknown or manually changed document files before overlay can replace same-path files.
walk(path.join(targetRoot, 'document'), (file) => {
  const projectRel = path.relative(targetRoot, file).replace(/\\/g, '/');
  if (isBaselineManaged(projectRel, file)) return;
  preserve(file, path.join('document', path.relative(path.join(targetRoot, 'document'), file)));
});

// Preserve unknown/modified old top-level reports before P2.9 normalizes them.
walk(path.join(targetRoot, 'reports'), (file) => {
  const projectRel = path.relative(targetRoot, file).replace(/\\/g, '/');
  if (isBaselineManaged(projectRel, file)) return;
  preserve(file, path.join('reports', path.relative(path.join(targetRoot, 'reports'), file)));
});

// Preserve unknown/modified root notes. Standard release notes are replaced by canonical P2.9 copies.
for (const entry of fs.readdirSync(targetRoot, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(md|txt)$/i.test(entry.name)) continue;
  const file = path.join(targetRoot, entry.name);
  if (isBaselineManaged(entry.name, file)) continue;
  preserve(file, path.join('root-notes', entry.name));
}

console.log(`Pre-copy note backup complete. Preserved ${preserved} unknown/manual file(s) in document/legacy-import/pre-copy/.`);
