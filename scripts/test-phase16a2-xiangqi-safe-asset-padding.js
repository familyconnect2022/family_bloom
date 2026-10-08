const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const assetDir = path.join(root, 'assets', 'xiangqi');
const manifestPath = path.join(assetDir, 'asset-manifest.json');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let pass = 0;
let fail = 0;
function check(name, ok) {
  if (ok) { console.log(`PASS ${name}`); pass += 1; }
  else { console.error(`FAIL ${name}`); fail += 1; }
}

const colors = ['red', 'black'];
const types = ['general', 'advisor', 'elephant', 'chariot', 'horse', 'cannon', 'soldier'];
const keys = colors.flatMap(color => types.map(type => `${color}_${type}`));

check('safe asset manifest exists', fs.existsSync(manifestPath));
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
check('manifest contains exactly 14 approved Xiangqi assets', keys.every(k => manifest[k]) && Object.keys(manifest).length === 14);

let allHashesMatch = true;
let allSizes384 = true;
let allMarginsSafe = true;
let minMargins = { left: Infinity, right: Infinity, top: Infinity, bottom: Infinity };

for (const key of keys) {
  const file = path.join(assetDir, `${key}.webp`);
  const meta = manifest[key];
  if (!fs.existsSync(file) || !meta) {
    allHashesMatch = allSizes384 = allMarginsSafe = false;
    continue;
  }
  const sha = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  if (sha !== meta.sha256) allHashesMatch = false;
  if (!Array.isArray(meta.size) || meta.size[0] !== 384 || meta.size[1] !== 384) allSizes384 = false;
  for (const side of ['left', 'right', 'top', 'bottom']) {
    const m = Number(meta.margins?.[side]);
    if (!Number.isFinite(m) || m < 48) allMarginsSafe = false;
    if (Number.isFinite(m)) minMargins[side] = Math.min(minMargins[side], m);
  }
}

check('all 14 production assets match approved SHA-256 hashes', allHashesMatch);
check('all approved assets use 384x384 transparent canvases', allSizes384);
check('all assets keep at least 48px safe alpha margin on every side', allMarginsSafe);

const piece = read('src/components/xiangqi/XiangqiPiece.tsx');
const gallery = read('src/components/xiangqi/XiangqiPieceGallery.tsx');
const board = read('src/components/xiangqi/XiangqiBoardPreview.tsx');
const gameBoard = read('src/components/xiangqi/XiangqiGameBoard.tsx');
const screen = read('src/app/(xiangqi)/xiangqi-preview.tsx');
const debugBuild = read('scripts/android/Family_Bloom_Android_Debug_Build_And_Run.bat');
const releaseBuild = read('scripts/android/Family_Bloom_Android_Test_App_RELEASE.bat');

check('piece renderer keeps contain mode', piece.includes('resizeMode="contain"') || piece.includes('contentFit="contain"')); // expo-image supersedes RN Image resizeMode
check('piece wrapper explicitly allows overflow', piece.includes('overflow: "visible"'));
check('playable board uses user-approved 1.3x assets', gameBoard.includes('step * 1.3') && gameBoard.includes('<XiangqiPiece'));
check('gallery still includes five visual states', ['normal', 'selected', 'hint', 'drag', 'disabled'].every(v => gallery.includes(`"${v}"`) || piece.includes(`"${v}"`)));
check('board foundation still renders production XiangqiPiece assets', board.includes('<XiangqiPiece') && board.includes('INITIAL_POSITION'));
check('debug build runs Phase 16A.2 safe-asset gate', debugBuild.includes('phase16a2:check'));
check('release build runs Phase 16A.2 safe-asset gate', releaseBuild.includes('phase16a2:check'));

console.log(`Safe margins px: L=${minMargins.left} R=${minMargins.right} T=${minMargins.top} B=${minMargins.bottom}`);
console.log(`Phase 16A.2 Xiangqi Safe Asset Padding: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
