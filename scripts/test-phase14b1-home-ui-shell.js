const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, pass, detail = '') => checks.push({ name, pass: !!pass, detail });

const routes = [
  ['src/app/home-board.tsx', 'variant="notice"'],
  ['src/app/home-games.tsx', 'variant="game"'],
  ['src/app/home-music.tsx', 'variant="music"'],
  ['src/app/home-fund.tsx', 'variant="fund"'],
];
for (const [file, token] of routes) {
  check(`${file} exists`, exists(file));
  check(`${file} uses purpose-aware hero`, exists(file) && read(file).includes(token));
  check(`${file} is true full-bleed`, exists(file) && read(file).includes('edgeToEdgeTop edgeToEdgeHorizontal'));
}

const play = read('src/app/(tabs)/play.tsx');
for (const route of ['/home-board', '/home-games', '/home-music', '/home-fund']) {
  check(`Nhà Mình hub links ${route}`, play.includes(`router.push("${route}"`));
}

const hero = read('src/components/ui/BloomHeroHeader.tsx');
for (const variant of ['whisper','poll','kitchen','notice','game','music','fund']) {
  check(`BloomHeroHeader variant ${variant}`, hero.includes(`| "${variant}"`) && hero.includes(`${variant}: {`));
}

check('Whisper has own hero', read('src/app/home-whispers.tsx').includes('variant="whisper"'));
check('Poll has own hero', read('src/app/home-polls.tsx').includes('variant="poll"'));
check('Kitchen has own hero', read('src/app/home-kitchen/index.tsx').includes('variant="kitchen"'));
check('Phase 14B.1 does not add Firestore collections', !play.includes('firestore') && !read('src/app/home-board.tsx').includes('firebase/firestore'));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'} | ${item.name}${item.detail ? ` | ${item.detail}` : ''}`);
console.log(`\nPhase 14B.1 UI Shell: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
