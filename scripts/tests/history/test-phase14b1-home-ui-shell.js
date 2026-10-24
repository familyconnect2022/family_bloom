const __legacyScriptsDir = require('node:path').resolve(__dirname, '..', '..');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__legacyScriptsDir, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });

const routes = [
  ['src/app/(home)/(board)/home-board.tsx', 'variant="notice"'],
  ['src/app/(home)/(games)/home-games.tsx', 'variant="game"'],
  // Music is paused and retains its route for future work; no active hero contract.
  ['src/app/(home)/(fund)/home-fund.tsx', 'variant="fund"'],
];
for (const [file, token] of routes) {
  check(`${file} exists`, exists(file));
  check(`${file} uses purpose-aware hero`, exists(file) && read(file).includes(token));
  check(`${file} is true full-bleed`, exists(file) && read(file).includes('edgeToEdgeTop edgeToEdgeHorizontal'));
}

const play = read('src/app/(tabs)/play.tsx');
for (const route of ['/home-games', '/home-fund']) {
  check(`Nhà Mình hub links ${route}`, play.includes(`router.push("${route}"`));
}
check('Deferred board remains behind feature flag', play.includes('ENABLE_FAMILY_BULLETIN && (') && read('src/constants/featureFlags.ts').includes('ENABLE_FAMILY_BULLETIN: boolean = false'));
check('Dormant board route retained behind deep-link redirect', read('src/app/(home)/(board)/home-board.tsx').includes('<Redirect href="/(tabs)/play" />'));

const hero = read('src/components/ui/BloomHeroHeader.tsx');
for (const variant of ['whisper','poll','kitchen','notice','game','music','fund']) {
  check(`BloomHeroHeader variant ${variant}`, hero.includes(`| "${variant}"`) && hero.includes(`${variant}: {`));
}

check('Whisper has own hero', read('src/app/(home)/(whispers)/home-whispers.tsx').includes('variant="whisper"'));
check('Poll has own hero', read('src/app/(home)/(polls)/home-polls.tsx').includes('variant="poll"'));
check('Kitchen has own hero', read('src/app/(home)/(kitchen)/home-kitchen/index.tsx').includes('variant="kitchen"'));
check('Phase 14B.1 does not add Firestore collections', !play.includes('firestore') && !read('src/app/(home)/(board)/home-board.tsx').includes('firebase/firestore'));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} | ${item.name}${item.detail ? ` | ${item.detail}` : ''}`);
console.log(`\nPhase 14B.1 UI Shell: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
