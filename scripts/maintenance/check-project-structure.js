const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
let pass = 0;
let fail = 0;
function check(label, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`PASS ${String(pass + fail).padStart(2, '0')} - ${label}`);
  } else {
    fail += 1;
    console.error(`FAIL ${String(pass + fail).padStart(2, '0')} - ${label}${detail ? ` :: ${detail}` : ''}`);
  }
}

const rootEntries = fs.readdirSync(root, { withFileTypes: true });
const rootDocs = rootEntries
  .filter((entry) => entry.isFile() && /\.(md|txt)$/i.test(entry.name))
  .map((entry) => entry.name);
const rootBat = rootEntries
  .filter((entry) => entry.isFile() && /\.bat$/i.test(entry.name))
  .map((entry) => entry.name)
  .sort();
const allowedRootBat = [
  'Family_Bloom_BUILD_APK_AND_SHARE.bat',
  'Family_Bloom_CLEAN_APPLY_FULL.bat',
  'Family_Bloom_PRE_COPY_CLEAN_OLD_PROJECT.bat',
].sort();

check('Root has zero Markdown/TXT documentation files', rootDocs.length === 0, rootDocs.join(', '));
const docsOutsideCanonical = [];
function scanDocumentation(current) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (['node_modules', '.git', '.expo', 'android', 'ios', 'dist'].includes(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    const rel = path.relative(root, absolute).replace(/\\/g, '/');
    if (entry.isDirectory()) {
      if (rel === 'document' || rel.startsWith('document/')) continue;
      scanDocumentation(absolute);
    } else if (entry.isFile() && /\.(md|txt)$/i.test(entry.name)) {
      docsOutsideCanonical.push(rel);
    }
  }
}
scanDocumentation(root);
check('All Markdown/TXT documentation lives under document/', docsOutsideCanonical.length === 0, docsOutsideCanonical.join(', '));
check('Canonical document/ directory exists', fs.existsSync(path.join(root, 'document')));
check('Accidental plural documents/ directory is absent', !fs.existsSync(path.join(root, 'documents')));
check('Legacy top-level reports/ directory is absent', !fs.existsSync(path.join(root, 'reports')));
check('Only intentional copy-over/build BAT entrypoints remain at root', JSON.stringify(rootBat) === JSON.stringify(allowedRootBat), rootBat.join(', '));
check('Web BAT helpers live under scripts/windows/web',
  fs.existsSync(path.join(root, 'scripts/windows/web/Family_Bloom_WEB_PREVIEW.bat')) &&
  fs.existsSync(path.join(root, 'scripts/windows/web/Family_Bloom_WEB_EXPORT.bat')));
check('Firebase deploy helpers have one canonical home under scripts/firebase',
  ['Indexes', 'Rules', 'Functions'].every((kind) => {
    const canonical = kind === 'Indexes'
      ? 'Family_Bloom_Deploy_Firestore_Indexes.bat'
      : kind === 'Rules'
        ? 'Family_Bloom_Deploy_Firestore_Rules.bat'
        : 'Family_Bloom_Deploy_Functions.bat';
    return fs.existsSync(path.join(root, 'scripts/firebase', canonical)) &&
      !fs.existsSync(path.join(root, 'scripts/maintenance', canonical));
  }));
check('Release reports are grouped under document/releases', fs.existsSync(path.join(root, 'document/releases/performance/p2/PHASE_P2_9_SOURCE_STRUCTURE_DOCUMENT_GOVERNANCE_BUILD_REPORT.md')));
check('Verification logs are grouped under document/verification', fs.existsSync(path.join(root, 'document/verification/A17_VERIFICATION_LOG.txt')));
check('Device and validation reports are grouped under document/reports',
  fs.existsSync(path.join(root, 'document/reports/device')) && fs.existsSync(path.join(root, 'document/reports/validation')));
check('Music machine state is outside document/',
  fs.existsSync(path.join(root, 'scripts/music/state/source-state.json')) &&
  fs.existsSync(path.join(root, 'scripts/music/reports/audius-audit-latest.json')) &&
  !fs.existsSync(path.join(root, 'document/music-catalog')));
check('iOS Firebase plist is retired from Android/Web source', !fs.existsSync(path.join(root, 'GoogleService-Info.plist')));

const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
check('app.json has no active iOS block', !app.expo?.ios);
check('package.json has no iOS run script', !pkg.scripts?.ios);
check('Android identity remains canonical', app.expo?.android?.package === 'com.familybloom.android');
check('Structure gate is registered', pkg.scripts?.['structure:check'] === 'node ./scripts/maintenance/check-project-structure.js');
check('P2.9 gate is registered', pkg.scripts?.['phaseP2_9:check'] === 'node ./scripts/maintenance/check-project-structure.js');

console.log(`\nFamily Bloom project structure gate: ${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
